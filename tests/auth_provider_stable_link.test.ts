import { readFileSync } from 'fs';
import path from 'path';

const authProviderPath = path.join(process.cwd(), 'app', 'auth_provider.ts');

describe('auth provider stable-id linking', () => {
  const source = readFileSync(authProviderPath, 'utf8');
  const signInStart = source.indexOf('export async function signInWithProvider');
  const transactionStart = source.indexOf('outcome = await db.runTransaction', signInStart);
  const preTransactionSource = source.slice(signInStart, transactionStart);

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
});
