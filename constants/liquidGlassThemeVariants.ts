// ═══════════════════════════════════════════════════════════════════════════
// Темы 2.0: уровни цвета «Спокойно / Акцент / Максимум» и светлое оформление.
//
// зачем (владелец 2026-09-30, макет themes-v2-proposals.html): темы должны реально
// что-то менять. Старая формула тонких тем давала насыщенность ~0.02 — кнопка почти
// белая у всех 13 тем. Поэтому яркость НЕ поднимается в старой формуле, а у каждой
// темы есть свой «яркий двойник» (оттенок, второй оттенок, насыщенность, семейство).
//   • Спокойно — одобренные тонкие темы байт-в-байт (по умолчанию у всех);
//   • Акцент  — фон и карточки прежние, цвет темы только у элементов (кнопка, выбор,
//               капсула таббара, ссылки, прогресс, кольца, значки плиток, огонь, молния);
//   • Максимум — плюс свечение фона и цветная дымка внутри карточек (стекло ≥ 0.9).
// Монеты, «верно/ошибка», сердца и иллюстрации темой НЕ красятся — здесь их нет.
// Формулы — ровно из themes-v2-proposals.css (.vv / .vv.vk / .vv.vl / .vl.vt / .vl.vf).
// ═══════════════════════════════════════════════════════════════════════════

import { alpha, oklchA, oklchToHex } from './liquidGlassColor';

export const LIQUID_GLASS_COLOR_LEVELS = ['calm', 'accent', 'max'] as const;
export type LiquidGlassColorLevel = typeof LIQUID_GLASS_COLOR_LEVELS[number];
export const LIQUID_GLASS_APPEARANCES = ['dark', 'light'] as const;
export type LiquidGlassAppearance = typeof LIQUID_GLASS_APPEARANCES[number];
/**
 * `intensity` (0…1, ползунок 2026-10-04) главнее `level`: без неё вариант берёт опорную
 * точку уровня (calm 0 / accent 0.5 / max 1) — старые вызовы с одним `level` не меняются.
 */
export type LiquidGlassVariant = Readonly<{ level: LiquidGlassColorLevel; appearance: LiquidGlassAppearance; intensity?: number }>;

export const DEFAULT_LIQUID_GLASS_VARIANT: LiquidGlassVariant = Object.freeze({ level: 'calm', appearance: 'dark', intensity: 0 });

/** Неизвестное значение из хранилища → «Спокойно» (как было до уровней). */
export function resolveLiquidGlassColorLevel(value: unknown): LiquidGlassColorLevel {
  return typeof value === 'string' && (LIQUID_GLASS_COLOR_LEVELS as readonly string[]).includes(value)
    ? value as LiquidGlassColorLevel
    : 'calm';
}

/** Неизвестное значение из хранилища → тёмное (как было до светлого режима). */
export function resolveLiquidGlassAppearance(value: unknown): LiquidGlassAppearance {
  return value === 'light' ? 'light' : 'dark';
}

type Family = 'gem' | 'metal' | 'nature' | 'night';
export type LiquidGlassVivid = Readonly<{ fam: Family; h: number; h2: number; c: number }>;

/** Яркий двойник каждой темы — `VIVID` из themes-v2-proposals.js (ключи тем прежние). */
export const LIQUID_GLASS_VIVID: Readonly<Record<string, LiquidGlassVivid>> = Object.freeze({
  graphite: { fam: 'metal', h: 250, h2: 215, c: 0.04 },
  polar: { fam: 'nature', h: 244, h2: 212, c: 0.095 },
  slate: { fam: 'gem', h: 262, h2: 262, c: 0.15 },
  ink: { fam: 'night', h: 282, h2: 305, c: 0.085 },
  lavender: { fam: 'gem', h: 305, h2: 305, c: 0.15 },
  iris: { fam: 'night', h: 332, h2: 292, c: 0.085 },
  rose: { fam: 'metal', h: 22, h2: 58, c: 0.075 },
  terracotta: { fam: 'nature', h: 32, h2: 72, c: 0.14 },
  taupe: { fam: 'metal', h: 58, h2: 78, c: 0.085 },
  olive: { fam: 'metal', h: 78, h2: 92, c: 0.115 },
  sage: { fam: 'gem', h: 160, h2: 160, c: 0.14 },
  eucalyptus: { fam: 'nature', h: 186, h2: 145, c: 0.12 },
  marine: { fam: 'nature', h: 216, h2: 186, c: 0.11 },
});

type Point = Readonly<{ x: number; y: number }>;

/** Роли цвета темы. В «Спокойно» (тёмное) они повторяют нейтральные токены темы. */
export type LiquidGlassAccentRoles = Readonly<{
  level: LiquidGlassColorLevel;
  appearance: LiquidGlassAppearance;
  isLight: boolean;
  /** Заливка главной кнопки (сплошной цвет; градиент — accentGradient). */
  accent: string;
  /** Текст и значок на главной кнопке. */
  accentInk: string;
  /** Ссылки, кольца, огонь серии, молния — на нейтральном стекле. */
  accentText: string;
  /** Активная вкладка таббара и значки плиток. */
  accentBright: string;
  /** Заливка выбранного варианта / тарифа. */
  accentSoft: string;
  /** Кромка и точка выбранного варианта / радио. */
  accentBorder: string;
  /** Тон капсулы таббара и выбранного сегмента. */
  accentCap: string;
  /** Подложка значка в плитке. */
  accentTile: string;
  /** Мягкое свечение под кнопкой и прогрессом. */
  accentGlow: string;
  accentGradient: readonly string[];
  accentGradientStart: Point;
  accentGradientEnd: Point;
  progressGradient: readonly string[];
  /** Надзаголовок карточки («ПРОДОЛЖИТЬ ОБУЧЕНИЕ»). */
  overline: string;
  /** Свечение фона — только «Максимум», иначе прозрачное. */
  bgGlow: readonly [string, string, string];
  /** Цветная дымка внутри карточек — только «Максимум», иначе прозрачная. */
  cardSmoke: readonly [string, string];
  /** Цвет тени карточек (в светлом — в тон темы). */
  shadowTint: string;
}>;

/** Нейтральные токены темы (без ролей). Совпадает с GlassTokens в палитре. */
export type LiquidGlassBaseTokens = Readonly<{
  bg: string; bgTop: string; bgBottom: string;
  opaqueCard: string; opaqueSheet: string; opaqueControl: string;
  card: string; sheet: string; glassEdge: string; lightTint: string;
  cta: string; ctaInk: string; text: string; secondary: string;
  mutedText: string; line: string; selected: string;
}>;

const CLEAR = '#00000000';

/** CSS-угол градиента → точки start/end для LinearGradient (0..1). */
function direction(deg: number): { start: Point; end: Point } {
  const rad = deg * Math.PI / 180;
  const dx = Math.sin(rad) / 2;
  const dy = -Math.cos(rad) / 2;
  const r = (n: number) => Math.round(n * 1000) / 1000;
  return { start: { x: r(0.5 - dx), y: r(0.5 - dy) }, end: { x: r(0.5 + dx), y: r(0.5 + dy) } };
}

/** «Спокойно» в тёмном: роли = нынешние нейтральные значения (ничего не меняется). */
export function calmDarkRoles(t: LiquidGlassBaseTokens): LiquidGlassAccentRoles {
  const dir = direction(180);
  return Object.freeze({
    level: 'calm', appearance: 'dark', isLight: false,
    accent: t.cta, accentInk: t.ctaInk, accentText: t.cta, accentBright: t.cta,
    accentSoft: t.selected, accentBorder: t.lightTint, accentCap: t.cta, accentTile: t.opaqueControl,
    accentGlow: CLEAR, accentGradient: Object.freeze([t.cta, t.cta]),
    accentGradientStart: dir.start, accentGradientEnd: dir.end,
    progressGradient: Object.freeze([t.cta, t.cta]), overline: t.secondary,
    bgGlow: Object.freeze([CLEAR, CLEAR, CLEAR]) as readonly [string, string, string],
    cardSmoke: Object.freeze([CLEAR, CLEAR]) as readonly [string, string],
    shadowTint: '#000000',
  });
}

function darkVividRoles(v: LiquidGlassVivid, t: LiquidGlassBaseTokens, level: 'accent' | 'max'): LiquidGlassAccentRoles {
  const { fam, h, h2, c } = v;
  const night = fam === 'night';
  const a = oklchToHex(night ? 0.84 : 0.80, c, h);
  const aHi = oklchToHex(night ? 0.92 : 0.90, night ? c * 0.6 : c * 0.72, h);
  const aLo = oklchToHex(night ? 0.72 : 0.66, night ? c : c * 1.04, h);
  const a2 = oklchToHex(0.79, c, h2);
  const byFam = {
    gem: { g: [aHi, a, aLo], deg: 172, p: [aLo, a, aHi] },
    metal: {
      g: [oklchToHex(0.93, c * 0.55, h), oklchToHex(0.76, c, h), oklchToHex(0.90, c * 0.6, h2), oklchToHex(0.72, c, h)],
      deg: 112,
      p: [oklchToHex(0.70, c, h), oklchToHex(0.92, c * 0.55, h2), oklchToHex(0.78, c, h)],
    },
    nature: { g: [a, a2], deg: 115, p: [a2, a] },
    night: { g: [aHi, a], deg: 180, p: [aLo, a, aHi] },
  }[fam];
  const dir = direction(byFam.deg);
  const max = level === 'max';
  const glow1 = fam === 'gem' ? oklchA(0.60, c, h, 0.82)
    : fam === 'metal' ? oklchA(0.54, c * 0.78, h, 0.66)
      : night ? oklchA(0.52, c * 1.15, h, 0.70) : oklchA(0.58, c, h, 0.78);
  const glow2 = fam === 'metal' ? oklchA(0.48, c * 0.7, h2, 0.46)
    : fam === 'nature' ? oklchA(0.58, c, h2, 0.70)
      : night ? oklchA(0.46, c * 1.05, h2, 0.52) : oklchA(0.54, c, h2, 0.62);
  return Object.freeze({
    level, appearance: 'dark', isLight: false,
    accent: a, accentInk: oklchToHex(0.20, c * 0.38, h), accentText: a, accentBright: aHi,
    accentSoft: max ? oklchA(0.48, c, h, 0.62) : oklchA(0.42, c, h, 0.42),
    accentBorder: a, accentCap: oklchToHex(0.78, c, h), accentTile: oklchA(0.36, c * 0.78, h, 0.94),
    accentGlow: oklchA(0.62, c, h, 0.55),
    accentGradient: Object.freeze(byFam.g), accentGradientStart: dir.start, accentGradientEnd: dir.end,
    progressGradient: Object.freeze(byFam.p),
    overline: max ? oklchToHex(0.86, c * 0.7, h) : t.secondary,
    bgGlow: Object.freeze(max ? [glow1, glow2, oklchA(0.42, c * 0.85, h, 0.52)] : [CLEAR, CLEAR, CLEAR]) as readonly [string, string, string],
    cardSmoke: Object.freeze(max ? [oklchA(0.66, c, h, 0.30), oklchA(0.62, c, h2, 0.18)] : [CLEAR, CLEAR]) as readonly [string, string],
    shadowTint: '#000000',
  });
}

/** «Максимум» в тёмном: фон, стекло и текст в тоне темы (стекло непрозрачное ≥ 0.92). */
function darkMaxBase(v: LiquidGlassVivid, t: LiquidGlassBaseTokens): LiquidGlassBaseTokens {
  const { fam, h, h2, c } = v;
  const card = oklchToHex(0.225, c * 0.36, h);
  const sheet = oklchToHex(0.19, c * 0.26, h);
  return Object.freeze({
    ...t,
    bg: oklchToHex(0.15, c * 0.36, h),
    bgTop: fam === 'metal' ? oklchToHex(0.24, c * 0.45, h) : oklchToHex(0.25, c * 0.62, h),
    bgBottom: oklchToHex(0.19, c * 0.48, h2),
    opaqueCard: card, opaqueSheet: sheet, opaqueControl: oklchToHex(0.29, c * 0.34, h),
    card: alpha(card, 0.92), sheet: alpha(sheet, 0.96),
    glassEdge: oklchA(0.92, c * 0.6, h, 0.15),
    text: oklchToHex(0.985, 0.006, h), secondary: oklchToHex(0.84, c * 0.24, h),
    mutedText: oklchToHex(0.70, c * 0.22, h), line: oklchA(0.90, c * 0.6, h, 0.15),
    selected: oklchA(0.78, c, h, 0.20),
  });
}

/** Светлое оформление: фон в оттенке темы, белые карточки, тёмный текст с оттенком темы. */
function lightBase(v: LiquidGlassVivid, level: LiquidGlassColorLevel): LiquidGlassBaseTokens {
  const { h, h2, c } = v;
  const tn = Math.max(0.006, Math.min(0.016, c * 0.11));
  const max = level === 'max';
  const text = oklchToHex(0.21, tn * 1.3, h);
  const card = max ? oklchToHex(0.993, c * 0.08, h) : oklchToHex(0.997, tn * 0.15, h);
  const sheet = oklchToHex(0.99, tn * 0.3, h);
  return Object.freeze({
    bg: max ? oklchToHex(0.945, c * 0.22 + 0.006, h) : oklchToHex(0.955, tn, h),
    bgTop: max ? oklchToHex(0.97, c * 0.14, h) : oklchToHex(0.975, tn * 0.7, h),
    bgBottom: max ? oklchToHex(0.93, c * 0.26 + 0.006, h2) : oklchToHex(0.945, tn, h),
    opaqueCard: card, opaqueSheet: sheet,
    opaqueControl: max ? oklchToHex(0.90, c * 0.25, h) : oklchToHex(0.915, tn * 1.2, h),
    card: alpha(card, max ? 0.93 : 0.97), sheet: alpha(sheet, 0.98),
    glassEdge: max ? oklchA(0.45, c * 0.6, h, 0.20) : oklchA(0.35, tn * 2, h, 0.13),
    lightTint: alpha(text, 0.92),
    // зачем: нейтральная кнопка в светлом — «чернильный» тон темы с белым текстом (контраст ≥ 4.5).
    cta: oklchToHex(0.24, c * 0.28 + 0.009, h), ctaInk: '#FFFFFF',
    // зачем (PM-033, аудит контраста 01.10): при L .57 приглушённый текст на карточке давал 4.32–4.48 < 4.5 во всех светлых темах.
    text, secondary: oklchToHex(0.47, tn * 1.6, h), mutedText: oklchToHex(0.55, tn * 1.4, h),
    line: max ? oklchA(0.45, c * 0.6, h, 0.14) : oklchA(0.35, tn * 2, h, 0.09),
    selected: oklchA(0.30, c * 0.35 + 0.01, h, 0.08),
  });
}

/**
 * Цвет заданного оттенка и насыщенности не светлее `maxL`, при котором белый текст даёт контраст ≥ 4.55 (запас над AA 4.5).
 * зачем (аудит читаемости 10.10): зелёные и бирюзовые тона при той же светлоте OKLCH ярче по восприятию — фиксированный L .55–.58
 * давал белому тексту на градиентной кнопке 4.27–4.46 < 4.5 (Шалфей, Сланец, Чернила, Графит…).
 */
function whiteSafe(maxL: number, chroma: number, hue: number): string {
  const lum = (hex: string) => {
    const n = Number.parseInt(hex.slice(1, 7), 16);
    const ch = (s: number) => { const v = ((n >> s) & 255) / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * ch(16) + 0.7152 * ch(8) + 0.0722 * ch(0);
  };
  let l = maxL;
  let color = oklchToHex(l, chroma, hue);
  while (l > 0.2 && 1.05 / (lum(color) + 0.05) < 4.55) {
    l -= 0.005;
    color = oklchToHex(l, chroma, hue);
  }
  return color;
}

function lightRoles(v: LiquidGlassVivid, t: LiquidGlassBaseTokens, level: LiquidGlassColorLevel): LiquidGlassAccentRoles {
  const { fam, h, h2, c } = v;
  const tn = Math.max(0.006, Math.min(0.016, c * 0.11));
  const calm = level === 'calm';
  const max = level === 'max';
  const shadowTint = oklchA(0.35, c * 0.6 + 0.01, h, 0.16);
  if (calm) {
    // «Спокойно» в светлом: тема видна «чернильным» тоном своего цвета, без ярких цветов.
    const a = oklchToHex(0.30, c * 0.35 + 0.01, h);
    const dir = direction(180);
    return Object.freeze({
      level, appearance: 'light', isLight: true,
      accent: oklchToHex(0.24, c * 0.28 + 0.009, h), accentInk: '#FFFFFF', accentText: a, accentBright: a,
      accentSoft: oklchA(0.30, c * 0.35 + 0.01, h, 0.08), accentBorder: a,
      accentCap: oklchA(0.30, 0.01, h, 0.10), accentTile: oklchA(0.93, tn * 1.3, h, 0.97),
      accentGlow: oklchA(0.25, c * 0.3, h, 0.35),
      accentGradient: Object.freeze([oklchToHex(0.30, c * 0.3 + 0.01, h), oklchToHex(0.18, c * 0.25 + 0.008, h)]),
      accentGradientStart: dir.start, accentGradientEnd: dir.end,
      progressGradient: Object.freeze([oklchToHex(0.26, c * 0.3 + 0.01, h), oklchToHex(0.42, c * 0.35 + 0.01, h)]),
      overline: t.secondary,
      bgGlow: Object.freeze([CLEAR, CLEAR, CLEAR]) as readonly [string, string, string],
      cardSmoke: Object.freeze([CLEAR, CLEAR]) as readonly [string, string],
      shadowTint,
    });
  }
  const cc = fam === 'night' ? c * 1.3 + 0.02 : c * 1.05 + 0.02;
  // зачем: цветная кнопка не светлее L .58 — белый текст на ней читается (решение владельца).
  const a = oklchToHex(0.52, cc, h);
  // зачем (аудит 10.10): верх градиента L .58 давал белому тексту 4.39–4.46 < 4.5 у Сланца/Чернил/Шалфея на «Акценте»/«Максимуме»; .55 проходит.
  const aHi = whiteSafe(0.55, cc, h);
  const aLo = oklchToHex(0.45, cc, h);
  // зачем (PM-033): текст цветом темы на светлом фоне — на ступень темнее кнопки; у зелёно-бирюзовых
  // тонов (Шалфей/Эвкалипт/Марина) цвет кнопки L .52 давал тексту 4.06–4.34 < 4.5. Кнопка не меняется.
  // зачем (координатор 12.10 04:55): у Шалфея/Эвкалипта текст акцента на светлой ПЛАШКЕ (opaqueControl) давал 4.33–4.40 < 4.5 —
  // зелёно-бирюзовые тона (оттенок 140–200°) на ступень глубже (L .44). Кнопка (`a`) и остальные темы не меняются.
  const aText = oklchToHex(h >= 140 && h <= 200 ? 0.44 : 0.47, cc, h);
  const a2 = oklchToHex(0.52, cc, h2);
  const byFam = {
    gem: { g: [aHi, a, aLo], deg: 172, p: [aLo, aHi] },
    metal: {
      // зачем (аудит читаемости 10.10, пункт 3 координатора): первая точка градиента L .58 при малой насыщенности металла (Графит/Сланец/Чернила/
      // Роза/Таупе/Олива/Шалфей) давала белому тексту кнопки 4.27–4.46 < 4.5 на «Акценте»/«Максимуме» в светлом; L .55 — все 21 шаг проходят.
      g: [whiteSafe(0.55, c * 0.9 + 0.02, h), oklchToHex(0.45, c + 0.02, h), oklchToHex(0.56, c * 0.8 + 0.02, h2), oklchToHex(0.43, c + 0.02, h)],
      deg: 112,
      p: [oklchToHex(0.46, c + 0.02, h), oklchToHex(0.60, c * 0.8 + 0.02, h2), oklchToHex(0.50, c + 0.02, h)],
    },
    nature: { g: [a, a2], deg: 115, p: [a2, a] },
    night: { g: [aHi, aLo], deg: 180, p: [aLo, aHi] },
  }[fam];
  const dir = direction(byFam.deg);
  return Object.freeze({
    level, appearance: 'light', isLight: true,
    accent: a, accentInk: '#FFFFFF', accentText: aText, accentBright: a,
    accentSoft: oklchA(0.94, c * 0.40 + 0.006, h, 0.97), accentBorder: a,
    accentCap: oklchA(0.55, c, h, 0.16),
    accentTile: max ? oklchA(0.90, c * 0.55, h, 0.97) : oklchA(0.94, c * 0.30 + 0.005, h, 0.97),
    accentGlow: oklchA(0.45, c, h, 0.40),
    accentGradient: Object.freeze(byFam.g), accentGradientStart: dir.start, accentGradientEnd: dir.end,
    progressGradient: Object.freeze(byFam.p), overline: aText,
    bgGlow: Object.freeze(max
      ? [oklchA(0.86, c * 0.8, h, 0.70), oklchA(0.88, c * 0.7, h2, 0.60), oklchA(0.92, c * 0.45, h, 0.50)]
      : [CLEAR, CLEAR, CLEAR]) as readonly [string, string, string],
    cardSmoke: Object.freeze(max ? [oklchA(0.84, c * 0.9, h, 0.50), oklchA(0.86, c * 0.75, h2, 0.36)] : [CLEAR, CLEAR]) as readonly [string, string],
    shadowTint,
  });
}

/**
 * Токены темы для уровня и оформления. `calmDark` — одобренные тонкие токены темы,
 * они возвращаются без изменений для «Спокойно» в тёмном.
 */
export function buildLiquidGlassVariant(
  id: string,
  calmDark: LiquidGlassBaseTokens,
  variant: LiquidGlassVariant,
): LiquidGlassBaseTokens & LiquidGlassAccentRoles {
  const vivid = LIQUID_GLASS_VIVID[id] ?? LIQUID_GLASS_VIVID.graphite;
  if (variant.appearance === 'light') {
    const base = lightBase(vivid, variant.level);
    return Object.freeze({ ...base, ...lightRoles(vivid, base, variant.level) });
  }
  if (variant.level === 'calm') return Object.freeze({ ...calmDark, ...calmDarkRoles(calmDark) });
  const base = variant.level === 'max' ? darkMaxBase(vivid, calmDark) : calmDark;
  return Object.freeze({ ...base, ...darkVividRoles(vivid, base, variant.level) });
}
