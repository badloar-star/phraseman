"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_QUIZ_EXPLANATION_CHARS = exports.MAX_QUIZ_WRONG_OPTIONS = void 0;
exports.validateQuizInput = validateQuizInput;
exports.parseQuizBatch = parseQuizBatch;
/**
 * Deterministic input gate + output parser for THEMATIC-QUIZ explanations.
 * PURE logic, no firebase-admin — unit-testable. NO AI here; this is the cheap layer that runs
 * before the paid judge. Reuses the explain-feature length limits. Sibling of choice_explain_gates.
 */
const explain_gates_1 = require("./explain_gates");
/** Max number of wrong options we will explain in one batch (a quiz question shows 4 = 3 wrong). */
exports.MAX_QUIZ_WRONG_OPTIONS = 6;
/** UI-sized hard cap for one generated quiz line; prompts ask for 160 chars, parser enforces headroom. */
exports.MAX_QUIZ_EXPLANATION_CHARS = 190;
function asString(value) {
    return typeof value === 'string' ? value : '';
}
function validateQuizInput(input) {
    const correctEn = asString(input.correctEn).trim();
    if (!correctEn)
        return { ok: false, reason: 'correct_empty' };
    if (correctEn.length > explain_gates_1.MAX_PHRASE_LEN)
        return { ok: false, reason: 'correct_too_long' };
    const meaning = asString(input.questionPrompt).trim();
    if (!meaning)
        return { ok: false, reason: 'meaning_empty' };
    if (meaning.length > explain_gates_1.MAX_MEANING_LEN)
        return { ok: false, reason: 'meaning_too_long' };
    const correctKey = correctEn.toLowerCase();
    const raw = Array.isArray(input.wrongOptions) ? input.wrongOptions : [];
    const cleaned = [];
    const seen = new Set();
    for (const d of raw) {
        const text = asString(d).trim();
        if (!text)
            continue;
        if (text.length > explain_gates_1.MAX_PHRASE_LEN)
            return { ok: false, reason: 'option_too_long' };
        const key = text.toLowerCase();
        if (key === correctKey)
            continue; // never explain the correct option as a "wrong" one
        if (seen.has(key))
            continue;
        seen.add(key);
        cleaned.push(text);
        if (cleaned.length >= exports.MAX_QUIZ_WRONG_OPTIONS)
            break;
    }
    if (cleaned.length === 0)
        return { ok: false, reason: 'no_wrong_options' };
    return { ok: true, wrongOptions: cleaned };
}
function clampLine(text) {
    const clean = asString(text).replace(/\s+/g, ' ').trim();
    if (clean.length <= exports.MAX_QUIZ_EXPLANATION_CHARS)
        return clean;
    const clipped = clean.slice(0, exports.MAX_QUIZ_EXPLANATION_CHARS);
    const sentenceEnd = Math.max(clipped.lastIndexOf('. '), clipped.lastIndexOf('! '), clipped.lastIndexOf('? '), clipped.lastIndexOf('… '));
    const wordEnd = clipped.lastIndexOf(' ');
    const boundary = sentenceEnd >= 40 ? sentenceEnd + 1 : (wordEnd >= 40 ? wordEnd : exports.MAX_QUIZ_EXPLANATION_CHARS - 1);
    const base = clipped
        .slice(0, boundary)
        .replace(/[\s,;:–-]+$/u, '')
        .trim();
    if (/[.!?…]["»”')\]]*$/u.test(base))
        return base;
    return `${base.slice(0, exports.MAX_QUIZ_EXPLANATION_CHARS - 1).trim()}…`;
}
/**
 * Parse the model's STRICT-JSON batch reply into { confirm, options }.
 * Tolerates code-fenced JSON. Returns ok=false if JSON is unrecoverable, confirm is empty,
 * or any requested wrong option is missing. We must not publish partial ready caches: the
 * client maps explanations by selected option text, so a missing option would look like a
 * disappeared explanation and every retry would keep reading the same broken cache.
 * Keys are matched to the requested wrong options case-insensitively so minor casing drift in
 * the model output still maps back to the canonical option string.
 */
function parseQuizBatch(raw, requestedWrongOptions) {
    let body = asString(raw).trim();
    // strip a leading/trailing ```json fence if present
    const fence = body.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence)
        body = fence[1].trim();
    let parsed;
    try {
        parsed = JSON.parse(body);
    }
    catch {
        return { ok: false, confirm: '', options: {} };
    }
    if (!parsed || typeof parsed !== 'object')
        return { ok: false, confirm: '', options: {} };
    const obj = parsed;
    const confirm = clampLine(obj.confirm);
    const rawMap = (obj.options && typeof obj.options === 'object'
        ? obj.options
        : {});
    // Build a case-insensitive lookup of what the model returned, then map onto requested keys.
    const lower = new Map();
    for (const [k, v] of Object.entries(rawMap)) {
        const line = clampLine(v);
        if (line)
            lower.set(k.trim().toLowerCase(), line);
    }
    const options = {};
    for (const d of requestedWrongOptions) {
        const hit = lower.get(d.trim().toLowerCase());
        if (hit)
            options[d] = hit;
    }
    if (!confirm)
        return { ok: false, confirm: '', options };
    const hasEveryRequestedOption = requestedWrongOptions.every((d) => !!options[d]);
    if (!hasEveryRequestedOption)
        return { ok: false, confirm, options };
    return { ok: true, confirm, options };
}
//# sourceMappingURL=quiz_explain_gates.js.map