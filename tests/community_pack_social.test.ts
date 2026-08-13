/**
 * Cards 2.1 §2 — соц-слой наборов сообщества:
 *   • идемпотентность лайка (один пользователь — один лайк, повтор снимает);
 *   • дедупликация счётчика добавлений (повторное добавление не увеличивает `addedCount`);
 *   • сортировка каталога: лайки ↓ → добавления ↓ → свежесть;
 *   • суммарные лайки автора для карточки пользователя.
 */
import { readFileSync } from 'fs';
import path from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  COMMUNITY_PACK_ADDS_SUBCOLLECTION,
  COMMUNITY_PACK_LIKES_SUBCOLLECTION,
  addToLibraryOptimistic,
  applyPackAdd,
  applyPackLike,
  comparePacksBySocial,
  mergeServerCounts,
  readPackSocialCounts,
  sortPacksBySocial,
  sumAuthorActivityLikes,
  toggleLikeOptimistic,
  topLikedPackIds,
  type PackSocialMembershipKind,
  type PackSocialSnapshot,
  type PackSocialTx,
} from '../app/community_packs/packSocial';
import {
  loadLikedCommunityPackIds,
  markCommunityPackAddCounted,
  setCommunityPackLikedLocally,
} from '../app/community_packs/packSocialStorage';

const asyncStorageMock = AsyncStorage as unknown as { __reset: () => void };

/** In-memory реализация контракта хранилища — та же семантика, что у Firestore-транзакции. */
function memoryTx() {
  const members = new Set<string>();
  const counters: Record<string, number> = {};
  const key = (kind: PackSocialMembershipKind, packId: string, userId: string) =>
    `${packId}/${kind === 'like' ? COMMUNITY_PACK_LIKES_SUBCOLLECTION : COMMUNITY_PACK_ADDS_SUBCOLLECTION}/${userId}`;

  const tx: PackSocialTx = {
    async hasMembership(kind, packId, userId) {
      return members.has(key(kind, packId, userId));
    },
    async setMembership(kind, packId, userId) {
      members.add(key(kind, packId, userId));
    },
    async deleteMembership(kind, packId, userId) {
      members.delete(key(kind, packId, userId));
    },
    async bumpCounter(field, packId, delta) {
      counters[`${packId}.${field}`] = (counters[`${packId}.${field}`] ?? 0) + delta;
    },
  };
  return {
    tx,
    likes: (packId: string) => counters[`${packId}.likesCount`] ?? 0,
    added: (packId: string) => counters[`${packId}.addedCount`] ?? 0,
    memberCount: () => members.size,
  };
}

describe('лайк набора идемпотентен', () => {
  test('повторный лайк тем же пользователем не увеличивает счётчик', async () => {
    const m = memoryTx();
    const first = await applyPackLike(m.tx, 'p1', 'u1', true);
    const second = await applyPackLike(m.tx, 'p1', 'u1', true);

    expect(first).toEqual({ changed: true, delta: 1 });
    expect(second).toEqual({ changed: false, delta: 0 });
    expect(m.likes('p1')).toBe(1);
  });

  test('повторное нажатие снимает лайк, третье — снова ставит', async () => {
    const m = memoryTx();
    await applyPackLike(m.tx, 'p1', 'u1', true);
    const off = await applyPackLike(m.tx, 'p1', 'u1', false);
    expect(off).toEqual({ changed: true, delta: -1 });
    expect(m.likes('p1')).toBe(0);

    await applyPackLike(m.tx, 'p1', 'u1', true);
    expect(m.likes('p1')).toBe(1);
  });

  test('снятие лайка без лайка ничего не меняет', async () => {
    const m = memoryTx();
    const res = await applyPackLike(m.tx, 'p1', 'u1', false);
    expect(res).toEqual({ changed: false, delta: 0 });
    expect(m.likes('p1')).toBe(0);
  });

  test('разные пользователи дают по одному лайку каждый', async () => {
    const m = memoryTx();
    await applyPackLike(m.tx, 'p1', 'u1', true);
    await applyPackLike(m.tx, 'p1', 'u2', true);
    await applyPackLike(m.tx, 'p1', 'u2', true);
    expect(m.likes('p1')).toBe(2);
    expect(m.memberCount()).toBe(2);
  });

  test('оптимистичное состояние лайка не уходит ниже нуля', () => {
    const base: PackSocialSnapshot = { likesCount: 0, addedCount: 0, liked: true, added: false };
    expect(toggleLikeOptimistic(base)).toEqual({ likesCount: 0, addedCount: 0, liked: false, added: false });
  });
});

describe('счётчик добавлений дедуплицируется по пользователю', () => {
  test('повторное добавление тем же пользователем не увеличивает addedCount', async () => {
    const m = memoryTx();
    const first = await applyPackAdd(m.tx, 'p1', 'u1');
    const second = await applyPackAdd(m.tx, 'p1', 'u1');

    expect(first).toEqual({ changed: true, delta: 1 });
    expect(second).toEqual({ changed: false, delta: 0 });
    expect(m.added('p1')).toBe(1);
  });

  test('разные пользователи увеличивают счётчик каждый по разу', async () => {
    const m = memoryTx();
    await applyPackAdd(m.tx, 'p1', 'u1');
    await applyPackAdd(m.tx, 'p1', 'u2');
    await applyPackAdd(m.tx, 'p1', 'u1');
    expect(m.added('p1')).toBe(2);
  });

  test('оптимистичное добавление считает пользователя один раз', () => {
    const base: PackSocialSnapshot = { likesCount: 4, addedCount: 7, liked: false, added: false };
    const once = addToLibraryOptimistic(base);
    const twice = addToLibraryOptimistic(once);
    expect(once.addedCount).toBe(8);
    expect(once.added).toBe(true);
    expect(twice).toEqual(once);
  });

  test('локальная отметка «уже посчитан» срабатывает один раз', async () => {
    asyncStorageMock.__reset();
    expect(await markCommunityPackAddCounted('p1')).toBe(true);
    expect(await markCommunityPackAddCounted('p1')).toBe(false);
    expect(await markCommunityPackAddCounted('p2')).toBe(true);
  });

  test('локальный флаг лайка переключается и не дублируется', async () => {
    asyncStorageMock.__reset();
    expect(await setCommunityPackLikedLocally('p1', true)).toBe(true);
    expect(await setCommunityPackLikedLocally('p1', true)).toBe(false);
    expect(await loadLikedCommunityPackIds()).toEqual(['p1']);
    expect(await setCommunityPackLikedLocally('p1', false)).toBe(true);
    expect(await loadLikedCommunityPackIds()).toEqual([]);
  });
});

describe('сортировка каталога по лайкам', () => {
  const packs = [
    { id: 'fresh_no_likes', likesCount: 0, addedCount: 0, updatedAt: '2026-08-10T00:00:00.000Z' },
    { id: 'top', likesCount: 12, addedCount: 3, updatedAt: '2026-01-01T00:00:00.000Z' },
    { id: 'mid_more_adds', likesCount: 5, addedCount: 40, updatedAt: '2026-02-01T00:00:00.000Z' },
    { id: 'mid_less_adds', likesCount: 5, addedCount: 2, updatedAt: '2026-07-01T00:00:00.000Z' },
  ];

  test('лайки ↓, затем добавления ↓, затем свежесть', () => {
    expect(sortPacksBySocial(packs).map((p) => p.id)).toEqual([
      'top',
      'mid_more_adds',
      'mid_less_adds',
      'fresh_no_likes',
    ]);
  });

  test('при равных лайках и добавлениях выигрывает свежий', () => {
    const a = { id: 'a', likesCount: 2, addedCount: 2, updatedAt: '2026-01-01T00:00:00.000Z' };
    const b = { id: 'b', likesCount: 2, addedCount: 2, updatedAt: '2026-06-01T00:00:00.000Z' };
    expect(comparePacksBySocial(a, b)).toBeGreaterThan(0);
    expect(sortPacksBySocial([a, b]).map((p) => p.id)).toEqual(['b', 'a']);
  });

  test('отсутствующие счётчики читаются как ноль и не ломают сортировку', () => {
    const legacy = [
      { id: 'legacy', updatedAt: '2026-05-01T00:00:00.000Z' },
      { id: 'liked', likesCount: 1, updatedAt: '2026-01-01T00:00:00.000Z' },
    ];
    expect(sortPacksBySocial(legacy).map((p) => p.id)).toEqual(['liked', 'legacy']);
  });

  test('бейдж «в топе» получают только заметно залайканные наборы', () => {
    expect(topLikedPackIds(packs)).toEqual(['top', 'mid_more_adds', 'mid_less_adds']);
    expect(topLikedPackIds(packs, { minLikes: 6 })).toEqual(['top']);
    expect(topLikedPackIds(packs, { maxCount: 1 })).toEqual(['top']);
    expect(topLikedPackIds([{ id: 'x', likesCount: 0, updatedAt: '2026-01-01T00:00:00.000Z' }])).toEqual([]);
  });
});

describe('чтение соц-полей документа набора', () => {
  test('битые/отсутствующие значения дают ноль, легаси-цена игнорируется', () => {
    expect(readPackSocialCounts({ likesCount: 3, addedCount: 9, priceShards: 10 })).toEqual({
      likesCount: 3,
      addedCount: 9,
    });
    expect(readPackSocialCounts({ likesCount: -5, addedCount: 'nope' })).toEqual({
      likesCount: 0,
      addedCount: 0,
    });
    expect(readPackSocialCounts(undefined)).toEqual({ likesCount: 0, addedCount: 0 });
  });

  test('серверные счётчики не затирают локальный оптимистичный минимум', () => {
    const local: PackSocialSnapshot = { likesCount: 1, addedCount: 1, liked: true, added: true };
    expect(mergeServerCounts(local, { likesCount: 0, addedCount: 0 })).toEqual({
      likesCount: 1,
      addedCount: 1,
      liked: true,
      added: true,
    });
    expect(mergeServerCounts(local, { likesCount: 42, addedCount: 7 })).toEqual({
      likesCount: 42,
      addedCount: 7,
      liked: true,
      added: true,
    });
  });
});

describe('суммарные лайки автора', () => {
  const packs = [
    { authorStableId: 'author_1', likesCount: 4 },
    { authorStableId: 'author_1', likesCount: 6 },
    { authorStableId: 'author_2', likesCount: 100 },
    { authorStableId: 'author_1' },
  ];

  test('складываются только наборы этого автора', () => {
    expect(sumAuthorActivityLikes(packs, 'author_1')).toBe(10);
    expect(sumAuthorActivityLikes(packs, 'author_2')).toBe(100);
    expect(sumAuthorActivityLikes(packs, 'unknown')).toBe(0);
    expect(sumAuthorActivityLikes(packs, '')).toBe(0);
  });
});

describe('firestore.rules для соц-счётчиков', () => {
  const rules = readFileSync(path.join(process.cwd(), 'firestore.rules'), 'utf8');

  test('клиенту разрешены только likesCount / addedCount на документе набора', () => {
    expect(rules).toContain("hasOnly(['likesCount', 'addedCount'])");
    expect(rules).toMatch(/match \/community_packs\/\{packId\} \{[\s\S]*?allow create, delete: if false;/);
  });

  test('есть пути «кто лайкнул» и «кто добавил»', () => {
    expect(rules).toContain(`match /${COMMUNITY_PACK_LIKES_SUBCOLLECTION}/{likeUserId} {`);
    expect(rules).toContain(`match /${COMMUNITY_PACK_ADDS_SUBCOLLECTION}/{addUserId} {`);
  });
});
