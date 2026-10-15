import { createDisposableAdoption } from './disposable_adoption';
import { scheduleAfterRootNavigationReady } from './paywall_navigation';

import { reportSwallowed, swallowError } from './debug-logger';
import { recordSmartReminderEvent } from './smart_reminder_store';
type NotificationRouter = {
  push: (route: any) => void;
  replace?: (route: any) => void;
  navigate?: (route: any) => void;
};

export type ServerPushTapRoute = Readonly<{ pathname: string; params: Record<string, string> }>;

/**
 * Куда вести тап по серверным пушам Plus и Шпиля (null — тип не наш).
 *
 * зачем: PM-200 — premium_expiry_reminder и spire_* падали в `default` → Главная.
 * Ведём на существующие экраны, новых маршрутов не заводим:
 *  - подписка истекает (kind=subscription) → управление подпиской
 *    (/manage_subscription; без plan/accountGeneration экран сам дотянет план);
 *  - VIP-доступ истекает (kind=vip) → пейвол-диспетчер /premium_modal: VIP
 *    не продлевается в сторе, «управлять» там нечем;
 *  - spire_week_result / spire_zone_warning → вкладка «Сообщество», где живёт
 *    раздел «Шпиль». Отдельного маршрута на сам раздел нет (переключатель
 *    читает только /friends), поэтому открывается вкладка, а не сегмент.
 */
export function serverPushTapRoute(data: Record<string, unknown>): ServerPushTapRoute | null {
  switch (data.type) {
    case 'premium_expiry_reminder':
      return data.kind === 'vip'
        // зачем (Ядро 11.10, «пейвол не открывается»): контекста 'notification_premium_expiry' нет в белом списке —
        // в стор-сборке диспетчер закрывал окно молча (rejectUnknown → dismiss). VIP истекает → честный контекст vip_expired.
        ? { pathname: '/premium_modal', params: { context: 'vip_expired', source: 'notification_premium_expiry' } }
        : { pathname: '/manage_subscription', params: { source: 'notification_premium_expiry' } };
    case 'spire_week_result':
    case 'spire_zone_warning':
    // D191 m03: локальное «Напомнить вечером» ведёт туда же — в раздел Шпиля.
    case 'spire_week_remind':
      // зачем (PM-200): пуш Шпиля открывает сразу раздел «Шпиль» — вкладка «Сообщество»
      // понимает ?section=spire (сессия «Дизайн»); при замке сама вернётся к «Друзьям».
      return { pathname: '/(tabs)/community', params: { section: 'spire', source: String(data.type) } };
    default:
      return null;
  }
}

/**
 * Small cold-start adapter for push taps.
 *
 * The scheduling/lesson catalog implementation lives in notifications.ts and
 * is intentionally loaded later. This adapter keeps the push response listener
 * available without evaluating that whole feature on every app launch.
 */
let devRouteTap: ((data: any) => void) | null = null;

/**
 * DEV (бета-тест Б16): имитация тапа по пушу — тот же разбор (routeTap), что у настоящего тапа. В стор-сборке — false.
 * Зовёт dev_state?notif=<тип>. Обработчик ставит _layout при старте; до этого имитация отклоняется с причиной в журнале.
 */
export function simulateNotificationTapForDev(data: Record<string, unknown>): boolean {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return false;
  if (!devRouteTap) {
    console.warn('[PUSH-TAP-DEV] обработчик тапа ещё не установлен — имитация пропущена'); // guard-ok: причина пропуска
    return false;
  }
  console.log(`[PUSH-TAP-DEV] simulate ${JSON.stringify(data)}`); // guard-ok: dev-трасса
  devRouteTap(data);
  return true;
}

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
  // зачем (R14, Сверка Б16r3 15.10: «PUSH (tabs)» от тапа → третий экземпляр вкладок, его «Сообщество» 12–14 с пустое):
  // цель-вкладка открывается через navigate — он переходит в УЖЕ смонтированные вкладки, а не кладёт новые поверх.
  const navTab = (route: any, reason: string) => {
    scheduleNav(() => {
      const via = typeof router.navigate === 'function' ? 'navigate' : 'push';
      console.log(`[PUSH-TAP] tab_nav ${JSON.stringify({ reason, via, pathname: typeof route === 'string' ? route : route?.pathname })}`); // guard-ok: ветка перехода
      if (router.navigate) router.navigate(route);
      else router.push(route);
    });
  };
  // зачем (бета-тест 15.10, Б16): разбор тапа — одна функция для настоящего тапа и для dev-имитации (тот же путь).
  const routeTap = (data: any): void => {
    // зачем (умное напоминание): открытие по нашему же напоминанию не считаем привычкой, иначе алгоритм закрепит своё время.
    if (data.type === 'reminder' || data.type === 'd1_reminder' || data.type === 'streak_warning') void recordSmartReminderEvent('push_open');
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
      case 'gift_expiring':
        break;
      case 'arena_friend_invite':
      case 'arena_friend_accepted':
      case 'arena_friend_declined':
      case 'arena_friend_cancelled':
      case 'arena_friend_expired':
        // зачем: D83 — клиентская Арена удалена; тап по старому уведомлению
        // дуэли ведёт на Главную, а не в несуществующий маршрут.
        if (__DEV__) console.warn('[D83-ARENA-RETIRED] legacy arena push tap -> home', { type: data.type });
        navTabHome();
        break;
      case 'activity_like':
      case 'friend_nudge':
        navTab({
          pathname: '/(tabs)/friends',
          params: {
            ...(String(data.actorStableUid ?? '').trim() ? { actorStableUid: String(data.actorStableUid).trim() } : {}),
            ...(String(data.eventId ?? '').trim() ? { socialEventId: String(data.eventId).trim() } : {}),
          },
        }, String(data.type));
        break;
      case 'tournament_starting':
        break;
      case 'premium_expiry_reminder':
      case 'spire_week_result':
      case 'spire_zone_warning':
      case 'spire_week_remind': {
        const route = serverPushTapRoute(data);
        if (!route) {
          console.warn('[PUSH-PREFS] tap: no route, fallback home', { type: data.type });
          navTabHome();
          break;
        }
        if (data.type === 'spire_week_result' || data.type === 'spire_zone_warning' || data.type === 'spire_week_remind') {
          // зачем (владелец 11.10): Шпиль скрыт (флаг выключен или интерфейс не ru/uk) — старый пуш ведёт на Главную,
          // а не в «Сообщество» с пустым разделом. Флаг прогреваем до решения: на холодном старте он ещё не прочитан.
          void import('./spire_tab_flag')
            .then(async ({ primeSpireTabFlag, isSpireTabEnabled }) => {
              await primeSpireTabFlag();
              if (isSpireTabEnabled()) {
                navTab(route, String(data.type));
                return;
              }
              console.log('[SPIRE-GATE]', JSON.stringify({ where: 'push_tap', type: String(data.type), action: 'redirect_home' }));
              navTabHome();
            })
            .catch((error: unknown) => {
              console.warn('[SPIRE-GATE] push_tap: замок не прочитан — на Главную', error instanceof Error ? error.message : String(error));
              navTabHome();
            });
          break;
        }
        scheduleNav(() => router.push(route));
        break;
      }
      default:
        navTabHome();
    }
  };
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    devRouteTap = routeTap;
    lifetime.adopt(() => { if (devRouteTap === routeTap) devRouteTap = null; });
  }
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
    } catch (error) { reportSwallowed('notification_tap_handler:setupNotificationTapHandler', error); 
      // The full notifications module will retry handler setup when needed.
    }
    subscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
      if (lifetime.isDisposed()) return;
      const data = response?.notification?.request?.content?.data;
      if (!data?.type) return;
      routeTap(data);
    });
    lifetime.adopt(() => subscription?.remove?.());
  }).catch(swallowError('notification_tap_handler:setupNotificationTapHandler'));

  return () => { lifetime.dispose(); };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() {
  return null;
}
