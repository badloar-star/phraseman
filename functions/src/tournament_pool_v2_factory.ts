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
  type SourceVocabularyWord,
  type SourceWord,
} from './tournament_task_factory';

export const NEW_TOURNAMENT_POOL_VERSION = 'tpool_20260801_v4' as const;
export const NEW_TOURNAMENT_POOL_TASKS_PER_CELL = 12;

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

type AuthoredWordPair = AuthoredPair & {
  readonly phraseId: string;
};

type WordMutation = {
  readonly original: string;
  readonly replacement: string;
  readonly partOfSpeech: string;
  readonly mutatedPhrase: string;
  readonly gapPhrase: string;
  readonly options: readonly string[];
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

type FillGapCandidateMetadata = {
  readonly grammarRole: FillGapGrammarRole;
  readonly correctToken: string;
  readonly position: 'first' | 'middle' | 'last';
  readonly phraseKey: string;
};

type PoolCandidate = {
  readonly task: NewTournamentTask;
  readonly fillGap?: FillGapCandidateMetadata;
};

const FILL_WORD_PRIORITY = new Map([
  ['to-be', 0],
  ['article', 1],
  ['determiner', 2],
  ['preposition', 3],
  ['phrasal_particle', 4],
  ['modal', 5],
  ['pronoun', 6],
  ['verb', 7],
  ['adverb', 8],
  ['adjective', 9],
  ['noun', 10],
  ['conjunction', 11],
  ['other', 12],
]);

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
  return id && en && ru ? { id, en, ru } : null;
}

function usablePairs(day: SourceDay): AuthoredPair[] {
  return (day.phrases ?? [])
    .map(authoredPair)
    .filter((pair): pair is AuthoredPair => !!pair);
}

function authoredWordPairs(day: SourceDay): AuthoredWordPair[] {
  const sourceWords = new Map<string, { phraseId: string; word: SourceWord }>();
  for (const phrase of day.phrases ?? []) {
    for (const word of phrase.words ?? []) {
      const english = String(word.text ?? '').trim();
      if (!isSingleLexicalWord(english)) continue;
      const key = normalize(english);
      if (!sourceWords.has(key)) sourceWords.set(key, { phraseId: String(phrase.id), word });
    }
  }

  const pairs: AuthoredWordPair[] = [];
  const seenEnglish = new Set<string>();
  const seenRussian = new Set<string>();
  for (const vocabulary of day.vocabulary ?? []) {
    const authored = vocabulary as SourceVocabularyWord;
    const vocabularyWord = String(authored.word ?? '').trim();
    const russian = String(authored.translation?.ru ?? '').trim();
    if (!isSingleLexicalWord(vocabularyWord) || !isSingleLexicalWord(russian)) continue;
    const englishKey = normalize(vocabularyWord);
    const source = sourceWords.get(englishKey);
    if (!source || normalize(String(source.word.partOfSpeech ?? ''))
      !== normalize(String(authored.partOfSpeech ?? ''))) continue;
    const english = String(source.word.text).trim();
    const russianKey = normalize(russian);
    if (seenEnglish.has(englishKey) || seenRussian.has(russianKey)) continue;
    seenEnglish.add(englishKey);
    seenRussian.add(russianKey);
    pairs.push({
      id: `${source.phraseId}:word:${englishKey}`,
      phraseId: source.phraseId,
      en: english,
      ru: russian,
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
  return `tp2_20260801_v4_${shortMode[mode]}_d${difficulty}_${sha256(`${NEW_TOURNAMENT_POOL_VERSION}:${identity}`).slice(0, 20)}`;
}

function tags(day: SourceDay): string[] {
  return [
    'source:ai',
    'generator:author-content-v1',
    `pool:${NEW_TOURNAMENT_POOL_VERSION}`,
    `plan:${String(day.planId).slice(0, 32)}`,
    `cefr:${String(day.level ?? 'unknown').toLowerCase().slice(0, 16)}`,
  ];
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

function mutationForPhrase(phrase: SourcePhrase): WordMutation | null {
  const english = String(phrase.english ?? '').trim();
  const candidates = (phrase.words ?? [])
    .map((word, sourceIndex) => ({ word, sourceIndex }))
    .filter(({ word }) => within(String(word.text ?? ''), TOURNAMENT_TASK_LIMITS.optionBytes))
    .map(({ word, sourceIndex }) => {
      const original = String(word.text).trim();
      const distractors = Array.from(new Map((word.distractors ?? [])
        .map((value) => String(value ?? '').trim())
        .filter((value) => within(value, TOURNAMENT_TASK_LIMITS.optionBytes) && normalize(value) !== normalize(original))
        .map((value) => [normalize(value), value])).values());
      return { word, sourceIndex, original, distractors };
    })
    .filter((candidate) => candidate.distractors.length >= 3)
    .sort((left, right) => (
      (FILL_WORD_PRIORITY.get(String(left.word.partOfSpeech)) ?? 99)
      - (FILL_WORD_PRIORITY.get(String(right.word.partOfSpeech)) ?? 99)
      || left.sourceIndex - right.sourceIndex
    ));

  for (const candidate of candidates) {
    const distractors = stableShuffle(candidate.distractors, `word-traps:${phrase.id}:${candidate.original}`);
    const replacement = distractors[0];
    const mutatedPhrase = replaceAuthoredWord(english, candidate.original, replacement);
    const gapPhrase = replaceAuthoredWord(english, candidate.original, '___');
    if (!mutatedPhrase || !gapPhrase || normalize(mutatedPhrase) === normalize(english)) continue;
    if (!within(mutatedPhrase, TOURNAMENT_TASK_LIMITS.optionBytes)
      || !within(gapPhrase, TOURNAMENT_TASK_LIMITS.phraseBytes)) continue;
    return {
      original: candidate.original,
      replacement,
      partOfSpeech: String(candidate.word.partOfSpeech ?? 'word'),
      mutatedPhrase,
      gapPhrase,
      options: [candidate.original, ...distractors.slice(0, 3)],
    };
  }
  return null;
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
    optionPairs.map((option) => option.id), {
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

function fillGapRoleNote(mutation: FillGapMutation): string {
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

function buildFillGapTask(
  day: SourceDay,
  phrase: SourcePhrase,
  mutation: FillGapMutation,
): NewTournamentTask | null {
  const pair = authoredPair(phrase);
  if (!pair) return null;
  const options = stableShuffle(mutation.options, `gap-options:${pair.id}`);
  const correctIndex = options.findIndex((option) => option === mutation.original);
  const prompt = `${mutation.gapPhrase}\n${pair.ru}`;
  if (!within(prompt, TOURNAMENT_TASK_LIMITS.phraseBytes)) return null;
  const roleNote = fillGapRoleNote(mutation);
  const trapViolation = mutation.grammarRole === 'object_pronoun_reference'
    ? 'вариант меняет референта, прямо указанного в русском переводе'
    : 'форма нарушает проверяемое согласование или падеж';
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
  return fillGapMutations(phrase).flatMap((mutation) => {
    const task = buildFillGapTask(day, phrase, mutation);
    if (!task) return [];
    const position = mutation.tokenIndex === 0
      ? 'first'
      : (mutation.tokenIndex === mutation.tokenCount - 1 ? 'last' : 'middle');
    return [{
      task,
      fillGap: {
        grammarRole: mutation.grammarRole,
        correctToken: normalize(mutation.original),
        position,
        phraseKey: `${day.planId}:${day.dayIndex}:${phrase.id}`,
      },
    }];
  });
}

function buildOddityTask(day: SourceDay, phrase: SourcePhrase): NewTournamentTask | null {
  const pair = authoredPair(phrase);
  const mutation = mutationForPhrase(phrase);
  if (!pair || !mutation) return null;
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
    ruleNote: truncateToBytes(`«${withoutTerminalPunctuation(mutation.mutatedPhrase)}» — ловушка: «${mutation.replacement}» подменило «${mutation.original}». Правильно: «${withoutTerminalPunctuation(pair.en)}».`, TOURNAMENT_TASK_LIMITS.explanationBytes),
    example: truncateToBytes(`${pair.en} — ${pair.ru}`, TOURNAMENT_TASK_LIMITS.explanationBytes),
    wrongOptionReasons: optionRecords.map((option) => option.odd
      ? ''
      : truncateToBytes(`«${option.text}» — нормальная фраза со смыслом «${withoutTerminalPunctuation(option.ru)}»; исправлять нужно «${withoutTerminalPunctuation(mutation.mutatedPhrase)}».`, TOURNAMENT_TASK_LIMITS.explanationBytes)),
  };
  return baseTask(day, 'find_oddity', `odd:${day.planId}:${day.dayIndex}:${pair.id}:${mutation.replacement}`,
    optionRecords.map((option) => option.id), {
      phrase: 'Найдите фразу, которую нужно исправить.',
      options,
      correctIndex,
      correctAnswer: mutation.mutatedPhrase,
    }, explanation);
}

function authoredTraps(words: readonly SourceWord[] | undefined, correctTokens: readonly string[]): string[] {
  const seen = new Set(correctTokens.map(normalize));
  const candidates: string[] = [];
  for (const word of words ?? []) {
    for (const raw of word.distractors ?? []) {
      const value = String(raw ?? '').trim();
      const key = normalize(value);
      if (!within(value, TOURNAMENT_TASK_LIMITS.tokenBytes) || seen.has(key)) continue;
      seen.add(key);
      candidates.push(value);
    }
  }
  return candidates;
}

function buildTranslateTask(day: SourceDay, phrase: SourcePhrase): NewTournamentTask | null {
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
  const traps = stableShuffle(authoredTraps(phrase.words, correctTokens), `build-traps:${pair.id}`).slice(0, maxTraps);
  if (traps.length < 1) return null;
  const wordBank = stableShuffle([...correctTokens, ...traps], `build-bank:${pair.id}`);
  const explanation: TournamentTaskExplanation = {
    ruleNote: truncateToBytes(`Правильный порядок — «${withoutTerminalPunctuation(pair.en)}». Слова знакомы, но английский порядок не собирается телепатией.`, TOURNAMENT_TASK_LIMITS.explanationBytes),
    example: truncateToBytes(`${pair.ru} — ${pair.en}`, TOURNAMENT_TASK_LIMITS.explanationBytes),
    wrongOptionReasons: [],
  };
  return baseTask(day, 'translate_build', `build:${day.planId}:${day.dayIndex}:${pair.id}`,
    [pair.id], {
      phrase: pair.ru,
      wordBank,
      correctTokenCount: correctTokens.length,
      correctTokens,
      correctAnswer: pair.en,
    }, explanation);
}

function buildSpeedMatchTask(day: SourceDay): NewTournamentTask | null {
  const pairs = stableShuffle(
    authoredWordPairs(day),
    `pairs-source:${day.planId}:${day.dayIndex}`,
  ).slice(0, 6);
  if (pairs.length !== 6
    || pairs.some((pair) => !within(pair.en, TOURNAMENT_TASK_LIMITS.promptBytes)
      || !within(pair.ru, TOURNAMENT_TASK_LIMITS.optionBytes)
      || !isSingleLexicalWord(pair.en)
      || !isSingleLexicalWord(pair.ru))) return null;
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
        ruleNote: truncateToBytes(`«${withoutTerminalPunctuation(pair.en)}» означает «${withoutTerminalPunctuation(pair.ru)}». Это точная пара из авторского словаря урока.`, TOURNAMENT_TASK_LIMITS.explanationBytes),
        example: truncateToBytes(`${pair.en} — ${pair.ru}`, TOURNAMENT_TASK_LIMITS.explanationBytes),
        wrongOptionReasons: rightPairs.map((right) => right.id === pair.id
          ? ''
          : truncateToBytes(`«${right.ru}» — перевод фразы «${withoutTerminalPunctuation(right.en)}», а не «${withoutTerminalPunctuation(pair.en)}».`, TOURNAMENT_TASK_LIMITS.explanationBytes)),
      },
    };
  });
  const first = itemPairs[0];
  return baseTask(day, 'speed_match', `pairs:${day.planId}:${day.dayIndex}`,
    pairs.map((pair) => pair.phraseId), {
      prompt: 'Соедините английские слова с точными русскими переводами.',
      rightOptions,
      items,
    }, {
      ruleNote: 'Каждое слово слева соединяется с одним точным переводом справа. Шесть пар — никаких лишних карточек.',
      example: `${first.en} — ${first.ru}`,
      wrongOptionReasons: [],
    });
}

function selectDiverseFillGapCandidates(
  cell: readonly PoolCandidate[],
  count: number,
): PoolCandidate[] {
  const remaining = [...cell];
  const selected: PoolCandidate[] = [];
  const usedPhrases = new Set<string>();
  const positionCounts = new Map<string, number>();
  const roleCounts = new Map<string, number>();
  const tokenCounts = new Map<string, number>();
  const countOf = (counts: ReadonlyMap<string, number>, key: string): number => counts.get(key) ?? 0;

  while (selected.length < count && remaining.length > 0) {
    const unusedPhrases = remaining.filter((candidate) => (
      candidate.fillGap && !usedPhrases.has(candidate.fillGap.phraseKey)
    ));
    const eligible = unusedPhrases.length > 0 ? unusedPhrases : remaining;
    eligible.sort((left, right) => {
      const leftMeta = left.fillGap!;
      const rightMeta = right.fillGap!;
      return countOf(positionCounts, leftMeta.position) - countOf(positionCounts, rightMeta.position)
        || countOf(tokenCounts, leftMeta.correctToken) - countOf(tokenCounts, rightMeta.correctToken)
        || countOf(roleCounts, leftMeta.grammarRole) - countOf(roleCounts, rightMeta.grammarRole)
        || sha256(`fill-gap-pool:${NEW_TOURNAMENT_POOL_VERSION}:${left.task.taskId}`)
          .localeCompare(sha256(`fill-gap-pool:${NEW_TOURNAMENT_POOL_VERSION}:${right.task.taskId}`));
    });
    const winner = eligible[0];
    const metadata = winner.fillGap!;
    selected.push(winner);
    usedPhrases.add(metadata.phraseKey);
    positionCounts.set(metadata.position, countOf(positionCounts, metadata.position) + 1);
    roleCounts.set(metadata.grammarRole, countOf(roleCounts, metadata.grammarRole) + 1);
    tokenCounts.set(metadata.correctToken, countOf(tokenCounts, metadata.correctToken) + 1);
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
      const oddity = buildOddityTask(day, phrase);
      const build = buildTranslateTask(day, phrase);
      if (guess) candidates.push({ task: guess });
      candidates.push(...gaps);
      if (oddity) candidates.push({ task: oddity });
      if (build) candidates.push({ task: build });
    }
    const pairs = buildSpeedMatchTask(day);
    if (pairs) candidates.push({ task: pairs });
  }
  return candidates;
}

export function buildNewTournamentPool(days: readonly SourceDay[]): NewTournamentPoolResult {
  const candidates = allCandidates(days);
  const tasks: NewTournamentTask[] = [];
  const counts: Record<string, number> = {};
  const candidateCounts: Record<string, number> = {};

  for (const mode of NEW_TOURNAMENT_POOL_MODES) {
    for (const difficulty of [1, 2, 3]) {
      const key = `${mode}:${difficulty}`;
      const cell = candidates.filter((candidate) => (
        candidate.task.mode === mode && candidate.task.difficulty === difficulty
      ));
      candidateCounts[key] = cell.length;
      if (cell.length < NEW_TOURNAMENT_POOL_TASKS_PER_CELL) {
        throw new Error(`new_tournament_pool_cell_shortfall:${key}:${cell.length}`);
      }
      const selected = mode === 'fill_gap'
        ? selectDiverseFillGapCandidates(cell, NEW_TOURNAMENT_POOL_TASKS_PER_CELL)
        : [...cell]
          .sort((left, right) => sha256(`${NEW_TOURNAMENT_POOL_VERSION}:${left.task.taskId}`)
            .localeCompare(sha256(`${NEW_TOURNAMENT_POOL_VERSION}:${right.task.taskId}`)))
          .slice(0, NEW_TOURNAMENT_POOL_TASKS_PER_CELL);
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
      contentSha256,
    },
  };
}
