// paywall_price_font — кегль суммы в плитке тарифа по длине строки и масштабу шрифта системы (ревью пейвола C, 05.11).
// зачем: плитки стоят в ряд (≈120 dp текста), а «₫2.290.000» / «Rp 599.000» при шрифте ×1,3 рвались по символам — сумма списания должна читаться целиком.
// Без adjustsFontSizeToFit и без numberOfLines: размер считается заранее, текст не обрезается; ниже 15 не опускаем (правило мелких текстов).
export const PAYWALL_PRICE_FONT_MAX = 22;
export const PAYWALL_PRICE_FONT_MIN = 15;
/** Ширина строки цены в плитке на экране 360 dp (≈ 150 − отступы), dp. */
const PRICE_TEXT_BUDGET = 118;
const GLYPH_WIDTH_EM = 0.55;

export function paywallPriceFontSize(text: string, fontScale: number): number {
  const chars = Math.max(1, Array.from(text).length);
  const scale = Number.isFinite(fontScale) && fontScale > 0 ? fontScale : 1;
  const fit = Math.floor(PRICE_TEXT_BUDGET / (chars * GLYPH_WIDTH_EM * scale));
  return Math.max(PAYWALL_PRICE_FONT_MIN, Math.min(PAYWALL_PRICE_FONT_MAX, fit));
}

/** Межстрочный для суммы — относительный, чтобы строки не слипались при крупном шрифте. */
export function paywallPriceLineHeight(fontSize: number): number {
  return Math.round(fontSize * 1.2);
}
