"use strict";
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
exports.lookupPercentile = lookupPercentile;
exports.computeLeaderboardStats = computeLeaderboardStats;
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
const MIN_PERCENTILE_SAMPLE_XP = 5000;
function readProgressInt(value) {
    const n = Math.trunc(Number(value));
    return Number.isFinite(n) ? n : 0;
}
/**
 * Для массива значений строит таблицу перцентильных порогов p1..p99.
 * pN = минимальное значение, чтобы быть «выше N% пользователей».
 * Возвращает массив из 100 элементов: index 0 → p1, index 98 → p99.
 */
function buildPercentileThresholds(values) {
    if (values.length === 0)
        return new Array(99).fill(0);
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const out = [];
    for (let p = 1; p <= 99; p++) {
        // Линейная интерполяция (метод «exclusive»)
        const rank = (p / 100) * n;
        const lo = Math.floor(rank);
        const hi = Math.ceil(rank);
        if (lo === 0) {
            out.push(sorted[0] ?? 0);
        }
        else if (hi >= n) {
            out.push(sorted[n - 1] ?? 0);
        }
        else {
            const frac = rank - lo;
            out.push((sorted[lo - 1] ?? 0) * (1 - frac) + (sorted[lo] ?? 0) * frac);
        }
    }
    return out;
}
/**
 * По таблице порогов определяет, сколько процентов пользователей
 * данный пользователь обогнал (0–99). null = нет данных.
 */
function lookupPercentile(thresholds, myValue) {
    if (thresholds.length === 0 || myValue <= 0)
        return null;
    // thresholds[i] = порог (i+1)-го перцентиля
    // Ищем наибольший p такой что thresholds[p-1] <= myValue
    let result = 0;
    for (let i = 0; i < thresholds.length; i++) {
        if (myValue > (thresholds[i] ?? 0))
            result = i + 1;
        else
            break;
    }
    return result === 0 ? 0 : result;
}
async function computeLeaderboardStats() {
    console.log('[computeLeaderboardStats] start');
    // 1. Lifetime XP thresholds.
    // Lifetime XP must come from the real progress document, not from leaderboard
    // mirrors that can lag behind or be jump-clamped by the callable guard.
    const xpVals = [];
    let lastUserDoc = null;
    while (true) {
        let q = db.collection('users')
            .orderBy('__name__')
            .limit(500);
        if (lastUserDoc)
            q = q.startAfter(lastUserDoc);
        const snap = await q.get();
        if (snap.empty)
            break;
        for (const doc of snap.docs) {
            const progress = doc.data()?.progress ?? {};
            const xp = readProgressInt(progress.user_total_xp);
            if (xp >= MIN_PERCENTILE_SAMPLE_XP)
                xpVals.push(xp);
        }
        lastUserDoc = snap.docs[snap.docs.length - 1] ?? null;
        if (snap.size < 500)
            break;
    }
    const streakVals = [];
    const weekXpVals = [];
    const daily7xpVals = [];
    const daily7timeMsVals = [];
    let lastLbDoc = null;
    while (true) {
        let q = db.collection('leaderboard')
            .where('points', '>=', MIN_PERCENTILE_SAMPLE_XP)
            .orderBy('points')
            .limit(500);
        if (lastLbDoc)
            q = q.startAfter(lastLbDoc);
        const snap = await q.get();
        if (snap.empty)
            break;
        for (const doc of snap.docs) {
            const d = doc.data();
            const xp = typeof d.points === 'number' ? d.points : 0;
            if (xp <= 0)
                continue;
            if (typeof d.streak === 'number' && d.streak > 0)
                streakVals.push(d.streak);
            if (typeof d.weekPoints === 'number' && d.weekPoints > 0)
                weekXpVals.push(d.weekPoints);
            if (typeof d.daily7xp === 'number' && d.daily7xp > 0)
                daily7xpVals.push(d.daily7xp);
            if (typeof d.daily7time_ms === 'number' && d.daily7time_ms > 0)
                daily7timeMsVals.push(d.daily7time_ms);
        }
        lastLbDoc = snap.docs[snap.docs.length - 1] ?? null;
        if (snap.size < 500)
            break;
    }
    // ── 2. Читаем arena_profiles (xp) ────────────────────────────────────────────
    const arenaXpVals = [];
    let lastArenaDoc = null;
    while (true) {
        let q = db.collection('arena_profiles')
            .where('xp', '>', 0)
            .orderBy('xp')
            .limit(500);
        if (lastArenaDoc)
            q = q.startAfter(lastArenaDoc);
        const snap = await q.get();
        if (snap.empty)
            break;
        for (const doc of snap.docs) {
            const d = doc.data();
            const mp = d.stats?.matchesPlayed ?? 0;
            if (mp < 1)
                continue;
            const axp = typeof d.xp === 'number' ? d.xp : 0;
            if (axp > 0)
                arenaXpVals.push(axp);
        }
        lastArenaDoc = snap.docs[snap.docs.length - 1] ?? null;
        if (snap.size < 500)
            break;
    }
    // ── 3. Строим таблицы порогов ─────────────────────────────────────────────────
    const stats = {
        totalUsers: xpVals.length,
        updatedAt: Date.now(),
        minimumSampleXp: MIN_PERCENTILE_SAMPLE_XP,
        xpThresholds: buildPercentileThresholds(xpVals),
        streakThresholds: buildPercentileThresholds(streakVals),
        weekXpThresholds: buildPercentileThresholds(weekXpVals),
        daily7xpThresholds: buildPercentileThresholds(daily7xpVals),
        daily7timeMsThresholds: buildPercentileThresholds(daily7timeMsVals),
        arenaXpThresholds: buildPercentileThresholds(arenaXpVals),
    };
    await db.collection('leaderboard_stats').doc('global').set(stats);
    console.log(`[computeLeaderboardStats] done. minSampleXp=${MIN_PERCENTILE_SAMPLE_XP}, xpUsers=${xpVals.length}, ` +
        `streak=${streakVals.length}, daily7xp=${daily7xpVals.length}, ` +
        `arenaXp=${arenaXpVals.length}`);
}
//# sourceMappingURL=compute_leaderboard_stats.js.map