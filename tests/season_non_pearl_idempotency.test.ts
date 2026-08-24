import AsyncStorage from '@react-native-async-storage/async-storage';
import { ensureAccountGeneration } from '../app/account_generation';
import { applySeasonRewardLocal, SEASON_GOLDEN_LESSON_KEY } from '../app/season_reward_apply';
import {
  addSeasonPassGift,
  commitSeasonPassGiftEffect,
  loadSeasonPassGiftInventory,
} from '../app/season_pass_gift_inventory';
import { readVipSnapshotForAccount } from '../app/premium_vip_storage';

const storage = AsyncStorage as typeof AsyncStorage & { __reset?: () => void };

describe('Season Pass non-pearl gift idempotency', () => {
  beforeEach(async () => {
    storage.__reset?.();
    await AsyncStorage.clear();
    ensureAccountGeneration('season-effect-user');
  });

  // зачем (аудит 2026-08-24): тест сторожит реальный контракт «краш не должен
  // удваивать эффект», но раньше стоял на collection_magnet. Магнит переехал на
  // сервер (шанс дропа решает collectiblesClaimDrop, локальная запись не
  // работала вообще), поэтому контракт проверяем на turbo_regen — том же по
  // форме локальном расходнике со сроком в ключе boon_energy_override_v1.
  it('does not extend a timed consumable twice after a crash postponed physical inventory pruning', async () => {
    const gift = await addSeasonPassGift('season_1', 12, 'pass', 'turbo_regen');
    const nowMs = Date.now();
    // This is the exact durable commit boundary. Simulate process death before
    // applySeasonRewardLocal can perform its optional physical array prune.
    await commitSeasonPassGiftEffect(gift.id, async () => [[
      'boon_energy_override_v1',
      JSON.stringify({ expiresAt: nowMs + 86_400_000, recoveryMs: 60_000 }),
    ]]);
    const first = JSON.parse(String(await AsyncStorage.getItem('boon_energy_override_v1')));

    await expect(applySeasonRewardLocal({ kind: 'turbo_regen' }, gift.id))
      .resolves.toEqual({ ok: true });
    const replay = JSON.parse(String(await AsyncStorage.getItem('boon_energy_override_v1')));

    expect(replay.expiresAt).toBe(first.expiresAt);
    await expect(loadSeasonPassGiftInventory()).resolves.toEqual([]);
  });

  it('increments golden lesson, XP bank and friend shield once per gift', async () => {
    const cases = [
      { id: 'season_1:20:free', reward: { kind: 'golden_lesson' } as const },
      { id: 'season_1:21:free', reward: { kind: 'xp_bank', amount: 300 } as const },
      { id: 'season_1:22:free', reward: { kind: 'friend_shield' } as const },
    ];
    for (const item of cases) {
      await applySeasonRewardLocal(item.reward, item.id);
      await applySeasonRewardLocal(item.reward, item.id);
    }

    expect(JSON.parse(String(await AsyncStorage.getItem(SEASON_GOLDEN_LESSON_KEY))).remaining).toBe(1);
    expect(JSON.parse(String(await AsyncStorage.getItem('gift_xp_bank_v1')))).toMatchObject({
      remaining: 300,
      grantedTotal: 300,
    });
    expect(JSON.parse(String(await AsyncStorage.getItem('chain_shield'))).daysLeft).toBe(1);
  });

  it('stacks Plus days once and keeps a non-pearl choice bound to its parent gift id', async () => {
    const plusGiftId = 'season_1:33:pass';
    await applySeasonRewardLocal({ kind: 'plus_days', amount: 3 }, plusGiftId);
    const firstUntil = Number((await readVipSnapshotForAccount('season-effect-user'))?.vip_until);
    await applySeasonRewardLocal({ kind: 'plus_days', amount: 3 }, plusGiftId);
    const replayUntil = Number((await readVipSnapshotForAccount('season-effect-user'))?.vip_until);
    expect(replayUntil).toBe(firstUntil);

    const choiceGiftId = 'season_1:40:free';
    await applySeasonRewardLocal({ kind: 'xp_bank', amount: 600 }, choiceGiftId);
    await applySeasonRewardLocal({ kind: 'friend_shield' }, choiceGiftId);
    expect(JSON.parse(String(await AsyncStorage.getItem('gift_xp_bank_v1'))).remaining).toBe(600);
    expect(await AsyncStorage.getItem('chain_shield')).toBeNull();
  });
});
