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
 *
 * D100 (владелец, 2026-09-30): владелец вечного Pro получает вместо дней МОНЕТЫ —
 * операция 'referral_spin' в журнале stars_ledger в той же транзакции, что и спин;
 * ответ несёт stars/starsEarnedTotal/starsSeq для кошелька телефона.
 */
import * as admin from 'firebase-admin';
import * as crypto from 'node:crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { assertAuthAccountUsableForCallable } from './account_gate';
import { ENFORCE_APP_CHECK } from './callable_options';
import { writeAccessProjectionFromPatch } from './access_projection';
import { getWeekKey, isoDateUtc } from './progress_events';
import {
  beginStarLedgerTransactionAttempt,
  commitStarOperations,
  normalizeStars,
  prepareStarOperations,
  type StarLedgerPrepared,
} from './stars_ledger';
import {
  assertAuthStableLink,
  resolveReferralRoulettePolicy,
  stackVipUntilMs,
  vipUntilFromProgress,
} from './referral';
import {
  BIG_PRIZE_INDEX,
  JACKPOT_INDEX,
  REFERRAL_SPIN_PRIZE_COINS,
  REFERRAL_SPIN_PRIZE_DAYS,
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

/**
 * Ключ операции монетного журнала для спина. spinRequestId приходит с клиента
 * (8..128 любых символов), а opId журнала строже ([A-Za-z0-9_.-]{1,96}), поэтому
 * берём детерминированный хэш: тот же spinRequestId → тот же opId → повтор не
 * начислит монеты второй раз (дедуп журнала поверх дедупа лога спина).
 */
export function referralSpinCoinOpId(spinRequestId: string): string {
  return `referral_spin:${sha256Hex(spinRequestId).slice(0, 64)}`;
}

/** Снапшот монетного кошелька для телефона (mergeLevelSpinServerStars). */
type StarsSnapshot = { stars: number; starsEarnedTotal: number; starsSeq: number };

function starsSnapshotFromUserData(data: unknown): StarsSnapshot {
  const stars = normalizeStars((data as { stars?: unknown } | undefined)?.stars);
  return { stars: stars.balance, starsEarnedTotal: stars.earnedTotal, starsSeq: stars.seq };
}

type SpinResult = {
  ok: true;
  prizeIndex: number;
  prizeDays: number;
  /**
   * зачем: D100 (владелец, 2026-09-30) — Pro (lifetime) получает МОНЕТЫ вместо
   * дней (раньше жемчуг, D70 его удалил). Старые записи 'pearls' отдаются как
   * 'coins' с prizeCoins=0: жемчуга больше нет, повтор старого спина ничего не выдаёт.
   */
  prizeKind: 'days' | 'coins';
  prizeCoins: number;
  spinsLeft: number;
  vipUntil: number;
  idempotent?: boolean;
} & Partial<StarsSnapshot>;

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
  // зачем (сверка Ревизора 25.10): в 14-дневной отсрочке удаления вход жив (вариант Б) — рулетка не должна начислять удаляемому аккаунту.
  await assertAuthAccountUsableForCallable(db, authUid, 'referralSpin');
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
    // Журнал монет запрещает два prepare в одной попытке; SDK переиспользует tx при ретрае.
    beginStarLedgerTransactionAttempt(tx);
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
        prizeCoins?: number;
        spinsLeftAfter?: number;
        vipUntilMs?: number;
      };
      // Легаси 'pearls' (до D100) → 'coins' без суммы: жемчуг удалён (D70).
      const replayKind: 'days' | 'coins' = s.prizeKind === 'coins' || s.prizeKind === 'pearls'
        ? 'coins'
        : 'days';
      console.log(JSON.stringify({
        event: 'referral_spin_replay',
        stableId,
        spinRequestId,
        storedPrizeKind: s.prizeKind ?? null,
        replayKind,
      }));
      return {
        ok: true,
        prizeIndex: Math.max(0, Math.floor(Number(s.prizeIndex ?? 0))),
        prizeDays: Math.max(0, Math.floor(Number(s.prizeDays ?? 0))),
        prizeKind: replayKind,
        prizeCoins: s.prizeKind === 'coins' ? Math.max(0, Math.floor(Number(s.prizeCoins ?? 0))) : 0,
        spinsLeft: Math.max(0, Math.floor(Number(s.spinsLeftAfter ?? 0))),
        vipUntil: Math.max(0, Math.floor(Number(s.vipUntilMs ?? 0))),
        idempotent: true,
        // Повтор тоже отдаёт снапшот кошелька: потерянный ответ первого вызова
        // не оставит телефон без уже начисленных монет.
        ...(replayKind === 'coins' ? starsSnapshotFromUserData(userSnap.data()) : {}),
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
      + 2 // D100: монетный приз Pro — запись кошелька и расписка журнала
      + (shouldWriteMigrationMarker ? 1 : 0);
    if (conservativeWriteCount > 480) {
      throw new HttpsError('failed-precondition', 'LEDGER_RECONCILIATION_LIMIT');
    }

    // зачем: D100 — розыгрыш и подготовка монетного приза стоят ДО первой записи:
    // журнал монет (prepareStarOperations) читает расписку в этой же транзакции,
    // а Firestore требует, чтобы все чтения шли раньше всех записей.
    const selectedCredit = eligibleSummary.oldestValid;
    let prize: {
      prizeIndex: number;
      prizeDays: number;
      pity: boolean;
      reroll: boolean;
      seed: string;
      isProLifetime: boolean;
      prizeKind: 'days' | 'coins';
      prizeCoins: number;
      coinsPrepared: StarLedgerPrepared | null;
    } | null = null;
    if (selectedCredit) {
      // RNG: seed живёт только в памяти вызова; в лог — sha256(seed) для аудита.
      const seed = crypto.randomBytes(16).toString('hex');
      const rng = () => crypto.randomInt(0, 1_000_000_000) / 1_000_000_000;
      // Чистый розыгрыш (pity + джекпот-капы) — та же функция, что в тестах и админке.
      const draw = spinDraw({ weights, spinsUsedTotal, forbidden, rng });
      // У Pro (lifetime, разовая оплата) дни Plus бессмысленны: тот же prizeIndex
      // конвертируется в монеты, vip_* НЕ трогаем (заодно не дёргается «Plus
      // активирован»). Признак Pro — тот же, что в admin_analytics_core.
      const premiumPlan = String((progress as { premium_plan?: unknown }).premium_plan ?? '').trim().toLowerCase();
      const isProLifetime = premiumPlan === 'lifetime';
      const prizeKind: 'days' | 'coins' = isProLifetime ? 'coins' : 'days';
      const prizeCoins = isProLifetime
        ? Math.max(0, Math.floor(Number(REFERRAL_SPIN_PRIZE_COINS[draw.prizeIndex] ?? 0)))
        : 0;
      let coinsPrepared: StarLedgerPrepared | null = null;
      if (prizeCoins > 0) {
        coinsPrepared = await prepareStarOperations(tx, db, stableId, userSnap, [{
          opId: referralSpinCoinOpId(spinRequestId),
          delta: prizeCoins,
          reason: 'referral_spin',
          sourceKind: 'referral_spin',
          sourceId: stableId,
          ruleVersion: 1,
          earnedAtMs: nowMs,
          meta: { prizeIndex: draw.prizeIndex, creditId: selectedCredit.id },
        }], {
          nowMs,
          activeSeasonId: '',
          weekKeyNow: getWeekKey(isoDateUtc(new Date(nowMs))),
          authUid,
        });
      }
      console.log(JSON.stringify({
        event: 'referral_spin_prize_decided',
        stableId,
        spinRequestId,
        premiumPlan: premiumPlan || null,
        prizeIndex: draw.prizeIndex,
        prizeKind,
        prizeCoins,
        coinOutcome: coinsPrepared?.outcomes[0]?.status ?? null,
        coinErrorCode: coinsPrepared?.outcomes[0]?.errorCode ?? null,
      }));
      if (coinsPrepared && coinsPrepared.outcomes[0]?.status === 'rejected') {
        // Кредит НЕ списываем: отказ журнала = приз не выдан, ключ остаётся у человека.
        throw new HttpsError('internal', `REFERRAL_SPIN_COINS_REJECTED:${coinsPrepared.outcomes[0]?.errorCode ?? 'unknown'}`);
      }
      prize = { ...draw, seed, isProLifetime, prizeKind, prizeCoins, coinsPrepared };
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

    if (!selectedCredit || !prize) {
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
      console.log(JSON.stringify({ event: 'referral_spin_no_credit', stableId, spinRequestId, available: allSummary.availableCount }));
      return { noCredit: true };
    }

    const { prizeIndex, prizeDays, pity, reroll, seed, prizeKind, prizeCoins, coinsPrepared } = prize;

    // Стак VIP — тот же подход, что referralClaimVipReward: от max(текущее окно, now).
    const currentUntil = vipUntilFromProgress(progress);
    const vipUntil = prizeKind === 'coins'
      ? Math.max(0, currentUntil)
      : stackVipUntilMs(currentUntil, nowMs, prizeDays);
    // The compatibility aggregate keeps every unexpired source, including dev
    // grants. The callable response is narrower: under soft OFF it reports only
    // production-drain credits so a dev-only balance cannot keep roulette open.
    const spinsLeft = Math.max(0, eligibleSummary.availableCount - 1);
    const aggregateSpinsLeft = Math.max(0, allSummary.availableCount - 1);
    const vipProgressPatch: Record<string, unknown> = prizeKind === 'days' ? {
      vip_active: 'true',
      vip_plan: 'referral_spin',
      vip_from: String(Math.min(currentUntil || nowMs, nowMs)),
      vip_until: String(vipUntil),
      vip_admin_override: 'true',
      vip_admin_grant_at: String(nowMs),
      referral_vip_last_source: 'referral_spin',
    } : {};

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
          // Дни Plus стакаются только для prizeKind='days'; монетный приз Pro
          // не пишет vip_* вовсе (монеты — журнал stars ниже, D100).
          ...vipProgressPatch,
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
    if (prizeKind === 'days') {
      writeAccessProjectionFromPatch(tx, userRef, progress, vipProgressPatch, nowMs);
    }

    // D100: монеты Pro — единственный писатель кошелька (stars_ledger), идемпотентно по opId.
    const coinsCommitted = coinsPrepared ? commitStarOperations(tx, coinsPrepared) : null;
    const coinsSnapshot: Partial<StarsSnapshot> = coinsCommitted
      ? { stars: coinsCommitted.balance, starsEarnedTotal: coinsCommitted.earnedTotal, starsSeq: coinsCommitted.seq }
      : {};

    tx.set(spinRef, {
      prizeIndex,
      prizeDays,
      prizeKind,
      prizeCoins,
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
        prizeCoins,
        coinsBalanceAfter: coinsCommitted?.balance ?? null,
        coinsSeqAfter: coinsCommitted?.seq ?? null,
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

    return { ok: true, prizeIndex, prizeDays, prizeKind, prizeCoins, spinsLeft, vipUntil, ...coinsSnapshot };
  });
  if ('noCredit' in outcome) {
    throw new HttpsError('failed-precondition', 'NO_SPIN_CREDITS');
  }
  return outcome;
});
