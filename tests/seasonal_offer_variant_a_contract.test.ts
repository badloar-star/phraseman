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
  // зачем (Q92, 01.10): бейдж скидки на шапке Главной (HomeDiscountBadge) удалён как сирота без импортов.

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
