import fs from 'fs';
import path from 'path';

const root = process.cwd();

describe('account deletion rebuilt flow contract', () => {
  const authProvider = fs.readFileSync(path.join(root, 'app', 'auth_provider.ts'), 'utf8');
  const timeoutSource = fs.readFileSync(path.join(root, 'app', 'account_delete_timeout.ts'), 'utf8');
  const modalSource = fs.readFileSync(path.join(root, 'components', 'DeleteAccountConfirmModal.tsx'), 'utf8');
  const functionSource = fs.readFileSync(path.join(root, 'functions', 'src', 'account_delete.ts'), 'utf8');
  const functionJobSource = fs.readFileSync(path.join(root, 'functions', 'src', 'account_delete_job.ts'), 'utf8');
  const rootLayoutSource = fs.readFileSync(path.join(root, 'app', '_layout.tsx'), 'utf8');
  const firestoreIndexes = JSON.parse(fs.readFileSync(path.join(root, 'firestore.indexes.json'), 'utf8')) as {
    fieldOverrides?: {
      collectionGroup?: string;
      fieldPath?: string;
      indexes?: { order?: string; queryScope?: string }[];
    }[];
  };

  it('durably enqueues deletion before provider sign-out and still exits locally', () => {
    const start = authProvider.indexOf('export async function deleteAccountAndWipe');
    const enqueue = authProvider.indexOf('await enqueueCloudDeletion(pendingDeleteStableId)', start);
    const signOut = authProvider.indexOf('await signOutCurrentProvider()', start);
    const wipe = authProvider.indexOf('await wipeLocalAccountData()', start);

    expect(enqueue).toBeGreaterThan(start);
    expect(enqueue).toBeLessThan(signOut);
    expect(signOut).toBeLessThan(wipe);
    expect(authProvider.slice(start, wipe)).toContain("logAuthEvent('auth_account_delete_enqueue_failed'");
    expect(authProvider).toContain("reason: 'cloud_delete_not_enqueued'");
  });

  it('blocks immediate same-provider re-login until background deletion is settled', () => {
    const start = authProvider.indexOf('export async function deleteAccountAndWipe');
    const captureProvider = authProvider.indexOf('const pendingDeleteProviderUid = getAuth()?.currentUser?.uid ?? null;', start);
    const captureStable = authProvider.indexOf('const pendingDeleteStableId = await getStableId().catch(() => null);', start);
    const enqueue = authProvider.indexOf('await enqueueCloudDeletion(pendingDeleteStableId)', start);
    const asyncStorageClear = authProvider.indexOf('await AsyncStorage.clear()', start);
    const stableIdClear = authProvider.indexOf('await clearStableId()', start);
    const markLock = authProvider.indexOf('await markAccountDeletePendingAuth(pendingDeleteProviderUid, pendingDeleteStableId);', start);
    const ensureAnon = authProvider.indexOf('await ensureAnonUser()', markLock);

    expect(authProvider).toContain("const ACCOUNT_DELETE_PENDING_AUTH_KEY = 'account_delete_pending_auth_v1';");
    expect(authProvider).toContain('const ACCOUNT_DELETE_PENDING_AUTH_TTL_MS = 7 * 24 * 60 * 60_000;');
    expect(captureProvider).toBeGreaterThan(start);
    expect(captureStable).toBeGreaterThan(captureProvider);
    expect(captureStable).toBeLessThan(enqueue);
    expect(asyncStorageClear).toBeLessThan(markLock);
    expect(stableIdClear).toBeLessThan(markLock);
    expect(markLock).toBeLessThan(ensureAnon);
    expect(authProvider.slice(markLock, ensureAnon)).not.toContain('clearAccountDeletePendingAuth');
  });

  it('retries a pending deletion while provider auth is current and before identity lookup', () => {
    const pending = authProvider.indexOf('if (pendingDelete) {');
    const retry = authProvider.indexOf('await enqueueCloudDeletion(pendingDelete.stableId)', pending);
    const restoreAnonymous = authProvider.indexOf('await restoreAnonymousIdentityAfterPendingDelete(preProviderStableId)', pending);
    const linkLookup = authProvider.indexOf("db.collection('auth_links')", pending);
    const recoveryStart = authProvider.indexOf('async function restoreAnonymousIdentityAfterPendingDelete');
    const recoveryEnd = authProvider.indexOf('function coerceFirebaseMetaTime', recoveryStart);
    const recoverySource = authProvider.slice(recoveryStart, recoveryEnd);

    expect(retry).toBeGreaterThan(pending);
    expect(retry).toBeLessThan(restoreAnonymous);
    expect(restoreAnonymous).toBeLessThan(linkLookup);
    expect(recoverySource).toContain('await signOutCurrentProvider()');
    expect(recoverySource).toContain('await ensureAnonUser()');
  });

  it('keeps callable timeout longer than the backend function timeout', () => {
    expect(timeoutSource).toContain('ACCOUNT_DELETE_ENQUEUE_TIMEOUT_MS = 8_000');
    expect(timeoutSource).toContain('ACCOUNT_DELETE_FUNCTION_TIMEOUT_MS + ACCOUNT_DELETE_TIMEOUT_SAFETY_MARGIN_MS');
    expect(timeoutSource).not.toContain('ACCOUNT_DELETE_FUNCTION_TIMEOUT_MS - ACCOUNT_DELETE_TIMEOUT_SAFETY_MARGIN_MS');
  });

  it('keeps the legacy callable while exporting durable enqueue and worker endpoints', () => {
    const indexSource = fs.readFileSync(path.join(root, 'functions', 'src', 'index.ts'), 'utf8');
    expect(indexSource).toContain('exports.accountDeleteMine = accountDeleteMine;');
    expect(indexSource).toContain('exports.accountDeleteEnqueue = accountDeleteEnqueue;');
    expect(indexSource).toContain('exports.accountDeleteWorker = accountDeleteWorker;');
  });

  it('atomically publishes an auth-scoped deletion marker for other signed-in devices', () => {
    expect(functionJobSource).toContain("ACCOUNT_DELETE_AUTH_MARKERS = 'account_deletion_auth_markers'");
    expect(functionJobSource).toContain('const authMarkerRef = db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(authUid)');
    expect(functionJobSource).toContain('tx.set(authMarkerRef');
  });

  it('disables provider auth immediately after the durable deletion request is accepted', () => {
    expect(functionSource).toContain("updateUser(request.auth.uid, { disabled: true })");
    expect(functionSource).toContain('revokeRefreshTokens(request.auth.uid)');
  });

  it('starts a root cross-device deletion monitor', () => {
    expect(rootLayoutSource).toContain('startRemoteAccountDeletionMonitor');
    expect(rootLayoutSource).toContain('handleAccountDeletedOnAnotherDevice');
  });

  it('does not claim server cleanup before the durable deletion request is confirmed', () => {
    expect(modalSource).toContain('Аккаунт удаляется');
    expect(modalSource).toContain('Отправляем серверу запрос на удаление данных');
    expect(modalSource).toContain('Сервер не подтвердил получение запроса');
    expect(modalSource).not.toContain('Серверная очистка продолжится в фоне');
    expect(modalSource).not.toContain('Профиль сброшен');
    expect(modalSource).not.toContain('res.cloudDeleted');
  });

  it('covers Firestore cleanup paths that were easy to miss', () => {
    [
      "{ collection: 'arena_rooms', field: 'hostId', values: 'auth' }",
      "{ collection: 'arena_rooms', field: 'guestId', values: 'auth' }",
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
    expect(functionSource).toContain('deleteCrossUserDocumentIdMatches');
    expect(functionSource).not.toContain('.where(admin.firestore.FieldPath.documentId()');
    expect(functionSource).toContain('deleteArenaSessionsAndMatchHistory');
    expect(functionSource).toContain("collectionGroup('match_history').where('sessionId'");
    expect(functionSource).toContain('anonymizeActivityLikeStats');
    expect(functionSource).toContain("collectionGroup('activity_like_stats')");
    expect(functionSource).toContain('removeFromFriendGiftDailyLimits');
    expect(functionSource).toContain("collection('users').listDocuments()");
    expect(functionSource).toContain("collection('friend_gift_daily_limits')");
    expect(functionSource).not.toContain("collectionGroup('friend_gift_daily_limits')");
    expect(functionSource).toContain('removeFromArenaClubEvents');
    expect(functionSource).toContain("'public_profiles'");
    expect(functionSource).toContain('ctx.writer.flush');
  });

  it('declares collection-group indexes for every filtered account-deletion cleanup query', () => {
    const expected = [
      ['messages', 'authorUid'],
      ['messages', 'authorStableUid'],
      ['reactions', 'userId'],
      ['poll_votes', 'userId'],
      ['activity_likes_received', 'fromUid'],
      ['friend_activity_like_daily_limits', 'targetUid'],
      ['friend_gifts_received', 'fromUid'],
      ['friend_gifts_sent', 'toUid'],
      ['friend_gift_history', 'peerUid'],
      ['shard_rewards', 'fromUid'],
      ['shard_log', 'targetUid'],
      ['my_events', 'payload.fromUid'],
      ['my_events', 'payload.targetUid'],
      ['boosts', 'activatedBy'],
      ['match_history', 'sessionId'],
      ['activity_like_stats', 'lastFromUid'],
    ];

    for (const [collectionGroup, fieldPath] of expected) {
      const override = firestoreIndexes.fieldOverrides?.find(
        (candidate) => candidate.collectionGroup === collectionGroup && candidate.fieldPath === fieldPath,
      );
      expect(override).toBeDefined();
      expect(override?.indexes).toContainEqual({ order: 'ASCENDING', queryScope: 'COLLECTION_GROUP' });
    }
  });
});
