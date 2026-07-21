/**
 * Конверсия qualified-приглашений в прокруты рулетки (замена/дополнение referralClaimVipReward).
 *
 * Pull-обналичивание: referrer жмёт «Крутить»/«Забрать прокруты» → за каждого qualified-друга
 * +1 спин-кредит (users/{id}.progress.referral_spin_credits), attribution → 'rewarded'
 * (rewardKind='spin_credit'). Идемпотентно: повтор без новых qualified вернёт claimed=0.
 *
 * Капы — те же, что у VIP-обналичивания (разделяем счётчики, чтобы переход VIP→рулетка
 * не открывал второй антифрод-канал): referral_vip_claims_monthly (30/мес) и
 * referral_vip_claims_daily (3/день), тюнинг из «Пульта» через resolveReferralConfig.
 * За капом приглашения НЕ теряются: остаются 'qualified', добираются завтра/в след. месяце.
 */
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import {
  assertAuthStableLink,
  prunePeriodCounter,
  referralClaimSlotsLeft,
  resolveReferralConfig,
} from './referral';

const REGION = 'us-central1';
const CALLABLE_BASE = { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK } as const;

const USERS = 'users';
const REFERRAL_ATTRIBUTIONS = 'referral_attributions';
/** Сколько qualified-приглашений обрабатываем за один вызов (как у VIP-claim). */
const MAX_CLAIMS_PER_CALL = 20;

type AttributionStatus = 'pending' | 'qualified' | 'rewarded' | 'skipped_referrer_cap';

function yyyymmNow(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function yyyymmddNow(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

type ClaimSpinResult = {
  ok: true;
  claimed: number;
  spinsTotal: number;
  cappedThisMonth: boolean;
  cappedToday: boolean;
};

export const referralClaimSpin = onCall(CALLABLE_BASE, async (request): Promise<ClaimSpinResult> => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Auth required');
  }
  const authUid = request.auth.uid;
  const referrerStableId = String(request.data?.referrerStableId ?? '').trim();
  if (!referrerStableId) {
    throw new HttpsError('invalid-argument', 'referrerStableId required');
  }

  const db = admin.firestore();
  await assertAuthStableLink(db, authUid, referrerStableId);

  // Тюнинг капов из «Пульта». Читаем ДО транзакции (отдельный документ).
  const cfg = await resolveReferralConfig(db);

  // Какие приглашения готовы к конверсии (qualified + legacy skipped_referrer_cap — как в VIP-claim).
  const qualifiedSnap = await db
    .collection(REFERRAL_ATTRIBUTIONS)
    .where('referrerStableId', '==', referrerStableId)
    .where('status', 'in', ['qualified', 'skipped_referrer_cap'])
    .limit(MAX_CLAIMS_PER_CALL)
    .get();

  const userRef = db.collection(USERS).doc(referrerStableId);

  if (qualifiedSnap.empty) {
    const u = await userRef.get();
    const p = (u.data() as { progress?: Record<string, unknown> } | undefined)?.progress ?? {};
    return {
      ok: true,
      claimed: 0,
      spinsTotal: Math.max(0, Math.floor(Number(p.referral_spin_credits ?? 0))),
      cappedThisMonth: false,
      cappedToday: false,
    };
  }

  const ym = yyyymmNow();
  const ymd = yyyymmddNow();

  return db.runTransaction(async (tx): Promise<ClaimSpinResult> => {
    const userSnap = await tx.get(userRef);
    // Перечитываем attributions внутри транзакции (защита от гонки двойного клика).
    const attRefs = qualifiedSnap.docs.map((d) => db.collection(REFERRAL_ATTRIBUTIONS).doc(d.id));
    const attSnaps = await Promise.all(attRefs.map((r) => tx.get(r)));

    const userData = userSnap.data() ?? {};
    const progressData = (userData as { progress?: Record<string, unknown> }).progress ?? {};
    const monthly = (progressData.referral_vip_claims_monthly as Record<string, number> | undefined) ?? {};
    const daily = (progressData.referral_vip_claims_daily as Record<string, number> | undefined) ?? {};
    let usedThisMonth = Math.max(0, Math.floor(Number(monthly[ym] ?? 0)));
    let usedToday = Math.max(0, Math.floor(Number(daily[ymd] ?? 0)));
    let spinsTotal = Math.max(0, Math.floor(Number(progressData.referral_spin_credits ?? 0)));

    const nowMs = Date.now();
    let claimed = 0;
    let cappedThisMonth = false;
    let cappedToday = false;

    for (let i = 0; i < attSnaps.length; i += 1) {
      const snap = attSnaps[i];
      if (!snap.exists) continue;
      const row = snap.data() as { status?: string } | undefined;
      if (row?.status !== 'qualified' && row?.status !== 'skipped_referrer_cap') continue;

      if (referralClaimSlotsLeft(usedThisMonth, usedToday, cfg.maxClaimsPerMonth, cfg.maxClaimsPerDay) <= 0) {
        // Кап (день/месяц). Статус НЕ понижаем — прокрут не теряется, доберётся позже.
        if (usedThisMonth >= cfg.maxClaimsPerMonth) cappedThisMonth = true;
        else cappedToday = true;
        tx.set(
          attRefs[i],
          { lastCappedAt: admin.firestore.FieldValue.serverTimestamp() },
          { merge: true },
        );
        break;
      }

      spinsTotal += 1;
      usedThisMonth += 1;
      usedToday += 1;
      claimed += 1;

      tx.set(
        attRefs[i],
        {
          status: 'rewarded' as AttributionStatus,
          rewardedAt: admin.firestore.FieldValue.serverTimestamp(),
          rewardKind: 'spin_credit',
        },
        { merge: true },
      );
    }

    if (claimed > 0) {
      tx.set(
        userRef,
        {
          progress: {
            referral_spin_credits: spinsTotal,
            // Те же счётчики капов, что у VIP-claim: чистим старые периоды (M1).
            referral_vip_claims_monthly: prunePeriodCounter({ ...monthly, [ym]: usedThisMonth }, 3),
            referral_vip_claims_daily: prunePeriodCounter({ ...daily, [ymd]: usedToday }, 10),
          },
          updatedAt: nowMs,
        },
        { merge: true },
      );

      const rewardRef = userRef.collection('shard_rewards').doc();
      tx.set(rewardRef, {
        ts: new Date(nowMs).toISOString(),
        reason: 'referral_spin_credit',
        rewardType: 'spin_credit',
        amount: claimed,
        label: `🎡 +${claimed} прокрут(а) рулетки`,
        seen: false,
      });
    }

    console.log(
      JSON.stringify({ event: 'referral_claim_spin', referrerStableId, claimed, spinsTotal, cappedThisMonth, cappedToday }),
    );

    return { ok: true, claimed, spinsTotal, cappedThisMonth, cappedToday };
  });
});
