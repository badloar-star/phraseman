import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// зачем: шторка сообщений (макет system.html SYS-10) переехала на Liquid Glass 13 тем —
// цвета только из токенов активной темы, без зелёного бренда и толстых рамок.
const inbox = readFileSync(new URL('../components/AppMessagesInbox.tsx', import.meta.url), 'utf8');

test('AppMessagesInbox takes every surface from the active Liquid Glass tokens', () => {
  assert.ok(inbox.includes('liquidGlassTokens(liquidGlassThemeId)'), 'active 13-theme token registry');
  assert.ok(inbox.includes('glass.opaqueSheet'), 'opaque sheet base');
  assert.ok(inbox.includes('glass.cta'), 'neutral CTA instead of brand green');
  assert.ok(inbox.includes('glass.glassEdge'), 'hairline glass edge');
  assert.ok(inbox.includes('useStableSafeAreaInsets'), 'top/bottom safe area for the sheet');
  assert.ok(!inbox.includes('LinearGradient'), 'no decorative gradients');
});

test('AppMessagesInbox has no legacy palette hex, thick borders or font shrinking', () => {
  for (const hex of ['#63D98F', '#111820', '#17202A', '#202934', '#263241', '#1B232D', '#182131', '#64748B', '#475569', '#E2C36B', '#F4D785', '#93C5FD']) {
    assert.ok(!inbox.toUpperCase().includes(hex.toUpperCase()), `legacy ${hex} removed`);
  }
  assert.ok(!/rgba\(99,\s*217,\s*143/.test(inbox), 'no green rgba');
  assert.ok(!/borderWidth:\s*[2-9]/.test(inbox), 'no borderWidth above 1');
  assert.ok(!inbox.includes('adjustsFontSizeToFit'), 'no font shrinking');
});

test('AppMessagesInbox keeps public props, behaviors and touch targets', () => {
  for (const s of [
    "mode?: 'standalone' | 'notification-center'", 'onUnreadCountChange?: (count: number) => void',
    'onMessageCountChange?: (count: number) => void', 'onDetailOpenChange?: (open: boolean) => void',
    'notificationTargetRef?: React.RefObject<View | null>', 'ownerActive?: boolean',
    'testID="notification-center-team-section"', 'testID="notification-center-team-detail"',
    'testID="team-message-undo"', 'testID="vip-survey-inbox-cta"',
    'consumeVipCelebration', 'setAppMessagePollVote', 'setAppMessageReaction',
    'VipSurveyModal', 'VipCelebrationModal', 'HOME_NOTIFICATION_BADGE_COLOR', 'accessibilityViewIsModal',
  ]) assert.ok(inbox.includes(s), `keeps ${s}`);
  assert.match(inbox, /roundIcon: \{[^}]*width: 44,[^}]*height: 44/, 'close/back button is at least 44dp');
});
