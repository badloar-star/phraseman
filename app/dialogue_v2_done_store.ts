/*
 * «Пройденные диалоги» на устройстве — источник статуса «пройдено ✓» и счётчика «N / всего» в хабе «Диалоги» (макет dialogs.html A4).
 *
 * зачем (координатор 12.10, dialogs-003): проекция каталога выдавала только available|locked, поэтому «пройдено» в хабе всегда было нулём.
 * Прежний dialogue_v2_session_outcome_store держит итоги только в памяти процесса (4 последние сессии) и ничего не помнит между запусками, поэтому здесь —
 * отдельная маленькая запись id пройденных сценариев. Условия:
 *  - хранится ТОЛЬКО id сценария из общего каталога (без реплик, без данных собеседников); никаких чтений и записей Firestore, облако — после R1;
 *  - ключ включает аккаунт (поколение + uid): другой аккаунт запись не прочтёт; стирается при выходе и смене аккаунта (clearAllDialogueV2MemoryDiskCache);
 *  - Optimistic UI: markDialogueV2Done меняет память и будит хаб В ТОТ ЖЕ КАДР, диск догоняет фоном (очередь записей, без гонок «прочитал-записал»);
 *  - «пройден» = диалог закончил собеседник (endedBy = bot) и у ученика была реплика (условие вызывает dialogue_v2_session.tsx).
 * Лог: [DIALOG-DONE].
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { captureAccountGeneration } from './account_generation';
import { accountScopeKey } from './account_scope_key';

const PREFIX = 'dialogue_v2_done_v1:';
const LOG = '[DIALOG-DONE]';
const SCENARIO_RE = /^(?=.{1,64}$)[a-z0-9]+(?:_[a-z0-9]+)*$/;

const memory = new Map<string, Set<string>>();
const hydrated = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;
let writeQueue: Promise<void> = Promise.resolve();

function storageKey(studyTarget: string): string | null {
  const scope = accountScopeKey(captureAccountGeneration());
  return scope ? `${PREFIX}${scope}:${studyTarget}` : null;
}

function notify(): void {
  version += 1;
  listeners.forEach((listener) => listener());
}

/** Подписка хаба (useSyncExternalStore). */
export function subscribeDialogueV2Done(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Снимок для useSyncExternalStore: растёт при любом изменении набора. */
export function getDialogueV2DoneVersion(): number {
  return version;
}

const EMPTY: ReadonlySet<string> = new Set<string>();

/** Мгновенно, из памяти процесса (без диска): что известно о пройденных сценариях этого языка на этом аккаунте. */
export function peekDialogueV2DoneIds(studyTarget: string): ReadonlySet<string> {
  const key = storageKey(studyTarget);
  if (!key) {
    console.log(`${LOG} peek → пусто: аккаунт не активен target=${studyTarget}`); // guard-ok: ранний выход называет причину
    return EMPTY;
  }
  return memory.get(key) ?? EMPTY;
}

/** Прочитать запись с диска ОДИН раз за процесс по готовому ключу и слить с памятью (память свежее). Никогда не бросает. */
async function readKeyIntoMemory(key: string, studyTarget: string): Promise<ReadonlySet<string>> {
  if (hydrated.has(key)) return memory.get(key) ?? EMPTY;
  try {
    const raw = await AsyncStorage.getItem(key);
    const parsed: unknown = raw === null ? [] : JSON.parse(raw);
    const ids = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string' && SCENARIO_RE.test(item)) : [];
    const current = memory.get(key) ?? new Set<string>();
    const before = current.size;
    ids.forEach((id) => current.add(id));
    memory.set(key, current);
    hydrated.add(key);
    console.log(`${LOG} hydrate source=disk target=${studyTarget} raw=${raw === null ? 'нет' : `${raw.length} симв.`} прочитано=${ids.length} было_в_памяти=${before} стало=${current.size}`); // guard-ok: итог чтения
    if (current.size !== before) notify();
    return current;
  } catch (error: unknown) {
    console.warn(`${LOG} hydrate failed target=${studyTarget} message=${error instanceof Error ? error.message : String(error)}`); // guard-ok: catch называет причину
    return memory.get(key) ?? EMPTY;
  }
}

/** Для хаба: прочитать диск (один раз за процесс) и вернуть набор. */
export async function hydrateDialogueV2DoneIds(studyTarget: string): Promise<ReadonlySet<string>> {
  const key = storageKey(studyTarget);
  if (!key) {
    console.log(`${LOG} hydrate → пропуск: аккаунт не активен target=${studyTarget}`); // guard-ok: ранний выход называет причину
    return EMPTY;
  }
  return readKeyIntoMemory(key, studyTarget);
}

/** Отметить сценарий пройденным: память и хаб — сразу, диск — фоном. Повтор безвреден. */
export function markDialogueV2Done(studyTarget: string, scenarioId: string): boolean {
  if (!SCENARIO_RE.test(scenarioId)) {
    console.warn(`${LOG} mark → отклонено: неверный id сценария scenarioId=${scenarioId} target=${studyTarget}`); // guard-ok: ранний выход называет причину
    return false;
  }
  const key = storageKey(studyTarget);
  if (!key) {
    console.warn(`${LOG} mark → отклонено: аккаунт не активен (переход), scenarioId=${scenarioId} target=${studyTarget}`); // guard-ok: ранний выход называет причину
    return false;
  }
  const current = memory.get(key) ?? new Set<string>();
  if (current.has(scenarioId)) {
    console.log(`${LOG} mark → уже отмечен scenarioId=${scenarioId} target=${studyTarget} всего=${current.size}`); // guard-ok: ранний выход называет причину
    return true;
  }
  current.add(scenarioId);
  memory.set(key, current);
  console.log(`${LOG} mark scenarioId=${scenarioId} target=${studyTarget} всего=${current.size} (память обновлена, диск — фоном)`); // guard-ok: единичный лог на отметку
  notify();
  writeQueue = writeQueue.then(async () => {
    try {
      // зачем: если диск ещё не читали (отметка раньше открытия хаба), сначала сливаем его в память — иначе запись затёрла бы прежние прохождения
      await readKeyIntoMemory(key, studyTarget);
      // зачем: запись — из ТЕКУЩЕЙ памяти, а не из прочитанного ранее: подряд идущие отметки не затирают друг друга
      const snapshot = [...(memory.get(key) ?? [])].sort();
      await AsyncStorage.setItem(key, JSON.stringify(snapshot));
      console.log(`${LOG} persist ok target=${studyTarget} записано=${snapshot.length}`); // guard-ok: итог записи
    } catch (error: unknown) {
      console.warn(`${LOG} persist failed target=${studyTarget} scenarioId=${scenarioId} message=${error instanceof Error ? error.message : String(error)} (в памяти отметка остаётся до перезапуска)`); // guard-ok: catch называет причину
    }
  });
  return true;
}

/** Выход / смена аккаунта: стираются записи ВСЕХ аккаунтов и языков, память тоже. Никогда не бросает. */
export async function clearAllDialogueV2DoneStore(): Promise<void> {
  memory.clear();
  hydrated.clear();
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(PREFIX));
    if (keys.length > 0) await AsyncStorage.multiRemove(keys);
    console.log(`${LOG} wipe removed=${keys.length}`); // guard-ok: итог чистки
  } catch (error: unknown) {
    console.warn(`${LOG} wipe failed message=${error instanceof Error ? error.message : String(error)}`); // guard-ok: catch называет причину
  }
  notify();
}

/** Только для тестов. */
export function resetDialogueV2DoneStoreForTests(): void {
  memory.clear();
  hydrated.clear();
  version = 0;
  writeQueue = Promise.resolve();
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}
