// Троттлинг показа блока оценки на экранах завершения: не чаще раза в
// неделю НА РАЗДЕЛ (владелец 2026-08-25, решение из уточняющих вопросов) —
// иначе человек видел бы просьбу оценить после каждого урока/сессии словаря
// и она приедалась бы. Один AsyncStorage-ключ на раздел, без сети и без
// Firestore — чисто локальный кулдаун.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FeedbackKind } from './feedback_client';

const THROTTLE_KEY_PREFIX = 'feedback_prompt_last_shown_v1';
export const FEEDBACK_PROMPT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1_000;

function storageKey(kind: FeedbackKind): string {
  return `${THROTTLE_KEY_PREFIX}:${kind}`;
}

/** true — блок можно показать (кулдаун прошёл или это первый раз). */
export async function shouldPromptFeedback(kind: FeedbackKind, nowMs: number = Date.now()): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(kind));
    if (!raw) return true;
    const lastShown = Number(raw);
    if (!Number.isFinite(lastShown)) return true;
    return nowMs - lastShown >= FEEDBACK_PROMPT_COOLDOWN_MS;
  } catch {
    // Читать не вышло — лучше показать лишний раз, чем никогда.
    return true;
  }
}

/** Отметить показ. Вызывать сразу при рендере блока, не при отправке —
 * иначе человек, ушедший не оценив, увидит блок на следующей же попытке. */
export async function markFeedbackPrompted(kind: FeedbackKind, nowMs: number = Date.now()): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(kind), String(nowMs));
  } catch {
    // Не критично: в худшем случае блок покажется чаще нужного.
  }
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
