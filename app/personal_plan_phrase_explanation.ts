/**
 * Builds meaningful, phrase-specific learner explanations for generated plan
 * phrases — replacing the previous generic "короткая готовая фраза" stub.
 *
 * For each phrase we explain THREE things the learner needs:
 *   1. what to assemble  (russian meaning -> english target)
 *   2. why it's built that way (grammar pattern of THIS phrase)
 *   3. a build hint (word-order / first-word cue)
 *
 * Pure functions, fully testable, no side effects.
 */

import { findIdiomExplanation } from './personal_plan_idiom_dictionary';

export type PhraseExplanation = {
  /** Short title shown above the explanation. */
  titleRu: string;
  /** What the learner should assemble + why (shown on correct/intro). */
  correctRu: string;
  /** Gentle recovery hint (shown on a wrong attempt). */
  wrongRu: string;
};

// Small RU<->EN literal gloss table to estimate how literal a translation is.
// Only common words that appear in plan phrases — enough to flag big divergence.
const LITERAL_GLOSS: Record<string, string[]> = {
  i: ['я'], we: ['мы'], you: ['ты', 'вы'], he: ['он'], she: ['она'], they: ['они'], it: ['это', 'оно'],
  need: ['нужно', 'нужен', 'нужна', 'нужны', 'надо'],
  want: ['хочу', 'хотим', 'хочешь'],
  can: ['могу', 'можем', 'можешь', 'можно'],
  will: ['буду', 'будем'],
  have: ['есть', 'имею'],
  not: ['не', 'нет'],
  now: ['сейчас'], today: ['сегодня'], tomorrow: ['завтра'], later: ['позже', 'потом'],
  help: ['помощь', 'помоги', 'помочь', 'помогите'],
  time: ['время', 'времени'],
  more: ['больше', 'ещё'],
  please: ['пожалуйста'],
  yes: ['да'], no: ['нет'],
  where: ['где', 'куда'], what: ['что'], when: ['когда'], how: ['как'], which: ['какой', 'какие', 'какую'],
  document: ['документ', 'документа'], form: ['форма', 'форму', 'форме'],
  send: ['отправлю', 'отправить', 'пришлю'],
  bring: ['принесу', 'принести'],
  clear: ['понятно', 'ясно'],
  deadline: ['срок', 'дедлайн'],
};

function literalCoverage(englishWords: string[], russianLower: string): number {
  if (englishWords.length === 0) return 1;
  let matched = 0;
  for (const w of englishWords) {
    const glosses = LITERAL_GLOSS[w.toLowerCase()];
    if (!glosses) {
      matched += 1; // unknown word: don't penalise (we can't judge it)
      continue;
    }
    if (glosses.some((g) => russianLower.includes(g))) matched += 1;
  }
  return matched / englishWords.length;
}

type GrammarPattern = {
  match: (englishLower: string, words: string[]) => boolean;
  title: string;
  why: (english: string) => string;
};

function words(english: string): string[] {
  return english
    .replace(/[.!?]+$/g, '')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);
}

function isQuestion(english: string): boolean {
  return english.trim().endsWith('?');
}

const PATTERNS: GrammarPattern[] = [
  {
    // Wh-questions: Where / What / Which / When / How / Who
    match: (lower) => /^(where|what|which|when|how|who|why)\b/.test(lower) && lower.includes('?'),
    title: 'Вопрос со словом-вопросом',
    why: (en) =>
      `«${en}» начинается с вопросительного слова, а дальше идёт глагол. Это обычный порядок для вопросов: сначала «что/где/как», потом действие.`,
  },
  {
    // Yes/no questions starting with can/could/do/does/is/are/will/should
    match: (lower) => /^(can|could|do|does|did|is|are|am|will|would|should|may|have|has)\b/.test(lower) && lower.includes('?'),
    title: 'Да/нет вопрос',
    why: (en) =>
      `«${en}» — вопрос, где вспомогательный глагол стоит первым. Поэтому фраза начинается не с «я», а со слова вроде can/do/is.`,
  },
  {
    // Negation
    match: (lower) => /\b(not|n't|no)\b/.test(lower) || /n't/.test(lower),
    title: 'Отрицание',
    why: (en) =>
      `«${en}» содержит отрицание (not / don't). Частица отрицания ставится после вспомогательного глагола, а не в конец фразы.`,
  },
  {
    // Modal-driven (need / can / will / should / have to)
    match: (lower) => /^(i|we|you|they|he|she)\s+(need|can|will|should|must|have to|want)\b/.test(lower),
    title: 'Намерение или необходимость',
    why: (en) =>
      `«${en}» строится по схеме «кто + need/can/will + действие». Сначала кто, потом модальное слово, потом что сделать.`,
  },
  {
    // "There is / there are"
    match: (lower) => /^there\s+(is|are|was|were)\b/.test(lower),
    title: 'Есть / имеется',
    why: (en) =>
      `«${en}» использует оборот there is/are — так по-английски говорят «есть / имеется». Он всегда стоит в начале.`,
  },
];

const DEFAULT_PATTERN: GrammarPattern = {
  match: () => true,
  title: 'Утвердительная фраза',
  why: (en) =>
    `«${en}» построена по базовой схеме «кто → действие → остальное». Держи этот порядок слов, когда собираешь фразу.`,
};

function firstWord(english: string): string {
  return words(english)[0] ?? '';
}

/**
 * Returns the grammar pattern best matching the phrase.
 */
export function detectPhrasePattern(english: string): GrammarPattern {
  const lower = english.toLowerCase();
  const tokens = words(lower);
  // Question patterns take priority when the phrase is a question.
  const ordered = isQuestion(english)
    ? PATTERNS
    : PATTERNS.filter((p) => p.title !== 'Вопрос со словом-вопросом' && p.title !== 'Да/нет вопрос');
  for (const pattern of ordered) {
    if (pattern.match(lower, tokens)) return pattern;
  }
  return DEFAULT_PATTERN;
}

/**
 * Builds a complete, phrase-specific explanation from the english target and
 * its russian meaning.
 */
// Below this literal-coverage ratio the translation is considered "by meaning"
// (non-literal) and the learner gets a heads-up even if no idiom matched.
const DIVERGENCE_THRESHOLD = 0.5;

export function buildPhraseExplanation(english: string, russian: string): PhraseExplanation {
  const wordCount = words(english).length;
  const first = firstWord(english);

  const wrongRu = [
    `Соберём заново спокойно. Смысл: «${russian}».`,
    wordCount > 1
      ? `Начни со слова «${first}» и держи порядок слов как в английской фразе.`
      : 'Выбери слово, которое точнее всего передаёт смысл.',
  ].join(' ');

  // 1. Highest priority: a known fixed/idiomatic construction.
  const idiom = findIdiomExplanation(english);
  if (idiom) {
    return {
      titleRu: idiom.titleRu,
      correctRu: [
        `Нужно собрать: «${russian}» → «${english}».`,
        idiom.explanationRu,
      ].join(' '),
      wrongRu,
    };
  }

  // 2. Auto-detected non-literal translation (big divergence from a word gloss).
  const coverage = literalCoverage(words(english), russian.toLowerCase());
  if (wordCount >= 3 && coverage < DIVERGENCE_THRESHOLD) {
    return {
      titleRu: 'Перевод по смыслу',
      correctRu: [
        `Нужно собрать: «${russian}» → «${english}».`,
        'Здесь перевод по смыслу, а не слово-в-слово: русская и английская фразы передают одно и то же, но строятся по-разному. Ориентируйся на смысл всей фразы, а не на отдельные слова.',
      ].join(' '),
      wrongRu,
    };
  }

  // 3. Fallback: grammatical pattern of the phrase.
  const pattern = detectPhrasePattern(english);
  return {
    titleRu: pattern.title,
    correctRu: [
      `Нужно собрать: «${russian}» → «${english}».`,
      pattern.why(english),
    ].join(' '),
    wrongRu,
  };
}
