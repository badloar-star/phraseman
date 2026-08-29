import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { enqueueThemedBlockingInfoAlert } from './themed_blocking_alert_queue';
import { getCanonicalUserId } from './user_id_policy';
import { DebugLogger } from './debug-logger';

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

// зачем (аудит по Библии, 2026-08-26): «Понятно» — реакция, а не действие
// (Правило 1: глагол в кнопке). Модалка решения по идее закрывается.
function okButtonLabel(lang: string): string {
  if (lang.startsWith('es')) return 'Cerrar';
  return lang.startsWith('uk') ? 'Закрити' : 'Закрыть';
}

function pickByLang(ru: string, uk: string, es: string, lang: string): string {
  if (lang.startsWith('es')) return es || ru || uk;
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
      const title = pickByLang(String(r.titleRu || ''), String(r.titleUk || ''), String(r.titleEs || ''), lang);
      const message = pickByLang(String(r.messageRu || ''), String(r.messageUk || ''), String(r.messageEs || ''), lang);
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
      } catch (e) {
      // non-critical: покажем снова в след. раз
      DebugLogger.error('idea_decision_modals:message', e instanceof Error ? e : new Error(String(e)), 'warning');
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
