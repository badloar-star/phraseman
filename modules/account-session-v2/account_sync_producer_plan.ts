/*
 * Account V2, Пакет 6F (TG-84E5A5923FA4) — производитель операций: ЧИСТОЕ
 * планирование «изменение приложения → операции конверта».
 *
 * зачем: места записи приложения (урок, карточки, свайпы, библиотека) отдают
 * сюда снимок своего состояния; здесь он сравнивается с зеркалом области V2
 * (что уже поставлено в очередь) и превращается в минимальные операции по
 * контракту ядра (functions/src/accounts_v2_contract.ts + accounts_v2_merge.ts):
 *   урок      `<target>:lesson:<N>`         `{ passed, score }` (лучший, D66);
 *   карточка  `<target>:saved|custom:<id>`  `{ op:'upsert', fields }` / `{ op:'tombstone' }`;
 *   SRS       та же карточка, поле `srs` = `{ updatedAtMs: lastSeenAt, …CardMemory }`
 *             (решение владельца: время правки на телефоне);
 *   библиотека `<target>:community_packs`   `{ itemIds }` / `{ removeItemIds }`.
 * Идентификаторы сущностей — ровно как в dry-run миграции (Пакет 5), чтобы
 * перенос и живая запись попадали в одни и те же сущности.
 * Без сети, без хранилища, без часов: всё нужное приходит аргументами.
 */

export type ProducerTarget = string;

export type AccountsV2Change =
  | Readonly<{ kind: 'lesson_result'; target: ProducerTarget; lessonId: number; score: number; passed: boolean }>
  | Readonly<{ kind: 'card_snapshot'; target: ProducerTarget; list: 'saved' | 'custom'; cards: readonly unknown[] }>
  | Readonly<{ kind: 'swipe_memory'; target: ProducerTarget; memory: Readonly<Record<string, unknown>> }>
  | Readonly<{ kind: 'library_snapshot'; target: ProducerTarget; packIds: readonly unknown[] }>;

export type ProducerEntityType = 'lesson_progress' | 'flashcard' | 'library_membership';

/** Что уже поставлено в очередь по сущности (зеркало области). */
export type EntityMirror = Readonly<{
  /** lesson: лучший результат; flashcard: канонический JSON полей; library: состав. */
  lessonBest?: Readonly<{ passed: boolean; score: number }>;
  fields?: Readonly<Record<string, string>>;
  deleted?: boolean;
  items?: readonly string[];
}>;

export type PlannedOperation = Readonly<{
  entityType: ProducerEntityType;
  entityId: string;
  payload: unknown;
  /** Зеркало сущности ПОСЛЕ этой операции. */
  mirror: EntityMirror;
}>;

export type ProducerPlan = Readonly<{
  operations: readonly PlannedOperation[];
  /** Новый индекс списка карточек (для удалений), если снимок был списком. */
  listIndex: Readonly<{ key: string; ids: readonly string[] }> | null;
  /** Ранние выходы и пропуски — только коды и числа (в лог). */
  notes: readonly string[];
}>;

export type MirrorReader = (entityType: ProducerEntityType, entityId: string) => Promise<EntityMirror | null>;
export type ListIndexReader = (key: string) => Promise<readonly string[] | null>;

/** Поля карточки, которые живут в SRS-операциях свайпов, а не в снимке карточки. */
const SRS_FIELDS = new Set(['srs', 'srsPolicy']);
const MEMORY_FIELDS = ['correct', 'wrong', 'hints', 'seen', 'mastered', 'lastSeenAt', 'nextDueAt', 'ease'] as const;
const TRAINING_KEY = /^(saved|custom):all:(.+)$/;
const LIBRARY_CHUNK = 500;
/**
 * Снимок, где пропало больше половины известных элементов (и их не меньше 5), или
 * пустой снимок при непустом индексе — почти наверняка не удаление человеком,
 * а смена аккаунта / локальная чистка. Удалений тогда не шлём (только лог):
 * tombstone на сервере необратим.
 */
const MASS_DELETE_MIN = 5;

/** Канонический JSON (ключи по порядку) — сравнение «значение не изменилось». */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item === undefined ? null : item)).join(',')}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).filter((key) => record[key] !== undefined).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`;
}

/** JSON-копия (без undefined/функций); не-JSON значение → null. */
function jsonClone(value: unknown): unknown {
  try {
    const text = JSON.stringify(value);
    return text === undefined ? null : JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function plainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function looksLikeMassDelete(removed: number, known: number, remaining: number): boolean {
  if (removed === 0) return false;
  // зачем (ремонт №1, P3): пустой снимок — всегда подозрение (чистка/смена аккаунта),
  // даже если пропал один элемент: tombstone необратим, а явного сигнала удаления нет.
  if (remaining === 0) return true;
  return removed >= MASS_DELETE_MIN && removed * 2 > known;
}

export function listIndexKey(target: string, list: 'saved' | 'custom'): string {
  return `${target}:${list}`;
}

function planLesson(
  change: Extract<AccountsV2Change, { kind: 'lesson_result' }>,
  mirror: EntityMirror | null,
): PlannedOperation | string {
  if (!Number.isSafeInteger(change.lessonId) || change.lessonId < 0) return 'lesson_id_invalid';
  if (typeof change.score !== 'number' || !Number.isFinite(change.score) || change.score < 0) return 'lesson_score_invalid';
  if (typeof change.passed !== 'boolean') return 'lesson_passed_invalid';
  const best = mirror?.lessonBest;
  const better = best === undefined
    || (change.passed && !best.passed)
    || (change.passed === best.passed && change.score > best.score);
  // зачем: ядро хранит ЛУЧШИЙ результат; не лучший — ноль операций (без дублей).
  if (!better) return 'lesson_not_better';
  return Object.freeze({
    entityType: 'lesson_progress' as const,
    entityId: `${change.target}:lesson:${change.lessonId}`,
    payload: { passed: change.passed, score: change.score },
    mirror: Object.freeze({ lessonBest: Object.freeze({ passed: change.passed, score: change.score }) }),
  });
}

type CardRow = Readonly<{ id: string; fields: Record<string, unknown> }>;

function cardRows(cards: readonly unknown[], notes: string[]): readonly CardRow[] {
  const byId = new Map<string, CardRow>();
  let invalid = 0;
  for (const card of cards) {
    const clone = plainRecord(card) && typeof card.id === 'string' && card.id.length > 0 ? jsonClone(card) : null;
    if (!plainRecord(clone)) {
      invalid += 1;
      continue;
    }
    const fields: Record<string, unknown> = {};
    for (const [name, value] of Object.entries(clone)) {
      if (!SRS_FIELDS.has(name)) fields[name] = value;
    }
    byId.set(clone.id as string, Object.freeze({ id: clone.id as string, fields }));
  }
  if (invalid > 0) notes.push(`card_invalid count=${invalid}`);
  return [...byId.values()];
}

/**
 * TEMP (ремонт №1, P3): удаление ОТДЕЛЬНОГО поля карточки не отправляется — в
 * контракте ядра нет операции «убрать поле» (upsert сливает поля, `null` был бы
 * значением, а не удалением). Поле остаётся на сервере прежним; зеркало его тоже
 * помнит, чтобы не было ложных повторов. Закрыть вместе с операцией разрешения
 * вариантов (TEMP ядра) — до отключения старой синхронизации (Пакет 7).
 */
function cardUpsert(entityId: string, row: CardRow, mirror: EntityMirror | null, notes: string[]): PlannedOperation | null {
  const known = mirror?.fields ?? {};
  const dropped = Object.keys(known).filter((name) => name !== 'srs' && name !== 'srsPolicy' && !(name in row.fields));
  if (dropped.length > 0) notes.push(`card_field_removal_unsupported count=${dropped.length}`);
  const changed: Record<string, unknown> = {};
  const nextFields: Record<string, string> = { ...known };
  for (const [name, value] of Object.entries(row.fields)) {
    const canonical = canonicalJson(value);
    if (known[name] === canonical) continue;
    changed[name] = value;
    nextFields[name] = canonical;
  }
  if (Object.keys(changed).length === 0) return null;
  return Object.freeze({
    entityType: 'flashcard' as const,
    entityId,
    payload: { op: 'upsert', fields: changed },
    mirror: Object.freeze({ fields: Object.freeze(nextFields), deleted: false }),
  });
}

async function planCards(
  change: Extract<AccountsV2Change, { kind: 'card_snapshot' }>,
  readMirror: MirrorReader,
  readIndex: ListIndexReader,
  notes: string[],
): Promise<ProducerPlan> {
  const rows = cardRows(change.cards, notes);
  const operations: PlannedOperation[] = [];
  const indexKey = listIndexKey(change.target, change.list);
  const previous = await readIndex(indexKey);
  let resurrect = 0;
  for (const row of rows) {
    const entityId = `${change.target}:${change.list}:${row.id}`;
    const mirror = await readMirror('flashcard', entityId);
    if (mirror?.deleted === true) {
      // зачем: tombstone ядра главнее любого позднего upsert — воскрешения нет.
      resurrect += 1;
      continue;
    }
    const planned = cardUpsert(entityId, row, mirror, notes);
    if (planned !== null) operations.push(planned);
  }
  if (resurrect > 0) notes.push(`card_resurrect_unsupported count=${resurrect}`);
  const ids = rows.map((row) => row.id);
  if (previous === null) return Object.freeze({ operations, listIndex: Object.freeze({ key: indexKey, ids }), notes });
  const present = new Set(ids);
  const removed = previous.filter((id) => !present.has(id));
  if (looksLikeMassDelete(removed.length, previous.length, ids.length)) {
    notes.push(`card_mass_delete_skipped removed=${removed.length} known=${previous.length}`);
    // зачем: индекс не сужаем — удаления подождут явного снимка, а не местной чистки.
    return Object.freeze({ operations, listIndex: Object.freeze({ key: indexKey, ids: [...new Set([...previous, ...ids])] }), notes });
  }
  for (const id of removed) {
    const entityId = `${change.target}:${change.list}:${id}`;
    const mirror = await readMirror('flashcard', entityId);
    if (mirror?.deleted === true) continue;
    operations.push(Object.freeze({
      entityType: 'flashcard' as const,
      entityId,
      payload: { op: 'tombstone' },
      mirror: Object.freeze({ fields: Object.freeze({}), deleted: true }),
    }));
  }
  return Object.freeze({ operations, listIndex: Object.freeze({ key: indexKey, ids }), notes });
}

/** CardMemory → значение поля `srs` (как srsFromMemoryRow миграции). null — у записи нет времени правки. */
export function srsFromMemory(row: unknown): Record<string, number> | null {
  if (!plainRecord(row)) return null;
  const time = row.lastSeenAt;
  if (typeof time !== 'number' || !Number.isSafeInteger(time) || time <= 0) return null;
  const out: Record<string, number> = { updatedAtMs: time };
  for (const name of MEMORY_FIELDS) {
    const value = row[name];
    if (typeof value === 'number' && Number.isFinite(value)) out[name] = value;
  }
  return out;
}

async function planSwipe(
  change: Extract<AccountsV2Change, { kind: 'swipe_memory' }>,
  readMirror: MirrorReader,
  notes: string[],
): Promise<readonly PlannedOperation[]> {
  const operations: PlannedOperation[] = [];
  let packCards = 0;
  let noTime = 0;
  for (const key of Object.keys(change.memory).sort()) {
    const parsed = TRAINING_KEY.exec(key);
    if (parsed === null) {
      // зачем: карточки официальных/сообщества наборов — не сущности пользователя в V2 (как в миграции).
      packCards += 1;
      continue;
    }
    const srs = srsFromMemory(change.memory[key]);
    if (srs === null) {
      noTime += 1;
      continue;
    }
    const entityId = `${change.target}:${parsed[1]}:${parsed[2]}`;
    const mirror = await readMirror('flashcard', entityId);
    if (mirror?.deleted === true) continue;
    const canonical = canonicalJson(srs);
    if (mirror?.fields?.srs === canonical) continue;
    operations.push(Object.freeze({
      entityType: 'flashcard' as const,
      entityId,
      payload: { op: 'upsert', fields: { srs } },
      mirror: Object.freeze({ fields: Object.freeze({ ...(mirror?.fields ?? {}), srs: canonical }), deleted: false }),
    }));
  }
  if (packCards > 0) notes.push(`swipe_pack_cards_skipped count=${packCards}`);
  if (noTime > 0) notes.push(`swipe_no_edit_time count=${noTime}`);
  return operations;
}

async function planLibrary(
  change: Extract<AccountsV2Change, { kind: 'library_snapshot' }>,
  readMirror: MirrorReader,
  notes: string[],
): Promise<readonly PlannedOperation[]> {
  const ids = [...new Set(change.packIds.filter((id): id is string => typeof id === 'string' && id.length > 0))];
  if (ids.length !== change.packIds.length) notes.push(`library_ids_dropped count=${change.packIds.length - ids.length}`);
  const entityId = `${change.target}:community_packs`;
  const known = (await readMirror('library_membership', entityId))?.items ?? [];
  const knownSet = new Set(known);
  const added = ids.filter((id) => !knownSet.has(id)).sort();
  const present = new Set(ids);
  let removed = known.filter((id) => !present.has(id));
  if (looksLikeMassDelete(removed.length, known.length, ids.length)) {
    notes.push(`library_mass_delete_skipped removed=${removed.length} known=${known.length}`);
    removed = [];
  }
  const operations: PlannedOperation[] = [];
  let items = [...known];
  const push = (payload: unknown): void => {
    operations.push(Object.freeze({
      entityType: 'library_membership' as const, entityId, payload, mirror: Object.freeze({ items: Object.freeze([...items]) }),
    }));
  };
  for (let start = 0; start < added.length; start += LIBRARY_CHUNK) {
    const chunk = added.slice(start, start + LIBRARY_CHUNK);
    items = [...items, ...chunk];
    push({ itemIds: chunk });
  }
  for (let start = 0; start < removed.length; start += LIBRARY_CHUNK) {
    const gone = new Set(removed.slice(start, start + LIBRARY_CHUNK));
    items = items.filter((id) => !gone.has(id));
    push({ removeItemIds: [...gone] });
  }
  return operations;
}

export async function planAccountsV2Change(
  change: AccountsV2Change,
  readMirror: MirrorReader,
  readIndex: ListIndexReader,
): Promise<ProducerPlan> {
  const notes: string[] = [];
  if (typeof change?.target !== 'string' || !/^[a-z]{2}(?:-[A-Z]{2})?$/.test(change.target)) {
    return Object.freeze({ operations: [], listIndex: null, notes: ['target_invalid'] });
  }
  switch (change.kind) {
    case 'lesson_result': {
      const planned = planLesson(change, await readMirror('lesson_progress', `${change.target}:lesson:${change.lessonId}`));
      return typeof planned === 'string'
        ? Object.freeze({ operations: [], listIndex: null, notes: [planned] })
        : Object.freeze({ operations: [planned], listIndex: null, notes });
    }
    case 'card_snapshot':
      return planCards(change, readMirror, readIndex, notes);
    case 'swipe_memory':
      return Object.freeze({ operations: await planSwipe(change, readMirror, notes), listIndex: null, notes });
    case 'library_snapshot':
      return Object.freeze({ operations: await planLibrary(change, readMirror, notes), listIndex: null, notes });
    default:
      return Object.freeze({ operations: [], listIndex: null, notes: ['change_kind_unsupported'] });
  }
}
