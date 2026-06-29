"use strict";
// ═══════════════════════════════════════════════════════════════════════════
// compass_chat_cron.ts — дневной пост Компаса в чат каждой активной лиги.
//
// Каждый день в 09:00 UTC крон проходит по всем группам ТЕКУЩЕЙ недели и пишет
// в league_chat_messages ровно ОДНО системное сообщение на группу (kind:'system',
// authorUid = LEAGUE_CHAT_SYSTEM_UID). Контент детерминирован по дню (см.
// compass_chat_content.pickCompassPostForDay) и несёт карту i18n со всеми
// языками — клиент рендерит свой.
//
// Стоимость: 1 write на группу/день. Read у юзеров не добавляется — пост
// читается тем же realtime-слушателем чата.
//
// Идемпотентность: id документа детерминирован (`compass_{weekId}_{groupId}_{daySeed}`),
// поэтому повторный запуск крона в тот же день НЕ создаёт дубль (set, не add).
//
// Паттерн пагинации/батчинга скопирован с league_finalize_cron.ts.
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
exports.compassChatRunNow = exports.compassChatDailyCron = void 0;
exports.compassPostDocId = compassPostDocId;
exports.compassIcebreakerDocId = compassIcebreakerDocId;
exports.compassSummaryDocId = compassSummaryDocId;
exports.runCompassChatDailyPost = runCompassChatDailyPost;
const admin = __importStar(require("firebase-admin"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
const compass_chat_content_1 = require("./compass_chat_content");
const LEAGUE_CHAT_SYSTEM_UID = '__league_system__';
const PAGE_SIZE = 200;
const BATCH_LIMIT = 400;
/** Сколько участников максимум перечислять в дневной сводке достижений. */
const MAX_SUMMARY_NAMES = 12;
/** ISO weekId текущей недели (UTC) — совпадает с league_groups.getWeekId. */
function getCurrentWeekId(now = new Date()) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}
/** Детерминированный id поста: один и тот же день+группа → один документ (без дублей). */
function compassPostDocId(weekId, groupId, daySeed) {
    const safeGroup = String(groupId).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64) || 'group';
    return `compass_${weekId}_${safeGroup}_${daySeed}`;
}
/** Стабильный id закреплённого приветствия (один на группу, без daySeed). */
function compassIcebreakerDocId(weekId, groupId) {
    const safeGroup = String(groupId).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64) || 'group';
    return `compass_pin_${weekId}_${safeGroup}`;
}
/** Стабильный id дневной сводки достижений (один на группу/день). */
function compassSummaryDocId(weekId, groupId, daySeed) {
    const safeGroup = String(groupId).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64) || 'group';
    return `compass_sum_${weekId}_${safeGroup}_${daySeed}`;
}
/** Минимальный размер группы для поста — не засорять одиночные/пустые комнаты. */
const MIN_MEMBERS_FOR_POST = 2;
function membersMap(data) {
    const members = data?.members;
    if (!members || typeof members !== 'object' || Array.isArray(members))
        return {};
    return members;
}
function countMembers(data) {
    return Object.values(membersMap(data)).filter((m) => m?.identityHidden !== true).length;
}
/** Снимок очков участников (uid → points) для сравнения «кто продвинулся за день». */
function pointsSnapshot(data) {
    const snap = {};
    for (const [uid, m] of Object.entries(membersMap(data))) {
        if (m?.identityHidden === true)
            continue;
        snap[uid] = Math.max(0, Math.trunc(Number(m?.points ?? 0)) || 0);
    }
    return snap;
}
/** Имена участников, чьи очки выросли с прошлого снимка (= были активны сегодня). */
function advancedMemberNames(data, prev) {
    if (!prev || typeof prev !== 'object')
        return [];
    const names = [];
    for (const [uid, m] of Object.entries(membersMap(data))) {
        if (m?.identityHidden === true)
            continue;
        const now = Math.max(0, Math.trunc(Number(m?.points ?? 0)) || 0);
        const before = Math.max(0, Math.trunc(Number(prev[uid] ?? 0)) || 0);
        if (now > before) {
            const name = String(m?.name ?? '').trim();
            if (name)
                names.push(name);
        }
    }
    return names.slice(0, MAX_SUMMARY_NAMES);
}
/** Документ чат-сообщения из поста Компаса. */
function buildMessagePayload(post, groupId, weekId, leagueId, createdAt, extra) {
    const payload = {
        groupId,
        weekId,
        leagueId,
        authorUid: LEAGUE_CHAT_SYSTEM_UID,
        authorName: 'Compass',
        kind: 'system',
        systemType: post.systemType,
        compassKind: post.kind,
        text: post.i18n.ru, // дефолтный текст; клиент рендерит i18n[lang]
        i18n: post.i18n,
        status: 'visible',
        reportCount: 0,
        createdAt,
        updatedAt: createdAt,
        ...(extra || {}),
    };
    if (post.poll) {
        payload.poll = post.poll;
        payload.pollVotes = {};
    }
    return payload;
}
/**
 * Ядро дневной публикации Компаса. Вынесено, чтобы запускать из планировщика
 * и из ручного админ-триггера (compassChatRunNow) одним и тем же кодом.
 */
async function runCompassChatDailyPost(now = new Date()) {
    const db = admin.firestore();
    const weekId = getCurrentWeekId(now);
    const daySeed = (0, compass_chat_content_1.getDaySeed)(now);
    const post = (0, compass_chat_content_1.pickCompassPostForDay)(daySeed);
    const createdAt = Date.now();
    console.log(`compassChatDailyCron: weekId=${weekId} daySeed=${daySeed} kind=${post.kind}`);
    let processed = 0;
    let written = 0;
    let summaries = 0;
    let skipped = 0;
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
            processed++;
            const data = doc.data();
            if (countMembers(data) < MIN_MEMBERS_FOR_POST) {
                skipped++;
                continue;
            }
            const leagueId = Math.max(0, Math.trunc(Number(data.leagueId ?? 0)));
            const messages = db.collection('league_chat_messages');
            // 1) Дневной пост Компаса (слово/факт/вопрос/опрос). id детерминирован →
            //    повторный запуск перезапишет тем же контентом (идемпотентно).
            batch.set(messages.doc(compassPostDocId(weekId, doc.id, daySeed)), buildMessagePayload(post, doc.id, weekId, leagueId, createdAt), { merge: false });
            batchCount++;
            written++;
            // 2) Закреплённое приветствие новичкам — один документ на группу (pinned).
            batch.set(messages.doc(compassIcebreakerDocId(weekId, doc.id)), buildMessagePayload((0, compass_chat_content_1.buildIcebreakerPost)(), doc.id, weekId, leagueId, createdAt, { pinned: true }), { merge: false });
            batchCount++;
            written++;
            // 3) Дневная сводка достижений: кто продвинулся со вчерашнего снимка очков.
            const prevSnap = (data.compassPointsSnapshot && typeof data.compassPointsSnapshot === 'object'
                ? data.compassPointsSnapshot
                : undefined);
            const advanced = advancedMemberNames(data, prevSnap);
            const summary = (0, compass_chat_content_1.buildDailySummaryPost)(advanced);
            if (summary) {
                batch.set(messages.doc(compassSummaryDocId(weekId, doc.id, daySeed)), buildMessagePayload(summary, doc.id, weekId, leagueId, createdAt), { merge: false });
                batchCount++;
                written++;
                summaries++;
            }
            // Обновляем снимок очков на группе для сравнения завтра (admin SDK,
            // правила не блокируют). Отдельное поле — не трогает members.
            batch.set(db.collection('league_groups').doc(doc.id), { compassPointsSnapshot: pointsSnapshot(data), compassPointsSnapshotDay: daySeed }, { merge: true });
            batchCount++;
            if (batchCount >= BATCH_LIMIT) {
                await flushBatch();
            }
        }
    }
    await flushBatch();
    console.log(`compassChatDailyCron: processed=${processed} groups, written=${written}, summaries=${summaries}, skipped=${skipped}`);
    return { weekId, daySeed, kind: post.kind, processed, written, summaries, skipped };
}
exports.compassChatDailyCron = (0, scheduler_1.onSchedule)({
    schedule: 'every day 09:00',
    timeZone: 'UTC',
    timeoutSeconds: 540,
    memory: '512MiB',
    region: 'us-central1',
}, async () => {
    await runCompassChatDailyPost(new Date());
});
/**
 * Ручной триггер для проверки в деве/проде. Только админ (custom claim admin).
 * Запускает ту же публикацию, что и планировщик, и возвращает статистику.
 */
exports.compassChatRunNow = (0, https_1.onCall)({ region: 'us-central1', timeoutSeconds: 540, memory: '512MiB' }, async (request) => {
    if (request.auth?.token?.admin !== true) {
        throw new https_1.HttpsError('permission-denied', 'admin_required');
    }
    const stats = await runCompassChatDailyPost(new Date());
    return { ok: true, ...stats };
});
//# sourceMappingURL=compass_chat_cron.js.map