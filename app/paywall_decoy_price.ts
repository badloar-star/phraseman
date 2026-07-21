// ════════════════════════════════════════════════════════════════════════════
// paywall_decoy_price.ts — чистая функция цены-приманки для варианта G
// («Якорь и приманка»). Вынесена из компонентов, чтобы оставаться тестируемой
// в node-окружении без react-native (контрактные тесты). Рендерится как
// display-only карточка «6 месяцев» внутри PaywallPlanCards (проп
// decoyPriceString) между «Годом» и «Месяцем».
// ════════════════════════════════════════════════════════════════════════════

/**
 * Считает цену-приманку из строки цены стора: число × 0.85, с сохранением
 * символа валюты, позиции символа и десятичного разделителя оригинала
 * («€34,99» → «€29,74», «$24.99» → «$21.24»).
 * Возвращает null, если число распарсить не удалось (карточку тогда скрываем).
 */
export function computeDecoyPriceString(priceString: string): string | null {
  const m = priceString.match(/\d[\d\s.,]*/);
  if (!m || m.index === undefined) return null;
  // Обрезаем хвостовые не-цифры (пробел перед символом валюты и т.п.).
  const token = m[0].replace(/[^\d]+$/, '');
  // Десятичный разделитель — ПОСЛЕДНИЙ '.' или ',' в числе, если после него
  // ровно 1–2 цифры (иначе это разделитель тысяч: «1,990»).
  let decimalSep: string | null = null;
  let intRaw = token;
  let fracRaw = '';
  const lastSepIdx = Math.max(token.lastIndexOf('.'), token.lastIndexOf(','));
  if (lastSepIdx > 0) {
    const after = token.slice(lastSepIdx + 1);
    if (/^\d{1,2}$/.test(after)) {
      decimalSep = token[lastSepIdx];
      intRaw = token.slice(0, lastSepIdx);
      fracRaw = after;
    }
  }
  const intValue = Number(intRaw.replace(/[^\d]/g, ''));
  const value = intValue + (fracRaw ? Number(`0.${fracRaw}`) : 0);
  if (!Number.isFinite(value) || value <= 0) return null;
  const decoy = value * 0.85;
  let formatted = fracRaw ? decoy.toFixed(fracRaw.length) : String(Math.round(decoy));
  if (decimalSep) formatted = formatted.replace('.', decimalSep);
  return priceString.slice(0, m.index) + formatted + priceString.slice(m.index + token.length);
}
