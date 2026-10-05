import { useCallback } from 'react';
import { useWindowDimensions } from 'react-native';

/**
 * Масштаб межстрочного под системный размер шрифта — общий для всех экранов.
 *
 * зачем (координатор 05.10, FONTSCALE2): система масштабирует fontSize, а заданный lineHeight остаётся прежним — строка становится
 * ниже глифов, и низ букв срезается. Шрифт сжимать нельзя (правило владельца), поэтому растим lineHeight тем же коэффициентом.
 * При шрифте 1.0 и меньше коэффициент ровно 1 и число возвращается без изменений — вид совпадает с макетом пиксель в пиксель.
 */
export function lineScaleFactor(fontScale: number): number {
  return Number.isFinite(fontScale) && fontScale > 1 ? fontScale : 1;
}

export function scaleLineHeight(lineHeight: number, fontScale: number): number {
  const factor = lineScaleFactor(fontScale);
  return factor === 1 ? lineHeight : Math.round(lineHeight * factor);
}

/**
 * Возвращает функцию `lh(n)`. Ссылка на функцию меняется только вместе с fontScale — зависимости useMemo/useCallback
 * у потребителей не дёргаются, пока человек не сменил размер шрифта в системе.
 */
export function useLineScale(): (lineHeight: number) => number {
  const { fontScale } = useWindowDimensions();
  const factor = lineScaleFactor(fontScale);
  return useCallback((lineHeight: number) => (factor === 1 ? lineHeight : Math.round(lineHeight * factor)), [factor]);
}
