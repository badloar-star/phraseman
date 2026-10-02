/**
 * Отложенная проверка целостности PhoneState (координатор §84, Q118, 02.10).
 *
 * зачем: `PRAGMA cipher_integrity_check` читает и сверяет подпись КАЖДОЙ страницы файла —
 * на холодном старте это 2,4 с из 7,95 с открытия (трасса «Дизайна», Pixel_8). Чужой ключ
 * на старте по-прежнему ловят чтение sqlite_master (NOTADB) и проба записи через WAL, а
 * полную проверку делаем в фоне: ≥30 с после кадра Главной, не во время урока/тренировки,
 * не чаще раза в сутки и при смене версии. Порча → флаг → на СЛЕДУЮЩЕМ старте база
 * пересоздаётся ДО открытия (тот же путь, что §75: данные возвращают локальное хранилище и
 * облако). Цена решения: частичная порча обнаруживается на один запуск позже.
 *
 * Хранилище инъектируется (AsyncStorage в приложении, Map в тестах). Ключи — по scope
 * аккаунта (stableUid + поколение), чтобы флаг одного аккаунта не стёр базу другого.
 */
import { isWholeFileKeyMismatch } from './database';

export interface DeferredIntegrityStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface DeferredIntegrityScope {
  readonly stableUid: string;
  readonly accountGeneration: string | number;
}

export interface IntegrityCheckDatabase {
  getAllAsync(sql: string): Promise<Array<{ cipher_integrity_check?: unknown }>>;
}

export const DEFERRED_INTEGRITY_DELAY_MS = 30_000;
export const DEFERRED_INTEGRITY_BUSY_RETRY_MS = 60_000;
export const DEFERRED_INTEGRITY_MIN_INTERVAL_MS = 24 * 60 * 60 * 1000;

const PREFIX = '[PHONE-STATE-DB] deferred_integrity';
const RESET_FLAG_KEY = 'phone_state_integrity_reset_pending_v1';
const LAST_CHECK_KEY = 'phone_state_integrity_last_check_v1';

function scopeKey(base: string, scope: DeferredIntegrityScope): string {
  return `${base}:${scope.stableUid}:${String(scope.accountGeneration)}`;
}

function reasonOf(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}`.slice(0, 200) : String(error).slice(0, 200);
}

/** Есть ли отложенный приговор «база испорчена» для этого аккаунта. Сбой чтения — «нет» с логом. */
export async function isIntegrityResetPending(
  storage: DeferredIntegrityStorage,
  scope: DeferredIntegrityScope,
): Promise<boolean> {
  try {
    const raw = await storage.getItem(scopeKey(RESET_FLAG_KEY, scope));
    console.log(`${PREFIX}:flag_read pending=${raw !== null}`);
    return raw !== null;
  } catch (error) {
    console.warn(`${PREFIX}:flag_read_failed — открываем как обычно`, reasonOf(error));
    return false;
  }
}

/** Снять флаг — только ПОСЛЕ успешного пересоздания, иначе приговор потеряется. */
export async function clearIntegrityResetFlag(
  storage: DeferredIntegrityStorage,
  scope: DeferredIntegrityScope,
): Promise<void> {
  try {
    await storage.removeItem(scopeKey(RESET_FLAG_KEY, scope));
    console.log(`${PREFIX}:flag_cleared`);
  } catch (error) {
    console.warn(`${PREFIX}:flag_clear_failed — пересоздание повторится на следующем старте`, reasonOf(error));
  }
}

type LastCheck = Readonly<{ atMs: number; appVersion: string }>;

export function deferredIntegrityDue(
  last: LastCheck | null,
  nowMs: number,
  appVersion: string,
): Readonly<{ due: boolean; reason: string }> {
  if (!last) return { due: true, reason: 'never_checked' };
  if (last.appVersion !== appVersion) return { due: true, reason: `version_changed:${last.appVersion}->${appVersion}` };
  const ageMs = nowMs - last.atMs;
  if (!(ageMs >= 0) || ageMs >= DEFERRED_INTEGRITY_MIN_INTERVAL_MS) return { due: true, reason: `age_ms=${ageMs}` };
  return { due: false, reason: `checked_${Math.round(ageMs / 60_000)}min_ago` };
}

async function readLastCheck(storage: DeferredIntegrityStorage, scope: DeferredIntegrityScope): Promise<LastCheck | null> {
  try {
    const raw = await storage.getItem(scopeKey(LAST_CHECK_KEY, scope));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LastCheck>;
    if (typeof parsed.atMs !== 'number' || typeof parsed.appVersion !== 'string') return null;
    return { atMs: parsed.atMs, appVersion: parsed.appVersion };
  } catch (error) {
    console.warn(`${PREFIX}:last_check_read_failed — считаем «не проверялась»`, reasonOf(error));
    return null;
  }
}

export type DeferredIntegrityOutcome = 'clean' | 'corrupt' | 'not_due' | 'failed';

/** Полная проверка на уже открытом соединении. Никогда не бросает — итог и причина в логе. */
export async function runDeferredIntegrityCheck(input: Readonly<{
  database: IntegrityCheckDatabase;
  scope: DeferredIntegrityScope;
  storage: DeferredIntegrityStorage;
  appVersion: string;
  nowMs?: number;
}>): Promise<DeferredIntegrityOutcome> {
  const nowMs = input.nowMs ?? Date.now();
  const last = await readLastCheck(input.storage, input.scope);
  const due = deferredIntegrityDue(last, nowMs, input.appVersion);
  console.log(`${PREFIX}:due=${due.due} reason=${due.reason}`);
  if (!due.due) return 'not_due';
  const startedAt = Date.now();
  let rows: Array<{ cipher_integrity_check?: unknown }>;
  try {
    rows = await input.database.getAllAsync('PRAGMA cipher_integrity_check');
  } catch (error) {
    // Отметку не пишем: проверка не состоялась, повторим на следующем старте.
    console.warn(`${PREFIX}:check_failed за ${Date.now() - startedAt}мс`, reasonOf(error));
    return 'failed';
  }
  const tookMs = Date.now() - startedAt;
  try {
    await input.storage.setItem(
      scopeKey(LAST_CHECK_KEY, input.scope),
      JSON.stringify({ atMs: nowMs, appVersion: input.appVersion }),
    );
  } catch (error) {
    console.warn(`${PREFIX}:last_check_write_failed — проверка повторится раньше суток`, reasonOf(error));
  }
  if (rows.length === 0) {
    console.log(`${PREFIX}:clean за ${tookMs}мс`);
    return 'clean';
  }
  console.warn(`${PREFIX}:corrupt rows=${rows.length} keyMismatch=${isWholeFileKeyMismatch(rows)} за ${tookMs}мс`, JSON.stringify({
    first: rows.slice(0, 5).map((row) => String(row?.cipher_integrity_check ?? '').slice(0, 200)),
  }));
  try {
    await input.storage.setItem(scopeKey(RESET_FLAG_KEY, input.scope), String(nowMs));
    console.warn(`${PREFIX}:flag_set — база будет пересоздана до открытия на следующем старте`);
  } catch (error) {
    console.warn(`${PREFIX}:flag_set_failed — порча не будет вылечена автоматически`, reasonOf(error));
  }
  return 'corrupt';
}
