// Аудит Optimistic UI 15.10, дыра №1: сбой записи настроек уведомлений не оставляет новое значение в памяти и не глотается молча.
import fs from 'node:fs';
import path from 'node:path';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getNotifPrefsSnapshot,
  getNotifSettingsSnapshot,
  hydrateNotifPrefsFromStorage,
  saveNotifPrefs,
  saveNotifSettings,
} from '../app/notifications';

describe('сохранение настроек уведомлений — откат при сбое диска', () => {
  let logs: string[];
  beforeEach(async () => {
    await AsyncStorage.clear();
    logs = [];
    jest.spyOn(console, 'warn').mockImplementation((...a: unknown[]) => { logs.push(a.join(' ')); });
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('saveNotifPrefs: диск отказал — память прежняя, ошибка наверх, причина в журнале', async () => {
    await hydrateNotifPrefsFromStorage();
    const before = getNotifPrefsSnapshot();
    const setItem = jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk_full'));
    await expect(saveNotifPrefs({ ...before, master: !before.master })).rejects.toThrow('disk_full');
    expect(getNotifPrefsSnapshot().master).toBe(before.master);
    expect(setItem).toHaveBeenCalled();
    expect(logs.some((l) => l.includes('[NOTIF-PREFS] save_failed memory=restored'))).toBe(true);
  });

  it('saveNotifSettings: диск отказал — память прежняя, ошибка наверх', async () => {
    const before = JSON.stringify(getNotifSettingsSnapshot());
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk_full'));
    const current = getNotifSettingsSnapshot();
    const next = { schedule: { ...current.schedule, 0: { enabled: !current.schedule[0]?.enabled, hour: 7, minute: 15 } } };
    await expect(saveNotifSettings(next)).rejects.toThrow('disk_full');
    expect(JSON.stringify(getNotifSettingsSnapshot())).toBe(before);
    expect(logs.some((l) => l.includes('[NOTIF-SCHEDULE] save_failed memory=restored'))).toBe(true);
  });

  it('экран: сбой после сохранения возвращает прежний выбор и в хранилище', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app/settings_notifications.tsx'), 'utf8').replace(/\r\n/g, '\n');
    expect(src).toContain('await saveNotifPrefs(prevPrefs).catch(');
    expect(src).toContain('await saveNotifSettings(prevS).catch(');
    expect(src.match(/savedToDisk = true;/g)).toHaveLength(2);
  });
});
