import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MAX_YOUTUBE_PREMIERE_REMINDERS,
  buildYoutubePremiereReminderTrigger,
  loadYoutubePremiereReminders,
  openYoutubePremiereNotificationSettings,
  pruneYoutubePremiereReminders,
  reconcileYoutubePremiereReminders,
  requestYoutubePremiereReminderFromTap,
  type YoutubePremiereNotificationDependencies,
} from '../app/youtube_premiere_notifications';

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage> & { __reset?: () => void };
const nowMs = Date.parse('2026-08-08T12:00:00.000Z');

function dependencies(overrides: Partial<YoutubePremiereNotificationDependencies> = {}): YoutubePremiereNotificationDependencies {
  return {
    isMasterEnabled: jest.fn(async () => true),
    requestPermission: jest.fn(async () => ({ granted: true, blocked: false })),
    schedule: jest.fn(async () => 'notification-new'),
    cancel: jest.fn(async () => {}),
    openSettings: jest.fn(async () => {}),
    ...overrides,
  };
}

const premiere = {
  videoId: 'abcdefghijk',
  channelId: 'english',
  title: 'Big premiere',
  scheduledStartTime: '2026-08-08T13:00:00.000Z',
};

describe('YouTube premiere reminders', () => {
  beforeEach(() => storage.__reset?.());

  it('calculates ten-minutes-before, at-start and past boundaries', () => {
    expect(buildYoutubePremiereReminderTrigger('2026-08-08T13:00:00.000Z', nowMs)).toEqual({
      triggerAtMs: Date.parse('2026-08-08T12:50:00.000Z'), mode: 'ten_minutes_before',
    });
    expect(buildYoutubePremiereReminderTrigger('2026-08-08T12:05:00.000Z', nowMs)).toEqual({
      triggerAtMs: Date.parse('2026-08-08T12:05:00.000Z'), mode: 'at_start',
    });
    expect(buildYoutubePremiereReminderTrigger('2026-08-08T12:00:00.000Z', nowMs)).toBeNull();
    expect(buildYoutubePremiereReminderTrigger('invalid', nowMs)).toBeNull();
  });

  it('requests permission only from the explicit tap flow and respects master off', async () => {
    const off = dependencies({ isMasterEnabled: jest.fn(async () => false) });
    await expect(requestYoutubePremiereReminderFromTap(premiere, { nowMs, dependencies: off })).resolves.toEqual({ ok: false, reason: 'master_disabled' });
    expect(off.requestPermission).not.toHaveBeenCalled();
    expect(off.schedule).not.toHaveBeenCalled();

    const allowed = dependencies();
    await requestYoutubePremiereReminderFromTap(premiere, { nowMs, dependencies: allowed });
    expect(allowed.requestPermission).toHaveBeenCalledTimes(1);
    expect(allowed.schedule).toHaveBeenCalledWith(expect.objectContaining({
      type: 'youtube_premiere', videoId: premiere.videoId, channelId: premiere.channelId,
      triggerAtMs: Date.parse('2026-08-08T12:50:00.000Z'),
    }));
  });

  it('returns blocked state without opening Settings until a second confirmed action', async () => {
    const deps = dependencies({ requestPermission: jest.fn(async () => ({ granted: false, blocked: true })) });
    await expect(requestYoutubePremiereReminderFromTap(premiere, { nowMs, dependencies: deps })).resolves.toEqual({ ok: false, reason: 'permission_blocked' });
    expect(deps.openSettings).not.toHaveBeenCalled();
    await openYoutubePremiereNotificationSettings(deps);
    expect(deps.openSettings).toHaveBeenCalledTimes(1);
  });

  it('idempotently replaces the previous notification for the same video', async () => {
    const first = dependencies({ schedule: jest.fn(async () => 'notification-1') });
    await requestYoutubePremiereReminderFromTap(premiere, { nowMs, dependencies: first });
    const second = dependencies({ schedule: jest.fn(async () => 'notification-2') });
    await requestYoutubePremiereReminderFromTap(premiere, { nowMs, dependencies: second });
    expect(second.cancel).toHaveBeenCalledWith('notification-1');
    expect((await loadYoutubePremiereReminders(nowMs))[0].notificationId).toBe('notification-2');
  });

  it('reschedules moved premieres and cancels hidden/completed/removed ones without asking permission', async () => {
    const initial = dependencies({ schedule: jest.fn(async () => 'old-id') });
    await requestYoutubePremiereReminderFromTap(premiere, { nowMs, dependencies: initial });

    const moved = dependencies({ schedule: jest.fn(async () => 'moved-id') });
    await reconcileYoutubePremiereReminders([{ ...premiere, scheduledStartTime: '2026-08-08T14:00:00.000Z', state: 'upcoming' }], { nowMs, dependencies: moved });
    expect(moved.requestPermission).not.toHaveBeenCalled();
    expect(moved.cancel).toHaveBeenCalledWith('old-id');
    expect((await loadYoutubePremiereReminders(nowMs))[0].notificationId).toBe('moved-id');

    const completed = dependencies();
    await reconcileYoutubePremiereReminders([{ ...premiere, scheduledStartTime: '2026-08-08T14:00:00.000Z', state: 'completed' }], { nowMs, dependencies: completed });
    expect(completed.cancel).toHaveBeenCalledWith('moved-id');
    expect(await loadYoutubePremiereReminders(nowMs)).toEqual([]);
  });

  it('bounds storage to 20 future reminders', () => {
    const oversized = Array.from({ length: 30 }, (_, index) => ({
      videoId: `video-${index}`,
      channelId: 'english',
      scheduledStartTime: new Date(nowMs + (index + 1) * 60_000).toISOString(),
      notificationId: `notification-${index}`,
    }));
    const pruned = pruneYoutubePremiereReminders(oversized, nowMs);
    expect(pruned).toHaveLength(MAX_YOUTUBE_PREMIERE_REMINDERS);
    expect(pruned[0].videoId).toBe('video-0');
    expect(pruned[19].videoId).toBe('video-19');
  });
});
