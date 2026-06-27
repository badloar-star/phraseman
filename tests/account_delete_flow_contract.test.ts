import fs from 'fs';
import path from 'path';

const root = process.cwd();

describe('account deletion rebuilt flow contract', () => {
  const authProvider = fs.readFileSync(path.join(root, 'app', 'auth_provider.ts'), 'utf8');
  const timeoutSource = fs.readFileSync(path.join(root, 'app', 'account_delete_timeout.ts'), 'utf8');
  const modalSource = fs.readFileSync(path.join(root, 'components', 'DeleteAccountConfirmModal.tsx'), 'utf8');
  const functionSource = fs.readFileSync(path.join(root, 'functions', 'src', 'account_delete.ts'), 'utf8');

  it('starts cloud deletion in the background before wiping local state', () => {
    const start = authProvider.indexOf('export async function deleteAccountAndWipe');
    const wipe = authProvider.indexOf('await wipeLocalAccountData()', start);
    const beforeLocalWipe = authProvider.slice(start, wipe);

    expect(beforeLocalWipe).toContain('const cloudDeletePromise = deleteCloudData();');
    expect(beforeLocalWipe).toContain("logAuthEvent('auth_account_delete_cloud_late_failed'");
    expect(beforeLocalWipe).toContain('await signOutCurrentProvider()');
    expect(beforeLocalWipe).not.toContain("return { ok: false, reason: 'cloud_delete_failed' }");
  });

  it('blocks immediate same-provider re-login until background deletion is settled', () => {
    const start = authProvider.indexOf('export async function deleteAccountAndWipe');
    const captureProvider = authProvider.indexOf('const pendingDeleteProviderUid = getAuth()?.currentUser?.uid ?? null;', start);
    const captureStable = authProvider.indexOf('const pendingDeleteStableId = await getStableId().catch(() => null);', start);
    const cloudDelete = authProvider.indexOf('const cloudDeletePromise = deleteCloudData();', start);
    const asyncStorageClear = authProvider.indexOf('await AsyncStorage.clear()', start);
    const stableIdClear = authProvider.indexOf('await clearStableId()', start);
    const markLock = authProvider.indexOf('await markAccountDeletePendingAuth(pendingDeleteProviderUid, pendingDeleteStableId);', start);
    const clearLock = authProvider.indexOf('.then(() => clearAccountDeletePendingAuth(pendingDeleteProviderUid))', markLock);
    const ensureAnon = authProvider.indexOf('await ensureAnonUser()', markLock);

    expect(authProvider).toContain("import { ACCOUNT_DELETE_CALLABLE_TIMEOUT_MS } from './account_delete_timeout'");
    expect(authProvider).toContain("const ACCOUNT_DELETE_PENDING_AUTH_KEY = 'account_delete_pending_auth_v1';");
    expect(authProvider).toContain('const ACCOUNT_DELETE_PENDING_AUTH_TTL_MS = ACCOUNT_DELETE_CALLABLE_TIMEOUT_MS + 60_000;');
    expect(captureProvider).toBeGreaterThan(start);
    expect(captureStable).toBeGreaterThan(captureProvider);
    expect(captureStable).toBeLessThan(cloudDelete);
    expect(asyncStorageClear).toBeLessThan(markLock);
    expect(stableIdClear).toBeLessThan(markLock);
    expect(markLock).toBeLessThan(ensureAnon);
    expect(clearLock).toBeGreaterThan(markLock);
  });

  it('keeps callable timeout longer than the backend function timeout', () => {
    expect(timeoutSource).toContain('ACCOUNT_DELETE_FUNCTION_TIMEOUT_MS + ACCOUNT_DELETE_TIMEOUT_SAFETY_MARGIN_MS');
    expect(timeoutSource).not.toContain('ACCOUNT_DELETE_FUNCTION_TIMEOUT_MS - ACCOUNT_DELETE_TIMEOUT_SAFETY_MARGIN_MS');
  });

  it('shows immediate-account-exit copy while server deletion continues in the background', () => {
    expect(modalSource).toContain('Аккаунт удаляется');
    expect(modalSource).toContain('Серверная очистка продолжится в фоне');
    expect(modalSource).not.toContain('Профиль сброшен');
    expect(modalSource).not.toContain('res.cloudDeleted');
  });

  it('covers Firestore cleanup paths that were easy to miss', () => {
    [
      "{ collection: 'arena_rooms', field: 'hostId', values: 'auth' }",
      "{ collection: 'arena_rooms', field: 'guestId', values: 'auth' }",
      "{ collection: 'league_chat_messages', field: 'authorAuthUid', values: 'auth' }",
      "{ collection: 'league_chat_moderation_queue', field: 'authorAuthUid', values: 'auth' }",
      "{ collection: 'error_reports', field: 'uid', values: 'stable' }",
      "{ collection: 'review_promo_claims', field: 'uid', values: 'stable' }",
      "{ collection: 'vip_survey_responses', field: 'uid', values: 'stable' }",
      "{ collection: 'daily_phrase_saves', field: 'authUid', values: 'auth' }",
      "{ collection: 'arena_club_contributions', field: 'stableUid', values: 'stable' }",
      "{ collectionGroup: 'reactions', field: 'userId', values: 'stable' }",
      "{ collectionGroup: 'poll_votes', field: 'userId', values: 'stable' }",
      "{ collectionGroup: 'activity_likes_received', field: 'fromUid', values: 'stable' }",
      "{ collectionGroup: 'friend_gifts_received', field: 'fromUid', values: 'stable' }",
      "{ collectionGroup: 'friend_gifts_sent', field: 'toUid', values: 'stable' }",
      "{ collectionGroup: 'friend_gift_history', field: 'peerUid', values: 'stable' }",
      "{ collectionGroup: 'shard_rewards', field: 'fromUid', values: 'stable' }",
      "{ collectionGroup: 'my_events', field: 'payload.fromUid', values: 'stable' }",
      "{ collectionGroup: 'my_events', field: 'payload.targetUid', values: 'stable' }",
      "{ collectionGroup: 'boosts', field: 'activatedBy', values: 'stable' }",
    ].forEach((needle) => expect(functionSource).toContain(needle));
    expect(functionSource).toContain("collectionGroup: 'friends'");
    expect(functionSource).toContain("collectionGroup: 'friend_requests'");
    expect(functionSource).toContain('FieldPath.documentId()');
    expect(functionSource).toContain('deleteArenaSessionsAndMatchHistory');
    expect(functionSource).toContain("collectionGroup('match_history').where('sessionId'");
    expect(functionSource).toContain('anonymizeActivityLikeStats');
    expect(functionSource).toContain("collectionGroup('activity_like_stats')");
    expect(functionSource).toContain('removeFromFriendGiftDailyLimits');
    expect(functionSource).toContain("collectionGroup('friend_gift_daily_limits')");
    expect(functionSource).toContain('removeFromArenaClubEvents');
    expect(functionSource).toContain('ctx.writer.flush');
  });
});
