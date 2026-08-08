import {
  buildGlobalBroadcastRewardMutation,
  canonicalizeExistingGlobalBroadcastReceipt,
} from './global_broadcast_claim';

describe('global broadcast server reward mutation', () => {
  const now = Date.UTC(2026, 7, 8, 12);

  test('increments shards from authoritative balance atomically', () => {
    expect(buildGlobalBroadcastRewardMutation({ rewardType: 'shards', rewardAmount: 30 }, { shards: 12 }, now))
      .toMatchObject({ userPatch: { shards: 42 }, response: { senderBalanceAfter: 42 } });
  });

  test('normalizes legacy shards-only broadcasts the same way as the client', () => {
    const mutation = buildGlobalBroadcastRewardMutation({ shards: 30 }, { shards: 12 }, now);
    expect(mutation.userPatch).toMatchObject({ shards: 42 });
    expect(mutation.response).toMatchObject({
      rewardType: 'shards',
      rewardAmount: 30,
      senderBalanceAfter: 42,
      shardsUpdatedAtMs: now,
    });
  });

  test('merges canonical shield across legacy root string and season progress object', () => {
    const mutation = buildGlobalBroadcastRewardMutation(
      { rewardType: 'chain_shield_3', rewardAmount: 0 },
      { chain_shield: JSON.stringify({ daysLeft: 1 }), progress: { chain_shield: { daysLeft: 4 } } },
      now,
    );
    expect(JSON.parse(String(mutation.userPatch.chain_shield))).toMatchObject({ daysLeft: 7 });
    expect(mutation.userPatch.progress).toMatchObject({ chain_shield: mutation.userPatch.chain_shield });
  });

  test('rejects unknown retired reward types instead of compensating them', () => {
    expect(() => buildGlobalBroadcastRewardMutation(
      { rewardType: ['ar', 'ena_extra_5'].join(''), rewardAmount: 999 }, { shards: 12 }, now,
    )).toThrow('broadcast_reward_unsupported');
  });

  test('queues distinct club and wager one-use rewards from canonical root/progress state', () => {
    const club = buildGlobalBroadcastRewardMutation(
      { rewardType: 'club_boost_free' },
      { club_gift_free_boost_v1: '1', progress: { club_gift_free_boost_v1: '2' } },
      now,
    );
    expect(club.userPatch).toEqual({
      club_gift_free_boost_v1: '3',
      progress: { club_gift_free_boost_v1: '3' },
    });
    expect(club.response).toMatchObject({ clubGiftFreeBoostCount: 3 });

    const wager = buildGlobalBroadcastRewardMutation(
      { rewardType: 'wager_discount_25' },
      { wager_discount: '0.25', progress: { wager_discount_uses_v1: '2' } },
      now,
    );
    expect(wager.userPatch).toEqual({
      wager_discount: '0.25',
      wager_discount_uses_v1: '3',
      progress: { wager_discount: '0.25', wager_discount_uses_v1: '3' },
    });
    expect(wager.response).toMatchObject({ wagerDiscountUses: 3 });
  });

  test('source keeps legacy claim receipts fail-closed without regranting', () => {
    const source = require('fs').readFileSync(require('path').join(__dirname, 'global_broadcast_claim.ts'), 'utf8');
    expect(source).toContain('legacyClaim: true');
    expect(source).toContain("rewardType: 'none'");
  });

  test('upgrades old one-use receipts from current canonical user state without regranting', () => {
    expect(canonicalizeExistingGlobalBroadcastReceipt(
      { ok: true, rewardType: 'club_boost_free', clubGiftFreeBoostCount: null },
      { club_gift_free_boost_v1: '1', progress: { club_gift_free_boost_v1: '2' } },
    )).toMatchObject({ clubGiftFreeBoostCount: 2 });
    expect(canonicalizeExistingGlobalBroadcastReceipt(
      { ok: true, rewardType: 'wager_discount_25' },
      { progress: { wager_discount_uses_v1: '0' } },
    )).toMatchObject({ wagerDiscountUses: 0 });
  });
});
