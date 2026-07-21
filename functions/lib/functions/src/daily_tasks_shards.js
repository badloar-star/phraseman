"use strict";
// ═══════════════════════════════════════════════════════════════════════════
// daily_tasks_shards.ts — серверная выдача осколка за выполнение всех
// 3 ежедневных заданий.
//
// Проблема: клиентский путь в shards_system.ts:claimDailyTasksAllShardsReward
// пишет поле `shards` напрямую в users/{uid} → заблокировано Firestore-правилом
// hasNoShardWrites(). Admin SDK обходит rules, поэтому выдача переведена сюда.
//
// Идемпотентность: users/{uid}/reward_claims/daily_tasks_all_{dayKey}.
// Повторный вызов с тем же dayKey возвращает уже записанный баланс.
//
// Анти-фарм (аудит платёжки 2026-06-21): dayKey ограничен окном «сегодня/вчера»
// по UTC. Раньше принимался ЛЮБОЙ валидный YYYY-MM-DD → клиент мог запросить по
// осколку за каждую прошлую/будущую дату (2020-01-01, 2020-01-02, …) и нафармить
// мягкую валюту. Окно в 2 дня покрывает легальный поздне-ночной кейс, когда юзер
// домучивает задания около полуночи UTC и заявка уходит уже в новом UTC-дне.
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
exports.dailyTasksAllShardsClaim = void 0;
exports.utcDayKey = utcDayKey;
exports.isAcceptableDayKey = isAcceptableDayKey;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const auth_identity_1 = require("./auth_identity");
const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
// Новая экономика (план 2026-07-20, §7): «все 3 дневных задания» больше не
// даёт монет — награда переехала в звёзды. Callable и claim-маркер сохранены
// (мёртвый, но безвредный путь): claim пишет amount 0 и не меняет баланс.
const DAILY_TASKS_SHARD_AMOUNT = 0;
const REWARD_CLAIMS_COLLECTION = 'reward_claims';
const DAY_MS = 24 * 60 * 60 * 1000;
function readShardBalance(value) {
    const n = Math.trunc(Number(value));
    return Number.isFinite(n) && n >= 0 ? n : 0;
}
function readUpdatedAtMs(value) {
    const n = Math.trunc(Number(value));
    return Number.isFinite(n) && n > 0 ? n : null;
}
/** Ключ UTC-дня (YYYY-MM-DD) для произвольного момента времени. */
function utcDayKey(ms) {
    const d = new Date(ms);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}
/**
 * Допустим ли dayKey: формат YYYY-MM-DD И входит в окно {сегодня, вчера} по UTC
 * относительно nowMs. Чистая функция — экспортируется для тестов.
 */
function isAcceptableDayKey(dayKey, nowMs) {
    if (typeof dayKey !== 'string' || !DAY_KEY_RE.test(dayKey))
        return false;
    return dayKey === utcDayKey(nowMs) || dayKey === utcDayKey(nowMs - DAY_MS);
}
/**
 * Callable: выдать +1 осколок за выполнение всех дневных заданий.
 *
 * Вход:  { dayKey: "2026-06-15" }
 * Ответ: { alreadyClaimed: boolean; newBalance: number }
 */
exports.dailyTasksAllShardsClaim = (0, https_1.onCall)(callable_options_1.HOT_CALLABLE_OPTIONS, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'Not authenticated');
    const db = admin.firestore();
    // Резолвим тот же документ, под которым клиент хранит осколки (getCanonicalUserId
    // === stableId). Без проброса stableId сервер падал на db.doc(authUid)/lookup по
    // firebaseAuthUid (auth_identity.ts) → для юзеров с релинком (анон→Google, мердж
    // аккаунтов) claim писал/читал ДРУГОЙ документ: маркер reward_claims оседал не там,
    // сервер вечно возвращал alreadyClaimed, а баланс на видимом доке не менялся →
    // «не забрать осколки уже который день» + «осколки уменьшились» (баг-репорты).
    const uid = await (0, auth_identity_1.resolveStableUidForAuth)(db, request.auth.uid, request.data?.stableId);
    const dayKey = request.data?.dayKey;
    if (typeof dayKey !== 'string' || !DAY_KEY_RE.test(dayKey)) {
        throw new https_1.HttpsError('invalid-argument', 'dayKey must be YYYY-MM-DD');
    }
    // Анти-фарм: принимаем только сегодня/вчера по UTC. Произвольная дата (прошлое/
    // будущее) дала бы по осколку за каждую несуществующую дату.
    if (!isAcceptableDayKey(dayKey, Date.now())) {
        throw new https_1.HttpsError('failed-precondition', 'dayKey must be today or yesterday (UTC)');
    }
    const userRef = db.collection('users').doc(uid);
    const claimRef = userRef.collection(REWARD_CLAIMS_COLLECTION).doc(`daily_tasks_all_${dayKey}`);
    const result = await db.runTransaction(async (tx) => {
        const [claimSnap, userSnap] = await Promise.all([tx.get(claimRef), tx.get(userRef)]);
        if (claimSnap.exists) {
            const existingBalance = readShardBalance(userSnap.data()?.shards);
            const shardsUpdatedAtMs = readUpdatedAtMs(userSnap.data()?.shards_updated_at_ms);
            return { alreadyClaimed: true, newBalance: existingBalance, shardsUpdatedAtMs };
        }
        const currentBalance = readShardBalance(userSnap.data()?.shards);
        const newBalance = currentBalance + DAILY_TASKS_SHARD_AMOUNT;
        const shardsUpdatedAtMs = Date.now();
        const now = admin.firestore.FieldValue.serverTimestamp();
        tx.set(claimRef, {
            source: 'daily_tasks_all',
            dayKey,
            amount: DAILY_TASKS_SHARD_AMOUNT,
            createdAt: now,
        });
        tx.set(userRef, {
            shards: newBalance,
            shards_updated_at_ms: shardsUpdatedAtMs,
            shards_updated_op: 'earn',
            shards_updated_reason: 'daily_tasks_all',
        }, { merge: true });
        return { alreadyClaimed: false, newBalance, shardsUpdatedAtMs };
    });
    return result;
});
//# sourceMappingURL=daily_tasks_shards.js.map