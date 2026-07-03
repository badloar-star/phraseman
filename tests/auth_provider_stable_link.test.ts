import { readFileSync } from 'fs';
import path from 'path';

const authProviderPath = path.join(process.cwd(), 'app', 'auth_provider.ts');
const cloudSyncPath = path.join(process.cwd(), 'app', 'cloud_sync.ts');
const registrationPromptPath = path.join(process.cwd(), 'components', 'RegistrationPromptModal.tsx');

describe('auth provider stable-id linking', () => {
  const source = readFileSync(authProviderPath, 'utf8');
  const cloudSyncSource = readFileSync(cloudSyncPath, 'utf8');
  const registrationPromptSource = readFileSync(registrationPromptPath, 'utf8');
  const legacyRuntimePattern =
    /\b(lang === 'ru'|lang === 'uk'|lang === 'es'|return\s+[^;\n]*(?:RU|UK|ES)\b|\?\?\s*[^;\n]*(?:RU|UK|ES)\b|fallback)\b/u;
  const signInStart = source.indexOf('export async function signInWithProvider');
  const signInEnd = source.indexOf('export async function deleteAccountAndWipe', signInStart);
  const signInSource = source.slice(signInStart, signInEnd);
  const mergeSwapStart = source.indexOf("if (outcome.kind === 'merged_swap_to_remote')", signInStart);
  const mergeSwapEnd = source.indexOf("if (outcome.kind === 'merged_keep_local')", mergeSwapStart);
  const prePostLinkSource = source.slice(signInStart, mergeSwapStart);
  const mergeSwapSource = source.slice(mergeSwapStart, mergeSwapEnd);

  test('signInWithProvider checks an existing provider link before relinking the local stable id', () => {
    expect(source).toContain('ensureStableAuthLinkForStableIdDetailed');
    expect(prePostLinkSource).toMatch(/const linkedStableId = linkSnap\.exists \? linkSnap\.data\(\)\?\.stable_id : null/);
    // Стадия auth_link теперь идёт через retry-обёртку (ensureStableAuthLinkWithRetry),
    // которая внутри вызывает ensureStableAuthLinkForStableIdDetailed — устраняет
    // «local_stable_link_failed» на холодном старте Android (anon-auth не успела).
    expect(prePostLinkSource).toMatch(/ensureStableAuthLinkWithRetry\(remoteStableId\)/);
    expect(prePostLinkSource).toMatch(/ensureStableAuthLinkWithRetry\(localStableId\)/);
    expect(prePostLinkSource).toMatch(/ensureStableAuthLinkWithRetry[\s\S]{0,320}ensureStableAuthLinkForStableIdDetailed\(stableId, authLinkMetadata\)/);
    expect(prePostLinkSource.indexOf('const linkedStableId = linkSnap.exists')).toBeLessThan(
      prePostLinkSource.indexOf('ensureStableAuthLinkWithRetry(localStableId)'),
    );
  });

  test('cross-device sign-in swaps to the provider-linked stable id before client transactions', () => {
    // Root cause of this sign-in outage: auth_links/{providerUid} can already
    // point at remoteStableId. Relinking localStableId first is then correctly
    // rejected as stable_id_mismatch, so the app must swap to remoteStableId.
    expect(prePostLinkSource).toContain("captureAuthSignInFailure(provider, 'auth_link', 'remote_stable_link_failed')");
    expect(prePostLinkSource).toContain("remoteStableId: linkedRemote.stableUid");
    expect(prePostLinkSource).toContain("mergedFromStableId: localStableId");
    expect(cloudSyncSource).toContain('export async function mergeStableAccountsViaServer');
    expect(cloudSyncSource).toContain("'authMergeStableAccounts'");
  });

  test('server-discovered provider link wins when client link lookup missed it', () => {
    expect(source).toContain('const linkedLocal = await ensureStableAuthLinkWithRetry(localStableId)');
    expect(source).toContain('if (linkedLocal.stableUid !== localStableId)');
    expect(source).toContain('remoteStableId: linkedLocal.stableUid');
    expect(cloudSyncSource).toContain('export async function ensureStableAuthLinkForStableIdDetailed');
    expect(cloudSyncSource).toContain('stableUid: actualStableUid || stableId');
  });

  // ── Смягчение firestore_fallback (2026-07-02) ────────────────────────────
  // РАНЬШЕ fallback (серверный callable недоступен, но клиент сам записал
  // users-якорь + auth_links) РВАЛ вход: 'auth_link_unverified' + Critical-алерт,
  // хотя привязка фактически сделана. Пользователь видел «Не получилось войти».
  // Теперь fallback НЕ рвёт вход — идём обычным путём created_new/linked_existing.
  test('provider sign-in does not error out on a firestore fallback (link was actually written)', () => {
    expect(source).toContain("linkedLocal.source === 'firestore_fallback'");
    // Больше НЕ возвращаем ошибку и НЕ шлём Critical-алерт для fallback.
    expect(source).not.toContain("return { result: 'error', error: 'auth_link_unverified' }");
    expect(source).not.toContain("captureAuthSignInFailure(provider, 'auth_link', 'local_stable_link_unverified')");
    // Вместо этого — warning-событие и продолжение обычного потока.
    expect(source).toContain("logAuthEvent('auth_signin_link_direct_write'");
    expect(source).toContain("kind: linkLookupCompleted && !linkLookupFound ? 'created_new' : 'linked_existing'");
    expect(cloudSyncSource).toContain("source: 'firestore_fallback'");
  });

  test('provider sign-in metadata is sent to the server stable-link callable', () => {
    expect(source).toContain('const authLinkMetadata: StableAuthLinkMetadata');
    expect(source).toContain('ensureStableAuthLinkForStableIdDetailed(stableId, authLinkMetadata)');
    expect(cloudSyncSource).toContain('linkMetadata?: StableAuthLinkMetadata');
    expect(cloudSyncSource).toContain("fn({ stableId, ...(hasFreshMetadata ? { linkMetadata: metadata } : {}) })");
  });

  // ── КОРЕНЬ №1: linkWithCredential поверх анонима (2026-06-29) ─────────────
  test('provider sign-in tries linkWithCredential on the anonymous user before falling back to signInWithCredential', () => {
    // signInWithCredential УНИЧТОЖАЕТ анонимный uid (теряется привязка к stable_id).
    // linkWithCredential сохраняет uid и данные — Firebase требует именно его для
    // апгрейда анонима. Должна быть ветка link + деградация к sign-in при конфликте.
    expect(signInSource).toContain('anonUser.linkWithCredential(');
    expect(signInSource).toContain('anonUser?.isAnonymous');
    expect(signInSource).toContain('linkedInPlace = true');
    // Деградация к signInWithCredential при «провайдер уже привязан к другому аккаунту».
    expect(signInSource).toContain("'auth/credential-already-in-use'");
    // Реальный вызов link пробуется ПЕРЕД безусловным signInWithCredential.
    expect(signInSource.indexOf('anonUser.linkWithCredential(')).toBeLessThan(
      signInSource.lastIndexOf('auth.signInWithCredential('),
    );
  });

  // ── Хвост A: дождаться anon-сессии перед линковкой ───────────────────────
  test('provider sign-in waits for the anonymous session before linking (cold-start race)', () => {
    expect(signInSource).toContain('waitForAnonAuth(20_000)');
    // Ожидание идёт ДО РЕАЛЬНОГО вызова линковки (anonUser.linkWithCredential(...)),
    // а не до упоминания слова в комментарии — поэтому матчим вызов с открытой скобкой.
    expect(signInSource.indexOf('waitForAnonAuth(20_000)')).toBeLessThan(
      signInSource.indexOf('anonUser.linkWithCredential('),
    );
  });

  // ── Хвост D: погасить фоновый sync перед сменой stable_id ─────────────────
  test('swap branches quiesce in-flight sync before setStableId (no stale write to new account)', () => {
    expect(source).toContain('quiesceSyncBeforeStableIdSwap');
    expect(cloudSyncSource).toContain('export async function quiesceSyncBeforeStableIdSwap');
    // Перед КАЖДЫМ setStableId(canonicalStableId) стоит quiesce.
    const swapIdx = source.indexOf('await setStableId(canonicalStableId)');
    const quiesceBefore = source.lastIndexOf('quiesceSyncBeforeStableIdSwap', swapIdx);
    expect(quiesceBefore).toBeGreaterThan(0);
    expect(quiesceBefore).toBeLessThan(swapIdx);
  });

  // ── Хвост B: клиентский fallback пишет auth_links (мост provider→stableId) ─
  test('stable-link firestore fallback also writes auth_links so the provider anchor survives', () => {
    // Раньше fallback писал только users/{stableId}.firebaseAuthUid, но не auth_links —
    // без него вход с другого устройства не находил аккаунт и создавал новый.
    const fallbackStart = cloudSyncSource.indexOf("source: 'firestore_fallback'");
    expect(fallbackStart).toBeGreaterThan(0);
    // В fallback-ветке есть запись в auth_links с providerUid/stable_id.
    const region = cloudSyncSource.slice(Math.max(0, fallbackStart - 1400), fallbackStart);
    expect(region).toContain("db.collection('auth_links').doc(authUid).set");
    expect(region).toContain('stable_id: stableId');
    expect(region).toContain('providerUid: authUid');
  });

  test('provider sign-in has no client Firestore transaction that can be denied by user owner rules', () => {
    expect(signInSource).not.toContain('db.runTransaction');
    expect(signInSource).not.toContain('signin_transaction');
    expect(signInSource).not.toContain("captureAuthSignInFailure(provider, 'transaction'");
    expect(signInSource).not.toContain('usersRef');
    expect(signInSource).not.toContain('tx.set');
    expect(signInSource).not.toContain('tx.update');
    expect(signInSource).toContain("kind: linkLookupCompleted && !linkLookupFound ? 'created_new' : 'linked_existing'");
  });

  test('provider sign-in refuses same-provider re-login while account deletion is still pending', () => {
    const pendingDeleteStart = signInSource.indexOf('const pendingDelete = await readAccountDeletePendingAuth(firebaseProviderUid)');
    const authLinksStart = signInSource.indexOf("const linkRef = db.collection('auth_links').doc(firebaseProviderUid)");
    const pendingDeleteSource = signInSource.slice(pendingDeleteStart, authLinksStart);

    expect(source).toContain("const ACCOUNT_DELETE_PENDING_AUTH_KEY = 'account_delete_pending_auth_v1';");
    expect(pendingDeleteStart).toBeGreaterThan(0);
    expect(authLinksStart).toBeGreaterThan(pendingDeleteStart);
    expect(pendingDeleteSource).toContain("logAuthEvent('auth_signin_blocked_account_delete_pending'");
    expect(pendingDeleteSource).toContain('await signOutCurrentProvider()');
    expect(pendingDeleteSource).toContain('await ensureAnonUser()');
    expect(pendingDeleteSource).toContain("return { result: 'error', error: 'account_delete_pending' }");
    expect(pendingDeleteSource).not.toContain('captureAuthSignInFailure');
  });

  test('missing Apple Android service id is returned to UI without critical crash logging', () => {
    expect(source).toMatch(/errStr\.includes\(APPLE_ANDROID_MISSING_SERVICE_ID\)[\s\S]{0,80}return \{ result: 'error', error: errStr \}/);
  });

  test('meaningful local progress guard checks French lesson progress as well as English legacy progress', () => {
    expect(source).toContain("import { unlockedLessonsKey } from './target_storage_keys'");
    expect(source).toContain("unlockedLessonsKey('en')");
    expect(source).toContain("unlockedLessonsKey('fr')");
    expect(source).not.toContain("'unlocked_lessons',\n      'user_name'");
  });

  test('remote stable-id swap uses the full cloud sync account wipe before restore', () => {
    expect(mergeSwapSource).toContain('await wipeLocalAccountData();');
    expect(mergeSwapSource).not.toContain('AsyncStorage.multiRemove(progressKeys)');
    expect(mergeSwapSource).not.toContain('const introKeys');
    expect(source).not.toContain('`lesson${i + 1}_intro_shown`');
  });

  test('account wipe clears Compass onboarding profile context', () => {
    const wipeStart = cloudSyncSource.indexOf('export function accountLocalDataKeysForToday');
    const wipeEnd = cloudSyncSource.indexOf('const CREATED_AT_SYNC_KEY', wipeStart);
    const wipeSource = cloudSyncSource.slice(wipeStart, wipeEnd);

    expect(wipeSource).toContain("'user_profile'");
    expect(wipeSource).toContain('PERSONAL_PLAN_PENDING_ACTIVATION_KEY');
    expect(wipeSource).toContain("'premium_active'");
    expect(cloudSyncSource).toContain("'user_name'");
  });

  test('remote stable-id swap merges accounts on the server (no client-side premium copy / dup)', () => {
    // Premium is carried by the server merge (mergeUserProgress), NOT by copying
    // local premium onto the other account — that produced a duplicate premium and
    // an un-expirable "forever" premium without rc_expiry_ms.
    expect(source).not.toContain('copyLocalRealPremiumToStableId');
    expect(source).not.toContain('REAL_PREMIUM_TRANSFER_KEYS');
    expect(mergeSwapSource).toContain('await mergeStableAccountsViaServer(outcome.mergedFromStableId, outcome.remoteStableId)');
  });

  test('remote stable-id swap degrades to plain swap when server merge cannot own both accounts', () => {
    // Server merge only succeeds when it can prove ownership of BOTH accounts
    // (XP-merge branch). On the returning-user branch the local anonymous account
    // is not owned by the new uid, so merge returns null — we must fall back to a
    // plain swap to remote, NOT error out (that branch worked before this change).
    expect(mergeSwapSource).toContain('merge?.ok && merge.canonicalStableId');
    expect(mergeSwapSource).toContain(': outcome.remoteStableId');
    expect(mergeSwapSource).not.toContain("return { result: 'error', error: 'merge_failed' }");
    // Server merge must run BEFORE setStableId — we swap to the canonical winner.
    expect(mergeSwapSource.indexOf('await mergeStableAccountsViaServer(')).toBeLessThan(
      mergeSwapSource.indexOf('await setStableId('),
    );
    // setStableId uses the canonical result, not blindly the remote id.
    expect(mergeSwapSource).toContain('await setStableId(canonicalStableId)');
  });

  test('stamps anonymous-ownership claim BEFORE signInWithCredential (closes #11 safely)', () => {
    // The claim must be stamped while still anonymous — signInWithCredential
    // destroys the anonymous session, so the server can only verify ownership of
    // the local anonymous account if the claim was written beforehand.
    const stampIdx = source.indexOf('stampAnonOwnershipBeforeSignIn(preSignInStableId)');
    const credentialIdx = source.indexOf('auth.signInWithCredential(credential)');
    expect(stampIdx).toBeGreaterThan(0);
    expect(credentialIdx).toBeGreaterThan(0);
    expect(stampIdx).toBeLessThan(credentialIdx); // stamp happens first
    expect(source).toContain("httpsCallable(getFunctions(getApp(), 'us-central1'), 'authStampAnonOwnership')");
  });

  test('remote stable-id swap clears the premium cache so the previous account status is not shown', () => {
    expect(source).toContain("import { invalidatePremiumCache } from './premium_guard'");
    expect(mergeSwapSource).toContain('invalidatePremiumCache()');
    // Cache must be cleared AFTER the stable id is swapped.
    expect(mergeSwapSource.indexOf('await setStableId(canonicalStableId)')).toBeLessThan(
      mergeSwapSource.indexOf('invalidatePremiumCache()'),
    );
  });

  test('stable auth link cache survives boot but is cleared on account changes', () => {
    const ensureStart = cloudSyncSource.indexOf('export async function ensureStableAuthLinkForStableId');
    const ensureEnd = cloudSyncSource.indexOf('export async function ensureStableAuthLink()', ensureStart);
    const ensureSource = cloudSyncSource.slice(ensureStart, ensureEnd);
    const resetStart = cloudSyncSource.indexOf('export function resetAnonAuthCacheForSignOut');
    const resetEnd = cloudSyncSource.indexOf('export function getCurrentUid', resetStart);
    const resetSource = cloudSyncSource.slice(resetStart, resetEnd);

    expect(cloudSyncSource).toContain("const STABLE_AUTH_LINK_CACHE_KEY = 'stable_auth_link_cache_v1';");
    expect(cloudSyncSource).toContain('DEFAULT_STABLE_AUTH_LINK_CACHE_TTL_MS');
    expect(cloudSyncSource).toContain('getAuthLinkCacheTtlMs');
    expect(cloudSyncSource).toContain('STABLE_AUTH_LINK_CACHE_KEY,');
    expect(ensureSource.indexOf('readStableAuthLinkCache(key)')).toBeGreaterThanOrEqual(0);
    expect(ensureSource.indexOf('readStableAuthLinkCache(key)')).toBeLessThan(ensureSource.indexOf('const fn = callable<'));
    expect(ensureSource).toContain('hasFreshMetadata');
    expect(ensureSource).toContain('linkMetadata?: StableAuthLinkMetadata');
    expect(ensureSource).toContain('writeStableAuthLinkCache(`${cacheStableUid}:${actualAuthUid}`).catch(() => {})');
    expect(ensureSource).toContain('writeStableAuthLinkCache(key).catch(() => {})');
    expect(resetSource).toContain('AsyncStorage.removeItem(STABLE_AUTH_LINK_CACHE_KEY)');
  });

  test('registration prompt reset uses the full account-switch wipe path', () => {
    expect(registrationPromptSource).toContain('signOutAndWipeForAccountSwitch');
    expect(registrationPromptSource).not.toContain('signOutCurrentProvider');
    expect(registrationPromptSource).not.toContain('clearStableId');
    expect(registrationPromptSource).not.toContain('ensureAnonUser');
  });

  test('keeps auth provider runtime free of legacy locale fallback markers', () => {
    expect(source).not.toMatch(legacyRuntimePattern);
  });
});
