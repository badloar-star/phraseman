// зачем (Сверка 21.10, пункт №39, Galaxy A04): «Лёгкий режим» — решение (ручной выбор главнее авто по ОЗУ), флаг, тени без слоёв,
// мгновенный переключатель и журнал [PERF-LITE]. Владелец и координатор 22.10 (план home_first_frame_effects, шаг 1): в стор-сборке
// авто — ещё и эмулятор; в dev-сборке авто выключено (эмулятор Сверки — с тенями), ссылка ?lite=auto|on|off; журнал [HOME-LITE].
let mockOverride: boolean | null = null;
let mockAutoLowRam = false;
jest.mock('../app/flashcards/low_power', () => ({
  LOW_POWER_OVERRIDE_KEY: 'fc_low_power_override_v1',
  getLowPowerOverride: () => mockOverride,
  isLowPowerDeviceAuto: () => mockAutoLowRam,
  setLowPowerOverride: jest.fn(async (value: boolean | null) => { mockOverride = value; }),
}));
// зачем: сборка (ENABLE_DEV_TOOLS) и эмулятор (expo-device isDevice) — значения задаёт сам тест; по умолчанию стор-сборка на телефоне
let mockDevTools = false;
let mockIsDevice = true;
jest.mock('../app/config', () => ({ get ENABLE_DEV_TOOLS() { return mockDevTools; } }));
jest.mock('expo-device', () => ({ get isDevice() { return mockIsDevice; }, totalMemory: null }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null) },
}));

/* eslint-disable import/first */
import { isLiteModeOn, setLiteModeFlag, subscribeLiteModeFlag } from '../constants/lite_mode_flag';
import { actionShadowStyle, nestedShadowStyle, plateShadowStyle, raisedShadowStyle } from '../constants/liquidGlassShadowStyle';
import { __resetLiteModeForTests, decideLiteMode, initLiteMode, setLiteModeDevLink, setLiteModeOverride } from '../app/lite_mode';
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
  test('стор-сборка: эмулятор — тоже авто; мало ОЗУ главнее как причина; ручное «выкл» перекрывает эмулятор', () => {
    expect(decideLiteMode(null, false, true, true)).toMatchObject({ on: true, reason: 'auto_emulator', emulator: true });
    expect(decideLiteMode(null, true, true, true)).toMatchObject({ on: true, reason: 'auto_low_ram' });
    expect(decideLiteMode(false, false, true, true)).toMatchObject({ on: false, reason: 'override_off' });
    expect(decideLiteMode(null, false, false, true)).toMatchObject({ on: false, reason: 'auto_disabled' });
  });
  test('dev-сборка: авто выключено, ссылка lite=auto включает авто, lite=on / off — принудительно; в стор-сборке dev-причин не бывает', () => {
    const dev = (link: 'auto' | 'on' | 'off' | null) => ({ build: true, link });
    expect(decideLiteMode(null, true, true, true, dev(null))).toMatchObject({ on: false, reason: 'dev_default_off' });
    expect(decideLiteMode(null, true, true, false, dev('auto'))).toMatchObject({ on: true, reason: 'auto_low_ram' });
    expect(decideLiteMode(null, false, true, true, dev('auto'))).toMatchObject({ on: true, reason: 'auto_emulator' });
    expect(decideLiteMode(false, false, true, false, dev('on'))).toMatchObject({ on: true, reason: 'dev_on' });
    expect(decideLiteMode(true, true, true, true, dev('off'))).toMatchObject({ on: false, reason: 'dev_off' });
    expect(decideLiteMode(true, false, true, false, dev(null))).toMatchObject({ on: true, reason: 'override_on' });
    for (const link of ['auto', 'on', 'off', null] as const) for (const ram of [true, false]) for (const emu of [true, false]) for (const ov of [true, false, null]) {
      expect(['dev_on', 'dev_off', 'dev_default_off']).not.toContain(decideLiteMode(ov, ram, true, emu, { build: false, link }).reason);
    }
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
    mockOverride = null; mockAutoLowRam = false; mockIsDevice = true; mockDevTools = false;
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
  test('стор-сборка, эмулятор → режим включается сам, причина в [HOME-LITE]', () => {
    mockIsDevice = false;
    initLiteMode();
    expect(isLiteModeOn()).toBe(true);
    const line = warn.mock.calls.map((c) => c.join(' ')).find((text) => text.includes('[HOME-LITE]'));
    expect(line).toContain('"reason":"auto_emulator"');
  });
  test('dev-сборка: эмулятор Сверки с тенями (dev_default_off); ссылка lite=auto включает авто-Lite; в стор-сборке ссылка не действует', () => {
    mockDevTools = true; mockIsDevice = false; mockAutoLowRam = true;
    initLiteMode();
    expect(isLiteModeOn()).toBe(false);
    expect(warn.mock.calls.map((c) => c.join(' ')).find((text) => text.includes('[HOME-LITE]'))).toContain('"reason":"dev_default_off"');
    setLiteModeDevLink('auto');
    expect(isLiteModeOn()).toBe(true);
    mockDevTools = false;
    setLiteModeDevLink('off');
    expect(isLiteModeOn()).toBe(true);
    expect(warn.mock.calls.map((c) => c.join(' ')).some((text) => text.includes('dev_link_ignored'))).toBe(true);
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
