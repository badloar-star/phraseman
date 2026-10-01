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
import { captureAccountGeneration, isCurrentAccountGeneration } from './account_generation';
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
  // зачем: PM-213/PM-200 — отметка зовётся «в фоне» (void) после конца диалога.
  // Если между началом и записью сменился аккаунт, запоздавшая запись попала бы
  // в локальное состояние НОВОГО аккаунта. Поколение фиксируем до первого await
  // и сверяем перед setItem — тот же приём, что в coin_rank_upgrade_v1.
  const token = captureAccountGeneration();
  if (!isCurrentAccountGeneration(token)) {
    console.warn('[DIALOG-PROGRESS] skip mark: account not active', {
      scenarioId,
      phase: token.phase,
      generation: token.generation,
    });
    return;
  }
  try {
    const current = await getCompletedDialogIds(studyTarget);
    if (current.has(scenarioId)) return;
    if (!isCurrentAccountGeneration(token)) {
      console.warn('[DIALOG-PROGRESS] skip mark: account changed during read', {
        scenarioId,
        capturedGeneration: token.generation,
      });
      return;
    }
    const next = [...current, scenarioId];
    await AsyncStorage.setItem(storageKey, JSON.stringify(next));
    emitAppEvent('dialogs_progress_changed', undefined);
  } catch (e) {
    // best-effort: при сбое записи диалог просто покажется «новым» в следующий раз
    DebugLogger.error('dialogs_progress:next', e instanceof Error ? e : new Error(String(e)), 'warning');
  }
}
