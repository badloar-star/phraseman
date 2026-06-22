"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildQuizPrompt = buildQuizPrompt;
exports.quizBatchToJudgeText = quizBatchToJudgeText;
/**
 * Prompts for THEMATIC-QUIZ "разбор" explanations (isolated to thematic quizzes only —
 * the easy/medium/hard difficulty quizzes keep their hand-authored static explanations,
 * which are the STYLE REFERENCE for the voice below).
 *
 * One generation produces a BATCH: a warm "разбор" for the correct option (praise + WHY it's
 * the natural English here), plus a short, concrete "почему этот вариант не тот" line for EACH
 * wrong option (what that option actually means / what's broken / how to fix). STRICT JSON output
 * so the orchestrator can parse the batch and cache it per option, keyed by the EXACT option text.
 *
 * VOICE (locked to the Phraseman Bible + the easy/medium/hard quiz exemplars in app/quiz_data.ts):
 *   - Address the learner informally, as "ты" — the informal second person of the UI language
 *     (ты / tú / du / tu, NEVER the polite "вы"/usted/Sie/vous).
 *   - Warm, like a friend sitting next to them, with a LIGHT, natural wink of humour where it fits.
 *   - Concrete and useful: teach the ONE governing distinction, show what the wrong word really
 *     means, give the fix. NO water ("это распространённая ошибка", "в английском просто так",
 *     restating what the question implies). NO grammar jargon (verb/subject/preposition/article).
 *   - Quote every English bit in double quotes.
 *
 * PURE strings/logic, no firebase-admin — unit-testable.
 */
const explain_prompts_1 = require("./explain_prompts");
function resolvePromptLang(lang) {
    return explain_prompts_1.PROMPT_LANGUAGES[(0, explain_prompts_1.resolvePromptLangKey)(lang)];
}
/**
 * Build the batched generation prompt for ONE thematic-quiz question. The model is asked to
 * return STRICT JSON:
 *   { "confirm": "<разбор of the correct option: praise + why it's the natural English>",
 *     "options": { "<exact wrong option text>": "<why it doesn't fit here>", ... } }
 * Each line is ONE or two short sentences, warm with a touch of humour, in `lang`, on «ты».
 *
 * `questionPrompt` (native-language meaning of the question) is given ONLY so the model
 * understands what's being asked; it must NEVER be restated/translated back to the learner.
 */
function buildQuizPrompt(correctEn, questionPrompt, wrongOptions, lang) {
    const target = resolvePromptLang(lang);
    const correct = String(correctEn ?? '').trim();
    const meaning = String(questionPrompt ?? '').trim();
    const list = wrongOptions.map((d) => String(d ?? '').trim()).filter(Boolean);
    return [
        `You are a warm, upbeat English teacher inside the Phraseman app, helping a beginner (often aged 50+, native language not English). NEVER condescend, NEVER use grammar jargon (no "verb", "subject", "preposition", "article", "auxiliary", "pronoun") — use plain, kind, everyday words.`,
        `Address the learner informally, as "ты" — the informal second person of ${target.name} (ты / tú / du / tu, NEVER the polite "вы"/usted/Sie/vous form), like a friend sitting next to them. Allow yourself ONE light, friendly wink of humour where it fits naturally — never forced, never longer than the point it carries.`,
        ``,
        `The learner is doing a multiple-choice quiz question. They must pick the English option that fits this meaning: "${meaning}".`,
        `The CORRECT option is: "${correct}".`,
        `The WRONG options are:`,
        ...list.map((d) => `- "${d}"`),
        ``,
        `WRITE A "РАЗБОР" (a short, concrete breakdown) FOR EACH OPTION, in this spirit (this is the exact style of the app's best quizzes):`,
        `- For the CORRECT option ("confirm"): one cheerful breath of praise, then in plain words WHY "${correct}" is the natural English choice here — the one thing that makes it right. Don't just say "верно"; teach the one spot that matters.`,
        `- For EACH wrong option: ONE short, concrete line — what that option ACTUALLY means or what is broken in it, and (if useful) the tiny fix. Examples of the right spirit: a sound-alike trap ("hat" means a hat, not "hot"); a wrong little word ("does" doesn't go with a state like "hot" — you need "is"); a missing connector ("to" is missing between the two words); a real opposite/false friend (what the picked word truly means). Pick the ONE governing reason; never list everything.`,
        ``,
        `HARD RULES:`,
        `- Keep each line short: ~1–2 sentences, max ~28 words. Warm, a little playful, never mean.`,
        `- Quote EVERY English word or fragment you mention in double quotes, like "is" or "I want to drink".`,
        `- Every claim must be TRUE. If unsure of a fine point, say the simpler reliable thing — never invent a rule.`,
        `- NO water: never write "это распространённая ошибка", "в английском так принято", or restate/translate what the QUESTION means. The learner already knows the meaning — teach the English.`,
        `- For a wrong option that is simply the OPPOSITE or a plainly different word, ONE short honest line is enough ("X" means …, you needed "${correct}") — do not pad.`,
        `${target.writeIn}`,
        ``,
        `Output STRICT JSON and NOTHING else, exactly this shape:`,
        `{"confirm": "<one or two short sentences>", "options": {${list.map((d) => `"${d}": "<one or two short sentences>"`).join(', ')}}}`,
        `Use the EXACT wrong-option strings above as the JSON keys. No markdown, no extra keys, no commentary outside the JSON.`,
    ].join('\n');
}
/** Assemble the whole batch into one text blob for the existing judge (language/coherence check). */
function quizBatchToJudgeText(confirm, options) {
    return [confirm, ...Object.values(options)].filter(Boolean).join('\n');
}
//# sourceMappingURL=quiz_explain_prompts.js.map