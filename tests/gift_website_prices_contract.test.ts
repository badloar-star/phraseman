import fs from 'fs';
import path from 'path';
import vm from 'vm';

describe('gift website price loading contract', () => {
  it('uses the prices preloaded on the home page before the gift page paints', () => {
    const home = fs.readFileSync(
      path.join(process.cwd(), 'knowly-www/assets/home.js'),
      'utf8',
    );
    const html = fs.readFileSync(
      path.join(process.cwd(), 'knowly-www/gift/index.html'),
      'utf8',
    );

    expect(home).toContain("var PRICE_CACHE_KEY = 'pm_web_prices_cache_v1';");
    expect(home).toContain('localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: data }))');
    expect(html).toContain("var PRICE_CACHE_KEY = 'pm_web_prices_cache_v1';");
    // The cache painter is now an inline IIFE. Verify its behavior, not its retired name.
    const painter = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
      .map((match) => match[1]).find((script) => script.includes('var PRICE_CACHE_KEY'));
    expect(painter).toBeDefined();
    const amounts = { monthly: 399, yearly: 2799, lifetime: 9999 };
    const elements = Object.fromEntries(Object.keys(amounts).map((plan) => [plan, {
      textContent: '', removeAttribute: jest.fn(),
    }]));
    vm.runInNewContext(painter!, {
      Intl,
      localStorage: { getItem: () => JSON.stringify({ data: { ok: true, currency: 'eur', priceCents: amounts } }) },
      document: { querySelector: (selector: string) => elements[selector.match(/"([^"]+)"/)![1]] },
    });
    for (const [plan, amount] of Object.entries(amounts)) {
      expect(elements[plan].textContent).toBe(new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(amount / 100));
      expect(elements[plan].removeAttribute).toHaveBeenCalledWith('data-price-pending');
    }
    const pending = { textContent: '', removeAttribute: jest.fn() };
    vm.runInNewContext(painter!, {
      Intl, localStorage: { getItem: () => null },
      document: { querySelector: () => pending },
    });
    expect(pending.textContent).toBe('');
    expect(pending.removeAttribute).not.toHaveBeenCalled();
    expect(html).not.toMatch(/data-price="monthly"[^>]*>—<\/span>/);
    expect(html).not.toMatch(/data-price="yearly"[^>]*>—<\/span>/);
    expect(html).not.toMatch(/data-price="lifetime"[^>]*>—<\/span>/);
  });
});
