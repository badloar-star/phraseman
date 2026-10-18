import { colorContrast, readableOn } from './color_contrast';

/**
 * Цвет молнии «низкий заряд» на капсуле энергии в стеклянной шапке.
 *
 * зачем ([BLEND-AUDIT] 18.10, координатор: «кнопки нигде не сливаются»): красный `bad` на заливке капсулы buttonFill давал 1,65–2,05:1.
 * Подгоняем оттенок под заливку до 3:1 (graphic); если у середины светлоты в нужную сторону не дотянуть (светлые градиентные темы) —
 * берём основной цвет текста темы, он ≥ 5,7:1 на buttonFill во всех темах. Смысл «мало» несёт и число рядом.
 */
export function lowChargeInk(bad: string, fill: string, text: string): string {
  const adjusted = readableOn(bad, fill, 3);
  return colorContrast(adjusted, fill) >= 3 ? adjusted : text;
}
