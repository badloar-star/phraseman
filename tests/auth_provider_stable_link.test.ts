import { readFileSync } from 'fs';
import path from 'path';

const authProviderPath = path.join(process.cwd(), 'app', 'auth_provider.ts');
const cloudSyncPath = path.join(process.cwd(), 'app', 'cloud_sync.ts');

describe('auth provider stable-id linking', () => {
  const source = readFileSync(authProviderPath, 'utf8');
  const cloudSyncSource = readFileSync(cloudSyncPath, 'utf8');
  const legacyRuntimePattern =
    /\b(lang === 'ru'|lang === 'uk'|lang === 'es'|return\s+[^;\n]*(?:RU|UK|ES)\b|\?\?\s*[^;\n]*(?:RU|UK|ES)\b|fallback)\b/u;
  const signInStart = source.indexOf('export async function signInWithProvider');
  const transactionStart = source.indexOf('outcome = await db.runTransaction', signInStart);
  const preTransactionSource = source.slice(signInStart, transactionStart);
  const mergeSwapStart = source.indexOf("if (outcome.kind === 'merged_swap_to_remote')", signInStart);
  const mergeSwapEnd = source.indexOf("if (outcome.kind === 'merged_keep_local')", mergeSwapStart);
  const mergeSwapSource = source.slice(mergeSwapStart, mergeSwapEnd);

  test('signInWithProvider checks an existing provider link before relinking the local stable id', () => {
    expect(source).toContain('ensureStableAuthLinkForStableId');
    expect(preTransactionSource).toMatch(/const linkedStableId = linkSnap\.exists \? linkSnap\.data\(\)\?\.stable_id : null/);
    expect(preTransactionSource).toMatch(/ensureStableAuthLinkForStableId\(remoteStableId\)/);
    expect(preTransactionSource).toMatch(/ensureStableAuthLinkForStableId\(localStableId\)/);
    expect(preTransactionSource.indexOf('const linkedStableId = linkSnap.exists')).toBeLessThan(
      preTransactionSource.indexOf('ensureStableAuthLinkForStableId(localStableId)'),
    );
  });

  test('cross-device sign-in swaps to the provider-linked stable id before client transactions', () => {
    // Root cause of this sign-in outage: auth_links/{providerUid} can already
    // point at remoteStableId. Relinking localStableId first is then correctly
    // rejected as stable_id_mismatch, so the app must swap to remoteStableId.
    expect(preTransactionSource).toContain("captureAuthSignInFailure(provider, 'auth_link', 'remote_stable_link_failed')");
    expect(preTransactionSource).toContain("remoteStableId,\n      mergedFromStableId: localStableId");
    expect(cloudSyncSource).toContain('export async function mergeStableAccountsViaServer');
    expect(cloudSyncSource).toContain("'authMergeStableAccounts'");
  });

  test('linkedAuth user patches carry firebaseAuthUid for Firestore owner rules', () => {
    expect(source).toMatch(/linkedAuth[\s\S]{0,80}firebaseAuthUid: firebaseProviderUid/);
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

  test('remote stable-id swap merges accounts on the server (no client-side premium copy / dup)', () => {
    // Premium is carried by the server merge (mergeUserProgress), NOT by copying
    // local premium onto the other account — that produced a duplicate premium and
    // an un-expirable "forever" premium without rc_expiry_ms.
    expect(source).not.toContain('copyLocalRealPremiumToStableId');
    expect(source).not.toContain('REAL_PREMIUM_TRANSFER_KEYS');
    expect(mergeSwapSource).toContain('await mergeStableAccountsViaServer(outcome.mergedFromStableId, outcome.remoteStableId)');
  });

  test('remote stable-id swap aborts (no swap) when the server merge fails — never creates a third profile', () => {
    expect(mergeSwapSource).toContain("captureAuthSignInFailure(provider, 'merge', 'server_merge_failed')");
    expect(mergeSwapSource).toContain("return { result: 'error', error: 'merge_failed' }");
    // Server merge must run BEFORE setStableId — we only swap to the canonical winner.
    expect(mergeSwapSource.indexOf('await mergeStableAccountsViaServer(')).toBeLessThan(
      mergeSwapSource.indexOf('await setStableId('),
    );
    // setStableId uses the canonical result, not blindly the remote id.
    expect(mergeSwapSource).toContain('await setStableId(canonicalStableId)');
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
    expect(cloudSyncSource).toContain('STABLE_AUTH_LINK_CACHE_TTL_MS');
    expect(cloudSyncSource).toContain('STABLE_AUTH_LINK_CACHE_KEY,');
    expect(ensureSource.indexOf('readStableAuthLinkCache(key)')).toBeGreaterThanOrEqual(0);
    expect(ensureSource.indexOf('readStableAuthLinkCache(key)')).toBeLessThan(ensureSource.indexOf("callable<{ stableId: string }"));
    expect(ensureSource).toContain('writeStableAuthLinkCache(key).catch(() => {})');
    expect(resetSource).toContain('AsyncStorage.removeItem(STABLE_AUTH_LINK_CACHE_KEY)');
  });

  test('keeps auth provider runtime free of legacy locale fallback markers', () => {
    expect(source).not.toMatch(legacyRuntimePattern);
  });
});
