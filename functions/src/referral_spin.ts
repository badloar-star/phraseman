/**
 * Рулетка Plus: конверсия спин-кредитов в дни VIP (стак vip_until).
 *
 * Модель:
 *   - кредиты: users/{id}.progress.referral_spin_credits (число); начисляет referralClaimSpin
 *     за qualified-приглашения (см. referral_claim_spin.ts).
 *   - лог: users/{id}/referral_spins/{spinRequestId} — docId = client spinRequestId,
 *     поэтому повторный вызов с тем же id возвращает уже выданный приз (идемпотентность).
 *
 * Честность (чистая логика вынесена в referral_spin_logic.ts и покрыта vitest):
 *   - веса из «Пульта» (remote_config/app.numbers.referral_spin_weights), дефолт ниже;
 *   - pity: первый спин юзера и каждый 10-й — приз >= 7 дней (индекс 0 исключён из пула);
 *   - джекпот-капы: 365 дней — 1 раз на аккаунт; 180 дней — 1 раз в 365 дней
 *     (проверяется по логу спинов ДО транзакции; при выпадении запрещённого — переброс
 *     внутри разрешённого пула, в лог пишется reroll: true);
 *   - RNG только серверный (crypto); seedHash в логе — для аудита спорных спинов.
 *
 * VIP пишем теми же полями vip_* в users/{id}.progress, что admin-grant и referralClaimVipReward
 * (vip_plan='referral_spin'). Клиент vip_* не трогает (rules: progressHasNoPremiumWrites).
 */
import * as admin from 'firebase-admin';
import * as crypto from 'node:crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import {
  assertAuthStableLink,
  resolveReferralRoulettePolicy,
  stackVipUntilMs,
  vipUntilFromProgress,
} from './referral';
import {
  BIG_PRIZE_INDEX,
  JACKPOT_INDEX,
  REFERRAL_SPIN_PRIZE_DAYS,
  REFERRAL_SPIN_PRIZE_PEARLS,
  referralSpinWeightsFromData,
  spinDraw,
} from './referral_spin_logic';
import {
  REFERRAL_ANALYTICS_EVENTS,
  referralRoulettePolicyFromData,
} from './referral_roulette_policy';
import {
  REFERRAL_SPIN_LEDGER,
  REFERRAL_SPIN_LEDGER_MIGRATION_MARKER_ID,
  REFERRAL_SPIN_LEDGER_VERSION,
  buildLegacyCreditRows,
  ledgerRowFromData,
  reconcileLedgerRows,
  shouldMigrateLegacyAggregate,
} from './referral_spin_ledger';

// Реэкспорт для тестов/совместимости (раньше жили здесь).
export {
  REFERRAL_SPIN_PRIZE_DAYS,
  REFERRAL_SPIN_DEFAULT_WEIGHTS,
  referralSpinWeightsFromData,
  referralSpinPickIndex,
} from './referral_spin_logic';

const REGION = 'us-central1';
const CALLABLE_BASE = { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK } as const;

const USERS = 'users';
const SPINS_SUBCOLLECTION = 'referral_spins';
const DAY_MS = 24 * 60 * 60 * 1000;
const BIG_PRIZE_COOLDOWN_MS = 365 * DAY_MS;

/** Читает веса из «Пульта». НИКОГДА не бросает: ошибка/отсутствие → дефолт. */
export async function resolveReferralSpinWeights(db: admin.firestore.Firestore): Promise<number[]> {
  try {
    const snap = await db.collection('remote_config').doc('app').get();
    const data = snap.data() as { numbers?: Record<string, unknown> } | undefined;
    return referralSpinWeightsFromData(data?.numbers);
  } catch (e) {
    console.warn('resolveReferralSpinWeights failed, using defaults', e);
    return referralSpinWeightsFromData(undefined);
  }
}

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

type SpinResult = {
  ok: true;
  prizeIndex: number;
  prizeDays: number;
  /** зачем: владелец (2026-07-26) — Pro (lifetime) получает жемчужины вместо дней. */
  prizeKind: 'days' | 'pearls';
  prizePearls: number;
  spinsLeft: number;
  vipUntil: number;
  idempotent?: boolean;
};

/**
 * Спин рулетки: списывает 1 кредит, вытягивает приз (weighted RNG + pity + джекпот-капы),
 * стакает дни к vip_until. Идемпотентен по spinRequestId (docId лога).
 *
 * Ошибки: unauthenticated / invalid-argument / failed-precondition(NO_SPIN_CREDITS, LINK_ACCOUNT_REQUIRED).
 */
export const referralSpin = onCall(CALLABLE_BASE, async (request): Promise<SpinResult> => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Auth required');
  }
  const authUid = request.auth.uid;
  const stableId = String(request.data?.stableId ?? '').trim();
  const spinRequestId = String(request.data?.spinRequestId ?? '').trim();
  if (!stableId) {
    throw new HttpsError('invalid-argument', 'stableId required');
  }
  if (spinRequestId.length < 8 || spinRequestId.length > 128) {
    throw new HttpsError('invalid-argument', 'spinRequestId required (8..128 chars)');
  }

  const db = admin.firestore();
  await assertAuthStableLink(db, authUid, stableId);

  const outerPolicy = await resolveReferralRoulettePolicy(db);
  if (outerPolicy.emergencyStop) {
    throw new HttpsError('failed-precondition', 'REFERRAL_ROULETTE_EMERGENCY_STOP');
  }

  const weights = await resolveReferralSpinWeights(db);
  const configRef = db.collection('remote_config').doc('app');
  const userRef = db.collection(USERS).doc(stableId);
  const spinsCol = userRef.collection(SPINS_SUBCOLLECTION);

  // Джекпот-капы по логу спинов — ДО транзакции (запросы внутри tx невозможны).
  // Нужен composite-индекс referral_spins(prizeDays, createdAtMs) — см. PATCHES.md.
  const nowForCaps = Date.now();
  const [jackpotSnap, bigPrizeSnap] = await Promise.all([
    spinsCol.where('prizeDays', '==', REFERRAL_SPIN_PRIZE_DAYS[JACKPOT_INDEX]).limit(1).get(),
    spinsCol
      .where('prizeDays', '==', REFERRAL_SPIN_PRIZE_DAYS[BIG_PRIZE_INDEX])
      .where('createdAtMs', '>', nowForCaps - BIG_PRIZE_COOLDOWN_MS)
      .limit(1)
      .get(),
  ]);
  const forbidden = new Set<number>();
  if (!jackpotSnap.empty) forbidden.add(JACKPOT_INDEX);
  if (!bigPrizeSnap.empty) forbidden.add(BIG_PRIZE_INDEX);

  const outcome = await db.runTransaction(async (tx): Promise<SpinResult | { noCredit: true }> => {
    const spinRef = spinsCol.doc(spinRequestId);
    const [configSnap, userSnap, existingSpin] = await Promise.all([
      tx.get(configRef),
      tx.get(userRef),
      tx.get(spinRef),
    ]);
    const configData = configSnap.data() as { numbers?: Record<string, unknown> } | undefined;
    const policy = referralRoulettePolicyFromData(configData);
    if (policy.emergencyStop) {
      throw new HttpsError('failed-precondition', 'REFERRAL_ROULETTE_EMERGENCY_STOP');
    }

    // Идемпотентность: повтор с тем же spinRequestId → тот же приз, без списания кредита.
    if (existingSpin.exists) {
      const s = existingSpin.data() as {
        prizeIndex?: number;
        prizeDays?: number;
        prizeKind?: string;
        prizePearls?: number;
        spinsLeftAfter?: number;
        vipUntilMs?: number;
      };
      return {
        ok: true,
        prizeIndex: Math.max(0, Math.floor(Number(s.prizeIndex ?? 0))),
        prizeDays: Math.max(0, Math.floor(Number(s.prizeDays ?? 0))),
        prizeKind: s.prizeKind === 'pearls' ? 'pearls' : 'days',
        prizePearls: Math.max(0, Math.floor(Number(s.prizePearls ?? 0))),
        spinsLeft: Math.max(0, Math.floor(Number(s.spinsLeftAfter ?? 0))),
        vipUntil: Math.max(0, Math.floor(Number(s.vipUntilMs ?? 0))),
        idempotent: true,
      };
    }

    const userData = userSnap.data() ?? {};
    const progress = (userData as { progress?: Record<string, unknown> }).progress ?? {};
    const aggregateBefore = Math.max(0, Math.floor(Number(progress.referral_spin_credits ?? 0)));
    const spinsUsedTotal = Math.max(0, Math.floor(Number(progress.referral_spins_total ?? 0)));

    const nowMs = Date.now();
    const ledgerVersion = Math.max(0, Math.floor(Number(progress.referral_spin_ledger_version ?? 0)));
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
        legacyRows = buildLegacyCreditRows(stableId, aggregateBefore);
      } catch {
        throw new HttpsError('failed-precondition', 'LEGACY_CREDIT_MIGRATION_TOO_LARGE');
      }
      legacyRefs = legacyRows.map((row) => userRef.collection(REFERRAL_SPIN_LEDGER).doc(row.id));
      legacySnaps = await Promise.all(legacyRefs.map((ref) => tx.get(ref)));
    }

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
    const migrationRows = legacyRows.filter((row, index) => !legacySnaps[index].exists && !persistedIds.has(row.id));
    const ledgerRows = [...persistedRows, ...migrationRows];
    const eligibleSummary = reconcileLedgerRows(ledgerRows, nowMs, policy);
    const allSummary = reconcileLedgerRows(ledgerRows, nowMs, { softEnabled: true });
    const expiredIds = new Set(allSummary.expiredIds);
    const migrationIds = new Set(migrationRows.map((row) => row.id));
    const persistedExpiredCount = allSummary.expiredIds.filter((id) => !migrationIds.has(id)).length;
    const conservativeWriteCount = migrationRows.length
      + persistedExpiredCount
      + 3
      + (shouldWriteMigrationMarker ? 1 : 0);
    if (conservativeWriteCount > 480) {
      throw new HttpsError('failed-precondition', 'LEDGER_RECONCILIATION_LIMIT');
    }

    migrationRows.forEach((row) => {
      const ref = userRef.collection(REFERRAL_SPIN_LEDGER).doc(row.id);
      const { id: _id, ...data } = row;
      tx.create(ref, {
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
        ownerStableId: stableId,
        creditId,
        expiredAtMs: nowMs,
      }));
    }

    const selectedCredit = eligibleSummary.oldestValid;
    if (!selectedCredit) {
      tx.set(userRef, {
        progress: {
          referral_spin_credits: allSummary.availableCount,
          referral_spin_ledger_version: REFERRAL_SPIN_LEDGER_VERSION,
          ...(migrateLegacyAggregate
            ? { referral_spin_ledger_migrated_at_ms: nowMs }
            : {}),
        },
        updatedAt: nowMs,
      }, { merge: true });
      return { noCredit: true };
    }

    // RNG: seed живёт только в памяти вызова; в лог — sha256(seed) для аудита.
    const seed = crypto.randomBytes(16).toString('hex');
    const rng = () => crypto.randomInt(0, 1_000_000_000) / 1_000_000_000;

    // Чистый розыгрыш (pity + джекпот-капы) — та же функция, что в тестах и админке.
    const draw = spinDraw({ weights, spinsUsedTotal, forbidden, rng });
    const { prizeIndex, prizeDays, pity, reroll } = draw;

    // зачем: владелец (2026-07-26) — у Pro (lifetime, разовая оплата) дни Plus
    // бессмысленны: тот же prizeIndex конвертируется в жемчужины, vip_* НЕ
    // трогаем (заодно не дёргается «Plus активирован»). Признак Pro — тот же,
    // что в admin_analytics_core: progress.premium_plan === 'lifetime'.
    const isProLifetime = String((progress as { premium_plan?: unknown }).premium_plan ?? '')
      .trim().toLowerCase() === 'lifetime';
    const prizeKind: 'days' | 'pearls' = isProLifetime ? 'pearls' : 'days';
    const prizePearls = isProLifetime
      ? Math.max(0, Math.floor(Number(REFERRAL_SPIN_PRIZE_PEARLS[prizeIndex] ?? 0)))
      : 0;

    // Стак VIP — тот же подход, что referralClaimVipReward: от max(текущее окно, now).
    const currentUntil = vipUntilFromProgress(progress);
    const vipUntil = prizeKind === 'pearls'
      ? Math.max(0, currentUntil)
      : stackVipUntilMs(currentUntil, nowMs, prizeDays);
    // The compatibility aggregate keeps every unexpired source, including dev
    // grants. The callable response is narrower: under soft OFF it reports only
    // production-drain credits so a dev-only balance cannot keep roulette open.
    const spinsLeft = Math.max(0, eligibleSummary.availableCount - 1);
    const aggregateSpinsLeft = Math.max(0, allSummary.availableCount - 1);

    tx.set(userRef.collection(REFERRAL_SPIN_LEDGER).doc(selectedCredit.id), {
      status: 'consumed',
      consumedAt: admin.firestore.FieldValue.serverTimestamp(),
      consumedAtMs: nowMs,
      spinRequestId,
    }, { merge: true });

    tx.set(
      userRef,
      {
        progress: {
          // Дни Plus стакаются только для prizeKind='days'; жемчужный приз
          // Pro не пишет vip_* вовсе (начисление — клиентский claim по логу).
          ...(prizeKind === 'days' ? {
            vip_active: 'true',
            vip_plan: 'referral_spin',
            vip_from: String(Math.min(currentUntil || nowMs, nowMs)),
            vip_until: String(vipUntil),
            vip_admin_override: 'true',
            vip_admin_grant_at: String(nowMs),
            referral_vip_last_source: 'referral_spin',
          } : {}),
          referral_spin_credits: aggregateSpinsLeft,
          referral_spin_ledger_version: REFERRAL_SPIN_LEDGER_VERSION,
          ...(migrateLegacyAggregate
            ? { referral_spin_ledger_migrated_at_ms: nowMs }
            : {}),
          referral_spins_total: spinsUsedTotal + 1,
        },
        updatedAt: nowMs,
      },
      { merge: true },
    );

    tx.set(spinRef, {
      prizeIndex,
      prizeDays,
      prizeKind,
      prizePearls,
      pity,
      reroll,
      seedHash: sha256Hex(seed),
      spinsUsedTotal: spinsUsedTotal + 1,
      spinsLeftAfter: spinsLeft,
      vipUntilMs: vipUntil,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAtMs: nowMs,
      creditId: selectedCredit.id,
      creditSource: selectedCredit.source,
    });

    console.log(
      JSON.stringify({
        event: 'referral_spin',
        stableId,
        prizeIndex,
        prizeDays,
        prizeKind,
        prizePearls,
        pity,
        reroll,
        creditId: selectedCredit.id,
        creditSource: selectedCredit.source,
        spinsUsedTotal: spinsUsedTotal + 1,
      }),
    );
    console.log(JSON.stringify({
      event: REFERRAL_ANALYTICS_EVENTS.creditConsumed,
      ownerStableId: stableId,
      creditId: selectedCredit.id,
      source: selectedCredit.source,
      spinRequestId,
      consumedAtMs: nowMs,
    }));

    return { ok: true, prizeIndex, prizeDays, prizeKind, prizePearls, spinsLeft, vipUntil };
  });
  if ('noCredit' in outcome) {
    throw new HttpsError('failed-precondition', 'NO_SPIN_CREDITS');
  }
  return outcome;
});
