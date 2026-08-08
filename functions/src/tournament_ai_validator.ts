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
const MAX_FEEDBACK_CHARS = 360;

function fallbackVerdict(): TournamentValidatorVerdict {
  return { ok: false, reason: 'incoherent', feedback: FALLBACK_FEEDBACK };
}

/** Strict, fail-closed parser. Feedback is deliberately bounded before it reaches a repair prompt. */
export function parseTournamentValidatorReply(raw: string): TournamentValidatorVerdict {
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(raw ?? '').trim());
  } catch {
    return fallbackVerdict();
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return fallbackVerdict();
  const value = parsed as Record<string, unknown>;
  if (typeof value.ok !== 'boolean') return fallbackVerdict();
  if (value.ok === true) return { ok: true, reason: 'ok', feedback: '' };
  const reason = typeof value.reason === 'string' ? value.reason : '';
  const feedback = typeof value.feedback === 'string' ? value.feedback.trim().slice(0, MAX_FEEDBACK_CHARS) : '';
  if (!REASONS.has(reason) || reason === 'ok' || !feedback) return fallbackVerdict();
  return { ok: false, reason: reason as TournamentValidatorReason, feedback };
}

export function buildTournamentValidatorPrompt(item: ParsedKindItem): string {
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

export async function judgeTournamentTask(params: {
  readonly apiKey: string;
  readonly model: string;
  readonly item: ParsedKindItem;
}): Promise<TournamentValidatorVerdict & { readonly promptTokens: number; readonly completionTokens: number }> {
  try {
    const result = await openAiChat({
      apiKey: params.apiKey,
      model: params.model,
      messages: [{ role: 'user', content: buildTournamentValidatorPrompt(params.item) }],
      maxTokens: 240,
      temperature: 0,
      responseFormat: { type: 'json_object' },
    });
    return { ...parseTournamentValidatorReply(result.text), promptTokens: result.promptTokens, completionTokens: result.completionTokens };
  } catch {
    return { ...fallbackVerdict(), promptTokens: 0, completionTokens: 0 };
  }
}
