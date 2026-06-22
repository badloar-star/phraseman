import { SOURCE_LOCALES, type SourceLocale } from './source_locales';
import type { LocalizedText, PlanContentDay } from './plan_content_schema';

export const PLAN_CONTENT_REQUIRED_SOURCE_LOCALES = SOURCE_LOCALES;
export const PLAN_CONTENT_PLANNED_SOURCE_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

export type PlanContentLocaleIssueSeverity = 'blocker' | 'warning';

export type PlanContentLocaleIssueCode =
  | 'missing_locale'
  | 'non_canonical_locale_key'
  | 'mojibake'
  | 'planned_cyrillic_leak'
  | 'protected_english_term_missing'
  | 'planned_duplicates_base_locale'
  | 'planned_duplicates_target_locale';

export type PlanContentLocaleIssue = {
  code: PlanContentLocaleIssueCode;
  severity: PlanContentLocaleIssueSeverity;
  path: string;
  locale?: SourceLocale;
  otherLocale?: SourceLocale;
  message: string;
  sample?: string;
};

type LocalizedTextEntry = {
  path: string;
  text: LocalizedText;
  protectedTerms?: string[];
};

const CANONICAL_LOCALE_KEYS = new Set<string>(SOURCE_LOCALES);
const PLANNED_LOCALE_KEYS = new Set<string>(PLAN_CONTENT_PLANNED_SOURCE_LOCALES);
const COMMON_ALIAS_KEYS = new Set([
  'pt',
  'br',
  'ptBr',
  'ptBR',
  'pt_BR',
  'pt-br',
  'vn',
  'trTR',
  'tr-TR',
  'plPL',
  'pl-PL',
]);

const MOJIBAKE_RE = /�|Ð|Ñ|Â[¿¡«»]|Ã[\u0080-\u00BF]|Ä[\u0080-\u00BF]|Å[\u0080-\u00BF]/;
const CYRILLIC_RE = /[А-Яа-яЁёІіЇїЄєҐґ]/;
const DUPLICATE_MIN_LENGTH = 18;
const QUOTED_LATIN_RE = /[«“"]([^«»“”"\n]*[A-Za-z][^«»“”"\n]*)[»”"]/g;
const ENGLISH_QUOTE_CHUNK_RE = /[A-Za-z][A-Za-z']*(?:\s*(?:\+|\/|\u2192|=)\s*[A-Za-z][A-Za-z']*|\s+[A-Za-z][A-Za-z']*)*/g;

function compactSample(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.replace(/\s+/g, ' ').trim().slice(0, 120);
}

function normalizeForCompare(value: string | undefined): string {
  return String(value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function normalizeForTerm(value: string): string {
  return String(value ?? '')
    .replace(/[’‘]/g, "'")
    .replace(/\u2026/g, ' ')
    .replace(/\.{2,}/g, ' ')
    .replace(/[+\/=]|\u2192/g, ' ')
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsNormalizedToken(normalizedValue: string, token: string): boolean {
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(token)}([^a-z0-9]|$)`, 'i').test(normalizedValue);
}

function containsProtectedTerm(value: string, term: string): boolean {
  const normalizedValue = normalizeForTerm(value);
  const normalizedTerm = normalizeForTerm(term);
  if (!normalizedTerm) return true;
  const pattern = normalizedTerm
    .split(/\s+/)
    .map(escapeRegExp)
    .join('[^a-z0-9]+');
  if (new RegExp(`(^|[^a-z0-9])${pattern}([^a-z0-9]|$)`, 'i').test(normalizedValue)) return true;

  const tokens = [...new Set(englishTokens(normalizedTerm))];
  if (tokens.length <= 1) return false;
  return tokens.every((token) => containsNormalizedToken(normalizedValue, token));
}

function quotedEnglishTermCandidates(value: string): string[] {
  const compact = value.replace(/\s+/g, ' ').trim();
  if (!/[A-Za-z]/.test(compact)) return [];
  if (!CYRILLIC_RE.test(compact)) return [compact];
  return (compact.match(ENGLISH_QUOTE_CHUNK_RE) ?? [])
    .map((chunk) => chunk.replace(/\s+/g, ' ').trim())
    .filter((chunk) => /[A-Za-z]/.test(chunk));
}

function extractQuotedEnglishTerms(...texts: Array<string | undefined>): string[] {
  const terms = new Set<string>();
  for (const text of texts) {
    if (!text) continue;
    for (const match of text.matchAll(QUOTED_LATIN_RE)) {
      for (const value of quotedEnglishTermCandidates(String(match[1] ?? ''))) {
        terms.add(value);
      }
    }
  }
  return [...terms];
}

function englishTokens(value: string): string[] {
  return value.match(/[A-Za-z][A-Za-z']*/g) ?? [];
}

function englishNgrams(value: string): string[] {
  const tokens = englishTokens(value);
  const terms = new Set<string>();
  const maxSize = Math.min(4, tokens.length);
  for (let size = maxSize; size >= 1; size -= 1) {
    for (let i = 0; i <= tokens.length - size; i += 1) {
      const term = tokens.slice(i, i + size).join(' ');
      if (term.length >= 2) terms.add(term);
    }
  }
  return [...terms];
}

function protectedTermsFor(text: LocalizedText, contextTerms: string[] = []): string[] {
  const baseText = [text.ru, text.uk].filter(Boolean).join('\n');
  const terms = new Set(extractQuotedEnglishTerms(text.ru, text.uk));
  for (const term of contextTerms) {
    if (englishTokens(term).length < 2) continue;
    if (containsProtectedTerm(baseText, term)) terms.add(term);
  }
  return [...terms]
    .map((term) => term.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length || a.localeCompare(b))
    .filter((term, index, all) => !all.slice(0, index).some((bigger) => containsProtectedTerm(bigger, term)));
}

function definedText(text: LocalizedText, locale: SourceLocale): string | undefined {
  const value = text[locale];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function localeIssue(
  code: PlanContentLocaleIssueCode,
  severity: PlanContentLocaleIssueSeverity,
  path: string,
  message: string,
  extras: Partial<Pick<PlanContentLocaleIssue, 'locale' | 'otherLocale' | 'sample'>> = {},
): PlanContentLocaleIssue {
  return { code, severity, path, message, ...extras };
}

function collectLocalizedTexts(day: PlanContentDay): LocalizedTextEntry[] {
  const entries: LocalizedTextEntry[] = [
    { path: 'topic', text: day.topic },
    { path: 'outcome', text: day.outcome },
  ];

  day.intro.forEach((screen, screenIndex) => {
    const screenPath = `intro[${screenIndex}]`;
    const exampleTerms = screen.examples?.flatMap((example) => englishNgrams(example.en)) ?? [];
    entries.push({ path: `${screenPath}.title`, text: screen.title, protectedTerms: protectedTermsFor(screen.title, exampleTerms) });
    entries.push({ path: `${screenPath}.body`, text: screen.body, protectedTerms: protectedTermsFor(screen.body, exampleTerms) });
    screen.examples?.forEach((example, exampleIndex) => {
      entries.push({ path: `${screenPath}.examples[${exampleIndex}].gloss`, text: example.gloss });
    });
  });

  day.phrases.forEach((phrase, phraseIndex) => {
    const phrasePath = `phrases[${phraseIndex}]`;
    const phraseTerms = [
      ...englishNgrams(phrase.english),
      ...phrase.words.flatMap((word) => [word.text, ...word.distractors]),
    ];
    entries.push({ path: `${phrasePath}.meaning`, text: phrase.meaning });
    entries.push({ path: `${phrasePath}.explanation.title`, text: phrase.explanation.title, protectedTerms: protectedTermsFor(phrase.explanation.title, phraseTerms) });
    entries.push({ path: `${phrasePath}.explanation.rule`, text: phrase.explanation.rule, protectedTerms: protectedTermsFor(phrase.explanation.rule, phraseTerms) });
    entries.push({ path: `${phrasePath}.explanation.why`, text: phrase.explanation.why, protectedTerms: protectedTermsFor(phrase.explanation.why, phraseTerms) });
    entries.push({ path: `${phrasePath}.explanation.commonMistake`, text: phrase.explanation.commonMistake, protectedTerms: protectedTermsFor(phrase.explanation.commonMistake, phraseTerms) });
  });

  day.vocabulary.forEach((word, wordIndex) => {
    entries.push({ path: `vocabulary[${wordIndex}].translation`, text: word.translation });
  });

  return entries;
}

export function auditPlanContentLocaleIsolation(day: PlanContentDay): PlanContentLocaleIssue[] {
  const issues: PlanContentLocaleIssue[] = [];

  for (const entry of collectLocalizedTexts(day)) {
    const text = entry.text as Record<string, unknown>;

    for (const key of Object.keys(text)) {
      if (CANONICAL_LOCALE_KEYS.has(key)) continue;
      if (COMMON_ALIAS_KEYS.has(key) || /^[a-z]{2}(?:[-_][A-Z]{2})?$/.test(key)) {
        issues.push(localeIssue(
          'non_canonical_locale_key',
          'blocker',
          entry.path,
          `Use canonical source-locale keys only; found "${key}".`,
        ));
      }
    }

    for (const locale of PLAN_CONTENT_REQUIRED_SOURCE_LOCALES) {
      const value = definedText(entry.text, locale);
      if (!value) {
        issues.push(localeIssue(
          'missing_locale',
          'blocker',
          entry.path,
          `Missing required ${locale} text.`,
          { locale },
        ));
        continue;
      }

      if (MOJIBAKE_RE.test(value)) {
        issues.push(localeIssue(
          'mojibake',
          'blocker',
          entry.path,
          `Suspicious encoding in ${locale} text.`,
          { locale, sample: compactSample(value) },
        ));
      }

      if (PLANNED_LOCALE_KEYS.has(locale) && CYRILLIC_RE.test(value)) {
        issues.push(localeIssue(
          'planned_cyrillic_leak',
          'blocker',
          entry.path,
          `Cyrillic text leaked into planned locale ${locale}.`,
          { locale, sample: compactSample(value) },
        ));
      }

      for (const term of entry.protectedTerms ?? []) {
        if (locale === 'ru' || locale === 'uk') continue;
        if (containsProtectedTerm(value, term)) continue;
        issues.push(localeIssue(
          'protected_english_term_missing',
          'blocker',
          entry.path,
          `${locale} text is missing protected English teaching term "${term}".`,
          { locale, sample: compactSample(value) },
        ));
      }
    }

    for (const locale of PLAN_CONTENT_PLANNED_SOURCE_LOCALES) {
      const value = definedText(entry.text, locale);
      if (!value || value.length <= DUPLICATE_MIN_LENGTH) continue;
      const normalized = normalizeForCompare(value);

      for (const baseLocale of ['ru', 'uk', 'es'] as const) {
        const baseValue = definedText(entry.text, baseLocale);
        if (!baseValue || normalized !== normalizeForCompare(baseValue)) continue;
        issues.push(localeIssue(
          'planned_duplicates_base_locale',
          'warning',
          entry.path,
          `${locale} duplicates ${baseLocale}; review whether this is a valid English scaffold/cognate or a copied locale.`,
          { locale, otherLocale: baseLocale, sample: compactSample(value) },
        ));
      }

      for (const otherLocale of PLAN_CONTENT_PLANNED_SOURCE_LOCALES) {
        if (otherLocale === locale) continue;
        if (locale > otherLocale) continue;
        const otherValue = definedText(entry.text, otherLocale);
        if (!otherValue || normalized !== normalizeForCompare(otherValue)) continue;
        issues.push(localeIssue(
          'planned_duplicates_target_locale',
          'warning',
          entry.path,
          `${locale} duplicates ${otherLocale}; review whether this is a valid English scaffold/cognate or a copied locale.`,
          { locale, otherLocale, sample: compactSample(value) },
        ));
      }
    }
  }

  return issues;
}

export function planContentLocaleBlockers(day: PlanContentDay): PlanContentLocaleIssue[] {
  return auditPlanContentLocaleIsolation(day).filter((issue) => issue.severity === 'blocker');
}

export function planContentLocaleWarnings(day: PlanContentDay): PlanContentLocaleIssue[] {
  return auditPlanContentLocaleIsolation(day).filter((issue) => issue.severity === 'warning');
}
