// зачем (координатор 12.10, обзор R1): откат языка интерфейса был молчаливым. Тост «Не удалось сохранить язык» —
// только при реальном откате (на диске остался прежний язык) и без более нового выбора.
import { act, renderHook } from '@testing-library/react-native';

type Deferred = { promise: Promise<void>; resolve: () => void; reject: (e: Error) => void };
function deferred(): Deferred {
  let resolve!: () => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<void>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

let mockStored: string | null = 'ru';
const mockPersistCalls: Array<{ key: string; value: string; d: Deferred }> = [];
jest.mock('../app/phone_state_preference_bridge', () => ({
  readPortablePreference: jest.fn(async () => mockStored),
  persistPortablePreference: jest.fn((key: string, value: string) => {
    const d = deferred();
    mockPersistCalls.push({ key, value, d });
    return d.promise;
  }),
}));
jest.mock('../app/study_target_lang_dev', () => ({
  resetDevStudyTargetForSpanishUi: jest.fn(async () => undefined),
  emitDevStudyTargetChanged: jest.fn(),
}));
const mockEmit = jest.fn();
jest.mock('../app/events', () => ({
  ...jest.requireActual('../app/events'),
  emitAppEvent: (...a: unknown[]) => mockEmit(...a),
}));

import { LANG_ROLLBACK_TOAST, LangProvider, useLang } from '../components/LangContext';

const flush = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); };
const toastCalls = () => mockEmit.mock.calls.filter((c) => c[0] === 'action_toast');

beforeAll(() => {
  (globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = true;
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterAll(() => jest.restoreAllMocks());
beforeEach(() => {
  mockStored = 'ru';
  mockPersistCalls.length = 0;
  mockEmit.mockClear();
});

async function renderLang() {
  const hook = await renderHook(() => useLang(), { wrapper: LangProvider });
  await flush(); // гидрация app_lang
  expect(hook.result.current.lang).toBe('ru');
  return hook;
}

describe('откат языка интерфейса', () => {
  it('запись не удалась, на диске прежний язык → откат и тост', async () => {
    const { result } = await renderLang();
    let done: Promise<void> | null = null;
    await act(async () => { done = result.current.setLang('uk'); });
    expect(result.current.lang).toBe('uk'); // сразу, до записи
    await act(async () => { mockPersistCalls[0].d.reject(new Error('disk_full')); await done; });
    expect(result.current.lang).toBe('ru');
    expect(toastCalls()).toEqual([['action_toast', LANG_ROLLBACK_TOAST]]);
    expect(LANG_ROLLBACK_TOAST.type).toBe('error');
  });

  it('запись упала, но на диске уже новый язык → язык остаётся, тоста нет', async () => {
    const { result } = await renderLang();
    let done: Promise<void> | null = null;
    await act(async () => { done = result.current.setLang('uk'); });
    mockStored = 'uk';
    await act(async () => { mockPersistCalls[0].d.reject(new Error('mirror_failed')); await done; });
    expect(result.current.lang).toBe('uk');
    expect(toastCalls()).toEqual([]);
  });

  it('пока запись шла, человек выбрал другой язык → отката и тоста нет', async () => {
    const { result } = await renderLang();
    let first: Promise<void> | null = null;
    let second: Promise<void> | null = null;
    await act(async () => { first = result.current.setLang('uk'); });
    await act(async () => { second = result.current.setLang('es'); });
    await act(async () => { mockPersistCalls[0].d.reject(new Error('disk_full')); await first; });
    expect(result.current.lang).toBe('es');
    expect(toastCalls()).toEqual([]);
    await act(async () => { mockPersistCalls[1].d.resolve(); await second; });
    expect(result.current.lang).toBe('es');
  });
});
