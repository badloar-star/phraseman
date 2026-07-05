"use strict";
// ════════════════════════════════════════════════════════════════════════════
// shard_survey_core.ts — чистое ядро опросов за осколки (без firebase-admin).
//
// Здесь только чистые функции: парсинг конфига опроса, валидация ответов,
// таргетинг аудитории, инкремент агрегата. Юнит-тесты тривиальны (нет Firestore).
// Callable-обёртка и транзакции — в shard_survey.ts (по образцу пары
// arena_season.ts / arena_season_config.ts).
// ════════════════════════════════════════════════════════════════════════════
Object.defineProperty(exports, "__esModule", { value: true });
exports.MIN_DAYS_BETWEEN_SURVEYS_FLOOR = exports.DEFAULT_MIN_DAYS_BETWEEN_SURVEYS = exports.REWARD_SHARDS_MAX = exports.REWARD_SHARDS_MIN = exports.SURVEY_ID_RE = exports.SUPPORTED_SURVEY_LANGS = void 0;
exports.parseLocalizedString = parseLocalizedString;
exports.resolveLocalized = resolveLocalized;
exports.parseSurveyConfig = parseSurveyConfig;
exports.validateAnswers = validateAnswers;
exports.matchesAudience = matchesAudience;
exports.passesCooldown = passesCooldown;
exports.incrementStats = incrementStats;
exports.validateSurveyConfigForWrite = validateSurveyConfigForWrite;
exports.SUPPORTED_SURVEY_LANGS = [
    'ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl',
];
exports.SURVEY_ID_RE = /^[a-z0-9_]+$/;
exports.REWARD_SHARDS_MIN = 1;
exports.REWARD_SHARDS_MAX = 20;
exports.DEFAULT_MIN_DAYS_BETWEEN_SURVEYS = 7;
// Пол анти-спама: даже если админ поставит 0, сервер держит минимум 1 день между
// опросами. Иначе опрос с cooldown=0 обходит глобальную метку shard_survey_last_at_ms
// и юзер проходит цепочку опросов подряд, фармя осколки (аудит 2026-07-05).
exports.MIN_DAYS_BETWEEN_SURVEYS_FLOOR = 1;
const TEXT_ANSWER_MAX = 500;
const OPTION_ID_MAX = 40;
function asRecord(value) {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value
        : {};
}
function text(value, max) {
    return String(value ?? '').trim().slice(0, max);
}
function toBool(value) {
    return value === true || value === 'true' || value === 1 || value === '1';
}
function toInt(value, fallback) {
    const n = Math.trunc(Number(value));
    return Number.isFinite(n) ? n : fallback;
}
/** Парс локализованной строки. Требует непустой `ru`; иначе null. */
function parseLocalizedString(value) {
    const raw = asRecord(value);
    const ru = text(raw.ru, 300);
    if (!ru)
        return null;
    const out = { ru };
    for (const lang of exports.SUPPORTED_SURVEY_LANGS) {
        if (lang === 'ru')
            continue;
        const v = text(raw[lang], 300);
        if (v)
            out[lang] = v;
    }
    return out;
}
/** Разрешить локализованную строку в конкретный язык с fallback на ru. */
function resolveLocalized(str, lang) {
    const key = lang;
    return str[key] || str.ru;
}
function parseAudience(value) {
    const raw = asRecord(value);
    const tierRaw = text(raw.tier, 20);
    const tier = tierRaw === 'free' || tierRaw === 'premium' ? tierRaw : 'any';
    const minLessons = raw.minLessons == null ? null : Math.max(0, toInt(raw.minLessons, 0));
    const maxLessons = raw.maxLessons == null ? null : Math.max(0, toInt(raw.maxLessons, 0));
    const platformsRaw = Array.isArray(raw.platforms) ? raw.platforms : [];
    const platforms = platformsRaw
        .map((p) => text(p, 10))
        .filter((p) => p === 'ios' || p === 'android');
    return { tier, minLessons, maxLessons, platforms };
}
function parseQuestion(value) {
    const raw = asRecord(value);
    const id = text(raw.id, 60).replace(/[^a-z0-9_]/gi, '_');
    if (!id)
        return null;
    const type = raw.type === 'text' ? 'text' : 'single_choice';
    const qText = parseLocalizedString(raw.text);
    if (!qText)
        return null;
    if (type === 'text') {
        return { id, type, text: qText, options: [] };
    }
    const optionsRaw = Array.isArray(raw.options) ? raw.options : [];
    const options = [];
    for (const o of optionsRaw) {
        const or = asRecord(o);
        const oid = text(or.id, OPTION_ID_MAX).replace(/[^a-z0-9_]/gi, '_');
        const label = parseLocalizedString(or.label);
        if (oid && label)
            options.push({ id: oid, label });
    }
    if (options.length < 2)
        return null; // single_choice требует ≥2 вариантов
    return { id, type, text: qText, options };
}
/**
 * Парс конфига опроса из Firestore-документа. Возвращает null, если документ
 * структурно невалиден (нет id, нет вопросов, битые локали). НИКОГДА не бросает.
 */
function parseSurveyConfig(value) {
    const raw = asRecord(value);
    const surveyId = text(raw.surveyId, 80);
    if (!exports.SURVEY_ID_RE.test(surveyId))
        return null;
    const title = parseLocalizedString(raw.title);
    const subtitle = parseLocalizedString(raw.subtitle) ?? { ru: '' };
    if (!title)
        return null;
    const questionsRaw = Array.isArray(raw.questions) ? raw.questions : [];
    const questions = [];
    for (const q of questionsRaw) {
        const parsed = parseQuestion(q);
        if (parsed)
            questions.push(parsed);
    }
    if (questions.length === 0)
        return null;
    // Дубликаты id вопросов недопустимы.
    const ids = new Set(questions.map((q) => q.id));
    if (ids.size !== questions.length)
        return null;
    const rewardShards = Math.min(exports.REWARD_SHARDS_MAX, Math.max(exports.REWARD_SHARDS_MIN, toInt(raw.rewardShards, 3)));
    const minDaysBetweenSurveys = Math.max(exports.MIN_DAYS_BETWEEN_SURVEYS_FLOOR, toInt(raw.minDaysBetweenSurveys, exports.DEFAULT_MIN_DAYS_BETWEEN_SURVEYS));
    return {
        surveyId,
        enabled: toBool(raw.enabled),
        title,
        subtitle,
        rewardShards,
        minDaysBetweenSurveys,
        audience: parseAudience(raw.audience),
        questions,
        createdAtMs: toInt(raw.createdAtMs, 0),
        updatedAtMs: toInt(raw.updatedAtMs, 0),
        updatedBy: text(raw.updatedBy, 80),
    };
}
/**
 * Валидация ответов пользователя по вопросам ЭТОГО опроса.
 * - single_choice: optionId обязан быть из списка options; comment опционален.
 * - text: обязателен непустой comment (≤500), optionId := 'comment'.
 * Лишние ключи в input игнорируются; порядок задают вопросы конфига.
 */
function validateAnswers(questions, input) {
    const raw = asRecord(input);
    if (Object.keys(raw).length === 0 && questions.length > 0) {
        return { ok: false, error: 'answers_required' };
    }
    const out = {};
    for (const question of questions) {
        const row = asRecord(raw[question.id]);
        const comment = text(row.comment, TEXT_ANSWER_MAX);
        if (question.type === 'text') {
            if (!comment)
                return { ok: false, error: `comment_required:${question.id}` };
            out[question.id] = { optionId: 'comment', comment };
            continue;
        }
        const optionId = text(row.optionId, OPTION_ID_MAX);
        const allowed = question.options.some((o) => o.id === optionId);
        if (!allowed)
            return { ok: false, error: `invalid_option:${question.id}` };
        out[question.id] = comment ? { optionId, comment } : { optionId };
    }
    return { ok: true, answers: out };
}
/** Проходит ли пользователь по аудитории опроса. */
function matchesAudience(audience, ctx) {
    if (audience.tier === 'free' && ctx.isPremium)
        return false;
    if (audience.tier === 'premium' && !ctx.isPremium)
        return false;
    if (audience.minLessons != null && ctx.lessonsCompleted < audience.minLessons)
        return false;
    if (audience.maxLessons != null && ctx.lessonsCompleted > audience.maxLessons)
        return false;
    if (audience.platforms.length > 0) {
        const p = ctx.platform === 'ios' || ctx.platform === 'android' ? ctx.platform : '';
        if (!p || !audience.platforms.includes(p))
            return false;
    }
    return true;
}
/** Прошёл ли достаточно дней с прошлого показанного/пройденного опроса. */
function passesCooldown(lastSurveyAtMs, minDaysBetweenSurveys, nowMs) {
    if (lastSurveyAtMs <= 0 || minDaysBetweenSurveys <= 0)
        return true;
    const elapsedDays = (nowMs - lastSurveyAtMs) / (24 * 60 * 60 * 1000);
    return elapsedDays >= minDaysBetweenSurveys;
}
function incrementStats(prev, answers, nowMs) {
    const base = {
        totalResponses: toInt(prev?.totalResponses, 0),
        perQuestion: {},
        lastResponseAtMs: toInt(prev?.lastResponseAtMs, 0),
    };
    // Глубокая копия prev.perQuestion (иммутабельность).
    const prevPer = (prev?.perQuestion ?? {});
    for (const [qid, opts] of Object.entries(prevPer)) {
        base.perQuestion[qid] = { ...opts };
    }
    for (const [qid, answer] of Object.entries(answers)) {
        const optionId = answer.optionId || 'unknown';
        if (!base.perQuestion[qid])
            base.perQuestion[qid] = {};
        base.perQuestion[qid][optionId] = toInt(base.perQuestion[qid][optionId], 0) + 1;
    }
    return {
        totalResponses: base.totalResponses + 1,
        perQuestion: base.perQuestion,
        lastResponseAtMs: nowMs,
    };
}
/** Валидация конфига перед записью из админки. Возвращает список ошибок. */
function validateSurveyConfigForWrite(value) {
    const errors = [];
    const raw = asRecord(value);
    const surveyId = text(raw.surveyId, 80);
    if (!exports.SURVEY_ID_RE.test(surveyId))
        errors.push('surveyId_invalid');
    if (!parseLocalizedString(raw.title))
        errors.push('title_ru_required');
    const reward = toInt(raw.rewardShards, 3);
    if (reward < exports.REWARD_SHARDS_MIN || reward > exports.REWARD_SHARDS_MAX) {
        errors.push('reward_out_of_range');
    }
    const questionsRaw = Array.isArray(raw.questions) ? raw.questions : [];
    if (questionsRaw.length === 0)
        errors.push('questions_required');
    const seenIds = new Set();
    for (const q of questionsRaw) {
        const qr = asRecord(q);
        const qid = text(qr.id, 60);
        if (!qid)
            errors.push('question_id_required');
        if (qid && seenIds.has(qid))
            errors.push(`question_id_duplicate:${qid}`);
        seenIds.add(qid);
        if (!parseLocalizedString(qr.text))
            errors.push(`question_text_ru_required:${qid || '?'}`);
        const type = qr.type === 'text' ? 'text' : 'single_choice';
        const opts = Array.isArray(qr.options) ? qr.options : [];
        if (type === 'single_choice' && opts.length < 2) {
            errors.push(`question_needs_2_options:${qid || '?'}`);
        }
        if (type === 'text' && opts.length > 0) {
            errors.push(`text_question_no_options:${qid || '?'}`);
        }
    }
    return errors;
}
//# sourceMappingURL=shard_survey_core.js.map