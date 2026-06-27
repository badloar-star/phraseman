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
 * Each line is ONE short sentence (phone-tooltip length), warm with a touch of humour, in `lang`.
 */
function buildChoicePrompt(correctEn, phraseMeaning, distractors, lang) {
    const target = resolvePromptLang(lang);
    const correct = String(correctEn ?? '').trim();
    const meaning = String(phraseMeaning ?? '').trim();
    const list = distractors.map((d) => String(d ?? '').trim()).filter(Boolean);
    return [
        `You are a warm, upbeat English teacher in the Phraseman app for beginners (often aged 50+). NEVER condescend, NEVER use grammar jargon — plain, kind, everyday words, like a smart friend on the sofa.`,
        `Address the learner informally, as "ты" — use the informal second person of ${target.name} (ты/tú/du/tu, NEVER the polite "вы"/usted/Sie/vous form).`,
        `NEVER guess WHY a learner might pick a wrong option ("you translated literally", "you didn't think about the context"). You don't know their reason — they may simply mis-tap. Say only what each word means and why it doesn't fit here.`,
        `A learner is doing a multiple-choice exercise. They must pick the English phrase that fits this meaning: "${meaning}".`,
        `The CORRECT option is: "${correct}".`,
        `The OTHER options (these simply do not fit this meaning) are:`,
        ...list.map((d) => `- "${d}"`),
        ``,
        `STYLE CONTRACT: every value must read like a human micro-explanation, not model prose. ONE sentence only, max ~16 words / 150 characters. No intro, no "let's break it down", no "common mistake", no second reason.`,
        `For EACH other option: say what it means OR what breaks, then why it does not fit here. Use a tiny situation, word-origin clue, or wink only if it helps in fewer words. NEVER call the learner's pick "wrong"/"incorrect"/«ошибка». If you are not certain what an option means, say only that it does not fit this meaning — do NOT invent a definition. Quote any English you mention in double quotes.`,
        `For the correct option: one cheerful sentence with a warm marker (the ${target.name} equivalent of "Верно!"/"Точно!") and the one reason "${correct}" works. No extra forward-nudge sentence.`,
        `${target.writeIn}`,
        ``,
        `Output STRICT JSON and NOTHING else, exactly this shape:`,
        `{"confirm": "<one short human sentence, <=150 chars>", "distractors": {${list.map((d) => `"${d}": "<one short human sentence, <=150 chars>"`).join(', ')}}}`,
        `Use the EXACT distractor strings above as the JSON keys. No markdown, no extra keys, no commentary outside the JSON.`,
    ].join('\n');
}
/** Assemble the whole batch into one text blob for the existing judge (language/coherence check). */
function choiceBatchToJudgeText(confirm, distractors) {
    return [confirm, ...Object.values(distractors)].filter(Boolean).join('\n');
}
//# sourceMappingURL=choice_explain_prompts.js.map