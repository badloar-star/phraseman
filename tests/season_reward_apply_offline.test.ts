import AsyncStorage from '@react-native-async-storage/async-storage';
import fs from 'fs';
import path from 'path';

import { beginAccountGeneration } from '../app/account_generation';
import { readVipSnapshotForAccount } from '../app/premium_vip_storage';
import { applySeasonRewardLocal } from '../app/season_reward_apply';
import {
  addSeasonPassGift,
  loadSeasonPassGiftInventory,
  markSeasonPassGiftUsed,
} from '../app/season_pass_gift_inventory';

describe('season-pass rewards apply locally', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('collection magnet becomes active without a callable response', async () => {
    const result = await applySeasonRewardLocal({ kind: 'collection_magnet' });

    expect(result).toEqual({ ok: true });
    const stored = await AsyncStorage.getItem('season_collection_magnet_v1');
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!)).toEqual(expect.objectContaining({ multiplier: 2 }));
  });

  test('retired tournament ticket cannot recreate ticket state', async () => {
    const result = await applySeasonRewardLocal({ kind: 'tournament_ticket' });

    expect(result).toEqual({ ok: true });
    const stored = await AsyncStorage.getItem('season_tournament_ticket_v1');
    expect(stored).toBeNull();
  });

  test('Plus days create a local entitlement without a callable response', async () => {
    beginAccountGeneration('season-local-account');

    const result = await applySeasonRewardLocal({ kind: 'plus_days', amount: 3 });

    expect(result).toEqual({ ok: true });
    await expect(readVipSnapshotForAccount('season-local-account')).resolves.toEqual(expect.objectContaining({
      vip_active: 'true',
      vip_plan: 'season_pass',
    }));
  });

  test('a successfully applied gift is removed from the season inventory', async () => {
    const gift = await addSeasonPassGift('season_1', 11, 'pass', 'collection_magnet');

    await markSeasonPassGiftUsed(gift.id);

    await expect(loadSeasonPassGiftInventory()).resolves.toEqual([]);
  });

  test('two simultaneous claims do not overwrite each other in the local inventory', async () => {
    await Promise.all([
      addSeasonPassGift('season_1', 11, 'pass', 'collection_magnet'),
      addSeasonPassGift('season_1', 12, 'pass', 'tournament_ticket'),
    ]);

    const inventory = await loadSeasonPassGiftInventory();
    expect(inventory.map((item) => item.id).sort()).toEqual([
      'season_1:11:pass',
      'season_1:12:pass',
    ]);
    expect(inventory.find((item) => item.id === 'season_1:12:pass')).toEqual(
      expect.objectContaining({ kind: 'pearls', amount: 5 }),
    );
  });
});

describe('season-pass UI does not block an application on a callable', () => {
  const modalSource = fs.readFileSync(path.join(__dirname, '..', 'components', 'SeasonGiftModal.tsx'), 'utf8');
  const passSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'season_pass.tsx'), 'utf8');

  test('modal routes Plus and consumables through the local applier', () => {
    expect(modalSource).not.toContain('seasonRedeemConsumableOnServer');
    expect(modalSource).not.toContain('seasonSendFriendShieldOnServer');
    expect(modalSource).toContain("'plus_days'");
    expect(modalSource).toContain('applySeasonRewardLocal(target, giftId)');
  });

  test('claiming a reward does not fire a callable in the background', () => {
    expect(passSource).not.toContain('seasonClaimRewardOnServer');
  });

});
