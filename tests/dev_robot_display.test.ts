// зачем (координатор 13.10, system-015 и settings-gap-028): dev_state?inbox=empty и reminderTime=HH:MM — только показ на экране,
// без записи в хранилище, облако и расписание уведомлений; в стор-сборке установка отклоняется.
import fs from 'node:fs';
import path from 'node:path';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined), removeItem: jest.fn(), multiSet: jest.fn(), multiGet: jest.fn(async () => []), multiRemove: jest.fn() },
}));
jest.mock('../app/cloud_sync', () => ({ ensureAnonUser: jest.fn(async () => undefined), getCurrentUid: () => null, waitForAnonAuth: async () => false }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

import { parseDevStateParams } from '../app/dev_state_fixtures';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('dev_robot_display', () => {
  beforeEach(() => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.dontMock('../app/config');
    jest.resetModules();
  });
  afterEach(() => jest.restoreAllMocks());

  test('parses inbox=empty|off and reminderTime=HH:MM|off; rejects garbage', () => {
    expect(parseDevStateParams({ inbox: 'empty' }).request.inbox).toBe('empty');
    expect(parseDevStateParams({ inbox: 'off' }).request.inbox).toBe('off');
    expect(parseDevStateParams({ reminderTime: '20:00' }).request.reminderTime).toBe('20:00');
    expect(parseDevStateParams({ reminderTime: 'off' }).request.reminderTime).toBe('off');
    expect(parseDevStateParams({ reminderTime: '25:00' }).rejected).toHaveProperty('reminderTime');
    expect(parseDevStateParams({ inbox: 'yes' }).rejected).toHaveProperty('inbox');
  });

  test('in a dev build the flags are set in memory and can be cleared', () => {
    const dev = require('../app/dev_robot_display') as typeof import('../app/dev_robot_display');
    expect(dev.isDevInboxEmpty()).toBe(false);
    expect(dev.setDevInboxEmpty(true)).toBe(true);
    expect(dev.isDevInboxEmpty()).toBe(true);
    expect(dev.parseDevReminderTime('20:00')).toEqual({ hour: 20, minute: 0 });
    expect(dev.parseDevReminderTime('7:5')).toBeNull();
    expect(dev.setDevReminderTime({ hour: 20, minute: 0 })).toBe(true);
    expect(dev.getDevReminderTime()).toEqual({ hour: 20, minute: 0 });
    dev.setDevReminderTime(null);
    dev.setDevInboxEmpty(false);
    expect(dev.getDevReminderTime()).toBeNull();
    expect(dev.isDevInboxEmpty()).toBe(false);
  });

  test('applying the fixture sets both flags', async () => {
    const fixtures = require('../app/dev_state_fixtures') as typeof import('../app/dev_state_fixtures');
    const dev = require('../app/dev_robot_display') as typeof import('../app/dev_robot_display');
    const result = await fixtures.applyDevState({ inbox: 'empty', reminderTime: '20:00' });
    expect(result.applied).toHaveProperty('inbox');
    expect(result.applied).toHaveProperty('reminderTime');
    expect(dev.isDevInboxEmpty()).toBe(true);
    expect(dev.getDevReminderTime()).toEqual({ hour: 20, minute: 0 });
  });

  test('in a store build the setters refuse', () => {
    jest.doMock('../app/config', () => ({ IS_STORE_RELEASE: true, IS_EXPO_GO: false, CLOUD_SYNC_ENABLED: true }));
    const dev = require('../app/dev_robot_display') as typeof import('../app/dev_robot_display');
    expect(dev.setDevInboxEmpty(true)).toBe(false);
    expect(dev.setDevReminderTime({ hour: 20, minute: 0 })).toBe(false);
    expect(dev.isDevInboxEmpty()).toBe(false);
    expect(dev.getDevReminderTime()).toBeNull();
  });

  test('the module has no storage, cloud or scheduling code; screens read the flags only for display', () => {
    const source = read('app/dev_robot_display.ts').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    expect(source).not.toMatch(/AsyncStorage|firebase|firestore|httpsCallable|schedule\w*Notification|dismissAppMessage|fetch\(/);
    expect(read('components/AppMessagesInbox.tsx')).toMatch(/if \(isDevInboxEmpty\(\)\) \{[\s\S]{0,260}setMessages\(\[\]\);\s*setUnreadCount\(0\);\s*return;/);
    const notifications = read('app/notifications.ts');
    expect(notifications).toMatch(/export function getNotifSettingsSnapshot\(\): NotifSettings \{\s*const snapshot = cloneNotif\(notifMemory\);/);
    expect(notifications).toContain('const devTime = getDevReminderTime();');
  });
});
