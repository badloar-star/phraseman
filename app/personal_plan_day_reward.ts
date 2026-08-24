/**
 * Compatibility boundary for the former one-time shard reward.
 *
 * Personal-plan tasks still award XP through personal_plan_xp. The current economy
 * policy makes ordinary educational pearl rewards zero-valued (pearls are no longer
 * farmed by lessons/sessions), so this API remains for screen compatibility while
 * deliberately committing no balance operation. Do not add a new positive catalog
 * source here: any future reward must use the immutable/idempotent credit journal.
 */

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
  void planInstanceId;
  void dayIndex;
  return { awarded: false, shards: 0 };
}

/** Whether the plan-day bonus has already been granted (for UI/idempotency checks). */
export async function planDayRewardAlreadyGranted(
  planInstanceId: string,
  dayIndex: number,
): Promise<boolean> {
  void planInstanceId;
  void dayIndex;
  return false;
}
