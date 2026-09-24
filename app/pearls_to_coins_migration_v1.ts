/**
 * PM-059 (D15/D45/D53): остаток жемчуга → монеты по курсу 1:10.
 *
 * зачем (владелец 2026-09-24): жемчуг уходит из 2.0 (магазин закрыт PM-057,
 * бесплатная выдача остановлена PM-058). Весь ТЕКУЩИЙ баланс жемчуга человека
 * молча (без окон и фанфар) превращается в монеты ×10. Пока монеты = руны
 * (до PM-069), зачисление идёт в рунный кошелёк тем же путём, что и миграция
 * подарков (enqueueLevelSpinStarGrant, номиналы stars_*).
 *
 * Это ОТДЕЛЬНАЯ от gifts_to_coins миграция: там предметы, здесь баланс.
 * Порядок между ними не важен — у них разные ключи начисления (g2c1_* и
 * p2c1_*), а кошелёк сериализует записи под своим замком.
 *
 * Журнал (WAL) на аккаунт, ключ `pearls_to_coins_v1:<owner>` (account-local:
 * путешествует с кошельком при смене аккаунта):
 *
 *   planned → debited → credited → done      (или aborted, если баланс ушёл)
 *
 * ПОЧЕМУ СНАЧАЛА СПИСАНИЕ, ПОТОМ МОНЕТЫ (наоборот, чем у подарков): жемчуг —
 * живой баланс, его можно потратить в любую секунду. Если зачислить монеты
 * первыми, а списание упрётся в «не хватает» (человек успел потратить), монеты
 * уже не забрать — двойная выплата. Списание первым безопасно, потому что план
 * (сумма, номиналы, requestId) заморожен в WAL и в квитанции внутри журнала
 * жемчуга: зачисление повторяется до успеха и схлопывается кошельком.
 *
 * 1. План: баланс и «якорь» журнала жемчуга (ревизия + id последней операции)
 *    читаются под замками одним снимком. Сумма списания = ИМЕННО этот баланс,
 *    а не «весь баланс в момент списания»: пришедший параллельно жемчуг
 *    останется и уйдёт следующим прогоном; ушедший — даст 'insufficient' и
 *    перепланирование, но никогда не спишет больше, чем оплачено монетами.
 * 2. Ключи детерминированы от (владелец, якорь, сумма) — без времени: повтор,
 *    офлайн и второе устройство с тем же журналом получают тот же id операции
 *    списания и те же requestId монет → дубль схлопывается. Новый прогон после
 *    нового жемчуга имеет другой якорь → другие ключи.
 * 3. Списание — commitShardBalanceMigrationDebit (неизменяемый журнал,
 *    идемпотентен по id). Квитанция (сумма, курс, монеты, id) пишется ДО
 *    операции списания — юридический след «куда делся жемчуг».
 * 4. Монеты — номиналы через кошелёк, прогресс в WAL после каждой операции.
 *    `excluded_compensation` — не умножается «Супер-воскресеньем».
 * 5. Строка-итог на сервер — отдельно, ретраится, миграцию не держит.
 *    ⚠️ Серверная функция pearlsToCoinsMigrationReport ТРЕБУЕТ ДЕПЛОЯ с согласия
 *    владельца; до деплоя отчёт просто копит попытки (до 20) и сдаётся.
 *
 * Округление: жемчуг — целое число (parseShardBalance делает floor), значит
 * pearls × 10 всегда кратно 10 и ровно раскладывается на номиналы. roundCoinsUp
 * стоит страховкой (вверх, в пользу человека) и на целых ничего не меняет.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { InteractionManager } from 'react-native';

import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';
import { DebugLogger } from './debug-logger';
import { clientShardLedgerStateStorageKey } from './economy/client_shard_operation_ledger';
import {
  coinDenominationGiftIds,
  PEARL_TO_COIN_RATE,
  roundCoinsUp,
} from './gifts_to_coins_table_v1';
import { getRemoteBool } from './remote_flags';
import { withStorageLock } from './storage_mutex';

export const PEARLS_TO_COINS_WAL_PREFIX = 'pearls_to_coins_v1:';
export const PEARLS_TO_COINS_RECEIPT_PREFIX = 'pearls_to_coins_receipt_v1:';
export const PEARLS_TO_COINS_MIGRATION_VERSION = 'p2c.v1' as const;
export const PEARLS_TO_COINS_DEBIT_REASON = 'pearls_to_coins_migration';
/**
 * Отложенный старт: не на первом кадре (инцидент 22.09 «работа на старте») и
 * не в ту же секунду, что миграция подарков (15 с) — меньше толкотни за замки.
 */
export const PEARLS_TO_COINS_START_DELAY_MS = 18_000;
/** 1000 × stars_2000 = 2 млн монет (200 000 жемчуга): выше — подозрение на порчу, в поддержку. */
export const PEARLS_TO_COINS_MAX_GRANT_OPS = 1_000;
const MAX_REPORT_ATTEMPTS = 20;
const MAX_REPLANS_PER_RUN = 1;
const LOG = '[PEARLS-TO-COINS]';

/** Ключ, которого нет в журнале жемчуга до первой операции: снимок «открывающего» баланса. */
const LEGACY_BALANCE_KEY = 'shards_balance';

export type PearlsToCoinsPhase = 'planned' | 'debited' | 'credited' | 'done' | 'aborted';

export type PearlsToCoinsHistoryEntry = Readonly<{
  run: number;
  outcome: 'done' | 'aborted';
  pearls: number;
  totalCoins: number;
  operationId: string;
  plannedAtMs: number;
  debitedAtMs?: number;
  finishedAtMs: number;
  abortReason?: string;
}>;

export type PearlsToCoinsWal = Readonly<{
  schemaVersion: 'pearls-to-coins-wal.v1';
  owner: string;
  migrationVersion: typeof PEARLS_TO_COINS_MIGRATION_VERSION;
  rate: number;
  run: number;
  phase: PearlsToCoinsPhase;
  plannedAtMs: number;
  updatedAtMs: number;
  /** Позиция в журнале жемчуга на момент чтения баланса: `r<ревизия>:<id>` или `opening:<баланс>`. */
  anchor: string;
  hash: string;
  operationId: string;
  pearls: number;
  totalCoins: number;
  grants: readonly string[];
  creditedOps: number;
  debitedAtMs?: number;
  doneAtMs?: number;
  abortReason?: string;
  report: Readonly<{ status: 'none' | 'pending' | 'sent' | 'gave_up'; attempts: number; lastError?: string }>;
  /** Все завершённые прогоны (юридический след: сколько, когда, каким id). */
  history: readonly PearlsToCoinsHistoryEntry[];
}>;

export type PearlBalanceSnapshot =
  | Readonly<{ status: 'ok'; balance: number; anchor: string }>
  | Readonly<{ status: 'corrupt'; detail: string }>;

export type PearlDebitResult =
  | Readonly<{ status: 'applied' | 'already-applied'; balanceAfter: number }>
  | Readonly<{ status: 'insufficient'; balance: number }>
  | Readonly<{ status: 'failed'; reason: string }>;

export type PearlsToCoinsReportPayload = Readonly<{
  ownerStableId: string;
  migrationVersion: typeof PEARLS_TO_COINS_MIGRATION_VERSION;
  rate: number;
  run: number;
  pearls: number;
  totalCoins: number;
  lifetimePearls: number;
  lifetimeCoins: number;
  clientDoneAtMs: number;
}>;

export type PearlsToCoinsDeps = Readonly<{
  now: () => number;
  isEnabled: () => boolean;
  readPearlBalance: (token: AccountGenerationToken) => Promise<PearlBalanceSnapshot>;
  debitPearls: (input: Readonly<{
    token: AccountGenerationToken;
    operationId: string;
    amount: number;
    subjectId: string;
    receiptWrites: readonly (readonly [string, string])[];
  }>) => Promise<PearlDebitResult>;
  enqueueCoins: (input: Readonly<{ token: AccountGenerationToken; requestId: string; giftId: string }>) => Promise<void>;
  syncCoins: (token: AccountGenerationToken) => Promise<void>;
  sendReport: (payload: PearlsToCoinsReportPayload) => Promise<void>;
}>;

export type PearlsToCoinsOutcome =
  | 'done' | 'already_done' | 'nothing_to_migrate' | 'flag_off' | 'identity_not_ready'
  | 'account_changed' | 'wal_corrupt' | 'balance_corrupt' | 'too_large'
  | 'debit_failed' | 'insufficient_replan_exhausted' | 'credit_failed' | 'busy' | 'failed';

export function pearlsToCoinsWalKey(owner: string): string {
  return `${PEARLS_TO_COINS_WAL_PREFIX}${encodeURIComponent(owner)}`;
}

export function pearlsToCoinsReceiptKey(owner: string, hash: string): string {
  return `${PEARLS_TO_COINS_RECEIPT_PREFIX}${encodeURIComponent(owner)}:${hash.slice(0, 16)}`;
}

export function pearlsToCoinsOperationId(hash: string): string {
  return `p2c1:${hash.slice(0, 40)}`;
}

export function pearlsToCoinsRequestId(hash: string, index: number): string {
  return `p2c1_${hash.slice(0, 32)}_${index + 1}`;
}

/** Монеты за N жемчуга: ×10, страховочное округление вверх до 10. */
export function pearlsToCoins(pearls: number): number {
  if (!Number.isSafeInteger(pearls) || pearls <= 0) return 0;
  return roundCoinsUp(pearls * PEARL_TO_COIN_RATE);
}

function log(message: string): void {
  // Не __DEV__-only: шаги денежной миграции видны и в проде (Metro/логи).
  console.log(`${LOG} ${message}`);
}

function logCatch(step: string, error: unknown): void {
  const err = error instanceof Error ? error : new Error(String(error));
  console.warn(`${LOG} catch step=${step} error=${err.message}`);
  DebugLogger.error(`pearls_to_coins:${step}`, err, 'warning');
}

class AccountChangedError extends Error {
  constructor() { super('pearls_to_coins_account_changed'); }
}

function assertCurrent(token: AccountGenerationToken, owner: string): void {
  if (!isCurrentAccountGeneration(token, owner)) throw new AccountChangedError();
}

// ── WAL ─────────────────────────────────────────────────────────────────────

type WalRead = Readonly<{ status: 'absent' }> | Readonly<{ status: 'corrupt' }>
  | Readonly<{ status: 'ok'; wal: PearlsToCoinsWal }>;

const PHASES: readonly PearlsToCoinsPhase[] = ['planned', 'debited', 'credited', 'done', 'aborted'];

function parseWal(raw: string | null, owner: string): WalRead {
  if (raw === null) return { status: 'absent' };
  try {
    const wal = JSON.parse(raw) as PearlsToCoinsWal;
    if (!wal || wal.schemaVersion !== 'pearls-to-coins-wal.v1' || wal.owner !== owner
      || !PHASES.includes(wal.phase) || !Array.isArray(wal.grants) || !Array.isArray(wal.history)
      || !Number.isSafeInteger(wal.creditedOps) || !Number.isSafeInteger(wal.pearls)
      || !Number.isSafeInteger(wal.totalCoins) || !/^[a-f0-9]{64}$/.test(String(wal.hash))) {
      log(`wal_invalid owner=${owner.slice(0, 6)} phase=${String(wal?.phase)}`);
      return { status: 'corrupt' };
    }
    return { status: 'ok', wal };
  } catch (error) {
    logCatch('wal_parse', error);
    return { status: 'corrupt' };
  }
}

async function writeWal(wal: PearlsToCoinsWal): Promise<void> {
  await AsyncStorage.setItem(pearlsToCoinsWalKey(wal.owner), JSON.stringify(wal));
}

async function sha256(value: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
}

/** Без времени и номера прогона: одинаков на повторе и на втором устройстве. */
async function planHash(owner: string, anchor: string, pearls: number): Promise<string> {
  return sha256(JSON.stringify({
    schemaVersion: 'pearls-to-coins-plan.v1', owner, anchor, pearls, rate: PEARL_TO_COIN_RATE,
  }));
}

/** Квитанция детерминирована (входит в отпечаток операции списания и синхронизируется). */
function receiptValue(wal: PearlsToCoinsWal): string {
  return JSON.stringify({
    schemaVersion: 'pearls-to-coins-receipt.v1',
    owner: wal.owner,
    migrationVersion: wal.migrationVersion,
    anchor: wal.anchor,
    pearls: wal.pearls,
    rate: wal.rate,
    totalCoins: wal.totalCoins,
    operationId: wal.operationId,
    requestIdPrefix: `p2c1_${wal.hash.slice(0, 32)}_`,
    grants: wal.grants,
  });
}

function finishedEntry(wal: PearlsToCoinsWal, outcome: 'done' | 'aborted', nowMs: number): PearlsToCoinsHistoryEntry {
  return Object.freeze({
    run: wal.run,
    outcome,
    pearls: wal.pearls,
    totalCoins: outcome === 'done' ? wal.totalCoins : 0,
    operationId: wal.operationId,
    plannedAtMs: wal.plannedAtMs,
    ...(wal.debitedAtMs ? { debitedAtMs: wal.debitedAtMs } : {}),
    finishedAtMs: nowMs,
    ...(wal.abortReason ? { abortReason: wal.abortReason } : {}),
  });
}

// ── Шаги ────────────────────────────────────────────────────────────────────

type PlanResult =
  | Readonly<{ kind: 'planned'; wal: PearlsToCoinsWal }>
  | Readonly<{ kind: 'nothing'; balance: number }>
  | Readonly<{ kind: 'corrupt'; detail: string }>
  | Readonly<{ kind: 'too_large'; pearls: number; ops: number }>;

async function planRun(
  token: AccountGenerationToken,
  owner: string,
  deps: PearlsToCoinsDeps,
  previous: PearlsToCoinsWal | null,
): Promise<PlanResult> {
  const snapshot = await deps.readPearlBalance(token);
  assertCurrent(token, owner);
  if (snapshot.status === 'corrupt') {
    log(`plan skip reason=balance_corrupt detail=${snapshot.detail}`);
    return { kind: 'corrupt', detail: snapshot.detail };
  }
  log(`plan read balance=${snapshot.balance} anchor=${snapshot.anchor.slice(0, 24)} source=local_ledger`);
  if (!Number.isSafeInteger(snapshot.balance) || snapshot.balance <= 0) {
    return { kind: 'nothing', balance: snapshot.balance };
  }
  const pearls = snapshot.balance;
  const totalCoins = pearlsToCoins(pearls);
  const grants = coinDenominationGiftIds(totalCoins);
  if (grants.length > PEARLS_TO_COINS_MAX_GRANT_OPS) {
    log(`plan skip reason=too_large pearls=${pearls} coins=${totalCoins} ops=${grants.length} action=left_for_support`);
    return { kind: 'too_large', pearls, ops: grants.length };
  }
  const hash = await planHash(owner, snapshot.anchor, pearls);
  assertCurrent(token, owner);
  const nowMs = deps.now();
  const wal: PearlsToCoinsWal = Object.freeze({
    schemaVersion: 'pearls-to-coins-wal.v1',
    owner,
    migrationVersion: PEARLS_TO_COINS_MIGRATION_VERSION,
    rate: PEARL_TO_COIN_RATE,
    run: (previous?.run ?? 0) + 1,
    phase: 'planned',
    plannedAtMs: nowMs,
    updatedAtMs: nowMs,
    anchor: snapshot.anchor,
    hash,
    operationId: pearlsToCoinsOperationId(hash),
    pearls,
    totalCoins,
    grants,
    creditedOps: 0,
    // Неотправленный отчёт прошлого прогона заменяется итогом нового (в нём суммы за всё время).
    report: { status: 'none' as const, attempts: 0 },
    history: previous?.history ?? [],
  });
  await writeWal(wal);
  log(`wal planned run=${wal.run} pearls=${pearls} coins=${totalCoins} ops=${grants.length} `
    + `op=${wal.operationId.slice(0, 16)} hash=${hash.slice(0, 8)}`);
  return { kind: 'planned', wal };
}

type DebitStep =
  | Readonly<{ kind: 'debited'; wal: PearlsToCoinsWal }>
  | Readonly<{ kind: 'aborted'; wal: PearlsToCoinsWal }>
  | Readonly<{ kind: 'failed'; reason: string }>;

async function debitPearls(
  wal: PearlsToCoinsWal,
  token: AccountGenerationToken,
  deps: PearlsToCoinsDeps,
): Promise<DebitStep> {
  assertCurrent(token, wal.owner);
  let result: PearlDebitResult;
  try {
    result = await deps.debitPearls({
      token,
      operationId: wal.operationId,
      amount: wal.pearls,
      subjectId: `p2c1:${wal.hash.slice(0, 16)}`,
      receiptWrites: [[pearlsToCoinsReceiptKey(wal.owner, wal.hash), receiptValue(wal)]],
    });
  } catch (error) {
    logCatch('debit', error);
    result = { status: 'failed', reason: error instanceof Error ? error.message : String(error) };
  }
  log(`debit op=${wal.operationId.slice(0, 16)} amount=${wal.pearls} status=${result.status}`
    + `${result.status === 'failed' ? ` reason=${result.reason}` : ''}`
    + `${result.status === 'insufficient' ? ` balanceNow=${result.balance}` : ''}`
    + `${result.status === 'applied' || result.status === 'already-applied' ? ` balanceAfter=${result.balanceAfter}` : ''}`);
  if (result.status === 'failed') {
    if (result.reason === 'stale_account_generation' || !isCurrentAccountGeneration(token, wal.owner)) {
      throw new AccountChangedError();
    }
    return { kind: 'failed', reason: result.reason };
  }
  assertCurrent(token, wal.owner);
  const nowMs = deps.now();
  if (result.status === 'insufficient') {
    // Операции с этим id в журнале нет (иначе было бы already-applied) — значит
    // ничего не списано и монеты не положены. Прогон закрываем, план заново.
    const aborted: PearlsToCoinsWal = { ...wal, phase: 'aborted', abortReason: 'insufficient', updatedAtMs: nowMs };
    const next: PearlsToCoinsWal = Object.freeze({
      ...aborted, history: [...wal.history, finishedEntry(aborted, 'aborted', nowMs)],
    });
    await writeWal(next);
    return { kind: 'aborted', wal: next };
  }
  const next: PearlsToCoinsWal = Object.freeze({ ...wal, phase: 'debited', debitedAtMs: nowMs, updatedAtMs: nowMs });
  await writeWal(next);
  return { kind: 'debited', wal: next };
}

async function creditCoins(
  wal: PearlsToCoinsWal,
  token: AccountGenerationToken,
  deps: PearlsToCoinsDeps,
): Promise<PearlsToCoinsWal | null> {
  let current = wal;
  for (let index = wal.creditedOps; index < wal.grants.length; index += 1) {
    assertCurrent(token, wal.owner);
    const requestId = pearlsToCoinsRequestId(wal.hash, index);
    const giftId = wal.grants[index] ?? '';
    try {
      await deps.enqueueCoins({ token, requestId, giftId });
    } catch (error) {
      // Кошелёк сам отказывает при смене аккаунта — пауза до следующей активации.
      if (error instanceof AccountChangedError || !isCurrentAccountGeneration(token, wal.owner)) {
        throw new AccountChangedError();
      }
      logCatch('credit', error);
      log(`credit op=${index + 1}/${wal.grants.length} req=${requestId} giftId=${giftId} status=failed`);
      return null;
    }
    log(`credit op=${index + 1}/${wal.grants.length} req=${requestId} giftId=${giftId} status=queued`);
    assertCurrent(token, wal.owner);
    // Прогресс после КАЖДОЙ операции: окно повтора — одна операция, её дубль
    // кошелёк схлопывает по requestId.
    current = Object.freeze({ ...current, creditedOps: index + 1, updatedAtMs: deps.now() });
    await writeWal(current);
  }
  assertCurrent(token, wal.owner);
  current = Object.freeze({ ...current, phase: 'credited', updatedAtMs: deps.now() });
  await writeWal(current);
  return current;
}

function reportPayload(wal: PearlsToCoinsWal): PearlsToCoinsReportPayload {
  const done = wal.history.filter((entry) => entry.outcome === 'done');
  return Object.freeze({
    ownerStableId: wal.owner,
    migrationVersion: wal.migrationVersion,
    rate: wal.rate,
    run: wal.run,
    pearls: wal.pearls,
    totalCoins: wal.totalCoins,
    lifetimePearls: done.reduce((sum, entry) => sum + entry.pearls, 0),
    lifetimeCoins: done.reduce((sum, entry) => sum + entry.totalCoins, 0),
    clientDoneAtMs: wal.doneAtMs ?? wal.updatedAtMs,
  });
}

async function sendReportIfPending(
  wal: PearlsToCoinsWal,
  token: AccountGenerationToken,
  deps: PearlsToCoinsDeps,
): Promise<void> {
  if (wal.phase !== 'done' || wal.report.status !== 'pending') return;
  if (wal.report.attempts >= MAX_REPORT_ATTEMPTS) {
    log(`report skip reason=max_attempts attempts=${wal.report.attempts}`);
    if (isCurrentAccountGeneration(token, wal.owner)) {
      await writeWal({ ...wal, report: { ...wal.report, status: 'gave_up' } });
    }
    return;
  }
  let status: PearlsToCoinsWal['report']['status'] = 'pending';
  let lastError: string | undefined;
  try {
    await deps.sendReport(reportPayload(wal));
    status = 'sent';
  } catch (error) {
    lastError = error instanceof Error ? error.message.slice(0, 120) : String(error).slice(0, 120);
    logCatch('report', error);
  }
  log(`report status=${status} run=${wal.run} attempt=${wal.report.attempts + 1}`);
  if (!isCurrentAccountGeneration(token, wal.owner)) {
    log('report skip_write reason=account_changed');
    return;
  }
  // Перечитываем WAL: метку отчёта кладём поверх актуального журнала.
  const fresh = parseWal(await AsyncStorage.getItem(pearlsToCoinsWalKey(wal.owner)), wal.owner);
  if (fresh.status !== 'ok' || fresh.wal.run !== wal.run) {
    log(`report skip_write reason=wal_moved fresh=${fresh.status}`);
    return;
  }
  await writeWal({
    ...fresh.wal,
    report: { status, attempts: wal.report.attempts + 1, ...(lastError ? { lastError } : {}) },
  });
}

// ── Точка входа ─────────────────────────────────────────────────────────────

let inFlight: Promise<PearlsToCoinsOutcome> | null = null;

/**
 * Один прогон для ТЕКУЩЕГО аккаунта. Безопасно звать сколько угодно раз:
 * при нулевом балансе выходит двумя локальными чтениями, без сети.
 */
export async function runPearlsToCoinsMigration(
  input: Readonly<{ trigger: string; deps?: PearlsToCoinsDeps }>,
): Promise<PearlsToCoinsOutcome> {
  if (inFlight) {
    log(`skip reason=busy trigger=${input.trigger}`);
    return 'busy';
  }
  const deps = input.deps ?? defaultPearlsToCoinsDeps();
  inFlight = runOnce(input.trigger, deps).finally(() => { inFlight = null; });
  return inFlight;
}

async function runOnce(trigger: string, deps: PearlsToCoinsDeps): Promise<PearlsToCoinsOutcome> {
  const startedAt = deps.now();
  const token = captureAccountGeneration();
  const owner = token.stableId;
  if (!owner || token.phase !== 'active' || !isCurrentAccountGeneration(token, owner)) {
    log(`skip reason=identity_not_ready phase=${token.phase} hasOwner=${!!owner} trigger=${trigger}`);
    return 'identity_not_ready';
  }
  try {
    const read = parseWal(await AsyncStorage.getItem(pearlsToCoinsWalKey(owner)), owner);
    log(`start owner=${owner.slice(0, 6)} gen=${token.generation} trigger=${trigger} `
      + `walPhase=${read.status === 'ok' ? read.wal.phase : read.status}`);
    if (read.status === 'corrupt') {
      // Битый журнал НЕ перезапускаем с нуля: списание могло пройти, а план
      // монет лежит только в нём. Квитанция в журнале жемчуга — для поддержки.
      log('skip reason=wal_corrupt action=left_for_support');
      return 'wal_corrupt';
    }
    let wal = read.status === 'ok' ? read.wal : null;
    if (wal?.phase === 'done') await sendReportIfPending(wal, token, deps);

    for (let replans = 0; ; replans += 1) {
      const needsPlan = !wal || wal.phase === 'done' || wal.phase === 'aborted';
      // Флаг останавливает только НОВЫЙ план. Начатый прогон (даже 'planned')
      // доводится при любом флаге: крах между списанием и записью 'debited'
      // оставляет WAL в 'planned', и остановка тут бросила бы списанный жемчуг
      // без монет. Повтор списания идемпотентен по id — лишнего не спишет.
      if (needsPlan) {
        const enabled = deps.isEnabled();
        if (!enabled) {
          log(`skip reason=flag_off flag=pearls_to_coins_enabled value=${String(enabled)} walPhase=${wal?.phase ?? 'none'}`);
          return 'flag_off';
        }
      }
      if (needsPlan) {
        const planned = await planRun(token, owner, deps, wal);
        if (planned.kind === 'corrupt') return 'balance_corrupt';
        if (planned.kind === 'too_large') return 'too_large';
        if (planned.kind === 'nothing') {
          const outcome = wal?.phase === 'done' ? 'already_done' : 'nothing_to_migrate';
          log(`skip reason=${outcome} balance=${planned.balance} lastRun=${wal?.run ?? 0} ms=${deps.now() - startedAt}`);
          return outcome;
        }
        wal = planned.wal;
      } else if (wal) {
        log(`resume phase=${wal.phase} run=${wal.run} pearls=${wal.pearls} `
          + `creditedOps=${wal.creditedOps}/${wal.grants.length} hash=${wal.hash.slice(0, 8)}`);
      }
      if (!wal) {
        log('skip reason=wal_missing_after_plan');
        return 'failed';
      }
      if (wal.phase !== 'planned') break;
      const step = await debitPearls(wal, token, deps);
      if (step.kind === 'failed') return 'debit_failed';
      wal = step.wal;
      if (step.kind === 'debited') break;
      if (replans >= MAX_REPLANS_PER_RUN) {
        log(`skip reason=insufficient_replan_exhausted run=${wal.run} action=retry_next_activation`);
        return 'insufficient_replan_exhausted';
      }
      log(`replan reason=insufficient run=${wal.run}`);
    }

    if (wal.phase === 'debited') {
      const next = await creditCoins(wal, token, deps);
      if (!next) return 'credit_failed';
      wal = next;
    }
    if (wal.phase === 'credited') {
      assertCurrent(token, owner);
      const nowMs = deps.now();
      const done: PearlsToCoinsWal = { ...wal, phase: 'done', doneAtMs: nowMs, updatedAtMs: nowMs };
      wal = Object.freeze({
        ...done,
        report: { status: 'pending' as const, attempts: 0 },
        history: [...wal.history, finishedEntry(done, 'done', nowMs)],
      });
      await writeWal(wal);
    }
    void deps.syncCoins(token).catch((error: unknown) => logCatch('sync_coins', error));
    log(`done run=${wal.run} pearls=${wal.pearls} coins=${wal.totalCoins} ops=${wal.grants.length} `
      + `ms=${deps.now() - startedAt}`);
    await sendReportIfPending(wal, token, deps);
    return 'done';
  } catch (error) {
    if (error instanceof AccountChangedError) {
      log(`skip reason=account_changed trigger=${trigger} action=resume_on_next_activation`);
      return 'account_changed';
    }
    logCatch('run', error);
    return 'failed';
  }
}

// ── Планировщик (запуск из app/_layout.tsx) ────────────────────────────────

let schedulerStarted = false;

/**
 * Запускает миграцию через ~18 с после старта и при каждой активации аккаунта
 * (у скрытых/дополнительных аккаунтов свой остаток). Возвращает функцию остановки.
 */
export function startPearlsToCoinsMigrationScheduler(
  delayMs: number = PEARLS_TO_COINS_START_DELAY_MS,
): () => void {
  if (schedulerStarted) {
    log('scheduler skip reason=already_started');
    return () => {};
  }
  schedulerStarted = true;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let task: { cancel: () => void } | null = null;
  const clear = (): void => {
    if (timer) clearTimeout(timer);
    task?.cancel();
    timer = null;
    task = null;
  };
  const schedule = (token: AccountGenerationToken, trigger: string): void => {
    clear();
    if (token.phase !== 'active' || !token.stableId) {
      log(`scheduler skip reason=identity_not_ready phase=${token.phase} trigger=${trigger}`);
      return;
    }
    timer = setTimeout(() => {
      timer = null;
      task = InteractionManager.runAfterInteractions(() => {
        void runPearlsToCoinsMigration({ trigger }).catch((error: unknown) => logCatch('scheduler_run', error));
      });
    }, delayMs);
  };
  schedule(captureAccountGeneration(), 'cold_start');
  const subscription = subscribeAccountGeneration((token) => schedule(token, 'account_activate'));
  return () => {
    clear();
    subscription.remove();
    schedulerStarted = false;
  };
}

// ── Боевые зависимости (ленивые: тяжёлые модули не грузятся на старте) ─────

function parseLedgerSnapshot(raw: string | null, legacyRaw: string | null, owner: string): PearlBalanceSnapshot {
  if (raw === null) {
    // Журнала ещё нет: первая операция возьмёт открывающий баланс из проекции.
    const legacy = Number(legacyRaw ?? 0);
    const balance = Number.isFinite(legacy) && legacy > 0 ? Math.floor(legacy) : 0;
    return { status: 'ok', balance, anchor: `opening:${balance}` };
  }
  try {
    const state = JSON.parse(raw) as {
      schemaVersion?: unknown; ownerStableId?: unknown; balance?: unknown; revision?: unknown; headOperationId?: unknown;
    };
    if (state.schemaVersion !== 'client-shard-ledger-state.v1' || state.ownerStableId !== owner
      || !Number.isSafeInteger(state.balance) || !Number.isSafeInteger(state.revision)) {
      return { status: 'corrupt', detail: 'ledger_state_invalid' };
    }
    // Отрицательный баланс = долг после слияния устройств: переводить нечего.
    return {
      status: 'ok',
      balance: Number(state.balance),
      anchor: `r${Number(state.revision)}:${String(state.headOperationId ?? 'none')}`,
    };
  } catch (error) {
    logCatch('ledger_state_parse', error);
    return { status: 'corrupt', detail: 'ledger_state_json' };
  }
}

export function defaultPearlsToCoinsDeps(): PearlsToCoinsDeps {
  return Object.freeze({
    now: () => Date.now(),
    isEnabled: () => getRemoteBool('pearls_to_coins_enabled'),
    readPearlBalance: async (token) => {
      const owner = token.stableId ?? '';
      // Один снимок под теми же замками, что берёт журнал жемчуга при записи.
      return withAccountTransitionLock(async () => withStorageLock(async () => {
        if (!owner || !isCurrentAccountGeneration(token, owner)) throw new AccountChangedError();
        const [raw, legacyRaw] = await Promise.all([
          AsyncStorage.getItem(clientShardLedgerStateStorageKey(owner)),
          AsyncStorage.getItem(LEGACY_BALANCE_KEY),
        ]);
        return parseLedgerSnapshot(raw, legacyRaw, owner);
      }));
    },
    debitPearls: async ({ token, operationId, amount, subjectId, receiptWrites }) => {
      const { commitShardBalanceMigrationDebit } = await import('./shards_system');
      const result = await commitShardBalanceMigrationDebit({
        accountToken: token,
        operationId,
        amount,
        reason: PEARLS_TO_COINS_DEBIT_REASON,
        subjectId,
        receiptWrites,
      });
      if (result.status === 'applied' || result.status === 'already-applied') {
        return { status: result.status, balanceAfter: result.balanceAfter };
      }
      if (result.status === 'insufficient') return { status: 'insufficient', balance: result.balance };
      if (result.status === 'already-satisfied') {
        // Семантики у миграционного списания нет — такой ответ значит, что журнал
        // повёл себя не так, как ожидалось. Не считаем списанным.
        return { status: 'failed', reason: 'unexpected_already_satisfied' };
      }
      if (result.status === 'failed') return { status: 'failed', reason: result.reason };
      return { status: 'failed', reason: 'unexpected_debit_status' };
    },
    enqueueCoins: async ({ token, requestId, giftId }) => {
      const { enqueueLevelSpinStarGrant } = await import('./level_spin_star_grants');
      await enqueueLevelSpinStarGrant({
        token, requestId, lane: 'base', giftId, promotionEligibility: 'excluded_compensation',
      }, { syncNow: false });
    },
    syncCoins: async (token) => {
      const { syncPendingLevelSpinStarGrants } = await import('./level_spin_star_grants');
      const result = await syncPendingLevelSpinStarGrants(token);
      log(`sync_coins synced=${result.synced} pending=${result.pending}`);
    },
    sendReport: async (payload) => {
      const { CLOUD_SYNC_ENABLED, IS_EXPO_GO } = await import('./config');
      if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) throw new Error('cloud_disabled');
      const { getApp } = await import('@react-native-firebase/app');
      const { getFunctions, httpsCallable } = await import('@react-native-firebase/functions');
      // ⚠️ Требует деплоя functions (pearlsToCoinsMigrationReport) с согласия владельца.
      const fn = httpsCallable(getFunctions(getApp(), 'us-central1'), 'pearlsToCoinsMigrationReport');
      await fn(payload);
    },
  });
}

export const __pearlsToCoinsTestHooks = Object.freeze({
  parseWal,
  parseLedgerSnapshot,
  reportPayload,
  resetScheduler: () => { schedulerStarted = false; inFlight = null; },
});

export default function __RouteShim() { return null; }
