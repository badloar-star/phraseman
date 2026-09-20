/**
 * Сторож самозахвата storage-замка.
 *
 * зачем (владелец 2026-09-20, лог 19:17:10): покупка диалога за руны висела
 * НАВСЕГДА. `buyDialogAccessLocally` брала storage-замок, а внутри читала
 * баланс, который брал ТОТ ЖЕ замок заново — вызов ждал сам себя.
 * В логе `step 6 before_read_balance` есть, `step 7` не наступает никогда.
 *
 * Дедлайн снаружи от этого не спасает ПО ПОСТРОЕНИЮ: он режет ожидание в
 * очереди, а зависание было ВНУТРИ уже взятого замка.
 *
 * Сам дедлок здесь НЕ воспроизводится намеренно: повисший вызов занял бы
 * общий замок навсегда и уронил бы соседние тесты. Проверяем ФАКТ починки —
 * вложенный вызов с арендой проходит насквозь, а замок после этого свободен.
 */
import {
  withStorageLock,
  withStorageLockDeadline,
  __resetStorageLockLeasesForTests,
  type StorageLockLease,
} from '../app/storage_mutex';

beforeEach(() => {
  __resetStorageLockLeasesForTests();
});

describe('storage lock reentrancy', () => {
  it('вложенный вызов С АРЕНДОЙ проходит насквозь и не ждёт сам себя', async () => {
    const order: string[] = [];

    const result = await withStorageLock(async (lease) => {
      order.push('outer:in');
      // Ровно та форма, что висела: вложенный захват того же замка.
      const inner = await withStorageLock(async () => {
        order.push('inner:in');
        return 'inner-value';
      }, lease);
      order.push('outer:out');
      return inner;
    });

    expect(result).toBe('inner-value');
    expect(order).toEqual(['outer:in', 'inner:in', 'outer:out']);
  });

  it('замок отпускается после вложенного вызова — следующий владелец входит', async () => {
    await withStorageLock(async (lease) => {
      await withStorageLock(async () => undefined, lease);
    });

    // Если бы аренда не снималась в finally, этот захват висел бы вечно.
    const after = await withStorageLock(async () => 'free');
    expect(after).toBe('free');
  });

  it('дедлайн-захват тоже выдаёт аренду — иначе покупка не смогла бы её передать', async () => {
    const outcome = await withStorageLockDeadline(async (lease) => {
      return withStorageLock(async () => 'nested-under-deadline', lease);
    }, 1000);

    expect(outcome.completed).toBe(true);
    if (outcome.completed) expect(outcome.value).toBe('nested-under-deadline');
  });

  it('ЧУЖАЯ аренда НЕ открывает замок — иначе защита от гонок была бы фикцией', async () => {
    // Аренда, которой никто не владеет: подделка не должна пускать внутрь.
    const forged = Object.freeze({}) as unknown as StorageLockLease;

    let innerEntered = false;
    await withStorageLock(async () => {
      // Захват с чужой арендой обязан ВСТАТЬ В ОЧЕРЕДЬ, а не пройти насквозь.
      const queued = withStorageLock(async () => {
        innerEntered = true;
      }, forged);
      // Пока внешний замок держим — вложенный не может войти.
      await Promise.resolve();
      expect(innerEntered).toBe(false);
      void queued;
    });

    // После освобождения очередь разбирается штатно.
    await withStorageLock(async () => undefined);
    expect(innerEntered).toBe(true);
  });

  it('аренда перестаёт действовать ПОСЛЕ выхода из своего блока', async () => {
    let escaped: StorageLockLease | null = null;
    await withStorageLock(async (lease) => {
      escaped = lease;
    });

    // Утёкшая аренда не смеет открывать замок задним числом.
    let entered = false;
    await withStorageLock(async () => {
      const queued = withStorageLock(async () => {
        entered = true;
      }, escaped ?? undefined);
      await Promise.resolve();
      expect(entered).toBe(false);
      void queued;
    });

    await withStorageLock(async () => undefined);
    expect(entered).toBe(true);
  });
});
