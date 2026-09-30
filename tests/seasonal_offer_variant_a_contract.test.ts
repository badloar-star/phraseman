/**
 * Утверждённый владельцем сезонный вариант A:
 * - ровный lime-бейдж в хедере Главной;
 * - диагональный −N% на углу цены во всех семи пейволах;
 * - стор, а не Remote Config, остаётся источником цены/процента.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const read = (...parts: string[]) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');

describe('seasonal offer variant A', () => {
  it('keeps the Home header badge horizontal, lime, and accessible', () => {
    const homeBadge = read('components', 'HomeDiscountBadge.tsx');
    expect(homeBadge).toContain("'#D9FF61'");
    expect(homeBadge).toContain("color=\"#12200A\"");
    expect(homeBadge).toContain('accessibilityRole="button"');
    expect(homeBadge).not.toMatch(/rotate\(/u);
  });

  // Уголок −N% и семь пейволов A–G удалены 2026-09-30 (D78). Промо-цену стора
  // единственный пейвол Plus показывает на карточке тарифа
  // (tests/paywall_store_promo_price_contract.test.ts).

  it('keeps a separate admin control area explicit about store activation', () => {
    const admin = read('admin', 'v2', 'legacy.html');
    expect(admin).toContain('id="cp-seasonal-offer-card"');
    expect(admin).toContain('не активирует скидку в сторах');
    expect(admin).toContain('discount_offer_banner_enabled');
  });
});
