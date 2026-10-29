// learning_v2_task_swap_trace_2026_10_29.test.ts — [V2-STACK]: журнал смены заданий в занятии Learning V2.
// зачем (жалоба 29.10 «экран наслаивается», Android 2.0.3, урок 8; координатор и Ревизор — сперва логи): проверяем, что сбой смены задания
// попадает в журнал (выход не закончился за 1,5 с, выход прерван, новая смена при висящем выходе) — первый сбой кода за запуск в app_errors,
// остальные на телефон, поля плоские и не больше 12; без смены задания (вступление, загрузка, итог, уход с экрана, Reduce Motion, поздний
// колбэк) ложной тревоги нет; журнал никогда не бросает в занятие; плеер ставит тот же ключ и переход 110 мс, только с ref слоя и колбэком.
import fs from 'node:fs';
import path from 'node:path';
import {
  __resetV2TaskSwapTraceForTests, clearV2TaskSwapTrace, noteV2LayerDone, noteV2LayerRef, v2StackEntering, v2StackExiting, V2_STUCK_LAYER_MS,
} from '../app/learning_v2_task_swap_trace';

const mockReport = jest.fn();
const mockCritical = jest.fn();
jest.mock('../app/debug-logger', () => ({
  reportDiagnosticError: (...args: unknown[]) => mockReport(...args),
  DebugLogger: { error: (...args: unknown[]) => mockCritical(...args) },
}));
jest.mock('react-native', () => ({ PixelRatio: { getFontScale: () => 1.3 }, Platform: { OS: 'android', Version: 34 } }));
type Built = { kind: string; ms: number; cb: (finished: boolean) => void };
const mockBuilt: Built[] = [];
jest.mock('react-native-reanimated', () => {
  const make = (kind: string) => ({
    duration: (ms: number) => ({
      withCallback: (cb: (finished: boolean) => void) => {
        const b = { kind, ms, cb };
        mockBuilt.push(b);
        return b;
      },
    }),
  });
  return { SlideInRight: make('SlideInRight'), SlideOutLeft: make('SlideOutLeft'), runOnJS: (fn: unknown) => fn };
});

type Rec = { channel: 'server' | 'device'; code: string; operation: string; context: Record<string, unknown> };
/** Все записи о сбоях из обоих каналов: app_errors (DebugLogger.error critical) и журнал на телефоне (reportDiagnosticError). */
function reported(): Rec[] {
  const server = mockCritical.mock.calls.map(([where, error, severity]): Rec => {
    expect(severity).toBe('critical');
    const message = (error as Error).message;
    return {
      channel: 'server', code: String(where).replace('learning_v2:', ''), operation: /op=(\S+)/u.exec(message)?.[1] ?? '',
      context: JSON.parse(message.slice(message.indexOf('{'))) as Record<string, unknown>,
    };
  });
  const device = mockReport.mock.calls.map(([input]): Rec => {
    const { code, operation, context } = input as { code: string; operation: string; context: Record<string, unknown> };
    return { channel: 'device', code, operation, context };
  });
  return [...server, ...device];
}

const NODE = { viewTag: 7 };
const info = (task: string | null, reducedMotion = false) => ({ task, reducedMotion, lesson: 8, session: 2 });
/** React поставил слой задания (ref с узлом). */
const appear = (key: string, task: string | null, reducedMotion = false) => noteV2LayerRef(key, info(task, reducedMotion), NODE);
/** React снял слой задания (ref с null). */
const leave = (key: string, task: string | null, reducedMotion = false) => noteV2LayerRef(key, info(task, reducedMotion), null);
/** Смена задания в одном коммите React: старый слой снят, новый поставлен. */
const swap = (fromKey: string, fromTask: string, toKey: string, toTask: string, reducedMotion = false) => {
  leave(fromKey, fromTask, reducedMotion);
  appear(toKey, toTask, reducedMotion);
};

beforeEach(() => {
  jest.useFakeTimers();
  __resetV2TaskSwapTraceForTests();
  mockReport.mockReset();
  mockCritical.mockReset();
  mockBuilt.length = 0;
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('[V2-STACK] журнал смены заданий', () => {
  it('нормальная смена: вход и выход досмотрены за 110 мс — записей о сбоях нет', () => {
    appear('practice-3-active', 'i3');
    jest.advanceTimersByTime(110);
    noteV2LayerDone('enter', 'practice-3-active', true);
    swap('practice-3-active', 'i3', 'practice-4-active', 'i4');
    jest.advanceTimersByTime(110);
    noteV2LayerDone('exit', 'practice-3-active', true);
    noteV2LayerDone('enter', 'practice-4-active', true);
    jest.advanceTimersByTime(V2_STUCK_LAYER_MS * 2);
    expect(reported()).toEqual([]);
  });

  it('выход не закончился за 1,5 с, а следующее задание уже на экране, — «слой может висеть», первый сбой — в app_errors', () => {
    appear('practice-3-active', 'i3');
    noteV2LayerDone('enter', 'practice-3-active', true);
    swap('practice-3-active', 'i3', 'practice-4-active', 'i4');
    noteV2LayerDone('enter', 'practice-4-active', true);
    jest.advanceTimersByTime(V2_STUCK_LAYER_MS + 1);
    expect(reported()).toEqual([{
      channel: 'server', code: 'v2_stack_layer_stuck', operation: 'exit_stuck',
      context: {
        key: 'practice-3-active', task: 'i3', next: 'practice-4-active', nextTask: 'i4', afterMs: V2_STUCK_LAYER_MS, inFlight: 1,
        onScreen: 'practice-4-active', where: 'L8/S2', fontScale: 1.3, os: 'android 34',
      },
    }]);
  });

  it('вступление, загрузка, итог: пока слоя задания нет, ждать нечего — ложной тревоги нет', () => {
    // итог занятия: слой ушёл вместе с частью экрана, следующего задания нет, колбэк выхода не пришёл
    appear('practice-7-active', 'i7');
    noteV2LayerDone('enter', 'practice-7-active', true);
    leave('practice-7-active', 'i7');
    jest.advanceTimersByTime(V2_STUCK_LAYER_MS * 2);
    // следующее занятие на том же экране — прошлый выход висящим не считается
    appear('practice-0-active', 'i0');
    noteV2LayerDone('enter', 'practice-0-active', true);
    jest.advanceTimersByTime(V2_STUCK_LAYER_MS * 2);
    expect(reported()).toEqual([]);
  });

  it('пауза между заданиями дольше 110 мс: выход ещё идёт, когда появилось следующее, — это тоже смена задания', () => {
    appear('practice-3-active', 'i3');
    leave('practice-3-active', 'i3');
    jest.advanceTimersByTime(300);
    appear('practice-4-active', 'i4');
    noteV2LayerDone('enter', 'practice-4-active', true);
    jest.advanceTimersByTime(V2_STUCK_LAYER_MS);
    expect(reported()).toEqual([expect.objectContaining({
      code: 'v2_stack_layer_stuck', context: expect.objectContaining({ key: 'practice-3-active', next: 'practice-4-active' }),
    })]);
  });

  it('выход прерван (finished = false) при смене задания — запись о сбое', () => {
    appear('practice-3-active', 'i3');
    swap('practice-3-active', 'i3', 'practice-4-active', 'i4');
    noteV2LayerDone('exit', 'practice-3-active', false);
    expect(reported()).toEqual([expect.objectContaining({
      code: 'v2_stack_layer_interrupted', operation: 'exit_done', context: expect.objectContaining({ finished: false, next: 'practice-4-active' }),
    })]);
  });

  it('поздний колбэк после ухода с экрана занятия (записи нет) — только строка в logcat, без журнала (Ревизор 29.10)', () => {
    appear('practice-3-active', 'i3');
    swap('practice-3-active', 'i3', 'practice-4-active', 'i4');
    leave('practice-4-active', 'i4');
    clearV2TaskSwapTrace('уход с экрана занятия');
    noteV2LayerDone('exit', 'practice-3-active', false);
    noteV2LayerDone('exit', 'practice-4-active', false);
    noteV2LayerDone('enter', 'practice-4-active', false);
    jest.advanceTimersByTime(V2_STUCK_LAYER_MS * 2);
    expect(reported()).toEqual([]);
    expect(console.log).toHaveBeenCalledWith('[V2-STACK]', expect.stringContaining('записи нет'));
  });

  it('новая смена, когда прошлый выход висит дольше 440 мс, — «два задания на экране»', () => {
    appear('practice-3-active', 'i3');
    swap('practice-3-active', 'i3', 'practice-4-active', 'i4');
    noteV2LayerDone('enter', 'practice-4-active', true);
    jest.advanceTimersByTime(600);
    swap('practice-4-active', 'i4', 'practice-5-active', 'i5');
    expect(reported()).toEqual([expect.objectContaining({
      code: 'v2_stack_overlap', operation: 'task_swap',
      context: expect.objectContaining({ staleExitKey: 'practice-3-active', staleExitMs: 600, fromKey: 'practice-4-active', toKey: 'practice-5-active' }),
    })]);
  });

  it('то же задание открылось (blocked → active) — тоже смена слоя: «двойник» видно по равным task и nextTask', () => {
    appear('practice-4-blocked', 'i4');
    noteV2LayerDone('enter', 'practice-4-blocked', true);
    swap('practice-4-blocked', 'i4', 'practice-4-active', 'i4');
    noteV2LayerDone('enter', 'practice-4-active', true);
    jest.advanceTimersByTime(V2_STUCK_LAYER_MS + 1);
    expect(reported()).toEqual([expect.objectContaining({
      context: expect.objectContaining({ key: 'practice-4-blocked', task: 'i4', next: 'practice-4-active', nextTask: 'i4' }),
    })]);
  });

  it('вход не закончился за 1,5 с, пока слой на экране, — запись; слой уже ушёл — нет', () => {
    appear('practice-2-active', 'i2');
    jest.advanceTimersByTime(V2_STUCK_LAYER_MS + 1);
    expect(reported()).toEqual([expect.objectContaining({ operation: 'enter_stuck', context: expect.objectContaining({ key: 'practice-2-active', prev: null }) })]);
    mockCritical.mockReset();
    __resetV2TaskSwapTraceForTests();
    appear('practice-5-active', 'i5');
    leave('practice-5-active', 'i5');
    jest.advanceTimersByTime(V2_STUCK_LAYER_MS * 2);
    expect(reported()).toEqual([]);
  });

  it('системный Reduce Motion: анимаций нет — таймеров «висит» нет', () => {
    appear('practice-3-active', 'i3', true);
    swap('practice-3-active', 'i3', 'practice-4-active', 'i4', true);
    jest.advanceTimersByTime(V2_STUCK_LAYER_MS * 2);
    expect(reported()).toEqual([]);
  });

  it('первый сбой кода за запуск — в app_errors, следующий того же кода — только на телефон; поля плоские, не больше 12', () => {
    appear('practice-3-active', 'i3');
    swap('practice-3-active', 'i3', 'practice-4-active', 'i4');
    noteV2LayerDone('enter', 'practice-4-active', true);
    jest.advanceTimersByTime(V2_STUCK_LAYER_MS + 1);
    swap('practice-4-active', 'i4', 'practice-5-active', 'i5');
    noteV2LayerDone('enter', 'practice-5-active', true);
    jest.advanceTimersByTime(V2_STUCK_LAYER_MS + 1);
    const all = reported();
    expect(all.map((r) => `${r.channel}:${r.code}:${String(r.context.key ?? r.context.staleExitKey)}`)).toEqual([
      'server:v2_stack_layer_stuck:practice-3-active', 'server:v2_stack_overlap:practice-3-active', 'device:v2_stack_layer_stuck:practice-4-active',
    ]);
    expect(mockReport.mock.calls[0]![0]).toMatchObject({ screen: 'learning_v2_player', operation: 'exit_stuck', severity: 'warning' });
    for (const r of all) {
      expect(Object.keys(r.context).length).toBeLessThanOrEqual(12);
      for (const value of Object.values(r.context)) expect(value === null || ['string', 'number', 'boolean'].includes(typeof value)).toBe(true);
    }
  });

  it('переход тот же — 110 мс; колбэк конца несёт время UI-потока', () => {
    const exit = v2StackExiting('practice-3-active') as unknown as Built;
    const enter = v2StackEntering('practice-4-active') as unknown as Built;
    expect([exit.kind, exit.ms, enter.kind, enter.ms]).toEqual(['SlideOutLeft', 110, 'SlideInRight', 110]);
    appear('practice-3-active', 'i3');
    swap('practice-3-active', 'i3', 'practice-4-active', 'i4');
    jest.advanceTimersByTime(110);
    exit.cb(false);
    expect(reported()).toEqual([expect.objectContaining({
      code: 'v2_stack_layer_interrupted', context: expect.objectContaining({ ms: 110, uiMs: 110, jsLagMs: 0 }),
    })]);
  });

  it('журнал никогда не бросает в занятие', () => {
    mockReport.mockImplementation(() => { throw new Error('журнал недоступен'); });
    mockCritical.mockImplementation(() => { throw new Error('сеть недоступна'); });
    appear('practice-3-active', 'i3');
    swap('practice-3-active', 'i3', 'practice-4-active', 'i4');
    expect(() => noteV2LayerDone('exit', 'practice-3-active', false)).not.toThrow();
    swap('practice-4-active', 'i4', 'practice-5-active', 'i5');
    expect(() => jest.advanceTimersByTime(V2_STUCK_LAYER_MS * 2)).not.toThrow();
    jest.advanceTimersByTime(600);
    expect(() => swap('practice-5-active', 'i5', 'practice-6-active', 'i6')).not.toThrow();
    expect(mockCritical).toHaveBeenCalled();
    expect(mockReport).toHaveBeenCalled();
  });
});

describe('плеер Learning V2 — подключение журнала', () => {
  it('тот же ключ и тот же переход у всех трёх видов задания, плюс ref слоя', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'learning_v2_direct_session_player_v1.tsx'), 'utf8');
    expect(src).toContain('const practiceKey = `practice-${practiceIndex}-${practiceActivated ? "active" : "blocked"}`;');
    expect(src).toContain('const practiceLayerRef = useV2TaskSwapTrace({ key: practiceKey,');
    expect(src.match(/key=\{practiceKey\}\s+ref=\{practiceLayerRef\}/g) ?? []).toHaveLength(3);
    expect(src.match(/entering=\{reducedMotion \? undefined : v2StackEntering\(practiceKey\)\}/g) ?? []).toHaveLength(3);
    expect(src.match(/exiting=\{reducedMotion \? undefined : v2StackExiting\(practiceKey\)\}/g) ?? []).toHaveLength(3);
    expect(src).not.toContain('SlideInRight.duration(110)');
  });

  it('уход с экрана занятия снимает таймеры — cleanup хука', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'learning_v2_task_swap_trace.ts'), 'utf8');
    expect(src).toMatch(/useEffect\(\(\) => \(\) => clearV2TaskSwapTrace\('уход с экрана занятия'\), \[\]\);/);
  });
});
