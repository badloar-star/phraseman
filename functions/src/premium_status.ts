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
  // 'lifetime' — non-consumable «навсегда»: premium_expiry='0' (бессрочный).
  // Без этой ветки сервер счёл бы синхронизированный premium_plan='lifetime'
  // не-store-планом и отрезал бы платящему доступ.
  return plan === 'monthly' || plan === 'yearly' || plan === 'annual' || plan === 'lifetime';
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

/**
 * Запас после premium_rc_expiry_ms, прежде чем сервер перестаёт давать доступ.
 * ЗЕРКАЛО premium_expiry_cron.RC_GRACE_MS (72ч): покрывает billing retry и
 * опоздавший RENEWAL-вебхук. Держать в синхроне с кроном, чтобы окно «после
 * rc-срока, но до следующего sweep» трактовалось одинаково сервером и кроном.
 */
const SERVER_RC_GRACE_MS = 72 * 60 * 60 * 1000;

/** Store-премиум (RevenueCat monthly/yearly/annual/lifetime). expiry<=0 = бессрочный активный. */
function isStorePremiumActive(progress: ProgressLike, now: number): boolean {
  const data = progress ?? {};
  const plan = cleanPlan(data.premium_plan);
  const override = cleanStr(data.admin_premium_override).toLowerCase();
  const expiryMs = parseProgressMs(data.premium_expiry);
  const rcExpiryMs = parseProgressMs(data.premium_rc_expiry_ms);

  if (!hasMeaningfulPlan(plan)) return false;
  // admin_grant / override обрабатываются отдельной веткой (isAdminGrantActive).
  if (override === 'true' || plan === 'admin_grant' || !isStorePremiumPlan(plan)) return false;

  // premium_expiry='0' = «активна, срок ведёт вебхук». Авторитет — premium_rc_expiry_ms.
  // КРИТИЧНО (утечка дохода): без этой проверки потерянный EXPIRATION-вебхук оставляет
  // premium_expiry='0' навсегда → сервер вечно отдаёт платный OpenAI бесплатно.
  // rcExpiry<=0 (нет rc-срока) = бессрочный store-премиум (lifetime / ручная выдача) → активен.
  if (expiryMs <= 0) {
    if (rcExpiryMs > 0 && rcExpiryMs + SERVER_RC_GRACE_MS < now) return false;
    return true;
  }
  return expiryMs > now;
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

/**
 * Подарок 72ч (новичку «intro_full_access» или лояльности «loyalty_gift»):
 * раньше доступ давался ТОЛЬКО на клиенте через AsyncStorage → сервер о подарке
 * не знал, ИИ-функции отказывали платным фичам подаренного премиума. Теперь клиент
 * при выдаче пишет *_until_ms в users/{uid}.progress, и сервер их учитывает.
 */
export function isGiftAccessActive(progress: ProgressLike, now: number = Date.now()): boolean {
  const data = progress ?? {};
  const introUntil = parseProgressMs(data.intro_access_until_ms);
  const loyaltyUntil = parseProgressMs(data.loyalty_gift_until_ms);
  return introUntil > now || loyaltyUntil > now;
}

/** Канонический breakdown доступа для админских и продуктовых проекций. */
export function resolvePremiumAccessBreakdown(progress: ProgressLike, now: number = Date.now()): Readonly<{
  active: boolean;
  storeActive: boolean;
  legacyAdminGrantActive: boolean;
  vipShapeActive: boolean;
  giftActive: boolean;
  lifetimeActive: boolean;
}> {
  const data = progress ?? {};
  const hasVipShape = Boolean(
    cleanPlan(data.vip_plan)
    || cleanStr(data.vip_active)
    || cleanStr(data.vip_admin_override)
    || parseProgressMs(data.vip_from)
    || parseProgressMs(data.vip_until ?? data.vip_expiry)
    || cleanStr(data.vip_admin_grant_at ?? data.vip_grant_at),
  );
  const storeActive = isStorePremiumActive(data, now);
  const legacyAdminGrantActive = isAdminGrantActive(data, now);
  const vipShapeActive = hasVipShape && isVipActive(data, now);
  const giftActive = isGiftAccessActive(data, now);
  return Object.freeze({
    active: storeActive || legacyAdminGrantActive || vipShapeActive || giftActive,
    storeActive,
    legacyAdminGrantActive,
    vipShapeActive,
    giftActive,
    lifetimeActive: cleanPlan(data.premium_plan) === 'lifetime' && storeActive,
  });
}

/** TRUE если у пользователя сейчас активен ЛЮБОЙ премиум-доступ (store / admin / VIP / подарок 72ч). */
export function isPremiumAccessActive(progress: ProgressLike, now: number = Date.now()): boolean {
  return resolvePremiumAccessBreakdown(progress, now).active;
}

/**
 * Читает users/{stableUid}.progress и возвращает реальный премиум-статус.
 * Источник правды для серверного гейтинга ИИ-фич. Никогда не доверяй телу запроса.
 */
export async function resolvePremiumAccess(
  db: FirebaseFirestore.Firestore,
  stableUid: string,
  now: number = Date.now(),
  authUid?: string,
): Promise<boolean> {
  const candidates = new Set<string>();
  const add = (value: unknown) => {
    const id = cleanStr(value);
    if (id) candidates.add(id);
  };

  add(stableUid);
  add(authUid);

  if (authUid) {
    const [linkSnap, byAuth] = await Promise.all([
      db.collection('auth_links').doc(authUid).get().catch(() => null),
      db.collection('users').where('firebaseAuthUid', '==', authUid).limit(5).get().catch(() => null),
    ]);
    add(linkSnap?.data()?.stable_id);
    byAuth?.docs?.forEach((doc) => add(doc.id));
  }

  const checked = new Set<string>();
  for (;;) {
    const ids = [...candidates].filter((id) => !checked.has(id));
    if (ids.length === 0) break;
    let premiumActive = false;
    await Promise.all(ids.map(async (id) => {
      checked.add(id);
      const snap = await db.collection('users').doc(id).get().catch(() => null);
      if (!snap?.exists) return;
      const data = snap.data() ?? {};
      add(data.canonicalStableId);
      const progress = (data.progress ?? {}) as Record<string, unknown>;
      if (isPremiumAccessActive(progress, now)) {
        premiumActive = true;
      }
    }));
    if (premiumActive) return true;
  }

  return false;
}

/**
 * TRUE если у пользователя активна разовая покупка «Навсегда» (premium_plan==='lifetime').
 * Видимое имя такого доступа — «Pro» (в отличие от рекуррентного Plus / VIP). Требует,
 * чтобы store-премиум был реально активен (не истёкший), иначе истёкший lifetime не должен
 * давать «Pro»-плашку. VIP-гранты пишут vip_plan, а не premium_plan='lifetime' → не Pro.
 */
export function isLifetimePlanActive(progress: ProgressLike, now: number = Date.now()): boolean {
  const data = progress ?? {};
  const plan = cleanPlan(data.premium_plan);
  return plan === 'lifetime' && isStorePremiumActive(progress, now);
}

/**
 * Серверная резолюция Pro-плана: читает users/{stableUid}.progress (с тем же обходом
 * auth_links / firebaseAuthUid, что и resolvePremiumAccess) и возвращает, активна ли
 * покупка «Навсегда». Источник правды — сервер, тело запроса не доверяем.
 */
export async function resolveIsLifetimePlan(
  db: FirebaseFirestore.Firestore,
  stableUid: string,
  now: number = Date.now(),
  authUid?: string,
): Promise<boolean> {
  const candidates = new Set<string>();
  const add = (value: unknown) => {
    const id = cleanStr(value);
    if (id) candidates.add(id);
  };

  add(stableUid);
  add(authUid);

  if (authUid) {
    const [linkSnap, byAuth] = await Promise.all([
      db.collection('auth_links').doc(authUid).get().catch(() => null),
      db.collection('users').where('firebaseAuthUid', '==', authUid).limit(5).get().catch(() => null),
    ]);
    add(linkSnap?.data()?.stable_id);
    byAuth?.docs?.forEach((doc) => add(doc.id));
  }

  const checked = new Set<string>();
  for (;;) {
    const ids = [...candidates].filter((id) => !checked.has(id));
    if (ids.length === 0) break;
    let lifetimeActive = false;
    await Promise.all(ids.map(async (id) => {
      checked.add(id);
      const snap = await db.collection('users').doc(id).get().catch(() => null);
      if (!snap?.exists) return;
      const data = snap.data() ?? {};
      add(data.canonicalStableId);
      const progress = (data.progress ?? {}) as Record<string, unknown>;
      if (isLifetimePlanActive(progress, now)) {
        lifetimeActive = true;
      }
    }));
    if (lifetimeActive) return true;
  }

  return false;
}
