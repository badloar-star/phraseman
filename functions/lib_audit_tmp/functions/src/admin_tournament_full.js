"use strict";
// ═══════════════════════════════════════════════════════════════════════════
// admin_tournament_full.ts — генерация ЦЕЛОГО турнира одним вызовом.
//
// зачем: владелец забраковал генерацию пачками однотипных вопросов — «чтобы
// генерация ВСЕГДА генерировала 1 фулл готовый турнир, все раунды, и для
// каждого режима своё, и сохранялось в отдельный раздел пула». Здесь один
// вызов = 24 задания: план раундов берётся из tournament_ai_blueprint (он
// зеркалит selectRoundTasks сервера), каждый тип просится своим промптом,
// задания ложатся в пул с режимом своего типа — разделы не смешиваются.
//
// Вынесено отдельным файлом, чтобы не раздувать admin_tournament_tasks.ts
// (там уже 1000+ строк) и чтобы старая пакетная генерация осталась рабочей.
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
exports.adminBulkTournamentFolder = exports.adminRegenerateTournamentTask = exports.adminGenerateTournamentAi = void 0;
exports.rejectRetiredTournamentModeGeneration = rejectRetiredTournamentModeGeneration;
exports.bulkTournamentTaskCanPublish = bulkTournamentTaskCanPublish;
exports.parseTournamentFullRequest = parseTournamentFullRequest;
exports.difficultyWord = difficultyWord;
exports.groupPlannedTasks = groupPlannedTasks;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const callable_options_1 = require("./callable_options");
const tournament_audio_1 = require("./tournament_audio");
const tournament_core_1 = require("./tournament_core");
const tournament_ai_blueprint_1 = require("./tournament_ai_blueprint");
const tournament_ai_kind_prompts_1 = require("./tournament_ai_kind_prompts");
const tournament_ai_kind_items_1 = require("./tournament_ai_kind_items");
const tournament_ai_validator_1 = require("./tournament_ai_validator");
const tournament_ai_generator_1 = require("./tournament_ai_generator");
const admin_tournament_tasks_1 = require("./admin_tournament_tasks");
const explain_provider_1 = require("./explain/explain_provider");
const openai_jobs_config_1 = require("./openai_jobs_config");
const REGION = 'us-central1';
const OPENAI_API_KEY = (0, params_1.defineSecret)('OPENAI_API_KEY');
const WRITE_BATCH_SIZE = 400;
const AI_BILLING_COLLECTION = 'tournament_ai_billing';
const AI_BUDGET_COLLECTION = 'tournament_ai_budget';
const AI_MAX_REPAIRS = 2;
const AI_TEMPERATURE = 0.35;
/** Compatibility tombstone for generators that only know retired text modes. */
function rejectRetiredTournamentModeGeneration() {
    throw new https_1.HttpsError('failed-precondition', 'tournament_legacy_mode_generation_retired');
}
/** Explicit wrapper keeps folder publication tied to the normal publish gate. */
function bulkTournamentTaskCanPublish(task) {
    return (0, admin_tournament_tasks_1.canPublishTournamentTask)(task);
}
const AI_MAX_TOKENS = 6000;
/** Уровень словами — модель держит сложность точнее, чем по голой метке CEFR. */
const LEVEL_ANCHORS = Object.freeze({
    A1: 'level 1 of 6, absolute beginner: the 500 most common words, present simple only',
    A2: 'level 2 of 6, elementary: everyday routines, past simple, basic future',
    B1: 'level 3 of 6, intermediate: opinions, plans, common phrasal verbs',
    B2: 'level 4 of 6, upper-intermediate: nuanced tenses, common idioms, collocations',
    C1: 'level 5 of 6, advanced: subtle register shifts, idiomatic usage',
    C2: 'level 6 of 6, mastery: native-like nuance, rare idioms, stylistic contrast',
});
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function parseTournamentFullRequest(data) {
    const record = (0, admin_tournament_tasks_1.onlyKeys)(data, ['level', 'topicHint', 'dryRun'], 'tournament_ai_full_invalid');
    const level = String(record.level ?? 'A2').trim();
    if (!(0, tournament_ai_generator_1.isTournamentAiLevel)(level)) {
        throw new https_1.HttpsError('invalid-argument', 'tournament_ai_level_invalid');
    }
    const topicHint = String(record.topicHint ?? '').trim().slice(0, 120);
    return Object.freeze({ level, topicHint, dryRun: record.dryRun === true });
}
/** Сложность 1..3 → слово: модель держит уровень по слову лучше, чем по числу. */
function difficultyWord(difficulty) {
    if (difficulty <= 1)
        return 'easy';
    return difficulty === 2 ? 'medium' : 'hard';
}
function groupPlannedTasks() {
    const groups = new Map();
    for (const planned of (0, tournament_ai_blueprint_1.flattenPlan)((0, tournament_ai_blueprint_1.buildTournamentPlan)())) {
        const key = `${planned.kind}:${planned.difficulty}`;
        const existing = groups.get(key);
        if (existing)
            existing.count += 1;
        else
            groups.set(key, { kind: planned.kind, difficulty: planned.difficulty, count: 1 });
    }
    return Object.freeze([...groups.values()].map((group) => Object.freeze(group)));
}
/**
 * Одна группа: N заданий одного типа и одной сложности.
 * Плохие отсеиваются поштучно — один брак не роняет оплаченный запрос.
 */
async function generateKindGroup(apiKey, model, params) {
    const baseTask = (0, tournament_ai_kind_prompts_1.buildKindTask)({
        kind: params.kind,
        level: params.level,
        levelAnchor: LEVEL_ANCHORS[params.level],
        count: params.count,
        difficultyWord: difficultyWord(params.difficulty),
        topicHint: params.topicHint || undefined,
        previousPrompts: params.previousPrompts,
    });
    let promptTokens = 0;
    let completionTokens = 0;
    let requests = 0;
    let currentTask = baseTask;
    const errors = new Set();
    const repairHints = new Set();
    let best = [];
    for (let attempt = 0; attempt <= AI_MAX_REPAIRS; attempt += 1) {
        const result = await (0, explain_provider_1.openAiChat)({
            apiKey,
            model,
            messages: [
                { role: 'system', content: tournament_ai_kind_prompts_1.KIND_SYSTEM_PROMPT },
                { role: 'user', content: currentTask },
            ],
            maxTokens: AI_MAX_TOKENS,
            temperature: AI_TEMPERATURE,
            responseFormat: (0, tournament_ai_kind_prompts_1.responseFormatForKind)(params.kind),
        });
        requests += 1;
        promptTokens += result.promptTokens;
        completionTokens += result.completionTokens;
        let parsed = null;
        try {
            parsed = JSON.parse(result.text);
        }
        catch {
            errors.add('kind_batch_json_invalid');
            currentTask = `${baseTask}\nRepair: previous output was not valid JSON. Return JSON only.`;
            continue;
        }
        const rawItems = isRecord(parsed) && Array.isArray(parsed.items) ? parsed.items : [];
        const accepted = [];
        for (const raw of rawItems) {
            const item = (0, tournament_ai_kind_items_1.parseKindItem)(raw, params.kind);
            if (!item.ok) {
                item.errors.forEach((code) => errors.add(code));
                continue;
            }
            // Separate judge: syntactically valid content still cannot reach the owner
            // before an independent model has checked the answer, traps and explanation.
            const verdict = await (0, tournament_ai_validator_1.judgeTournamentTask)({ apiKey, model, item: item.item });
            requests += 1;
            promptTokens += verdict.promptTokens;
            completionTokens += verdict.completionTokens;
            if (verdict.ok) {
                accepted.push(item.item);
                continue;
            }
            errors.add(`kind_validator_${verdict.reason}`);
            repairHints.add(`${verdict.reason}: ${verdict.feedback}`);
        }
        if (accepted.length > best.length)
            best = accepted;
        if (accepted.length >= params.count) {
            return {
                items: accepted.slice(0, params.count),
                errors: Object.freeze([...errors]),
                promptTokens,
                completionTokens,
                requests,
            };
        }
        // зачем: не хватило — просим починить, но лучший результат уже сохранён.
        // Так последняя неудачная попытка не обнуляет то, что уже оплачено.
        currentTask = `${baseTask}\nRepair: fix these concrete validator findings and return the full corrected JSON: ${JSON.stringify([...repairHints.size ? repairHints : errors].slice(0, 10))}`;
    }
    return { items: best, errors: Object.freeze([...errors]), promptTokens, completionTokens, requests };
}
/** Дневной кап на запросы к OpenAI — тот же счётчик, что у пакетной генерации. */
async function reserveDailyBudget(db, cap, requested, nowMs) {
    const dayKey = new Date(nowMs).toISOString().slice(0, 10);
    const ref = db.collection(AI_BUDGET_COLLECTION).doc(dayKey);
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const used = Number(snap.data()?.batches ?? 0);
        if (used + requested > cap) {
            throw new https_1.HttpsError('resource-exhausted', 'tournament_ai_daily_cap_reached');
        }
        tx.set(ref, { batches: used + requested, updatedAtMs: nowMs }, { merge: true });
    });
}
exports.adminGenerateTournamentAi = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK, timeoutSeconds: 540, secrets: [OPENAI_API_KEY] }, async (request) => {
    (0, admin_tournament_tasks_1.requirePermission)(request, 'content.draft.write');
    rejectRetiredTournamentModeGeneration();
    const params = parseTournamentFullRequest(request.data);
    const db = admin.firestore();
    const nowMs = Date.now();
    const cfg = await (0, openai_jobs_config_1.resolveJobConfig)(db, 'tournament');
    (0, openai_jobs_config_1.assertJobEnabled)(cfg, 'tournament');
    const apiKey = String(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY || '').trim();
    if (!apiKey)
        throw new https_1.HttpsError('failed-precondition', 'OPENAI_API_KEY not configured');
    const groups = groupPlannedTasks();
    // Кап по числу групп: каждая — отдельный запрос к OpenAI.
    await reserveDailyBudget(db, cfg.globalDailyCap, groups.length, nowMs);
    const collected = [];
    const rejected = new Set();
    const usedPrompts = [];
    let promptTokens = 0;
    let completionTokens = 0;
    let requests = 0;
    try {
        for (const group of groups) {
            const outcome = await generateKindGroup(apiKey, cfg.model, {
                kind: group.kind,
                level: params.level,
                count: group.count,
                difficulty: group.difficulty,
                topicHint: params.topicHint,
                previousPrompts: usedPrompts.slice(-80),
            });
            promptTokens += outcome.promptTokens;
            completionTokens += outcome.completionTokens;
            requests += outcome.requests;
            outcome.errors.forEach((code) => rejected.add(code));
            for (const item of outcome.items) {
                usedPrompts.push(item.prompt);
                collected.push({ item, difficulty: group.difficulty });
            }
        }
    }
    finally {
        // billing в finally: падение провайдера посреди цикла не должно прятать
        // уже потраченные токены от дашборда трат.
        if (requests > 0) {
            await db.collection(AI_BILLING_COLLECTION).add({
                model: cfg.model,
                promptTokens,
                completionTokens,
                requests,
                level: params.level,
                mode: 'full_tournament',
                dryRun: params.dryRun,
                uid: String(request.auth?.token?.email ?? request.auth?.uid ?? 'admin'),
                createdAtMs: nowMs,
            }).catch((error) => console.error('[tournament_ai_full] billing write failed', error));
        }
    }
    // Задания пула + отсев тех, что не проходят серверный контракт: битое
    // задание в пуле молча выпало бы из выборки раунда.
    const tasks = [];
    for (const entry of collected) {
        const task = (0, tournament_ai_kind_items_1.kindItemToTask)(entry.item, { level: params.level, difficulty: entry.difficulty });
        if ((0, tournament_ai_kind_items_1.kindTaskPassesServerContract)(task))
            tasks.push(task);
        else
            rejected.add('kind_server_contract_failed');
    }
    const byMode = {};
    for (const task of tasks)
        byMode[task.mode] = (byMode[task.mode] ?? 0) + 1;
    const report = {
        ok: true,
        planned: tournament_ai_blueprint_1.TOURNAMENT_AI_TOTAL_TASKS,
        produced: tasks.length,
        byMode,
        rejected: [...rejected],
        samples: tasks.slice(0, 6).map((task) => (0, admin_tournament_tasks_1.publicAdminTask)(task.taskId, task)),
    };
    if (params.dryRun)
        return { ...report, dryRun: true, written: 0 };
    // Запись батчами; уже опубликованные задания не трогаем.
    let written = 0;
    const collection = db.collection(tournament_core_1.TOURNAMENT_TASKS_COLLECTION);
    for (let i = 0; i < tasks.length; i += WRITE_BATCH_SIZE) {
        const chunk = tasks.slice(i, i + WRITE_BATCH_SIZE);
        const snapshots = await db.getAll(...chunk.map((task) => collection.doc(task.taskId)));
        const batch = db.batch();
        for (let j = 0; j < chunk.length; j += 1) {
            if (snapshots[j].exists && snapshots[j].get('verified') === true)
                continue;
            batch.set(collection.doc(chunk[j].taskId), {
                ...chunk[j],
                source: 'ai',
                createdAtMs: nowMs,
            }, { merge: true });
            written += 1;
        }
        await batch.commit();
    }
    return { ...report, dryRun: false, written };
});
// ── Перегенерация одного вопроса и массовые действия по папке ───────────────
/**
 * Заменяет ОДИН вопрос новым того же типа и сложности.
 *
 * зачем: владелец просил «зайти, просмотреть каждое и выбрать что заменять».
 * Без этого негодный вопрос можно было только удалить, а на его место потом
 * генерировать целый турнир из 24 заданий. Здесь — один запрос к ИИ на замену.
 *
 * Старый вопрос удаляется, новый ложится черновиком: замена не уходит игрокам
 * без ревью, даже если старый был опубликован.
 */
exports.adminRegenerateTournamentTask = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK, timeoutSeconds: 300, secrets: [OPENAI_API_KEY] }, async (request) => {
    (0, admin_tournament_tasks_1.requirePermission)(request, 'content.draft.write');
    rejectRetiredTournamentModeGeneration();
    const record = (0, admin_tournament_tasks_1.onlyKeys)(request.data, ['taskId', 'topicHint'], 'tournament_regen_invalid');
    const taskId = String(record.taskId ?? '').trim();
    if (!/^[A-Za-z0-9._:-]{1,160}$/.test(taskId)) {
        throw new https_1.HttpsError('invalid-argument', 'tournament_regen_task_invalid');
    }
    const topicHint = String(record.topicHint ?? '').trim().slice(0, 120);
    const db = admin.firestore();
    const nowMs = Date.now();
    const collection = db.collection(tournament_core_1.TOURNAMENT_TASKS_COLLECTION);
    const snap = await collection.doc(taskId).get();
    if (!snap.exists)
        throw new https_1.HttpsError('not-found', 'tournament_task_not_found');
    const existing = snap.data();
    // Тип берём из тега kind:*, режим — запасной вариант для старых заданий.
    const kindTag = (existing.tags || []).find((tag) => tag.startsWith('kind:'));
    const kind = (kindTag?.slice(5) || '');
    const level = ((existing.tags || []).find((tag) => tag.startsWith('cefr:'))?.slice(5) || 'a2').toUpperCase();
    if (!tournament_ai_blueprint_1.TOURNAMENT_AI_KINDS.includes(kind)) {
        throw new https_1.HttpsError('failed-precondition', 'tournament_regen_kind_unknown');
    }
    if (!(0, tournament_ai_generator_1.isTournamentAiLevel)(level)) {
        throw new https_1.HttpsError('failed-precondition', 'tournament_regen_level_unknown');
    }
    const cfg = await (0, openai_jobs_config_1.resolveJobConfig)(db, 'tournament');
    (0, openai_jobs_config_1.assertJobEnabled)(cfg, 'tournament');
    const apiKey = String(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY || '').trim();
    if (!apiKey)
        throw new https_1.HttpsError('failed-precondition', 'OPENAI_API_KEY not configured');
    const difficulty = Math.max(1, Math.min(3, Math.trunc(Number(existing.difficulty) || 1)));
    const outcome = await generateKindGroup(apiKey, cfg.model, {
        kind,
        level,
        count: 1,
        difficulty,
        topicHint,
        // Просим не повторить заменяемый вопрос.
        previousPrompts: [String(existing.payload?.phrase ?? '')],
    });
    // Учёт трат — в тот же дашборд, что и остальная ИИ-генерация.
    if (outcome.requests > 0) {
        await db.collection(AI_BILLING_COLLECTION).add({
            model: cfg.model,
            promptTokens: outcome.promptTokens,
            completionTokens: outcome.completionTokens,
            requests: outcome.requests,
            level,
            mode: 'regenerate_one',
            uid: String(request.auth?.token?.email ?? request.auth?.uid ?? 'admin'),
            createdAtMs: nowMs,
        }).catch((error) => console.error('[tournament_regen] billing write failed', error));
    }
    const fresh = outcome.items[0];
    if (!fresh) {
        throw new https_1.HttpsError('unavailable', `tournament_regen_failed:${outcome.errors.slice(0, 3).join(',')}`);
    }
    const replacement = (0, tournament_ai_kind_items_1.kindItemToTask)(fresh, { level, difficulty });
    if (!(0, tournament_ai_kind_items_1.kindTaskPassesServerContract)(replacement)) {
        throw new https_1.HttpsError('unavailable', 'tournament_regen_contract_failed');
    }
    // Замена атомарна: старый уходит, новый появляется в одной операции.
    const batch = db.batch();
    batch.set(collection.doc(replacement.taskId), {
        ...replacement, source: 'ai', createdAtMs: nowMs, replacedTaskId: taskId,
        lifecycle: 'awaiting_approval',
        aiVerdict: 'approved',
        aiReason: 'Passed server AI contract validation after regeneration.',
        aiCheckedAtMs: nowMs,
    }, { merge: true });
    if (replacement.taskId !== taskId)
        batch.delete(collection.doc(taskId));
    await batch.commit();
    return { ok: true, taskId: replacement.taskId, replaced: taskId, task: (0, admin_tournament_tasks_1.publicAdminTask)(replacement.taskId, replacement) };
});
/**
 * Массовое действие по ПАПКЕ (режиму): опубликовать или удалить всё.
 *
 * зачем: владелец просил работать с папкой целиком, не отмечая галочками по
 * одному. Публикация проверяет серверный контракт: битое задание в боевом пуле
 * молча выпало бы из выборки раунда.
 */
exports.adminBulkTournamentFolder = (0, https_1.onCall)(
// secrets: публикация аудио-режима генерит озвучку через OpenAI TTS.
{ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK, timeoutSeconds: 300, secrets: tournament_audio_1.TOURNAMENT_AUDIO_SECRETS }, async (request) => {
    const record = (0, admin_tournament_tasks_1.onlyKeys)(request.data, ['mode', 'action', 'status'], 'tournament_bulk_invalid');
    const mode = String(record.mode ?? '').trim();
    const action = String(record.action ?? '').trim();
    const status = String(record.status ?? '').trim();
    if (!/^[A-Za-z0-9._:-]{1,40}$/.test(mode) || !['publish', 'delete'].includes(action)
        || !['', 'draft', 'published'].includes(status)) {
        throw new https_1.HttpsError('invalid-argument', 'tournament_bulk_invalid');
    }
    // Публикация в боевой пул — отдельное право.
    (0, admin_tournament_tasks_1.requirePermission)(request, action === 'publish' ? 'content.publish' : 'content.draft.write');
    const db = admin.firestore();
    const nowMs = Date.now();
    let query = db.collection(tournament_core_1.TOURNAMENT_TASKS_COLLECTION)
        .where('mode', '==', mode);
    if (status === 'draft')
        query = query.where('verified', '==', false);
    if (status === 'published')
        query = query.where('verified', '==', true);
    // guard-ok: limit — за один вызов не больше пачки, клиент зовёт снова.
    const snapshot = await query.limit(WRITE_BATCH_SIZE).get();
    let affected = 0;
    let rejected = 0;
    const batch = db.batch();
    for (const doc of snapshot.docs) {
        if (action === 'delete') {
            batch.delete(doc.ref);
            affected += 1;
            continue;
        }
        const task = doc.data();
        // зачем: владелец 2026-07-27 — «озвучка может генерироваться сразу,
        // когда фразы одобрены». Аудио-режим без звука неиграбелен, поэтому
        // генерим ДО публикации: не получилось — задание остаётся черновиком,
        // и владелец видит это в счётчике rejected, а не игрок в раунде.
        // Дедуп по хэшу текста внутри ensureTournamentAudio: одна фраза
        // озвучивается один раз, повторные публикации бесплатны.
        let payload = task.payload;
        if ((0, tournament_audio_1.modeNeedsAudio)(task.mode)) {
            try {
                const audio = await (0, tournament_audio_1.ensureTournamentAudio)(task.mode, payload);
                if (!audio) {
                    rejected += 1;
                    continue;
                }
                payload = { ...payload, audioUri: audio.downloadUrl };
                batch.update(doc.ref, {
                    payload,
                    // Рядом с заданием держим текст и хэш озвучки: страж свежести
                    // сверяет их при правке фразы (иначе звучало бы одно, а
                    // написано другое — известный класс бага в проекте).
                    audioSourceText: audio.sourceText,
                    audioTextHash: audio.textHash,
                    audioVoice: audio.voice,
                    audioGeneratedAtMs: audio.createdAtMs,
                });
            }
            catch (error) {
                console.error('[tournaments] audio generation failed', doc.id, error);
                rejected += 1;
                continue;
            }
        }
        // Публикуем только то, что реально пройдёт серверный валидатор
        // (проверяем payload УЖЕ с озвучкой — без неё аудио-режим не валиден).
        const publishCandidate = { ...task, payload, taskId: doc.id };
        if (!(0, tournament_ai_kind_items_1.kindTaskPassesServerContract)(publishCandidate)
            || !bulkTournamentTaskCanPublish(publishCandidate)) {
            rejected += 1;
            continue;
        }
        batch.update(doc.ref, { verified: true, publishedAtMs: nowMs, lifecycle: 'published' });
        affected += 1;
    }
    await batch.commit();
    return { ok: true, action, mode, affected, rejected, hasMore: snapshot.size === WRITE_BATCH_SIZE };
});
//# sourceMappingURL=admin_tournament_full.js.map