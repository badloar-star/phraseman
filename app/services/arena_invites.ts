import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import { ensureAnonUser } from '../cloud_sync';
import { ensureArenaAuthUid } from '../user_id_policy';

const ARENA_INVITE_TTL_MS = 10 * 60 * 1000;

export type ArenaInviteRow = {
  id: string;
  fromUid: string;
  toUid: string;
  roomId: string;
  fromName: string;
  status: string;
  createdAt: number;
};

const getFirestore = () => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default();
  } catch {
    return null;
  }
};

/** Cloud Auth uid друга по ключу users/{stableId} (для arena_invites.toUid по правилам Firestore). */
export async function getAuthUidForStableUser(stableUid: string): Promise<string | null> {
  const db = getFirestore();
  if (!db || !stableUid) return null;
  try {
    const snap = await db.collection('users').doc(stableUid).get();
    if (!snap.exists) return null;
    const v = snap.data()?.firebaseAuthUid;
    return typeof v === 'string' && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

async function assertMutualFriendship(myStableId: string, friendStableId: string): Promise<boolean> {
  const db = getFirestore();
  if (!db) return false;
  try {
    const [a, b] = await Promise.all([
      db.collection('users').doc(myStableId).collection('friends').doc(friendStableId).get(),
      db.collection('users').doc(friendStableId).collection('friends').doc(myStableId).get(),
    ]);
    return a.exists && b.exists;
  } catch {
    return false;
  }
}

export type SendArenaInviteResult =
  | { ok: true; inviteId: string }
  | { ok: false; reason: 'cloud' | 'no_auth' | 'not_friend' | 'friend_no_session' };

/**
 * Приглашение в дружескую комнату: пишет arena_invites с toUid = Auth uid друга
 * (иначе нельзя обновить status по правилам безопасности).
 */
export async function sendArenaInvite(params: {
  toFriendStableUid: string;
  roomId: string;
  fromName: string;
}): Promise<SendArenaInviteResult> {
  const { toFriendStableUid, roomId, fromName } = params;
  const db = getFirestore();
  if (!db) return { ok: false, reason: 'cloud' };

  const myAuthUid = await ensureArenaAuthUid();
  const myStableId = await ensureAnonUser();
  if (!myAuthUid || !myStableId) return { ok: false, reason: 'no_auth' };
  if (toFriendStableUid === myStableId) return { ok: false, reason: 'not_friend' };

  const okFriend = await assertMutualFriendship(myStableId, toFriendStableUid);
  if (!okFriend) return { ok: false, reason: 'not_friend' };

  const toAuth = await getAuthUidForStableUser(toFriendStableUid);
  // toAuth may be missing if friend hasn't opened the app recently — that's OK:
  // subscribeIncomingArenaInvites queries by friendStableUid (not toUid), and
  // Firestore update rules allow the friend via canonicalUserMatchesAuth(friendStableUid).

  try {
    const ref = await db.collection('arena_invites').add({
      fromUid: myAuthUid,
      toUid: toAuth ?? '',
      friendStableUid: toFriendStableUid,
      roomId,
      fromName: fromName.slice(0, 80),
      status: 'pending',
      createdAt: Date.now(),
    });
    return { ok: true, inviteId: ref.id };
  } catch {
    return { ok: false, reason: 'cloud' };
  }
}

/**
 * Входящие pending-приглашения для текущего пользователя по **стабильному** id users/{stableId}
 * (совпадает с `friendStableUid` в документе). Так доставка не зависит от того, совпал ли в инвайте
 * устаревший `toUid` с текущим Firebase Auth после переустановки/смены сессии.
 */
export function subscribeIncomingArenaInvites(
  recipientStableUid: string,
  onChange: (invites: ArenaInviteRow[]) => void,
  onError?: (e: Error) => void,
): () => void {
  const db = getFirestore();
  if (!db || !recipientStableUid) {
    onChange([]);
    return () => {};
  }

  let unsub: (() => void) | null = null;
  try {
    unsub = db
      .collection('arena_invites')
      .where('friendStableUid', '==', recipientStableUid)
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .limit(8)
      .onSnapshot(
        (snap: {
          docs: Array<{ id: string; data: () => Record<string, unknown> }>;
        }) => {
          const now = Date.now();
          const rows: ArenaInviteRow[] = [];
          for (const doc of snap.docs) {
            const d = doc.data();
            const createdAt = (d.createdAt as number) ?? 0;
            if (now - createdAt > ARENA_INVITE_TTL_MS) continue;
            const fromUid = d.fromUid as string;
            const toUid = d.toUid as string;
            const roomId = d.roomId as string;
            const fromName = (d.fromName as string) || '';
            rows.push({
              id: doc.id,
              fromUid,
              toUid,
              roomId,
              fromName,
              status: String(d.status ?? ''),
              createdAt,
            });
          }
          onChange(rows);
        },
        (err: Error) => onError?.(err),
      );
  } catch {
    onChange([]);
    return () => {};
  }

  return () => {
    unsub?.();
  };
}

export async function setArenaInviteStatus(
  inviteId: string,
  status: 'accepted' | 'declined',
): Promise<boolean> {
  const db = getFirestore();
  if (!db || !inviteId) return false;
  try {
    await db.collection('arena_invites').doc(inviteId).update({ status });
    return true;
  } catch {
    return false;
  }
}

/**
 * Подписка отправителя на изменение статуса конкретного инвайта.
 * Используется в arena_lobby чтобы показать "Вызов отклонён" когда получатель отказал.
 */
export function subscribeArenaInviteStatus(
  inviteId: string,
  onStatus: (status: string) => void,
): () => void {
  const db = getFirestore();
  if (!db || !inviteId) return () => {};
  try {
    const unsub = db.collection('arena_invites').doc(inviteId).onSnapshot(
      (snap: { exists?: boolean; data?: () => Record<string, unknown> }) => {
        if (!snap?.exists) return;
        const s = snap.data?.()?.status;
        if (typeof s === 'string') onStatus(s);
      },
      () => {},
    );
    return unsub;
  } catch {
    return () => {};
  }
}
