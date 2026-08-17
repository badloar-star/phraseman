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
import { randomBytes } from 'crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { ENFORCE_APP_CHECK } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { stackVipUntilMs, vipUntilFromProgress } from './referral';
import { resolveRemoteBool } from './remote_gates';
import { hasPermission } from './admin/permissions';

const REGION = 'us-central1';
const CALLABLE_BASE = { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK } as const;

const PROMO_CODES = 'promo_codes';
const PROMO_REDEMPTIONS = 'promo_redemptions';
const PROMO_CODES_ENABLED_FLAG = 'promo_codes_enabled';
const MAX_REWARD_DAYS = 3650;
const MAX_BATCH_PROMO_CODES = 200;

// Код: 3..32 символа, латиница/цифры/дефис/подчёркивание. Храним в верхнем регистре.
const CODE_RE = /^[A-Z0-9_-]{3,32}$/;
const GENERATED_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Нормализует пользовательский ввод кода (trim + upper). */
export function normalizePromoCode(raw: unknown): string {
  return String(raw ?? '').trim().toUpperCase();
}

export type PromoRewardKind = 'days' | 'lifetime';

export interface PromoCodeDoc {
  rewardDays: number;          // сколько дней премиума выдаёт; 0 допустим только для lifetime
  rewardKind: PromoRewardKind; // days | lifetime
  enabled: boolean;            // выключенный код не активируется
  maxRedemptions: number;      // 0 = без лимита
  usedCount: number;           // сколько раз уже активирован
  expiresAtMs: number;         // 0 = бессрочно
  note?: string;               // заметка для админа
}

export type PromoRejectReason =
  | 'promo_disabled'
  | 'not_found'
  | 'disabled'
  | 'expired'
  | 'limit_reached'
  | 'already_redeemed'
  | 'bad_reward';

export type PromoDecision =
  | { ok: true; rewardDays: number; rewardKind: PromoRewardKind }
  | { ok: false; reason: PromoRejectReason };

/**
 * Чистое решение: можно ли активировать код прямо сейчас. Без Firestore — всё
 * передаётся явно, чтобы тестировать. Транзакция вызывает это и при ok начисляет.
 */
export function decidePromoRedemption(params: {
  code: PromoCodeDoc | null;
  alreadyRedeemed: boolean;
  nowMs: number;
  globallyEnabled?: boolean;
}): PromoDecision {
  const { code, alreadyRedeemed, nowMs } = params;
  if (params.globallyEnabled === false) return { ok: false, reason: 'promo_disabled' };
  if (!code) return { ok: false, reason: 'not_found' };
  if (!code.enabled) return { ok: false, reason: 'disabled' };
  if (code.expiresAtMs > 0 && nowMs >= code.expiresAtMs) return { ok: false, reason: 'expired' };
  if (alreadyRedeemed) return { ok: false, reason: 'already_redeemed' };
  if (code.maxRedemptions > 0 && code.usedCount >= code.maxRedemptions) {
    return { ok: false, reason: 'limit_reached' };
  }
  if (code.rewardKind === 'lifetime') {
    return { ok: true, rewardDays: 0, rewardKind: 'lifetime' };
  }
  if (!Number.isFinite(code.rewardDays) || code.rewardDays <= 0) {
    return { ok: false, reason: 'bad_reward' };
  }
  return { ok: true, rewardDays: code.rewardDays, rewardKind: 'days' };
}

function readInt(v: unknown, fallback = 0): number {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) ? n : fallback;
}

function readRewardKind(v: unknown): PromoRewardKind {
  return v === 'lifetime' ? 'lifetime' : 'days';
}

function assertAdminPermission(request: { auth?: { uid?: string; token?: Record<string, unknown> } }, permission: 'money.read' | 'money.manual_access.write'): void {
  if (request.auth?.token?.admin !== true || !String(request.auth.uid ?? '').trim()) throw new HttpsError('permission-denied', 'Admin only');
  const role = request.auth?.token?.adminRole;
  if (!hasPermission(role, permission)) throw new HttpsError('permission-denied', `Role cannot use ${permission}`);
}

function readAdminReason(raw: unknown): string {
  return String(raw ?? '').trim().slice(0, 500);
}

/** Парсит сырой Firestore-док кода в типизированный PromoCodeDoc (или null). */
function parsePromoCodeDoc(data: FirebaseFirestore.DocumentData | undefined): PromoCodeDoc | null {
  if (!data) return null;
  const rewardKind: PromoRewardKind = data.rewardKind === 'lifetime' || data.lifetime === true ? 'lifetime' : 'days';
  return {
    rewardDays: readInt(data.rewardDays, 0),
    rewardKind,
    enabled: data.enabled === true,
    maxRedemptions: Math.max(0, readInt(data.maxRedemptions, 0)),
    usedCount: Math.max(0, readInt(data.usedCount, 0)),
    expiresAtMs: Math.max(0, readInt(data.expiresAtMs, 0)),
    note: typeof data.note === 'string' ? data.note : undefined,
  };
}

/** VIP-патч для прогресса (по образцу referral, но vip_plan='promo'). */
export function buildPromoVipPatch(
  currentProgress: Record<string, unknown> | undefined,
  nowMs: number,
  addDays: number,
  rewardKind: PromoRewardKind,
  code: string,
): Record<string, string> {
  const currentUntil = vipUntilFromProgress(currentProgress);
  const vipUntil = rewardKind === 'lifetime' ? 0 : stackVipUntilMs(currentUntil, nowMs, addDays);
  return {
    vip_active: 'true',
    vip_plan: rewardKind === 'lifetime' ? 'promo_lifetime' : 'promo',
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
  const globallyEnabled = await resolveRemoteBool(db, PROMO_CODES_ENABLED_FLAG, false);
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
      globallyEnabled,
    });
    if (!decision.ok) {
      return { ok: false, reason: decision.reason };
    }

    const user = userSnap.data() ?? {};
    const progress = (user as { progress?: Record<string, unknown> }).progress ?? {};
    const vipPatch = buildPromoVipPatch(progress, nowMs, decision.rewardDays, decision.rewardKind, code);
    const vipUntilMs = Number(vipPatch.vip_until);

    // Маркер активации (идемпотентность + один код на юзера).
    tx.set(redemptionRef, {
      code,
      stableUid,
      rewardDays: decision.rewardDays,
      rewardKind: decision.rewardKind,
      vipPlan: vipPatch.vip_plan,
      vipUntilMs,
      redeemedAtMs: nowMs,
      authUid,
    });
    // Инкремент счётчика использований кода. lastRedeemedBy нужен веб-оплате
    // (web_checkout): при автопродлении Stripe-подписки сервер по коду находит
    // аккаунт и продлевает vip_until без участия юзера.
    tx.set(codeRef, {
      usedCount: admin.firestore.FieldValue.increment(1),
      lastRedeemedAtMs: nowMs,
      lastRedeemedBy: stableUid,
    }, { merge: true });
    // Выдача VIP-дней (тот же механизм, что admin-grant/реферал).
    tx.set(userRef, { progress: vipPatch, updatedAt: nowMs }, { merge: true });

    return {
      ok: true,
      rewardDays: decision.rewardDays,
      rewardKind: decision.rewardKind,
      vipUntilMs,
      grantAtMs: nowMs,
    };
  });
});

function readPromoCodeWritePayload(data: Record<string, unknown>): {
  rewardDays: number;
  rewardKind: PromoRewardKind;
  enabled: boolean;
  maxRedemptions: number;
  expiresAtMs: number;
  note: string;
} {
  const rewardKind = readRewardKind(data.rewardKind);
  const rewardDays = rewardKind === 'lifetime' ? 0 : readInt(data.rewardDays, 0);
  if (rewardKind === 'days' && (rewardDays <= 0 || rewardDays > MAX_REWARD_DAYS)) {
    throw new HttpsError('invalid-argument', `rewardDays must be 1..${MAX_REWARD_DAYS}`);
  }
  const enabled = data.enabled !== false; // по умолчанию включён
  const maxRedemptions = Math.max(0, readInt(data.maxRedemptions, 0));
  const expiresAtMs = Math.max(0, readInt(data.expiresAtMs, 0));
  const note = String(data.note ?? '').slice(0, 200);
  return { rewardDays, rewardKind, enabled, maxRedemptions, expiresAtMs, note };
}

function buildPromoCodeWritePatch(params: {
  rewardDays: number;
  rewardKind: PromoRewardKind;
  enabled: boolean;
  maxRedemptions: number;
  expiresAtMs: number;
  note: string;
  now: number;
  adminEmail: string;
  existing?: FirebaseFirestore.DocumentData;
}): Record<string, unknown> {
  const patch: Record<string, unknown> = {
    rewardDays: params.rewardDays,
    rewardKind: params.rewardKind,
    enabled: params.enabled,
    maxRedemptions: params.maxRedemptions,
    expiresAtMs: params.expiresAtMs,
    note: params.note,
    updatedAtMs: params.now,
    updatedBy: params.adminEmail,
  };
  if (typeof params.existing?.usedCount !== 'number') {
    patch.usedCount = 0;
    patch.createdAtMs = params.now;
    patch.createdBy = params.adminEmail;
  }
  return patch;
}

/** Fail-closed deletion plan; gift-backed codes must use the certificate callable. */
export function buildPromoCodeDeletePlan(params: {
  code: string;
  expectedUpdatedAtMs: unknown;
  promo: FirebaseFirestore.DocumentData;
  giftCertificateExists: boolean;
  nowMs: number;
  actorUid: string;
  actorEmail: string;
  reason: unknown;
}): { code: string; auditDoc: Record<string, unknown> } {
  const code = normalizePromoCode(params.code);
  if (!CODE_RE.test(code)) throw new HttpsError('invalid-argument', 'bad_code');
  const currentUpdatedAtMs = Number(params.promo.updatedAtMs ?? params.promo.createdAtMs ?? 0);
  if (!Number.isSafeInteger(currentUpdatedAtMs)
    || Number(params.expectedUpdatedAtMs) !== currentUpdatedAtMs) {
    throw new HttpsError('aborted', 'promo_code_delete_conflict');
  }
  const giftBacked = params.giftCertificateExists
    || Boolean(String(params.promo.certificateId ?? '').trim())
    || Boolean(String(params.promo.certificateBatchId ?? '').trim())
    || Boolean(String(params.promo.certificateProduct ?? '').trim());
  if (giftBacked) {
    throw new HttpsError('failed-precondition', 'gift_backed_promo_delete_forbidden');
  }
  const checkoutBacked = String(params.promo.createdBy ?? '').trim() === 'web_checkout'
    || /^web_checkout\s+/.test(String(params.promo.note ?? '').trim());
  if (checkoutBacked) {
    throw new HttpsError('failed-precondition', 'paid_checkout_promo_delete_forbidden');
  }
  return {
    code,
    auditDoc: {
      action: 'promo_code_delete',
      targetUid: code,
      reason: readAdminReason(params.reason),
      details: {
        enabled: params.promo.enabled === true,
        maxRedemptions: Math.max(0, readInt(params.promo.maxRedemptions, 0)),
        rewardDays: Math.max(0, readInt(params.promo.rewardDays, 0)),
        rewardKind: readRewardKind(params.promo.rewardKind),
        usedCount: Math.max(0, readInt(params.promo.usedCount, 0)),
      },
      adminEmail: String(params.actorEmail ?? '').trim().slice(0, 200),
      adminUid: String(params.actorUid ?? '').trim().slice(0, 128),
      ts: new Date(params.nowMs).toISOString(),
    },
  };
}

function sanitizeGeneratedPrefix(raw: unknown): string {
  const prefix = normalizePromoCode(raw)
    .replace(/[^A-Z0-9_-]/g, '')
    .replace(/[-_]+$/g, '')
    .slice(0, 16);
  return prefix || 'PM';
}

function makeGeneratedPromoCode(prefix: string): string {
  const bytes = randomBytes(10);
  let body = '';
  for (let i = 0; i < bytes.length; i += 1) {
    body += GENERATED_CODE_ALPHABET[bytes[i] % GENERATED_CODE_ALPHABET.length];
  }
  return `${prefix}-${body}`;
}

function readExplicitPromoCodes(raw: unknown): string[] {
  const values = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? raw.split(/[\s,;]+/)
      : [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const code = normalizePromoCode(value);
    if (!code) continue;
    if (!CODE_RE.test(code)) throw new HttpsError('invalid-argument', 'bad_code');
    if (!seen.has(code)) {
      seen.add(code);
      out.push(code);
    }
  }
  return out;
}

/* ── onCall: promoCodeUpsert (админ создаёт/правит код) ──────────────────────── */
export const promoCodeUpsert = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  assertAdminPermission(request, 'money.manual_access.write');
  const code = normalizePromoCode(request.data?.code);
  if (!CODE_RE.test(code)) throw new HttpsError('invalid-argument', 'bad_code');

  const payload = readPromoCodeWritePayload(request.data ?? {});
  const reason = readAdminReason(request.data?.reason);

  const db = admin.firestore();
  const codeRef = db.collection(PROMO_CODES).doc(code);
  const auditRef = db.collection('admin_log').doc();
  const adminEmail = String(request.auth?.token?.email ?? '');
  const now = Date.now();

  // Атомарно: правка НЕ трогает usedCount; инициализация usedCount=0 только если
  // кода ещё не было. Одна транзакция вместо set→get→set исключает гонку с redeem,
  // который параллельно инкрементит usedCount (нельзя обнулить денежный счётчик).
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(codeRef);
    const patch = buildPromoCodeWritePatch({ ...payload, now, adminEmail, existing: snap.data() });
    tx.set(codeRef, patch, { merge: true });
    tx.set(auditRef, {
      action: 'promo_code_upsert',
      targetUid: code,
      reason,
      details: {
        rewardDays: payload.rewardDays,
        rewardKind: payload.rewardKind,
        maxRedemptions: payload.maxRedemptions,
        enabled: payload.enabled,
      },
      adminEmail,
      ts: new Date(now).toISOString(),
    });
  });

  return { ok: true, code, rewardDays: payload.rewardDays, rewardKind: payload.rewardKind };
});

/* ── onCall: promoCodeBatchUpsert (админ создаёт/правит пачку кодов) ─────────── */
export const promoCodeBatchUpsert = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  assertAdminPermission(request, 'money.manual_access.write');
  const payload = readPromoCodeWritePayload(request.data ?? {});
  const reason = readAdminReason(request.data?.reason);
  const explicitCodes = readExplicitPromoCodes(request.data?.codes);
  const generated = explicitCodes.length === 0;
  const createOnly = request.data?.createOnly === true;

  let codes = explicitCodes;
  if (generated) {
    const count = readInt(request.data?.count, 1);
    if (count <= 0 || count > MAX_BATCH_PROMO_CODES) {
      throw new HttpsError('invalid-argument', `count must be 1..${MAX_BATCH_PROMO_CODES}`);
    }
    const prefix = sanitizeGeneratedPrefix(request.data?.prefix);
    const seen = new Set<string>();
    codes = [];
    while (codes.length < count) {
      const code = makeGeneratedPromoCode(prefix);
      if (!CODE_RE.test(code) || seen.has(code)) continue;
      seen.add(code);
      codes.push(code);
    }
  } else if (codes.length > MAX_BATCH_PROMO_CODES) {
    throw new HttpsError('invalid-argument', `codes limit is ${MAX_BATCH_PROMO_CODES}`);
  }

  const db = admin.firestore();
  const adminEmail = String(request.auth?.token?.email ?? '');
  const now = Date.now();
  const refs = codes.map((code) => db.collection(PROMO_CODES).doc(code));
  const auditRef = db.collection('admin_log').doc();

  await db.runTransaction(async (tx) => {
    const snaps = await Promise.all(refs.map((ref) => tx.get(ref)));
    if (generated) {
      const collision = snaps.find((snap) => snap.exists);
      if (collision) throw new HttpsError('already-exists', 'generated_code_collision');
    } else if (createOnly) {
      const existing = snaps.find((snap) => snap.exists);
      if (existing) throw new HttpsError('already-exists', `promo_code_exists:${existing.id}`);
    }
    refs.forEach((ref, index) => {
      const snap = snaps[index];
      const patch = buildPromoCodeWritePatch({ ...payload, now, adminEmail, existing: snap.data() });
      tx.set(ref, patch, { merge: true });
    });
    tx.set(auditRef, {
      action: 'promo_codes_batch_upsert',
      targetUid: 'promo_codes',
      reason,
      details: {
        count: codes.length,
        generated,
        createOnly,
        rewardDays: payload.rewardDays,
        rewardKind: payload.rewardKind,
        maxRedemptions: payload.maxRedemptions,
        enabled: payload.enabled,
      },
      adminEmail,
      ts: new Date(now).toISOString(),
    });
  });

  return { ok: true, codes, rewardDays: payload.rewardDays, rewardKind: payload.rewardKind };
});

/** Deletes an ordinary promo code; gift-backed codes cannot bypass certificate deletion. */
export const promoCodeDelete = onCall({ region: REGION, enforceAppCheck: false }, async (request) => {
  assertAdminPermission(request, 'money.manual_access.write');
  const code = normalizePromoCode(request.data?.code);
  if (!CODE_RE.test(code)) throw new HttpsError('invalid-argument', 'bad_code');

  const db = admin.firestore();
  const codeRef = db.collection(PROMO_CODES).doc(code);
  const certificateRef = db.collection('gift_certificate_deliveries').doc(code);
  const auditRef = db.collection('admin_log').doc();
  const nowMs = Date.now();
  const actorUid = String(request.auth?.uid ?? '');
  const actorEmail = String(request.auth?.token?.email ?? '');

  await db.runTransaction(async (tx) => {
    const [codeSnapshot, certificateSnapshot] = await Promise.all([
      tx.get(codeRef),
      tx.get(certificateRef),
    ]);
    if (!codeSnapshot.exists) throw new HttpsError('not-found', 'promo_code_not_found');
    const plan = buildPromoCodeDeletePlan({
      code,
      expectedUpdatedAtMs: request.data?.expectedUpdatedAtMs,
      promo: codeSnapshot.data() ?? {},
      giftCertificateExists: certificateSnapshot.exists,
      nowMs,
      actorUid,
      actorEmail,
      reason: request.data?.reason,
    });
    tx.delete(codeRef);
    tx.create(auditRef, plan.auditDoc);
  });

  return { ok: true, code };
});

function promoDateMs(raw: unknown): number {
  const n = Number(raw ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function firstNonEmpty(values: unknown[]): string {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

function promoUserLabel(data: FirebaseFirestore.DocumentData | undefined, uid: string): string {
  const progress = data?.progress && typeof data.progress === 'object' ? data.progress : {};
  const profile = data?.profile && typeof data.profile === 'object' ? data.profile : {};
  const name = firstNonEmpty([
    data?.name,
    data?.displayName,
    data?.userName,
    data?.username,
    profile.name,
    profile.displayName,
    progress.name,
    progress.displayName,
    progress.user_name,
  ]);
  const email = firstNonEmpty([data?.email, profile.email, progress.email]);
  if (name && email) return `${name} · ${email}`;
  return name || email || uid || 'Unknown user';
}

function promoPlusUntilLabel(row: FirebaseFirestore.DocumentData, progress: FirebaseFirestore.DocumentData): number {
  const vipPlan = String(row.vipPlan ?? '').toLowerCase();
  if (row.rewardKind === 'lifetime' || vipPlan.includes('lifetime')) return 0;
  const explicit = promoDateMs(row.vipUntilMs);
  if (explicit > 0) return explicit;
  const lastCode = String(progress?.promo_vip_last_code ?? '').toUpperCase();
  const rowCode = String(row.code ?? '').toUpperCase();
  if (!lastCode || lastCode === rowCode) return promoDateMs(progress?.vip_until);
  return 0;
}

export const adminListPromoCodes = onCall(CALLABLE_BASE, async (request) => {
  assertAdminPermission(request, 'money.read');

  const limitRaw = Math.trunc(Number(request.data?.limit ?? 80));
  const safeLimit = Math.max(1, Math.min(Number.isFinite(limitRaw) ? limitRaw : 80, 200));
  const db = admin.firestore();

  const codesSnap = await db
    .collection(PROMO_CODES)
    .orderBy('updatedAtMs', 'desc')
    .limit(safeLimit)
    .get();

  const redemptionsSnap = await db
    .collectionGroup(PROMO_REDEMPTIONS)
    .orderBy('redeemedAtMs', 'desc')
    .limit(Math.min(100, safeLimit))
    .get();

  const codes = codesSnap.docs.map((doc) => {
    const data = doc.data() || {};
    return {
      code: doc.id,
      rewardDays: Number(data.rewardDays ?? 0) || 0,
      rewardKind: data.rewardKind === 'lifetime' || data.lifetime === true ? 'lifetime' : 'days',
      enabled: data.enabled === true,
      maxRedemptions: Math.max(0, Number(data.maxRedemptions ?? 0) || 0),
      usedCount: Math.max(0, Number(data.usedCount ?? 0) || 0),
      expiresAtMs: promoDateMs(data.expiresAtMs),
      updatedAtMs: promoDateMs(data.updatedAtMs),
      updatedBy: String(data.updatedBy ?? ''),
      note: String(data.note ?? ''),
    };
  });

  const redemptions = await Promise.all(redemptionsSnap.docs.map(async (doc) => {
      const row = doc.data() || {};
      const userRef = doc.ref.parent.parent;
      const uid = String(row.stableUid || userRef?.id || '');
      let userData: FirebaseFirestore.DocumentData | undefined;
      if (userRef) {
        try {
          const userSnap = await userRef.get();
          userData = userSnap.exists ? userSnap.data() : undefined;
        } catch {
          userData = undefined;
        }
      }
      const progress = userData?.progress && typeof userData.progress === 'object' ? userData.progress : {};
      return {
        id: doc.id,
        code: String(row.code || doc.id),
        uid,
        authUid: String(row.authUid || ''),
        userLabel: promoUserLabel(userData, uid),
        rewardDays: Number(row.rewardDays ?? 0) || 0,
        rewardKind: row.rewardKind === 'lifetime' ? 'lifetime' : 'days',
        redeemedAtMs: promoDateMs(row.redeemedAtMs),
        vipUntilMs: promoPlusUntilLabel(row, progress),
      };
    }));

  return { ok: true, codes, redemptions };
});
