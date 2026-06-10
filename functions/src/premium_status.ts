// ═══════════════════════════════════════════════════════════════════════════
// premium_status.ts — серверный источник правды о платном доступе пользователя.
//
// Читает users/{stableUid}.progress (куда RevenueCat-вебхук и админ-гранты
// пишут премиум/VIP-статус — см. revenuecat_shards.ts) и решает, есть ли у
// пользователя активный платный доступ. НЕ доверяет клиентскому isPremium.
//
// Логика разбора полей — точная выжимка из vip_survey.ts
// (isRealPremiumProgressActive / isVipProgressActive / hasPremiumOrVipAccess),
// вынесенная сюда, чтобы платные Cloud Functions (weekly_review, premium_dialog)
// сверяли подписку на сервере единообразно, а не доверяли телу запроса.
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';

const USERS = 'users';

// ── Парсинг полей progress (идентично vip_survey.ts) ─────────────────────────

function cleanText(value: unknown, max = 500): string {
  return String(value ?? '').trim().slice(0, max);
}

function parseMs(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function cleanPlan(value: unknown): string {
  return cleanText(value, 80).toLowerCase();
}

function isTruthyProgressFlag(value: unknown): boolean {
  const v = cleanText(value, 20).toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function isFalsyProgressFlag(value: unknown): boolean {
  const v = cleanText(value, 20).toLowerCase();
  return v === 'false' || v === '0' || v === 'no';
}

function isOpenEndedOrFuture(untilMs: number, nowMs: number): boolean {
  return untilMs <= 0 || untilMs > nowMs;
}

// ── Активность платного доступа ──────────────────────────────────────────────

/**
 * Активная «настоящая» (сторовая) подписка. Намеренно НЕ включает админ-гранты
 * (override==='true' / plan==='admin_grant' возвращают false) — это покрывается
 * VIP-веткой. Зеркало vip_survey.ts:isRealPremiumProgressActive.
 */
function isRealPremiumProgressActive(progress: Record<string, unknown>, nowMs: number): boolean {
  const plan = cleanPlan(progress.premium_plan);
  const override = cleanText(progress.admin_premium_override, 20).toLowerCase();
  const expiryMs = parseMs(progress.premium_expiry);
  const storePlan = plan === 'monthly' || plan === 'yearly' || plan === 'annual';
  if (override === 'true' || plan === 'admin_grant') return false;
  if (override === 'false' && !storePlan) return false;
  return (storePlan || isTruthyProgressFlag(progress.premium_active)) && isOpenEndedOrFuture(expiryMs, nowMs);
}

/** Активный VIP/админ-грант доступ. Зеркало vip_survey.ts:isVipProgressActive. */
function isVipProgressActive(progress: Record<string, unknown>, nowMs: number): boolean {
  const vipPlan = cleanPlan(progress.vip_plan);
  const vipUntilMs = parseMs(progress.vip_until ?? progress.vip_expiry);
  const vipFromMs = parseMs(progress.vip_from);
  const vipRevoked = isFalsyProgressFlag(progress.vip_admin_override) || isFalsyProgressFlag(progress.vip_active);
  const vipShape =
    !!vipPlan ||
    isTruthyProgressFlag(progress.vip_active) ||
    parseMs(progress.vip_until ?? progress.vip_expiry) > 0 ||
    parseMs(progress.vip_admin_grant_at ?? progress.vip_grant_at) > 0;
  if (vipShape) {
    return !vipRevoked && (vipFromMs <= 0 || vipFromMs <= nowMs) && isOpenEndedOrFuture(vipUntilMs, nowMs);
  }

  const legacyPlan = cleanPlan(progress.premium_plan);
  const legacyOverride = cleanText(progress.admin_premium_override, 20).toLowerCase();
  const legacyExpiryMs = parseMs(progress.premium_expiry);
  if (legacyOverride === 'false') return false;
  return (legacyOverride === 'true' || legacyPlan === 'admin_grant') && isOpenEndedOrFuture(legacyExpiryMs, nowMs);
}

/**
 * Полный платный доступ (сторовая подписка ИЛИ VIP/админ-грант).
 * Зеркало vip_survey.ts:hasPremiumOrVipAccess. Это и есть «премиум» для гейтинга
 * платных фич: VIP/админ должны получать тот же полный доступ, что и подписчики.
 */
export function progressHasPaidAccess(progress: Record<string, unknown>, nowMs: number): boolean {
  return isRealPremiumProgressActive(progress, nowMs) || isVipProgressActive(progress, nowMs);
}

/**
 * Серверная проверка премиума по идентичности (stableUid из auth, НЕ из body).
 * Читает users/{stableUid}.progress. При отсутствии/ошибке чтения — false
 * (fail-closed: не отдаём платное при сомнении).
 */
export async function resolveServerPremium(
  db: admin.firestore.Firestore,
  stableUid: string,
  nowMs: number = Date.now(),
): Promise<boolean> {
  const snap = await db.collection(USERS).doc(stableUid).get().catch(() => null);
  if (!snap || !snap.exists) return false;
  const progress = (snap.data()?.progress ?? {}) as Record<string, unknown>;
  return progressHasPaidAccess(progress, nowMs);
}

// Чистые функции для юнит-тестов.
export const __premiumStatusTestHooks = {
  isRealPremiumProgressActive,
  isVipProgressActive,
  progressHasPaidAccess,
};
