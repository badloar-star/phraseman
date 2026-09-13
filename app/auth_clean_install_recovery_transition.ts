import AsyncStorage from '@react-native-async-storage/async-storage';

// зачем (владелец, 2026-09-13): «сперва логи». Этот модуль — ОДИН общий вход и
// для выхода из аккаунта, и для удаления (auth_provider.ts:2944 и :3244). Отказ
// здесь раньше был полностью нем: вызывающий получал голый throw и превращал его
// в 'clean_recovery_transition_active' без единой строчки о том, ЧТО именно
// держало замок. Логируем причину со ЗНАЧЕНИЯМИ (какой ключ, какая фаза, когда
// истекает) — без содержимого журнала, там PII.
const ACC_MUT = '[ACC-MUT]';

/** Описание ключа для лога: есть/нет, фаза и срок — но НЕ содержимое. */
function describeGuardRow(key: string, raw: string | null, now: number): string {
  if (raw === null) return `${key}=absent`;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    const phase = typeof value.phase === 'string' ? value.phase : 'n/a';
    const expiresAt = typeof value.expiresAt === 'number' ? value.expiresAt : null;
    const expiresIn = expiresAt === null ? 'n/a' : `${Math.round((expiresAt - now) / 1000)}s`;
    // TTL есть ТОЛЬКО у request-intent; два жёстких ключа живут вечно — это и
    // есть подозреваемый «вечный замок», поэтому печатаем признак явно.
    const hard = key !== REQUEST_INTENT_KEY;
    return `${key}={phase:${phase},expiresIn:${expiresIn},hardNoTtl:${hard},bytes:${raw.length}}`;
  } catch {
    return `${key}=unparsable(bytes:${raw.length})`;
  }
}

function logGuardBlock(stage: string, rows: readonly (readonly [string, string | null])[], now: number): void {
  const detail = rows.map(([key, raw]) => describeGuardRow(key, raw, now)).join(' ');
  const line = `${ACC_MUT} guard_block stage=${stage} owners=${activeOwners} reservations=${accountMutationReservations} ${detail}`;
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn(line); // guard-ok: под __DEV__
  // Критично: этот отказ блокирует выход И удаление аккаунта у живого человека,
  // а до владельца он не доходил вообще. 'critical' — единственный канал, который
  // реально пишется в Firestore (см. app/debug-logger.ts).
  //
  // зачем через sink, а не прямой импорт: этот модуль — низкоуровневый замок,
  // и его тянут юнит-тесты с минимальным моком AsyncStorage (getItem/multiGet).
  // Прямой импорт DebugLogger подтягивал app_health → AsyncStorage.setItem и
  // ронял сторож незакрываемым unhandled rejection. Замок обязан оставаться
  // без зависимостей; приложение подключает настоящий канал на старте.
  const sink = criticalSink;
  if (!sink) return;
  try {
    sink('acc_mut:guard_block', line);
  } catch (sinkError) {
    // Немой catch запрещён правилом владельца: даже отказ самого канала
    // обязан оставить след, иначе диагностика снова станет невидимой.
    if (typeof __DEV__ !== 'undefined' && __DEV__) { // guard-ok: под __DEV__
      console.warn(`${ACC_MUT} guard_block_sink_failed reason=${String((sinkError as any)?.message ?? sinkError)}`);
    }
  }
}

/**
 * Канал критичных отказов замка. Приложение подключает его один раз на старте
 * (см. app/auth_provider.ts), тесты оставляют пустым — так модуль не тянет за
 * собой ни AsyncStorage, ни Crashlytics.
 */
let criticalSink: ((context: string, line: string) => void) | null = null;

export function setCleanInstallRecoveryGuardCriticalSink(
  sink: ((context: string, line: string) => void) | null,
): void {
  criticalSink = sink;
}

const HARD_DURABLE_GUARD_KEYS = [
  'auth_clean_install_recovery_v1',
  'auth_clean_install_recovery_adoption_v1',
] as const;
const REQUEST_INTENT_KEY = 'auth_clean_install_recovery_request_intent_v1';
const DURABLE_GUARD_KEYS = [...HARD_DURABLE_GUARD_KEYS, REQUEST_INTENT_KEY] as const;

let activeOwners = 0;
let accountMutationReservations = 0;

function requestIntentIsActive(raw: string | null, now: number): boolean {
  if (raw === null) return false;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return true;
    const createdAt = value.createdAt;
    const expiresAt = value.expiresAt;
    const guardExpiresAt = value.guardExpiresAt ?? expiresAt;
    if (
      typeof createdAt !== 'number' || !Number.isInteger(createdAt)
      || typeof expiresAt !== 'number' || !Number.isInteger(expiresAt)
      || typeof guardExpiresAt !== 'number' || !Number.isInteger(guardExpiresAt)
      || expiresAt <= createdAt
      || guardExpiresAt < createdAt
      || guardExpiresAt > expiresAt
    ) return true;
    return expiresAt > now && guardExpiresAt > now;
  } catch {
    return true;
  }
}

function durableRecoveryStateIsActive(
  rows: readonly (readonly [string, string | null])[],
  getNow: () => number,
): boolean {
  for (const [key, raw] of rows) {
    if (raw === null) continue;
    if (key !== REQUEST_INTENT_KEY || requestIntentIsActive(raw, getNow())) return true;
  }
  return false;
}

async function readDurableGuardRows(): Promise<readonly (readonly [string, string | null])[]> {
  try {
    return await AsyncStorage.multiGet([...DURABLE_GUARD_KEYS]);
  } catch {
    throw new Error('clean_recovery_transition_guard_unavailable');
  }
}

/** Returns an idempotent release handle shared by coordinator and adoption. */
export function beginCleanInstallRecoveryTransition(): () => void {
  if (accountMutationReservations > 0) {
    throw new Error('clean_recovery_account_transition_active');
  }
  activeOwners += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeOwners = Math.max(0, activeOwners - 1);
  };
}

export function isCleanInstallRecoveryTransitionActive(): boolean {
  return activeOwners > 0;
}

/** Account sign-in/switch/delete must fail closed while memory or durable recovery state exists. */
export async function assertNoCleanInstallRecoveryTransition(): Promise<void> {
  if (isCleanInstallRecoveryTransitionActive() || accountMutationReservations > 0) {
    throw new Error('clean_recovery_transition_active');
  }
  const rows = await readDurableGuardRows();
  if (
    isCleanInstallRecoveryTransitionActive()
    || accountMutationReservations > 0
    || durableRecoveryStateIsActive(rows, Date.now)
  ) {
    throw new Error('clean_recovery_transition_active');
  }
}

/**
 * Exclusively reserves a sign-out/delete transition before the async durable
 * guard read. Recovery owners check the same counter synchronously, closing the
 * check-then-await race in both arrival orders. The caller must release in a
 * finally block after the whole account mutation has settled.
 */
export async function reserveCleanInstallRecoveryAccountTransition(
  now?: number,
): Promise<() => void> {
  if (isCleanInstallRecoveryTransitionActive() || accountMutationReservations > 0) {
    // Ранний выход #1: держит ПАМЯТЬ процесса (чужая операция прямо сейчас).
    logGuardBlock('memory_busy', [], now ?? Date.now());
    throw new Error('clean_recovery_transition_active');
  }
  accountMutationReservations += 1;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    accountMutationReservations = Math.max(0, accountMutationReservations - 1);
  };
  try {
    const rows = await readDurableGuardRows();
    if (
      isCleanInstallRecoveryTransitionActive()
      || durableRecoveryStateIsActive(rows, () => now ?? Date.now())
    ) {
      // Ранний выход #2 — ГЛАВНЫЙ подозреваемый: на диске лежит durable-ключ.
      // У двух из трёх ключей нет TTL, поэтому оборванная попытка блокирует
      // выход и удаление НАВСЕГДА. Лог печатает, какой именно ключ виноват.
      logGuardBlock('durable_guard', rows, now ?? Date.now());
      throw new Error('clean_recovery_transition_active');
    }
    return release;
  } catch (error) {
    release();
    // Сюда же попадает 'clean_recovery_transition_guard_unavailable' — отказ
    // самого AsyncStorage. Раньше он был неотличим от занятого замка.
    const reason = error instanceof Error ? error.message : String(error);
    if (reason !== 'clean_recovery_transition_active') {
      logGuardBlock(`throw:${reason}`, [], now ?? Date.now());
    }
    throw error;
  }
}
