// ═══════════════════════════════════════════════════════════════════════════
// premium_status.ts — СЕРВЕРНЫЙ источник правды по премиум/VIP-доступу.
//
// Зачем: ИИ-функции (stats_insights / weekly_review / premium_dialog) раньше
// верили полю `isPremium` ИЗ ТЕЛА запроса. Клиент мог соврать `isPremium:true`
// и бесплатно получить платную фичу + в разы больший дневной лимит OpenAI.
// Теперь премиум вычисляется ТУТ из users/{stableId}.progress — того же
// документа, куда вебхуки RevenueCat/Telegram пишут факт оплаты по верному ID.
// Связку «оплата → правильный аккаунт» этот модуль НЕ трогает: он только ЧИТАЕТ.
//
// Семантика 1:1 портирована из app/premium_progress.ts (клиентский эталон),
// чтобы серверная проверка не отрезала легитимных платящих:
//   - premium_plan непустой + premium_expiry ('0' = бессрочный store-премиум,
//     иначе timestamp окончания) → store-премиум;
//   - admin_premium_override / plan==='admin_grant' → админский грант;
//   - vip_* (vip_active/vip_until/vip_admin_override) → VIP-доступ (рефералка,
//     опрос, ручная выдача).
// Премиум-доступ активен = любой из трёх активен.
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';

export type ProgressLike = Record<string, unknown> | null | undefined;

function cleanStr(value: unknown): string {
  return String(value ?? '').trim();
}

function cleanPlan(value: unknown): string {
  return cleanStr(value).toLowerCase();
}

function hasMeaningfulPlan(plan: string): boolean {
  return plan !== '' && plan !== 'null' && plan !== 'undefined';
}

function isStorePremiumPlan(plan: string): boolean {
  return plan === 'monthly' || plan === 'yearly' || plan === 'annual';
}

function isTruthyFlag(value: unknown): boolean {
  const v = cleanStr(value).toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function isFalsyFlag(value: unknown): boolean {
  const v = cleanStr(value).toLowerCase();
  return v === 'false' || v === '0' || v === 'no';
}

function cleanMs(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

/** Парсит premium_expiry/vip_until: строка, число или Firestore Timestamp-подобное. */
export function parseProgressMs(value: unknown): number {
  if (value == null || value === '') return 0;
  if (typeof value === 'object') {
    const record = value as { toMillis?: () => number; seconds?: number };
    if (typeof record.toMillis === 'function') return cleanMs(record.toMillis());
    if (typeof record.seconds === 'number') return cleanMs(record.seconds * 1000);
  }
  return cleanMs(value);
}

/** Store-премиум (RevenueCat monthly/yearly/annual). expiry<=0 = бессрочный активный. */
function isStorePremiumActive(progress: ProgressLike, now: number): boolean {
  const data = progress ?? {};
  const plan = cleanPlan(data.premium_plan);
  const override = cleanStr(data.admin_premium_override).toLowerCase();
  const expiryMs = parseProgressMs(data.premium_expiry);

  if (!hasMeaningfulPlan(plan)) return false;
  // admin_grant / override обрабатываются отдельной веткой (isAdminGrantActive).
  if (override === 'true' || plan === 'admin_grant' || !isStorePremiumPlan(plan)) return false;
  return expiryMs <= 0 || expiryMs > now;
}

/** Админский грант премиума (admin_premium_override='true' или plan='admin_grant'). */
function isAdminGrantActive(progress: ProgressLike, now: number): boolean {
  const data = progress ?? {};
  const plan = cleanPlan(data.premium_plan);
  const override = cleanStr(data.admin_premium_override);
  const expiryMs = parseProgressMs(data.premium_expiry);
  const legacyAdminPlan = plan === 'admin_grant' && override !== 'false';
  const isAdminGrant = override === 'true' || legacyAdminPlan;
  if (!isAdminGrant) return false;
  return hasMeaningfulPlan(plan) && (expiryMs <= 0 || expiryMs > now);
}

/** VIP-доступ (рефералка / опрос / ручная выдача): vip_* поля. */
export function isVipActive(progress: ProgressLike, now: number = Date.now()): boolean {
  const data = progress ?? {};
  const vipPlanRaw = cleanPlan(data.vip_plan);
  const vipOverrideRaw = cleanStr(data.vip_admin_override);
  const vipActiveFlag = isTruthyFlag(data.vip_active);
  const vipRevoked = isFalsyFlag(data.vip_admin_override) || isFalsyFlag(data.vip_active);
  const vipFromMs = parseProgressMs(data.vip_from);
  const vipUntilMs = parseProgressMs(data.vip_until ?? data.vip_expiry);
  const vipGrantAt = cleanStr(data.vip_admin_grant_at ?? data.vip_grant_at) || null;
  const hasVipShape =
    hasMeaningfulPlan(vipPlanRaw) ||
    vipActiveFlag ||
    vipRevoked ||
    vipFromMs > 0 ||
    vipUntilMs > 0 ||
    !!vipGrantAt;

  if (hasVipShape) {
    const plan = hasMeaningfulPlan(vipPlanRaw) ? vipPlanRaw : 'admin_vip';
    const windowStarted = vipFromMs <= 0 || vipFromMs <= now;
    const windowOpen = vipUntilMs <= 0 || vipUntilMs > now;
    return !vipRevoked
      && (vipActiveFlag || isTruthyFlag(vipOverrideRaw) || hasMeaningfulPlan(plan))
      && windowStarted
      && windowOpen;
  }

  // Legacy: старый админский премиум засчитываем как VIP-доступ.
  return isAdminGrantActive(progress, now);
}

/** TRUE если у пользователя сейчас активен ЛЮБОЙ премиум-доступ (store / admin / VIP). */
export function isPremiumAccessActive(progress: ProgressLike, now: number = Date.now()): boolean {
  return isStorePremiumActive(progress, now)
    || isAdminGrantActive(progress, now)
    || isVipActive(progress, now);
}

/**
 * Читает users/{stableUid}.progress и возвращает реальный премиум-статус.
 * Источник правды для серверного гейтинга ИИ-фич. Никогда не доверяй телу запроса.
 */
export async function resolvePremiumAccess(
  db: FirebaseFirestore.Firestore,
  stableUid: string,
  now: number = Date.now(),
): Promise<boolean> {
  if (!stableUid) return false;
  const snap = await db.collection('users').doc(stableUid).get();
  if (!snap.exists) return false;
  const progress = (snap.data()?.progress ?? {}) as Record<string, unknown>;
  return isPremiumAccessActive(progress, now);
}
