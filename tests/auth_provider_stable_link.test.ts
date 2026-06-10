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

  test('signInWithProvider links the local stable id through the auth callable before Firestore transaction writes', () => {
    expect(source).toContain('ensureStableAuthLinkForStableId');
    expect(preTransactionSource).toMatch(/ensureStableAuthLinkForStableId\(localStableId\)/);
  });

  test('cross-device merge (different remote stable id) is delegated to the server CF, not a client transaction', () => {
    // Root cause of the account-split bug: the client transaction read the OTHER
    // device's users/{remoteStableId}, which Firestore rules deny → transaction
    // failed → no merge → two accounts. The merge now runs server-side (Admin SDK)
    // via authMergeStableAccounts, and the client only swaps to the canonical id.
    expect(source).toContain('mergeStableAccountsViaServer(localStableId, remoteStableId)');
    expect(cloudSyncSource).toContain('export async function mergeStableAccountsViaServer');
    expect(cloudSyncSource).toContain("'authMergeStableAccounts'");
    // On a failed server merge we must NOT blindly swap / create a third profile.
    expect(source).toContain("captureAuthSignInFailure(provider, 'merge', 'server_merge_failed')");
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

  test('remote stable-id swap carries real paid Premium into the winning account before local wipe', () => {
    expect(source).toContain('copyLocalRealPremiumToStableId');
    expect(source).toContain('REAL_PREMIUM_TRANSFER_KEYS');
    expect(source).toContain("plan === 'monthly' || plan === 'yearly' || plan === 'annual'");
    expect(mergeSwapSource).toContain('await copyLocalRealPremiumToStableId(db, outcome.remoteStableId)');
    expect(mergeSwapSource.indexOf('await copyLocalRealPremiumToStableId(db, outcome.remoteStableId)')).toBeLessThan(
      mergeSwapSource.indexOf('await wipeLocalAccountData();'),
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
