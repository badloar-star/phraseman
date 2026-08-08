import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

const THEME_BUTTON_DIR = 'assets/images/header_glyphs/theme-accent-buttons';

function read(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

describe('header accent buttons (vector icons)', () => {
  const videoSource = () => read(path.join('components', 'LingmanVideosButton.tsx'));
  const inboxSource = () => read(path.join('components', 'AppMessagesInbox.tsx'));
  const notificationSource = () => read(path.join('components', 'NotificationCenterButton.tsx'));
  const homeSource = () => read(path.join('app', '(tabs)', 'home.tsx'));

  test('video and notification buttons use vector Ionicons, not per-theme assets', () => {
    expect(videoSource()).toContain('play-circle-outline');
    expect(notificationSource()).toContain('notifications-outline');
  });

  test('no header button references the old per-theme image assets', () => {
    expect(videoSource()).not.toContain('play-button-');
    expect(inboxSource()).not.toContain('message-button-');
  });

  test('the old per-theme button assets are removed from the bundle', () => {
    const dir = path.join(ROOT, THEME_BUTTON_DIR);
    const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
    expect(files.filter((f) => f.startsWith('play-button-'))).toHaveLength(0);
    expect(files.filter((f) => f.startsWith('message-button-'))).toHaveLength(0);
  });

  test('video and notification buttons keep the same visual box (48x46 / 44x38)', () => {
    for (const source of [videoSource(), notificationSource()]) {
      expect(source).toContain('width: 48');
      expect(source).toContain('height: 46');
      expect(source).toContain('width: 44');
      expect(source).toContain('height: 38');
    }
  });

  test('video and messages unread indicators share one notification color token', () => {
    const token = read(path.join('components', 'homeNotificationBadge.ts'));

    expect(token).toContain('HOME_NOTIFICATION_BADGE_COLOR');
    expect(videoSource()).toContain('HOME_NOTIFICATION_BADGE_COLOR');
    expect(inboxSource()).toContain('HOME_NOTIFICATION_BADGE_COLOR');
    expect(videoSource()).not.toContain('backgroundColor: chrome.accent');
  });

  test('the home header keeps only the active video and notification entry points', () => {
    const home = homeSource();

    expect(home).not.toContain('<AppMessagesInbox />');
    expect(home).toContain('<NotificationCenterButton isHomeTabActive={homeRuntimeActive} homeFocusTick={focusTick} />');
    expect(notificationSource()).toContain('mode="notification-center"');
    expect(home).not.toContain('CommunityChatHubButton');
  });
});
