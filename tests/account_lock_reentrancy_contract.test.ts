/**
 * Сторож: повторный вход в замок аккаунта ИЗНУТРИ него самого недопустим.
 *
 * зачем (владелец 2026-09-20, логи 15:19:55): покупка диалога брала
 * withAccountTransitionLock, а внутри звала readUnifiedLevelSpinStars,
 * который брал ТОТ ЖЕ замок заново — и вставал в очередь за самим собой.
 * Самозахват: ни ok, ни denied, ни таймаута. Кнопка мертва навсегда.
 *
 * Дедлайн от этого НЕ спасает — он режет ожидание снаружи, а зависание
 * происходит внутри уже взятого замка. Спасает только проброс аренды.
 */
import {
  withAccountTransitionLock,
  withAccountTransitionLockWithDeadline,
} from '../app/account_generation';

describe('реентерабельность замка аккаунта', () => {
  // Замечание: воспроизводить самозахват здесь НЕЛЬЗЯ: повисший
  // вызов занимает общий замок навсегда и роняет соседние тесты.
  // Сторожим ПРАВИЛЬНОЕ поведение: аренда проходит насквозь.

  it('вложенный вызов С арендой проходит насквозь и возвращает результат', async () => {
    const value = await withAccountTransitionLock(async (lease) => {
      const inner = await withAccountTransitionLock(async () => 'прошло', lease);
      return inner;
    });
    expect(value).toBe('прошло');
  });

  it('путь покупки: дедлайн снаружи + аренда внутрь = результат, а не тишина', async () => {
    const outcome = await withAccountTransitionLockWithDeadline(async (lease) => {
      // Ровно форма buyDialogAccessLocally: читаем баланс и пишем его
      // обратно, оба раза ИЗНУТРИ уже взятого замка.
      const read = await withAccountTransitionLock(async () => 5523, lease);
      const write = await withAccountTransitionLock(async () => read - 5000, lease);
      return write;
    }, 3000);
    expect(outcome).toEqual({ completed: true, value: 523 });
  });

  it('замок отпускается после вложенной работы — следующий проходит', async () => {
    await withAccountTransitionLock(async (lease) => {
      await withAccountTransitionLock(async () => 'x', lease);
      return 'y';
    });
    const after = await withAccountTransitionLockWithDeadline(async () => 'свободен', 1000);
    expect(after).toEqual({ completed: true, value: 'свободен' });
  });
});
