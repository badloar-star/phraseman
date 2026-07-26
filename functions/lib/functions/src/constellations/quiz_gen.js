"use strict";
// ════════════════════════════════════════════════════════════════════════════
// quiz_gen.ts — генератор вопросов «Созвездий» (Фаза 2 по ai-gen-master-index).
//
// Поток: генератор (openAiChat, JSON-режим) → код-фильтр+судья (quiz_gen_judge)
// → запись прошедших в constellation_quizzes с correctIndex ЧИСЛОМ (схема кэша).
// Кэш читает deal.ts::fetchFromCache (status='ready', level, rand, options,
// correctIndex, question). Job 'constellations' (openai_jobs_config): модель+
// кап+рубильник. Стоимость под контролем: генерим ТОЛЬКО когда запас мал (крон/
// warmQuestionCache зовут с нужным count), каждый вопрос валидируется fail-closed.
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
exports.parseGenReply = parseGenReply;
exports.generateConstellationQuizzes = generateConstellationQuizzes;
const admin = __importStar(require("firebase-admin"));
const explain_provider_1 = require("../explain/explain_provider");
const openai_jobs_config_1 = require("../openai_jobs_config");
const quiz_gen_judge_1 = require("./quiz_gen_judge");
const QUIZZES = 'constellation_quizzes';
const GEN_MAX_TOKENS = 900;
const GEN_TEMPERATURE = 0.8;
/** Просим у модели с запасом — часть отсеет грейдер. */
const OVERGEN_FACTOR = 2;
function buildGenPrompt(level, count) {
    return [
        `Generate ${count} multiple-choice English grammar/vocabulary questions at CEFR level ${level}.`,
        'Each question tests ONE clear point (verb form, preposition, word choice, phrasal verb, etc.).',
        'Rules:',
        '- Exactly 4 options per question, EXACTLY ONE correct.',
        '- Distractors must be plausible-but-wrong (common learner mistakes), not nonsense.',
        '- No option repeats; no "all/none of the above".',
        '- Keep the question one short sentence, use "___" for a gap where natural.',
        'Return STRICT JSON only, shape:',
        '{"questions":[{"question":"...","options":["a","b","c","d"],"correctIndex":0}]}',
    ].join('\n');
}
/** Парсит ответ генератора fail-safe: любой сбой формы → пустой список. */
function parseGenReply(raw) {
    let obj;
    try {
        const s = String(raw ?? '').trim();
        const start = s.indexOf('{');
        const end = s.lastIndexOf('}');
        obj = JSON.parse(start !== -1 && end > start ? s.slice(start, end + 1) : s);
    }
    catch {
        return [];
    }
    const arr = obj?.questions;
    if (!Array.isArray(arr))
        return [];
    const out = [];
    for (const q of arr) {
        const o = q;
        const question = typeof o.question === 'string' ? o.question : '';
        const options = Array.isArray(o.options) ? o.options.map((x) => String(x)) : [];
        const correctIndex = typeof o.correctIndex === 'number' ? o.correctIndex : -1;
        if (question && options.length > 0)
            out.push({ question, options, correctIndex });
    }
    return out;
}
/** FNV-хэш строки → float [0,1) для поля rand (как randFromId в банке). */
function randFromString(s) {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i += 1) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0) / 0xffffffff;
}
/**
 * Генерирует до `count` валидных вопросов уровня `level` и пишет их в кэш.
 * apiKey передаётся вызывающим (крон/warm — читают секрет). Никогда не бросает
 * на сбое отдельного вопроса: невалидные тихо отсеиваются грейдером.
 */
async function generateConstellationQuizzes(level, count, apiKey) {
    const db = admin.firestore();
    const cfg = await (0, openai_jobs_config_1.resolveJobConfig)(db, 'constellations');
    // Рубильник: выключено админом → ничего не генерим (игра берёт из банка).
    if (!cfg.enabled)
        return { requested: count, generated: 0, accepted: 0, skipped: true };
    const askFor = Math.max(1, Math.min(20, count * OVERGEN_FACTOR));
    let genText;
    try {
        const res = await (0, explain_provider_1.openAiChat)({
            apiKey,
            model: cfg.model,
            messages: [{ role: 'user', content: buildGenPrompt(level, askFor) }],
            maxTokens: GEN_MAX_TOKENS,
            temperature: GEN_TEMPERATURE,
            responseFormat: { type: 'json_object' },
        });
        genText = res.text;
    }
    catch (e) {
        console.warn('constellation quiz gen: provider failed', level, e);
        return { requested: count, generated: 0, accepted: 0, skipped: false };
    }
    const candidates = parseGenReply(genText);
    let accepted = 0;
    const now = Date.now();
    for (const raw of candidates) {
        if (accepted >= count)
            break;
        const candidate = { ...raw, level };
        const verdict = await (0, quiz_gen_judge_1.judgeQuizCandidate)(candidate, apiKey);
        if (!verdict.ok)
            continue; // не прошёл грейдер — в кэш НЕ пишем (fail-closed)
        // qid детерминирован от содержания (дедуп по повторной генерации того же).
        const qid = `cg_${level}_${Math.floor(randFromString(candidate.question) * 1e9).toString(36)}`;
        await db.collection(QUIZZES).doc(qid).set({
            status: 'ready',
            level,
            question: candidate.question,
            options: candidate.options,
            correctIndex: candidate.correctIndex, // ЧИСЛО (схема кэша, не текст!)
            rand: randFromString(qid),
            source: 'ai',
            createdAt: now,
        }, { merge: true });
        accepted += 1;
    }
    return { requested: count, generated: candidates.length, accepted, skipped: false };
}
//# sourceMappingURL=quiz_gen.js.map