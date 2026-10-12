/**
 * PM-252 п.3 (04.10): сообщения приложения читаются принудительно только при входе, не на каждом возврате.
 * п.70 №1 (координатор 12.10, аудит FIRESTORE_BOOT_READS_R1): метка «уже форсили» — на диске по stableId, а не в
 * памяти процесса: холодный старт больше не считается входом (было до 240 чтений на каждый запуск).
 */
import fs from 'fs';
import path from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../app/user_id_policy', () => ({
  getCanonicalUserId: jest.fn(async () => 'account-A'),
}));

jest.mock('../app/config', () => ({
  CLOUD_SYNC_ENABLED: true,
  IS_EXPO_GO: false,
}));

import {
  APP_MESSAGES_SCREEN_MIN_INTERVAL_MS,
  claimAppMessagesLoginForce,
  resetAppMessagesLoginForceForTests,
} from '../app/app_messages';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const layout = read('app/_layout.tsx');
const settings = read('app/(tabs)/settings.tsx');

describe('app messages foreground refresh', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    resetAppMessagesLoginForceForTests();
  });

  test('первый вход аккаунта — force; тот же процесс — нет', async () => {
    expect(await claimAppMessagesLoginForce('stable-1')).toEqual({ force: true, source: 'first_login' });
    expect(await claimAppMessagesLoginForce('stable-1')).toEqual({ force: false, source: 'memory' });
  });

  test('холодный старт (новый процесс) с меткой на диске — без force', async () => {
    await claimAppMessagesLoginForce('stable-1');
    resetAppMessagesLoginForceForTests(); // «перезапуск»: память процесса пуста, диск — нет
    expect(await claimAppMessagesLoginForce('stable-1')).toEqual({ force: false, source: 'storage' });
  });

  test('другой аккаунт на том же устройстве — свой первый вход с force', async () => {
    await claimAppMessagesLoginForce('stable-1');
    expect(await claimAppMessagesLoginForce('stable-2')).toEqual({ force: true, source: 'first_login' });
  });

  test('диск не читается — без force (сеть по сроку жизни), причина в журнале', async () => {
    const spy = jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('disk'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      expect(await claimAppMessagesLoginForce('stable-3')).toEqual({ force: false, source: 'storage_read_failed' });
      expect(warn).toHaveBeenCalled();
    } finally {
      spy.mockRestore();
      warn.mockRestore();
    }
  });

  test('корень: решение force берётся из метки на диске, лог печатает её источник', () => {
    expect(layout).toContain('void claimAppMessagesLoginForce(forcedKey)');
    expect(layout).toContain('const isLoginRefresh = decision.force;');
    expect(layout).toContain('markSource: decision.source,');
    expect(layout).toMatch(/refreshAppMessagesSnapshotOnce\(isLoginRefresh\s*\?\s*\{ force: true \}\s*:\s*\{ minIntervalMs: APP_MESSAGES_FOREGROUND_MIN_INTERVAL_MS \}\)/);
    expect(layout).not.toMatch(/refreshAppMessagesSnapshotOnce\(\{ force: true \}\)/);
    expect(layout).not.toContain('appMessagesForcedForStableIds');
  });

  test('later returns hit the network at most every 6 hours — и в «Настройках» тоже', () => {
    expect(layout).toContain('const APP_MESSAGES_FOREGROUND_MIN_INTERVAL_MS = 6 * 60 * 60_000;');
    expect(APP_MESSAGES_SCREEN_MIN_INTERVAL_MS).toBe(6 * 60 * 60_000);
    expect(settings).toContain('refreshAppMessagesSnapshotOnce({ minIntervalMs: APP_MESSAGES_SCREEN_MIN_INTERVAL_MS })');
    expect(settings).not.toContain('refreshAppMessagesSnapshotOnce({ minIntervalMs: 30_000 })');
  });
});
