import {
  Timestamp,
  type DocumentReference,
  type DocumentSnapshot,
  type Firestore,
  type Transaction,
} from 'firebase-admin/firestore';
import {
  applyBatch,
  planBatchReads,
  type AccountsV2EntityRecord,
  type AccountsV2OpRecord,
  type AccountsV2Receipt,
  type AccountsV2TxPort,
  type ValidatedBatch,
} from '../accounts_v2_apply_core';

/*
 * Account V2, Пакет 3A-srv (TG-AEB4A011B5CF) — Firestore-адаптер порта ядра 3S.
 * Ремонт №1 (TG-A09A44FE758E): сторож читается первым, отказ стоит одно чтение,
 * «ядовитый» пакет коммитит только сторожа; коллекции переименованы.
 *
 * зачем: ядро (`accounts_v2_apply_core.ts`) намеренно синхронное и не знает
 * Firestore. Здесь — единственный шов: пути документов под uid, чтение сторожа
 * (`tx.get`), затем ОДНО чтение всего плана (`tx.getAll` по planBatchReads)
 * внутри транзакции, синхронный порт поверх прочитанных снапшотов и запись
 * накопленного в той же транзакции. Все чтения — до первой записи.
 * Модуль НЕ подключён к index.ts (деплой ничего не создаёт).
 * зачем подпапка `accounts_v2_adapter/`: сторож чистоты ядра
 * (accounts_v2_envelope_parity.test.ts) требует, чтобы КАЖДЫЙ
 * `src/accounts_v2_*.ts` импортировал только crypto и свои модули. Адаптер
 * по смыслу обязан знать firebase-admin, поэтому живёт вне этой маски, а
 * граница «ядро без Firebase» остаётся под сторожем без ослабления.
 *
 * Схема (только под uid вызывающего, uid берётся из auth):
 *   accounts_v2/{uid}/accounts_v2_entities/{entityDocId} — сущность (docIdFor, sha256)
 *   accounts_v2/{uid}/accounts_v2_ops/{opDocId}          — квитанция (opDocIdFor, sha256) + expireAt
 *   accounts_v2/{uid}/accounts_v2_meta/{name}            — служебные документы (rate — счётчик частоты)
 * зачем префикс accounts_v2_ у коллекций: политика TTL и исключения индексов
 * задаются на ГРУППУ коллекций по имени по всей базе. Имя `ops`/`entities`
 * могло бы совпасть с чужой подколлекцией проекта, и TTL-политика по
 * `expireAt` снесла бы чужие документы. Уникальное имя делает политику точной.
 * TEMP (деплой): TTL-политика Firestore на группу коллекций `accounts_v2_ops`,
 *   поле `expireAt`; исключения индексов для больших полей `accounts_v2_entities`
 *   (stateJson). Без TTL квитанции копятся вечно (стоимость хранения, не
 *   корректность).
 *
 * Retry Firestore: runTransaction может перезапустить функцию целиком. Это
 * безопасно: порт, накопленные записи и исход попытки создаются заново ВНУТРИ
 * функции транзакции на каждой попытке, а ядро детерминировано при том же nowMs
 * (его фиксирует вызывающий ДО транзакции).
 *
 * Стоимость одного пакета из N операций над M сущностями:
 *   успех:           1 (сторож) + N + M чтений; записей — новые квитанции +
 *                    изменённые сущности + 1 (сторож);
 *   отказ сторожа:   1 чтение, 0–1 запись (решает сторож);
 *   ошибка ядра:     1 + N + M чтений, 1 запись (только сторож) — «ядовитый»
 *                    пакет тратит лимит, а не повторяется бесплатно.
 * Повтор уже подтверждённой операции ничего, кроме сторожа, не пишет.
 */

const ROOT = 'accounts_v2';
const HEX_DOC_ID = /^[0-9a-f]{64}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Имена подколлекций под `accounts_v2/{uid}` (уникальные на всю базу — см. шапку). */
export const ACCOUNTS_V2_COLLECTIONS = Object.freeze({
  entities: 'accounts_v2_entities',
  ops: 'accounts_v2_ops',
  meta: 'accounts_v2_meta',
});

/**
 * Срок жизни квитанции операции (поле TTL `expireAt`).
 *
 * зачем (TEMP-контракт ядра 3S): квитанция обязана жить ДОЛЬШЕ, чем может
 * прожить неподтверждённая операция в клиентском outbox, иначе повтор старой
 * операции после истечения квитанции применится заново (двойное применение /
 * воскрешение удалённого). Клиентский предел жизни операции в outbox —
 * 170 суток (`ACCOUNT_SYNC_OPERATION_MAX_AGE_MS` в
 * `modules/account-session-v2/account_sync_outbox_records.ts`): старше — в
 * карантин `sync_operation_expired`, а не отправка. Возраст клиент меряет двумя
 * оценками — местными часами и часами с поправкой на `serverNowMs` — и истекает
 * операция, если обе > 170 суток, или одна > 170, а вторая отрицательна (то есть
 * доказанно ложна) (TG-085BF4F55515); возврат из карантина (requeue) сохраняет
 * исходное время постановки, срок не продлевается (TG-7CD73967EF61).
 * Запас 10 суток — на расхождение часов и задержку TTL-чистки Firestore.
 * Сбитые часы клиента закрывает сервер (TG-DFA918464DFA): операция несёт
 * `enqueuedAtServerMs`, ядро отказывает старше 170 суток по СВОИМ часам
 * (`operation_expired`), а клиент не шлёт оценку позже первой отправки операции —
 * после истечения квитанции возраст на сервере ≥ 180 суток. Остаток (TEMP):
 * сдвиг часов телефона больше запаса 10 суток в момент первой отправки при
 * устаревшем смещении или перевод часов назад после неё.
 * Сторож: accounts_v2_timing_parity.test.ts читает ОБА числа из исходников и
 * падает, если предел клиента не строго меньше этого срока.
 */
export const ACCOUNTS_V2_RECEIPT_TTL_MS = 180 * DAY_MS;

/** Имя поля TTL квитанции (политика TTL на группу `accounts_v2_ops` — задача деплоя). */
export const ACCOUNTS_V2_RECEIPT_TTL_FIELD = 'expireAt';

function pathSegmentOk(segment: string): boolean {
  return segment.length > 0 && !segment.includes('/') && segment !== '.' && segment !== '..'
    && !/^__.*__$/.test(segment);
}

/**
 * uid идёт в путь как есть (Firebase uid — ASCII ≤ 128), но путь обязан остаться
 * путём ровно этого пользователя: `/`, `.`/`..` и `__…__` Firestore трактует
 * особо — такой uid отклоняется, а не «чинится».
 */
export function accountsV2UidPathSafe(uid: string): boolean {
  // зачем (Пакет 4, Ремонт №1 P3-2): под accounts_v2 лежит контейнер квитанций
  // удаления `_deletion_receipts_v1`. uid с префиксом `_` (Firebase такие не
  // выдаёт: [A-Za-z0-9]{28}) мог бы писать в чужой служебный контейнер — отказ.
  return pathSegmentOk(uid) && !uid.startsWith('_');
}

function assertPathSegment(segment: string, reason: string): void {
  if (!pathSegmentOk(segment)) {
    console.warn(`[ACCOUNTS-V2] path rejected reason=${reason}`);
    throw new Error(`accounts_v2_${reason}`);
  }
}

function assertDocId(docId: string): void {
  if (!HEX_DOC_ID.test(docId)) {
    console.warn('[ACCOUNTS-V2] path rejected reason=doc_id_not_sha256');
    throw new Error('accounts_v2_doc_id_not_sha256');
  }
}

/** Путь к документу под uid: `accounts_v2/{uid}/{collection}/{docId}`. */
export function accountsV2UserDocPath(uid: string, collection: string, docId: string): string {
  if (!accountsV2UidPathSafe(uid)) {
    console.warn('[ACCOUNTS-V2] path rejected reason=uid_not_path_safe');
    throw new Error('accounts_v2_uid_not_path_safe');
  }
  assertPathSegment(collection, 'collection_not_path_safe');
  assertPathSegment(docId, 'doc_id_not_path_safe');
  return `${ROOT}/${uid}/${collection}/${docId}`;
}

export function accountsV2EntityPath(uid: string, entityDocId: string): string {
  assertDocId(entityDocId);
  return accountsV2UserDocPath(uid, ACCOUNTS_V2_COLLECTIONS.entities, entityDocId);
}

export function accountsV2OpPath(uid: string, opDocId: string): string {
  assertDocId(opDocId);
  return accountsV2UserDocPath(uid, ACCOUNTS_V2_COLLECTIONS.ops, opDocId);
}

/** Служебный документ под uid (например, `rate` — счётчик частоты). */
export function accountsV2MetaPath(uid: string, name: string): string {
  return accountsV2UserDocPath(uid, ACCOUNTS_V2_COLLECTIONS.meta, name);
}

type StoredDoc = Readonly<Record<string, unknown>>;
type ReadPlan = ReturnType<typeof planBatchReads>;

export type AccountsV2SnapshotPort = Readonly<{
  port: AccountsV2TxPort;
  /** Накопленные записи (последняя запись ключа побеждает). */
  entityWrites: () => ReadonlyMap<string, AccountsV2EntityRecord>;
  opWrites: () => ReadonlyMap<string, AccountsV2OpRecord>;
}>;

/** Копия без служебного поля TTL: ядро проверяет ТОЧНЫЙ набор ключей квитанции. */
function withoutTtl(stored: StoredDoc): StoredDoc {
  return Object.fromEntries(Object.entries(stored).filter(([key]) => key !== ACCOUNTS_V2_RECEIPT_TTL_FIELD));
}

function outsidePlan(kind: string): never {
  console.error(`[ACCOUNTS-V2] port key outside plan kind=${kind}`);
  throw new Error('accounts_v2_port_key_outside_plan');
}

/**
 * Синхронный порт ядра поверх заранее прочитанных снапшотов.
 * Ключ вне плана и чужой uid — исключение. Отсутствующий документ плана — `null`.
 * Записи только копятся — в Map, созданных ЭТИМ вызовом (одна попытка транзакции).
 */
export function createAccountsV2SnapshotPort(
  uid: string,
  plan: ReadPlan,
  ops: ReadonlyMap<string, StoredDoc | null>,
  entities: ReadonlyMap<string, StoredDoc | null>,
): AccountsV2SnapshotPort {
  const planOps = new Set(plan.operations.map(({ opDocId }) => opDocId));
  const planEntities = new Set(plan.entities.map(({ docId }) => docId));
  const entityWrites = new Map<string, AccountsV2EntityRecord>();
  const opWrites = new Map<string, AccountsV2OpRecord>();
  const ownUid = (candidate: string): void => {
    if (candidate !== uid) {
      console.error('[ACCOUNTS-V2] port uid mismatch');
      throw new Error('accounts_v2_port_uid_mismatch');
    }
  };
  const port: AccountsV2TxPort = {
    getOp(candidate, opDocId) {
      ownUid(candidate);
      if (!planOps.has(opDocId) || !ops.has(opDocId)) return outsidePlan('op_read');
      const stored = ops.get(opDocId) ?? null;
      // Форму записи проверяет ядро (loadOpRecord, fail closed) — порт её не додумывает.
      return stored === null ? null : withoutTtl(stored) as unknown as AccountsV2OpRecord;
    },
    getEntity(candidate, entityDocId) {
      ownUid(candidate);
      if (!planEntities.has(entityDocId) || !entities.has(entityDocId)) return outsidePlan('entity_read');
      return (entities.get(entityDocId) ?? null) as unknown as AccountsV2EntityRecord | null;
    },
    putEntity(candidate, entityDocId, record) {
      ownUid(candidate);
      if (!planEntities.has(entityDocId)) outsidePlan('entity_write');
      entityWrites.set(entityDocId, record); // guard-ok: Map в памяти, не Firestore
    },
    putReceipt(candidate, opDocId, record) {
      ownUid(candidate);
      if (!planOps.has(opDocId)) outsidePlan('op_write');
      opWrites.set(opDocId, record); // guard-ok: Map в памяти, не Firestore
    },
  };
  return { port, entityWrites: () => entityWrites, opWrites: () => opWrites };
}

/**
 * Решение сторожа по его документу.
 * allowed: true  — пакет применяется, `write` уйдёт в ту же транзакцию (и при
 *                  ошибке ядра тоже: попытка оплачена).
 * allowed: false — план НЕ читается; `write` (если не null) коммитится,
 *                  `error` бросается после транзакции.
 */
export type AccountsV2GuardDecision =
  | Readonly<{ allowed: true; write: StoredDoc }>
  | Readonly<{ allowed: false; write: StoredDoc | null; error: Error }>;

/**
 * Сторож, читаемый ПЕРВЫМ отдельным `tx.get` (например, счётчик частоты).
 * Путь обязан лежать под `accounts_v2/{uid}/` вызывающего.
 */
export type AccountsV2TxGuard = Readonly<{
  path: string;
  decide: (stored: StoredDoc | null) => AccountsV2GuardDecision;
}>;

function snapshotData(snapshot: DocumentSnapshot): StoredDoc | null {
  if (!snapshot.exists) return null;
  return (snapshot.data() ?? null) as StoredDoc | null;
}

/** Исход ОДНОЙ попытки транзакции: ошибка возвращается, чтобы закоммитить сторожа. */
type AttemptOutcome =
  | Readonly<{ kind: 'applied'; receipts: readonly AccountsV2Receipt[] }>
  | Readonly<{ kind: 'failed'; error: unknown }>;

function errorTag(error: unknown): string {
  const name = error instanceof Error ? error.name : typeof error;
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : 'none';
  return `name=${name} code=${code}`;
}

/**
 * Применяет проверенный пакет одной транзакцией Firestore:
 * tx.get(сторож) → decide → (отказ: только запись сторожа) → tx.getAll(план) →
 * applyBatch → tx.set всех накопленных записей (+ сторож).
 * Ошибка ядра ловится ВНУТРИ функции транзакции: коммитится только сторож,
 * ошибка бросается после коммита. Ошибка чтения/коммита Firestore — откат целиком.
 * nowMs фиксирует вызывающий (одинаков на всех попытках retry).
 */
export async function applyBatchInFirestore(
  db: Firestore,
  uid: string,
  batch: ValidatedBatch,
  nowMs: number,
  guard?: AccountsV2TxGuard,
): Promise<readonly AccountsV2Receipt[]> {
  // Пути и план — до транзакции: непригодный uid / чужой пакет не стоят ни одного чтения.
  const plan = planBatchReads(batch);
  const opRefs = plan.operations.map(({ opDocId }) => db.doc(accountsV2OpPath(uid, opDocId)));
  const entityRefs = plan.entities.map(({ docId }) => db.doc(accountsV2EntityPath(uid, docId)));
  const planRefs: DocumentReference[] = [...opRefs, ...entityRefs];
  if (guard !== undefined && !guard.path.startsWith(`${ROOT}/${uid}/`)) {
    // зачем: сторож — чужой документ в транзакции пользователя; только свой префикс.
    console.error('[ACCOUNTS-V2] guard path outside caller root');
    throw new Error('accounts_v2_guard_path_foreign');
  }
  const guardRef = guard === undefined ? null : db.doc(guard.path);

  const outcome = await db.runTransaction(async (tx: Transaction): Promise<AttemptOutcome> => {
    // 1. Сторож — первым и отдельно: отказ не должен оплачивать чтение плана.
    let guardWrite: StoredDoc | null = null;
    if (guard !== undefined && guardRef !== null) {
      const decision = guard.decide(snapshotData(await tx.get(guardRef)));
      if (!decision.allowed) {
        if (decision.write !== null) tx.set(guardRef, decision.write); // guard-ok: одна запись в транзакции
        return { kind: 'failed', error: decision.error };
      }
      guardWrite = decision.write;
    }

    // 2. План — одним getAll (все чтения по-прежнему до первой записи).
    const snapshots = await tx.getAll(...planRefs);
    if (snapshots.length !== planRefs.length) {
      console.error(`[ACCOUNTS-V2] getAll size mismatch expected=${planRefs.length} got=${snapshots.length}`);
      throw new Error('accounts_v2_getall_mismatch');
    }
    const ops = new Map<string, StoredDoc | null>();
    plan.operations.forEach(({ opDocId }, index) => ops.set(opDocId, snapshotData(snapshots[index])));
    const entities = new Map<string, StoredDoc | null>();
    plan.entities.forEach(({ docId }, index) => entities.set(docId, snapshotData(snapshots[opRefs.length + index])));

    // 3. Ядро. Оно синхронное и без ввода-вывода: его исключение детерминировано
    // (повтор того же пакета упадёт так же), поэтому попытку оплачиваем сторожем,
    // а не откатываем — иначе «ядовитый» пакет повторялся бы бесплатно и вечно.
    let applied: Readonly<{ receipts: readonly AccountsV2Receipt[]; snapshotPort: AccountsV2SnapshotPort }>;
    try {
      const snapshotPort = createAccountsV2SnapshotPort(uid, plan, ops, entities);
      applied = { receipts: applyBatch(snapshotPort.port, uid, batch, nowMs), snapshotPort };
    } catch (error) {
      console.warn(`[ACCOUNTS-V2] core_failed ${errorTag(error)} guard=${guardWrite === null ? 'none' : 'commit_only'}`);
      if (guardRef !== null && guardWrite !== null) tx.set(guardRef, guardWrite); // guard-ok: одна запись
      return { kind: 'failed', error };
    }

    // 4. Записи — только после всех чтений и после успешного расчёта ядра.
    // guard-ok: tx.set внутри runTransaction — один атомарный коммит, не N запросов.
    const expireAt = Timestamp.fromMillis(nowMs + ACCOUNTS_V2_RECEIPT_TTL_MS);
    const { entityWrites, opWrites } = applied.snapshotPort;
    for (const [docId, record] of entityWrites()) tx.set(db.doc(accountsV2EntityPath(uid, docId)), record); // guard-ok
    for (const [opDocId, record] of opWrites()) { // guard-ok: tx.set в транзакции, один коммит
      tx.set(db.doc(accountsV2OpPath(uid, opDocId)), { ...record, [ACCOUNTS_V2_RECEIPT_TTL_FIELD]: expireAt }); // guard-ok
    }
    if (guardRef !== null && guardWrite !== null) tx.set(guardRef, guardWrite); // guard-ok
    return { kind: 'applied', receipts: applied.receipts };
  });

  if (outcome.kind === 'failed') throw outcome.error;
  return outcome.receipts;
}
