import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitAppEvent } from './events';
import { chargeArenaEntry, reserveArenaGameEntry } from './arena_access_gate';
import { ensureArenaAuthUid } from './user_id_policy';
import { resolveArenaCourseIdentity } from './language_runtime/arena_course_identity';

export type JoinArenaGuestResult =
  | { ok: true; sessionId: string; uid: string }
  | { ok: false; code: 'no_uid' | 'room_missing' | 'room_expired' | 'content_mismatch' | 'no_energy' | 'session_timeout' | 'error' };

/**
 * Гость подключается к arena_rooms/{roomId} и ждёт sessionId (как экран arena_join).
 */
export async function joinArenaFriendRoomAsGuest(
  roomId: string,
  options: {
    defaultPlayerName: string;
    spendOne: () => Promise<boolean>;
    isUnlimited: boolean;
    studyTarget: string;
    learnerSourceLocale: string;
  },
): Promise<JoinArenaGuestResult> {
  const { defaultPlayerName, spendOne, isUnlimited, studyTarget, learnerSourceLocale } = options;
  try {
    const uid = await ensureArenaAuthUid();
    if (!uid) return { ok: false, code: 'no_uid' };
    const name = (await AsyncStorage.getItem('user_name')) ?? defaultPlayerName;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const db = require('@react-native-firebase/firestore').default();

    const roomDoc = await db.collection('arena_rooms').doc(roomId).get();
    if (!roomDoc.exists) return { ok: false, code: 'room_missing' };
    const roomData = roomDoc.data() as Record<string, unknown>;
    const exp = roomData?.expiresAt as number | undefined;
    if (typeof exp === 'number' && exp < Date.now()) return { ok: false, code: 'room_expired' };
    const guestIdentity = await resolveArenaCourseIdentity(studyTarget, learnerSourceLocale);
    const hostIdentity = {
      studyTarget: String(roomData.studyTarget ?? 'en'),
      learnerSourceLocale: String(roomData.learnerSourceLocale ?? 'ru'),
      courseReleaseId: String(roomData.courseReleaseId ?? 'legacy-en-v1'),
    };
    if (guestIdentity.studyTarget !== hostIdentity.studyTarget || guestIdentity.learnerSourceLocale !== hostIdentity.learnerSourceLocale || guestIdentity.courseReleaseId !== hostIdentity.courseReleaseId) return { ok: false, code: 'content_mismatch' };

    await db.collection('arena_rooms').doc(roomId).update({
      guestId: uid,
      guestName: name,
      guestStudyTarget: guestIdentity.studyTarget,
      guestLearnerSourceLocale: guestIdentity.learnerSourceLocale,
      guestCourseReleaseId: guestIdentity.courseReleaseId,
      status: 'matched',
    });

    const foundSessionId = await new Promise<string | null>((resolve) => {
      let resolved = false;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      const settle = (value: string | null, unsub: () => void) => {
        if (resolved) return;
        resolved = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        unsub();
        resolve(value);
      };
      const unsub = db.collection('arena_rooms').doc(roomId).onSnapshot((snap: { exists?: boolean; data?: () => Record<string, unknown> }) => {
        if (resolved || !snap?.exists) return;
        const data = snap.data?.();
        if (data?.sessionId) {
          settle(String(data.sessionId), unsub);
        }
      }, () => {
        settle(null, unsub);
      });
      timeoutId = setTimeout(() => {
        settle(null, unsub);
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
        messageRu: 'Энергия закончилась — восполни её и заходи в бой.',
        messageUk: 'Енергія закінчилася — поповни її і заходь у бій.',
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
