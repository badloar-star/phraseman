import fs from 'fs';
import path from 'path';

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
    expect(html).toContain('applyCachedPricesBeforePaint();');
    expect(html).not.toMatch(/data-price="monthly"[^>]*>—<\/span>/);
    expect(html).not.toMatch(/data-price="yearly"[^>]*>—<\/span>/);
    expect(html).not.toMatch(/data-price="lifetime"[^>]*>—<\/span>/);
  });
});
