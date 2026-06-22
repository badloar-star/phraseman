"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseProgressMs = parseProgressMs;
exports.isVipActive = isVipActive;
exports.isPremiumAccessActive = isPremiumAccessActive;
exports.resolvePremiumAccess = resolvePremiumAccess;
function cleanStr(value) {
    return String(value ?? '').trim();
}
function cleanPlan(value) {
    return cleanStr(value).toLowerCase();
}
function hasMeaningfulPlan(plan) {
    return plan !== '' && plan !== 'null' && plan !== 'undefined';
}
function isStorePremiumPlan(plan) {
    // 'lifetime' — non-consumable «навсегда»: premium_expiry='0' (бессрочный).
    // Без этой ветки сервер счёл бы синхронизированный premium_plan='lifetime'
    // не-store-планом и отрезал бы платящему доступ.
    return plan === 'monthly' || plan === 'yearly' || plan === 'annual' || plan === 'lifetime';
}
function isTruthyFlag(value) {
    const v = cleanStr(value).toLowerCase();
    return v === 'true' || v === '1' || v === 'yes';
}
function isFalsyFlag(value) {
    const v = cleanStr(value).toLowerCase();
    return v === 'false' || v === '0' || v === 'no';
}
function cleanMs(value) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}
/** Парсит premium_expiry/vip_until: строка, число или Firestore Timestamp-подобное. */
function parseProgressMs(value) {
    if (value == null || value === '')
        return 0;
    if (typeof value === 'object') {
        const record = value;
        if (typeof record.toMillis === 'function')
            return cleanMs(record.toMillis());
        if (typeof record.seconds === 'number')
            return cleanMs(record.seconds * 1000);
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
function isStorePremiumActive(progress, now) {
    const data = progress ?? {};
    const plan = cleanPlan(data.premium_plan);
    const override = cleanStr(data.admin_premium_override).toLowerCase();
    const expiryMs = parseProgressMs(data.premium_expiry);
    const rcExpiryMs = parseProgressMs(data.premium_rc_expiry_ms);
    if (!hasMeaningfulPlan(plan))
        return false;
    // admin_grant / override обрабатываются отдельной веткой (isAdminGrantActive).
    if (override === 'true' || plan === 'admin_grant' || !isStorePremiumPlan(plan))
        return false;
    // premium_expiry='0' = «активна, срок ведёт вебхук». Авторитет — premium_rc_expiry_ms.
    // КРИТИЧНО (утечка дохода): без этой проверки потерянный EXPIRATION-вебхук оставляет
    // premium_expiry='0' навсегда → сервер вечно отдаёт платный OpenAI бесплатно.
    // rcExpiry<=0 (нет rc-срока) = бессрочный store-премиум (lifetime / ручная выдача) → активен.
    if (expiryMs <= 0) {
        if (rcExpiryMs > 0 && rcExpiryMs + SERVER_RC_GRACE_MS < now)
            return false;
        return true;
    }
    return expiryMs > now;
}
/** Админский грант премиума (admin_premium_override='true' или plan='admin_grant'). */
function isAdminGrantActive(progress, now) {
    const data = progress ?? {};
    const plan = cleanPlan(data.premium_plan);
    const override = cleanStr(data.admin_premium_override);
    const expiryMs = parseProgressMs(data.premium_expiry);
    const legacyAdminPlan = plan === 'admin_grant' && override !== 'false';
    const isAdminGrant = override === 'true' || legacyAdminPlan;
    if (!isAdminGrant)
        return false;
    return hasMeaningfulPlan(plan) && (expiryMs <= 0 || expiryMs > now);
}
/** VIP-доступ (рефералка / опрос / ручная выдача): vip_* поля. */
function isVipActive(progress, now = Date.now()) {
    const data = progress ?? {};
    const vipPlanRaw = cleanPlan(data.vip_plan);
    const vipOverrideRaw = cleanStr(data.vip_admin_override);
    const vipActiveFlag = isTruthyFlag(data.vip_active);
    const vipRevoked = isFalsyFlag(data.vip_admin_override) || isFalsyFlag(data.vip_active);
    const vipFromMs = parseProgressMs(data.vip_from);
    const vipUntilMs = parseProgressMs(data.vip_until ?? data.vip_expiry);
    const vipGrantAt = cleanStr(data.vip_admin_grant_at ?? data.vip_grant_at) || null;
    const hasVipShape = hasMeaningfulPlan(vipPlanRaw) ||
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
function isPremiumAccessActive(progress, now = Date.now()) {
    return isStorePremiumActive(progress, now)
        || isAdminGrantActive(progress, now)
        || isVipActive(progress, now);
}
/**
 * Читает users/{stableUid}.progress и возвращает реальный премиум-статус.
 * Источник правды для серверного гейтинга ИИ-фич. Никогда не доверяй телу запроса.
 */
async function resolvePremiumAccess(db, stableUid, now = Date.now(), authUid) {
    const candidates = new Set();
    const add = (value) => {
        const id = cleanStr(value);
        if (id)
            candidates.add(id);
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
    const checked = new Set();
    for (;;) {
        const ids = [...candidates].filter((id) => !checked.has(id));
        if (ids.length === 0)
            break;
        let premiumActive = false;
        await Promise.all(ids.map(async (id) => {
            checked.add(id);
            const snap = await db.collection('users').doc(id).get().catch(() => null);
            if (!snap?.exists)
                return;
            const data = snap.data() ?? {};
            add(data.canonicalStableId);
            const progress = (data.progress ?? {});
            if (isPremiumAccessActive(progress, now)) {
                premiumActive = true;
            }
        }));
        if (premiumActive)
            return true;
    }
    return false;
}
//# sourceMappingURL=premium_status.js.map