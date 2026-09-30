import {
  buildGlobalBroadcastRewardMutation,
  canonicalizeExistingGlobalBroadcastReceipt,
  globalBroadcastCoinOpId,
  resolveGlobalBroadcastClaimDecision,
} from './global_broadcast_claim';

describe('global broadcast server reward mutation', () => {
  const now = Date.UTC(2026, 7, 8, 12);

  // зачем: D104 — награда рассылки монетами (stars_ledger); жемчуг снят (D70).
  test('returns a coin reward fact without mutating a personal balance', () => {
    expect(buildGlobalBroadcastRewardMutation({ rewardType: 'coins', rewardAmount: 30 }, { shards: 12 }, now))
      .toMatchObject({ userPatch: {}, response: { rewardType: 'coins', rewardAmount: 30 } });
  });

  test('rejects coin amounts outside one coin ledger operation', () => {
    expect(() => buildGlobalBroadcastRewardMutation({ rewardType: 'coins', rewardAmount: 0 }, {}, now))
      .toThrow('broadcast_coin_amount_invalid');
    expect(() => buildGlobalBroadcastRewardMutation({ rewardType: 'coins', rewardAmount: 5001 }, {}, now))
      .toThrow('broadcast_coin_amount_invalid');
  });

  test('legacy pearl broadcasts and receipts grant nothing', () => {
    expect(buildGlobalBroadcastRewardMutation({ shards: 30 }, { shards: 12 }, now))
      .toEqual({ userPatch: {}, response: { ok: true, rewardType: 'none' } });
    expect(buildGlobalBroadcastRewardMutation({ rewardType: 'shards', rewardAmount: 30 }, {}, now))
      .toEqual({ userPatch: {}, response: { ok: true, rewardType: 'none' } });
    expect(canonicalizeExistingGlobalBroadcastReceipt({ ok: true, rewardType: 'shards', rewardAmount: 30 }, {}))
      .toMatchObject({ rewardType: 'none', alreadyClaimed: true });
  });

  test('derives a stable coin ledger op id that fits the ledger format', () => {
    const opId = globalBroadcastCoinOpId('b'.repeat(180));
    expect(opId).toMatch(/^global_broadcast:[a-f0-9]{64}$/);
    expect(globalBroadcastCoinOpId('x')).toBe(globalBroadcastCoinOpId('x'));
  });

  test.each(['xp_boost_2x_24h', 'xp_boost_2x_48h', 'chain_shield_1', 'chain_shield_3', 'club_boost_free', 'wager_discount_25'])(
    'does not grant retired reward %s from an old broadcast or receipt', (rewardType) => {
      expect(buildGlobalBroadcastRewardMutation({ rewardType }, {}, now)).toEqual({
        userPatch: {}, response: { ok: true, rewardType: 'none' },
      });
      expect(canonicalizeExistingGlobalBroadcastReceipt({ ok: true, rewardType }, {}))
        .toMatchObject({ rewardType: 'none', alreadyClaimed: true });
    },
  );

  test('rejects unknown retired reward types instead of compensating them', () => {
    expect(() => buildGlobalBroadcastRewardMutation(
      { rewardType: ['ar', 'ena_extra_5'].join(''), rewardAmount: 999 }, { shards: 12 }, now,
    )).toThrow('broadcast_reward_unsupported');
  });

  test('source keeps legacy claim receipts fail-closed without regranting', () => {
    const source = require('fs').readFileSync(require('path').join(__dirname, 'global_broadcast_claim.ts'), 'utf8');
    expect(source).toContain('legacyClaim: true');
    expect(source).toContain("rewardType: 'none'");
  });

  test('replays an existing receipt before schema validation but rejects an invalid first grant', () => {
    const invalidBroadcast = { active: true, rewardType: 'coins', rewardAmount: 10, internalNote: 'unsafe' };
    expect(resolveGlobalBroadcastClaimDecision({
      claimExists: true,
      claimResponse: { ok: true, rewardType: 'coins', rewardAmount: 10 },
      broadcast: invalidBroadcast,
      user: {},
    })).toMatchObject({ kind: 'replay', response: { rewardType: 'coins', rewardAmount: 10 } });
    expect(() => resolveGlobalBroadcastClaimDecision({
      claimExists: false,
      claimResponse: null,
      broadcast: invalidBroadcast,
      user: {},
    })).toThrow('broadcast_public_schema_invalid');
  });
});
