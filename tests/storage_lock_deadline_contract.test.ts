/**
 * Сторож: ожидание замка хранилища ОБЯЗАНО иметь предел.
 *
 * зачем (владелец 2026-09-20): покупка диалога встала в вечную очередь
 * `acquireStorageLock()` и не вернулась вообще — ни ok, ни denied. Кнопка
 * осталась мёртвой до ухода с экрана. Класс бага «молчание вместо отказа».
 */
import {
  acquireStorageLock,
  releaseStorageLock,
  withStorageLock,
  withStorageLockDeadline,
} from '../app/storage_mutex';

describe('withStorageLockDeadline', () => {
  it('сдаётся по дедлайну, когда замок держат, и НЕ висит вечно', async () => {
    await acquireStorageLock(); // кто-то другой держит замок
    const started = Date.now();
    const result = await withStorageLockDeadline(async () => 'должно быть недостижимо', 60);
    expect(result.completed).toBe(false);
    expect(Date.now() - started).toBeGreaterThanOrEqual(50);
    releaseStorageLock();
  });

  it('после сдачи по дедлайну замок НЕ остаётся занятым навсегда', async () => {
    await acquireStorageLock();
    const timedOut = await withStorageLockDeadline(async () => 'x', 40);
    expect(timedOut.completed).toBe(false);
    releaseStorageLock();

    // Следующий претендент обязан пройти — иначе мы сами создали вечный замок.
    const after = await withStorageLockDeadline(async () => 'прошло', 500);
    expect(after).toEqual({ completed: true, value: 'прошло' });
  });

  it('свободный замок берётся сразу и работа выполняется', async () => {
    const r = await withStorageLockDeadline(async () => 42, 500);
    expect(r).toEqual({ completed: true, value: 42 });
  });

  it('освобождает замок даже когда работа бросила ошибку', async () => {
    await expect(
      withStorageLockDeadline(async () => { throw new Error('boom'); }, 500),
    ).rejects.toThrow('boom');
    // Замок не залип: обычный withStorageLock проходит.
    await expect(withStorageLock(async () => 'ok')).resolves.toBe('ok');
  });

  it('очередь не ломается: дождавшийся получает замок штатно', async () => {
    await acquireStorageLock();
    const waiter = withStorageLockDeadline(async () => 'дождался', 5000);
    releaseStorageLock();
    await expect(waiter).resolves.toEqual({ completed: true, value: 'дождался' });
  });
});
