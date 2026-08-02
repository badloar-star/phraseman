"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.judgeCompassComment = judgeCompassComment;
/**
 * Компас — судья тёплого комментария дня. Клон judgeExplanation, но с ПРАВИЛЬНЫМ контрактом.
 *
 * WHY THIS EXISTS: compassGenerate первоначально валидировал день-комментарий фразовым судьёй
 * (judgeExplanation), который проверяет «объяснение ОДНОЙ английской фразы» и режет всё, что «не про
 * фразу», как off_topic. День-комментарий Компаса — тёплая строка про ДЕНЬ ученика, английской фразы
 * в ней нет → фразовый судья браковал ВСЕ комментарии (весь кэш = rejected/off_topic). Этот судья
 * проверяет реальный контракт Компаса: короткая, добрая, на нужном языке, связная строка.
 *
 * FAIL-CLOSED: публичный кэш — асимметричный риск (один плохой ответ уходит тысячам). Любой сбой
 * парсинга/формы/провайдера ⇒ ok:false, reason:'incoherent'. Никогда не публикуем то, в чём не уверены.
 *
 * Переиспользует общий fail-closed парсер (parseJsonJudgeReply) и эвристику (heuristicReject) из
 * explain-слоя — единый источник правды для обоих судей.
 */
const explain_gates_1 = require("../explain/explain_gates");
const explain_provider_1 = require("../explain/explain_provider");
const explain_judge_1 = require("../explain/explain_judge");
const compass_prompts_1 = require("./compass_prompts");
const JUDGE_MODEL = 'gpt-4o-mini';
const JUDGE_MAX_TOKENS = 30;
const JUDGE_TEMPERATURE = 0;
const REASON_SET = new Set(compass_prompts_1.COMPASS_JUDGE_REASONS);
/**
 * Judge a generated Compass day-comment. Returns a fail-closed verdict.
 * Heuristic first (0 tokens on obvious garbage: empty / too-short / wrong-script); otherwise one
 * cheap gpt-4o-mini call. On ANY parse/shape/provider failure ⇒ ok:false, reason:'incoherent'.
 */
async function judgeCompassComment(params) {
    const { text, langKey, apiKey } = params;
    const heuristic = (0, explain_gates_1.heuristicReject)(text, langKey);
    if (heuristic) {
        // Obvious garbage (empty / too_short / non_target_language) — reject without a judge call.
        return { ok: false, reason: heuristic, promptTokens: 0, completionTokens: 0 };
    }
    let result;
    try {
        result = await (0, explain_provider_1.openAiChat)({
            apiKey,
            model: JUDGE_MODEL,
            messages: [
                { role: 'system', content: compass_prompts_1.COMPASS_JUDGE_SYSTEM_PROMPT },
                { role: 'user', content: (0, compass_prompts_1.buildCompassJudgeUserPrompt)(text, langKey) },
            ],
            maxTokens: JUDGE_MAX_TOKENS,
            temperature: JUDGE_TEMPERATURE,
            responseFormat: { type: 'json_object' }, // double-defense; fail-closed parsing is the real guard
        });
    }
    catch {
        // Provider failure on the JUDGE call must NOT publish unvalidated text → fail closed.
        return { ok: false, reason: 'incoherent', promptTokens: 0, completionTokens: 0 };
    }
    const parsed = (0, explain_judge_1.parseJsonJudgeReply)(result.text, REASON_SET, 'incoherent');
    if (!parsed) {
        // Unparseable / wrong-shape reply ⇒ fail closed, but still bill the call we made.
        return {
            ok: false,
            reason: 'incoherent',
            promptTokens: result.promptTokens,
            completionTokens: result.completionTokens,
        };
    }
    return {
        ok: parsed.ok,
        reason: parsed.reason,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
    };
}
//# sourceMappingURL=compass_judge.js.map