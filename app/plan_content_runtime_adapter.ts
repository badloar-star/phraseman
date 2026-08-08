import { WORD_POOLS_L1 } from './constants/word_pools';
import type { LessonIntroScreen, LessonPhrase, LessonTeachingNote, LessonWord } from './lesson_data_types';
import { normalizeWordCategory } from './pos_taxonomy';
import type {
  LocalizedText,
  PhraseExplanation,
  PlanContentDay,
  PlanContentPhrase,
  PlanContentWord,
  PlanIntroScreen,
  PlanVocabularyWord,
} from './plan_content_schema';

/**
 * Maps the rich PlanContentDay (what the new generator + agents produce) down to the
 * runtime shapes the existing exercise item builders consume (LessonPhrase, etc.).
 *
 * The full friendly-coach explanation (rule + why + commonMistake) collapses into the
 * runtime LessonTeachingNote: rule+why become the "correct" side, the common mistake
 * becomes the "wrong" side. Localized uk/es are carried when present.
 *
 * Pure module — no runtime deps.
 */

function joinLocalized(parts: (LocalizedText | undefined)[], lang: 'ru' | 'uk' | 'es'): string {
  return parts
    .map((part) => (part ? (part[lang] ?? part.ru) : ''))
    .map((text) => text.trim())
    .filter(Boolean)
    .join(' ');
}

function localizedPart(part: LocalizedText | undefined, lang: keyof LocalizedText): string {
  return part ? (part[lang] ?? part.ru).trim() : '';
}

function joinPlannedLocalized(parts: (LocalizedText | undefined)[], lang: Exclude<keyof LocalizedText, 'ru' | 'uk' | 'es'>): string {
  return parts
    .map((part) => localizedPart(part, lang))
    .filter(Boolean)
    .join(' ');
}

function lessonSourceLocales(text: LocalizedText): NonNullable<LessonPhrase['sourceLocales']> | undefined {
  const sourceLocales = {
    'pt-BR': text['pt-BR'],
    vi: text.vi,
    id: text.id,
    tr: text.tr,
    pl: text.pl,
  };
  return Object.values(sourceLocales).some((value) => !!value?.trim()) ? sourceLocales : undefined;
}

/** Collapse a full PhraseExplanation into the runtime teaching note shape. */
export function explanationToTeachingNote(
  id: string,
  explanation: PhraseExplanation,
): LessonTeachingNote {
  const correctRu = joinLocalized([explanation.rule, explanation.why], 'ru');
  const correctUk = joinLocalized([explanation.rule, explanation.why], 'uk');
  const correctEs = joinLocalized([explanation.rule, explanation.why], 'es');
  const correctPtBr = joinPlannedLocalized([explanation.rule, explanation.why], 'pt-BR');
  const correctVi = joinPlannedLocalized([explanation.rule, explanation.why], 'vi');
  const correctId = joinPlannedLocalized([explanation.rule, explanation.why], 'id');
  const correctTr = joinPlannedLocalized([explanation.rule, explanation.why], 'tr');
  const correctPl = joinPlannedLocalized([explanation.rule, explanation.why], 'pl');
  return {
    id,
    titleRu: explanation.title.ru,
    ...(explanation.title.uk ? { titleUk: explanation.title.uk } : {}),
    ...(explanation.title.es ? { titleEs: explanation.title.es } : {}),
    ...(explanation.title['pt-BR'] ? { titlePtBr: explanation.title['pt-BR'] } : {}),
    ...(explanation.title.vi ? { titleVi: explanation.title.vi } : {}),
    ...(explanation.title.id ? { titleId: explanation.title.id } : {}),
    ...(explanation.title.tr ? { titleTr: explanation.title.tr } : {}),
    ...(explanation.title.pl ? { titlePl: explanation.title.pl } : {}),
    correctRu,
    ...(correctUk && correctUk !== correctRu ? { correctUk } : {}),
    ...(correctEs && correctEs !== correctRu ? { correctEs } : {}),
    ...(correctPtBr && correctPtBr !== correctRu ? { correctPtBr } : {}),
    ...(correctVi && correctVi !== correctRu ? { correctVi } : {}),
    ...(correctId && correctId !== correctRu ? { correctId } : {}),
    ...(correctTr && correctTr !== correctRu ? { correctTr } : {}),
    ...(correctPl && correctPl !== correctRu ? { correctPl } : {}),
    wrongRu: explanation.commonMistake.ru,
    ...(explanation.commonMistake.uk ? { wrongUk: explanation.commonMistake.uk } : {}),
    ...(explanation.commonMistake.es ? { wrongEs: explanation.commonMistake.es } : {}),
    ...(explanation.commonMistake['pt-BR'] ? { wrongPtBr: explanation.commonMistake['pt-BR'] } : {}),
    ...(explanation.commonMistake.vi ? { wrongVi: explanation.commonMistake.vi } : {}),
    ...(explanation.commonMistake.id ? { wrongId: explanation.commonMistake.id } : {}),
    ...(explanation.commonMistake.tr ? { wrongTr: explanation.commonMistake.tr } : {}),
    ...(explanation.commonMistake.pl ? { wrongPl: explanation.commonMistake.pl } : {}),
  };
}

function phraseTokens(english: string): string[] {
  return english
    .replace(/[.?!,;]+/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function normalizedToken(token: string): string {
  return token.toLowerCase();
}

function fallbackDistractors(correct: string, category: string): string[] {
  const poolsByCategory: Record<string, readonly string[]> = {
    pronoun: WORD_POOLS_L1.pronouns,
    article: WORD_POOLS_L1.articles,
    determiner: WORD_POOLS_L1.articles,
    'to-be': WORD_POOLS_L1.toBe,
    modal: WORD_POOLS_L1.modals,
    preposition: WORD_POOLS_L1.prepositions,
    conjunction: WORD_POOLS_L1.conjunctions,
    verb: WORD_POOLS_L1.verbs,
    noun: WORD_POOLS_L1.nouns,
    adjective: WORD_POOLS_L1.adjectives,
    adverb: WORD_POOLS_L1.adverbs,
    modifier: WORD_POOLS_L1.adverbs,
    phrasal_particle: WORD_POOLS_L1.phrasal,
  };
  const broadFallback = [
    ...WORD_POOLS_L1.misc,
    ...WORD_POOLS_L1.pronouns,
    ...WORD_POOLS_L1.verbs,
  ];
  const correctKey = normalizedToken(correct);
  const unique = new Set<string>();

  for (const candidate of [...(poolsByCategory[category] ?? []), ...broadFallback]) {
    if (normalizedToken(candidate) !== correctKey) unique.add(candidate);
    if (unique.size === 5) break;
  }

  return [...unique];
}

function authoredWordsByToken(words: PlanContentWord[]): Map<string, PlanContentWord[]> {
  const byToken = new Map<string, PlanContentWord[]>();
  for (const word of words) {
    const key = normalizedToken(word.text);
    const matches = byToken.get(key) ?? [];
    matches.push(word);
    byToken.set(key, matches);
  }
  return byToken;
}

function wordsForPhrase(phrase: PlanContentPhrase): LessonPhrase['words'] {
  const teachingNote = explanationToTeachingNote(`${phrase.id}_note`, phrase.explanation);
  const authoredByToken = authoredWordsByToken(phrase.words);

  // English is canonical. Some legacy authored arrays contain only "important"
  // words, which made the runtime display grammatically truncated phrases. Keep
  // every canonical token and reuse curated metadata wherever it exists.
  return phraseTokens(phrase.english).map((token, index): LessonWord => {
    const authoredMatches = authoredByToken.get(normalizedToken(token));
    const authored = authoredMatches?.shift();
    const category = authored?.partOfSpeech ?? normalizeWordCategory(undefined, token).category;

    return {
      text: token,
      correct: token,
      distractors: authored?.distractors ?? fallbackDistractors(token, category),
      category,
      // Attach the explanation to the first word — shown as the exercise opens.
      ...(index === 0 ? { teachingNote } : {}),
    };
  });
}

/** One content phrase -> one runtime LessonPhrase. */
export function contentPhraseToLessonPhrase(phrase: PlanContentPhrase): LessonPhrase {
  return {
    id: phrase.id,
    english: phrase.english,
    ...(phrase.alternatives && phrase.alternatives.length > 0 ? { alternatives: phrase.alternatives } : {}),
    russian: phrase.meaning.ru,
    ukrainian: phrase.meaning.uk ?? phrase.meaning.ru,
    ...(phrase.meaning.es ? { spanish: phrase.meaning.es } : {}),
    ...(lessonSourceLocales(phrase.meaning) ? { sourceLocales: lessonSourceLocales(phrase.meaning) } : {}),
    words: wordsForPhrase(phrase),
  };
}

/** All runtime phrases for a generated day. */
export function contentDayToLessonPhrases(day: PlanContentDay): LessonPhrase[] {
  return day.phrases.map(contentPhraseToLessonPhrase);
}

/** Runtime-friendly vocabulary card (POS normalized to a real WordCategory). */
export type RuntimeVocabularyCard = {
  word: string;
  partOfSpeech: string;
  translationRu: string;
  translationUk: string;
  translationEs?: string;
  sourceLocales?: NonNullable<LessonPhrase['sourceLocales']>;
  example: string;
};

/** Map a day-specific intro screen to the runtime LessonIntroScreen shape. */
export function contentIntroToLessonIntroScreen(screen: PlanIntroScreen): LessonIntroScreen {
  return {
    kind: screen.kind,
    titleRU: screen.title.ru,
    ...(screen.title.uk ? { titleUK: screen.title.uk } : {}),
    ...(screen.title.es ? { titleES: screen.title.es } : {}),
    ...(screen.title['pt-BR'] ? { titlePtBr: screen.title['pt-BR'] } : {}),
    ...(screen.title.vi ? { titleVi: screen.title.vi } : {}),
    ...(screen.title.id ? { titleId: screen.title.id } : {}),
    ...(screen.title.tr ? { titleTr: screen.title.tr } : {}),
    ...(screen.title.pl ? { titlePl: screen.title.pl } : {}),
    textRU: screen.body.ru,
    ...(screen.body.uk ? { textUK: screen.body.uk } : {}),
    ...(screen.body.es ? { textES: screen.body.es } : {}),
    ...(screen.body['pt-BR'] ? { textPtBr: screen.body['pt-BR'] } : {}),
    ...(screen.body.vi ? { textVi: screen.body.vi } : {}),
    ...(screen.body.id ? { textId: screen.body.id } : {}),
    ...(screen.body.tr ? { textTr: screen.body.tr } : {}),
    ...(screen.body.pl ? { textPl: screen.body.pl } : {}),
    ...(screen.examples && screen.examples.length > 0
      ? {
          examples: screen.examples.map((example) => ({
            en: example.en,
            trRU: example.gloss.ru,
            trUK: example.gloss.uk ?? example.gloss.ru,
            ...(example.gloss.es ? { trES: example.gloss.es } : {}),
            ...(example.gloss['pt-BR'] ? { trPtBr: example.gloss['pt-BR'] } : {}),
            ...(example.gloss.vi ? { trVi: example.gloss.vi } : {}),
            ...(example.gloss.id ? { trId: example.gloss.id } : {}),
            ...(example.gloss.tr ? { trTr: example.gloss.tr } : {}),
            ...(example.gloss.pl ? { trPl: example.gloss.pl } : {}),
          })),
        }
      : {}),
  };
}

/** All runtime intro screens for a generated day's theory. */
export function contentDayToLessonIntroScreens(day: PlanContentDay): LessonIntroScreen[] {
  return day.intro.map(contentIntroToLessonIntroScreen);
}

export function contentVocabularyToRuntimeCards(day: PlanContentDay): RuntimeVocabularyCard[] {
  return day.vocabulary.map((vocab: PlanVocabularyWord) => {
    const resolved = normalizeWordCategory(vocab.partOfSpeech, vocab.word);
    return {
      word: vocab.word,
      partOfSpeech: resolved.category,
      translationRu: vocab.translation.ru,
      translationUk: vocab.translation.uk ?? vocab.translation.ru,
      ...(vocab.translation.es ? { translationEs: vocab.translation.es } : {}),
      ...(lessonSourceLocales(vocab.translation) ? { sourceLocales: lessonSourceLocales(vocab.translation) } : {}),
      example: vocab.example,
    };
  });
}
