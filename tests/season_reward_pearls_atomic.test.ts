import AsyncStorage from '@react-native-async-storage/async-storage';
import { ensureAccountGeneration } from '../app/account_generation';
import { _resetStableIdCache, setStableId } from '../app/stable_id';
import {
  addSeasonPassGift,
  loadSeasonPassGiftInventory,
  seasonPassGiftUseMarkerStorageKey,
} from '../app/season_pass_gift_inventory';
import { applySeasonRewardLocal } from '../app/season_reward_apply';
import { commitShardCreditOperation, getShardsBalance } from '../app/shards_system';

const storage = AsyncStorage as typeof AsyncStorage & { __reset?: () => void };

describe('Season Pass pearl reward composite operation', () => {
  beforeEach(async () => {
    storage.__reset?.();
    _resetStableIdCache();
    await setStableId('season-pearl-user');
    ensureAccountGeneration('season-pearl-user');
  });

  it('accepts the marker-only season reward credit shape', async () => {
    const result = await commitShardCreditOperation({
      operationId: 'season-reward:marker-shape-0001',
      amount: 8,
      reason: 'season_pass_pearls',
      grant: { kind: 'season_pass_reward', subjectId: 'gift-shape-0001' },
      localWrites: [[seasonPassGiftUseMarkerStorageKey('gift-shape-0001'), '1']],
    });
    if (result.status === 'failed') throw new Error(result.reason);
    expect(result).toMatchObject({ status: 'applied' });
  });

  it('commits the credit and gift-use marker together and replays without a second credit', async () => {
    const gift = await addSeasonPassGift('season_1', 11, 'pass', 'pearls', 8);
    const before = await getShardsBalance();

    await expect(applySeasonRewardLocal({ kind: 'pearls', amount: 8 }, gift.id))
      .resolves.toEqual({ ok: true });
    await expect(getShardsBalance()).resolves.toBe(before + 8);
    await expect(AsyncStorage.getItem(seasonPassGiftUseMarkerStorageKey(gift.id))).resolves.toBe('1');
    await expect(loadSeasonPassGiftInventory()).resolves.toEqual([]);

    await expect(applySeasonRewardLocal({ kind: 'pearls', amount: 8 }, gift.id))
      .resolves.toEqual({ ok: true });
    await expect(getShardsBalance()).resolves.toBe(before + 8);
  });

  it('keeps a choice_3 pearl selection idempotent by the parent gift id', async () => {
    const gift = await addSeasonPassGift('season_1', 13, 'free', 'choice_3');
    const before = await getShardsBalance();

    await applySeasonRewardLocal({ kind: 'pearls', amount: 15 }, gift.id);
    await applySeasonRewardLocal({ kind: 'pearls', amount: 15 }, gift.id);

    await expect(getShardsBalance()).resolves.toBe(before + 15);
    await expect(loadSeasonPassGiftInventory()).resolves.toEqual([]);
  });

  it('does not erase a different gift added concurrently with the pearl claim', async () => {
    const claimed = await addSeasonPassGift('season_1', 11, 'pass', 'pearls', 8);
    await Promise.all([
      applySeasonRewardLocal({ kind: 'pearls', amount: 8 }, claimed.id),
      addSeasonPassGift('season_1', 12, 'pass', 'collection_magnet'),
    ]);

    await expect(loadSeasonPassGiftInventory()).resolves.toEqual([
      expect.objectContaining({ id: 'season_1:12:pass', kind: 'collection_magnet' }),
    ]);
  });

  it('refuses an unidentifiable pearl credit instead of creating a random operation', async () => {
    const before = await getShardsBalance();
    await expect(applySeasonRewardLocal({ kind: 'pearls', amount: 8 }))
      .resolves.toMatchObject({ ok: false });
    await expect(getShardsBalance()).resolves.toBe(before);
  });
});
