"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildChoicePrompt = buildChoicePrompt;
exports.choiceBatchToJudgeText = choiceBatchToJudgeText;
/**
 * Prompts for CHOICE-exercise explanations.
 *
 * One generation produces a BATCH: a short confirmation for the correct option, plus a short
 * "why this one doesn't fit here" line for EACH distractor. Voice: warm, a little humour, a
 * little encouragement — written in the learner's UI language. STRICT JSON output so the
 * orchestrator can parse the batch and cache it per option.
 *
 * PURE strings/logic, no firebase-admin — unit-testable.
 */
const explain_prompts_1 = require("./explain_prompts");
function resolvePromptLang(lang) {
    return explain_prompts_1.PROMPT_LANGUAGES[(0, explain_prompts_1.resolvePromptLangKey)(lang)];
}
/**
 * Build the batched generation prompt. The model is asked to return STRICT JSON:
 *   { "confirm": "<praise for the correct answer>",
 *     "distractors": { "<exact distractor text>": "<why it doesn't fit>", ... } }
 * Each line is ONE short sentence (max ~18 words), warm with a touch of humour, in `lang`.
 */
function buildChoicePrompt(correctEn, phraseMeaning, distractors, lang) {
    const target = resolvePromptLang(lang);
    const correct = String(correctEn ?? '').trim();
    const meaning = String(phraseMeaning ?? '').trim();
    const list = distractors.map((d) => String(d ?? '').trim()).filter(Boolean);
    return [
        `You are a warm, upbeat English teacher in the Phraseman app for beginners (often aged 50+). NEVER condescend, NEVER use grammar jargon — plain, kind, everyday words, with a light touch of friendly humour and encouragement.`,
        `A learner is doing a multiple-choice exercise. They must pick the English phrase that fits this meaning: "${meaning}".`,
        `The CORRECT option is: "${correct}".`,
        `The WRONG options (distractors) are:`,
        ...list.map((d) => `- "${d}"`),
        ``,
        `Produce, for EACH wrong option, ONE short friendly sentence explaining WHY it does not fit here (what it actually means or why it's wrong in this spot) — max ~18 words, warm, a little playful, never mean. Quote any English you mention in double quotes.`,
        `Also produce ONE short cheerful confirmation for when the learner picks the correct option — celebrate briefly and say in one breath why "${correct}" is the natural choice.`,
        `${target.writeIn}`,
        ``,
        `Output STRICT JSON and NOTHING else, exactly this shape:`,
        `{"confirm": "<one short sentence>", "distractors": {${list.map((d) => `"${d}": "<one short sentence>"`).join(', ')}}}`,
        `Use the EXACT distractor strings above as the JSON keys. No markdown, no extra keys, no commentary outside the JSON.`,
    ].join('\n');
}
/** Assemble the whole batch into one text blob for the existing judge (language/coherence check). */
function choiceBatchToJudgeText(confirm, distractors) {
    return [confirm, ...Object.values(distractors)].filter(Boolean).join('\n');
}
//# sourceMappingURL=choice_explain_prompts.js.map