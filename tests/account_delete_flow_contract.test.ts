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

  it('starts enqueue in the fast phase and requires linked server acknowledgement before sign-out', () => {
    const start = authProvider.indexOf('export async function deleteAccountAndWipe');
    const end = authProvider.indexOf('export async function handleAccountDeletedOnAnotherDevice', start);
    const deleteSource = authProvider.slice(start, end);
    // Замок ставится под таймаутом (withLocalStepDeadline) — локальная запись не
    // имеет права держать пользователя; см. «через полчаса» в боевом отчёте.
    const persistGuard = authProvider.indexOf(
      '() => persistAccountDeletePendingAuth(pendingDeleteProviderUid, pendingDeleteStableId),',
      start,
    );
    const enqueue = authProvider.indexOf('const cloudDeleteEnqueueOperation = startCloudDeletionEnqueue(pendingDeleteStableId)', start);
    const acknowledgement = authProvider.indexOf('await cloudDeleteEnqueueOperation.acknowledgment', enqueue);
    const persistAcknowledgedPhase = authProvider.indexOf("phase: 'server_enqueued'", acknowledgement);
    const dispatchBarrier = authProvider.indexOf('await cloudDeleteEnqueueOperation.dispatchSettled', enqueue);
    const signOut = authProvider.indexOf('await signOutCurrentProvider()', start);
    // Локальный выход теперь условный: без замка (аноним) доводить нечего —
    // локальные данные уже стёрты в быстрой фазе.
    const localExit = authProvider.indexOf('const localExitComplete = localExitLock', signOut);

    expect(persistGuard).toBeGreaterThan(start);
    expect(persistGuard).toBeLessThan(enqueue);
    expect(enqueue).toBeLessThan(acknowledgement);
    expect(acknowledgement).toBeLessThan(persistAcknowledgedPhase);
    expect(persistAcknowledgedPhase).toBeLessThan(signOut);
    expect(acknowledgement).toBeLessThan(signOut);
    expect(enqueue).toBeLessThan(dispatchBarrier);
    expect(dispatchBarrier).toBeLessThan(signOut);
    expect(signOut).toBeLessThan(localExit);
    expect(deleteSource).toContain('await cloudDeleteEnqueueOperation.acknowledgment');
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
    // Захват личности и постановка замка живут в быстрой фазе; локальные шаги
    // обёрнуты в withLocalStepDeadline, чтобы Keychain не мог подвесить UI.
    const start = authProvider.indexOf('async function prepareAccountDeletion');
    const captureProvider = authProvider.indexOf('const pendingDeleteProviderUid = getAuth()?.currentUser?.uid ?? null;', start);
    const captureStable = authProvider.indexOf('const pendingDeleteStableId = await withLocalStepDeadline(() => getStableId(), null);', start);
    const persistGuard = authProvider.indexOf('() => persistAccountDeletePendingAuth(pendingDeleteProviderUid, pendingDeleteStableId),', start);
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

  it('starts the native cross-device deletion monitor only after excluding web', () => {
    const monitorCall = rootLayoutSource.indexOf('startRemoteAccountDeletionMonitor(async () =>');
    const effectStart = rootLayoutSource.lastIndexOf('useEffect(() =>', monitorCall);
    const effectEnd = rootLayoutSource.indexOf('const navigationPathSignature', monitorCall);
    const monitorEffect = rootLayoutSource.slice(effectStart, effectEnd);
    const webGuard = monitorEffect.indexOf("if (Platform.OS === 'web') return;");

    expect(effectStart).toBeGreaterThan(-1);
    expect(effectEnd).toBeGreaterThan(monitorCall);
    expect(webGuard).toBeGreaterThan(-1);
    expect(webGuard).toBeLessThan(monitorEffect.indexOf('startRemoteAccountDeletionMonitor'));
    expect(monitorEffect).toContain('handleAccountDeletedOnAnotherDevice');
  });

  it('reports verified local exit while durable deletion continues asynchronously', () => {
    expect(modalSource).toContain('Безопасный локальный выход не завершён');
    expect(modalSource).not.toContain('Профиль сброшен');
    expect(modalSource).not.toContain('res.cloudDeleted');
  });

  // зачем: боевой фриз (TestFlight iOS) — после подтверждения удаления модалка
  // закрывалась, и приложение застывало на экране настроек: тапы мертвы, онбординг не
  // появлялся. Причина — present-during-dismiss: успешный путь в ОДНОМ тике закрывал
  // свой нативный <Modal>, эмитил account_deleted (монтирование онбординга) и ставил в
  // очередь ВТОРОЙ нативный <Modal> (themedAlert), плюс пускал reloadAsync() посреди
  // dismiss-анимации. OverlayArbiter от этого не защищает: модалка удаления живёт мимо
  // арбитра, поэтому его NATIVE_MODAL_HANDOFF_GAP_MS здесь не работает.
  it('never presents a second native modal while the delete dialog is dismissing', () => {
    const start = modalSource.indexOf('const handleConfirmDelete');
    const end = modalSource.indexOf('const handleCancel', start);
    const confirmSource = modalSource.slice(start, end);
    const successStart = confirmSource.indexOf('markAccountDeletedNoticePending();');
    // Граница — catch ВСЕГО обработчика (в начале строки), а не вложенные
    // try/catch вокруг навигации внутри самого успешного пути.
    const successEnd = confirmSource.indexOf('\n    } catch', successStart);
    const successPath = confirmSource.slice(successStart, successEnd);

    // Успешный путь не ставит в очередь ни алерт, ни какой-либо второй нативный
    // <Modal>: подтверждение даёт плашка ВНУТРИ уже смонтированного онбординга.
    expect(successPath).toContain('emitAppEvent(\'account_deleted\')');
    expect(successPath).toContain('markAccountDeletedNoticePending()');
    expect(successPath).not.toContain('enqueueThemedBlockingInfoAlert');
    expect(successPath).not.toContain('showInfoAlert(');

    // зачем: перезапуск приложения на успешном пути УБРАН намеренно. Он добавлял
    // задержку поверх ожидания сети, а событие account_deleted и без него
    // монтирует чистый онбординг. Возврат reloadAsync сюда — регрессия
    // «настройки зависают намертво», которую чинили 2026-07-27.
    expect(modalSource).not.toContain('reloadAsync');
    expect(modalSource).not.toContain('DevSettings');

    // Зазор на докрытие остаётся — он нужен путям ОШИБКИ, где алерт всё же есть.
    expect(modalSource).toContain('ACCOUNT_DELETE_DISMISS_SETTLE_MS = 360');

    // Путь ОШИБКИ тоже сначала закрывает окно, потом показывает алерт.
    expect(modalSource).toMatch(
      /const showInfoAlert = useCallback\([\s\S]*?onRequestClose\(\);[\s\S]*?setTimeout\(\(\) => enqueueInfoAlert\(title, message\), ACCOUNT_DELETE_DISMISS_SETTLE_MS\)/,
    );
  });

  // зачем: главный симптом, который чинили 2026-07-27 — «настройки зависают
  // намертво». Причина была в том, что модалка ждала deleteAccountAndWipe()
  // ЦЕЛИКОМ: enqueue Cloud Function, drain-таймауты, Google/Firebase signOut и
  // ensureAnonUser — сетевые раунд-трипы, на плохой сети десятки секунд, во время
  // которых окно блокировало само себя. Теперь UI ждёт только быструю локальную
  // фазу. Любой возврат к ожиданию полного удаления — регрессия.
  it('closes the delete dialog on the fast local phase, never on the network phase', () => {
    // Модалка обязана звать быструю фазу, а не полный синхронный путь.
    expect(modalSource).toContain('beginAccountDeletion');
    expect(modalSource).not.toContain('deleteAccountAndWipe');

    // Быстрая фаза не делает сетевых ожиданий: enqueue только СТАРТУЕТ в ней,
    // а его подтверждения и signOut ждёт уже фоновая фаза.
    const prepareStart = authProvider.indexOf('async function prepareAccountDeletion');
    const prepareEnd = authProvider.indexOf('async function finishAccountDeletion', prepareStart);
    expect(prepareStart).toBeGreaterThan(-1);
    const prepareSource = authProvider.slice(prepareStart, prepareEnd);
    expect(prepareSource).toContain('startCloudDeletionEnqueue');
    expect(prepareSource).not.toContain('dispatchSettled');
    expect(prepareSource).not.toContain('acknowledgment');
    expect(prepareSource).not.toContain('signOutCurrentProvider');
    expect(prepareSource).not.toContain('ensureAnonUser');
    expect(prepareSource).not.toContain('quiesceCloudSyncForAccountTransition');

    // Замок ставится ДО возврата в UI: иначе «мгновенный» выход выпустил бы
    // пользователя на онбординг раньше, чем старая почта/Apple ID заблокированы.
    expect(prepareSource).toContain('persistAccountDeletePendingAuth');

    // Счётчик локального удаления держится всю фоновую фазу — иначе remote-монитор
    // принял бы наше же удаление за «удалили с другого устройства».
    const beginStart = authProvider.indexOf('export async function beginAccountDeletion');
    const beginEnd = authProvider.indexOf('export async function deleteAccountAndWipe', beginStart);
    const beginSource = authProvider.slice(beginStart, beginEnd);
    expect(beginSource).toMatch(/finishAccountDeletion\(prepared\)[\s\S]*?endLocalAccountDeletionAttempt\(\)/);
  });

  // зачем: боевые отказы, из-за которых удаление «зависало и не срабатывало»
  // (владелец, 2026-07-27). Три независимые причины, каждая давала пользователю
  // «не удалось подготовить удаление» вместо онбординга.
  it('never refuses deletion for anonymous users or on a repeated attempt', () => {
    const persistStart = authProvider.indexOf('async function persistAccountDeletePendingAuth');
    const persistEnd = authProvider.indexOf('async function readAccountDeletePendingAuth', persistStart);
    const persistSource = authProvider.slice(persistStart, persistEnd);

    // (1) Аноним. Раньше `if (!providerUid) return null` рубил удаление у всех,
    // кто не привязал Google/Apple. Удалять есть что и без провайдера.
    expect(persistSource).toContain('if (!rawProviderUid && !stableId) return null');
    expect(persistSource).toContain('anon:${stableId}');

    // (2) Залипший замок от оборванной попытки. Якорь сверяется по
    // operationId+createdAt — они всегда новые, поэтому вторая попытка
    // отвергалась НАВСЕГДА. Свой незавершённый замок обязаны перенимать.
    expect(persistSource).toContain('adoptStaleAccountDeleteLock');
    const adoptStart = authProvider.indexOf('async function adoptStaleAccountDeleteLock');
    const adoptEnd = authProvider.indexOf('async function persistAccountDeletePendingAuth', adoptStart);
    const adoptSource = authProvider.slice(adoptStart, adoptEnd);
    // Чужой замок перенимать нельзя — иначе удаление уедет под другой аккаунт.
    expect(adoptSource).toContain('if (!sameProvider && !sameStableId) return null');

    // (3) Занятая резервация. Если удаление уже идёт, повторное нажатие обязано
    // выпустить человека на онбординг, а не показать ошибку.
    const beginStart = authProvider.indexOf('export async function beginAccountDeletion');
    const beginEnd = authProvider.indexOf('export async function deleteAccountAndWipe', beginStart);
    const beginSource = authProvider.slice(beginStart, beginEnd);
    expect(beginSource).toContain('hasPendingAccountDeleteLock()');
    expect(beginSource).toMatch(/alreadyPending[\s\S]*?return \{ ok: true/);
  });

  // The SecureStore step is bounded so Keychain cannot freeze the UI. A linked
  // or unknown identity still requires a verified guard before any local wipe;
  // only a provably anonymous account may continue without one.
  it('requires a durable guard for linked or unknown identity before fast local wipe', () => {
    const prepareStart = authProvider.indexOf('async function prepareAccountDeletion');
    const prepareEnd = authProvider.indexOf('/** Фоновая фаза', prepareStart);
    const prepareSource = authProvider.slice(prepareStart, prepareEnd);

    // Локальные данные и весь AsyncStorage (включая onboarding_step/done/version)
    // сносятся здесь же — иначе онбординг восстановил бы старый шаг.
    expect(prepareSource).toContain('await wipeLocalAccountData()');
    expect(prepareSource).toContain('await AsyncStorage.clear()');
    const guardRequired = prepareSource.indexOf('if (!isProvablyAnonymousAccount && !pendingDeleteLock) return null;');
    const localWipe = prepareSource.indexOf('await wipeLocalAccountData()');
    expect(guardRequired).toBeGreaterThan(-1);
    expect(guardRequired).toBeLessThan(localWipe);

    // Локальные шаги ограничены по времени — «полчаса ожидания» невозможны.
    expect(authProvider).toContain('ACCOUNT_DELETE_LOCAL_STEP_TIMEOUT_MS = 1_000');
    expect(prepareSource).toContain('withLocalStepDeadline');

    // A linked/unknown account fails closed when the required guard is absent.
    const beginStart = authProvider.indexOf('export async function beginAccountDeletion');
    const beginEnd = authProvider.indexOf('export async function deleteAccountAndWipe', beginStart);
    const beginSource = authProvider.slice(beginStart, beginEnd);
    expect(beginSource).toContain("reason: 'pending_guard_persist_failed'");
    expect(beginSource).toMatch(/if \(!prepared\)[\s\S]*?return \{ ok: true/);

    // Ключи онбординга дублируются литералами намеренно: вынос в общую константу
    // с импортом в CleanOnboarding создал цикл, модуль падал с ReferenceError и
    // кнопка «Удалить» переставала работать (боевой лог 2026-07-27).
    const onboarding = fs.readFileSync(path.join(__dirname, '..', 'components', 'CleanOnboarding.tsx'), 'utf8');
    expect(onboarding).toContain("const FLOW_VERSION_KEY = 'onboarding_flow_version_v1'");
    expect(onboarding).toContain("const STEP_KEY = 'onboarding_step'");
    expect(onboarding).toContain("const DONE_KEY = 'onboarding_done'");
    // Импорта/деструктуризации константы быть не должно — именно они ломали
    // модуль циклом. Упоминание в комментарии безвредно, поэтому проверяем
    // только исполняемые формы.
    expect(onboarding).not.toContain('} from \'../app/account_deleted_notice\';\nconst [FLOW_VERSION_KEY');
    expect(onboarding).not.toContain('] = ONBOARDING_RESET_KEYS_ON_ACCOUNT_DELETE');
    expect(onboarding).not.toMatch(/import\s*\{[^}]*ONBOARDING_RESET_KEYS_ON_ACCOUNT_DELETE/);
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
      "{ collection: 'friend_quests', field: 'participantUids', values: 'stable', op: 'array-contains' }",
      "{ collectionGroup: 'reactions', field: 'userId', values: 'stable' }",
      "{ collectionGroup: 'poll_votes', field: 'userId', values: 'stable' }",
      "{ collectionGroup: 'activity_likes_received', field: 'fromUid', values: 'stable' }",
      "{ collectionGroup: 'friend_activity_likes_sent', field: 'targetUid', values: 'stable' }",
      "{ collectionGroup: 'friend_gifts_received', field: 'fromUid', values: 'stable' }",
      "{ collectionGroup: 'friend_gifts_sent', field: 'toUid', values: 'stable' }",
      "{ collectionGroup: 'friend_gift_history', field: 'peerUid', values: 'stable' }",
      "{ collectionGroup: 'friend_quest_meta', field: 'peerUid', values: 'stable' }",
      "{ collectionGroup: 'friend_quest_weekly', field: 'peerUid', values: 'stable' }",
      "{ collectionGroup: 'notifications', field: 'fromUid', values: 'stable' }",
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
      ['friend_activity_likes_sent', 'targetUid'],
      ['friend_gifts_received', 'fromUid'],
      ['friend_gifts_sent', 'toUid'],
      ['friend_gift_history', 'peerUid'],
      ['friend_quest_meta', 'peerUid'],
      ['friend_quest_weekly', 'peerUid'],
      ['notifications', 'fromUid'],
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

  /**
   * Инцидент 2026-08-16: замок удаления в Keychain было НЕЧЕМ снять.
   * clearAccountDeletePendingAuthLock() существовала, но не вызывалась
   * ниоткуда, а ветка «local_cleared + анонимный пользователь» возвращала
   * false навсегда. Замок переживает переустановку приложения, поэтому
   * человек, удаливший аккаунт, оставался заперт даже после сноса — для
   * App Store это блокер (повторная регистрация невозможна).
   */
  it('releases the local deletion lock once the local exit is finished', () => {
    expect(accountDeleteQuarantineSource).toContain('export async function clearAccountDeletePendingAuthLock');
    // Функция обязана иметь живого вызывающего: без этого замок неснимаем.
    expect(authProvider).toContain('await clearAccountDeletePendingAuthLock()');
    // Тупиковая ветка не должна вернуться: локальный выход доделан —
    // выпускаем человека, а не запираем.
    const deadEnd = /phase === 'local_cleared'[\s\S]{0,120}isAnonymous === true\)\s*\{\s*return false;/;
    expect(authProvider).not.toMatch(deadEnd);
    // Даже если снять замок не удалось — не запираем молча.
    expect(authProvider).toContain('auth_account_delete_lock_release_failed');
  });
});
