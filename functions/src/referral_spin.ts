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
  resolveReferralRouletteEnabled,
  stackVipUntilMs,
  vipUntilFromProgress,
} from './referral';
import {
  BIG_PRIZE_INDEX,
  JACKPOT_INDEX,
  REFERRAL_SPIN_PRIZE_DAYS,
  referralSpinWeightsFromData,
  spinDraw,
} from './referral_spin_logic';
import { referralRouletteEnabledFromData } from './referral_roulette_flag';

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

  // Мастер-флаг «рулетка+рефералка» (админка → remote_config). Выкл → failed-precondition.
  if (!(await resolveReferralRouletteEnabled(db))) {
    throw new HttpsError('failed-precondition', 'REFERRAL_ROULETTE_DISABLED');
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

  return db.runTransaction(async (tx): Promise<SpinResult> => {
    const spinRef = spinsCol.doc(spinRequestId);
    const [configSnap, userSnap, existingSpin] = await Promise.all([
      tx.get(configRef),
      tx.get(userRef),
      tx.get(spinRef),
    ]);
    const configData = configSnap.data() as { numbers?: Record<string, unknown> } | undefined;
    if (!referralRouletteEnabledFromData(configData)) {
      throw new HttpsError('failed-precondition', 'REFERRAL_ROULETTE_DISABLED');
    }

    // Идемпотентность: повтор с тем же spinRequestId → тот же приз, без списания кредита.
    if (existingSpin.exists) {
      const s = existingSpin.data() as {
        prizeIndex?: number;
        prizeDays?: number;
        spinsLeftAfter?: number;
        vipUntilMs?: number;
      };
      return {
        ok: true,
        prizeIndex: Math.max(0, Math.floor(Number(s.prizeIndex ?? 0))),
        prizeDays: Math.max(0, Math.floor(Number(s.prizeDays ?? 0))),
        spinsLeft: Math.max(0, Math.floor(Number(s.spinsLeftAfter ?? 0))),
        vipUntil: Math.max(0, Math.floor(Number(s.vipUntilMs ?? 0))),
        idempotent: true,
      };
    }

    const userData = userSnap.data() ?? {};
    const progress = (userData as { progress?: Record<string, unknown> }).progress ?? {};
    const credits = Math.max(0, Math.floor(Number(progress.referral_spin_credits ?? 0)));
    if (credits <= 0) {
      throw new HttpsError('failed-precondition', 'NO_SPIN_CREDITS');
    }
    const spinsUsedTotal = Math.max(0, Math.floor(Number(progress.referral_spins_total ?? 0)));

    // RNG: seed живёт только в памяти вызова; в лог — sha256(seed) для аудита.
    const seed = crypto.randomBytes(16).toString('hex');
    const rng = () => crypto.randomInt(0, 1_000_000_000) / 1_000_000_000;

    // Чистый розыгрыш (pity + джекпот-капы) — та же функция, что в тестах и админке.
    const draw = spinDraw({ weights, spinsUsedTotal, forbidden, rng });
    const { prizeIndex, prizeDays, pity, reroll } = draw;

    // Стак VIP — тот же подход, что referralClaimVipReward: от max(текущее окно, now).
    const nowMs = Date.now();
    const currentUntil = vipUntilFromProgress(progress);
    const vipUntil = stackVipUntilMs(currentUntil, nowMs, prizeDays);
    const spinsLeft = credits - 1;

    tx.set(
      userRef,
      {
        progress: {
          vip_active: 'true',
          vip_plan: 'referral_spin',
          vip_from: String(Math.min(currentUntil || nowMs, nowMs)),
          vip_until: String(vipUntil),
          vip_admin_override: 'true',
          vip_admin_grant_at: String(nowMs),
          referral_vip_last_source: 'referral_spin',
          referral_spin_credits: spinsLeft,
          referral_spins_total: spinsUsedTotal + 1,
        },
        updatedAt: nowMs,
      },
      { merge: true },
    );

    tx.set(spinRef, {
      prizeIndex,
      prizeDays,
      pity,
      reroll,
      seedHash: sha256Hex(seed),
      spinsUsedTotal: spinsUsedTotal + 1,
      spinsLeftAfter: spinsLeft,
      vipUntilMs: vipUntil,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAtMs: nowMs,
    });

    console.log(
      JSON.stringify({
        event: 'referral_spin',
        stableId,
        prizeIndex,
        prizeDays,
        pity,
        reroll,
        spinsUsedTotal: spinsUsedTotal + 1,
      }),
    );

    return { ok: true, prizeIndex, prizeDays, spinsLeft, vipUntil };
  });
});
