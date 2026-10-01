import {
  ACCOUNTS_V2_CARD_UNSET_KEY,
  ACCOUNTS_V2_CARD_UNSET_MAX_FIELDS,
  ACCOUNTS_V2_CARD_UNSET_PROTECTED_FIELDS,
  ACCOUNTS_V2_LIBRARY_MAX_TOMBSTONES,
  ACCOUNTS_V2_MAX_ENTITY_STATE_BYTES,
  ACCOUNTS_V2_SRS_FIELDS,
  ACCOUNTS_V2_SRS_MAX_FUTURE_SKEW_MS,
  ACCOUNTS_V2_SRS_TIME_KEY,
  accountsV2JsonWireBytes,
  defineData,
  entityIdString,
  safeInteger,
  type JsonObject,
  type JsonValue,
} from './accounts_v2_contract';
import {
  isLibraryTitlesPayload,
  keepLiveTitles,
  mergeTitleEntries,
  parseTitlesPayload,
  type LibraryTitle,
} from './accounts_v2_library_titles';

/*
 * Account V2, Пакет 3S — слияние по доменам (урок, карточка, библиотека) и
 * общие JSON-помощники. Чистые функции без хранилища.
 */

// ─── вспомогательное для JSON ──────────────────────────────────────────────

export function isJsonObject(value: JsonValue | undefined): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function ownKeysOf(value: JsonObject): readonly string[] {
  return Object.keys(value);
}

export function ownValue(value: JsonObject, key: string): JsonValue | undefined {
  return Object.prototype.hasOwnProperty.call(value, key) ? value[key] : undefined;
}

export function hasExactKeys(value: JsonObject, keys: readonly string[]): boolean {
  const own = ownKeysOf(value);
  return own.length === keys.length && own.every((key) => keys.includes(key));
}

export function jsonEqual(left: JsonValue, right: JsonValue): boolean {
  if (typeof left !== 'object' || left === null || typeof right !== 'object' || right === null) {
    return left === right;
  }
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  if (Array.isArray(left)) {
    const rightItems = right as readonly JsonValue[];
    return left.length === rightItems.length && left.every((item, index) => jsonEqual(item, rightItems[index]));
  }
  const leftKeys = ownKeysOf(left as JsonObject).slice().sort();
  const rightKeys = ownKeysOf(right as JsonObject).slice().sort();
  return leftKeys.length === rightKeys.length && leftKeys.every((key, index) => key === rightKeys[index]
    && jsonEqual((left as JsonObject)[key], (right as JsonObject)[key]));
}

/**
 * Канонический JSON: ключи отсортированы на всех уровнях. JSON.stringify
 * (ES2019 well-formed) экранирует одиночные суррогаты и управляющие символы —
 * результат всегда well-formed строка, пригодная для Firestore.
 */
export function canonicalJson(value: JsonValue): string {
  if (typeof value !== 'object' || value === null) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${(value as readonly JsonValue[]).map(canonicalJson).join(',')}]`;
  const keys = ownKeysOf(value as JsonObject).slice().sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson((value as JsonObject)[key])}`).join(',')}}`;
}

// ─── домены ────────────────────────────────────────────────────────────────

/**
 * Отметка порядка SRS-записи (ремонт №4): [updatedAtMs из значения,
 * baseRevision операции, clientSequence операции].
 */
export type SrsStamp = readonly [number, number, number];
export type LessonProgressState = Readonly<{ best: JsonObject }>;
export type FlashcardFieldState = Readonly<{
  value: JsonValue; revision: number; variants: readonly JsonValue[]; stamp?: SrsStamp;
}>;
export type FlashcardState = Readonly<{ deleted: boolean; fields: Readonly<Record<string, FlashcardFieldState>> }>;
/** Живой предмет библиотеки: [id, ревизия сущности, на которой его добавили]. */
export type LibraryItem = readonly [string, number];
/** Tombstone членства: [id предмета, ревизия сущности, на которой его удалили]. */
export type LibraryTombstone = readonly [string, number];
/**
 * Пакет 7C: `titles` — необязательные названия живых наборов
 * (accounts_v2_library_titles.ts). Пустых названий нет — ключа нет: состояние
 * без названий байт-в-байт прежней формы (откат функций его читает).
 */
export type LibraryMembershipState = Readonly<{
  items: readonly LibraryItem[]; removed: readonly LibraryTombstone[]; titles?: readonly LibraryTitle[];
}>;

export type MergeResult<S, C extends string> =
  | Readonly<{ ok: true; state: S; changed: boolean }>
  | Readonly<{ ok: false; code: C }>;
export type ConflictMergeResult<S, C extends string = 'payload_invalid'> =
  | Readonly<{ ok: true; state: S; changed: boolean; conflict: boolean }>
  | Readonly<{ ok: false; code: C }>;
export type FlashcardRejectCode = 'payload_invalid' | 'srs_time_in_future';
export type FlashcardMergeResult = ConflictMergeResult<FlashcardState, FlashcardRejectCode>;
export type LibraryRejectCode = 'payload_invalid' | 'entity_state_too_large';
export type LibraryMergeResult = ConflictMergeResult<LibraryMembershipState, LibraryRejectCode>;

export function lessonResult(value: JsonValue | undefined): JsonObject | null {
  if (!isJsonObject(value)) return null;
  const passed = ownValue(value, 'passed');
  const score = ownValue(value, 'score');
  if (typeof passed !== 'boolean' || typeof score !== 'number' || !Number.isFinite(score)) return null;
  return value;
}

/**
 * D66: результат урока решает устройство. Сервер хранит присланный результат
 * как есть, НЕ пересчитывает pass/score и не откатывает лучший. «Лучше» —
 * сравнение уже решённых клиентом значений: сначала passed, затем score.
 */
export function mergeLessonProgress(
  current: LessonProgressState | null,
  payload: JsonValue,
): MergeResult<LessonProgressState, 'payload_invalid'> {
  const incoming = lessonResult(payload);
  if (incoming === null) return { ok: false, code: 'payload_invalid' };
  if (current === null) return { ok: true, changed: true, state: { best: incoming } };
  const bestPassed = current.best.passed === true;
  const bestScore = current.best.score as number;
  const inPassed = incoming.passed === true;
  const inScore = incoming.score as number;
  const better = (inPassed && !bestPassed) || (inPassed === bestPassed && inScore > bestScore);
  return better
    ? { ok: true, changed: true, state: { best: incoming } }
    : { ok: true, changed: false, state: current };
}

export function isSrsField(name: string): boolean {
  return (ACCOUNTS_V2_SRS_FIELDS as readonly string[]).includes(name);
}

/** Время правки из SRS-значения (`updatedAtMs`, safe integer ≥ 0) или null. */
export function srsUpdatedAt(value: JsonValue | undefined): number | null {
  if (!isJsonObject(value)) return null;
  const time = ownValue(value, ACCOUNTS_V2_SRS_TIME_KEY);
  return safeInteger(time) ? time : null;
}

/**
 * Проверка SRS-полей операции ДО слияния: при ошибке отклоняется вся операция.
 * зачем (ремонт №4): время клиента недоверенное — дальше допуска в будущем
 * значение закрепилось бы надолго; отказ, а не зажим (итог не зависит от
 * момента прихода, клиент узнаёт, что часы телефона врут).
 */
function srsFieldsProblem(fields: JsonObject, nowMs: number): FlashcardRejectCode | null {
  for (const name of ownKeysOf(fields)) {
    if (!isSrsField(name)) continue;
    const time = srsUpdatedAt(fields[name]);
    if (time === null) return 'payload_invalid';
    if (time > nowMs + ACCOUNTS_V2_SRS_MAX_FUTURE_SKEW_MS) return 'srs_time_in_future';
  }
  return null;
}

/**
 * LWW для SRS (решение владельца 2026-09-30, уточнено: по ВРЕМЕНИ ПРАВКИ).
 * Строгий общий порядок: [updatedAtMs, baseRevision, clientSequence,
 * канонический JSON значения]. Время — главное; база и счётчик устройства
 * решают только при равном времени; при полном равенстве — значение
 * (детерминированно, итог не зависит от порядка прихода).
 */
function srsNewer(stamp: SrsStamp, value: JsonValue, existing: FlashcardFieldState): boolean {
  const old = existing.stamp ?? [0, 0, 0];
  for (let index = 0; index < stamp.length; index += 1) {
    if (stamp[index] !== old[index]) return stamp[index] > old[index];
  }
  return canonicalJson(value) > canonicalJson(existing.value);
}

/**
 * Пакет 7A: имена снимаемых полей карточки или null (payload_invalid).
 * Массив 1..ACCOUNTS_V2_CARD_UNSET_MAX_FIELDS непустых строк, без повторов,
 * не защищённые (id, SRS) и не присланные в той же операции в `fields`.
 */
export function cardUnsetNames(raw: JsonValue | undefined, fieldNames: readonly string[]): readonly string[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > ACCOUNTS_V2_CARD_UNSET_MAX_FIELDS) return null;
  const names = raw as readonly JsonValue[];
  if (!names.every(entityIdString)) return null;
  const list = names as readonly string[];
  if (new Set(list).size !== list.length) return null;
  const protectedNames = ACCOUNTS_V2_CARD_UNSET_PROTECTED_FIELDS as readonly string[];
  if (list.some((name) => protectedNames.includes(name) || fieldNames.includes(name))) return null;
  return list;
}

/**
 * Карточка: `{ op: 'upsert', fields: {…} }` или `{ op: 'tombstone' }`.
 * - Непересекающиеся поля сливаются (частичное обновление).
 * - Поле, изменённое после baseRevision клиента другим устройством, не
 *   перезаписывается: пришедшее значение сохраняется в `variants`, ничего не теряется.
 *   Остальные поля той же операции при этом ПРИМЕНЯЮТСЯ (исход — conflict).
 * - SRS-поля (`srs`, `srsPolicy`) — last-writer-wins по отметке
 *   [updatedAtMs, baseRevision, clientSequence] без вариантов. Значение обязано
 *   нести `updatedAtMs` (иначе payload_invalid), время дальше допуска в
 *   будущем — srs_time_in_future. Проигравшая запись ничего не пишет; если её
 *   значение отличается от сохранённого — исход conflict (клиент перечитает).
 * - Tombstone главнее любого позднего update; воскрешения нет.
 * - Значения полей (включая неизвестные, любые ключи и вложенные массивы)
 *   хранятся как есть — внутри stateJson.
 * - Пакет 7A: `unsetFields` убирает поля, которые устройство видело (ревизия
 *   поля ≤ базы, вариантов нет); иначе поле остаётся, исход conflict.
 *   Отсутствующее поле — без изменений. `fields` может быть пустым, если есть снятие.
 */
export function mergeFlashcard(
  current: FlashcardState | null,
  payload: JsonValue,
  baseRevision: number,
  nextRevision: number,
  clientSequence: number,
  nowMs: number,
  srsStampBase: number = baseRevision,
): FlashcardMergeResult {
  if (!isJsonObject(payload)) return { ok: false, code: 'payload_invalid' };
  const op = ownValue(payload, 'op');
  if (op === 'tombstone' && hasExactKeys(payload, ['op'])) {
    if (current !== null && current.deleted) return { ok: true, changed: false, conflict: false, state: current };
    return { ok: true, changed: true, conflict: false, state: { deleted: true, fields: {} } };
  }
  const fields = ownValue(payload, 'fields');
  const withUnset = hasExactKeys(payload, ['op', 'fields', ACCOUNTS_V2_CARD_UNSET_KEY]);
  if (op !== 'upsert' || !(withUnset || hasExactKeys(payload, ['op', 'fields'])) || !isJsonObject(fields)) {
    return { ok: false, code: 'payload_invalid' };
  }
  const names = ownKeysOf(fields);
  const unset = withUnset ? cardUnsetNames(ownValue(payload, ACCOUNTS_V2_CARD_UNSET_KEY), names) : [];
  if (unset === null) return { ok: false, code: 'payload_invalid' };
  // зачем (7A): операция обязана что-то менять — либо поля, либо снятие полей.
  if (names.length === 0 && unset.length === 0) return { ok: false, code: 'payload_invalid' };
  const srsProblem = srsFieldsProblem(fields, nowMs);
  if (srsProblem !== null) return { ok: false, code: srsProblem };
  if (current !== null && current.deleted) return { ok: true, changed: false, conflict: true, state: current };
  const merged = new Map<string, FlashcardFieldState>(
    current === null ? [] : ownKeysOf(current.fields as JsonObject).map((key) => [key, current.fields[key]]),
  );
  let changed = false;
  let conflict = false;
  for (const name of unset) {
    const existing = merged.get(name);
    if (existing === undefined) continue;
    // зачем (7A): снимаем только то, что устройство ВИДЕЛО (ревизия поля ≤ базы) и
    // без вариантов другого устройства. Иначе снятие стёрло бы чужую более позднюю
    // правку или неразрешённый вариант — поле остаётся, исход conflict (как у fields).
    if (existing.revision > baseRevision || existing.variants.length > 0) {
      conflict = true;
      continue;
    }
    merged.delete(name);
    changed = true;
  }
  for (const name of names) {
    const value = fields[name];
    const existing = merged.get(name);
    if (isSrsField(name)) {
      // зачем: решение владельца — «побеждает самый свежий по времени правки», вариантов нет.
      // зачем (ремонт №5): в отметке — ИСХОДНАЯ база операции, а не эффективная
      // внутри пакета. Иначе порядок SRS зависел бы от того, как клиент нарезал
      // операции на пакеты; время правки остаётся главным ключом.
      const stamp: SrsStamp = [srsUpdatedAt(value) as number, srsStampBase, clientSequence];
      if (existing !== undefined && !srsNewer(stamp, value, existing)) {
        // зачем (ремонт №4): проигравшее другое значение — conflict, чтобы клиент
        // перечитал победителя, а не считал свою запись сохранённой.
        if (!jsonEqual(existing.value, value)) conflict = true;
        continue;
      }
      merged.set(name, { value, revision: nextRevision, variants: [], stamp });
      changed = true;
    } else if (existing === undefined) {
      merged.set(name, { value, revision: nextRevision, variants: [] });
      changed = true;
    } else if (existing.revision <= baseRevision) {
      // Клиент видел текущее значение поля — его запись законна. Варианты НЕ
      // сбрасываем (операции разрешения ещё нет): иначе вариант другого
      // устройства терялся бы молча. Выбранный из вариантов — уходит из них.
      if (jsonEqual(existing.value, value)) continue;
      merged.set(name, {
        value, revision: nextRevision, variants: existing.variants.filter((item) => !jsonEqual(item, value)),
      });
      changed = true;
    } else if (!jsonEqual(existing.value, value)) {
      conflict = true;
      if (existing.variants.some((item) => jsonEqual(item, value))) continue;
      // зачем (P1): вариант повышает ревизию поля. Иначе устройство со «свежим»
      // base (видевшее значение, но не вариант) прошло бы как законная запись
      // и затёрло бы поле вместе с вариантом.
      merged.set(name, { ...existing, revision: nextRevision, variants: [...existing.variants, value] });
      changed = true;
    }
  }
  if (!changed) return { ok: true, changed, conflict, state: current ?? { deleted: false, fields: {} } };
  const outFields: Record<string, FlashcardFieldState> = {};
  for (const [name, field] of merged) defineData(outFields, name, field);
  return { ok: true, changed, conflict, state: { deleted: false, fields: outFields } };
}

type LibraryChange = Readonly<{ remove: boolean; ids: readonly string[] }>;

function libraryChange(payload: JsonValue): LibraryChange | null {
  if (!isJsonObject(payload)) return null;
  const remove = hasExactKeys(payload, ['removeItemIds']);
  if (!remove && !hasExactKeys(payload, ['itemIds'])) return null;
  const ids = remove ? payload.removeItemIds : payload.itemIds;
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every(entityIdString)) return null;
  return { remove, ids: ids as readonly string[] };
}

function byId(left: LibraryItem, right: LibraryItem): number {
  if (left[0] === right[0]) return 0;
  return left[0] < right[0] ? -1 : 1;
}

function oldestFirst(left: LibraryTombstone, right: LibraryTombstone): number {
  return left[1] !== right[1] ? left[1] - right[1] : byId(left, right);
}

/**
 * Сборка мусора tombstone (ремонт №4, уточнено ремонтом №5). Сверх
 * ACCOUNTS_V2_LIBRARY_MAX_TOMBSTONES и пока состояние не помещается в
 * ACCOUNTS_V2_MAX_ENTITY_STATE_BYTES (формула Firestore, как stateFits)
 * вытесняются самые старые по ревизии удаления (при равной — по id), но ТОЛЬКО
 * tombstone с ревизией ≤ `evictableUpTo` — ревизии сущности на начало пакета.
 * зачем (ремонт №5, P3): tombstone, созданный в этом же пакете, — свежая защита
 * от воскрешения; вытеснить его тихо значит принять «applied» и тут же потерять
 * результат удаления. Если и после вытеснения всех старых состояние не
 * помещается (по числу или байтам) — возвращается null: вызывающий отвечает
 * окончательным `entity_state_too_large`, честно, без тихой потери.
 * Цена (как в ремонте №4): вытесненный СТАРЫЙ tombstone больше не защищает от
 * воскрешения очень старую устаревшую операцию добавления (её baseRevision
 * древнее вытесненной ревизии).
 */
export function collectLibraryGarbage(
  state: LibraryMembershipState,
  evictableUpTo: number,
): LibraryMembershipState | null {
  const byAge = [...state.removed].sort(oldestFirst);
  // Отсортировано по ревизии — вытесняемые образуют префикс.
  const evictable = byAge.filter(([, revision]) => revision <= evictableUpTo).length;
  const sizes = byAge.map((entry) => accountsV2JsonWireBytes(entry as unknown as JsonValue));
  // Байты Firestore всего состояния = остальное (с пустым `removed`) + записи + запятые.
  // зачем (7C): названия — часть состояния и его предела байт.
  const other = accountsV2JsonWireBytes(withTitles(state.items, [], state.titles) as unknown as JsonValue) + 1;
  let keptBytes = sizes.reduce((total, size) => total + size, 0);
  let drop = 0;
  const kept = (): number => byAge.length - drop;
  const tooBig = (): boolean => other + keptBytes + Math.max(0, kept() - 1) > ACCOUNTS_V2_MAX_ENTITY_STATE_BYTES;
  const overflows = (): boolean => kept() > ACCOUNTS_V2_LIBRARY_MAX_TOMBSTONES || tooBig();
  while (drop < evictable && overflows()) {
    keptBytes -= sizes[drop];
    drop += 1;
  }
  if (overflows()) return null;
  if (drop === 0) return state;
  return withTitles(state.items, byAge.slice(drop).sort(byId), state.titles);
}

/** Состояние библиотеки; `titles` — только непустое (иначе прежняя форма). */
function withTitles(
  items: readonly LibraryItem[], removed: readonly LibraryTombstone[], titles: readonly LibraryTitle[] | undefined,
): LibraryMembershipState {
  return titles !== undefined && titles.length > 0 ? { items, removed, titles } : { items, removed };
}

/**
 * Пакет 7C — операция названий `{ itemTitles }`: пишет названия живых id.
 * зачем: не разрушающая правка — база не проверяется (конфликт «из будущего»
 * отсекает вызывающий раньше), пропущенный не живой id — не conflict.
 */
function mergeLibraryTitles(current: LibraryMembershipState | null, payload: JsonValue): LibraryMergeResult {
  const entries = parseTitlesPayload(payload);
  if (entries === null) return { ok: false, code: 'payload_invalid' };
  const live = new Set((current?.items ?? []).map(([id]) => id));
  const merged = mergeTitleEntries(current?.titles, live, entries);
  if (!merged.ok) return { ok: false, code: merged.code };
  if (!merged.changed || current === null) {
    return { ok: true, changed: false, conflict: false, state: current ?? { items: [], removed: [] } };
  }
  const state = withTitles(current.items, current.removed, merged.titles);
  // Предел состояния целиком (id + tombstone + названия) — честный отказ, без тихой потери.
  if (accountsV2JsonWireBytes(state as unknown as JsonValue) + 1 > ACCOUNTS_V2_MAX_ENTITY_STATE_BYTES) {
    return { ok: false, code: 'entity_state_too_large' };
  }
  return { ok: true, changed: true, conflict: false, state };
}

/**
 * Членство в библиотеке: `{ itemIds }` — добавить, `{ removeItemIds }` —
 * удалить (решение владельца 2026-09-30). Никаких выводов о покупке или праве
 * доступа — лишние поля — отказ.
 * Правило (ремонт №4): операция над id применяется, только если устройство
 * ВИДЕЛО последнее изменение этого id (baseRevision ≥ ревизии добавления живого
 * id или ревизии его tombstone); иначе id не трогается, исход conflict,
 * остальные id операции применяются.
 * - Удаление живого id оставляет tombstone `[id, ревизия удаления]`.
 * - Удаление отсутствующего id (живого нет, tombstone есть или нет) ничего не
 *   пишет: устройство не могло наблюдать то, чего на сервере нет. зачем:
 *   прежний tombstone «про запас» делал итог зависимым от порядка прихода
 *   (параллельные add/remove) и раздувал состояние удалениями мусорных id.
 * - Итог не зависит от порядка прихода параллельных операций; повтор — без изменений.
 * - `batchStartRevision` — ревизия сущности на начало пакета: tombstone новее
 *   неё сборка мусора не вытесняет (ремонт №5). По умолчанию — текущая ревизия
 *   (nextRevision − 1): вызов вне пакета считает всё существующее старым.
 */
export function mergeLibraryMembership(
  current: LibraryMembershipState | null,
  payload: JsonValue,
  baseRevision: number,
  nextRevision: number,
  batchStartRevision: number = nextRevision - 1,
): LibraryMergeResult {
  // зачем (7C): названия — отдельная операция той же сущности.
  if (isLibraryTitlesPayload(payload)) return mergeLibraryTitles(current, payload);
  const change = libraryChange(payload);
  if (change === null) return { ok: false, code: 'payload_invalid' };
  const live = new Map<string, number>(current === null ? [] : current.items);
  const removed = new Map<string, number>(current === null ? [] : current.removed);
  let changed = false;
  let conflict = false;
  for (const id of change.ids) {
    if (change.remove) {
      const addedAt = live.get(id);
      if (addedAt === undefined) continue;
      if (baseRevision < addedAt) {
        conflict = true;
        continue;
      }
      live.delete(id);
      removed.set(id, nextRevision);
      changed = true;
      continue;
    }
    if (live.has(id)) continue;
    const removedAt = removed.get(id);
    if (removedAt !== undefined && baseRevision < removedAt) {
      conflict = true;
      continue;
    }
    removed.delete(id);
    live.set(id, nextRevision);
    changed = true;
  }
  if (!changed && current !== null) return { ok: true, changed, conflict, state: current };
  // зачем: детерминированный порядок — одинаковое состояние при любом порядке прихода.
  // зачем (7C): удалённый id теряет название; названия остальных сохраняются.
  const state = collectLibraryGarbage(
    withTitles([...live].sort(byId), [...removed].sort(byId), keepLiveTitles(current?.titles, new Set(live.keys()))),
    batchStartRevision,
  );
  if (state === null) return { ok: false, code: 'entity_state_too_large' };
  return { ok: true, changed, conflict, state };
}
