import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

function read(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

describe('home social notification center', () => {
  it('reads the same stable user notification collection that server writes', () => {
    const model = read(path.join('app', 'user_notifications.ts'));
    const rules = read('firestore.rules');

    expect(model).toContain("import { getCanonicalUserId } from './user_id_policy'");
    expect(model).toContain('async function getNotificationOwnerUid');
    expect(model).toContain('await ensureAnonUser();');
    expect(model).toContain('await ensureStableAuthLink().catch(() => false);');
    expect(model).toContain('const stableUid = await getCanonicalUserId().catch(() => null);');
    expect(model).toMatch(/\.collection\('users'\)\s*\.doc\(stableUid\)\s*\.collection\('notifications'\)/);

    expect(rules).toContain('match /users/{userId}/notifications/{notificationId}');
    expect(rules).toContain('allow read: if canonicalUserMatchesAuth(userId);');
    expect(rules).toContain('allow create: if isAdmin();');
  });

  it('refreshes the focused home bell and clears the badge immediately when opened', () => {
    const button = read(path.join('components', 'NotificationCenterButton.tsx'));

    expect(button).toContain('NOTIFICATION_FOREGROUND_REFRESH_MIN_INTERVAL_MS = 3 * 60 * 60_000');
    expect(button).toContain('minIntervalMs: NOTIFICATION_FOREGROUND_REFRESH_MIN_INTERVAL_MS');
    expect(button).toContain('useIsScreenFocused');
    expect(button).not.toContain('subscribeUserNotifications((list)');
    expect(button).toContain("AppState.addEventListener('change'");
    expect(button).toContain('if (state === \'active\')');
    expect(button).toContain('force: true');
    expect(button).toContain('markedReadIdsRef.current.has(row.id)');
    expect(button).toContain('setItems((current) => current.map');
  });

  it('emits likes, help-board comments/replies, and league-chat replies into the bell stream', () => {
    const friendLikes = read(path.join('functions', 'src', 'friend_activity_likes.ts'));
    const helpBoard = read(path.join('functions', 'src', 'help_board.ts'));
    const leagueChat = read(path.join('functions', 'src', 'league_chat.ts'));
    const notificationTypes = read(path.join('functions', 'src', 'user_notifications.ts'));

    expect(notificationTypes).toContain("| 'activity_like'");
    expect(notificationTypes).toContain("| 'help_board_comment'");
    expect(notificationTypes).toContain("| 'help_board_reply'");
    expect(notificationTypes).toContain("| 'help_board_like'");
    expect(notificationTypes).toContain("| 'league_chat_reply'");

    expect(friendLikes).toContain('userNotificationRef(db, targetStableId');
    expect(friendLikes).toContain("type: 'activity_like'");

    expect(helpBoard).toContain('userNotificationRef(db, replyAuthorUid)');
    expect(helpBoard).toContain("type: 'help_board_reply'");
    expect(helpBoard).toContain('userNotificationRef(db, topicAuthorUid)');
    expect(helpBoard).toContain("type: 'help_board_comment'");
    expect(helpBoard).toContain('userNotificationRef(db, likedAuthorUid');
    expect(helpBoard).toContain("type: 'help_board_like'");

    expect(leagueChat).toContain('userNotificationRef(db, replyTo.authorUid)');
    expect(leagueChat).toContain("type: 'league_chat_reply'");
  });
});
