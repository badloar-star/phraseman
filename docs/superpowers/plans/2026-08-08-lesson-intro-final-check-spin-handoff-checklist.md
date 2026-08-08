# Lesson Intro Final Check — Spin Delivery Handoff Checklist

**Status:** Blocked by the active Spin-engine stabilization task. This is a release gate, not speculative implementation authority.

**Intro-owned producer:** `users/{stableUid}/lesson_intro_spin_awards/intro_spin_v1_{studyTarget}_{lessonId}`

**Producer guarantee:** At most one pending `amount: 1` award is created for an all-correct first attempt for one canonical account, target, and lesson.

## Forbidden until handoff is complete

- Do not edit or import `functions/src/level_reward_spins.ts` from the intro-check task.
- Do not change `rewardForSpin`, Spin claim, acknowledge, result, delivery, progress, auth, or friend contracts.
- Do not enable `lesson_intro_final_check_enabled`.
- Do not show `+1 спин`, play `pm.reward.small`, or consume `SpinRewardPlaque` for a pending award.
- Do not infer successful delivery from a callable timeout, a local balance, or the existence of the pending award document.

## Required Spin-owner handoff evidence

- [ ] Exact committed source path and exported function/callable name.
- [ ] Exact request type accepting at minimum:

```ts
{
  stableUid: string;
  awardId: string;
  source: 'lesson_intro_final_check';
  studyTarget: string;
  lessonId: number;
  amount: 1;
}
```

- [ ] Exact response type containing a durable unique receipt such as `spinCreditId` and an explicit `delivered`/`already_delivered` status.
- [ ] Server-side authorization showing that an arbitrary client cannot mint an award or choose another account.
- [ ] Idempotency keyed by `awardId` across retries, timeouts, concurrent calls, and process restarts.
- [ ] Test evidence that two concurrent deliveries produce one spin credit and one balance increment.
- [ ] Test evidence that an already-delivered award returns the original receipt without another increment.
- [ ] Test evidence for rollback/retry after a failure between credit creation and award-status update.
- [ ] Exact deploy command covering every newly exported function.
- [ ] Exact rollback/kill-switch procedure.
- [ ] Explicit Spin-owner approval that the intro task may consume this seam.

## Intro-side integration plan may begin only after all boxes above are concrete

The follow-up plan must then specify exact adapter files, tests, transaction or outbox ownership, reconciliation behavior, and the safe surface for delayed presentation. It must keep `components/SpinRewardPlaque.tsx` presentation-only and require a durable receipt before sound or animation.
