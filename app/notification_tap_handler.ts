import { createDisposableAdoption } from './disposable_adoption';
import { emitAppEvent } from './events';
import { scheduleAfterRootNavigationReady } from './paywall_navigation';
import { arenaInviteRouteFromPayload } from './arena_notification_route';

type NotificationRouter = {
  push: (route: any) => void;
  replace?: (route: any) => void;
};

/**
 * Small cold-start adapter for push taps.
 *
 * The scheduling/lesson catalog implementation lives in notifications.ts and
 * is intentionally loaded later. This adapter keeps the push response listener
 * available without evaluating that whole feature on every app launch.
 */
export function setupNotificationTapHandler(router: NotificationRouter): () => void {
  const lifetime = createDisposableAdoption();
  const scheduleNav = (navigate: () => void) => scheduleAfterRootNavigationReady(navigate);
  const navTabHome = () => {
    scheduleNav(() => {
      if (typeof router.replace === 'function') {
        router.replace('/(tabs)/home');
        return;
      }
      router.push('/(tabs)/home');
    });
  };
  let subscription: { remove?: () => void } | null = null;

  void import('expo-notifications').then((Notifications) => {
    if (lifetime.isDisposed()) return;
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });
    } catch {
      // The full notifications module will retry handler setup when needed.
    }
    subscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
      if (lifetime.isDisposed()) return;
      const data = response?.notification?.request?.content?.data;
      if (!data?.type) return;
      switch (data.type) {
        case 'youtube_premiere':
          scheduleNav(() => router.push({
            pathname: '/lingman_videos',
            params: { videoId: String(data.videoId), channelId: String(data.channelId) },
          } as any));
          break;
        case 'streak_warning':
        case 'reminder':
        case 'd1_reminder':
        case 'premium':
        case 'league_overtake':
        case 'phrase_of_day':
        case 'weekly_recap':
        case 'monthly_recap':
          navTabHome();
          break;
        case 'streak_at_risk':
        case 'inactive_return':
        case 'inactive_long':
          scheduleNav(() => {
            if (typeof router.replace === 'function') router.replace('/lessons_list' as any);
            else router.push('/lessons_list' as any);
          });
          break;
        case 'intro_expiring':
        case 'upsell_d4':
        case 'upsell_d7':
        case 'upsell_d14':
          scheduleNav(() => router.push({ pathname: '/premium_modal', params: { context: 'notification_upsell', source: 'notification_upsell' } } as any));
          break;
        case 'max_lesson_reminder':
          scheduleNav(() => router.push({ pathname: '/max_call_prestart', params: { format: 'tutor' } } as any));
          break;
        case 'gift_expiring':
          scheduleNav(() => router.push('/level_gifts_inventory' as any));
          break;
        case 'arena_friend_invite':
        case 'arena_friend_accepted':
        case 'arena_friend_declined':
        case 'arena_friend_cancelled':
        case 'arena_friend_expired':
          scheduleNav(() => {
            router.push(arenaInviteRouteFromPayload(data));
          });
          break;
        case 'activity_like':
        case 'friend_nudge':
          scheduleNav(() => router.push({
            pathname: '/(tabs)/friends',
            params: {
              ...(String(data.actorStableUid ?? '').trim() ? { actorStableUid: String(data.actorStableUid).trim() } : {}),
              ...(String(data.eventId ?? '').trim() ? { socialEventId: String(data.eventId).trim() } : {}),
            },
          }));
          break;
        case 'friend_gift_received':
          emitAppEvent('friend_gift_push_opened');
          scheduleNav(() => router.push('/(tabs)/friends'));
          break;
        case 'friend_gift_thanks':
          scheduleNav(() => router.push('/(tabs)/friends'));
          break;
        case 'tournament_starting':
          break;
        default:
          navTabHome();
      }
    });
    lifetime.adopt(() => subscription?.remove?.());
  }).catch(() => {});

  return () => { lifetime.dispose(); };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() {
  return null;
}
