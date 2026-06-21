// ARENA BATTLE PASS — чистая модель «боевого пропуска» Арены.
//
// Идея (главный драйвер премиума из аудита): сезонная лестница наград с двумя треками —
// БЕСПЛАТНЫМ и ПРЕМИУМ. За матчи копятся очки пропуска (BP), каждые N очков = новый уровень.
// На каждом уровне есть бесплатная награда и (опционально) премиум-награда, которая доступна
// только с подпиской. Это даёт долгосрочную цель и понятный повод платить.
//
// Модуль ЧИСТЫЙ: расчёт уровня, прогресса, какие награды доступны/забраны. Без React/сети/стораджа.
// Персист (BP-очки и забранные уровни) — отдельным тонким модулем поверх AsyncStorage.

export type BattlePassRewardKind = 'shards' | 'aura' | 'frame' | 'title' | 'xp';

export interface BattlePassReward {
  kind: BattlePassRewardKind;
  /** Количество (для shards/xp) либо 1 для косметики. */
  amount: number;
  /** Идентификатор косметики (ауры/рамки/звания), если применимо. */
  cosmeticId?: string;
  /** Человекочитаемая подпись-ключ (локализуется в UI). */
  labelKey: string;
}

export interface BattlePassTier {
  /** Уровень, начиная с 1. */
  level: number;
  /** Сколько суммарно очков нужно, чтобы достичь этого уровня. */
  bpRequired: number;
  /** Бесплатная награда (есть всегда). */
  free: BattlePassReward;
  /** Премиум-награда (только с подпиской), может отсутствовать. */
  premium?: BattlePassReward;
}

/** Очки за исход матча. */
export const BP_PER_WIN = 10;
export const BP_PER_MATCH = 3;
/** Шаг очков между уровнями пропуска. */
export const BP_PER_LEVEL = 100;
/** Сколько уровней в сезоне. */
export const BATTLE_PASS_LEVELS = 30;

/** Сколько BP даёт матч по исходу. */
export function bpForMatch(won: boolean): number {
  return BP_PER_MATCH + (won ? BP_PER_WIN : 0);
}

/**
 * Лестница наград сезона. Детерминированная (одна и та же для всех в сезоне),
 * чтобы UI и логика совпадали. Премиум-награды — на «круглых» уровнях.
 */
export function buildBattlePassLadder(): BattlePassTier[] {
  const tiers: BattlePassTier[] = [];
  for (let level = 1; level <= BATTLE_PASS_LEVELS; level += 1) {
    const bpRequired = level * BP_PER_LEVEL;
    // Бесплатный трек: в основном осколки, иногда XP.
    const free: BattlePassReward =
      level % 5 === 0
        ? { kind: 'shards', amount: 3, labelKey: 'bpFreeShards3' }
        : level % 2 === 0
          ? { kind: 'shards', amount: 1, labelKey: 'bpFreeShards1' }
          : { kind: 'xp', amount: 50, labelKey: 'bpFreeXp50' };

    // Премиум-трек: косметика-статус + крупные осколки на вехах.
    let premium: BattlePassReward | undefined;
    if (level % 10 === 0) {
      premium = { kind: 'title', amount: 1, cosmeticId: `arena_title_s_${level}`, labelKey: 'bpPremiumTitle' };
    } else if (level % 5 === 0) {
      premium = { kind: 'aura', amount: 1, cosmeticId: `arena_aura_s_${level}`, labelKey: 'bpPremiumAura' };
    } else if (level % 3 === 0) {
      premium = { kind: 'frame', amount: 1, cosmeticId: `arena_frame_s_${level}`, labelKey: 'bpPremiumFrame' };
    } else {
      premium = { kind: 'shards', amount: 2, labelKey: 'bpPremiumShards2' };
    }

    tiers.push({ level, bpRequired, free, premium });
  }
  return tiers;
}

export interface BattlePassProgress {
  /** Текущий достигнутый уровень (0..BATTLE_PASS_LEVELS). */
  level: number;
  /** Очки внутри текущего уровня. */
  bpInLevel: number;
  /** Сколько очков нужно до следующего уровня (0 если максимум). */
  bpToNext: number;
  /** Доля прогресса к следующему уровню 0..1. */
  ratio: number;
  /** Достигнут ли максимум пропуска. */
  maxed: boolean;
}

/** Текущий уровень и прогресс по суммарным BP-очкам. */
export function computeBattlePassProgress(totalBp: number): BattlePassProgress {
  const bp = Math.max(0, Math.trunc(Number.isFinite(totalBp) ? totalBp : 0));
  const rawLevel = Math.floor(bp / BP_PER_LEVEL);
  const level = Math.min(BATTLE_PASS_LEVELS, rawLevel);
  const maxed = level >= BATTLE_PASS_LEVELS;
  if (maxed) {
    return { level: BATTLE_PASS_LEVELS, bpInLevel: BP_PER_LEVEL, bpToNext: 0, ratio: 1, maxed: true };
  }
  const bpInLevel = bp - level * BP_PER_LEVEL;
  const bpToNext = BP_PER_LEVEL - bpInLevel;
  return { level, bpInLevel, bpToNext, ratio: bpInLevel / BP_PER_LEVEL, maxed: false };
}

export interface ClaimableState {
  /** Уровень награды. */
  level: number;
  /** Доступна ли к получению (уровень достигнут И ещё не забрана). */
  free: { unlocked: boolean; claimed: boolean; claimable: boolean };
  premium: { unlocked: boolean; claimed: boolean; claimable: boolean; locked: boolean } | null;
}

/**
 * Статус каждого уровня: что разблокировано, что забрано, что можно забрать сейчас.
 *
 * @param totalBp        суммарные очки пропуска
 * @param claimedFree    множество уровней, чьи бесплатные награды забраны
 * @param claimedPremium множество уровней, чьи премиум-награды забраны
 * @param hasPremium     есть ли у игрока подписка (иначе премиум-награды залочены)
 */
export function computeClaimables(
  ladder: BattlePassTier[],
  totalBp: number,
  claimedFree: ReadonlySet<number>,
  claimedPremium: ReadonlySet<number>,
  hasPremium: boolean,
): ClaimableState[] {
  const reached = computeBattlePassProgress(totalBp).level;
  return ladder.map((tier) => {
    const unlocked = tier.level <= reached;
    const freeClaimed = claimedFree.has(tier.level);
    const premiumExists = !!tier.premium;
    const premiumClaimed = claimedPremium.has(tier.level);
    return {
      level: tier.level,
      free: {
        unlocked,
        claimed: freeClaimed,
        claimable: unlocked && !freeClaimed,
      },
      premium: premiumExists
        ? {
            unlocked,
            claimed: premiumClaimed,
            locked: !hasPremium,
            claimable: unlocked && !premiumClaimed && hasPremium,
          }
        : null,
    };
  });
}

/** Сколько наград можно забрать прямо сейчас (для бейджа на кнопке пропуска). */
export function countClaimable(states: ClaimableState[]): number {
  return states.reduce((n, s) => {
    let c = s.free.claimable ? 1 : 0;
    if (s.premium?.claimable) c += 1;
    return n + c;
  }, 0);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
