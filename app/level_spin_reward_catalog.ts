export const LEVEL_SPIN_REWARD_CATALOG_VERSION = 7 as const;

export type LevelSpinRewardTier = 'ordinary' | 'rare' | 'ultra' | 'exceptional';
const ORDINARY_REWARD_IDS = [
  'xp_250', 'xp_500', 'xp_1000', 'xp_3000', 'xp_5000',
  'pearls_5', 'pearls_10', 'pearls_20',
  'stars_10', 'stars_20', 'stars_50',
  'energy_full', 'energy_plus2', 'hint_1', 'hint_3', 'chain_shield_1', 'attempt_restore_all',
  'xp_bank_150', 'xp_bank_300', 'xp_2x_24h',
] as const;
// зачем (владелец 2026-08-29, «добавить ценные подарки в спин»): v7 расширяет
// редкую полку двумя реально ценными расходниками — щит серии на 3 дня и
// крупный банк ×2 на 1500 XP. Оба применяются чисто локально, поэтому награда
// физически начисляется, а не только рисуется. pack_voucher_48h сюда НЕ вошёл
// сознательно: его активация требует серверную бронь (activateLevelPackGift),
// которой у локального спина нет — он бы показывался и не выдавался.
const RARE_REWARD_IDS = [
  'xp_10000', 'xp_25000', 'pearls_50', 'pearls_100', 'stars_100', 'stars_250',
  'energy_plus3', 'xp_bank_600', 'xp_2x_48h',
  'chain_shield_3', 'xp_bank_1500',
] as const;
// v7: два джекпота валют — 1000 жемчужин (5 тем интерфейса) и 2000 рун
// (два самых дорогих аватара). Вдвое реже прежней ultra-полки (вес 50).
const ULTRA_REWARD_IDS = [
  'xp_50000', 'pearls_250', 'pearls_500', 'stars_500', 'stars_1000',
  'pearls_1000', 'stars_2000',
] as const;

export const LEVEL_SPIN_REWARD_IDS = [
  ...ORDINARY_REWARD_IDS,
  ...RARE_REWARD_IDS,
  ...ULTRA_REWARD_IDS,
  'plus_days_3',
  'plus_days_7',
  'plus_days_14',
  'plus_days_30',
  'cosmetic_avatar_aura',
  'cosmetic_theme',
  'cosmetic_avatar_common',
] as const;
export type LevelSpinRewardId = typeof LEVEL_SPIN_REWARD_IDS[number];

export type LevelSpinRewardCatalogEntry = Readonly<{
  id: LevelSpinRewardId;
  tier: LevelSpinRewardTier;
  weight: number;
}>;

/**
 * Персональные веса поверх полки.
 *
 * зачем (владелец 2026-08-26): энергия — самая нужная награда в спине, её шанс
 * поднят с ~10.2% до ~15%. «Второй шанс» также занимает ~15%. После его
 * добавления все целевые шансы перенормированы совместно: аура ~2.8%, тема
 * ~1%, аватар ~1.5%. Так новый расходник не размывает уже утверждённую
 * косметику. Тема намеренно остаётся редкой, чтобы не обесценить её покупку.
 */
const REWARD_WEIGHT_OVERRIDES: Partial<Record<LevelSpinRewardId, number>> = {
  // v7 (2026-08-29): при добавлении ценных призов все пять утверждённых целей
  // перенормированы совместно на новую сумму весов 279 814 — энергия и «второй
  // шанс» держат ~15%, аура ~2.8%, тема ~1%, аватар ~1.5%, как в v6.
  energy_full: 19_078,
  energy_plus2: 19_078,
  energy_plus3: 3_816,
  // «Второй шанс»: постоянный предмет инвентаря, который полностью
  // восстанавливает 3 попытки. Вес даёт ~15% в актуальном v7-пуле.
  attempt_restore_all: 41_972,
  // Джекпоты валют: вдвое реже обычной ultra-полки (~0.018%, 1 к ~5 600 спинов).
  pearls_1000: 50,
  stars_2000: 50,
};

const entriesWithOverrides = (
  ids: readonly LevelSpinRewardId[], tier: LevelSpinRewardTier, weight: number,
): LevelSpinRewardCatalogEntry[] => ids.map((id) => Object.freeze({
  id, tier, weight: REWARD_WEIGHT_OVERRIDES[id] ?? weight,
}));

export const LEVEL_SPIN_REWARD_CATALOG: readonly LevelSpinRewardCatalogEntry[] = Object.freeze([
  ...entriesWithOverrides(ORDINARY_REWARD_IDS, 'ordinary', 10_000),
  ...entriesWithOverrides(RARE_REWARD_IDS, 'rare', 1_000),
  ...entriesWithOverrides(ULTRA_REWARD_IDS, 'ultra', 100),
  // зачем (владелец 2026-08-29): прежняя лестница Plus (вес 10 и 1 из 275 906,
  // то есть 1 к 27 590 и 1 к 275 906 спинов) была витриной, которую никто не
  // выигрывал. v7 делает призы реальными, оставляя их редкими: 3 дня ~0.107%,
  // 7 дней ~0.036%, 14 дней ~0.011%, месяц ~0.0036%. Ожидание — меньше одного
  // дня Plus на сотню спинов, для экономики это безопасно.
  Object.freeze({ id: 'plus_days_3', tier: 'exceptional' as const, weight: 300 }),
  Object.freeze({ id: 'plus_days_7', tier: 'exceptional' as const, weight: 100 }),
  Object.freeze({ id: 'plus_days_14', tier: 'exceptional' as const, weight: 30 }),
  Object.freeze({ id: 'plus_days_30', tier: 'exceptional' as const, weight: 10 }),
  Object.freeze({ id: 'cosmetic_avatar_aura', tier: 'rare' as const, weight: 7_835 }),
  // Тема интерфейса: ~1% — редкий, но реальный приз. Полка 'ultra', а не
  // 'exceptional': по ценности это уровень крупной валюты, а не Plus-доступа.
  Object.freeze({ id: 'cosmetic_theme', tier: 'ultra' as const, weight: 2_798 }),
  // Все custom-gen-01..125: 1.5%. Конкретный аватар выбирается отдельным
  // ценовым весом, а после исчерпания всей полки приз исчезает до розыгрыша.
  Object.freeze({ id: 'cosmetic_avatar_common', tier: 'rare' as const, weight: 4_197 }),
]);

export const LEVEL_SPIN_REWARD_TOTAL_WEIGHT = LEVEL_SPIN_REWARD_CATALOG.reduce(
  (sum, entry) => sum + entry.weight, 0,
);

const ids = new Set<string>();
for (const entry of LEVEL_SPIN_REWARD_CATALOG) {
  if (!entry.id || ids.has(entry.id) || !Number.isSafeInteger(entry.weight) || entry.weight <= 0) {
    throw new Error('level_spin_reward_catalog_invalid');
  }
  ids.add(entry.id);
}

export function pickLevelSpinRewardByTicket(ticket: number): LevelSpinRewardCatalogEntry {
  if (!Number.isSafeInteger(ticket) || ticket < 0 || ticket >= LEVEL_SPIN_REWARD_TOTAL_WEIGHT) {
    throw new Error('level_spin_reward_ticket_invalid');
  }
  let cursor = ticket;
  for (const entry of LEVEL_SPIN_REWARD_CATALOG) {
    if (cursor < entry.weight) return entry;
    cursor -= entry.weight;
  }
  throw new Error('level_spin_reward_catalog_invalid');
}

function hashSeed(seed: string): number {
  if (!seed.trim()) throw new Error('level_spin_reward_seed_invalid');
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

export function pickLevelSpinReward(seed: string): LevelSpinRewardCatalogEntry {
  return pickLevelSpinRewardByTicket(hashSeed(seed) % LEVEL_SPIN_REWARD_TOTAL_WEIGHT);
}

/**
 * Розыгрыш без наград, которые этому человеку уже нечего дать.
 *
 * зачем (владелец 2026-08-26): когда все платные темы уже открыты, тема НЕ
 * должна выпадать вовсе — ни утешительным жемчугом, ни пустышкой. Награда
 * просто перестаёт существовать для этого игрока, а её вес честно переходит
 * остальным (сумма весов пересчитывается, а не «дырявится»).
 *
 * Детерминированность сохраняется: тот же requestId при том же наборе
 * исключений даёт ту же награду. Разный результат возможен только если между
 * попытками изменился сам набор исключений — то есть человек открыл последнюю
 * тему, и приза больше нет; это и есть желаемое поведение, а не гонка.
 */
export function pickLevelSpinRewardExcluding(
  seed: string,
  excludedIds: readonly string[],
): LevelSpinRewardCatalogEntry {
  if (excludedIds.length === 0) return pickLevelSpinReward(seed);
  const excluded = new Set(excludedIds);
  const pool = LEVEL_SPIN_REWARD_CATALOG.filter((entry) => !excluded.has(entry.id));
  // Пустой пул невозможен по построению (исключается лишь косметика), но если
  // вызывающий исключит всё — честнее отдать полный каталог, чем упасть.
  if (pool.length === 0) return pickLevelSpinReward(seed);
  const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = hashSeed(seed) % total;
  for (const entry of pool) {
    if (cursor < entry.weight) return entry;
    cursor -= entry.weight;
  }
  throw new Error('level_spin_reward_catalog_invalid');
}
