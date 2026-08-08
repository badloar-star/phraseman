"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOURNAMENT_VALIDATOR_REASONS = void 0;
exports.parseTournamentValidatorReply = parseTournamentValidatorReply;
exports.buildTournamentValidatorPrompt = buildTournamentValidatorPrompt;
exports.judgeTournamentTask = judgeTournamentTask;
const explain_provider_1 = require("./explain/explain_provider");
exports.TOURNAMENT_VALIDATOR_REASONS = [
    'ok',
    'answer_key',
    'ambiguity',
    'distractor',
    'explanation',
    'example',
    'wrong_language',
    'length',
    'style',
    'incoherent',
];
const REASONS = new Set(exports.TOURNAMENT_VALIDATOR_REASONS);
const FALLBACK_FEEDBACK = 'Проверка ИИ вернула непонятный результат.';
const MAX_FEEDBACK_CHARS = 360;
function fallbackVerdict() {
    return { ok: false, reason: 'incoherent', feedback: FALLBACK_FEEDBACK };
}
/** Strict, fail-closed parser. Feedback is deliberately bounded before it reaches a repair prompt. */
function parseTournamentValidatorReply(raw) {
    let parsed;
    try {
        parsed = JSON.parse(String(raw ?? '').trim());
    }
    catch {
        return fallbackVerdict();
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
        return fallbackVerdict();
    const value = parsed;
    if (typeof value.ok !== 'boolean')
        return fallbackVerdict();
    if (value.ok === true)
        return { ok: true, reason: 'ok', feedback: '' };
    const reason = typeof value.reason === 'string' ? value.reason : '';
    const feedback = typeof value.feedback === 'string' ? value.feedback.trim().slice(0, MAX_FEEDBACK_CHARS) : '';
    if (!REASONS.has(reason) || reason === 'ok' || !feedback)
        return fallbackVerdict();
    return { ok: false, reason: reason, feedback };
}
function buildTournamentValidatorPrompt(item) {
    return [
        'You are the independent quality gate for a Russian-speaking English tournament.',
        'Judge exactly one task and its post-game explanation. Do not rewrite it.',
        'Reject if the answer key is wrong, options are ambiguous or unfair, distractors are weak, the explanation fails to explain the trap, the example is unnatural/wrong, text is too long for mobile, or the tone is insulting.',
        'Return JSON only: {"ok":boolean,"reason":"ok|answer_key|ambiguity|distractor|explanation|example|wrong_language|length|style|incoherent","feedback":""}.',
        'If rejected, feedback must be Russian, concrete, and tell the generator exactly what to repair (max 240 characters).',
        JSON.stringify({
            kind: item.kind,
            prompt: item.prompt,
            options: item.options,
            correctIndex: item.correctIndex,
            correctAnswer: item.correctAnswer,
            correctTokens: item.correctTokens,
            scenario: item.scenario,
            ruleNote: item.ruleNote,
            example: item.example,
        }),
    ].join('\n');
}
async function judgeTournamentTask(params) {
    try {
        const result = await (0, explain_provider_1.openAiChat)({
            apiKey: params.apiKey,
            model: params.model,
            messages: [{ role: 'user', content: buildTournamentValidatorPrompt(params.item) }],
            maxTokens: 240,
            temperature: 0,
            responseFormat: { type: 'json_object' },
        });
        return { ...parseTournamentValidatorReply(result.text), promptTokens: result.promptTokens, completionTokens: result.completionTokens };
    }
    catch {
        return { ...fallbackVerdict(), promptTokens: 0, completionTokens: 0 };
    }
}
//# sourceMappingURL=tournament_ai_validator.js.map