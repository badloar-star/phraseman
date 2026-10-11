// зачем (режим энергии Б, ревью Ядра): когда остановка без энергии снята, ВСЕ экраны занятий через один хук открывают тот же вопрос заново
// (onRestored) — без сжигания монет и без restoreAttempts (сердечек в режиме Б нет).
import { renderHook } from '@testing-library/react-native';
import useSessionAttemptAutoReset from '../hooks/useSessionAttemptAutoReset';
import { isAttemptsInputBlocked, isAttemptsStopEffect } from '../app/session_attempts/session_attempts_stop';

jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

type Phase = 'active' | 'awaiting_recovery' | 'ended' | 'stopped_no_energy';

async function setup(initial: Phase) {
  const restoreAttempts = jest.fn();
  const onRestored = jest.fn();
  const forfeitSessionRunes = jest.fn();
  const hook = await renderHook(
    ({ phase }: { phase: Phase }) => useSessionAttemptAutoReset({ phase, hydrated: true, restoreAttempts, onRestored, forfeitSessionRunes }),
    { initialProps: { phase: initial } },
  );
  return { hook, restoreAttempts, onRestored, forfeitSessionRunes };
}

describe('остановка без энергии (режим Б)', () => {
  test('stopped_no_energy → active: экран открывает вопрос заново, монеты не сжигаются, сердечки не трогаются', async () => {
    const { hook, restoreAttempts, onRestored, forfeitSessionRunes } = await setup('stopped_no_energy');
    expect(onRestored).not.toHaveBeenCalled();
    await hook.rerender({ phase: 'active' });
    expect(onRestored).toHaveBeenCalledTimes(1);
    expect(restoreAttempts).not.toHaveBeenCalled();
    expect(forfeitSessionRunes).not.toHaveBeenCalled();
  });

  test('stopped_no_energy → ended: занятие закончено, открывать вопрос нечем', async () => {
    const { hook, onRestored } = await setup('stopped_no_energy');
    await hook.rerender({ phase: 'ended' });
    expect(onRestored).not.toHaveBeenCalled();
  });

  test('обычный active → active и первый кадр не вызывают onRestored', async () => {
    const { hook, onRestored } = await setup('active');
    await hook.rerender({ phase: 'active' });
    expect(onRestored).not.toHaveBeenCalled();
  });

  test('помощники: стоп-эффекты и блокировка ввода покрывают оба режима', () => {
    expect(isAttemptsStopEffect('attempts_exhausted')).toBe(true);
    expect(isAttemptsStopEffect('energy_exhausted')).toBe(true);
    expect(isAttemptsStopEffect('energy_consumed')).toBe(false);
    expect(isAttemptsStopEffect('none')).toBe(false);
    expect(isAttemptsInputBlocked('awaiting_recovery')).toBe(true);
    expect(isAttemptsInputBlocked('stopped_no_energy')).toBe(true);
    expect(isAttemptsInputBlocked('active')).toBe(false);
  });
});
