// зачем (Сверка 21.10, пункт №39, Galaxy A04): «Лёгкий режим» — решение (ручной выбор главнее авто по ОЗУ), флаг, тени без слоёв,
// мгновенный переключатель и журнал [PERF-LITE].
let mockOverride: boolean | null = null;
let mockAutoLowRam = false;
jest.mock('../app/flashcards/low_power', () => ({
  LOW_POWER_OVERRIDE_KEY: 'fc_low_power_override_v1',
  getLowPowerOverride: () => mockOverride,
  isLowPowerDeviceAuto: () => mockAutoLowRam,
  setLowPowerOverride: jest.fn(async (value: boolean | null) => { mockOverride = value; }),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null) },
}));

/* eslint-disable import/first */
import { isLiteModeOn, setLiteModeFlag, subscribeLiteModeFlag } from '../constants/lite_mode_flag';
import { actionShadowStyle, nestedShadowStyle, plateShadowStyle, raisedShadowStyle } from '../constants/liquidGlassShadowStyle';
import { __resetLiteModeForTests, decideLiteMode, initLiteMode, setLiteModeOverride } from '../app/lite_mode';
/* eslint-enable import/first */

const tokens = {
  isLight: false, accent: '#3366ffaa', plateFillFrom: '#111', plateFillTo: '#222', raisedFillFrom: '#333', raisedFillTo: '#444',
  plateShadow: '#000', plateShadowSoft: '#000', nestedShadow: '#000', raisedShadow: '#000', raisedShadowSoft: '#000',
} as never;

describe('решение «Лёгкого режима»', () => {
  test('ручной выбор главнее авто; без выбора решает ОЗУ', () => {
    expect(decideLiteMode(true, false).on).toBe(true);
    expect(decideLiteMode(false, true).on).toBe(false);
    expect(decideLiteMode(null, true)).toMatchObject({ on: true, reason: 'auto_low_ram' });
    expect(decideLiteMode(null, false)).toMatchObject({ on: false, reason: 'auto_off' });
  });
  test('авто можно отключить константой, ручной выбор остаётся', () => {
    expect(decideLiteMode(null, true, false)).toMatchObject({ on: false, reason: 'auto_disabled' });
    expect(decideLiteMode(true, true, false).on).toBe(true);
  });
});

describe('тени в лёгком режиме', () => {
  afterEach(() => setLiteModeFlag(false));
  test('режим выключен — слои есть, включён — пусто, все четыре функции', () => {
    expect(plateShadowStyle(tokens).length).toBeGreaterThan(0);
    expect(nestedShadowStyle(tokens).length).toBeGreaterThan(0);
    expect(raisedShadowStyle(tokens).length).toBeGreaterThan(0);
    expect(actionShadowStyle(tokens).length).toBeGreaterThan(0);
    setLiteModeFlag(true);
    expect(plateShadowStyle(tokens)).toEqual([]);
    expect(nestedShadowStyle(tokens)).toEqual([]);
    expect(raisedShadowStyle(tokens)).toEqual([]);
    expect(actionShadowStyle(tokens)).toEqual([]);
  });
  test('подписчик получает смену, повтор того же значения молчит', () => {
    const seen: boolean[] = [];
    const off = subscribeLiteModeFlag((on) => seen.push(on));
    setLiteModeFlag(true); setLiteModeFlag(true); setLiteModeFlag(false);
    off(); setLiteModeFlag(true);
    expect(seen).toEqual([true, false]);
  });
});

describe('инициализация и переключатель', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    mockOverride = null; mockAutoLowRam = false;
    __resetLiteModeForTests();
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => warn.mockRestore());

  test('ОЗУ < 3 ГБ → режим включается сам и пишет причину в [PERF-LITE]', () => {
    mockAutoLowRam = true;
    initLiteMode();
    expect(isLiteModeOn()).toBe(true);
    const line = warn.mock.calls.map((c) => c.join(' ')).find((text) => text.includes('[PERF-LITE] mode'));
    expect(line).toContain('"reason":"auto_low_ram"');
    expect(line).toContain('"autoLowRam":true');
  });
  test('нормальный телефон → режим выключен', () => {
    initLiteMode();
    expect(isLiteModeOn()).toBe(false);
  });
  test('переключатель меняет флаг мгновенно, до окончания записи', async () => {
    initLiteMode();
    const pending = setLiteModeOverride(true);
    expect(isLiteModeOn()).toBe(true); // синхронно, запись ещё не дождались
    await pending;
    await setLiteModeOverride(false);
    expect(isLiteModeOn()).toBe(false);
  });
  test('ручное «выкл» перекрывает авто на слабом телефоне', async () => {
    mockAutoLowRam = true;
    initLiteMode();
    expect(isLiteModeOn()).toBe(true);
    await setLiteModeOverride(false);
    expect(isLiteModeOn()).toBe(false);
  });
});
