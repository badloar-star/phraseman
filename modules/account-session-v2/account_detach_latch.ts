import type { AccountsV2SecureStorePort } from './account_deletion_credential';

/*
 * Account V2, Пакет 6B (TG-F76EA3701B55) — защёлка «аккаунт отсоединён»,
 * переживающая перезапуск.
 *
 * зачем: account_deletion_detach держит защёлку в памяти процесса (TEMP Пакета 4).
 * Если приложение убили между подтверждением удаления и стиранием области
 * (или закрытие области не удалось — close_failed), следующий запуск обязан:
 *   1) НЕ открыть область старого uid снова (данные не воскресают);
 *   2) дотереть область (автоповтор стирания).
 * Поэтому uid пишется в SecureStore ДО стирания и снимается только после
 * подтверждённого стирания. SecureStore, а не AsyncStorage: поток удаления
 * вызывает AsyncStorage.clear(), он унёс бы защёлку вместе с остальным.
 *
 * Чтение сломалось → `ok:false`: вызывающий обязан НЕ открывать ни одну область
 * (fail-closed), а не считать защёлку пустой.
 */

const LOG = '[ACCOUNT-V2]';
export const ACCOUNTS_V2_DETACH_LATCH_KEY = 'accounts_v2_detach_latch_v1';
/** Потолок записей: защёлка снимается после стирания, копиться ей незачем. */
const MAX_ENTRIES = 16;

export type AccountDetachLatchRead =
  | Readonly<{ ok: true; uids: readonly string[] }>
  | Readonly<{ ok: false; code: string }>;

export type AccountDetachLatch = Readonly<{
  read(): Promise<AccountDetachLatchRead>;
  /** Поставить защёлку (до стирания). false — не записалось (в лог — код). */
  mark(uid: string): Promise<boolean>;
  /** Снять защёлку (только после подтверждённого стирания). */
  clear(uid: string): Promise<boolean>;
  /**
   * Стереть испорченную запись целиком. зачем (ревью 6B, P2): Keychain iOS
   * переживает переустановку — битая запись иначе навсегда выключала бы V2 на
   * устройстве для всех будущих аккаунтов. Отказ один раз, затем сброс.
   */
  reset(): Promise<boolean>;
  /**
   * Пакет 6E: записать защёлку ОДНОЙ записью ровно из этих uid (поверх битой тоже).
   * зачем: цикл mark после испорченной защёлки мог оборваться на середине и потерять uid.
   */
  replace?(uids: readonly string[]): Promise<boolean>;
  /**
   * Пакет 6E: SecureStore вообще пишет/читает? true — сломана только сама запись
   * защёлки (восстановление на другом телефоне: ключ Keystore не переехал).
   */
  probe?(): Promise<boolean>;
  /** Пакет 6E: учёт неисправимых (терминальных) неудач стирания по uid. */
  readTerminal?(): Promise<ReadonlyMap<string, AccountTerminalEraseRecord>>;
  noteTerminal?(uid: string, nowMs: number): Promise<AccountTerminalEraseRecord | null>;
}>;

export type AccountTerminalEraseRecord = Readonly<{ count: number; lastAtMs: number }>;
export const ACCOUNTS_V2_TERMINAL_ERASE_KEY = 'accounts_v2_terminal_erase_v1';
const PROBE_KEY = 'accounts_v2_store_probe_v1';

function kindOf(value: unknown): string {
  return value instanceof Error ? value.name : typeof value;
}

function validUid(uid: unknown): uid is string {
  return typeof uid === 'string' && uid.length > 0 && uid.length <= 256 && uid.trim() === uid;
}

function parse(raw: string | null): AccountDetachLatchRead {
  if (raw === null) return Object.freeze({ ok: true, uids: Object.freeze([]) });
  try {
    const parsed = JSON.parse(raw) as { v?: unknown; uids?: unknown };
    if (parsed.v === 1 && Array.isArray(parsed.uids) && parsed.uids.every(validUid)) {
      return Object.freeze({ ok: true, uids: Object.freeze([...new Set(parsed.uids as string[])]) });
    }
  } catch (error) {
    console.warn(`${LOG} latch parse_failed kind=${kindOf(error)}`);
    return Object.freeze({ ok: false, code: 'latch_corrupt' });
  }
  console.warn(`${LOG} latch shape_invalid`);
  return Object.freeze({ ok: false, code: 'latch_corrupt' });
}

export function createAccountDetachLatch(store: AccountsV2SecureStorePort): AccountDetachLatch {
  // зачем: mark/clear — чтение+запись; без очереди две правки подряд затирали бы друг друга.
  let tail: Promise<unknown> = Promise.resolve();
  const serial = <T>(work: () => Promise<T>): Promise<T> => {
    const next = tail.then(work, work);
    tail = next.catch(() => undefined);
    return next;
  };

  const read = async (): Promise<AccountDetachLatchRead> => {
    try {
      return parse(await store.getItemAsync(ACCOUNTS_V2_DETACH_LATCH_KEY));
    } catch (error) {
      console.warn(`${LOG} latch read_failed kind=${kindOf(error)}`);
      return Object.freeze({ ok: false, code: 'latch_read_failed' });
    }
  };

  const write = async (uids: readonly string[]): Promise<boolean> => {
    try {
      if (uids.length === 0) {
        await store.deleteItemAsync(ACCOUNTS_V2_DETACH_LATCH_KEY);
        return true;
      }
      const raw = JSON.stringify({ v: 1, uids });
      await store.setItemAsync(ACCOUNTS_V2_DETACH_LATCH_KEY, raw);
      return await store.getItemAsync(ACCOUNTS_V2_DETACH_LATCH_KEY) === raw;
    } catch (error) {
      console.warn(`${LOG} latch write_failed kind=${kindOf(error)}`);
      return false;
    }
  };

  const reset = (): Promise<boolean> => serial(async () => {
    try {
      await store.deleteItemAsync(ACCOUNTS_V2_DETACH_LATCH_KEY);
      // зачем (6E ревью, P3): учёт терминальных неудач без защёлки бесхозный — снимаем вместе.
      await store.deleteItemAsync(ACCOUNTS_V2_TERMINAL_ERASE_KEY).catch((error: unknown) => {
        console.warn(`${LOG} latch terminal_prune_failed kind=${kindOf(error)}`);
      });
      console.warn(`${LOG} latch reset_after_corrupt`);
      return true;
    } catch (error) {
      console.warn(`${LOG} latch reset_failed kind=${kindOf(error)}`);
      return false;
    }
  });

  const readTerminal = async (): Promise<ReadonlyMap<string, AccountTerminalEraseRecord>> => {
    try {
      const raw = await store.getItemAsync(ACCOUNTS_V2_TERMINAL_ERASE_KEY);
      if (raw === null) return new Map();
      const parsed = JSON.parse(raw) as { v?: unknown; entries?: unknown };
      if (parsed.v !== 1 || typeof parsed.entries !== 'object' || parsed.entries === null) {
        console.warn(`${LOG} latch terminal_shape_invalid`);
        return new Map();
      }
      const out = new Map<string, AccountTerminalEraseRecord>();
      for (const [uid, row] of Object.entries(parsed.entries as Record<string, unknown>)) {
        const value = row as { count?: unknown; lastAtMs?: unknown } | null;
        if (validUid(uid) && Number.isSafeInteger(value?.count) && Number.isSafeInteger(value?.lastAtMs)) {
          out.set(uid, Object.freeze({ count: value!.count as number, lastAtMs: value!.lastAtMs as number }));
        }
      }
      return out;
    } catch (error) {
      // зачем: учёт неудач — лишь экономия повторов; нечитаем → считаем пустым, стирание всё равно пробуем.
      console.warn(`${LOG} latch terminal_read_failed kind=${kindOf(error)}`);
      return new Map();
    }
  };

  const writeTerminal = async (entries: ReadonlyMap<string, AccountTerminalEraseRecord>): Promise<boolean> => {
    try {
      if (entries.size === 0) {
        await store.deleteItemAsync(ACCOUNTS_V2_TERMINAL_ERASE_KEY);
        return true;
      }
      await store.setItemAsync(ACCOUNTS_V2_TERMINAL_ERASE_KEY, JSON.stringify({ v: 1, entries: Object.fromEntries(entries) }));
      return true;
    } catch (error) {
      console.warn(`${LOG} latch terminal_write_failed kind=${kindOf(error)}`);
      return false;
    }
  };

  return Object.freeze({
    read,
    reset,
    replace: (uids: readonly string[]) => serial(async () => {
      const next = [...new Set(uids)].filter(validUid).slice(-MAX_ENTRIES);
      if (next.length !== new Set(uids).size) console.warn(`${LOG} latch replace_dropped count=${new Set(uids).size - next.length}`);
      const ok = await write(next);
      // зачем (6E ревью, P3): учёт терминальных неудач только для uid, оставшихся в защёлке.
      if (ok) {
        const terminal = await readTerminal();
        const kept = new Map([...terminal].filter(([uid]) => next.includes(uid)));
        if (kept.size !== terminal.size) await writeTerminal(kept);
      }
      console.log(`${LOG} latch replace ok=${ok} entries=${next.length}`);
      return ok;
    }),
    probe: async () => {
      try {
        const token = `p${Date.now().toString(36)}`;
        await store.setItemAsync(PROBE_KEY, token);
        const ok = await store.getItemAsync(PROBE_KEY) === token;
        await store.deleteItemAsync(PROBE_KEY);
        console.log(`${LOG} latch probe ok=${ok}`);
        return ok;
      } catch (error) {
        console.warn(`${LOG} latch probe_failed kind=${kindOf(error)}`);
        return false;
      }
    },
    readTerminal: () => serial(readTerminal),
    noteTerminal: (uid: string, nowMs: number) => serial(async () => {
      if (!validUid(uid)) return null;
      const entries = new Map(await readTerminal());
      const prior = entries.get(uid);
      const next = Object.freeze({ count: (prior?.count ?? 0) + 1, lastAtMs: nowMs });
      entries.set(uid, next);
      return await writeTerminal(entries) ? next : null;
    }),
    mark: (uid: string) => serial(async () => {
      if (!validUid(uid)) {
        console.warn(`${LOG} latch mark_rejected code=invalid_uid`);
        return false;
      }
      const current = await read();
      // зачем: битую запись не чиним молча — перезаписываем ею же только наш uid,
      // иначе отказ записи оставил бы uid открываемым.
      const base = current.ok ? current.uids.filter((entry) => entry !== uid) : [];
      if (!current.ok) console.warn(`${LOG} latch mark_over_corrupt code=${current.code}`);
      const next = [...base, uid].slice(-MAX_ENTRIES);
      const ok = await write(next);
      console.log(`${LOG} latch mark ok=${ok} entries=${next.length}`);
      return ok;
    }),
    clear: (uid: string) => serial(async () => {
      const current = await read();
      if (!current.ok) {
        console.warn(`${LOG} latch clear_skipped code=${current.code}`);
        return false;
      }
      // зачем (6E): стёрто — учёт неисправимых неудач по этому uid больше не нужен.
      const terminal = await readTerminal();
      if (terminal.has(uid)) {
        const rest = new Map(terminal);
        rest.delete(uid);
        await writeTerminal(rest);
      }
      if (!current.uids.includes(uid)) return true;
      const next = current.uids.filter((entry) => entry !== uid);
      const ok = await write(next);
      console.log(`${LOG} latch clear ok=${ok} entries=${next.length}`);
      return ok;
    }),
  });
}
