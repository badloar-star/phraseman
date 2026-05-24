import { readFileSync } from 'fs';
import path from 'path';

const authProviderPath = path.join(process.cwd(), 'app', 'auth_provider.ts');

describe('auth provider stable-id linking', () => {
  const source = readFileSync(authProviderPath, 'utf8');
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

  test('signInWithProvider pre-links an existing remote stable id before merge writes', () => {
    expect(preTransactionSource).toMatch(/ensureStableAuthLinkForStableId\(remoteStableId\)/);
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

  test('keeps auth provider runtime free of legacy locale fallback markers', () => {
    expect(source).not.toMatch(legacyRuntimePattern);
  });
});
