// зачем (координатор 28.10, жалоба #3: 4 раза за ~50 минут приложение оказывалось на корне «/»): метка холодного старта в журнале обращений —
// app:cold_start:prev_<fg|bg|none>:gap_<корзина>. Проверяем корзины, разбор отметки, формат действия (белый список сервера), поведение при старте:
// событие ждёт активного аккаунта, одна отметка состояния на устройстве, повторная установка ничего не делает.
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: async (key: string) => mockStore.get(key) ?? null,
    setItem: async (key: string, value: string) => { mockStore.set(key, value); },
  },
}));
const mockListeners: Array<(state: string) => void> = [];
const mockAppState = { currentState: 'active', addEventListener: jest.fn((_type: string, cb: (state: string) => void) => { mockListeners.push(cb); return { remove: () => undefined }; }) };
jest.mock('react-native', () => ({ get AppState() { return mockAppState; } })); // геттер: фабрика jest.mock выполняется до объявления const выше
let mockToken: { phase: string; stableId: string | null; generation: number } = { phase: 'active', stableId: 'u1', generation: 1 };
const mockAccountListeners = new Set<(token: unknown) => void>();
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => mockToken,
  subscribeAccountGeneration: (cb: (token: unknown) => void) => { mockAccountListeners.add(cb); return { remove: () => mockAccountListeners.delete(cb) }; },
}));
const mockRecord = jest.fn(async (_event: unknown) => undefined);
jest.mock('../app/support_diagnostics', () => ({ recordSupportDiagnostic: (event: unknown) => mockRecord(event) }));

import {
  COLD_START_LAST_SEEN_KEY,
  coldStartAction,
  coldStartGapBucket,
  installColdStartDiagnostics,
  parseLastSeen,
  resetColdStartDiagnosticsForTests,
} from '../app/cold_start_diagnostics';
import { sanitizeSupportDiagnosticEvent } from '../app/support_diagnostic_schema';

const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

describe('метка холодного старта', () => {
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  beforeEach(() => {
    mockStore.clear();
    mockListeners.length = 0;
    mockAccountListeners.clear();
    mockAppState.addEventListener.mockClear();
    mockAppState.currentState = 'active';
    mockRecord.mockClear();
    mockToken = { phase: 'active', stableId: 'u1', generation: 1 };
    resetColdStartDiagnosticsForTests();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => { logSpy.mockRestore(); warnSpy.mockRestore(); });

  it('корзины паузы между запусками', () => {
    expect(coldStartGapBucket(0)).toBe('lt1m');
    expect(coldStartGapBucket(59_999)).toBe('lt1m');
    expect(coldStartGapBucket(60_000)).toBe('1to10m');
    expect(coldStartGapBucket(10 * 60_000)).toBe('10to60m');
    expect(coldStartGapBucket(60 * 60_000)).toBe('gt1h');
    expect(coldStartGapBucket(null)).toBe('unknown');
    expect(coldStartGapBucket(-5)).toBe('unknown');
  });

  it('разбор отметки: нет — none; fg/bg + время; мусор — none с причиной в журнале', () => {
    expect(parseLastSeen(null)).toEqual({ prev: 'none', atMs: null });
    expect(parseLastSeen(JSON.stringify({ s: 'fg', t: 1234 }))).toEqual({ prev: 'fg', atMs: 1234 });
    expect(parseLastSeen(JSON.stringify({ s: 'bg', t: 'x' }))).toEqual({ prev: 'bg', atMs: null });
    expect(parseLastSeen('{не json')).toEqual({ prev: 'none', atMs: null });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('отметка повреждена'), expect.any(String));
  });

  it('действие проходит белый список сервера (формат, ≤ 80 знаков, нет слова из 20+ знаков) и клиентский санитайзер', () => {
    for (const prev of ['fg', 'bg', 'none'] as const) {
      for (const gap of ['lt1m', '1to10m', '10to60m', 'gt1h', 'unknown'] as const) {
        const action = coldStartAction(prev, gap);
        expect(action.length).toBeLessThanOrEqual(80);
        expect(/^[a-zA-Z][a-zA-Z0-9_.:-]{0,79}$/.test(action)).toBe(true);
        expect(/(?:^|[:._-])[A-Za-z0-9]{20,}(?:$|[:._-])/.test(action)).toBe(false);
        expect(sanitizeSupportDiagnosticEvent({ atMs: Date.now(), event: 'feature_action', action })?.action).toBe(action);
      }
    }
  });

  it('старт после вылета в работе: прошлая отметка fg 3 минуты назад → prev_fg:gap_1to10m, отметка обновляется на текущее состояние', async () => {
    mockStore.set(COLD_START_LAST_SEEN_KEY, JSON.stringify({ s: 'fg', t: Date.now() - 3 * 60_000 }));
    installColdStartDiagnostics();
    await flush();
    expect(mockRecord).toHaveBeenCalledWith(expect.objectContaining({ event: 'feature_action', action: 'app:cold_start:prev_fg:gap_1to10m' }));
    expect(JSON.parse(mockStore.get(COLD_START_LAST_SEEN_KEY) as string)).toMatchObject({ s: 'fg' });
  });

  it('первый запуск: отметки нет → prev_none:gap_unknown; фон/актив ведут отметку; повторная установка пуста', async () => {
    installColdStartDiagnostics();
    installColdStartDiagnostics();
    await flush();
    expect(mockRecord).toHaveBeenCalledTimes(1);
    expect(mockRecord).toHaveBeenCalledWith(expect.objectContaining({ action: 'app:cold_start:prev_none:gap_unknown' }));
    expect(mockAppState.addEventListener).toHaveBeenCalledTimes(1);
    mockListeners[0]!('background');
    await flush();
    expect(JSON.parse(mockStore.get(COLD_START_LAST_SEEN_KEY) as string)).toMatchObject({ s: 'bg' });
    mockListeners[0]!('active');
    await flush();
    expect(JSON.parse(mockStore.get(COLD_START_LAST_SEEN_KEY) as string)).toMatchObject({ s: 'fg' });
  });

  it('аккаунт ещё не активен: событие ждёт активации и пишется один раз', async () => {
    mockToken = { phase: 'uninitialized', stableId: null, generation: 0 };
    installColdStartDiagnostics();
    await flush();
    expect(mockRecord).not.toHaveBeenCalled();
    mockToken = { phase: 'active', stableId: 'u1', generation: 1 };
    for (const cb of [...mockAccountListeners]) cb(mockToken);
    await flush();
    expect(mockRecord).toHaveBeenCalledTimes(1);
    for (const cb of [...mockAccountListeners]) cb(mockToken);
    expect(mockRecord).toHaveBeenCalledTimes(1);
  });

  it('в приложении: установка запускается из trackActivity, в облако метка не уходит', () => {
    const fs = require('node:fs') as typeof import('node:fs');
    const path = require('node:path') as typeof import('node:path');
    const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
    expect(read('app/app_activity.ts')).toContain('installColdStartDiagnostics();');
    expect(read('app/cold_start_diagnostics.ts')).not.toMatch(/fetch\(|httpsCallable|firestore/i);
  });
});
