import { colorContrast } from '../../constants/color_contrast';

type DeleteTokens = Readonly<{ bad: string; bg: string; text: string; buttonFillDisabled: string; buttonInkDisabled: string }>;

/**
 * Заливка и подпись кнопки «Удалить» в окне удаления аккаунта.
 *
 * зачем (координатор 18.10, вариант (а), [BLEND-AUTH]): приглушённая кнопка (wrongBg 12 % + постоянный #F05454) давала подпись до 3,82:1 и тон 1,15 —
 * необратимое действие читалось хуже «Отмены». Как в iOS: когда слово подтверждения введено — сплошная заливка bad темы, подпись — фон или текст
 * темы, что контрастнее на ней (в тёмных bad светлый → тёмная подпись, в светлых bad тёмный → светлая). До ввода — пара неактивной кнопки темы.
 */
export function deleteButtonPaint(g: DeleteTokens, armed: boolean): Readonly<{ fill: string; ink: string }> {
  if (!armed) return { fill: g.buttonFillDisabled, ink: g.buttonInkDisabled };
  const ink = colorContrast(g.bg, g.bad) >= colorContrast(g.text, g.bad) ? g.bg : g.text;
  return { fill: g.bad, ink };
}
