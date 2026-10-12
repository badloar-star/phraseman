/*
 * Копия «Памяти диалогов» на устройстве — для мгновенного открытия экрана (правило владельца 04.10).
 *
 * зачем (решение координатора 04.10): экран памяти после холодного старта был пуст, пока не ответит сеть.
 * Условия (под них же написан текст политики, fe079cd49):
 *  - храним РОВНО то, что экран показывает (ответ viewDialogueV2Memory: сводка и точки продолжения);
 *  - ключ включает аккаунт (поколение + uid): другой аккаунт эту копию не прочтёт;
 *  - копия стирается при выходе и смене аккаунта (wipeLocalAccountData → clearAllDialogueV2MemoryDiskCache)
 *    и при «Очистить память» (clearDialogueV2MemoryDiskCache);
 *  - сеть обновляет копию фоном. Лог: [DIALOG-MEMORY] source=disk|network.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { captureAccountGeneration } from './account_generation';
import { accountScopeKey } from './account_scope_key';
import { clearAllDialogueV2DoneStore } from './dialogue_v2_done_store';
import type { DialogueV2MemoryStudyTarget, DialogueV2MemoryView } from './dialogue_v2_memory_client';

const PREFIX = 'dialogue_v2_memory_cache_v1:';

function cacheKey(studyTarget: DialogueV2MemoryStudyTarget): string | null {
  const scope = accountScopeKey(captureAccountGeneration());
  return scope ? `${PREFIX}${scope}:${studyTarget}` : null;
}

function isMemoryView(value: unknown, studyTarget: DialogueV2MemoryStudyTarget): value is DialogueV2MemoryView {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<DialogueV2MemoryView>;
  return v.ok === true && v.studyTarget === studyTarget && Array.isArray(v.scenarioCheckpoints);
}

export async function readDialogueV2MemoryDiskCache(studyTarget: DialogueV2MemoryStudyTarget): Promise<DialogueV2MemoryView | null> {
  const key = cacheKey(studyTarget);
  if (!key) {
    console.log('[DIALOG-MEMORY] disk:read skip — нет активного аккаунта', JSON.stringify({ studyTarget }));
    return null;
  }
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      console.log('[DIALOG-MEMORY] disk:read miss', JSON.stringify({ studyTarget }));
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isMemoryView(parsed, studyTarget)) {
      console.warn('[DIALOG-MEMORY] disk:read invalid shape → drop', JSON.stringify({ studyTarget }));
      await AsyncStorage.removeItem(key);
      return null;
    }
    console.log('[DIALOG-MEMORY] source=disk', JSON.stringify({ studyTarget, checkpoints: parsed.scenarioCheckpoints.length, summary: Boolean(parsed.sharedSummary) }));
    return parsed;
  } catch (error: unknown) {
    console.warn('[DIALOG-MEMORY] disk:read failed', JSON.stringify({ studyTarget, message: error instanceof Error ? error.message : String(error) }));
    return null;
  }
}

export async function writeDialogueV2MemoryDiskCache(memory: DialogueV2MemoryView): Promise<void> {
  const key = cacheKey(memory.studyTarget);
  if (!key) {
    console.log('[DIALOG-MEMORY] disk:write skip — нет активного аккаунта', JSON.stringify({ studyTarget: memory.studyTarget }));
    return;
  }
  try {
    await AsyncStorage.setItem(key, JSON.stringify(memory));
  } catch (error: unknown) {
    console.warn('[DIALOG-MEMORY] disk:write failed', JSON.stringify({ studyTarget: memory.studyTarget, message: error instanceof Error ? error.message : String(error) }));
  }
}

/** «Очистить память» для одного языка: копия текущего аккаунта стирается сразу. */
export async function clearDialogueV2MemoryDiskCache(studyTarget: DialogueV2MemoryStudyTarget): Promise<void> {
  const key = cacheKey(studyTarget);
  if (!key) return;
  try {
    await AsyncStorage.removeItem(key);
    console.log('[DIALOG-MEMORY] disk:cleared', JSON.stringify({ studyTarget }));
  } catch (error: unknown) {
    console.warn('[DIALOG-MEMORY] disk:clear failed', JSON.stringify({ studyTarget, message: error instanceof Error ? error.message : String(error) }));
  }
}

/** Выход / смена аккаунта: стираются копии ВСЕХ аккаунтов и языков. Никогда не бросает — не ломает общую чистку. */
export async function clearAllDialogueV2MemoryDiskCache(): Promise<void> {
  // зачем (dialogs-003): запись пройденных диалогов — такая же локальная копия аккаунта, стирается тем же вызовом при выходе/смене аккаунта
  await clearAllDialogueV2DoneStore();
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(PREFIX));
    if (keys.length > 0) await AsyncStorage.multiRemove(keys);
    console.log('[DIALOG-MEMORY] disk:wipe', JSON.stringify({ removed: keys.length }));
  } catch (error: unknown) {
    console.warn('[DIALOG-MEMORY] disk:wipe failed', JSON.stringify({ message: error instanceof Error ? error.message : String(error) }));
  }
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
