import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getPremierePresentation,
  markPremiereIntroSeen,
  shouldPlayPremiereIntro,
} from '../app/youtube_premiere_runtime';
import {
  loadYoutubePremiereReminders,
  reconcileYoutubePremiereReminders,
  requestYoutubePremiereReminderFromTap,
  type YoutubePremiereNotificationDependencies,
} from '../app/youtube_premiere_notifications';

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage> & { __reset?: () => void };

function dependencies(notificationId: string): YoutubePremiereNotificationDependencies {
  return {
    isMasterEnabled: jest.fn(async () => true),
    requestPermission: jest.fn(async () => ({ granted: true, blocked: false })),
    schedule: jest.fn(async () => notificationId),
    cancel: jest.fn(async () => {}),
    openSettings: jest.fn(async () => {}),
  };
}

describe('YouTube premiere lifecycle integration', () => {
  beforeEach(() => storage.__reset?.());

  it('moves from countdown through reminder reschedule, live intro and completed feed state', async () => {
    const nowMs = Date.parse('2026-08-08T12:00:00.000Z');
    const event = {
      videoId: 'abcdefghijk',
      channelId: 'english',
      title: 'Premium premiere',
      scheduledStartTime: '2026-08-08T13:00:00.000Z',
    };

    expect(getPremierePresentation('upcoming', event.scheduledStartTime, nowMs)).toMatchObject({
      kind: 'countdown', remainingMs: 3_600_000,
    });

    const initialDeps = dependencies('notification-initial');
    await expect(requestYoutubePremiereReminderFromTap(event, { nowMs, dependencies: initialDeps }))
      .resolves.toMatchObject({ ok: true, mode: 'ten_minutes_before' });

    const movedStart = '2026-08-08T14:00:00.000Z';
    const movedDeps = dependencies('notification-moved');
    await reconcileYoutubePremiereReminders([
      { ...event, scheduledStartTime: movedStart, state: 'upcoming' },
    ], { nowMs, dependencies: movedDeps });
    expect(movedDeps.cancel).toHaveBeenCalledWith('notification-initial');
    expect(await loadYoutubePremiereReminders(nowMs)).toEqual([
      expect.objectContaining({ notificationId: 'notification-moved', scheduledStartTime: movedStart }),
    ]);

    expect(getPremierePresentation('live', movedStart, Date.parse(movedStart))).toEqual({ kind: 'live' });
    expect(shouldPlayPremiereIntro({}, event.videoId, nowMs)).toBe(true);
    const seen = markPremiereIntroSeen({}, event.videoId, nowMs);
    expect(shouldPlayPremiereIntro(seen, event.videoId, nowMs)).toBe(false);

    const completedDeps = dependencies('unused');
    await reconcileYoutubePremiereReminders([
      { ...event, scheduledStartTime: movedStart, state: 'completed' },
    ], { nowMs, dependencies: completedDeps });
    expect(await loadYoutubePremiereReminders(nowMs)).toEqual([]);
    expect(getPremierePresentation('completed', movedStart, Date.parse(movedStart) + 1)).toEqual({ kind: 'none' });
    expect([{ id: event.videoId, state: 'completed' }]).toContainEqual(expect.objectContaining({ id: event.videoId }));
  });
});
