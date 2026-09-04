/**
 * Сторож против зависания экрана после исчерпания попыток.
 *
 * Инцидент (владелец, 2026-09-03): «допустил три ошибки в разделе тренировка
 * карточка (правда/ложь) и экран завис намертво, никакой реакции».
 *
 * Корень: при `phase !== 'active'` экран накрывается полноэкранным
 * `attemptsInputBlocker`. Снять его обязан автосброс — но он делает ранний
 * выход при `hydrated === false`, а девять из десяти экранов этот проп не
 * передавали. Механизм был на месте, данных ему не дали.
 *
 * Почему тест именно ЗДЕСЬ и именно в `.test.ts`: интеграционные тесты этих
 * экранов лежат в `*.test.tsx`, а `testMatch` в package.json перечисляет лишь
 * три `.tsx`-файла поимённо — остальные 29 НИКОГДА не исполнялись. Поэтому
 * баг и дожил до пользователя. Этот сторож проверяет поведение самого хука и
 * запускается всегда.
 *
 * Парный сторож на связку экранов (передан ли `hydrated`) —
 * tests/session_attempts_screen_wiring_gate.ts.
 */
import { renderHook, waitFor } from '@testing-library/react-native';

import { useSessionAttemptAutoReset } from '../hooks/useSessionAttemptAutoReset';

describe('автосброс попыток разблокирует экран', () => {
  test('без hydrated восстановление не запускается — так и выглядел зависший экран', async () => {
    const restoreAttempts = jest.fn();
    const forfeitSessionRunes = jest.fn();

    renderHook(() => useSessionAttemptAutoReset({
      phase: 'awaiting_recovery',
      restoreAttempts,
      forfeitSessionRunes,
    }));

    // Ждём заведомо дольше, чем нужно эффекту: отсутствие вызова — это не
    // гонка, а именно ранний выход по hydrated.
    await new Promise((resolve) => { setTimeout(resolve, 50); });

    expect(restoreAttempts).not.toHaveBeenCalled();
    expect(forfeitSessionRunes).not.toHaveBeenCalled();
  });

  test('с hydrated попытки восстанавливаются, руны сессии сгорают', async () => {
    const restoreAttempts = jest.fn();
    const forfeitSessionRunes = jest.fn();
    const onRestored = jest.fn();

    renderHook(() => useSessionAttemptAutoReset({
      phase: 'awaiting_recovery',
      hydrated: true,
      giftCount: 0,
      restoreAttempts,
      forfeitSessionRunes,
      onRestored,
    }));

    await waitFor(() => expect(restoreAttempts).toHaveBeenCalledTimes(1));
    expect(forfeitSessionRunes).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(onRestored).toHaveBeenCalledTimes(1));
  });

  test('подарок тратится вместо рун сессии, а не вместе с ними', async () => {
    const restoreAttempts = jest.fn();
    const forfeitSessionRunes = jest.fn();
    const recoverWithGift = jest.fn().mockResolvedValue(undefined);
    const onRestored = jest.fn();

    renderHook(() => useSessionAttemptAutoReset({
      phase: 'awaiting_recovery',
      hydrated: true,
      giftCount: 2,
      recoverWithGift,
      restoreAttempts,
      forfeitSessionRunes,
      onRestored,
    }));

    await waitFor(() => expect(recoverWithGift).toHaveBeenCalledTimes(1));
    // Заработанное за сессию не сгорает, когда спасение оплачено подарком.
    expect(forfeitSessionRunes).not.toHaveBeenCalled();
    expect(restoreAttempts).not.toHaveBeenCalled();
    await waitFor(() => expect(onRestored).toHaveBeenCalledTimes(1));
  });

  test('технический сбой подарка НЕ сжигает руны, но экран всё равно оживает', async () => {
    const restoreAttempts = jest.fn();
    const forfeitSessionRunes = jest.fn();
    const recoverWithGift = jest.fn().mockRejectedValue(new Error('network_failed'));

    renderHook(() => useSessionAttemptAutoReset({
      phase: 'awaiting_recovery',
      hydrated: true,
      giftCount: 1,
      recoverWithGift,
      restoreAttempts,
      forfeitSessionRunes,
    }));

    // Экран обязан ожить: оставлять его заблокированным — это ровно то
    // зависание, ради которого всё чинилось.
    await waitFor(() => expect(restoreAttempts).toHaveBeenCalledTimes(1));
    // Но платы за неудавшийся подарок не берём: он мог не потратиться.
    expect(forfeitSessionRunes).not.toHaveBeenCalled();
  });

  test('недостоверный инвентарь: попытки возвращаются, заработанное сохраняется', async () => {
    const restoreAttempts = jest.fn();
    const forfeitSessionRunes = jest.fn();
    const recoverWithGift = jest.fn();

    renderHook(() => useSessionAttemptAutoReset({
      phase: 'awaiting_recovery',
      hydrated: true,
      // Чтение инвентаря упало: ноль здесь означает «не знаем», а не «нет».
      inventoryTrusted: false,
      giftCount: 0,
      recoverWithGift,
      restoreAttempts,
      forfeitSessionRunes,
    }));

    await waitFor(() => expect(restoreAttempts).toHaveBeenCalledTimes(1));
    expect(forfeitSessionRunes).not.toHaveBeenCalled();
    // Подарок не трогаем: его состояние неизвестно, тратить вслепую нельзя.
    expect(recoverWithGift).not.toHaveBeenCalled();
  });

  test('отсутствие подарка на сервере честно уводит на путь без подарка', async () => {
    const restoreAttempts = jest.fn();
    const forfeitSessionRunes = jest.fn();
    // Инвентарь говорил «подарок есть», сервер ответил «уже потрачен».
    const recoverWithGift = jest.fn()
      .mockRejectedValue(new Error('attempt_restore_gift_unavailable'));

    renderHook(() => useSessionAttemptAutoReset({
      phase: 'awaiting_recovery',
      hydrated: true,
      giftCount: 1,
      recoverWithGift,
      restoreAttempts,
      forfeitSessionRunes,
    }));

    // Экран обязан ожить даже в этом случае — иначе снова мёртвый кадр.
    await waitFor(() => expect(restoreAttempts).toHaveBeenCalledTimes(1));
    expect(forfeitSessionRunes).toHaveBeenCalledTimes(1);
  });
});
