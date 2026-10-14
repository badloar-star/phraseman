/**
 * зачем (settings-gap-005, координатор 13.10): плашка «Полный доступ на 3 дня» в Настройках видна только при активном пробном
 * доступе. Подмена `introAccess=active` — только память: хранилище пусто, окна приветствия/окончания не всплывают; off — прежнее.
 */
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
(globalThis as { __DEV__?: boolean }).__DEV__ = true;

let AsyncStorage: typeof import('@react-native-async-storage/async-storage').default;

beforeEach(async () => {
  jest.resetModules();
  const storageModule = require('@react-native-async-storage/async-storage');
  AsyncStorage = storageModule.default ?? storageModule;
  await AsyncStorage.clear();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

// зачем (D186, владелец 14.10): «Бонус на старт» выключен — подмена «пробный доступ активен» больше недостижима; удаляется на этапе 2.
test.skip('introAccess=active → пробный доступ активен ≈3 дня, без записи; off → прежнее состояние', async () => {
  const intro = require('../app/intro_full_access') as typeof import('../app/intro_full_access');
  const devState = require('../app/dev_state_fixtures') as typeof import('../app/dev_state_fixtures');
  const now = Date.now();
  expect((await intro.getIntroFullAccessState(now)).active).toBe(false);

  expect(devState.parseDevStateParams({ introAccess: 'maybe' }).rejected).toHaveProperty('introAccess');
  const paywall = require('../app/dev_paywall_state') as typeof import('../app/dev_paywall_state');
  expect(paywall.setDevIntroFullAccess(true, now)).toBe(true);
  const state = await intro.getIntroFullAccessState(now);
  expect(state).toMatchObject({ active: true, welcomeUnseen: false, expiredUnseen: false });
  expect((state.endsAt ?? 0) - now).toBe(3 * 24 * 60 * 60 * 1000);
  expect(await AsyncStorage.getAllKeys()).toEqual([]);

  expect(paywall.setDevIntroFullAccess(false)).toBe(true);
  expect((await intro.getIntroFullAccessState(now)).active).toBe(false);
});
