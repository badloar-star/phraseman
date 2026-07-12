import { productAnalyticsScreenId } from '../app/product_analytics_screen_registry';

describe('product analytics screen registry', () => {
  it.each([
    ['/', 'root'],
    ['/home', 'home'],
    ['/(tabs)/home', 'home'],
    ['/lesson1', 'lesson'],
    ['/lesson/12', 'lesson'],
    ['/arena_game', 'arena_game'],
    ['/friends/secret-user-id', 'friend_profile'],
    ['/manage_subscription', 'manage_subscription'],
  ])('maps %s to %s without leaking parameters', (pathname, expected) => {
    expect(productAnalyticsScreenId(pathname)).toBe(expected);
  });

  it('covers static production screens without exposing route parameters', () => {
    expect(productAnalyticsScreenId('/settings_notifications')).toBe('settings_notifications');
    expect(productAnalyticsScreenId('/personal_plan_theory')).toBe('personal_plan_theory');
  });

  it('maps unknown and malformed routes to a fixed value', () => {
    expect(productAnalyticsScreenId('/private/new-screen/secret')).toBe('unknown_screen');
    expect(productAnalyticsScreenId('https://evil.example/path')).toBe('unknown_screen');
    expect(productAnalyticsScreenId(null)).toBe('unknown_screen');
  });
});
