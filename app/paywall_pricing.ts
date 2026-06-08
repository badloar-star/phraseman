/**
 * paywall_pricing.ts — расчёты цены для пейвола (план #9 fallback экономии, #10 цена в день).
 *
 * Все суммы берутся из стора (RevenueCat) — НИКОГДА не хардкодим (урок прошлых правок:
 * убранный $4.99/$39.99 из onboarding). Эти функции лишь форматируют то, что отдал стор.
 *
 * Декаплинг цены (Prelec & Loewenstein) — Правило 3 Библии: «никогда не показываем
 * месячную цену без амортизации». Здесь — амортизация годовой до дня.
 */

/**
 * Парсит число из строки цены стора. Поддерживает «$4.99», «₽299», «€9,99»,
 * «Rp 79.000» (тысячный разделитель). Возвращает null, если число не извлекается.
 */
export function parsePriceNumeric(priceStr: string | null | undefined): number | null {
  if (!priceStr || typeof priceStr !== 'string') return null;
  const trimmed = priceStr.trim();
  if (!trimmed) return null;

  const match = trimmed.replace(/\s/g, '').match(/[\d.,]+/);
  if (!match) return null;
  const numericStr = match[0];

  const lastComma = numericStr.lastIndexOf(',');
  const lastDot = numericStr.lastIndexOf('.');

  let value: number;
  if (lastComma > lastDot) {
    // запятая правее точки → десятичная запятая («1.234,56»)
    value = parseFloat(numericStr.replace(/\./g, '').replace(',', '.'));
  } else if (lastDot > lastComma) {
    const afterDot = numericStr.substring(lastDot + 1);
    if (afterDot.length === 3) {
      // «79.000» — тысячный разделитель
      value = parseFloat(numericStr.replace(/[.,]/g, ''));
    } else {
      value = parseFloat(numericStr.replace(/,/g, ''));
    }
  } else {
    value = parseFloat(numericStr);
  }

  return Number.isFinite(value) && value > 0 ? value : null;
}

function currencyAffixes(priceStr: string): { prefix: string; suffix: string } {
  const trimmed = priceStr.trim();
  return {
    prefix: trimmed.match(/^[^0-9]+/)?.[0] ?? '',
    suffix: trimmed.match(/[^0-9]+$/)?.[0] ?? '',
  };
}

export interface SavingsInput {
  /** product.pricePerMonth годового пакета (число, из RevenueCat). */
  yearlyPerMonth?: number | null;
  /** product.pricePerMonth месячного пакета. */
  monthlyPerMonth?: number | null;
  /** Строки цены — для fallback, когда pricePerMonth не пришёл. */
  yearlyPriceStr?: string | null;
  monthlyPriceStr?: string | null;
}

/**
 * Процент экономии годового плана. Сначала из числовых pricePerMonth (точно),
 * иначе fallback: годовая цена vs месячная×12 (по строкам). null — если выгоды нет
 * или данных недостаточно.
 */
export function computeSavingsPct(input: SavingsInput): number | null {
  const { yearlyPerMonth, monthlyPerMonth } = input;
  if (yearlyPerMonth && monthlyPerMonth && monthlyPerMonth > 0) {
    const pct = Math.round((1 - yearlyPerMonth / monthlyPerMonth) * 100);
    return pct > 0 ? pct : null;
  }

  // Fallback по строкам: year vs month*12
  const y = parsePriceNumeric(input.yearlyPriceStr);
  const m = parsePriceNumeric(input.monthlyPriceStr);
  if (y && m && m * 12 > y) {
    const pct = Math.round((1 - y / (m * 12)) * 100);
    return pct > 0 ? pct : null;
  }

  return null;
}

/**
 * Цена в день из годовой (amount/365), с тем же символом валюты, что в строке стора.
 * Возвращает null, если цена не парсится. Округление: 2 знака для дробной валюты,
 * 0 знаков для крупных номиналов (₽/Rp).
 *
 * `numericHint` — точная числовая цена из стора (product.price). Если задана, она
 * приоритетнее парсинга строки: устраняет неоднозначность тысячного разделителя
 * (напр. «€9.990» = 9.99/мес × 12, а не 9990).
 */
export function computePerDayString(
  yearlyPriceStr: string | null | undefined,
  numericHint?: number | null,
): string | null {
  const value = (typeof numericHint === 'number' && Number.isFinite(numericHint) && numericHint > 0)
    ? numericHint
    : parsePriceNumeric(yearlyPriceStr);
  if (value === null || !yearlyPriceStr) return null;

  const perDay = value / 365;
  const { prefix, suffix } = currencyAffixes(yearlyPriceStr);

  // Решение о копейках — по величине дневной цены, а не по (неоднозначной) строке:
  // мелкая сумма (<10) информативна с 2 знаками ($0.33); крупная (₽/Rp) — целым числом.
  const formatted = perDay < 10 ? perDay.toFixed(2) : String(Math.max(1, Math.round(perDay)));

  return `${prefix}${formatted}${suffix}`.trim();
}
