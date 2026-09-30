import {
  AccountsV2ApplyError,
  deepFreeze,
  docIdFor,
  identityString,
  opDocIdFor,
  safeInteger,
  sha256OfText,
  type AccountsV2EntityType,
  type AccountsV2Envelope,
  type AccountsV2OpRecord,
  type AccountsV2Receipt,
  type AccountsV2RejectCode,
  type AccountsV2RejectedReceipt,
  type AccountsV2TxPort,
  type JsonValue,
  type ValidatedBatch,
} from './accounts_v2_contract';
import {
  canonicalJson,
  mergeFlashcard,
  mergeLessonProgress,
  mergeLibraryMembership,
  type FlashcardState,
  type LessonProgressState,
  type LibraryMembershipState,
} from './accounts_v2_merge';
import {
  buildEntityRecord,
  buildOpRecord,
  encodeState,
  loadEntityRecord,
  loadOpRecord,
  stateFits,
  type LoadedEntity,
  type LoadedOp,
} from './accounts_v2_store';
import { isIssuedBatch } from './accounts_v2_validate';

// зачем (ремонт №3, P3): публичный API — поимённо. Реэкспорт «звёздочкой» молча выставлял
// наружу всё новое из модулей (внутренние помощники, кодек) — граница ядра
// должна меняться только явной правкой этого списка.
export {
  ACCOUNTS_V2_BATCH_KEYS,
  ACCOUNTS_V2_ENTITY_TYPES,
  ACCOUNTS_V2_ENVELOPE_KEYS,
  ACCOUNTS_V2_INDEX_EXEMPT_FIELDS,
  ACCOUNTS_V2_LIBRARY_MAX_TOMBSTONES,
  ACCOUNTS_V2_LIMITS,
  ACCOUNTS_V2_MAX_ENTITY_STATE_BYTES,
  ACCOUNTS_V2_OWNED_OPERATION_KEYS,
  ACCOUNTS_V2_RECEIPT_KEYS,
  ACCOUNTS_V2_RECEIPT_OUTCOMES,
  ACCOUNTS_V2_REJECT_CODES,
  ACCOUNTS_V2_SCHEMA_VERSION,
  ACCOUNTS_V2_SRS_FIELDS,
  ACCOUNTS_V2_SRS_MAX_FUTURE_SKEW_MS,
  ACCOUNTS_V2_SRS_TIME_KEY,
  AccountsV2ApplyError,
  accountsV2JsonWireBytes,
  docIdFor,
  firestoreStringBytes,
  opDocIdFor,
} from './accounts_v2_contract';
export type {
  AccountSyncReceipt,
  AccountsV2ApplyErrorCode,
  AccountsV2Batch,
  AccountsV2ConflictReceipt,
  AccountsV2EntityRecord,
  AccountsV2EntityType,
  AccountsV2Envelope,
  AccountsV2OpRecord,
  AccountsV2OwnedOperation,
  AccountsV2Receipt,
  AccountsV2RejectCode,
  AccountsV2RejectedReceipt,
  AccountsV2StoredReceipt,
  AccountsV2TxPort,
  AccountsV2ValidationCode,
  JsonObject,
  JsonValue,
  ValidatedBatch,
} from './accounts_v2_contract';
export { canonicalJson, mergeFlashcard, mergeLessonProgress, mergeLibraryMembership } from './accounts_v2_merge';
export type {
  FlashcardFieldState,
  FlashcardMergeResult,
  FlashcardState,
  FlashcardRejectCode,
  LessonProgressState,
  LibraryItem,
  LibraryMembershipState,
  LibraryMergeResult,
  LibraryRejectCode,
  LibraryTombstone,
  SrsStamp,
} from './accounts_v2_merge';
export { resolveCallerUid, validateBatch } from './accounts_v2_validate';
export type { AccountsV2CallerResult, AccountsV2ValidateResult } from './accounts_v2_validate';

/*
 * Account V2, Пакет 3S — чистое серверное ядро применения синхронизации.
 *
 * зачем: клиентский outbox (`modules/account-session-v2/account_sync.ts`)
 * уже принят и шлёт пакеты `{ batchId, operations: [{ ownerUid, operation }] }`.
 * Здесь — вся серверная логика проверки и применения этих пакетов БЕЗ
 * Firebase SDK (ни admin, ни functions): личность только из auth, строгая
 * схема v1 с лимитами клиента, применение через порт одной транзакции,
 * идемпотентность по operationId и слияние по доменам. Ядро намеренно НЕ
 * подключено к index.ts: пока его нет в экспорте, деплой не создаёт функций.
 * Модули: contract (лимиты/типы/ключи), validate (вход), merge (домены),
 * store (кодек записей порта), apply_core (этот файл: план и применение).
 *
 * Экономика (жемчуг/XP) удалена без компенсации — ядро о ней ничего не знает.
 * Персональные данные ядро не логирует.
 */

// ─── решения ремонтов 3S (TG-3082EDFEB312, TG-B088A19E3B07, TG-C0E7B86E06F8, 2026-09-30) ────
// TEMP (формы хранения): данных до ремонта №4 НЕ существует — ядро не развёрнуто
//   (callable не в index.ts). Поэтому форма stateJson сменена без миграции
//   (SRS-отметка из 3 чисел, библиотека `items`). При ЛЮБОЙ смене формы хранения
//   ПОСЛЕ подключения — миграция или мягкое чтение старой формы: иначе строгий
//   кодек отвечает stored_state_corrupt и пакет пользователя не применяется никогда.
// зачем: conflict и rejected — ОКОНЧАТЕЛЬНЫЕ подтверждаемые исходы. Квитанция
//   записывается один раз, повтор той же операции получает её же, даже когда
//   сервер уже дорос. Клиент (`account_sync.ts`) пока знает только
//   applied|duplicate и читает их как sync_receipt_invalid.
// TEMP: callable НЕ подключать к index.ts, пока клиент не научится принимать
//   conflict/rejected. Сторож паритета проверяет «исходы клиента ⊆ исходов
//   сервера» и форму rejected (`code`) — клиента можно обновлять без правки сервера.
// TEMP (для клиента): `conflict` на операции карточки с НЕСКОЛЬКИМИ полями
//   значит «часть полей применена, конфликтующие ушли в варианты». Клиент не
//   должен считать, что не применилось ничего, и не должен переотправлять
//   операцию целиком: serverRevision в квитанции уже учитывает применённое.
// зачем (ремонт №4, решение владельца 2026-09-30, пункт 5): SRS-поля карточки
//   (`srs`, `srsPolicy`) — last-writer-wins без вариантов ПО ВРЕМЕНИ ПРАВКИ на
//   телефоне. Конверт клиента не меняется: SRS-значение обязано быть объектом с
//   целым `updatedAtMs` (safe integer ≥ 0), иначе `rejected payload_invalid`
//   (вся операция). Порядок — [updatedAtMs, baseRevision, clientSequence],
//   тай-брейк — канонический JSON значения; отметка хранит все три числа.
//   Отказ `srs_policy_hold` снят (ремонт №3). Неизвестные поля карточки
//   хранятся как opaque по общему правилу ревизий/вариантов.
// зачем (ремонт №4): время клиента недоверенное. `updatedAtMs` дальше
//   ACCOUNTS_V2_SRS_MAX_FUTURE_SKEW_MS (10 минут) от часов сервера —
//   окончательный `rejected srs_time_in_future`, а не зажим: зажим делал бы итог
//   зависимым от момента прихода. Закрепить значение будущим временем можно
//   максимум на 10 минут.
// TEMP (для клиента): при srs_time_in_future часы телефона врут — клиент
//   должен выпустить НОВУЮ операцию с исправленным временем (повтор старой
//   получит тот же отказ).
// зачем (ремонт №4): проигравшая SRS-запись ничего не пишет; если её значение
//   отличается от сохранённого — исход `conflict` (без вариантов), чтобы клиент
//   перечитал победителя. Проигравшая с тем же значением — `applied` без записи.
// зачем (ремонт №3/№4, решение владельца 2026-09-30): библиотека — `{itemIds}`
//   добавить | `{removeItemIds}` удалить. Живые id хранят ревизию добавления,
//   tombstone — ревизию удаления. Операция над id применяется, только если
//   устройство видело последнее изменение этого id (baseRevision ≥ ревизии);
//   иначе id не трогается, исход conflict. Удаление отсутствующего id ничего не
//   пишет. Итог не зависит от порядка прихода.
// TEMP (сборка мусора tombstone, ремонт №4, уточнено ремонтом №5): tombstone не
//   больше ACCOUNTS_V2_LIBRARY_MAX_TOMBSTONES (1000); сверх предела и когда
//   состояние не помещается в предел байт вытесняются самые старые по ревизии
//   удаления — но ТОЛЬКО созданные до начала пакета (ревизия ≤ R0). Свежие
//   tombstone этого пакета не вытесняются никогда: если без них не помещается —
//   окончательный `rejected entity_state_too_large` (удаление у предела больше
//   НЕ проходит всегда — честный отказ вместо тихой потери защиты). Цена:
//   вытесненный старый tombstone не защищает от воскрешения ОЧЕНЬ старую
//   устаревшую операцию добавления (её baseRevision древнее вытесненной
//   ревизии) — приемлемо: такие операции живут в outbox дольше, чем сотни
//   удалений на сервере.
// зачем (ремонт №5, P1): внутри ОДНОГО пакета операции по одной сущности
//   причинно упорядочены. R0 — ревизия сущности на начало пакета. База ≥ R0 ⇒
//   эффективная база = текущая ревизия внутри пакета («добавил → удалил» с
//   одного телефона офлайн проходит applied/applied); база > R0 — «из будущего»,
//   conflict; база < R0 — устаревшая, как раньше. Одинаково для библиотеки и
//   карточки; урок базы не использует; SRS-отметка берёт ИСХОДНУЮ базу.
// TEMP-КОНТРАКТ ДЛЯ КЛИЕНТА (ремонт №5, уточнён ремонтом №6; клиент
//   `modules/account-session-v2/` этого пока НЕ делает — задачи следующего
//   клиентского пакета):
//   (а) (ремонт №7, консервативно) клиент НИКОГДА не продвигает baseRevision
//       ожидающих операций по квитанциям: serverRevision в applied/duplicate —
//       это текущая ревизия сущности, даже если сама операция ничего не
//       записала, и она может принадлежать другому устройству (напр. удаление
//       отсутствующего id получает applied на чужой ревизии) — продвижение по
//       ней молча затёрло бы чужую правку (воскресило бы удалённое). Правило:
//       ожидающие операции одной сущности отправлять В ОДНОМ пакете (сервер сам
//       считает их причинно упорядоченными — эффективная база, ремонт №5). Если
//       не поместились (предел пакета) или остались после квитанции — операция
//       уходит в следующем пакете С ИСХОДНОЙ базой, клиент базу НЕ меняет ни по
//       квитанции, ни по перечитанному состоянию (прочитанная ревизия включает
//       чужие правки, которых операция не видела — присвоение её базе молча
//       стёрло бы их, ремонт №8). Честный итог — conflict/вариант; разрешение
//       конфликта — НОВАЯ операция, которую клиент выпускает осознанно по
//       прочитанному состоянию (намерение пользователя, а не старый payload).
//       Тест межпакетного сценария — accounts_v2_batch_causality.test.ts.
//       ЦЕНА: правки одной сущности, разнесённые по разным пакетам, дают conflict,
//       а у карточки ещё и копят варианты (риск потолка размера) — клиент обязан
//       заранее сжимать ожидающие операции одной сущности, чтобы они влезали в
//       один пакет.
//       НИКОГДА не менять операции из отправленного, но не подтверждённого
//       пакета: отпечаток operationId включает baseRevision, и повтор с
//       изменённой базой получит окончательный `rejected operation_id_reused`;
//   (б) SRS `updatedAtMs` — гибридные часы: max(Date.now() + поправка_на_сервер,
//       увиденное.updatedAtMs + 1), где «увиденное» — SRS-значение, которое
//       телефон правит. Иначе правка на телефоне с отстающими часами проиграет
//       более старой по смыслу записи;
//   (в) поправка на время сервера: адаптер callable (следующий пакет) ОБЯЗАН
//       отдавать в ответе `serverNowMs` (тот же nowMs, что ушёл в applyBatch)
//       ОТДЕЛЬНЫМ полем ответа, вне квитанций — форма квитанций не меняется.
//       Клиент хранит смещение serverNowMs − Date.now() и применяет его в (б) и
//       при проверке допуска;
//   (г) при `rejected srs_time_in_future` отклоняется ВСЯ операция — клиент
//       выпускает SRS отдельной НОВОЙ операцией с исправленным временем, а
//       остальные поля — своей операцией, чтобы не терять их;
//   (д) клиент сохраняет порядок outbox по каждой сущности (порядок выпуска
//       операций) и не подмешивает в свой outbox операции другого устройства
//       (например, при восстановлении из резервной копии): сервер считает
//       порядок операций в пакете причинным (эффективная база, см. ремонт №5)
//       и clientSequence для порядка НЕ сверяет — перемешанный пакет применится
//       в присланном порядке.
// TEMP: схемы payload (lesson `{passed, score, …}`, flashcard
//   `{op:'upsert', fields}` | `{op:'tombstone'}`) — решение этой сессии.
// TEMP (потолок размера): операции «разрешить варианты поля» нет — обычный
//   upsert варианты НЕ сбрасывает, они копятся. Когда stateJson сущности
//   упирается в ACCOUNTS_V2_MAX_ENTITY_STATE_BYTES (180 000 байт по формуле
//   Firestore), КАЖДАЯ операция, увеличивающая состояние, получает окончательный
//   `rejected entity_state_too_large`; уменьшающие (tombstone, выбор значения
//   из вариантов) проходят. Операцию разрешения вариантов нужно добавить ДО
//   подключения callable, иначе активная карточка может «застрять» у потолка.
// зачем: ВСЯ пользовательская структура хранится только канонической
//   JSON-строкой (`stateJson`), а пользовательские строки записи — JSON-строками
//   (`entityIdJson`, `lastOperationIdJson`, `operationIdJson`). Firestore видит
//   лишь well-formed строки и числа: вложенные массивы вариантов, глубина,
//   имена полей `''`/`__x__`/>1500 байт, число индексных записей и одиночные
//   суррогаты ему больше не видны. Ключи документов — sha256 (docIdFor/opDocIdFor).
//   Поэтому сервер НЕ строже клиента к id и ключам (сверяет сторож паритета).
// TEMP (для адаптера Firestore, следующий пакет):
//   - поля ACCOUNTS_V2_INDEX_EXEMPT_FIELDS (entityIdJson, stateJson,
//     lastOperationIdJson, operationIdJson, fingerprint) исключить из
//     single-field индексов (fieldOverrides без индексов) и НЕ включать ни в
//     один составной индекс;
//   - квота коммита: одна транзакция = до 50 документов сущностей + до 50
//     квитанций, в худшем случае ≈ 9,21 МиБ < 9,5 МиБ < 10 МиБ (лимит запроса
//     Firestore). Держится пределом состояния 180 000 байт; поднимать предел
//     или maxBatchOperations — только вместе с тестами бюджета (из констант и
//     на реальных записях: accounts_v2_commit_budget.test.ts);
//   - читать ровно ключи planBatchReads одним getAll внутри транзакции, порт
//     бросает на любой ключ вне плана;
//   - TTL квитанций операций (коллекция op-записей) обязан быть ДОЛЬШЕ
//     максимального времени жизни неподтверждённой операции в клиентском
//     outbox (с запасом на офлайн). Иначе квитанция истечёт раньше повтора, и
//     повтор старой операции применится заново как новая (двойное применение
//     или воскрешение). Лимит частоты вызовов callable на uid — тоже адаптер;
//   - uid из auth идёт в путь документа как есть (Firebase uid — ASCII ≤ 128).
// зачем (P3, зафиксировано тестом): tombstone карточки с baseRevision из
//   будущего — conflict без записи, как и любая операция карточки/библиотеки.

type EntityKey = Readonly<{ entityType: AccountsV2EntityType; entityId: string; docId: string }>;
type OpKey = Readonly<{ operationId: string; opDocId: string }>;

/**
 * Что прочитает applyBatch — чтобы адаптер Firestore прочитал это заранее в
 * транзакции. applyBatch обращается к порту ТОЛЬКО по этим ключам.
 * Принимает только пакет, выданный validateBatch (как applyBatch).
 */
export function planBatchReads(batch: ValidatedBatch): Readonly<{
  operations: readonly OpKey[];
  entities: readonly EntityKey[];
}> {
  if (!isIssuedBatch(batch)) throw new AccountsV2ApplyError('invalid_batch');
  const seen = new Set<string>();
  const entities: EntityKey[] = [];
  for (const { operation } of batch.operations) {
    const docId = docIdFor(operation.entityType, operation.entityId);
    if (!seen.has(docId)) {
      seen.add(docId);
      entities.push({ entityType: operation.entityType, entityId: operation.entityId, docId });
    }
  }
  const operations = batch.operations.map(({ operation }) => ({
    operationId: operation.operationId, opDocId: opDocIdFor(operation.operationId),
  }));
  return { operations, entities };
}

function fingerprint(operation: AccountsV2Envelope): string {
  // зачем: «тот же operationId» должен означать ту же операцию — как клиентский
  // operationEqual (все поля конверта, порядок ключей payload не важен).
  return sha256OfText(canonicalJson([
    operation.schemaVersion, operation.entityType, operation.entityId,
    operation.clientSequence, operation.baseRevision, operation.payload,
  ]));
}

/** Итог сущности после операции; запись порта строится один раз — из итогового состояния. */
type PendingEntity = Readonly<{
  entityType: AccountsV2EntityType; entityId: string; revision: number; operationId: string; state: JsonValue;
}>;
type OpOutcome = Readonly<{ receipt: AccountsV2Receipt; next: PendingEntity | null }>;

function rejected(operationId: string, code: AccountsV2RejectCode, serverRevision: number): AccountsV2RejectedReceipt {
  return { operationId, outcome: 'rejected', code, serverRevision };
}

type MergedState = Readonly<{ state: JsonValue; changed: boolean; conflict: boolean }>;

function mergeByDomain(
  operation: AccountsV2Envelope,
  stored: JsonValue | null,
  currentRevision: number,
  startRevision: number,
  nowMs: number,
): MergedState | AccountsV2Receipt {
  const { operationId, entityType, payload } = operation;
  if (entityType === 'lesson_progress') {
    // зачем: D66 — сервер не может отклонить локальный учебный результат,
    // поэтому устаревший baseRevision здесь не конфликт: слияние «лучший из»
    // коммутативно и ничего не теряет.
    const result = mergeLessonProgress(stored as LessonProgressState | null, payload);
    if (!result.ok) return rejected(operationId, result.code, currentRevision);
    return { state: result.state as unknown as JsonValue, changed: result.changed, conflict: false };
  }
  const base = operation.baseRevision ?? 0;
  // зачем: ревизия из будущего значит, что клиент видел состояние, которого
  // у сервера нет (сброс/потеря). Строгий вариант — ничего не писать. Для
  // библиотеки это ещё и защита tombstone: база «из будущего» обошла бы его.
  // Ремонт №5: «будущее» считается от ревизии на НАЧАЛО пакета (startRevision):
  // ревизии, выданные внутри пакета, клиент видеть не мог.
  if (base > startRevision) return { operationId, outcome: 'conflict', serverRevision: currentRevision };
  // зачем (ремонт №5, P1): офлайн-правки одного телефона уходят одним пакетом с
  // одной базой («добавил → удалил»). Внутри пакета операции по сущности
  // причинно упорядочены: база ≥ ревизии на начало пакета значит «видел всё,
  // что было до пакета», а предыдущие операции пакета — его же. Поэтому
  // эффективная база = текущая ревизия внутри пакета. Она никогда не больше
  // currentRevision — «будущего» не даёт. Устаревшая база (< startRevision)
  // остаётся как есть. Между пакетами — обязанность клиента (TEMP-контракт (а)).
  const effectiveBase = base >= startRevision ? currentRevision : base;
  // nextRevision может выйти за MAX_SAFE_INTEGER — тогда applyOne откажет до записи.
  if (entityType === 'library_membership') {
    const result = mergeLibraryMembership(
      stored as LibraryMembershipState | null, payload, effectiveBase, currentRevision + 1, startRevision,
    );
    if (!result.ok) return rejected(operationId, result.code, currentRevision);
    return { state: result.state as unknown as JsonValue, changed: result.changed, conflict: result.conflict };
  }
  // SRS-отметка берёт исходную базу (порядок по времени правки не зависит от нарезки пакетов).
  const result = mergeFlashcard(
    stored as FlashcardState | null, payload, effectiveBase, currentRevision + 1, operation.clientSequence, nowMs, base,
  );
  if (!result.ok) return rejected(operationId, result.code, currentRevision);
  return { state: result.state as unknown as JsonValue, changed: result.changed, conflict: result.conflict };
}

function applyOne(
  operation: AccountsV2Envelope,
  current: LoadedEntity | null,
  startRevision: number,
  nowMs: number,
): OpOutcome {
  const { operationId, entityType, entityId } = operation;
  const currentRevision = current === null ? 0 : current.revision;
  const merged = mergeByDomain(
    operation, current === null ? null : current.state, currentRevision, startRevision, nowMs,
  );
  if ('outcome' in merged) return { receipt: merged, next: null };
  const { state, changed, conflict } = merged;
  if (!changed) {
    return {
      receipt: { operationId, outcome: conflict ? 'conflict' : 'applied', serverRevision: currentRevision },
      next: null,
    };
  }
  // зачем: ревизия — безопасное целое. У предела отказываем ДО записи, а не
  // пишем неточное число, после которого сравнение ревизий ломается.
  if (currentRevision >= Number.MAX_SAFE_INTEGER) {
    return { receipt: rejected(operationId, 'revision_overflow', currentRevision), next: null };
  }
  // зачем (SEC P1-2): предел — в единицах Firestore (байты UTF-8 строки + 1).
  // Размер считается без построения строки; строка — один раз при записи.
  if (!stateFits(state)) return { receipt: rejected(operationId, 'entity_state_too_large', currentRevision), next: null };
  const nextRevision = currentRevision + 1;
  return {
    receipt: { operationId, outcome: conflict ? 'conflict' : 'applied', serverRevision: nextRevision },
    next: { entityType, entityId, revision: nextRevision, operationId, state },
  };
}

function replayReceipt(prior: LoadedOp, operationId: string, print: string): AccountsV2Receipt {
  // зачем: чужое содержимое под известным operationId не применяем и исходную
  // запись не перезаписываем.
  if (prior.fingerprint !== print) return rejected(operationId, 'operation_id_reused', prior.receipt.serverRevision);
  if (prior.receipt.outcome === 'applied') {
    return { operationId, outcome: 'duplicate', serverRevision: prior.receipt.serverRevision };
  }
  // Конфликт/отказ записаны один раз и навсегда — повтор получает тот же ответ,
  // даже если сервер с тех пор дорос (квитанция уже проверена loadOpRecord).
  return prior.receipt;
}

/**
 * Применяет проверенный пакет через порт ОДНОЙ транзакции.
 * Порядок строго: все чтения → расчёт в памяти → все записи. Частичных
 * квитанций нет: квитанции возвращаются только после всех записей, любое
 * исключение порта уходит наверх и откатывает транзакцию целиком.
 * Принимает только ValidatedBatch — пакет, выданный validateBatch.
 */
export function applyBatch(
  port: AccountsV2TxPort,
  uid: string,
  batch: ValidatedBatch,
  nowMs: number,
): readonly AccountsV2Receipt[] {
  if (!identityString(uid)) throw new AccountsV2ApplyError('unauthenticated');
  if (!safeInteger(nowMs)) throw new AccountsV2ApplyError('invalid_now');
  // Рантайм-половина бренда: копия или самодельный объект той же формы — отказ.
  if (!isIssuedBatch(batch)) throw new AccountsV2ApplyError('invalid_batch');
  // uid из пакета полномочий не даёт: любой чужой ownerUid — отказ до первого чтения.
  if (batch.operations.some(({ ownerUid }) => ownerUid !== uid)) throw new AccountsV2ApplyError('uid_mismatch');
  const plan = planBatchReads(batch);
  const opDocIds = new Set(plan.operations.map(({ opDocId }) => opDocId));
  if (opDocIds.size !== plan.operations.length) throw new AccountsV2ApplyError('invalid_batch');

  // 1. Чтения — только ключи плана.
  const priorOps = new Map<string, LoadedOp | null>();
  for (const { operationId, opDocId } of plan.operations) {
    priorOps.set(operationId, loadOpRecord(port.getOp(uid, opDocId), operationId));
  }
  const entities = new Map<string, LoadedEntity | null>();
  // зачем (ремонт №5): ревизия каждой сущности на НАЧАЛО пакета (R0) — от неё
  // считаются «база из будущего», эффективная база и вытесняемые tombstone.
  const startRevisions = new Map<string, number>();
  for (const { entityType, entityId, docId } of plan.entities) {
    const loaded = loadEntityRecord(port.getEntity(uid, docId), entityType, entityId);
    entities.set(docId, loaded);
    startRevisions.set(docId, loaded === null ? 0 : loaded.revision);
  }

  // 2. Расчёт в памяти.
  const receipts: AccountsV2Receipt[] = [];
  const opWrites: (readonly [string, AccountsV2OpRecord])[] = [];
  const pendingEntities = new Map<string, PendingEntity>();
  for (const { operation } of batch.operations) {
    const { operationId } = operation;
    const print = fingerprint(operation);
    const prior = priorOps.get(operationId) ?? null;
    if (prior !== null) {
      receipts.push(replayReceipt(prior, operationId, print));
      continue;
    }
    const docId = docIdFor(operation.entityType, operation.entityId);
    const outcome = applyOne(operation, entities.get(docId) ?? null, startRevisions.get(docId) ?? 0, nowMs);
    if (outcome.next !== null) {
      entities.set(docId, { revision: outcome.next.revision, state: outcome.next.state });
      pendingEntities.set(docId, outcome.next);
    }
    receipts.push(outcome.receipt);
    opWrites.push([opDocIdFor(operationId), buildOpRecord(operationId, print, outcome.receipt, nowMs)] as const);
  }

  // зачем (P3): состояние кодируется ОДИН раз на сущность — итоговое после
  // всего пакета, а не после каждой операции.
  const entityWrites = [...pendingEntities].map(([docId, next]) => [docId, buildEntityRecord(
    next.entityType, next.entityId, next.revision, nowMs, next.operationId, encodeState(next.state),
  )] as const);

  // 3. Записи — только после всех чтений (правило транзакций Firestore).
  for (const [docId, record] of entityWrites) port.putEntity(uid, docId, record);
  for (const [opDocId, record] of opWrites) port.putReceipt(uid, opDocId, record);
  return deepFreeze(receipts.map((receipt) => ({ ...receipt })));
}
