// зачем (150, Maestro 05.11): dev_state plus=on → список показывал урок 11 «Открыт», а меню (проверенный статус, без dev-подмены) бросало на пейвол,
// пейвол сразу закрывался (человек уже Plus) — урок не открывался. Меню в dev-сборке считает подмену «granted» подпиской; в стор-сборке — нет.
import fs from 'node:fs';
import path from 'node:path';

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return { __esModule: true, default: {
    getItem: async (k: string) => store.get(k) ?? null,
    setItem: async (k: string, v: string) => { store.set(k, v); },
    removeItem: async (k: string) => { store.delete(k); },
    multiGet: async (ks: string[]) => ks.map((k) => [k, store.get(k) ?? null]),
  } };
});
jest.mock('../app/config', () => ({ ENABLE_DEV_TOOLS: true, IS_STORE_RELEASE: false }));
jest.mock('../app/events', () => ({ emitAppEvent: jest.fn() }));
jest.mock('../app/dev_paywall_state', () => ({ getDevLessonGates: () => ({}) }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { devPlusGrantsAccess, getDevLocalPlusStorageKey } from '../app/dev_plus_controls';

const menu = fs.readFileSync(path.join(__dirname, '..', 'app/lesson_menu.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('меню урока: dev-подмена Plus', () => {
  it('«granted» → доступ есть; нет подмены / removed / нет аккаунта → нет', async () => {
    await AsyncStorage.setItem(getDevLocalPlusStorageKey('acc-1'), 'granted');
    await AsyncStorage.setItem(getDevLocalPlusStorageKey('acc-2'), 'removed');
    expect(await devPlusGrantsAccess('acc-1')).toBe(true);
    expect(await devPlusGrantsAccess('acc-2')).toBe(false);
    expect(await devPlusGrantsAccess('acc-3')).toBe(false);
    expect(await devPlusGrantsAccess(null)).toBe(false);
  });
  it('меню берёт подмену только если проверенного статуса нет и пишет источник', () => {
    expect(menu).toContain('const premiumVerified = await getVerifiedPremiumStatus();');
    expect(menu).toContain('premiumVerified ? false : await devPlusGrantsAccess(');
    expect(menu).toContain('const premiumNow = premiumVerified || devPlusGrant;');
    expect(menu).toContain('[LESSON-MENU] premium_source');
  });
});
