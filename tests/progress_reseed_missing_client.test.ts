// зачем (Account V2, Пакет 8I): клиент 2.0 при признаке затирания 8G делает ОДИН вызов
// progressReseedMissing с локальным снимком и больше не повторяет; ошибки — в лог с причиной.
import AsyncStorage from '@react-native-async-storage/async-storage';

const callableImpl = jest.fn();
const callableNames: string[] = [];
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: () => ({}),
  httpsCallable: (_functions: unknown, name: string) => {
    callableNames.push(name);
    return (payload: unknown) => callableImpl(payload);
  },
}));
jest.mock('@react-native-firebase/app', () => ({ getApp: () => ({}) }));
jest.mock('../app/cloud_sync', () => ({ ensureAnonUser: jest.fn(async () => 'stable-1') }));
jest.mock('../app/user_id_policy', () => ({ getCanonicalUserId: jest.fn(async () => 'stable-1') }));
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => 1,
  isCurrentAccountGeneration: () => true,
  withAccountTransitionLock: async (fn: () => unknown) => fn(),
}));
jest.mock('../app/phone_state_shadow_adapters', () => ({ recordShadowProgressEvent: jest.fn() }));
jest.mock('../app/phone_state_progress_cutover', () => ({ trySubmitProgressThroughPhoneState: jest.fn() }));
jest.mock('../app/debug-logger', () => ({
  DebugLogger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  reportSwallowed: jest.fn(),
  swallowError: () => () => undefined,
}));

import {
  __progressEventsClientTestHooks,
  detectProgressReseedNeed,
  isProgressReseedLessonKey,
  submitProgressReseed,
} from '../app/progress_events_client';

const MARKER = 'progress_reseed_missing_done_v1:stable-1';

describe('8I клиент — признак затирания', () => {
  let logs: string[];
  beforeEach(async () => {
    await AsyncStorage.clear();
    __progressEventsClientTestHooks.resetRuntimeState();
    callableImpl.mockReset();
    callableNames.length = 0;
    logs = [];
    jest.spyOn(console, 'log').mockImplementation((line: unknown) => { logs.push(String(line)); });
    jest.spyOn(console, 'warn').mockImplementation((line: unknown) => { logs.push(String(line)); });
  });
  afterEach(() => jest.restoreAllMocks());

  it('ключи уроков — те же, что переносит миграция', () => {
    expect(isProgressReseedLessonKey('lesson5_cellIndex')).toBe(true);
    expect(isProgressReseedLessonKey('lesson5_progress')).toBe(true);
    expect(isProgressReseedLessonKey('lesson_progress_v2::fr::lesson3_cellIndex')).toBe(true);
    expect(isProgressReseedLessonKey('lesson_progress_v2::fr::3')).toBe(true);
    expect(isProgressReseedLessonKey('lesson5_best_score')).toBe(false);
    expect(isProgressReseedLessonKey('flashcards_v1')).toBe(false);
  });

  it('облако без уроков, локально уроки есть → нужна дозаливка, и только один раз за процесс', async () => {
    await AsyncStorage.multiSet([['lesson5_cellIndex', '7'], ['lesson5_progress', '[1,0,1]'], ['lesson5_best_score', '90']]);
    const need = await detectProgressReseedNeed('stable-1', { flashcards_v1: null });
    expect(need).toEqual({ snapshot: { lesson5_cellIndex: '7', lesson5_progress: '[1,0,1]', lesson5_best_score: '90' }, localLessonKeys: 2 });
    expect(logs.some((line) => line.includes('[PROGRESS-RESEED] decision=wipe_detected'))).toBe(true);
    await expect(detectProgressReseedNeed('stable-1', {})).resolves.toBeNull();
    expect(logs.some((line) => line.includes('reason=already_attempted_this_process'))).toBe(true);
    for (const line of logs) expect(line).not.toContain('stable-1');
  });

  it('в облаке уроки есть → нет признака (локальное даже не читаем)', async () => {
    await AsyncStorage.setItem('lesson5_cellIndex', '7');
    const multiGet = AsyncStorage.multiGet as jest.Mock;
    multiGet.mockClear();
    await expect(detectProgressReseedNeed('stable-1', { lesson1_cellIndex: '3' })).resolves.toBeNull();
    expect(multiGet).not.toHaveBeenCalled();
  });

  it('локально уроков нет (или только нули) → нет признака', async () => {
    await AsyncStorage.multiSet([['lesson5_cellIndex', '0'], ['lesson5_progress', '[]']]);
    await expect(detectProgressReseedNeed('stable-1', {})).resolves.toBeNull();
    expect(logs.some((line) => line.includes('reason=no_local_lessons'))).toBe(true);
  });

  it('отметка «сделано» → не повторяем даже в новом процессе', async () => {
    await AsyncStorage.multiSet([['lesson5_cellIndex', '7'], [MARKER, '{"outcome":"reseeded"}']]);
    await expect(detectProgressReseedNeed('stable-1', {})).resolves.toBeNull();
    expect(logs.some((line) => line.includes('reason=already_done'))).toBe(true);
  });
});

describe('8I клиент — вызов сервера', () => {
  let logs: string[];
  beforeEach(async () => {
    await AsyncStorage.clear();
    __progressEventsClientTestHooks.resetRuntimeState();
    callableImpl.mockReset();
    callableNames.length = 0;
    logs = [];
    jest.spyOn(console, 'log').mockImplementation((line: unknown) => { logs.push(String(line)); });
    jest.spyOn(console, 'warn').mockImplementation((line: unknown) => { logs.push(String(line)); });
  });
  afterEach(() => jest.restoreAllMocks());

  it('успех: один вызов progressReseedMissing со снимком, отметка поставлена', async () => {
    callableImpl.mockResolvedValue({ data: { ok: true, reseeded: true, reason: 'reseeded', keys: ['lesson5_cellIndex'] } });
    await expect(submitProgressReseed('stable-1', { lesson5_cellIndex: '7' })).resolves.toBe('reseeded');
    expect(callableNames).toEqual(['progressReseedMissing']);
    expect(callableImpl).toHaveBeenCalledTimes(1);
    expect(callableImpl).toHaveBeenCalledWith({ stableId: 'stable-1', progress: { lesson5_cellIndex: '7' } });
    expect(JSON.parse(String(await AsyncStorage.getItem(MARKER)))).toMatchObject({ outcome: 'reseeded' });
    expect(logs.some((line) => line.includes('[PROGRESS-RESEED] result=reseeded written_keys=1'))).toBe(true);
  });

  it('сбой сети: причина в логе, отметки нет (повтор только со следующего запуска)', async () => {
    callableImpl.mockRejectedValue(Object.assign(new Error('network down'), { code: 'functions/unavailable' }));
    await expect(submitProgressReseed('stable-1', { lesson5_cellIndex: '7' })).resolves.toBe('failed');
    expect(await AsyncStorage.getItem(MARKER)).toBeNull();
    expect(logs.some((line) => line.includes('[PROGRESS-RESEED] result=failed reason=functions/unavailable'))).toBe(true);
  });

  it('сервер: rate_limited — отметка ставится (дозаливка уже была за сутки)', async () => {
    callableImpl.mockRejectedValue(Object.assign(new Error('rate_limited'), { code: 'functions/resource-exhausted' }));
    await expect(submitProgressReseed('stable-1', { lesson5_cellIndex: '7' })).resolves.toBe('rate_limited');
    expect(JSON.parse(String(await AsyncStorage.getItem(MARKER)))).toMatchObject({ outcome: 'rate_limited' });
  });

  // C-2 (ревью 8I): unauthenticated — временное (вход ещё не восстановился), не повод закрывать навсегда.
  it('unauthenticated — сбой без отметки, повтор со следующего запуска', async () => {
    callableImpl.mockRejectedValue(Object.assign(new Error('auth_required'), { code: 'functions/unauthenticated' }));
    await expect(submitProgressReseed('stable-1', { lesson5_cellIndex: '7' })).resolves.toBe('failed');
    expect(await AsyncStorage.getItem(MARKER)).toBeNull();
    expect(logs.some((line) => line.includes('[PROGRESS-RESEED] result=failed reason=functions/unauthenticated'))).toBe(true);
  });

  it('еще не выложенная функция (not-found) — сбой без отметки', async () => {
    callableImpl.mockRejectedValue(Object.assign(new Error('NOT_FOUND'), { code: 'functions/not-found' }));
    await expect(submitProgressReseed('stable-1', { lesson5_cellIndex: '7' })).resolves.toBe('failed');
    expect(await AsyncStorage.getItem(MARKER)).toBeNull();
  });

  it('ответ not_wiped — окончательный: отметка, детектор больше не срабатывает', async () => {
    callableImpl.mockResolvedValue({ data: { ok: true, reseeded: false, reason: 'not_wiped', keys: [] } });
    await expect(submitProgressReseed('stable-1', { lesson5_cellIndex: '7' })).resolves.toBe('not_wiped');
    expect(JSON.parse(String(await AsyncStorage.getItem(MARKER)))).toMatchObject({ outcome: 'not_wiped' });
    __progressEventsClientTestHooks.resetRuntimeState();
    await AsyncStorage.setItem('lesson5_cellIndex', '7');
    await expect(detectProgressReseedNeed('stable-1', {})).resolves.toBeNull();
    expect(callableImpl).toHaveBeenCalledTimes(1);
  });

  it('постоянный отказ (чужой uid) — отметка, чтобы не стучаться каждый запуск', async () => {
    callableImpl.mockRejectedValue(Object.assign(new Error('stable_id_mismatch'), { code: 'functions/permission-denied' }));
    await expect(submitProgressReseed('stable-1', { lesson5_cellIndex: '7' })).resolves.toBe('refused');
    expect(JSON.parse(String(await AsyncStorage.getItem(MARKER)))).toMatchObject({ outcome: 'refused' });
  });
});
