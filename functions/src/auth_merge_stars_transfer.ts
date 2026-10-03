import type * as admin from 'firebase-admin';
import { arenaSeasonWindow } from './arena_v2_core';
import { getWeekKey } from './progress_events';
import {
  STAR_OP_MAX_ABS_DELTA,
  commitStarOperations,
  normalizeStars,
  prepareStarOperations,
  type StarLedgerCtx,
  type StarLedgerPrepared,
  type StarOpOutcome,
  type StarOpRequest,
} from './stars_ledger';

/**
 * 8T (координатор 03.10): перенос монет проигравшего победителю при серверном
 * слиянии аккаунтов (functions/src/auth_merge.ts).
 *
 * зачем: слияние скрывало проигравшего (`identityHidden`), а `users/{loser}.stars`
 * оставалось на нём — монеты застревали на аккаунте, в который человек больше
 * никогда не попадёт. Перенос идёт В ТОЙ ЖЕ транзакции, что и скрытие:
 * - журнал разрешает один prepare на uid за попытку, а у нас два разных uid;
 * - prepare только читает и ставится до первой записи транзакции слияния;
 * - атомарность: нет окна «скрыт, а монеты ещё на нём» и нет «дебет без кредита».
 *
 * Семантика: проигравший — `account_merge_out` (spend), победитель —
 * `account_merge_in` (grant). earnedTotal/неделя/сезон победителя НЕ растут:
 * перенесённое не заработано заново и не двигает очки.
 *
 * Слияние НИКОГДА не падает из-за монет: любая неувязка журнала (несогласованный
 * баланс, чужая расписка под нашим opId) → перенос пропускается ЦЕЛИКОМ, монеты
 * остаются на проигравшем (не теряются), причина — в логе и в outbox.
 */

const LOG = '[ACCOUNT-MERGE-STARS]';

/**
 * Потолок частей в одной транзакции: 100 × 5000 = 500 000 монет, 200 расписок.
 * Вместе с линиями премиума (до 64 + удаления) держит транзакцию слияния под
 * лимитом Firestore в 500 записей. Остаток выше потолка остаётся на проигравшем
 * и пишется в outbox (`starsTransfer.remainder`) для ручного разбора.
 */
export const ACCOUNT_MERGE_STARS_MAX_CHUNKS = 100;
export const ACCOUNT_MERGE_STARS_SOURCE_KIND = 'account_merge' as const;

export type AccountMergeStarsTransferRecord = Readonly<{
  status: 'nothing_to_transfer' | 'transferred' | 'already_applied' | 'skipped';
  reason?: string;
  amount: number;
  chunks: number;
  remainder: number;
  atMs: number;
}>;

export type PreparedAccountMergeStarsTransfer = Readonly<{
  record: AccountMergeStarsTransferRecord;
  loser: StarLedgerPrepared | null;
  winner: StarLedgerPrepared | null;
}>;

export type AccountMergeStarsTransferInput = Readonly<{
  winnerStableId: string;
  loserStableId: string;
  winnerSnap: admin.firestore.DocumentSnapshot;
  loserSnap: admin.firestore.DocumentSnapshot;
  /** `merge_<sha256>` из auth_merge — общий детерминированный якорь opId пары. */
  outboxId: string;
  authUid: string;
  nowMs: number;
}>;

const short = (uid: string): string => uid.slice(0, 8);

export function planAccountMergeStarsChunks(
  balance: number,
  maxChunks: number = ACCOUNT_MERGE_STARS_MAX_CHUNKS,
): { chunks: number[]; remainder: number } {
  let left = Number.isSafeInteger(balance) && balance > 0 ? balance : 0;
  const chunks: number[] = [];
  while (left > 0 && chunks.length < maxChunks) {
    const part = Math.min(STAR_OP_MAX_ABS_DELTA, left);
    chunks.push(part);
    left -= part;
  }
  return { chunks, remainder: left };
}

/** Один и тот же opId у дебета и кредита: они живут в разных книгах users/{uid}/star_operations. */
export function accountMergeStarsOpId(outboxId: string, index: number): string {
  return `${ACCOUNT_MERGE_STARS_SOURCE_KIND}:${outboxId}.${index}`;
}

function ledgerCtx(nowMs: number, authUid: string): StarLedgerCtx {
  // Тот же производитель недели и сезона, что у practice_rune_grant: иначе
  // ленивый перенос недели/сезона в журнале обнулил бы счётчики победителя.
  return {
    nowMs,
    activeSeasonId: arenaSeasonWindow(nowMs).seasonId,
    weekKeyNow: getWeekKey(new Date(nowMs).toISOString().slice(0, 10)),
    authUid,
    deviceId: null,
  };
}

function buildOps(
  input: AccountMergeStarsTransferInput,
  chunks: readonly number[],
  side: 'out' | 'in',
): StarOpRequest[] {
  const counterpart = side === 'out' ? input.winnerStableId : input.loserStableId;
  return chunks.map((amount, index) => ({
    opId: accountMergeStarsOpId(input.outboxId, index),
    delta: side === 'out' ? -amount : amount,
    reason: side === 'out' ? 'account_merge_out' : 'account_merge_in',
    sourceKind: ACCOUNT_MERGE_STARS_SOURCE_KIND,
    sourceId: input.outboxId,
    ruleVersion: 1,
    earnedAtMs: input.nowMs,
    meta: { chunk: index, chunks: chunks.length, counterpart: short(counterpart) },
  }));
}

function errorMessage(error: unknown): string {
  return String((error as { message?: unknown })?.message ?? error).slice(0, 120);
}

function skipped(
  reason: string,
  amount: number,
  chunks: number,
  remainder: number,
  nowMs: number,
): PreparedAccountMergeStarsTransfer {
  return Object.freeze({
    record: Object.freeze({ status: 'skipped' as const, reason, amount, chunks, remainder, atMs: nowMs }),
    loser: null,
    winner: null,
  });
}

/** Пары дебет/кредит обязаны совпасть по статусу частей — иначе это не перенос, а утечка. */
function outcomesPaired(loser: readonly StarOpOutcome[], winner: readonly StarOpOutcome[]): boolean {
  if (loser.length !== winner.length) return false;
  return loser.every((outcome, index) => {
    const other = winner[index];
    return Boolean(other)
      && outcome.status !== 'rejected'
      && other?.status === outcome.status
      && Math.abs(outcome.appliedDelta) === Math.abs(other.appliedDelta);
  });
}

/**
 * ФАЗА 1 — только чтения (расписки по opId на обеих сторонах). Вызывать до
 * первой записи транзакции слияния, ровно один раз за попытку транзакции.
 */
export async function prepareAccountMergeStarsTransfer(
  tx: admin.firestore.Transaction,
  db: admin.firestore.Firestore,
  input: AccountMergeStarsTransferInput,
): Promise<PreparedAccountMergeStarsTransfer> {
  const loserStars = normalizeStars(input.loserSnap.data()?.stars);
  const plan = planAccountMergeStarsChunks(loserStars.balance);
  const amount = plan.chunks.reduce((total, part) => total + part, 0);
  const tag = `winner=${short(input.winnerStableId)} loser=${short(input.loserStableId)}`;
  console.log(`${LOG} start ${tag} loserBalance=${loserStars.balance} winnerBalance=${normalizeStars(input.winnerSnap.data()?.stars).balance} chunks=${plan.chunks.length} remainder=${plan.remainder}`);

  if (plan.chunks.length === 0) {
    console.log(`${LOG} skip ${tag} reason=nothing_to_transfer loserBalance=${loserStars.balance}`);
    return Object.freeze({
      record: Object.freeze({
        status: 'nothing_to_transfer' as const, amount: 0, chunks: 0, remainder: 0, atMs: input.nowMs,
      }),
      loser: null,
      winner: null,
    });
  }
  if (plan.remainder > 0) {
    console.error(`${LOG} over_cap ${tag} transferNow=${amount} remainder=${plan.remainder} maxChunks=${ACCOUNT_MERGE_STARS_MAX_CHUNKS}`);
  }

  const ctx = ledgerCtx(input.nowMs, input.authUid);
  // Каждая сторона — отдельный try: несогласованный журнал (assertInvariant) не
  // должен ронять слияние. До commit ничего не записано, так что пропуск безопасен.
  let loser: StarLedgerPrepared;
  try {
    loser = await prepareStarOperations(
      tx, db, input.loserStableId, input.loserSnap,
      buildOps(input, plan.chunks, 'out'), ctx,
    );
  } catch (error) {
    console.error(`${LOG} skip ${tag} reason=loser_prepare_failed message=${errorMessage(error)}`);
    return skipped('loser_prepare_failed', amount, plan.chunks.length, plan.remainder, input.nowMs);
  }
  let winner: StarLedgerPrepared;
  try {
    winner = await prepareStarOperations(
      tx, db, input.winnerStableId, input.winnerSnap,
      buildOps(input, plan.chunks, 'in'), ctx,
    );
  } catch (error) {
    console.error(`${LOG} skip ${tag} reason=winner_prepare_failed message=${errorMessage(error)}`);
    return skipped('winner_prepare_failed', amount, plan.chunks.length, plan.remainder, input.nowMs);
  }

  const describe = (outcomes: readonly StarOpOutcome[]) => outcomes
    .map((o) => `${o.status}${o.errorCode ? `:${o.errorCode}` : ''}`).join(',');
  if (!outcomesPaired(loser.outcomes, winner.outcomes)) {
    console.error(`${LOG} skip ${tag} reason=outcome_mismatch loser=[${describe(loser.outcomes)}] winner=[${describe(winner.outcomes)}]`);
    return skipped('outcome_mismatch', amount, plan.chunks.length, plan.remainder, input.nowMs);
  }
  if (loser.outcomes.every((o) => o.status === 'already_applied')) {
    console.warn(`${LOG} skip ${tag} reason=already_applied chunks=${plan.chunks.length}`);
    return Object.freeze({
      record: Object.freeze({
        status: 'already_applied' as const, amount, chunks: plan.chunks.length, remainder: plan.remainder, atMs: input.nowMs,
      }),
      loser: null,
      winner: null,
    });
  }
  console.log(`${LOG} prepared ${tag} amount=${amount} loserAfter=${loser.after.balance} winnerAfter=${winner.after.balance} outcomes=[${describe(winner.outcomes)}]`);
  return Object.freeze({
    record: Object.freeze({
      status: 'transferred' as const, amount, chunks: plan.chunks.length, remainder: plan.remainder, atMs: input.nowMs,
    }),
    loser,
    winner,
  });
}

/**
 * ФАЗА 2 — только записи. Пишет `stars` и расписки обеих сторон; остальные поля
 * документов слияние пишет своими записями после этой.
 */
export function commitAccountMergeStarsTransfer(
  tx: admin.firestore.Transaction,
  prepared: PreparedAccountMergeStarsTransfer,
): AccountMergeStarsTransferRecord {
  if (!prepared.loser || !prepared.winner) return prepared.record;
  commitStarOperations(tx, prepared.loser);
  commitStarOperations(tx, prepared.winner);
  console.log(`${LOG} committed loser=${short(prepared.loser.stableUid)} winner=${short(prepared.winner.stableUid)} amount=${prepared.record.amount} chunks=${prepared.record.chunks}`);
  return prepared.record;
}
