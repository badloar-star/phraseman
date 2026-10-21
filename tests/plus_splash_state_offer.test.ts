// зачем (№35, заставка Plus): локальное состояние (последний показ, отказы подряд) живёт на устройстве, битое хранилище = «не показывали»;
// цена годового Plus — строго из магазина (без «/мес»), а тексты и источник пейвола зарегистрированы.
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

import fs from 'node:fs';
import path from 'node:path';

const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => (mockStore.has(key) ? (mockStore.get(key) as string) : null)),
    setItem: jest.fn(async (key: string, value: string) => { mockStore.set(key, value); }),
  },
}));
jest.mock('react-native', () => ({ Platform: { OS: 'ios', select: (o: Record<string, unknown>) => o.ios ?? o.default } }));
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {},
  INTRO_ELIGIBILITY_STATUS: {
    INTRO_ELIGIBILITY_STATUS_ELIGIBLE: 2, INTRO_ELIGIBILITY_STATUS_INELIGIBLE: 1, INTRO_ELIGIBILITY_STATUS_NO_INTRO_OFFER_EXISTS: 3,
  },
}));
jest.mock('../app/revenuecat_init', () => ({ initRevenueCat: jest.fn(async () => undefined), resolvePremiumPackages: jest.fn(() => ({})) }));

import {
  EMPTY_PLUS_SPLASH_STATE, PLUS_SPLASH_STATE_KEY, parsePlusSplashState, readPlusSplashState, readStoredMs,
  recordPlusSplashAccepted, recordPlusSplashRefusal, recordPlusSplashShown,
} from '../app/plus_splash_state';
import { plusSplashPriceTrim } from '../app/plus_splash_offer';
import { PLUS_SPLASH_BENEFITS, PLUS_SPLASH_COPY } from '../components/plus-splash/plus_splash_copy';
import { PAYWALL_SOURCE_VALUES } from '../app/paywall_entry_contract';

describe('Plus splash local state', () => {
  beforeEach(() => { mockStore.clear(); jest.spyOn(console, 'warn').mockImplementation(() => undefined); });
  afterEach(() => { jest.restoreAllMocks(); });

  it('пустое и битое хранилище → «не показывали», причина в журнале', async () => {
    expect(parsePlusSplashState(null)).toEqual(EMPTY_PLUS_SPLASH_STATE);
    expect(parsePlusSplashState('{oops')).toEqual(EMPTY_PLUS_SPLASH_STATE);
    expect(parsePlusSplashState('42')).toEqual(EMPTY_PLUS_SPLASH_STATE);
    expect(console.warn).toHaveBeenCalled();
    expect(await readPlusSplashState()).toEqual(EMPTY_PLUS_SPLASH_STATE);
  });

  it('чужие и отрицательные значения чистятся; серия отказов ограничена', () => {
    expect(parsePlusSplashState(JSON.stringify({ v: 1, lastShownAtMs: -4, refusalsInRow: -2 }))).toEqual({ v: 1, lastShownAtMs: null, refusalsInRow: 0 });
    expect(parsePlusSplashState(JSON.stringify({ v: 1, lastShownAtMs: 1000, refusalsInRow: 5000 }))).toEqual({ v: 1, lastShownAtMs: 1000, refusalsInRow: 99 });
  });

  it('показ пишет метку времени и не трогает серию отказов; отказ растёт; переход в пейвол обнуляет', async () => {
    let s = await recordPlusSplashShown(1_000, { v: 1, lastShownAtMs: null, refusalsInRow: 2 });
    expect(s).toEqual({ v: 1, lastShownAtMs: 1_000, refusalsInRow: 2 });
    s = await recordPlusSplashRefusal(s);
    expect(s).toEqual({ v: 1, lastShownAtMs: 1_000, refusalsInRow: 3 });
    expect(JSON.parse(mockStore.get(PLUS_SPLASH_STATE_KEY) as string)).toEqual(s);
    s = await recordPlusSplashAccepted(s);
    expect(s).toEqual({ v: 1, lastShownAtMs: 1_000, refusalsInRow: 0 });
    expect(await readPlusSplashState()).toEqual(s);
  });

  it('readStoredMs: число, ISO-дата, пусто и мусор', async () => {
    mockStore.set('a', '1700000000000');
    mockStore.set('b', '2026-10-01T00:00:00.000Z');
    mockStore.set('c', 'не дата');
    mockStore.set('d', '');
    expect(await readStoredMs('a')).toBe(1_700_000_000_000);
    expect(await readStoredMs('b')).toBe(Date.UTC(2026, 9, 1));
    expect(await readStoredMs('c')).toBeNull();
    expect(await readStoredMs('d')).toBeNull();
    expect(await readStoredMs('missing')).toBeNull();
  });
});

describe('Plus splash price and copy', () => {
  it('цена без «/мес»-хвоста, как в пейволе', () => {
    expect(plusSplashPriceTrim('€39,99')).toBe('€39,99');
    expect(plusSplashPriceTrim('€39,99 / month')).toBe('€39,99');
    expect(plusSplashPriceTrim('399 ₽/мес')).toBe('399 ₽');
    expect(plusSplashPriceTrim('')).toBe('');
    expect(plusSplashPriceTrim(undefined)).toBe('');
  });

  it('все тексты заставки есть на 9 языках и не пустые', () => {
    for (const [key, nine] of Object.entries(PLUS_SPLASH_COPY)) {
      expect(nine).toHaveLength(9);
      for (const text of nine) expect(text.trim().length).toBeGreaterThan(0);
      expect(key.length).toBeGreaterThan(0);
    }
  });

  it('четыре выгоды как в эталоне: диалоги, голос, слабые места, без стопов', () => {
    expect(PLUS_SPLASH_BENEFITS.map((b) => b.icon)).toEqual(['chatbubbles', 'mic', 'refresh', 'flash']);
    for (const b of PLUS_SPLASH_BENEFITS) {
      expect(PLUS_SPLASH_COPY[b.title]).toBeDefined();
      expect(PLUS_SPLASH_COPY[b.text]).toBeDefined();
    }
  });

  it('источник пейвола plus_launch_splash зарегистрирован, ключ арбитра plusSplash — в хвосте очереди перед coinsMigration', () => {
    expect(PAYWALL_SOURCE_VALUES).toContain('plus_launch_splash');
    const core = fs.readFileSync(path.join(__dirname, '..', 'components/overlay_arbiter_core.ts'), 'utf8');
    const at = core.indexOf("  'plusSplash',\n  // coinsMigration");
    expect(at).toBeGreaterThan(0);
  });
});
