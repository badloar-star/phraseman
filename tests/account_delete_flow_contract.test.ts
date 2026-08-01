import fs from 'fs';
import path from 'path';

const root = process.cwd();

describe('account deletion rebuilt flow contract', () => {
  const authProvider = fs.readFileSync(path.join(root, 'app', 'auth_provider.ts'), 'utf8');
  const accountDeleteQuarantineSource = fs.readFileSync(
    path.join(root, 'app', 'account_delete_quarantine.ts'),
    'utf8',
  );
  const functionsPackage = JSON.parse(
    fs.readFileSync(path.join(root, 'functions', 'package.json'), 'utf8'),
  ) as { scripts?: { 'deploy:safe'?: string } };
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

  it('starts durable enqueue before provider sign-out without blocking local exit on its acknowledgement', () => {
    const start = authProvider.indexOf('export async function deleteAccountAndWipe');
    const end = authProvider.indexOf('export async function handleAccountDeletedOnAnotherDevice', start);
    const deleteSource = authProvider.slice(start, end);
    const persistGuard = authProvider.indexOf(
      'const pendingDeleteLock = await persistAccountDeletePendingAuth(',
      start,
    );
    const enqueue = authProvider.indexOf('const cloudDeleteEnqueueOperation = startCloudDeletionEnqueue(pendingDeleteStableId)', start);
    const dispatchBarrier = authProvider.indexOf('await cloudDeleteEnqueueOperation.dispatchSettled', enqueue);
    const signOut = authProvider.indexOf('await signOutCurrentProvider()', start);
    const localExit = authProvider.indexOf('const localExitComplete = await completePreparedAccountDeleteLocalExit(', signOut);

    expect(persistGuard).toBeGreaterThan(start);
    expect(persistGuard).toBeLessThan(enqueue);
    expect(enqueue).toBeLessThan(dispatchBarrier);
    expect(dispatchBarrier).toBeLessThan(signOut);
    expect(signOut).toBeLessThan(localExit);
    expect(deleteSource).not.toContain('await cloudDeleteEnqueueOperation.acknowledgment');
    expect(deleteSource).toContain('void cloudDeleteEnqueueOperation.acknowledgment');
    expect(deleteSource).toContain("logAuthEvent('auth_account_delete_enqueue_failed'");
  });

  it('cancels scheduled notifications and the push token before signing out', () => {
    // зачем: удаление аккаунта не трогало уведомления вовсе — cancelAllNotifications
    // вызывался только из тумблера настроек. Запланированные локальные напоминания
    // оставались на устройстве после удаления, а push-токен исчезал лишь когда серверный
    // воркер асинхронно снесёт документ — в этом окне бывший пользователь продолжал
    // получать пуши. Privacy policy (§20) обещает «clear local app data immediately»,
    // так что это было ещё и расхождение кода с политикой.
    const start = authProvider.indexOf('export async function deleteAccountAndWipe');
    const end = authProvider.indexOf('export async function handleAccountDeletedOnAnotherDevice', start);
    const deleteSource = authProvider.slice(start, end);

    expect(deleteSource).toContain("import('./notifications')");
    expect(deleteSource).toContain('cancelAllNotifications()');

    // Токен обязан чиститься ОТДЕЛЬНЫМ дожидаемым вызовом. cancelAllNotifications внутри
    // себя пускает clearPushTokenForServerPush через `void` (fire-and-forget): для тумблера
    // настроек это нормально, но при удалении аккаунта запись поля токена гоняется с
    // signOut, а после выхода она упирается в permission-denied и токен переживает
    // удаление. Проверяем именно ОЖИДАНИЕ, а не порядок строк — прошлая версия этого
    // храповика смотрела на текст и пропустила дефект.
    expect(deleteSource).toContain("import('./push_token_registration')");
    expect(deleteSource).toContain('clearPushTokenForServerPush()');
    expect(deleteSource).toMatch(/await Promise\.all\(\[[\s\S]*?clearPushTokenForServerPush\(\)[\s\S]*?\]\)/);

    // Порядок: очистка идёт до выхода из провайдера, пока авторизация ещё жива.
    const cancel = deleteSource.indexOf("import('./notifications')");
    const signOutInDelete = deleteSource.indexOf('await signOutCurrentProvider()');
    expect(cancel).toBeGreaterThan(-1);
    expect(signOutInDelete).toBeGreaterThan(-1);
    expect(cancel).toBeLessThan(signOutInDelete);
  });

  it('blocks immediate same-provider re-login until background deletion is settled', () => {
    const start = authProvider.indexOf('export async function deleteAccountAndWipe');
    const captureProvider = authProvider.indexOf('const pendingDeleteProviderUid = getAuth()?.currentUser?.uid ?? null;', start);
    const captureStable = authProvider.indexOf('const pendingDeleteStableId = await getStableId().catch(() => null);', start);
    const persistGuard = authProvider.indexOf('const pendingDeleteLock = await persistAccountDeletePendingAuth(', start);
    const enqueue = authProvider.indexOf('const cloudDeleteEnqueueOperation = startCloudDeletionEnqueue(pendingDeleteStableId)', start);
    const localExitStart = authProvider.indexOf('async function completePreparedAccountDeleteLocalExit');
    const localExitEnd = authProvider.indexOf('async function handleAccountDeletePendingAuth', localExitStart);
    const localExitSource = authProvider.slice(localExitStart, localExitEnd);
    const asyncStorageClear = localExitSource.indexOf('await AsyncStorage.clear()');
    const restoreMirror = localExitSource.indexOf('await restoreAccountDeletePendingAuthMirror(pendingDelete)');
    const stableIdClear = localExitSource.indexOf('await clearStableId()');

    expect(accountDeleteQuarantineSource).toContain(
      "export const ACCOUNT_DELETE_PENDING_AUTH_KEY = 'account_delete_pending_auth_v1';",
    );
    expect(accountDeleteQuarantineSource).toContain(
      'export const ACCOUNT_DELETE_PENDING_AUTH_TTL_MS = 7 * 24 * 60 * 60_000;',
    );
    expect(captureProvider).toBeGreaterThan(start);
    expect(captureStable).toBeGreaterThan(captureProvider);
    expect(captureStable).toBeLessThan(persistGuard);
    expect(persistGuard).toBeLessThan(enqueue);
    expect(asyncStorageClear).toBeGreaterThan(0);
    expect(asyncStorageClear).toBeLessThan(restoreMirror);
    expect(restoreMirror).toBeLessThan(stableIdClear);
    expect(localExitSource).not.toContain('clearAccountDeletePendingAuthLock');
  });

  it('retries a pending deletion while provider auth is current and before identity lookup', () => {
    const pending = authProvider.indexOf('async function handleAccountDeletePendingAuth');
    const pendingEnd = authProvider.indexOf('export async function resumePendingAccountDeleteLocalExit', pending);
    const pendingSource = authProvider.slice(pending, pendingEnd);
    const retry = pendingSource.indexOf('startCloudDeletionEnqueue(pendingDelete.stableId)');
    const dispatchBarrier = pendingSource.indexOf('await enqueueOperation.dispatchSettled');
    const signOut = pendingSource.indexOf('await signOutCurrentProvider()');
    const localExit = pendingSource.indexOf('await completePreparedAccountDeleteLocalExit(pendingDelete, true)');
    const ensureAnon = pendingSource.indexOf('await ensureAnonUser()');
    const blockedReturn = pendingSource.indexOf("return { result: 'error', error: 'account_delete_pending' }", ensureAnon);

    expect(retry).toBeGreaterThan(0);
    expect(retry).toBeLessThan(dispatchBarrier);
    expect(dispatchBarrier).toBeLessThan(signOut);
    expect(signOut).toBeLessThan(localExit);
    expect(localExit).toBeLessThan(ensureAnon);
    expect(ensureAnon).toBeLessThan(blockedReturn);
    expect(pendingSource).toContain("logAuthEvent('auth_account_delete_enqueue_retry'");
    expect(pendingSource).not.toContain('clearAccountDeletePendingAuthLock');
    expect(pendingSource).not.toContain('ensureStableAuthLinkForStableIdDetailed');
    expect(pendingSource).not.toContain("db.collection('auth_links')");
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

  it('includes every durable auth merge and account deletion endpoint in deploy:safe', () => {
    const deploySafe = functionsPackage.scripts?.['deploy:safe'] ?? '';
    for (const functionName of [
      'accountMergeOutboxWorker',
      'accountMergeOutboxRetryCron',
      'accountDeleteMine',
      'accountDeleteEnqueue',
      'accountDeleteWorker',
      'accountDeleteRetryCron',
    ]) {
      expect(deploySafe.match(new RegExp(`functions:${functionName}(?=,|\\\")`, 'g'))).toHaveLength(1);
    }
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

  it('reports verified local exit while durable deletion continues asynchronously', () => {
    expect(modalSource).toContain('Аккаунт удаляется');
    expect(modalSource).toContain('Безопасный выход с этого телефона завершён');
    expect(modalSource).toContain('при необходимости повторится автоматически');
    expect(modalSource).toContain('Безопасный локальный выход не завершён');
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
      "{ collection: 'arena_hill_player_wins', field: 'stableUid', values: 'stable' }",
      "{ collection: 'arena_hill_thrones', field: 'previousChampionUid', values: 'stable' }",
      "{ collection: 'arena_hill_throne_rewards', field: 'championUid', values: 'stable' }",
      "{ collection: 'arena_hill_throne_rewards', field: 'championAuthUid', values: 'auth' }",
      "{ collection: 'arena_season_claims', field: 'uid', values: 'both' }",
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
    expect(functionSource).toContain("'arena_question_history'");
    expect(functionSource).toContain('deleteArenaSeasonEntries');
    expect(functionSource).toContain("collection('arena_season_leaderboard').listDocuments()");
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
