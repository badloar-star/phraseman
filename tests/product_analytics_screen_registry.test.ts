import { productAnalyticsScreenId } from '../app/product_analytics_screen_registry';

describe('product analytics screen registry', () => {
  it.each([
    ['/', 'root'],
    ['/home', 'home'],
    ['/(tabs)/home', 'home'],
    ['/lesson1', 'lesson'],
    ['/lesson/12', 'lesson'],
    ['/friends/secret-user-id', 'friend_profile'],
    ['/arena', 'arena'],
    ['/arena_match', 'arena_match'],
    ['/arena_friend_duel', 'arena_friend_duel'],
    ['/arena_today?source=home', 'arena_today'],
    ['/arena_star_wallet', 'arena_star_wallet'],
    ['/manage_subscription', 'manage_subscription'],
    ['/max_paywall', 'max_paywall'],
  ])('maps %s to %s without leaking parameters', (pathname, expected) => {
    expect(productAnalyticsScreenId(pathname)).toBe(expected);
  });

  it('covers static production screens without exposing route parameters', () => {
    expect(productAnalyticsScreenId('/settings_notifications')).toBe('settings_notifications');
    expect(productAnalyticsScreenId('/personal_plan_theory')).toBe('unknown_screen');
  });

  it('maps unknown and malformed routes to a fixed value', () => {
    expect(productAnalyticsScreenId('/arena_game')).toBe('unknown_screen');
    expect(productAnalyticsScreenId('/quizzes')).toBe('unknown_screen');
    expect(productAnalyticsScreenId('/private/new-screen/secret')).toBe('unknown_screen');
    expect(productAnalyticsScreenId('https://evil.example/path')).toBe('unknown_screen');
    expect(productAnalyticsScreenId(null)).toBe('unknown_screen');
  });
});
