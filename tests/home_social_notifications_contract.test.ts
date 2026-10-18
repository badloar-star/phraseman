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
    // зачем (координатор §46, 2026-10-01): catch'и больше не немые — пишут причину
    // через reportSwallowed (правило владельца); порядок шагов и фолбэки те же.
    expect(model).toMatch(/await ensureStableAuthLink\(\)\.catch\(\(error: unknown\) => \{ reportSwallowed\([^)]*\); return false; \}\);/);
    expect(model).toMatch(/const stableUid = await getCanonicalUserId\(\)\.catch\(\(error: unknown\) => \{ reportSwallowed\([^)]*\); return null; \}\);/);
    expect(model).toMatch(/\.collection\('users'\)\s*\.doc\(stableUid\)\s*\.collection\('notifications'\)/);

    expect(rules).toContain('match /users/{userId}/notifications/{notificationId}');
    expect(rules).toContain('allow read: if canonicalUserMatchesAuth(userId);');
    expect(rules).toContain('allow create: if isAdmin();');
  });

  it('refreshes the focused home bell and clears the badge immediately when opened', () => {
    const button = read(path.join('components', 'NotificationCenterButton.tsx'));

    expect(button).toContain('NOTIFICATION_FOREGROUND_REFRESH_MIN_INTERVAL_MS = 12 * 60 * 60_000');
    expect(button).toContain('minIntervalMs: NOTIFICATION_FOREGROUND_REFRESH_MIN_INTERVAL_MS');
    expect(button).toContain('useIsScreenFocused');
    expect(button).not.toContain('subscribeUserNotifications((list)');
    expect(button).toContain("AppState.addEventListener('change'");
    expect(button).toContain('if (state === \'active\')');
    const openStart = button.indexOf('const open = useCallback');
    // Конец обработчика — следующий колбэк (раньше был const select…, его нет).
    const openEnd = button.indexOf('const close = useCallback', openStart);
    const openHandler = button.slice(openStart, openEnd);
    expect(openHandler).toContain('refreshUserNotificationsOnce({ force: true })');
    expect(button).toContain('markedReadIdsRef.current.has(row.id)');
    expect(button).toContain('setItems((current) => current.map');
    // зачем (координатор §46, 2026-10-01): с 29.08 (f5a01076d) непрочитанность
    // гасится по тапу строки, а не открытием центра. Сторожим текущий контракт:
    // мгновенная локальная отметка, защита от повторной отправки, запись фоном.
    expect(openHandler).not.toContain('markUserNotificationsRead');
    const rowStart = button.indexOf('const openNotification = useCallback');
    const rowHandler = button.slice(rowStart, button.indexOf("if (row.type === 'report_reply' && row.reportReply)", rowStart));
    expect(rowHandler).toContain('if (!row.read && !markedReadIdsRef.current.has(row.id))');
    expect(rowHandler).toContain('markedReadIdsRef.current.add(row.id);');
    expect(rowHandler.indexOf('setItems((current) => current.map'))
      .toBeLessThan(rowHandler.indexOf('void markUserNotificationsRead([row.id]);'));
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
    // Набор optimisticReportClaimIds снят: забор награды отмечается прямо в строке
    // (markReportReplyClaimedLocally) — при смене аккаунта гасим его состояние.
    expect(authEffect).toContain('setClaimingMessageId(null);');
    expect(authEffect).toContain('setClaimErrorMessageId(null);');
    expect(authEffect).toContain('hiddenNotificationIdsRef.current.clear();');
    expect(authEffect).toContain('catch');
    expect(button).toContain('requestGenerationRef.current === generation');
  });

  it('quietly refreshes the bell on real Home tab returns without polling or badge flicker', () => {
    const button = read(path.join('components', 'NotificationCenterButton.tsx'));
    const home = read(path.join('app', '(tabs)', 'home.tsx'));
    const notifications = read(path.join('app', 'user_notifications.ts'));

    // перепин 18.10 ([HOME-CHILD-COST], координатор): активность вкладки и счётчик фокусов колокольчик получает через HomeBellStateContext (провайдер вокруг шапки), а не пропсами в bellSlot — иначе шапка перерисовывалась на каждом возврате. Смысл тот же: Главная отдаёт колокольчику homeRuntimeActive и focusTick.
    expect(home).toContain('bellSlot={<NotificationCenterButton />}');
    expect(home).toContain('value={homeBellState}');
    expect(home).toContain('const homeBellState = useMemo(() => ({ active: homeRuntimeActive, focusTick }), [focusTick, homeRuntimeActive]);');
    expect(button).toContain('const isHomeTabActive = bellState?.active ?? isHomeTabActiveProp ?? false;');
    expect(button).toContain('const homeFocusTick = bellState?.focusTick ?? homeFocusTickProp ?? 0;');
    expect(button).toContain('isHomeTabActive?: boolean;');
    expect(button).toContain('homeFocusTick?: number;');
    expect(button).toContain('NOTIFICATION_FOREGROUND_REFRESH_MIN_INTERVAL_MS = 12 * 60 * 60_000');
    expect(button).toContain('if (!isScreenFocused || !isHomeTabActive) return;');
    expect(notifications).toContain('refreshInFlightByOwner');
    expect(button).toContain('let authoritativeResultApplied = false;');
    expect(button).toContain('authoritativeResultApplied = true;');
    expect(button).toContain('!authoritativeResultApplied && cached.length');
    expect(button).toContain('[homeFocusTick, identityRevision, isHomeTabActive, isScreenFocused]');
    const refreshEffectStart = button.indexOf('if (!isScreenFocused || !isHomeTabActive) return;');
    const refreshEffectEnd = button.indexOf('[homeFocusTick, identityRevision, isHomeTabActive, isScreenFocused]', refreshEffectStart);
    const refreshEffect = button.slice(refreshEffectStart, refreshEffectEnd);
    expect(refreshEffect).not.toContain('setItems([]);');
    expect(refreshEffect).not.toContain('setInterval(');
    expect(refreshEffect).not.toContain('onSnapshot(');
    expect(refreshEffect).not.toContain('force: true');
  });

  it('emits active likes through the shared notification model', () => {
    const friendLikes = read(path.join('functions', 'src', 'friend_activity_likes.ts'));
    const notificationTypes = read(path.join('functions', 'src', 'user_notifications.ts'));
    expect(notificationTypes).toContain("| 'activity_like'");

    expect(friendLikes).toContain('userNotificationRef(db, targetStableId');
    expect(friendLikes).toContain("type: 'activity_like'");
  });
});
