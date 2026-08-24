export type LearningV2TaskDistractorDimension =
  | 'agreement'
  | 'auxiliary'
  | 'order'
  | 'polarity'
  | 'preposition'
  | 'collocation'
  | 'sound'
  | 'orthography'
  | 'semantic_neighbor';

export type LearningV2TaskDistractorEvidence = Readonly<{
  value: string;
  reasonCode: string;
}>;

export type LearningV2TaskDistractor = Readonly<{
  value: string;
  sourceValue: string;
  correct: string;
  testedDimension: LearningV2TaskDistractorDimension;
}>;

export type LearningV2TaskDistractorSelection = Readonly<{
  responseMode: 'extra_tokens' | 'single_tokens' | 'whole_phrases';
  correct: string;
  distractors: readonly [LearningV2TaskDistractor, LearningV2TaskDistractor];
}>;

type Input = Readonly<{
  family: string;
  target: string;
  rejectedAnswers: readonly LearningV2TaskDistractorEvidence[];
  sessionOrdinal?: number;
}>;

const FORM_TOKENS = new Set([
  'am', 'is', 'are', 'do', 'does', "i'm", "you're", "he's", "she's", "it's",
  "we're", "they're", "isn't", "aren't",
]);
const PREPOSITIONS = new Set(['at', 'in', 'on', 'to']);
const SUBJECT_PRONOUNS = new Set(['i', 'you', 'he', 'she', 'it', 'we', 'they']);
const POLARITY = /^(?:not|isn['’]t|aren['’]t)$/iu;

function normalized(value: string): string {
  return value.normalize('NFKC').replace(/[’]/gu, "'").toLowerCase();
}

function normalizedExact(value: string): string {
  return value.normalize('NFKC').replace(/[’]/gu, "'").trim();
}

function targetTokens(target: string): readonly string[] {
  return target.replace(/[?.!,]+$/gu, '').split(/\s+/u).filter(Boolean);
}

function evidenceCorrect(answer: LearningV2TaskDistractorEvidence): string {
  return answer.reasonCode.split(':')[1] ?? '';
}

function caseLike(value: string, reference: string): string {
  if (/^\p{Lu}/u.test(reference))
    return value.slice(0, 1).toLocaleUpperCase('en') + value.slice(1);
  return value;
}

function dimension(
  correct: string,
  alternative: string,
  reasonCode: string,
): LearningV2TaskDistractorDimension {
  const correctKey = normalized(correct);
  const alternativeKey = normalized(alternative);
  if (PREPOSITIONS.has(correctKey)) return 'preposition';
  if (alternativeKey === 'do' || alternativeKey === 'does') return 'auxiliary';
  if (POLARITY.test(alternative)) return 'polarity';
  if (FORM_TOKENS.has(correctKey)) return 'agreement';
  const trapType = reasonCode.split(':')[0];
  if (trapType === 'phonetic') return 'sound';
  if (trapType === 'orthographic') return 'orthography';
  if (trapType === 'collocation_pragmatics' || trapType === 'phrase_assembly')
    return 'collocation';
  return 'semantic_neighbor';
}

function replacementsFor(
  correct: string,
  rejectedAnswers: readonly LearningV2TaskDistractorEvidence[],
  allowPolarity: boolean,
): readonly LearningV2TaskDistractorEvidence[] {
  const correctKey = normalized(correct);
  const seen = new Set<string>();
  return rejectedAnswers.filter((answer) => {
    if (normalized(evidenceCorrect(answer)) !== correctKey) return false;
    const valueKey = normalized(answer.value);
    const isCaseSensitiveOrthographicTrap =
      answer.reasonCode.split(':')[0] === 'orthographic' &&
      normalizedExact(answer.value) !== normalizedExact(correct);
    const seenKey = isCaseSensitiveOrthographicTrap
      ? normalizedExact(answer.value)
      : valueKey;
    if (
      !valueKey ||
      (valueKey === correctKey && !isCaseSensitiveOrthographicTrap) ||
      seen.has(seenKey)
    ) return false;
    if (!allowPolarity && POLARITY.test(answer.value)) return false;
    seen.add(seenKey);
    return true;
  });
}

function session14PrepositionCandidates(
  target: string,
  correct: string,
  rejectedAnswers: readonly LearningV2TaskDistractorEvidence[],
): readonly LearningV2TaskDistractorEvidence[] {
  const desiredByTarget: Readonly<Record<string, readonly string[]>> = {
    'I am at home.': ['in', 'on'],
    'You are in class.': ['at', 'on'],
    'I am at work.': ['to', 'on'],
    'You are in the park.': ['at', 'on'],
    'I am on the bus.': ['in', 'at'],
  };
  const desired = desiredByTarget[target];
  const available = replacementsFor(correct, rejectedAnswers, false);
  if (!desired) return available;
  return desired.flatMap((value) => {
    const match = available.find((candidate) => normalized(candidate.value) === value);
    return match ? [match] : [];
  });
}

function replaceToken(target: string, index: number, replacement: string): string {
  const terminal = target.match(/[?.!,]+$/u)?.[0] ?? '';
  const tokens = targetTokens(target);
  return tokens
    .map((token, tokenIndex) => tokenIndex === index ? caseLike(replacement, token) : token)
    .join(' ') + terminal;
}

function pair(
  family: string,
  target: string,
  correct: string,
  tokenIndex: number,
  candidates: readonly LearningV2TaskDistractorEvidence[],
  responseMode: LearningV2TaskDistractorSelection['responseMode'],
): LearningV2TaskDistractorSelection {
  const chosen = candidates.slice(0, 2);
  if (chosen.length !== 2) {
    throw new Error(
      `task_specific_distractors_insufficient:${family}:${target}:${correct}`,
    );
  }
  const distractors = chosen.map((candidate) => {
    const sourceValue = candidate.reasonCode.split(':')[0] === 'orthographic'
      ? candidate.value
      : caseLike(candidate.value, correct);
    return {
      value: responseMode === 'whole_phrases'
        ? replaceToken(target, tokenIndex, sourceValue)
        : sourceValue,
      sourceValue,
      correct,
      testedDimension: dimension(correct, candidate.value, candidate.reasonCode),
    };
  }) as unknown as readonly [LearningV2TaskDistractor, LearningV2TaskDistractor];
  return { responseMode, correct, distractors };
}

export function selectTaskDistractors(
  input: Input,
): LearningV2TaskDistractorSelection {
  const tokens = targetTokens(input.target);
  if (input.family === 'phrase_builder' || input.family === 'listen_build_dictation' ||
      input.family === 'context_gap_grammar') {
    const formIndex = tokens.findIndex((token) => FORM_TOKENS.has(normalized(token)));
    const polarityIndex = tokens.findIndex((token) => POLARITY.test(token));
    const prepositionIndex = tokens.findIndex((token) => PREPOSITIONS.has(normalized(token)));
    const lexicalIndex = tokens.findIndex(
      (token) => replacementsFor(token, input.rejectedAnswers, false).length >= 2,
    );
    const stateLexicalIndex = tokens.findIndex(
      (token) =>
        !FORM_TOKENS.has(normalized(token)) &&
        !SUBJECT_PRONOUNS.has(normalized(token)) &&
        !PREPOSITIONS.has(normalized(token)) &&
        !POLARITY.test(token) &&
        replacementsFor(token, input.rejectedAnswers, false).length >= 2,
    );
    const tokenIndex = input.sessionOrdinal === 3 && stateLexicalIndex >= 0
      ? stateLexicalIndex
      : input.sessionOrdinal === 2 && polarityIndex >= 0
      ? polarityIndex
      : input.sessionOrdinal === 4 && normalized(tokens[0] ?? '') === "i'm"
      ? 0
      : input.sessionOrdinal === 14 && prepositionIndex >= 0
      ? prepositionIndex
      : input.sessionOrdinal === 13 && normalized(tokens[0] ?? '') === "you're"
      ? 0
      : formIndex >= 0
      ? formIndex
      : prepositionIndex >= 0
        ? prepositionIndex
        : lexicalIndex;
    if (tokenIndex < 0)
      throw new Error(`task_specific_distractors_focus_missing:${input.family}:${input.target}`);
    const correct = tokens[tokenIndex];
    const candidates = input.sessionOrdinal === 14
      ? session14PrepositionCandidates(input.target, correct, input.rejectedAnswers)
      : replacementsFor(correct, input.rejectedAnswers, false);
    return pair(
      input.family,
      input.target,
      correct,
      tokenIndex,
      candidates,
      input.family === 'context_gap_grammar' ? 'single_tokens' : 'extra_tokens',
    );
  }

  if (input.family === 'speed_match' || input.family === 'listen_choose') {
    const polarityIndex = tokens.findIndex((token) => POLARITY.test(token));
    const prepositionIndex = tokens.findIndex((token) => PREPOSITIONS.has(normalized(token)));
    const tokenIndex = input.sessionOrdinal === 2 && polarityIndex >= 0
      ? polarityIndex
      : input.sessionOrdinal === 4 && normalized(tokens[0] ?? '') === "i'm"
      ? 0
      : input.sessionOrdinal === 13 && normalized(tokens[0] ?? '') === "you're"
      ? 0
      : prepositionIndex >= 0 ? prepositionIndex : tokens.length - 1;
    const correct = tokens[tokenIndex] ?? input.target;
    const candidates = input.sessionOrdinal === 14
      ? session14PrepositionCandidates(input.target, correct, input.rejectedAnswers)
      : replacementsFor(correct, input.rejectedAnswers, false);
    return pair(
      input.family,
      input.target,
      correct,
      tokenIndex,
      candidates,
      'whole_phrases',
    );
  }

  throw new Error(`task_specific_distractors_family_unsupported:${input.family}`);
}
