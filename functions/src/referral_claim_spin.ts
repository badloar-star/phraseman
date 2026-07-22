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
  resolveReferralRoulettePolicy,
} from './referral';
import {
  REFERRAL_ANALYTICS_EVENTS,
  existingQualifiedDrainEligible,
  policyTimestampMs,
  referralRoulettePolicyFromData,
} from './referral_roulette_policy';
import {
  REFERRAL_SPIN_LEDGER,
  REFERRAL_SPIN_LEDGER_MIGRATION_MARKER_ID,
  REFERRAL_SPIN_LEDGER_VERSION,
  buildAvailableCredit,
  buildLegacyCreditRows,
  ledgerRowFromData,
  reconcileLedgerRowsForClaim,
  referralCreditId,
  shouldMigrateLegacyAggregate,
} from './referral_spin_ledger';

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

  const outerPolicy = await resolveReferralRoulettePolicy(db);
  if (outerPolicy.emergencyStop) {
    throw new HttpsError('failed-precondition', 'REFERRAL_ROULETTE_EMERGENCY_STOP');
  }

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
  const configRef = db.collection('remote_config').doc('app');

  const ym = yyyymmNow();
  const ymd = yyyymmddNow();

  return db.runTransaction(async (tx): Promise<ClaimSpinResult> => {
    // Перечитываем attributions внутри транзакции (защита от гонки двойного клика).
    const attRefs = qualifiedSnap.docs.map((d) => db.collection(REFERRAL_ATTRIBUTIONS).doc(d.id));
    const [configSnap, userSnap, ...attSnaps] = await Promise.all([
      tx.get(configRef),
      tx.get(userRef),
      ...attRefs.map((r) => tx.get(r)),
    ]);
    const configData = configSnap.data() as { numbers?: Record<string, unknown> } | undefined;
    const policy = referralRoulettePolicyFromData(configData);
    if (policy.emergencyStop) {
      throw new HttpsError('failed-precondition', 'REFERRAL_ROULETTE_EMERGENCY_STOP');
    }

    const userData = userSnap.data() ?? {};
    const progressData = (userData as { progress?: Record<string, unknown> }).progress ?? {};
    const monthly = (progressData.referral_vip_claims_monthly as Record<string, number> | undefined) ?? {};
    const daily = (progressData.referral_vip_claims_daily as Record<string, number> | undefined) ?? {};
    let usedThisMonth = Math.max(0, Math.floor(Number(monthly[ym] ?? 0)));
    let usedToday = Math.max(0, Math.floor(Number(daily[ymd] ?? 0)));
    const aggregateBefore = Math.max(0, Math.floor(Number(progressData.referral_spin_credits ?? 0)));

    const nowMs = Date.now();
    const ledgerVersion = Math.max(0, Math.floor(Number(progressData.referral_spin_ledger_version ?? 0)));
    const ledgerCollection = userRef.collection(REFERRAL_SPIN_LEDGER);
    const migrationMarkerRef = ledgerCollection.doc(REFERRAL_SPIN_LEDGER_MIGRATION_MARKER_ID);
    const [migrationMarkerSnap, anyLedgerSnap] = await Promise.all([
      tx.get(migrationMarkerRef),
      tx.get(ledgerCollection.limit(1)),
    ]);
    const migrateLegacyAggregate = shouldMigrateLegacyAggregate({
      migrationMarkerExists: migrationMarkerSnap.exists,
      anyLedgerDocumentExists: !anyLedgerSnap.empty,
    });
    const shouldWriteMigrationMarker = !migrationMarkerSnap.exists;
    let legacyRows: ReturnType<typeof buildLegacyCreditRows> = [];
    let legacyRefs: admin.firestore.DocumentReference[] = [];
    let legacySnaps: admin.firestore.DocumentSnapshot[] = [];
    if (migrateLegacyAggregate) {
      try {
        legacyRows = buildLegacyCreditRows(referrerStableId, aggregateBefore);
      } catch {
        throw new HttpsError('failed-precondition', 'LEGACY_CREDIT_MIGRATION_TOO_LARGE');
      }
      legacyRefs = legacyRows.map((row) => userRef.collection(REFERRAL_SPIN_LEDGER).doc(row.id));
      legacySnaps = await Promise.all(legacyRefs.map((ref) => tx.get(ref)));
    }

    const candidateCreditRefs = attSnaps.map((snap) => (
      userRef.collection(REFERRAL_SPIN_LEDGER).doc(referralCreditId(snap.id))
    ));
    const candidateCreditSnaps = await Promise.all(candidateCreditRefs.map((ref) => tx.get(ref)));
    const availableSnap = await tx.get(
      ledgerCollection.where('status', '==', 'available').limit(450),
    );
    if (availableSnap.size >= 450) {
      throw new HttpsError('failed-precondition', 'LEDGER_RECONCILIATION_LIMIT');
    }
    const persistedRows = availableSnap.docs.map((doc) => {
      const parsed = ledgerRowFromData(doc.id, doc.data() as Record<string, unknown>);
      if (!parsed) throw new HttpsError('failed-precondition', 'LEDGER_INVALID_CREDIT');
      return parsed;
    });
    const persistedIds = new Set(persistedRows.map((row) => row.id));
    const migrationRows = legacyRows.filter((row, index) => (
      !legacySnaps[index].exists && !persistedIds.has(row.id)
    ));
    const ledgerRows = [...persistedRows, ...migrationRows];
    const beforeClaimAll = reconcileLedgerRowsForClaim(ledgerRows, nowMs, { softEnabled: true }, 0);
    const expiredIds = new Set(beforeClaimAll.expiredIds);
    const migrationIds = new Set(migrationRows.map((row) => row.id));
    const persistedExpiredCount = beforeClaimAll.expiredIds.filter((id) => !migrationIds.has(id)).length;
    const conservativeWriteCount = migrationRows.length
      + persistedExpiredCount
      + (attSnaps.length * 2)
      + 2
      + (shouldWriteMigrationMarker ? 1 : 0);
    if (conservativeWriteCount > 480) {
      throw new HttpsError('failed-precondition', 'LEDGER_RECONCILIATION_LIMIT');
    }

    migrationRows.forEach((row) => {
      const { id: _id, ...data } = row;
      tx.create(userRef.collection(REFERRAL_SPIN_LEDGER).doc(row.id), {
        ...data,
        earnedAt: admin.firestore.Timestamp.fromMillis(row.earnedAtMs),
        expiresAt: admin.firestore.Timestamp.fromMillis(row.expiresAtMs),
        ...(expiredIds.has(row.id) ? {
          status: 'expired',
          expiredAt: admin.firestore.FieldValue.serverTimestamp(),
          expiredAtMs: nowMs,
        } : {}),
      });
    });
    if (shouldWriteMigrationMarker) {
      tx.create(migrationMarkerRef, {
        kind: 'migration_marker',
        version: REFERRAL_SPIN_LEDGER_VERSION,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAtMs: nowMs,
      });
    }
    for (const creditId of expiredIds) {
      if (migrationIds.has(creditId)) continue;
      tx.set(userRef.collection(REFERRAL_SPIN_LEDGER).doc(creditId), {
        status: 'expired',
        expiredAt: admin.firestore.FieldValue.serverTimestamp(),
        expiredAtMs: nowMs,
      }, { merge: true });
      console.log(JSON.stringify({
        event: REFERRAL_ANALYTICS_EVENTS.creditExpired,
        ownerStableId: referrerStableId,
        creditId,
        expiredAtMs: nowMs,
      }));
    }
    let claimed = 0;
    let cappedThisMonth = false;
    let cappedToday = false;

    for (let i = 0; i < attSnaps.length; i += 1) {
      const snap = attSnaps[i];
      if (!snap.exists) continue;
      const row = snap.data() as {
        status?: string;
        createdAt?: unknown;
        createdAtMs?: unknown;
        qualifiedAt?: unknown;
        qualifiedAtMs?: unknown;
      } | undefined;
      if (row?.status !== 'qualified' && row?.status !== 'skipped_referrer_cap') continue;
      if (!existingQualifiedDrainEligible({
        createdAtMs: policyTimestampMs(row.createdAt) || policyTimestampMs(row.createdAtMs),
        qualifiedAtMs: policyTimestampMs(row.qualifiedAt) || policyTimestampMs(row.qualifiedAtMs),
      }, policy)) continue;

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

      const creditRef = candidateCreditRefs[i];
      const creditSnap = candidateCreditSnaps[i];
      if (!creditSnap.exists) {
        const credit = buildAvailableCredit({
          id: creditRef.id,
          ownerStableId: referrerStableId,
          source: 'referral',
          attributionId: snap.id,
          earnedAtMs: nowMs,
        });
        const { id: _id, ...creditData } = credit;
        tx.create(creditRef, {
          ...creditData,
          earnedAt: admin.firestore.FieldValue.serverTimestamp(),
          expiresAt: admin.firestore.Timestamp.fromMillis(credit.expiresAtMs),
        });
        claimed += 1;
        usedThisMonth += 1;
        usedToday += 1;
        console.log(JSON.stringify({
          event: REFERRAL_ANALYTICS_EVENTS.creditEarned,
          ownerStableId: referrerStableId,
          attributionId: snap.id,
          creditId: creditRef.id,
          earnedAtMs: nowMs,
          expiresAtMs: credit.expiresAtMs,
        }));
      }

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

    const allAfterClaim = reconcileLedgerRowsForClaim(ledgerRows, nowMs, { softEnabled: true }, claimed);
    const eligibleAfterClaim = reconcileLedgerRowsForClaim(ledgerRows, nowMs, policy, claimed);
    const aggregateSpinsTotal = allAfterClaim.availableCountAfterClaim;
    const responseSpinsTotal = eligibleAfterClaim.availableCountAfterClaim;

    if (
      claimed > 0
      || ledgerVersion < REFERRAL_SPIN_LEDGER_VERSION
      || expiredIds.size > 0
      || aggregateBefore !== aggregateSpinsTotal
    ) {
      tx.set(
        userRef,
        {
          progress: {
            referral_spin_credits: aggregateSpinsTotal,
            referral_spin_ledger_version: REFERRAL_SPIN_LEDGER_VERSION,
            ...(migrateLegacyAggregate
              ? { referral_spin_ledger_migrated_at_ms: nowMs }
              : {}),
            ...(claimed > 0 ? {
              // Те же счётчики капов, что у VIP-claim: чистим старые периоды (M1).
              referral_vip_claims_monthly: prunePeriodCounter({ ...monthly, [ym]: usedThisMonth }, 3),
              referral_vip_claims_daily: prunePeriodCounter({ ...daily, [ymd]: usedToday }, 10),
            } : {}),
          },
          updatedAt: nowMs,
        },
        { merge: true },
      );

      if (claimed > 0) {
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
    }

    console.log(
      JSON.stringify({
        event: 'referral_claim_spin',
        referrerStableId,
        claimed,
        spinsTotal: responseSpinsTotal,
        aggregateSpinsTotal,
        cappedThisMonth,
        cappedToday,
      }),
    );

    return { ok: true, claimed, spinsTotal: responseSpinsTotal, cappedThisMonth, cappedToday };
  });
});
