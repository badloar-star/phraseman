import { __cloudSyncTestHooks } from '../app/cloud_sync';

const { mergeOwnedRestoreValue, isOwnedUnionRestoreKey, mergeLessonRestoreValue } = __cloudSyncTestHooks;

// K2 (UX_PROBLEMS_AUDIT_2026-07-04): в ветке restore «облако победило» (арбитр — XP)
// owned/purchased-ключи слепо перезаписывались облаком. Офлайн-покупка (пак флешкарт,
// аура, аватар, карточка Сокровищницы), не успевшая доехать до облака, исчезала.
// Фикс: владение строго аддитивно → union вместо перезаписи.

describe('K2 owned/purchased union restore (offline purchases survive cloud-wins)', () => {
  describe('isOwnedUnionRestoreKey', () => {
    it('recognizes base owned keys', () => {
      expect(isOwnedUnionRestoreKey('avatar_aura_owned_v1')).toBe(true);
      expect(isOwnedUnionRestoreKey('custom_avatar_owned_v1')).toBe(true);
      expect(isOwnedUnionRestoreKey('collectibles_owned_v1')).toBe(true);
      expect(isOwnedUnionRestoreKey('flashcards_owned_packs_v1')).toBe(true);
      expect(isOwnedUnionRestoreKey('community_owned_pack_ids_v1')).toBe(true);
      expect(isOwnedUnionRestoreKey('flashcards_market_dev_owned_v1')).toBe(true);
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
  });
});
