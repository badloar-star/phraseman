/**
 * DEV: выдача +1 спин-кредита рулетки по кнопке «DEV +1» в referrals hero.
 *
 * Только для тестовых dev-сборок. Защита:
 *   - гейт «Пульта»: remote_config/app.numbers.referral_dev_grant_enabled === true,
 *     иначе failed-precondition 'DEV_GRANT_DISABLED' (в проде флаг выключен — см. scripts/enable_dev_grant.mjs);
 *   - лимит ≤10/сутки (UTC) на юзера: progress.referral_dev_grants_daily{yyyy-mm-dd},
 *     тот же паттерн, что referral_vip_claims_daily (prunePeriodCounter, храним ~10 последних дней);
 *   - та же привязка auth↔stableId, что у referralSpin (assertAuthStableLink).
 *
 * Пишет progress.referral_spin_credits тем же путём, что referralClaimSpin,
 * с клиента поле недоступно (rules: blockedPremiumProgressKeys) — пишем Admin SDK.
 */
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { assertAuthStableLink, prunePeriodCounter } from './referral';

const REGION = 'us-central1';
const CALLABLE_BASE = { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK } as const;

const USERS = 'users';
const MAX_GRANTS_PER_DAY = 10;

function yyyymmddNow(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** Гейт «Пульта». Строго === true; отсутствие/мусор/ошибка чтения → запрещено (безопасный дефолт). */
async function isDevGrantEnabled(db: admin.firestore.Firestore): Promise<boolean> {
  try {
    const snap = await db.collection('remote_config').doc('app').get();
    const data = snap.data() as { numbers?: Record<string, unknown> } | undefined;
    return data?.numbers?.referral_dev_grant_enabled === true;
  } catch (e) {
    console.warn('isDevGrantEnabled: remote_config read failed, denying', e);
    return false;
  }
}

type DevGrantResult = {
  ok: true;
  spinsTotal: number;
};

/**
 * +1 спин-кредит для dev-теста. Ошибки:
 * unauthenticated / invalid-argument / failed-precondition
 * (DEV_GRANT_DISABLED, DEV_GRANT_DAILY_LIMIT, LINK_ACCOUNT_REQUIRED).
 */
export const referralDevGrantSpin = onCall(CALLABLE_BASE, async (request): Promise<DevGrantResult> => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Auth required');
  }
  const authUid = request.auth.uid;
  const stableId = String(request.data?.stableId ?? '').trim();
  if (!stableId) {
    throw new HttpsError('invalid-argument', 'stableId required');
  }

  const db = admin.firestore();
  if (!(await isDevGrantEnabled(db))) {
    throw new HttpsError('failed-precondition', 'DEV_GRANT_DISABLED');
  }
  await assertAuthStableLink(db, authUid, stableId);

  const userRef = db.collection(USERS).doc(stableId);
  const ymd = yyyymmddNow();

  return db.runTransaction(async (tx): Promise<DevGrantResult> => {
    const userSnap = await tx.get(userRef);
    const userData = userSnap.data() ?? {};
    const progress = (userData as { progress?: Record<string, unknown> }).progress ?? {};

    const daily = (progress.referral_dev_grants_daily ?? {}) as Record<string, number>;
    const usedToday = Math.max(0, Math.floor(Number(daily[ymd] ?? 0)));
    if (usedToday >= MAX_GRANTS_PER_DAY) {
      throw new HttpsError('failed-precondition', 'DEV_GRANT_DAILY_LIMIT');
    }

    const credits = Math.max(0, Math.floor(Number(progress.referral_spin_credits ?? 0)));
    const spinsTotal = credits + 1;

    tx.set(
      userRef,
      {
        progress: {
          referral_spin_credits: spinsTotal,
          // Дневной счётчик: чистим старые дни, чтобы map не рос бесконечно (как vip_claims_daily).
          referral_dev_grants_daily: prunePeriodCounter({ ...daily, [ymd]: usedToday + 1 }, 10),
        },
        updatedAt: Date.now(),
      },
      { merge: true },
    );

    console.log('referralDevGrantSpin: +1 credit', { stableId, ymd, usedToday: usedToday + 1, spinsTotal });
    return { ok: true, spinsTotal };
  });
});
