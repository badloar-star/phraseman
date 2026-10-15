// (Б) координатор 15.10 / ревью Авторизации: выход в офлайне оставлял push-токен A в документе A — пуши A шли на телефон B.
// Метка «погасить токен устройства» выполняется первым шагом регистрации токена, до записи токена за нового владельца.
const mockSet = jest.fn(async (_data: unknown, _opts: unknown) => undefined);
const mockUnregister = jest.fn(async () => undefined);
jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: () => ({ collection: () => ({ doc: () => ({ set: (data: unknown, opts: unknown) => mockSet(data, opts) }) }) }),
}));
jest.mock('expo-notifications', () => ({
  unregisterForNotificationsAsync: () => mockUnregister(),
  getPermissionsAsync: async () => ({ status: 'granted' }),
  getExpoPushTokenAsync: async () => ({ data: 'ExponentPushToken[new-device-token]' }),
}));
jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false }));
jest.mock('../app/cloud_sync', () => ({
  ensureAnonUser: async () => 'stable_owner_b',
  ensureStableAuthLinkForStableId: async () => true,
}));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));

import fs from 'node:fs';
import path from 'node:path';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  markPushTokenRotationPending,
  registerPushTokenForServerPush,
  retryPendingPushTokenRotation,
} from '../app/push_token_registration';

const MARK = 'push_token_rotate_pending_v1';

describe('погасить токен устройства после невышедшего снятия push A', () => {
  let logs: string[];
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockSet.mockClear();
    mockUnregister.mockReset();
    mockUnregister.mockImplementation(async () => undefined);
    logs = [];
    jest.spyOn(console, 'log').mockImplementation((...a: unknown[]) => { logs.push(a.join(' ')); });
    jest.spyOn(console, 'warn').mockImplementation((...a: unknown[]) => { logs.push(a.join(' ')); });
  });
  afterEach(() => jest.restoreAllMocks());

  it('без метки — ничего не гасит', async () => {
    expect(await retryPendingPushTokenRotation('test')).toBe('none');
    expect(mockUnregister).not.toHaveBeenCalled();
  });

  it('метка → регистрация сначала гасит токен устройства, потом пишет новый за B', async () => {
    await AsyncStorage.setItem('expo_push_token_last_written', 'stable_owner_a:ExponentPushToken[old]:ru:UTC');
    await markPushTokenRotationPending('switch_clear_failed');
    expect(await registerPushTokenForServerPush('ru')).toBe(true);
    expect(mockUnregister).toHaveBeenCalledTimes(1);
    expect(mockUnregister.mock.invocationCallOrder[0]).toBeLessThan(mockSet.mock.invocationCallOrder[0]);
    expect(await AsyncStorage.getItem(MARK)).toBeNull();
    expect(logs.some((l) => l.includes('[ACC-SWITCH-WIPE] push_cleanup_retry result=rotated source=register'))).toBe(true);
  });

  it('офлайн: гашение не вышло — токен за B не пишется, метка ждёт; после 3 неудач снимается, пуши B не теряются', async () => {
    mockUnregister.mockImplementation(async () => { throw new Error('offline'); });
    await markPushTokenRotationPending('switch_cap_timeout');
    expect(await registerPushTokenForServerPush('ru')).toBe(false);
    expect(mockSet).not.toHaveBeenCalled();
    expect(await retryPendingPushTokenRotation('test')).toBe('still_pending');
    expect(await retryPendingPushTokenRotation('test')).toBe('gave_up');
    expect(await AsyncStorage.getItem(MARK)).toBeNull();
    expect(logs.some((l) => l.includes('push_register skipped reason=previous_token_rotation_pending'))).toBe(true);
    expect(logs.some((l) => l.includes('push_cleanup_retry result=gave_up'))).toBe(true);
  });

  it('выход/смена: токен не снят (офлайн, отказ, потолок) → метка; снят — метки нет', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app/auth_provider.ts'), 'utf8').replace(/\r\n/g, '\n');
    const fn = src.slice(src.indexOf('async function clearAccountPushBeforeSwitchSignOut'), src.indexOf('async function performCurrentProviderSignOut'));
    expect(fn).toContain("if (cleared === 'not_cleared') throw new Error('push_token_not_cleared');");
    expect(fn).toContain("if (!result.includes('push_token:ok')) {");
    expect(fn).toContain('markPushTokenRotationPending(');
    // смена аккаунта не зовёт ensureAnonUser: владелец явно, второй снимок токена в cancelAllNotifications выключен
    expect(fn).toContain('clearPushTokenForServerPush({ ownerStableId })');
    expect(fn).toContain('cancelAllNotifications({ skipServerTokenClear: true })');
  });
});
