// ════════════════════════════════════════════════════════════════════════════
// promo_codes.ts — промокоды-награды (база под маркетинг). Админ создаёт код в
// «Пульте», юзер вводит его в приложении и получает N дней премиума (VIP-дни,
// тот же механизм, что у рефералов — один источник правды premium-доступа).
//
// НЕ скидка на цену подписки (её задают App Store/Google Play). Это выдача
// доступа за код — полностью на нашем бэкенде, не зависит от настроек сторов.
//
// Коллекции:
//   promo_codes/{CODE}                      — определение кода (см. PromoCodeDoc)
//   users/{uid}/promo_redemptions/{CODE}    — маркер «этот юзер уже активировал»
//                                              (идемпотентность + один код на юзера)
//
// Безопасность: stableUid берём ТОЛЬКО из auth (resolveStableUidForAuth), как в
// рефералах/карточках. Все проверки и инкремент usedCount — в одной транзакции.
// ════════════════════════════════════════════════════════════════════════════
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { ENFORCE_APP_CHECK } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { stackVipUntilMs, vipUntilFromProgress } from './referral';

const REGION = 'us-central1';
const CALLABLE_BASE = { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK } as const;

const PROMO_CODES = 'promo_codes';
const PROMO_REDEMPTIONS = 'promo_redemptions';

// Код: 3..32 символа, латиница/цифры/дефис/подчёркивание. Храним в верхнем регистре.
const CODE_RE = /^[A-Z0-9_-]{3,32}$/;

/** Нормализует пользовательский ввод кода (trim + upper). */
export function normalizePromoCode(raw: unknown): string {
  return String(raw ?? '').trim().toUpperCase();
}

export interface PromoCodeDoc {
  rewardDays: number;          // сколько дней премиума выдаёт
  enabled: boolean;            // выключенный код не активируется
  maxRedemptions: number;      // 0 = без лимита
  usedCount: number;           // сколько раз уже активирован
  expiresAtMs: number;         // 0 = бессрочно
  note?: string;               // заметка для админа
}

export type PromoRejectReason =
  | 'not_found'
  | 'disabled'
  | 'expired'
  | 'limit_reached'
  | 'already_redeemed'
  | 'bad_reward';

export type PromoDecision =
  | { ok: true; rewardDays: number }
  | { ok: false; reason: PromoRejectReason };

/**
 * Чистое решение: можно ли активировать код прямо сейчас. Без Firestore — всё
 * передаётся явно, чтобы тестировать. Транзакция вызывает это и при ok начисляет.
 */
export function decidePromoRedemption(params: {
  code: PromoCodeDoc | null;
  alreadyRedeemed: boolean;
  nowMs: number;
}): PromoDecision {
  const { code, alreadyRedeemed, nowMs } = params;
  if (!code) return { ok: false, reason: 'not_found' };
  if (!code.enabled) return { ok: false, reason: 'disabled' };
  if (code.expiresAtMs > 0 && nowMs >= code.expiresAtMs) return { ok: false, reason: 'expired' };
  if (alreadyRedeemed) return { ok: false, reason: 'already_redeemed' };
  if (code.maxRedemptions > 0 && code.usedCount >= code.maxRedemptions) {
    return { ok: false, reason: 'limit_reached' };
  }
  if (!Number.isFinite(code.rewardDays) || code.rewardDays <= 0) {
    return { ok: false, reason: 'bad_reward' };
  }
  return { ok: true, rewardDays: code.rewardDays };
}

function readInt(v: unknown, fallback = 0): number {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) ? n : fallback;
}

/** Парсит сырой Firestore-док кода в типизированный PromoCodeDoc (или null). */
function parsePromoCodeDoc(data: FirebaseFirestore.DocumentData | undefined): PromoCodeDoc | null {
  if (!data) return null;
  return {
    rewardDays: readInt(data.rewardDays, 0),
    enabled: data.enabled === true,
    maxRedemptions: Math.max(0, readInt(data.maxRedemptions, 0)),
    usedCount: Math.max(0, readInt(data.usedCount, 0)),
    expiresAtMs: Math.max(0, readInt(data.expiresAtMs, 0)),
    note: typeof data.note === 'string' ? data.note : undefined,
  };
}

/** VIP-патч для прогресса (по образцу referral, но vip_plan='promo'). */
function buildPromoVipPatch(
  currentProgress: Record<string, unknown> | undefined,
  nowMs: number,
  addDays: number,
  code: string,
): Record<string, string> {
  const currentUntil = vipUntilFromProgress(currentProgress);
  const vipUntil = stackVipUntilMs(currentUntil, nowMs, addDays);
  return {
    vip_active: 'true',
    vip_plan: 'promo',
    vip_from: String(Math.min(currentUntil || nowMs, nowMs)),
    vip_until: String(vipUntil),
    vip_admin_override: 'true',
    vip_admin_grant_at: String(nowMs),
    promo_vip_last_code: code,
  };
}

/* ── onCall: promoCodeRedeem (юзер вводит код) ──────────────────────────────── */
export const promoCodeRedeem = onCall(CALLABLE_BASE, async (request) => {
  const authUid = request.auth?.uid;
  if (!authUid) throw new HttpsError('unauthenticated', 'auth_required');

  const code = normalizePromoCode(request.data?.code);
  if (!CODE_RE.test(code)) throw new HttpsError('invalid-argument', 'bad_code');

  const db = admin.firestore();
  // stableId НИКОГДА не из тела запроса (как в рефералах/карточках).
  const stableUid = await resolveStableUidForAuth(db, authUid);

  const nowMs = Date.now();
  const codeRef = db.collection(PROMO_CODES).doc(code);
  const userRef = db.collection('users').doc(stableUid);
  const redemptionRef = userRef.collection(PROMO_REDEMPTIONS).doc(code);

  return db.runTransaction(async (tx) => {
    const [codeSnap, redemptionSnap, userSnap] = await Promise.all([
      tx.get(codeRef),
      tx.get(redemptionRef),
      tx.get(userRef),
    ]);

    const decision = decidePromoRedemption({
      code: parsePromoCodeDoc(codeSnap.exists ? codeSnap.data() : undefined),
      alreadyRedeemed: redemptionSnap.exists,
      nowMs,
    });
    if (!decision.ok) {
      return { ok: false, reason: decision.reason };
    }

    const user = userSnap.data() ?? {};
    const progress = (user as { progress?: Record<string, unknown> }).progress ?? {};
    const vipPatch = buildPromoVipPatch(progress, nowMs, decision.rewardDays, code);

    // Маркер активации (идемпотентность + один код на юзера).
    tx.set(redemptionRef, {
      code,
      rewardDays: decision.rewardDays,
      redeemedAtMs: nowMs,
      authUid,
    });
    // Инкремент счётчика использований кода.
    tx.set(codeRef, { usedCount: admin.firestore.FieldValue.increment(1), lastRedeemedAtMs: nowMs }, { merge: true });
    // Выдача VIP-дней (тот же механизм, что admin-grant/реферал).
    tx.set(userRef, { progress: vipPatch, updatedAt: nowMs }, { merge: true });

    return { ok: true, rewardDays: decision.rewardDays, vipUntilMs: Number(vipPatch.vip_until) };
  });
});

/* ── onCall: promoCodeUpsert (админ создаёт/правит код) ──────────────────────── */
export const promoCodeUpsert = onCall({ region: REGION }, async (request) => {
  if (!request.auth?.token?.admin) {
    throw new HttpsError('permission-denied', 'Admin only');
  }
  const code = normalizePromoCode(request.data?.code);
  if (!CODE_RE.test(code)) throw new HttpsError('invalid-argument', 'bad_code');

  const rewardDays = readInt(request.data?.rewardDays, 0);
  if (rewardDays <= 0 || rewardDays > 3650) {
    throw new HttpsError('invalid-argument', 'rewardDays must be 1..3650');
  }
  const enabled = request.data?.enabled !== false; // по умолчанию включён
  const maxRedemptions = Math.max(0, readInt(request.data?.maxRedemptions, 0));
  const expiresAtMs = Math.max(0, readInt(request.data?.expiresAtMs, 0));
  const note = String(request.data?.note ?? '').slice(0, 200);

  const db = admin.firestore();
  const codeRef = db.collection(PROMO_CODES).doc(code);
  const adminEmail = String(request.auth?.token?.email ?? '');
  const now = Date.now();

  // Атомарно: правка НЕ трогает usedCount; инициализация usedCount=0 только если
  // кода ещё не было. Одна транзакция вместо set→get→set исключает гонку с redeem,
  // который параллельно инкрементит usedCount (нельзя обнулить денежный счётчик).
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(codeRef);
    const patch: Record<string, unknown> = {
      rewardDays, enabled, maxRedemptions, expiresAtMs, note,
      updatedAtMs: now, updatedBy: adminEmail,
    };
    if (typeof snap.data()?.usedCount !== 'number') {
      patch.usedCount = 0;
      patch.createdAtMs = now;
      patch.createdBy = adminEmail;
    }
    tx.set(codeRef, patch, { merge: true });
  });

  return { ok: true, code };
});
