import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __cloudSyncTestHooks,
  isServerOwnedProgressKey,
  SERVER_OWNED_PROGRESS_KEYS,
  SYNC_KEYS,
} from '../app/cloud_sync';

const {
  mergeOwnedRestoreValue,
  mergeSeasonCosmeticsRestoreValue,
  isOwnedUnionRestoreKey,
  mergeLessonRestoreValue,
  buildGiftEntitlementStickyPairs,
} = __cloudSyncTestHooks;

// K2 (UX_PROBLEMS_AUDIT_2026-07-04): в ветке restore «облако победило» (арбитр — XP)
// owned/purchased-ключи слепо перезаписывались облаком. Офлайн-покупка (пак флешкарт,
// аура, аватар, карточка Сокровищницы), не успевшая доехать до облака, исчезала.
// Фикс: владение строго аддитивно → union вместо перезаписи.

describe('K2 owned/purchased union restore (offline purchases survive cloud-wins)', () => {
  describe('server-owned lesson unlocks', () => {
    it('restores but never uploads the exact English unlocked_lessons key', () => {
      expect(SERVER_OWNED_PROGRESS_KEYS.has('unlocked_lessons')).toBe(true);
      expect(isServerOwnedProgressKey('unlocked_lessons')).toBe(true);
      expect(SYNC_KEYS).toContain('unlocked_lessons');

      const outboundPatch = Object.fromEntries(
        Object.entries({ unlocked_lessons: '[1,2,3]', user_name: 'Ada' })
          .filter(([key]) => !isServerOwnedProgressKey(key)),
      );
      expect(outboundPatch).toEqual({ user_name: 'Ada' });
    });
  });

  describe('server-owned gift perks restore', () => {
    it('keeps gift perks restoreable while excluding them from every outbound progress patch', () => {
      const localProgress = {
        user_name: 'Ada',
        chain_shield: JSON.stringify({ daysLeft: 2 }),
        gift_xp_multiplier: JSON.stringify({ multiplier: 2, expiresAt: Date.now() + 60_000 }),
        club_gift_free_boost_v1: '9',
      };
      const outboundPatch = Object.fromEntries(
        Object.entries(localProgress).filter(([key]) => !isServerOwnedProgressKey(key)),
      );

      expect(SERVER_OWNED_PROGRESS_KEYS.has('chain_shield')).toBe(true);
      expect(SERVER_OWNED_PROGRESS_KEYS.has('gift_xp_multiplier')).toBe(true);
      expect(SERVER_OWNED_PROGRESS_KEYS.has('club_gift_free_boost_v1')).toBe(true);
      expect(outboundPatch).toEqual({ user_name: 'Ada' });
      expect(SYNC_KEYS).toEqual(expect.arrayContaining(['chain_shield', 'gift_xp_multiplier', 'club_gift_free_boost_v1']));
    });

    it('restores root-only legacy perks from a full user document instead of deleting them', async () => {
      const shield = JSON.stringify({ daysLeft: 2, grantedAt: '2026-08-01' });
      const boost = JSON.stringify({ multiplier: 1.5, expiresAt: Date.now() + 15 * 60_000 });
      await AsyncStorage.multiSet([
        ['chain_shield', JSON.stringify({ daysLeft: 5 })],
        ['gift_xp_multiplier', JSON.stringify({ multiplier: 2, expiresAt: Date.now() + 120_000 })],
      ]);

      await expect(__cloudSyncTestHooks.applyRestoreFromUserDoc({
        exists: true,
        data: () => ({
          chain_shield: shield,
          gift_xp_multiplier: boost,
          progress: { user_total_xp: '0', streak_count: '0' },
        }),
      })).resolves.toBe(true);

      await expect(AsyncStorage.getItem('chain_shield')).resolves.toBe(shield);
      await expect(AsyncStorage.getItem('gift_xp_multiplier')).resolves.toBe(boost);
    });

    it('applies the exact canonical cloud value even when it is lower than local state', async () => {
      const shield = JSON.stringify({ daysLeft: 2 });
      const boost = JSON.stringify({ multiplier: 2, expiresAt: Date.now() + 60_000 });
      await expect(buildGiftEntitlementStickyPairs({
        chain_shield: shield,
        gift_xp_multiplier: boost,
      })).resolves.toEqual({
        pairs: [['chain_shield', shield], ['gift_xp_multiplier', boost]],
        removeKeys: ['club_gift_free_boost_v1'],
      });
    });

    it('removes stale local perks when canonical cloud state is absent, zero or expired', async () => {
      await expect(buildGiftEntitlementStickyPairs({
        chain_shield: JSON.stringify({ daysLeft: 0 }),
        gift_xp_multiplier: JSON.stringify({ multiplier: 2, expiresAt: Date.now() - 1 }),
      })).resolves.toEqual({
        pairs: [],
        removeKeys: ['chain_shield', 'gift_xp_multiplier', 'club_gift_free_boost_v1'],
      });
    });

    it('removes a stale local club voucher after another device consumes canonical 1 to 0', async () => {
      await AsyncStorage.setItem('club_gift_free_boost_v1', '1');

      await expect(__cloudSyncTestHooks.applyRestoreFromUserDoc({
        exists: true,
        data: () => ({
          club_gift_free_boost_v1: '0',
          progress: {
            user_total_xp: '0',
            streak_count: '0',
            club_gift_free_boost_v1: '0',
          },
        }),
      })).resolves.toBe(true);

      await expect(AsyncStorage.getItem('club_gift_free_boost_v1')).resolves.toBeNull();
    });

    it('hydrates the exact canonical max(root, progress) club voucher count over stale local zero', async () => {
      await AsyncStorage.setItem('club_gift_free_boost_v1', '0');

      await expect(__cloudSyncTestHooks.applyRestoreFromUserDoc({
        exists: true,
        data: () => ({
          club_gift_free_boost_v1: '2',
          progress: {
            user_total_xp: '0',
            streak_count: '0',
            club_gift_free_boost_v1: '4',
          },
        }),
      })).resolves.toBe(true);

      await expect(AsyncStorage.getItem('club_gift_free_boost_v1')).resolves.toBe('4');
    });
  });

  describe('season cosmetics restore', () => {
    it('includes permanent season cosmetics in cloud sync', () => {
      expect(SYNC_KEYS).toContain('season_cosmetics_v1');
    });

    it('unions every permanent cosmetic and keeps the strongest scalar state', () => {
      const cloud = JSON.stringify({
        frames: ['season1_card_frame'],
        nickColors: ['#57C8DE'],
        activeNickColor: '#57C8DE',
        nickShimmer: false,
        titles: ['Сезон 1'],
        auraStages: [1, 3],
        secretAuras: [],
        customAvatarGrants: 1,
      });
      const local = JSON.stringify({
        frames: ['offline-frame'],
        nickColors: ['#FF00FF'],
        activeNickColor: '#FF00FF',
        nickShimmer: true,
        titles: ['Финал сезона 1'],
        auraStages: [2, 4],
        secretAuras: ['purple_vortex'],
        customAvatarGrants: 3,
      });
      const merged = JSON.parse(mergeSeasonCosmeticsRestoreValue(cloud, local));

      expect(new Set(merged.frames)).toEqual(new Set(['season1_card_frame', 'offline-frame']));
      expect(new Set(merged.nickColors)).toEqual(new Set(['#57C8DE', '#FF00FF']));
      expect(merged.activeNickColor).toBe('#FF00FF');
      expect(merged.nickShimmer).toBe(true);
      expect(new Set(merged.titles)).toEqual(new Set(['Сезон 1', 'Финал сезона 1']));
      expect(merged.auraStages).toEqual([1, 2, 3, 4]);
      expect(merged.secretAuras).toEqual(['purple_vortex']);
      expect(merged.customAvatarGrants).toBe(3);
    });

    it('routes season cosmetics through the actual restore merge call site', () => {
      const cloud = JSON.stringify({ frames: ['cloud'], auraStages: [1] });
      const local = JSON.stringify({ frames: ['local'], auraStages: [4] });
      const merged = JSON.parse(mergeLessonRestoreValue('season_cosmetics_v1', cloud, local));
      expect(new Set(merged.frames)).toEqual(new Set(['cloud', 'local']));
      expect(merged.auraStages).toEqual([1, 4]);
    });
  });

  describe('isOwnedUnionRestoreKey', () => {
    it('recognizes base owned keys', () => {
      expect(isOwnedUnionRestoreKey('avatar_aura_owned_v1')).toBe(true);
      expect(isOwnedUnionRestoreKey('custom_avatar_owned_v1')).toBe(true);
      expect(isOwnedUnionRestoreKey('collectibles_owned_v1')).toBe(true);
      expect(isOwnedUnionRestoreKey('flashcards_owned_packs_v1')).toBe(true);
      expect(isOwnedUnionRestoreKey('community_owned_pack_ids_v1')).toBe(true);
      expect(isOwnedUnionRestoreKey('flashcards_market_dev_owned_v1')).toBe(true);
      expect(isOwnedUnionRestoreKey('level_up_shown_levels_v1')).toBe(true);
    });

    it('recognizes fr-scoped (target-scoped) owned keys', () => {
      // flashcardsOwnedPacksKey('fr') → flashcards_v2::fr::flashcards_owned_packs_v1
      expect(isOwnedUnionRestoreKey('flashcards_v2::fr::flashcards_owned_packs_v1')).toBe(true);
      expect(isOwnedUnionRestoreKey('flashcards_v2::fr::community_owned_pack_ids_v1')).toBe(true);
    });

    it('does not match unrelated keys', () => {
      expect(isOwnedUnionRestoreKey('user_total_xp')).toBe(false);
      expect(isOwnedUnionRestoreKey('lesson1_progress')).toBe(false);
      expect(isOwnedUnionRestoreKey('streak_count')).toBe(false);
    });
  });

  describe('mergeOwnedRestoreValue — array-shaped owned (flashcard/community packs)', () => {
    it('unions level-up modal history from local and cloud devices', () => {
      const merged = JSON.parse(mergeOwnedRestoreValue('[2,3]', '[3,4]'));
      expect(new Set(merged)).toEqual(new Set([2, 3, 4]));
    });
    it('keeps a locally-owned pack the cloud lacks (offline purchase survives)', () => {
      const cloud = JSON.stringify(['pack-a', 'pack-b']);
      const local = JSON.stringify(['pack-a', 'pack-offline']);
      const merged = JSON.parse(mergeOwnedRestoreValue(cloud, local));
      expect(new Set(merged)).toEqual(new Set(['pack-a', 'pack-b', 'pack-offline']));
    });

    it('pulls in a cloud pack bought on another device', () => {
      const cloud = JSON.stringify(['pack-a', 'pack-other-device']);
      const local = JSON.stringify(['pack-a']);
      const merged = JSON.parse(mergeOwnedRestoreValue(cloud, local));
      expect(new Set(merged)).toEqual(new Set(['pack-a', 'pack-other-device']));
    });

    it('returns cloud value verbatim when local is unreadable/absent', () => {
      const cloud = JSON.stringify(['pack-a']);
      expect(mergeOwnedRestoreValue(cloud, null)).toBe(cloud);
      expect(mergeOwnedRestoreValue(cloud, 'not-json')).toBe(cloud);
    });
  });

  describe('mergeOwnedRestoreValue — map-shaped owned (auras, avatars, collectibles)', () => {
    it('keeps a locally-owned aura the cloud lacks', () => {
      const cloud = JSON.stringify({ 'aura-a': true });
      const local = JSON.stringify({ 'aura-a': true, 'aura-offline': true });
      const merged = JSON.parse(mergeOwnedRestoreValue(cloud, local));
      expect(merged['aura-a']).toBe(true);
      expect(merged['aura-offline']).toBe(true);
    });

    it('keeps a locally-bought custom avatar (value = "gradient:logo")', () => {
      const cloud = JSON.stringify({ 'av-1': 'grad1:black' });
      const local = JSON.stringify({ 'av-offline': 'grad2:white' });
      const merged = JSON.parse(mergeOwnedRestoreValue(cloud, local));
      expect(merged['av-1']).toBe('grad1:black');
      expect(merged['av-offline']).toBe('grad2:white');
    });

    it('collectible counts never regress — max wins per id', () => {
      // collectibles_owned_v1 is {[id]: count}. Local caught 3 of a card offline,
      // cloud only knows 1 — the union must keep 3, not drop back to 1.
      const cloud = JSON.stringify({ 'card-x': 1, 'card-y': 2 });
      const local = JSON.stringify({ 'card-x': 3 });
      const merged = JSON.parse(mergeOwnedRestoreValue(cloud, local));
      expect(merged['card-x']).toBe(3);
      expect(merged['card-y']).toBe(2);
    });

    it('takes cloud value on non-numeric conflicts (cloud is arbiter)', () => {
      const cloud = JSON.stringify({ 'av-1': 'gradCloud:black' });
      const local = JSON.stringify({ 'av-1': 'gradLocal:white' });
      const merged = JSON.parse(mergeOwnedRestoreValue(cloud, local));
      expect(merged['av-1']).toBe('gradCloud:black');
    });

    it('keeps a local custom-avatar restyle when raw cloud has an older value', () => {
      const cloud = JSON.stringify({ 'av-1': 'gradCloud:black' });
      const local = JSON.stringify({ 'av-1': 'gradLocal:white' });
      const merged = JSON.parse(mergeOwnedRestoreValue(cloud, local, true));
      expect(merged['av-1']).toBe('gradLocal:white');
    });

    // Регресс аудита K2: cloud-wins ветка проверяла только !== null/undefined, но
    // пустую строку/битый JSON НЕ отсекала. При object-owned мапе это стирало
    // локальные покупки (аватары/ауры/счётчики) — массивы были защищены, мапы нет.
    it('keeps local map when cloud value is an empty string (offline purchase survives)', () => {
      const local = JSON.stringify({ 'av-offline': 'grad:white' });
      expect(mergeOwnedRestoreValue('', local)).toBe(local);
    });

    it('keeps local map when cloud value is corrupt JSON', () => {
      const local = JSON.stringify({ 'card-x': 3 });
      expect(mergeOwnedRestoreValue('{not json', local)).toBe(local);
    });

    it('keeps local map when cloud value is JSON null', () => {
      const local = JSON.stringify({ 'aura-offline': true });
      expect(mergeOwnedRestoreValue('null', local)).toBe(local);
    });
  });

  describe('routing through mergeLessonRestoreValue (the actual restore call site)', () => {
    it('owned array key routes to union merge', () => {
      const cloud = JSON.stringify(['pack-a']);
      const local = JSON.stringify(['pack-offline']);
      const merged = JSON.parse(
        mergeLessonRestoreValue('flashcards_owned_packs_v1', cloud, local),
      );
      expect(new Set(merged)).toEqual(new Set(['pack-a', 'pack-offline']));
    });

    it('fr-scoped owned key routes to union merge', () => {
      const cloud = JSON.stringify(['pack-a']);
      const local = JSON.stringify(['pack-offline']);
      const merged = JSON.parse(
        mergeLessonRestoreValue('flashcards_v2::fr::flashcards_owned_packs_v1', cloud, local),
      );
      expect(new Set(merged)).toEqual(new Set(['pack-a', 'pack-offline']));
    });

    it('routes custom-avatar restyle conflicts through local-authoritative merge', () => {
      const cloud = JSON.stringify({ 'av-1': 'gradCloud:black' });
      const local = JSON.stringify({ 'av-1': 'gradLocal:white' });
      const merged = JSON.parse(
        mergeLessonRestoreValue('custom_avatar_owned_v1', cloud, local),
      );
      expect(merged['av-1']).toBe('gradLocal:white');
    });
  });
});
