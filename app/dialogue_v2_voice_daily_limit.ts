// ═════════════════════════════════════════════════════════════════════
// dialogue_v2_voice_daily_limit.ts — дневной лимит голосового ввода в Диалогах для Free (решение владельца 12.10, D-строка в 03_DECISIONS).
//
// зачем: владелец выбрал вариант А (макет dialogs.html C15, dialogs-028): Free — 3 голосовые попытки в день, после третьей на
// микрофоне бейдж PLUS и тап ведёт в Plus; у Plus лимита нет. Попытка = НАЧАТАЯ запись (отмена до старта не считается).
// Счётчик локальный (AsyncStorage по локальной дате) — ни чтений, ни записей Firebase; новых данных о человеке нет.
// Optimistic: счётчик меняется в памяти сразу, запись на диск догоняет фоном; провал записи пишет причину.
// ═════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';

import { isDevDialogVoiceSpent } from './dev_dialog_state';
import { getLocalDayKey } from './local_date';
import { onAccountOwnerChanged } from './account_owner_change';

export const FREE_DIALOG_VOICE_DAILY_LIMIT = 3;
export const DIALOG_VOICE_ATTEMPTS_KEY = 'dialogue_v2_voice_attempts_v1';
const LOG = '[DIALOG-VOICE]';

export type DialogVoiceAttempts = Readonly<{ day: string; count: number }>;
export type DialogVoiceLimitDecision = 'plus_unlimited' | 'access_unknown' | 'under_limit' | 'limit_reached';

/** Локальная дата устройства (общий помощник app/local_date): лимит обнуляется в полночь человека, а не по UTC. */
function localDayKey(nowMs: number): string {
  return getLocalDayKey(new Date(nowMs));
}

let memory: DialogVoiceAttempts | null = null;
let hydrated = false;
// зачем (Ревизор 15.10 🔴): параллельные гидрации (каждый значок микрофона, два хука на экране) складывали диск дважды — 1→2, 2→4.
// Теперь ОДНО общее чтение диска на процесс, а списания до него копятся отдельно и прибавляются к диску ровно один раз.
let hydratePromise: Promise<number> | null = null;
let earlyAttempts: DialogVoiceAttempts | null = null;
let ownerGeneration = 0;
const listeners = new Set<() => void>();
// зачем (координатор 15.10, LOGOUT_WIPE_AUDIT 🔴): кэш в памяти принадлежит владельцу — при смене аккаунта без перезапуска JS B видел данные A.
onAccountOwnerChanged('dialog_voice_attempts', () => {
  memory = null;
  hydrated = false;
  hydratePromise = null;
  earlyAttempts = null;
  ownerGeneration += 1;
  emit();
});

function emit(): void {
  for (const listener of listeners) listener();
}

/** Счётчик на сегодня из памяти; запись за другой день — это ноль (переход даты). */
export function peekDialogVoiceAttempts(nowMs: number = Date.now()): number {
  const today = localDayKey(nowMs);
  return memory && memory.day === today ? memory.count : 0;
}

function parse(raw: string | null): DialogVoiceAttempts | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<DialogVoiceAttempts>;
    if (typeof value.day !== 'string' || typeof value.count !== 'number' || !Number.isFinite(value.count) || value.count < 0) {
      console.warn(`${LOG} storage:invalid_shape ${JSON.stringify({ bytes: raw.length })}`);
      return null;
    }
    return { day: value.day, count: Math.floor(value.count) };
  } catch (error) {
    console.warn(`${LOG} storage:parse_failed ${JSON.stringify({ bytes: raw.length, error: error instanceof Error ? error.message : String(error) })}`);
    return null;
  }
}

/**
 * Один раз за процесс (и за владельца) подтягивает счётчик с диска. Все параллельные вызовы получают ОДНО и то же чтение.
 * Итог = диск + попытки, списанные ДО чтения (они на диск не писались), — ровно один раз.
 */
export function hydrateDialogVoiceAttempts(nowMs: number = Date.now()): Promise<number> {
  if (hydrated) return Promise.resolve(peekDialogVoiceAttempts(nowMs));
  if (hydratePromise) {
    console.log(`${LOG} hydrate:joined ${JSON.stringify({ generation: ownerGeneration })}`);
    return hydratePromise;
  }
  const generation = ownerGeneration;
  const run = (async (): Promise<number> => {
    let stored: DialogVoiceAttempts | null = null;
    try {
      stored = parse(await AsyncStorage.getItem(DIALOG_VOICE_ATTEMPTS_KEY));
    } catch (error) {
      console.warn(`${LOG} storage:read_failed ${JSON.stringify({ error: error instanceof Error ? error.message : String(error) })}`);
    }
    if (generation !== ownerGeneration) {
      // Владелец сменился, пока читали диск: это чтение — чужое, его итог не применяем.
      console.log(`${LOG} hydrate:stale_owner ${JSON.stringify({ generation, current: ownerGeneration })}`);
      return peekDialogVoiceAttempts(nowMs);
    }
    hydrated = true;
    const today = localDayKey(nowMs);
    const fromDisk = stored && stored.day === today ? stored.count : 0;
    // зачем (аудит Optimistic UI 15.10): попытки до чтения диска на диск не писались — прибавляем их к диску один раз.
    // Прежний max(диск, память) терял попытки (2 + 1 = 2), а сложение без общего чтения удваивало диск при параллельных вызовах.
    const fromEarly = earlyAttempts && earlyAttempts.day === today ? earlyAttempts.count : 0;
    earlyAttempts = null;
    memory = { day: today, count: fromDisk + fromEarly };
    const snapshot = memory;
    console.log(`${LOG} hydrate ${JSON.stringify({ day: today, fromDisk, fromEarly, count: snapshot.count, storedDay: stored?.day ?? null })}`);
    if (fromEarly > 0) {
      void AsyncStorage.setItem(DIALOG_VOICE_ATTEMPTS_KEY, JSON.stringify(snapshot)).catch((error: unknown) => {
        console.warn(`${LOG} storage:write_failed ${JSON.stringify({ count: snapshot.count, phase: 'hydrate_merge', error: error instanceof Error ? error.message : String(error) })}`);
      });
    }
    emit();
    return snapshot.count;
  })();
  hydratePromise = run;
  return run;
}

/** Решение о лимите со значением, которое его решило. Plus и «доступ ещё неизвестен» — без ограничений (Plus не должен увидеть бейдж из-за медленной проверки). */
export function dialogVoiceLimitDecision(input: Readonly<{ accessResolved: boolean; hasPremiumAccess: boolean; count: number }>): DialogVoiceLimitDecision {
  if (isDevDialogVoiceSpent()) return 'limit_reached';
  if (input.hasPremiumAccess) return 'plus_unlimited';
  if (!input.accessResolved) return 'access_unknown';
  return input.count >= FREE_DIALOG_VOICE_DAILY_LIMIT ? 'limit_reached' : 'under_limit';
}

/** Засчитывает начатую запись: память сразу (UI видит новый счётчик в том же кадре), диск — фоном. */
export function recordDialogVoiceAttempt(nowMs: number = Date.now()): number {
  const today = localDayKey(nowMs);
  const before = memory && memory.day === today ? memory.count : 0;
  memory = { day: today, count: before + 1 };
  const snapshot = memory;
  console.log(`${LOG} attempt:recorded ${JSON.stringify({ day: today, before, count: snapshot.count, limit: FREE_DIALOG_VOICE_DAILY_LIMIT })}`);
  emit();
  if (!hydrated) {
    // зачем: диск ещё не прочитан — запись «1» затёрла бы сохранённые попытки до их прочтения; гидрация сложит и запишет сама.
    const earlyBefore = earlyAttempts && earlyAttempts.day === today ? earlyAttempts.count : 0;
    earlyAttempts = { day: today, count: earlyBefore + 1 };
    console.log(`${LOG} storage:deferred_until_hydrate ${JSON.stringify({ count: snapshot.count, early: earlyAttempts.count })}`);
    return snapshot.count;
  }
  void AsyncStorage.setItem(DIALOG_VOICE_ATTEMPTS_KEY, JSON.stringify(snapshot)).catch((error: unknown) => {
    // Откатывать нечего: запись уже началась. После перезапуска счётчик может оказаться меньше — причина в журнале.
    console.warn(`${LOG} storage:write_failed ${JSON.stringify({ count: snapshot.count, error: error instanceof Error ? error.message : String(error) })}`);
  });
  return snapshot.count;
}

/** Прочитан ли счётчик с диска в этом процессе. зачем (D194): до чтения цифру на микрофоне не рисуем — иначе «3» мигнёт в «1». */
export function isDialogVoiceAttemptsHydrated(): boolean {
  return hydrated;
}

export function subscribeDialogVoiceAttempts(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Только для тестов. */
export function resetDialogVoiceAttemptsForTests(): void {
  memory = null;
  hydrated = false;
  hydratePromise = null;
  earlyAttempts = null;
  ownerGeneration += 1;
  listeners.clear();
}
