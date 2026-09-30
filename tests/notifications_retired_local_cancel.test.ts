/**
 * PM-201-A1: миграция отменяет УЖЕ запланированные на устройстве локальные уведомления удалённых
 * функций (подарки), а не только перестаёт планировать новые. Проверяем: отмена по сохранённому id и
 * по типу `gift_expiring`, чужие типы не трогаем, повторный старт — no-op, при сбое флаг не ставится
 * (повторим при следующем запуске), недоступный модуль уведомлений не ставит флаг.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GIFT_EXPIRING_NOTIF_ID_KEY,
  RETIRED_LOCAL_NOTIFS_CANCELLED_KEY,
  cancelRetiredLocalNotificationsOnce,
} from '../app/retired_local_notifications';

const storage = AsyncStorage as typeof AsyncStorage & { __reset?: () => void };

const getAll = jest.fn();
const cancel = jest.fn();
const load = jest.fn();

beforeEach(async () => {
  storage.__reset?.();
  getAll.mockReset();
  cancel.mockReset();
  cancel.mockResolvedValue(undefined);
  load.mockReset();
  load.mockResolvedValue({ getAllScheduledNotificationsAsync: getAll, cancelScheduledNotificationAsync: cancel });
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('retired local notifications migration', () => {
  it('cancels the stored gift id and every scheduled gift_expiring, leaves other types alone', async () => {
    await AsyncStorage.setItem(GIFT_EXPIRING_NOTIF_ID_KEY, 'gift-stored');
    getAll.mockResolvedValue([
      { identifier: 'gift-a', content: { data: { type: 'gift_expiring' } } },
      { identifier: 'recap-1', content: { data: { type: 'weekly_recap' } } },
      { identifier: 'no-type', content: { data: {} } },
    ]);

    await cancelRetiredLocalNotificationsOnce(load);

    const cancelledIds = cancel.mock.calls.map((call) => call[0]);
    expect(cancelledIds).toEqual(expect.arrayContaining(['gift-stored', 'gift-a']));
    expect(cancelledIds).not.toContain('recap-1');
    expect(cancelledIds).not.toContain('no-type');
    expect(await AsyncStorage.getItem(GIFT_EXPIRING_NOTIF_ID_KEY)).toBeNull();
    expect(await AsyncStorage.getItem(RETIRED_LOCAL_NOTIFS_CANCELLED_KEY)).toBe('1');
  });

  it('is a no-op on the next launch once done', async () => {
    getAll.mockResolvedValue([]);
    await cancelRetiredLocalNotificationsOnce(load);
    getAll.mockClear();
    cancel.mockClear();
    load.mockClear();

    await cancelRetiredLocalNotificationsOnce(load);

    expect(load).not.toHaveBeenCalled();
    expect(getAll).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
  });

  it('does not set the done flag when the schedule cannot be read, so the next launch retries', async () => {
    getAll.mockRejectedValue(new Error('schedule_unavailable'));

    await cancelRetiredLocalNotificationsOnce(load);

    expect(await AsyncStorage.getItem(RETIRED_LOCAL_NOTIFS_CANCELLED_KEY)).toBeNull();
  });

  it('does not set the done flag when the notifications module is unavailable', async () => {
    load.mockResolvedValue(null);

    await cancelRetiredLocalNotificationsOnce(load);

    expect(await AsyncStorage.getItem(RETIRED_LOCAL_NOTIFS_CANCELLED_KEY)).toBeNull();
  });

  it('shares one run between parallel callers', async () => {
    getAll.mockResolvedValue([]);

    await Promise.all([cancelRetiredLocalNotificationsOnce(load), cancelRetiredLocalNotificationsOnce(load)]);

    expect(getAll).toHaveBeenCalledTimes(1);
  });
});
