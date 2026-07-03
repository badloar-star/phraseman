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
exports.arenaSeasonRolloverCron = void 0;
/**
 * arenaSeasonRolloverCron — закрытие сезона раз в квартал.
 *
 * Логика (идемпотентно по seasonId):
 *  1. Если документ нового сезона уже есть → откат уже сделан → no-op.
 *  2. Иначе: фиксируем финальную таблицу прошлого сезона (uid→место) и для КАЖДОГО
 *     профиля прошлого сезона пишем источник награды в arena_season_claims
 *     (peakSR/seasonPeakRankIndex/finalPlace, claimed:false) — чтобы награда считалась
 *     по ПИКУ, а не по финалу после отката.
 *  3. Открываем новый сезон (фиксируем документ — повторный запуск станет no-op).
 *  4. Батчами откатываем ранги (−N, пол Бронза III) и обнуляем sr/peak/seasonId.
 *
 * Работает батчами по arena_profiles — щадим память (известная боль с OOM-кронами).
 */
const functions = __importStar(require("firebase-functions/v2"));
const admin = __importStar(require("firebase-admin"));
const arena_season_1 = require("./arena_season");
const arena_season_config_1 = require("./arena_season_config");
const REGION = 'us-central1';
const BATCH = 300;
exports.arenaSeasonRolloverCron = functions.scheduler.onSchedule({ schedule: '0 1 * * *', timeZone: 'Etc/UTC', region: REGION, memory: '1GiB', timeoutSeconds: 540 }, async () => {
    const db = admin.firestore();
    const nowSeasonId = (0, arena_season_1.seasonIdForDate)(new Date());
    const seasonRef = db.collection('arena_seasons').doc(nowSeasonId);
    const seasonSnap = await seasonRef.get();
    if (seasonSnap.exists)
        return; // этот сезон уже открыт → откат уже сделан, no-op
    // Тюнинг отката из Firestore (fallback = дефолты).
    const seasonCfg = await (0, arena_season_config_1.resolveArenaSeasonConfig)(db);
    // Финальная таблица прошлого сезона: uid → место. Прошлый сезон вычисляем по
    // профилям (у них seasonId != nowSeasonId). Берём один общий «прошлый» id из топа.
    const endedSeasonId = previousSeasonId(nowSeasonId);
    const placeByUid = new Map();
    if (endedSeasonId) {
        const topSnap = await db
            .collection('arena_season_leaderboard').doc(endedSeasonId)
            .collection('entries').orderBy('sr', 'desc').limit(1000).get()
            .catch(() => null);
        if (topSnap) {
            topSnap.docs.forEach((doc, i) => {
                const dd = doc.data();
                placeByUid.set(doc.id, { place: i + 1, sr: Math.max(0, Math.trunc(dd.sr ?? 0)) });
            });
        }
    }
    // Открываем новый сезон ДО отката (фиксируем — повторный запуск станет no-op).
    await seasonRef.set({
        seasonId: nowSeasonId, startsAt: Date.now(), status: 'active',
    }, { merge: true });
    // Откатываем ранги батчами. Профили уже на новом seasonId пропускаем.
    let last = null;
    for (;;) {
        let q = db.collection('arena_profiles').orderBy('__name__').limit(BATCH);
        if (last)
            q = q.startAfter(last);
        const snap = await q.get();
        if (snap.empty)
            break;
        const writer = db.bulkWriter();
        for (const doc of snap.docs) {
            const dd = doc.data();
            if (dd.seasonId === nowSeasonId)
                continue; // уже обработан
            // Стэшим источник награды за завершённый сезон (по ПИКУ) до обнуления.
            if (dd.seasonId && (dd.peakSR || dd.seasonPeakRankIndex)) {
                const finalPlace = placeByUid.get(doc.id)?.place ?? null;
                writer.set(db.collection('arena_season_claims').doc(`${dd.seasonId}_${doc.id}`), {
                    seasonId: dd.seasonId, uid: doc.id,
                    peakSR: dd.peakSR ?? 0,
                    seasonPeakRankIndex: dd.seasonPeakRankIndex ?? 0,
                    finalPlace,
                    claimed: false, createdAt: Date.now(),
                }, { merge: true });
            }
            const rolled = (0, arena_season_1.applySeasonRollback)(String(dd.rank?.tier ?? dd['rank.tier'] ?? 'bronze'), String(dd.rank?.level ?? dd['rank.level'] ?? 'I'), seasonCfg.rollbackSteps, seasonCfg.floorIndex);
            writer.set(doc.ref, {
                rank: { tier: rolled.tier, level: rolled.level, stars: 0 },
                sr: 0,
                peakSR: 0,
                seasonId: nowSeasonId,
                seasonPeakRankIndex: 0,
                updatedAt: Date.now(),
            }, { merge: true });
        }
        await writer.close();
        last = snap.docs[snap.docs.length - 1];
        if (snap.size < BATCH)
            break;
    }
});
/** Предыдущий квартальный id для `YYYY-Qn`. */
function previousSeasonId(seasonId) {
    const m = /^(\d{4})-Q([1-4])$/.exec(seasonId);
    if (!m)
        return null;
    let year = Number(m[1]);
    let q = Number(m[2]) - 1;
    if (q < 1) {
        q = 4;
        year -= 1;
    }
    return `${year}-Q${q}`;
}
//# sourceMappingURL=arena_season_cron.js.map