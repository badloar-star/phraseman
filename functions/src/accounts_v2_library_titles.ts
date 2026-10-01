import {
  ACCOUNTS_V2_LIBRARY_TITLES_KEY,
  ACCOUNTS_V2_LIBRARY_TITLES_MAX_BYTES,
  ACCOUNTS_V2_LIBRARY_TITLES_MAX_PER_OP,
  ACCOUNTS_V2_LIBRARY_TITLE_MAX_CHARS,
  accountsV2JsonWireBytes,
  entityIdString,
  type JsonValue,
} from './accounts_v2_contract';

/*
 * Account V2, Пакет 7C (TEMP из 6G) — названия наборов в сущности библиотеки.
 *
 * зачем: при гидрации (новая установка, повторное применение после выхода/входа)
 * восстанавливались только id наборов — выбор наборов показывал сырой код.
 * Название — часть сущности `<target>:community_packs`: приходит тем же pull,
 * без дополнительных чтений Firestore.
 * Правила (чистые функции, без хранилища):
 *  - `{ itemTitles: [[id, ru, uk, es], …] }` — отдельная операция; 1…100
 *    записей, без повторов id, строки ≤ 200 единиц UTF-16, хотя бы одна непустая;
 *  - название пишется только для ЖИВОГО id (иначе запись пропускается, без
 *    conflict: название не разрушает чужих правок, базу не проверяем —
 *    последняя пришедшая операция побеждает, как и локальное хранилище);
 *  - удаление id снимает его название (повторное добавление — без названия,
 *    пока производитель не пришлёт его снова);
 *  - все названия состояния ≤ ACCOUNTS_V2_LIBRARY_TITLES_MAX_BYTES, иначе
 *    операция названий получает окончательный entity_state_too_large (id целы).
 * TEMP (принято в пакете): название, переименованное автором набора позже,
 * не обновляется — как и в прежнем локальном хранилище названий.
 */

/** [id набора, titleRu, titleUk, titleEs]. */
export type LibraryTitle = readonly [string, string, string, string];

function isPlainObject(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function titleText(value: unknown): value is string {
  return typeof value === 'string' && value.length <= ACCOUNTS_V2_LIBRARY_TITLE_MAX_CHARS;
}

/** Одна четвёрка: id по правилу клиента, три строки в пределе, хотя бы одна непустая. */
export function isLibraryTitleEntry(value: unknown): value is LibraryTitle {
  return Array.isArray(value) && value.length === 4 && entityIdString(value[0])
    && titleText(value[1]) && titleText(value[2]) && titleText(value[3])
    && (value[1].length > 0 || value[2].length > 0 || value[3].length > 0);
}

/** Это операция названий (ровно один ключ `itemTitles`)? Содержимое проверяет parseTitlesPayload. */
export function isLibraryTitlesPayload(payload: JsonValue): boolean {
  return isPlainObject(payload) && Object.keys(payload).length === 1
    && Object.prototype.hasOwnProperty.call(payload, ACCOUNTS_V2_LIBRARY_TITLES_KEY);
}

/** Записи операции названий; null — payload_invalid. */
export function parseTitlesPayload(payload: JsonValue): readonly LibraryTitle[] | null {
  if (!isLibraryTitlesPayload(payload)) return null;
  const raw = (payload as Readonly<Record<string, unknown>>)[ACCOUNTS_V2_LIBRARY_TITLES_KEY];
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > ACCOUNTS_V2_LIBRARY_TITLES_MAX_PER_OP) return null;
  const seen = new Set<string>();
  for (const entry of raw as readonly unknown[]) {
    if (!isLibraryTitleEntry(entry) || seen.has(entry[0])) return null;
    seen.add(entry[0]);
  }
  return raw as readonly LibraryTitle[];
}

function byTitleId(left: LibraryTitle, right: LibraryTitle): number {
  if (left[0] === right[0]) return 0;
  return left[0] < right[0] ? -1 : 1;
}

/** Проводные байты списка названий (та же формула, что предел состояния). */
export function libraryTitlesWireBytes(titles: readonly LibraryTitle[]): number {
  return accountsV2JsonWireBytes(titles as unknown as JsonValue);
}

/** Только названия живых id (удаление снимает название). */
export function keepLiveTitles(titles: readonly LibraryTitle[] | undefined, live: ReadonlySet<string>): readonly LibraryTitle[] {
  return (titles ?? []).filter((entry) => live.has(entry[0]));
}

export type TitlesMerge =
  | Readonly<{ ok: true; titles: readonly LibraryTitle[]; changed: boolean }>
  | Readonly<{ ok: false; code: 'entity_state_too_large' }>;

/** Слияние операции названий с текущими названиями (только живые id). */
export function mergeTitleEntries(
  current: readonly LibraryTitle[] | undefined,
  live: ReadonlySet<string>,
  entries: readonly LibraryTitle[],
): TitlesMerge {
  const byId = new Map<string, LibraryTitle>((current ?? []).map((entry) => [entry[0], entry]));
  let changed = false;
  for (const entry of entries) {
    if (!live.has(entry[0])) continue;
    const before = byId.get(entry[0]);
    if (before !== undefined && before[1] === entry[1] && before[2] === entry[2] && before[3] === entry[3]) continue;
    byId.set(entry[0], [entry[0], entry[1], entry[2], entry[3]]);
    changed = true;
  }
  const titles = [...byId.values()].sort(byTitleId);
  if (changed && libraryTitlesWireBytes(titles) > ACCOUNTS_V2_LIBRARY_TITLES_MAX_BYTES) {
    return { ok: false, code: 'entity_state_too_large' };
  }
  return { ok: true, titles: changed ? titles : (current ?? []), changed };
}

/**
 * Хранимое поле `titles` (загрузчик, fail closed): непустой список четвёрок,
 * строго по возрастанию id (без повторов), только живые id, строки в пределе.
 */
export function storedTitlesValid(raw: unknown, live: ReadonlySet<string>): boolean {
  if (!Array.isArray(raw) || raw.length === 0) return false;
  let previous: string | null = null;
  for (const entry of raw as readonly unknown[]) {
    if (!isLibraryTitleEntry(entry) || !live.has(entry[0])) return false;
    if (previous !== null && !(previous < entry[0])) return false;
    previous = entry[0];
  }
  return true;
}
