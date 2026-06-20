"use strict";
// ═══════════════════════════════════════════════════════════════════════════
// league_finalize_cron.ts — серверная финализация лиги в конце недели.
//
// Проблема: клиент сохранял результат (повышение/понижение) только на основе
// локального/закэшированного снапшота группы. Если снапшот устарел — итоги
// неверные: пользователи получают не тот результат.
//
// Решение: каждый понедельник в 00:05 UTC кроны считают итоги по ВСЕМ группам
// прошедшей недели и записывают каждому участнику:
//   users/{uid}/league_week_results/{weekId} = { rank, total, promoted, demoted,
//                                               newLeagueId, prevLeagueId }
//
// Клиент checkLeagueOnAppOpen затем проверяет этот документ вместо пересчёта
// локально. Если документа нет (кроны ещё не сработали или новый юзер) —
// fallback на старое поведение.
//
// Порядок: одна страница league_groups (500 doc), батч-запись,
//          пагинация по lastDoc. Ожидаемое время: <30сек для 50к групп.
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
exports.leagueFinalizeCron = void 0;
const admin = __importStar(require("firebase-admin"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
const CLUBS_MAX_ID = 11;
const LEAGUE_RESULT_ZONE_RATIO = 0.15;
const PAGE_SIZE = 200;
const BATCH_LIMIT = 400;
function getLeagueResultZoneSize(total) {
    return total >= 2 ? Math.max(1, Math.round(total * LEAGUE_RESULT_ZONE_RATIO)) : 0;
}
function getPreviousWeekId(now = new Date()) {
    // ISO week: понедельник = начало недели
    const utcDay = now.getUTCDay(); // 0=Sun
    const daysSinceMonday = (utcDay + 6) % 7;
    // Прошлый понедельник = этот понедельник - 7 дней
    const prevMon = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceMonday - 7));
    const d = new Date(prevMon.getTime());
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}
function computeGroupResults(members, leagueId) {
    const entries = Object.entries(members)
        .filter(([, m]) => m?.identityHidden !== true)
        .map(([uid, m]) => ({
        uid,
        points: Math.max(0, Math.trunc(Number(m.points ?? 0)) || 0),
    }))
        .sort((a, b) => b.points - a.points);
    const total = entries.length;
    const zoneSize = getLeagueResultZoneSize(total);
    const results = {};
    entries.forEach((e, idx) => {
        const rank = idx + 1;
        const promoted = total >= 2 && rank <= zoneSize && leagueId < CLUBS_MAX_ID;
        const demoted = total >= 2 && rank >= total - zoneSize + 1 && leagueId > 0 && !promoted;
        results[e.uid] = {
            rank,
            total,
            promoted,
            demoted,
            prevLeagueId: leagueId,
            newLeagueId: promoted ? leagueId + 1 : demoted ? leagueId - 1 : leagueId,
            points: e.points,
        };
    });
    return results;
}
exports.leagueFinalizeCron = (0, scheduler_1.onSchedule)({
    schedule: 'every monday 00:05',
    timeZone: 'UTC',
    timeoutSeconds: 540,
    memory: '512MiB',
    region: 'us-central1',
}, async () => {
    const db = admin.firestore();
    const weekId = getPreviousWeekId();
    console.log(`leagueFinalizeCron: weekId=${weekId}`);
    let processed = 0;
    let written = 0;
    let lastDoc = null;
    let batch = db.batch();
    let batchCount = 0;
    const flushBatch = async () => {
        if (batchCount > 0) {
            await batch.commit();
            batch = db.batch();
            batchCount = 0;
        }
    };
    // eslint-disable-next-line no-constant-condition
    while (true) {
        let query = db
            .collection('league_groups')
            .where('weekId', '==', weekId)
            .orderBy('__name__')
            .limit(PAGE_SIZE);
        if (lastDoc)
            query = query.startAfter(lastDoc);
        const snap = await query.get();
        if (snap.empty)
            break;
        lastDoc = snap.docs[snap.docs.length - 1];
        for (const doc of snap.docs) {
            const data = doc.data();
            const leagueId = Math.max(0, Math.trunc(Number(data.leagueId ?? 0)));
            const members = data.members && typeof data.members === 'object' && !Array.isArray(data.members)
                ? data.members
                : {};
            const results = computeGroupResults(members, leagueId);
            for (const [uid, result] of Object.entries(results)) {
                const resultRef = db
                    .collection('users')
                    .doc(uid)
                    .collection('league_week_results')
                    .doc(weekId);
                batch.set(resultRef, {
                    ...result,
                    weekId,
                    groupId: doc.id,
                    finalizedAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: false });
                batchCount++;
                written++;
                if (batchCount >= BATCH_LIMIT) {
                    await flushBatch();
                }
            }
            processed++;
        }
    }
    await flushBatch();
    console.log(`leagueFinalizeCron: processed=${processed} groups, written=${written} user results`);
    return;
});
//# sourceMappingURL=league_finalize_cron.js.map