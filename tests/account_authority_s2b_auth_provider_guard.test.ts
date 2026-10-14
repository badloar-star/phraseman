/*
 * AA S2b, пункты 9–10 в app/auth_provider.ts (файл не грузится в тестах целиком —
 * нативные модули; поэтому проверяем исходник + поведение вынесенного помощника).
 */
import { readFileSync } from 'fs';
import path from 'path';
import { accountAuthorityProviderErrorCode } from '../modules/account-authority-v2/account_authority_logger';

const source = readFileSync(path.join(process.cwd(), 'app', 'auth_provider.ts'), 'utf8');

function functionBody(text: string, signature: string): string {
  const start = text.indexOf(signature);
  expect(start).toBeGreaterThanOrEqual(0);
  // Файл с CRLF: тело начинается с «{» в конце строки сигнатуры.
  const open = text.slice(start).search(/\{\r?\n/) + start;
  let depth = 0;
  for (let index = open; index < text.length; index += 1) {
    if (text[index] === '{') depth += 1;
    if (text[index] === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }
  throw new Error(`unterminated ${signature}`);
}

describe('AA S2b — auth_provider: nonce M-1 and raw Firebase errors', () => {
  test('stamp asks for the nonce and hands the response to the in-memory nonce module only', () => {
    const body = functionBody(source, 'async function stampAnonOwnershipBeforeSignIn(');
    // зачем (полный прогон 15.10): 0c094c846 (вход через fetch под флагом) вынес тело в payload — тот же объект уходит и в fetch, и в нативный вызов
    expect(body).toContain('const payload = { stableId: localStableId, nonceRequested: true };');
    expect(body).toContain("invokeAuthCallable('authStampAnonOwnership', payload, () => fn(payload)");
    expect(body).toContain('acceptAnonMergeStampResponse(localStableId, response)');
    expect(body).not.toMatch(/AsyncStorage|SecureStore|setItem|mergeNonce/);
  });

  test('every sign-in outcome (success, failure, cancel) clears the nonce', () => {
    const body = functionBody(source, 'async function runSignInWithProvider(');
    const finallyAt = body.indexOf('} finally {');
    expect(finallyAt).toBeGreaterThan(0);
    expect(body.slice(finallyAt)).toContain("forgetAllAnonMergeNonces('sign_in_settled')");
  });

  test('runAccountAuthorityCredentialSignIn never returns or logs the raw error text', () => {
    const body = functionBody(source, 'async function runAccountAuthorityCredentialSignIn(');
    expect(body).not.toMatch(/\.message\b/);
    expect(body.match(/accountAuthorityProviderErrorCode\(error\)/g)).toHaveLength(2);
    expect(body).toContain('return { result: \'error\', error: `native_${code}` }');
    expect(body).toContain('return { result: \'error\', error: `firebase_${code}` }');
  });

  test('the provider error code keeps only a short machine code', () => {
    expect(accountAuthorityProviderErrorCode({ code: 'auth/invalid-credential', message: 'user@mail.com token=abc' }))
      .toBe('auth_invalid-credential');
    expect(accountAuthorityProviderErrorCode({ code: 'SIGN_IN_CANCELLED' })).toBe('sign_in_cancelled');
    expect(accountAuthorityProviderErrorCode({ code: 12501 })).toBe('12501');
    expect(accountAuthorityProviderErrorCode(new Error('Firebase: secret raw text (auth/x).'))).toBe('unknown');
    expect(accountAuthorityProviderErrorCode({ code: 'auth/Xb3kP9qL2mN7vR4tY8wZ1aC5dE6f' })).toBe('unknown');
    expect(accountAuthorityProviderErrorCode(null)).toBe('unknown');
  });
});
