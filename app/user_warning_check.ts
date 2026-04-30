import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { IS_EXPO_GO, CLOUD_SYNC_ENABLED } from './config';
import { getStableId } from './stable_id';

const SEEN_KEY = 'seen_warning_ids';
const WARN_FETCH_AT_KEY = 'user_warnings_last_fetch_at_v1';
/** Не дергать Firestore на каждом заходе на Home — предупреждения от админа редки. */
const WARN_FETCH_COOLDOWN_MS = 25 * 60 * 1000;

const getFirestore = () => {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    return firestore();
  } catch {
    return null;
  }
};

export interface UserWarning {
  id: string;
  message: string;
}

export async function checkUserWarning(): Promise<UserWarning | null> {
  const db = getFirestore();
  if (!db) return null;

  const uid = await getStableId();
  if (!uid) return null;

  try {
    const lastFetchRaw = await AsyncStorage.getItem(WARN_FETCH_AT_KEY);
    const lastFetch = parseInt(lastFetchRaw || '0', 10) || 0;
    if (Date.now() - lastFetch < WARN_FETCH_COOLDOWN_MS) {
      return null;
    }

    const seenRaw = await AsyncStorage.getItem(SEEN_KEY);
    const seen: string[] = seenRaw ? JSON.parse(seenRaw) : [];

    const snap = await db.collection('user_warnings').where('uid', '==', uid).get();
    await AsyncStorage.setItem(WARN_FETCH_AT_KEY, String(Date.now())).catch(() => {});
    if (snap.empty) return null;

    for (const doc of snap.docs) {
      if (!seen.includes(doc.id)) {
        return { id: doc.id, message: doc.data().message };
      }
    }
  } catch {}
  return null;
}

export async function markWarningSeen(id: string): Promise<void> {
  const seenRaw = await AsyncStorage.getItem(SEEN_KEY);
  const seen: string[] = seenRaw ? JSON.parse(seenRaw) : [];
  if (!seen.includes(id)) {
    seen.push(id);
    await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
