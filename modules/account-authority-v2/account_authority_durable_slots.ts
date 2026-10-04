import {
  accountAuthorityErrorCode,
  accountAuthorityErrorKind,
  type AccountAuthorityLogger,
} from './account_authority_logger';

/*
 * AA S4a раунд 3 (M-B2) + раунд 4 (M-1): надёжный список в SecureStore «по
 * одной записи на ключ + маленький индекс».
 *
 * зачем: у SecureStore предел значения 2048 байт; один JSON на всю очередь его
 * переходит. Каждое значение — отдельный ключ-слот (≤ ~1 КБ даже при id
 * предельной длины 256), индекс — только числа.
 *
 * Раунд 4 (M-1): номера слотов НЕ переиспользуются. Индекс хранит монотонный
 * счётчик `next`; новая запись всегда получает `next`. Раньше удаление слота
 * шло асинхронно, а добавление тут же брало тот же (наименьший свободный)
 * номер — отложенное удаление стирало НОВУЮ запись, индекс ссылался на пустой
 * слот, и всё хранилище AA переставало собираться до переустановки.
 *
 * Устойчивость к убийству процесса между шагами:
 *   добавить — слот `next`, затем индекс {next+1, slots+[next]}; обрыв между
 *     ними оставляет слот `next` ничейным, следующее добавление перезапишет
 *     его тем же номером (счётчик не сдвинулся);
 *   убрать — сначала индекс (номер уходит из slots в trash), затем асинхронное
 *     удаление слота и снятие номера из trash; обрыв — номер остаётся в trash
 *     и удаляется при следующем старте (подчистка сирот).
 *
 * Самовосстановление: слот из индекса не читается или испорчен → запись
 * пропускается (critical-строка), но её номер ОСТАЁТСЯ в индексе и читается
 * заново на каждом старте. Хранилище при этом работает: одна битая запись не
 * останавливает AA целиком, а обязательство не стирается (временный сбой
 * чтения Keychain вылечится сам). Испорченный САМ индекс — отказ закрыто
 * (одна атомарная запись; иначе непонятно, какие обязательства существуют).
 */

export const ACCOUNT_AUTHORITY_SECURE_VALUE_MAX_BYTES = 2048;
const MAX_TRASH = 64;

export type DurableSlotSecureStore = Readonly<{
  getItem(key: string, options?: object): string | null;
  setItem(key: string, value: string, options?: object): void;
  deleteItemAsync(key: string, options?: object): Promise<void>;
}>;

export type DurableSlotList<T> = Readonly<{
  values(): readonly T[];
  /** Читаемых записей (раунд 5: нечитаемые в ёмкость не входят). */
  size(): number;
  /** Записей, которые не удалось прочитать (остаются в индексе). */
  unreadable(): number;
  find(key: string): T | null;
  /**
   * `overCapacity` (S4b раунд 2, L-3): перенос обязательств из старого формата —
   * ёмкость `max` не применяется, физический потолок индекса — применяется.
   */
  add(value: T, options?: Readonly<{ overCapacity?: boolean }>): void;
  /** Физический потолок индекса (номеров слотов), который не переходит даже перенос. */
  indexLimit(): number;
  replace(value: T): void;
  remove(key: string): void;
}>;

type Index = Readonly<{ next: number; slots: readonly number[]; trash: readonly number[] }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function utf8Bytes(value: string): number {
  let bytes = 0;
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
  }
  return bytes;
}

function slotNumbers(value: unknown, next: number): number[] {
  if (!Array.isArray(value) || !value.every((slot) => Number.isSafeInteger(slot) && slot >= 0 && slot < next)) {
    throw new Error('index_invalid');
  }
  if (new Set(value).size !== value.length) throw new Error('index_invalid');
  return [...(value as number[])];
}

export function createDurableSlotList<T>(input: Readonly<{
  secureStore: DurableSlotSecureStore;
  options: object;
  log: AccountAuthorityLogger;
  /** Префикс ключей SecureStore (без точки в конце). */
  prefix: string;
  schema: string;
  max: number;
  /** Фиксированный код очереди для событий лога (например, local_erase). */
  label: string;
  invalidCode: string;
  fullCode: string;
  unavailableCode: string;
  parse(value: unknown): T;
  keyOf(value: T): string;
  /** Тревога, переживающая перезапуск; только коды. */
  reportCritical?: (event: string, code: string) => void;
}>): DurableSlotList<T> {
  const { secureStore, options, log } = input;
  // зачем (раунд 5, LOW-1): нечитаемые записи не занимают ёмкость (новые
  // удаления не блокируются), но и не стираются — обязательство важнее места.
  // Жёсткий потолок индекса (вдвое больше ёмкости) держит индекс в 2 КБ.
  const indexBound = input.max * 2;
  const indexKey = `${input.prefix}.index`;
  const slotKey = (slot: number) => `${input.prefix}.slot.${slot}`;
  const critical = (event: string, code: string): void => {
    log.warn(`[AA-S4] ${input.label} ${event}`, { code });
    try {
      input.reportCritical?.(`aa_s4:${input.label} ${event}`, code);
    } catch (error) {
      log.warn(`[AA-S4] ${input.label} critical_report_failed`, {
        kind: accountAuthorityErrorKind(error), code: accountAuthorityErrorCode(error),
      });
    }
  };
  const writeVerified = (key: string, encoded: string): void => {
    if (utf8Bytes(encoded) > ACCOUNT_AUTHORITY_SECURE_VALUE_MAX_BYTES) {
      log.warn(`[AA-S4] ${input.label} value_too_large`, { code: input.unavailableCode });
      throw new Error(input.unavailableCode);
    }
    secureStore.setItem(key, encoded, options);
    if (secureStore.getItem(key, options) !== encoded) {
      log.warn(`[AA-S4] ${input.label} persist_verify_failed`, { code: input.unavailableCode });
      throw new Error(input.unavailableCode);
    }
  };

  // Загрузка индекса: испорчен — отказ закрыто.
  let index: Index = Object.freeze({ next: 0, slots: Object.freeze([]), trash: Object.freeze([]) });
  const rawIndex = secureStore.getItem(indexKey, options);
  if (rawIndex !== null) {
    try {
      const parsed: unknown = JSON.parse(rawIndex);
      if (!isRecord(parsed) || parsed.schemaVersion !== input.schema || !Number.isSafeInteger(parsed.next) || (parsed.next as number) < 0) {
        throw new Error('index_invalid');
      }
      const next = parsed.next as number;
      const slots = slotNumbers(parsed.slots, next);
      const trash = slotNumbers(parsed.trash, next);
      if (slots.length > indexBound || trash.length > MAX_TRASH || slots.some((slot) => trash.includes(slot))) {
        throw new Error('index_invalid');
      }
      index = Object.freeze({ next, slots: Object.freeze(slots), trash: Object.freeze(trash) });
    } catch (error) {
      log.warn(`[AA-S4] ${input.label} index_invalid`, {
        kind: accountAuthorityErrorKind(error), code: accountAuthorityErrorCode(error), mappedTo: input.invalidCode,
      });
      // Раунд 5 (LOW-1): порча индекса — тревога, переживающая перезапуск.
      critical('index_invalid', accountAuthorityErrorCode(error));
      throw new Error(input.invalidCode);
    }
  }

  // Загрузка слотов: нечитаемые пропускаются, но остаются в индексе.
  const items = new Map<number, T>();
  const slotByKey = new Map<string, number>();
  const superseded: number[] = [];
  let unreadableCount = 0;
  for (const slot of index.slots) {
    try {
      const raw = secureStore.getItem(slotKey(slot), options);
      if (raw === null) throw new Error('slot_missing');
      const parsed: unknown = JSON.parse(raw);
      if (!isRecord(parsed) || parsed.schemaVersion !== input.schema || parsed.slot !== slot) throw new Error('slot_invalid');
      const value = input.parse(parsed.value);
      const key = input.keyOf(value);
      const earlier = slotByKey.get(key);
      if (earlier !== undefined) {
        // зачем (раунд 5, LOW-1): слот был временно нечитаем, и та же запись
        // встала заново под новым номером. Действует НОВЫЙ (позже записан),
        // старый — в trash. Обязательство одно и то же — ничего не теряется.
        items.delete(earlier);
        superseded.push(earlier);
        log.warn(`[AA-S4] ${input.label} slot_superseded`, { reason: 'duplicate_key' });
      }
      slotByKey.set(key, slot);
      items.set(slot, value);
    } catch (error) {
      unreadableCount += 1;
      critical('slot_unreadable', accountAuthorityErrorCode(error));
    }
  }
  if (superseded.length > 0) {
    try {
      const trash = [...index.trash, ...superseded].slice(-MAX_TRASH);
      writeVerified(indexKey, JSON.stringify({
        schemaVersion: input.schema,
        next: index.next,
        slots: index.slots.filter((slot) => !superseded.includes(slot)),
        trash,
      }));
      index = Object.freeze({
        next: index.next,
        slots: Object.freeze(index.slots.filter((slot) => !superseded.includes(slot))),
        trash: Object.freeze(trash),
      });
    } catch (error) {
      // Не записалось — дубль останется вне памяти до следующего старта (повтор).
      log.warn(`[AA-S4] ${input.label} superseded_write_failed`, {
        kind: accountAuthorityErrorKind(error), code: accountAuthorityErrorCode(error),
      });
    }
  }
  log.info(`[AA-S4] ${input.label} loaded`, {
    count: items.size, unreadable: unreadableCount, trash: index.trash.length,
  });

  const writeIndex = (next: Index): void => {
    writeVerified(indexKey, JSON.stringify({
      schemaVersion: input.schema, next: next.next, slots: next.slots, trash: next.trash,
    }));
    index = next;
  };
  const writeSlot = (slot: number, value: T): void => {
    writeVerified(slotKey(slot), JSON.stringify({ schemaVersion: input.schema, slot, value }));
  };
  const slotOf = (key: string): number | null => {
    for (const slot of index.slots) {
      const item = items.get(slot);
      if (item !== undefined && input.keyOf(item) === key) return slot;
    }
    return null;
  };
  // Асинхронное удаление слота из trash; успех — номер снимается из trash.
  const purgeTrashed = (slot: number): void => {
    // guard-ok: номер уже вне индекса (запись синхронная); отказ логируется, повтор — на старте.
    void secureStore.deleteItemAsync(slotKey(slot), options).then(
      () => {
        try {
          writeIndex(Object.freeze({ ...index, trash: Object.freeze(index.trash.filter((item) => item !== slot)) }));
          log.info(`[AA-S4] ${input.label} slot_cleared`);
        } catch (error) {
          log.warn(`[AA-S4] ${input.label} trash_update_failed`, {
            kind: accountAuthorityErrorKind(error), code: accountAuthorityErrorCode(error),
          });
        }
      },
      (error: unknown) => {
        log.warn(`[AA-S4] ${input.label} slot_clear_failed`, {
          kind: accountAuthorityErrorKind(error), code: accountAuthorityErrorCode(error),
        });
      },
    );
  };
  // Подчистка сирот после убийства процесса.
  for (const slot of index.trash) purgeTrashed(slot);

  return Object.freeze({
    values: () => Object.freeze(index.slots.filter((slot) => items.has(slot)).map((slot) => items.get(slot) as T)),
    size: () => items.size,
    indexLimit: () => indexBound,
    unreadable: () => index.slots.filter((slot) => !items.has(slot)).length,
    find: (key: string) => {
      const slot = slotOf(key);
      return slot === null ? null : items.get(slot) ?? null;
    },
    add: (value: T, options?: Readonly<{ overCapacity?: boolean }>) => {
      if (slotOf(input.keyOf(value)) !== null) throw new Error(input.invalidCode);
      const capacityFull = options?.overCapacity !== true && items.size >= input.max;
      if (capacityFull || index.slots.length >= indexBound) {
        log.warn(`[AA-S4] ${input.label} full`, {
          reason: capacityFull ? 'queue_full' : 'index_bound', limit: input.max,
        });
        throw new Error(input.fullCode);
      }
      const slot = index.next;
      writeSlot(slot, value);
      writeIndex(Object.freeze({ ...index, next: slot + 1, slots: Object.freeze([...index.slots, slot]) }));
      items.set(slot, value);
    },
    replace: (value: T) => {
      const slot = slotOf(input.keyOf(value));
      if (slot === null) throw new Error(input.invalidCode);
      writeSlot(slot, value);
      items.set(slot, value);
    },
    remove: (key: string) => {
      const slot = slotOf(key);
      if (slot === null) return;
      let trash = [...index.trash, slot];
      if (trash.length > MAX_TRASH) {
        // Номер вне trash — слот останется мусором в SecureStore (без ссылок, безвреден).
        log.warn(`[AA-S4] ${input.label} trash_overflow`, { limit: MAX_TRASH });
        trash = trash.slice(-MAX_TRASH);
      }
      writeIndex(Object.freeze({
        ...index,
        slots: Object.freeze(index.slots.filter((item) => item !== slot)),
        trash: Object.freeze(trash),
      }));
      items.delete(slot);
      purgeTrashed(slot);
    },
  });
}
