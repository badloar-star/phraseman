import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { enqueueThemedBlockingInfoAlert } from './themed_blocking_alert_queue';
import { getCanonicalUserId } from './user_id_policy';

const IDEA_INBOX = 'idea_inbox';
let flushRunning = false;

function getFirestore() {
  if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@react-native-firebase/firestore').default();
  } catch {
    return null;
  }
}

async function readAppLang(): Promise<string> {
  try {
    const v = await AsyncStorage.getItem('app_lang');
    return (v || 'ru').trim().toLowerCase();
  } catch {
    return 'ru';
  }
}

function okButtonLabel(lang: string): string {
  return lang.startsWith('uk') ? 'Зрозуміло' : 'Понятно';
}

function pickByLang(ru: string, uk: string, lang: string): string {
  return lang.startsWith('uk') ? uk || ru : ru || uk;
}

/**
 * Непрочитанные решения по идеям из users/{uid}/idea_inbox — показываем themed-модалкой
 * через общую очередь (ту же, что и модерация community-наборов), затем помечаем seen.
 * Approve = поздравление + год доступа уже выдан сервером; reject = объяснение админа.
 */
export async function flushIdeaDecisionModals(): Promise<void> {
  if (!CLOUD_SYNC_ENABLED || IS_EXPO_GO) return;
  if (flushRunning) return;
  flushRunning = true;
  try {
    const uid = await getCanonicalUserId();
    if (!uid) return;
    const db = getFirestore();
    if (!db) return;

    let snap: { docs: { id: string; data: () => Record<string, unknown> }[] };
    try {
      snap = await db
        .collection('users')
        .doc(uid)
        .collection(IDEA_INBOX)
        .where('seen', '==', false)
        .limit(20)
        .get();
    } catch {
      return;
    }
    if (!snap.docs.length) return;

    const lang = await readAppLang();
    type Row = Record<string, unknown> & { id: string };
    const rows: Row[] = snap.docs
      .map((d): Row => ({ id: d.id, ...(d.data() as Record<string, unknown>) }))
      .filter((r) => r.type === 'idea_decision')
      .sort((a, b) => Number(a.createdAt ?? 0) - Number(b.createdAt ?? 0));

    for (const r of rows) {
      const title = pickByLang(String(r.titleRu || ''), String(r.titleUk || ''), lang);
      const message = pickByLang(String(r.messageRu || ''), String(r.messageUk || ''), lang);
      if (!title && !message) {
        // нечего показывать — но всё равно гасим, чтобы не зациклиться
      } else {
        await enqueueThemedBlockingInfoAlert(title, message, okButtonLabel(lang));
      }
      try {
        await db
          .collection('users')
          .doc(uid)
          .collection(IDEA_INBOX)
          .doc(r.id)
          .set({ seen: true, seenAt: Date.now() }, { merge: true });
      } catch {
        /* non-critical: покажем снова в след. раз */
      }
    }
  } finally {
    flushRunning = false;
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() {
  return null;
}
