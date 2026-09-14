/**
 * Эксклюзивная транзакция на ТОМ ЖЕ (ключевом) соединении SQLCipher.
 *
 * зачем (инцидент владельца 2026-09-14 09:04, лог metro-console): `expo-sqlite`
 * для `withExclusiveTransactionAsync` открывает НОВОЕ нативное соединение
 * (`Transaction.createAsync` → `useNewConnection: true`). На это соединение
 * никто не применяет `PRAGMA key`, поэтому первая же инструкция внутри читает
 * шифрованный файл без ключа и получает SQLITE_NOTADB — «file is not a
 * database». В логе это выглядело как исправная база (проба записи на основном
 * соединении проходила, пересоздание срабатывало, хвостов не было) и всё равно
 * `bootstrap:FAILED` на миграции. Четвёртый круг одной починки: три предыдущих
 * чинили файл, а ломалось соединение.
 *
 * Здесь транзакция ведётся вручную на переданном соединении — ключ на нём уже
 * стоит. Эксклюзивность обеспечивается двумя слоями:
 *  • `BEGIN IMMEDIATE` — блокировка записи в SQLite на время транзакции;
 *  • очередь на уровне JS (по соединению) — параллельные вызовы из кода не
 *    перемешивают свои инструкции внутри чужой транзакции.
 */

export interface KeyedTransactionConnection {
  execAsync(sql: string): Promise<void>;
}

const queues = new WeakMap<object, Promise<unknown>>();

function describe(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

export async function withKeyedExclusiveTransaction<TConnection extends KeyedTransactionConnection, TResult>(
  database: TConnection,
  task: (transaction: TConnection) => Promise<TResult>,
): Promise<TResult> {
  const previous = queues.get(database) ?? Promise.resolve();
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  // Очередь копит ТОЛЬКО факт «занято»: отказ предыдущей транзакции не должен
  // ронять следующую, поэтому её результат намеренно не пробрасывается.
  queues.set(database, previous.then(() => gate, () => gate));
  await previous.catch(() => undefined);

  try {
    await database.execAsync('BEGIN IMMEDIATE;');
    let result: TResult;
    try {
      result = await task(database);
    } catch (error: unknown) {
      try {
        await database.execAsync('ROLLBACK;');
      } catch (rollbackError: unknown) {
        // Немой catch запрещён: неудавшийся откат обязан быть виден рядом с причиной.
        console.warn('[PHONE-STATE-TX] rollback failed —', describe(rollbackError), '· причина отката:', describe(error));
      }
      throw error;
    }
    await database.execAsync('COMMIT;');
    return result;
  } finally {
    release();
  }
}
