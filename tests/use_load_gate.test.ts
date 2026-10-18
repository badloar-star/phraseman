/**
 * useLoadGate (D158): потолок загрузки, паузы 1/3/8 с, затем exhausted; успех сбрасывает счётчик;
 * ручной повтор и возврат в приложение запускают цикл заново.
 */
import { act, cleanup, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useLoadGate, type LoadGateStatus } from '../app/use_load_gate';
import { LOAD_GATE_TOTAL_MS } from '../app/load_gate_config';
import { LOAD_GATE_READY_RESET_MS } from '../app/use_load_gate';

type Props = { status: LoadGateStatus; enabled?: boolean };

async function setup(initial: Props) {
  const retry = jest.fn();
  const hook = await renderHook((props: Props) => useLoadGate({ id: 'test', status: props.status, retry, enabled: props.enabled }), {
    initialProps: initial,
  });
  return { retry, hook };
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('error → retries after 1 s, 3 s, 8 s, then exhausted (no fourth retry)', async () => {
  const { retry, hook } = await setup({ status: 'error' });
  for (const [index, pause] of [1000, 3000, 8000].entries()) {
    await act(async () => { jest.advanceTimersByTime(pause - 1); });
    expect(retry).toHaveBeenCalledTimes(index);
    await act(async () => { jest.advanceTimersByTime(1); });
    expect(retry).toHaveBeenCalledTimes(index + 1);
    // Потребитель по контракту переводит статус в loading, затем снова сбой.
    await act(async () => { await hook.rerender({ status: 'loading' }); });
    await act(async () => { await hook.rerender({ status: 'error' }); });
  }
  expect(hook.result.current.exhausted).toBe(true);
  await act(async () => { jest.advanceTimersByTime(60_000); });
  expect(retry).toHaveBeenCalledTimes(3);
});

test('a load that never answers counts as an attempt after the ceiling', async () => {
  const { retry, hook } = await setup({ status: 'loading' });
  await act(async () => { jest.advanceTimersByTime(LOAD_GATE_TOTAL_MS - 1); });
  expect(retry).not.toHaveBeenCalled();
  await act(async () => { jest.advanceTimersByTime(1); });
  expect(retry).toHaveBeenCalledTimes(1);
  expect(hook.result.current.exhausted).toBe(false);
});

test('success resets the counter and clears exhausted', async () => {
  const { retry, hook } = await setup({ status: 'error' });
  await act(async () => { jest.advanceTimersByTime(1000); });
  expect(retry).toHaveBeenCalledTimes(1);
  await act(async () => { await hook.rerender({ status: 'ready' }); });
  await act(async () => { jest.advanceTimersByTime(LOAD_GATE_READY_RESET_MS); }); // зачем (Ревизор 18.10): сброс — только если 'ready' держится
  await act(async () => { await hook.rerender({ status: 'error' }); });
  // Счётчик сброшен — снова первая пауза 1 с, а не 3 с.
  await act(async () => { jest.advanceTimersByTime(1000); });
  expect(retry).toHaveBeenCalledTimes(2);
});

test('retryNow(tap) after exhaustion restarts the cycle', async () => {
  const { retry, hook } = await setup({ status: 'error' });
  for (const pause of [1000, 3000, 8000]) {
    await act(async () => { jest.advanceTimersByTime(pause); });
    await act(async () => { await hook.rerender({ status: 'loading' }); });
    await act(async () => { await hook.rerender({ status: 'error' }); });
  }
  expect(hook.result.current.exhausted).toBe(true);
  await act(async () => { hook.result.current.retryNow('tap'); });
  expect(retry).toHaveBeenCalledTimes(4);
  expect(hook.result.current.exhausted).toBe(false);
  await act(async () => { await hook.rerender({ status: 'loading' }); });
  await act(async () => { await hook.rerender({ status: 'error' }); });
  await act(async () => { jest.advanceTimersByTime(1000); });
  expect(retry).toHaveBeenCalledTimes(5);
});

test('returning to the app retries automatically once exhausted', async () => {
  let listener: ((state: string) => void) | null = null;
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((_type: string, cb: (state: string) => void) => {
    listener = cb;
    return { remove: () => { listener = null; } };
  }) as never);
  const { retry, hook } = await setup({ status: 'error' });
  for (const pause of [1000, 3000, 8000]) {
    await act(async () => { jest.advanceTimersByTime(pause); });
    await act(async () => { await hook.rerender({ status: 'loading' }); });
    await act(async () => { await hook.rerender({ status: 'error' }); });
  }
  expect(hook.result.current.exhausted).toBe(true);
  expect(listener).not.toBeNull();
  await act(async () => { listener?.('active'); });
  expect(retry).toHaveBeenCalledTimes(4);
});

test('disabled gate stays silent', async () => {
  const { retry } = await setup({ status: 'error', enabled: false });
  await act(async () => { jest.advanceTimersByTime(60_000); });
  expect(retry).not.toHaveBeenCalled();
});

test('persistAcrossMounts: the counter survives unmount during reload (no endless 1 s loop)', async () => {
  const { __resetLoadGatePersistenceForTests } = await import('../app/use_load_gate');
  __resetLoadGatePersistenceForTests();
  const retry = jest.fn();
  const mount = () => renderHook(() => useLoadGate({ id: 'saved', status: 'error', retry, persistAcrossMounts: true }));
  let hook = await mount();
  await act(async () => { jest.advanceTimersByTime(1000); });
  expect(retry).toHaveBeenCalledTimes(1);
  await hook.unmount();
  // Экран снова смонтирован со сбоем — следующая пауза 3 с, а не снова 1 с.
  hook = await mount();
  await act(async () => { jest.advanceTimersByTime(1000); });
  expect(retry).toHaveBeenCalledTimes(1);
  await act(async () => { jest.advanceTimersByTime(2000); });
  expect(retry).toHaveBeenCalledTimes(2);
  await hook.unmount();
  hook = await mount();
  await act(async () => { jest.advanceTimersByTime(8000); });
  expect(retry).toHaveBeenCalledTimes(3);
  await hook.unmount();
  hook = await mount();
  expect(hook.result.current.exhausted).toBe(true);
  await act(async () => { jest.advanceTimersByTime(60_000); });
  expect(retry).toHaveBeenCalledTimes(3);
});

// зачем (cards-039, Сверка 81d2dfe38, координатор 18.10 05:58): потребитель, нарушивший контракт «retry переводит status в loading» (отдаёт воротам только 'error'),
// не должен залипать: attempt 2 и 3 случаются сами (перезапуск по счётчику повторов), затем исчерпание → «Сейчас недоступно».
test('retry after which the status stays error (consumer never reports loading): attempts 2 and 3 still happen, then exhausted', async () => {
  const { retry, hook } = await setup({ status: 'error' });
  await act(async () => { jest.advanceTimersByTime(1000); });
  expect(retry).toHaveBeenCalledTimes(1);
  // status НЕ меняется (всё ещё error) — раньше здесь наступала тишина
  await act(async () => { jest.advanceTimersByTime(2999); });
  expect(retry).toHaveBeenCalledTimes(1);
  await act(async () => { jest.advanceTimersByTime(1); });
  expect(retry).toHaveBeenCalledTimes(2);
  await act(async () => { jest.advanceTimersByTime(8000); });
  expect(retry).toHaveBeenCalledTimes(3);
  expect(hook.result.current.exhausted).toBe(true);
  await act(async () => { jest.advanceTimersByTime(60_000); });
  expect(retry).toHaveBeenCalledTimes(3);
});

// зачем (координатор 18.10: PaywallPlus — priceGateStatus): потребитель, СОБЛЮДАЮЩИЙ контракт (на время повтора status 'loading', затем снова 'error'), с правкой epoch ведёт себя ровно как раньше:
// те же моменты повторов и то же число (3), между ними ни одного лишнего вызова, после исчерпания тишина. Для пейвола это значит: запросов цен (reloadOfferings) — только запланированные попытки 1–3, без цикла.
test('contract-following consumer (paywall-like): retry moments and count are unchanged by the epoch restart, no extra calls between attempts', async () => {
  const { retry, hook } = await setup({ status: 'error' });
  const reportAttempt = async (loadingMs: number) => {
    await act(async () => { await hook.rerender({ status: 'loading' }); });
    await act(async () => { jest.advanceTimersByTime(loadingMs); });
    await act(async () => { await hook.rerender({ status: 'error' }); });
  };
  await act(async () => { jest.advanceTimersByTime(999); });
  expect(retry).toHaveBeenCalledTimes(0);
  await act(async () => { jest.advanceTimersByTime(1); });
  expect(retry).toHaveBeenCalledTimes(1); // attempt 1 на 1 с
  await reportAttempt(500); // загрузка цен 500 мс, затем снова сбой
  await act(async () => { jest.advanceTimersByTime(2999); });
  expect(retry).toHaveBeenCalledTimes(1);
  await act(async () => { jest.advanceTimersByTime(1); });
  expect(retry).toHaveBeenCalledTimes(2); // attempt 2: пауза 3 с ПОСЛЕ сбоя
  await reportAttempt(500);
  await act(async () => { jest.advanceTimersByTime(7999); });
  expect(retry).toHaveBeenCalledTimes(2);
  await act(async () => { jest.advanceTimersByTime(1); });
  expect(retry).toHaveBeenCalledTimes(3); // attempt 3: пауза 8 с
  await reportAttempt(500);
  expect(hook.result.current.exhausted).toBe(true);
  await act(async () => { jest.advanceTimersByTime(120_000); });
  expect(retry).toHaveBeenCalledTimes(3); // после исчерпания — тишина, цикла нет
});

// зачем (Ревизор 18.10 08:30, 🔴 бесконечный автоповтор раз в ~1 с в 49630f40e): потребитель, у которого status на время повтора мигает 'ready' (error → ready → error), не должен обнулять счётчик —
// без сети всего 3 попытки (1/3/8 с), затем тишина.
test('status flapping error → ready → error right after each retry does not reset the counter: no sign of an endless loop', async () => {
  const { retry, hook } = await setup({ status: 'error' });
  for (const pause of [1000, 3000, 8000]) {
    await act(async () => { jest.advanceTimersByTime(pause); });
    await act(async () => { await hook.rerender({ status: 'ready' }); }); // сброс флага ошибки на старте перезагрузки
    await act(async () => { jest.advanceTimersByTime(300); });            // короче LOAD_GATE_READY_RESET_MS
    await act(async () => { await hook.rerender({ status: 'error' }); }); // снова сбой
  }
  expect(retry).toHaveBeenCalledTimes(3);
  expect(hook.result.current.exhausted).toBe(true);
  await act(async () => { jest.advanceTimersByTime(120_000); });
  expect(retry).toHaveBeenCalledTimes(3);
});
