import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'components', 'NotificationCenterButton.tsx'), 'utf8');

describe('unified team notification center', () => {
  it('renders team messages before ordinary notifications and combines badges', () => {
    expect(source).toContain("import AppMessagesInbox from './AppMessagesInbox'");
    expect(source).toContain('mode="notification-center"');
    expect(source).toContain('const combinedUnreadCount = teamUnreadCount + unreadCount');
    expect(source).toContain('notificationTargetRef={notificationTargetRef}');
    expect(source).toContain('key={identityRevision}');
    expect(source).toContain('onDetailOpenChange={setTeamDetailOpen}');
    expect(source).toContain('teamDetailOpen ? null : items.length === 0');
    expect(source.indexOf('mode="notification-center"')).toBeLessThan(source.indexOf('items.map((row)'));
  });
});
