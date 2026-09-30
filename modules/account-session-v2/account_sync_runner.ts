import type { SessionFence } from './account_session';
import {
  AccountSyncInvariantError,
  createInitialAccountSyncState,
  reduceAccountSync,
  type AccountSyncEffect,
  type AccountSyncEvent,
  type AccountSyncInvariantErrorCode,
  type AccountSyncOwnedOperation,
  type AccountSyncReduceResult,
  type AccountSyncServerReceipt,
  type AccountSyncState,
} from './account_sync';
import { accountSyncServerClockOffsetMs } from './account_sync_clock';
import {
  captureExactRecord,
  capturedValue,
  capturePorts,
  invalidInput,
  observePort,
  receiptInvalidReason,
  type AccountSyncRunnerPorts,
} from './account_sync_runner_ports';
import { snapshotDispatchState, type AccountSyncDispatchState } from './account_sync_outbox_records';
import {
  ACCOUNT_SYNC_CLIENT_MIN_FAILURE_SPAN_MS,
  decideAccountSyncReceiptFailure,
  decideAccountSyncTransportFailure,
  snapshotAccountSyncTransportError,
  type AccountSyncAttemptLedger,
  type AccountSyncTransportDecision,
  type AccountSyncTransportError,
} from './account_sync_transport';

type LoadEffect = Extract<AccountSyncEffect, { type: 'LOAD_OUTBOX_BATCH' }>;
type DispatchEffect = Extract<AccountSyncEffect, { type: 'DISPATCH_OUTBOX_BATCH' }>;
type AckEffect = Extract<AccountSyncEffect, { type: 'COMMIT_OUTBOX_ACKS' }>;
type QuarantineEffect = Extract<AccountSyncEffect, { type: 'QUARANTINE_OUTBOX_BATCH' }>;
export type AccountSyncConfirmation = Extract<
  AccountSyncEffect,
  { type: 'REPORT_SYNC_CONFIRMED' }
>;
export type AccountSyncQuarantineReport = Extract<
  AccountSyncEffect,
  { type: 'REPORT_SYNC_QUARANTINED' }
>;

export type { AccountSyncRunnerPorts } from './account_sync_runner_ports';

export type AccountSyncRunnerOptions = Readonly<{
  nowMs?: () => number;
  random?: () => number;
}>;

/** Что раннер решил по ошибке транспорта; `not_before` — пауза backoff/ожидания ещё идёт. */
export type AccountSyncTransportReport = Readonly<{
  action: 'reauth' | 'wait' | 'retry' | 'quarantine' | 'not_before';
  failedAttempts: number;
  delayMs: number;
  errorCode: string;
}>;

/** Квитанция conflict/rejected вместе с операцией — вход для слоя разрешения конфликтов. */
export type AccountSyncResolution = Readonly<{
  operation: AccountSyncOwnedOperation;
  receipt: AccountSyncServerReceipt;
}>;

export type AccountSyncRunnerResult = Readonly<{
  evidenceKind: 'sync_runner_port_only';
  state: AccountSyncState;
  confirmations: readonly AccountSyncConfirmation[];
  failure: AccountSyncInvariantErrorCode | null;
  transport: AccountSyncTransportReport | null;
  resolutions: readonly AccountSyncResolution[];
  quarantines: readonly AccountSyncQuarantineReport[];
}>;

export type AccountSyncRunner = Readonly<{
  runOneBatch(): Promise<AccountSyncRunnerResult>;
  invalidate(): void;
  getState(): AccountSyncState;
  /** serverNowMs − Date.now() из последнего ответа сервера; null — ответа ещё не было. */
  getServerClockOffsetMs(): number | null;
}>;

type FlightExtras = {
  transport: AccountSyncTransportReport | null;
  resolutions: readonly AccountSyncResolution[];
  quarantines: readonly AccountSyncQuarantineReport[];
};

const EMPTY_CONFIRMATIONS: readonly AccountSyncConfirmation[] = Object.freeze([]);
const EMPTY_RESOLUTIONS: readonly AccountSyncResolution[] = Object.freeze([]);
const EMPTY_QUARANTINES: readonly AccountSyncQuarantineReport[] = Object.freeze([]);
const NO_EXTRAS: FlightExtras = Object.freeze({
  transport: null, resolutions: EMPTY_RESOLUTIONS, quarantines: EMPTY_QUARANTINES,
});
const LOG = '[ACCOUNTS-V2-CLIENT]';
/** Легаси-ответ `{outcome:'rejected'}` — засчитанная неудача с backoff и потолком. */
const LEGACY_REJECTED: AccountSyncTransportError = Object.freeze({ code: 'legacy_rejected', details: undefined });
/**
 * Больше этого пауза с диска не бывает (суточный блок сервера + запас). зачем:
 * часы телефона перевели назад на месяц — сохранённая пауза не должна запереть отправку.
 */
const MAX_PERSISTED_PAUSE_MS = ACCOUNT_SYNC_CLIENT_MIN_FAILURE_SPAN_MS + 60 * 60 * 1000;
/** Смещение часов пишется на диск, только если сдвинулось хотя бы на столько. */
const OFFSET_PERSIST_STEP_MS = 1_000;

function result(
  state: AccountSyncState,
  confirmations: readonly AccountSyncConfirmation[] = EMPTY_CONFIRMATIONS,
  failure: AccountSyncInvariantErrorCode | null = null,
  extras: FlightExtras = NO_EXTRAS,
): AccountSyncRunnerResult {
  return Object.freeze({
    evidenceKind: 'sync_runner_port_only' as const,
    state,
    confirmations: confirmations.length === 0
      ? EMPTY_CONFIRMATIONS : Object.freeze([...confirmations]),
    failure,
    transport: extras.transport,
    resolutions: extras.resolutions.length === 0 ? EMPTY_RESOLUTIONS : Object.freeze([...extras.resolutions]),
    quarantines: extras.quarantines.length === 0 ? EMPTY_QUARANTINES : Object.freeze([...extras.quarantines]),
  });
}

function reducerFailureCode(error: unknown): AccountSyncInvariantErrorCode {
  return error instanceof AccountSyncInvariantError
    ? error.code : 'account_sync_invalid_input';
}

class AccountSyncRunnerImpl implements AccountSyncRunner {
  private state: AccountSyncState;
  private readonly ports: AccountSyncRunnerPorts;
  private readonly isCurrentFence: (expectedFence: SessionFence) => unknown;
  private readonly nowMs: () => number;
  private readonly random: () => number;
  private flight: Promise<AccountSyncRunnerResult> | null = null;
  private cancelFlight: (() => void) | null = null;
  // Учёт неудач ТЕКУЩЕГО пакета (TEMP-контракт). Живёт в памяти раннера и, если
  // даны порты учёта, дублируется на диск (переживает перезапуск, TG-7CD73967EF61).
  private attemptBatchId: string | null = null;
  private failedAttempts = 0;
  private firstFailureAtMs: number | null = null;
  private notBeforeMs: number | null = null;
  private lastErrorCode = 'none';
  private blockedReport: AccountSyncTransportReport | null = null;
  private clockOffsetMs: number | null = null;
  private persistedOffsetMs: number | null = null;
  private dispatchDirty = false;
  private extras: FlightExtras = { ...NO_EXTRAS };
  private lastAck: AckEffect | null = null;

  constructor(
    ownerUid: string,
    fence: SessionFence,
    pendingCount: number,
    ports: AccountSyncRunnerPorts,
    isCurrentFence: (expectedFence: SessionFence) => unknown,
    options: AccountSyncRunnerOptions | undefined,
  ) {
    if (typeof isCurrentFence !== 'function') invalidInput();
    const nowMs = options?.nowMs ?? Date.now;
    const random = options?.random ?? Math.random;
    if (typeof nowMs !== 'function' || typeof random !== 'function') invalidInput();
    this.ports = capturePorts(ports);
    this.isCurrentFence = isCurrentFence;
    this.nowMs = nowMs;
    this.random = random;
    this.state = createInitialAccountSyncState(ownerUid, fence, pendingCount);
  }

  getState(): AccountSyncState {
    return this.state;
  }

  getServerClockOffsetMs(): number | null {
    return this.clockOffsetMs;
  }

  private readState(): AccountSyncState {
    return this.state;
  }

  invalidate(): void {
    this.stop();
    this.cancelFlight?.();
  }

  runOneBatch(): Promise<AccountSyncRunnerResult> {
    if (this.flight !== null) return this.flight;

    let resolveFlight!: (value: AccountSyncRunnerResult) => void;
    const installed = new Promise<AccountSyncRunnerResult>((resolve) => {
      resolveFlight = resolve;
    });
    let cancel!: () => void;
    const invalidated = new Promise<void>((resolve) => {
      cancel = resolve;
    });
    this.flight = installed;
    this.cancelFlight = cancel;

    const settle = (candidate: AccountSyncRunnerResult): void => {
      const value = this.finalizeFlight(candidate);
      if (this.flight === installed) {
        this.flight = null;
        this.cancelFlight = null;
      }
      resolveFlight(value);
    };
    this.driveOneBatch(invalidated).then(
      settle,
      (error: unknown) => settle(this.failClosed(reducerFailureCode(error))),
    );
    return installed;
  }

  private stop(): void {
    if (this.state.phase.tag === 'stopped') return;
    try {
      this.state = reduceAccountSync(this.state, {
        type: 'SESSION_INVALIDATED', expectedFence: this.state.fence,
      }).state;
    } catch (error) {
      console.warn(`${LOG} runner_stop_forced`, reducerFailureCode(error));
      this.state = Object.freeze({
        ownerUid: this.state.ownerUid,
        fence: this.state.fence,
        pendingCount: this.state.pendingCount,
        attemptEpoch: this.state.attemptEpoch,
        phase: Object.freeze({ tag: 'stopped' as const }),
      });
    }
  }

  private failClosed(code: AccountSyncInvariantErrorCode): AccountSyncRunnerResult {
    console.warn(`${LOG} runner_fail_closed`, code);
    this.stop();
    return result(this.state, EMPTY_CONFIRMATIONS, code);
  }

  private flightResult(confirmations: readonly AccountSyncConfirmation[] = EMPTY_CONFIRMATIONS): AccountSyncRunnerResult {
    return result(this.state, confirmations, null, this.extras);
  }

  private finalizeFlight(candidate: AccountSyncRunnerResult): AccountSyncRunnerResult {
    const candidateState = candidate.state;
    const stateBeforeGuard = this.readState();
    if (stateBeforeGuard !== candidateState || stateBeforeGuard.phase.tag === 'stopped') {
      return result(stateBeforeGuard, EMPTY_CONFIRMATIONS, candidate.failure);
    }
    if (!this.currentFenceOrStop()) {
      return result(this.readState(), EMPTY_CONFIRMATIONS, candidate.failure);
    }
    const stateAfterGuard = this.readState();
    if (stateAfterGuard !== candidateState || stateAfterGuard.phase.tag === 'stopped') {
      return result(stateAfterGuard, EMPTY_CONFIRMATIONS, candidate.failure);
    }
    return candidate;
  }

  private currentFenceOrStop(): boolean {
    const stateBeforeCheck = this.readState();
    if (stateBeforeCheck.phase.tag === 'stopped') return false;
    let current = false;
    try {
      current = this.isCurrentFence(stateBeforeCheck.fence) === true;
    } catch (error) {
      console.warn(`${LOG} fence_check_threw`, error instanceof Error ? error.name : typeof error);
      current = false;
    }
    const stateAfterCheck = this.readState();
    if (!current || stateAfterCheck !== stateBeforeCheck
      || stateAfterCheck.phase.tag === 'stopped') {
      this.stop();
      return false;
    }
    return true;
  }

  private reduce(event: AccountSyncEvent): readonly AccountSyncEffect[] {
    const baseState = this.state;
    return this.commitReduced(baseState, reduceAccountSync(baseState, event));
  }

  /** Публикует уже посчитанный переход, если за время расчёта не сменились состояние и сессия. */
  private commitReduced(baseState: AccountSyncState, reduced: AccountSyncReduceResult): readonly AccountSyncEffect[] {
    if (this.state !== baseState || this.state.phase.tag === 'stopped') return EMPTY_CONFIRMATIONS;
    if (!this.currentFenceOrStop() || this.state !== baseState) return EMPTY_CONFIRMATIONS;
    this.state = reduced.state;
    return reduced.effects;
  }

  private now(): number {
    const value = this.nowMs();
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
  }

  /** Часы телефона с поправкой на сервер (для «суток с первой неудачи»). */
  private serverNow(): number {
    return Math.max(0, this.now() + (this.clockOffsetMs ?? 0));
  }

  private ledger(): AccountSyncAttemptLedger {
    return Object.freeze({ failedAttempts: this.failedAttempts, firstFailureAtMs: this.firstFailureAtMs });
  }

  private resetAttempts(batchId: string | null): void {
    const changed = this.attemptBatchId !== batchId || this.failedAttempts !== 0
      || this.firstFailureAtMs !== null || this.notBeforeMs !== null;
    this.attemptBatchId = batchId;
    this.failedAttempts = 0;
    this.firstFailureAtMs = null;
    this.notBeforeMs = null;
    this.blockedReport = null;
    this.lastErrorCode = 'none';
    if (changed) this.dispatchDirty = true;
  }

  private needsFlush(): boolean {
    return this.dispatchDirty && this.ports.writeDispatchState !== undefined;
  }

  /** Пишет учёт отправки на диск. Сбой записи не роняет отправку: учёт в памяти остаётся. */
  private async flushDispatchState(invalidated: Promise<void>): Promise<'ok' | 'invalidated'> {
    const write = this.ports.writeDispatchState;
    if (!this.dispatchDirty || write === undefined) return 'ok';
    const snapshot: AccountSyncDispatchState = Object.freeze({
      batchId: this.attemptBatchId, failedAttempts: this.failedAttempts, firstFailureAtMs: this.firstFailureAtMs,
      notBeforeMs: this.notBeforeMs, clockOffsetMs: this.clockOffsetMs,
    });
    const settlement = await observePort(() => write(this.state.fence, snapshot), invalidated);
    if (settlement.kind === 'invalidated') return 'invalidated';
    if (settlement.kind === 'rejected') {
      console.warn(`${LOG} dispatch_state_write_failed`,
        settlement.error instanceof Error ? settlement.error.name : typeof settlement.error);
      return 'ok';
    }
    this.dispatchDirty = false;
    this.persistedOffsetMs = snapshot.clockOffsetMs;
    return 'ok';
  }

  /** Читает учёт отправки с диска перед новым пакетом (после перезапуска память пуста). */
  private async hydrateDispatchState(invalidated: Promise<void>): Promise<'ok' | 'invalidated'> {
    const read = this.ports.readDispatchState;
    if (read === undefined) return 'ok';
    // Прошлая запись не удалась — на диске старое; сначала дописываем память.
    if (this.dispatchDirty) return this.flushDispatchState(invalidated);
    const settlement = await observePort(() => read(this.state.fence), invalidated);
    if (settlement.kind === 'invalidated') return 'invalidated';
    if (settlement.kind === 'rejected') {
      console.warn(`${LOG} dispatch_state_read_failed`,
        settlement.error instanceof Error ? settlement.error.name : typeof settlement.error);
      return 'ok';
    }
    const stored = snapshotDispatchState(settlement.value);
    if (stored === null) {
      console.warn(`${LOG} dispatch_state_invalid`);
      return 'ok';
    }
    this.attemptBatchId = stored.batchId;
    this.failedAttempts = stored.failedAttempts;
    this.firstFailureAtMs = stored.firstFailureAtMs;
    const now = this.now();
    this.notBeforeMs = stored.notBeforeMs === null ? null : Math.min(stored.notBeforeMs, now + MAX_PERSISTED_PAUSE_MS);
    if (stored.notBeforeMs !== null && stored.notBeforeMs > now + MAX_PERSISTED_PAUSE_MS) {
      console.warn(`${LOG} dispatch_pause_clamped`, `aheadMs=${stored.notBeforeMs - now}`);
    }
    if (stored.clockOffsetMs !== null) this.clockOffsetMs = stored.clockOffsetMs;
    this.persistedOffsetMs = stored.clockOffsetMs;
    return 'ok';
  }

  private updateClockOffset(serverNowMs: number): void {
    try {
      const offset = accountSyncServerClockOffsetMs(serverNowMs, this.now());
      this.clockOffsetMs = offset;
      if (this.persistedOffsetMs === null || Math.abs(offset - this.persistedOffsetMs) >= OFFSET_PERSIST_STEP_MS) {
        this.dispatchDirty = true;
      }
    } catch (error) {
      console.warn(`${LOG} clock_offset_rejected`, reducerFailureCode(error));
    }
  }

  private malformedLoadEvent(effect: LoadEffect): AccountSyncEvent {
    return Object.freeze({
      type: 'OUTBOX_BATCH_LOADED' as const,
      expectedFence: effect.expectedFence,
      attemptEpoch: effect.attemptEpoch,
      batchId: 'malformed-load-response',
      operations: Object.freeze([undefined]),
      pendingCount: this.state.pendingCount,
    });
  }

  private reduceLoadResponse(effect: LoadEffect, value: unknown): readonly AccountSyncEffect[] {
    const captured = captureExactRecord(value, ['batchId', 'operations', 'pendingCount']);
    if (captured === null) return this.reduce(this.malformedLoadEvent(effect));
    try {
      return this.reduce({
        type: 'OUTBOX_BATCH_LOADED',
        expectedFence: effect.expectedFence,
        attemptEpoch: effect.attemptEpoch,
        batchId: capturedValue(captured, 'batchId') as string,
        operations: capturedValue(captured, 'operations') as readonly unknown[],
        pendingCount: capturedValue(captured, 'pendingCount') as number,
      });
    } catch (error) {
      console.warn(`${LOG} load_response_invalid`, reducerFailureCode(error));
      return this.reduce(this.malformedLoadEvent(effect));
    }
  }

  private malformedDispatchEvent(effect: DispatchEffect): AccountSyncEvent {
    return Object.freeze({
      type: 'DISPATCH_RESPONSE_RECEIVED' as const,
      expectedFence: effect.expectedFence,
      attemptEpoch: effect.attemptEpoch,
      batchId: effect.batch.batchId,
      receipts: EMPTY_CONFIRMATIONS,
    });
  }

  /** Ответ `{outcome:'accepted', receipts, serverNowMs?}`; serverNowMs — только safe integer ≥ 0. */
  private captureAccepted(value: unknown): Readonly<{ receipts: unknown; serverNowMs: number | null }> | null {
    const plain = captureExactRecord(value, ['outcome', 'receipts']);
    const withClock = plain === null ? captureExactRecord(value, ['outcome', 'receipts', 'serverNowMs']) : null;
    const accepted = plain ?? withClock;
    if (accepted === null || capturedValue(accepted, 'outcome') !== 'accepted') return null;
    if (withClock === null) return Object.freeze({ receipts: capturedValue(accepted, 'receipts'), serverNowMs: null });
    const serverNowMs = capturedValue(withClock, 'serverNowMs');
    if (typeof serverNowMs !== 'number' || !Number.isSafeInteger(serverNowMs) || serverNowMs < 0) {
      console.warn(`${LOG} server_now_invalid`, typeof serverNowMs);
      return null;
    }
    return Object.freeze({ receipts: capturedValue(accepted, 'receipts'), serverNowMs });
  }

  private reduceDispatchResponse(
    effect: DispatchEffect,
    value: unknown,
  ): readonly AccountSyncEffect[] {
    const rejected = captureExactRecord(value, ['outcome']);
    if (rejected !== null && capturedValue(rejected, 'outcome') === 'rejected') {
      // зачем (TG-7CD73967EF61, P3): легаси-отказ раньше повторялся сразу и без потолка.
      return this.countTransportFailure(effect, LEGACY_REJECTED, 'rejected');
    }
    const accepted = this.captureAccepted(value);
    const malformed = (): readonly AccountSyncEffect[] => this.reduce(this.malformedDispatchEvent(effect));
    if (accepted === null) return this.receiptFailure(effect, malformed, 'response_malformed');
    if (accepted.serverNowMs !== null) this.updateClockOffset(accepted.serverNowMs);
    const baseState = this.state;
    let preview: AccountSyncReduceResult;
    try {
      preview = reduceAccountSync(baseState, {
        type: 'DISPATCH_RESPONSE_RECEIVED',
        expectedFence: effect.expectedFence,
        attemptEpoch: effect.attemptEpoch,
        batchId: effect.batch.batchId,
        receipts: accepted.receipts as readonly unknown[],
      });
    } catch (error) {
      console.warn(`${LOG} dispatch_response_invalid`, reducerFailureCode(error));
      return this.receiptFailure(effect, malformed, 'receipts_unreadable');
    }
    const phase = preview.state.phase;
    if (phase.tag === 'sync_attention' && phase.code === 'sync_receipt_invalid') {
      return this.receiptFailure(effect, () => this.commitReduced(baseState, preview),
        receiptInvalidReason(accepted.receipts, effect.batch));
    }
    // зачем (TG-7CD73967EF61, P2): учёт неудач сбрасывается ТОЛЬКО после того,
    // как квитанции прошли проверку — иначе вечные «кривые» квитанции обнуляли
    // счётчик каждым ответом и потолок не наступал никогда.
    this.resetAttempts(null);
    return this.commitReduced(baseState, preview);
  }

  /**
   * Общее для засчитанных неудач: учёт, лог (коды и числа, без содержимого),
   * пауза, карантин по потолку. onRetry — переход в sync_attention, onBlocked —
   * переход без повторной отправки, когда порта карантина нет.
   */
  private applyFailureDecision(
    effect: DispatchEffect,
    decision: AccountSyncTransportDecision,
    onRetry: () => readonly AccountSyncEffect[],
    onBlocked: () => readonly AccountSyncEffect[],
    label: string,
  ): readonly AccountSyncEffect[] {
    const serverNow = this.serverNow();
    if (decision.firstFailureAtMs !== null && serverNow < decision.firstFailureAtMs) {
      console.warn(`${LOG} attempt_clock_backwards`, `behindMs=${decision.firstFailureAtMs - serverNow}`);
    }
    this.failedAttempts = decision.failedAttempts;
    this.firstFailureAtMs = decision.firstFailureAtMs;
    this.lastErrorCode = decision.errorCode;
    this.dispatchDirty = true;
    const report: AccountSyncTransportReport = Object.freeze({
      action: decision.action, failedAttempts: decision.failedAttempts,
      delayMs: decision.delayMs, errorCode: decision.errorCode,
    });
    this.extras.transport = report;
    console.warn(`${LOG} ${label}`, `action=${decision.action}`, `code=${decision.errorCode}`,
      `attempts=${decision.failedAttempts}`, `delayMs=${decision.delayMs}`,
      `operations=${effect.batch.operations.length}`);
    if (decision.action === 'quarantine' && decision.quarantineCode !== null) {
      this.notBeforeMs = null;
      if (this.ports.quarantine === undefined) {
        // зачем: без порта карантина пакет НЕ отправляется снова (тот же отказ навсегда).
        console.warn(`${LOG} quarantine_port_missing`, `code=${decision.quarantineCode}`);
        this.blockedReport = report;
        return onBlocked();
      }
      return this.reduce({
        type: 'DISPATCH_QUARANTINE_REQUESTED', expectedFence: effect.expectedFence,
        attemptEpoch: effect.attemptEpoch, batchId: effect.batch.batchId,
        quarantineCode: decision.quarantineCode,
      });
    }
    this.notBeforeMs = decision.delayMs > 0 ? this.now() + decision.delayMs : null;
    return onRetry();
  }

  private countTransportFailure(
    effect: DispatchEffect,
    error: AccountSyncTransportError,
    reason: 'transport' | 'rejected',
  ): readonly AccountSyncEffect[] {
    if (this.attemptBatchId !== effect.batch.batchId) this.resetAttempts(effect.batch.batchId);
    const decision = decideAccountSyncTransportFailure(error, this.ledger(), this.serverNow(), this.random);
    const failed = (failedReason: 'transport' | 'rejected'): readonly AccountSyncEffect[] => this.reduce({
      type: 'DISPATCH_FAILED', expectedFence: effect.expectedFence,
      attemptEpoch: effect.attemptEpoch, batchId: effect.batch.batchId, reason: failedReason,
    });
    return this.applyFailureDecision(effect, decision, () => failed(reason), () => failed('rejected'), 'dispatch_failed');
  }

  /** Квитанции не прошли проверку: засчитанная неудача (backoff, потолок, свой код карантина). */
  private receiptFailure(
    effect: DispatchEffect,
    attention: () => readonly AccountSyncEffect[],
    reason: string,
  ): readonly AccountSyncEffect[] {
    if (this.attemptBatchId !== effect.batch.batchId) this.resetAttempts(effect.batch.batchId);
    console.warn(`${LOG} receipt_invalid`, `reason=${reason}`, `operations=${effect.batch.operations.length}`);
    const decision = decideAccountSyncReceiptFailure(this.ledger(), this.serverNow(), this.random);
    return this.applyFailureDecision(effect, decision, attention, attention, 'receipt_failed');
  }

  /**
   * Ошибка транспорта → решение по TEMP-контракту сервера (копия эталона в
   * account_sync_transport.ts). Логируются только код, действие и числа.
   */
  private reduceTransportFailure(effect: DispatchEffect, raw: unknown): readonly AccountSyncEffect[] {
    return this.countTransportFailure(effect, snapshotAccountSyncTransportError(raw), 'transport');
  }

  private reduceQuarantineResponse(effect: QuarantineEffect, value: unknown): readonly AccountSyncEffect[] {
    const captured = captureExactRecord(value, ['quarantinedOperationIds', 'remainingPendingCountObserved']);
    const malformed = (): readonly AccountSyncEffect[] => this.reduce({
      type: 'QUARANTINE_COMMIT_CONFIRMED', expectedFence: effect.expectedFence,
      attemptEpoch: effect.attemptEpoch, batchId: effect.batch.batchId,
      quarantinedOperationIds: EMPTY_CONFIRMATIONS, remainingPendingCountObserved: this.state.pendingCount,
    });
    if (captured === null) return malformed();
    try {
      return this.reduce({
        type: 'QUARANTINE_COMMIT_CONFIRMED', expectedFence: effect.expectedFence,
        attemptEpoch: effect.attemptEpoch, batchId: effect.batch.batchId,
        quarantinedOperationIds: capturedValue(captured, 'quarantinedOperationIds') as readonly unknown[],
        remainingPendingCountObserved: capturedValue(captured, 'remainingPendingCountObserved') as number,
      });
    } catch (error) {
      console.warn(`${LOG} quarantine_response_invalid`, reducerFailureCode(error));
      return malformed();
    }
  }

  private malformedAckEvent(effect: AckEffect): AccountSyncEvent {
    return Object.freeze({
      type: 'ACK_COMMIT_CONFIRMED' as const,
      expectedFence: effect.expectedFence,
      attemptEpoch: effect.attemptEpoch,
      batchId: effect.batch.batchId,
      committedOperationIds: EMPTY_CONFIRMATIONS,
      remainingPendingCountObserved: this.state.pendingCount,
    });
  }

  private reduceAckResponse(effect: AckEffect, value: unknown): readonly AccountSyncEffect[] {
    const captured = captureExactRecord(
      value,
      ['committedOperationIds', 'remainingPendingCountObserved'],
    );
    if (captured === null) return this.reduce(this.malformedAckEvent(effect));
    try {
      return this.reduce({
        type: 'ACK_COMMIT_CONFIRMED',
        expectedFence: effect.expectedFence,
        attemptEpoch: effect.attemptEpoch,
        batchId: effect.batch.batchId,
        committedOperationIds: capturedValue(captured, 'committedOperationIds') as readonly unknown[],
        remainingPendingCountObserved:
          capturedValue(captured, 'remainingPendingCountObserved') as number,
      });
    } catch (error) {
      console.warn(`${LOG} ack_response_invalid`, reducerFailureCode(error));
      return this.reduce(this.malformedAckEvent(effect));
    }
  }

  /** conflict/rejected подтверждённого пакета — слою разрешения конфликтов (без повтора). */
  private resolutionsOf(confirmation: AccountSyncConfirmation): readonly AccountSyncResolution[] {
    const ack = this.lastAck;
    if (ack === null || ack.batch.batchId !== confirmation.batchId) return EMPTY_RESOLUTIONS;
    const found = ack.receipts.flatMap((receipt, index) => (
      receipt.outcome === 'conflict' || receipt.outcome === 'rejected'
        ? [Object.freeze({ operation: ack.batch.operations[index], receipt })] : []
    ));
    if (found.length > 0) {
      console.warn(`${LOG} receipts_need_resolution`, `count=${found.length}`,
        `rejected=${found.filter(({ receipt }) => receipt.outcome === 'rejected').length}`);
    }
    return found;
  }

  /**
   * Пауза с диска (после перезапуска или requeue) ещё идёт — пакет даже не
   * загружается. зачем (TG-7CD73967EF61): иначе перезапуск приложения обходил бы backoff.
   */
  private idleGatedResult(): AccountSyncRunnerResult | null {
    if (this.state.phase.tag !== 'idle' || this.notBeforeMs === null) return null;
    const remaining = this.notBeforeMs - this.now();
    if (remaining <= 0) return null;
    return result(this.state, EMPTY_CONFIRMATIONS, null, { ...NO_EXTRAS, transport: Object.freeze({
      action: 'not_before' as const, failedAttempts: this.failedAttempts,
      delayMs: Math.ceil(remaining), errorCode: this.lastErrorCode,
    }) });
  }

  /** Пауза перед повтором отправки ещё идёт, или пакет заблокирован без порта карантина. */
  private gatedResult(): AccountSyncRunnerResult | null {
    const phase = this.state.phase;
    if (phase.tag !== 'sync_attention' || phase.retry.stage !== 'dispatch'
      || phase.retry.batch.batchId !== this.attemptBatchId) return null;
    if (this.blockedReport !== null) {
      return result(this.state, EMPTY_CONFIRMATIONS, null, { ...NO_EXTRAS, transport: this.blockedReport });
    }
    if (this.notBeforeMs === null) return null;
    const remaining = this.notBeforeMs - this.now();
    if (remaining <= 0) return null;
    return result(this.state, EMPTY_CONFIRMATIONS, null, { ...NO_EXTRAS, transport: Object.freeze({
      action: 'not_before' as const, failedAttempts: this.failedAttempts,
      delayMs: Math.ceil(remaining), errorCode: this.lastErrorCode,
    }) });
  }

  private invokePort(effect: Exclude<AccountSyncEffect, AccountSyncConfirmation | AccountSyncQuarantineReport>): unknown {
    if (effect.type === 'LOAD_OUTBOX_BATCH') return this.ports.load(effect);
    if (effect.type === 'DISPATCH_OUTBOX_BATCH') return this.ports.dispatch(effect);
    if (effect.type === 'QUARANTINE_OUTBOX_BATCH') {
      const port = this.ports.quarantine;
      if (port === undefined) throw new AccountSyncInvariantError('account_sync_invalid_input');
      return port(effect);
    }
    this.lastAck = effect;
    return this.ports.ackCommit(effect);
  }

  private async driveOneBatch(invalidated: Promise<void>): Promise<AccountSyncRunnerResult> {
    this.extras = { ...NO_EXTRAS };
    if (this.state.phase.tag === 'stopped') return result(this.state);
    // Без портов учёта — ни одного лишнего ожидания (порядок вызовов прежний).
    if (this.state.phase.tag === 'idle' && this.ports.readDispatchState !== undefined) {
      if (await this.hydrateDispatchState(invalidated) === 'invalidated') return result(this.state);
      if (!this.currentFenceOrStop()) return result(this.state);
      const idleGated = this.idleGatedResult();
      if (idleGated !== null) return idleGated;
    }
    const gated = this.gatedResult();
    if (gated !== null) return gated;
    let effects: readonly AccountSyncEffect[];
    try {
      effects = this.reduce(this.state.phase.tag === 'idle'
        ? { type: 'SYNC_REQUESTED' }
        : { type: 'RETRY_REQUESTED' });
    } catch (error) {
      return this.failClosed(reducerFailureCode(error));
    }

    while (effects.length > 0) {
      const effect = effects[0];
      if (effect.type === 'REPORT_SYNC_CONFIRMED') {
        if (!this.currentFenceOrStop()) return result(this.state);
        this.extras.resolutions = this.resolutionsOf(effect);
        return this.flightResult(Object.freeze([effect]));
      }
      if (effect.type === 'REPORT_SYNC_QUARANTINED') {
        if (!this.currentFenceOrStop()) return result(this.state);
        this.resetAttempts(null);
        if (this.needsFlush()) {
          if (await this.flushDispatchState(invalidated) === 'invalidated') return result(this.state);
          if (!this.currentFenceOrStop()) return result(this.state);
        }
        this.extras.quarantines = Object.freeze([effect]);
        return this.flightResult();
      }
      if (!this.currentFenceOrStop()) return result(this.state);

      const settlement = await observePort(() => this.invokePort(effect), invalidated);
      if (settlement.kind === 'invalidated') return result(this.state);
      if (!this.currentFenceOrStop()) return result(this.state);

      try {
        if (effect.type === 'LOAD_OUTBOX_BATCH') {
          effects = settlement.kind === 'rejected'
            ? this.reduce({ type: 'OUTBOX_LOAD_FAILED', expectedFence: effect.expectedFence,
              attemptEpoch: effect.attemptEpoch })
            : this.reduceLoadResponse(effect, settlement.value);
        } else if (effect.type === 'DISPATCH_OUTBOX_BATCH') {
          effects = settlement.kind === 'rejected'
            ? this.reduceTransportFailure(effect, settlement.error)
            : this.reduceDispatchResponse(effect, settlement.value);
        } else if (effect.type === 'QUARANTINE_OUTBOX_BATCH') {
          effects = settlement.kind === 'rejected'
            ? this.reduce({ type: 'QUARANTINE_COMMIT_FAILED', expectedFence: effect.expectedFence,
              attemptEpoch: effect.attemptEpoch, batchId: effect.batch.batchId })
            : this.reduceQuarantineResponse(effect, settlement.value);
        } else {
          effects = settlement.kind === 'rejected'
            ? this.reduce({ type: 'ACK_COMMIT_FAILED', expectedFence: effect.expectedFence,
              attemptEpoch: effect.attemptEpoch, batchId: effect.batch.batchId })
            : this.reduceAckResponse(effect, settlement.value);
        }
      } catch (error) {
        return this.failClosed(reducerFailureCode(error));
      }
      if (this.needsFlush()) {
        if (await this.flushDispatchState(invalidated) === 'invalidated') return result(this.state);
        if (!this.currentFenceOrStop()) return result(this.state);
      }
    }
    return this.flightResult();
  }
}

export function createAccountSyncRunner(
  ownerUid: string,
  fence: SessionFence,
  pendingCount: number,
  ports: AccountSyncRunnerPorts,
  isCurrentFence: (expectedFence: SessionFence) => unknown,
  options?: AccountSyncRunnerOptions,
): AccountSyncRunner {
  return Object.seal(new AccountSyncRunnerImpl(
    ownerUid, fence, pendingCount, ports, isCurrentFence, options,
  ));
}
