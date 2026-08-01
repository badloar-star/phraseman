import * as crypto from 'crypto';
import * as admin from 'firebase-admin';
import { defineSecret, defineString } from 'firebase-functions/params';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { maskEmailForRecoveryHint } from './auth_identity';
import { ACCOUNT_DELETE_AUTH_MARKERS, ACCOUNT_DELETE_TOMBSTONES } from './account_delete_job';
import { sendTransactionalEmail } from './admin_email';
import { sendTelegramAlert, ADMIN_ALERT_BOT_TOKEN } from './admin_alerts';
import { RESEND_API_KEY } from './resend_secret';

/**
 * Самообслуживаемое восстановление доступа к аккаунту по email-коду.
 *
 * Сценарий инцидента: юзер переустановил приложение, жмёт «Войти через Google»,
 * но на устройстве несколько Google-аккаунтов и он выбирает НЕ ТОТ — получает
 * новый provider uid и «пустой» аккаунт (прогресс «потерян»). Выход без
 * ручных действий владельца: юзер вводит свой stable_id (есть на устройстве),
 * сервер шлёт 6-значный код на email ПРИВЯЗКИ (users/{stableId}.linkedAuth.email,
 * адрес из input НЕ принимается), юзер вводит код — и сервер перепривязывает
 * его ТЕКУЩИЙ provider uid к старому stable_id. Код — доказательство владения
 * почтой привязки, поэтому перепривязка безопасна.
 *
 * Форма записей перепривязки НАМЕРЕННО повторяет ensureAuthLinkDoc /
 * ensureProviderLinkedAuth из auth_identity.ts (auth_links/{uid}.stable_id +
 * users/{stableId}.firebaseAuthUid/linkedAuth). Если меняется та форма —
 * синхронно менять здесь. Пишем вручную внутри транзакции, потому что
 * ensureAuthLinkDoc работает вне транзакций и не даёт атомарности
 * «проверка кода → перепривязка → consumed».
 */

const USERS = 'users';
const AUTH_LINKS = 'auth_links';
const LEADERBOARD = 'leaderboard';
const RECOVERY_CODES = 'auth_recovery_codes';
const RECOVERY_RATE_LIMITS = 'auth_recovery_rate_limits';
const RECOVERY_EVENTS = 'auth_recovery_events';

export const CLEAN_RECOVERY_COLLECTIONS = {
  challenges: 'auth_recovery_challenges',
  deliveryIntents: 'auth_recovery_delivery_intents',
  idempotency: 'auth_recovery_idempotency',
  rateLimits: 'auth_recovery_clean_rate_limits',
} as const;

export const AUTH_RECOVERY_CHALLENGE_HMAC_KEY_CURRENT =
  defineSecret('AUTH_RECOVERY_CHALLENGE_HMAC_KEY_CURRENT');
export const AUTH_RECOVERY_CHALLENGE_HMAC_KEY_PREVIOUS =
  defineSecret('AUTH_RECOVERY_CHALLENGE_HMAC_KEY_PREVIOUS');
const AUTH_RECOVERY_CHALLENGE_HMAC_KEY_CURRENT_VERSION =
  defineString('AUTH_RECOVERY_CHALLENGE_HMAC_KEY_CURRENT_VERSION', { default: 'v1' });
const AUTH_RECOVERY_CHALLENGE_HMAC_KEY_PREVIOUS_VERSION =
  defineString('AUTH_RECOVERY_CHALLENGE_HMAC_KEY_PREVIOUS_VERSION', { default: 'v0' });

const CODE_TTL_MS = 10 * 60 * 1000; // код живёт 10 минут
const CODE_MAX_ATTEMPTS = 5; // после 5 неверных попыток код блокируется
const RATE_WINDOW_MS = 60 * 60 * 1000; // окно rate-limit — 1 час
const RATE_MAX_PER_WINDOW = 3; // не больше 3 писем в час на stable_id
const ROLLBACK_WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // окно отката перепривязки — 14 дней

const HANDOFF_ELIGIBILITY_MS = 10 * 60 * 1000;
const CLEAN_RECOVERY_MIN_RESPONSE_MS = 400;
const CLEAN_RECOVERY_JITTER_MAX_MS = 75;
const CLEAN_RECOVERY_RATE_WINDOW_MS = 60 * 60 * 1000;
const CLEAN_RECOVERY_RATE_MAX = 3;
const CLEAN_RECOVERY_DELIVERY_LEASE_MS = 2 * 60 * 1000;

const CLEAN_RECOVERY_SECRETS = [
  AUTH_RECOVERY_CHALLENGE_HMAC_KEY_CURRENT,
  AUTH_RECOVERY_CHALLENGE_HMAC_KEY_PREVIOUS,
];

const CLEAN_RECOVERY_DELIVERY_SECRETS = [
  ...CLEAN_RECOVERY_SECRETS,
  RESEND_API_KEY,
];

const CLEAN_RECOVERY_CALLABLE_OPTIONS = {
  ...HOT_CALLABLE_OPTIONS,
  enforceAppCheck: true,
  secrets: CLEAN_RECOVERY_SECRETS,
};

const REQUEST_RECOVERY_CALLABLE_OPTIONS = {
  ...HOT_CALLABLE_OPTIONS,
  enforceAppCheck: true,
  secrets: [RESEND_API_KEY],
};

const CONFIRM_RECOVERY_CALLABLE_OPTIONS = {
  ...HOT_CALLABLE_OPTIONS,
  enforceAppCheck: true,
  secrets: [ADMIN_ALERT_BOT_TOKEN],
};

const HANDOFF_CALLABLE_OPTIONS = {
  ...HOT_CALLABLE_OPTIONS,
  enforceAppCheck: true,
};

const HANDOFF_LEASE_MS = 30 * 1000;
const HANDOFF_ACKNOWLEDGE_MS = 65 * 60 * 1000;
const HANDOFF_MAX_MINT_ATTEMPTS = 5;
const HANDOFF_MAX_SUCCESSFUL_ISSUES = 3;

type RecoveryProvider = 'google' | 'apple';

type RecoverySession = {
  authUid: string;
  provider: RecoveryProvider;
};

function requireRecoverySession(request: {
  app?: unknown;
  auth?: { uid?: string; token?: Record<string, unknown> } | null;
}): RecoverySession {
  if (!request.app) throw new HttpsError('failed-precondition', 'app_check_required');
  const authUid = String(request.auth?.uid ?? '').trim();
  if (!authUid) throw new HttpsError('unauthenticated', 'auth_required');
  const token = request.auth?.token ?? {};
  const firebase = token.firebase;
  const signInProvider = firebase && typeof firebase === 'object'
    ? String((firebase as { sign_in_provider?: unknown }).sign_in_provider ?? '').trim()
    : '';
  const provider = signInProvider === 'google.com'
    ? 'google'
    : signInProvider === 'apple.com'
      ? 'apple'
      : null;
  if (!provider || token.email_verified !== true) {
    throw new HttpsError('permission-denied', 'recovery_provider_required');
  }
  return { authUid, provider };
}

function snapshotFingerprint(snapshot: {
  exists: boolean;
  data: () => FirebaseFirestore.DocumentData | undefined;
  updateTime?: { seconds?: number; nanoseconds?: number; toMillis?: () => number };
}): string {
  const updateTime = snapshot.updateTime;
  const version = updateTime
    ? typeof updateTime.seconds === 'number' && typeof updateTime.nanoseconds === 'number'
      ? `${updateTime.seconds}:${updateTime.nanoseconds}`
      : typeof updateTime.toMillis === 'function'
        ? String(updateTime.toMillis())
        : 'unknown'
    : 'missing';
  return JSON.stringify({
    exists: snapshot.exists,
    stableId: String(snapshot.data()?.stable_id ?? '').trim(),
    version,
  });
}

function userIdentityFingerprint(snapshot: {
  exists: boolean;
  data: () => FirebaseFirestore.DocumentData | undefined;
}): string {
  const data = snapshot.data() ?? {};
  const linked = readLinkedAuth(data);
  return JSON.stringify({
    exists: snapshot.exists,
    firebaseAuthUid: String(data.firebaseAuthUid ?? '').trim(),
    provider: linked.provider,
    providerUid: linked.providerUid,
  });
}

function oldProviderUids(userData: FirebaseFirestore.DocumentData): string[] {
  const linked = readLinkedAuth(userData);
  return Array.from(new Set([
    String(userData.firebaseAuthUid ?? '').trim(),
    linked.providerUid,
  ].filter(Boolean)));
}

function isProviderOwnedUser(userData: FirebaseFirestore.DocumentData): boolean {
  const linked = readLinkedAuth(userData);
  return Boolean(linked.provider || linked.providerUid);
}

function stableTransactionalEmailError(error: unknown): string {
  const value = String(error ?? '').trim();
  if (value === 'resend_key_missing') return value;
  if (value === 'resend_http_failed' || value === 'resend_transport_failed') return value;
  return 'transactional_email_failed';
}

function throwRecoveryUnavailable(): never {
  console.warn(JSON.stringify({ event: 'auth_recovery_failed' }));
  throw new HttpsError('internal', 'recovery_unavailable');
}

function throwIdentityMismatch(): never {
  throw new HttpsError('permission-denied', 'recovery_identity_mismatch');
}

function assertTargetAnchorIfPresent(
  snapshot: FirebaseFirestore.DocumentSnapshot,
  stableId: string,
  providerUid: string,
  provider: RecoveryProvider,
): boolean {
  // Legacy cleanup may already have purged this provider anchor. In that case
  // the transactionally-read users document remains the ownership authority.
  if (!snapshot.exists) return false;
  const data = snapshot.data() ?? {};
  if (
    String(data.stable_id ?? '').trim() !== stableId
    || String(data.providerUid ?? '').trim() !== providerUid
    || String(data.provider ?? '').trim() !== provider
  ) {
    throwIdentityMismatch();
  }
  return true;
}

function assertSessionProvider(
  sessionProvider: RecoveryProvider,
  targetProvider: RecoveryProvider | null,
  codeProvider?: unknown,
): asserts targetProvider is RecoveryProvider {
  if (
    !targetProvider
    || targetProvider !== sessionProvider
    || (codeProvider !== undefined && String(codeProvider ?? '').trim() !== sessionProvider)
  ) {
    throw new HttpsError('permission-denied', 'recovery_provider_mismatch');
  }
}

function normalizeStableId(value: unknown): string {
  return String(value ?? '').trim();
}

function numeric(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function normalizeCleanRecoveryEmail(value: unknown): string {
  return String(value ?? '').normalize('NFKC').trim().toLowerCase();
}

export function hmacCleanRecoveryValue(
  secret: string,
  version: string,
  domain: string,
  value: string,
): string {
  return crypto.createHmac('sha256', secret).update(`${version}|${domain}|${value}`).digest('hex');
}

type CleanRecoveryKeyring = {
  currentVersion: string;
  currentSecret: string;
  previousVersion: string;
  previousSecret: string;
};

function cleanRecoveryKeyring(): CleanRecoveryKeyring {
  const keyring = {
    currentVersion: AUTH_RECOVERY_CHALLENGE_HMAC_KEY_CURRENT_VERSION.value().trim(),
    currentSecret: AUTH_RECOVERY_CHALLENGE_HMAC_KEY_CURRENT.value().trim(),
    previousVersion: AUTH_RECOVERY_CHALLENGE_HMAC_KEY_PREVIOUS_VERSION.value().trim(),
    previousSecret: AUTH_RECOVERY_CHALLENGE_HMAC_KEY_PREVIOUS.value().trim(),
  };
  if (
    !keyring.currentVersion
    || !keyring.previousVersion
    || keyring.currentVersion === keyring.previousVersion
    || keyring.currentSecret.length < 32
    || keyring.previousSecret.length < 32
  ) {
    throw new Error('clean_recovery_keyring_invalid');
  }
  return keyring;
}

export function resolveCleanRecoveryKey(version: string, keyring: CleanRecoveryKeyring): string {
  if (version === keyring.currentVersion && keyring.currentSecret) return keyring.currentSecret;
  if (version === keyring.previousVersion && keyring.previousSecret) return keyring.previousSecret;
  throw new Error('clean_recovery_key_version_unavailable');
}

export function verifyCleanRecoveryCode(
  challenge: { challengeId?: unknown; generation?: unknown; keyVersion?: unknown; codeHmac?: unknown },
  code: string,
  keyring: CleanRecoveryKeyring,
): boolean {
  const keyVersion = String(challenge.keyVersion ?? '').trim();
  const secret = resolveCleanRecoveryKey(keyVersion, keyring);
  const actual = hmacCleanRecoveryValue(
    secret,
    keyVersion,
    'code',
    `${String(challenge.challengeId ?? '').trim()}|${String(challenge.generation ?? '').trim()}|${code}`,
  );
  return hashesEqual(actual, String(challenge.codeHmac ?? ''));
}

function cleanRecoveryOpaqueId(secret: string, version: string, domain: string, value: string): string {
  return hmacCleanRecoveryValue(secret, version, domain, value).slice(0, 48);
}

export function cleanRecoveryRateDocIds(
  requesterUid: string,
  email: string,
  secret: string,
  version: string,
): { requester: string; email: string; pair: string } {
  const normalizedEmail = normalizeCleanRecoveryEmail(email);
  const emailHmac = hmacCleanRecoveryValue(secret, version, 'email', normalizedEmail);
  return {
    requester: `requester_${cleanRecoveryOpaqueId(secret, version, 'rate-requester', requesterUid)}`,
    email: `email_${cleanRecoveryOpaqueId(secret, version, 'rate-email', emailHmac)}`,
    pair: `pair_${cleanRecoveryOpaqueId(secret, version, 'rate-pair', `${requesterUid}|${emailHmac}`)}`,
  };
}

type CleanRecoveryEnvelopeRuntime = {
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  jitterMs: () => number;
  minimumMs: number;
};

export async function waitForCleanRecoveryEnvelope(
  startedAtMs: number,
  runtime: CleanRecoveryEnvelopeRuntime = {
    now: () => Date.now(),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    jitterMs: () => crypto.randomInt(0, CLEAN_RECOVERY_JITTER_MAX_MS + 1),
    minimumMs: CLEAN_RECOVERY_MIN_RESPONSE_MS,
  },
): Promise<void> {
  const remaining = Math.max(0, runtime.minimumMs + runtime.jitterMs() - (runtime.now() - startedAtMs));
  if (remaining > 0) await runtime.sleep(remaining);
}

function normalizeCleanRecoveryRequestId(value: unknown): string {
  const requestId = String(value ?? '').trim();
  if (!requestId || requestId.length > 160 || requestId.includes('/')) {
    throw new HttpsError('invalid-argument', 'clean_recovery_request_id_required');
  }
  return requestId;
}

function cleanRecoveryPublicResponse(
  challengeId: string,
  expiresAtMs = Date.now() + CODE_TTL_MS,
  now = Date.now(),
) {
  return {
    ok: true,
    challengeId,
    expiresInSec: Math.max(0, Math.ceil((expiresAtMs - now) / 1000)),
    retryAfterSec: 0,
  };
}

function providerId(provider: RecoveryProvider): string {
  return provider === 'google' ? 'google.com' : 'apple.com';
}

function adminUserMatchesProvider(
  user: admin.auth.UserRecord,
  uid: string,
  provider: RecoveryProvider,
  expectedEmail?: string,
): boolean {
  if (user.uid !== uid || user.disabled || user.emailVerified !== true) return false;
  const email = normalizeCleanRecoveryEmail(user.email);
  if (expectedEmail !== undefined && email !== expectedEmail) return false;
  return user.providerData.some((entry) => (
    entry.providerId === providerId(provider)
    && (
      expectedEmail === undefined
      || !String(entry.email ?? '').trim()
      || normalizeCleanRecoveryEmail(entry.email) === expectedEmail
    )
  ));
}

/** sha256(salt + code) — хэш кода восстановления. Сам код в Firestore не храним. */
export function hashRecoveryCode(salt: string, code: string): string {
  return crypto.createHash('sha256').update(`${salt}${code}`).digest('hex');
}

function hashesEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function generateRecoveryCode(): string {
  // 6 цифр, с ведущими нулями. crypto.randomInt — криптостойкий источник.
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

function normalizeCodeInput(value: unknown): string {
  const code = String(value ?? '').trim();
  if (!code) throw new HttpsError('invalid-argument', 'code_required');
  if (!/^\d{6}$/.test(code)) throw new HttpsError('invalid-argument', 'code_format_invalid');
  return code;
}

function readLinkedAuth(userData: FirebaseFirestore.DocumentData): {
  provider: RecoveryProvider | null;
  email: string | null;
  displayName: string | null;
  providerUid: string;
  devicePlatform: string | null;
} {
  const raw = userData.linkedAuth;
  const linked = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const providerRaw = String(linked.provider ?? '').trim();
  const email = String(linked.email ?? '').trim();
  return {
    provider: providerRaw === 'google' || providerRaw === 'apple' ? providerRaw : null,
    email: email || null,
    displayName: String(linked.displayName ?? '').trim() || null,
    providerUid: String(linked.providerUid ?? '').trim(),
    devicePlatform: String(linked.devicePlatform ?? '').trim() || null,
  };
}

function escapeTelegramHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Маска stable_id для алертов: только края UUID, без PII. */
function maskStableId(stableId: string): string {
  if (stableId.length <= 8) return '***';
  return `${stableId.slice(0, 4)}…${stableId.slice(-4)}`;
}

function buildRecoveryEmailText(code: string): string {
  // Двуязычное письмо (RU + EN): код крупно, TTL, «если не вы — игнорируйте».
  return [
    `Ваш код восстановления аккаунта Phraseman:`,
    ``,
    `${code}`,
    ``,
    `Код действует 10 минут. Введите его в приложении, чтобы восстановить доступ к своему прогрессу.`,
    `Если это были не вы — просто проигнорируйте это письмо.`,
    ``,
    `—`,
    ``,
    `Your Phraseman account recovery code:`,
    ``,
    `${code}`,
    ``,
    `The code expires in 10 minutes. Enter it in the app to restore access to your progress.`,
    `If you did not request this code, you can safely ignore this email.`,
  ].join('\n');
}

// ── authRequestRecoveryCode: отправка кода на email привязки ─────────────────
export const authRequestRecoveryCode = onCall(REQUEST_RECOVERY_CALLABLE_OPTIONS, async (request) => {
  const { authUid, provider: sessionProvider } = requireRecoverySession(request);
  const stableId = normalizeStableId(request.data?.stableId);
  if (!stableId || stableId.length > 160) {
    throw new HttpsError('invalid-argument', 'stable_id_required');
  }

  const db = admin.firestore();
  const now = Date.now();
  const code = generateRecoveryCode();
  const salt = crypto.randomBytes(16).toString('hex');
  const codeHash = hashRecoveryCode(salt, code);
  const generation = crypto.randomBytes(16).toString('hex');
  const userRef = db.collection(USERS).doc(stableId);
  const currentLinkRef = db.collection(AUTH_LINKS).doc(authUid);
  const currentMarkerRef = db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(authUid);
  const targetTombstoneRef = db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(stableId);
  const rateRef = db.collection(RECOVERY_RATE_LIMITS).doc(stableId);
  const codeRef = db.collection(RECOVERY_CODES).doc(stableId);

  let delivery: { email: string; maskedEmail: string; provider: RecoveryProvider };
  try {
    delivery = await db.runTransaction(async (tx) => {
      const [userSnap, currentLinkSnap, currentMarkerSnap, targetTombstoneSnap, rateSnap] =
        await Promise.all([
          tx.get(userRef),
          tx.get(currentLinkRef),
          tx.get(currentMarkerRef),
          tx.get(targetTombstoneRef),
          tx.get(rateRef),
        ]);

      if (currentMarkerSnap.exists || targetTombstoneSnap.exists) {
        throw new HttpsError('failed-precondition', 'account_delete_pending');
      }
      if (!userSnap.exists) {
        throw new HttpsError('failed-precondition', 'recovery_no_email');
      }

      const userData = userSnap.data() ?? {};
      const linked = readLinkedAuth(userData);
      const maskedEmail = maskEmailForRecoveryHint(linked.email);
      if (!linked.email || !maskedEmail) {
        throw new HttpsError('failed-precondition', 'recovery_no_email');
      }
      assertSessionProvider(sessionProvider, linked.provider);
      const targetProvider = linked.provider;
      const targetProviderUids = oldProviderUids(userData);
      if (targetProviderUids.length === 0) throwIdentityMismatch();

      const targetAnchorRefs = targetProviderUids.map((uid) => db.collection(AUTH_LINKS).doc(uid));
      const targetMarkerRefs = targetProviderUids.map(
        (uid) => db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(uid),
      );
      const [targetAnchorSnaps, targetMarkerSnaps] = await Promise.all([
        Promise.all(targetAnchorRefs.map((ref) => tx.get(ref))),
        Promise.all(targetMarkerRefs.map((ref) => tx.get(ref))),
      ]);
      if (targetMarkerSnaps.some((snapshot) => snapshot.exists)) {
        throw new HttpsError('failed-precondition', 'account_delete_pending');
      }
      targetAnchorSnaps.forEach((snapshot, index) => {
        assertTargetAnchorIfPresent(snapshot, stableId, targetProviderUids[index], targetProvider);
      });

      const currentLinkData = currentLinkSnap.data() ?? {};
      const currentStableId = String(currentLinkData.stable_id ?? '').trim();
      if (currentLinkSnap.exists) {
        if (!currentStableId) throwIdentityMismatch();
        if (currentStableId === stableId) {
          if (!targetProviderUids.includes(authUid)) throwIdentityMismatch();
          assertTargetAnchorIfPresent(currentLinkSnap, stableId, authUid, targetProvider);
        } else {
          const displacedUserRef = db.collection(USERS).doc(currentStableId);
          const displacedTombstoneRef =
            db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(currentStableId);
          const [displacedUserSnap, displacedTombstoneSnap] = await Promise.all([
            tx.get(displacedUserRef),
            tx.get(displacedTombstoneRef),
          ]);
          const displacedUserData = displacedUserSnap.data() ?? {};
          if (
            displacedTombstoneSnap.exists
            || !displacedUserSnap.exists
            || String(displacedUserData.firebaseAuthUid ?? '').trim() !== authUid
            || isProviderOwnedUser(displacedUserData)
          ) {
            throwIdentityMismatch();
          }
        }
      }

      const rate = rateSnap.data() ?? {};
      const windowStartMs = numeric(rate.windowStartMs);
      const sameWindow = now - windowStartMs < RATE_WINDOW_MS;
      const count = sameWindow ? numeric(rate.count) : 0;
      if (count >= RATE_MAX_PER_WINDOW) {
        throw new HttpsError('resource-exhausted', 'recovery_rate_limited');
      }
      tx.set(rateRef, {
        stableId,
        windowStartMs: sameWindow ? windowStartMs : now,
        count: count + 1,
        updatedAtMs: now,
      }, { merge: true });
      tx.set(codeRef, {
        salt,
        codeHash,
        generation,
        status: 'active',
        attempts: 0,
        requestedByUid: authUid,
        provider: targetProvider,
        createdAt: now,
        expiresAt: now + CODE_TTL_MS,
      });
      return { email: linked.email, maskedEmail, provider: targetProvider };
    });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throwRecoveryUnavailable();
  }

  const sendResult = await sendTransactionalEmail({
    to: delivery.email,
    subject: 'Phraseman — код восстановления аккаунта',
    text: buildRecoveryEmailText(code),
  }).catch(() => ({ ok: false as const, error: 'resend_transport_failed' }));
  if (!sendResult.ok) {
    await db.runTransaction(async (tx) => {
      const currentCodeSnap = await tx.get(codeRef);
      const currentCode = currentCodeSnap.data() ?? {};
      if (
        !currentCodeSnap.exists
        || currentCode.status !== 'active'
        || String(currentCode.generation ?? '') !== generation
      ) return;
      tx.set(codeRef, {
        status: 'send_failed',
        sendError: stableTransactionalEmailError(sendResult.error),
        updatedAt: now,
      }, { merge: true });
    }).catch(() => {});
    if (sendResult.error === 'resend_key_missing') {
      throw new HttpsError('failed-precondition', 'resend_key_missing');
    }
    throw new HttpsError('internal', 'recovery_email_failed');
  }

  return {
    ok: true,
    maskedEmail: delivery.maskedEmail,
    expiresInSec: Math.floor(CODE_TTL_MS / 1000),
    provider: delivery.provider,
  };
});

type RelinkSuccess = {
  kind: 'success';
  previousProviderUids: string[];
  previousStableIdDisplacement: string | null;
  recoveryEventId: string;
  handoffEligibleUntil: number;
};

async function performAtomicRecoveryRelink(params: {
  tx: FirebaseFirestore.Transaction;
  db: FirebaseFirestore.Firestore;
  stableId: string;
  newUid: string;
  sessionProvider: RecoveryProvider;
  requestedByUid: string;
  proofProvider?: unknown;
  now: number;
  eventRef: FirebaseFirestore.DocumentReference;
  preflightLinkFingerprint?: string;
  preflightUserFingerprint?: string;
  requiredTargetProviderUid?: string;
  validateTarget?: (
    userData: FirebaseFirestore.DocumentData,
    linked: ReturnType<typeof readLinkedAuth>,
    previousProviderUids: string[],
  ) => void;
  consumeProof: (result: { recoveryEventId: string; handoffEligibleUntil: number }) => void;
}): Promise<RelinkSuccess> {
  const {
    tx, db, stableId, newUid, sessionProvider, requestedByUid, proofProvider,
    now, eventRef, preflightLinkFingerprint, preflightUserFingerprint,
    requiredTargetProviderUid, validateTarget, consumeProof,
  } = params;
  const userRef = db.collection(USERS).doc(stableId);
  const linkRef = db.collection(AUTH_LINKS).doc(newUid);
  const markerRef = db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(newUid);
  const targetTombstoneRef = db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(stableId);
  const leaderboardRef = db.collection(LEADERBOARD).doc(stableId);
  const [userSnap, linkSnap, markerSnap, targetTombstoneSnap, leaderboardSnap] =
    await Promise.all([
      tx.get(userRef),
      tx.get(linkRef),
      tx.get(markerRef),
      tx.get(targetTombstoneRef),
      tx.get(leaderboardRef),
    ]);
  if (
    preflightLinkFingerprint !== undefined
    && snapshotFingerprint(linkSnap) !== preflightLinkFingerprint
  ) {
    throwIdentityMismatch();
  }
  if (
    preflightUserFingerprint !== undefined
    && userIdentityFingerprint(userSnap) !== preflightUserFingerprint
  ) {
    throwIdentityMismatch();
  }
  if (markerSnap.exists || targetTombstoneSnap.exists) {
    throw new HttpsError('failed-precondition', 'account_delete_pending');
  }
  if (!userSnap.exists) {
    throw new HttpsError('failed-precondition', 'recovery_target_missing');
  }

  const userData = userSnap.data() ?? {};
  const linked = readLinkedAuth(userData);
  assertSessionProvider(sessionProvider, linked.provider, proofProvider);
  const targetProvider = linked.provider;
  const allPreviousProviderUids = oldProviderUids(userData);
  if (allPreviousProviderUids.length === 0) throwIdentityMismatch();
  validateTarget?.(userData, linked, allPreviousProviderUids);

  const targetAnchorRefs = allPreviousProviderUids.map(
    (uid) => db.collection(AUTH_LINKS).doc(uid),
  );
  const targetMarkerRefs = allPreviousProviderUids.map(
    (uid) => db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(uid),
  );
  const [targetAnchorSnaps, targetMarkerSnaps] = await Promise.all([
    Promise.all(targetAnchorRefs.map((ref) => tx.get(ref))),
    Promise.all(targetMarkerRefs.map((ref) => tx.get(ref))),
  ]);
  if (targetMarkerSnaps.some((snapshot) => snapshot.exists)) {
    throw new HttpsError('failed-precondition', 'account_delete_pending');
  }
  targetAnchorSnaps.forEach((snapshot, index) => {
    assertTargetAnchorIfPresent(
      snapshot,
      stableId,
      allPreviousProviderUids[index],
      targetProvider,
    );
  });
  if (requiredTargetProviderUid) {
    const requiredIndex = allPreviousProviderUids.indexOf(requiredTargetProviderUid);
    if (requiredIndex < 0 || !targetAnchorSnaps[requiredIndex]?.exists) throwIdentityMismatch();
  }

  const linkData = linkSnap.data() ?? {};
  const previousLinkedStableId = String(linkData.stable_id ?? '').trim();
  let previousStableIdDisplacement: string | null = null;
  if (linkSnap.exists) {
    if (!previousLinkedStableId) throwIdentityMismatch();
    if (previousLinkedStableId === stableId) {
      if (!allPreviousProviderUids.includes(newUid)) throwIdentityMismatch();
      assertTargetAnchorIfPresent(linkSnap, stableId, newUid, targetProvider);
    } else {
      const displacedUserRef = db.collection(USERS).doc(previousLinkedStableId);
      const displacedTombstoneRef =
        db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(previousLinkedStableId);
      const [displacedUserSnap, displacedTombstoneSnap] = await Promise.all([
        tx.get(displacedUserRef),
        tx.get(displacedTombstoneRef),
      ]);
      const displacedUserData = displacedUserSnap.data() ?? {};
      if (
        displacedTombstoneSnap.exists
        || !displacedUserSnap.exists
        || String(displacedUserData.firebaseAuthUid ?? '').trim() !== newUid
        || isProviderOwnedUser(displacedUserData)
      ) {
        throwIdentityMismatch();
      }
      previousStableIdDisplacement = previousLinkedStableId;
      tx.set(displacedUserRef, {
        firebaseAuthUid: admin.firestore.FieldValue.delete(),
      }, { merge: true });
    }
  }

  const previousProviderUids = allPreviousProviderUids.filter((uid) => uid !== newUid);
  const existingLinkedAt = numeric(linkData.linkedAt);
  const recoveryEventId = eventRef.id;
  const handoffEligibleUntil = now + HANDOFF_ELIGIBILITY_MS;
  tx.set(linkRef, {
    stable_id: stableId,
    providerUid: newUid,
    provider: targetProvider,
    linkedAt: existingLinkedAt > 0 ? existingLinkedAt : now,
    lastSignInAt: now,
    email: linked.email,
    displayName: linked.displayName,
    updatedAt: now,
  }, { merge: true });
  tx.set(userRef, {
    firebaseAuthUid: newUid,
    linkedAuth: {
      provider: targetProvider,
      providerUid: newUid,
      email: linked.email,
      displayName: linked.displayName,
      linkedAt: now,
      lastSignInAt: now,
      devicePlatform: linked.devicePlatform ?? 'web',
    },
    updatedAt: now,
  }, { merge: true });

  if (leaderboardSnap.exists) {
    const leaderboardAuthUid = String(leaderboardSnap.data()?.firebaseAuthUid ?? '').trim();
    if (leaderboardAuthUid !== newUid) {
      tx.set(leaderboardRef, { firebaseAuthUid: newUid, updatedAt: now }, { merge: true });
    }
  }
  tx.create(eventRef, {
    stableId,
    recoveryEventId,
    newProviderUid: newUid,
    previousProviderUids,
    ...(previousStableIdDisplacement ? { previousStableIdDisplacement } : {}),
    requestedByUid,
    at: now,
    handoffEligibleUntil,
    rollbackUntil: now + ROLLBACK_WINDOW_MS,
    status: 'completed',
  });
  consumeProof({ recoveryEventId, handoffEligibleUntil });
  previousProviderUids.forEach((uid) => {
    const anchorIndex = allPreviousProviderUids.indexOf(uid);
    if (anchorIndex >= 0 && targetAnchorSnaps[anchorIndex].exists) {
      tx.delete(targetAnchorRefs[anchorIndex]);
    }
  });
  return {
    kind: 'success',
    previousProviderUids,
    previousStableIdDisplacement,
    recoveryEventId,
    handoffEligibleUntil,
  };
}

type ConfirmTransactionOutcome =
  | { kind: 'invalid' }
  | { kind: 'locked' }
  | {
    kind: 'replay';
    recoveryEventId: string;
    handoffEligibleUntil: number;
  }
  | RelinkSuccess;

export const authConfirmRecoveryCode = onCall(CONFIRM_RECOVERY_CALLABLE_OPTIONS, async (request) => {
  const { authUid: newUid, provider: sessionProvider } = requireRecoverySession(request);
  const stableId = normalizeStableId(request.data?.stableId);
  if (!stableId || stableId.length > 160) {
    throw new HttpsError('invalid-argument', 'stable_id_required');
  }
  const code = normalizeCodeInput(request.data?.code);

  const db = admin.firestore();
  const now = Date.now();
  const codeRef = db.collection(RECOVERY_CODES).doc(stableId);
  const userRef = db.collection(USERS).doc(stableId);
  const linkRef = db.collection(AUTH_LINKS).doc(newUid);
  const eventRef = db.collection(RECOVERY_EVENTS).doc();

  let preflightLinkFingerprint: string;
  let preflightUserFingerprint: string;
  try {
    const preflightCodeSnap = await codeRef.get();
    if (preflightCodeSnap.exists) {
      const requestedByUid = String(preflightCodeSnap.data()?.requestedByUid ?? '').trim();
      if (requestedByUid !== newUid) {
        throw new HttpsError('permission-denied', 'recovery_requester_mismatch');
      }
    }
    const [preflightLinkSnap, preflightUserSnap] = await Promise.all([
      linkRef.get(),
      userRef.get(),
    ]);
    preflightLinkFingerprint = snapshotFingerprint(preflightLinkSnap);
    preflightUserFingerprint = userIdentityFingerprint(preflightUserSnap);
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throwRecoveryUnavailable();
  }

  let outcome: ConfirmTransactionOutcome;
  try {
    outcome = await db.runTransaction(async (tx): Promise<ConfirmTransactionOutcome> => {
      const codeSnap = await tx.get(codeRef);
      const codeData = codeSnap.data();
      if (!codeSnap.exists || !codeData) {
        throw new HttpsError('failed-precondition', 'recovery_code_missing');
      }
      const requestedByUid = String(codeData.requestedByUid ?? '').trim();
      if (requestedByUid !== newUid) {
        throw new HttpsError('permission-denied', 'recovery_requester_mismatch');
      }
      const expectedHash = String(codeData.codeHash ?? '');
      const actualHash = hashRecoveryCode(String(codeData.salt ?? ''), code);
      if (codeData.status === 'consumed') {
        if (!hashesEqual(actualHash, expectedHash)) return { kind: 'invalid' };
        const recoveryEventId = String(codeData.recoveryEventId ?? '').trim();
        const handoffEligibleUntil = numeric(codeData.handoffEligibleUntil);
        if (
          String(codeData.consumedByUid ?? '').trim() !== newUid
          || !recoveryEventId
          || handoffEligibleUntil <= 0
        ) {
          throwIdentityMismatch();
        }
        return { kind: 'replay', recoveryEventId, handoffEligibleUntil };
      }
      if (codeData.status !== 'active') {
        throw new HttpsError('failed-precondition', 'recovery_code_missing');
      }
      if (numeric(codeData.expiresAt) <= now) {
        throw new HttpsError('deadline-exceeded', 'recovery_code_expired');
      }

      const attempts = numeric(codeData.attempts);
      if (attempts >= CODE_MAX_ATTEMPTS) return { kind: 'locked' };
      if (!hashesEqual(actualHash, expectedHash)) {
        tx.set(codeRef, { attempts: attempts + 1, updatedAt: now }, { merge: true });
        return { kind: 'invalid' };
      }

      return performAtomicRecoveryRelink({
        tx,
        db,
        stableId,
        newUid,
        sessionProvider,
        requestedByUid,
        proofProvider: codeData.provider,
        now,
        eventRef,
        preflightLinkFingerprint,
        preflightUserFingerprint,
        consumeProof: ({ recoveryEventId, handoffEligibleUntil }) => {
          tx.set(
            codeRef,
            {
              status: 'consumed',
              consumedAt: now,
              consumedByUid: newUid,
              recoveryEventId,
              handoffEligibleUntil,
              updatedAt: now,
            },
            { merge: true },
          );
        },
      });
    });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throwRecoveryUnavailable();
  }

  if (outcome.kind === 'invalid') {
    throw new HttpsError('permission-denied', 'recovery_code_invalid');
  }
  if (outcome.kind === 'locked') {
    throw new HttpsError('resource-exhausted', 'recovery_code_locked');
  }

  if (outcome.kind === 'success') {
    try {
      const text =
      `🔐 <b>Восстановление аккаунта</b>\n\n` +
      `Stable: <code>${escapeTelegramHtml(maskStableId(stableId))}</code>\n` +
      `Новый провайдер: <code>…${escapeTelegramHtml(newUid.slice(-8))}</code>\n` +
      `Предыдущие uid: ${outcome.previousProviderUids.length}` +
      (outcome.previousStableIdDisplacement
        ? `\nВытеснён stable: <code>${escapeTelegramHtml(maskStableId(outcome.previousStableIdDisplacement))}</code>`
        : '');
      await sendTelegramAlert(
        ADMIN_ALERT_BOT_TOKEN.value() || process.env.ADMIN_ALERT_BOT_TOKEN || '',
        text,
        null,
      );
    } catch {
      console.warn(JSON.stringify({ event: 'auth_recovery_alert_failed' }));
    }
  }

  return {
    ok: true,
    stableId,
    recoveryEventId: outcome.recoveryEventId,
    handoffEligibleUntil: outcome.handoffEligibleUntil,
  };
});

type CleanRecoveryTarget = {
  providerUid: string;
  stableId: string;
  eligible: boolean;
};

function cleanRecoverySyntheticTarget(
  secret: string,
  version: string,
  requesterUid: string,
  emailHmac: string,
): CleanRecoveryTarget {
  return {
    providerUid: `decoy-${cleanRecoveryOpaqueId(secret, version, 'decoy-provider', `${requesterUid}|${emailHmac}`)}`,
    stableId: `decoy-${cleanRecoveryOpaqueId(secret, version, 'decoy-stable', `${emailHmac}|${requesterUid}`)}`,
    eligible: false,
  };
}

function cleanRecoveryRequestFingerprint(
  secret: string,
  version: string,
  requesterUid: string,
  provider: RecoveryProvider,
  emailHmac: string,
): string {
  return hmacCleanRecoveryValue(
    secret,
    version,
    'request-fingerprint',
    `${requesterUid}|${provider}|${emailHmac}|${version}`,
  );
}

function cleanRecoveryConfirmFingerprint(
  secret: string,
  version: string,
  requesterUid: string,
  challengeId: string,
  submittedCode: string,
): string {
  const submittedProofHmac = hmacCleanRecoveryValue(
    secret, version, 'confirm-submitted-code', submittedCode,
  );
  return hmacCleanRecoveryValue(
    secret,
    version,
    'confirm-fingerprint',
    `${requesterUid}|${challengeId}|${submittedProofHmac}|${version}`,
  );
}

function deriveCleanRecoveryCode(
  secret: string,
  version: string,
  challengeId: string,
  generation: string,
): string {
  const unbiasedCeiling = Math.floor(0x1_0000_0000 / 1_000_000) * 1_000_000;
  for (let counter = 0; counter < 1024; counter += 1) {
    const digest = crypto.createHmac('sha256', secret)
      .update(`${version}|code-seed|${challengeId}|${generation}|${counter}`)
      .digest();
    for (let offset = 0; offset <= digest.length - 4; offset += 4) {
      const value = digest.readUInt32BE(offset);
      if (value < unbiasedCeiling) return String(value % 1_000_000).padStart(6, '0');
    }
  }
  throw new Error('clean_recovery_code_derivation_failed');
}

function cleanRecoveryRateWrite(
  tx: FirebaseFirestore.Transaction,
  ref: FirebaseFirestore.DocumentReference,
  data: FirebaseFirestore.DocumentData,
  now: number,
): void {
  const windowStartMs = numeric(data.windowStartMs);
  const sameWindow = now - windowStartMs < CLEAN_RECOVERY_RATE_WINDOW_MS;
  const count = sameWindow ? numeric(data.count) : 0;
  if (count >= CLEAN_RECOVERY_RATE_MAX) {
    throw new HttpsError('resource-exhausted', 'clean_recovery_rate_limited');
  }
  tx.set(ref, {
    count: count + 1,
    windowStartMs: sameWindow ? windowStartMs : now,
    updatedAtMs: now,
  }, { merge: true });
}

async function requestCleanInstallRecoveryCodeCore(request: {
  app?: unknown;
  auth?: { uid?: string; token?: Record<string, unknown> } | null;
  data?: Record<string, unknown>;
}) {
  const { authUid, provider } = requireRecoverySession(request);
  const email = normalizeCleanRecoveryEmail(request.data?.email);
  if (!email || email.length > 320 || !email.includes('@')) {
    throw new HttpsError('invalid-argument', 'clean_recovery_email_required');
  }
  const clientRequestId = normalizeCleanRecoveryRequestId(request.data?.clientRequestId);
  const keyring = cleanRecoveryKeyring();
  const keyVersion = keyring.currentVersion;
  const secret = keyring.currentSecret;
  const emailHmac = hmacCleanRecoveryValue(secret, keyVersion, 'email', email);
  const fingerprint = cleanRecoveryRequestFingerprint(
    secret, keyVersion, authUid, provider, emailHmac,
  );

  let requester: admin.auth.UserRecord;
  try {
    requester = await admin.auth().getUser(authUid);
  } catch {
    throw new HttpsError('permission-denied', 'clean_recovery_unavailable');
  }
  if (!adminUserMatchesProvider(requester, authUid, provider)) {
    throw new HttpsError('permission-denied', 'clean_recovery_unavailable');
  }

  let candidateUser: admin.auth.UserRecord | null = null;
  try {
    const found = await admin.auth().getUserByEmail(email);
    if (adminUserMatchesProvider(found, found.uid, provider, email)) candidateUser = found;
  } catch {
    candidateUser = null;
  }

  const db = admin.firestore();
  const now = Date.now();
  const challengeId = crypto.randomBytes(18).toString('base64url');
  const generation = crypto.randomBytes(16).toString('hex');
  const fallback = cleanRecoverySyntheticTarget(secret, keyVersion, authUid, emailHmac);
  const initialProviderUid = candidateUser?.uid ?? fallback.providerUid;
  const idempotencyId = `request_${cleanRecoveryOpaqueId(
    secret, keyVersion, 'request-id', `${authUid}|${clientRequestId}`,
  )}`;
  const idempotencyRef = db.collection(CLEAN_RECOVERY_COLLECTIONS.idempotency).doc(idempotencyId);
  const challengeRef = db.collection(CLEAN_RECOVERY_COLLECTIONS.challenges).doc(challengeId);
  const intentRef = db.collection(CLEAN_RECOVERY_COLLECTIONS.deliveryIntents).doc(challengeId);
  const rateIds = cleanRecoveryRateDocIds(authUid, email, secret, keyVersion);
  const rateRefs = Object.values(rateIds).map(
    (id) => db.collection(CLEAN_RECOVERY_COLLECTIONS.rateLimits).doc(id),
  );

  return db.runTransaction(async (tx) => {
    const idempotencySnap = await tx.get(idempotencyRef);
    if (idempotencySnap.exists && numeric(idempotencySnap.data()?.expiresAtMs) > now) {
      const data = idempotencySnap.data() ?? {};
      if (String(data.fingerprint ?? '') !== fingerprint) {
        throw new HttpsError('permission-denied', 'clean_recovery_request_conflict');
      }
      const storedChallengeId = String(data.challengeId ?? '').trim();
      if (!storedChallengeId) {
        throw new HttpsError('permission-denied', 'clean_recovery_request_conflict');
      }
      return cleanRecoveryPublicResponse(storedChallengeId, numeric(data.expiresAtMs), now);
    }

    const candidateAnchorRef = db.collection(AUTH_LINKS).doc(initialProviderUid);
    const requesterMarkerRef = db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(authUid);
    const targetMarkerRef = db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(initialProviderUid);
    const [rateSnaps, requesterMarkerSnap, targetMarkerSnap, candidateAnchorSnap] =
      await Promise.all([
        Promise.all(rateRefs.map((ref) => tx.get(ref))),
        tx.get(requesterMarkerRef),
        tx.get(targetMarkerRef),
        tx.get(candidateAnchorRef),
      ]);
    const anchorData = candidateAnchorSnap.data() ?? {};
    const candidateStableId = String(anchorData.stable_id ?? '').trim();
    const stableIdForRead = candidateStableId || fallback.stableId;
    const userRef = db.collection(USERS).doc(stableIdForRead);
    const tombstoneRef = db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(stableIdForRead);
    const [userSnap, tombstoneSnap] = await Promise.all([tx.get(userRef), tx.get(tombstoneRef)]);
    const userData = userSnap.data() ?? {};
    const linked = readLinkedAuth(userData);
    const eligible = Boolean(
      candidateUser
      && !requesterMarkerSnap.exists
      && !targetMarkerSnap.exists
      && !tombstoneSnap.exists
      && candidateAnchorSnap.exists
      && candidateStableId
      && String(anchorData.providerUid ?? '').trim() === candidateUser.uid
      && String(anchorData.provider ?? '').trim() === provider
      && userSnap.exists
      && String(userData.firebaseAuthUid ?? '').trim() === candidateUser.uid
      && linked.provider === provider
      && linked.providerUid === candidateUser.uid
      && normalizeCleanRecoveryEmail(linked.email) === email
    );
    const target = eligible
      ? { providerUid: candidateUser!.uid, stableId: candidateStableId, eligible: true }
      : fallback;

    rateSnaps.forEach((snapshot, index) => {
      cleanRecoveryRateWrite(tx, rateRefs[index], snapshot.data() ?? {}, now);
    });

    tx.create(challengeRef, {
      attempts: 0,
      createdAtMs: now,
      emailHmac,
      expiresAtMs: now + CODE_TTL_MS,
      generation,
      keyVersion,
      provider,
      requesterUid: authUid,
      status: 'pending_delivery',
      targetProviderUid: target.providerUid,
      targetStableId: target.stableId,
    });
    tx.create(intentRef, {
      challengeId,
      createdAtMs: now,
      emailHmac,
      generation,
      keyVersion,
      provider,
      requesterUid: authUid,
      status: 'pending',
      targetProviderUid: target.providerUid,
    });
    tx.set(idempotencyRef, {
      challengeId,
      createdAtMs: now,
      expiresAtMs: now + CODE_TTL_MS,
      fingerprint,
      kind: 'request',
      keyVersion,
    });
    return cleanRecoveryPublicResponse(challengeId, now + CODE_TTL_MS, now);
  });
}

export const authRequestCleanInstallRecoveryCode = onCall(
  CLEAN_RECOVERY_CALLABLE_OPTIONS,
  async (request) => {
    const startedAtMs = Date.now();
    try {
      return await requestCleanInstallRecoveryCodeCore(request);
    } finally {
      await waitForCleanRecoveryEnvelope(startedAtMs);
    }
  },
);

async function setCleanDeliveryTerminal(
  intentId: string,
  generation: string,
  leaseId: string,
  status: 'discarded' | 'send_failed' | 'sent',
): Promise<void> {
  const db = admin.firestore();
  const intentRef = db.collection(CLEAN_RECOVERY_COLLECTIONS.deliveryIntents).doc(intentId);
  const challengeRef = db.collection(CLEAN_RECOVERY_COLLECTIONS.challenges).doc(intentId);
  const now = Date.now();
  await db.runTransaction(async (tx) => {
    const [intentSnap, challengeSnap] = await Promise.all([
      tx.get(intentRef), tx.get(challengeRef),
    ]);
    const intent = intentSnap.data() ?? {};
    const challenge = challengeSnap.data() ?? {};
    if (
      !intentSnap.exists
      || !challengeSnap.exists
      || String(intent.generation ?? '') !== generation
      || String(challenge.generation ?? '') !== generation
      || String(intent.status ?? '') !== 'processing'
      || String(intent.leaseId ?? '') !== leaseId
    ) return;
    tx.set(intentRef, {
      status,
      leaseId: admin.firestore.FieldValue.delete(),
      leaseUntilMs: admin.firestore.FieldValue.delete(),
      updatedAtMs: now,
    }, { merge: true });
    tx.set(challengeRef, { status: status === 'sent' ? 'active' : status, updatedAtMs: now }, { merge: true });
  });
}

export const authCleanInstallRecoveryDeliveryWorker = onDocumentCreated(
  {
    document: `${CLEAN_RECOVERY_COLLECTIONS.deliveryIntents}/{intentId}`,
    region: 'us-central1',
    retry: true,
    secrets: CLEAN_RECOVERY_DELIVERY_SECRETS,
  },
  async (event) => {
    const intentId = String(event.params.intentId ?? '').trim();
    if (!intentId) return;
    const db = admin.firestore();
    const intentRef = db.collection(CLEAN_RECOVERY_COLLECTIONS.deliveryIntents).doc(intentId);
    const challengeRef = db.collection(CLEAN_RECOVERY_COLLECTIONS.challenges).doc(intentId);
    const leaseId = crypto.randomBytes(16).toString('hex');
    const claimed = await db.runTransaction(async (tx) => {
      const [intentSnap, challengeSnap] = await Promise.all([
        tx.get(intentRef), tx.get(challengeRef),
      ]);
      const intent = intentSnap.data() ?? {};
      const challenge = challengeSnap.data() ?? {};
      const claimNow = Date.now();
      const intentStatus = String(intent.status ?? '');
      const leaseExpired = intentStatus !== 'processing' || numeric(intent.leaseUntilMs) <= claimNow;
      if (
        intentSnap.exists
        && challengeSnap.exists
        && numeric(challenge.expiresAtMs) <= claimNow
        && String(intent.generation ?? '') === String(challenge.generation ?? '')
        && (intentStatus === 'pending' || (intentStatus === 'processing' && leaseExpired))
      ) {
        tx.set(intentRef, { status: 'discarded', updatedAtMs: claimNow }, { merge: true });
        tx.set(challengeRef, { status: 'discarded', updatedAtMs: claimNow }, { merge: true });
        return null;
      }
      if (intentStatus === 'processing' && numeric(intent.leaseUntilMs) > claimNow) {
        return { busy: true as const };
      }
      const claimable = intentStatus === 'pending'
        || (intentStatus === 'processing' && numeric(intent.leaseUntilMs) <= claimNow);
      if (
        !intentSnap.exists
        || !challengeSnap.exists
        || !claimable
        || String(intent.challengeId ?? '') !== intentId
        || String(challenge.generation ?? '') !== String(intent.generation ?? '')
      ) return null;
      tx.set(intentRef, {
        status: 'processing',
        leaseId,
        leaseUntilMs: claimNow + CLEAN_RECOVERY_DELIVERY_LEASE_MS,
        updatedAtMs: claimNow,
      }, { merge: true });
      return { busy: false as const, intent, challenge };
    });
    if (!claimed) return;
    if (claimed.busy) throw new Error('clean_recovery_delivery_busy');

    const intent = claimed.intent;
    const challenge = claimed.challenge;
    const generation = String(intent.generation ?? '').trim();
    const keyVersion = String(intent.keyVersion ?? '').trim();
    const provider = String(intent.provider ?? '').trim() as RecoveryProvider;
    const targetProviderUid = String(intent.targetProviderUid ?? '').trim();
    const targetStableId = String(challenge.targetStableId ?? '').trim();
    let secret: string;
    try {
      secret = resolveCleanRecoveryKey(keyVersion, cleanRecoveryKeyring());
    } catch {
      await setCleanDeliveryTerminal(intentId, generation, leaseId, 'discarded');
      return;
    }

    let targetUser: admin.auth.UserRecord | null = null;
    try {
      targetUser = await admin.auth().getUser(targetProviderUid);
    } catch {
      targetUser = null;
    }
    const email = normalizeCleanRecoveryEmail(targetUser?.email);
    const expectedEmailHmac = hmacCleanRecoveryValue(secret, keyVersion, 'email', email);
    let firestoreEligible = false;
    if (
      targetUser
      && (provider === 'google' || provider === 'apple')
      && adminUserMatchesProvider(targetUser, targetProviderUid, provider, email)
      && email
      && hashesEqual(expectedEmailHmac, String(intent.emailHmac ?? ''))
      && String(challenge.emailHmac ?? '') === String(intent.emailHmac ?? '')
    ) {
      const [anchorSnap, userSnap, markerSnap, tombstoneSnap] = await Promise.all([
        db.collection(AUTH_LINKS).doc(targetProviderUid).get(),
        db.collection(USERS).doc(targetStableId).get(),
        db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(targetProviderUid).get(),
        db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(targetStableId).get(),
      ]);
      const anchor = anchorSnap.data() ?? {};
      const userData = userSnap.data() ?? {};
      const linked = readLinkedAuth(userData);
      firestoreEligible = Boolean(
        anchorSnap.exists
        && userSnap.exists
        && !markerSnap.exists
        && !tombstoneSnap.exists
        && String(anchor.stable_id ?? '').trim() === targetStableId
        && String(anchor.providerUid ?? '').trim() === targetProviderUid
        && String(anchor.provider ?? '').trim() === provider
        && String(userData.firebaseAuthUid ?? '').trim() === targetProviderUid
        && linked.provider === provider
        && linked.providerUid === targetProviderUid
        && normalizeCleanRecoveryEmail(linked.email) === email
      );
    }
    if (!targetUser || !firestoreEligible || !email) {
      await setCleanDeliveryTerminal(intentId, generation, leaseId, 'discarded');
      return;
    }

    const code = deriveCleanRecoveryCode(secret, keyVersion, intentId, generation);
    const codeHmac = hmacCleanRecoveryValue(
      secret, keyVersion, 'code', `${intentId}|${generation}|${code}`,
    );
    const armed = await db.runTransaction(async (tx): Promise<'armed' | 'expired' | 'lost'> => {
      const [intentSnap, challengeSnap] = await Promise.all([
        tx.get(intentRef), tx.get(challengeRef),
      ]);
      const latestIntent = intentSnap.data() ?? {};
      const latestChallenge = challengeSnap.data() ?? {};
      const armNow = Date.now();
      if (
        String(latestIntent.status ?? '') !== 'processing'
        || String(latestIntent.leaseId ?? '') !== leaseId
        || String(latestIntent.generation ?? '') !== generation
        || !['pending_delivery', 'active'].includes(String(latestChallenge.status ?? ''))
        || String(latestChallenge.generation ?? '') !== generation
        || (
          String(latestChallenge.status ?? '') === 'active'
          && String(latestChallenge.codeHmac ?? '') !== codeHmac
        )
      ) return 'lost';
      if (numeric(latestChallenge.expiresAtMs) <= armNow) return 'expired';
      tx.set(challengeRef, { codeHmac, status: 'active', updatedAtMs: armNow }, { merge: true });
      return 'armed';
    });
    if (armed === 'expired') {
      await setCleanDeliveryTerminal(intentId, generation, leaseId, 'discarded');
      return;
    }
    if (armed !== 'armed') return;

    const sendResult = await sendTransactionalEmail({
      to: email,
      subject: 'Phraseman — код восстановления аккаунта',
      text: buildRecoveryEmailText(code),
      idempotencyKey: `recovery/${intentId}/${generation}`,
    }).catch(() => ({ ok: false as const, error: 'resend_transport_failed' }));
    if (
      !sendResult.ok
      && ['resend_transport_failed', 'resend_http_retryable']
        .includes(String(sendResult.error ?? ''))
    ) {
      throw new Error('clean_recovery_delivery_retry');
    }
    await setCleanDeliveryTerminal(intentId, generation, leaseId, sendResult.ok ? 'sent' : 'send_failed');
  },
);

type CleanConfirmOutcome =
  | { kind: 'invalid' }
  | { kind: 'locked' }
  | { kind: 'success' | 'replay'; stableId: string; recoveryEventId: string; handoffEligibleUntil: number };

export const authConfirmCleanInstallRecoveryCode = onCall(
  CLEAN_RECOVERY_CALLABLE_OPTIONS,
  async (request): Promise<{ ok: true; stableId: string; recoveryEventId: string; handoffEligibleUntil: number }> => {
    const { authUid: newUid, provider: sessionProvider } = requireRecoverySession(request);
    const challengeId = String(request.data?.challengeId ?? '').trim();
    if (!/^[A-Za-z0-9_-]{24,160}$/.test(challengeId)) {
      throw new HttpsError('invalid-argument', 'clean_recovery_challenge_required');
    }
    const code = normalizeCodeInput(request.data?.code);
    const clientRequestId = normalizeCleanRecoveryRequestId(request.data?.clientRequestId);
    const keyring = cleanRecoveryKeyring();
    const db = admin.firestore();
    const challengeRef = db.collection(CLEAN_RECOVERY_COLLECTIONS.challenges).doc(challengeId);
    const eventRef = db.collection(RECOVERY_EVENTS).doc();
    const confirmId = `confirm_${cleanRecoveryOpaqueId(
      keyring.currentSecret,
      keyring.currentVersion,
      'confirm-id',
      `${newUid}|${challengeId}|${clientRequestId}`,
    )}`;
    const idempotencyRef = db.collection(CLEAN_RECOVERY_COLLECTIONS.idempotency).doc(confirmId);

    let requester: admin.auth.UserRecord;
    try {
      requester = await admin.auth().getUser(newUid);
    } catch {
      throw new HttpsError('permission-denied', 'clean_recovery_unavailable');
    }
    if (!adminUserMatchesProvider(requester, newUid, sessionProvider)) {
      throw new HttpsError('permission-denied', 'clean_recovery_unavailable');
    }

    const now = Date.now();
    let outcome: CleanConfirmOutcome;
    try {
      outcome = await db.runTransaction(async (tx): Promise<CleanConfirmOutcome> => {
        const [challengeSnap, idempotencySnap] = await Promise.all([
          tx.get(challengeRef), tx.get(idempotencyRef),
        ]);
        const challenge = challengeSnap.data() ?? {};
        if (!challengeSnap.exists) {
          hmacCleanRecoveryValue(
            keyring.currentSecret,
            keyring.currentVersion,
            'code',
            `${challengeId}|missing|${code}`,
          );
          return { kind: 'invalid' };
        }
        const keyVersion = String(challenge.keyVersion ?? '').trim();
        let secret: string;
        let proofValid = false;
        try {
          secret = resolveCleanRecoveryKey(keyVersion, keyring);
          proofValid = verifyCleanRecoveryCode({ challengeId, ...challenge }, code, keyring);
        } catch {
          return { kind: 'invalid' };
        }
        if (
          String(challenge.requesterUid ?? '').trim() !== newUid
          || String(challenge.provider ?? '').trim() !== sessionProvider
        ) {
          throw new HttpsError('permission-denied', 'clean_recovery_unavailable');
        }
        const fingerprint = cleanRecoveryConfirmFingerprint(
          secret, keyVersion, newUid, challengeId, code,
        );
        if (idempotencySnap.exists) {
          const idempotency = idempotencySnap.data() ?? {};
          if (String(idempotency.fingerprint ?? '') !== fingerprint) {
            throw new HttpsError('permission-denied', 'clean_recovery_request_conflict');
          }
          const stableId = String(idempotency.stableId ?? '').trim();
          const recoveryEventId = String(idempotency.recoveryEventId ?? '').trim();
          const handoffEligibleUntil = numeric(idempotency.handoffEligibleUntil);
          if (!stableId || !recoveryEventId || handoffEligibleUntil <= 0) {
            throw new HttpsError('permission-denied', 'clean_recovery_request_conflict');
          }
          return { kind: 'replay', stableId, recoveryEventId, handoffEligibleUntil };
        }
        if (String(challenge.status ?? '') === 'consumed') {
          if (!proofValid) return { kind: 'invalid' };
          const stableId = String(challenge.targetStableId ?? '').trim();
          const recoveryEventId = String(challenge.recoveryEventId ?? '').trim();
          const handoffEligibleUntil = numeric(challenge.handoffEligibleUntil);
          if (
            String(challenge.consumedByUid ?? '').trim() !== newUid
            || !stableId
            || !recoveryEventId
            || handoffEligibleUntil <= 0
          ) return { kind: 'invalid' };
          tx.create(idempotencyRef, {
            createdAtMs: now,
            fingerprint,
            handoffEligibleUntil,
            keyVersion,
            kind: 'confirm',
            recoveryEventId,
            stableId,
          });
          return { kind: 'replay', stableId, recoveryEventId, handoffEligibleUntil };
        }
        if (
          String(challenge.status ?? '') !== 'active'
          || numeric(challenge.expiresAtMs) <= now
        ) return { kind: 'invalid' };
        const attempts = numeric(challenge.attempts);
        if (attempts >= CODE_MAX_ATTEMPTS) return { kind: 'locked' };
        if (!proofValid) {
          tx.set(challengeRef, { attempts: attempts + 1, updatedAtMs: now }, { merge: true });
          return { kind: 'invalid' };
        }

        const stableId = String(challenge.targetStableId ?? '').trim();
        const targetProviderUid = String(challenge.targetProviderUid ?? '').trim();
        const emailHmac = String(challenge.emailHmac ?? '').trim();
        if (!stableId || !targetProviderUid || !emailHmac) return { kind: 'invalid' };
        const relink = await performAtomicRecoveryRelink({
          tx,
          db,
          stableId,
          newUid,
          sessionProvider,
          requestedByUid: newUid,
          proofProvider: challenge.provider,
          now,
          eventRef,
          requiredTargetProviderUid: targetProviderUid,
          validateTarget: (_userData, linked, previousProviderUids) => {
            const linkedEmail = normalizeCleanRecoveryEmail(linked.email);
            if (
              !previousProviderUids.includes(targetProviderUid)
              || !linkedEmail
              || hmacCleanRecoveryValue(secret, keyVersion, 'email', linkedEmail) !== emailHmac
            ) throwIdentityMismatch();
          },
          consumeProof: ({ recoveryEventId, handoffEligibleUntil }) => {
            tx.set(challengeRef, {
              status: 'consumed',
              consumedAtMs: now,
              consumedByUid: newUid,
              recoveryEventId,
              handoffEligibleUntil,
              updatedAtMs: now,
            }, { merge: true });
            tx.create(idempotencyRef, {
              createdAtMs: now,
              fingerprint,
              handoffEligibleUntil,
              keyVersion,
              kind: 'confirm',
              recoveryEventId,
              stableId,
            });
          },
        });
        return {
          kind: 'success',
          stableId,
          recoveryEventId: relink.recoveryEventId,
          handoffEligibleUntil: relink.handoffEligibleUntil,
        };
      });
    } catch (error) {
      if (
        error instanceof HttpsError
        && error.message === 'clean_recovery_request_conflict'
      ) throw error;
      throw new HttpsError('permission-denied', 'clean_recovery_unavailable');
    }

    if (outcome.kind === 'invalid') {
      throw new HttpsError('permission-denied', 'clean_recovery_code_invalid');
    }
    if (outcome.kind === 'locked') {
      throw new HttpsError('resource-exhausted', 'clean_recovery_code_unavailable');
    }
    return {
      ok: true,
      stableId: outcome.stableId,
      recoveryEventId: outcome.recoveryEventId,
      handoffEligibleUntil: outcome.handoffEligibleUntil,
    };
  },
);

type HandoffIdentity = {
  stableId: string;
  provider: RecoveryProvider;
  eventData: FirebaseFirestore.DocumentData;
};

function normalizeRecoveryEventId(value: unknown): string {
  const eventId = String(value ?? '').trim();
  if (!eventId || eventId.length > 160 || eventId.includes('/')) {
    throw new HttpsError('invalid-argument', 'recovery_event_id_required');
  }
  return eventId;
}

function normalizeHandoffRequestId(value: unknown): string {
  const requestId = String(value ?? '').trim();
  if (!requestId || requestId.length > 160 || requestId.includes('/')) {
    throw new HttpsError('invalid-argument', 'recovery_handoff_request_id_required');
  }
  return requestId;
}

function hashHandoffRequestId(requestId: string): string {
  return crypto.createHash('sha256').update(requestId).digest('hex');
}

function requireCustomRecoverySession(request: {
  app?: unknown;
  auth?: { uid?: string; token?: Record<string, unknown> } | null;
}, recoveryEventId: string): string {
  if (!request.app) throw new HttpsError('failed-precondition', 'app_check_required');
  const authUid = String(request.auth?.uid ?? '').trim();
  if (!authUid) throw new HttpsError('unauthenticated', 'auth_required');
  const token = request.auth?.token ?? {};
  const firebase = token.firebase;
  const signInProvider = firebase && typeof firebase === 'object'
    ? String((firebase as { sign_in_provider?: unknown }).sign_in_provider ?? '').trim()
    : '';
  if (
    signInProvider !== 'custom'
    || token.phrasemanRecovery !== true
    || String(token.phrasemanRecoveryEventId ?? '').trim() !== recoveryEventId
  ) {
    throw new HttpsError('permission-denied', 'recovery_handoff_claims_required');
  }
  return authUid;
}

async function readAndValidateHandoffIdentity(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  eventRef: FirebaseFirestore.DocumentReference,
  recoveryEventId: string,
  authUid: string,
  expectedProvider?: RecoveryProvider,
): Promise<HandoffIdentity> {
  const eventSnap = await tx.get(eventRef);
  if (!eventSnap.exists) {
    throw new HttpsError('failed-precondition', 'recovery_handoff_missing');
  }
  const eventData = eventSnap.data() ?? {};
  const stableId = String(eventData.stableId ?? '').trim();
  if (
    !stableId
    || String(eventData.recoveryEventId ?? '').trim() !== recoveryEventId
    || String(eventData.newProviderUid ?? '').trim() !== authUid
    || String(eventData.requestedByUid ?? '').trim() !== authUid
    || String(eventData.status ?? '').trim() !== 'completed'
  ) {
    throw new HttpsError('permission-denied', 'recovery_handoff_identity_mismatch');
  }

  const linkRef = db.collection(AUTH_LINKS).doc(authUid);
  const userRef = db.collection(USERS).doc(stableId);
  const markerRef = db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(authUid);
  const tombstoneRef = db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(stableId);
  const [linkSnap, userSnap, markerSnap, tombstoneSnap] = await Promise.all([
    tx.get(linkRef),
    tx.get(userRef),
    tx.get(markerRef),
    tx.get(tombstoneRef),
  ]);
  if (markerSnap.exists || tombstoneSnap.exists) {
    throw new HttpsError('failed-precondition', 'account_delete_pending');
  }
  if (!linkSnap.exists || !userSnap.exists) {
    throw new HttpsError('permission-denied', 'recovery_handoff_identity_mismatch');
  }
  const linkData = linkSnap.data() ?? {};
  const userData = userSnap.data() ?? {};
  const linked = readLinkedAuth(userData);
  const provider = linked.provider;
  if (
    !provider
    || (expectedProvider !== undefined && provider !== expectedProvider)
    || String(linkData.stable_id ?? '').trim() !== stableId
    || String(linkData.providerUid ?? '').trim() !== authUid
    || String(linkData.provider ?? '').trim() !== provider
    || String(userData.firebaseAuthUid ?? '').trim() !== authUid
    || linked.providerUid !== authUid
  ) {
    throw new HttpsError('permission-denied', 'recovery_handoff_identity_mismatch');
  }
  return { stableId, provider, eventData };
}

async function clearHandoffLeaseIfOwned(
  db: FirebaseFirestore.Firestore,
  eventRef: FirebaseFirestore.DocumentReference,
  leaseId: string,
  requestIdHash: string,
): Promise<void> {
  await db.runTransaction(async (tx) => {
    const eventSnap = await tx.get(eventRef);
    const data = eventSnap.data() ?? {};
    if (
      !eventSnap.exists
      || String(data.handoffLeaseId ?? '').trim() !== leaseId
      || String(data.handoffLeaseRequestIdHash ?? '').trim() !== requestIdHash
      || String(data.handoffStatus ?? '').trim() !== 'minting'
    ) return;
    const restoredStatus = numeric(data.handoffSuccessfulIssues) > 0 ? 'issued' : 'eligible';
    tx.set(eventRef, {
      handoffStatus: restoredStatus,
      handoffLeaseId: admin.firestore.FieldValue.delete(),
      handoffLeaseUntil: admin.firestore.FieldValue.delete(),
      handoffLeaseRequestIdHash: admin.firestore.FieldValue.delete(),
      updatedAt: Date.now(),
    }, { merge: true });
  });
}

export const authIssueRecoveryHandoffToken = onCall(
  HANDOFF_CALLABLE_OPTIONS,
  async (request) => {
    const { authUid, provider } = requireRecoverySession(request);
    const recoveryEventId = normalizeRecoveryEventId(request.data?.recoveryEventId);
    const requestIdHash = hashHandoffRequestId(normalizeHandoffRequestId(request.data?.requestId));
    const now = Date.now();
    const db = admin.firestore();
    const eventRef = db.collection(RECOVERY_EVENTS).doc(recoveryEventId);

    let adminUser: admin.auth.UserRecord;
    try {
      adminUser = await admin.auth().getUser(authUid);
    } catch {
      throw new HttpsError('permission-denied', 'recovery_handoff_identity_mismatch');
    }
    const expectedProviderId = provider === 'google' ? 'google.com' : 'apple.com';
    if (
      adminUser.uid !== authUid
      || adminUser.disabled
      || adminUser.emailVerified !== true
      || !adminUser.providerData.some((entry) => entry.providerId === expectedProviderId)
    ) {
      throw new HttpsError('permission-denied', 'recovery_handoff_identity_mismatch');
    }

    const leaseId = crypto.randomBytes(16).toString('hex');
    try {
      await db.runTransaction(async (tx) => {
        const identity = await readAndValidateHandoffIdentity(
          tx, db, eventRef, recoveryEventId, authUid, provider,
        );
        const eventData = identity.eventData;
        if (String(eventData.handoffStatus ?? '').trim() === 'completed') {
          throw new HttpsError('failed-precondition', 'recovery_handoff_completed');
        }
        if (numeric(eventData.handoffEligibleUntil) <= now) {
          throw new HttpsError('deadline-exceeded', 'recovery_handoff_expired');
        }
        const attempts = numeric(eventData.handoffMintAttempts);
        const successfulIssues = numeric(eventData.handoffSuccessfulIssues);
        if (
          attempts >= HANDOFF_MAX_MINT_ATTEMPTS
          || successfulIssues >= HANDOFF_MAX_SUCCESSFUL_ISSUES
        ) {
          throw new HttpsError('resource-exhausted', 'recovery_handoff_limit');
        }
        const currentLeaseId = String(eventData.handoffLeaseId ?? '').trim();
        if (currentLeaseId && numeric(eventData.handoffLeaseUntil) > now) {
          throw new HttpsError('aborted', 'recovery_handoff_busy');
        }
        tx.set(eventRef, {
          handoffStatus: 'minting',
          handoffLeaseId: leaseId,
          handoffLeaseRequestIdHash: requestIdHash,
          handoffLeaseUntil: now + HANDOFF_LEASE_MS,
          handoffMintAttempts: attempts + 1,
          handoffSuccessfulIssues: successfulIssues,
          updatedAt: now,
        }, { merge: true });
      });
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', 'recovery_handoff_unavailable');
    }

    let customToken: string;
    try {
      customToken = await admin.auth().createCustomToken(authUid, {
        phrasemanRecovery: true,
        phrasemanRecoveryEventId: recoveryEventId,
      });
    } catch {
      await clearHandoffLeaseIfOwned(db, eventRef, leaseId, requestIdHash).catch(() => {});
      throw new HttpsError('internal', 'recovery_handoff_mint_failed');
    }

    const finalizedMetadata = { stableId: '', handoffAcknowledgeUntil: 0 };
    try {
      const finalizeNow = Date.now();
      const handoffAcknowledgeUntil = finalizeNow + HANDOFF_ACKNOWLEDGE_MS;
      await db.runTransaction(async (tx) => {
        const identity = await readAndValidateHandoffIdentity(
          tx, db, eventRef, recoveryEventId, authUid, provider,
        );
        const eventData = identity.eventData;
        if (
          String(eventData.handoffStatus ?? '').trim() !== 'minting'
          || String(eventData.handoffLeaseId ?? '').trim() !== leaseId
          || String(eventData.handoffLeaseRequestIdHash ?? '').trim() !== requestIdHash
          || numeric(eventData.handoffLeaseUntil) <= finalizeNow
          || numeric(eventData.handoffEligibleUntil) <= finalizeNow
        ) {
          throw new HttpsError('failed-precondition', 'recovery_handoff_lease_lost');
        }
        const successfulIssues = numeric(eventData.handoffSuccessfulIssues);
        if (successfulIssues >= HANDOFF_MAX_SUCCESSFUL_ISSUES) {
          throw new HttpsError('resource-exhausted', 'recovery_handoff_limit');
        }
        tx.set(eventRef, {
          handoffStatus: 'issued',
          handoffSuccessfulIssues: successfulIssues + 1,
          handoffIssuedAt: finalizeNow,
          handoffAcknowledgeUntil,
          handoffLastRequestIdHash: requestIdHash,
          handoffLeaseId: admin.firestore.FieldValue.delete(),
          handoffLeaseUntil: admin.firestore.FieldValue.delete(),
          handoffLeaseRequestIdHash: admin.firestore.FieldValue.delete(),
          updatedAt: finalizeNow,
        }, { merge: true });
        finalizedMetadata.stableId = identity.stableId;
        finalizedMetadata.handoffAcknowledgeUntil = handoffAcknowledgeUntil;
      });
    } catch {
      await clearHandoffLeaseIfOwned(db, eventRef, leaseId, requestIdHash).catch(() => {});
      throw new HttpsError('internal', 'recovery_handoff_unavailable');
    }

    if (!finalizedMetadata.stableId || finalizedMetadata.handoffAcknowledgeUntil <= 0) {
      throw new HttpsError('internal', 'recovery_handoff_unavailable');
    }
    return { ok: true, recoveryEventId, customToken, ...finalizedMetadata };
  },
);

export const authCompleteRecoveryHandoff = onCall(
  HANDOFF_CALLABLE_OPTIONS,
  async (request) => {
    const recoveryEventId = normalizeRecoveryEventId(request.data?.recoveryEventId);
    const authUid = requireCustomRecoverySession(request, recoveryEventId);
    const db = admin.firestore();
    const eventRef = db.collection(RECOVERY_EVENTS).doc(recoveryEventId);
    const now = Date.now();
    try {
      await db.runTransaction(async (tx) => {
        const identity = await readAndValidateHandoffIdentity(
          tx, db, eventRef, recoveryEventId, authUid,
        );
        const status = String(identity.eventData.handoffStatus ?? '').trim();
        if (status === 'completed') return;
        if (status !== 'issued') {
          throw new HttpsError('failed-precondition', 'recovery_handoff_not_issued');
        }
        if (numeric(identity.eventData.handoffAcknowledgeUntil) <= now) {
          throw new HttpsError('deadline-exceeded', 'recovery_handoff_ack_expired');
        }
        tx.set(eventRef, {
          handoffStatus: 'completed',
          handoffCompletedAt: now,
          handoffCompletedByUid: authUid,
          updatedAt: now,
        }, { merge: true });
      });
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', 'recovery_handoff_unavailable');
    }
    return { ok: true, recoveryEventId, completed: true };
  },
);
