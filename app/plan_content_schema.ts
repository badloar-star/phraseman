/**
 * Plan content schema — the contract the new generator pipeline produces and that
 * content agents fill. It is intentionally richer than the runtime LessonPhrase so it
 * can carry grammar adaptivity, full teacher-style explanations, and the day vocabulary.
 * A thin adapter (plan_content_runtime_adapter) maps it down to runtime shapes.
 *
 * Style contract (owner-fixed):
 *  - Phrases: living/conversational English (I'm, gonna), short.
 *  - Explanations: friendly-coach tone, on "ты", in the USER's language (ru/uk/es),
 *    FULL = rule + why + common mistake.
 *  - Day vocabulary: 5-8 key words/day with translation + part of speech + example.
 *  - Adaptivity: every phrase declares the grammar constructions it uses so the day
 *    can stay within the learner's lesson gate.
 *
 * Pure module — no runtime deps, fully testable.
 */

import type { CefrBand } from './lesson_grammar_map';
import { isWordCategory } from './pos_taxonomy';

export type UiLang = 'ru' | 'uk' | 'es';

/** A localized teaching text. ru is required; uk/es optional (UI falls back to ru). */
export type LocalizedText = {
  ru: string;
  uk?: string;
  es?: string;
};

/**
 * Full, friendly-coach explanation for one phrase or construction.
 * rule = what the construction is, why = why it works that way, commonMistake = the
 * typical learner error. All in the user's language.
 */
export type PhraseExplanation = {
  /** Short title, e.g. "Маленький глагол I'm". */
  title: LocalizedText;
  /** The rule, plainly. */
  rule: LocalizedText;
  /** Why it works this way (the "aha"). */
  why: LocalizedText;
  /** The common mistake learners make here. */
  commonMistake: LocalizedText;
};

/** A key vocabulary word surfaced for the day. */
export type PlanVocabularyWord = {
  /** The English word as it appears in the day's phrases. */
  word: string;
  /** Part of speech — a real WordCategory tag (verb/noun/preposition/...). */
  partOfSpeech: string;
  /** Translation in the user's language. */
  translation: LocalizedText;
  /** A short example, ideally the day phrase the word came from. */
  example: string;
};

/**
 * One word of a phrase, with its part of speech and exercise distractors.
 * Agents author these so POS is exact (not guessed) and distractors are sensible
 * same-class options — that's what powers "build the phrase" / "fill the word".
 */
export type PlanContentWord = {
  /** The word exactly as it appears in the phrase (no trailing punctuation). */
  text: string;
  /** Part of speech — a real WordCategory tag (verb/noun/preposition/...). */
  partOfSpeech: string;
  /** 3-5 plausible wrong options of the same class for the word-bank/missing-word modes. */
  distractors: string[];
};

/** One phrase in a plan day. */
export type PlanContentPhrase = {
  id: string;
  /** Living, conversational English. */
  english: string;
  /** Source-language meanings. ru required; uk/es optional. */
  meaning: LocalizedText;
  /** Grammar constructions this phrase uses (tags from lesson_grammar_map). */
  constructions: string[];
  /** Full friendly-coach explanation for the phrase. */
  explanation: PhraseExplanation;
  /** Per-word POS + distractors, authored by agents (in phrase order). */
  words: PlanContentWord[];
};

/**
 * One theory/intro screen for the day, written by agents specifically for THIS day
 * (not borrowed from a lesson). Mirrors the proven lesson intro kinds so it renders
 * with the same teaching UI. Friendly-coach tone, user's language.
 */
export type PlanIntroKind = 'why' | 'how' | 'trap' | 'tip' | 'mechanic';

export type PlanIntroScreen = {
  kind: PlanIntroKind;
  title: LocalizedText;
  /** Body text of the screen. */
  body: LocalizedText;
  /** Optional concrete examples (English + native gloss). */
  examples?: { en: string; gloss: LocalizedText }[];
};

/** A full day of generated plan content. */
export type PlanContentDay = {
  planId: string;
  dayIndex: number;
  /** Real-life situation/topic for the day. */
  topic: LocalizedText;
  /** What the learner can do after the day (gain framing). */
  outcome: LocalizedText;
  /** CEFR band this day targets. */
  level: CefrBand;
  /** Lessons whose grammar this day relies on (drives the "finish lesson X" hint). */
  prerequisiteLessons: number[];
  /** Day-specific theory screens (why this matters / how it works / common trap). */
  intro: PlanIntroScreen[];
  phrases: PlanContentPhrase[];
  /** 5-8 key words introduced this day. */
  vocabulary: PlanVocabularyWord[];
};

// ── Validation ───────────────────────────────────────────────────────────────

export const PLAN_DAY_MIN_PHRASES = 5;
export const PLAN_DAY_MAX_PHRASES = 10;
export const PLAN_DAY_MIN_VOCAB = 5;
export const PLAN_DAY_MAX_VOCAB = 8;
/** Theory/intro screens per day (day-specific, written by agents). */
export const PLAN_DAY_MAX_INTRO = 4;
/** Sentences/explanations should stay short and calm (Bible: <=10 words feel). */
export const EXPLANATION_MAX_WORDS = 24;
/**
 * Distractors per word for the word-bank / missing-word modes.
 * EXACTLY 5 — so the learner always sees 6 options total (1 correct + 5 distractors).
 */
export const WORD_MIN_DISTRACTORS = 5;
export const WORD_MAX_DISTRACTORS = 5;

/** Tokenize a phrase the same way the runtime word-builder does (strip trailing punct). */
function phraseTokens(english: string): string[] {
  return english
    .replace(/[.?!,;]+/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

export type PlanContentIssueCode =
  | 'missing_phrases'
  | 'too_few_phrases'
  | 'too_many_phrases'
  | 'phrase_missing_english'
  | 'phrase_missing_meaning'
  | 'phrase_missing_constructions'
  | 'phrase_missing_explanation'
  | 'explanation_too_long'
  | 'phrase_missing_words'
  | 'word_not_in_phrase'
  | 'word_invalid_pos'
  | 'word_too_few_distractors'
  | 'word_distractor_collides'
  | 'missing_vocabulary'
  | 'too_few_vocabulary'
  | 'too_many_vocabulary'
  | 'vocab_missing_pos'
  | 'vocab_missing_translation'
  | 'vocab_not_in_phrases'
  | 'missing_outcome'
  | 'missing_prerequisites'
  | 'missing_intro'
  | 'too_many_intro'
  | 'intro_screen_incomplete';

export type PlanContentIssue = {
  code: PlanContentIssueCode;
  detail: string;
  phraseId?: string;
  word?: string;
};

function hasRu(text: LocalizedText | undefined): boolean {
  return Boolean(text && typeof text.ru === 'string' && text.ru.trim().length > 0);
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function explanationComplete(explanation: PhraseExplanation | undefined): boolean {
  return Boolean(
    explanation &&
      hasRu(explanation.title) &&
      hasRu(explanation.rule) &&
      hasRu(explanation.why) &&
      hasRu(explanation.commonMistake),
  );
}

function explanationTooLong(explanation: PhraseExplanation): boolean {
  return [explanation.rule, explanation.why, explanation.commonMistake].some(
    (part) => wordCount(part.ru) > EXPLANATION_MAX_WORDS,
  );
}

/**
 * Validate a generated day against the content contract. Returns all issues found
 * (empty array = ready). Agents must produce a day that passes this with zero issues.
 */
export function validatePlanContentDay(day: PlanContentDay): PlanContentIssue[] {
  const issues: PlanContentIssue[] = [];

  // Phrases
  if (!day.phrases || day.phrases.length === 0) {
    issues.push({ code: 'missing_phrases', detail: 'Day has no phrases.' });
  } else {
    if (day.phrases.length < PLAN_DAY_MIN_PHRASES) {
      issues.push({ code: 'too_few_phrases', detail: `Need >= ${PLAN_DAY_MIN_PHRASES} phrases, got ${day.phrases.length}.` });
    }
    if (day.phrases.length > PLAN_DAY_MAX_PHRASES) {
      issues.push({ code: 'too_many_phrases', detail: `Need <= ${PLAN_DAY_MAX_PHRASES} phrases, got ${day.phrases.length}.` });
    }
    for (const phrase of day.phrases) {
      if (!phrase.english || !phrase.english.trim()) {
        issues.push({ code: 'phrase_missing_english', detail: 'Phrase has no English text.', phraseId: phrase.id });
      }
      if (!hasRu(phrase.meaning)) {
        issues.push({ code: 'phrase_missing_meaning', detail: 'Phrase has no russian meaning.', phraseId: phrase.id });
      }
      if (!phrase.constructions || phrase.constructions.length === 0) {
        issues.push({ code: 'phrase_missing_constructions', detail: 'Phrase declares no grammar constructions.', phraseId: phrase.id });
      }
      if (!explanationComplete(phrase.explanation)) {
        issues.push({ code: 'phrase_missing_explanation', detail: 'Phrase explanation is incomplete (need title+rule+why+commonMistake).', phraseId: phrase.id });
      } else if (explanationTooLong(phrase.explanation)) {
        issues.push({ code: 'explanation_too_long', detail: `Explanation part exceeds ${EXPLANATION_MAX_WORDS} words.`, phraseId: phrase.id });
      }

      // Per-word POS + distractors (authored, not guessed).
      if (!phrase.words || phrase.words.length === 0) {
        issues.push({ code: 'phrase_missing_words', detail: 'Phrase has no authored words (POS + distractors).', phraseId: phrase.id });
      } else {
        const tokenSet = new Set(phraseTokens(phrase.english).map((t) => t.toLowerCase()));
        for (const word of phrase.words) {
          const lower = word.text.toLowerCase();
          if (!tokenSet.has(lower)) {
            issues.push({ code: 'word_not_in_phrase', detail: `Word "${word.text}" is not a token of the phrase.`, phraseId: phrase.id, word: word.text });
          }
          if (!isWordCategory(word.partOfSpeech)) {
            issues.push({ code: 'word_invalid_pos', detail: `Word "${word.text}" has an invalid part of speech "${word.partOfSpeech}".`, phraseId: phrase.id, word: word.text });
          }
          const distractors = word.distractors ?? [];
          if (distractors.length < WORD_MIN_DISTRACTORS || distractors.length > WORD_MAX_DISTRACTORS) {
            issues.push({ code: 'word_too_few_distractors', detail: `Word "${word.text}" needs ${WORD_MIN_DISTRACTORS}-${WORD_MAX_DISTRACTORS} distractors, got ${distractors.length}.`, phraseId: phrase.id, word: word.text });
          }
          if (distractors.some((d) => d.toLowerCase() === lower)) {
            issues.push({ code: 'word_distractor_collides', detail: `Word "${word.text}" lists itself as a distractor.`, phraseId: phrase.id, word: word.text });
          }
        }
      }
    }
  }

  // Vocabulary
  if (!day.vocabulary || day.vocabulary.length === 0) {
    issues.push({ code: 'missing_vocabulary', detail: 'Day has no key vocabulary.' });
  } else {
    if (day.vocabulary.length < PLAN_DAY_MIN_VOCAB) {
      issues.push({ code: 'too_few_vocabulary', detail: `Need >= ${PLAN_DAY_MIN_VOCAB} key words, got ${day.vocabulary.length}.` });
    }
    if (day.vocabulary.length > PLAN_DAY_MAX_VOCAB) {
      issues.push({ code: 'too_many_vocabulary', detail: `Need <= ${PLAN_DAY_MAX_VOCAB} key words, got ${day.vocabulary.length}.` });
    }
    const phraseText = (day.phrases ?? [])
      .map((phrase) => phrase.english.toLowerCase())
      .join(' ');
    for (const vocab of day.vocabulary) {
      if (!vocab.partOfSpeech || !vocab.partOfSpeech.trim()) {
        issues.push({ code: 'vocab_missing_pos', detail: 'Vocabulary word has no part of speech.', word: vocab.word });
      }
      if (!hasRu(vocab.translation)) {
        issues.push({ code: 'vocab_missing_translation', detail: 'Vocabulary word has no russian translation.', word: vocab.word });
      }
      // Key words must actually appear in the day's phrases.
      if (phraseText && !phraseText.includes(vocab.word.toLowerCase())) {
        issues.push({ code: 'vocab_not_in_phrases', detail: 'Key word does not appear in any day phrase.', word: vocab.word });
      }
    }
  }

  // Intro / theory screens (day-specific, 1-4 screens).
  if (!day.intro || day.intro.length === 0) {
    issues.push({ code: 'missing_intro', detail: 'Day has no theory/intro screens.' });
  } else {
    if (day.intro.length > PLAN_DAY_MAX_INTRO) {
      issues.push({ code: 'too_many_intro', detail: `Need <= ${PLAN_DAY_MAX_INTRO} intro screens, got ${day.intro.length}.` });
    }
    const validIntroKinds: ReadonlySet<string> = new Set(['why', 'how', 'trap', 'tip', 'mechanic']);
    for (const screen of day.intro) {
      if (!hasRu(screen.title) || !hasRu(screen.body)) {
        issues.push({ code: 'intro_screen_incomplete', detail: `Intro screen "${screen.kind}" needs a title and body.` });
      }
      if (!validIntroKinds.has(screen.kind)) {
        issues.push({ code: 'intro_screen_incomplete', detail: `Intro screen has invalid kind "${screen.kind}" (allowed: why/how/trap/tip/mechanic).` });
      }
    }
  }

  // Day-level
  if (!hasRu(day.outcome)) {
    issues.push({ code: 'missing_outcome', detail: 'Day has no learner outcome.' });
  }
  if (!day.prerequisiteLessons || day.prerequisiteLessons.length === 0) {
    issues.push({ code: 'missing_prerequisites', detail: 'Day declares no prerequisite lessons.' });
  }

  return issues;
}

export function planContentDayIsReady(day: PlanContentDay): boolean {
  return validatePlanContentDay(day).length === 0;
}
