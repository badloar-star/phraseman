import fs from 'fs';
import path from 'path';

import { withKeyedExclusiveTransaction } from '../modules/phone-state/keyed_exclusive_transaction';

/**
 * зачем (инцидент владельца 2026-09-14 09:04, четвёртый круг одной починки):
 * expo-sqlite для withExclusiveTransactionAsync открывает НОВОЕ соединение
 * без PRAGMA key, и первая инструкция на шифрованной базе падает с NOTADB.
 * Три предыдущих круга чинили файл (проверки, хвосты WAL) — а ломалось
 * соединение. Этот сторож держит два инварианта:
 *  1. помощник ведёт транзакцию на переданном (ключевом) соединении;
 *  2. в phone-state никто не зовёт withExclusiveTransactionAsync expo-sqlite
 *     напрямую — иначе класс бага вернётся через любую новую точку.
 */
const root = path.join(__dirname, '..');
const read = (...segments: string[]) => fs.readFileSync(path.join(root, ...segments), 'utf8');

function makeConnection(failOn?: string) {
  const executed: string[] = [];
  return {
    executed,
    async execAsync(sql: string): Promise<void> {
      executed.push(sql);
      if (failOn && sql === failOn) throw new Error('injected_failure');
    },
  };
}

describe('withKeyedExclusiveTransaction: та же connection, ручное управление', () => {
  it('BEGIN IMMEDIATE → задача → COMMIT на ТОМ ЖЕ соединении', async () => {
    const connection = makeConnection();
    const seen: unknown[] = [];

    const result = await withKeyedExclusiveTransaction(connection, async (transaction) => {
      seen.push(transaction);
      await transaction.execAsync('CREATE TABLE t (id INTEGER);');
      return 42;
    });

    expect(result).toBe(42);
    // Задача получает ровно то соединение, на котором стоит ключ — не новое.
    expect(seen).toEqual([connection]);
    expect(connection.executed).toEqual(['BEGIN IMMEDIATE;', 'CREATE TABLE t (id INTEGER);', 'COMMIT;']);
  });

  it('ошибка задачи → ROLLBACK и проброс той же ошибки', async () => {
    const connection = makeConnection();

    await expect(withKeyedExclusiveTransaction(connection, async (transaction) => {
      await transaction.execAsync('INSERT INTO t VALUES (1);');
      throw new Error('boom');
    })).rejects.toThrow('boom');

    expect(connection.executed).toEqual(['BEGIN IMMEDIATE;', 'INSERT INTO t VALUES (1);', 'ROLLBACK;']);
  });

  it('неудавшийся ROLLBACK не подменяет причину и пишет в лог', async () => {
    const connection = makeConnection('ROLLBACK;');
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(withKeyedExclusiveTransaction(connection, async () => {
      throw new Error('original');
    })).rejects.toThrow('original');

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('[PHONE-STATE-TX] rollback failed'),
      expect.any(String),
      expect.any(String),
      expect.stringContaining('original'),
    );
    warn.mockRestore();
  });

  it('параллельные вызовы выстраиваются в очередь: инструкции не перемешиваются', async () => {
    const connection = makeConnection();
    let releaseFirst: () => void = () => undefined;
    const firstGate = new Promise<void>((resolve) => { releaseFirst = resolve; });
    // Сигнал «первая транзакция дошла до середины» — вместо подсчёта микротасков,
    // который зависит от реализации промисов и делает тест хрупким.
    let firstReachedMiddle: () => void = () => undefined;
    const firstMiddle = new Promise<void>((resolve) => { firstReachedMiddle = resolve; });

    const first = withKeyedExclusiveTransaction(connection, async (transaction) => {
      await transaction.execAsync('A1;');
      firstReachedMiddle();
      await firstGate;
      await transaction.execAsync('A2;');
    });
    const second = withKeyedExclusiveTransaction(connection, async (transaction) => {
      await transaction.execAsync('B1;');
    });

    // Пока первая транзакция открыта, вторая не начала даже BEGIN.
    await firstMiddle;
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(connection.executed).toEqual(['BEGIN IMMEDIATE;', 'A1;']);

    releaseFirst();
    await Promise.all([first, second]);
    expect(connection.executed).toEqual([
      'BEGIN IMMEDIATE;', 'A1;', 'A2;', 'COMMIT;',
      'BEGIN IMMEDIATE;', 'B1;', 'COMMIT;',
    ]);
  });

  it('отказ предыдущей транзакции не блокирует следующую', async () => {
    const connection = makeConnection();
    await expect(withKeyedExclusiveTransaction(connection, async () => { throw new Error('first'); })).rejects.toThrow('first');
    await expect(withKeyedExclusiveTransaction(connection, async () => 'ok')).resolves.toBe('ok');
  });
});

describe('phone-state не зовёт withExclusiveTransactionAsync expo-sqlite напрямую', () => {
  // Единственный законный путь — адаптер хранилища, который внутри использует
  // помощник. Все остальные точки (миграция, репозиторий синхронизации, health)
  // обязаны идти через адаптер или через помощник.
  it.each([
    ['миграция схемы', ['modules', 'phone-state', 'schema.ts']],
    ['runtime-адаптер', ['app', 'phone_state_runtime.ts']],
  ])('%s использует помощник, а не соединение expo-sqlite', (_name, segments) => {
    const source = read(...segments);
    expect(source).toContain('withKeyedExclusiveTransaction');
    expect(source).not.toMatch(/database\.withExclusiveTransactionAsync\(/);
  });

  it('помощник ведёт транзакцию вручную и объясняет почему', () => {
    const source = read('modules', 'phone-state', 'keyed_exclusive_transaction.ts');
    expect(source).toContain("'BEGIN IMMEDIATE;'");
    expect(source).toContain("'COMMIT;'");
    expect(source).toContain("'ROLLBACK;'");
    expect(source).toContain('useNewConnection');
  });
});
