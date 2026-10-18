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
import { getDevCommunityPack, isDevCommunityLiked, isDevCommunityOwned, isDevCommunityPackId } from '../dev_cards_state';

/** зачем (съёмка R1): счётчики демо-набора — из его меты в памяти (лайк/добавление «этого телефона» учтены). */
function devCommunityCounts(packId: string): PackSocialCounts {
  const meta = getDevCommunityPack(packId)?.meta;
  const likes = Number(meta?.likesCount ?? 0) || 0;
  const added = Number(meta?.addedCount ?? 0) || 0;
  return { likesCount: likes + (isDevCommunityLiked(packId) ? 1 : 0), addedCount: added + (isDevCommunityOwned(packId) ? 1 : 0) };
}

/** Операция не дошла до сервера: `ok:false` запрещает ставить локальный флаг «уже учтено». */
const NOOP_RESULT: PackSocialWriteResult = { changed: false, delta: 0, ok: false };

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
  } catch (e) {
    DebugLogger.warn('packSocialFirestore:ensureSocialAuth', `[PACK-SOCIAL] вход для соцсчётчиков не поднялся → false: ${e instanceof Error ? e.message : String(e)}`);
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

/**
 * Транзакционный адаптер `PackSocialTx` поверх @react-native-firebase.
 *
 * зачем `update`, а не `set(..., {merge:true})` для счётчика (владелец
 * 17.09.2026, «комментарий не отправляется, permission-denied»): правила
 * `community_packs/{packId}` разрешают ТОЛЬКО `update`
 * (`allow create: if false`). `set` с merge Firestore классифицирует как
 * create-or-update, поэтому проверялось запрещённое `create`, условие
 * `communityPackSocialCountersOnly()` не проходило, и транзакция
 * отклонялась ЦЕЛИКОМ — вместе с записью `pack_adds` из `setMembership`.
 * Из-за этого документ `pack_adds/{stableId}` не создавался НИКОГДА, а
 * `packAddedByMe()` в правилах честно запрещал писать отклик. `update`
 * бьёт ровно в ту ветку правил, которая для него и написана.
 */
function firestoreTx(tx: any): PackSocialTx {
  return {
    async packExists(packId) {
      const snap = await tx.get(packRef(packId));
      return !!snap?.exists;
    },
    async hasMembership(kind, packId, userId) {
      const snap = await tx.get(membershipRef(kind, packId, userId));
      return !!snap?.exists;
    },
    async setMembership(kind, packId, userId) {
      // guard-ok: внутри runTransaction записи НЕ возвращают Promise (контракт
      // Firestore — атомарность даёт сама транзакция, отказ поднимется
      // исключением из runTransaction и логируется в вызывающей функции).
      // merge не нужен: документ членства создаётся целиком и других полей у
      // него нет — затирать нечего.
      tx.set(membershipRef(kind, packId, userId), { // guard-ok: транзакция, новый документ без чужих полей
        userId,
        packId,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
    },
    async deleteMembership(kind, packId, userId) {
      tx.delete(membershipRef(kind, packId, userId)); // guard-ok: транзакционная запись, не fire-and-forget
    },
    async bumpCounter(field, packId, delta) {
      // зачем update, а не set(merge) — см. докстринг firestoreTx выше.
      tx.update(packRef(packId), { [field]: firestore.FieldValue.increment(delta) }); // guard-ok: транзакционный increment одного поля
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
  // зачем (съёмка R1): лайк демо-набора не уходит в Firestore.
  if (isDevCommunityPackId(packId)) {
    console.warn(`[DEV-STATE] community: лайк без сети pack=${packId} liked=${nextLiked}`); // guard-ok: dev-ветка
    return { changed: true, delta: nextLiked ? 1 : -1, ok: true };
  }
  if (!socialEnabled() || !packId || !userId) {
    DebugLogger.warn('packSocialFirestore:like', `[PACK-SOCIAL] лайк пропущен: облако=${socialEnabled()} packId=${packId || '—'} userId=${userId ? 'есть' : 'нет'}`);
    // зачем (координатор 18.10): причина отказа различает «облака нет» (лайк остаётся локально) и «облако не приняло» (экран откатывает).
    return { ...NOOP_RESULT, reason: 'cloud_off' };
  }
  /** Без авторизации правила отклонят и счётчик, и `pack_likes` — ждём вход. */
  if (!(await ensureSocialAuth())) {
    DebugLogger.warn('packSocialFirestore:like', `[PACK-SOCIAL] лайк пропущен: вход не поднялся packId=${packId}`);
    return { ...NOOP_RESULT, reason: 'no_auth' };
  }
  const startedAt = Date.now();
  try {
    const res = await firestore().runTransaction(async (tx: any) =>
      applyPackLike(firestoreTx(tx), packId, userId, nextLiked),
    );
    return { ...res, ok: true };
  } catch (e) {
    // зачем логируем причину (правило проекта «сперва логи»): немой catch здесь
    // месяцами прятал permission-denied от транзакции — цифра лайка молча
    // откатывалась при следующем чтении, и никто не знал почему.
    const code = (e as { code?: string })?.code ?? 'unknown';
    DebugLogger.warn('packSocialFirestore:like', `[PACK-SOCIAL] лайк НЕ записан packId=${packId} код=${code} причина=${e instanceof Error ? e.message : String(e)} мсек=${Date.now() - startedAt}`);
    return { ...NOOP_RESULT, reason: 'write_failed' };
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
  if (isDevCommunityPackId(packId)) {
    console.warn(`[DEV-STATE] community: добавление без сети pack=${packId}`); // guard-ok: dev-ветка
    return { changed: true, delta: 1, ok: true };
  }
  if (!socialEnabled() || !packId || !userId) {
    DebugLogger.warn('packSocialFirestore:add', `[PACK-SOCIAL] регистрация добавления пропущена: облако=${socialEnabled()} packId=${packId || '—'} userId=${userId ? 'есть' : 'нет'}`);
    return NOOP_RESULT;
  }
  if (!(await ensureSocialAuth())) {
    DebugLogger.warn('packSocialFirestore:add', `[PACK-SOCIAL] регистрация добавления пропущена: вход не поднялся packId=${packId}`);
    return NOOP_RESULT;
  }
  const startedAt = Date.now();
  try {
    const res = await firestore().runTransaction(async (tx: any) =>
      applyPackAdd(firestoreTx(tx), packId, userId),
    );
    DebugLogger.warn('packSocialFirestore:add', `[PACK-SOCIAL] pack_adds записан packId=${packId} изменено=${res.changed} ok=${res.ok !== false} мсек=${Date.now() - startedAt}`);
    return { ...res, ok: res.ok !== false };
  } catch (e) {
    // зачем логируем причину (правило проекта «сперва логи»): именно этот немой
    // catch прятал permission-denied от транзакции — документ pack_adds не
    // создавался никогда, а отклик под набором получал отказ без объяснения.
    const code = (e as { code?: string })?.code ?? 'unknown';
    DebugLogger.warn('packSocialFirestore:add', `[PACK-SOCIAL] pack_adds НЕ записан packId=${packId} код=${code} причина=${e instanceof Error ? e.message : String(e)} мсек=${Date.now() - startedAt}`);
    return NOOP_RESULT;
  }
}

/** Счётчики набора с сервера (для экрана набора / обновления плитки). */
export async function fetchCommunityPackSocialCounts(packId: string): Promise<PackSocialCounts> {
  if (isDevCommunityPackId(packId)) return devCommunityCounts(packId);
  if (!socialEnabled() || !packId) return { likesCount: 0, addedCount: 0 };
  try {
    const snap = await packRef(packId).get();
    return readPackSocialCounts(snap?.data() as Record<string, unknown> | undefined);
  } catch (e) {
    DebugLogger.warn('packSocialFirestore:counts', `[PACK-SOCIAL] счётчики набора не прочитаны → нули: ${e instanceof Error ? e.message : String(e)}`);
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
  // зачем (съёмка R1): счётчики демо-набора — из его меты, «я» — из памяти; сети нет.
  if (isDevCommunityPackId(packId)) {
    return { counts: devCommunityCounts(packId), membership: { liked: isDevCommunityLiked(packId), added: isDevCommunityOwned(packId) } };
  }
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
  } catch (e) {
    DebugLogger.warn('packSocialFirestore:state', `[PACK-SOCIAL] состояние набора не прочитано → пусто: ${e instanceof Error ? e.message : String(e)}`);
    return empty;
  }
}

/** Лайкнул ли пользователь набор (сервер; локальный флаг — в `packSocialStorage`). */
export async function fetchCommunityPackLikedByUser(packId: string, userId: string): Promise<boolean> {
  if (isDevCommunityPackId(packId)) return isDevCommunityLiked(packId);
  if (!socialEnabled() || !packId || !userId) return false;
  try {
    const snap = await membershipRef('like', packId, userId).get();
    return !!snap?.exists;
  } catch (e) {
    DebugLogger.warn('packSocialFirestore:likedByUser', `[PACK-SOCIAL] свой лайк не прочитан → false: ${e instanceof Error ? e.message : String(e)}`);
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
  } catch (e) {
    DebugLogger.warn('packSocialFirestore:authorLikes', `[PACK-SOCIAL] лайки автора не прочитаны → 0: ${e instanceof Error ? e.message : String(e)}`);
    return 0;
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
