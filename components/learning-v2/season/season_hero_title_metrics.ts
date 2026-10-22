// зачем (владелец 22.10: «меньше шрифт и более компактно!» про заголовок обложки урока — раньше 30/36, три строки крупным жирным): базовый кегль 24/29, длинные названия — 22/27.
// Перенос только по словам, без ужатия (запрет adjustsFontSizeToFit). Числа здесь, чтобы сторож (tests/season_hero_title_fit_contract.test.ts) считал по тем же значениям, что и экран.
export const SEASON_HERO_TITLE_BASE = { fontSize: 24, lineHeight: 29 } as const;
export const SEASON_HERO_TITLE_LONG = { fontSize: 22, lineHeight: 27 } as const;
/** Очень длинные названия (составные темы урока) — ещё компактнее, чтобы уложиться в три строки на 360 dp. */
export const SEASON_HERO_TITLE_XLONG = { fontSize: 20, lineHeight: 24 } as const;
export const SEASON_HERO_TITLE_XLONG_FROM = 56;
/** Название длиннее этого числа знаков набирается меньшим кеглем. */
export const SEASON_HERO_TITLE_LONG_FROM = 28;
/** Боковые поля обложки (dp) — ширина текста = ширина экрана − 2 × поле. */
export const SEASON_HERO_PAD_H = 20;

export function seasonHeroTitleSize(title: string): Readonly<{ fontSize: number; lineHeight: number }> {
  if (title.length > SEASON_HERO_TITLE_XLONG_FROM) return SEASON_HERO_TITLE_XLONG;
  return title.length > SEASON_HERO_TITLE_LONG_FROM ? SEASON_HERO_TITLE_LONG : SEASON_HERO_TITLE_BASE;
}
