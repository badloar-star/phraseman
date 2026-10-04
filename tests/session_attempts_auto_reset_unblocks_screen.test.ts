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
      restoreAttempts,
      forfeitSessionRunes,
      onRestored,
    }));

    await waitFor(() => expect(restoreAttempts).toHaveBeenCalledTimes(1));
    expect(forfeitSessionRunes).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(onRestored).toHaveBeenCalledTimes(1));
  });

  // зачем (D09/D148, 04.10): подарки «защиты от трёх попыток» убраны (старые подарки не конвертируются) — три прежних теста про подарок
  // (трата подарка вместо рун, сбой подарка, «подарок уже потрачен») описывали несуществующий путь и удалены вместе с ним. Остались
  // два правила, которые продолжают жить: плата рунами сессии только при достоверном состоянии, и экран оживает ВСЕГДА.
  test('недостоверное состояние: попытки возвращаются, заработанное сохраняется', async () => {
    const restoreAttempts = jest.fn();
    const forfeitSessionRunes = jest.fn();

    renderHook(() => useSessionAttemptAutoReset({
      phase: 'awaiting_recovery',
      hydrated: true,
      // Чтение состояния упало: «не знаем» — не повод сжигать заработанное.
      hydrationTrusted: false,
      restoreAttempts,
      forfeitSessionRunes,
    }));

    await waitFor(() => expect(restoreAttempts).toHaveBeenCalledTimes(1));
    expect(forfeitSessionRunes).not.toHaveBeenCalled();
  });

  test('сбой сжигания рун не оставляет экран заблокированным', async () => {
    const restoreAttempts = jest.fn();
    const forfeitSessionRunes = jest.fn().mockRejectedValue(new Error('persist_failed'));
    const onRestored = jest.fn();

    renderHook(() => useSessionAttemptAutoReset({
      phase: 'awaiting_recovery',
      hydrated: true,
      restoreAttempts,
      forfeitSessionRunes,
      onRestored,
    }));

    // Экран обязан ожить: оставлять его заблокированным — ровно то зависание, ради которого всё чинилось.
    await waitFor(() => expect(restoreAttempts).toHaveBeenCalledTimes(1));
    expect(forfeitSessionRunes).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(onRestored).toHaveBeenCalledTimes(1));
  });

  test('активное занятие ничего не восстанавливает', async () => {
    const restoreAttempts = jest.fn();
    const forfeitSessionRunes = jest.fn();

    renderHook(() => useSessionAttemptAutoReset({
      phase: 'active',
      hydrated: true,
      restoreAttempts,
      forfeitSessionRunes,
    }));

    await new Promise((resolve) => { setTimeout(resolve, 50); });
    expect(restoreAttempts).not.toHaveBeenCalled();
    expect(forfeitSessionRunes).not.toHaveBeenCalled();
  });
});
