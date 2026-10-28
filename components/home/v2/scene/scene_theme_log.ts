// ═══════════════════════════════════════════════════════════════════════════
// scene_theme_log.ts — единый журнал «какими цветами и откуда нарисована сцена» на каждом экране со сценой.
//
// зачем (баг владельца 28.10: «тема серая, а сцена в уроках будет фиолетовая, или в других местах будет отличаться»; закон «сперва логи»):
// чтобы по одному поиску `[SCENE-THEME]` видеть для каждого экрана тему, оформление, источник токенов и реально применённые цвета —
// и сразу заметить экран, чья сцена не совпала с темой. Печатает только при смене набора (без шума на каждый рендер). Чистый модуль без React.
// ═══════════════════════════════════════════════════════════════════════════
import { homeSceneOklchOf } from './home_scene_tokens';

export const SCENE_THEME_LOG = '[SCENE-THEME]';
const HEX6 = /^#([0-9a-f]{6})$/i;
const lastByScreen = new Map<string, string>();

/** Насыщенность и оттенок цвета #rrggbb в OKLCH — чтобы серую тему отличить от цветной в журнале; не hex → null. */
function tintOf(hex: string): Readonly<{ chroma: number; hue: number }> | null {
  const m = HEX6.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const [, chroma, hue] = homeSceneOklchOf([(n >> 16) & 255, (n >> 8) & 255, n & 255]);
  return { chroma: Math.round(chroma * 1000) / 1000, hue: Math.round(hue) };
}

/**
 * Записать в журнал сцену экрана `screen`: тема, оформление, откуда токены (`source`) и цвета. Для hex-цветов в записи — насыщенность и оттенок.
 * Повтор тех же значений для того же экрана молчит.
 */
export function logSceneTheme(screen: string, themeId: string, appearance: 'dark' | 'light', source: string, colors: Readonly<Record<string, string | number | null>>): void {
  const tints: Record<string, { chroma: number; hue: number }> = {};
  for (const [key, value] of Object.entries(colors)) {
    if (typeof value !== 'string') continue;
    const tint = tintOf(value);
    if (tint) tints[key] = tint;
  }
  const body = JSON.stringify({ themeId, appearance, source, colors, tints });
  if (lastByScreen.get(screen) === body) return;
  lastByScreen.set(screen, body);
  console.log(SCENE_THEME_LOG, screen, body);
}
