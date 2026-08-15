/**
 * Регрессия по замечанию владельца после теста на iPhone: «лайк на набор
 * поставить не получается».
 *
 * Аудит пути лайка (кнопка → toggleCommunityPackLike → Firestore/локально →
 * счётчик в UI) нашёл ТРИ настоящих причины, и на каждую здесь есть тест:
 *
 *  1) «Добавить себе» писало владение БЕЗ `studyTarget` (всегда в легаси-ключ
 *     английской цели), а читают владение все экраны уже по текущей цели.
 *     На не-английской цели набор никогда не считался добавленным, и правило
 *     «лайк только после добавления» блокировало лайк навсегда.
 *  2) Firestore-транзакция лайка шла БЕЗ ожидания анонимного входа, хотя
 *     `firestore.rules` требует `request.auth != null`: сервер отвечал
 *     permission-denied, ошибка глушилась, лайк оставался только локальным.
 *  3) `mergeServerCounts` пересчитывал цифру как `max(server, 1)` и ТЕРЯЛ
 *     оптимистичную «+1» пользователя — счётчик откатывался при первом же
 *     перечитывании каталога.
 */
import { readFileSync } from 'fs';
import path from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../app/community_packs/packSocialFirestore', () => ({
  setCommunityPackLikeRemote: jest.fn(async () => ({ changed: true, delta: 1 })),
  registerCommunityPackAddRemote: jest.fn(async () => ({ changed: true, delta: 1 })),
}));
jest.mock('../app/user_id_policy', () => ({
  getCanonicalUserId: jest.fn(async () => 'stable-user-1'),
}));

import {
  addCommunityPackToLibrary,
  toggleCommunityPackLike,
} from '../app/community_packs/communityPackActions';
import { loadCommunityOwnedPackIds } from '../app/community_packs/communityOwnedStorage';
import { loadLikedCommunityPackIds } from '../app/community_packs/packSocialStorage';
import { mergeServerCounts, type PackSocialSnapshot } from '../app/community_packs/packSocial';
import { setCommunityPackLikeRemote } from '../app/community_packs/packSocialFirestore';
import type { FlashcardMarketPack } from '../app/flashcards/marketplace';

const asyncStorageMock = AsyncStorage as unknown as { __reset: () => void };
const likeRemote = setCommunityPackLikeRemote as unknown as jest.Mock;
const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), 'utf8');

const ugcPack = (over: Partial<FlashcardMarketPack> = {}): FlashcardMarketPack =>
  ({
    id: 'ugc_like_1',
    codeName: 'Code',
    titleRu: 'Набор',
    titleUk: 'Набір',
    titleEs: '',
    descriptionRu: '',
    descriptionUk: '',
    descriptionEs: '',
    category: 'slang',
    cardCount: 12,
    priceShards: 0,
    salesCount: 0,
    authorName: 'Community',
    isOfficial: false,
    isCommunityUgc: true,
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...over,
  }) as FlashcardMarketPack;

beforeEach(() => {
  asyncStorageMock.__reset();
  likeRemote.mockClear();
  likeRemote.mockImplementation(async () => ({ changed: true, delta: 1 }));
});

describe('лайк реально ставится и снимается', () => {
  test('первое нажатие ставит лайк локально И на сервере', async () => {
    const res = await toggleCommunityPackLike('ugc_like_1');
    expect(res).toEqual({ liked: true, changed: true, synced: true });
    expect(await loadLikedCommunityPackIds()).toEqual(['ugc_like_1']);
    expect(likeRemote).toHaveBeenCalledWith('ugc_like_1', 'stable-user-1', true);
  });

  test('повторное нажатие снимает лайк — и локально, и на сервере', async () => {
    await toggleCommunityPackLike('ugc_like_1');
    const off = await toggleCommunityPackLike('ugc_like_1');
    expect(off.liked).toBe(false);
    expect(await loadLikedCommunityPackIds()).toEqual([]);
    expect(likeRemote).toHaveBeenLastCalledWith('ugc_like_1', 'stable-user-1', false);
  });

  test('серверная запись ОЖИДАЕТСЯ: неудача видна вызывающему UI', async () => {
    likeRemote.mockImplementation(async () => ({ changed: false, delta: 0 }));
    const res = await toggleCommunityPackLike('ugc_like_1');
    /** Лайк уже записан локально и переживёт перезаход, но UI знает, что сервер не принял. */
    expect(res.changed).toBe(true);
    expect(res.synced).toBe(false);
    expect(await loadLikedCommunityPackIds()).toEqual(['ugc_like_1']);
  });

  test('пустой id ничего не делает', async () => {
    expect(await toggleCommunityPackLike('')).toEqual({ liked: false, changed: false });
    expect(likeRemote).not.toHaveBeenCalled();
  });
});

describe('причина 1: правило «лайк после добавления» видит факт добавления на любой цели', () => {
  test('«Добавить себе» пишет владение по переданной цели обучения', async () => {
    expect(await addCommunityPackToLibrary(ugcPack(), 'fr')).toBe('added');
    /** Раньше запись уходила в легаси-ключ английской цели — и набор «не был добавлен». */
    expect(await loadCommunityOwnedPackIds('fr')).toEqual(['ugc_like_1']);
    expect(await addCommunityPackToLibrary(ugcPack(), 'fr')).toBe('already_added');
  });

  test('цели не смешиваются: добавление на fr не появляется в en', async () => {
    await addCommunityPackToLibrary(ugcPack(), 'fr');
    expect(await loadCommunityOwnedPackIds('en')).toEqual([]);
  });

  test('английская цель работает как раньше', async () => {
    expect(await addCommunityPackToLibrary(ugcPack())).toBe('added');
    expect(await loadCommunityOwnedPackIds()).toEqual(['ugc_like_1']);
  });
});

describe('причина 3: оптимистичная «+1» не теряется при перечитывании', () => {
  const liked: PackSocialSnapshot = { likesCount: 6, addedCount: 3, liked: true, added: true };

  test('сервер ещё не посчитал мой лайк — цифра остаётся с моей +1', () => {
    const merged = mergeServerCounts(liked, { likesCount: 5, addedCount: 3 }, { liked: false, added: true });
    expect(merged.likesCount).toBe(6);
    expect(merged.liked).toBe(true);
  });

  test('сервер посчитал — дельта схлопывается, двойного счёта нет', () => {
    const merged = mergeServerCounts(liked, { likesCount: 6, addedCount: 3 }, { liked: true, added: true });
    expect(merged.likesCount).toBe(6);
  });

  test('снятие лайка тоже учитывается до синхронизации', () => {
    const unliked: PackSocialSnapshot = { likesCount: 5, addedCount: 3, liked: false, added: true };
    const merged = mergeServerCounts(unliked, { likesCount: 6, addedCount: 3 }, { liked: true, added: true });
    expect(merged.likesCount).toBe(5);
  });

  test('счётчик не уходит ниже нуля', () => {
    const unliked: PackSocialSnapshot = { likesCount: 0, addedCount: 0, liked: false, added: false };
    expect(mergeServerCounts(unliked, { likesCount: 0, addedCount: 0 }, { liked: true, added: false }).likesCount).toBe(0);
  });

  test('без сведений о членстве поведение прежнее (оптимистичный минимум)', () => {
    /** Легаси-ветка: сведений о членстве нет — держим ровно оптимистичный минимум. */
    expect(mergeServerCounts(liked, { likesCount: 0, addedCount: 0 }).likesCount).toBe(1);
    expect(mergeServerCounts(liked, { likesCount: 42, addedCount: 7 }).likesCount).toBe(42);
  });
});

describe('причина 2: соц-запись ждёт авторизацию (иначе правила отклоняют)', () => {
  const firestoreSrc = read(path.join('app', 'community_packs', 'packSocialFirestore.ts'));

  test('перед транзакцией лайка и добавления есть ожидание входа', () => {
    expect(firestoreSrc).toContain('async function ensureSocialAuth()');
    expect(firestoreSrc).toContain('signInAnonymously');
    const guards = firestoreSrc.match(/if \(!\(await ensureSocialAuth\(\)\)\) return NOOP_RESULT;/g) ?? [];
    expect(guards.length).toBe(2);
  });

  test('правила действительно требуют авторизацию на соц-счётчиках', () => {
    expect(read('firestore.rules')).toContain('request.auth != null');
  });
});

describe('UI лайка: оптимистичное состояние не перетирается фоновым чтением', () => {
  const bar = read(path.join('app', 'community_packs', 'CommunityPackSocialBar.tsx'));

  test('фоновая синхронизация отбрасывается, если было нажатие', () => {
    expect(bar).toContain('const opSeqRef = useRef(0)');
    expect(bar).toContain('opSeqRef.current !== seqAtStart');
  });

  test('счётчики сверяются с членством пользователя на сервере', () => {
    expect(bar).toContain('fetchCommunityPackSocialState');
    expect(bar).toContain('state.membership');
  });

  test('«Добавить себе» пишет владение по текущей цели обучения', () => {
    expect(bar).toContain('useStudyTarget');
    expect(bar).toContain('addCommunityPackToLibrary(pack, studyTarget)');
  });
});
