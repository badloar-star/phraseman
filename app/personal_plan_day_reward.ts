import AsyncStorage from '@react-native-async-storage/async-storage';

import { addShards } from './shards_system';

/**
 * One-time shard reward for finishing a whole personal-plan day.
 *
 * Plan tasks already award XP per task (see personal_plan_xp). Completing an entire day
 * is a bigger milestone, so it grants a small shard bonus — but only ONCE per
 * (planInstanceId, dayIndex), so it can't be farmed by re-opening the day. Dedup is a
 * local set keyed per plan-day. Best-effort: never blocks the learner.
 */

const REWARDED_DAYS_KEY = 'plan_day_shard_rewards_v1';

function dayKey(planInstanceId: string, dayIndex: number): string {
  return `${planInstanceId}:${Math.floor(dayIndex)}`;
}

async function readRewardedDays(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(REWARDED_DAYS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export type PlanDayRewardResult = {
  /** True only when this call newly granted the reward. */
  awarded: boolean;
  shards: number;
};

/**
 * Award the plan-day shard bonus once for (planInstanceId, dayIndex).
 * Returns `{ awarded: false }` when the day was already rewarded.
 */
export async function awardPlanDayCompletionReward(
  planInstanceId: string,
  dayIndex: number,
): Promise<PlanDayRewardResult> {
  const id = planInstanceId.trim();
  if (!id || !Number.isFinite(dayIndex) || dayIndex <= 0) {
    return { awarded: false, shards: 0 };
  }

  const key = dayKey(id, dayIndex);
  try {
    const rewarded = await readRewardedDays();
    if (rewarded.has(key)) return { awarded: false, shards: 0 };

    // Mark first to keep the reward idempotent even if shard write is retried.
    rewarded.add(key);
    await AsyncStorage.setItem(REWARDED_DAYS_KEY, JSON.stringify([...rewarded]));

    const shards = await addShards('plan_day_complete').catch(() => 0);
    return { awarded: true, shards };
  } catch {
    return { awarded: false, shards: 0 };
  }
}

/** Whether the plan-day bonus has already been granted (for UI/idempotency checks). */
export async function planDayRewardAlreadyGranted(
  planInstanceId: string,
  dayIndex: number,
): Promise<boolean> {
  const rewarded = await readRewardedDays();
  return rewarded.has(dayKey(planInstanceId.trim(), dayIndex));
}
