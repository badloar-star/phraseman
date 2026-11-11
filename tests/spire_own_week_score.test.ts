import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from '../app/account_generation';
import {
  __resetOwnAuthoritativeWeekScoreForTests,
  applyOwnWeekScoreRawStars,
  applyOwnWeekScoreWireSnapshot,
  peekOwnAuthoritativeWeekScore,
  selectOwnAuthoritativeWeekCoins,
  subscribeOwnAuthoritativeWeekScore,
} from '../app/spire/spire_own_week_score';

const wire = (
  seq: number,
  weekKey = '2026-W46',
  earned = 100,
  previous: { weekKey: string; earned: number } | null = { weekKey: '2026-W45', earned: 80 },
) => ({
  schemaVersion: 'stars-week-snapshot.v1',
  seq,
  current: { weekKey, earned },
  previous,
});

describe('owner authoritative week-score process store', () => {
  beforeEach(() => {
    __resetAccountGenerationForTests();
    __resetOwnAuthoritativeWeekScoreForTests();
    jest.restoreAllMocks();
  });

  test('old server and invalid or partial snapshots are strict no-ops', () => {
    const token = beginAccountGeneration('owner-A');
    expect(applyOwnWeekScoreWireSnapshot(token, undefined)).toBe('invalid');
    for (const invalid of [
      {},
      { ...wire(1), schemaVersion: 'other' },
      { ...wire(-1) },
      { ...wire(1), seq: 1.5 },
      { ...wire(1), current: { weekKey: '', earned: 1 } },
      { ...wire(1), current: { weekKey: '2026-W46', earned: -1 } },
      { ...wire(1), previous: { weekKey: '2026-W46', earned: 2 } },
    ]) expect(applyOwnWeekScoreWireSnapshot(token, invalid)).toBe('invalid');
    expect(peekOwnAuthoritativeWeekScore()).toBeNull();
  });

  test('orders boot and ACK only by seq in either completion order', () => {
    const token = beginAccountGeneration('owner-A');
    expect(applyOwnWeekScoreRawStars(token, {
      seq: 10, weekKey: '2026-W46', weekEarned: 100,
      prevWeekKey: '2026-W45', prevWeekEarned: 80,
    })).toBe('applied');
    expect(applyOwnWeekScoreWireSnapshot(token, wire(12, '2026-W46', 130))).toBe('applied');
    expect(peekOwnAuthoritativeWeekScore()?.sourceSeq).toBe(12);
    expect(selectOwnAuthoritativeWeekCoins(token, '2026-W46')).toBe(130);

    __resetOwnAuthoritativeWeekScoreForTests();
    expect(applyOwnWeekScoreWireSnapshot(token, wire(12, '2026-W46', 130))).toBe('applied');
    expect(applyOwnWeekScoreRawStars(token, {
      seq: 10, weekKey: '2026-W46', weekEarned: 100,
      prevWeekKey: '2026-W45', prevWeekEarned: 80,
    })).toBe('older');
    expect(peekOwnAuthoritativeWeekScore()?.sourceSeq).toBe(12);
    expect(selectOwnAuthoritativeWeekCoins(token, '2026-W46')).toBe(130);
  });

  test('same seq is idempotent or fail-closed conflict without publish', () => {
    const token = beginAccountGeneration('owner-A');
    const listener = jest.fn();
    const unsubscribe = subscribeOwnAuthoritativeWeekScore(listener);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(applyOwnWeekScoreWireSnapshot(token, wire(12))).toBe('applied');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(applyOwnWeekScoreWireSnapshot(token, wire(12))).toBe('idempotent');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(applyOwnWeekScoreWireSnapshot(token, wire(12, '2026-W46', 999))).toBe('conflict');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(selectOwnAuthoritativeWeekCoins(token, '2026-W46')).toBe(100);
    expect(warn).toHaveBeenCalledWith('[SPIRE-WEEK-SCORE] week_snapshot_same_seq_conflict');
    unsubscribe();
  });

  test('owner or generation changes clear active state and stale applies cannot revive it', () => {
    const tokenA1 = beginAccountGeneration('owner-A');
    expect(applyOwnWeekScoreWireSnapshot(tokenA1, wire(5))).toBe('applied');
    const tokenB = beginAccountGeneration('owner-B');
    expect(peekOwnAuthoritativeWeekScore()).toBeNull();
    expect(selectOwnAuthoritativeWeekCoins(tokenB, '2026-W46')).toBeUndefined();
    expect(applyOwnWeekScoreWireSnapshot(tokenA1, wire(6))).toBe('stale');

    const tokenA3 = beginAccountGeneration('owner-A');
    expect(selectOwnAuthoritativeWeekCoins(tokenA3, '2026-W46')).toBeUndefined();
    expect(applyOwnWeekScoreWireSnapshot(tokenA3, wire(7, '2026-W46', 140))).toBe('applied');
    expect(selectOwnAuthoritativeWeekCoins(tokenA3, '2026-W46')).toBe(140);
  });

  test('rollover replaces both buckets and drops the third-old week', () => {
    const token = beginAccountGeneration('owner-A');
    applyOwnWeekScoreWireSnapshot(token, wire(10, '2026-W45', 90, { weekKey: '2026-W44', earned: 70 }));
    applyOwnWeekScoreWireSnapshot(token, wire(11, '2026-W46', 5, { weekKey: '2026-W45', earned: 90 }));
    expect(selectOwnAuthoritativeWeekCoins(token, '2026-W46')).toBe(5);
    expect(selectOwnAuthoritativeWeekCoins(token, '2026-W45')).toBe(90);
    expect(selectOwnAuthoritativeWeekCoins(token, '2026-W44')).toBeUndefined();
  });

  test('never derives weekly score from balance total payout pending or process restart', () => {
    const token = beginAccountGeneration('owner-A');
    expect(applyOwnWeekScoreRawStars(token, { balance: 1000, earnedTotal: 9000, seq: 20 })).toBe('invalid');
    expect(selectOwnAuthoritativeWeekCoins(token, '2026-W46')).toBeUndefined();
    applyOwnWeekScoreWireSnapshot(token, wire(21, '2026-W46', 100));
    expect(applyOwnWeekScoreRawStars(token, {
      balance: 5000, earnedTotal: 9000, seq: 22,
      weekKey: '2026-W46', weekEarned: 100,
      prevWeekKey: '2026-W45', prevWeekEarned: 80,
    })).toBe('applied');
    expect(selectOwnAuthoritativeWeekCoins(token, '2026-W46')).toBe(100);
    __resetOwnAuthoritativeWeekScoreForTests();
    expect(selectOwnAuthoritativeWeekCoins(token, '2026-W46')).toBeUndefined();
  });
});
