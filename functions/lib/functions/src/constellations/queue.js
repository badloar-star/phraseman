"use strict";
// ════════════════════════════════════════════════════════════════════════════
// constellations/queue.ts — очередь и подбор (спек B1–B3).
//
// Отдельная constellation_queue (дуэльную matchmaking_queue НЕ трогаем, B1).
// Мгновенный матч на записи в очередь (4 живых), cron раз в минуту: добор
// ботами ждущих дольше bot_fill_delay (дефолт 30с), чистка протухших,
// watchdog фаз, live-счётчик поиска в app_meta (паттерн дуэльного подборщика).
// ════════════════════════════════════════════════════════════════════════════
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
exports.tryMatchConstellationUser = tryMatchConstellationUser;
exports.fillConstellationAfterDelay = fillConstellationAfterDelay;
exports.constellationQueueCron = constellationQueueCron;
const admin = __importStar(require("firebase-admin"));
const config_1 = require("./config");
const match_service_1 = require("./match_service");
const db = admin.firestore();
const QUEUE = 'constellation_queue';
const APP_META_SEARCHING = 'app_meta/constellation_searching';
const QUEUE_WINDOW_LIMIT = 200;
const STALE_ENTRY_MS = 15 * 60 * 1000;
const MATCHED_TTL_MS = 2 * 60 * 1000;
/** Разрешённые ступени ставки (C3). */
const WAGER_TIERS = new Set([0, 1, 2, 5]);
function toHuman(e) {
    const out = { userId: e.userId ?? e.id };
    if (typeof e.displayName === 'string')
        out.displayName = e.displayName;
    if (typeof e.rankIndex === 'number')
        out.rankIndex = e.rankIndex;
    if (typeof e.wager === 'number' && WAGER_TIERS.has(e.wager))
        out.wager = e.wager;
    if (typeof e.expoPushToken === 'string')
        out.expoPushToken = e.expoPushToken;
    return out;
}
async function readQueueWindow() {
    const snap = await db.collection(QUEUE)
        .orderBy('joinedAt')
        .limit(QUEUE_WINDOW_LIMIT)
        .get();
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
}
function rankDistance(a, b) {
    return Math.abs((a.rankIndex ?? 0) - (b.rankIndex ?? 0));
}
/** Кандидаты в матч к entry: диапазон рангов с взаимным расширением, ближние первыми. */
function pickCandidates(entry, pool, need) {
    const inRange = pool.filter((e) => {
        const range = Math.max(entry.searchRange ?? 3, e.searchRange ?? 3);
        return rankDistance(entry, e) <= range;
    });
    const source = inRange.length >= need ? inRange : pool; // малая база — матчим ближних
    return [...source]
        .sort((a, b) => rankDistance(entry, a) - rankDistance(entry, b) || a.id.localeCompare(b.id))
        .slice(0, need);
}
/** Мгновенная попытка собрать матч 4 живых при записи в очередь (B2: без экрана принятия). */
async function tryMatchConstellationUser(userId) {
    const selfSnap = await db.collection(QUEUE).doc(userId).get();
    if (!selfSnap.exists)
        return;
    const self = { ...selfSnap.data(), id: selfSnap.id };
    if (self.matchId)
        return;
    const pool = (await readQueueWindow())
        .filter((e) => !e.matchId && e.id !== userId);
    const others = pickCandidates(self, pool, 3);
    if (others.length < 3)
        return; // ботов доберёт cron после bot_fill_delay
    try {
        await (0, match_service_1.createConstellationMatch)([self, ...others].map(toHuman));
    }
    catch (e) {
        // Гонка транзакции (кто-то уже заматчен) — нормально, следующий триггер добьёт.
        console.warn('tryMatchConstellationUser race', e);
    }
}
/**
 * Точный добор к bot_fill_delay (B3): триггер очереди «досыпает» до дедлайна
 * записи и, если игрок всё ещё не заматчен живыми, немедленно собирает матч
 * с ботами. Минутный cron остаётся страховкой (инстанс триггера могли убить).
 */
async function fillConstellationAfterDelay(userId) {
    const cfg = await (0, config_1.resolveConstellationConfig)(db);
    const ref = db.collection(QUEUE).doc(userId);
    const first = await ref.get();
    const entry = first.data();
    if (!first.exists || !entry || entry.matchId)
        return;
    const deadline = (entry.joinedAt ?? Date.now()) + cfg.matchmaking.botFillDelaySec * 1000;
    const waitMs = Math.min(Math.max(deadline - Date.now(), 0), 45000);
    if (waitMs > 0)
        await new Promise((r) => setTimeout(r, waitMs));
    const fresh = await ref.get();
    const freshEntry = fresh.data();
    if (!fresh.exists || !freshEntry || freshEntry.matchId)
        return; // успели живые
    // Берём с собой до 2 других ждущих (их дедлайн тоже близко) и добиваем ботами.
    const window = await readQueueWindow();
    const now = Date.now();
    const others = window
        .filter((e) => !e.matchId && e.id !== userId && now - (e.joinedAt ?? 0) <= STALE_ENTRY_MS)
        .slice(0, 2);
    try {
        await (0, match_service_1.createConstellationMatch)([{ ...freshEntry, id: userId }, ...others].map(toHuman));
    }
    catch (e) {
        console.warn('fillConstellationAfterDelay race (cron подстрахует)', e);
    }
}
/** Минутный cron: полные матчи → добор ботами → чистка → watchdog → счётчик. */
async function constellationQueueCron() {
    const now = Date.now();
    const cfg = await (0, config_1.resolveConstellationConfig)(db);
    const window = await readQueueWindow();
    // Протухшие записи поиска (игрок давно ушёл).
    const stale = window.filter((e) => !e.matchId && now - (e.joinedAt ?? 0) > STALE_ENTRY_MS);
    const matchedStale = window.filter((e) => e.matchId && now - (e.matchedAt ?? e.joinedAt ?? 0) > MATCHED_TTL_MS);
    if (stale.length + matchedStale.length > 0) {
        const batch = db.batch();
        for (const e of [...stale, ...matchedStale])
            batch.delete(db.collection(QUEUE).doc(e.id));
        await batch.commit();
    }
    let waiting = window.filter((e) => !e.matchId && now - (e.joinedAt ?? 0) <= STALE_ENTRY_MS);
    // Сначала полные человеческие матчи.
    while (waiting.length >= 4) {
        const entry = waiting[0];
        const others = pickCandidates(entry, waiting.slice(1), 3);
        const picked = [entry, ...others];
        const pickedIds = new Set(picked.map((p) => p.id));
        waiting = waiting.filter((e) => !pickedIds.has(e.id));
        try {
            await (0, match_service_1.createConstellationMatch)(picked.map(toHuman));
        }
        catch (e) {
            console.warn('constellationQueueCron full-match race', e);
        }
    }
    // Добор ботами: ждут дольше bot_fill_delay → матч немедленно (B3, минимум 1 живой).
    const overdue = waiting.filter((e) => now - (e.joinedAt ?? 0) >= cfg.matchmaking.botFillDelaySec * 1000);
    while (overdue.length > 0) {
        const group = overdue.splice(0, 3); // до 3 людей в один бото-матч
        try {
            await (0, match_service_1.createConstellationMatch)(group.map(toHuman));
        }
        catch (e) {
            console.warn('constellationQueueCron bot-fill race', e);
        }
    }
    await (0, match_service_1.constellationWatchdogTick)();
    try {
        const count = (await db.collection(QUEUE).count().get()).data().count ?? 0;
        await db.doc(APP_META_SEARCHING).set({ searchingCount: count, updatedAt: now }, { merge: true });
    }
    catch (e) {
        console.warn('constellation searching count', e);
    }
}
//# sourceMappingURL=queue.js.map