/**
 * Время в приложении раскладывается по МЕСТНЫМ календарным дням (координатор 12.11, обход экранов).
 *
 * зачем: счётчик относил время к UTC-дню, а экран серии и строки недели ищут дни по местному календарю (app/local_date.ts).
 * В UTC+2 полчаса после местной полуночи уходили во «вчера», в UTC−5 вечер — в «завтра». Тест падал бы без правки:
 * при UTC-раскладке весь час попадал в один день.
 */
const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStore.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => { mockStore.set(key, value); }),
  },
}));

type AppStateListener = (state: string) => void;
const mockAppState: { currentState: string; listeners: AppStateListener[] } = { currentState: 'active', listeners: [] };
jest.mock('react-native', () => ({
  AppState: {
    get currentState() { return mockAppState.currentState; },
    addEventListener: (_event: string, listener: AppStateListener) => {
      mockAppState.listeners.push(listener);
      return { remove: () => { mockAppState.listeners = mockAppState.listeners.filter((l) => l !== listener); } };
    },
  },
}));
// зачем: process.env.TZ в jest не перечитывается (см. tests/streak_local_date_migration.test.ts) — местный день устройства
// симулируем подменой getLocalDayKey на явный IANA-пояс; запись и чтение счётчика ходят только через неё.
let simulatedZone = 'UTC';
jest.mock('../app/local_date', () => {
  const actual = jest.requireActual('../app/local_date');
  return { ...actual, getLocalDayKey: (date: Date = new Date()) => actual.localDayKeyForTimeZone(date, simulatedZone) };
});
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('../app/smart_reminder_store', () => ({ recordSmartReminderEvent: jest.fn(async () => undefined) }));

const MIN = 60_000;
const DAILY_KEY = 'phraseman_foreground_daily_ms_v1';

async function settle(): Promise<void> {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
}

async function advance(ms: number): Promise<void> {
  for (let left = ms; left > 0; left -= Math.min(MIN, left)) {
    jest.advanceTimersByTime(Math.min(MIN, left));
    await settle();
  }
}

function setAppState(state: string): void {
  mockAppState.currentState = state;
  for (const listener of [...mockAppState.listeners]) listener(state);
}

/** Час в приложении через местную полночь 10→11 ноября, начиная за 30 минут до неё. */
async function runHourAcrossLocalMidnight(startUtcMs: number): Promise<Record<string, number>> {
  jest.setSystemTime(startUtcMs);
  const mod = await import('../app/foreground_usage_ms');
  const uninstall = mod.installForegroundUsageMsTracker();
  await advance(60 * MIN);
  setAppState('background');
  await settle();
  uninstall();
  const map = await mod.getForegroundDailyMsMap();
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, Math.round(v / MIN)]));
}

describe('время в приложении: местный календарный день', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    mockStore.clear();
    mockAppState.currentState = 'active';
    mockAppState.listeners = [];
  });

  afterEach(() => {
    jest.useRealTimers();
    simulatedZone = 'UTC';
  });

  it('UTC+2 (Киев): 23:30–00:30 местного — по 30 мин на 10 и 11 ноября (по UTC весь час был бы 10-м)', async () => {
    simulatedZone = 'Europe/Kyiv';
    // 23:30 по Киеву 10.11 = 21:30 UTC 10.11
    expect(await runHourAcrossLocalMidnight(Date.UTC(2026, 10, 10, 21, 30))).toEqual({ '2026-11-10': 30, '2026-11-11': 30 });
  });

  it('UTC−5 (Нью-Йорк): 23:30–00:30 местного — по 30 мин на 10 и 11 ноября (по UTC весь час был бы 11-м)', async () => {
    simulatedZone = 'America/New_York';
    // 23:30 в Нью-Йорке 10.11 = 04:30 UTC 11.11
    expect(await runHourAcrossLocalMidnight(Date.UTC(2026, 10, 11, 4, 30))).toEqual({ '2026-11-10': 30, '2026-11-11': 30 });
  });

  it('старые записи (UTC-эпоха) читаются как есть, новое время добавляется к тому же дню', async () => {
    simulatedZone = 'Europe/Kyiv';
    mockStore.set(DAILY_KEY, JSON.stringify({ '2026-11-09': 45 * MIN, '2026-11-10': 10 * MIN }));
    // 12:00 по Киеву 10.11 — середина дня, полночь не пересекается
    const map = await runHourAcrossLocalMidnight(Date.UTC(2026, 10, 10, 10, 0));
    expect(map).toEqual({ '2026-11-09': 45, '2026-11-10': 70 });
  });

  it('«последние 7 дней» недельной суммы — местные дни', async () => {
    simulatedZone = 'Europe/Kyiv';
    // 00:30 по Киеву 11.11 = 22:30 UTC 10.11: «сегодня» — 11-е; 04.11 в окно не входит, 05.11 входит
    jest.setSystemTime(Date.UTC(2026, 10, 10, 22, 30));
    mockStore.set(DAILY_KEY, JSON.stringify({ '2026-11-04': 100 * MIN, '2026-11-05': 7 * MIN, '2026-11-11': 3 * MIN }));
    const { getLast7DaysTimeMs } = await import('../app/daily_analytics_sync');
    expect(Math.round((await getLast7DaysTimeMs()) / MIN)).toBe(10);
  });
});
