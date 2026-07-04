import fs from 'fs';
import path from 'path';

function read(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
}

describe('website checkout PayPal currency contract', () => {
  it('loads the PayPal SDK with the same currency returned by webPrices', () => {
    const start = read('knowly-www/assets/start.js');

    expect(start).toContain("var remoteCurrency = 'usd';");
    expect(start).toContain('remoteCurrency = normalizeCurrency(data.currency);');
    expect(start).toContain("var sdkCurrency = normalizeCurrency(remoteCurrency).toUpperCase();");
    expect(start).toContain("'&currency=' + encodeURIComponent(sdkCurrency)");
    expect(start).toContain("s.setAttribute('data-namespace', namespace);");
    expect(start).toContain("s.setAttribute('data-paypal-sdk-currency', sdkCurrency);");
    expect(start).toContain("if (document.getElementById('paypal-buttons')) mountPaypal();");
    expect(start).not.toContain('currency=USD&intent=capture');
  });

  it('bumps the start page asset version so browsers pick up the checkout fix', () => {
    const html = read('knowly-www/start/index.html');

    // Смысл гарда — кэш-бастинг: версия должна быть >= 2 (v=2 — фикс валют PayPal,
    // v=3 — email-шаг + режимы paywall/gift). Точное число растёт с релизами.
    const match = html.match(/\/assets\/start\.js\?v=(\d+)/);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBeGreaterThanOrEqual(2);
  });
});
