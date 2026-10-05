import { useCallback, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

/**
 * Масштаб межстрочного под системный размер шрифта — общий для всех экранов.
 *
 * зачем (координатор 05.10, FONTSCALE2): система масштабирует fontSize, а заданный lineHeight остаётся прежним — строка становится
 * ниже глифов, и низ букв срезается. Шрифт сжимать нельзя (правило владельца), поэтому растим lineHeight тем же коэффициентом.
 * При шрифте 1.0 и меньше коэффициент ровно 1 и число возвращается без изменений — вид совпадает с макетом пиксель в пиксель.
 *
 * Предел `maxMultiplier` (доработка Дизайна 05.10): там, где у Text стоит `maxFontSizeMultiplier` (1.2–1.3), сам текст растёт не больше
 * этого множителя, значит и строка должна расти не больше — иначе при системном 2.0 текст ×1.3, а строка ×2 (лишний воздух).
 */
export function lineScaleFactor(fontScale: number, maxMultiplier?: number): number {
  if (!Number.isFinite(fontScale) || fontScale <= 1) return 1;
  if (maxMultiplier !== undefined && Number.isFinite(maxMultiplier) && maxMultiplier >= 1) return Math.min(fontScale, maxMultiplier);
  return fontScale;
}

/** Округление до десятой: 22 × 1.3 = 28.6 (дробный lineHeight RN принимает), целые коэффициенты дают целые числа. */
const round1 = (value: number): number => Math.round(value * 10) / 10;

export function scaleLineHeight(lineHeight: number, fontScale: number, maxMultiplier?: number): number {
  const factor = lineScaleFactor(fontScale, maxMultiplier);
  return factor === 1 ? lineHeight : round1(lineHeight * factor);
}

/**
 * Возвращает функцию `lh(n, maxMultiplier?)`. Ссылка на функцию меняется только вместе с fontScale — зависимости useMemo/useCallback
 * у потребителей не дёргаются, пока человек не сменил размер шрифта в системе.
 */
export function useLineScale(): (lineHeight: number, maxMultiplier?: number) => number {
  const { fontScale } = useWindowDimensions();
  const base = lineScaleFactor(fontScale);
  return useCallback((lineHeight: number, maxMultiplier?: number) => {
    const factor = base === 1 ? 1 : lineScaleFactor(base, maxMultiplier);
    return factor === 1 ? lineHeight : round1(lineHeight * factor);
  }, [base]);
}

/**
 * Копия набора стилей, где у каждого стиля с `lineHeight` межстрочный масштабирован под системный шрифт.
 * При шрифте 1.0 возвращает ТОТ ЖЕ объект (ссылка не меняется) — разметка гарантированно прежняя; пересчёт только при смене размера шрифта.
 * `maxMultiplier` — предел роста, если у текстов этих стилей стоит maxFontSizeMultiplier.
 */
export function useScaledTextStyles<T extends Record<string, unknown>>(styles: T, maxMultiplier?: number): T {
  const { fontScale } = useWindowDimensions();
  const factor = lineScaleFactor(fontScale, maxMultiplier);
  return useMemo(() => {
    if (factor === 1) return styles;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(styles)) {
      const style = styles[key];
      out[key] = style && typeof style === 'object' && typeof (style as { lineHeight?: unknown }).lineHeight === 'number'
        ? { ...(style as object), lineHeight: round1((style as { lineHeight: number }).lineHeight * factor) }
        : style;
    }
    return out as T;
  }, [factor, styles]);
}
