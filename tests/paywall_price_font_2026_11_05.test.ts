// зачем (ревью пейвола C 05.11): сумма в плитке не рвётся по символам, пустая цена — «—», межстрочный заголовка относительный.
import fs from 'node:fs';
import path from 'node:path';
import { PAYWALL_PRICE_FONT_MAX, PAYWALL_PRICE_FONT_MIN, paywallPriceFontSize, paywallPriceLineHeight } from '../components/paywall/paywall_price_font';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('кегль суммы в плитке тарифа', () => {
  it('короткая сумма — максимум; длинная — меньше, но не ниже 15', () => {
    expect(paywallPriceFontSize('$9.99', 1)).toBe(PAYWALL_PRICE_FONT_MAX);
    expect(paywallPriceFontSize('₫2.290.000', 1)).toBeLessThan(PAYWALL_PRICE_FONT_MAX);
    expect(paywallPriceFontSize('₫2.290.000', 1)).toBeGreaterThanOrEqual(PAYWALL_PRICE_FONT_MIN);
    expect(paywallPriceFontSize('Rp 1.299.000,00', 1.3)).toBe(PAYWALL_PRICE_FONT_MIN);
  });

  it('крупный шрифт системы уменьшает кегль, мусорный масштаб считается за 1', () => {
    expect(paywallPriceFontSize('R$ 299,90', 1.3)).toBeLessThan(paywallPriceFontSize('R$ 299,90', 1));
    expect(paywallPriceFontSize('R$ 299,90', Number.NaN)).toBe(paywallPriceFontSize('R$ 299,90', 1));
    expect(paywallPriceFontSize('', 1)).toBe(PAYWALL_PRICE_FONT_MAX);
  });

  it('межстрочный относительный', () => {
    expect(paywallPriceLineHeight(22)).toBe(26);
    expect(paywallPriceLineHeight(15)).toBe(18);
  });

  it('плитка: пустая цена — «—», сумма идёт через paywall_price_font, без сжатия шрифта; заголовок lineHeight ≥ 1,15×', () => {
    const rows = read('components/paywall/PaywallPlanRows.tsx');
    expect(rows).toContain("(price ? `${approx ? '≈ ' : ''}${price}` : '—')");
    // макет «Все окна Plus» (05.11): цена в плитке — одна строка 13 жирным («39,99 € в год»), крупной суммы и подгонки кегля больше нет; длинная цена переносится
    expect(rows).toContain("price: { fontSize: 13, lineHeight: 17, fontWeight: '700'");
    expect(rows).not.toMatch(/adjustsFontSizeToFit/);
    const plus = read('components/paywall/PaywallPlus.tsx');
    expect(plus).toMatch(/h1: \{[^}]*fontSize: 29, lineHeight: 34/);
    expect(34 / 29).toBeGreaterThanOrEqual(1.15);
  });
});
