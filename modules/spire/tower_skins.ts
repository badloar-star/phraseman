/**
 * «Наряды» башни Шпиля: одна башня Оникса, 12 лиг = 12 материалов (решение владельца 13.10).
 *
 * зачем: форма башни у всех лиг одна (components/spire/SpireTowerSvg.tsx), меняются только
 * цвет камня, свет окон, небо, свечение (и позже текстура/детали). Таблица «лига → skin» живёт
 * ТОЛЬКО здесь, индекс = tier из tier_names.ts (Гранит=0 … Алмаз=11). Спека —
 * docs/phraseman-2.0/SPIRE_LEAGUE_TOWERS_SPEC.md; её палитры Макеты переделывают в «премиальные»,
 * поэтому сейчас в таблице заполнены 2 лиги для проверки каркаса, остальные = null (вид Оникса).
 *
 * Перформанс: skin — чистые строки цвета, число узлов SVG от него не зависит (+0). Объекты
 * замороженные и стабильные по ссылке, поэтому memo башни перерисовывается только при смене лиги.
 */
import { clampSpireTierIndex } from './tier_names';

type Stops6 = readonly [string, string, string, string, string, string];
type Stops4 = readonly [string, string, string, string];
type Stops3 = readonly [string, string, string];

/** Материал поверх кладки. Пока только заготовка: отрисовка текстур приходит с финальными палитрами. */
export type SpireTowerTexture = 'speckle' | 'columns' | 'marble' | 'jade' | 'quartz' | 'agate' | 'onyx'
  | 'amethyst' | 'opal' | 'topaz' | 'obsidian' | 'diamond';

/** Мелкие детали (металл ободков, навершие, вымпел). Пока заготовка: null = без деталей. */
export type SpireTowerDetails = Readonly<{
  metal: string;
  finial: 'ball' | 'gem' | 'crystal' | 'cabochon' | 'cluster' | 'orb' | 'crown' | 'shard' | 'brilliant';
  gem?: string;
  pennant?: string;
}>;

export type SpireTowerSkin = Readonly<{
  id: string;
  /** Градиент обычного этажа и барабана, 6 стопов (0 / .16 / .36 / .55 / .8 / 1). */
  cyl: Stops6;
  /** Градиент этажа-Стража, 6 стопов. */
  cylG: Stops6;
  /** Карнизы-кольца, 4 стопа (0 / .35 / .6 / 1). */
  corn: Stops4;
  /** Конус крыши, 4 стопа (0 / .35 / .6 / 1). */
  cone: Stops4;
  /** Цвет света в окнах своего этажа. */
  lit: string;
  /** Небо за башней, 3 стопа сверху вниз. */
  sky: Stops3;
  /** Цвет свечения навершия. */
  glow: string;
  /** База серого для зубцов Стража: цвет = (c + tint[0], c + tint[1], c + tint[2]). */
  merlonTint: readonly [number, number, number];
  texture: SpireTowerTexture | null;
  details: SpireTowerDetails | null;
}>;

/** Оникс без деталей — ровно прежний вид башни (значения перенесены из SpireTowerSvg без изменений). */
export const SPIRE_DEFAULT_SKIN: SpireTowerSkin = Object.freeze({
  id: 'onyx',
  cyl: ['#1F1F23', '#3D3D44', '#5A5A62', '#46464D', '#2C2C31', '#18181B'],
  cylG: ['#232328', '#46464D', '#67676F', '#505058', '#303035', '#1A1A1D'],
  corn: ['#2A2A2F', '#77777F', '#55555C', '#222226'],
  cone: ['#1E1E22', '#55555D', '#3A3A41', '#151518'],
  lit: '#EEF0F6',
  sky: ['#101013', '#17171A', '#0E0E10'],
  glow: '#FFFFFF',
  merlonTint: [0, 0, 5],
  texture: null,
  details: null,
});

/** Проверочные наряды: цвета кладки из спеки (cyl 6 стопов), остальное выведено от них. */
const GRANITE: SpireTowerSkin = Object.freeze({
  ...SPIRE_DEFAULT_SKIN,
  id: 'granite',
  cyl: ['#1a1a1c', '#35363a', '#55575E', '#414247', '#26272a', '#131315'],
  cylG: ['#1d1d20', '#3b3c41', '#5f6168', '#4a4b51', '#2b2c30', '#151517'],
  corn: ['#2a2b2f', '#70727a', '#55575E', '#202125'],
  cone: ['#1a1a1d', '#4f5057', '#383940', '#131315'],
  lit: '#F2EEE6',
  sky: ['#0f1012', '#141518', '#0d0d0f'],
  glow: '#F2EEE6',
  merlonTint: [0, 1, 6],
});

const MARBLE: SpireTowerSkin = Object.freeze({
  ...SPIRE_DEFAULT_SKIN,
  id: 'marble',
  cyl: ['#65625d', '#98938c', '#D4CEC4', '#aea9a1', '#7d7973', '#585551'],
  cylG: ['#6b6863', '#a09b94', '#dcd6cc', '#b5b0a8', '#84807a', '#5e5b57'],
  corn: ['#7d7973', '#d9d3c8', '#aea9a1', '#585551'],
  cone: ['#6a6762', '#c2bdb4', '#9a958e', '#55524e'],
  lit: '#FFF2D6',
  sky: ['#12111a', '#15141A', '#0f0e14'],
  glow: '#FFF2D6',
  merlonTint: [14, 10, 4],
});

/** Лига (tier 0..11, порядок tier_names.ts) → наряд. null = Оникс без деталей. */
export const SPIRE_LEAGUE_SKINS: readonly (SpireTowerSkin | null)[] = Object.freeze([
  GRANITE, // 0 Гранит
  null, // 1 Базальт
  MARBLE, // 2 Мрамор
  null, // 3 Нефрит
  null, // 4 Кварц
  null, // 5 Агат
  null, // 6 Оникс = SPIRE_DEFAULT_SKIN
  null, // 7 Аметист
  null, // 8 Опал
  null, // 9 Топаз
  null, // 10 Обсидиан
  null, // 11 Алмаз
]);

/**
 * Выключатель «лиги носят свои наряды». Пока Макеты не отдали финальные палитры — false:
 * игрок видит прежнюю башню во всех лигах. Включается одной строкой после приёмки Сверкой.
 */
export const SPIRE_LEAGUE_SKINS_ENABLED = false;

/** Наряд по лиге игрока. Битый/неизвестный tier и лига без наряда дают Оникс без деталей. */
export function spireSkinForTier(tier: unknown, enabled: boolean = SPIRE_LEAGUE_SKINS_ENABLED): SpireTowerSkin {
  if (!enabled || tier === null || tier === undefined) return SPIRE_DEFAULT_SKIN;
  return SPIRE_LEAGUE_SKINS[clampSpireTierIndex(tier)] ?? SPIRE_DEFAULT_SKIN;
}
