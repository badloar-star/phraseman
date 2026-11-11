// Владелец 11.11: общий тумблер уведомлений глушил все напоминания тем, кто не дал разрешение на первом запуске,
// а потом дал. Миграция записывала master=false («разрешения нет») и после выдачи разрешения он не возвращался.
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIF_PREFS_KEY_PROBE = 'notifications_enabled';
let permissionStatus: 'granted' | 'denied' | 'undetermined' = 'undetermined';
let grantOnRequest = false;

// зачем: «новый запуск» = свежий экземпляр модуля (jest.isolateModules), а у него был бы и свой пустой диск.
// Общий Map за всеми экземплярами заглушки хранилища — диск переживает перезапуск, как на телефоне.
const mockDisk = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => {
  const api = {
    getItem: jest.fn(async (key: string) => (mockDisk.has(key) ? (mockDisk.get(key) as string) : null)),
    setItem: jest.fn(async (key: string, value: string) => { mockDisk.set(key, String(value)); }),
    removeItem: jest.fn(async (key: string) => { mockDisk.delete(key); }),
    multiGet: jest.fn(async (keys: string[]) => keys.map((key) => [key, mockDisk.has(key) ? (mockDisk.get(key) as string) : null])),
    multiSet: jest.fn(async (pairs: [string, string][]) => { pairs.forEach(([key, value]) => mockDisk.set(key, String(value))); }),
    multiRemove: jest.fn(async (keys: string[]) => { keys.forEach((key) => mockDisk.delete(key)); }),
    getAllKeys: jest.fn(async () => [...mockDisk.keys()]),
    clear: jest.fn(async () => { mockDisk.clear(); }),
  };
  return { __esModule: true, default: api, ...api };
});

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  AndroidImportance: { HIGH: 4 },
  getPermissionsAsync: jest.fn(async () => ({ status: permissionStatus, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => {
    if (grantOnRequest) permissionStatus = 'granted';
    return { status: permissionStatus, canAskAgain: true };
  }),
}));

type NotificationsModule = typeof import('../app/notifications');

function freshModule(): NotificationsModule {
  let mod: NotificationsModule | null = null;
  jest.isolateModules(() => { mod = require('../app/notifications') as NotificationsModule; });
  return mod as unknown as NotificationsModule;
}

describe('общий тумблер уведомлений: самолечение для тех, кто его не выключал', () => {
  let logs: string[];
  beforeEach(async () => {
    await AsyncStorage.clear();
    permissionStatus = 'undetermined';
    grantOnRequest = false;
    logs = [];
    jest.spyOn(console, 'warn').mockImplementation((...a: unknown[]) => { logs.push(a.join(' ')); });
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('разрешение выдали в настройках телефона — на следующем запуске тумблер включается сам', async () => {
    const first = freshModule();
    expect((await first.hydrateNotifPrefsFromStorage()).master).toBe(false); // миграция без разрешения

    permissionStatus = 'granted';
    const second = freshModule(); // новый запуск приложения
    expect((await second.hydrateNotifPrefsFromStorage()).master).toBe(true);
    expect(await second.isNotifMasterEnabled()).toBe(true);
    expect(await AsyncStorage.getItem(NOTIF_PREFS_KEY_PROBE)).toBe('true');
    expect(logs.some((l) => l.includes('[NOTIF-PREFS] master_heal') && l.includes('result=enabled'))).toBe(true);
  });

  it('разрешение выдали в системном окне приложения — тумблер включается сразу, без перезапуска', async () => {
    const mod = freshModule();
    expect((await mod.hydrateNotifPrefsFromStorage()).master).toBe(false);

    grantOnRequest = true;
    const result = await mod.requestNotificationPermissionWithFallback();
    expect(result.granted).toBe(true);
    expect(await mod.isNotifMasterEnabled()).toBe(true);
  });

  it('человек сам выключил уведомления — выданное разрешение тумблер НЕ включает', async () => {
    permissionStatus = 'granted';
    const first = freshModule();
    const prefs = await first.hydrateNotifPrefsFromStorage();
    expect(prefs.master).toBe(true);
    await first.saveNotifPrefs({ ...prefs, master: false }); // выключил в настройках приложения

    const second = freshModule();
    expect((await second.hydrateNotifPrefsFromStorage()).master).toBe(false);
    await second.requestNotificationPermissionWithFallback();
    expect(await second.isNotifMasterEnabled()).toBe(false);
    expect(logs.some((l) => l.includes('result=enabled'))).toBe(false);
  });

  it('разрешения по-прежнему нет — тумблер остаётся выключенным', async () => {
    const first = freshModule();
    await first.hydrateNotifPrefsFromStorage();
    const second = freshModule();
    expect((await second.hydrateNotifPrefsFromStorage()).master).toBe(false);
  });
});
