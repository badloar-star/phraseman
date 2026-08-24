import { openAiChat } from './explain/explain_provider';
import type { ParsedKindItem } from './tournament_ai_kind_items';

export const TOURNAMENT_VALIDATOR_REASONS = [
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
] as const;

export type TournamentValidatorReason = typeof TOURNAMENT_VALIDATOR_REASONS[number];

export type TournamentValidatorVerdict = {
  readonly ok: boolean;
  readonly reason: TournamentValidatorReason;
  readonly feedback: string;
};

const REASONS = new Set<string>(TOURNAMENT_VALIDATOR_REASONS);
const FALLBACK_FEEDBACK = 'Проверка ИИ вернула непонятный результат.';
const OPTION_MATRIX_FEEDBACK = 'Проверка вариантов не подтверждает единственный ответ.';
const MAX_FEEDBACK_CHARS = 360;
const PART_OF_SPEECH_PATTERN = /^[a-z][a-z_ -]{1,47}$/i;

function fallbackVerdict(): TournamentValidatorVerdict {
  return { ok: false, reason: 'incoherent', feedback: FALLBACK_FEEDBACK };
}

/** Strict, fail-closed parser. Feedback is deliberately bounded before it reaches a repair prompt. */
function optionMatrixMatches(
  value: Record<string, unknown>,
  item: ParsedKindItem,
): boolean {
  if (item.kind === 'assembly') return true;
  if (!Array.isArray(value.optionChecks) || value.optionChecks.length !== item.options.length) return false;
  const checks = value.optionChecks.map((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
    const check = entry as Record<string, unknown>;
    const keys = Object.keys(check).sort();
    if (keys.join('|') !== 'grammaticallyValid|index|minimalTwin|partOfSpeech|reason|valid'
      || !Number.isInteger(check.index)
      || typeof check.valid !== 'boolean'
      || typeof check.grammaticallyValid !== 'boolean'
      || check.valid !== check.grammaticallyValid
      || check.minimalTwin !== true
      || typeof check.partOfSpeech !== 'string'
      || !PART_OF_SPEECH_PATTERN.test(check.partOfSpeech.trim())
      || typeof check.reason !== 'string'
      || !check.reason.trim()) return null;
    return {
      index: Number(check.index),
      valid: check.valid,
      partOfSpeech: check.partOfSpeech.trim().toLocaleLowerCase('en'),
    };
  });
  if (checks.some((check) => check === null)) return false;
  if (new Set(checks.map((check) => check!.partOfSpeech)).size !== 1) return false;
  const byIndex = new Map(checks.map((check) => [check!.index, check!.valid]));
  if (byIndex.size !== item.options.length) return false;
  return item.options.every((_, index) => {
    const expectedValid = item.kind === 'oddity'
      ? index !== item.correctIndex
      : index === item.correctIndex;
    return byIndex.get(index) === expectedValid;
  });
}

export function parseTournamentValidatorReply(
  raw: string,
  item: ParsedKindItem,
): TournamentValidatorVerdict {
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(raw ?? '').trim());
  } catch {
    return fallbackVerdict();
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return fallbackVerdict();
  const value = parsed as Record<string, unknown>;
  if (typeof value.ok !== 'boolean') return fallbackVerdict();
  if (value.ok === true) {
    if (!optionMatrixMatches(value, item)) {
      return { ok: false, reason: 'ambiguity', feedback: OPTION_MATRIX_FEEDBACK };
    }
    return { ok: true, reason: 'ok', feedback: '' };
  }
  const reason = typeof value.reason === 'string' ? value.reason : '';
  const feedback = typeof value.feedback === 'string' ? value.feedback.trim().slice(0, MAX_FEEDBACK_CHARS) : '';
  if (!REASONS.has(reason) || reason === 'ok' || !feedback) return fallbackVerdict();
  return { ok: false, reason: reason as TournamentValidatorReason, feedback };
}

export function buildTournamentValidatorPrompt(item: ParsedKindItem): string {
  return [
    'You are the independent quality gate for a Russian-speaking English tournament.',
    'Judge exactly one task and its post-game explanation. Do not rewrite it.',
    'Check every option independently before judging the declared answer. For situation and gap, the declared answer must be the only grammatically valid option and ALL THREE distractors must be grammatically impossible in the completed sentence. A merely rude, contextual, stylistic, collocational, or meaning-based mismatch is not enough.',
    'All four choice options must be minimal twins testing the same part of speech. For oddity, invert the matrix: exactly three grammatical minimal twins and exactly the declared answer grammatically invalid. Two questionable or broken options is always ambiguity.',
    'Reject if the answer key is wrong, options are ambiguous or unfair, any distractor is not a minimal twin, parts of speech differ, the explanation fails to prove each grammatical error, the example is unnatural/wrong, text is too long for mobile, or the tone is insulting.',
    'Return JSON only: {"ok":boolean,"reason":"ok|answer_key|ambiguity|distractor|explanation|example|wrong_language|length|style|incoherent","feedback":"","optionChecks":[{"index":0,"valid":boolean,"grammaticallyValid":boolean,"minimalTwin":true,"partOfSpeech":"tested grammatical role","reason":"concrete independent grammatical assessment"}]}. For every choice task optionChecks must contain every index exactly once; valid and grammaticallyValid must agree.',
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
      wrongOptionReasons: item.wrongOptionReasons,
    }),
  ].join('\n');
}

export function buildTournamentAdversarialValidatorPrompt(item: ParsedKindItem): string {
  return [
    'You are the adversarial ambiguity reviewer for a Russian-speaking English tournament.',
    'Try to disprove that the declared answer is unique. Do not trust the generator or the first reviewer.',
    'Evaluate every option independently as grammar, not merely meaning or style. For situation and gap, reject unless the declared answer is grammatical and all three distractors are definitely ungrammatical minimal twins in the same part of speech. For oddity, reject unless exactly the declared option is broken and all other three are grammatical minimal twins.',
    'Return JSON only: {"ok":boolean,"reason":"ok|answer_key|ambiguity|distractor|explanation|example|wrong_language|length|style|incoherent","feedback":"","optionChecks":[{"index":0,"valid":boolean,"grammaticallyValid":boolean,"minimalTwin":true,"partOfSpeech":"tested grammatical role","reason":"concrete independent grammatical assessment"}]}. Include every option index exactly once; valid and grammaticallyValid must agree.',
    JSON.stringify({
      kind: item.kind,
      prompt: item.prompt,
      options: item.options,
      correctIndex: item.correctIndex,
      correctAnswer: item.correctAnswer,
      scenario: item.scenario,
      ruleNote: item.ruleNote,
      example: item.example,
      wrongOptionReasons: item.wrongOptionReasons,
    }),
  ].join('\n');
}

type MeteredVerdict = TournamentValidatorVerdict & {
  readonly promptTokens: number;
  readonly completionTokens: number;
};

async function runTournamentJudge(params: {
  readonly apiKey: string;
  readonly model: string;
  readonly item: ParsedKindItem;
  readonly prompt: string;
}): Promise<MeteredVerdict> {
  try {
    const result = await openAiChat({
      apiKey: params.apiKey,
      model: params.model,
      messages: [{ role: 'user', content: params.prompt }],
      maxTokens: 520,
      temperature: 0,
      responseFormat: { type: 'json_object' },
    });
    return { ...parseTournamentValidatorReply(result.text, params.item), promptTokens: result.promptTokens, completionTokens: result.completionTokens };
  } catch {
    return { ...fallbackVerdict(), promptTokens: 0, completionTokens: 0 };
  }
}

export async function judgeTournamentTask(params: {
  readonly apiKey: string;
  readonly model: string;
  readonly item: ParsedKindItem;
}): Promise<MeteredVerdict> {
  return runTournamentJudge({ ...params, prompt: buildTournamentValidatorPrompt(params.item) });
}

/** Fail closed unless primary and adversarial reviewers independently agree. */
export async function judgeTournamentTaskPair(params: {
  readonly apiKey: string;
  readonly model: string;
  readonly item: ParsedKindItem;
}): Promise<MeteredVerdict> {
  const [primary, adversarial] = await Promise.all([
    judgeTournamentTask(params),
    runTournamentJudge({
      ...params,
      prompt: buildTournamentAdversarialValidatorPrompt(params.item),
    }),
  ]);
  const failure = !primary.ok ? primary : !adversarial.ok ? adversarial : null;
  return {
    ok: failure === null,
    reason: failure?.reason ?? 'ok',
    feedback: failure?.feedback ?? '',
    promptTokens: primary.promptTokens + adversarial.promptTokens,
    completionTokens: primary.completionTokens + adversarial.completionTokens,
  };
}
