/**
 * Вход Apple, когда почта уже занята аккаунтом Google: сервер привязывает Apple к этому аккаунту сам.
 *
 * зачем (владелец 18.10 кнопкой «Входить само», через координатора): у владельца на iPhone badloar@gmail.com заведён через
 * Google, Apple не привязан — вход Apple падал на auth/email-already-in-use. Здесь: проверяем токен Apple на сервере, находим
 * аккаунт с той же ПОДТВЕРЖДЁННОЙ почтой Google и привязываем к нему apple.com. Клиент повторяет вход тем же токеном Apple
 * (второго окна нет) и получает настоящую сессию apple.com.
 *
 * Почему не custom token: сессия sign_in_provider=custom без метки восстановления отвергается контуром учётной записи
 * (account_authority_policy.ts, classifySignInProvider), а authEnsureStableLink счёл бы её не-провайдерской.
 *
 * Безопасность: привязка только при двух независимых подтверждениях владения одним ящиком — Apple (подпись Apple,
 * email_verified) и Google (подтверждённая почта провайдера google.com). Слияния прогресса гостя здесь нет (правила 1–3 — клиент).
 * Лимиты — в памяти экземпляра (вход не должен падать из-за базы). Журнал [AUTH-APPLE-LINK] без почты и uid.
 * App Check не используется (пломба владельца).
 */
import { createHash, createPublicKey, verify as verifySignature } from 'node:crypto';
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { AUTH_CALLABLE_REGIONS, HOT_CALLABLE_OPTIONS } from './callable_options';
import { callerIpFromRawRequest, enforceLocalCallerWindow, ipRateKey } from './caller_rate_window';

const LOG = '[AUTH-APPLE-LINK]';
export const APPLE_ISSUER = 'https://appleid.apple.com';
export const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';
/** Bundle ID приложения (iOS) и Services ID (вход Apple на Android / web) — тот же, что в Firebase Auth → Apple. */
export const APPLE_AUDIENCES: readonly string[] = ['app.phraseman', 'app.phraseman.siwa'];
const KEYS_TTL_MS = 60 * 60 * 1000;
const CLOCK_SKEW_SEC = 60;

export type AppleJwk = Readonly<{ kid: string; kty: string; n: string; e: string; alg?: string; use?: string }>;

export type AppleIdentityClaims = Readonly<{
  sub: string;
  email: string;
  emailVerified: boolean;
  isPrivateEmail: boolean;
}>;

export type AppleLinkOutcome =
  | Readonly<{ ok: true; linked: boolean; retryCredential: true }>
  | Readonly<{ ok: false; reason: AppleLinkRefusal }>;

export type AppleLinkRefusal =
  | 'apple_token_invalid'
  | 'apple_email_unverified'
  | 'no_account_for_email'
  | 'account_disabled'
  | 'account_email_unverified'
  | 'account_not_google'
  | 'apple_owned_elsewhere'
  | 'account_has_other_apple'
  | 'link_failed';

export class AppleTokenError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'AppleTokenError';
  }
}

const base64UrlDecode = (part: string): Buffer => Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

function parseJsonPart(part: string, code: string): Record<string, unknown> {
  try {
    const value = JSON.parse(base64UrlDecode(part).toString('utf8')) as unknown;
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('not_object');
    return value as Record<string, unknown>;
  } catch {
    // guard-ok: причина — в коде ошибки, вызывающий пишет её в журнал
    throw new AppleTokenError(code);
  }
}

/** sha256(rawNonce) в hex — так клиент передаёт nonce в Apple (auth_provider.ts createAppleSignInNonce). */
export function appleNonceHash(rawNonce: string): string {
  return createHash('sha256').update(rawNonce, 'utf8').digest('hex');
}

/**
 * Проверка Apple ID token: подпись RS256 ключом Apple по kid, издатель, получатель, срок, nonce, почта.
 * Бросает AppleTokenError с кодом причины (без содержимого токена).
 */
export function verifyAppleIdentityToken(
  idToken: string,
  rawNonce: string,
  keys: readonly AppleJwk[],
  nowSec: number,
): AppleIdentityClaims {
  const parts = idToken.split('.');
  if (parts.length !== 3 || parts.some((part) => part.length === 0)) throw new AppleTokenError('token_malformed');
  const header = parseJsonPart(parts[0]!, 'header_malformed');
  if (header.alg !== 'RS256') throw new AppleTokenError('alg_not_rs256');
  const kid = typeof header.kid === 'string' ? header.kid : '';
  const jwk = keys.find((key) => key.kid === kid);
  if (!jwk) throw new AppleTokenError('kid_unknown');
  let publicKey: ReturnType<typeof createPublicKey>;
  try {
    publicKey = createPublicKey({ key: { kty: jwk.kty, n: jwk.n, e: jwk.e }, format: 'jwk' });
  } catch {
    // guard-ok: причина — в коде ошибки
    throw new AppleTokenError('jwk_invalid');
  }
  const signatureOk = verifySignature('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`, 'utf8'), publicKey, base64UrlDecode(parts[2]!));
  if (!signatureOk) throw new AppleTokenError('signature_invalid');
  const claims = parseJsonPart(parts[1]!, 'payload_malformed');
  if (claims.iss !== APPLE_ISSUER) throw new AppleTokenError('issuer_mismatch');
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audiences.some((aud) => typeof aud === 'string' && APPLE_AUDIENCES.includes(aud))) throw new AppleTokenError('audience_mismatch');
  const exp = Number(claims.exp);
  if (!Number.isFinite(exp) || exp + CLOCK_SKEW_SEC < nowSec) throw new AppleTokenError('expired');
  const iat = Number(claims.iat);
  if (Number.isFinite(iat) && iat - CLOCK_SKEW_SEC > nowSec) throw new AppleTokenError('issued_in_future');
  if (typeof claims.nonce !== 'string' || claims.nonce !== appleNonceHash(rawNonce)) throw new AppleTokenError('nonce_mismatch');
  const sub = typeof claims.sub === 'string' ? claims.sub.trim() : '';
  if (!sub) throw new AppleTokenError('sub_missing');
  const email = typeof claims.email === 'string' ? claims.email.trim().toLowerCase() : '';
  if (!email) throw new AppleTokenError('email_missing');
  return Object.freeze({
    sub,
    email,
    // Apple отдаёт булево или строку "true".
    emailVerified: claims.email_verified === true || claims.email_verified === 'true',
    isPrivateEmail: claims.is_private_email === true || claims.is_private_email === 'true',
  });
}

let keysCache: { keys: readonly AppleJwk[]; atMs: number } | null = null;

/** Только для тестов. */
export function resetAppleKeysCacheForTest(): void {
  keysCache = null;
}

async function fetchAppleKeys(fetchImpl: typeof fetch, nowMs: number, force: boolean): Promise<readonly AppleJwk[]> {
  if (!force && keysCache && nowMs - keysCache.atMs < KEYS_TTL_MS) return keysCache.keys;
  const res = await fetchImpl(APPLE_KEYS_URL);
  if (!res.ok) throw new AppleTokenError(`keys_http_${res.status}`);
  const body = (await res.json()) as { keys?: unknown };
  const keys = Array.isArray(body?.keys) ? (body.keys as AppleJwk[]).filter((key) => typeof key?.kid === 'string') : [];
  if (keys.length === 0) throw new AppleTokenError('keys_empty');
  keysCache = { keys, atMs: nowMs };
  return keys;
}

/** Ключи Apple с одним внеочередным обновлением, если kid ещё не знаком (Apple меняет ключи). */
export async function verifyAppleIdentityTokenWithKeys(
  idToken: string,
  rawNonce: string,
  fetchImpl: typeof fetch,
  nowMs: number,
): Promise<AppleIdentityClaims> {
  const keys = await fetchAppleKeys(fetchImpl, nowMs, false);
  try {
    return verifyAppleIdentityToken(idToken, rawNonce, keys, Math.floor(nowMs / 1000));
  } catch (error) {
    if (!(error instanceof AppleTokenError) || error.code !== 'kid_unknown') throw error;
    const fresh = await fetchAppleKeys(fetchImpl, nowMs, true);
    return verifyAppleIdentityToken(idToken, rawNonce, fresh, Math.floor(nowMs / 1000));
  }
}

export type AppleLinkAuthPort = Readonly<{
  getUserByEmail: (email: string) => Promise<admin.auth.UserRecord>;
  getUsers: (identifiers: admin.auth.UserIdentifier[]) => Promise<admin.auth.GetUsersResult>;
  updateUser: (uid: string, request: admin.auth.UpdateRequest) => Promise<admin.auth.UserRecord>;
}>;

const tag = (value: string): string => createHash('sha256').update(value).digest('hex').slice(0, 8);

/**
 * Найти аккаунт по подтверждённой почте Apple и привязать к нему apple.com. Отказы — тихие ({ ok:false, reason }).
 */
export async function linkAppleToVerifiedEmailAccount(
  claims: AppleIdentityClaims,
  auth: AppleLinkAuthPort,
  log: (outcome: string, extra?: Record<string, unknown>) => void,
): Promise<AppleLinkOutcome> {
  const refuse = (reason: AppleLinkRefusal, extra: Record<string, unknown> = {}): AppleLinkOutcome => {
    log('refused', { reason, ...extra });
    return Object.freeze({ ok: false, reason });
  };
  if (!claims.emailVerified) return refuse('apple_email_unverified', { privateEmail: claims.isPrivateEmail });
  let user: admin.auth.UserRecord;
  try {
    user = await auth.getUserByEmail(claims.email);
  } catch (error) {
    const code = String((error as { code?: unknown })?.code ?? '');
    if (code === 'auth/user-not-found') return refuse('no_account_for_email', { privateEmail: claims.isPrivateEmail });
    throw error;
  }
  if (user.disabled) return refuse('account_disabled', { account: tag(user.uid) });
  if (user.emailVerified !== true) return refuse('account_email_unverified', { account: tag(user.uid) });
  // Почта аккаунта должна быть подтверждена именно Google: тот же ящик, второй независимый владелец-подтверждатель.
  const google = user.providerData.find((p) => p.providerId === 'google.com' && String(p.email ?? '').trim().toLowerCase() === claims.email);
  if (!google) return refuse('account_not_google', { account: tag(user.uid) });
  const existingApple = user.providerData.find((p) => p.providerId === 'apple.com');
  if (existingApple) {
    if (existingApple.uid === claims.sub) {
      log('already_linked', { account: tag(user.uid) });
      return Object.freeze({ ok: true, linked: false, retryCredential: true });
    }
    return refuse('account_has_other_apple', { account: tag(user.uid) });
  }
  const owners = await auth.getUsers([{ providerId: 'apple.com', providerUid: claims.sub }]);
  const otherOwner = owners.users.find((owner) => owner.uid !== user.uid);
  if (otherOwner) return refuse('apple_owned_elsewhere', { account: tag(user.uid), owner: tag(otherOwner.uid) });
  try {
    await auth.updateUser(user.uid, { providerToLink: { providerId: 'apple.com', uid: claims.sub, email: claims.email } });
  } catch (error) {
    return refuse('link_failed', { account: tag(user.uid), code: String((error as { code?: unknown })?.code ?? 'unknown').slice(0, 60) });
  }
  log('linked', { account: tag(user.uid) });
  return Object.freeze({ ok: true, linked: true, retryCredential: true });
}

function appleLinkLog(outcome: string, extra: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ event: 'auth_apple_link', tag: LOG, outcome, ...extra }));
}

export const authAppleLinkByVerifiedEmail = onCall({ ...HOT_CALLABLE_OPTIONS, region: AUTH_CALLABLE_REGIONS }, async (request): Promise<AppleLinkOutcome | { ok: true; warm: true }> => {
  if (request.data?.warmup === true) return { ok: true, warm: true };
  const startedAt = Date.now();
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const authUid = request.auth.uid;
  // зачем: вход не должен падать (владелец 18.10) — лимиты только в памяти экземпляра, без базы.
  enforceLocalCallerWindow({ scope: 'apple_link', authUid, maxPerUid: 10 });
  const ip = callerIpFromRawRequest(request.rawRequest);
  if (ip) enforceLocalCallerWindow({ scope: 'apple_link_ip', authUid: ipRateKey(ip), maxPerUid: 30 });
  const idToken = typeof request.data?.idToken === 'string' ? request.data.idToken.trim() : '';
  const rawNonce = typeof request.data?.rawNonce === 'string' ? request.data.rawNonce.trim() : '';
  if (!idToken || idToken.length > 8192 || !/^[0-9a-f]{16,128}$/i.test(rawNonce)) {
    throw new HttpsError('invalid-argument', 'apple_link_input_invalid');
  }
  const log = (outcome: string, extra: Record<string, unknown> = {}) =>
    appleLinkLog(outcome, { caller: tag(authUid), provider: String(request.auth?.token?.firebase?.sign_in_provider ?? ''), ms: Date.now() - startedAt, ...extra });
  let claims: AppleIdentityClaims;
  try {
    claims = await verifyAppleIdentityTokenWithKeys(idToken, rawNonce, fetch, Date.now());
  } catch (error) {
    const code = error instanceof AppleTokenError ? error.code : 'verify_failed';
    log('refused', { reason: 'apple_token_invalid', code });
    return Object.freeze({ ok: false, reason: 'apple_token_invalid' as const });
  }
  const auth = admin.auth();
  try {
    return await linkAppleToVerifiedEmailAccount(claims, {
      getUserByEmail: (email) => auth.getUserByEmail(email),
      getUsers: (identifiers) => auth.getUsers(identifiers),
      updateUser: (uid, req) => auth.updateUser(uid, req),
    }, log);
  } catch (error) {
    // Сбой Firebase Auth — тихий отказ: клиент идёт прежним путём, причина в журнале.
    log('refused', { reason: 'link_failed', code: String((error as { code?: unknown })?.code ?? 'unknown').slice(0, 60) });
    return Object.freeze({ ok: false, reason: 'link_failed' as const });
  }
});
