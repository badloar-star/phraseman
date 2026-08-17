/**
 * «Вместе» — сундук недели. ЧИСТЫЙ билдер по образцу league_club_hub_model.ts /
 * league_bonus_mission_model — принимает уже собранные данные, ничего не читает
 * сам (ни AsyncStorage, ни сеть).
 *
 * Правила (docs/plans/2026-08-16-friends-together-implementation.ru.md §1.2):
 * прогресс = Σ по топ-10 друзьям уровня ≥2 min(weeklyXp, cap); пороги 6k/12k/20k;
 * клейм требует myDays ≥5 и myWeeklyXp ≥1000; награда × множитель по своим дням.
 */
import {
  chestMultiplierForMyDays,
  FRIENDS_CHEST_CAP_PER_FRIEND,
  FRIENDS_CHEST_MIN_DAYS,
  FRIENDS_CHEST_MIN_WEEKLY_XP,
  FRIENDS_CHEST_TIERS,
  FRIENDS_CHEST_TOP_N,
} from './together_config';

export type WeeklyChestFriendInput = Readonly<{
  uid: string;
  weeklyXp: number;
  /** Уровень дружбы пары (1..5) — только ≥2 считается в прогресс. */
  pairLevel: number;
  /** Реферальный буст первой недели (friend_pairs.boostUntilWeekKey покрывает текущую неделю) — ×2 вклада. */
  boostActive?: boolean;
}>;

export type WeeklyChestModelInput = Readonly<{
  friends: readonly WeeklyChestFriendInput[];
  myDays: number;
  myWeeklyXp: number;
  weekKey: string;
  /** weekKey уже забранной награды (из friends_chest_claims), либо null. */
  claimedWeekKey: string | null;
  /**
   * Сегодня — день открытия (воскресенье по локальному времени). Сервер отклоняет клейм в
   * другие дни (`week_open`), поэтому кнопка «Открыть» до воскресенья не показывается —
   * состояние остаётся `active`. Не задано → считаем по устройству.
   */
  isClaimDay?: boolean;
}>;

export type WeeklyChestState = 'locked' | 'active' | 'ready' | 'claimed';

export type WeeklyChestContributor = Readonly<{
  uid: string;
  contribution: number;
}>;

export interface WeeklyChestModel {
  weekKey: string;
  progress: number;
  tier: number; // 0..3, сколько порогов уже достигнуто
  percent: number; // прогресс до СЛЕДУЮЩЕГО порога (или 100, если все взяты)
  nextTierGoal: number | null;
  remaining: number;
  canClaim: boolean;
  state: WeeklyChestState;
  multiplier: number;
  topContributors: WeeklyChestContributor[];
  eligibleByMyStats: boolean;
}

function contributionFor(friend: WeeklyChestFriendInput): number {
  if (friend.pairLevel < 2) return 0;
  const capped = Math.min(Math.max(0, Math.floor(friend.weeklyXp)), FRIENDS_CHEST_CAP_PER_FRIEND);
  return friend.boostActive ? capped * 2 : capped;
}

export function buildWeeklyChestModel(input: WeeklyChestModelInput): WeeklyChestModel {
  const eligibleFriends = input.friends
    .filter((f) => f.pairLevel >= 2)
    .map((f) => ({ uid: f.uid, contribution: contributionFor(f) }))
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, FRIENDS_CHEST_TOP_N);

  const progress = eligibleFriends.reduce((sum, f) => sum + f.contribution, 0);

  const tiersReached = FRIENDS_CHEST_TIERS.filter((t) => progress >= t).length;
  const nextTierGoal = tiersReached < FRIENDS_CHEST_TIERS.length ? FRIENDS_CHEST_TIERS[tiersReached] : null;
  const prevTierGoal = tiersReached > 0 ? FRIENDS_CHEST_TIERS[tiersReached - 1] : 0;
  const remaining = nextTierGoal !== null ? Math.max(0, nextTierGoal - progress) : 0;
  const percent = nextTierGoal !== null
    ? Math.min(100, Math.round(((progress - prevTierGoal) / (nextTierGoal - prevTierGoal)) * 100))
    : 100;

  const myDays = Math.max(0, Math.floor(input.myDays));
  const myWeeklyXp = Math.max(0, Math.floor(input.myWeeklyXp));
  const eligibleByMyStats = myDays >= FRIENDS_CHEST_MIN_DAYS && myWeeklyXp >= FRIENDS_CHEST_MIN_WEEKLY_XP;
  const alreadyClaimed = input.claimedWeekKey === input.weekKey;

  // зачем: сундук открывается только в воскресенье (макет владельца) — до этого кнопки нет.
  const isClaimDay = input.isClaimDay ?? (new Date().getDay() === 0);
  const canClaim = !alreadyClaimed && eligibleByMyStats && tiersReached > 0 && isClaimDay;
  const state: WeeklyChestState = alreadyClaimed
    ? 'claimed'
    : canClaim
      ? 'ready'
      : progress > 0
        ? 'active'
        : 'locked';

  const multiplier = chestMultiplierForMyDays(myDays);

  return {
    weekKey: input.weekKey,
    progress,
    tier: tiersReached,
    percent,
    nextTierGoal,
    remaining,
    canClaim,
    state,
    multiplier,
    topContributors: eligibleFriends.slice(0, 3),
    eligibleByMyStats,
  };
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
