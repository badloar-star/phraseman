import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitAppEvent } from './events';
import { chargeArenaEntry, reserveArenaGameEntry } from './arena_access_gate';
import { ensureArenaAuthUid } from './user_id_policy';

export type JoinArenaGuestResult =
  | { ok: true; sessionId: string; uid: string }
  | { ok: false; code: 'no_uid' | 'room_missing' | 'room_expired' | 'no_energy' | 'session_timeout' | 'error' };

/**
 * Гость подключается к arena_rooms/{roomId} и ждёт sessionId (как экран arena_join).
 */
export async function joinArenaFriendRoomAsGuest(
  roomId: string,
  options: {
    defaultPlayerName: string;
    spendOne: () => Promise<boolean>;
    isUnlimited: boolean;
  },
): Promise<JoinArenaGuestResult> {
  const { defaultPlayerName, spendOne, isUnlimited } = options;
  try {
    const uid = await ensureArenaAuthUid();
    if (!uid) return { ok: false, code: 'no_uid' };
    const name = (await AsyncStorage.getItem('user_name')) ?? defaultPlayerName;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const db = require('@react-native-firebase/firestore').default();

    const roomDoc = await db.collection('arena_rooms').doc(roomId).get();
    if (!roomDoc.exists) return { ok: false, code: 'room_missing' };
    const exp = roomDoc.data()?.expiresAt as number | undefined;
    if (typeof exp === 'number' && exp < Date.now()) return { ok: false, code: 'room_expired' };

    await db.collection('arena_rooms').doc(roomId).update({
      guestId: uid,
      guestName: name,
      status: 'matched',
    });

    const foundSessionId = await new Promise<string | null>((resolve) => {
      let resolved = false;
      const unsub = db.collection('arena_rooms').doc(roomId).onSnapshot((snap: { exists?: boolean; data?: () => Record<string, unknown> }) => {
        if (resolved || !snap?.exists) return;
        const data = snap.data?.();
        if (data?.sessionId) {
          resolved = true;
          unsub();
          resolve(String(data.sessionId));
        }
      }, () => {
        if (!resolved) {
          resolved = true;
          unsub();
          resolve(null);
        }
      });
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          unsub();
          resolve(null);
        }
      }, 12_000);
    });

    if (!foundSessionId) return { ok: false, code: 'session_timeout' };

    const charge = await chargeArenaEntry({
      isUnlimited,
      spendOne,
      countDaily: false,
      mode: 'friend',
      extraLogParams: { role: 'guest' },
    });
    if (!charge.ok) {
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Недостаточно энергии для входа в матч.',
        messageUk: 'Недостатньо енергії для входу в матч.',
        messageEs: 'No tienes suficiente energía para unirte a la partida.',
      });
      return { ok: false, code: 'no_energy' };
    }

    await reserveArenaGameEntry(foundSessionId, 'friend_guest');
    return { ok: true, sessionId: foundSessionId, uid };
  } catch {
    return { ok: false, code: 'error' };
  }
}
