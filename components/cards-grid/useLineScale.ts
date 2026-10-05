import { useWindowDimensions } from 'react-native';

/**
 * Масштаб межстрочного под системный размер шрифта.
 *
 * зачем (координатор 05.10, FONTSCALE2): система масштабирует fontSize, а заданный lineHeight остаётся прежним — строка становится
 * ниже глифов, и низ букв срезается. Шрифт сжимать нельзя (правило владельца), поэтому растим lineHeight тем же коэффициентом.
 * При шрифте 1.0 (и меньше) возвращает число без изменений — вид совпадает с макетом пиксель в пиксель.
 */
export function useLineScale(): (lineHeight: number) => number {
  const { fontScale } = useWindowDimensions();
  const fs = Math.max(1, fontScale);
  return (lineHeight: number) => (fs === 1 ? lineHeight : Math.round(lineHeight * fs));
}
