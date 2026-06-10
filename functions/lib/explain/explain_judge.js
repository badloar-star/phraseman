"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.heuristicPreFilter = heuristicPreFilter;
exports.judgeExplanation = judgeExplanation;
/**
 * AI-judge for "Explain like I'm five" — Validation level 3 (meaning/safety).
 *
 * Two stages:
 *  1. heuristicPreFilter (deterministic, 0 tokens): wraps explain_gates.heuristicReject — empty,
 *     too-short, wrong-script. Obvious garbage is rejected WITHOUT spending a judge call.
 *  2. A SEPARATE cheap gpt-4o-mini call (max_tokens ~30, temperature 0, strict-JSON system prompt)
 *     for the "smooth nonsense / wrong language / toxic / off-topic" cases the heuristic misses.
 *
 * FAIL-CLOSED: the public cache is the asymmetric risk (one bad answer reaches thousands). If the
 * judge response does not parse, is missing `ok`, or `ok` is not a real boolean ⇒ verdict ok:false
 * with reason 'incoherent'. We NEVER publish text we are unsure about.
 *
 * The verdict's `reason` is always within JUDGE_REASONS (it is written to server-only billing).
 */
const explain_gates_1 = require("./explain_gates");
const explain_provider_1 = require("./explain_provider");
const explain_prompts_1 = require("./explain_prompts");
const JUDGE_MODEL = 'gpt-4o-mini';
const JUDGE_MAX_TOKENS = 30;
const JUDGE_TEMPERATURE = 0;
const REASON_SET = new Set(explain_prompts_1.JUDGE_REASONS);
/**
 * Deterministic pre-filter. Returns a reject reason (within the enum) for obvious garbage so the
 * caller can skip the paid judge call, or null to let the text proceed to the AI judge.
 * Delegates the wrong-script / empty / too-short logic to plan-01's heuristicReject (language-aware:
 * a Cyrillic Russian explanation is the EXPECTED script for lang=ru and is NOT rejected).
 */
function heuristicPreFilter(text, lang) {
    const reason = (0, explain_gates_1.heuristicReject)(text, lang);
    return reason; // 'empty' | 'too_short' | 'non_target_language' are all in JUDGE_REASONS
}
/** Coerce a parsed judge object into a safe verdict, or null if it is not a usable verdict. */
function verdictFromParsed(parsed) {
    if (!parsed || typeof parsed !== 'object')
        return null;
    const obj = parsed;
    if (typeof obj.ok !== 'boolean')
        return null; // missing/non-boolean ok ⇒ unusable
    const rawReason = typeof obj.reason === 'string' ? obj.reason : '';
    if (obj.ok === true) {
        // Passing verdict: normalize reason to 'ok' (never trust an echoed/odd reason on success).
        return { ok: true, reason: 'ok' };
    }
    // Failing verdict: keep the reason only if it is in the fixed enum (and not the passing value);
    // anything else (echoed phrase, invented reason) collapses to 'incoherent'.
    const reason = REASON_SET.has(rawReason) && rawReason !== 'ok'
        ? rawReason
        : 'incoherent';
    return { ok: false, reason };
}
/**
 * Parse the model's JSON reply fail-closed. Accepts a clean JSON object or one embedded in extra
 * prose (extracts the first {...} block). Anything unparseable ⇒ null (caller treats as ok:false).
 */
function parseJudgeReply(raw) {
    const s = String(raw ?? '').trim();
    if (!s)
        return null;
    const tryParse = (candidate) => {
        try {
            return verdictFromParsed(JSON.parse(candidate));
        }
        catch {
            return null;
        }
    };
    const direct = tryParse(s);
    if (direct)
        return direct;
    // Some models wrap JSON in prose/code fences despite instructions — extract the first object.
    const start = s.indexOf('{');
    const end = s.lastIndexOf('}');
    if (start !== -1 && end > start) {
        return tryParse(s.slice(start, end + 1));
    }
    return null;
}
/**
 * Judge a generated explanation. Returns a fail-closed verdict.
 * Heuristic first (0 tokens on obvious garbage); otherwise one cheap gpt-4o-mini call.
 * On ANY parse/shape failure of the model reply ⇒ ok:false, reason:'incoherent' (fail-closed).
 */
async function judgeExplanation(params) {
    const { text, lang, apiKey } = params;
    const heuristic = heuristicPreFilter(text, lang);
    if (heuristic) {
        // Obvious garbage — reject without spending a judge call.
        return { ok: false, reason: heuristic, promptTokens: 0, completionTokens: 0 };
    }
    let result;
    try {
        result = await (0, explain_provider_1.openAiChat)({
            apiKey,
            model: JUDGE_MODEL,
            messages: [
                { role: 'system', content: explain_prompts_1.JUDGE_SYSTEM_PROMPT },
                { role: 'user', content: (0, explain_prompts_1.buildJudgeUserPrompt)(text, lang) },
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
    const parsed = parseJudgeReply(result.text);
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
//# sourceMappingURL=explain_judge.js.map