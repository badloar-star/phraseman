import {
  ACCOUNTS_V2_DELETION_PURPOSE,
  cleanDeletionCredential,
  constantTimeEquals,
  deletionCapabilityHash,
  deletionOperationIdHash,
  isDeletionReceiptRecord,
  openDeletionTarget,
  type DeletionStage,
} from './receipt';

/*
 * Account V2, Пакет 4 (TG-DF4289FFB93C) — предикат ключа удаления.
 * Решение владельца 13: ключ удаления на телефоне даёт право ТОЛЬКО узнать
 * этап и дотолкнуть удаление до конца; данных аккаунта не открывает.
 *
 * Выдача требует ВСЕГО сразу:
 *   purpose === 'deletion_status'  (не «чтение аккаунта», не что-то ещё);
 *   точный operationId этой квитанции (хэш, постоянное время);
 *   точный секрет (хэш, постоянное время);
 *   квитанция не истекла (TTL Firestore ленив — проверяем сами);
 *   лимит частоты не исчерпан.
 * uid вызывающего (в т.ч. новый uid той же почты — решение 15) не участвует
 * НИГДЕ: ни как основание, ни как подсказка. Голый operationId, почта — отказ.
 * Каждая попытка на существующей квитанции тратит лимит — ДО сравнения
 * секрета, чтобы перебор упирался в потолок.
 */

export const ACCOUNTS_V2_DELETION_STATUS_MAX_ATTEMPTS = 30;
export const ACCOUNTS_V2_DELETION_STATUS_WINDOW_MS = 60_000;

export type DeletionDenyReason =
  | 'wrong_purpose'
  | 'malformed'
  | 'not_found'
  | 'corrupt'
  | 'wrong_operation'
  | 'wrong_secret'
  | 'expired';

export type DeletionAttemptUpdate = Readonly<{
  attempts: number;
  rateWindowStartedAtMs: number;
  lastCheckedAtMs: number;
}>;

export type DeletionStatusDecision =
  | Readonly<{
    kind: 'granted';
    stage: DeletionStage;
    mayNudge: boolean;
    /** Запечатанная цель, открытая ключом. Наружу НЕ отдаётся никогда. */
    target: string | null;
    update: DeletionAttemptUpdate;
  }>
  | Readonly<{ kind: 'denied'; reason: DeletionDenyReason; update: DeletionAttemptUpdate | null }>
  | Readonly<{ kind: 'rate_limited'; update: null }>;

function deny(reason: DeletionDenyReason, update: DeletionAttemptUpdate | null): DeletionStatusDecision {
  return Object.freeze({ kind: 'denied', reason, update });
}

function nextAttempt(stored: Readonly<Record<string, unknown>>, nowMs: number): DeletionAttemptUpdate | 'limited' {
  const windowStart = Number(stored.rateWindowStartedAtMs ?? 0);
  const windowActive = Number.isFinite(windowStart) && windowStart > 0
    && nowMs - windowStart < ACCOUNTS_V2_DELETION_STATUS_WINDOW_MS;
  const attempts = windowActive ? Math.max(0, Math.floor(Number(stored.attempts) || 0)) : 0;
  if (attempts >= ACCOUNTS_V2_DELETION_STATUS_MAX_ATTEMPTS) return 'limited';
  return Object.freeze({
    attempts: attempts + 1,
    rateWindowStartedAtMs: windowActive ? windowStart : nowMs,
    lastCheckedAtMs: nowMs,
  });
}

/**
 * Решение по запросу статуса. Чистая функция: запись попытки (`update`)
 * применяет адаптер в той же транзакции, что и чтение квитанции.
 * `stored` — квитанция по id из operationId запроса (или null).
 */
export function decideDeletionStatus(
  request: unknown,
  stored: unknown,
  nowMs: number,
): DeletionStatusDecision {
  const raw = (typeof request === 'object' && request !== null ? request : {}) as Record<string, unknown>;
  if (raw.purpose !== ACCOUNTS_V2_DELETION_PURPOSE) return deny('wrong_purpose', null);
  const credential = cleanDeletionCredential(raw);
  if (credential === null) return deny('malformed', null);
  if (stored === null || stored === undefined) return deny('not_found', null);
  if (!isDeletionReceiptRecord(stored)) return deny('corrupt', null);

  const update = nextAttempt(stored, nowMs);
  if (update === 'limited') return Object.freeze({ kind: 'rate_limited', update: null });

  // Оба сравнения выполняются всегда — время ответа не зависит от того, какое упало.
  const operationOk = constantTimeEquals(stored.operationIdHash, deletionOperationIdHash(credential.operationId));
  const secretOk = constantTimeEquals(stored.capabilityHash, deletionCapabilityHash(credential.capability));
  if (!operationOk) return deny('wrong_operation', update);
  if (!secretOk) return deny('wrong_secret', update);
  if (nowMs >= stored.expireAtMs) return deny('expired', update);

  if (stored.stage === 'completed') {
    return Object.freeze({ kind: 'granted', stage: 'completed', mayNudge: false, target: null, update });
  }
  const target = openDeletionTarget(stored.targetSealed, credential);
  if (target === null) return deny('corrupt', update);
  // зачем (Ремонт №1 P2-1): после v2_purged толкать нечего — V2 уже стёрт,
  // остальное доводит конвейер; повторный прогон удаления был бы пустой тратой.
  return Object.freeze({ kind: 'granted', stage: stored.stage, mayNudge: stored.stage !== 'v2_purged', target, update });
}
