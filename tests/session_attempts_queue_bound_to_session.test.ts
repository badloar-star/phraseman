// зачем (Ревизор 2.80, 15.10, к 708a0f11b): очередь вердиктов до гидратации сердец —
// 1) честный эффект сразу (третья быстрая ошибка = «стоп», вопрос не пролистывается), без записи на диск до гидратации;
// 2) повтор после гидратации поверх СОХРАНЁННОГО состояния, без двойного счёта;
// 3) очередь привязана к занятию: смена занятия её сбрасывает, чужие элементы не применяются;
// 4) потолок гидратации 3 с: экран оживает, прочитанному не верим, поздний ответ не затирает вердикты.
import { act, renderHook } from '@testing-library/react-native';

const mockPersist = jest.fn(async () => undefined);
let mockStored: unknown = null;
let mockHydrateGate: Promise<void> = Promise.resolve();

jest.mock('../app/session_attempts/session_attempt_recovery', () => ({
  commitSessionAttemptRecovery: jest.fn(),
  hydrateSessionAttemptsState: jest.fn(async () => { await mockHydrateGate; return mockStored; }),
  persistSessionAttemptsState: (...args: unknown[]) => mockPersist(...(args as [])),
  recoverPreparedSessionAttemptRecoveries: jest.fn(async () => undefined),
}));
jest.mock('../app/level_spin_star_grants', () => ({ readUnifiedLevelSpinStars: jest.fn(async () => ({ balance: 0, earnedTotal: 0 })) }));
jest.mock('../app/energy_mode', () => ({
  chargesEnergyOnMistake: () => false,
  energyActivityForAttemptsSessionId: () => null,
  useEnergyMode: () => 'a',
}));
jest.mock('../app/energy_session_operation_ledger', () => ({ createEnergySessionIntent: jest.fn() }));
jest.mock('../components/EnergyContext', () => ({
  useEnergy: () => ({ energy: 5, bonusEnergy: 0, isUnlimited: false, energyReady: true, spendMistakeEnergy: jest.fn(async () => 'spent') }),
}));
jest.mock('../app/swallow_log', () => ({ noteSwallowedHandler: () => () => undefined }));

/* eslint-disable import/first */
import { SESSION_ATTEMPTS_HYDRATE_CEILING_MS, useSessionAttempts } from '../hooks/useSessionAttempts';
import { createSessionAttemptsState, reduceSessionAttempts } from '../app/session_attempts/session_attempts_domain';
/* eslint-enable import/first */

const token = { phase: 'active', stableId: 'owner-1', generation: 7 } as never;
const wrong = (id: string) => ({ answerAttemptId: id, verdict: 'pedagogical_wrong' as const });

describe('очередь вердиктов привязана к занятию и честна для вызывающего', () => {
  let logs: string[];
  beforeEach(() => {
    jest.useRealTimers();
    mockPersist.mockClear();
    mockStored = null;
    logs = [];
    jest.spyOn(console, 'log').mockImplementation((...a: unknown[]) => { logs.push(a.map(String).join(' ')); });
    jest.spyOn(console, 'warn').mockImplementation((...a: unknown[]) => { logs.push(a.map(String).join(' ')); });
  });

  it('до гидратации: третья быстрая ошибка возвращает «стоп», на диск ничего не пишется', async () => {
    let release!: () => void;
    mockHydrateGate = new Promise<void>((r) => { release = r; });
    const { result } = await renderHook(() => useSessionAttempts({ token, sessionId: 'lesson:1', initialQuestionId: 'q1' }));
    const total = result.current.state.remainingAttempts;
    const effects: string[] = [];
    await act(async () => { for (let i = 1; i <= total; i += 1) effects.push(result.current.registerVerdict(wrong(`a:${i}`))); });
    expect(effects[effects.length - 1]).toBe('attempts_exhausted');
    expect(effects.slice(0, -1).every((e) => e === 'attempt_consumed')).toBe(true);
    expect(result.current.state.remainingAttempts).toBe(0);
    expect(mockPersist).not.toHaveBeenCalled();
    await act(async () => { release(); await Promise.resolve(); await Promise.resolve(); await new Promise((r) => setTimeout(r, 0)); });
    expect(result.current.hydrated).toBe(true);
    expect(result.current.state.remainingAttempts).toBe(0); // повтор поверх базы, без двойного счёта
    expect(mockPersist).toHaveBeenCalled();
  });

  it('после гидратации очередь ложится на сохранённое состояние (там уже одно сердце потрачено)', async () => {
    let release!: () => void;
    mockHydrateGate = new Promise<void>((r) => { release = r; });
    const fresh = createSessionAttemptsState({ sessionId: 'lesson:1', questionId: 'q1' });
    mockStored = reduceSessionAttempts(fresh, { type: 'verdict', answerAttemptId: 'old:1', verdict: 'pedagogical_wrong' }).state;
    const { result } = await renderHook(() => useSessionAttempts({ token, sessionId: 'lesson:1', initialQuestionId: 'q1' }));
    await act(async () => { result.current.registerVerdict(wrong('a:1')); });
    expect(result.current.state.remainingAttempts).toBe(fresh.remainingAttempts - 1); // проекция на локальном
    await act(async () => { release(); await new Promise((r) => setTimeout(r, 0)); });
    expect(result.current.state.remainingAttempts).toBe(fresh.remainingAttempts - 2); // сохранённое (−1) + очередь (−1)
    expect(logs.some((l) => l.includes('"source":"replay_after_hydration"') && l.includes('"base":"stored"'))).toBe(true);
  });

  it('смена занятия сбрасывает очередь — ответы урока A не списывают сердца урока B', async () => {
    mockHydrateGate = new Promise<void>(() => undefined); // гидратация A не закончится
    const { result, rerender } = await renderHook((props: { sessionId: string }) => useSessionAttempts({ token, sessionId: props.sessionId, initialQuestionId: 'q1' }), { initialProps: { sessionId: 'lesson:A' } });
    await act(async () => { result.current.registerVerdict(wrong('A:1')); });
    mockHydrateGate = Promise.resolve();
    await act(async () => { rerender({ sessionId: 'lesson:B' }); await new Promise((r) => setTimeout(r, 0)); });
    expect(logs.some((l) => l.includes('dropped_on_session_change'))).toBe(true);
    const fresh = createSessionAttemptsState({ sessionId: 'lesson:B', questionId: 'q1' });
    expect(result.current.state.remainingAttempts).toBe(fresh.remainingAttempts);
  });

  it('потолок гидратации: экран оживает, недоверие, очередь применена, поздний ответ игнорируется', async () => {
    jest.useFakeTimers();
    mockHydrateGate = new Promise<void>(() => undefined); // чтение повисло
    const { result } = await renderHook(() => useSessionAttempts({ token, sessionId: 'lesson:1', initialQuestionId: 'q1' }));
    await act(async () => { result.current.registerVerdict(wrong('a:1')); });
    await act(async () => { jest.advanceTimersByTime(SESSION_ATTEMPTS_HYDRATE_CEILING_MS + 10); await Promise.resolve(); await Promise.resolve(); });
    expect(result.current.hydrated).toBe(true);
    expect(result.current.hydrationTrusted).toBe(false);
    expect(result.current.recoveryError).toBe('session_attempts_hydrate_timeout');
    expect(logs.some((l) => l.includes('"outcome":"ceiling"'))).toBe(true);
    expect(logs.some((l) => l.includes('"reason":"ceiling"'))).toBe(true);
    jest.useRealTimers();
  });
});
