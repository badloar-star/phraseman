import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

import { SYSTEM_CARDS } from '../app/flashcards/system-cards';
import { IDIOMS } from '../app/idioms_data';
import { IRREGULAR_VERBS_BY_LESSON } from '../app/irregular_verbs_data';
import { LESSON_WORD_SOURCE_LOCALES_BY_EN } from '../app/lesson_words_source_locales';
import {
  getQuizPhrases,
  getQuizPoolAuditEntries,
  type QuizDifficulty,
  type QuizPoolAuditEntry,
} from '../app/quiz_data';
import {
  getStructuredQuizSourceLocalePayload,
  QUIZ_SOURCE_LOCALE_PAYLOADS,
  type QuizSourceLocalePayload,
} from '../app/quiz_source_locale_payloads';
import {
  HEISENBERG_BATCH_SOURCE_LOCALES,
  type HeisenbergSourceLocale,
  type SourceLocale,
} from '../app/source_locales';

const {
  compactSample,
  containsTerm,
  duplicateLocaleFieldValues,
  exactStringInList,
  expectedProtectedTerms,
  hasCyrillic,
  hasMojibake,
  localeLanguageSignal,
  localeCopyDifferences,
  missingRequiredFields,
  missingProtectedTerms,
} = require('./lib/heisenberg_semantic_core.cjs') as typeof import('./lib/heisenberg_semantic_core.cjs');

type Severity = 'blocker' | 'warning';
type Surface = 'quiz' | 'daily_phrase' | 'flashcards' | 'irregular_verbs' | 'lesson_words' | 'runtime';

type SemanticFinding = {
  severity: Severity;
  code: string;
  surface: Surface;
  locale?: SourceLocale | HeisenbergSourceLocale;
  difficulty?: QuizDifficulty;
  ordinal?: number;
  id?: number | string;
  field?: string;
  message: string;
  sample?: string;
};

type SemanticReviewGroup = Omit<SemanticFinding, 'locale'> & {
  count: number;
  locales: string[];
};

type SemanticReport = {
  generatedAt: string;
  mode: 'semantic-audit';
  strict: boolean;
  summary: {
    findings: number;
    blockers: number;
    warnings: number;
    reviewGroups: number;
    byCode: Record<string, number>;
    bySurface: Record<string, number>;
  };
  reviewGroups: SemanticReviewGroup[];
  findings: SemanticFinding[];
};

const DIFFICULTIES: QuizDifficulty[] = ['easy', 'medium', 'hard'];
const STRUCTURED_LOCALES = HEISENBERG_BATCH_SOURCE_LOCALES.filter(
  (locale): locale is Exclude<HeisenbergSourceLocale, 'es'> => locale !== 'es',
);
const ALL_RUNTIME_LOCALES = HEISENBERG_BATCH_SOURCE_LOCALES as readonly SourceLocale[];
const DAILY_PHRASE_FIELDS = ['literal', 'meaning', 'text'] as const;
const FLASHCARD_BATCH_REQUIRED_CATEGORY_IDS = new Set([
  'emotions',
  'fillers',
  'reactions',
  'traps',
  'phrasal',
  'situations',
  'connectors',
]);
type DailyPhraseCopy = Record<(typeof DAILY_PHRASE_FIELDS)[number], string>;
type DailyPhraseSeedRecord = {
  id: number;
  english?: string;
  literal_es?: string;
  meaning_es?: string;
  text_es?: string;
  sourceLocales?: Partial<Record<HeisenbergSourceLocale, Partial<DailyPhraseCopy>>>;
};

function timestampSlug(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function pushFinding(findings: SemanticFinding[], finding: SemanticFinding): void {
  findings.push({
    ...finding,
    sample: finding.sample ? compactSample(finding.sample) : undefined,
  });
}

function auditTextEncoding(
  findings: SemanticFinding[],
  base: Omit<SemanticFinding, 'severity' | 'code' | 'message'>,
  value: string,
): void {
  if (hasMojibake(value)) {
    pushFinding(findings, {
      ...base,
      severity: 'blocker',
      code: 'mojibake',
      message: 'Text looks like UTF-8 mojibake, so semantic review cannot trust it.',
      sample: value,
    });
  }
  if (base.locale && base.locale !== 'ru' && base.locale !== 'uk' && hasCyrillic(value)) {
    pushFinding(findings, {
      ...base,
      severity: 'blocker',
      code: 'unexpected-cyrillic',
      message: 'Non-Cyrillic source locale contains Cyrillic characters.',
      sample: value,
    });
  }
}

function auditQuizPayload(
  findings: SemanticFinding[],
  difficulty: QuizDifficulty,
  entry: QuizPoolAuditEntry,
  locale: HeisenbergSourceLocale,
  payload: QuizSourceLocalePayload | null,
): void {
  if (!payload) {
    pushFinding(findings, {
      severity: 'blocker',
      code: 'missing-quiz-locale-payload',
      surface: 'quiz',
      difficulty,
      ordinal: entry.ordinal,
      locale,
      message: 'Structured quiz payload is missing for this locale.',
    });
    return;
  }

  auditTextEncoding(
    findings,
    { surface: 'quiz', difficulty, ordinal: entry.ordinal, locale, field: 'prompt' },
    payload.prompt,
  );

  const sourceLocaleFallbackCandidates = [
    entry.ru,
    entry.uk,
    ...(locale === 'es' ? [] : [entry.es].filter(Boolean) as string[]),
  ];
  if (exactStringInList(payload.prompt, sourceLocaleFallbackCandidates)) {
    pushFinding(findings, {
      severity: 'blocker',
      code: 'source-locale-fallback',
      surface: 'quiz',
      difficulty,
      ordinal: entry.ordinal,
      locale,
      field: 'prompt',
      message: 'Prompt exactly matches another source locale.',
      sample: payload.prompt,
    });
  }

  if (exactStringInList(payload.prompt, entry.choices)) {
    pushFinding(findings, {
      severity: 'blocker',
      code: 'study-target-in-prompt',
      surface: 'quiz',
      difficulty,
      ordinal: entry.ordinal,
      locale,
      field: 'prompt',
      message: 'Prompt equals an English answer choice; English must remain the study target.',
      sample: payload.prompt,
    });
  }

  if (!Array.isArray(payload.explanations) || payload.explanations.length !== 4) {
    pushFinding(findings, {
      severity: 'blocker',
      code: 'quiz-explanation-count',
      surface: 'quiz',
      difficulty,
      ordinal: entry.ordinal,
      locale,
      field: 'explanations',
      message: 'Quiz explanations must have exactly four entries.',
    });
    return;
  }

  payload.explanations.forEach((line, index) => {
    auditTextEncoding(
      findings,
      { surface: 'quiz', difficulty, ordinal: entry.ordinal, locale, field: `explanations[${index}]` },
      line,
    );

    const choice = entry.choices[index] ?? '';
    const baseExplanation = entry.explanations[index] ?? '';
    const expectedTerms = expectedProtectedTerms([choice], baseExplanation);
    if (expectedTerms.length === 0) return;

    const missingTerms = missingProtectedTerms([choice], baseExplanation, line);
    if (missingTerms.length === 0) return;

    const appearsElsewhere = payload.explanations.some(
      (otherLine, otherIndex) => otherIndex !== index && missingTerms.every((term: string) => containsTerm(otherLine, term)),
    );

    pushFinding(findings, {
      severity: 'warning',
      code: appearsElsewhere ? 'possible-distractor-index-drift' : 'protected-english-term-missing',
      surface: 'quiz',
      difficulty,
      ordinal: entry.ordinal,
      locale,
      field: `explanations[${index}]`,
      message: `Localized explanation is missing protected English term(s): ${missingTerms.join(', ')}.`,
      sample: line,
    });
  });
}

function inlineSpanishQuizPayload(entry: QuizPoolAuditEntry): QuizSourceLocalePayload | null {
  if (!entry.es?.trim()) return null;
  if (!entry.explanationsES || entry.explanationsES.length !== 4) return null;
  return {
    prompt: entry.es,
    explanations: entry.explanationsES as [string, string, string, string],
  };
}

function completeStructuredQuizPayload(
  difficulty: QuizDifficulty,
  ordinal: number,
  locale: Exclude<HeisenbergSourceLocale, 'es'>,
): QuizSourceLocalePayload | null {
  const payload = getStructuredQuizSourceLocalePayload(difficulty, ordinal, locale);
  if (!payload?.prompt?.trim()) return null;
  if (!payload.explanations || payload.explanations.length !== 4) return null;
  return payload;
}

function auditQuizSourceLocaleCoverage(findings: SemanticFinding[]): void {
  for (const difficulty of DIFFICULTIES) {
    const entries = getQuizPoolAuditEntries(difficulty);
    for (const entry of entries) {
      for (const locale of HEISENBERG_BATCH_SOURCE_LOCALES) {
        const payload = locale === 'es'
          ? inlineSpanishQuizPayload(entry)
          : completeStructuredQuizPayload(difficulty, entry.ordinal, locale);
        if (payload) continue;

        pushFinding(findings, {
          severity: 'warning',
          code: 'quiz-source-locale-coverage-gap',
          surface: 'quiz',
          difficulty,
          ordinal: entry.ordinal,
          locale,
          message: 'Quiz source-locale copy is missing for this entry; English choices remain the study target, but prompt/explanations need localized source copy.',
          sample: entry.ru,
        });
      }
    }
  }
}

function auditInlineSpanishQuizPayloads(findings: SemanticFinding[]): void {
  for (const difficulty of DIFFICULTIES) {
    const entries = getQuizPoolAuditEntries(difficulty);
    for (const entry of entries) {
      const payload = inlineSpanishQuizPayload(entry);
      if (!payload) continue;
      auditQuizPayload(findings, difficulty, entry, 'es', payload);
    }
  }
}

function auditStructuredQuizPayloads(findings: SemanticFinding[]): void {
  auditQuizSourceLocaleCoverage(findings);
  auditInlineSpanishQuizPayloads(findings);

  for (const difficulty of DIFFICULTIES) {
    const entries = getQuizPoolAuditEntries(difficulty);
    const payloadOrdinals = Object.keys(QUIZ_SOURCE_LOCALE_PAYLOADS[difficulty] ?? {})
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0)
      .sort((a, b) => a - b);

    for (const ordinal of payloadOrdinals) {
      const entry = entries[ordinal - 1];
      if (!entry) {
        pushFinding(findings, {
          severity: 'blocker',
          code: 'quiz-payload-without-source-entry',
          surface: 'quiz',
          difficulty,
          ordinal,
          message: 'Structured payload exists, but quiz pool entry is missing.',
        });
        continue;
      }

      for (const locale of STRUCTURED_LOCALES) {
        auditQuizPayload(findings, difficulty, entry, locale, getStructuredQuizSourceLocalePayload(difficulty, ordinal, locale));
      }
    }
  }
}

function auditRuntimeEnglishTarget(findings: SemanticFinding[]): void {
  for (const difficulty of DIFFICULTIES) {
    for (const locale of ALL_RUNTIME_LOCALES) {
      const phrases = getQuizPhrases(difficulty, 5000, locale);
      phrases.forEach((phrase, index) => {
        if (phrase.sourceLocale !== locale) {
          pushFinding(findings, {
            severity: 'blocker',
            code: 'runtime-source-locale-mismatch',
            surface: 'runtime',
            difficulty,
            ordinal: index + 1,
            locale,
            message: 'Runtime quiz phrase reports a different source locale than requested.',
            sample: String(phrase.sourceLocale),
          });
        }
        if (!phrase.choices.every((choice) => /^[\x00-\x7F]+$/.test(choice))) {
          pushFinding(findings, {
            severity: 'blocker',
            code: 'runtime-choice-not-english-ascii',
            surface: 'runtime',
            difficulty,
            ordinal: index + 1,
            locale,
            message: 'Runtime quiz choice contains non-ASCII text; English choices must remain the study target.',
            sample: phrase.choices.join(' | '),
          });
        }
      });
    }
  }
}

function phraseAnchorFound(english: string, text: string): boolean {
  if (containsTerm(text, english)) return true;
  const tokens = english.match(/[A-Za-z][A-Za-z']*/g) ?? [];
  if (tokens.length < 2) return false;
  return containsTerm(text, tokens.slice(0, 2).join(' '));
}

function loadDailyPhraseSeed(findings: SemanticFinding[]): Map<number, DailyPhraseSeedRecord> {
  const seedPath = path.join(process.cwd(), 'admin', 'daily_phrases_seed.json');
  try {
    const parsed = JSON.parse(fs.readFileSync(seedPath, 'utf8')) as DailyPhraseSeedRecord[];
    if (!Array.isArray(parsed)) throw new Error('Seed file root is not an array.');
    return new Map(parsed.map((item) => [item.id, item]));
  } catch (error) {
    pushFinding(findings, {
      severity: 'blocker',
      code: 'daily-phrase-seed-load-error',
      surface: 'daily_phrase',
      message: `Could not load admin Daily Phrase seed: ${error instanceof Error ? error.message : String(error)}`,
    });
    return new Map();
  }
}

function dailyPhraseRuntimeCopy(
  idiom: (typeof IDIOMS)[number],
  locale: SourceLocale,
): Partial<DailyPhraseCopy> | null {
  if (locale === 'es') {
    return {
      literal: idiom.literal_es ?? '',
      meaning: idiom.meaning_es ?? '',
      text: idiom.text_es ?? '',
    };
  }
  if (locale === 'ru' || locale === 'uk') return null;
  return idiom.sourceLocales?.[locale] ?? null;
}

function dailyPhraseSeedCopy(seed: DailyPhraseSeedRecord | undefined, locale: SourceLocale): Partial<DailyPhraseCopy> | null {
  if (!seed) return null;
  if (locale === 'es') {
    return {
      literal: seed.literal_es ?? '',
      meaning: seed.meaning_es ?? '',
      text: seed.text_es ?? '',
    };
  }
  if (locale === 'ru' || locale === 'uk') return null;
  return seed.sourceLocales?.[locale] ?? null;
}

function isCompleteDailyPhraseCopy(copy: Partial<DailyPhraseCopy> | null): copy is DailyPhraseCopy {
  return missingRequiredFields(copy, DAILY_PHRASE_FIELDS).length === 0;
}

function auditDailyPhraseSeedSync(
  findings: SemanticFinding[],
  idiom: (typeof IDIOMS)[number],
  seed: DailyPhraseSeedRecord | undefined,
  locale: SourceLocale,
  runtimeCopy: DailyPhraseCopy,
): void {
  if (!seed) {
    pushFinding(findings, {
      severity: 'blocker',
      code: 'daily-phrase-seed-entry-missing',
      surface: 'daily_phrase',
      id: idiom.id,
      locale,
      message: 'Runtime Daily Phrase exists, but admin seed entry is missing.',
      sample: idiom.english,
    });
    return;
  }

  if (seed.english !== idiom.english) {
    pushFinding(findings, {
      severity: 'blocker',
      code: 'daily-phrase-seed-english-mismatch',
      surface: 'daily_phrase',
      id: idiom.id,
      locale,
      field: 'english',
      message: 'Admin seed English phrase does not match runtime Daily Phrase English.',
      sample: `seed: ${seed.english ?? ''} | runtime: ${idiom.english}`,
    });
  }

  const seedCopy = dailyPhraseSeedCopy(seed, locale);
  const seedMissingFields = missingRequiredFields(seedCopy, DAILY_PHRASE_FIELDS);
  if (seedMissingFields.length > 0) {
    pushFinding(findings, {
      severity: 'blocker',
      code: 'daily-phrase-seed-copy-missing',
      surface: 'daily_phrase',
      id: idiom.id,
      locale,
      field: seedMissingFields.join(','),
      message: `Admin seed is missing Daily Phrase source-locale field(s): ${seedMissingFields.join(', ')}.`,
      sample: idiom.english,
    });
    return;
  }

  for (const diff of localeCopyDifferences(seedCopy, runtimeCopy, DAILY_PHRASE_FIELDS)) {
    pushFinding(findings, {
      severity: 'blocker',
      code: 'daily-phrase-seed-runtime-mismatch',
      surface: 'daily_phrase',
      id: idiom.id,
      locale,
      field: diff.field,
      message: 'Admin seed Daily Phrase copy does not match runtime IDIOMS copy.',
      sample: `seed: ${diff.expected} | runtime: ${diff.actual}`,
    });
  }
}

function auditDailyPhrase(findings: SemanticFinding[]): void {
  const seedById = loadDailyPhraseSeed(findings);

  for (const idiom of IDIOMS) {
    const seed = seedById.get(idiom.id);
    const completeCopiesByLocale: Partial<Record<SourceLocale, DailyPhraseCopy>> = {};

    for (const locale of ALL_RUNTIME_LOCALES) {
      if (locale === 'ru' || locale === 'uk') continue;
      const copy = dailyPhraseRuntimeCopy(idiom, locale);
      const missingFields = missingRequiredFields(copy, DAILY_PHRASE_FIELDS);
      if (missingFields.length > 0) {
        pushFinding(findings, {
          severity: 'blocker',
          code: 'daily-phrase-locale-copy-missing',
          surface: 'daily_phrase',
          id: idiom.id,
          locale,
          field: missingFields.join(','),
          message: `Daily Phrase source-locale copy is missing required field(s): ${missingFields.join(', ')}.`,
          sample: idiom.english,
        });
        continue;
      }
      const completeCopy = copy as DailyPhraseCopy;
      completeCopiesByLocale[locale] = completeCopy;
      auditDailyPhraseSeedSync(findings, idiom, seed, locale, completeCopy);

      for (const field of DAILY_PHRASE_FIELDS) {
        auditTextEncoding(
          findings,
          { surface: 'daily_phrase', id: idiom.id, locale, field },
          completeCopy[field],
        );
      }

      const languageSignal = localeLanguageSignal(locale, completeCopy.text);
      if (!languageSignal.ok) {
        pushFinding(findings, {
          severity: 'blocker',
          code: 'daily-phrase-locale-language-signal-missing',
          surface: 'daily_phrase',
          id: idiom.id,
          locale,
          field: 'text',
          message: 'Daily Phrase explanation is filled, but it does not contain enough target-language signal.',
          sample: completeCopy.text,
        });
      }

      if (
        completeCopy.literal.trim() &&
        completeCopy.meaning.trim() &&
        completeCopy.literal.trim() === completeCopy.meaning.trim()
      ) {
        pushFinding(findings, {
          severity: 'warning',
          code: 'daily-phrase-literal-equals-meaning',
          surface: 'daily_phrase',
          id: idiom.id,
          locale,
          field: 'literal/meaning',
          message: 'Literal translation and meaning are identical; this often hides idiom meaning.',
          sample: completeCopy.literal,
        });
      }

      if (completeCopy.text.trim() && !phraseAnchorFound(idiom.english, completeCopy.text)) {
        pushFinding(findings, {
          severity: 'warning',
          code: 'daily-phrase-english-anchor-missing',
          surface: 'daily_phrase',
          id: idiom.id,
          locale,
          field: 'text',
          message: 'Daily Phrase explanation does not clearly include the English idiom anchor.',
          sample: completeCopy.text,
        });
      }
    }

    for (const duplicate of duplicateLocaleFieldValues(completeCopiesByLocale, DAILY_PHRASE_FIELDS, { minLength: 16 })) {
      pushFinding(findings, {
        severity: 'blocker',
        code: 'daily-phrase-cross-locale-duplicate',
        surface: 'daily_phrase',
        id: idiom.id,
        field: duplicate.field,
        message: `Daily Phrase has identical ${duplicate.field} text across source locales: ${duplicate.locales.join(', ')}.`,
        sample: duplicate.value,
      });
    }
  }
}

function uniqueIrregularVerbs(): Array<(typeof IRREGULAR_VERBS_BY_LESSON)[number][number]> {
  const byBase = new Map<string, (typeof IRREGULAR_VERBS_BY_LESSON)[number][number]>();
  for (const verbs of Object.values(IRREGULAR_VERBS_BY_LESSON)) {
    for (const verb of verbs) {
      if (!byBase.has(verb.base)) byBase.set(verb.base, verb);
    }
  }
  return [...byBase.values()].sort((a, b) => a.base.localeCompare(b.base));
}

function auditIrregularVerbs(findings: SemanticFinding[]): void {
  for (const verb of uniqueIrregularVerbs()) {
    const sourceLocales = verb.sourceLocales ?? {};

    for (const locale of HEISENBERG_BATCH_SOURCE_LOCALES) {
      const value = sourceLocales[locale];
      if (!value || !value.trim()) {
        pushFinding(findings, {
          severity: 'blocker',
          code: 'irregular-verb-locale-copy-missing',
          surface: 'irregular_verbs',
          id: verb.base,
          locale,
          field: 'sourceLocales',
          message: 'Irregular verb source-locale label is missing.',
          sample: `${verb.base} / ${verb.past} / ${verb.pp}`,
        });
        continue;
      }

      auditTextEncoding(
        findings,
        { surface: 'irregular_verbs', id: verb.base, locale, field: 'sourceLocales' },
        value,
      );

      if (locale === 'es' && value.trim() !== verb.es.trim()) {
        pushFinding(findings, {
          severity: 'blocker',
          code: 'irregular-verb-es-source-locale-mismatch',
          surface: 'irregular_verbs',
          id: verb.base,
          locale,
          field: 'sourceLocales.es',
          message: 'Irregular verb Spanish sourceLocales value does not match the legacy es field.',
          sample: `sourceLocales.es: ${value} | es: ${verb.es}`,
        });
      }

      if (exactStringInList(value, [verb.ru, verb.uk].filter(Boolean) as string[])) {
        pushFinding(findings, {
          severity: 'blocker',
          code: 'irregular-verb-source-locale-fallback',
          surface: 'irregular_verbs',
          id: verb.base,
          locale,
          field: 'sourceLocales',
          message: 'Irregular verb source-locale label exactly matches Russian/Ukrainian copy.',
          sample: value,
        });
      }

      if (exactStringInList(value, [verb.base, verb.past, verb.pp].filter(Boolean))) {
        pushFinding(findings, {
          severity: 'warning',
          code: 'irregular-verb-source-label-is-english',
          surface: 'irregular_verbs',
          id: verb.base,
          locale,
          field: 'sourceLocales',
          message: 'Irregular verb source-locale label exactly matches an English verb form.',
          sample: value,
        });
      }
    }
  }
}

function auditFlashcards(findings: SemanticFinding[]): void {
  for (const card of SYSTEM_CARDS) {
    const sourceLocales = card.sourceLocales ?? {};
    const spanishSource = sourceLocales.es?.trim() ?? '';
    const spanishLegacy = card.es?.trim() ?? '';

    if (!spanishLegacy || !spanishSource) {
      pushFinding(findings, {
        severity: 'blocker',
        code: 'flashcard-spanish-copy-missing',
        surface: 'flashcards',
        id: card.id,
        locale: 'es',
        field: !spanishLegacy ? 'es' : 'sourceLocales.es',
        message: 'System flashcard is missing Spanish copy.',
        sample: card.en,
      });
    } else if (spanishLegacy !== spanishSource) {
      pushFinding(findings, {
        severity: 'blocker',
        code: 'flashcard-spanish-source-locale-mismatch',
        surface: 'flashcards',
        id: card.id,
        locale: 'es',
        field: 'sourceLocales.es',
        message: 'System flashcard sourceLocales.es does not match the legacy es field.',
        sample: `sourceLocales.es: ${spanishSource} | es: ${spanishLegacy}`,
      });
    }

    if (FLASHCARD_BATCH_REQUIRED_CATEGORY_IDS.has(card.categoryId)) {
      for (const locale of HEISENBERG_BATCH_SOURCE_LOCALES) {
        const value = sourceLocales[locale]?.trim();
        if (!value) {
          pushFinding(findings, {
            severity: 'blocker',
            code: 'flashcard-batch-locale-copy-missing',
            surface: 'flashcards',
            id: card.id,
            locale,
            field: 'sourceLocales',
            message: 'System flashcard category is in the batch contract, but this locale is missing.',
            sample: card.en,
          });
        }
      }
    }

    for (const locale of HEISENBERG_BATCH_SOURCE_LOCALES) {
      const value = sourceLocales[locale]?.trim();
      if (!value) continue;
      auditTextEncoding(findings, { surface: 'flashcards', id: card.id, locale, field: 'sourceLocales' }, value);

      if (exactStringInList(value, [card.ru, card.uk].filter(Boolean) as string[])) {
        pushFinding(findings, {
          severity: 'blocker',
          code: 'flashcard-source-locale-fallback',
          surface: 'flashcards',
          id: card.id,
          locale,
          field: 'sourceLocales',
          message: 'System flashcard source-locale copy exactly matches Russian/Ukrainian copy.',
          sample: value,
        });
      }

      if (value.toLowerCase() === card.en.trim().toLowerCase()) {
        pushFinding(findings, {
          severity: 'warning',
          code: 'flashcard-source-label-is-english',
          surface: 'flashcards',
          id: card.id,
          locale,
          field: 'sourceLocales',
          message: 'System flashcard source-locale label exactly matches the English study target.',
          sample: value,
        });
      }
    }
  }
}

type LessonWordAuditRow = {
  en: string;
  pos: string;
  line: number;
};

function propName(name: ts.PropertyName): string | null {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return null;
}

function objectLiteralStringValue(node: ts.ObjectLiteralExpression, key: string): string | null {
  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    if (propName(property.name) !== key) continue;
    const initializer = property.initializer;
    return ts.isStringLiteral(initializer) || ts.isNoSubstitutionTemplateLiteral(initializer)
      ? initializer.text
      : null;
  }
  return null;
}

function loadLessonWordAuditRows(findings: SemanticFinding[]): LessonWordAuditRow[] {
  const filePath = path.join(process.cwd(), 'app', 'lesson_words.tsx');
  let text = '';
  try {
    text = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    pushFinding(findings, {
      severity: 'blocker',
      code: 'lesson-word-source-load-error',
      surface: 'lesson_words',
      message: `Could not load lesson_words.tsx: ${error instanceof Error ? error.message : String(error)}`,
    });
    return [];
  }

  const source = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const rows: LessonWordAuditRow[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isObjectLiteralExpression(node)) {
      const en = objectLiteralStringValue(node, 'en');
      const pos = objectLiteralStringValue(node, 'pos');
      if (en && pos) {
        rows.push({
          en,
          pos,
          line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return rows;
}

function auditLessonWordSourceLocaleMap(findings: SemanticFinding[]): void {
  const sourceKeys = new Set(Object.keys(LESSON_WORD_SOURCE_LOCALES_BY_EN).map((key) => key.trim().toLowerCase()));

  for (const [key, copy] of Object.entries(LESSON_WORD_SOURCE_LOCALES_BY_EN)) {
    for (const locale of HEISENBERG_BATCH_SOURCE_LOCALES) {
      const value = copy[locale]?.trim() ?? '';
      if (!value) {
        pushFinding(findings, {
          severity: 'blocker',
          code: 'lesson-word-source-locale-copy-missing',
          surface: 'lesson_words',
          id: key,
          locale,
          field: 'sourceLocales',
          message: 'Lesson word central source-locale gloss is missing for this locale.',
        });
        continue;
      }
      auditTextEncoding(findings, { surface: 'lesson_words', id: key, locale, field: 'sourceLocales' }, value);
    }
  }

  const rows = loadLessonWordAuditRows(findings);
  const posesByWord = new Map<string, Set<string>>();
  for (const row of rows) {
    const word = row.en.trim().toLowerCase();
    const poses = posesByWord.get(word) ?? new Set<string>();
    poses.add(row.pos);
    posesByWord.set(word, poses);
  }

  const emitted = new Set<string>();
  for (const row of rows) {
    const word = row.en.trim().toLowerCase();
    const poses = posesByWord.get(word);
    if (!poses || poses.size < 2 || !sourceKeys.has(word)) continue;
    const posKey = `${word}::${row.pos}`;
    if (sourceKeys.has(posKey)) continue;
    const findingKey = `${word}|${row.pos}`;
    if (emitted.has(findingKey)) continue;
    emitted.add(findingKey);
    pushFinding(findings, {
      severity: 'warning',
      code: 'lesson-word-ambiguous-direct-source-map',
      surface: 'lesson_words',
      id: word,
      field: posKey,
      message: 'English headword appears with multiple POS values, but the central source-locale map only has a direct key for this POS. Add a pos-specific key to avoid semantic drift.',
      sample: `line ${row.line}: ${row.en} (${row.pos})`,
    });
  }
}

function buildSummary(findings: SemanticFinding[]): SemanticReport['summary'] {
  const byCode: Record<string, number> = {};
  const bySurface: Record<string, number> = {};
  const reviewGroups = new Set<string>();
  for (const finding of findings) {
    byCode[finding.code] = (byCode[finding.code] ?? 0) + 1;
    bySurface[finding.surface] = (bySurface[finding.surface] ?? 0) + 1;
    reviewGroups.add(findingReviewGroupKey(finding));
  }
  return {
    findings: findings.length,
    blockers: findings.filter((finding) => finding.severity === 'blocker').length,
    warnings: findings.filter((finding) => finding.severity === 'warning').length,
    reviewGroups: reviewGroups.size,
    byCode,
    bySurface,
  };
}

function findingReviewGroupKey(finding: SemanticFinding): string {
  return [
    finding.severity,
    finding.code,
    finding.surface,
    finding.difficulty ?? '',
    finding.ordinal ?? '',
    finding.id ?? '',
    finding.field ?? '',
    finding.message,
  ].join('|');
}

function buildReviewGroups(findings: SemanticFinding[]): SemanticReviewGroup[] {
  const groups = new Map<string, { finding: SemanticFinding; count: number; locales: Set<string> }>();
  for (const finding of findings) {
    const key = findingReviewGroupKey(finding);
    const group =
      groups.get(key) ??
      {
        finding,
        count: 0,
        locales: new Set<string>(),
      };
    group.count += 1;
    if (finding.locale) group.locales.add(String(finding.locale));
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((group) => {
      const { locale: _locale, ...finding } = group.finding;
      return {
        ...finding,
        count: group.count,
        locales: [...group.locales].sort(),
      };
    })
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
}

function writeReport(report: SemanticReport): string {
  const outDir = path.join(process.cwd(), 'docs', 'heisenberg', 'semantic', timestampSlug());
  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, 'semantic_audit.json');
  const mdPath = path.join(outDir, 'semantic_audit.md');
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(
    mdPath,
    [
      '# Heisenberg Semantic Audit',
      '',
      `Generated: ${report.generatedAt}`,
      `Blockers: ${report.summary.blockers}`,
      `Warnings: ${report.summary.warnings}`,
      `Review groups: ${report.summary.reviewGroups}`,
      '',
      '## Top Finding Codes',
      ...Object.entries(report.summary.byCode)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([code, count]) => `- ${code}: ${count}`),
      '',
      '## Review Groups',
      ...report.reviewGroups.slice(0, 80).map((group) => {
        const where = [
          group.surface,
          group.difficulty,
          group.ordinal ? `#${group.ordinal}` : null,
          group.id ? `id:${group.id}` : null,
          group.field,
        ]
          .filter(Boolean)
          .join(' ');
        const localeText = group.locales.length ? ` locales: ${group.locales.join(', ')}` : '';
        return `- [${group.severity}] ${group.code} x${group.count} ${where}${localeText}: ${group.message}${group.sample ? ` | ${group.sample}` : ''}`;
      }),
      '',
      '## First Findings',
      ...report.findings.slice(0, 80).map((finding) => {
        const where = [
          finding.surface,
          finding.difficulty,
          finding.ordinal ? `#${finding.ordinal}` : null,
          finding.id ? `id:${finding.id}` : null,
          finding.locale,
          finding.field,
        ]
          .filter(Boolean)
          .join(' ');
        return `- [${finding.severity}] ${finding.code} ${where}: ${finding.message}${finding.sample ? ` | ${finding.sample}` : ''}`;
      }),
      '',
    ].join('\n'),
    'utf8',
  );
  return outDir;
}

export function runSemanticAudit(strict = false): { report: SemanticReport; outDir: string } {
  const findings: SemanticFinding[] = [];
  auditStructuredQuizPayloads(findings);
  auditRuntimeEnglishTarget(findings);
  auditDailyPhrase(findings);
  auditFlashcards(findings);
  auditIrregularVerbs(findings);
  auditLessonWordSourceLocaleMap(findings);
  const reviewGroups = buildReviewGroups(findings);

  const report: SemanticReport = {
    generatedAt: new Date().toISOString(),
    mode: 'semantic-audit',
    strict,
    summary: buildSummary(findings),
    reviewGroups,
    findings,
  };
  return { report, outDir: writeReport(report) };
}

const strict = process.argv.includes('--strict');
const { report, outDir } = runSemanticAudit(strict);

console.log(`Heisenberg semantic audit: ${report.summary.blockers} blockers, ${report.summary.warnings} warnings`);
console.log(`Review groups: ${report.summary.reviewGroups}`);
console.log(
  Object.entries(report.summary.byCode)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([code, count]) => `${code}: ${count}`)
    .join(' | ') || 'No findings',
);
console.log(`Report: ${path.relative(process.cwd(), outDir).replace(/\\/g, '/')}`);

if (strict && report.summary.blockers > 0) {
  process.exit(1);
}
