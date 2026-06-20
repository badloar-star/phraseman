"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_CHOICE_DISTRACTORS = void 0;
exports.validateChoiceInput = validateChoiceInput;
exports.parseChoiceBatch = parseChoiceBatch;
/**
 * Deterministic input gate + output parser for CHOICE-exercise explanations.
 * PURE logic, no firebase-admin — unit-testable. NO AI here; this is the cheap layer
 * that runs before the paid judge. Reuses the explain-feature length limits.
 */
const explain_gates_1 = require("./explain_gates");
/** Max number of distractors we will explain in one batch (matches the exercise option cap). */
exports.MAX_CHOICE_DISTRACTORS = 8;
function asString(value) {
    return typeof value === 'string' ? value : '';
}
function validateChoiceInput(input) {
    const correctEn = asString(input.correctEn).trim();
    if (!correctEn)
        return { ok: false, reason: 'correct_empty' };
    if (correctEn.length > explain_gates_1.MAX_PHRASE_LEN)
        return { ok: false, reason: 'correct_too_long' };
    const meaning = asString(input.phraseMeaning).trim();
    if (!meaning)
        return { ok: false, reason: 'meaning_empty' };
    if (meaning.length > explain_gates_1.MAX_MEANING_LEN)
        return { ok: false, reason: 'meaning_too_long' };
    const raw = Array.isArray(input.distractors) ? input.distractors : [];
    const cleaned = [];
    const seen = new Set();
    for (const d of raw) {
        const text = asString(d).trim();
        if (!text)
            continue;
        if (text.length > explain_gates_1.MAX_PHRASE_LEN)
            return { ok: false, reason: 'distractor_too_long' };
        const key = text.toLowerCase();
        if (seen.has(key))
            continue;
        seen.add(key);
        cleaned.push(text);
        if (cleaned.length >= exports.MAX_CHOICE_DISTRACTORS)
            break;
    }
    if (cleaned.length === 0)
        return { ok: false, reason: 'no_distractors' };
    return { ok: true, distractors: cleaned };
}
function clampLine(text) {
    return asString(text).replace(/\s+/g, ' ').trim().slice(0, 400);
}
/**
 * Parse the model's STRICT-JSON batch reply into { confirm, distractors }.
 * Tolerates code-fenced JSON. Returns ok=false if JSON is unrecoverable or confirm is empty.
 * Keys are matched to the requested distractors case-insensitively so minor casing drift in
 * the model output still maps back to the canonical option string.
 */
function parseChoiceBatch(raw, requestedDistractors) {
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
        return { ok: false, confirm: '', distractors: {} };
    }
    if (!parsed || typeof parsed !== 'object')
        return { ok: false, confirm: '', distractors: {} };
    const obj = parsed;
    const confirm = clampLine(obj.confirm);
    const rawMap = (obj.distractors && typeof obj.distractors === 'object'
        ? obj.distractors
        : {});
    // Build a case-insensitive lookup of what the model returned, then map onto requested keys.
    const lower = new Map();
    for (const [k, v] of Object.entries(rawMap)) {
        const line = clampLine(v);
        if (line)
            lower.set(k.trim().toLowerCase(), line);
    }
    const distractors = {};
    for (const d of requestedDistractors) {
        const hit = lower.get(d.trim().toLowerCase());
        if (hit)
            distractors[d] = hit;
    }
    if (!confirm)
        return { ok: false, confirm: '', distractors };
    return { ok: true, confirm, distractors };
}
//# sourceMappingURL=choice_explain_gates.js.map