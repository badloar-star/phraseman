// Локальный прогресс ИИ-диалогов: какие сценарии пользователь уже завершал.
// Нужен списку диалогов для UX-состояний — отметка «Пройдено» на карточке,
// счётчик X/N в группе и выбор первого незавершённого сценария для блока
// «Продолжить».
//
// Это чисто клиентский UX-слой (как dialogs_limit_session): источник правды о
// факте прохождения нам не критичен — отметка best-effort, переживает перезапуск,
// но потеря записи лишь покажет диалог «новым», ничего не ломая. Премиум-замки и
// квоты живут отдельно и здесь не затрагиваются.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { emitAppEvent } from './events';
import { DebugLogger } from './debug-logger';
import { dialogueStateStorageKey } from './dialogue_language_registry';

export const DIALOGS_COMPLETED_KEY = 'dialogs_completed_ids_v1';

export function dialogsCompletedStorageKey(studyTarget: unknown): string | null {
  return dialogueStateStorageKey(studyTarget, DIALOGS_COMPLETED_KEY);
}

/** Прочитать множество завершённых scenarioId. Пустое при сбое/первом запуске. */
export async function getCompletedDialogIds(studyTarget: unknown): Promise<Set<string>> {
  const storageKey = dialogsCompletedStorageKey(studyTarget);
  if (!storageKey) return new Set();
  try {
    const raw = await AsyncStorage.getItem(storageKey);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === 'string'));
  } catch (e) {
    // зачем лог: немой catch здесь стоил бы звания и счётчиков X/N — журнал
    // молча читался бы пустым, а раздел выглядел бы «ничего не пройдено».
    DebugLogger.error('dialogs_progress:read', e instanceof Error ? e : new Error(String(e)), 'warning');
    return new Set();
  }
}

/**
 * Префикс записей урока с Максом. У урока нет сценария, но звание раздела
 * считается по размеру этого журнала — без записи ученик Макса навсегда
 * оставался бы «Новичком», сколько бы он ни занимался.
 *
 * зачем день в ключе: урок повторяем по замыслу (он каждый раз про новое), и
 * запись «один раз навсегда» дала бы ровно +1 к званию за всю жизнь. День —
 * тот же компромисс, что и у опыта за урок (см. app/tutor_lesson_reward.ts).
 */
export const TUTOR_LESSON_ID_PREFIX = 'tutor_lesson:';

/** Стабильный id урока за конкретный день. */
export function tutorLessonProgressId(dayKey: string): string {
  return `${TUTOR_LESSON_ID_PREFIX}${dayKey}`;
}

/** Завершён ли конкретный сценарий. */
export async function isDialogCompleted(studyTarget: unknown, scenarioId: string): Promise<boolean> {
  if (!scenarioId) return false;
  return (await getCompletedDialogIds(studyTarget)).has(scenarioId);
}

/**
 * Отметить сценарий завершённым. Идемпотентно: повторный вызов с тем же id не
 * меняет хранилище и не шлёт лишнее событие. Иммутабельно — собираем новый набор,
 * не мутируем прочитанный. Эмитит `dialogs_progress_changed`, чтобы открытый
 * список диалогов мгновенно перерисовал состояния.
 */
export async function markDialogCompleted(studyTarget: unknown, scenarioId: string): Promise<void> {
  if (!scenarioId) return;
  const storageKey = dialogsCompletedStorageKey(studyTarget);
  if (!storageKey) return;
  try {
    const current = await getCompletedDialogIds(studyTarget);
    if (current.has(scenarioId)) return;
    const next = [...current, scenarioId];
    await AsyncStorage.setItem(storageKey, JSON.stringify(next));
    emitAppEvent('dialogs_progress_changed', undefined);
  } catch (e) {
      // best-effort: при сбое записи диалог просто покажется «новым» в следующий раз
      DebugLogger.error('dialogs_progress:next', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}
