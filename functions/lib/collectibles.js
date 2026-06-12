"use strict";
// ═══════════════════════════════════════════════════════════════════════════
// collectibles.ts — серверный движок дропов «Сокровищницы» (коллекционные
// карточки-фразы). Единственный источник выдачи: клиент НЕ может писать
// collectibles_owned_v1 / collectibles_state_v1 (blocklist в firestore.rules).
//
// Принципы (по образцу league_chest.ts):
//   - детерминированный seed-roll (FNV-1a): один eventId — один исход навсегда,
//     reroll-абьюз невозможен;
//   - без дублей: пул вычерпывается, дубликат не выпадает никогда;
//   - pity: epic гарантирован каждые ≤15 дропов, legendary — ≤35;
//   - кап 3 дропа/день (premium 4), первый дроп дня гарантирован;
//   - идемпотентность: леджер users/{uid}/collectible_claims/{eventId} —
//     повторный вызов с тем же eventId возвращает тот же результат;
//   - сет собран (10/10) → в той же транзакции секретная 11-я карточка
//     + осколки сет-бонуса + shard_log.
//
// Тюнинг — хардкод-константами (серверного remote config в проекте нет,
// см. паттерн league_chest/premium_dialog).
// ═══════════════════════════════════════════════════════════════════════════
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectiblesClaimDrop = exports.COLLECTIBLES_STATE_KEY = exports.COLLECTIBLES_OWNED_KEY = void 0;
exports.parseDropState = parseDropState;
exports.rollCollectibleDrop = rollCollectibleDrop;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const auth_identity_1 = require("./auth_identity");
const premium_status_1 = require("./premium_status");
const collectibles_catalog_1 = require("./collectibles_catalog");
exports.COLLECTIBLES_OWNED_KEY = 'collectibles_owned_v1';
exports.COLLECTIBLES_STATE_KEY = 'collectibles_state_v1';
const DROP_CHANCE = 0.28; // шанс дропа за qualifying-активность
const DAILY_DROP_CAP_FREE = 3;
const DAILY_DROP_CAP_PREMIUM = 4;
const DAILY_ATTEMPT_CAP = 24; // потолок попыток/день — отсекает перебор eventId
const PITY_EPIC_AT = 15; // не больше 15 дропов без epic+
const PITY_LEGENDARY_AT = 35; // не больше 35 дропов без legendary
const SET_BONUS_SHARDS = 15;
// Качественные активности; kind = префикс eventId до первого ':'.
const EVENT_ID_RE = /^(lesson|plan|quiz|arena|exam|pronounce|dialog):[A-Za-z0-9_.:-]{1,80}$/;
/* ── детерминированный ролл (FNV-1a, как в league_chest) ──── */
function hash32(seed) {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i += 1) {
        h ^= seed.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}
function rollUnit(seed) {
    return hash32(seed) / 0x100000000;
}
function pickOne(seed, items) {
    if (items.length === 0)
        return null;
    return items[Math.min(items.length - 1, Math.floor(rollUnit(seed) * items.length))] ?? null;
}
function readInt(value, fallback = 0) {
    const n = Math.trunc(Number(value));
    return Number.isFinite(n) ? n : fallback;
}
function parseJsonObject(raw) {
    try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? parsed
            : {};
    }
    catch {
        return {};
    }
}
function getProgress(data) {
    const raw = data?.progress;
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
}
function getExistingField(data, key) {
    const progress = getProgress(data);
    return data?.[key] ?? progress[key] ?? data?.[`progress.${key}`];
}
function todayStrUtc() {
    return new Date().toISOString().slice(0, 10);
}
function safeId(value) {
    return value.replace(/[^\w.:-]/g, '_').slice(0, 140);
}
function parseDropState(raw, today) {
    const obj = parseJsonObject(raw);
    const sameDay = obj.date === today;
    return {
        date: today,
        drops: sameDay ? Math.max(0, readInt(obj.drops, 0)) : 0,
        attempts: sameDay ? Math.max(0, readInt(obj.attempts, 0)) : 0,
        sinceEpic: Math.max(0, readInt(obj.sinceEpic, 0)),
        sinceLegendary: Math.max(0, readInt(obj.sinceLegendary, 0)),
        total: Math.max(0, readInt(obj.total, 0)),
    };
}
const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary'];
// Веса 50/30/15/5 — кумулятивно.
const RARITY_CUMULATIVE = [
    { rarity: 'common', upTo: 0.50 },
    { rarity: 'rare', upTo: 0.80 },
    { rarity: 'epic', upTo: 0.95 },
    { rarity: 'legendary', upTo: 1.0 },
];
function rollRarity(seed) {
    const u = rollUnit(seed);
    for (const step of RARITY_CUMULATIVE) {
        if (u < step.upTo)
            return step.rarity;
    }
    return 'legendary';
}
/**
 * Выбрать редкость с учётом pity и наличия карточек в пуле.
 * Если в выбранной редкости всё собрано — спускаемся вниз, потом вверх.
 */
function resolveRarity(params) {
    const { seed, state, unowned } = params;
    const available = new Set(unowned.map((c) => c.rarity));
    if (available.size === 0)
        return null;
    let target;
    if (state.sinceLegendary >= PITY_LEGENDARY_AT - 1 && available.has('legendary')) {
        target = 'legendary';
    }
    else if (state.sinceEpic >= PITY_EPIC_AT - 1 && (available.has('epic') || available.has('legendary'))) {
        target = available.has('epic') ? 'epic' : 'legendary';
    }
    else {
        target = rollRarity(seed);
    }
    if (available.has(target))
        return target;
    const idx = RARITY_ORDER.indexOf(target);
    for (let i = idx - 1; i >= 0; i -= 1) {
        if (available.has(RARITY_ORDER[i]))
            return RARITY_ORDER[i];
    }
    for (let i = idx + 1; i < RARITY_ORDER.length; i += 1) {
        if (available.has(RARITY_ORDER[i]))
            return RARITY_ORDER[i];
    }
    return null;
}
/**
 * Полный детерминированный ролл одного события. Не мутирует входы.
 * seedBase должен включать uid и eventId — повтор даёт тот же исход.
 */
function rollCollectibleDrop(params) {
    const { seedBase, owned, state, isPremium } = params;
    const pool = params.pool ?? collectibles_catalog_1.COLLECTIBLE_POOL;
    if (state.attempts >= DAILY_ATTEMPT_CAP)
        return { dropped: false, reason: 'attempt_cap' };
    const cap = isPremium ? DAILY_DROP_CAP_PREMIUM : DAILY_DROP_CAP_FREE;
    if (state.drops >= cap)
        return { dropped: false, reason: 'daily_cap' };
    const unowned = pool.filter((c) => owned[c.id] == null);
    if (unowned.length === 0)
        return { dropped: false, reason: 'pool_exhausted' };
    // Первый дроп дня гарантирован, дальше — шанс.
    const guaranteed = state.drops === 0;
    if (!guaranteed && rollUnit(`${seedBase}:chance`) >= DROP_CHANCE) {
        return { dropped: false, reason: 'no_luck' };
    }
    const rarity = resolveRarity({ seed: `${seedBase}:rarity`, state, unowned });
    if (!rarity)
        return { dropped: false, reason: 'pool_exhausted' };
    const candidates = unowned.filter((c) => c.rarity === rarity);
    const card = pickOne(`${seedBase}:pick`, candidates);
    if (!card)
        return { dropped: false, reason: 'pool_exhausted' };
    const epicPlus = card.rarity === 'epic' || card.rarity === 'legendary';
    const nextState = {
        sinceEpic: epicPlus ? 0 : state.sinceEpic + 1,
        sinceLegendary: card.rarity === 'legendary' ? 0 : state.sinceLegendary + 1,
    };
    // Сет собран? Секретка выдаётся в том же дропе.
    const setIds = collectibles_catalog_1.COLLECTIBLE_SET_CARD_IDS[card.setId] ?? [];
    const secretId = collectibles_catalog_1.COLLECTIBLE_SECRET_BY_SET[card.setId] ?? null;
    const setCompleted = setIds.length > 0
        && setIds.every((id) => id === card.id || owned[id] != null);
    const grantSecret = setCompleted && secretId != null && owned[secretId] == null;
    return {
        dropped: true,
        card,
        setCompleted,
        secretCardId: grantSecret ? secretId : null,
        bonusShards: grantSecret ? SET_BONUS_SHARDS : 0,
        nextState,
    };
}
/* ── onCall: collectiblesClaimDrop ─────────────────────────── */
async function assertNotBanned(db, stableUid) {
    const [userSnap, bannedSnap] = await Promise.all([
        db.collection('users').doc(stableUid).get().catch(() => null),
        db.collection('banned_users').doc(stableUid).get().catch(() => null),
    ]);
    if (bannedSnap?.exists || userSnap?.data()?.banned === true) {
        throw new https_1.HttpsError('permission-denied', 'user_banned');
    }
}
exports.collectiblesClaimDrop = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    const authUid = request.auth?.uid;
    if (!authUid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const eventIdRaw = String(request.data?.eventId ?? '').trim();
    if (!EVENT_ID_RE.test(eventIdRaw)) {
        throw new https_1.HttpsError('invalid-argument', 'bad_event_id');
    }
    const db = admin.firestore();
    // stableId НИКОГДА не берём из тела запроса (см. phraseman security audit).
    const stableUid = await (0, auth_identity_1.resolveStableUidForAuth)(db, authUid);
    await assertNotBanned(db, stableUid);
    const now = Date.now();
    const today = todayStrUtc();
    const userRef = db.collection('users').doc(stableUid);
    const claimRef = userRef.collection('collectible_claims').doc(safeId(eventIdRaw));
    return db.runTransaction(async (tx) => {
        const [claimSnap, userSnap] = await Promise.all([tx.get(claimRef), tx.get(userRef)]);
        // Идемпотентность: тот же eventId → тот же результат, без второй выдачи.
        if (claimSnap.exists) {
            const prev = claimSnap.data() ?? {};
            return {
                ok: true,
                alreadyClaimed: true,
                dropped: prev.cardId != null,
                card: prev.cardId
                    ? { id: prev.cardId, setId: prev.setId, rarity: prev.rarity }
                    : null,
                setCompleted: prev.setCompleted === true,
                secretCardId: prev.secretCardId ?? null,
                bonusShards: Math.max(0, readInt(prev.shards, 0)),
            };
        }
        const user = userSnap.data() || {};
        const progress = getProgress(user);
        const isPremium = (0, premium_status_1.isPremiumAccessActive)(progress, now);
        const owned = parseJsonObject(getExistingField(user, exports.COLLECTIBLES_OWNED_KEY));
        const state = parseDropState(getExistingField(user, exports.COLLECTIBLES_STATE_KEY), today);
        const decision = rollCollectibleDrop({
            seedBase: `collect:${stableUid}:${eventIdRaw}`,
            owned,
            state,
            isPremium,
        });
        if (!decision.dropped) {
            // Попытку учитываем (отсекает перебор eventId), леджер не пишем:
            // событие не «потрачено», детерминированный ролл всё равно не изменится.
            const nextState = { ...state, attempts: state.attempts + 1 };
            tx.set(userRef, {
                progress: { [exports.COLLECTIBLES_STATE_KEY]: JSON.stringify(nextState) },
                updatedAt: now,
            }, { merge: true });
            return { ok: true, dropped: false, reason: decision.reason };
        }
        const newOwned = { ...owned, [decision.card.id]: now };
        if (decision.secretCardId)
            newOwned[decision.secretCardId] = now;
        const nextState = {
            date: today,
            drops: state.drops + 1,
            attempts: state.attempts + 1,
            sinceEpic: decision.nextState.sinceEpic,
            sinceLegendary: decision.nextState.sinceLegendary,
            total: state.total + 1,
        };
        const progressPatch = {
            [exports.COLLECTIBLES_OWNED_KEY]: JSON.stringify(newOwned),
            [exports.COLLECTIBLES_STATE_KEY]: JSON.stringify(nextState),
        };
        const userPatch = { progress: progressPatch, updatedAt: now };
        const beforeShards = Math.max(0, readInt(user.shards, 0));
        const afterShards = beforeShards + decision.bonusShards;
        if (decision.bonusShards > 0) {
            userPatch.shards = afterShards;
            userPatch.shards_updated_at_ms = now;
            userPatch.shards_updated_op = 'earn';
            userPatch.shards_updated_reason = 'collectible_set_bonus';
        }
        tx.set(claimRef, {
            uid: stableUid,
            authUid,
            eventId: eventIdRaw,
            kind: eventIdRaw.split(':')[0],
            cardId: decision.card.id,
            setId: decision.card.setId,
            rarity: decision.card.rarity,
            setCompleted: decision.setCompleted,
            secretCardId: decision.secretCardId,
            shards: decision.bonusShards,
            dropsToday: nextState.drops,
            createdAt: now,
        });
        tx.set(userRef, userPatch, { merge: true });
        if (decision.bonusShards > 0) {
            tx.set(userRef.collection('shard_log').doc(), {
                ts: new Date(now).toISOString(),
                type: 'earn',
                amount: decision.bonusShards,
                reason: 'collectible_set_bonus',
                balanceBefore: beforeShards,
                balanceAfter: afterShards,
                setId: decision.card.setId,
            });
        }
        return {
            ok: true,
            dropped: true,
            card: { id: decision.card.id, setId: decision.card.setId, rarity: decision.card.rarity },
            setCompleted: decision.setCompleted,
            secretCardId: decision.secretCardId,
            bonusShards: decision.bonusShards,
            shardsBalance: decision.bonusShards > 0 ? afterShards : null,
            ownedCount: Object.keys(newOwned).length,
            dropsToday: nextState.drops,
            dropsCapToday: isPremium ? DAILY_DROP_CAP_PREMIUM : DAILY_DROP_CAP_FREE,
        };
    });
});
//# sourceMappingURL=collectibles.js.map