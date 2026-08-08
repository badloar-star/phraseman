import { buildLevelSpinMergePlan, type LevelSpinMergeSnapshot } from './level_spin_merge';

const result = (requestId: string, creditId: string, level: number, deliveries?: Record<string, unknown>): { id: string; data: Record<string, any> } => ({
  id: requestId,
  data: {
    originStableUid: 'origin-a', requestId, creditId, level, kind: 'standard', premiumAtEarn: false,
    baseGiftId: 'xp_100', premiumGiftId: null, rewardOccurrences: [`level-spin:${requestId}:base`],
    catalogVersion: 1, schemaVersion: 1, createdAtMs: 100, expiresAtMs: 200,
    revealState: 'acknowledged', deliveries: deliveries ?? { base: { state: 'unclaimed' } },
  },
});

const snapshot = (partial: Partial<LevelSpinMergeSnapshot>): LevelSpinMergeSnapshot => ({
  stableUid: partial.stableUid ?? 'winner',
  state: partial.state ?? { protocol: 'v1', levelBaseline: 5, balance: 0, activeRequestId: null },
  credits: partial.credits ?? [],
  results: partial.results ?? [],
  bonusClaims: partial.bonusClaims ?? [],
});

describe('Level Spin account merge plan', () => {
  test('unions distinct levels and consumed wins a same-level collision without replay', () => {
    const winner = snapshot({
      stableUid: 'winner',
      credits: [{ id: 'level_spin_v1_002', data: { level: 2, status: 'available', earnedAtMs: 20 } }],
    });
    const loser = snapshot({
      stableUid: 'loser',
      credits: [
        { id: 'level_spin_v1_002', data: { level: 2, status: 'consumed', earnedAtMs: 10, claimRequestId: 'request0000000002' } },
        { id: 'level_spin_v1_003', data: { level: 3, status: 'available', earnedAtMs: 30 } },
      ],
      results: [result('request0000000002', 'level_spin_v1_002', 2)],
    });

    const plan = buildLevelSpinMergePlan(winner, loser);
    expect(plan.credits.map((credit) => [credit.id, credit.data.status])).toEqual([
      ['level_spin_v1_002', 'consumed'],
      ['level_spin_v1_003', 'available'],
    ]);
    expect(plan.state.balance).toBe(1);
    expect(plan.state.activeRequestId).toBeNull();
  });

  test('coalesces identical receipt cores and keeps Plus lanes independently terminal', () => {
    const baseDelivered = result('request0000000006', 'level_spin_v1_006', 6, {
      base: { state: 'delivered', deliveredAtMs: 150 }, premium: { state: 'unclaimed' },
    });
    baseDelivered.data.premiumGiftId = 'prem_shards_10';
    baseDelivered.data.rewardOccurrences = ['level-spin:request0000000006:base', 'level-spin:request0000000006:premium'];
    const premiumDelivered = JSON.parse(JSON.stringify(baseDelivered));
    premiumDelivered.data.deliveries = {
      base: { state: 'unclaimed' }, premium: { state: 'delivered', deliveredAtMs: 160 },
    };
    const plan = buildLevelSpinMergePlan(
      snapshot({ results: [baseDelivered] }),
      snapshot({ stableUid: 'loser', results: [premiumDelivered] }),
    );
    expect(plan.results[0]?.data.deliveries).toMatchObject({
      base: { state: 'delivered' }, premium: { state: 'delivered' },
    });
  });

  test('fails closed on divergent request ids or a consumed credit without its receipt', () => {
    const first = result('request0000000007', 'level_spin_v1_007', 7);
    const divergent = JSON.parse(JSON.stringify(first));
    divergent.data.baseGiftId = 'xp_250';
    expect(() => buildLevelSpinMergePlan(
      snapshot({ results: [first] }),
      snapshot({ stableUid: 'loser', results: [divergent] }),
    )).toThrow('level_spin_result_collision');
    expect(() => buildLevelSpinMergePlan(
      snapshot({ credits: [{ id: 'level_spin_v1_008', data: { level: 8, status: 'consumed', claimRequestId: 'missing0000000008' } }] }),
      snapshot({ stableUid: 'loser' }),
    )).toThrow('level_spin_consumed_receipt_missing');
  });

  test('unions deterministic bonus claims and is idempotent on retry', () => {
    const first = snapshot({
      bonusClaims: [{ id: 'level_bonus_v1_002', data: { level: 2, eventId: 'level_up:2:bonus', amount: 100 } }],
    });
    const second = snapshot({
      stableUid: 'loser',
      state: { protocol: 'legacy', levelBaseline: 9, balance: 0, activeRequestId: 'active0000000009' },
      bonusClaims: [{ id: 'level_bonus_v1_003', data: { level: 3, eventId: 'alternate', amount: 100 } }],
    });
    const plan = buildLevelSpinMergePlan(first, second);
    expect(plan.bonusClaims.map((claim) => claim.id)).toEqual(['level_bonus_v1_002', 'level_bonus_v1_003']);
    expect(plan.state).toMatchObject({ protocol: 'v1', levelBaseline: 9, balance: 0, activeRequestId: null });
    const replay = buildLevelSpinMergePlan(snapshot({ ...plan, stableUid: 'winner' }), snapshot({ stableUid: 'loser' }));
    expect(replay).toEqual(plan);
  });
});
