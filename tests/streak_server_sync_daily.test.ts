// зачем (§59): серия телефона уходит на сервер не чаще раза в сутки, со списком активных дней.
import * as fs from 'fs';
import * as path from 'path';
import AsyncStorage from '@react-native-async-storage/async-storage';

const submit = jest.fn();
jest.mock('../app/progress_events_client', () => ({ submitProgressEvent: (...args: unknown[]) => submit(...args) }));
jest.mock('../app/foreground_usage_ms', () => ({
  getForegroundDailyMsMap: async () => ({
    '2026-09-29': 120_000, '2026-09-30': 30_000, '2026-10-01': 61_000,
  }),
}));
jest.mock('../app/local_date', () => ({ getLocalDayKey: () => '2026-10-01' }));

import { syncStreakToServerOncePerDay } from '../app/streak_server_sync';

describe('серия → сервер раз в сутки', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    submit.mockReset();
    submit.mockResolvedValue({ streakCount: 6, duplicate: false });
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('отправляет серию и только активные дни (≥ 60 с), второй раз за день — нет', async () => {
    await AsyncStorage.setItem('last_active_date', '2026-10-01');
    await expect(syncStreakToServerOncePerDay(6)).resolves.toBe('sent');
    expect(submit).toHaveBeenCalledWith({
      eventId: 'streak_sync:2026-10-01',
      type: 'streak_sync',
      payload: { clientStreakCount: '6', clientLastActiveDate: '2026-10-01', activeDays: ['2026-09-29', '2026-10-01'] },
    });
    await expect(syncStreakToServerOncePerDay(6)).resolves.toBe('already_sent_today');
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('серию 1 сервер считает сам — не отправляем', async () => {
    await AsyncStorage.setItem('last_active_date', '2026-10-01');
    await expect(syncStreakToServerOncePerDay(1)).resolves.toBe('streak_too_small');
    expect(submit).not.toHaveBeenCalled();
  });

  it('сбой сети — отметку не ставим, повторим', async () => {
    await AsyncStorage.setItem('last_active_date', '2026-10-01');
    submit.mockRejectedValueOnce(new Error('offline'));
    await expect(syncStreakToServerOncePerDay(6)).resolves.toBe('failed');
    await expect(syncStreakToServerOncePerDay(6)).resolves.toBe('sent');
  });

  it('проводка: касание дня запускает отправку, тип есть на клиенте', () => {
    const root = path.join(__dirname, '..');
    expect(fs.readFileSync(path.join(root, 'app/hall_of_fame_utils.ts'), 'utf8')).toMatch(/syncStreakToServerOncePerDay\(streak\)/);
    expect(fs.readFileSync(path.join(root, 'app/progress_events_client.ts'), 'utf8')).toMatch(/\| 'streak_sync'/);
  });
});
