import { __cloudSyncTestHooks, MONOTONIC_COUNTER_RESTORE_KEYS } from '../app/cloud_sync';

const { mergeLessonRestoreValue } = __cloudSyncTestHooks;

// #10: multi-device. Lifetime counters (achievement_*_count, shards_*_total, …)
// are strictly additive (bumpStoredCounter never decreases them). When two devices
// edit concurrently, a later push could otherwise write a LOWER value and lose
// progress. Restore-side max-merge recovers the highest value on either device.

describe('cloud_sync monotonic counter merge (#10 multi-device)', () => {
  it('exposes a non-empty allowlist of monotonic counters', () => {
    expect(Array.isArray(MONOTONIC_COUNTER_RESTORE_KEYS)).toBe(true);
    expect(MONOTONIC_COUNTER_RESTORE_KEYS.length).toBeGreaterThan(0);
    // Must include the well-known lifetime counters…
    expect(MONOTONIC_COUNTER_RESTORE_KEYS).toContain('achievement_quiz_total_count');
    expect(MONOTONIC_COUNTER_RESTORE_KEYS).toContain('shards_lifetime_earned_v1');
    // …and must NOT include resettable / non-accumulative fields.
    expect(MONOTONIC_COUNTER_RESTORE_KEYS).not.toContain('streak_count');
    expect(MONOTONIC_COUNTER_RESTORE_KEYS).not.toContain('weekly_xp');
    expect(MONOTONIC_COUNTER_RESTORE_KEYS).not.toContain('gift_xp_multiplier');
    expect(MONOTONIC_COUNTER_RESTORE_KEYS).not.toContain('streak_last_date');
  });

  it('takes the max of a monotonic counter (cloud higher)', () => {
    expect(mergeLessonRestoreValue('achievement_quiz_total_count', '120', '90')).toBe('120');
  });

  it('takes the max of a monotonic counter (local higher — concurrent edit recovered)', () => {
    expect(mergeLessonRestoreValue('achievement_quiz_total_count', '90', '120')).toBe('120');
  });

  it('handles a missing local counter (first restore on a device)', () => {
    expect(mergeLessonRestoreValue('shards_lifetime_earned_v1', '500', null)).toBe('500');
  });

  it('does NOT max-merge a non-monotonic field — keeps cloud value (existing behavior)', () => {
    // streak_count is not in the allowlist → falls through to default (cloud wins),
    // because a streak can legitimately drop and must not be maxed.
    expect(mergeLessonRestoreValue('streak_count', '3', '40')).toBe('3');
  });
});
