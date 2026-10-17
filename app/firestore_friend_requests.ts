import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { ensureAnonUser, ensureStableAuthLink, ensureStableAuthLinkForStableId, ensureStableAuthLinkForStableIdDetailed } from './cloud_sync';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuthUserId } from './user_id_policy';
import {
  FRIEND_REQUESTS_SENT_INDEX,
  FRIEND_REQUESTS_SENT_MARKER_ID,
} from '../shared/friend_requests_index_contract';
import { DebugLogger } from './debug-logger';
import { friendTag, logFriendAdd } from './friend_add_trace';
import { noteSwallowedHandler, noteSwallowedAs } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

// ── Types ──────────────────────────────────────────────────────────────────

export type SendRequestResult =
  | 'sent'
  | 'already_sent'
  | 'already_friends'
  | 'self'
  | 'not_found'
  // зачем (PM-162, Q-E2 координатора): сбой сети — не «что-то пошло не так», а «связь пропала».
  | 'network'
  | 'error';

export interface FriendEntry {
  uid: string;
  createdAt: number;
  displayName?: string;
}

export interface FriendRequestEntry {
  fromUid: string;
  fromName?: string;
  status: 'pending' | 'accepted';
  createdAt: number;
}

export const FRIENDS_REALTIME_REPLACEMENT_TTL_MS = 60_000;

type FriendsReadCache = {
  scopeKey: string;
  rows: FriendEntry[];
  expiresAt: number;
};

type IncomingRequestsReadCache = {
  scopeKey: string;
  rows: FriendRequestEntry[];
  expiresAt: number;
};

let friendReadCache: FriendsReadCache | null = null;
let incomingRequestsReadCache: IncomingRequestsReadCache | null = null;

// ── Firestore accessor (same pattern as firestore_friends.ts) ──────────────

const getFirestore = () => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default();
  } catch {
    return null;
  }
};

/** Текущий firebase auth uid (для удаления своего friend_auth_edges при разрыве дружбы). */
function getCurrentAuthUidForFriends(): string | null {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/auth').default().currentUser?.uid ?? null;
  } catch {
    return null;
  }
}

function logFriendsHealth(
  context: string,
  error: unknown,
  tags: Record<string, string | number | boolean | null | undefined> = {},
) {
  void import('./app_health')
    .then(({ logAppWarning }) =>
      logAppWarning(context, error, {
        feature: 'friends',
        screen: 'friends',
        writeToFirestore: true,
        tags,
      }),
    )
    .catch(noteSwallowedHandler('firestore_friend_requests:promise_1'));
}

function cleanFriendRequestDisplayName(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').slice(0, 40).trim();
}

async function readUserDisplayNameFromFirestore(
  db: NonNullable<ReturnType<typeof getFirestore>>,
  uid: string,
): Promise<string> {
  try {
    const snap = await db.collection('users').doc(uid).get();
    const data = snap.exists ? snap.data?.() ?? {} : {};
    const progress = data && typeof data.progress === 'object' && data.progress !== null
      ? data.progress as Record<string, unknown>
      : {};
    return cleanFriendRequestDisplayName(progress.user_name)
      || cleanFriendRequestDisplayName(data.displayName)
      || cleanFriendRequestDisplayName(data.name);
  } catch {
    return '';
  }
}

async function readMyFriendRequestDisplayName(
  myUid?: string,
  db?: NonNullable<ReturnType<typeof getFirestore>>,
): Promise<string> {
  try {
    const localName = cleanFriendRequestDisplayName(await AsyncStorage.getItem('user_name'));
    if (localName) return localName;
  } catch (e) {
      DebugLogger.error('firestore_friend_requests:localName', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  if (!myUid || !db) return '';
  return readUserDisplayNameFromFirestore(db, myUid);
}

async function ensureFriendsStableAuthLink(
  action: string,
  tags: Record<string, string | number | boolean | null | undefined> = {},
): Promise<boolean> {
  // зачем (аудит 2026-08-29): 144 записи «stable auth link unavailable» за две
  // недели — и НИ ОДНА не говорила, ПОЧЕМУ привязка не удалась. Правило
  // «сперва логи»: берём detailed-путь и пишем провал с настоящей причиной
  // (failure/source) и состоянием identity — иначе следующий круг диагностики
  // снова слепой.
  if (!(await import('./config')).CLOUD_SYNC_ENABLED) return true;
  const stableId = await ensureAnonUser().catch(noteSwallowedAs('firestore_friend_requests:promise_2', null));
  if (!stableId) {
    logFriendsHealth('friends:auth_link_failed', new Error('anon_user_unavailable'), {
      action, failure: 'anon_user_unavailable', ...tags,
    });
    return false;
  }
  const detailed = await ensureStableAuthLinkForStableIdDetailed(stableId).catch((e: unknown) => ({
    ok: false as const,
    failure: `threw:${String((e as Error)?.message ?? e).slice(0, 60)}`,
    source: 'exception',
    authUid: null,
  }));
  if (!detailed.ok) {
    logFriendsHealth('friends:auth_link_failed', new Error(String((detailed as { failure?: string }).failure ?? 'unknown')), {
      action,
      failure: String((detailed as { failure?: string }).failure ?? 'unknown'),
      source: String((detailed as { source?: string }).source ?? 'unknown'),
      hasAuthUid: Boolean((detailed as { authUid?: string | null }).authUid),
      ...tags,
    });
  }
  return detailed.ok;
}

export const FRIEND_REQUEST_VIEWER_AUTH_LINK_TIMEOUT_MS = 15_000;
export const FRIEND_REQUEST_VIEWER_AUTH_LINK_SUCCESS_TTL_MS = 60_000;

let friendRequestViewerAuthLinkInFlight: {
  scopeKey: string;
  promise: Promise<boolean>;
} | null = null;
let friendRequestViewerAuthLinkSuccess: {
  scopeKey: string;
  expiresAt: number;
} | null = null;

function friendRequestViewerAuthScopeKey(stableId: string): string {
  return `${stableId}:${String(getAuthUserId() ?? '').trim()}`;
}

function invalidateFriendReadCaches(stableId: string): void {
  const prefix = `${stableId}:`;
  if (friendReadCache?.scopeKey.startsWith(prefix)) friendReadCache = null;
  if (incomingRequestsReadCache?.scopeKey.startsWith(prefix)) incomingRequestsReadCache = null;
}

function prepareFriendRequestViewerAuthLink(stableId: string): Promise<boolean> {
  const scopeKey = friendRequestViewerAuthScopeKey(stableId);
  const now = Date.now();
  if (
    friendRequestViewerAuthLinkSuccess?.scopeKey === scopeKey
    && friendRequestViewerAuthLinkSuccess.expiresAt > now
  ) {
    return Promise.resolve(true);
  }
  // The cache holds one account/auth pair only. Entering another identity or
  // reaching the TTL immediately evicts the old success instead of leaking it.
  friendRequestViewerAuthLinkSuccess = null;

  if (friendRequestViewerAuthLinkInFlight?.scopeKey === scopeKey) {
    return friendRequestViewerAuthLinkInFlight.promise;
  }

  let sharedPromise!: Promise<boolean>;
  const bounded = new Promise<boolean>((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(ok);
    };

    timer = setTimeout(() => finish(false), FRIEND_REQUEST_VIEWER_AUTH_LINK_TIMEOUT_MS);
    void Promise.resolve()
      .then(() => ensureStableAuthLinkForStableId(stableId))
      .then(ok => finish(ok === true), () => finish(false));
  });

  sharedPromise = bounded
    .then(ok => {
      if (ok && friendRequestViewerAuthLinkInFlight?.promise === sharedPromise) {
        friendRequestViewerAuthLinkSuccess = {
          // Cache the identity pair that actually started this link. If Firebase
          // Auth changes while the callable is in flight, its late success must
          // not authorize listeners for the new auth UID.
          scopeKey,
          expiresAt: Date.now() + FRIEND_REQUEST_VIEWER_AUTH_LINK_SUCCESS_TTL_MS,
        };
      } else if (!ok) {
        logFriendsHealth('friends:auth_link_failed', new Error('stable auth link unavailable'), {
          action: 'ensure_friend_auth_link',
          myUid: stableId,
        });
      }
      return ok;
    })
    .finally(() => {
      if (friendRequestViewerAuthLinkInFlight?.promise === sharedPromise) {
        friendRequestViewerAuthLinkInFlight = null;
      }
    });

  friendRequestViewerAuthLinkInFlight = { scopeKey, promise: sharedPromise };
  return sharedPromise;
}

// ── Обратный индекс исходящих заявок ───────────────────────────────────────

/**
 * Ставит отметку `users/{myUid}/friend_requests_sent/{toUid}` рядом с заявкой.
 *
 * зачем: сама заявка лежит в подколлекции ПОЛУЧАТЕЛЯ и названа моим uid, так что
 * свои исходящие заявки нельзя найти никаким запросом. Из-за этого удаление
 * аккаунта было вынуждено перебирать всю коллекцию users (сотни тысяч чтений и
 * таймаут при росте базы). Отметка — обратный индекс: удаление проходит по
 * десяткам документов. Договор имён — shared/friend_requests_index_contract.ts.
 *
 * Никогда не бросает: индекс вторичен, его сбой не должен ломать сам сценарий
 * дружбы. Потерянная отметка стоит лишь возврата к старому полному перебору.
 */
async function writeSentRequestIndex(
  db: NonNullable<ReturnType<typeof getFirestore>>,
  myUid: string,
  toUid: string,
  createdAt: number,
): Promise<void> {
  try {
    const sent = db.collection('users').doc(myUid).collection(FRIEND_REQUESTS_SENT_INDEX);
    await sent.doc(toUid).set({ toUid, createdAt });
    // Маркер отличает «индекс ведётся, заявок нет» от «аккаунт старше индекса».
    // Без него удаление не смогло бы доверять пустой подколлекции.
    await sent.doc(FRIEND_REQUESTS_SENT_MARKER_ID).set({ createdAt }, { merge: true });
  } catch (e) {
    logFriendsHealth('friends:sent_index_write_failed', e, {
      action: 'write_sent_request_index',
      myUid,
      targetUid: toUid,
    });
  }
}

/**
 * Ставит маркер «этот аккаунт ведёт индекс» при первом заходе на «Друзей».
 *
 * зачем: маркер нужен удалению аккаунта, чтобы отличить «индекс ведётся, заявок
 * нет» от «аккаунт старше индекса». Раньше он появлялся ТОЛЬКО при отправке
 * заявки в друзья — то есть у большинства людей не появлялся никогда, и они
 * навсегда оставались на дорогом полном переборе базы. Найдено на аудите.
 *
 * Пишется один раз на аккаунт на устройство: локальный флаг в AsyncStorage
 * не даёт бить в Firestore на каждом открытии вкладки.
 */
const SENT_INDEX_MARKER_LOCAL_KEY = 'friend_requests_sent_marker_v1';

async function ensureFriendRequestsSentIndexMarker(myUid: string): Promise<void> {
  if (!myUid) return;
  const db = getFirestore();
  if (!db) return;
  try {
    const localKey = `${SENT_INDEX_MARKER_LOCAL_KEY}:${myUid}`;
    if (await AsyncStorage.getItem(localKey)) return;
    await db
      .collection('users').doc(myUid)
      .collection(FRIEND_REQUESTS_SENT_INDEX)
      .doc(FRIEND_REQUESTS_SENT_MARKER_ID)
      .set({ createdAt: Date.now() }, { merge: true });
    await AsyncStorage.setItem(localKey, '1');
  } catch (e) {
    // Маркер вторичен: без него удаление просто пойдёт медленным путём.
    logFriendsHealth('friends:sent_index_marker_failed', e, {
      action: 'ensure_sent_index_marker',
      myUid,
    });
  }
}

/**
 * Снимает отметку об исходящей заявке, когда заявка перестала существовать
 * (принята, отклонена, отозвана, дружба разорвана). Маркер НЕ трогаем — он
 * означает «аккаунт ведёт индекс» и должен пережить опустошение списка.
 */
function deleteSentRequestIndex(
  db: NonNullable<ReturnType<typeof getFirestore>>,
  myUid: string,
  toUid: string,
): void {
  if (toUid === FRIEND_REQUESTS_SENT_MARKER_ID) return;
  void db
    .collection('users').doc(myUid)
    .collection(FRIEND_REQUESTS_SENT_INDEX)
    .doc(toUid)
    .delete()
    .catch((e: unknown) => {
      logFriendsHealth('friends:sent_index_delete_failed', e, {
        action: 'delete_sent_request_index',
        myUid,
        targetUid: toUid,
      });
    });
}

// ── sendFriendRequest ──────────────────────────────────────────────────────

/**
 * Send a friend request to another user by their UID (resolved from friend
 * code via lookupUserByFriendCode, which already filters banned users).
 *
 * Returns a typed result rather than throwing so the UI can render
 * appropriate copy without catching.
 *
 * Writes: users/{toUid}/friend_requests/{myUid} = { status: 'pending', createdAt, fromName? }
 */
// зачем (аудит Optimistic UI, 12.10): «Заявка отправлена!» показывается сразу, а сама отправка — 3–5 последовательных
// чтений и запись. При зависшей сети плашка висела без конца и кнопка не возвращалась. Потолок: через 15 с экран получает
// 'network' (откат: найденный человек и код возвращаются, «Связь пропала»). Если запись всё же дошла позже, повтор даст
// 'already_sent' — честный ответ.
export const SEND_FRIEND_REQUEST_TIMEOUT_MS = 15_000;

export async function sendFriendRequest(toUid: string): Promise<SendRequestResult> {
  const startedAt = Date.now();
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const ceiling = new Promise<SendRequestResult>((resolve) => {
    timer = setTimeout(() => {
      timedOut = true;
      console.warn(`[FRIEND-REQUEST] send ${toUid}: нет ответа за ${SEND_FRIEND_REQUEST_TIMEOUT_MS} мс — отдаю network, запись может дойти позже`);
      resolve('network');
    }, SEND_FRIEND_REQUEST_TIMEOUT_MS);
  });
  const work = sendFriendRequestInner(toUid);
  void work.then(
    (late) => { if (timedOut) console.warn(`[FRIEND-REQUEST] send ${toUid}: ответ пришёл после потолка через ${Date.now() - startedAt} мс — result=${late}`); },
    (error: unknown) => { if (timedOut) console.warn(`[FRIEND-REQUEST] send ${toUid}: после потолка упало — ${error instanceof Error ? error.message : String(error)}`); },
  );
  try {
    const result = await Promise.race([work, ceiling]);
    logFriendAdd('send', { to: friendTag(toUid), result, timedOut, ms: Date.now() - startedAt });
    return result;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function sendFriendRequestInner(toUid: string): Promise<SendRequestResult> {
  const myUid = await ensureAnonUser();
  if (!myUid) {
    logFriendsHealth('friends:send_request_no_canonical_uid', new Error('canonical uid unavailable'), {
      action: 'send_friend_request',
      targetUid: toUid,
    });
    return 'error';
  }

  if (toUid === myUid) return 'self';

  const db = getFirestore();
  if (!db) {
    logFriendsHealth('friends:send_request_firestore_unavailable', new Error('Firestore unavailable'), {
      action: 'send_friend_request',
      targetUid: toUid,
    });
    return 'error';
  }

  try {
    const senderNamePromise = readMyFriendRequestDisplayName(myUid, db);
    // Auth must be linked before Firestore writes — security rules check firebaseAuthUid.
    const authLinked = await ensureFriendsStableAuthLink('send_friend_request', { myUid, targetUid: toUid });
    if (!authLinked) return 'error';
    // Читаем friends и request параллельно — быстрее.
    const [friendsSnap, reqSnap] = await Promise.all([
      db.collection('users').doc(myUid).collection('friends').doc(toUid).get(),
      db.collection('users').doc(toUid).collection('friend_requests').doc(myUid).get(),
    ]);

    // Если documents дружбы существуют — это могут быть мусорные остатки от неполного deleteFriend.
    // Проверяем обе стороны: если friends/{toUid} есть, но friends/{myUid} у toUid нет — это мусор, чистим.
    if (friendsSnap.exists) {
      const reverseFriendSnap = await db
        .collection('users').doc(toUid).collection('friends').doc(myUid).get();
      if (reverseFriendSnap.exists) {
        // Оба документа есть — реально друзья.
        return 'already_friends';
      }
      // Односторонний мусор от неполного удаления — чистим и продолжаем.
      await db.collection('users').doc(myUid).collection('friends').doc(toUid).delete();
    }

    if (reqSnap.exists) {
      const reqStatus = reqSnap.data?.()?.status as string | undefined;
      if (reqStatus === 'pending') {
        // Pending request already exists — could be a real pending OR a stale one left
        // after deleteFriend (batch couldn\'t delete the other user\'s request due to security rules).
        // Check if they\'re actually friends: if not, the pending doc is stale garbage — overwrite it.
        const [myFriendSnap, theirFriendSnap] = await Promise.all([
          db.collection('users').doc(myUid).collection('friends').doc(toUid).get(),
          db.collection('users').doc(toUid).collection('friends').doc(myUid).get(),
        ]);
        if (myFriendSnap.exists || theirFriendSnap.exists) {
          // One or both friend docs exist alongside a pending request — stale state,
          // clean own side and fall through to re-send.
          if (myFriendSnap.exists) {
            await db.collection('users').doc(myUid).collection('friends').doc(toUid).delete();
          }
          // Overwrite the stale pending request below (fall through).
        } else {
          // No friend docs on either side and request is pending — genuinely already sent.
          return 'already_sent';
        }
      }
      // Non-pending doc (accepted/declined remnant) or stale pending after deleteFriend — overwrite.
      await db.collection('users').doc(toUid).collection('friend_requests').doc(myUid).delete();
    }

    // Write the pending request.
    const fromName = await senderNamePromise;
    const createdAt = Date.now();
    await db
      .collection('users')
      .doc(toUid)
      .collection('friend_requests')
      .doc(myUid)
      .set({ status: 'pending', createdAt, ...(fromName ? { fromName } : {}) });

    // зачем: заявка лежит у ПОЛУЧАТЕЛЯ и её id — мой uid, поэтому найти свои
    // исходящие заявки запросом невозможно (documentId в collection-group
    // сравнивается по полному пути). Без этой отметки удаление аккаунта было
    // вынуждено перебирать всю коллекцию users. Пишем не в батче с заявкой
    // намеренно: отметка вторична, её сбой не должен отменять саму заявку.
    void writeSentRequestIndex(db, myUid, toUid, createdAt);

    return 'sent';
  } catch (e) {
    const offline = isFriendRequestNetworkError(e);
    console.warn('[sendFriendRequest] error', JSON.stringify({ offline, message: String(e).slice(0, 160) }));
    logFriendsHealth('friends:send_request_failed', e, {
      action: 'send_friend_request',
      myUid,
      targetUid: toUid,
    });
    return offline ? 'network' : 'error';
  }
}

/** Сетевой сбой Firestore/Functions: нет связи, таймаут, сервис недоступен. */
export function isFriendRequestNetworkError(error: unknown): boolean {
  const value = error as { code?: unknown; message?: unknown } | null;
  const code = String(value?.code ?? '').toLowerCase();
  const message = String(value?.message ?? error ?? '').toLowerCase();
  return /unavailable|deadline-exceeded|network/.test(code)
    || /network|offline|timed? ?out|failed to get document because the client is offline/.test(message);
}

// ── acceptFriendRequest ────────────────────────────────────────────────────

/**
 * Accept an incoming friend request from fromUid.
 *
 * Batch-create both friendship entries and delete the request atomically.
 * Security rules validate the reverse write against the existing pending request.
 */
export async function acceptFriendRequest(fromUid: string): Promise<void> {
  const acceptStartedAt = Date.now();
  const myUid = await ensureAnonUser();
  if (!myUid) {
    const err = new Error('acceptFriendRequest: canonical UID unavailable');
    logFriendsHealth('friends:accept_request_no_canonical_uid', err, { action: 'accept_friend_request', fromUid });
    throw err;
  }

  const db = getFirestore();
  if (!db) {
    const err = new Error('acceptFriendRequest: Firestore unavailable');
    logFriendsHealth('friends:accept_request_firestore_unavailable', err, { action: 'accept_friend_request', myUid, fromUid });
    throw err;
  }

  const authLinked = await ensureFriendsStableAuthLink('accept_friend_request', { myUid, fromUid });
  if (!authLinked) {
    throw new Error('acceptFriendRequest: stable auth link unavailable');
  }

  // Batch: create both friend entries + delete the request doc.
  const requestRef = db.collection('users').doc(myUid).collection('friend_requests').doc(fromUid);
  const [requestSnap, myDisplayName] = await Promise.all([
    requestRef.get(),
    readMyFriendRequestDisplayName(myUid, db),
  ]);
  const fromName = cleanFriendRequestDisplayName(requestSnap.data?.()?.fromName);
  const batch = db.batch();
  const now = Date.now();

  batch.set(
    db.collection('users').doc(myUid).collection('friends').doc(fromUid),
    { createdAt: now, ...(fromName ? { displayName: fromName } : {}) },
  );
  // Reverse doc живёт на стороне ОТПРАВИТЕЛЯ заявки (fromUid) — это его друг-запись.
  // Помечаем acceptedAt, чтобы отправитель мог показать «X принял твою заявку»
  // (Компас, соц-сводка «Кстати…»). Своя сторона (myUid) маркера не несёт →
  // там я САМ принял входящую, копия будет нейтральной «теперь вы друзья».
  batch.set(
    db.collection('users').doc(fromUid).collection('friends').doc(myUid),
    { createdAt: now, acceptedAt: now, ...(myDisplayName ? { displayName: myDisplayName } : {}) },
  );
  // зачем: отметку об исходящей заявке (users/{fromUid}/friend_requests_sent/{myUid})
  // отсюда не убрать — она под ЧУЖИМ uid, правила такое запрещают. И убирать не
  // нужно: после принятия мы друзья, а дружба симметрична, поэтому удаление
  // аккаунта всё равно найдёт этого человека через свой список friends. Лишняя
  // отметка ничего не ломает и уйдёт вместе с users/{fromUid}.
  // Удаляем request-документ после принятия — иначе он висит вечно и может блокировать повторные заявки.
  batch.delete(requestRef);

  try {
    await batch.commit();
    invalidateFriendReadCaches(myUid);
    logFriendAdd('accept', { from: friendTag(fromUid), me: friendTag(myUid), ok: true, requestExisted: requestSnap.exists === true, ms: Date.now() - acceptStartedAt });
  } catch (e) {
    logFriendAdd('accept', { from: friendTag(fromUid), me: friendTag(myUid), ok: false, code: String((e as { code?: unknown })?.code ?? 'unknown'), ms: Date.now() - acceptStartedAt });
    logFriendsHealth('friends:accept_request_failed', e, { action: 'accept_friend_request', myUid, fromUid });
    throw e;
  }

  // Достижения: считаем текущих друзей после принятия заявки
  try {
    const { checkAchievements } = await import('./achievements');
    // зачем: нужно ТОЛЬКО количество друзей, а не сами документы. Полное чтение
    // подколлекции тарифицируется как N чтений (50 друзей = 50 чтений на каждое
    // принятие заявки); count() — это одно агрегатное чтение независимо от размера.
    // Фолбэк на .get() оставлен на случай, если count() недоступен в рантайме.
    const friendsRef = db.collection('users').doc(myUid).collection('friends');
    let totalFriends: number;
    try {
      const countSnap = await friendsRef.count().get();
      totalFriends = Number(countSnap.data()?.count ?? 0) || 0;
    } catch {
      totalFriends = (await friendsRef.get()).size;
    }
    void checkAchievements({ type: 'friend_added', totalFriends });
  } catch (e) {
      DebugLogger.error('firestore_friend_requests:countSnap', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

// ── declineFriendRequest ───────────────────────────────────────────────────

/**
 * Decline an incoming friend request by DELETING the request document.
 *
 * Deletion (not status update to 'declined') keeps Firestore tidy and
 * avoids stale declined docs that would block future re-requests.
 */
export async function declineFriendRequest(fromUid: string): Promise<void> {
  const myUid = await ensureAnonUser();
  if (!myUid) {
    const err = new Error('declineFriendRequest: canonical UID unavailable');
    logFriendsHealth('friends:decline_request_no_canonical_uid', err, {
      action: 'decline_friend_request',
      fromUid,
    });
    // зачем (аудит Optimistic UI, 12.10): тихий return давал экрану «успех» — заявка исчезала локально, а на сервере
    // оставалась; откат и сообщение срабатывают только по исключению (как у acceptFriendRequest).
    throw err;
  }

  const db = getFirestore();
  if (!db) {
    const err = new Error('declineFriendRequest: Firestore unavailable');
    logFriendsHealth('friends:decline_request_firestore_unavailable', err, {
      action: 'decline_friend_request',
      myUid,
      fromUid,
    });
    throw err; // зачем: см. выше — экран должен откатить заявку и сказать об ошибке
  }

  try {
      await db
        .collection('users')
        .doc(myUid)
        .collection('friend_requests')
        .doc(fromUid)
        .delete();
      invalidateFriendReadCaches(myUid);
  } catch (e) {
    logFriendsHealth('friends:decline_request_failed', e, { action: 'decline_friend_request', myUid, fromUid });
    throw e;
  }
}

// ── deleteFriend ───────────────────────────────────────────────────────────

/**
 * Remove a friend bidirectionally in a single WriteBatch.
 *
 * Deletes users/{myUid}/friends/{friendUid} AND users/{friendUid}/friends/{myUid}.
 */
export async function deleteFriend(friendUid: string): Promise<void> {
  const myUid = await ensureAnonUser();
  if (!myUid) {
    logFriendsHealth('friends:delete_friend_no_canonical_uid', new Error('canonical uid unavailable'), {
      action: 'delete_friend',
      friendUid,
    });
    // зачем (аудит Optimistic UI Профиля, 13.10): голый `return` разрешал промис как УСПЕХ — человек видел «Друг убран», а дружба оставалась в базе. Вызывающие (карточка профиля, «Друзья»)
    // откатывают список и показывают тост именно по отказу промиса.
    throw new Error('delete_friend_no_canonical_uid');
  }

  const db = getFirestore();
  if (!db) {
    logFriendsHealth('friends:delete_friend_firestore_unavailable', new Error('Firestore unavailable'), {
      action: 'delete_friend',
      myUid,
      friendUid,
    });
    throw new Error('delete_friend_firestore_unavailable');
  }

  const batch = db.batch();

  batch.delete(db.collection('users').doc(myUid).collection('friends').doc(friendUid));
  batch.delete(db.collection('users').doc(friendUid).collection('friends').doc(myUid));
  // Снимаем мой reverse-edge на стороне экс-друга, чтобы он больше не мог читать мою ленту
  // активности (friend_auth_edges keyed by МОЙ authUid; rule разрешает delete своего же edge).
  const myAuthUid = getCurrentAuthUidForFriends();
  if (myAuthUid) {
    batch.delete(
      db.collection('users').doc(friendUid).collection('friend_auth_edges').doc(myAuthUid),
    );
  }
  // Only delete own request doc — security rules forbid deleting the other user\'s subcollection.
  // Stale request on their side is handled by sendFriendRequest on next add attempt.
  batch.delete(db.collection('users').doc(myUid).collection('friend_requests').doc(friendUid));
  // Моя отметка об исходящей заявке этому человеку больше не нужна: заявки нет,
  // дружбы тоже. Отметка лежит под моим uid, так что правила разрешают удаление.
  batch.delete(
    db.collection('users').doc(myUid).collection(FRIEND_REQUESTS_SENT_INDEX).doc(friendUid),
  );

  try {
    await batch.commit();
    invalidateFriendReadCaches(myUid);
  } catch (e) {
    logFriendsHealth('friends:delete_friend_failed', e, { action: 'delete_friend', myUid, friendUid });
    throw e;
  }
}

/**
 * Просит сервер (authEnsureStableLink, Admin SDK) проставить firebaseAuthUid в
 * users/{stableId}, чтобы правило canonicalUserMatchesAuth разрешило читать
 * входящие заявки (auth.uid часто ≠ stableId). Клиент это поле НЕ пишет сам —
 * оно server-owned, и клиентская запись отклоняется hasNoServerIdentityWrites.
 * Вызывать перед подпиской на friend_requests и при фокусе вкладки «Друзья».
 */
// true means Firestore security can accept the live listeners. On false the
// screen must retain its SWR cache and skip listeners instead of provoking permission-denied.
export async function ensureFriendRequestViewerAuthLink(stableId?: string): Promise<boolean> {
  let myUid = String(stableId ?? '').trim();
  if (!myUid) {
    try {
      myUid = String(await ensureAnonUser() ?? '').trim();
    } catch {
      return false;
    }
  }
  if (!myUid) return false;
  const linked = await prepareFriendRequestViewerAuthLink(myUid);
  // Маркер ставим только после успешной привязки — иначе правило откажет.
  // Не ждём результат: экран не должен зависеть от служебной записи.
  if (linked) void ensureFriendRequestsSentIndexMarker(myUid);
  return linked;
}

// ── subscribeToFriends ─────────────────────────────────────────────────────

/** Второй аргумент `subscribeToFriends`: ответ доступен только из локального кэша Firestore (`fromCache: true`). */
export type SubscribeFriendsSnapshotMeta = { fromCache: boolean };

/**
 * One-shot read for the current user's friends collection.
 *
 * Returns a cancellation function. The callback receives one full array per
 * foreground visit, or the same account-scoped response while its TTL is live.
 * `meta.fromCache === true` means Firestore only had an offline cache.
 * If UID is unavailable (Expo Go, CLOUD_SYNC_ENABLED=false), callback([])
 * is called immediately and a no-op unsubscribe is returned.
 */
export function subscribeToFriends(
  callback: (friends: FriendEntry[], meta?: SubscribeFriendsSnapshotMeta) => void,
  onError?: (err: Error) => void,
): () => void {
  let cancelled = false;

  ensureAnonUser()
    .then(async myUid => {
      if (cancelled) return;
      if (!myUid) {
        // Auth ещё не готов (холодный старт/сеть) — это НЕ «друзей нет». fromCache:true,
        // чтобы вызывающий не принял пустоту за серверную правду и не стёр показанный список.
        callback([], { fromCache: true });
        return;
      }
      const cachedScopeKey = friendRequestViewerAuthScopeKey(myUid);
      if (friendReadCache?.scopeKey === cachedScopeKey && friendReadCache.expiresAt > Date.now()) {
        logFriendAdd('friends_read', { me: friendTag(myUid), source: 'memory_cache', count: friendReadCache.rows.length, expiresInMs: friendReadCache.expiresAt - Date.now() });
        callback([...friendReadCache.rows], { fromCache: false });
        return;
      }
      const friendsReadStartedAt = Date.now();
      const authLinkReady = await ensureFriendRequestViewerAuthLink(myUid);
      if (cancelled || !authLinkReady) return;
      const db = getFirestore();
      if (!db) {
        callback([], { fromCache: true });
        return;
      }
      const snap = await db
        .collection('users')
        .doc(myUid)
        .collection('friends')
        // 500 выше реального числа друзей и ограничивает цену одного refresh.
        .limit(500)
        .get() as {
          docs: { id: string; data: () => Record<string, unknown> }[];
          metadata?: { fromCache?: boolean };
        };
      if (cancelled) return;
      const friends: FriendEntry[] = snap.docs.map(doc => ({
        displayName: cleanFriendRequestDisplayName(doc.data().displayName) || undefined,
        uid: doc.id,
        createdAt: (doc.data().createdAt as number) ?? 0,
      }));
      friendReadCache = {
        scopeKey: friendRequestViewerAuthScopeKey(myUid),
        rows: friends,
        expiresAt: Date.now() + FRIENDS_REALTIME_REPLACEMENT_TTL_MS,
      };
      logFriendAdd('friends_read', { me: friendTag(myUid), source: snap.metadata?.fromCache === true ? 'sdk_cache' : 'server', count: friends.length, ms: Date.now() - friendsReadStartedAt });
      callback(friends, { fromCache: snap.metadata?.fromCache === true });
    })
    .catch((err: unknown) => {
      logFriendsHealth('friends:read_friends_failed', err, { action: 'read_friends' });
      onError?.(err instanceof Error ? err : new Error(String(err)));
    });

  return () => {
    cancelled = true;
  };
}

// ── subscribeToIncomingRequests ────────────────────────────────────────────

/**
 * One-shot read for incoming pending requests. Firestore filters by status
 * before rows reach JS, while the account-scoped TTL avoids repeated reads on
 * tab switches.
 */
export function subscribeToIncomingRequests(
  callback: (requests: FriendRequestEntry[]) => void,
  onError?: (err: Error) => void,
): () => void {
  let cancelled = false;

  ensureAnonUser()
    .then(async myUid => {
      if (cancelled) return;
      if (!myUid) {
        callback([]);
        return;
      }
      const cachedScopeKey = friendRequestViewerAuthScopeKey(myUid);
      if (incomingRequestsReadCache?.scopeKey === cachedScopeKey && incomingRequestsReadCache.expiresAt > Date.now()) {
        logFriendAdd('requests_read', { me: friendTag(myUid), source: 'memory_cache', count: incomingRequestsReadCache.rows.length, expiresInMs: incomingRequestsReadCache.expiresAt - Date.now() });
        callback([...incomingRequestsReadCache.rows]);
        return;
      }
      const requestsReadStartedAt = Date.now();
      const authLinkReady = await ensureFriendRequestViewerAuthLink(myUid);
      if (cancelled || !authLinkReady) return;
      const db = getFirestore();
      if (!db) {
        callback([]);
        return;
      }
      const snap = await db
        .collection('users')
        .doc(myUid)
        .collection('friend_requests')
        .where('status', '==', 'pending')
        // Ограничивает цену одного refresh при патологическом росте заявок.
        .limit(200)
        .get() as { docs: { id: string; data: () => Record<string, unknown> }[] };
      if (cancelled) return;
      const requests: FriendRequestEntry[] = snap.docs
        .map(doc => {
          const data = doc.data();
          const st = data.status as string | undefined;
          const fromName = cleanFriendRequestDisplayName(data.fromName);
          return {
            fromUid: doc.id,
            fromName: fromName || undefined,
            status: 'pending' as const,
            createdAt: (data.createdAt as number) ?? 0,
            _rawStatus: st,
          };
        })
        .filter(r => r._rawStatus === 'pending')
        .map(({ fromUid, fromName, status, createdAt }) => ({ fromUid, ...(fromName ? { fromName } : {}), status, createdAt }));
      incomingRequestsReadCache = {
        scopeKey: friendRequestViewerAuthScopeKey(myUid),
        rows: requests,
        expiresAt: Date.now() + FRIENDS_REALTIME_REPLACEMENT_TTL_MS,
      };
      logFriendAdd('requests_read', { me: friendTag(myUid), source: 'server', count: requests.length, ms: Date.now() - requestsReadStartedAt });
      callback(requests);
    })
    .catch((err: unknown) => {
      logFriendsHealth('friends:read_incoming_requests_failed', err, { action: 'read_incoming_requests' });
      onError?.(err instanceof Error ? err : new Error(String(err)));
    });

  return () => {
    cancelled = true;
  };
}

// ── cleanupStaleFriendData ─────────────────────────────────────────────────

/**
 * Удаляет мусорные данные которые могли остаться после неполных операций:
 * - accepted request-документы (должны были удалиться при acceptFriendRequest)
 * - Односторонние friends-документы (должны были удалиться при deleteFriend)
 * Вызывается один раз при открытии вкладки. Fire-and-forget.
 */
// зачем: чистка — редкая ремонтная операция, а вкладка «Друзья» зовёт её при КАЖДОМ
// появлении: полный скан friend_requests + friends + до 20 reverse-чтений = до ~22
// Firestore reads на каждое переключение таба (аудит 2026-07-25). Троттлим: не чаще
// раза в 6 часов, метка в AsyncStorage переживает перезапуски. Экономия чтений.
const FRIEND_CLEANUP_LAST_RUN_KEY = 'friends_cleanup_last_run_v1';
const FRIEND_CLEANUP_MIN_INTERVAL_MS = 6 * 60 * 60 * 1000;
let friendCleanupInFlight = false;

export async function cleanupStaleFriendData(): Promise<void> {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return;
  if (friendCleanupInFlight) return;
  friendCleanupInFlight = true;
  try {
    const lastRaw = await AsyncStorage.getItem(FRIEND_CLEANUP_LAST_RUN_KEY).catch(noteSwallowedAs('firestore_friend_requests:promise_3', null));
    const sinceLast = Date.now() - Number(lastRaw ?? 0);
    // Отрицательное sinceLast = часы переведены назад → метка из «будущего», не верим ей.
    if (Number(lastRaw) > 0 && sinceLast >= 0 && sinceLast < FRIEND_CLEANUP_MIN_INTERVAL_MS) return;
    // Метку ставим ДО работы: даже неудачная попытка не должна повторяться каждый вход в таб.
    await AsyncStorage.setItem(FRIEND_CLEANUP_LAST_RUN_KEY, String(Date.now())).catch(noteSwallowedHandler('firestore_friend_requests:promise_4'));
    const myUid = await ensureAnonUser();
    if (!myUid) return;
    const db = getFirestore();
    if (!db) return;

    const batch = db.batch();
    let batchCount = 0;
    const BATCH_MAX = 400;

    // 1. Удаляем accepted request-документы (мусор от accept без cleanup).
    const reqSnap = await db
      .collection('users').doc(myUid).collection('friend_requests').get();
    for (const doc of reqSnap.docs as Array<{ id: string; data: () => Record<string, unknown>; ref: unknown }>) {
      if (batchCount >= BATCH_MAX) break;
      const st = doc.data().status as string | undefined;
      if (st === 'accepted') {
        batch.delete(doc.ref);
        batchCount++;
      }
    }

    // 2. Проверяем односторонние friends-документы (есть у меня, нет у друга).
    // Лимит до 20 reverse-reads за один запуск — защита от N reads при большом списке.
    const friendsSnap = await db
      .collection('users').doc(myUid).collection('friends').get();
    const friendDocs = friendsSnap.docs as Array<{ id: string; ref: unknown }>;
    const toCheck = friendDocs.slice(0, 20);
    const reverseSnaps = await Promise.all(
      toCheck.map(doc =>
        db.collection('users').doc(doc.id).collection('friends').doc(myUid).get(),
      ),
    );
    for (let i = 0; i < toCheck.length; i++) {
      if (batchCount >= BATCH_MAX) break;
      if (!reverseSnaps[i].exists) {
        batch.delete(toCheck[i].ref);
        batchCount++;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }
  } catch (e) {
      // ignore — cleanup is best-effort
      DebugLogger.error('firestore_friend_requests:reverseSnaps', e instanceof Error ? e : new Error(String(e)), 'warning');
    } finally {
    friendCleanupInFlight = false;
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
