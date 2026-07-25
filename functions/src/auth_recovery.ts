import * as crypto from 'crypto';
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { maskEmailForRecoveryHint } from './auth_identity';
import { ACCOUNT_DELETE_AUTH_MARKERS, ACCOUNT_DELETE_TOMBSTONES } from './account_delete_job';
import { sendTransactionalEmail } from './admin_email';
import { sendTelegramAlert, ADMIN_ALERT_BOT_TOKEN } from './admin_alerts';

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

const CODE_TTL_MS = 10 * 60 * 1000; // код живёт 10 минут
const CODE_MAX_ATTEMPTS = 5; // после 5 неверных попыток код блокируется
const RATE_WINDOW_MS = 60 * 60 * 1000; // окно rate-limit — 1 час
const RATE_MAX_PER_WINDOW = 3; // не больше 3 писем в час на stable_id
const ROLLBACK_WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // окно отката перепривязки — 14 дней

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
export const authRequestRecoveryCode = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
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
    await codeRef.set({
      status: 'send_failed',
      sendError: stableTransactionalEmailError(sendResult.error),
      updatedAt: now,
    }, { merge: true }).catch(() => {});
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

type ConfirmTransactionOutcome =
  | { kind: 'invalid' }
  | { kind: 'locked' }
  | {
    kind: 'success';
    previousProviderUids: string[];
    previousStableIdDisplacement: string | null;
  };

export const authConfirmRecoveryCode = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
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
  const markerRef = db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(newUid);
  const targetTombstoneRef = db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(stableId);
  const leaderboardRef = db.collection(LEADERBOARD).doc(stableId);
  const eventRef = db.collection(RECOVERY_EVENTS).doc();

  let preflightLinkFingerprint: string;
  let preflightUserFingerprint: string;
  try {
    const [preflightLinkSnap, preflightUserSnap] = await Promise.all([
      linkRef.get(),
      userRef.get(),
    ]);
    preflightLinkFingerprint = snapshotFingerprint(preflightLinkSnap);
    preflightUserFingerprint = userIdentityFingerprint(preflightUserSnap);
  } catch {
    throwRecoveryUnavailable();
  }

  let outcome: ConfirmTransactionOutcome;
  try {
    outcome = await db.runTransaction(async (tx): Promise<ConfirmTransactionOutcome> => {
      const codeSnap = await tx.get(codeRef);
      const codeData = codeSnap.data();
      if (!codeSnap.exists || !codeData || codeData.status !== 'active') {
        throw new HttpsError('failed-precondition', 'recovery_code_missing');
      }
      if (numeric(codeData.expiresAt) <= now) {
        throw new HttpsError('deadline-exceeded', 'recovery_code_expired');
      }

      const attempts = numeric(codeData.attempts);
      if (attempts >= CODE_MAX_ATTEMPTS) return { kind: 'locked' };
      const expectedHash = String(codeData.codeHash ?? '');
      const actualHash = hashRecoveryCode(String(codeData.salt ?? ''), code);
      if (!hashesEqual(actualHash, expectedHash)) {
        tx.set(codeRef, { attempts: attempts + 1, updatedAt: now }, { merge: true });
        return { kind: 'invalid' };
      }

      const [userSnap, linkSnap, markerSnap, targetTombstoneSnap, leaderboardSnap] =
        await Promise.all([
          tx.get(userRef),
          tx.get(linkRef),
          tx.get(markerRef),
          tx.get(targetTombstoneRef),
          tx.get(leaderboardRef),
        ]);
      if (snapshotFingerprint(linkSnap) !== preflightLinkFingerprint) {
        throwIdentityMismatch();
      }
      if (userIdentityFingerprint(userSnap) !== preflightUserFingerprint) {
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
      assertSessionProvider(sessionProvider, linked.provider, codeData.provider);
      const targetProvider = linked.provider;
      const allPreviousProviderUids = oldProviderUids(userData);
      if (allPreviousProviderUids.length === 0) throwIdentityMismatch();

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
        }
      }

      const previousProviderUids = allPreviousProviderUids.filter((uid) => uid !== newUid);
      const existingLinkedAt = numeric(linkData.linkedAt);
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
        const leaderboardAuthUid =
          String(leaderboardSnap.data()?.firebaseAuthUid ?? '').trim();
        if (leaderboardAuthUid !== newUid) {
          tx.set(leaderboardRef, { firebaseAuthUid: newUid, updatedAt: now }, { merge: true });
        }
      }
      tx.create(eventRef, {
        stableId,
        newProviderUid: newUid,
        previousProviderUids,
        ...(previousStableIdDisplacement ? { previousStableIdDisplacement } : {}),
        requestedByUid: String(codeData.requestedByUid ?? '').trim() || null,
        at: now,
        rollbackUntil: now + ROLLBACK_WINDOW_MS,
        status: 'completed',
      });
      tx.set(
        codeRef,
        { status: 'consumed', consumedAt: now, consumedByUid: newUid, updatedAt: now },
        { merge: true },
      );
      previousProviderUids.forEach((uid) => {
        const anchorIndex = allPreviousProviderUids.indexOf(uid);
        if (anchorIndex >= 0 && targetAnchorSnaps[anchorIndex].exists) {
          tx.delete(targetAnchorRefs[anchorIndex]);
        }
      });
      return { kind: 'success', previousProviderUids, previousStableIdDisplacement };
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

  return { ok: true, stableId };
});
