// зачем: единый стиль PhraseMan 2.0 по референсам владельца 2026-09-24
// (D38/D41/D43 в docs/phraseman-2.0/PROGRESS.md). Все экраны выглядят одинаково:
// графитовый фон, карточки с тонкой полупрозрачной кромкой, подписи под названиями,
// крупные белые заголовки. Темы остаются, но только тёмные, и меняют лишь оттенок:
// акцент + лёгкий подкрас фона/карточек. Раскладка, размеры и отступы у всех тем одни.
//
// Цифры сняты с референсов (кадры 863×1822 = 2× от ширины ~430pt), см.
// docs/work/tasks/2026-09-24_ui_2_0_redesign.md.

import type { Theme, ThemeMode } from './theme';
import { liquidGlassSourceOfTheme } from './liquidGlassThemePalette';
import { adaptV2PaletteToGlass } from './v2StyleGlassVariant';

type Rgb = readonly [number, number, number];

function parseHex(color: string): Rgb | null {
  if (color[0] !== '#') return null;
  let hex = color.slice(1);
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  if (hex.length === 8) hex = hex.slice(0, 6);
  if (hex.length !== 6) return null;
  const n = parseInt(hex, 16);
  if (!Number.isFinite(n)) return null;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: Rgb): string {
  const h = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** Смешивает base с tint в доле amount (0..1). Не-hex tint — base без изменений. */
export function mixHex(base: string, tint: string, amount: number): string {
  const a = parseHex(base);
  const b = parseHex(tint);
  if (!a || !b) return base;
  const k = Math.max(0, Math.min(1, amount));
  return toHex([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]);
}

export function alphaHex(color: string, alpha: number): string {
  const rgb = parseHex(color);
  if (!rgb) return color;
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
}

/** Нейтральная база референса (замер пикселей). */
const BASE = {
  bg: '#0B0C0E',
  bgTop: '#111317',
  card: '#191B1F',
  cardRaised: '#1F2125',
  control: '#2C2D33',
  track: '#35373B',
  tabBar: '#16171B',
  text: '#FFFFFF',
  textSecondary: '#A3A6AE',
  textMuted: '#6F727A',
  cta: '#F2F1F6',
  ctaText: '#0B0C0E',
} as const;

/**
 * Насколько тема подкрашивает графит. Меньше — ближе к референсу.
 * Акцент темы при этом всегда свой.
 */
const TINT_BY_THEME: Partial<Record<ThemeMode, number>> = {
  dark: 0.05,
  gold: 0.045,
  olive: 0.05,
  indigo: 0.06,
  midnight: 0.05,
  ember: 0.05,
  aurora: 0.05,
  volt: 0.035,
};

export type V2Palette = Readonly<{
  bg: string;
  bgTop: string;
  card: string;
  cardRaised: string;
  control: string;
  track: string;
  tabBar: string;
  /** Тонкая кромка карточек (владелец 24.09 разрешил обводку в новом стиле, D43). */
  hairline: string;
  /** Кромка вариантов ответа — заметнее, как в «Блице». */
  outline: string;
  divider: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  progressFill: string;
  cta: string;
  ctaText: string;
  correct: string;
  wrong: string;
  gold: string;
  /** Стекло (референс владельца 24.09, вторая серия): полупрозрачная заливка
   *  карточки, сквозь которую видны пятна света фона, + перелив сверху-слева. */
  glass: string;
  glassRaised: string;
  sheenFrom: string;
  sheenTo: string;
  /** Кромка стекла: светлее, чем hairline, — она и даёт «дорогой» край. */
  stroke: string;
  /** Тёплый оттенок значков и акцентных слов (шампань, подкрашенная темой). */
  iconTint: string;
  /** Пятна света на фоне экрана. */
  glowA: string;
  glowB: string;
  /** Цвет «дымки» внутри стеклянных карточек (тёплый белый). */
  smoke: string;
  /** Перелив стеклянных плашек значков (тёплый серо-коричневый, референс). */
  tileFrom: string;
  tileTo: string;
  /** Заливка акцентной кнопки («Добавить себе» — светлое шампанское). */
  accentFill: string;
  /** Лист нижней шторки. */
  sheet: string;
  /**
   * Темы 2.0: цвет темы для ссылок, огня серии, колец на нейтральном стекле.
   * В «Спокойно» = iconTint (ничего не меняется).
   */
  accentText: string;
  /** Темы 2.0: ссылки «Смотреть все ›». В «Спокойно» = textSecondary (как было). */
  link: string;
  /** Темы 2.0: сила дымки в карточках (1 — как было; «Максимум» — сильнее). */
  smokeBoost: number;
}>;

// зачем (запрос координатора 15.10, +52 МБ на экране тем): кэш палитр рос по записи на каждый вариант темы без предела; теперь LRU с потолком.
export const V2_PALETTE_CACHE_LIMIT = 160;
const paletteCache = new Map<string, V2Palette>();
function paletteCacheGet(key: string): V2Palette | undefined {
  const hit = paletteCache.get(key);
  if (hit) {
    paletteCache.delete(key);
    paletteCache.set(key, hit);
  }
  return hit;
}
function paletteCacheSet(key: string, palette: V2Palette): void {
  paletteCache.set(key, palette);
  if (paletteCache.size > V2_PALETTE_CACHE_LIMIT) {
    const oldest = paletteCache.keys().next().value;
    if (oldest !== undefined) paletteCache.delete(oldest);
  }
}
export const v2PaletteCacheSize = (): number => paletteCache.size;

/** Палитра нового стиля для темы. Кэшируется — вызов в рендере бесплатный. */
export function getV2Palette(theme: Theme, themeMode: ThemeMode): V2Palette {
  // зачем (темы 2.0): уровень цвета и светлое оформление. База строится от «Спокойного»
  // цвета темы (в «Акценте» фон и стекло прежние), поверх — роли темы и светлые токены.
  const source = liquidGlassSourceOfTheme(theme);
  // зачем (владелец 01.10): «Спокойно» тёмное тоже идёт через токены темы — иначе Главная не меняется при смене темы.
  if (!source) return buildBaseV2Palette(theme, themeMode);
  const g = source.tokens;
  const key = `glass|${themeMode}|${source.calmCta}|${g.level}|${g.appearance}|${g.bg}|${g.accent}`;
  const cached = paletteCacheGet(key);
  if (cached) return cached;
  const palette = adaptV2PaletteToGlass(buildBaseV2Palette({ ...theme, accent: source.calmCta }, themeMode), g);
  paletteCacheSet(key, palette);
  return palette;
}

function buildBaseV2Palette(theme: Theme, themeMode: ThemeMode): V2Palette {
  const key = `${themeMode}|${theme.accent}`;
  const cached = paletteCacheGet(key);
  if (cached) return cached;
  const tintColor = theme.accent;
  const tint = TINT_BY_THEME[themeMode] ?? 0.04;
  const palette: V2Palette = {
    // Фон тёплый почти чёрный, как во второй серии референсов; тема — едва-едва.
    bg: mixHex('#0C0C0D', tintColor, 0.015),
    bgTop: mixHex('#141415', tintColor, 0.015),
    card: mixHex(BASE.card, tintColor, tint),
    cardRaised: mixHex(BASE.cardRaised, tintColor, tint),
    // Тёплый нейтральный графит (вторая серия референсов), тема — едва-едва.
    control: mixHex('#2A2A2B', tintColor, 0.02),
    track: mixHex('#333334', tintColor, 0.02),
    tabBar: mixHex('#151515', tintColor, 0.015),
    hairline: 'rgba(255,255,255,0.09)',
    outline: 'rgba(255,255,255,0.30)',
    divider: 'rgba(255,255,255,0.07)',
    text: BASE.text,
    textSecondary: mixHex('#A6A6A8', tintColor, 0.03),
    textMuted: mixHex('#727274', tintColor, 0.03),
    accent: tintColor,
    accentSoft: alphaHex(tintColor, 0.16),
    // На референсе заливка прогресса почти белая; тема добавляет свой оттенок.
    // Заливка прогресса — светлая с лёгкой теплотой, как на референсе.
    progressFill: mixHex('#D9D5CE', tintColor, 0.1),
    cta: mixHex(BASE.cta, tintColor, 0.03),
    ctaText: BASE.ctaText,
    correct: theme.correct,
    wrong: theme.wrong,
    gold: theme.gold,
    // зачем: стекло нейтрально-графитовое (владелец: тёплое вышло «слишком рыжим»).
    // Тема здесь почти не участвует (0.02), иначе индиго красит всё в синь.
    glass: alphaHex(mixHex('#1A1A1B', tintColor, 0.015), 0.9),
    glassRaised: alphaHex(mixHex('#222223', tintColor, 0.015), 0.92),
    sheenFrom: 'rgba(255,255,255,0.045)',
    sheenTo: 'rgba(255,255,255,0)',
    stroke: 'rgba(255,255,255,0.14)',
    // Значки почти белые с едва тёплым оттенком (владелец: «слишком рыжее»).
    iconTint: mixHex('#DDD8D0', tintColor, 0.08),
    glowA: mixHex('#C9A370', tintColor, 0.2),
    glowB: mixHex('#8C8F99', tintColor, 0.25),
    smoke: '#FFFFFF',
    tileFrom: mixHex('#303031', tintColor, 0.03),
    tileTo: mixHex('#1C1C1D', tintColor, 0.02),
    accentFill: mixHex('#E6DCCB', tintColor, 0.1),
    sheet: mixHex('#1B1B1C', tintColor, 0.015),
    accentText: mixHex('#DDD8D0', tintColor, 0.08),
    link: mixHex('#A6A6A8', tintColor, 0.03),
    smokeBoost: 1,
  };
  paletteCacheSet(key, palette);
  return palette;
}

/** Размеры и отступы (pt). */
export const V2 = {
  /** Поле экрана у списков (Карточки, Диалоги, наборы). */
  screenPad: 20,
  /** Поле Главной — плотная «панель» по референсу. */
  homePad: 12,
  gap: 12,
  gapTight: 8,
  radius: {
    card: 18,
    tile: 16,
    row: 14,
    control: 999,
    sheet: 28,
  },
  /** Круглая иконка-кнопка (назад, +, колокольчик). */
  iconButton: 44,
  /** Квадрат с иконкой слева у строк списка. */
  rowIcon: 44,
  rowMinHeight: 64,
  cta: { height: 52, radius: 26 },
  tabBar: { height: 64, iconSize: 24, labelSize: 11 },
  progress: { height: 6 },
} as const;

/** Типографика нового стиля (Inter уже подключён в app/_layout.tsx). */
export const V2_TYPE = {
  largeTitle: { fontSize: 34, lineHeight: 40, fontWeight: '800' as const, letterSpacing: -0.6 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '800' as const, letterSpacing: -0.3 },
  // зачем: расхождения заголовков моментов возвращались, единый источник (Макеты 15.10, листы приёмки m02/m03/m06/m07/m14/m15; вес 800 на Android рисуется как 700 — известное расхождение шрифта)
  /** Заголовок окна момента (GlassAlertDialog `title`): «Остаёшься в …», «Хватает на ранг N». */
  momentTitle: { fontSize: 23, lineHeight: 29, fontWeight: '800' as const, letterSpacing: -0.3 },
  /** Крупный заголовок момента: «Новая неделя», «3 ошибки — ступень не пройдена», «5 этаж — Страж». */
  momentTitleLg: { fontSize: 24, lineHeight: 30, fontWeight: '800' as const, letterSpacing: -0.3 },
  /** Заголовок шторки момента: «Выйти из урока?». */
  sheetTitle: { fontSize: 26, lineHeight: 31, fontWeight: '800' as const, letterSpacing: -0.4 },
  section: { fontSize: 20, lineHeight: 26, fontWeight: '700' as const, letterSpacing: -0.2 },
  // зачем (D145, владелец 01.10): обычный текст — ровно 2 размера, 16 и 13; иерархия весом и цветом.
  // Заголовки выше (largeTitle/title/section) — по утверждённым макетам.
  headline: { fontSize: 16, lineHeight: 21, fontWeight: '700' as const },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' as const },
  subtitle: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  caption: { fontSize: 13, lineHeight: 17, fontWeight: '400' as const },
  /** «ПРОДОЛЖИТЬ ОБУЧЕНИЕ», «СЕГОДНЯ», «ФРАЗА ДНЯ». */
  overline: { fontSize: 13, lineHeight: 17, fontWeight: '700' as const, letterSpacing: 1.4 },
} as const;
