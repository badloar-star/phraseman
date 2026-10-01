// PM-200: тап по серверным пушам Plus/Шпиля ведёт на существующие экраны, а не на Главную.
import { serverPushTapRoute } from '../app/notification_tap_handler';

describe('serverPushTapRoute (PM-200)', () => {
  it('подписка истекает -> управление подпиской', () => {
    expect(serverPushTapRoute({ type: 'premium_expiry_reminder', kind: 'subscription' })).toEqual({
      pathname: '/manage_subscription',
      params: { source: 'notification_premium_expiry' },
    });
  });
  it('VIP истекает -> пейвол-диспетчер', () => {
    expect(serverPushTapRoute({ type: 'premium_expiry_reminder', kind: 'vip' })?.pathname).toBe('/premium_modal');
  });
  it('пуши Шпиля -> вкладка «Сообщество»', () => {
    expect(serverPushTapRoute({ type: 'spire_week_result' })?.pathname).toBe('/(tabs)/community');
    expect(serverPushTapRoute({ type: 'spire_zone_warning' })?.pathname).toBe('/(tabs)/community');
    expect(serverPushTapRoute({ type: 'spire_week_result' })?.params).toEqual(expect.objectContaining({ section: 'spire' }));
  });
  it('чужие типы не перехватывает', () => {
    expect(serverPushTapRoute({ type: 'friend_nudge' })).toBeNull();
    expect(serverPushTapRoute({})).toBeNull();
  });
});
