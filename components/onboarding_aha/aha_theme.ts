// aha_theme.ts — палитра онбординга «ага» из сцены ТЕКУЩЕЙ темы (по умолчанию — тема по умолчанию; выбрали тему — перекрашивается сразу).
//
// зачем (решение владельца 28.10 через координатора: «онбординг — в цвета ТЕМЫ ПО УМОЛЧАНИЮ, после выбора темы всё сразу перекрашивается»; прежнее исключение
// «до выбора темы, своя палитра» из tests/onboarding_pre_theme_palette_exemption.test.mjs снято для этого файла): раньше — фиксированная палитра «Полночь» с
// фиолетовым (#C95CFF, #7B8CFF) у любой темы. Теперь ключи те же, значения считаются из сцены темы (homeSceneTokensForTheme: фон, три светлых оттенка акцента для кнопки и
// акцентов, глубокая подпись) и белого света сцены; зелёное/жёлтое пословной карты речи — токены good / warn темы. Чистый модуль без React;
// хук — use_aha_theme.ts; страж — tests/onboarding_aha_theme_palette.test.ts (все темы × оформления).
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { homeSceneTokensForTheme, relativeLuminance } from '../home/v2/scene/home_scene_tokens';
import { themeRoleAlpha } from '../theme_role_colors';

const HEX6 = /^#([0-9a-f]{6})$/i;
const toHex = (c: readonly number[]): string => `#${c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`.toUpperCase();

/** Тон hex, умноженный на k (k < 1 — темнее); не hex — как есть. */
function shade(hex: string, k: number): string {
  const m = HEX6.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return toHex([((n >> 16) & 255) * k, ((n >> 8) & 255) * k, (n & 255) * k]);
}

/** Цвет a, сдвинутый к b на долю k (светлее/темнее в сторону b). */
function mixToward(a: string, b: string, k: number): string {
  const ma = HEX6.exec(a);
  const mb = HEX6.exec(b);
  if (!ma || !mb) return a;
  const x = parseInt(ma[1], 16);
  const y = parseInt(mb[1], 16);
  const ch = (s: number) => ((x >> s) & 255) + (((y >> s) & 255) - ((x >> s) & 255)) * k;
  return toHex([ch(16), ch(8), ch(0)]);
}

/** Белый свет сцены с прозрачностью a (текст и стекло на тёмной сцене темы). */
const whiteA = (a: number): string => `rgba(255,255,255,${a})`;

function contrastOf(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (la === null || lb === null) return 1;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Подпись на светлой кнопке: низ сцены, затемнённый ровно настолько, чтобы читаться на всех оттенках кнопки (≥ 4,5). */
function legibleInk(bottom: string, stops: readonly string[]): string {
  for (let k = 0; k <= 10; k += 1) {
    const ink = shade(bottom, 1 - k / 10);
    if (stops.every((stop) => contrastOf(ink, stop) >= 4.5)) return ink;
  }
  return shade(bottom, 0);
}

export type AhaTheme = Readonly<{
  bgGradient: readonly [string, string, string];
  ctaGradient: readonly [string, string, string];
  ctaShadow: string;
  ctaTextColor: string;
  ctaDisabled: string;
  accentGradient: readonly [string, string, string];
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  bubbleBg: string;
  bubbleBorder: string;
  bubblePointerBg: string;
  cardBg: string;
  cardBorder: string;
  secondaryBg: string;
  secondaryBorder: string;
  chipBg: string;
  chipBorder: string;
  chipSelectedBg: string;
  chipSelectedBorder: string;
  chipHintBorder: string;
  karaokeIdle: string;
  karaokeLit: string;
  karaokeAccent: string;
  wordClean: string;
  wordFuzzy: string;
  wordMissed: string;
  blobBlue: string;
  blobViolet: string;
  vignetteTop: string;
  vignetteMid: string;
  vignetteBottom: string;
  micRing: string;
  micRingActive: string;
  confettiColors: readonly [string, string, string, string, string, string];
  /** Градиент кнопки, пока идёт запись: токен bad текущей темы. */
  recordGradient: readonly [string, string, string];
  radiusCard: number;
  radiusChip: number;
  radiusBubble: number;
}>;

const cache = new Map<string, AhaTheme>();

/** Палитра онбординга для темы и оформления; мемоизируется по (тема, оформление) — считается один раз. */
export function ahaThemeFor(themeId: string, appearance: 'dark' | 'light'): AhaTheme {
  const key = `${themeId}|${appearance}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const scene = homeSceneTokensForTheme(themeId, appearance);
  // зачем (замер 28.10): сцена онбординга ВСЕГДА тёмная (белый текст), поэтому зелёный/жёлтый/красный и акцент берутся из ТЁМНОГО набора токенов темы — светлый набор даёт 1,01:1 на тёмной сцене
  const glass = liquidGlassTokens(themeId, { level: 'max', appearance: 'dark' });
  const [ring1, ring2, ring3] = scene.todayRing;
  const bottom = scene.sceneBottom;
  const deep = shade(bottom, 0.45);
  const next: AhaTheme = Object.freeze({
    bgGradient: [scene.sceneTop, bottom, deep] as const,
    ctaGradient: [ring1, ring2, ring3] as const,
    ctaShadow: shade(ring3, 0.5),
    ctaTextColor: legibleInk(bottom, [ring1, ring2, ring3]),
    ctaDisabled: whiteA(0.28),
    accentGradient: [ring1, ring2, ring3] as const,

    textPrimary: whiteA(1),
    textSecondary: whiteA(0.78),
    textMuted: whiteA(0.62),

    bubbleBg: whiteA(0.1),
    bubbleBorder: whiteA(0.16),
    bubblePointerBg: shade(bottom, 0.7),

    cardBg: whiteA(0.08),
    cardBorder: whiteA(0.16),
    secondaryBg: whiteA(0.05),
    secondaryBorder: whiteA(0.22),

    chipBg: whiteA(0.1),
    chipBorder: whiteA(0.2),
    chipSelectedBg: themeRoleAlpha(ring2, 0.22),
    chipSelectedBorder: ring2,
    chipHintBorder: themeRoleAlpha(ring3, 0.7),

    karaokeIdle: whiteA(0.5),
    karaokeLit: whiteA(1),
    karaokeAccent: ring1,

    wordClean: glass.good,
    wordFuzzy: glass.warn,
    wordMissed: whiteA(0.4),

    blobBlue: themeRoleAlpha(ring2, 0.18),
    blobViolet: themeRoleAlpha(ring3, 0.14),

    vignetteTop: themeRoleAlpha(deep, 0.88),
    vignetteMid: themeRoleAlpha(deep, 0.3),
    vignetteBottom: themeRoleAlpha(deep, 0.92),

    micRing: ring2,
    micRingActive: ring3,

    confettiColors: [ring1, ring2, ring3, glass.good, glass.warn, glass.accentGraphic] as const,
    recordGradient: [mixToward(glass.bad, glass.text, 0.3), mixToward(glass.bad, glass.text, 0.15), glass.bad] as const,

    radiusCard: 14,
    radiusChip: 12,
    radiusBubble: 18,
  });
  cache.set(key, next);
  return next;
}
