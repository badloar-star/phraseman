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

export const DIALOGS_COMPLETED_KEY = 'dialogs_completed_ids_v1';

/** Прочитать множество завершённых scenarioId. Пустое при сбое/первом запуске. */
export async function getCompletedDialogIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(DIALOGS_COMPLETED_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === 'string'));
  } catch {
    return new Set();
  }
}

/** Завершён ли конкретный сценарий. */
export async function isDialogCompleted(scenarioId: string): Promise<boolean> {
  if (!scenarioId) return false;
  return (await getCompletedDialogIds()).has(scenarioId);
}

/**
 * Отметить сценарий завершённым. Идемпотентно: повторный вызов с тем же id не
 * меняет хранилище и не шлёт лишнее событие. Иммутабельно — собираем новый набор,
 * не мутируем прочитанный. Эмитит `dialogs_progress_changed`, чтобы открытый
 * список диалогов мгновенно перерисовал состояния.
 */
export async function markDialogCompleted(scenarioId: string): Promise<{ newlyCompleted: boolean; completedLifetime: number }> {
  if (!scenarioId) return { newlyCompleted: false, completedLifetime: 0 };
  try {
    const current = await getCompletedDialogIds();
    if (current.has(scenarioId)) return { newlyCompleted: false, completedLifetime: current.size };
    const next = [...current, scenarioId];
    await AsyncStorage.setItem(DIALOGS_COMPLETED_KEY, JSON.stringify(next));
    emitAppEvent('dialogs_progress_changed', undefined);
    return { newlyCompleted: true, completedLifetime: next.length };
  } catch {
    // best-effort: при сбое записи диалог просто покажется «новым» в следующий раз
    return { newlyCompleted: false, completedLifetime: 0 };
  }
}
