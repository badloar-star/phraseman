/**
 * Палитры ролей поверх готовой темы: семантика, уровни A1–B2, плитки, категории достижений, медали, скрим.
 *
 * зачем (релизный пол, координатор 10.10; аудит THEME_COLORS_AUDIT_2026-10-10 «запросить токен у Тем»):
 * на экранах Карточек, Результатов, Монет, Настроек, списка уроков цвета были литералами (#6FD08C, #8FA0FF,
 * #C9A84C, палитра плиток настроек…) и не следовали теме. Здесь они становятся токенами ВСЕХ тем — тёмных и
 * светлых, на любом шаге ползунка. Цвет считается в OKLCH, а светлота подбирается до порога контраста WCAG
 * относительно поверхностей темы, поэтому роль читается на карточке, фоне и плашке в любой теме.
 */

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const toByte = (v: number) => Math.round(clamp01(v) * 255);
const hex2 = (n: number) => n.toString(16).padStart(2, '0').toUpperCase();

function oklchToHexLocal(lightness: number, chroma: number, hue: number): string {
  const h = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(h);
  const b = chroma * Math.sin(h);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return `#${lin.map((c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)).map((c) => hex2(toByte(c))).join('')}`;
}

/** Оттенок (градусы OKLCH) цвета `#RRGGBB…`; у почти серого — запасной оттенок. */
export function hueOfHex(hex: string, fallback = 260): number {
  const n = Number.parseInt(hex.slice(1, 7), 16);
  if (!Number.isFinite(n)) return fallback;
  const lin = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  const [r, g, b] = lin;
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  if (Math.hypot(a, bb) < 0.004) return fallback;
  return ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360;
}

function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1, 7), 16);
  const ch = (shift: number) => {
    const c = ((n >> shift) & 255) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(16) + 0.7152 * ch(8) + 0.0722 * ch(0);
}

export function paletteContrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

/**
 * Цвет заданного оттенка и насыщенности, светлота которого сдвинута от `start` в сторону `dir`
 * (+1 светлее, −1 темнее) до контраста ≥ `min` со ВСЕМИ поверхностями `against`.
 */
export function toContrast(hue: number, chroma: number, start: number, dir: 1 | -1, min: number, against: readonly string[]): string {
  let lightness = start;
  let color = oklchToHexLocal(lightness, chroma, hue);
  for (let i = 0; i < 60; i += 1) {
    if (against.every((bg) => paletteContrast(color, bg) >= min)) return color;
    lightness = clamp01(lightness + dir * 0.012);
    color = oklchToHexLocal(lightness, chroma, hue);
  }
  return color;
}

const withAlpha = (hex: string, opacity: number) => `${hex}${hex2(toByte(opacity))}`;

type RoleSource = Readonly<{
  bg: string;
  bgTop?: string;
  opaqueCard: string;
  opaqueControl: string;
  opaqueSheet?: string;
  isLight: boolean;
  intensity: number;
}>;

const ROLE_HUES = {
  Blue: 250, Green: 150, Orange: 55, Red: 25, Pink: 350, Purple: 305, Indigo: 275, Teal: 190, Gold: 85,
} as const;


const LEVEL_KEYS = ['A1', 'A2', 'B1', 'B2'] as const;

export function deriveLiquidGlassPaletteRoles(t: RoleSource) {
  // зачем (аудит контраста 14.10, п.63): статусный текст лежит и прямо на верхнем тоне фона — в светлых градиентных темах там было 3,87–4,47.
  const surfaces = [t.opaqueCard, t.bg, t.opaqueControl, ...(t.bgTop ? [t.bgTop] : [])].map((c) => c.slice(0, 7));
  const k = clamp01(t.intensity);
  const dark = !t.isLight;
  // Припылённо в «Спокойно», насыщеннее к «Максимуму».
  const chroma = 0.05 + 0.07 * k;
  const out: Record<string, string> = {};

  // ── Семантика ──
  // зачем: в тёмной «Спокойно» good/bad ≈ эталон Learning V2 (#6FD08C / #F2766B), чтобы вид экранов не менялся; в светлой — тоном темнее.
  const semantic: ReadonlyArray<readonly [string, number, number, number]> = [['good', 150, 0.13, 0.77], ['bad', 25, 0.15, 0.70], ['warn', 88, 0.14, 0.84], ['info', 240, 0.11, 0.78]];
  for (const [name, hue, sc, darkL] of semantic) {
    // зачем (координатор 24.10): «Удалить» красным лежит на шторке (opaqueSheet) — в тёмных градиентных темах на «Максимуме» было 4,57–4,79 при норме 4,5;
    // bad держим с запасом ≥ 4,8 и к шторке (тон тот же, меняется глубина и только там, где не хватало)
    const isBad = name === 'bad';
    const against = isBad && t.opaqueSheet ? [...surfaces, t.opaqueSheet.slice(0, 7)] : surfaces;
    const c = toContrast(hue, sc, dark ? darkL : 0.52, dark ? 1 : -1, isBad ? 4.8 : 4.5, against);
    out[name] = c;
    out[`${name}Soft`] = withAlpha(c, dark ? 0.16 : 0.14);
  }

  // ── Скрим ──
  out.scrim = dark ? 'rgba(0,0,0,0.60)' : 'rgba(20,22,28,0.45)';
  out.scrimStrong = dark ? 'rgba(0,0,0,0.80)' : 'rgba(20,22,28,0.70)';

  // ── Плитки (настройки) и категории достижений: верх светлее, низ глубже; белый значок на низе ≥ 4.5 ──
  const roleHues: Record<string, number> = { ...ROLE_HUES };
  const tile = (hue: number, c: number) => {
    // зачем: низ плитки несёт белый значок (≥ 4.5), верх светлее и читается как графика (≥ 3) — и на белом значке, и на карточке темы.
    const deep = toContrast(hue, c, dark ? 0.52 : 0.50, -1, 4.5, ['#FFFFFF']);
    const top = toContrast(hue, c, dark ? 0.66 : 0.58, -1, 3, ['#FFFFFF']);
    return [top, deep] as const;
  };
  for (const [name, hue] of Object.entries(roleHues)) {
    const [top, deep] = tile(hue, chroma);
    out[`tile${name}`] = top;
    out[`tile${name}Deep`] = deep;
  }
  {
    const [top, deep] = tile(255, 0.015);
    out.tileGray = top;
    out.tileGrayDeep = deep;
  }
  const categories: ReadonlyArray<readonly [string, number]> = [['Streak', 45], ['Lessons', 250], ['Combo', 305], ['Special', 350], ['Medal', 85]];
  for (const [name, hue] of categories) {
    const [top, deep] = tile(hue, chroma);
    out[`ach${name}`] = top;
    out[`ach${name}Deep`] = deep;
  }

  // ── Медали: узнаваемый металл, насыщенность не зависит от ползунка ──
  const medals: ReadonlyArray<readonly [string, number, number]> = [['Bronze', 55, 0.09], ['Silver', 250, 0.012], ['Gold', 85, 0.125], ['Platinum', 225, 0.02]];
  for (const [name, hue, c] of medals) {
    const [top, deep] = tile(hue, c);
    out[`medal${name}`] = top;
    out[`medal${name}Deep`] = deep;
  }

  // ── Уровни A1–B2: тон темы, ступени оттенка и светлоты; чернила уровня читаются на его плашке ≥ 4.5 ──
  const baseHue = hueOfHex(t.opaqueControl);
  LEVEL_KEYS.forEach((key, i) => {
    const hue = (baseHue + i * 18) % 360;
    const bg = oklchToHexLocal(dark ? 0.30 - i * 0.015 : 0.94 - i * 0.02, 0.02 + 0.03 * k, hue);
    out[`level${key}Bg`] = bg;
    out[`level${key}`] = toContrast(hue, 0.04 + 0.07 * k, dark ? 0.86 - i * 0.04 : 0.40 + i * 0.02, dark ? 1 : -1, 4.5, [bg]);
  });

  return Object.freeze(out) as Readonly<Record<string, string>>;
}

const SEMANTIC = ['good', 'bad', 'warn', 'info'] as const;
const ROLE_NAMES = [...Object.keys(ROLE_HUES), 'Gray'] as const;
const ACH = ['Streak', 'Lessons', 'Combo', 'Special', 'Medal'] as const;
const MEDALS = ['Bronze', 'Silver', 'Gold', 'Platinum'] as const;

export type LiquidGlassPaletteRoleKey =
  | typeof SEMANTIC[number] | `${typeof SEMANTIC[number]}Soft`
  | 'scrim' | 'scrimStrong'
  | `tile${typeof ROLE_NAMES[number]}` | `tile${typeof ROLE_NAMES[number]}Deep`
  | `ach${typeof ACH[number]}` | `ach${typeof ACH[number]}Deep`
  | `medal${typeof MEDALS[number]}` | `medal${typeof MEDALS[number]}Deep`
  | `level${typeof LEVEL_KEYS[number]}` | `level${typeof LEVEL_KEYS[number]}Bg`;

export type LiquidGlassPaletteRoles = Readonly<Record<LiquidGlassPaletteRoleKey, string>>;

export const LIQUID_GLASS_PALETTE_ROLE_KEYS: readonly LiquidGlassPaletteRoleKey[] = Object.freeze([
  ...SEMANTIC, ...SEMANTIC.map((n) => `${n}Soft` as const),
  'scrim', 'scrimStrong',
  ...ROLE_NAMES.flatMap((n) => [`tile${n}`, `tile${n}Deep`] as const),
  ...ACH.flatMap((n) => [`ach${n}`, `ach${n}Deep`] as const),
  ...MEDALS.flatMap((n) => [`medal${n}`, `medal${n}Deep`] as const),
  ...LEVEL_KEYS.flatMap((n) => [`level${n}`, `level${n}Bg`] as const),
]);
