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
}>;

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
      console.warn(`${LOG} latch reset_after_corrupt`);
      return true;
    } catch (error) {
      console.warn(`${LOG} latch reset_failed kind=${kindOf(error)}`);
      return false;
    }
  });

  return Object.freeze({
    read,
    reset,
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
      if (!current.uids.includes(uid)) return true;
      const next = current.uids.filter((entry) => entry !== uid);
      const ok = await write(next);
      console.log(`${LOG} latch clear ok=${ok} entries=${next.length}`);
      return ok;
    }),
  });
}
