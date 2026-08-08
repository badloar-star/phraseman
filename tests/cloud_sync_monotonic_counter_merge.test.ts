import { __cloudSyncTestHooks, MONOTONIC_COUNTER_RESTORE_KEYS } from '../app/cloud_sync';
import {
  legacyFreeLessonCapKey,
  legacyFreeLessonMigrationKey,
} from '../app/target_storage_keys';

const { mergeLessonRestoreValue, mergeCurrentWeekProgressRestoreValue } = __cloudSyncTestHooks;

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
  it('max-merges and clamps the immutable legacy lesson cap', () => {
    const capKey = legacyFreeLessonCapKey('en');
    expect(mergeLessonRestoreValue(capKey, '5', '7')).toBe('7');
    expect(mergeLessonRestoreValue(capKey, '8', '4')).toBe('8');
    expect(mergeLessonRestoreValue(capKey, '99', '2')).toBe('8');
  });

  it('keeps a completed legacy lesson migration marker sticky', () => {
    expect(mergeLessonRestoreValue(
      legacyFreeLessonMigrationKey('en'),
      'complete',
      null,
    )).toBe('complete');
  });
});

describe('cloud_sync current-week restore merge', () => {
  const currentWeekStart = '2026-06-08';
  const currentWeekId = '2026-W24';

  it('uses the embedded week key for week_points_v2 even when period metadata is missing', () => {
    expect(mergeCurrentWeekProgressRestoreValue(
      'week_points_v2',
      JSON.stringify({ weekKey: currentWeekId, points: 300 }),
      JSON.stringify({ weekKey: currentWeekId, points: 350 }),
      null,
      null,
      currentWeekStart,
      currentWeekId,
    )).toBe(JSON.stringify({ weekKey: currentWeekId, points: 350 }));
  });

  it('keeps current local week_points_v2 when the cloud value belongs to an old week', () => {
    expect(mergeCurrentWeekProgressRestoreValue(
      'week_points_v2',
      JSON.stringify({ weekKey: '2026-W23', points: 900 }),
      JSON.stringify({ weekKey: currentWeekId, points: 350 }),
      '2026-06-01',
      currentWeekStart,
      currentWeekStart,
      currentWeekId,
    )).toBe(JSON.stringify({ weekKey: currentWeekId, points: 350 }));
  });

  it('keeps a current local scalar when cloud period metadata is stale', () => {
    expect(mergeCurrentWeekProgressRestoreValue(
      'weekly_xp',
      '900',
      '350',
      '2026-06-01',
      currentWeekStart,
      currentWeekStart,
      currentWeekId,
    )).toBe('350');
  });

  it('allows the current cloud week to replace a stale local scalar', () => {
    expect(mergeCurrentWeekProgressRestoreValue(
      'weekly_xp',
      '10',
      '900',
      currentWeekStart,
      '2026-06-01',
      currentWeekStart,
      currentWeekId,
    )).toBe('10');
  });
});
