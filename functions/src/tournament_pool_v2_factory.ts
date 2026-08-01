import { createHash } from 'node:crypto';
import {
  TOURNAMENT_TASK_LIMITS,
  type TournamentTask,
  type TournamentTaskExplanation,
  validateTournamentTaskForNewRoom,
} from './tournament_core';
import {
  phraseTokens,
  type SourceDay,
  type SourcePhrase,
} from './tournament_task_factory';
import { requiredCells } from './tournament_pool_plan';

export const NEW_TOURNAMENT_POOL_VERSION = 'tpool_20260801_v6' as const;
export const NEW_TOURNAMENT_POOL_TASKS_PER_MODE = 36;

export const NEW_TOURNAMENT_POOL_MODES = [
  'guess_phrase',
  'fill_gap',
  'find_oddity',
  'translate_build',
  'speed_match',
] as const;

type NewPoolMode = typeof NEW_TOURNAMENT_POOL_MODES[number];

export type NewTournamentTask = TournamentTask & {
  readonly source: 'ai';
  readonly lifecycle: 'published';
  readonly poolVersion: typeof NEW_TOURNAMENT_POOL_VERSION;
  readonly generationSource: 'author_content_deterministic_v1';
  readonly contentProvenance: {
    readonly planId: string;
    readonly dayIndex: number;
    readonly phraseIds: readonly string[];
  };
};

export type NewTournamentPoolManifest = {
  readonly poolVersion: typeof NEW_TOURNAMENT_POOL_VERSION;
  readonly generationSource: 'author_content_deterministic_v1';
  readonly sourceDays: number;
  readonly sourcePhrases: number;
  readonly taskCount: number;
  readonly counts: Readonly<Record<string, number>>;
  readonly candidateCounts: Readonly<Record<string, number>>;
  readonly diversity: {
    readonly uniquePrimaryPhrases: number;
    readonly uniqueSpeedPairs: number;
    readonly uniqueSpeedEnglishPrompts: number;
    readonly sourceDaysUsed: number;
    readonly topicsUsed: number;
    readonly fillGapPositions: Readonly<Record<string, number>>;
    readonly fillGapGrammarRoles: Readonly<Record<string, number>>;
    readonly fillGapCorrectTokens: Readonly<Record<string, number>>;
    readonly oddityPartsOfSpeech: Readonly<Record<string, number>>;
    readonly translateTrapPartsOfSpeech: Readonly<Record<string, number>>;
    readonly translateTrapTokens: Readonly<Record<string, number>>;
  };
  readonly contentSha256: string;
};

export type NewTournamentPoolResult = {
  readonly tasks: readonly NewTournamentTask[];
  readonly manifest: NewTournamentPoolManifest;
};

type AuthoredPair = {
  readonly id: string;
  readonly en: string;
  readonly ru: string;
};

type AuthoredSpeedPair = AuthoredPair & {
  readonly phraseId: string;
};

type WordMutation = {
  readonly original: string;
  readonly replacement: string;
  readonly partOfSpeech: string;
  readonly mutatedPhrase: string;
  readonly gapPhrase: string;
  readonly options: readonly string[];
  readonly translationTraps: readonly string[];
};

type FillGapGrammarRole =
  | 'subject_pronoun_agreement'
  | 'object_pronoun_case'
  | 'object_pronoun_reference'
  | 'be_agreement';

type FillGapMutation = WordMutation & {
  readonly grammarRole: FillGapGrammarRole;
  readonly tokenIndex: number;
  readonly tokenCount: number;
};

type StrictGrammarRole = FillGapGrammarRole
  | 'article_form'
  | 'verb_agreement'
  | 'noun_number'
  | 'lexical_meaning';

type StrictGrammarMutation = WordMutation & {
  readonly grammarRole: StrictGrammarRole;
  readonly tokenIndex: number;
  readonly tokenCount: number;
};

type FillGapCandidateMetadata = {
  readonly grammarRole: StrictGrammarRole;
  readonly correctToken: string;
  readonly position: 'first' | 'middle' | 'last';
  readonly phraseKey: string;
};

type PoolCandidate = {
  readonly task: NewTournamentTask;
  readonly primaryPhraseKey?: string;
  readonly dayKey: string;
  readonly topicKey: string;
  readonly diversityAxes?: readonly string[];
  readonly speedPairKeys?: readonly string[];
  readonly speedEnglishKeys?: readonly string[];
  readonly fillGap?: FillGapCandidateMetadata;
};

type SelectionState = {
  readonly usedPrimaryPhrases: Set<string>;
  readonly usedSpeedPairs: Set<string>;
  readonly usedSpeedEnglish: Set<string>;
  readonly dayCounts: Map<string, number>;
  readonly topicCounts: Map<string, number>;
  readonly axisCounts: Map<string, number>;
};

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function byteLength(value: string): number {
  return Buffer.byteLength(value, 'utf8');
}

function truncateToBytes(value: string, maxBytes: number): string {
  const clean = value.trim();
  if (byteLength(clean) <= maxBytes) return clean;
  const suffix = '…';
  let result = '';
  for (const character of Array.from(clean)) {
    if (byteLength(result + character + suffix) > maxBytes) break;
    result += character;
  }
  return `${result.trimEnd()}${suffix}`;
}

function within(value: string, maxBytes: number): boolean {
  return value.trim().length > 0 && byteLength(value.trim()) <= maxBytes;
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('ru');
}

// This is intentionally a narrow deterministic quarantine, not a language
// model or a generic grammar checker. Every pattern corresponds to a phrase
// rejected during the human review of the exact production-sized pool. Bad
// source material must be removed before it can leak into any task mode or a
// distractor set.
const AUDITED_CONTENT_REJECTIONS: readonly RegExp[] = [
  /В этом месяце мы заплатили сч[её]т больше/iu,
  /Она об истории Рима/iu,
  /Предложение пойти гулять вместе/iu,
  /we had a plan together/iu,
  /с срочной/iu,
  /Both options were chosen by equal numbers/iu,
  /Let's just throw out anything/iu,
  /\b(?:I is|She are|You am|He are|How are it)\b/iu,
  /не далеко/iu,
  /bring (?:more )?towels to us/iu,
  /Anytime,? it is not (?:a )?problem/iu,
  /я зову его/iu,
  /Swimming is very good for you/iu,
  /Не мог бы показать мне пример/iu,
  /learn English every day/iu,
  /booking for tonight/iu,
  /The soup tasted different but good/iu,
  /If you saved more, you would relax/iu,
  /attend a training/iu,
  /show me on the map/iu,
  /walk everywhere there/iu,
  /Fruit is healthier than sweet cake/iu,
  /I do not watch TV often/iu,
  /I can sleep well after sport/iu,
  /My father rests on weekends/iu,
  /There is always someone busy at home/iu,
  /The budget was confirmed last week/iu,
  /Ты не один\/одна/iu,
  /I need a jacket for today/iu,
  /The wind feels strong and cold/iu,
  /A mild temperature/iu,
  /We could meet for coffee Saturday/iu,
  /Hi there\. I am happy/iu,
  /I am not shy\. I am ready/iu,
  /He is my friend\. Hi/iu,
  /If it rains we will stay/iu,
  /I have a cold and runny nose/iu,
  /When will the fever stop/iu,
  /He is a retired man/iu,
  /Сколько процентов скидка/iu,
  /Do you have the budget plan/iu,
  /A cushion gives me real peace/iu,
  /If I save money, I will start/iu,
  /I will work hard to reach it/iu,
  /I am working on a deadline/iu,
  /I confirm the meeting at three/iu,
  /I will share the agenda with everyone/iu,
  /I have lost you here/iu,
  /We wait two minutes for him/iu,
  /пункты действий/iu,
  /I have received dividends from my shares for years/iu,
  /What is the metro line here/iu,
  /You can do it well/iu,
];
const AUDITED_CONTENT_REJECTION = new RegExp(
  AUDITED_CONTENT_REJECTIONS.map((pattern) => `(?:${pattern.source})`).join('|'),
  'iu',
);

function passesAuditedContentGate(english: string, russian: string): boolean {
  const content = `${english}\n${russian}`;
  return !AUDITED_CONTENT_REJECTION.test(content);
}

const SINGLE_LEXICAL_WORD = /^\p{L}[\p{L}\p{M}]*(?:['’\-]\p{L}[\p{L}\p{M}]*)*$/u;

function isSingleLexicalWord(value: string): boolean {
  return value === value.trim() && SINGLE_LEXICAL_WORD.test(value);
}

function withoutTerminalPunctuation(value: string): string {
  return value.trim().replace(/[.!?…]+$/u, '').trimEnd();
}

function stableShuffle<T>(items: readonly T[], seed: string): T[] {
  return items
    .map((item, index) => ({ item, index, rank: sha256(`${seed}:${index}`) }))
    .sort((left, right) => left.rank.localeCompare(right.rank) || left.index - right.index)
    .map((entry) => entry.item);
}

function poolDifficulty(day: SourceDay): 1 | 2 | 3 {
  const level = String(day.level ?? '').trim().toUpperCase();
  if (level === 'A1') return 1;
  if (level === 'A2') return 2;
  return 3;
}

function authoredPair(phrase: SourcePhrase): AuthoredPair | null {
  const id = String(phrase.id ?? '').trim();
  const en = String(phrase.english ?? '').trim();
  const ru = String(phrase.meaning?.ru ?? '').trim();
  return id && en && ru && passesAuditedContentGate(en, ru) ? { id, en, ru } : null;
}

function usablePairs(day: SourceDay): AuthoredPair[] {
  return (day.phrases ?? [])
    .map(authoredPair)
    .filter((pair): pair is AuthoredPair => !!pair);
}

function authoredSpeedPairs(day: SourceDay): AuthoredSpeedPair[] {
  const pairs: AuthoredSpeedPair[] = [];
  const seenEnglish = new Set<string>();
  const seenRussian = new Set<string>();
  for (const pair of usablePairs(day)) {
    if (phraseTokens(pair.en).length < 2 || phraseTokens(pair.ru).length < 2
      || !within(pair.en, TOURNAMENT_TASK_LIMITS.promptBytes)
      || !within(pair.ru, TOURNAMENT_TASK_LIMITS.optionBytes)) continue;
    const englishKey = normalize(pair.en);
    const russianKey = normalize(pair.ru);
    if (seenEnglish.has(englishKey) || seenRussian.has(russianKey)) continue;
    seenEnglish.add(englishKey);
    seenRussian.add(russianKey);
    pairs.push({
      ...pair,
      phraseId: pair.id,
    });
  }
  return pairs;
}

function taskId(mode: NewPoolMode, difficulty: number, identity: string): string {
  const shortMode: Record<NewPoolMode, string> = {
    guess_phrase: 'guess',
    fill_gap: 'gap',
    find_oddity: 'odd',
    translate_build: 'build',
    speed_match: 'pairs',
  };
  return `tp2_20260801_v6_${shortMode[mode]}_d${difficulty}_${sha256(`${NEW_TOURNAMENT_POOL_VERSION}:${identity}`).slice(0, 20)}`;
}

function tags(day: SourceDay): string[] {
  const result = [
    'source:ai',
    'generator:author-content-v1',
    `pool:${NEW_TOURNAMENT_POOL_VERSION}`,
    `plan:${String(day.planId).slice(0, 32)}`,
    `day:${Number(day.dayIndex)}`,
    `cefr:${String(day.level ?? 'unknown').toLowerCase().slice(0, 16)}`,
  ];
  const topic = String(day.topic?.ru ?? '').trim();
  if (topic) {
    const topicBytes = TOURNAMENT_TASK_LIMITS.tagBytes - byteLength('topic:');
    result.push(`topic:${truncateToBytes(topic, topicBytes)}`);
  }
  return result;
}

function dayKey(day: SourceDay): string {
  return `${day.planId}:${day.dayIndex}`;
}

function topicKey(day: SourceDay): string {
  return normalize(String(day.topic?.ru ?? 'untagged'));
}

function phraseKey(day: SourceDay, phraseId: string): string {
  return `${day.planId}:${day.dayIndex}:${phraseId}`;
}

function countsWithPrefix(counts: ReadonlyMap<string, number>, prefix: string): Record<string, number> {
  return Object.fromEntries([...counts.entries()]
    .filter(([key]) => key.startsWith(prefix))
    .map(([key, count]) => [key.slice(prefix.length), count] as const)
    .sort(([left], [right]) => left.localeCompare(right)));
}

function provenance(day: SourceDay, phraseIds: readonly string[]): NewTournamentTask['contentProvenance'] {
  return {
    planId: String(day.planId),
    dayIndex: Number(day.dayIndex),
    phraseIds: [...phraseIds],
  };
}

function baseTask(
  day: SourceDay,
  mode: NewPoolMode,
  identity: string,
  phraseIds: readonly string[],
  payload: Record<string, unknown>,
  explanation: TournamentTaskExplanation,
): NewTournamentTask {
  const difficulty = poolDifficulty(day);
  return {
    taskId: taskId(mode, difficulty, identity),
    mode,
    isVoice: false,
    difficulty,
    payload,
    explanation,
    tags: tags(day),
    verified: true,
    source: 'ai',
    lifecycle: 'published',
    poolVersion: NEW_TOURNAMENT_POOL_VERSION,
    generationSource: 'author_content_deterministic_v1',
    contentProvenance: provenance(day, phraseIds),
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceAuthoredWord(phrase: string, word: string, replacement: string): string | null {
  const pattern = new RegExp(`(^|[^\\p{L}\\p{N}'’\\-])(${escapeRegExp(word)})(?=$|[^\\p{L}\\p{N}'’\\-])`, 'iu');
  if (!pattern.test(phrase)) return null;
  return phrase.replace(pattern, (_match, prefix: string) => `${prefix}${replacement}`);
}

function completeGap(gapPhrase: string, option: string): string {
  return gapPhrase.replace('___', option);
}

function buildGuessTask(day: SourceDay, phrase: SourcePhrase): NewTournamentTask | null {
  const pair = authoredPair(phrase);
  if (!pair || !within(pair.en, TOURNAMENT_TASK_LIMITS.optionBytes)) return null;
  const distractors = stableShuffle(usablePairs(day), `guess:${pair.id}`)
    .filter((candidate) => candidate.id !== pair.id
      && normalize(candidate.en) !== normalize(pair.en)
      && within(candidate.en, TOURNAMENT_TASK_LIMITS.optionBytes))
    .filter((candidate, index, all) => all.findIndex((entry) => normalize(entry.en) === normalize(candidate.en)) === index)
    .slice(0, 3);
  if (distractors.length !== 3) return null;
  const optionPairs = stableShuffle([pair, ...distractors], `guess-options:${pair.id}`);
  const options = optionPairs.map((option) => option.en);
  const correctIndex = optionPairs.findIndex((option) => option.id === pair.id);
  const prompt = truncateToBytes(`Вы хотите сказать: «${withoutTerminalPunctuation(pair.ru)}». Какую английскую реплику выберете?`, TOURNAMENT_TASK_LIMITS.phraseBytes);
  const explanation: TournamentTaskExplanation = {
    ruleNote: truncateToBytes(`«${withoutTerminalPunctuation(pair.en)}» точно передаёт мысль «${withoutTerminalPunctuation(pair.ru)}». Здесь решает смысл, а не удача на четырёх кнопках.`, TOURNAMENT_TASK_LIMITS.explanationBytes),
    example: truncateToBytes(`${pair.en} — ${pair.ru}`, TOURNAMENT_TASK_LIMITS.explanationBytes),
    wrongOptionReasons: optionPairs.map((option) => option.id === pair.id
      ? ''
      : truncateToBytes(`«${option.en}» означает «${withoutTerminalPunctuation(option.ru)}», поэтому мысль «${withoutTerminalPunctuation(pair.ru)}» не передаёт.`, TOURNAMENT_TASK_LIMITS.explanationBytes)),
  };
  return baseTask(day, 'guess_phrase', `guess:${day.planId}:${day.dayIndex}:${pair.id}`,
    [pair.id, ...optionPairs.filter((option) => option.id !== pair.id).map((option) => option.id)], {
      phrase: prompt,
      options,
      correctIndex,
      correctAnswer: pair.en,
    }, explanation);
}

const SUBJECT_PRONOUNS = new Set(['i', 'you', 'he', 'she', 'it', 'we', 'they']);
const OBJECT_ONLY_PRONOUNS = new Set(['me', 'him', 'her', 'us', 'them']);
const OBJECT_PRONOUNS = new Set(['you', 'me', 'him', 'her', 'us', 'them']);
const OBJECT_PRONOUN_RU_MARKERS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  you: ['тебя', 'тебе', 'тобой', 'вас', 'вам', 'вами'],
  me: ['меня', 'мне', 'мной', 'мною'],
  him: ['его', 'ему', 'ним'],
  her: ['её', 'ее', 'ей', 'неё', 'нее', 'ней', 'нею'],
  us: ['нас', 'нам', 'нами'],
  them: ['их', 'им', 'ними'],
});
const PRESENT_BE_FOR_SUBJECT: Readonly<Record<string, string>> = Object.freeze({
  i: 'am',
  you: 'are',
  he: 'is',
  she: 'is',
  it: 'is',
  we: 'are',
  they: 'are',
});
const PRESENT_BE_FORMS = new Set(['am', 'is', 'are']);

function agreesWithPresentBe(subject: string, beForm: string): boolean {
  return PRESENT_BE_FOR_SUBJECT[normalize(subject)] === normalize(beForm);
}

function adjacentPresentBe(tokens: readonly string[], tokenIndex: number): string | null {
  const adjacent = [tokens[tokenIndex - 1], tokens[tokenIndex + 1]]
    .find((token) => token && PRESENT_BE_FORMS.has(normalize(token)));
  return adjacent ?? null;
}

function adjacentPersonalSubject(tokens: readonly string[], tokenIndex: number): string | null {
  const adjacent = [tokens[tokenIndex - 1], tokens[tokenIndex + 1]]
    .find((token) => token && SUBJECT_PRONOUNS.has(normalize(token)));
  return adjacent ?? null;
}

function russianMeaningNamesObjectPronoun(russianMeaning: string, pronoun: string): boolean {
  const markers = OBJECT_PRONOUN_RU_MARKERS[normalize(pronoun)] ?? [];
  const russianTokens = new Set(phraseTokens(russianMeaning).map(normalize));
  return markers.some((marker) => russianTokens.has(marker));
}

function safeFillGapSlot(
  partOfSpeech: string,
  original: string,
  distractors: readonly string[],
  tokens: readonly string[],
  tokenIndex: number,
  russianMeaning: string,
): { grammarRole: FillGapGrammarRole; distractors: string[] } | null {
  const normalizedOriginal = normalize(original);
  if (partOfSpeech === 'pronoun' && OBJECT_PRONOUNS.has(normalizedOriginal)
    && tokenIndex > 0 && russianMeaningNamesObjectPronoun(russianMeaning, original)) {
    const referenceTraps = distractors.filter((value) => OBJECT_PRONOUNS.has(normalize(value)));
    if (referenceTraps.length >= 3) {
      return { grammarRole: 'object_pronoun_reference', distractors: referenceTraps };
    }
  }
  if (partOfSpeech === 'pronoun' && OBJECT_ONLY_PRONOUNS.has(normalizedOriginal)
    && tokenIndex > 0) {
    const caseTraps = distractors.filter((value) => SUBJECT_PRONOUNS.has(normalize(value)));
    return caseTraps.length >= 3
      ? { grammarRole: 'object_pronoun_case', distractors: caseTraps }
      : null;
  }
  if (partOfSpeech === 'pronoun' && SUBJECT_PRONOUNS.has(normalizedOriginal)) {
    const beForm = adjacentPresentBe(tokens, tokenIndex);
    if (!beForm || !agreesWithPresentBe(original, beForm)) return null;
    const agreementTraps = distractors.filter((value) => (
      SUBJECT_PRONOUNS.has(normalize(value)) && !agreesWithPresentBe(value, beForm)
    ));
    return agreementTraps.length >= 3
      ? { grammarRole: 'subject_pronoun_agreement', distractors: agreementTraps }
      : null;
  }
  if (partOfSpeech === 'to-be' && PRESENT_BE_FORMS.has(normalizedOriginal)) {
    const subject = adjacentPersonalSubject(tokens, tokenIndex);
    if (!subject || !agreesWithPresentBe(subject, original)) return null;
    const agreementTraps = distractors.filter((value) => {
      const normalizedValue = normalize(value);
      return normalizedValue === 'be'
        || (PRESENT_BE_FORMS.has(normalizedValue) && !agreesWithPresentBe(subject, value));
    });
    return agreementTraps.length >= 3
      ? { grammarRole: 'be_agreement', distractors: agreementTraps }
      : null;
  }
  return null;
}

function fillGapMutations(phrase: SourcePhrase): FillGapMutation[] {
  const english = String(phrase.english ?? '').trim();
  const tokens = phraseTokens(english);
  const seenSlots = new Set<string>();
  const mutations: FillGapMutation[] = [];

  for (const [sourceIndex, word] of (phrase.words ?? []).entries()) {
    const partOfSpeech = String(word.partOfSpeech ?? '');
    const original = String(word.text ?? '').trim();
    if (!isSingleLexicalWord(original)
      || !within(original, TOURNAMENT_TASK_LIMITS.optionBytes)) continue;
    const matchingTokenIndexes = tokens
      .map((token, tokenIndex) => (normalize(token) === normalize(original) ? tokenIndex : -1))
      .filter((tokenIndex) => tokenIndex >= 0);
    // One visible gap must map to one authored token. Repeated words would make
    // the tested slot unclear in review and make diversity accounting unstable.
    if (matchingTokenIndexes.length !== 1) continue;

    const authoredDistractors = Array.from(new Map((word.distractors ?? [])
      .map((value) => String(value ?? '').trim())
      .filter((value) => isSingleLexicalWord(value)
        && within(value, TOURNAMENT_TASK_LIMITS.optionBytes)
        && normalize(value) !== normalize(original))
      .map((value) => [normalize(value), value])).values());
    const safeSlot = safeFillGapSlot(
      partOfSpeech,
      original,
      authoredDistractors,
      tokens,
      matchingTokenIndexes[0],
      String(phrase.meaning?.ru ?? ''),
    );
    if (!safeSlot) continue;
    const selected = stableShuffle(
      safeSlot.distractors,
      `fill-gap-traps:${phrase.id}:${sourceIndex}:${original}`,
    ).slice(0, 3);
    const gapPhrase = replaceAuthoredWord(english, original, '___');
    const mutatedPhrase = replaceAuthoredWord(english, original, selected[0]);
    if (!gapPhrase || !mutatedPhrase
      || !within(gapPhrase, TOURNAMENT_TASK_LIMITS.phraseBytes)
      || !within(mutatedPhrase, TOURNAMENT_TASK_LIMITS.optionBytes)
      || normalize(completeGap(gapPhrase, original)) !== normalize(english)) continue;
    const slotKey = `${normalize(gapPhrase)}:${normalize(original)}`;
    if (seenSlots.has(slotKey)) continue;
    seenSlots.add(slotKey);
    mutations.push({
      original,
      replacement: selected[0],
      partOfSpeech,
      grammarRole: safeSlot.grammarRole,
      gapPhrase,
      mutatedPhrase,
      options: [original, ...selected],
      translationTraps: selected,
      tokenIndex: matchingTokenIndexes[0],
      tokenCount: tokens.length,
    });
  }

  return mutations.sort((left, right) => sha256(
    `fill-gap-slot:${phrase.id}:${left.tokenIndex}:${left.original}`,
  ).localeCompare(sha256(
    `fill-gap-slot:${phrase.id}:${right.tokenIndex}:${right.original}`,
  )));
}

function strictGrammarMutations(phrase: SourcePhrase): StrictGrammarMutation[] {
  const english = String(phrase.english ?? '').trim();
  const tokens = phraseTokens(english);
  const additional: StrictGrammarMutation[] = [];
  const singularSubjects = new Set(['he', 'she', 'it']);
  const pluralSubjects = new Set(['i', 'you', 'we', 'they']);

  for (const word of phrase.words ?? []) {
    const original = String(word.text ?? '').trim();
    const normalizedOriginal = normalize(original);
    const tokenIndexes = tokens
      .map((token, index) => (normalize(token) === normalizedOriginal ? index : -1))
      .filter((index) => index >= 0);
    if (tokenIndexes.length !== 1) continue;
    const tokenIndex = tokenIndexes[0];
    const partOfSpeech = String(word.partOfSpeech ?? '');
    const distractors = Array.from(new Map((word.distractors ?? [])
      .map((value) => String(value ?? '').trim())
      .filter((value) => isSingleLexicalWord(value)
        && within(value, TOURNAMENT_TASK_LIMITS.optionBytes)
        && normalize(value) !== normalizedOriginal)
      .map((value) => [normalize(value), value])).values());
    let grammarRole: StrictGrammarRole | null = null;
    let replacement: string | undefined;

    if (partOfSpeech === 'article' && ['a', 'an'].includes(normalizedOriginal)) {
      const nextTokenStartsWithVowel = /^[aeiou]/u.test(normalize(tokens[tokenIndex + 1] ?? ''));
      const sourceUsesRegularArticleRule = (normalizedOriginal === 'an' && nextTokenStartsWithVowel)
        || (normalizedOriginal === 'a' && !nextTokenStartsWithVowel);
      replacement = sourceUsesRegularArticleRule
        ? distractors.find((value) => ['a', 'an'].includes(normalize(value)))
        : undefined;
      if (replacement) grammarRole = 'article_form';
    } else if (partOfSpeech === 'verb' && tokenIndex > 0) {
      const subject = normalize(tokens[tokenIndex - 1]);
      const singularStems = [
        normalizedOriginal.replace(/es$/u, ''),
        normalizedOriginal.replace(/s$/u, ''),
      ];
      if (singularSubjects.has(subject) && /s$/u.test(normalizedOriginal)) {
        replacement = distractors.find((value) => singularStems.includes(normalize(value)));
      } else if (pluralSubjects.has(subject) && !/s$/u.test(normalizedOriginal)) {
        replacement = distractors.find((value) => (
          normalize(value) === `${normalizedOriginal}s` || normalize(value) === `${normalizedOriginal}es`
        ));
      }
      if (replacement) grammarRole = 'verb_agreement';
    } else if (partOfSpeech === 'noun' && tokenIndex > 0
      && ['a', 'an', 'one'].includes(normalize(tokens[tokenIndex - 1]))) {
      replacement = distractors.find((value) => (
        normalize(value) === `${normalizedOriginal}s` || normalize(value) === `${normalizedOriginal}es`
      ));
      if (replacement) grammarRole = 'noun_number';
    }
    if (!replacement || !grammarRole) continue;
    const mutatedPhrase = replaceAuthoredWord(english, original, replacement);
    const gapPhrase = replaceAuthoredWord(english, original, '___');
    if (!mutatedPhrase || !gapPhrase || normalize(mutatedPhrase) === normalize(english)
      || !within(mutatedPhrase, TOURNAMENT_TASK_LIMITS.optionBytes)
      || !within(gapPhrase, TOURNAMENT_TASK_LIMITS.phraseBytes)) continue;
    const fillGapDistractors = grammarRole === 'article_form'
      ? [replacement, 'many', 'two']
      : stableShuffle(
        [replacement, ...distractors.filter((value) => normalize(value) !== normalize(replacement))],
        `strict-gap-traps:${phrase.id}:${tokenIndex}:${original}`,
      ).slice(0, 3);
    additional.push({
      original,
      replacement,
      partOfSpeech,
      mutatedPhrase,
      gapPhrase,
      options: fillGapDistractors.length === 3
        ? [original, ...fillGapDistractors]
        : [original, replacement],
      translationTraps: [replacement],
      grammarRole,
      tokenIndex,
      tokenCount: tokens.length,
    });
  }

  const seen = new Set<string>();
  return [...fillGapMutations(phrase), ...additional]
    .filter((mutation) => {
      const key = `${mutation.tokenIndex}:${normalize(mutation.replacement)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => left.tokenIndex - right.tokenIndex
      || left.grammarRole.localeCompare(right.grammarRole));
}

function fillGapRoleNote(mutation: Pick<StrictGrammarMutation, 'grammarRole'>): string {
  if (mutation.grammarRole === 'subject_pronoun_agreement') {
    return 'подлежащее согласуется с соседней формой am, is или are';
  }
  if (mutation.grammarRole === 'object_pronoun_case') {
    return 'объектная форма местоимения стоит там, где формы подлежащего не подходят';
  }
  if (mutation.grammarRole === 'object_pronoun_reference') {
    return 'русский перевод прямо указывает, к кому относится объектное местоимение';
  }
  return 'форма am, is или are согласуется с соседним личным местоимением';
}

function strictGrammarRoleNote(grammarRole: StrictGrammarRole): string {
  if (grammarRole === 'article_form') return 'a и an выбираются по следующему звуку';
  if (grammarRole === 'verb_agreement') return 'форма смыслового глагола согласуется с подлежащим';
  if (grammarRole === 'noun_number') return 'после a, an или one нужна форма единственного числа';
  if (grammarRole === 'lexical_meaning') return 'русский перевод фиксирует нужное значение слова в этой фразе';
  return fillGapRoleNote({ grammarRole });
}

function fillGapTrapViolation(grammarRole: StrictGrammarRole): string {
  if (grammarRole === 'object_pronoun_reference') {
    return 'вариант меняет референта, прямо указанного в русском переводе';
  }
  if (grammarRole === 'article_form') {
    return 'вариант нарушает выбор артикля перед следующим звуком';
  }
  if (grammarRole === 'verb_agreement') {
    return 'форма глагола не согласуется с подлежащим';
  }
  if (grammarRole === 'noun_number') {
    return 'число существительного не согласуется с a, an или one';
  }
  return 'форма нарушает проверяемое согласование или падеж';
}

function buildFillGapTask(
  day: SourceDay,
  phrase: SourcePhrase,
  mutation: StrictGrammarMutation,
): NewTournamentTask | null {
  const pair = authoredPair(phrase);
  if (!pair) return null;
  const options = stableShuffle(mutation.options, `gap-options:${pair.id}`);
  const correctIndex = options.findIndex((option) => option === mutation.original);
  const prompt = `${mutation.gapPhrase}\n${pair.ru}`;
  if (!within(prompt, TOURNAMENT_TASK_LIMITS.phraseBytes)) return null;
  const roleNote = strictGrammarRoleNote(mutation.grammarRole);
  const trapViolation = fillGapTrapViolation(mutation.grammarRole);
  const explanation: TournamentTaskExplanation = {
    ruleNote: truncateToBytes(`В пропуске нужно «${mutation.original}»: ${roleNote}, поэтому среди четырёх вариантов подходит только эта форма.`, TOURNAMENT_TASK_LIMITS.explanationBytes),
    example: truncateToBytes(`${pair.en} — ${pair.ru}`, TOURNAMENT_TASK_LIMITS.explanationBytes),
    wrongOptionReasons: options.map((option) => option === mutation.original
      ? ''
      : truncateToBytes(`«${option}» даёт «${withoutTerminalPunctuation(completeGap(mutation.gapPhrase, option))}» — это ловушка: ${trapViolation}. Правильно «${mutation.original}».`, TOURNAMENT_TASK_LIMITS.explanationBytes)),
  };
  return baseTask(day, 'fill_gap', `gap:${day.planId}:${day.dayIndex}:${pair.id}:${mutation.tokenIndex}:${mutation.original}`,
    [pair.id], {
      phrase: prompt,
      options,
      correctIndex,
      correctAnswer: mutation.original,
    }, explanation);
}

export function buildUnambiguousFillGapTask(day: SourceDay, phrase: SourcePhrase): NewTournamentTask | null {
  const mutation = fillGapMutations(phrase)[0];
  return mutation ? buildFillGapTask(day, phrase, mutation) : null;
}

function buildUnambiguousFillGapCandidates(day: SourceDay, phrase: SourcePhrase): PoolCandidate[] {
  return strictGrammarMutations(phrase).filter((mutation) => mutation.options.length === 4)
    .flatMap((mutation) => {
    const pair = authoredPair(phrase);
    if (!pair || mutation.options.some((option) => (
      !passesAuditedContentGate(completeGap(mutation.gapPhrase, option), pair.ru)
    ))) return [];
    const task = buildFillGapTask(day, phrase, mutation);
    if (!task) return [];
    const position = mutation.tokenIndex === 0
      ? 'first'
      : (mutation.tokenIndex === mutation.tokenCount - 1 ? 'last' : 'middle');
    return [{
      task,
      primaryPhraseKey: phraseKey(day, String(phrase.id)),
      dayKey: dayKey(day),
      topicKey: topicKey(day),
      fillGap: {
        grammarRole: mutation.grammarRole,
        correctToken: normalize(mutation.original),
        position,
        phraseKey: `${day.planId}:${day.dayIndex}:${phrase.id}`,
      },
      }];
    });
}

function buildOddityTask(
  day: SourceDay,
  phrase: SourcePhrase,
  mutation: StrictGrammarMutation,
): NewTournamentTask | null {
  const pair = authoredPair(phrase);
  if (!pair || !passesAuditedContentGate(mutation.mutatedPhrase, pair.ru)) return null;
  const natural = stableShuffle(usablePairs(day), `oddity:${pair.id}`)
    .filter((candidate) => candidate.id !== pair.id
      && within(candidate.en, TOURNAMENT_TASK_LIMITS.optionBytes)
      && normalize(candidate.en) !== normalize(mutation.mutatedPhrase))
    .filter((candidate, index, all) => all.findIndex((entry) => normalize(entry.en) === normalize(candidate.en)) === index)
    .slice(0, 3);
  if (natural.length !== 3) return null;
  const optionRecords = stableShuffle([
    { id: pair.id, text: mutation.mutatedPhrase, ru: pair.ru, odd: true },
    ...natural.map((candidate) => ({ id: candidate.id, text: candidate.en, ru: candidate.ru, odd: false })),
  ], `oddity-options:${pair.id}`);
  const options = optionRecords.map((option) => option.text);
  const correctIndex = optionRecords.findIndex((option) => option.odd);
  const explanation: TournamentTaskExplanation = {
    ruleNote: truncateToBytes(`«${withoutTerminalPunctuation(mutation.mutatedPhrase)}» — ловушка: ${strictGrammarRoleNote(mutation.grammarRole)}. Если сохраняем смысл авторской фразы, исправляем её так: «${withoutTerminalPunctuation(pair.en)}».`, TOURNAMENT_TASK_LIMITS.explanationBytes),
    example: truncateToBytes(`${pair.en} — ${pair.ru}`, TOURNAMENT_TASK_LIMITS.explanationBytes),
    wrongOptionReasons: optionRecords.map((option) => option.odd
      ? ''
      : truncateToBytes(`«${option.text}» — нормальная фраза со смыслом «${withoutTerminalPunctuation(option.ru)}»; исправлять нужно «${withoutTerminalPunctuation(mutation.mutatedPhrase)}».`, TOURNAMENT_TASK_LIMITS.explanationBytes)),
  };
  return baseTask(day, 'find_oddity', `odd:${day.planId}:${day.dayIndex}:${pair.id}:${mutation.replacement}`,
    [pair.id, ...optionRecords.filter((option) => option.id !== pair.id).map((option) => option.id)], {
      phrase: 'Найдите фразу, которую нужно исправить.',
      options,
      correctIndex,
      correctAnswer: mutation.mutatedPhrase,
    }, explanation);
}

type AuthoredTrap = {
  readonly value: string;
  readonly partOfSpeech: string;
  readonly original: string;
  readonly grammarRole: StrictGrammarRole;
};

function authoredLexicalTraps(phrase: SourcePhrase): AuthoredTrap[] {
  const correctTokens = new Set(phraseTokens(String(phrase.english ?? '')).map(normalize));
  const traps: AuthoredTrap[] = [];
  for (const word of phrase.words ?? []) {
    const original = String(word.text ?? '').trim();
    const partOfSpeech = String(word.partOfSpeech ?? '').trim();
    if (!original || !partOfSpeech) continue;
    const values = Array.from(new Map((word.distractors ?? [])
      .map((value) => String(value ?? '').trim())
      .filter((value) => isSingleLexicalWord(value)
        && within(value, TOURNAMENT_TASK_LIMITS.tokenBytes)
        && normalize(value) !== normalize(original)
        && !correctTokens.has(normalize(value)))
      .map((value) => [normalize(value), value])).values());
    for (const value of stableShuffle(
      values,
      `translate-lexical:${phrase.id}:${original}`,
    ).slice(0, 2)) {
      traps.push({ value, partOfSpeech, original, grammarRole: 'lexical_meaning' });
    }
  }
  return traps;
}

function buildTranslateTask(
  day: SourceDay,
  phrase: SourcePhrase,
  trap: AuthoredTrap,
): NewTournamentTask | null {
  const pair = authoredPair(phrase);
  if (!pair || !within(pair.ru, TOURNAMENT_TASK_LIMITS.phraseBytes)
    || !within(pair.en, TOURNAMENT_TASK_LIMITS.answerBytes)) return null;
  const correctTokens = phraseTokens(pair.en);
  if (correctTokens.length < 2 || correctTokens.length > 12
    || correctTokens.some((token) => !within(token, TOURNAMENT_TASK_LIMITS.tokenBytes))) return null;
  // Building is a word-order exercise, not a search through a wall of tiles.
  // One meaningful authored trap preserves the decision without overloading a
  // normal player reading the Russian prompt on a phone.
  const maxTraps = Math.min(1, TOURNAMENT_TASK_LIMITS.maxWordBankItems - correctTokens.length);
  if (maxTraps < 1 || correctTokens.some((token) => normalize(token) === normalize(trap.value))) return null;
  const wordBank = stableShuffle([...correctTokens, trap.value], `build-bank:${pair.id}:${trap.value}`);
  const explanation: TournamentTaskExplanation = {
    ruleNote: truncateToBytes(`Правильный порядок — «${withoutTerminalPunctuation(pair.en)}». Ловушка «${trap.value}» конкурирует с конкретной формой «${trap.original}»: ${strictGrammarRoleNote(trap.grammarRole)}.`, TOURNAMENT_TASK_LIMITS.explanationBytes),
    example: truncateToBytes(`${pair.ru} — ${pair.en}`, TOURNAMENT_TASK_LIMITS.explanationBytes),
    wrongOptionReasons: [],
  };
  return baseTask(day, 'translate_build', `build:${day.planId}:${day.dayIndex}:${pair.id}:${trap.value}`,
    [pair.id], {
      phrase: pair.ru,
      wordBank,
      correctTokenCount: correctTokens.length,
      correctTokens,
      correctAnswer: pair.en,
    }, explanation);
}

function buildSpeedMatchTask(
  day: SourceDay,
  pairs: readonly AuthoredSpeedPair[],
): NewTournamentTask | null {
  if (pairs.length !== 6
    || pairs.some((pair) => !within(pair.en, TOURNAMENT_TASK_LIMITS.promptBytes)
      || !within(pair.ru, TOURNAMENT_TASK_LIMITS.optionBytes)
      || phraseTokens(pair.en).length < 2
      || phraseTokens(pair.ru).length < 2)) return null;
  if (new Set(pairs.map((pair) => normalize(pair.ru))).size !== 6
    || new Set(pairs.map((pair) => normalize(pair.en))).size !== 6) return null;

  const itemPairs = stableShuffle(pairs, `pairs-left:${day.planId}:${day.dayIndex}`);
  const rightPairs = stableShuffle(pairs, `pairs-right:${day.planId}:${day.dayIndex}`);
  const rightOptions = rightPairs.map((pair) => pair.ru);
  const items = itemPairs.map((pair) => {
    const correctIndex = rightPairs.findIndex((right) => right.id === pair.id);
    return {
      prompt: pair.en,
      options: [...rightOptions],
      correctIndex,
      explanation: {
        ruleNote: truncateToBytes(`«${withoutTerminalPunctuation(pair.en)}» означает «${withoutTerminalPunctuation(pair.ru)}» в контексте авторского примера.`, TOURNAMENT_TASK_LIMITS.explanationBytes),
        example: truncateToBytes(`${pair.en} — ${pair.ru}`, TOURNAMENT_TASK_LIMITS.explanationBytes),
        wrongOptionReasons: rightPairs.map((right) => right.id === pair.id
          ? ''
          : truncateToBytes(`«${right.ru}» — перевод фразы «${withoutTerminalPunctuation(right.en)}», а не «${withoutTerminalPunctuation(pair.en)}».`, TOURNAMENT_TASK_LIMITS.explanationBytes)),
      },
    };
  });
  const first = itemPairs[0];
  const identity = pairs.map((pair) => `${normalize(pair.en)}=${normalize(pair.ru)}`).sort().join('|');
  return baseTask(day, 'speed_match', `pairs:${day.planId}:${day.dayIndex}:${identity}`,
    pairs.map((pair) => pair.phraseId), {
      prompt: 'Соедините английские фразы с точными русскими переводами.',
      rightOptions,
      items,
    }, {
      ruleNote: 'Каждая фраза слева соединяется с её переводом справа. Шесть контекстных пар — никаких лишних карточек.',
      example: `${first.en} — ${first.ru}`,
      wrongOptionReasons: [],
    });
}

function buildSpeedMatchCandidates(day: SourceDay): PoolCandidate[] {
  const source = authoredSpeedPairs(day);
  if (source.length < 6) return [];
  const candidates: PoolCandidate[] = [];
  const seenSets = new Set<string>();
  const variantCount = Math.min(4, source.length);

  for (let variant = 0; variant < variantCount; variant += 1) {
    const ordered = stableShuffle(source, `pairs-source:${day.planId}:${day.dayIndex}:${variant}`);
    for (let offset = 0; offset + 6 <= ordered.length; offset += 6) {
      const pairs = ordered.slice(offset, offset + 6);
      const pairKeys = pairs.map((pair) => `${normalize(pair.en)}\u0000${normalize(pair.ru)}`);
      const setKey = [...pairKeys].sort().join('|');
      if (seenSets.has(setKey)) continue;
      seenSets.add(setKey);
      const task = buildSpeedMatchTask(day, pairs);
      if (!task) continue;
      candidates.push({
        task,
        dayKey: dayKey(day),
        topicKey: topicKey(day),
        speedPairKeys: pairKeys,
        speedEnglishKeys: pairs.map((pair) => normalize(pair.en)),
      });
    }
  }
  return candidates;
}

function selectDiverseCandidates(
  cell: readonly PoolCandidate[],
  count: number,
  state: SelectionState,
): PoolCandidate[] {
  const remaining = [...cell];
  const selected: PoolCandidate[] = [];
  const countOf = (counts: ReadonlyMap<string, number>, key: string): number => counts.get(key) ?? 0;
  const speedPairFrequency = new Map<string, number>();
  const speedEnglishFrequency = new Map<string, number>();
  for (const candidate of cell) {
    candidate.speedPairKeys?.forEach((key) => speedPairFrequency.set(key, countOf(speedPairFrequency, key) + 1));
    candidate.speedEnglishKeys?.forEach((key) => speedEnglishFrequency.set(key, countOf(speedEnglishFrequency, key) + 1));
  }

  while (selected.length < count && remaining.length > 0) {
    const eligible = remaining.filter((candidate) => {
      if (candidate.primaryPhraseKey && state.usedPrimaryPhrases.has(candidate.primaryPhraseKey)) return false;
      if (candidate.speedPairKeys?.some((key) => state.usedSpeedPairs.has(key))) return false;
      if (candidate.speedEnglishKeys?.some((key) => state.usedSpeedEnglish.has(key))) return false;
      return true;
    });
    if (eligible.length === 0) break;
    eligible.sort((left, right) => {
      if (left.speedPairKeys && right.speedPairKeys) {
        const conflictScore = (candidate: PoolCandidate): number => (
          (candidate.speedPairKeys ?? []).reduce((sum, key) => sum + countOf(speedPairFrequency, key), 0)
          + (candidate.speedEnglishKeys ?? []).reduce((sum, key) => sum + countOf(speedEnglishFrequency, key), 0)
        );
        const byConflict = conflictScore(left) - conflictScore(right);
        if (byConflict !== 0) return byConflict;
      }
      if (left.fillGap && right.fillGap) {
        const byPosition = countOf(state.axisCounts, `fill-position:${left.fillGap.position}`)
          - countOf(state.axisCounts, `fill-position:${right.fillGap.position}`);
        if (byPosition !== 0) return byPosition;
        const byToken = countOf(state.axisCounts, `fill-token:${left.fillGap.correctToken}`)
          - countOf(state.axisCounts, `fill-token:${right.fillGap.correctToken}`);
        if (byToken !== 0) return byToken;
        const byRole = countOf(state.axisCounts, `fill-role:${left.fillGap.grammarRole}`)
          - countOf(state.axisCounts, `fill-role:${right.fillGap.grammarRole}`);
        if (byRole !== 0) return byRole;
      }
      const axisLoad = (candidate: PoolCandidate): number => (candidate.diversityAxes ?? [])
        .reduce((sum, axis) => sum + countOf(state.axisCounts, axis), 0);
      const byAxis = axisLoad(left) - axisLoad(right);
      return byAxis
        || countOf(state.topicCounts, left.topicKey) - countOf(state.topicCounts, right.topicKey)
        || countOf(state.dayCounts, left.dayKey) - countOf(state.dayCounts, right.dayKey)
        || left.task.taskId.localeCompare(right.task.taskId);
    });
    const winner = eligible[0];
    selected.push(winner);
    if (winner.primaryPhraseKey) state.usedPrimaryPhrases.add(winner.primaryPhraseKey);
    winner.speedPairKeys?.forEach((key) => state.usedSpeedPairs.add(key));
    winner.speedEnglishKeys?.forEach((key) => state.usedSpeedEnglish.add(key));
    state.dayCounts.set(winner.dayKey, countOf(state.dayCounts, winner.dayKey) + 1);
    state.topicCounts.set(winner.topicKey, countOf(state.topicCounts, winner.topicKey) + 1);
    winner.diversityAxes?.forEach((axis) => (
      state.axisCounts.set(axis, countOf(state.axisCounts, axis) + 1)
    ));
    if (winner.fillGap) {
      const axes = [
        `fill-position:${winner.fillGap.position}`,
        `fill-token:${winner.fillGap.correctToken}`,
        `fill-role:${winner.fillGap.grammarRole}`,
      ];
      for (const axis of axes) state.axisCounts.set(axis, countOf(state.axisCounts, axis) + 1);
    }
    remaining.splice(remaining.findIndex((candidate) => candidate.task.taskId === winner.task.taskId), 1);
  }
  return selected;
}

function allCandidates(days: readonly SourceDay[]): PoolCandidate[] {
  const candidates: PoolCandidate[] = [];
  const sortedDays = [...days].sort((left, right) => (
    String(left.planId).localeCompare(String(right.planId))
    || Number(left.dayIndex) - Number(right.dayIndex)
  ));
  for (const day of sortedDays) {
    const phrases = [...(day.phrases ?? [])].sort((left, right) => String(left.id).localeCompare(String(right.id)));
    for (const phrase of phrases) {
      const guess = buildGuessTask(day, phrase);
      const gaps = buildUnambiguousFillGapCandidates(day, phrase);
      const primaryPhraseKey = phraseKey(day, String(phrase.id));
      const common = { primaryPhraseKey, dayKey: dayKey(day), topicKey: topicKey(day) };
      if (guess) candidates.push({ task: guess, ...common });
      candidates.push(...gaps);
      const strictGrammarCandidates = strictGrammarMutations(phrase);
      for (const mutation of strictGrammarCandidates.filter((candidate) => (
        candidate.grammarRole !== 'object_pronoun_reference'
      ))) {
        const oddity = buildOddityTask(day, phrase, mutation);
        if (oddity) candidates.push({
          task: oddity,
          ...common,
          diversityAxes: [
            `oddity-pos:${normalize(mutation.partOfSpeech)}`,
            `oddity-role:${mutation.grammarRole}`,
            `oddity-replacement:${normalize(mutation.replacement)}`,
          ],
        });
      }
      const safeTraps = strictGrammarCandidates.flatMap((mutation) => mutation.translationTraps.map((value) => ({
        value,
        partOfSpeech: mutation.partOfSpeech,
        original: mutation.original,
        grammarRole: mutation.grammarRole,
      })));
      const translationTraps = [...safeTraps, ...authoredLexicalTraps(phrase)]
        .filter((trap, index, all) => all.findIndex((candidate) => (
          normalize(candidate.value) === normalize(trap.value)
          && normalize(candidate.original) === normalize(trap.original)
        )) === index);
      for (const trap of translationTraps) {
        const build = buildTranslateTask(day, phrase, trap);
        if (build) candidates.push({
          task: build,
          ...common,
          diversityAxes: [
            `translate-pos:${normalize(trap.partOfSpeech)}`,
            `translate-role:${trap.grammarRole}`,
            `translate-trap:${normalize(trap.value)}`,
          ],
        });
      }
    }
    candidates.push(...buildSpeedMatchCandidates(day));
  }
  return candidates;
}

export function buildNewTournamentPool(days: readonly SourceDay[]): NewTournamentPoolResult {
  const candidates = allCandidates(days);
  const tasks: NewTournamentTask[] = [];
  const counts: Record<string, number> = {};
  const candidateCounts: Record<string, number> = {};
  const selectionState: SelectionState = {
    usedPrimaryPhrases: new Set(),
    usedSpeedPairs: new Set(),
    usedSpeedEnglish: new Set(),
    dayCounts: new Map(),
    topicCounts: new Map(),
    axisCounts: new Map(),
  };

  for (const mode of NEW_TOURNAMENT_POOL_MODES) {
    const modeCells = requiredCells([mode]).sort((left, right) => {
      if (mode !== 'speed_match') return left.difficulty - right.difficulty;
      const uniquePairs = (difficulty: number): number => new Set(candidates
        .filter((candidate) => candidate.task.mode === mode && candidate.task.difficulty === difficulty)
        .flatMap((candidate) => candidate.speedPairKeys ?? [])).size;
      return uniquePairs(left.difficulty) - uniquePairs(right.difficulty)
        || left.difficulty - right.difficulty;
    });
    if (modeCells.length === 0 || NEW_TOURNAMENT_POOL_TASKS_PER_MODE % modeCells.length !== 0) {
      throw new Error(`new_tournament_pool_cell_layout_invalid:${mode}:${modeCells.length}`);
    }
    const target = NEW_TOURNAMENT_POOL_TASKS_PER_MODE / modeCells.length;
    for (const { difficulty } of modeCells) {
      const key = `${mode}:${difficulty}`;
      const cell = candidates.filter((candidate) => (
        candidate.task.mode === mode && candidate.task.difficulty === difficulty
      ));
      candidateCounts[key] = cell.length;
      if (cell.length < target) {
        throw new Error(`new_tournament_pool_cell_shortfall:${key}:${cell.length}`);
      }
      const advancedFillGap = mode === 'fill_gap' && difficulty === 3
        ? cell.filter((candidate) => candidate.fillGap
          && ['article_form', 'verb_agreement', 'noun_number'].includes(candidate.fillGap.grammarRole))
        : [];
      const advancedTarget = advancedFillGap.length > 0 ? Math.min(8, target) : 0;
      const selectedAdvanced = selectDiverseCandidates(
        advancedFillGap,
        advancedTarget,
        selectionState,
      );
      const selected = [
        ...selectedAdvanced,
        ...selectDiverseCandidates(cell, target - selectedAdvanced.length, selectionState),
      ];
      if (selected.length < target) {
        const unusedSpeedPairs = new Set(cell.flatMap((candidate) => (candidate.speedPairKeys ?? [])
          .filter((pairKey) => !selectionState.usedSpeedPairs.has(pairKey))));
        throw new Error(`new_tournament_pool_diversity_shortfall:${key}:${selected.length}:${target}:unusedPairs=${unusedSpeedPairs.size}`);
      }
      for (const candidate of selected) {
        const { task } = candidate;
        const validation = validateTournamentTaskForNewRoom(task);
        if (!validation.ok) throw new Error(`new_tournament_pool_task_invalid:${task.taskId}:${validation.reason}`);
        tasks.push(task);
      }
      counts[key] = selected.length;
    }
  }

  tasks.sort((left, right) => left.taskId.localeCompare(right.taskId));
  if (new Set(tasks.map((task) => task.taskId)).size !== tasks.length) {
    throw new Error('new_tournament_pool_task_id_collision');
  }
  const sourcePhrases = days.reduce((total, day) => total + (day.phrases?.length ?? 0), 0);
  const contentSha256 = sha256(JSON.stringify(tasks));
  return {
    tasks,
    manifest: {
      poolVersion: NEW_TOURNAMENT_POOL_VERSION,
      generationSource: 'author_content_deterministic_v1',
      sourceDays: days.length,
      sourcePhrases,
      taskCount: tasks.length,
      counts,
      candidateCounts,
      diversity: {
        uniquePrimaryPhrases: selectionState.usedPrimaryPhrases.size,
        uniqueSpeedPairs: selectionState.usedSpeedPairs.size,
        uniqueSpeedEnglishPrompts: selectionState.usedSpeedEnglish.size,
        sourceDaysUsed: selectionState.dayCounts.size,
        topicsUsed: selectionState.topicCounts.size,
        fillGapPositions: countsWithPrefix(selectionState.axisCounts, 'fill-position:'),
        fillGapGrammarRoles: countsWithPrefix(selectionState.axisCounts, 'fill-role:'),
        fillGapCorrectTokens: countsWithPrefix(selectionState.axisCounts, 'fill-token:'),
        oddityPartsOfSpeech: countsWithPrefix(selectionState.axisCounts, 'oddity-pos:'),
        translateTrapPartsOfSpeech: countsWithPrefix(selectionState.axisCounts, 'translate-pos:'),
        translateTrapTokens: countsWithPrefix(selectionState.axisCounts, 'translate-trap:'),
      },
      contentSha256,
    },
  };
}
