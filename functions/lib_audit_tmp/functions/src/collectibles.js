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
//   - кап 3 дропа/день (premium 4); первая карточка за всё время гарантирована
//     (100%, один раз), дальше единый шанс 15%;
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
exports.collectiblesClaimDrop = exports.EVENT_ID_RE = exports.COLLECTIBLES_DROP_DEFAULTS = exports.COLLECTIBLES_STATE_KEY = exports.COLLECTIBLES_OWNED_KEY = void 0;
exports.collectiblesDropConfigFromData = collectiblesDropConfigFromData;
exports.resolveCollectiblesDropConfig = resolveCollectiblesDropConfig;
exports.parseDropState = parseDropState;
exports.rollCollectibleDrop = rollCollectibleDrop;
exports.assertCollectibleRewardEventEligible = assertCollectibleRewardEventEligible;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const auth_identity_1 = require("./auth_identity");
const premium_status_1 = require("./premium_status");
const tournament_core_1 = require("./tournament_core");
const tournament_economy_1 = require("./tournament_economy");
const collectibles_catalog_1 = require("./collectibles_catalog");
exports.COLLECTIBLES_OWNED_KEY = 'collectibles_owned_v1';
exports.COLLECTIBLES_STATE_KEY = 'collectibles_state_v1';
exports.COLLECTIBLES_DROP_DEFAULTS = {
    flatDropChance: 0.15,
    dailyDropCapFree: 3,
    dailyDropCapPremium: 4,
    dailyAttemptCap: 24,
    pityEpicAt: 15,
    pityLegendaryAt: 35,
    // Новая экономика (план 2026-07-20, §7): бонус за сбор сета не даёт монет.
    // Поле конфига сохранено (мёртвая структура); gameplay-начисление = 0.
    setBonusShards: 0,
};
// Активности без дропа вовсе (произношение / диалог с Компасом): шанс = 0.
const NO_DROP_KINDS = new Set(['pronounce', 'dialog']);
// Качественные активности; kind = префикс eventId до первого ':'.
// зачем: владелец попросил давать шанс карточки не только за урок — добавлены
// tournament (участие в турнире, независимо от места), vocab (закрыт словарь
// урока), verbs (закрыт раздел неправильных глаголов), prep (закрыт раздел
// предлогов). Шанс/кап/pity у них ОБЩИЕ с уроком — отдельной экономики нет,
// поэтому список правил дропа не меняется, только расширяется валидация.
exports.EVENT_ID_RE = /^(lesson|plan|quiz|arena|exam|tournament|vocab|verbs|prep|pronounce|dialog):[A-Za-z0-9_.:-]{1,80}$/;
/**
 * Шанс дропа для типа активности с учётом конфига. pronounce/dialog → 0,
 * остальные «качественные» → flatDropChance. Первая карточка за всё время
 * гарантирована отдельно (см. rollCollectibleDrop).
 */
function dropChanceForKind(kind, config) {
    if (NO_DROP_KINDS.has(kind))
        return 0;
    return config.flatDropChance;
}
function clampNum(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n))
        return fallback;
    return Math.max(min, Math.min(max, n));
}
/**
 * Чистый парсер конфига дропа из remote_config/app.numbers. Любое отсутствие/
 * мусор → дефолт по полю. НИКОГДА не бросает (денежная математика).
 */
function collectiblesDropConfigFromData(numbers) {
    const n = numbers ?? {};
    const d = exports.COLLECTIBLES_DROP_DEFAULTS;
    return {
        flatDropChance: clampNum(n.collectibles_drop_chance_pct, 0, 100, d.flatDropChance * 100) / 100,
        dailyDropCapFree: Math.trunc(clampNum(n.collectibles_daily_cap_free, 0, 999, d.dailyDropCapFree)),
        dailyDropCapPremium: Math.trunc(clampNum(n.collectibles_daily_cap_premium, 0, 999, d.dailyDropCapPremium)),
        dailyAttemptCap: Math.trunc(clampNum(n.collectibles_attempt_cap, 1, 9999, d.dailyAttemptCap)),
        pityEpicAt: Math.trunc(clampNum(n.collectibles_pity_epic_at, 1, 9999, d.pityEpicAt)),
        pityLegendaryAt: Math.trunc(clampNum(n.collectibles_pity_legendary_at, 1, 9999, d.pityLegendaryAt)),
        setBonusShards: Math.trunc(clampNum(n.collectibles_set_bonus_shards, 0, 9999, d.setBonusShards)),
    };
}
/**
 * Читает тюнинг дропа из remote_config/app.numbers (тот же документ, что и арена).
 * НИКОГДА не бросает: при ошибке/отсутствии → дефолты (поведение как до фичи).
 * Один get на вызов callable — дёшево.
 */
async function resolveCollectiblesDropConfig(db) {
    try {
        const snap = await db.collection('remote_config').doc('app').get();
        const data = snap.data();
        return collectiblesDropConfigFromData(data?.numbers);
    }
    catch (e) {
        console.warn('resolveCollectiblesDropConfig failed, using defaults', e);
        return { ...exports.COLLECTIBLES_DROP_DEFAULTS };
    }
}
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
    const { seed, state, unowned, config } = params;
    const available = new Set(unowned.map((c) => c.rarity));
    if (available.size === 0)
        return null;
    let target;
    if (state.sinceLegendary >= config.pityLegendaryAt - 1 && available.has('legendary')) {
        target = 'legendary';
    }
    else if (state.sinceEpic >= config.pityEpicAt - 1 && (available.has('epic') || available.has('legendary'))) {
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
    const { seedBase, kind, owned, state, isPremium } = params;
    const pool = params.pool ?? collectibles_catalog_1.COLLECTIBLE_POOL;
    const config = params.config ?? exports.COLLECTIBLES_DROP_DEFAULTS;
    const dropChance = dropChanceForKind(kind, config);
    // Активность типа pronounce/dialog дроп не даёт вовсе (шанс 0).
    if (dropChance <= 0)
        return { dropped: false, reason: 'no_luck' };
    if (state.attempts >= config.dailyAttemptCap)
        return { dropped: false, reason: 'attempt_cap' };
    const cap = isPremium ? config.dailyDropCapPremium : config.dailyDropCapFree;
    if (state.drops >= cap)
        return { dropped: false, reason: 'daily_cap' };
    const unowned = pool.filter((c) => owned[c.id] == null);
    if (unowned.length === 0)
        return { dropped: false, reason: 'pool_exhausted' };
    // Самая первая карточка за всё время гарантирована (100%, ровно один раз),
    // дальше — общий шанс 15%. Дневной «первый дроп» больше НЕ гарантируется.
    const guaranteed = state.total === 0;
    if (!guaranteed && rollUnit(`${seedBase}:chance`) >= dropChance) {
        return { dropped: false, reason: 'no_luck' };
    }
    const rarity = resolveRarity({ seed: `${seedBase}:rarity`, state, unowned, config });
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
        bonusShards: grantSecret ? config.setBonusShards : 0,
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
/**
 * Tournament event ids are server-authoritative: a client-supplied room id is
 * eligible only when it resolves to the same persisted, paid, rewarding room.
 * Other collectible event kinds retain their existing behavior and perform no
 * tournament read.
 */
async function assertCollectibleRewardEventEligible(eventId, loadRoom) {
    if (!eventId.startsWith('tournament:'))
        return;
    const roomId = eventId.slice('tournament:'.length);
    const rawRoom = await loadRoom(roomId);
    if (!rawRoom || typeof rawRoom !== 'object' || Array.isArray(rawRoom)) {
        throw new https_1.HttpsError('failed-precondition', 'tournament_collectible_room_invalid');
    }
    const room = rawRoom;
    if (room.roomId !== roomId || typeof room.slotId !== 'string' || room.slotId.length === 0) {
        throw new https_1.HttpsError('failed-precondition', 'tournament_collectible_room_invalid');
    }
    const persistedRoom = room;
    const entryGems = persistedRoom.economySnapshot
        ? (0, tournament_economy_1.normalizeTournamentEconomy)(persistedRoom.economySnapshot).entryGems
        : null;
    const ticketsRequired = persistedRoom.ticketsRequired;
    if ((0, tournament_core_1.isTournamentTestRoom)(persistedRoom)
        || typeof ticketsRequired !== 'number'
        || !Number.isSafeInteger(ticketsRequired)
        || ticketsRequired <= 0
        || entryGems === 0) {
        throw new https_1.HttpsError('failed-precondition', 'tournament_collectible_reward_disabled');
    }
}
exports.collectiblesClaimDrop = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    const authUid = request.auth?.uid;
    if (!authUid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const eventIdRaw = String(request.data?.eventId ?? '').trim();
    if (!exports.EVENT_ID_RE.test(eventIdRaw)) {
        throw new https_1.HttpsError('invalid-argument', 'bad_event_id');
    }
    const db = admin.firestore();
    await assertCollectibleRewardEventEligible(eventIdRaw, async (roomId) => {
        const roomSnap = await db.collection(tournament_core_1.TOURNAMENT_ROOMS_COLLECTION).doc(roomId).get();
        return roomSnap.exists ? roomSnap.data() : null;
    });
    // stableId НИКОГДА не берём из тела запроса (см. phraseman security audit).
    const stableUid = await (0, auth_identity_1.resolveStableUidForAuth)(db, authUid);
    await assertNotBanned(db, stableUid);
    // Тюнинг дропа из «Пульта» (remote_config/app.numbers). Читаем ДО транзакции:
    // это отдельный документ, не входит в read-set юзер-транзакции. Fallback на дефолты.
    const dropConfig = await resolveCollectiblesDropConfig(db);
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
            kind: eventIdRaw.split(':')[0],
            owned,
            state,
            isPremium,
            config: dropConfig,
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
            shardsUpdatedAtMs: decision.bonusShards > 0 ? now : null,
            ownedCount: Object.keys(newOwned).length,
            dropsToday: nextState.drops,
            dropsCapToday: isPremium ? dropConfig.dailyDropCapPremium : dropConfig.dailyDropCapFree,
        };
    });
});
//# sourceMappingURL=collectibles.js.map