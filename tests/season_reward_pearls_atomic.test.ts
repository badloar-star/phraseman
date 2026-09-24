import AsyncStorage from '@react-native-async-storage/async-storage';
import { ensureAccountGeneration } from '../app/account_generation';
import { _resetStableIdCache, setStableId } from '../app/stable_id';
import {
  addSeasonPassGift,
  loadSeasonPassGiftInventory,
  seasonPassGiftUseMarkerStorageKey,
} from '../app/season_pass_gift_inventory';
import { applySeasonRewardLocal } from '../app/season_reward_apply';
import { getShardsBalance } from '../app/shards_system';

const storage = AsyncStorage as typeof AsyncStorage & { __reset?: () => void };

// зачем (PM-058, владелец: «удалить выдачу жемчуга за любые действия»):
// прежний файл сторожил, что клейм награды сезонного пропуска РЕАЛЬНО
// начисляет жемчуг на баланс — это и есть отменённое правило. Тест
// переписан: клейм по-прежнему закрывает подарок (маркер «использован»,
// подарок уходит из инвентаря, повтор идемпотентен), но баланс жемчуга
// больше не растёт. Сам сезонный пропуск (удаление/миграция — D53) эта
// задача не трогает.
describe('Season Pass pearl reward — free grant stopped (PM-058)', () => {
  beforeEach(async () => {
    storage.__reset?.();
    _resetStableIdCache();
    await setStableId('season-pearl-user');
    ensureAccountGeneration('season-pearl-user');
  });

  it('closes the gift without crediting shards, and replay stays a no-op', async () => {
    const gift = await addSeasonPassGift('season_1', 11, 'pass', 'pearls', 8);
    const before = await getShardsBalance();

    await expect(applySeasonRewardLocal({ kind: 'pearls', amount: 8 }, gift.id))
      .resolves.toEqual({ ok: true });
    await expect(getShardsBalance()).resolves.toBe(before);
    await expect(AsyncStorage.getItem(seasonPassGiftUseMarkerStorageKey(gift.id))).resolves.toBe('1');
    await expect(loadSeasonPassGiftInventory()).resolves.toEqual([]);

    await expect(applySeasonRewardLocal({ kind: 'pearls', amount: 8 }, gift.id))
      .resolves.toEqual({ ok: true });
    await expect(getShardsBalance()).resolves.toBe(before);
  });

  it('closes a choice_3 pearl selection idempotently by the parent gift id, without crediting shards', async () => {
    const gift = await addSeasonPassGift('season_1', 13, 'free', 'choice_3');
    const before = await getShardsBalance();

    await applySeasonRewardLocal({ kind: 'pearls', amount: 15 }, gift.id);
    await applySeasonRewardLocal({ kind: 'pearls', amount: 15 }, gift.id);

    await expect(getShardsBalance()).resolves.toBe(before);
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

  it('refuses an unidentifiable pearl claim instead of closing a random gift', async () => {
    const before = await getShardsBalance();
    await expect(applySeasonRewardLocal({ kind: 'pearls', amount: 8 }))
      .resolves.toMatchObject({ ok: false });
    await expect(getShardsBalance()).resolves.toBe(before);
  });
});
