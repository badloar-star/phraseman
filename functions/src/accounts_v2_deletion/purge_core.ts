import { ACCOUNTS_V2_DELETION_RECEIPTS_CONTAINER, type DeletionPurgeCursor } from './receipt';

/*
 * Account V2, Пакет 4 (TG-DF4289FFB93C) — чистое ядро удаления accounts_v2/{uid}/**.
 *
 * зачем: удаление аккаунта обязано быть ПОЛНЫМ и не зависать. Ядро не знает
 * Firestore — только порт (перечислить подколлекции, перечислить id порцией,
 * удалить порцию одним коммитом, удалить корень). Отсюда свойства:
 *  - порция ≤ 450 записей на коммит (лимит Firestore 500 минус запас);
 *  - повторяемо: удалить уже удалённое — не ошибка, повтор ничего не ломает;
 *  - возобновляемо: курсор {collection, afterDocId} отдаётся после КАЖДОГО
 *    коммита (onProgress). Падение до коммита → повтор с последнего курсора
 *    удалит ту же порцию; падение после коммита до сохранения курсора → повтор
 *    со старого курсора просто не найдёт удалённое и пойдёт дальше;
 *  - полнота: кроме известных коллекций удаляются и найденные под uid
 *    неизвестные (будущая коллекция не переживёт удаление), а в конце —
 *    контрольный пересчёт: если за время удаления что-то дописалось, done=false.
 * Подключение к конвейеру `account_delete.ts` — Пакет 6 (через
 * `purgeAccountsV2ForDeletion` из firestore_ports.ts).
 */

export const ACCOUNTS_V2_PURGE_MAX_WRITES_PER_COMMIT = 450;
/**
 * Ремонт №1 P3-4: предел коммитов за ОДИН вызов по умолчанию (200 × 450 = 90 000
 * документов). зачем: без предела вызов на огромном аккаунте упёрся бы в
 * тайм-аут функции посреди работы; с пределом он честно возвращает курсор, а
 * следующий вызов продолжает с него. Бесконечность не принимается вовсе.
 */
export const ACCOUNTS_V2_PURGE_DEFAULT_MAX_COMMITS = 200;

export type AccountsV2PurgeCursor = DeletionPurgeCursor;

export interface AccountsV2PurgePort {
  /** Имена подколлекций под accounts_v2/{uid} (только непустые — как listCollections). */
  listSubcollections(uid: string): Promise<readonly string[]>;
  /** id документов коллекции по возрастанию, строго после afterDocId, не больше limit. */
  listDocIds(uid: string, collection: string, afterDocId: string | null, limit: number): Promise<readonly string[]>;
  /** Одна атомарная порция удалений (≤ 450). */
  deleteDocs(uid: string, collection: string, docIds: readonly string[]): Promise<void>;
  /** Корневой документ accounts_v2/{uid} (обычно его нет — удаление идемпотентно). */
  deleteRoot(uid: string): Promise<void>;
}

export type AccountsV2PurgeOptions = Readonly<{
  knownCollections: readonly string[];
  cursor?: AccountsV2PurgeCursor;
  /** Сколько коммитов за вызов (бюджет времени функции). По умолчанию — ACCOUNTS_V2_PURGE_DEFAULT_MAX_COMMITS. */
  maxCommits?: number;
  chunkSize?: number;
  /** Сохранить курсор после коммита (задача/квитанция). Ошибка прерывает удаление. */
  onProgress?: (cursor: AccountsV2PurgeCursor) => Promise<void>;
}>;

export type AccountsV2PurgeResult = Readonly<{
  done: boolean;
  cursor: AccountsV2PurgeCursor;
  deletedDocs: number;
  commits: number;
}>;

const LOG = '[ACCOUNTS-V2-DELETE]';

/** Тот же критерий, что у путей адаптера, плюс контейнер квитанций и предел длины uid. */
export function accountsV2PurgeUidSafe(uid: unknown): uid is string {
  return typeof uid === 'string'
    && uid.length > 0
    && uid.length <= 128
    && !uid.includes('/')
    && uid !== '.'
    && uid !== '..'
    && !/^__.*__$/.test(uid)
    && uid !== ACCOUNTS_V2_DELETION_RECEIPTS_CONTAINER
    // зачем (Ремонт №1 P3-2): префикс _ зарезервирован под служебные контейнеры.
    && !uid.startsWith('_');
}

function purgeOrder(known: readonly string[], discovered: readonly string[]): string[] {
  const knownSet = new Set(known);
  const unknown = [...new Set(discovered)].filter((name) => !knownSet.has(name)).sort();
  if (unknown.length > 0) {
    // зачем: имя коллекции — не личные данные; видно, что схема разошлась со списком.
    console.warn(`${LOG} purge unknown_subcollections count=${unknown.length} names=${unknown.join(',')}`);
  }
  return [...known, ...unknown];
}

function startPoint(order: readonly string[], cursor: AccountsV2PurgeCursor): { index: number; after: string | null } {
  if (cursor === null) return { index: 0, after: null };
  const index = order.indexOf(cursor.collection);
  if (index < 0) {
    // Коллекция курсора исчезла (дочищена) — начинаем сначала: это безопасно,
    // удалённого уже нет, лишняя цена — по одному чтению на пустую коллекцию.
    console.warn(`${LOG} purge cursor_collection_missing restart=from_zero`);
    return { index: 0, after: null };
  }
  return { index, after: cursor.afterDocId };
}

function validateOptions(uid: unknown, options: AccountsV2PurgeOptions): number {
  if (!accountsV2PurgeUidSafe(uid)) {
    console.warn(`${LOG} purge rejected code=uid_invalid`);
    throw new Error('accounts_v2_purge_uid_invalid');
  }
  const chunk = options.chunkSize ?? ACCOUNTS_V2_PURGE_MAX_WRITES_PER_COMMIT;
  if (!Number.isInteger(chunk) || chunk < 1 || chunk > ACCOUNTS_V2_PURGE_MAX_WRITES_PER_COMMIT) {
    console.warn(`${LOG} purge rejected code=chunk_invalid chunk=${String(chunk)}`);
    throw new Error('accounts_v2_purge_chunk_invalid');
  }
  if (options.knownCollections.length === 0) {
    console.warn(`${LOG} purge rejected code=no_collections`);
    throw new Error('accounts_v2_purge_no_collections');
  }
  return chunk;
}

export async function runAccountsV2Purge(
  port: AccountsV2PurgePort,
  uid: string,
  options: AccountsV2PurgeOptions,
): Promise<AccountsV2PurgeResult> {
  const chunk = validateOptions(uid, options);
  const maxCommits = options.maxCommits ?? ACCOUNTS_V2_PURGE_DEFAULT_MAX_COMMITS;
  if (!Number.isSafeInteger(maxCommits) || maxCommits < 1) {
    console.warn(`${LOG} purge rejected code=max_commits_invalid value=${String(maxCommits)}`);
    throw new Error('accounts_v2_purge_max_commits_invalid');
  }
  const order = purgeOrder(options.knownCollections, await port.listSubcollections(uid));
  const start = startPoint(order, options.cursor ?? null);
  let deletedDocs = 0;
  let commits = 0;
  let cursor: AccountsV2PurgeCursor = options.cursor ?? null;

  for (let index = start.index; index < order.length; index += 1) {
    const collection = order[index];
    let after = index === start.index ? start.after : null;
    for (;;) {
      if (commits >= maxCommits) {
        console.log(`${LOG} purge paused reason=commit_budget commits=${commits} deleted=${deletedDocs}`);
        return Object.freeze({ done: false, cursor, deletedDocs, commits });
      }
      const ids = await port.listDocIds(uid, collection, after, chunk);
      if (ids.length === 0) break;
      await port.deleteDocs(uid, collection, ids);
      commits += 1;
      deletedDocs += ids.length;
      after = ids[ids.length - 1];
      cursor = Object.freeze({ collection, afterDocId: after });
      if (options.onProgress) await options.onProgress(cursor);
      if (ids.length < chunk) break;
    }
  }

  await port.deleteRoot(uid);
  const leftover = await port.listSubcollections(uid);
  if (leftover.length > 0) {
    // зачем: запись, дописанная во время удаления (гонка), не должна пережить его —
    // вызывающий повторит с нуля; с нуля безопасно (удалённого уже нет).
    console.warn(`${LOG} purge incomplete reason=late_writes collections=${leftover.length} deleted=${deletedDocs}`);
    return Object.freeze({ done: false, cursor: null, deletedDocs, commits });
  }
  console.log(`${LOG} purge done commits=${commits} deleted=${deletedDocs}`);
  return Object.freeze({ done: true, cursor: null, deletedDocs, commits });
}
