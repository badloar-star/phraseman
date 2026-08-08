import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

describe('notification center open refresh', () => {
  it('reconciles both notification sources when the user opens the center', () => {
    const center = fs.readFileSync(path.join(ROOT, 'components', 'NotificationCenterButton.tsx'), 'utf8');
    const inbox = fs.readFileSync(path.join(ROOT, 'components', 'AppMessagesInbox.tsx'), 'utf8');

    expect(center).toContain('refreshUserNotificationsOnce({ force: true })');
    expect(inbox).toContain('minIntervalMs: effectiveVisible ? 0 : BADGE_FOREGROUND_REFRESH_MIN_INTERVAL_MS');
  });
});
