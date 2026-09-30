import {
  ACCOUNTS_V2_DELETION_PURPOSE,
  buildCompletedDeletionReceipt,
  buildPendingDeletionReceipt,
  cleanDeletionCredential,
  constantTimeEquals,
  deletionCapabilityHash,
  deletionReceiptDocId,
  isDeletionReceiptRecord,
  type DeletionPurgeCursor,
  type DeletionReceiptRecord,
  type DeletionStage,
} from './receipt';
import { decideDeletionStatus, type DeletionStatusDecision } from './status_authorizer';

/*
 * Account V2, Пакет 4 (TG-DF4289FFB93C) — оркестровка протокола удаления.
 *
 * зачем: три отдельные обязанности из пакета — авторизация статуса
 * (status_authorizer), побочные эффекты удаления (purge_core через порт
 * `DeletionNudge`) и квитанции (receipt) — сведены здесь через порты, без
 * Firestore. Адаптер Firestore — firestore_ports.ts. Подключение к callable и
 * к конвейеру account_delete.ts — Пакет 6.
 *
 * КОНТРАКТ ВЫПУСКА (Ремонт №1 P2-2): квитанция выпускается ТОЛЬКО в точке
 * невозврата — после свежего входа и в момент, когда конвейер уже решил
 * удалять (замок удаления поставлен). Если удаление всё же отменено или
 * откатилось до необратимого шага, сервер ОБЯЗАН отозвать квитанцию
 * (`revokeDeletionReceipt`): иначе ключ продолжал бы «дотолкнуть» удаление
 * данных V2 живого аккаунта. Завершённую квитанцию отозвать нельзя.
 *
 * ЭТАПЫ (Ремонт №1 P2-1): толчок по ключу стирает только accounts_v2 и ставит
 * `v2_purged`. `completed` ставит лишь конвейер после ПОЛНОГО удаления
 * (`completeDeletionReceipt`) — иначе «удалён» врал бы, пока живы прочие данные.
 *
 * Наружу отдаётся ТОЛЬКО { stage }. Все отказы (неверный секрет, цель,
 * операция, истёкшая, нет квитанции) снаружи неразличимы: код `denied`.
 * Причина — только в логе сервера (код, без секрета, uid и operationId).
 */

const LOG = '[ACCOUNTS-V2-DELETE]';

export type AccountsV2DeletionErrorCode = 'denied' | 'rate_limited' | 'conflict';

export class AccountsV2DeletionError extends Error {
  readonly code: AccountsV2DeletionErrorCode;

  constructor(code: AccountsV2DeletionErrorCode) {
    super(`accounts_v2_deletion_${code}`);
    this.name = 'AccountsV2DeletionError';
    this.code = code;
  }
}

/** Атомарно: прочитать квитанцию → решить → записать `next` (null — без записи). */
export interface DeletionReceiptStore {
  transact<T>(
    docId: string,
    work: (stored: unknown) => Readonly<{ next: DeletionReceiptRecord | 'delete' | null; result: T }>,
  ): Promise<T>;
}

/** Удаление данных цели с курсора; onProgress сохраняет курсор после каждого коммита. */
export type DeletionNudge = (
  uid: string,
  cursor: DeletionPurgeCursor,
  onProgress: (cursor: DeletionPurgeCursor) => Promise<void>,
) => Promise<Readonly<{ done: boolean; cursor: DeletionPurgeCursor }>>;

export type DeletionStatusResult = Readonly<{ stage: DeletionStage }>;

function receiptTag(docId: string): string {
  return docId.slice(0, 8);
}

function errorTag(error: unknown): string {
  const name = error instanceof Error ? error.name : typeof error;
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : 'none';
  return `name=${name} code=${code}`;
}

/**
 * Выпуск квитанции при старте удаления (после свежего входа — задача Пакета 6).
 * Повтор тем же ключом — идемпотентен; другой ключ на ту же операцию — конфликт
 * без перезаписи (иначе чужой секрет перехватил бы право на статус).
 */
export async function issueDeletionReceipt(
  store: DeletionReceiptStore,
  uid: string,
  rawCredential: unknown,
  nowMs: number,
): Promise<Readonly<{ receiptId: string; stage: DeletionStage }>> {
  const credential = cleanDeletionCredential(rawCredential);
  if (credential === null) {
    console.warn(`${LOG} issue denied code=malformed`);
    throw new AccountsV2DeletionError('denied');
  }
  const receiptId = deletionReceiptDocId(credential.operationId);
  const expectedHash = deletionCapabilityHash(credential.capability);
  type IssueOutcome = Readonly<{ kind: 'created' | 'existing' | 'conflict'; stage: DeletionStage }>;
  const outcome = await store.transact<IssueOutcome>(receiptId, (stored) => {
    if (stored === null || stored === undefined) {
      return { next: buildPendingDeletionReceipt(uid, credential, nowMs), result: { kind: 'created', stage: 'accepted' } };
    }
    if (isDeletionReceiptRecord(stored) && constantTimeEquals(stored.capabilityHash, expectedHash)) {
      return { next: null, result: { kind: 'existing', stage: stored.stage } };
    }
    return { next: null, result: { kind: 'conflict', stage: 'accepted' } };
  });
  if (outcome.kind === 'conflict') {
    console.warn(`${LOG} issue conflict ref=${receiptTag(receiptId)}`);
    throw new AccountsV2DeletionError('conflict');
  }
  console.log(`${LOG} issue ${outcome.kind} ref=${receiptTag(receiptId)} stage=${outcome.stage}`);
  return Object.freeze({ receiptId, stage: outcome.stage });
}

type Authorized = Readonly<{ decision: DeletionStatusDecision; cursor: DeletionPurgeCursor }>;

async function authorize(store: DeletionReceiptStore, receiptId: string, request: unknown, nowMs: number): Promise<Authorized> {
  return store.transact<Authorized>(receiptId, (stored) => {
    const decision = decideDeletionStatus(request, stored, nowMs);
    const record = isDeletionReceiptRecord(stored) ? stored : null;
    const next = record !== null && decision.update !== null ? { ...record, ...decision.update } : null;
    const cursor = record !== null && record.stage !== 'completed' ? record.cursor : null;
    return { next, result: { decision, cursor } };
  });
}

/** Меняет pending-квитанцию, только если она всё ещё pending и того же ключа. */
async function updatePending(
  store: DeletionReceiptStore,
  receiptId: string,
  capabilityHash: string,
  change: (record: Extract<DeletionReceiptRecord, { stage: 'accepted' | 'purging' | 'v2_purged' }>) => DeletionReceiptRecord | null,
): Promise<DeletionStage | 'absent'> {
  return store.transact<DeletionStage | 'absent'>(receiptId, (stored) => {
    if (!isDeletionReceiptRecord(stored) || !constantTimeEquals(stored.capabilityHash, capabilityHash)) {
      return { next: null, result: 'absent' };
    }
    if (stored.stage === 'completed') return { next: null, result: 'completed' };
    const next = change(stored);
    return { next, result: (next ?? stored).stage };
  });
}

/**
 * Статус по ключу удаления (решение 13): узнать этап и, если передан `nudge`,
 * дотолкнуть удаление. Ошибка удаления не отдаётся наружу как данные: этап
 * остаётся `purging`, курсор сохранён, следующий толчок продолжит.
 */
export async function readDeletionStatus(
  store: DeletionReceiptStore,
  request: unknown,
  nowMs: number,
  options: Readonly<{ nudge?: DeletionNudge }> = {},
): Promise<DeletionStatusResult> {
  const raw = (typeof request === 'object' && request !== null ? request : {}) as Record<string, unknown>;
  const credential = raw.purpose === ACCOUNTS_V2_DELETION_PURPOSE ? cleanDeletionCredential(raw) : null;
  if (credential === null) {
    // зачем: мусор не стоит ни одного чтения Firestore.
    console.warn(`${LOG} status denied code=${raw.purpose === ACCOUNTS_V2_DELETION_PURPOSE ? 'malformed' : 'wrong_purpose'} reads=0`);
    throw new AccountsV2DeletionError('denied');
  }
  const receiptId = deletionReceiptDocId(credential.operationId);
  const { decision, cursor } = await authorize(store, receiptId, raw, nowMs);
  if (decision.kind === 'rate_limited') {
    console.warn(`${LOG} status rate_limited ref=${receiptTag(receiptId)}`);
    throw new AccountsV2DeletionError('rate_limited');
  }
  if (decision.kind === 'denied') {
    console.warn(`${LOG} status denied code=${decision.reason} ref=${receiptTag(receiptId)}`);
    throw new AccountsV2DeletionError('denied');
  }
  if (!decision.mayNudge || decision.target === null || options.nudge === undefined) {
    console.log(`${LOG} status granted ref=${receiptTag(receiptId)} stage=${decision.stage} nudge=none`);
    return Object.freeze({ stage: decision.stage });
  }
  return nudgeDeletion(store, receiptId, credential.capability, decision.target, cursor, options.nudge, nowMs);
}

async function nudgeDeletion(
  store: DeletionReceiptStore,
  receiptId: string,
  capability: string,
  target: string,
  cursor: DeletionPurgeCursor,
  nudge: DeletionNudge,
  nowMs: number,
): Promise<DeletionStatusResult> {
  const hash = deletionCapabilityHash(capability);
  const ref = receiptTag(receiptId);
  const started = await updatePending(store, receiptId, hash, (record) => (
    record.stage === 'accepted' ? { ...record, stage: 'purging', updatedAtMs: nowMs } : null
  ));
  if (started === 'absent') {
    // зачем (P2-2): квитанцию отозвали/стёрли между проверкой и толчком — это
    // отказ, а не «удалён»: этап «completed» ставит только конвейер.
    console.warn(`${LOG} nudge denied code=receipt_gone ref=${ref}`);
    throw new AccountsV2DeletionError('denied');
  }
  if (started !== 'purging') {
    console.log(`${LOG} nudge skipped ref=${ref} stage=${started}`);
    return Object.freeze({ stage: started });
  }
  const saveCursor = async (next: DeletionPurgeCursor): Promise<void> => {
    // зачем: параллельный толчок мог уже поставить v2_purged — не откатываем этап назад.
    await updatePending(store, receiptId, hash, (record) => (
      record.stage === 'v2_purged' ? null : { ...record, stage: 'purging', cursor: next, updatedAtMs: nowMs }
    ));
  };
  let done = false;
  try {
    done = (await nudge(target, cursor, saveCursor)).done;
  } catch (error) {
    // зачем: сбой удаления — не отказ держателю ключа; этап честно остаётся purging.
    console.warn(`${LOG} nudge failed ref=${ref} ${errorTag(error)}`);
  }
  const finalStage = await updatePending(store, receiptId, hash, (record) => (
    // зачем (P2-1): толчок стёр только V2 — это v2_purged, а не completed.
    done ? { ...record, stage: 'v2_purged', cursor: null, updatedAtMs: nowMs } : null
  ));
  if (finalStage === 'absent') {
    console.warn(`${LOG} nudge denied code=receipt_gone_after_purge ref=${ref} done=${String(done)}`);
    throw new AccountsV2DeletionError('denied');
  }
  const stage: DeletionStage = finalStage;
  console.log(`${LOG} nudge finished ref=${ref} done=${String(done)} stage=${stage}`);
  return Object.freeze({ stage });
}

/**
 * Решение 15: сервер доводит удаление сам (ключ мог потеряться при
 * переустановке) и закрывает квитанцию по её id — без секрета. id хранит задача
 * удаления; он бесполезен без ключа держателя (статус требует секрет).
 */
export async function completeDeletionReceipt(
  store: DeletionReceiptStore,
  receiptId: string,
  nowMs: number,
): Promise<DeletionStage | 'absent'> {
  const result = await store.transact<'completed' | 'absent' | 'corrupt'>(receiptId, (stored) => {
    if (!isDeletionReceiptRecord(stored)) {
      return { next: null, result: stored === null || stored === undefined ? 'absent' : 'corrupt' };
    }
    if (stored.stage === 'completed') return { next: null, result: 'completed' };
    return { next: buildCompletedDeletionReceipt(stored, nowMs), result: 'completed' };
  });
  if (result === 'corrupt') {
    console.error(`${LOG} complete corrupt_receipt ref=${receiptTag(receiptId)}`);
    throw new AccountsV2DeletionError('conflict');
  }
  console.log(`${LOG} complete ref=${receiptTag(receiptId)} result=${result}`);
  return result;
}

/**
 * Ремонт №1 P2-2: отзыв pending-квитанции сервером (удаление отменено или
 * откатилось до точки невозврата). Без секрета — вызывает только конвейер.
 * Завершённая квитанция не отзывается: удаление уже необратимо.
 */
export async function revokeDeletionReceipt(
  store: DeletionReceiptStore,
  receiptId: string,
): Promise<'revoked' | 'completed' | 'absent'> {
  const result = await store.transact<'revoked' | 'completed' | 'absent' | 'corrupt'>(receiptId, (stored) => {
    if (stored === null || stored === undefined) return { next: null, result: 'absent' };
    if (!isDeletionReceiptRecord(stored)) return { next: null, result: 'corrupt' };
    if (stored.stage === 'completed') return { next: null, result: 'completed' };
    return { next: 'delete', result: 'revoked' };
  });
  if (result === 'corrupt') {
    console.error(`${LOG} revoke corrupt_receipt ref=${receiptTag(receiptId)}`);
    throw new AccountsV2DeletionError('conflict');
  }
  console.log(`${LOG} revoke ref=${receiptTag(receiptId)} result=${result}`);
  return result;
}
