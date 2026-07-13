import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

function read(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8').replace(/\r\n/g, '\n');
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

    expect(button).toContain('NOTIFICATION_FOREGROUND_REFRESH_MIN_INTERVAL_MS = 30_000');
    expect(button).toContain('minIntervalMs: NOTIFICATION_FOREGROUND_REFRESH_MIN_INTERVAL_MS');
    expect(button).toContain('useIsScreenFocused');
    expect(button).not.toContain('subscribeUserNotifications((list)');
    expect(button).toContain("AppState.addEventListener('change'");
    expect(button).toContain('if (state === \'active\')');
    expect(button).not.toContain('force: true');
    expect(button).toContain('markedReadIdsRef.current.has(row.id)');
    expect(button).toContain('setItems((current) => current.map');
  });

  it('clears private bell state immediately and safely when the Firebase account changes', () => {
    const button = read(path.join('components', 'NotificationCenterButton.tsx'));
    const authEffectStart = button.indexOf('useEffect(() => {\n    try {\n      return auth().onAuthStateChanged');
    const authEffectEnd = button.indexOf('\n  }, []);', authEffectStart);
    const authEffect = button.slice(authEffectStart, authEffectEnd);

    expect(authEffectStart).toBeGreaterThanOrEqual(0);
    expect(authEffectEnd).toBeGreaterThan(authEffectStart);
    expect(authEffect).toContain('requestGenerationRef.current += 1;');
    expect(authEffect).toContain('setItems([]);');
    expect(authEffect).toContain('setSelectedId(null);');
    expect(authEffect).toContain('markedReadIdsRef.current.clear();');
    expect(authEffect).toContain('optimisticReportClaimIdsRef.current.clear();');
    expect(authEffect).toContain('catch');
    expect(button).toContain('requestGenerationRef.current === generation');
  });

  it('quietly refreshes the bell on real Home tab returns without polling or badge flicker', () => {
    const button = read(path.join('components', 'NotificationCenterButton.tsx'));
    const home = read(path.join('app', '(tabs)', 'home.tsx'));
    const notifications = read(path.join('app', 'user_notifications.ts'));

    expect(home).toContain('<NotificationCenterButton isHomeTabActive={activeIdx === 0} homeFocusTick={focusTick} />');
    expect(button).toContain('isHomeTabActive: boolean;');
    expect(button).toContain('homeFocusTick: number;');
    expect(button).toContain('NOTIFICATION_FOREGROUND_REFRESH_MIN_INTERVAL_MS = 30_000');
    expect(button).toContain('if (!isScreenFocused || !isHomeTabActive) return;');
    expect(notifications).toContain('refreshInFlightByOwner');
    expect(button).toContain('let authoritativeResultApplied = false;');
    expect(button).toContain('authoritativeResultApplied = true;');
    expect(button).toContain('!authoritativeResultApplied && cached.length');
    expect(button).toContain('[homeFocusTick, identityRevision, isHomeTabActive, isScreenFocused]');
    expect(button).not.toContain('force: true');

    const refreshEffectStart = button.indexOf('if (!isScreenFocused || !isHomeTabActive) return;');
    const refreshEffectEnd = button.indexOf('[homeFocusTick, identityRevision, isHomeTabActive, isScreenFocused]', refreshEffectStart);
    const refreshEffect = button.slice(refreshEffectStart, refreshEffectEnd);
    expect(refreshEffect).not.toContain('setItems([]);');
    expect(refreshEffect).not.toContain('setInterval(');
    expect(refreshEffect).not.toContain('onSnapshot(');
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
