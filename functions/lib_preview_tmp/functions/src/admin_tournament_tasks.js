"use strict";
// ═══════════════════════════════════════════════════════════════════════════
// admin_tournament_tasks.ts — серверная часть раздела «Турниры» в админке.
//
// зачем: владелец просил полноценный генератор в живой админке
// (admin/v2/legacy.html). Здесь Firestore-обвязка вокруг чистого
// tournament_task_factory: сгенерировать черновики → показать на ревью →
// опубликовать verified → отбить статистику пула → включить слоты.
//
// ЭКОНОМИЯ FIRESTORE (правило владельца): генерация читает контент из кода
// (app/plan_content_*.ts), а не из Firestore — ноль чтений. Список отдаёт
// страницами с потолком, статистика считается агрегатом count() вместо
// выкачивания коллекции, публикация идёт батчами по 400 вместо N записей.
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
exports.adminGetTournamentSchedule = exports.adminSetTournamentSchedule = exports.adminTournamentPoolStats = exports.ROUND_DIFFICULTIES = exports.ROUND_TASK_TARGET = exports.adminMutateTournamentTasks = exports.adminListTournamentTasks = exports.adminGetTournamentCurated = exports.adminSetTournamentCurated = exports.adminEditTournamentTask = exports.adminGenerateTournamentTasksAi = exports.adminGenerateTournamentTasks = void 0;
exports.parseGenerateRequest = parseGenerateRequest;
exports.parseListRequest = parseListRequest;
exports.parseMutateRequest = parseMutateRequest;
exports.parseScheduleRequest = parseScheduleRequest;
exports.publicAdminTask = publicAdminTask;
exports.parseAiGenerateRequest = parseAiGenerateRequest;
exports.parseEditRequest = parseEditRequest;
exports.parseCuratedSetRequest = parseCuratedSetRequest;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const callable_options_1 = require("./callable_options");
const permissions_1 = require("./admin/permissions");
const roles_1 = require("./admin/roles");
const tournament_core_1 = require("./tournament_core");
const tournament_task_factory_1 = require("./tournament_task_factory");
const tournament_content_source_1 = require("./tournament_content_source");
const tournament_ai_generator_1 = require("./tournament_ai_generator");
const explain_provider_1 = require("./explain/explain_provider");
const openai_jobs_config_1 = require("./openai_jobs_config");
const REGION = 'us-central1';
const ID_RE = /^[A-Za-z0-9._:-]{1,160}$/;
/** Потолок записей за один вызов: батч Firestore — 500, берём с запасом. */
const WRITE_BATCH_SIZE = 400;
const MAX_PUBLISH_PER_CALL = 2000;
const MAX_LIST_LIMIT = 100;
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function requirePermission(request, permission) {
    if (!request.auth?.token?.admin)
        throw new https_1.HttpsError('permission-denied', 'Admin only');
    const role = /* зачем: adminRole в проекте никем не выдаётся (setCustomUserClaims нет) — флага admin достаточно, роль по умолчанию owner */ (0, roles_1.hasAdminRole)(request.auth.token.adminRole) ? request.auth.token.adminRole : 'owner';
    if (!role || !(0, permissions_1.hasPermission)(role, permission)) {
        throw new https_1.HttpsError('permission-denied', `Role cannot use ${permission}`);
    }
    return role;
}
function onlyKeys(data, allowed, errorCode) {
    if (data === undefined || data === null)
        return {};
    if (!isRecord(data) || Object.keys(data).some((key) => !allowed.includes(key))) {
        throw new https_1.HttpsError('invalid-argument', errorCode);
    }
    return data;
}
function parseGenerateRequest(data) {
    const record = onlyKeys(data, ['plans', 'kinds', 'limit', 'dryRun'], 'tournament_generate_invalid');
    const plansRaw = record.plans === undefined ? tournament_content_source_1.TOURNAMENT_SOURCE_PLANS : record.plans;
    if (!Array.isArray(plansRaw) || plansRaw.length === 0 || plansRaw.length > 20) {
        throw new https_1.HttpsError('invalid-argument', 'tournament_generate_invalid');
    }
    const plans = plansRaw.map((plan) => String(plan ?? '').trim());
    if (plans.some((plan) => !tournament_content_source_1.TOURNAMENT_SOURCE_PLANS.includes(plan))) {
        throw new https_1.HttpsError('invalid-argument', 'tournament_generate_plan_unknown');
    }
    const kindsRaw = record.kinds === undefined ? tournament_task_factory_1.GENERATABLE_KINDS : record.kinds;
    if (!Array.isArray(kindsRaw) || kindsRaw.length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'tournament_generate_invalid');
    }
    const kinds = kindsRaw.map((kind) => String(kind ?? '').trim());
    if (kinds.some((kind) => !tournament_task_factory_1.GENERATABLE_KINDS.includes(kind))) {
        throw new https_1.HttpsError('invalid-argument', 'tournament_generate_kind_unknown');
    }
    const limit = record.limit === undefined ? MAX_PUBLISH_PER_CALL : Number(record.limit);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_PUBLISH_PER_CALL) {
        throw new https_1.HttpsError('invalid-argument', 'tournament_generate_limit_invalid');
    }
    return Object.freeze({
        plans: Object.freeze([...new Set(plans)]),
        kinds: Object.freeze([...new Set(kinds)]),
        limit,
        dryRun: record.dryRun === true,
    });
}
function parseListRequest(data) {
    const record = onlyKeys(data, ['limit', 'status', 'mode', 'difficulty', 'cursor', 'source'], 'tournament_list_invalid');
    const limit = record.limit === undefined ? 25 : Number(record.limit);
    const status = String(record.status ?? '').trim();
    const mode = String(record.mode ?? '').trim();
    const difficulty = record.difficulty === undefined ? 0 : Number(record.difficulty);
    const cursor = String(record.cursor ?? '').trim();
    const source = String(record.source ?? '').trim();
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_LIST_LIMIT
        || !['', 'draft', 'published'].includes(status)
        || (mode && !ID_RE.test(mode))
        || !Number.isSafeInteger(difficulty) || difficulty < 0 || difficulty > 3
        || (cursor && !ID_RE.test(cursor))
        || !['', 'ai', 'plan_content'].includes(source)) {
        throw new https_1.HttpsError('invalid-argument', 'tournament_list_invalid');
    }
    return Object.freeze({ limit, status, mode, difficulty, cursor, source });
}
function parseMutateRequest(data) {
    const record = onlyKeys(data, ['taskIds', 'action'], 'tournament_mutate_invalid');
    const ids = record.taskIds;
    const action = String(record.action ?? '').trim();
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_PUBLISH_PER_CALL
        || !['publish', 'unpublish', 'delete'].includes(action)) {
        throw new https_1.HttpsError('invalid-argument', 'tournament_mutate_invalid');
    }
    const taskIds = ids.map((id) => String(id ?? '').trim());
    if (taskIds.some((id) => !ID_RE.test(id))) {
        throw new https_1.HttpsError('invalid-argument', 'tournament_mutate_id_invalid');
    }
    return Object.freeze({ taskIds: Object.freeze([...new Set(taskIds)]), action });
}
/** Валидна ли IANA-таймзона — той же проверкой, что делает сервер комнат. */
function isValidTimezone(timezone) {
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(0);
        return true;
    }
    catch {
        return false;
    }
}
function parseScheduleRequest(data) {
    const record = onlyKeys(data, ['slots', 'timezone', 'freeWeeklyEntry', 'ticketGemValue'], 'tournament_schedule_invalid');
    const slotsRaw = record.slots;
    const timezone = String(record.timezone ?? 'Europe/Moscow').trim();
    if (!Array.isArray(slotsRaw) || slotsRaw.length === 0 || slotsRaw.length > 12
        || !isValidTimezone(timezone)) {
        throw new https_1.HttpsError('invalid-argument', 'tournament_schedule_invalid');
    }
    const ticketGemValue = record.ticketGemValue === undefined ? 0 : Number(record.ticketGemValue);
    if (!Number.isSafeInteger(ticketGemValue) || ticketGemValue < 0 || ticketGemValue > 1000) {
        throw new https_1.HttpsError('invalid-argument', 'tournament_schedule_invalid');
    }
    const slots = slotsRaw.map((slot) => {
        if (!isRecord(slot))
            throw new https_1.HttpsError('invalid-argument', 'tournament_schedule_slot_invalid');
        const slotId = String(slot.slotId ?? '').trim();
        const localTime = String(slot.localTime ?? '').trim();
        const slotTimezone = String(slot.timezone ?? timezone).trim();
        const ticketsRequired = slot.ticketsRequired === undefined ? 1 : Number(slot.ticketsRequired);
        const timeMatch = /^(\d{2}):(\d{2})$/.exec(localTime);
        if (!ID_RE.test(slotId)
            || !timeMatch || Number(timeMatch[1]) > 23 || Number(timeMatch[2]) > 59
            || !isValidTimezone(slotTimezone)
            || !Number.isSafeInteger(ticketsRequired) || ticketsRequired < 1 || ticketsRequired > 100) {
            throw new https_1.HttpsError('invalid-argument', 'tournament_schedule_slot_invalid');
        }
        return Object.freeze({
            slotId,
            localTime,
            timezone: slotTimezone,
            ticketsRequired,
            enabled: slot.enabled === true,
        });
    });
    const unique = new Set(slots.map((slot) => slot.slotId));
    if (unique.size !== slots.length) {
        throw new https_1.HttpsError('invalid-argument', 'tournament_schedule_duplicate_slot');
    }
    return Object.freeze({
        slots: Object.freeze(slots),
        timezone,
        freeWeeklyEntry: record.freeWeeklyEntry === true,
        ticketGemValue,
    });
}
// ── Представление задания для админки ───────────────────────────────────────
/**
 * Наружу отдаём только то, что нужно карточке ревью. Правильный ответ включён
 * СПЕЦИАЛЬНО: это админский экран, ревьюер обязан видеть, что проверяет.
 * Клиент игры этих данных не получает — там public payload сервера.
 */
function publicAdminTask(taskId, task) {
    const doc = task;
    return {
        taskId,
        mode: task.mode,
        difficulty: task.difficulty,
        isVoice: task.isVoice === true,
        verified: task.verified === true,
        tags: Array.isArray(task.tags) ? [...task.tags] : [],
        payload: task.payload,
        valid: (0, tournament_core_1.validateTournamentTask)({ ...task, verified: true }).ok,
        // Раздельные пулы и карточка ревью ИИ-заданий (сцена + заметка редактору).
        source: typeof doc.source === 'string' ? doc.source : '',
        aiMeta: doc.aiMeta && typeof doc.aiMeta === 'object' && !Array.isArray(doc.aiMeta) ? doc.aiMeta : null,
    };
}
// ── Генерация ───────────────────────────────────────────────────────────────
/**
 * ОТКЛЮЧЁН 2026-07-26 по решению владельца.
 *
 * зачем: генератор собирал турнирные задания из фраз обучающих планов, и это
 * давало негодный для соревнования контент — дистракторы не конкурировали
 * («Hi, I am Anna» против «Привет, ты здесь?»), ответ угадывался без знания
 * языка, форматы дублировали одну фразу трижды. Учебный контент и
 * соревновательный — разные жанры.
 *
 * Функция оставлена задеплоенной, но отвечает отказом: у владельца может быть
 * открыта старая вкладка админки, и молчаливое «ничего не произошло» хуже
 * внятной ошибки. Единственный источник заданий — adminGenerateTournamentTasksAi.
 */
exports.adminGenerateTournamentTasks = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK, memory: '1GiB', timeoutSeconds: 300 }, async (request) => {
    requirePermission(request, 'content.draft.write');
    throw new https_1.HttpsError('failed-precondition', 'Генератор из планов отключён: турнирные задания создаются только ИИ-генератором.');
    // eslint-disable-next-line no-unreachable
    const params = parseGenerateRequest(request.data);
    const days = (0, tournament_content_source_1.loadTournamentSourceDays)(params.plans);
    const { tasks, stats } = (0, tournament_task_factory_1.generateTournamentTasks)(days, {
        kinds: params.kinds,
        limit: params.limit,
        verified: false,
    });
    if (params.dryRun) {
        return {
            ok: true,
            dryRun: true,
            stats,
            samples: tasks.slice(0, 5).map((task) => publicAdminTask(task.taskId, task)),
        };
    }
    const db = admin.firestore();
    const collection = db.collection(tournament_core_1.TOURNAMENT_TASKS_COLLECTION);
    const nowMs = Date.now();
    let written = 0;
    let keptPublished = 0;
    for (let i = 0; i < tasks.length; i += WRITE_BATCH_SIZE) {
        const chunk = tasks.slice(i, i + WRITE_BATCH_SIZE);
        // Одним getAll вместо чтения в цикле: узнаём, какие задания уже
        // опубликованы, чтобы ре-генерация не сняла их с публикации.
        const existing = await db.getAll(...chunk.map((task) => collection.doc(task.taskId)), { fieldMask: ['verified'] });
        const alreadyPublished = new Set(existing.filter((doc) => doc.exists && doc.data()?.verified === true).map((doc) => doc.id));
        const batch = db.batch();
        for (const task of chunk) {
            const ref = collection.doc(task.taskId);
            const wasPublished = alreadyPublished.has(task.taskId);
            if (wasPublished)
                keptPublished += 1;
            // merge: повторная генерация обновляет то же задание, а не плодит дубль.
            // verified сохраняем как было — иначе ре-ген снял бы с публикации уже
            // одобренные владельцем задания и обрушил бы боевой пул.
            batch.set(ref, {
                taskId: task.taskId,
                mode: task.mode,
                isVoice: task.isVoice,
                difficulty: task.difficulty,
                payload: task.payload,
                tags: task.tags,
                verified: wasPublished,
                generatedAtMs: nowMs,
                source: 'plan_content',
            }, { merge: true });
            written += 1;
        }
        await batch.commit();
    }
    return { ok: true, dryRun: false, stats, written, keptPublished };
});
// ── ИИ-генерация (второй источник пула) ─────────────────────────────────────
const OPENAI_API_KEY = (0, params_1.defineSecret)('OPENAI_API_KEY');
const AI_LEDGER_COLLECTION = 'tournament_ai_ledger';
const AI_BILLING_COLLECTION = 'tournament_ai_billing';
const AI_USAGE_COLLECTION = 'tournament_ai_usage';
/** До 2 починок на батч (паттерн stage_runner) — итого максимум 3 запроса. */
const AI_MAX_REPAIRS = 2;
const AI_MAX_BATCHES_PER_CALL = 3;
/** Реестр против повторов: ключи смыслов и недавние фразы на уровень CEFR. */
const AI_LEDGER_MAX_KEYS = 5000;
const AI_LEDGER_MAX_PHRASES = 200;
/**
 * зачем: 0.2 арены даёт форматную дисциплину, но сцены выходят одинаковыми.
 * Живость сцен — прямое требование владельца; формат держит strict-схема
 * и жёсткая валидация, поэтому чуть выше без риска брака.
 */
const AI_TEMPERATURE = 0.35;
const AI_MAX_TOKENS = 6000;
function parseAiGenerateRequest(data) {
    const record = onlyKeys(data, ['level', 'topicHint', 'batches', 'dryRun'], 'tournament_ai_invalid');
    const level = String(record.level ?? '').trim().toUpperCase();
    if (!(0, tournament_ai_generator_1.isTournamentAiLevel)(level)) {
        throw new https_1.HttpsError('invalid-argument', 'tournament_ai_level_invalid');
    }
    const topicHint = String(record.topicHint ?? '').trim().slice(0, 120);
    const batches = record.batches === undefined ? 1 : Number(record.batches);
    if (!Number.isSafeInteger(batches) || batches < 1 || batches > AI_MAX_BATCHES_PER_CALL) {
        throw new https_1.HttpsError('invalid-argument', 'tournament_ai_batches_invalid');
    }
    return Object.freeze({ level, topicHint, batches, dryRun: record.dryRun === true });
}
function utcDateKey(nowMs) {
    return new Date(nowMs).toISOString().slice(0, 10);
}
/** Дневной кап на батчи: жёсткий стоп расходов OpenAI поверх kill-switch джоба. */
async function reserveAiDailyBudget(db, cap, batches, nowMs) {
    if (cap <= 0)
        return;
    const ref = db.collection(AI_USAGE_COLLECTION).doc(utcDateKey(nowMs));
    await db.runTransaction(async (tx) => {
        const used = Number((await tx.get(ref)).data()?.batches ?? 0);
        if (used + batches > cap) {
            throw new https_1.HttpsError('resource-exhausted', `tournament_ai_daily_cap:${used}/${cap}`);
        }
        tx.set(ref, { batches: used + batches, updatedAtMs: nowMs }, { merge: true });
    });
}
/** Один батч: генерация → валидация → до 2 починок с конвертом ошибок. */
async function generateOneAiBatch(apiKey, model, params) {
    const packet = (0, tournament_ai_generator_1.buildTournamentAiPromptPacket)({
        level: params.level,
        topicHint: params.topicHint,
        previousPhrases: params.previousPhrases,
    });
    let promptTokens = 0;
    let completionTokens = 0;
    let requests = 0;
    let task = packet.task;
    let lastErrors = [];
    for (let attempt = 0; attempt <= AI_MAX_REPAIRS; attempt += 1) {
        const result = await (0, explain_provider_1.openAiChat)({
            apiKey,
            model,
            messages: [
                { role: 'system', content: packet.system },
                { role: 'user', content: task },
            ],
            maxTokens: AI_MAX_TOKENS,
            temperature: AI_TEMPERATURE,
            responseFormat: packet.responseFormat,
        });
        requests += 1;
        promptTokens += result.promptTokens;
        completionTokens += result.completionTokens;
        let parsed = null;
        try {
            parsed = JSON.parse(result.text);
        }
        catch {
            lastErrors = ['ai_batch_json_invalid'];
            task = (0, tournament_ai_generator_1.buildTournamentAiRepairTask)(packet, result.text, lastErrors);
            continue;
        }
        const validation = (0, tournament_ai_generator_1.validateTournamentAiBatch)(parsed, {
            level: params.level,
            previousKeys: params.previousKeys,
        });
        if (validation.ok)
            return { ok: true, items: validation.items, promptTokens, completionTokens, requests };
        lastErrors = validation.errors;
        // зачем: без этого лога брак батча неотличим от «модель не ответила» —
        // владелец видит только «забраковано, деньги потрачены» и не может понять,
        // какое правило не выполнилось. Пишем ошибки и образец брака.
        console.warn('[tournament_ai] batch rejected', {
            attempt: attempt + 1,
            level: params.level,
            errors: lastErrors.slice(0, 12),
            sample: result.text.slice(0, 600),
        });
        task = (0, tournament_ai_generator_1.buildTournamentAiRepairTask)(packet, result.text, lastErrors);
    }
    return { ok: false, errors: lastErrors, promptTokens, completionTokens, requests };
}
/**
 * Генерация через ИИ: батчи по 10 choice-вопросов → строгая валидация →
 * черновики verified:false в общий пул с source:'ai'. Публикация — только
 * руками через существующее ревью (adminMutateTournamentTasks).
 */
exports.adminGenerateTournamentTasksAi = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK, timeoutSeconds: 300, secrets: [OPENAI_API_KEY] }, async (request) => {
    requirePermission(request, 'content.draft.write');
    const params = parseAiGenerateRequest(request.data);
    const db = admin.firestore();
    const nowMs = Date.now();
    const cfg = await (0, openai_jobs_config_1.resolveJobConfig)(db, 'tournament');
    (0, openai_jobs_config_1.assertJobEnabled)(cfg, 'tournament');
    const apiKey = String(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY || '').trim();
    if (!apiKey)
        throw new https_1.HttpsError('failed-precondition', 'OPENAI_API_KEY not configured');
    // dryRun капа не резервирует: он тоже жжёт OpenAI, поэтому резервируем всегда.
    await reserveAiDailyBudget(db, cfg.globalDailyCap, params.batches, nowMs);
    // Реестр уровня: смысловые ключи против повторов + недавние фразы в промпт.
    const ledgerRef = db.collection(AI_LEDGER_COLLECTION).doc(params.level);
    const ledgerData = (await ledgerRef.get()).data() ?? {};
    const knownKeys = new Set(Array.isArray(ledgerData.keys) ? ledgerData.keys.map((key) => String(key)) : []);
    const knownPhrases = Array.isArray(ledgerData.phrases)
        ? ledgerData.phrases.map((phrase) => String(phrase))
        : [];
    const accepted = [];
    const rejectedBatches = [];
    let promptTokens = 0;
    let completionTokens = 0;
    let requests = 0;
    // зачем: billing пишется и при падении OpenAI посреди repair-цикла —
    // токены первых запросов уже потрачены, и без finally дашборд трат
    // повторил бы старый баг недосчёта (>60% невидимых расходов).
    try {
        for (let batchNo = 0; batchNo < params.batches; batchNo += 1) {
            const outcome = await generateOneAiBatch(apiKey, cfg.model, {
                level: params.level,
                topicHint: params.topicHint,
                previousKeys: knownKeys,
                previousPhrases: knownPhrases.slice(-120),
            });
            promptTokens += outcome.promptTokens;
            completionTokens += outcome.completionTokens;
            requests += outcome.requests;
            if (!outcome.ok) {
                rejectedBatches.push([...outcome.errors]);
                continue;
            }
            for (const item of outcome.items) {
                // Второй батч не должен дублировать первый в этом же вызове.
                knownKeys.add((0, tournament_ai_generator_1.tournamentAiSemanticKey)(item));
                knownPhrases.push(item.phrase);
                accepted.push(item);
            }
        }
    }
    finally {
        if (requests > 0) {
            // Учёт трат — в общий дашборд OpenAI (схема A: promptTokens/completionTokens).
            await db.collection(AI_BILLING_COLLECTION).add({
                model: cfg.model,
                promptTokens,
                completionTokens,
                requests,
                level: params.level,
                batchesRequested: params.batches,
                batchesAccepted: params.batches - rejectedBatches.length,
                dryRun: params.dryRun,
                uid: String(request.auth?.token?.email ?? request.auth?.uid ?? 'admin'),
                createdAtMs: nowMs,
            }).catch((error) => console.error('[tournament_ai] billing write failed', error));
        }
    }
    const tasks = (0, tournament_ai_generator_1.tournamentAiTasksFrom)(accepted, params.level) ?? [];
    if (accepted.length > 0 && tasks.length === 0) {
        // Валидация батча прошла, а контракт пула — нет: это баг генератора,
        // фиксируем громко, а не молча пустым результатом.
        throw new https_1.HttpsError('internal', 'tournament_ai_contract_mismatch');
    }
    const samples = tasks.slice(0, tournament_ai_generator_1.TOURNAMENT_AI_BATCH_SIZE).map((task, index) => ({
        ...publicAdminTask(task.taskId, task),
        aiMeta: {
            scenario: accepted[index]?.scenario ?? '',
            ruleNote: accepted[index]?.ruleNote ?? '',
        },
    }));
    if (params.dryRun) {
        return {
            ok: true,
            dryRun: true,
            accepted: accepted.length,
            rejectedBatches,
            requests,
            samples,
        };
    }
    let written = 0;
    let keptPublished = 0;
    if (tasks.length > 0) {
        const collection = db.collection(tournament_core_1.TOURNAMENT_TASKS_COLLECTION);
        for (let i = 0; i < tasks.length; i += WRITE_BATCH_SIZE) {
            const chunk = tasks.slice(i, i + WRITE_BATCH_SIZE);
            const existing = await db.getAll(...chunk.map((task) => collection.doc(task.taskId)), { fieldMask: ['verified'] });
            const alreadyPublished = new Set(existing.filter((doc) => doc.exists && doc.data()?.verified === true).map((doc) => doc.id));
            const batch = db.batch();
            for (let j = 0; j < chunk.length; j += 1) {
                const task = chunk[j];
                const item = accepted[i + j];
                const wasPublished = alreadyPublished.has(task.taskId);
                if (wasPublished)
                    keptPublished += 1;
                batch.set(collection.doc(task.taskId), {
                    taskId: task.taskId,
                    mode: task.mode,
                    isVoice: task.isVoice,
                    difficulty: task.difficulty,
                    payload: task.payload,
                    tags: task.tags,
                    verified: wasPublished,
                    generatedAtMs: nowMs,
                    source: 'ai',
                    aiMeta: {
                        scenario: item.scenario,
                        ruleNote: item.ruleNote,
                        level: params.level,
                        model: cfg.model,
                    },
                }, { merge: true });
                written += 1;
            }
            await batch.commit();
        }
        // Реестр: дописываем ключи/фразы, старьё отрезаем с головы.
        const nextKeys = [...knownKeys].slice(-AI_LEDGER_MAX_KEYS);
        const nextPhrases = knownPhrases.slice(-AI_LEDGER_MAX_PHRASES);
        await ledgerRef.set({ keys: nextKeys, phrases: nextPhrases, updatedAtMs: nowMs }, { merge: true });
    }
    return {
        ok: true,
        dryRun: false,
        accepted: accepted.length,
        rejectedBatches,
        requests,
        written,
        keptPublished,
        samples,
    };
});
function parseEditRequest(data) {
    const record = onlyKeys(data, ['taskId', 'payload', 'difficulty'], 'tournament_edit_invalid');
    const taskId = String(record.taskId ?? '').trim();
    const difficulty = record.difficulty === undefined ? 0 : Number(record.difficulty);
    if (!ID_RE.test(taskId) || !isRecord(record.payload) || Object.keys(record.payload).length === 0
        || !Number.isSafeInteger(difficulty) || difficulty < 0 || difficulty > 3) {
        throw new https_1.HttpsError('invalid-argument', 'tournament_edit_invalid');
    }
    return Object.freeze({ taskId, payload: record.payload, difficulty });
}
/**
 * Правка вопроса/вариантов/ответа в админке. Сохраняем только то, что пройдёт
 * серверный контракт — иначе испорченное задание молча выпало бы из выборки
 * или отменило комнату. Правка опубликованного = правка боевого пула, поэтому
 * требует права публикации. Идущие турниры не затрагиваются: комнаты копируют
 * задания в taskSecrets при заполнении.
 */
exports.adminEditTournamentTask = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    requirePermission(request, 'content.draft.write');
    const params = parseEditRequest(request.data);
    const db = admin.firestore();
    const ref = db.collection(tournament_core_1.TOURNAMENT_TASKS_COLLECTION).doc(params.taskId);
    const snap = await ref.get();
    if (!snap.exists)
        throw new https_1.HttpsError('not-found', 'tournament_task_not_found');
    const existing = snap.data();
    if (existing.verified === true)
        requirePermission(request, 'content.publish');
    const candidate = {
        taskId: params.taskId,
        mode: existing.mode,
        isVoice: existing.isVoice === true,
        // 0 = «не менять» (валидный диапазон пула 1-3); явная проверка вместо
        // falsy — чтобы будущая правка диапазона не сделала 0 молча-игнорируемым.
        difficulty: params.difficulty === 0 ? existing.difficulty : params.difficulty,
        payload: params.payload,
        tags: Array.isArray(existing.tags) ? existing.tags : [],
        verified: existing.verified === true,
    };
    const validation = (0, tournament_core_1.validateTournamentTask)({ ...candidate, verified: true });
    if (!validation.ok) {
        throw new https_1.HttpsError('invalid-argument', `tournament_edit_contract:${validation.reason}`);
    }
    await ref.set({
        payload: params.payload,
        difficulty: candidate.difficulty,
        editedAtMs: Date.now(),
        editedBy: String(request.auth?.token?.email ?? request.auth?.uid ?? 'admin'),
    }, { merge: true });
    return { ok: true, task: publicAdminTask(params.taskId, candidate) };
});
function parseCuratedSetRequest(data) {
    const record = onlyKeys(data, ['slotId', 'timezone', 'dateKey', 'rounds'], 'tournament_curated_invalid');
    const slotId = String(record.slotId ?? '').trim();
    const timezone = String(record.timezone ?? '').trim();
    const dateKey = String(record.dateKey ?? '').trim();
    if (!ID_RE.test(slotId) || !isValidTimezone(timezone) || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
        throw new https_1.HttpsError('invalid-argument', 'tournament_curated_invalid');
    }
    // Пустой rounds = снять кураторский набор. Формат раундов сверяет тот же
    // normalize, что читает планировщик комнат — расхождения быть не может.
    const rounds = Array.isArray(record.rounds) ? record.rounds : [];
    if (rounds.length > 0) {
        const normalizedSet = (0, tournament_core_1.normalizeTournamentCuratedSet)({ slotId, timezone, dateKey, rounds });
        if (!normalizedSet)
            throw new https_1.HttpsError('invalid-argument', 'tournament_curated_rounds_invalid');
        return Object.freeze({ slotId, timezone, dateKey, rounds: normalizedSet.rounds });
    }
    return Object.freeze({ slotId, timezone, dateKey, rounds: [] });
}
exports.adminSetTournamentCurated = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    // Набор попадает в живой турнир напрямую — право уровня публикации.
    requirePermission(request, 'content.publish');
    const params = parseCuratedSetRequest(request.data);
    const db = admin.firestore();
    const roomId = (0, tournament_core_1.tournamentRoomId)(params.slotId, params.timezone, params.dateKey);
    const ref = db.collection(tournament_core_1.TOURNAMENT_CURATED_COLLECTION).doc(roomId);
    if (params.rounds.length === 0) {
        await ref.delete();
        return { ok: true, roomId, cleared: true };
    }
    // Каждое задание набора обязано существовать, быть опубликованным и
    // проходить контракт — иначе владелец соберёт турнир, который молча
    // откатится на случайную выборку.
    const taskIds = Array.from(new Set(params.rounds.flatMap((round) => round.taskIds)));
    const snaps = await db.getAll(...taskIds.map((taskId) => db.collection(tournament_core_1.TOURNAMENT_TASKS_COLLECTION).doc(taskId)));
    const rejected = [];
    for (const snap of snaps) {
        const task = snap.exists ? snap.data() : null;
        if (!task || task.verified !== true
            || !(0, tournament_core_1.validateTournamentTask)({ ...task, taskId: snap.id, verified: true }).ok) {
            rejected.push(snap.id);
        }
    }
    if (rejected.length > 0) {
        return { ok: false, roomId, rejected };
    }
    await ref.set({
        slotId: params.slotId,
        timezone: params.timezone,
        dateKey: params.dateKey,
        rounds: params.rounds.map((round) => ({ roundNo: round.roundNo, taskIds: [...round.taskIds] })),
        updatedAtMs: Date.now(),
        updatedBy: String(request.auth?.token?.email ?? request.auth?.uid ?? 'admin'),
    });
    return { ok: true, roomId, rounds: params.rounds.length };
});
exports.adminGetTournamentCurated = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    requirePermission(request, 'content.read');
    const record = onlyKeys(request.data, ['slotId', 'timezone', 'dateKey'], 'tournament_curated_invalid');
    const slotId = String(record.slotId ?? '').trim();
    const timezone = String(record.timezone ?? '').trim();
    const dateKey = String(record.dateKey ?? '').trim();
    if (!ID_RE.test(slotId) || !isValidTimezone(timezone) || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
        throw new https_1.HttpsError('invalid-argument', 'tournament_curated_invalid');
    }
    const roomId = (0, tournament_core_1.tournamentRoomId)(slotId, timezone, dateKey);
    const snap = await admin.firestore().collection(tournament_core_1.TOURNAMENT_CURATED_COLLECTION).doc(roomId).get();
    if (!snap.exists)
        return { ok: true, roomId, exists: false, rounds: [] };
    const curated = (0, tournament_core_1.normalizeTournamentCuratedSet)(snap.data());
    return {
        ok: true,
        roomId,
        exists: true,
        rounds: curated?.rounds ?? [],
        updatedAtMs: Number(snap.data()?.updatedAtMs ?? 0),
    };
});
// ── Список для ревью ────────────────────────────────────────────────────────
exports.adminListTournamentTasks = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    requirePermission(request, 'content.read');
    const params = parseListRequest(request.data);
    const db = admin.firestore();
    let query = db.collection(tournament_core_1.TOURNAMENT_TASKS_COLLECTION);
    if (params.status === 'draft')
        query = query.where('verified', '==', false);
    if (params.status === 'published')
        query = query.where('verified', '==', true);
    if (params.mode)
        query = query.where('mode', '==', params.mode);
    if (params.difficulty)
        query = query.where('difficulty', '==', params.difficulty);
    if (params.source)
        query = query.where('source', '==', params.source);
    // Курсор по документному id — дешевле offset и не ломается при вставках.
    query = query.orderBy(admin.firestore.FieldPath.documentId()).limit(params.limit);
    if (params.cursor)
        query = query.startAfter(params.cursor);
    const snapshot = await query.get();
    const items = snapshot.docs.map((doc) => publicAdminTask(doc.id, doc.data()));
    return {
        ok: true,
        items,
        nextCursor: snapshot.size === params.limit ? snapshot.docs[snapshot.size - 1].id : '',
    };
});
// ── Публикация / снятие / удаление ──────────────────────────────────────────
exports.adminMutateTournamentTasks = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK, timeoutSeconds: 120 }, async (request) => {
    const params = parseMutateRequest(request.data);
    // Публикация в боевой пул — отдельное право, снятие/удаление тоже:
    // черновик может править контент-редактор, а публиковать — нет.
    requirePermission(request, params.action === 'publish' ? 'content.publish' : 'content.draft.write');
    const db = admin.firestore();
    const collection = db.collection(tournament_core_1.TOURNAMENT_TASKS_COLLECTION);
    let affected = 0;
    const rejected = [];
    for (let i = 0; i < params.taskIds.length; i += WRITE_BATCH_SIZE) {
        const chunk = params.taskIds.slice(i, i + WRITE_BATCH_SIZE);
        const refs = chunk.map((id) => collection.doc(id));
        const snapshots = await db.getAll(...refs);
        const batch = db.batch();
        for (const snapshot of snapshots) {
            if (!snapshot.exists) {
                rejected.push(snapshot.id);
                continue;
            }
            if (params.action === 'delete') {
                batch.delete(snapshot.ref);
                affected += 1;
                continue;
            }
            if (params.action === 'unpublish') {
                batch.update(snapshot.ref, { verified: false, unpublishedAtMs: Date.now() });
                affected += 1;
                continue;
            }
            // publish: пускаем в боевой пул только то, что реально пройдёт
            // серверный валидатор — иначе задание молча выпадет из выборки или
            // отменит комнату с возвратом билетов.
            const task = snapshot.data();
            if (!(0, tournament_core_1.validateTournamentTask)({ ...task, verified: true }).ok) {
                rejected.push(snapshot.id);
                continue;
            }
            batch.update(snapshot.ref, { verified: true, publishedAtMs: Date.now() });
            affected += 1;
        }
        await batch.commit();
    }
    return { ok: true, action: params.action, affected, rejected };
});
// зачем: функция массового удаления пула убрана — владелец уточнил, что
// задания из планов должны ОСТАТЬСЯ в базе, они просто не участвуют в
// турнирах. Неучастие обеспечено фильтром source:'ai' в loadResourcePool
// (tournaments.ts). Возможности стереть пул не существует намеренно:
// неиспользование обратимо, удаление — нет.
// ── Статистика пула ─────────────────────────────────────────────────────────
/** Сколько заданий нужно раунду: 5 вопросов × запас на отсутствие повторов. */
exports.ROUND_TASK_TARGET = 50;
/** Раунд → допустимые сложности (зеркало selectRoundTasks на сервере). */
exports.ROUND_DIFFICULTIES = Object.freeze({
    1: [1], 2: [1, 2], 3: [2], 4: [2, 3],
});
/**
 * Считает пул агрегатами count() — не выкачивает коллекцию.
 * 8 агрегатов вместо чтения тысяч документов: экономия по правилу владельца.
 */
exports.adminTournamentPoolStats = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    requirePermission(request, 'content.read');
    onlyKeys(request.data, [], 'tournament_stats_invalid');
    const db = admin.firestore();
    const collection = db.collection(tournament_core_1.TOURNAMENT_TASKS_COLLECTION);
    // guard-ok: count() — серверный агрегат, документы не читаются
    // (тарифицируется как 1 чтение на агрегат, а не N).
    const [totalAgg, publishedAgg] = await Promise.all([
        collection.count().get(),
        collection.where('verified', '==', true).count().get(),
    ]);
    const byDifficulty = {};
    await Promise.all([1, 2, 3].map(async (difficulty) => {
        // guard-ok: агрегат, не выборка документов
        const agg = await collection
            .where('verified', '==', true)
            .where('difficulty', '==', difficulty)
            .count().get();
        byDifficulty[difficulty] = agg.data().count;
    }));
    // Раздельные пулы владельца: ИИ-генератор и задания из планов. Ещё 4
    // count()-агрегата вместо выкачивания коллекции.
    const sources = {};
    await Promise.all(['ai', 'plan_content'].map(async (source) => {
        // guard-ok: count() — серверные агрегаты, документы не читаются
        const [totalAgg, publishedAgg] = await Promise.all([
            collection.where('source', '==', source).count().get(),
            collection.where('source', '==', source).where('verified', '==', true).count().get(),
        ]);
        const total = totalAgg.data().count;
        const published = publishedAgg.data().count;
        sources[source] = { total, published, drafts: total - published };
    }));
    // Готовность раунда: хватает ли verified-заданий его сложностей.
    const rounds = Object.entries(exports.ROUND_DIFFICULTIES).map(([round, difficulties]) => {
        const available = difficulties.reduce((sum, d) => sum + (byDifficulty[d] ?? 0), 0);
        return {
            round: Number(round),
            difficulties: [...difficulties],
            available,
            ready: available >= exports.ROUND_TASK_TARGET,
        };
    });
    return {
        ok: true,
        total: totalAgg.data().count,
        published: publishedAgg.data().count,
        drafts: totalAgg.data().count - publishedAgg.data().count,
        byDifficulty,
        sources,
        rounds,
        // Режим можно включать, только если каждый раунд наберёт задания.
        poolReady: rounds.every((round) => round.ready),
    };
});
// ── Расписание и включение слотов ───────────────────────────────────────────
exports.adminSetTournamentSchedule = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    // Включение слотов = запуск режима для живых игроков: право публикации.
    requirePermission(request, 'content.publish');
    const params = parseScheduleRequest(request.data);
    const db = admin.firestore();
    const ref = db.collection(tournament_core_1.TOURNAMENT_SCHEDULE_COLLECTION).doc('config');
    // Предохранитель: не даём включить слот при пустом пуле — комнаты будут
    // создаваться и тут же отменяться, списывая билеты и возвращая их обратно.
    if (params.slots.some((slot) => slot.enabled)) {
        // guard-ok: агрегат count(), документы не читаются
        const ready = await db.collection(tournament_core_1.TOURNAMENT_TASKS_COLLECTION)
            .where('verified', '==', true).count().get();
        if (ready.data().count < exports.ROUND_TASK_TARGET) {
            throw new https_1.HttpsError('failed-precondition', `tournament_pool_too_small:${ready.data().count}`);
        }
    }
    // Пишем ровно те поля, что читает readTournamentSchedule в tournament_core:
    // slotId/localTime/timezone/ticketsRequired/enabled + freeWeeklyEntry и
    // ticketGemValue на верхнем уровне. Любое расхождение = слот молча
    // отбрасывается планировщиком и турнир не стартует.
    await ref.set({
        slots: params.slots.map((slot) => ({
            slotId: slot.slotId,
            localTime: slot.localTime,
            timezone: slot.timezone,
            ticketsRequired: slot.ticketsRequired,
            enabled: slot.enabled,
        })),
        freeWeeklyEntry: params.freeWeeklyEntry,
        ticketGemValue: params.ticketGemValue,
        updatedAtMs: Date.now(),
    }, { merge: true });
    return { ok: true, slots: params.slots.length };
});
exports.adminGetTournamentSchedule = (0, https_1.onCall)({ region: REGION, enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK }, async (request) => {
    requirePermission(request, 'content.read');
    onlyKeys(request.data, [], 'tournament_schedule_get_invalid');
    const snapshot = await admin.firestore()
        .collection(tournament_core_1.TOURNAMENT_SCHEDULE_COLLECTION).doc('config').get();
    if (!snapshot.exists)
        return { ok: true, exists: false, slots: [], timezone: 'Europe/Moscow' };
    const data = snapshot.data() ?? {};
    return {
        ok: true,
        exists: true,
        slots: Array.isArray(data.slots) ? data.slots : [],
        timezone: typeof data.timezone === 'string' ? data.timezone : 'Europe/Moscow',
        updatedAtMs: Number(data.updatedAtMs ?? 0),
    };
});
//# sourceMappingURL=admin_tournament_tasks.js.map