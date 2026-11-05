// зачем (координатор 18.10, находка Макетов 22, evidence/modals_1018/theme_boot): заставка была захардкожена тёмной #101214 —
// при светлой системе ~4 с тёмный экран, затем сразу светлая Главная (вспышка). Цвет заставки теперь по сохранённой теме
// (когда выбор темы прочитан), а до этого — по системной схеме; в тёмной — прежний #101214, как у нативной заставки.

/** Фон нативной и экранной заставки в тёмной системе (app.json expo-splash-screen dark). */
export const STARTUP_SPLASH_DARK_BG = '#101214';
/** Фон в светлой системе до чтения темы — фон светлой «Графит» (тот же, что в app.json expo-splash-screen для светлой). */
export const STARTUP_SPLASH_LIGHT_BG = '#EDF0F4';
const LIGHT_INK = '#16191C';
const LIGHT_SUB = '#575B60';
const DARK_SUB = 'rgb(174,170,161)';

export type StartupSplashPalette = Readonly<{
  bg: string;
  /** Цвет надписи «Phraseman» (tintColor); null — исходный светлый рисунок. */
  wordmarkTint: string | null;
  subtitle: string;
  light: boolean;
  source: 'theme' | 'system';
}>;

type ThemeLike = Readonly<{ bg: string; text: string; secondary: string; isLight?: boolean }>;

// зачем (владелец 05.11): «сплеш не делай белого цвета — он был раньше тёмный, тёмным должен оставаться вне зависимости от темы интерфейса».
// Заставка ВСЕГДА тёмная (#101214 + исходный светлый рисунок), и при светлой системе, и при светлой теме. Параметры оставлены для
// журнала [THEME-BOOT] (что было бы раньше) — решение от них больше не зависит.
export function startupSplashPalette(systemScheme: string | null | undefined, theme: ThemeLike | null): StartupSplashPalette {
  return { bg: STARTUP_SPLASH_DARK_BG, wordmarkTint: null, subtitle: DARK_SUB, light: false, source: theme ? 'theme' : 'system' };
}
/** Прежние светлые значения — не используются (владелец 05.11: заставка всегда тёмная); оставлены для истории и тестов. */
export const STARTUP_SPLASH_LEGACY_LIGHT = Object.freeze({ bg: STARTUP_SPLASH_LIGHT_BG, ink: LIGHT_INK, sub: LIGHT_SUB });
