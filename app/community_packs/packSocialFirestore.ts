/**
 * Firestore-реализация соц-слоя наборов (Cards 2.1 §2): лайки и счётчик добавлений.
 *
 * Данные:
 *   community_packs/{packId}.likesCount / .addedCount   — денормализованные счётчики
 *   community_packs/{packId}/pack_likes/{userId}        — «кто лайкнул» (идемпотентность)
 *   community_packs/{packId}/pack_adds/{userId}         — «кто добавил» (дедупликация)
 *
 * Правила (`firestore.rules`) разрешают клиенту менять на документе набора ТОЛЬКО
 * `likesCount` / `addedCount` и только на ±1, всё остальное по-прежнему пишет Cloud Function.
 */
import firestore from '@react-native-firebase/firestore';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import { COMMUNITY_PACKS_COLLECTION } from './schema';
import {
  COMMUNITY_PACK_ADDS_SUBCOLLECTION,
  COMMUNITY_PACK_LIKES_SUBCOLLECTION,
  applyPackAdd,
  applyPackLike,
  readPackSocialCounts,
  type PackSocialCounts,
  type PackSocialMembership,
  type PackSocialMembershipKind,
  type PackSocialTx,
  type PackSocialWriteResult,
} from './packSocial';
import { DebugLogger } from '../debug-logger';

const NOOP_RESULT: PackSocialWriteResult = { changed: false, delta: 0 };

function socialEnabled(): boolean {
  return CLOUD_SYNC_ENABLED && !IS_EXPO_GO;
}

/**
 * ПРИЧИНА БАГА «лайк не ставится» (владелец, iPhone).
 *
 * `firestore.rules` пускает клиента к `likesCount` и к `pack_likes/{userId}` только
 * при `request.auth != null`. Анонимный вход поднимается в `cloud_sync` асинхронно и
 * на холодном старте может ещё не завершиться, а транзакция лайка шла БЕЗ ожидания
 * авторизации — Firestore отвечал `permission-denied`, ошибка глушилась `catch (e) {
      DebugLogger.error('packSocialFirestore:socialEnabled', e instanceof Error ? e : new Error(String(e)), 'warning');
    }`,
 * и лайк оставался только в AsyncStorage: цифра откатывалась при следующем чтении.
 *
 * Публикация и покупка набора уже давно ждут вход явно
 * (`publishLocalPack`, `purchaseCommunityPack.ensureFirebaseUserSignedInForCallable`) —
 * соц-слой теперь делает то же самое.
 */
async function ensureSocialAuth(): Promise<boolean> {
  if (!socialEnabled()) return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const auth = require('@react-native-firebase/auth').default;
    if (typeof auth !== 'function') return false;
    if (auth().currentUser) return true;
    await auth().signInAnonymously();
    return !!auth().currentUser;
  } catch {
    return false;
  }
}

function subcollectionFor(kind: PackSocialMembershipKind): string {
  return kind === 'like' ? COMMUNITY_PACK_LIKES_SUBCOLLECTION : COMMUNITY_PACK_ADDS_SUBCOLLECTION;
}

function membershipRef(kind: PackSocialMembershipKind, packId: string, userId: string) {
  return firestore()
    .collection(COMMUNITY_PACKS_COLLECTION)
    .doc(packId)
    .collection(subcollectionFor(kind))
    .doc(userId);
}

function packRef(packId: string) {
  return firestore().collection(COMMUNITY_PACKS_COLLECTION).doc(packId);
}

/** Транзакционный адаптер `PackSocialTx` поверх @react-native-firebase. */
function firestoreTx(tx: any): PackSocialTx {
  return {
    async hasMembership(kind, packId, userId) {
      const snap = await tx.get(membershipRef(kind, packId, userId));
      return !!snap?.exists;
    },
    async setMembership(kind, packId, userId) {
      tx.set(membershipRef(kind, packId, userId), {
        userId,
        packId,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
    },
    async deleteMembership(kind, packId, userId) {
      tx.delete(membershipRef(kind, packId, userId));
    },
    async bumpCounter(field, packId, delta) {
      tx.set(packRef(packId), { [field]: firestore.FieldValue.increment(delta) }, { merge: true });
    },
  };
}

/**
 * Поставить/снять лайк набора. Идемпотентно: один пользователь — один лайк.
 * Ошибки сети глушим — UI уже обновлён оптимистично.
 */
export async function setCommunityPackLikeRemote(
  packId: string,
  userId: string,
  nextLiked: boolean,
): Promise<PackSocialWriteResult> {
  if (!socialEnabled() || !packId || !userId) return NOOP_RESULT;
  /** Без авторизации правила отклонят и счётчик, и `pack_likes` — ждём вход. */
  if (!(await ensureSocialAuth())) return NOOP_RESULT;
  try {
    return await firestore().runTransaction(async (tx: any) =>
      applyPackLike(firestoreTx(tx), packId, userId, nextLiked),
    );
  } catch {
    return NOOP_RESULT;
  }
}

/**
 * Зарегистрировать «Добавить себе»: +1 к `addedCount` только при первом добавлении
 * этим пользователем (дедупликация через `pack_adds/{userId}`).
 */
export async function registerCommunityPackAddRemote(
  packId: string,
  userId: string,
): Promise<PackSocialWriteResult> {
  if (!socialEnabled() || !packId || !userId) return NOOP_RESULT;
  if (!(await ensureSocialAuth())) return NOOP_RESULT;
  try {
    return await firestore().runTransaction(async (tx: any) =>
      applyPackAdd(firestoreTx(tx), packId, userId),
    );
  } catch {
    return NOOP_RESULT;
  }
}

/** Счётчики набора с сервера (для экрана набора / обновления плитки). */
export async function fetchCommunityPackSocialCounts(packId: string): Promise<PackSocialCounts> {
  if (!socialEnabled() || !packId) return { likesCount: 0, addedCount: 0 };
  try {
    const snap = await packRef(packId).get();
    return readPackSocialCounts(snap?.data() as Record<string, unknown> | undefined);
  } catch {
    return { likesCount: 0, addedCount: 0 };
  }
}

/**
 * Счётчики + «что сервер знает про меня» одним заходом: нужно, чтобы UI мог
 * отличить «сервер уже посчитал мой лайк» от «моя +1 ещё в пути» и не откатывал
 * цифру (см. `mergeServerCounts`). `membership: null` — сведений нет (облако
 * выключено или запрос упал), тогда UI остаётся на оптимистичном минимуме.
 */
export type PackSocialServerState = {
  counts: PackSocialCounts;
  membership: PackSocialMembership | null;
};

export async function fetchCommunityPackSocialState(
  packId: string,
  userId: string | null,
): Promise<PackSocialServerState> {
  const empty: PackSocialServerState = { counts: { likesCount: 0, addedCount: 0 }, membership: null };
  if (!socialEnabled() || !packId) return empty;
  try {
    const [packSnap, likeSnap, addSnap] = await Promise.all([
      packRef(packId).get(),
      userId ? membershipRef('like', packId, userId).get() : Promise.resolve(null),
      userId ? membershipRef('add', packId, userId).get() : Promise.resolve(null),
    ]);
    const counts = readPackSocialCounts(packSnap?.data() as Record<string, unknown> | undefined);
    if (!userId) return { counts, membership: null };
    return {
      counts,
      membership: { liked: !!likeSnap?.exists, added: !!addSnap?.exists },
    };
  } catch {
    return empty;
  }
}

/** Лайкнул ли пользователь набор (сервер; локальный флаг — в `packSocialStorage`). */
export async function fetchCommunityPackLikedByUser(packId: string, userId: string): Promise<boolean> {
  if (!socialEnabled() || !packId || !userId) return false;
  try {
    const snap = await membershipRef('like', packId, userId).get();
    return !!snap?.exists;
  } catch {
    return false;
  }
}

/**
 * Суммарное число лайков активности автора — для карточки пользователя (Cards 2.1 §2.2).
 * Отдельного экрана профиля здесь нет: это запрос, который может дёрнуть любой UI.
 */
export async function fetchAuthorActivityLikes(authorStableId: string): Promise<number> {
  const author = String(authorStableId ?? '').trim();
  if (!socialEnabled() || !author) return 0;
  try {
    const snap = await firestore()
      .collection(COMMUNITY_PACKS_COLLECTION)
      .where('authorStableId', '==', author)
      .get();
    let total = 0;
    for (const doc of snap.docs) {
      total += readPackSocialCounts(doc.data() as Record<string, unknown>).likesCount;
    }
    return total;
  } catch {
    return 0;
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
