/**
 * D51/D53: разовая миграция «Подарки и спины → монеты» (вариант «Средне»).
 *
 * зачем (владелец 2026-09-24): раздел «Подарки» и спины уходят из 2.0. Всё
 * неиспользованное МОЛЧА (без окон, тостов и фанфар) превращается в монеты,
 * выигранные Plus-дни включаются, просроченное не платится. Пока монеты = руны
 * (до PM-069), зачисление идёт в существующий рунный кошелёк.
 *
 * Правило CLAUDE.md «празднование не durable — награда durable»: сохраняется
 * сама награда (рунная операция в кошельке), показа нет вовсе.
 *
 * Журнал упреждающей записи (WAL) на аккаунт, ключ `gifts_to_coins_v1:<owner>`
 * (входит в account-local префиксы cloud_sync — путешествует вместе с
 * инвентарём при смене аккаунта, иначе вернувшаяся копия = двойная выплата):
 *
 *   planned → plus_applied → credited → retired → done | blocked
 *
 * 1. Опись фиксируется в WAL один раз; повтор после краха берёт её из WAL и
 *    НЕ пересчитывает (иначе другая сумма).
 * 2. Plus-дни включаются штатным applyGift (идемпотентен по квитанции).
 * 3. Монеты: номиналы stars_* через enqueueLevelSpinStarGrant с requestId
 *    `g2c1_<hash32>_<i>`; хэш заморожен в WAL → тот же requestId при повторе,
 *    кошелёк и сервер схлопывают дубль. Офлайн: операция ложится в outbox
 *    кошелька и досылается, когда появится сеть. `excluded_compensation` —
 *    не умножается «Супер-воскресеньем».
 * 4. Списание предметов (только после зачисления) + метка в ОДНОМ multiSet.
 * 5. Строка-итог на сервер (D53) — отдельно, ретраится, миграцию не держит.
 *
 * Спецификация: docs/phraseman-2.0/docs/GIFTS_TO_COINS_MIGRATION.md §5.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { InteractionManager } from 'react-native';

import { DAILY_JOURNEY_GIFT_CLAIM_RECEIPT_PREFIX } from '../constants/daily_journey_gift_storage_keys';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
  withAccountTransitionLock,
  type AccountGenerationToken,
} from './account_generation';
import { DebugLogger } from './debug-logger';
import { emitAppEvent } from './events';
import {
  readGiftsToCoinsInventory,
  type GiftsToCoinsCorruptSource,
  type GiftsToCoinsDailyJourneyPending,
  type GiftsToCoinsInventory,
  type GiftsToCoinsItem,
  type GiftsToCoinsSource,
} from './gifts_to_coins_inventory_v1';
import {
  coinDenominationGiftIds,
  GIFTS_TO_COINS_TABLE_VERSION,
  roundCoinsUp,
  type PlusGiftId,
} from './gifts_to_coins_table_v1';
import { buildGiftsToCoinsRetireWrites } from './gifts_to_coins_retire_v1';
import { getRemoteBool } from './remote_flags';
import { withStorageLock } from './storage_mutex';

export const GIFTS_TO_COINS_WAL_PREFIX = 'gifts_to_coins_v1:';
export const GIFTS_TO_COINS_MIGRATION_VERSION = 'g2c.v1' as const;
/** Отложенный старт: не на первом кадре (инцидент 22.09 «работа на старте»). */
export const GIFTS_TO_COINS_START_DELAY_MS = 15_000;
const BLOCKED_RETRY_MS = 24 * 60 * 60 * 1000;
const MAX_REPORT_ATTEMPTS = 20;
const LOG = '[GIFTS-TO-COINS]';

export type GiftsToCoinsPhase = 'planned' | 'plus_applied' | 'credited' | 'retired' | 'done' | 'blocked';

export type GiftsToCoinsWal = Readonly<{
  schemaVersion: 'gifts-to-coins-wal.v1';
  owner: string;
  migrationVersion: typeof GIFTS_TO_COINS_MIGRATION_VERSION;
  tableVersion: typeof GIFTS_TO_COINS_TABLE_VERSION;
  run: number;
  phase: GiftsToCoinsPhase;
  plannedAtMs: number;
  updatedAtMs: number;
  hash: string;
  rawCoins: number;
  totalCoins: number;
  grants: readonly string[];
  creditedOps: number;
  plusApplied: readonly string[];
  items: readonly GiftsToCoinsItem[];
  expired: GiftsToCoinsInventory['expired'];
  corruptSources: readonly GiftsToCoinsCorruptSource[];
  cappedSpins: number;
  unknownGiftIds: readonly string[];
  spinCreditsFrom: GiftsToCoinsInventory['spinCreditsFrom'];
  doneAtMs?: number;
  blockedUntilMs?: number;
  report: Readonly<{ status: 'pending' | 'sent' | 'gave_up'; attempts: number; lastError?: string }>;
  /** Прошлые прогоны (после blocked): поддержка видит, что и когда выдано (§5.8). */
  history: readonly Readonly<{ run: number; totalCoins: number; hash8: string; doneAtMs: number }>[];
}>;

export type GiftsToCoinsReportPayload = Readonly<{
  /** Внутренний id аккаунта: сервер сверяет его с входом (resolveStableUidForAuth). */
  ownerStableId: string;
  migrationVersion: typeof GIFTS_TO_COINS_MIGRATION_VERSION;
  tableVersion: typeof GIFTS_TO_COINS_TABLE_VERSION;
  run: number;
  counts: Readonly<Record<GiftsToCoinsSource | 'plus_days', number>>;
  expired: GiftsToCoinsInventory['expired'];
  cappedSpins: number;
  totalCoins: number;
  corruptSources: readonly string[];
  clientDoneAtMs: number;
}>;

export type GiftsToCoinsDeps = Readonly<{
  now: () => number;
  isEnabled: () => boolean;
  readDailyJourneyPending: (token: AccountGenerationToken) => Promise<readonly GiftsToCoinsDailyJourneyPending[]>;
  applyPlus: (giftId: PlusGiftId, occurrenceId: string, token: AccountGenerationToken) => Promise<boolean>;
  enqueueCoins: (input: Readonly<{ token: AccountGenerationToken; requestId: string; giftId: string }>) => Promise<void>;
  syncCoins: (token: AccountGenerationToken) => Promise<void>;
  acknowledgePaidSpin: (requestId: string) => Promise<void>;
  cancelExpiringPush: () => Promise<void>;
  sendReport: (payload: GiftsToCoinsReportPayload) => Promise<void>;
}>;

export type GiftsToCoinsOutcome =
  | 'done' | 'blocked' | 'already_done' | 'flag_off' | 'identity_not_ready'
  | 'blocked_backoff' | 'account_changed' | 'wal_corrupt' | 'plus_failed'
  | 'credit_failed' | 'retire_failed' | 'busy' | 'failed';

export function giftsToCoinsWalKey(owner: string): string {
  return `${GIFTS_TO_COINS_WAL_PREFIX}${encodeURIComponent(owner)}`;
}

function log(message: string): void {
  // Не __DEV__-only: ранние выходы и шаги денежной миграции видны и в проде (Metro/логи).
  console.log(`${LOG} ${message}`);
}

function logCatch(step: string, error: unknown): void {
  const err = error instanceof Error ? error : new Error(String(error));
  console.warn(`${LOG} catch step=${step} error=${err.message}`);
  DebugLogger.error(`gifts_to_coins:${step}`, err, 'warning');
}

class AccountChangedError extends Error {
  constructor() { super('gifts_to_coins_account_changed'); }
}

function assertCurrent(token: AccountGenerationToken, owner: string): void {
  if (!isCurrentAccountGeneration(token, owner)) throw new AccountChangedError();
}

// ── WAL ─────────────────────────────────────────────────────────────────────

type WalRead = Readonly<{ status: 'absent' }> | Readonly<{ status: 'corrupt' }>
  | Readonly<{ status: 'ok'; wal: GiftsToCoinsWal }>;

const PHASES: readonly GiftsToCoinsPhase[] = ['planned', 'plus_applied', 'credited', 'retired', 'done', 'blocked'];

function parseWal(raw: string | null, owner: string): WalRead {
  if (raw === null) return { status: 'absent' };
  try {
    const wal = JSON.parse(raw) as GiftsToCoinsWal;
    if (!wal || wal.schemaVersion !== 'gifts-to-coins-wal.v1' || wal.owner !== owner
      || !PHASES.includes(wal.phase) || !Array.isArray(wal.grants) || !Array.isArray(wal.items)
      || !Number.isSafeInteger(wal.creditedOps) || !/^[a-f0-9]{64}$/.test(String(wal.hash))) {
      return { status: 'corrupt' };
    }
    return { status: 'ok', wal };
  } catch (error) {
    logCatch('wal_parse', error);
    return { status: 'corrupt' };
  }
}

async function writeWal(wal: GiftsToCoinsWal): Promise<void> {
  await AsyncStorage.setItem(giftsToCoinsWalKey(wal.owner), JSON.stringify(wal));
}

async function sha256(value: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
}

async function manifestHash(owner: string, run: number, items: readonly GiftsToCoinsItem[]): Promise<string> {
  const sorted = [...items].map((item) => `${item.key}=${item.coins}${item.plus ? `+${item.plus}` : ''}`).sort();
  return sha256(JSON.stringify({
    schemaVersion: 'gifts-to-coins-manifest.v1', owner, run, tableVersion: GIFTS_TO_COINS_TABLE_VERSION, items: sorted,
  }));
}

export function giftsToCoinsRequestId(hash: string, index: number): string {
  return `g2c1_${hash.slice(0, 32)}_${index + 1}`;
}

function plusOccurrenceId(hash: string, itemKey: string): string {
  return `g2c1-plus:${hash.slice(0, 16)}:${itemKey}`;
}

// ── Шаги ────────────────────────────────────────────────────────────────────

async function planRun(
  token: AccountGenerationToken,
  owner: string,
  deps: GiftsToCoinsDeps,
  previous: GiftsToCoinsWal | null,
): Promise<GiftsToCoinsWal> {
  // «Дневной путь» читается штатным путём ВНЕ замка: он сам берёт замки аккаунта.
  let dailyJourney: readonly GiftsToCoinsDailyJourneyPending[] | 'corrupt';
  try {
    dailyJourney = await deps.readDailyJourneyPending(token);
  } catch (error) {
    logCatch('inventory_daily_journey', error);
    dailyJourney = 'corrupt';
  }
  assertCurrent(token, owner);
  return withAccountTransitionLock(async () => {
    assertCurrent(token, owner);
    const nowMs = deps.now();
    const inventory = await readGiftsToCoinsInventory(owner, nowMs, dailyJourney);
    assertCurrent(token, owner);
    const run = (previous?.run ?? 0) + 1;
    const rawCoins = inventory.items.reduce((sum, item) => sum + item.coins, 0);
    const totalCoins = roundCoinsUp(rawCoins);
    const hash = await manifestHash(owner, run, inventory.items);
    const history = previous
      ? [...previous.history, {
        run: previous.run, totalCoins: previous.totalCoins,
        hash8: previous.hash.slice(0, 8), doneAtMs: previous.doneAtMs ?? previous.updatedAtMs,
      }]
      : [];
    const wal: GiftsToCoinsWal = Object.freeze({
      schemaVersion: 'gifts-to-coins-wal.v1',
      owner,
      migrationVersion: GIFTS_TO_COINS_MIGRATION_VERSION,
      tableVersion: GIFTS_TO_COINS_TABLE_VERSION,
      run,
      phase: 'planned',
      plannedAtMs: nowMs,
      updatedAtMs: nowMs,
      hash,
      rawCoins,
      totalCoins,
      grants: coinDenominationGiftIds(totalCoins),
      creditedOps: 0,
      plusApplied: [],
      items: inventory.items,
      expired: inventory.expired,
      corruptSources: inventory.corruptSources,
      cappedSpins: inventory.cappedSpins,
      unknownGiftIds: inventory.unknownGiftIds,
      spinCreditsFrom: inventory.spinCreditsFrom,
      report: { status: 'pending' as const, attempts: 0 },
      history,
    });
    assertCurrent(token, owner);
    await writeWal(wal);
    log(`wal planned run=${run} total=${totalCoins} raw=${rawCoins} items=${inventory.items.length} `
      + `grants=${wal.grants.length} corrupt=${inventory.corruptSources.join(',') || '-'} `
      + `capped=${inventory.cappedSpins} hash=${hash.slice(0, 8)}`);
    return wal;
  });
}

async function applyPlusDays(
  wal: GiftsToCoinsWal,
  token: AccountGenerationToken,
  deps: GiftsToCoinsDeps,
): Promise<GiftsToCoinsWal | null> {
  let current = wal;
  for (const item of wal.items) {
    if (!item.plus || current.plusApplied.includes(item.key)) continue;
    assertCurrent(token, wal.owner);
    let applied = false;
    try {
      applied = await deps.applyPlus(item.plus, plusOccurrenceId(wal.hash, item.key), token);
    } catch (error) {
      logCatch('plus_apply', error);
    }
    log(`plus_apply giftId=${item.plus} key=${item.key} result=${applied ? 'applied' : 'failed'}`);
    // Plus никогда не превращаем в монеты: сбой = повтор при следующем запуске (§5.2 п.4).
    if (!applied) return null;
    assertCurrent(token, wal.owner);
    current = Object.freeze({ ...current, plusApplied: [...current.plusApplied, item.key], updatedAtMs: deps.now() });
    await writeWal(current);
  }
  assertCurrent(token, wal.owner);
  current = Object.freeze({ ...current, phase: 'plus_applied', updatedAtMs: deps.now() });
  await writeWal(current);
  return current;
}

async function creditCoins(
  wal: GiftsToCoinsWal,
  token: AccountGenerationToken,
  deps: GiftsToCoinsDeps,
): Promise<GiftsToCoinsWal | null> {
  let current = wal;
  for (let index = wal.creditedOps; index < wal.grants.length; index += 1) {
    assertCurrent(token, wal.owner);
    const requestId = giftsToCoinsRequestId(wal.hash, index);
    const giftId = wal.grants[index] ?? '';
    try {
      await deps.enqueueCoins({ token, requestId, giftId });
    } catch (error) {
      // Кошелёк сам отказывает при смене аккаунта — это не сбой, а пауза до
      // следующей активации этого владельца.
      if (error instanceof AccountChangedError || !isCurrentAccountGeneration(token, wal.owner)) {
        throw new AccountChangedError();
      }
      logCatch('credit', error);
      log(`credit op=${index + 1}/${wal.grants.length} req=${requestId} giftId=${giftId} status=failed`);
      return null;
    }
    log(`credit op=${index + 1}/${wal.grants.length} req=${requestId} giftId=${giftId} status=queued`);
    assertCurrent(token, wal.owner);
    // Прогресс пишется после КАЖДОЙ операции: окно повтора — одна операция,
    // а её дубль кошелёк всё равно схлопывает по requestId.
    current = Object.freeze({ ...current, creditedOps: index + 1, updatedAtMs: deps.now() });
    await writeWal(current);
  }
  assertCurrent(token, wal.owner);
  current = Object.freeze({ ...current, phase: 'credited', updatedAtMs: deps.now() });
  await writeWal(current);
  return current;
}

async function retireItems(
  wal: GiftsToCoinsWal,
  token: AccountGenerationToken,
  deps: GiftsToCoinsDeps,
): Promise<GiftsToCoinsWal> {
  const retired = await withAccountTransitionLock(async () => withStorageLock(async () => {
    assertCurrent(token, wal.owner);
    const plan = await buildGiftsToCoinsRetireWrites(wal.owner, wal.items, {
      claimedAtMs: wal.plannedAtMs,
      dailyJourneyReceiptPrefix: DAILY_JOURNEY_GIFT_CLAIM_RECEIPT_PREFIX,
    });
    assertCurrent(token, wal.owner);
    const next: GiftsToCoinsWal = Object.freeze({ ...wal, phase: 'retired', updatedAtMs: deps.now() });
    // Списание и метка — одним multiSet: крах между ними невозможен.
    await AsyncStorage.multiSet([...plan.writes, [giftsToCoinsWalKey(wal.owner), JSON.stringify(next)]]);
    if (plan.removals.length > 0) await AsyncStorage.multiRemove([...plan.removals]);
    for (const line of plan.log) log(line);
    return Object.freeze({ wal: next, paidRequestIds: plan.paidRequestIds });
  }));
  // Платные чеки закрываем ВНЕ замка: acknowledgeLocalLevelSpin берёт его сам.
  // Он переносит запись о списании 300 рун в outbox и только потом удаляет конверт.
  for (const requestId of retired.paidRequestIds) {
    try {
      await deps.acknowledgePaidSpin(requestId);
      log(`retire source=paid_spin req=${requestId.slice(0, 8)} ack=ok`);
    } catch (error) {
      logCatch('retire_paid_ack', error);
    }
  }
  try {
    await deps.cancelExpiringPush();
  } catch (error) {
    logCatch('retire_cancel_push', error);
  }
  for (const event of ['level_spin_balance_changed', 'level_gift_inventory_changed', 'daily_journey_gifts_changed'] as const) {
    try { emitAppEvent(event); } catch (error) { logCatch(`emit_${event}`, error); }
  }
  return retired.wal;
}

function reportPayload(wal: GiftsToCoinsWal): GiftsToCoinsReportPayload {
  const counts: Record<GiftsToCoinsSource | 'plus_days', number> = {
    spin_credit: 0, spin_prize: 0, paid_spin: 0, level_gift: 0, daily_journey: 0, plus_days: 0,
  };
  for (const item of wal.items) {
    counts[item.source] += 1;
    if (item.plus) counts.plus_days += 1;
  }
  return Object.freeze({
    ownerStableId: wal.owner,
    migrationVersion: wal.migrationVersion,
    tableVersion: wal.tableVersion,
    run: wal.run,
    counts: Object.freeze(counts),
    expired: wal.expired,
    cappedSpins: wal.cappedSpins,
    totalCoins: wal.totalCoins,
    corruptSources: wal.corruptSources,
    clientDoneAtMs: wal.doneAtMs ?? wal.updatedAtMs,
  });
}

async function sendReportIfPending(
  wal: GiftsToCoinsWal,
  token: AccountGenerationToken,
  deps: GiftsToCoinsDeps,
): Promise<void> {
  if (wal.report.status !== 'pending') return;
  if (wal.report.attempts >= MAX_REPORT_ATTEMPTS) {
    log(`report skip reason=max_attempts attempts=${wal.report.attempts}`);
    if (isCurrentAccountGeneration(token, wal.owner)) {
      await writeWal({ ...wal, report: { ...wal.report, status: 'gave_up' } });
    }
    return;
  }
  let status: GiftsToCoinsWal['report']['status'] = 'pending';
  let lastError: string | undefined;
  try {
    await deps.sendReport(reportPayload(wal));
    status = 'sent';
  } catch (error) {
    lastError = error instanceof Error ? error.message.slice(0, 120) : String(error).slice(0, 120);
    logCatch('report', error);
  }
  log(`report status=${status} attempt=${wal.report.attempts + 1}`);
  if (!isCurrentAccountGeneration(token, wal.owner)) return;
  // Перечитываем WAL: метку отчёта кладём поверх актуального журнала.
  const fresh = parseWal(await AsyncStorage.getItem(giftsToCoinsWalKey(wal.owner)), wal.owner);
  if (fresh.status !== 'ok' || fresh.wal.run !== wal.run) return;
  await writeWal({
    ...fresh.wal,
    report: { status, attempts: wal.report.attempts + 1, ...(lastError ? { lastError } : {}) },
  });
}

// ── Точка входа ─────────────────────────────────────────────────────────────

let inFlight: Promise<GiftsToCoinsOutcome> | null = null;

/**
 * Один прогон миграции для ТЕКУЩЕГО аккаунта. Безопасно звать сколько угодно
 * раз: после `done` выходит одним чтением ключа.
 */
export async function runGiftsToCoinsMigration(
  input: Readonly<{ trigger: string; deps?: GiftsToCoinsDeps }>,
): Promise<GiftsToCoinsOutcome> {
  if (inFlight) {
    log(`skip reason=busy trigger=${input.trigger}`);
    return 'busy';
  }
  const deps = input.deps ?? defaultGiftsToCoinsDeps();
  inFlight = runOnce(input.trigger, deps).finally(() => { inFlight = null; });
  return inFlight;
}

async function runOnce(trigger: string, deps: GiftsToCoinsDeps): Promise<GiftsToCoinsOutcome> {
  const startedAt = deps.now();
  const token = captureAccountGeneration();
  const owner = token.stableId;
  if (!owner || token.phase !== 'active' || !isCurrentAccountGeneration(token, owner)) {
    log(`skip reason=identity_not_ready phase=${token.phase} hasOwner=${!!owner} trigger=${trigger}`);
    return 'identity_not_ready';
  }
  try {
    const read = parseWal(await AsyncStorage.getItem(giftsToCoinsWalKey(owner)), owner);
    log(`start owner=${owner.slice(0, 6)} gen=${token.generation} trigger=${trigger} walPhase=${read.status === 'ok' ? read.wal.phase : read.status}`);
    if (read.status === 'corrupt') {
      // Битый журнал НЕ перезапускаем с нуля: это дало бы вторую выплату.
      log('skip reason=wal_corrupt action=left_for_support');
      return 'wal_corrupt';
    }
    let wal = read.status === 'ok' ? read.wal : null;
    if (wal?.phase === 'done') {
      log(`skip reason=already_done total=${wal.totalCoins} report=${wal.report.status}`);
      await sendReportIfPending(wal, token, deps);
      return 'already_done';
    }
    if (wal?.phase === 'blocked' && deps.now() < (wal.blockedUntilMs ?? 0)) {
      log(`skip reason=blocked_backoff until=${wal.blockedUntilMs} corrupt=${wal.corruptSources.join(',')}`);
      await sendReportIfPending(wal, token, deps);
      return 'blocked_backoff';
    }
    const enabled = deps.isEnabled();
    if (!enabled) {
      log(`skip reason=flag_off flag=gifts_to_coins_enabled value=${String(enabled)} walPhase=${wal?.phase ?? 'none'}`);
      return 'flag_off';
    }
    if (!wal || wal.phase === 'blocked') {
      wal = await planRun(token, owner, deps, wal);
    } else {
      log(`resume phase=${wal.phase} run=${wal.run} creditedOps=${wal.creditedOps}/${wal.grants.length} hash=${wal.hash.slice(0, 8)}`);
    }
    if (wal.phase === 'planned') {
      const next = await applyPlusDays(wal, token, deps);
      if (!next) return 'plus_failed';
      wal = next;
    }
    if (wal.phase === 'plus_applied') {
      const next = await creditCoins(wal, token, deps);
      if (!next) return 'credit_failed';
      wal = next;
    }
    if (wal.phase === 'credited') {
      try {
        wal = await retireItems(wal, token, deps);
      } catch (error) {
        if (error instanceof AccountChangedError) throw error;
        logCatch('retire', error);
        return 'retire_failed';
      }
    }
    if (wal.phase === 'retired') {
      assertCurrent(token, owner);
      const blocked = wal.corruptSources.length > 0;
      const nowMs = deps.now();
      wal = Object.freeze({
        ...wal,
        phase: blocked ? 'blocked' : 'done',
        doneAtMs: nowMs,
        updatedAtMs: nowMs,
        ...(blocked ? { blockedUntilMs: nowMs + BLOCKED_RETRY_MS } : {}),
      });
      await writeWal(wal);
    }
    void deps.syncCoins(token).catch((error: unknown) => logCatch('sync_coins', error));
    log(`${wal.phase} total=${wal.totalCoins} items=${wal.items.length} run=${wal.run} `
      + `corrupt=${wal.corruptSources.join(',') || '-'} ms=${deps.now() - startedAt}`);
    await sendReportIfPending(wal, token, deps);
    return wal.phase === 'blocked' ? 'blocked' : 'done';
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
 * Запускает миграцию через ~15 с после старта и при каждой активации аккаунта.
 * Возвращает функцию остановки. Повторный старт — no-op.
 */
export function startGiftsToCoinsMigrationScheduler(
  delayMs: number = GIFTS_TO_COINS_START_DELAY_MS,
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
        void runGiftsToCoinsMigration({ trigger }).catch((error: unknown) => logCatch('scheduler_run', error));
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

export function defaultGiftsToCoinsDeps(): GiftsToCoinsDeps {
  return Object.freeze({
    now: () => Date.now(),
    isEnabled: () => getRemoteBool('gifts_to_coins_enabled'),
    readDailyJourneyPending: async (token) => {
      const { readDailyJourneyGiftProjection } = await import('./daily_journey_gift_inbox');
      const projection = await readDailyJourneyGiftProjection(token);
      return projection.pending.map((item) => Object.freeze({
        operationId: item.operationId,
        ownerStableId: item.ownerStableId,
        payloadFingerprint: item.payloadFingerprint,
        createdAtMs: item.createdAtMs,
        reward: item.reward,
      }));
    },
    applyPlus: async (giftId, occurrenceId, token) => {
      const { applyGift, ALL_LEVEL_GIFT_DEFS } = await import('./level_gift_system');
      const gift = ALL_LEVEL_GIFT_DEFS.find((candidate) => candidate.id === giftId);
      if (!gift) throw new Error(`plus_gift_def_missing:${giftId}`);
      const result = await applyGift(gift, '', 0, 0, () => {}, {
        localOnly: true, preserveGiftId: true, accountToken: token, occurrenceId,
      });
      return result.success === true;
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
    acknowledgePaidSpin: async (requestId) => {
      const { acknowledgeLocalLevelSpin } = await import('./local_level_spins');
      await acknowledgeLocalLevelSpin(requestId);
    },
    cancelExpiringPush: async () => {
      const { syncGiftExpiringNotification } = await import('./notifications');
      await syncGiftExpiringNotification(null);
    },
    sendReport: async (payload) => {
      const { CLOUD_SYNC_ENABLED, IS_EXPO_GO } = await import('./config');
      if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) throw new Error('cloud_disabled');
      const { getApp } = await import('@react-native-firebase/app');
      const { getFunctions, httpsCallable } = await import('@react-native-firebase/functions');
      const fn = httpsCallable(getFunctions(getApp(), 'us-central1'), 'giftsToCoinsMigrationReport');
      await fn(payload);
    },
  });
}

export const __giftsToCoinsTestHooks = Object.freeze({
  parseWal,
  reportPayload,
  resetScheduler: () => { schedulerStarted = false; inFlight = null; },
});

export default function __RouteShim() { return null; }
