import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const read = (relative: string): string => fs.readFileSync(path.join(ROOT, relative), 'utf8');

function functionBody(source: string, signature: string): string {
  const start = source.indexOf(signature);
  expect(start).toBeGreaterThanOrEqual(0);
  const open = source.indexOf('{', source.indexOf(')', start));
  expect(open).toBeGreaterThan(start);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open, index + 1);
    }
  }
  throw new Error(`unterminated ${signature}`);
}

describe('Account Authority 2.0 provider wiring', () => {
  test('keeps the authority cutover globally off and isolates legacy Account V2 behind an explicit fallback', () => {
    const gate = read('app/accounts_v2_client_flag.ts');
    expect(gate).toContain('const ACCOUNT_AUTHORITY_V2_GLOBAL_CUTOVER_ENABLED = false;');
    expect(gate).toContain('export function isAccountAuthorityV2CutoverEnabled(): boolean');

    const signIn = functionBody(gate, 'export function runAccountAuthorityProviderSignInTransition');
    const signOut = functionBody(gate, 'export function runAccountAuthorityProviderSignOutTransition');
    expect(signIn).toContain('if (!isAccountAuthorityV2CutoverEnabled())');
    expect(signIn).toContain('runLegacyAccountsV2ProviderSignInTransition(legacyAuthenticate)');
    expect(signIn).toContain('client.runAccountAuthorityProviderSignInTransition(');
    expect(signOut).toContain('if (!isAccountAuthorityV2CutoverEnabled())');
    expect(signOut).toContain('runLegacyAccountsV2ProviderSignOutTransition(authenticate)');
    expect(signOut).toContain('client.runAccountAuthorityProviderSignOutTransition(');
  });

  test('provider entrypoints delegate to the authority seam without directly opening or closing account scope', () => {
    const source = read('app/auth_provider.ts');
    const signIn = functionBody(source, 'export async function signInWithProvider(');
    const signOut = functionBody(source, 'export async function signOutCurrentProvider(');
    expect(signIn).toContain('runAccountAuthorityProviderSignInTransition(');
    // зачем (шаг 3 пакета auth-legacy-google-not-found): обе ветки получают одноразовый
    // пропуск входа после смены аккаунта (null при обычном входе).
    expect(signIn).toContain('runAccountAuthorityCredentialSignIn(provider, resumeCredential)');
    expect(signIn).toContain('runSignInWithProvider(provider, options, resumeCredential)');
    expect(signOut).toContain('runAccountAuthorityProviderSignOutTransition(');

    for (const body of [signIn, signOut]) {
      expect(body).not.toMatch(/setAuthUid|openScope|closeScope|\baccountId\b|\bsessionId\b|\blease\b/i);
      expect(body).not.toContain('runAccountsV2ProviderSignInTransition(');
      expect(body).not.toContain('runAccountsV2ProviderSignOutTransition(');
    }
  });

  test('cutover credential callback excludes every legacy ownership mutation and mismatch recovery path', () => {
    const source = read('app/auth_provider.ts');
    const body = functionBody(source, 'async function runAccountAuthorityCredentialSignIn(');
    expect(body).toContain('auth.signInWithCredential(credential)');
    expect(body).not.toMatch(/stableId|stable_id|auth_links|wipe|restoreFromCloud|rejectRecoveryProviderMismatch|ensureAnonUser/);

    const gate = read('app/accounts_v2_client_flag.ts');
    const facade = functionBody(gate, 'export function runAccountAuthorityProviderSignInTransition');
    expect(facade).toContain('runLegacyAccountsV2ProviderSignInTransition(legacyAuthenticate)');
    expect(facade).toContain('client.runAccountAuthorityProviderSignInTransition(authorityAuthenticate)');
    expect(facade).not.toContain('client.runAccountAuthorityProviderSignInTransition(legacyAuthenticate)');
  });

  test('sign-in, sign-out, and startup reauth enter the core FIFO authority runtime', () => {
    const runtime = read('modules/account-session-v2/accounts_v2_client_runtime.ts');
    expect(runtime).toContain("from '../account-authority-v2/account_authority_runtime'");
    expect(runtime).toContain('createAccountAuthorityRuntime({');

    const signIn = functionBody(runtime, 'export async function runAccountAuthorityProviderSignInTransition');
    const signOut = functionBody(runtime, 'export async function runAccountAuthorityProviderSignOutTransition');
    const resume = functionBody(runtime, 'export async function resumeAccountAuthorityProviderSession');
    expect(signIn).toContain('.signIn(operationId)');
    expect(signOut).toContain('.signOut(operationId)');
    expect(resume).toContain('.resume(operationId)');
    expect(signIn).not.toContain('setAuthUid(');
    expect(signOut).not.toContain('setAuthUid(');
    expect(resume).not.toContain('setAuthUid(');

    const gate = read('app/accounts_v2_client_flag.ts');
    const startup = functionBody(gate, 'export function syncAccountsV2ClientAuth(');
    expect(startup).toContain('isAccountAuthorityV2CutoverEnabled()');
    expect(startup).toContain('client.resumeAccountAuthorityProviderSession()');
  });

  test('the client bridge never derives server-owned account or session ids from Firebase uid', () => {
    const runtime = read('modules/account-session-v2/accounts_v2_client_runtime.ts');
    expect(runtime).toContain('parseFirebaseAuthUid(uid)');
    expect(runtime).not.toContain('parseAccountId(');
    expect(runtime).not.toContain('parseSessionId(');
    expect(runtime).toContain('lease: bootstrap.lease');
    expect(runtime).toContain('localStore: bootstrap.localStore');
    expect(runtime).toContain('providerSignOut: () => Promise<void>');
    expect(runtime).not.toContain('pendingAuthoritySignOuts');
  });

  test.each([
    'async function runGoogleNativeSignIn(',
    'async function runAppleNativeSignIn(',
    'async function runAppleAndroidOAuthSignIn(',
  ])('%s remains credential-only and cannot mutate account authority state', (signature) => {
    const body = functionBody(read('app/auth_provider.ts'), signature);
    expect(body).not.toMatch(/setAuthUid|openScope|closeScope|accountId|sessionId|lease/i);
    expect(body).not.toContain('runAccountAuthorityProvider');
  });
});
