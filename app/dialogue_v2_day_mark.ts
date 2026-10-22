/*
 * «Сегодня диалог засчитан» — лёгкая локальная отметка для состояния day_done «Сцены» «Диалогов».
 *
 * зачем (координатор 22.10): готового источника «диалог засчитан сегодня» на телефоне нет (dialogue_v2_done_store помнит набор пройденных id по языкам,
 * но без даты), поэтому заведена одна дата на аккаунт. Условия:
 *  - хранится ТОЛЬКО локальная дата YYYY-MM-DD (без id сценария, реплик и данных собеседника); сеть и Firestore не участвуют;
 *  - ключ включает область аккаунта (поколение + stableId): другой аккаунт отметку не прочтёт; на диске стирается и переносится общим списком
 *    ACCOUNT_LOCAL_KEY_PREFIXES (app/cloud_sync.ts) — здесь отдельного удаления ключей с диска нет, иначе ломается fail-closed стирание аккаунта;
 *  - Optimistic UI: markDialogueV2DoneToday меняет память и будит экран в тот же кадр, диск догоняет фоном (очередь записей);
 *  - «засчитан» = то же условие, что у «пройдено ✓» (диалог закончил собеседник и у ученика была реплика) — зовёт dialogue_v2_session.tsx.
 * peek: true — сегодня засчитан; false — известно, что нет; null — ещё не известно (диск не читали / аккаунт в переходе): сцена вслепую не решает.
 * Лог: [DIALOG-DAY].
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { captureAccountGeneration } from './account_generation';
import { accountScopeKey } from './account_scope_key';
import { getLocalDayKey } from './local_date';

export const DIALOGUE_V2_DAY_MARK_PREFIX = 'dialogue_v2_day_done_v1:';
const LOG = '[DIALOG-DAY]';
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

const memory = new Map<string, string>();
const hydrated = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;
let writeQueue: Promise<void> = Promise.resolve();

function storageKey(): string | null {
  const scope = accountScopeKey(captureAccountGeneration());
  return scope ? `${DIALOGUE_V2_DAY_MARK_PREFIX}${scope}` : null;
}

function notify(): void {
  version += 1;
  listeners.forEach((listener) => listener());
}

/** Подписка экрана (useSyncExternalStore). */
export function subscribeDialogueV2DoneToday(listener: () => void): () => void {
  listeners.add(listener); // guard-ok: подписка в Set, не запись данных
  return () => { listeners.delete(listener); }; // guard-ok: отписка из Set
}

/** Снимок для useSyncExternalStore: растёт при любом изменении отметки. */
export function getDialogueV2DoneTodayVersion(): number {
  return version;
}

/** Мгновенно, из памяти: true — сегодня засчитан; false — известно, что нет; null — ещё не известно. */
export function peekDialogueV2DoneToday(nowMs: number = Date.now()): boolean | null {
  const key = storageKey();
  if (!key) {
    console.log(`${LOG} peek → неизвестно: аккаунт не активен`); // guard-ok: ранний выход называет причину
    return null;
  }
  const today = getLocalDayKey(new Date(nowMs));
  const stored = memory.get(key);
  if (stored === today) return true;
  // отметки нет в памяти: «нет» только после чтения диска, иначе — не известно
  return hydrated.has(key) ? false : null;
}

/** Прочитать диск ОДИН раз за процесс и слить с памятью (отметка этого запуска свежее). Никогда не бросает. */
export async function hydrateDialogueV2DoneToday(): Promise<boolean | null> {
  const key = storageKey();
  if (!key) {
    console.log(`${LOG} hydrate → пропуск: аккаунт не активен`); // guard-ok: ранний выход называет причину
    return null;
  }
  if (!hydrated.has(key)) {
    try {
      const raw = await AsyncStorage.getItem(key);
      const valid = typeof raw === 'string' && DAY_RE.test(raw) ? raw : null;
      const inMemory = memory.get(key) ?? null;
      // что новее по дате (YYYY-MM-DD сравнивается как строка), то и храним
      const best = valid !== null && (inMemory === null || valid > inMemory) ? valid : inMemory;
      if (best !== null) memory.set(key, best);
      hydrated.add(key);
      console.log(`${LOG} hydrate source=disk raw=${raw === null ? 'нет' : raw} valid=${String(valid)} inMemory=${String(inMemory)} → ${String(best)}`); // guard-ok: что прочитано и что выбрано
      notify();
    } catch (error: unknown) {
      console.warn(`${LOG} hydrate failed message=${error instanceof Error ? error.message : String(error)}`); // guard-ok: catch называет причину
      return peekDialogueV2DoneToday();
    }
  }
  return peekDialogueV2DoneToday();
}

/** Отметить «сегодня диалог засчитан»: память и экран — сразу, диск — фоном. Повтор в тот же день безвреден. */
export function markDialogueV2DoneToday(nowMs: number = Date.now()): boolean {
  const key = storageKey();
  if (!key) {
    console.warn(`${LOG} mark → отклонено: аккаунт не активен (переход)`); // guard-ok: ранний выход называет причину
    return false;
  }
  const today = getLocalDayKey(new Date(nowMs));
  if (memory.get(key) === today) {
    console.log(`${LOG} mark → уже отмечен day=${today}`); // guard-ok: ранний выход называет причину
    return true;
  }
  memory.set(key, today);
  hydrated.add(key); // сегодняшнюю дату мы знаем точно; прежняя запись на диске нас больше не интересует
  console.log(`${LOG} mark day=${today} (память обновлена, диск — фоном)`); // guard-ok: единственная строка на отметку
  notify();
  writeQueue = writeQueue.then(async () => {
    try {
      await AsyncStorage.setItem(key, memory.get(key) ?? today);
      console.log(`${LOG} persist ok day=${today}`); // guard-ok: итог записи
    } catch (error: unknown) {
      console.warn(`${LOG} persist failed day=${today} message=${error instanceof Error ? error.message : String(error)} (в памяти отметка осталась)`); // guard-ok: catch называет причину
    }
  });
  return true;
}

/** Только для тестов. */
export function resetDialogueV2DayMarkForTests(): void {
  memory.clear();
  hydrated.clear();
  version = 0;
  writeQueue = Promise.resolve();
}
