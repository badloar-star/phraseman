// зачем (координатор 15.10, предложение А + находка теста): цвет слоя .accent на глине.
// Тёмное оформление: `accent` — насыщенный (Закат #FF9A84 C0,13, Мята #5ED99E C0,14), а прежний `accentBright` — пастель (C 0,03–0,10) → деталь «бледная».
// Светлое оформление: на светлых ГРАДИЕНТНЫХ темах при Максимуме `accent` — пастельная заливка (контраст к светлой глине 1,08–1,52), там деталь даёт `accentBright`
// (≥ 3,89 к глине, замер 15.10); на остальных светлых темах они совпадают. Уровень 0 «Спокойно» остаётся нейтральным в обоих оформлениях.
import type { GlassTokens } from '../../constants/liquidGlassThemePalette';

export function artAccentTint(tokens: Pick<GlassTokens, 'accent' | 'accentBright'>, appearance: 'dark' | 'light'): string {
  return appearance === 'dark' ? tokens.accent : tokens.accentBright;
}
