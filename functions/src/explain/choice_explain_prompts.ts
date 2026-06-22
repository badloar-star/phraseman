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
import { PROMPT_LANGUAGES, resolvePromptLangKey } from './explain_prompts';

function resolvePromptLang(lang: string): { name: string; writeIn: string } {
  return PROMPT_LANGUAGES[resolvePromptLangKey(lang)];
}

/**
 * Build the batched generation prompt. The model is asked to return STRICT JSON:
 *   { "confirm": "<praise for the correct answer>",
 *     "distractors": { "<exact distractor text>": "<why it doesn't fit>", ... } }
 * Each line is ONE short sentence (max ~12 words, ideally under 10), warm with a touch of humour, in `lang`.
 */
export function buildChoicePrompt(
  correctEn: string,
  phraseMeaning: string,
  distractors: string[],
  lang: string,
): string {
  const target = resolvePromptLang(lang);
  const correct = String(correctEn ?? '').trim();
  const meaning = String(phraseMeaning ?? '').trim();
  const list = distractors.map((d) => String(d ?? '').trim()).filter(Boolean);

  return [
    `You are a warm, upbeat English teacher in the Phraseman app for beginners (often aged 50+). NEVER condescend, NEVER use grammar jargon — plain, kind, everyday words, with a light touch of friendly humour and encouragement.`,
    `Address the learner informally, as "ты" — use the informal second person of ${target.name} (ты/tú/du/tu, NEVER the polite "вы"/usted/Sie/vous form).`,
    `NEVER guess WHY a learner might pick a wrong option ("you translated literally", "you didn't think about the context"). You don't know their reason — they may simply mis-tap. Say only what each word means and why it doesn't fit here.`,
    `A learner is doing a multiple-choice exercise. They must pick the English phrase that fits this meaning: "${meaning}".`,
    `The CORRECT option is: "${correct}".`,
    `The OTHER options (these simply do not fit this meaning) are:`,
    ...list.map((d) => `- "${d}"`),
    ``,
    `Produce, for EACH other option, ONE short friendly sentence saying what it means and why it does not fit here — max ~12 words, ideally under 10, one simple clause, warm, a little playful, never mean. NEVER call the learner's pick "wrong"/"incorrect"/«ошибка» — just explain the difference. If you are not certain what an option means, say only that it does not fit this meaning — do NOT invent a definition. Quote any English you mention in double quotes.`,
    `Also produce ONE short cheerful confirmation for when the learner picks the correct option — start with a warm marker (the ${target.name} equivalent of "Верно!"/"Точно!"), say in one short sentence why "${correct}" is the natural choice, and end with a tiny forward nudge (the ${target.name} for "идём дальше").`,
    `${target.writeIn}`,
    ``,
    `Output STRICT JSON and NOTHING else, exactly this shape:`,
    `{"confirm": "<one short sentence>", "distractors": {${list.map((d) => `"${d}": "<one short sentence>"`).join(', ')}}}`,
    `Use the EXACT distractor strings above as the JSON keys. No markdown, no extra keys, no commentary outside the JSON.`,
  ].join('\n');
}

/** Assemble the whole batch into one text blob for the existing judge (language/coherence check). */
export function choiceBatchToJudgeText(confirm: string, distractors: Record<string, string>): string {
  return [confirm, ...Object.values(distractors)].filter(Boolean).join('\n');
}
