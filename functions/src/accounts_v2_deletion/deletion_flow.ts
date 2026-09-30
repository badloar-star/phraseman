import {
  ACCOUNTS_V2_DELETION_PENDING_TTL_MS,
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
  type PendingDeletionReceipt,
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

/** Квитанция, собранная заранее (без секрета): печать цели и хэши. Публикуется в точке невозврата. */
export type PreparedDeletionReceipt = Readonly<{ receiptId: string; record: PendingDeletionReceipt }>;

const RECEIPT_ID_PATTERN = /^[0-9a-f]{64}$/;

/**
 * Пакет 6A. зачем: ключ удаления приходит от телефона при постановке удаления,
 * а точка невозврата наступает позже (после 14 дней grace, когда воркер взял
 * задачу). Хранить секрет до тех пор нельзя — поэтому квитанция собирается
 * СРАЗУ (цель запечатана ключом, секрет и операция — только хэшами), лежит в
 * задаче удаления и публикуется воркером в точке невозврата. Отмена в grace
 * снимает задачу вместе с заготовкой: опубликованной квитанции не было вовсе.
 */
export function prepareDeletionReceipt(uid: string, rawCredential: unknown, nowMs: number): PreparedDeletionReceipt {
  const credential = cleanDeletionCredential(rawCredential);
  if (credential === null) {
    console.warn(`${LOG} prepare denied code=malformed`);
    throw new AccountsV2DeletionError('denied');
  }
  return Object.freeze({
    receiptId: deletionReceiptDocId(credential.operationId),
    record: buildPendingDeletionReceipt(uid, credential, nowMs),
  });
}

/** Форма заготовки, прочитанной из задачи удаления (fail closed). */
export function isPreparedDeletionReceipt(value: unknown): value is PreparedDeletionReceipt {
  if (typeof value !== 'object' || value === null) return false;
  const { receiptId, record } = value as Record<string, unknown>;
  return typeof receiptId === 'string' && RECEIPT_ID_PATTERN.test(receiptId)
    && isDeletionReceiptRecord(record) && record.stage === 'accepted';
}

/**
 * Публикация заготовки. Повтор той же заготовки — идемпотентен; другой ключ на
 * ту же операцию — конфликт без перезаписи (чужой секрет не перехватит статус).
 * Сроки считаются от момента публикации, а не подготовки.
 */
export async function publishPreparedDeletionReceipt(
  store: DeletionReceiptStore,
  prepared: PreparedDeletionReceipt,
  nowMs: number,
): Promise<Readonly<{ receiptId: string; stage: DeletionStage }>> {
  const { receiptId, record } = prepared;
  type PublishOutcome = Readonly<{ kind: 'created' | 'existing' | 'conflict'; stage: DeletionStage }>;
  const outcome = await store.transact<PublishOutcome>(receiptId, (stored) => {
    if (stored === null || stored === undefined) {
      const next: PendingDeletionReceipt = Object.freeze({
        ...record,
        stage: 'accepted',
        cursor: null,
        attempts: 0,
        rateWindowStartedAtMs: 0,
        createdAtMs: nowMs,
        updatedAtMs: nowMs,
        expireAtMs: nowMs + ACCOUNTS_V2_DELETION_PENDING_TTL_MS,
      });
      return { next, result: { kind: 'created', stage: 'accepted' } };
    }
    if (isDeletionReceiptRecord(stored) && constantTimeEquals(stored.capabilityHash, record.capabilityHash)) {
      return { next: null, result: { kind: 'existing', stage: stored.stage } };
    }
    return { next: null, result: { kind: 'conflict', stage: 'accepted' } };
  });
  if (outcome.kind === 'conflict') {
    console.warn(`${LOG} publish conflict ref=${receiptTag(receiptId)}`);
    throw new AccountsV2DeletionError('conflict');
  }
  console.log(`${LOG} publish ${outcome.kind} ref=${receiptTag(receiptId)} stage=${outcome.stage}`);
  return Object.freeze({ receiptId, stage: outcome.stage });
}

/**
 * Пакет 6A, хвост P3 Пакета 4: лимит на подбор НЕСУЩЕСТВУЮЩИХ квитанций.
 * зачем: статус по ключу — без входа (решение 13); лимит попыток живёт в самой
 * квитанции, а у несуществующей его негде хранить — перебор operationId стоил
 * бы по чтению на попытку без потолка. Здесь — память инстанса: промахи на
 * вызывающего (uid или сеть, только хэш) и общий потолок инстанса; сверх
 * потолка отказ стоит НОЛЬ чтений. Инстансов мало (maxInstances обёртки).
 */
export type DeletionProbeLimits = Readonly<{
  windowMs: number;
  maxMissesPerKey: number;
  /** Мягкий потолок инстанса: сверх него режем только уже промахнувшихся. */
  maxMissesGlobal: number;
  /**
   * Ремонт №2 (P2): ЖЁСТКИЙ потолок промахов инстанса — для всех, включая
   * новые ключи. Ключи зависят от адреса, а его можно менять; без жёсткого
   * потолка поток «новых» ключей давал бы неограниченные чтения. Законный
   * вызывающий без промахов проходит, пока потолок не достигнут.
   */
  maxMissesHard: number;
  maxKeys: number;
}>;

export const ACCOUNTS_V2_DELETION_PROBE_LIMITS: DeletionProbeLimits = Object.freeze({
  windowMs: 60_000,
  maxMissesPerKey: 10,
  maxMissesGlobal: 200,
  maxMissesHard: 1_000,
  maxKeys: 5_000,
});

/**
 * Ремонт №1 (ревью, P3-3): ключей у вызывающего несколько (uid; адрес клиента;
 * сеть адреса) — перебор с разных адресов одной сети тоже упирается в лимит.
 * Общий потолок инстанса НЕ блокирует законных: он режет только тех, у кого
 * уже есть промахи в окне; вызывающий без промахов проходит всегда.
 */
export interface DeletionProbeLimiter {
  blocked(keys: readonly string[], nowMs: number): boolean;
  noteMiss(keys: readonly string[], nowMs: number): void;
}

export type DeletionProbe = Readonly<{ limiter: DeletionProbeLimiter; keys: readonly string[] }>;

type ProbeWindow = Readonly<{ startMs: number; count: number }>;

export function createDeletionProbeLimiter(limits: DeletionProbeLimits = ACCOUNTS_V2_DELETION_PROBE_LIMITS): DeletionProbeLimiter {
  const perKey = new Map<string, ProbeWindow>();
  let global: ProbeWindow = { startMs: 0, count: 0 };
  const activeCount = (window: ProbeWindow | undefined, nowMs: number): number => (
    window !== undefined && nowMs >= window.startMs && nowMs - window.startMs < limits.windowMs ? window.count : 0
  );
  const bump = (window: ProbeWindow | undefined, nowMs: number): ProbeWindow => (
    window !== undefined && activeCount(window, nowMs) > 0
      ? { startMs: window.startMs, count: window.count + 1 }
      : { startMs: nowMs, count: 1 }
  );
  return {
    blocked(keys, nowMs) {
      const globalMisses = activeCount(global, nowMs);
      if (globalMisses >= limits.maxMissesHard) return true;
      const counts = keys.map((key) => activeCount(perKey.get(key), nowMs));
      if (counts.some((count) => count >= limits.maxMissesPerKey)) return true;
      return globalMisses >= limits.maxMissesGlobal && counts.some((count) => count > 0);
    },
    noteMiss(keys, nowMs) {
      global = bump(global, nowMs);
      for (const key of new Set(keys)) {
        const next = bump(perKey.get(key), nowMs);
        if (perKey.size >= limits.maxKeys && !perKey.has(key)) {
          for (const [other, window] of perKey) if (activeCount(window, nowMs) === 0) perKey.delete(other); // guard-ok: Map в памяти
          if (perKey.size >= limits.maxKeys) {
            const oldest = perKey.keys().next();
            console.warn(`${LOG} probe cache_evict size=${perKey.size}`);
            if (!oldest.done) perKey.delete(oldest.value);
          }
        }
        perKey.set(key, next); // guard-ok: Map в памяти
      }
    },
  };
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
  options: Readonly<{ nudge?: DeletionNudge; probe?: DeletionProbe }> = {},
): Promise<DeletionStatusResult> {
  const raw = (typeof request === 'object' && request !== null ? request : {}) as Record<string, unknown>;
  const credential = raw.purpose === ACCOUNTS_V2_DELETION_PURPOSE ? cleanDeletionCredential(raw) : null;
  if (credential === null) {
    // зачем: мусор не стоит ни одного чтения Firestore.
    console.warn(`${LOG} status denied code=${raw.purpose === ACCOUNTS_V2_DELETION_PURPOSE ? 'malformed' : 'wrong_purpose'} reads=0`);
    throw new AccountsV2DeletionError('denied');
  }
  const receiptId = deletionReceiptDocId(credential.operationId);
  if (options.probe !== undefined && options.probe.limiter.blocked(options.probe.keys, nowMs)) {
    console.warn(`${LOG} status probe_limited reads=0`);
    throw new AccountsV2DeletionError('rate_limited');
  }
  const { decision, cursor } = await authorize(store, receiptId, raw, nowMs);
  if (decision.kind === 'denied' && decision.reason === 'not_found' && options.probe !== undefined) {
    options.probe.limiter.noteMiss(options.probe.keys, nowMs);
  }
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
    const saved = await updatePending(store, receiptId, hash, (record) => (
      record.stage === 'v2_purged' ? null : { ...record, stage: 'purging', cursor: next, updatedAtMs: nowMs }
    ));
    if (saved === 'absent') {
      // зачем (Пакет 6A, хвост P3 Пакета 4): квитанцию отозвали посреди стирания
      // (удаление отменено/откатилось) — ошибка в onProgress обрывает стирание
      // сразу после текущей порции, а не доводит его по отозванному праву.
      console.warn(`${LOG} nudge stopped code=receipt_revoked_mid_purge ref=${ref}`);
      throw new AccountsV2DeletionError('denied');
    }
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
export type DeletionRevokeResult = 'revoked' | 'revoked_after_v2_purge' | 'completed' | 'absent';

export async function revokeDeletionReceipt(
  store: DeletionReceiptStore,
  receiptId: string,
): Promise<DeletionRevokeResult> {
  const result = await store.transact<DeletionRevokeResult | 'corrupt'>(receiptId, (stored) => {
    if (stored === null || stored === undefined) return { next: null, result: 'absent' };
    if (!isDeletionReceiptRecord(stored)) return { next: null, result: 'corrupt' };
    if (stored.stage === 'completed') return { next: null, result: 'completed' };
    // зачем (Пакет 6A, хвост P3 Пакета 4): после v2_purged данные V2 уже стёрты —
    // отзыв квитанции их не вернёт. Отдельный результат, чтобы вызывающий не
    // выдал откат за «чистое восстановление» и громко залогировал потерю V2.
    return { next: 'delete', result: stored.stage === 'v2_purged' ? 'revoked_after_v2_purge' : 'revoked' };
  });
  if (result === 'corrupt') {
    console.error(`${LOG} revoke corrupt_receipt ref=${receiptTag(receiptId)}`);
    throw new AccountsV2DeletionError('conflict');
  }
  if (result === 'revoked_after_v2_purge') {
    console.error(`${LOG} revoke after_v2_purge ref=${receiptTag(receiptId)} v2_data=already_erased`);
  } else {
    console.log(`${LOG} revoke ref=${receiptTag(receiptId)} result=${result}`);
  }
  return result;
}
