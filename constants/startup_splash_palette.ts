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

export function startupSplashPalette(systemScheme: string | null | undefined, theme: ThemeLike | null): StartupSplashPalette {
  if (theme) {
    const light = !!theme.isLight;
    return { bg: theme.bg, wordmarkTint: light ? theme.text : null, subtitle: light ? theme.secondary : DARK_SUB, light, source: 'theme' };
  }
  const light = systemScheme === 'light';
  return light
    ? { bg: STARTUP_SPLASH_LIGHT_BG, wordmarkTint: LIGHT_INK, subtitle: LIGHT_SUB, light, source: 'system' }
    : { bg: STARTUP_SPLASH_DARK_BG, wordmarkTint: null, subtitle: DARK_SUB, light, source: 'system' };
}
