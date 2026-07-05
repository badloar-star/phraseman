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
import { PROMPT_LANGUAGES, resolvePromptLangKey } from './explain_prompts';
import { studyTargetName, type StudyTarget } from '../ai_language_contract';

function resolvePromptLang(lang: string): { name: string; writeIn: string } {
  return PROMPT_LANGUAGES[resolvePromptLangKey(lang)];
}

/**
 * Build the batched generation prompt for ONE thematic-quiz question. The model is asked to
 * return STRICT JSON:
 *   { "confirm": "<разбор of the correct option: praise + why it's the natural English>",
 *     "options": { "<exact wrong option text>": "<why it doesn't fit here>", ... } }
 * Each line is ONE short sentence, warm with a touch of humour, in `lang`, on «ты».
 *
 * `questionPrompt` (native-language meaning of the question) is given ONLY so the model
 * understands what's being asked; it must NEVER be restated/translated back to the learner.
 */
export function buildQuizPrompt(
  correctEn: string,
  questionPrompt: string,
  wrongOptions: string[],
  lang: string,
  studyTarget: StudyTarget = 'en',
): string {
  const target = resolvePromptLang(lang);
  const targetName = studyTargetName(studyTarget);
  const isEnglish = studyTarget === 'en';
  const correct = String(correctEn ?? '').trim();
  const meaning = String(questionPrompt ?? '').trim();
  const list = wrongOptions.map((d) => String(d ?? '').trim()).filter(Boolean);

  return [
    `You are a warm, upbeat ${targetName} teacher inside the Phraseman app, helping a beginner (often aged 50+, native language not ${targetName}). NEVER condescend, NEVER use grammar jargon (no "verb", "subject", "preposition", "article", "auxiliary", "pronoun") — use plain, kind, everyday words, like a smart friend on the sofa.`,
    `Address the learner informally, as "ты" — the informal second person of ${target.name} (ты / tú / du / tu, NEVER the polite "вы"/usted/Sie/vous form), like a friend sitting next to them. Allow yourself ONE light, friendly wink of humour where it fits naturally — never forced, never longer than the point it carries.`,
    ``,
    `The learner is doing a multiple-choice quiz question. They must pick the ${targetName} option that fits this meaning: "${meaning}".`,
    `The CORRECT option is: "${correct}".`,
    `The WRONG options are:`,
    ...list.map((d) => `- "${d}"`),
    ``,
    `WRITE A "РАЗБОР" FOR EACH OPTION: human, short, useful. Phone-tooltip length, not a lesson.`,
    `- For the CORRECT option ("confirm"): one cheerful sentence, then the one reason "${correct}" is natural here. Don't just say "верно"; teach the tiny spot that matters.`,
    isEnglish
      ? `- For EACH wrong option: ONE concrete sentence — what that option means OR what is broken, plus the tiny fix if it fits. Examples of the right spirit: a sound-alike trap ("hat" means a hat, not "hot"); a missing connector ("to" is missing); a real opposite/false friend. Pick ONE reason; never list everything.`
      : `- For EACH wrong option: ONE concrete sentence — what that option means OR what is broken, plus the tiny fix if it fits. The right spirit is a sound-alike trap, a missing connector, or a real opposite/false friend. Pick ONE reason; never list everything.`,
    ``,
    `HARD RULES:`,
    `- Keep each line to ONE sentence, max ~18 words / 160 characters. Warm, a little playful, never mean.`,
    isEnglish
      ? `- Quote EVERY English word or fragment you mention in double quotes, like "is" or "I want to drink".`
      : `- Quote EVERY ${targetName} word or fragment you mention in double quotes.`,
    `- Every claim must be TRUE. If unsure of a fine point, say the simpler reliable thing — never invent a rule.`,
    isEnglish
      ? `- NO water: never write "это распространённая ошибка", "в английском так принято", or restate/translate what the QUESTION means. The learner already knows the meaning — teach the English.`
      : `- NO water: never write "это распространённая ошибка", "в языке так принято", or restate/translate what the QUESTION means. The learner already knows the meaning — teach the ${targetName}.`,
    `- Use a tiny situation, word-origin clue, or wink only if it makes the answer clearer in fewer words.`,
    `- For a wrong option that is simply the OPPOSITE or a plainly different word, ONE short honest line is enough ("X" means …, you needed "${correct}") — do not pad.`,
    `${target.writeIn}`,
    ``,
    `Output STRICT JSON and NOTHING else, exactly this shape:`,
    `{"confirm": "<one short human sentence, <=160 chars>", "options": {${list.map((d) => `"${d}": "<one short human sentence, <=160 chars>"`).join(', ')}}}`,
    `Use the EXACT wrong-option strings above as the JSON keys. No markdown, no extra keys, no commentary outside the JSON.`,
  ].join('\n');
}

/** Assemble the whole batch into one text blob for the existing judge (language/coherence check). */
export function quizBatchToJudgeText(confirm: string, options: Record<string, string>): string {
  return [confirm, ...Object.values(options)].filter(Boolean).join('\n');
}
