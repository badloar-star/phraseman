import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

describe('friend nudge navigation', () => {
  it('routes a friend-event notification to the exact friend and event', () => {
    const button = fs.readFileSync(
      path.join(root, 'components', 'NotificationCenterButton.tsx'),
      'utf8',
    );

    expect(button).toContain("if (nav.kind === 'friend_event')");
    expect(button).toContain("pathname: '/(tabs)/friends'");
    expect(button).toContain('focusFriend: nav.actorStableUid');
    expect(button).toContain('socialEventId: nav.eventId');
  });

  it('routes social push taps to the same exact friend event and duel invite', () => {
    const notifications = fs.readFileSync(path.join(root, 'app', 'notifications.ts'), 'utf8');
    expect(notifications).toContain("case 'friend_nudge':");
    expect(notifications).toContain("case 'activity_like':");
    expect(notifications).toContain('focusFriend: actorStableUid');
    expect(notifications).toContain('socialEventId: eventId');
    expect(notifications).toContain("case 'arena_friend_invite':");
    expect(notifications).toContain("pathname: '/arena_invite'");
  });
});
