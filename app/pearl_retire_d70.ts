/**
 * pearl_retire_d70.ts — обнуление остатка жемчуга на устройстве (D70 + D84).
 *
 * зачем (владелец 2026-09-30): жемчуг удаляется у пользователей ВМЕСТЕ с остатками и
 * без компенсации (D70, отменяет D15). Остатки удаляются ТОЛЬКО в приложении — клиент
 * обнуляет свой локальный жемчуг, боевую базу скриптом не трогаем (D84).
 *
 * Как устроено:
 * - баланс жемчуга — проекция неизменяемого клиентского журнала
 *   (app/economy/client_shard_operation_ledger.ts). Поэтому обнуляем не «записью
 *   нуля поверх», а ОДНОЙ операцией списания всего остатка в том же журнале —
 *   тогда облачная копия журнала (существующая синхронизация PhoneState) несёт то же
 *   списание, и остаток не «воскресает» при входе с другого устройства;
 * - id операции детерминирован по состоянию журнала (ревизия + голова + баланс):
 *   повтор после краха даёт 'already-applied', а не второе списание;
 * - запускается на каждом старте, но работает только если баланс > 0 — поэтому
 *   поздно пришедшее историческое начисление тоже обнулится при следующем входе;
 * - исторические открытия уроков (lessons_pearl_unlocked_v1) НЕ трогаем (PM-148-A2):
 *   они живут отдельным ключом, списание их не касается;
 * - никаких чтений/записей Firestore здесь нет — только локальный журнал.
 *
 * Логи: единый префикс [PEARL-RETIRE] — вся цепочка ищется одним grep.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  type AccountGenerationToken,
} from './account_generation';
import {
  clientShardLedgerStateStorageKey,
  commitClientShardOperation,
  isTerminalPreparedRecoveryReason,
  recoverPreparedClientShardOperation,
} from './economy/client_shard_operation_ledger';
import { emitAppEvent } from './events';
import { getShardsBalance } from './shards_system';
import { DebugLogger } from './debug-logger';

const LOG = '[PEARL-RETIRE]';
export const PEARL_RETIRE_REASON = 'pearl_retire_d70';
export const PEARL_RETIRE_GRANT_KIND = 'pearl_retire';
export const PEARL_RETIRE_RECEIPT_PREFIX = 'pearl_retire_d70_receipt_v1:';
/** Не на первом кадре (Performance Bible): старт и первый экран важнее. */
export const PEARL_RETIRE_START_DELAY_MS = 20_000;

export type PearlRetireOutcome =
  | 'retired'
  | 'already_retired'
  | 'nothing_to_retire'
  | 'negative_balance_left'
  | 'ledger_not_initialized'
  | 'account_inactive'
  | 'account_changed'
  | 'ledger_state_corrupt'
  | 'prepared_recovery_failed'
  | 'debit_failed';

type LedgerStateSnapshot = Readonly<{
  balance: number;
  revision: number;
  headOperationId: string | null;
}>;

function log(message: string): void {
  // Не __DEV__-only: шаг денежной операции должен быть виден и в проде.
  console.log(`${LOG} ${message}`); // guard-ok: редкое событие, раз за старт
}

function logCatch(step: string, error: unknown): void {
  const err = error instanceof Error ? error : new Error(String(error));
  console.warn(`${LOG} catch step=${step} error=${err.message}`);
  DebugLogger.error(`pearl_retire:${step}`, err, 'warning');
}

/** Разбор состояния журнала. null — ключа нет; 'corrupt' — ключ есть, но битый. */
export function parsePearlLedgerState(
  raw: string | null,
  ownerStableId: string,
): LedgerStateSnapshot | null | 'corrupt' {
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (
      parsed?.schemaVersion !== 'client-shard-ledger-state.v1'
      || parsed.ownerStableId !== ownerStableId
      || !Number.isSafeInteger(parsed.balance)
      || !Number.isSafeInteger(parsed.revision)
      || (parsed.headOperationId !== null && typeof parsed.headOperationId !== 'string')
    ) return 'corrupt';
    return {
      balance: Number(parsed.balance),
      revision: Number(parsed.revision),
      headOperationId: (parsed.headOperationId as string | null) ?? null,
    };
  } catch {
    return 'corrupt';
  }
}

/** Детерминированный id: одинаковое состояние журнала → одна и та же операция. */
export async function pearlRetireOperationId(
  ownerStableId: string,
  state: LedgerStateSnapshot,
): Promise<string> {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    JSON.stringify(['pearl-retire.d70.v1', ownerStableId, state.revision, state.headOperationId, state.balance]),
  );
  return `d70pr1:${digest.slice(0, 40)}`;
}

function isCurrent(token: AccountGenerationToken, owner: string): boolean {
  return Boolean(owner) && isCurrentAccountGeneration(token, owner);
}

/**
 * Списать весь положительный остаток жемчуга текущего аккаунта. Идемпотентно.
 * Ошибка не бросается наружу — только лог и исход.
 */
export async function retireLocalPearlBalance(
  accountToken: AccountGenerationToken = captureAccountGeneration(),
): Promise<PearlRetireOutcome> {
  const owner = String(accountToken.stableId ?? '').trim();
  log(`start owner=${owner.slice(0, 6) || 'none'} phase=${accountToken.phase} generation=${accountToken.generation}`);
  if (accountToken.phase !== 'active' || !isCurrent(accountToken, owner)) {
    log(`exit account_inactive phase=${accountToken.phase} hasOwner=${owner ? 'yes' : 'no'}`);
    return 'account_inactive';
  }
  try {
    const recovered = await recoverPreparedClientShardOperation({ accountToken });
    if (!isCurrent(accountToken, owner)) {
      log('exit account_changed after_recover');
      return 'account_changed';
    }
    if (recovered?.status === 'failed' && !isTerminalPreparedRecoveryReason(recovered.reason)) {
      log(`exit prepared_recovery_failed reason=${recovered.reason}`);
      return 'prepared_recovery_failed';
    }

    const raw = await AsyncStorage.getItem(clientShardLedgerStateStorageKey(owner));
    if (!isCurrent(accountToken, owner)) {
      log('exit account_changed after_state_read');
      return 'account_changed';
    }
    const state = parsePearlLedgerState(raw, owner);
    if (state === null) {
      // Журнал ещё не открыт (его открывает loadShardsFromCloud) — попробуем на следующем старте.
      log('exit ledger_not_initialized source=local_ledger');
      return 'ledger_not_initialized';
    }
    if (state === 'corrupt') {
      log('exit ledger_state_corrupt source=local_ledger');
      return 'ledger_state_corrupt';
    }
    log(`state balance=${state.balance} revision=${state.revision} head=${String(state.headOperationId).slice(0, 24)} source=local_ledger`);
    if (state.balance === 0) {
      log('exit nothing_to_retire balance=0');
      return 'nothing_to_retire';
    }
    if (state.balance < 0) {
      // Долг от слияния устройств: жемчуга нет, начислять «до нуля» не будем (D70 без компенсаций).
      log(`exit negative_balance_left balance=${state.balance}`);
      return 'negative_balance_left';
    }

    const operationId = await pearlRetireOperationId(owner, state);
    const receiptKey = `${PEARL_RETIRE_RECEIPT_PREFIX}${encodeURIComponent(owner)}`;
    const receipt = JSON.stringify({
      schemaVersion: 'pearl-retire-receipt.v1',
      decision: 'D70/D84',
      operationId,
      retiredAmount: state.balance,
      fromRevision: state.revision,
      atMs: Date.now(),
    });
    log(`debit request op=${operationId} amount=${state.balance}`);
    const result = await commitClientShardOperation({
      expectedOwnerStableId: owner,
      operationId,
      direction: 'debit',
      amount: state.balance,
      reason: PEARL_RETIRE_REASON,
      grant: { kind: PEARL_RETIRE_GRANT_KIND, subjectId: 'd70' },
      localWrites: [[receiptKey, receipt]],
    }, { accountToken });
    if (result.status !== 'applied' && result.status !== 'already-applied') {
      const detail = 'reason' in result
        ? `reason=${result.reason}`
        : 'balance' in result
          ? `balance=${result.balance}`
          : 'no_detail';
      log(`exit debit_failed status=${result.status} ${detail}`);
      return 'debit_failed';
    }
    if (!isCurrent(accountToken, owner)) {
      log('exit account_changed after_debit');
      return 'account_changed';
    }
    // Обновить память баланса и экраны, которые слушают событие баланса.
    const balanceAfter = await getShardsBalance();
    emitAppEvent('shards_balance_updated', { balance: balanceAfter, op: 'spend', reason: PEARL_RETIRE_REASON });
    const outcome: PearlRetireOutcome = result.status === 'applied' ? 'retired' : 'already_retired';
    log(`done ${outcome} before=${result.balanceBefore} after=${result.balanceAfter} projected=${balanceAfter}`);
    return outcome;
  } catch (error) {
    logCatch('retire', error);
    return 'debit_failed';
  }
}

/* expo-router route shim: utility module in app/ must not warn as a route */
export default function __RouteShim() { return null; }
