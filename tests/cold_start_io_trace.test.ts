// зачем (§89, Q119а, 02.10): счётчик [COLD-START-IO] обязан группировать вызовы по шаблону ключа,
// мерить длительность и одновременность, печатать итог ОДНОЙ строкой console.warn (живёт в release)
// и вернуть оригинальные методы после окна — иначе он сам станет накладным расходом.
jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: {} }));

import {
  coldStartIoKeyPattern,
  installColdStartIoTrace,
  resetColdStartIoTraceForTests,
} from '../app/cold_start_io_trace';

describe('[COLD-START-IO]', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    resetColdStartIoTraceForTests();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('шаблон ключа прячет uid, хэши и числа', () => {
    expect(coldStartIoKeyPattern('phone_state_key_v1_0123456789abcdef0123456789abcdef_3'))
      .toBe('phone_state_key_v#_*_#');
    expect(coldStartIoKeyPattern('streak_journal_2026-10-02')).toBe('streak_journal_#-#-#');
  });

  test('считает вызовы по группам, одновременность и печатает итог одной строкой warn', async () => {
    const getItem = jest.fn(async () => 'v');
    const getItemAsync = jest.fn(async () => null);
    const asyncStorage: Record<string, unknown> = { getItem };
    const secureStore: Record<string, unknown> = { getItemAsync };
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    installColdStartIoTrace({ asyncStorage, secureStore }, 1_000);
    await Promise.all([
      (asyncStorage.getItem as (k: string) => Promise<unknown>)('user_1234567890'),
      (asyncStorage.getItem as (k: string) => Promise<unknown>)('user_987'),
      (secureStore.getItemAsync as (k: string) => Promise<unknown>)('phone_state_lineage_v1_abc'),
    ]);
    expect(getItem).toHaveBeenCalledTimes(2);
    expect(getItemAsync).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1_000);
    const summary = warn.mock.calls.map((c) => String(c[0])).find((line) => line.startsWith('[COLD-START-IO] summary'));
    expect(summary).toBeDefined();
    expect(summary).toContain('calls=3');
    expect(summary).toContain('maxInflight=3');
    expect(summary).toContain('AS.get:user_# n=2');
    expect(summary).toContain('SS.get:phone_state_lineage_v#_abc n=1');
    // После окна — оригиналы на месте, накладных расходов нет.
    expect(asyncStorage.getItem).toBe(getItem);
    expect(secureStore.getItemAsync).toBe(getItemAsync);
    warn.mockRestore();
  });

  // зачем (03.10): пустой multiGet короткозамкнут в охране AsyncStorage и до нативного модуля не доходит — в «calls» его нет.
  test('пустой multiGet не считается обращением к хранилищу, непустой — считается', async () => {
    const multiGet = jest.fn(async (keys: string[]) => keys.map((k) => [k, null]));
    const asyncStorage: Record<string, unknown> = { multiGet };
    const secureStore: Record<string, unknown> = {};
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    installColdStartIoTrace({ asyncStorage, secureStore }, 1_000);
    await (asyncStorage.multiGet as (k: string[]) => Promise<unknown>)([]);
    await (asyncStorage.multiGet as (k: string[]) => Promise<unknown>)(['a']);
    jest.advanceTimersByTime(1_000);
    const line = warn.mock.calls.map((c) => String(c[0])).find((l) => l.startsWith('[COLD-START-IO] summary')) ?? '';
    expect(line).toContain('calls=1');
    warn.mockRestore();
  });

});
