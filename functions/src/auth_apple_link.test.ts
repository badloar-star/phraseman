// зачем (владелец 18.10 «Входить само»): вход Apple при почте, занятой аккаунтом Google. Проверки на настоящих RSA-подписях:
// токен Apple подделать нельзя, привязка только при подтверждённой почте Apple И Google, отказы тихие, журнал без почты.
import { createSign, generateKeyPairSync, type KeyObject } from 'node:crypto';
import {
  APPLE_ISSUER,
  AppleTokenError,
  appleNonceHash,
  linkAppleToVerifiedEmailAccount,
  verifyAppleIdentityToken,
  type AppleJwk,
  type AppleLinkAuthPort,
} from './auth_apple_link';
import { authAppleLinkByVerifiedEmail } from './auth_apple_link';

const b64url = (value: Buffer | string) => Buffer.from(value).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

function keyPair(kid: string): { privateKey: KeyObject; jwk: AppleJwk } {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const exported = publicKey.export({ format: 'jwk' }) as { n: string; e: string };
  return { privateKey, jwk: { kid, kty: 'RSA', n: exported.n, e: exported.e, alg: 'RS256' } };
}

function sign(privateKey: KeyObject, kid: string, claims: Record<string, unknown>, alg = 'RS256'): string {
  const head = b64url(JSON.stringify({ alg, kid }));
  const body = b64url(JSON.stringify(claims));
  const signer = createSign('RSA-SHA256');
  signer.update(`${head}.${body}`);
  return `${head}.${body}.${b64url(signer.sign(privateKey))}`;
}

const NOW = 1_800_000_000;
const RAW_NONCE = 'a'.repeat(64);
const main = keyPair('k1');
const other = keyPair('k2');
const goodClaims = (over: Record<string, unknown> = {}) => ({
  iss: APPLE_ISSUER, aud: 'app.phraseman', sub: 'apple-sub-1', email: 'Owner@Gmail.com', email_verified: 'true',
  iat: NOW - 10, exp: NOW + 600, nonce: appleNonceHash(RAW_NONCE), ...over,
});
const verifyCode = (token: string, keys: AppleJwk[] = [main.jwk], nonce = RAW_NONCE): string => {
  try {
    verifyAppleIdentityToken(token, nonce, keys, NOW);
    return 'ok';
  } catch (error) {
    return error instanceof AppleTokenError ? error.code : 'other';
  }
};

describe('verifyAppleIdentityToken', () => {
  it('настоящий токен Apple принимается; почта приводится к нижнему регистру', () => {
    expect(verifyAppleIdentityToken(sign(main.privateKey, 'k1', goodClaims()), RAW_NONCE, [main.jwk], NOW))
      .toEqual({ sub: 'apple-sub-1', email: 'owner@gmail.com', emailVerified: true, isPrivateEmail: false });
    // Services ID (вход Apple на Android) — тоже наш получатель.
    expect(verifyCode(sign(main.privateKey, 'k1', goodClaims({ aud: 'app.phraseman.siwa' })))).toBe('ok');
  });

  it.each([
    ['чужой ключ подписи', () => sign(other.privateKey, 'k1', goodClaims()), 'signature_invalid'],
    ['неизвестный kid', () => sign(other.privateKey, 'k2', goodClaims()), 'kid_unknown'],
    ['чужое приложение (aud)', () => sign(main.privateKey, 'k1', goodClaims({ aud: 'com.evil.app' })), 'audience_mismatch'],
    ['не Apple (iss)', () => sign(main.privateKey, 'k1', goodClaims({ iss: 'https://evil.example' })), 'issuer_mismatch'],
    ['истёк', () => sign(main.privateKey, 'k1', goodClaims({ exp: NOW - 120 })), 'expired'],
    ['неверный nonce', () => sign(main.privateKey, 'k1', goodClaims({ nonce: appleNonceHash('b'.repeat(64)) })), 'nonce_mismatch'],
    ['без почты', () => sign(main.privateKey, 'k1', goodClaims({ email: undefined })), 'email_missing'],
    ['alg none', () => sign(main.privateKey, 'k1', goodClaims(), 'none'), 'alg_not_rs256'],
    ['мусор', () => 'not.a.jwt.at.all', 'token_malformed'],
  ])('%s → отказ', (_name, token, code) => {
    expect(verifyCode(token())).toBe(code);
  });

  it('подмена тела при старой подписи → отказ', () => {
    const [h, , s] = sign(main.privateKey, 'k1', goodClaims()).split('.');
    const forged = `${h}.${b64url(JSON.stringify(goodClaims({ email: 'victim@gmail.com' })))}.${s}`;
    expect(verifyCode(forged)).toBe('signature_invalid');
  });
});

describe('linkAppleToVerifiedEmailAccount', () => {
  type Provider = { providerId: string; uid: string; email?: string };
  const record = (over: Record<string, unknown> = {}) => ({
    uid: 'u-owner', disabled: false, emailVerified: true,
    providerData: [{ providerId: 'google.com', uid: 'g-1', email: 'owner@gmail.com' }] as Provider[],
    ...over,
  });
  const port = (user: ReturnType<typeof record> | null, appleOwners: string[] = []) => {
    const updates: Array<[string, unknown]> = [];
    const auth: AppleLinkAuthPort = {
      getUserByEmail: async () => {
        if (!user) throw Object.assign(new Error('no user'), { code: 'auth/user-not-found' });
        return user as never;
      },
      getUsers: async () => ({ users: appleOwners.map((uid) => ({ uid })), notFound: [] }) as never,
      updateUser: async (uid, req) => { updates.push([uid, req]); return user as never; },
    };
    return { auth, updates };
  };
  const claims = { sub: 'apple-sub-1', email: 'owner@gmail.com', emailVerified: true, isPrivateEmail: false };
  const lines: string[] = [];
  const log = (outcome: string, extra: Record<string, unknown> = {}) => { lines.push(JSON.stringify({ outcome, ...extra })); };
  beforeEach(() => { lines.length = 0; });

  it('подтверждённые почты Apple и Google совпали → apple.com привязан к аккаунту', async () => {
    const { auth, updates } = port(record());
    await expect(linkAppleToVerifiedEmailAccount(claims, auth, log)).resolves.toEqual({ ok: true, linked: true, retryCredential: true });
    expect(updates).toEqual([['u-owner', { providerToLink: { providerId: 'apple.com', uid: 'apple-sub-1', email: 'owner@gmail.com' } }]]);
    expect(lines.join('\n')).not.toContain('owner@gmail.com');
    expect(lines.join('\n')).not.toContain('u-owner');
  });

  it('повтор: Apple уже привязан тем же sub → linked:false, без записи', async () => {
    const { auth, updates } = port(record({ providerData: [
      { providerId: 'google.com', uid: 'g-1', email: 'owner@gmail.com' }, { providerId: 'apple.com', uid: 'apple-sub-1' },
    ] }));
    await expect(linkAppleToVerifiedEmailAccount(claims, auth, log)).resolves.toEqual({ ok: true, linked: false, retryCredential: true });
    expect(updates).toEqual([]);
  });

  it.each([
    ['почта Apple не подтверждена', record(), [], { ...claims, emailVerified: false }, 'apple_email_unverified'],
    ['нет аккаунта с этой почтой', null, [], claims, 'no_account_for_email'],
    ['аккаунт отключён', record({ disabled: true }), [], claims, 'account_disabled'],
    ['почта аккаунта не подтверждена', record({ emailVerified: false }), [], claims, 'account_email_unverified'],
    ['почта не от Google (пароль)', record({ providerData: [{ providerId: 'password', uid: 'x', email: 'owner@gmail.com' }] }), [], claims, 'account_not_google'],
    ['этот Apple уже у другого аккаунта', record(), ['u-other'], claims, 'apple_owned_elsewhere'],
    ['у аккаунта другой Apple', record({ providerData: [
      { providerId: 'google.com', uid: 'g-1', email: 'owner@gmail.com' }, { providerId: 'apple.com', uid: 'apple-sub-OTHER' },
    ] }), [], claims, 'account_has_other_apple'],
  ])('%s → тихий отказ без привязки', async (_name, user, owners, input, reason) => {
    const { auth, updates } = port(user as ReturnType<typeof record> | null, owners as string[]);
    await expect(linkAppleToVerifiedEmailAccount(input, auth, log)).resolves.toEqual({ ok: false, reason });
    expect(updates).toEqual([]);
  });

  it('сбой привязки в Firebase Auth → тихий отказ link_failed', async () => {
    const { auth } = port(record());
    const failing: AppleLinkAuthPort = { ...auth, updateUser: async () => { throw Object.assign(new Error('x'), { code: 'auth/internal-error' }); } };
    await expect(linkAppleToVerifiedEmailAccount(claims, failing, log)).resolves.toEqual({ ok: false, reason: 'link_failed' });
  });
});

test('функция выкладывается в europe-west1 и us-central1, как остальной вход', () => {
  expect((authAppleLinkByVerifiedEmail as unknown as { __endpoint: { region: unknown } }).__endpoint.region).toEqual(['us-central1', 'europe-west1']);
});

// зачем (Ревизор 3.139 🟡): токены с незнакомым kid не должны каждый раз дёргать ключи Apple — не чаще раза в минуту.
test('внеочередное обновление ключей Apple — не чаще раза в минуту на экземпляр', async () => {
  const { resetAppleKeysCacheForTest, verifyAppleIdentityTokenWithKeys } = await import('./auth_apple_link');
  resetAppleKeysCacheForTest();
  const fetchImpl = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ keys: [main.jwk] }) }) as unknown as Response);
  const foreign = sign(other.privateKey, 'k2', goodClaims());
  const t0 = NOW * 1000;
  await expect(verifyAppleIdentityTokenWithKeys(foreign, RAW_NONCE, fetchImpl, t0)).rejects.toMatchObject({ code: 'kid_unknown' });
  expect(fetchImpl).toHaveBeenCalledTimes(2); // плановая загрузка + одно внеочередное обновление
  await expect(verifyAppleIdentityTokenWithKeys(foreign, RAW_NONCE, fetchImpl, t0 + 10_000)).rejects.toMatchObject({ code: 'kid_unknown' });
  expect(fetchImpl).toHaveBeenCalledTimes(2); // через 10 с — без нового запроса
  await expect(verifyAppleIdentityTokenWithKeys(foreign, RAW_NONCE, fetchImpl, t0 + 61_000)).rejects.toMatchObject({ code: 'kid_unknown' });
  expect(fetchImpl).toHaveBeenCalledTimes(3); // через минуту — снова можно
  // Настоящий токен по-прежнему проходит из кэша.
  await expect(verifyAppleIdentityTokenWithKeys(sign(main.privateKey, 'k1', goodClaims()), RAW_NONCE, fetchImpl, t0 + 62_000)).resolves.toMatchObject({ sub: 'apple-sub-1' });
});
