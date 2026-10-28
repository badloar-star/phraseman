// ═══════════════════════════════════════════════════════════════════════════
// language_welcome_palette.ts — цвета экрана «Приветствие нового языка» из сцены ТЕКУЩЕЙ темы.
//
// зачем (баг владельца 28.10: «тема серая, а сцена в уроках будет фиолетовая, или в других местах будет отличаться — везде по цвету темы»;
// задача координатора: «ВСЕ сцены берут цвета из одной функции от текущей темы, экраны не держат своих палитр»): экран держал свою фиксированную
// палитру (фон #07111F, кнопка #E3ECFF → #7B8CFF → #C95CFF — фиолетовая при любой теме). Теперь фон — градиент сцены темы (homeSceneTokensForTheme, как Главная),
// текст — белый свет сцены (SPIRE_SCENE_INK), акцент и кнопка — светлые оттенки акцента темы (todayRing: ≥ 3:1 на сцене). Новых цветов не вводится.
// Чистый модуль без React: страж — tests/language_welcome_theme_palette.test.ts (все темы × оформления).
// ═══════════════════════════════════════════════════════════════════════════
import { homeSceneTokensForTheme, relativeLuminance } from '../components/home/v2/scene/home_scene_tokens';
import { SPIRE_SCENE_INK } from '../components/spire/scene/spire_scene_palette';

export type LanguageWelcomePalette = Readonly<{
  /** Градиент сцены сверху вниз; нижний цвет — фон экрана. */
  top: string;
  bottom: string;
  /** Основной текст, вторичный текст на сцене. */
  text: string;
  soft: string;
  /** Подпись на светлой кнопке и галочке: цвет низа сцены (глубокий тон темы). */
  ink: string;
  /** Акцент темы на сцене: активная точка, метка, выбранный пункт. */
  accent: string;
  accentSoft: string;
  /** Заливка выбранного пункта и ореол финала — тот же оттенок, полупрозрачный. */
  haloDone: string;
  card: string;
  plate: string;
  line: string;
  dot: string;
  /** Градиент главной кнопки (три светлых оттенка акцента) и выключенной. */
  cta: readonly [string, string, string];
  ctaDisabled: readonly [string, string];
}>;

/** '#rrggbb' + прозрачность → rgba(...); не hex — строка как есть. */
function withAlpha(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** Контраст двух #rrggbb (WCAG); не hex — 1. */
function contrastOf(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (la === null || lb === null) return 1;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Тон низа сцены, затемнённый ровно настолько, чтобы подпись читалась на всех оттенках кнопки (≥ 4,5); у большинства тем затемнение не нужно. */
function legibleInk(bottom: string, stops: readonly string[]): string {
  const m = /^#([0-9a-f]{6})$/i.exec(bottom);
  if (!m) return bottom;
  const n = parseInt(m[1], 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  for (let k = 0; k <= 10; k += 1) {
    const f = 1 - k / 10;
    const ink = `#${rgb.map((v) => Math.round(v * f).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
    if (stops.every((stop) => contrastOf(ink, stop) >= 4.5)) return ink;
  }
  return '#000000';
}

/** Палитра экрана для темы и оформления: всё из одной функции сцены темы. */
export function languageWelcomePalette(themeId: string, appearance: 'dark' | 'light'): LanguageWelcomePalette {
  const scene = homeSceneTokensForTheme(themeId, appearance);
  const accent = scene.todayRing[1];
  return Object.freeze({
    top: scene.sceneTop,
    bottom: scene.sceneBottom,
    text: SPIRE_SCENE_INK.text,
    soft: SPIRE_SCENE_INK.muted,
    ink: legibleInk(scene.sceneBottom, scene.todayRing),
    accent,
    accentSoft: withAlpha(accent, 0.16),
    haloDone: withAlpha(accent, 0.22),
    card: SPIRE_SCENE_INK.skeleton,
    plate: SPIRE_SCENE_INK.skeleton,
    line: SPIRE_SCENE_INK.barTrack,
    dot: SPIRE_SCENE_INK.barTrack,
    cta: scene.todayRing,
    ctaDisabled: [SPIRE_SCENE_INK.barTrack, SPIRE_SCENE_INK.barTrack] as const,
  });
}
