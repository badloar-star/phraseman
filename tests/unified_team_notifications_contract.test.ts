import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'components', 'NotificationCenterButton.tsx'), 'utf8');

describe('unified team notification center', () => {
  it('uses one FlatList scroll owner for team and ordinary notifications', () => {
    expect(source).toContain("import AppMessagesInbox from './AppMessagesInbox'");
    expect(source).toContain('FlatList');
    expect(source).toContain('mode="notification-center"');
    expect(source).toContain('const combinedUnreadCount = teamUnreadCount + unreadCount');
    expect(source).toContain('notificationTargetRef={notificationTargetRef}');
    expect(source).toContain('key={identityRevision}');
    expect(source).toContain('onDetailOpenChange={setTeamDetailOpen}');
    expect(source).toContain('<FlatList');
    expect(source).toContain('data={teamDetailOpen ? [] : visibleItems}');
    expect(source).toContain('ListHeaderComponent={teamInboxSection}');
    expect(source).not.toContain('visibleItems.map((row)');
  });

  it('offers accessible per-row delete and undo for ordinary notifications', () => {
    expect(source).toContain('deleteUserNotification');
    expect(source).toContain('stageNotificationDeletion');
    expect(source).toContain('undoNotificationDeletion');
    expect(source).toContain('testID={`notification-delete-${row.id}`}');
    expect(source).toContain('width: 44');
    expect(source).toContain('height: 44');
    expect(source).toContain('Уведомление удалено');
    expect(source).toContain('Вернуть');
  });
});
