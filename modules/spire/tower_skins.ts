/**
 * «Наряды» башни Шпиля: одна башня Оникса, 12 лиг = 12 премиальных материалов (решение владельца 13.10, в сборку 16.10).
 *
 * зачем: форма башни у всех лиг одна (components/spire/SpireTowerSvg.tsx), меняется материал: цвет камня, зеркальный блик, подсветка
 * края, текстура поверх кладки, металл ободков, навершие, вымпел, свет окон, небо и свечение. Образец — docs/design/v2-app/spire-leagues.html,
 * рецепт переноса — docs/phraseman-2.0/SPIRE_LEAGUE_TOWERS_SPEC.md. Таблица «лига → наряд» живёт ТОЛЬКО здесь, индекс = tier из
 * tier_names.ts (Гранит=0 … Алмаз=11). Палитру цилиндра, карнизов, конуса и окон считаем из цвета камня (paletteOf образца) один раз при загрузке модуля.
 *
 * Перформанс: наряд — замороженный объект строк и чисел; башня берёт его по ссылке, memo перерисовывает её только при смене лиги.
 * Узлов SVG наряд добавляет +43…+51 (потолок координатора ≤55), фильтров на кладке нет.
 */
import { SPIRE_TIER_COUNT, clampSpireTierIndex } from './tier_names';

type Stops6 = readonly [string, string, string, string, string, string];
type Stops4 = readonly [string, string, string, string];
type Stops3 = readonly [string, string, string];

export type SpireTowerTexture = 'speckle' | 'columns' | 'marble' | 'jade' | 'quartz' | 'agate' | 'onyx'
  | 'amethyst' | 'opal' | 'topaz' | 'obsidian' | 'diamond';
export type SpireTowerFinial = 'plain' | 'ball' | 'gem' | 'crystal' | 'cabochon' | 'cluster' | 'orb' | 'crown' | 'shard' | 'brilliant';
/** none — без металла (прежний вид); ring — только кольцо конуса и цоколь; full — ещё карнизы и зубцы Стражей. */
export type SpireTowerRim = 'none' | 'ring' | 'full';

/** Исходные параметры лиги из спеки (одна строка таблицы). */
export type SpireLeagueSpec = Readonly<{
  id: string;
  stone: string;
  spec: number;
  edge: string;
  tex: SpireTowerTexture;
  metal: string;
  rim: 'ring' | 'full';
  finial: Exclude<SpireTowerFinial, 'plain'>;
  gem?: string;
  pennant?: string;
  lit: string;
  sky: string;
  glow: number;
}>;

/** Готовый наряд: все производные цвета посчитаны, башне остаётся только рисовать. */
export type SpireTowerSkin = Readonly<{
  id: string;
  /** false = Оникс прежнего вида: без текстуры, блика, металла и деталей. */
  premium: boolean;
  /** Градиент обычного этажа и барабана, 6 стопов (0 / .16 / .36 / .55 / .8 / 1). */
  cyl: Stops6;
  /** Градиент этажа-Стража, 6 стопов. */
  cylG: Stops6;
  /** Карнизы-кольца, 4 стопа (0 / .35 / .6 / 1). */
  corn: Stops4;
  /** Конус крыши, 4 стопа (0 / .35 / .6 / 1). */
  cone: Stops4;
  /** Свет в окнах своего этажа и свечение этажа. */
  lit: string;
  winPast: string;
  winDark: string;
  winSill: string;
  /** Небо сверху вниз и две точки земли (центр, край). */
  sky: Stops3;
  ground: readonly [string, string];
  /** Цвет свечения навершия и этажа; радиус обычный (на вершине недели ×2.6). */
  glow: string;
  glowR: number;
  /** Сила зеркального блика 0..1 и цвет подсветки края. */
  spec: number;
  edge: string;
  tex: SpireTowerTexture | null;
  metal: string;
  rim: SpireTowerRim;
  finial: SpireTowerFinial;
  gem: string;
  pennant: string | null;
  /** Светлый камень (яркость > 140): швы и тень мягче. */
  light: boolean;
  seam: number;
  seamLight: number;
  underTop: number;
  /** Зубцы Стража: цвет = mixHex(merlonLo, merlonHi, освещённость 0..1). */
  merlonLo: string;
  merlonHi: string;
}>;

// ───────────────────────── цвет ─────────────────────────
const hex2rgb = (h: string): [number, number, number] => {
  const s = h.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)) as [number, number, number];
};
const rgb2hex = (a: readonly number[]): string => `#${a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
/** Смешать два #RRGGBB: t=0 → a, t=1 → b. */
export function mixHex(a: string, b: string, t: number): string {
  const A = hex2rgb(a);
  const B = hex2rgb(b);
  return rgb2hex(A.map((v, i) => v + (B[i] - v) * t));
}
const lighten = (c: string, t: number) => mixHex(c, '#ffffff', t);
const darken = (c: string, t: number) => mixHex(c, '#000000', t);

// ───────────────────────── наряд по умолчанию ─────────────────────────
/** Оникс без деталей — ровно прежний вид башни (значения перенесены из SpireTowerSvg без изменений). */
export const SPIRE_DEFAULT_SKIN: SpireTowerSkin = Object.freeze<SpireTowerSkin>({
  id: 'default',
  premium: false,
  cyl: ['#1F1F23', '#3D3D44', '#5A5A62', '#46464D', '#2C2C31', '#18181B'],
  cylG: ['#232328', '#46464D', '#67676F', '#505058', '#303035', '#1A1A1D'],
  corn: ['#2A2A2F', '#77777F', '#55555C', '#222226'],
  cone: ['#1E1E22', '#55555D', '#3A3A41', '#151518'],
  lit: '#EEF0F6',
  winPast: '#3A3A40',
  winDark: '#0B0B0D',
  winSill: '#6B6B72',
  sky: ['#101013', '#17171A', '#0E0E10'],
  ground: ['#26262A', '#0E0E10'],
  glow: '#FFFFFF',
  glowR: 34,
  spec: 0,
  edge: '#FFFFFF',
  tex: null,
  metal: '#D6D6D8',
  rim: 'none',
  finial: 'plain',
  gem: '#FFFFFF',
  pennant: null,
  light: false,
  seam: 0.34,
  seamLight: 0.045,
  underTop: 0.42,
  merlonLo: '#424247',
  merlonHi: '#6E6E73',
});

// ───────────────────────── 12 лиг (спека 13.10) ─────────────────────────
export const SPIRE_LEAGUE_SPECS: readonly SpireLeagueSpec[] = Object.freeze([
  { id: 'granite', stone: '#55575E', spec: 0.22, edge: '#A9B6C6', tex: 'speckle', metal: '#8C9098', rim: 'ring', finial: 'ball', lit: '#F2EEE6', sky: '#111215', glow: 34 },
  { id: 'basalt', stone: '#384352', spec: 0.14, edge: '#8FA6C2', tex: 'columns', metal: '#7D8796', rim: 'full', finial: 'ball', pennant: '#36597E', lit: '#E2EEF8', sky: '#0E1217', glow: 35 },
  { id: 'marble', stone: '#D4CEC4', spec: 0.5, edge: '#FFF4DE', tex: 'marble', metal: '#D9B566', rim: 'full', finial: 'ball', lit: '#FFF2D6', sky: '#15141A', glow: 36 },
  { id: 'jade', stone: '#23664F', spec: 0.55, edge: '#9FF0C8', tex: 'jade', metal: '#D9B566', rim: 'full', finial: 'gem', gem: '#4FD69C', lit: '#FFE6B0', sky: '#0C1411', glow: 37 },
  { id: 'quartz', stone: '#B38494', spec: 0.6, edge: '#FFE0EC', tex: 'quartz', metal: '#E6B8A2', rim: 'full', finial: 'crystal', gem: '#F7C2D6', lit: '#FFEFF4', sky: '#161116', glow: 38 },
  { id: 'agate', stone: '#80502E', spec: 0.45, edge: '#FFC98A', tex: 'agate', metal: '#C8894A', rim: 'full', finial: 'cabochon', gem: '#D9894A', pennant: '#8E3A2A', lit: '#FFE1B0', sky: '#15100D', glow: 39 },
  { id: 'onyx', stone: '#2C2C33', spec: 0.75, edge: '#C9D2E2', tex: 'onyx', metal: '#C9CCD6', rim: 'full', finial: 'gem', gem: '#1A1A20', lit: '#EEF0F6', sky: '#111114', glow: 40 },
  { id: 'amethyst', stone: '#4A2D72', spec: 0.6, edge: '#D6B4FF', tex: 'amethyst', metal: '#C9CCD6', rim: 'full', finial: 'cluster', gem: '#B58CFF', pennant: '#6A3FB0', lit: '#F0E2FF', sky: '#110D17', glow: 42 },
  { id: 'opal', stone: '#C4BED0', spec: 0.65, edge: '#DDF4FF', tex: 'opal', metal: '#E8E6EE', rim: 'full', finial: 'orb', pennant: '#BFE3FA', lit: '#FFF4EA', sky: '#14131A', glow: 44 },
  { id: 'topaz', stone: '#8E6522', spec: 0.75, edge: '#FFE7A0', tex: 'topaz', metal: '#F2D08A', rim: 'full', finial: 'crown', gem: '#FFB43C', lit: '#FFF0C0', sky: '#15120B', glow: 46 },
  { id: 'obsidian', stone: '#1C1A20', spec: 0.9, edge: '#E0503A', tex: 'obsidian', metal: '#5E5A66', rim: 'full', finial: 'shard', gem: '#E0503A', pennant: '#9E2A22', lit: '#FFC08A', sky: '#130C0C', glow: 48 },
  { id: 'diamond', stone: '#5C7698', spec: 0.95, edge: '#E6FAFF', tex: 'diamond', metal: '#EEF2F8', rim: 'full', finial: 'brilliant', gem: '#E8F8FF', pennant: '#BFE6FF', lit: '#EAF8FF', sky: '#0C1220', glow: 52 },
] as const);

/** paletteOf образца: цилиндр, карнизы, конус и окна выводятся из цвета камня. */
export function skinFromLeague(L: SpireLeagueSpec): SpireTowerSkin {
  const b = L.stone;
  const light = hex2rgb(b).reduce((s, v) => s + v, 0) / 3 > 140;
  const k = light ? 0.75 : 1; // светлый камень затемняем мягче, иначе мрамор уходит в серое
  return Object.freeze<SpireTowerSkin>({
    id: L.id,
    premium: true,
    cyl: [darken(b, 0.7 * k), darken(b, 0.38 * k), b, darken(b, 0.24 * k), darken(b, 0.55 * k), darken(b, 0.78 * k)],
    cylG: [darken(b, 0.64 * k), darken(b, 0.28 * k), lighten(b, 0.06), darken(b, 0.14 * k), darken(b, 0.5 * k), darken(b, 0.74 * k)],
    corn: [darken(b, 0.6), mixHex(lighten(b, 0.2), L.metal, 0.25), darken(b, 0.08), darken(b, 0.7)],
    cone: [darken(b, 0.72), darken(b, 0.1), darken(b, 0.4), darken(b, 0.8)],
    lit: L.lit,
    winPast: mixHex(darken(b, 0.35), L.lit, 0.14),
    winDark: darken(b, 0.86),
    winSill: mixHex(darken(b, 0.1), L.metal, 0.35),
    sky: [L.sky, mixHex(L.sky, b, 0.07), darken(L.sky, 0.15)],
    ground: [mixHex(L.sky, b, 0.18), darken(L.sky, 0.15)],
    glow: L.lit,
    glowR: L.glow,
    spec: L.spec,
    edge: L.edge,
    tex: L.tex,
    metal: L.metal,
    rim: L.rim,
    finial: L.finial,
    gem: L.gem ?? '#FFFFFF',
    pennant: L.pennant ?? null,
    light,
    seam: light ? 0.2 : 0.34,
    seamLight: light ? 0.14 : 0.05,
    underTop: light ? 0.3 : 0.42,
    merlonLo: darken(b, 0.6),
    merlonHi: lighten(b, 0.18),
  });
}

/** Лига (tier 0..11, порядок tier_names.ts) → наряд. */
export const SPIRE_LEAGUE_SKINS: readonly SpireTowerSkin[] = Object.freeze(SPIRE_LEAGUE_SPECS.map(skinFromLeague));

/** Выключатель «лиги носят свои наряды» (палитры приняты владельцем 13.10, сборка 16.10). false — все лиги видят Оникс прежнего вида. */
export const SPIRE_LEAGUE_SKINS_ENABLED = true;

if (SPIRE_LEAGUE_SKINS.length !== SPIRE_TIER_COUNT) {
  // зачем: таблица лиг и имена лиг обязаны совпадать по числу, иначе tier поедет на чужой наряд
  throw new Error(`[SPIRE-SKINS] нарядов ${SPIRE_LEAGUE_SKINS.length}, лиг ${SPIRE_TIER_COUNT}`);
}

/** Наряд по лиге игрока. Нет лиги (null/не число) или выключатель — Оникс прежнего вида; tier вне 0..11 прижимается. */
export function spireSkinForTier(tier: unknown, enabled: boolean = SPIRE_LEAGUE_SKINS_ENABLED): SpireTowerSkin {
  if (!enabled || typeof tier !== 'number' || !Number.isFinite(tier)) return SPIRE_DEFAULT_SKIN;
  return SPIRE_LEAGUE_SKINS[clampSpireTierIndex(tier)];
}
