import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { require as tsxRequire } from 'tsx/cjs/api';

export const REVIEW_LOCALES = Object.freeze([
  'ru',
  'uk',
  'es',
  'pt-BR',
  'vi',
  'id',
  'tr',
  'pl',
]);

const REVIEW_ISSUE_CODES = new Set([
  'quality_review_missing',
  'quality_review_stale',
  'quality_review_rejected',
  'quality_review_not_independent',
  'locale_review_missing',
]);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
}

export function parseChapterRange(args = process.argv.slice(2)) {
  const from = Number(valueAfter(args, '--from') ?? 1);
  const to = Number(valueAfter(args, '--to') ?? from);
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from || to > 56) {
    throw new Error('invalid_range: use --from NN --to NN within 1..56');
  }
  return { from, to };
}

function localizedValue(source, locale) {
  return source?.[locale];
}

function unique(values) {
  return new Set(values).size === values.length;
}

function add(blockers, sessionOrdinal, code, path, message) {
  blockers.push({ sessionOrdinal, code, path, message });
}

function inspectExplicitLocalized(blockers, ordinal, path, value) {
  for (const locale of REVIEW_LOCALES) {
    const text = localizedValue(value, locale);
    if (typeof text !== 'string' || !text.trim() || text.includes('[[NEEDS_TRANSLATION]]')) {
      add(blockers, ordinal, 'locale_missing', `${path}.${locale}`, 'Required explicit locale text is missing.');
    }
  }
}

function inspectSourceShape(source, plan, cumulativeFeatures, quality, receipt, blockers) {
  const ordinal = source.requiredSessionOrdinal;
  if (!plan || plan.sessionOrdinal !== ordinal) {
    add(blockers, ordinal, 'map_mismatch', 'requiredSessionOrdinal', 'Source coordinate does not match the canonical lesson map.');
  }
  if (source.episodeOrdinal !== 1 || source.targetLanguage !== 'en') {
    add(blockers, ordinal, 'coordinate_invalid', 'source', 'Expected lesson 1 English source coordinates.');
  }
  inspectExplicitLocalized(blockers, ordinal, 'title', source.title);
  inspectExplicitLocalized(blockers, ordinal, 'summary', source.summary);
  inspectExplicitLocalized(blockers, ordinal, 'learningGoal', source.learningGoal);

  const pages = source.introPages ?? [];
  if (pages.length !== 3 || pages.map((page) => page.kind).join('|') !== 'concept|formula|trap') {
    add(blockers, ordinal, 'intro_shape_invalid', 'introPages', 'Intro must contain concept, formula and trap in that order.');
  }
  pages.forEach((page, pageIndex) => {
    const prefix = `introPages[${pageIndex}]`;
    inspectExplicitLocalized(blockers, ordinal, `${prefix}.title`, page.title);
    inspectExplicitLocalized(blockers, ordinal, `${prefix}.body`, page.body);
    inspectExplicitLocalized(blockers, ordinal, `${prefix}.question.prompt`, page.question?.prompt);
    inspectExplicitLocalized(blockers, ordinal, `${prefix}.question.explanation`, page.question?.explanation);
    if (!Array.isArray(page.question?.choices) || page.question.choices.length !== 3) {
      add(blockers, ordinal, 'intro_choices_invalid', `${prefix}.question.choices`, 'Each intro question needs exactly three choices.');
    } else {
      page.question.choices.forEach((choice, choiceIndex) =>
        inspectExplicitLocalized(blockers, ordinal, `${prefix}.question.choices[${choiceIndex}]`, choice),
      );
    }
    for (const locale of REVIEW_LOCALES) {
      const runs = page.bodyRuns?.[locale];
      const body = page.body?.[locale];
      if (!Array.isArray(runs) || runs.map((run) => run.text).join('') !== body) {
        add(blockers, ordinal, 'semantic_runs_mismatch', `${prefix}.bodyRuns.${locale}`, 'Semantic runs must concatenate to the untouched intro body.');
      }
    }
  });

  const phrases = source.phrases ?? [];
  const wordFirst = (source.newVocabulary?.length ?? 0) > 0;
  if (
    (!wordFirst && phrases.length !== 15) ||
    (wordFirst && (phrases.length < 1 || phrases.length > 15))
  ) {
    add(
      blockers,
      ordinal,
      'phrase_count_invalid',
      'phrases',
      wordFirst
        ? 'A word-first source needs 1–15 phrase applications after standalone vocabulary contacts.'
        : 'A legacy source must contain exactly 15 phrases.',
    );
  }
  if (!unique(phrases.map((phrase) => phrase.id))) {
    add(blockers, ordinal, 'phrase_id_duplicate', 'phrases', 'Phrase ids must be unique inside the source.');
  }
  const fixedClarificationRehearsal = ordinal === 53 && phrases.every((phrase) =>
    phrase.features?.includes('fixed_expression') && /^(?:Sorry|Pardon|Excuse me)\?$/u.test(phrase.english));
  if (!fixedClarificationRehearsal && !unique(phrases.map((phrase) => phrase.english.trim().toLocaleLowerCase('en')))) {
    add(blockers, ordinal, 'phrase_text_duplicate', 'phrases', 'English phrase texts must be unique inside the source.');
  }

  phrases.forEach((phrase, phraseIndex) => {
    const prefix = `phrases[${phraseIndex}]`;
    const unseen = (phrase.features ?? []).filter((feature) => !cumulativeFeatures.has(feature));
    if (unseen.length > 0) {
      add(blockers, ordinal, 'unintroduced_grammar', `${prefix}.features`, `Features appear before introduction: ${unseen.join(', ')}.`);
    }
    for (const locale of REVIEW_LOCALES) {
      const detail = phrase.localizedDetails?.[locale];
      if (!detail?.meaning?.trim() || !detail?.explanation?.trim()) {
        add(blockers, ordinal, 'phrase_locale_missing', `${prefix}.localizedDetails.${locale}`, 'Localized meaning and explanation are required.');
        continue;
      }
      if (!Array.isArray(detail.words) || detail.words.length !== phrase.words.length) {
        add(blockers, ordinal, 'word_locale_count_mismatch', `${prefix}.localizedDetails.${locale}.words`, 'Localized word drills must cover every English word.');
        continue;
      }
      detail.words.forEach((word, wordIndex) => {
        const wrong = word.distractors ?? [];
        const values = wrong.map((entry) => entry.value);
        const expectedDistractors = wordFirst || source.distractorAuthorship === 'manual' ? 2 : 5;
        if (wrong.length !== expectedDistractors || !unique(values) || values.includes(word.correct) || wrong.some((entry) => !entry.reason?.trim())) {
          add(blockers, ordinal, 'localized_word_distractors_invalid', `${prefix}.localizedDetails.${locale}.words[${wordIndex}]`, `Each localized word drill needs exactly ${expectedDistractors} unique close wrong answers with reasons.`);
        }
      });
    }
    phrase.words.forEach((word, wordIndex) => {
      const wrong = word.distractors ?? [];
      const values = wrong.map((entry) => entry.value);
      const expectedDistractors = wordFirst || source.distractorAuthorship === 'manual' ? 2 : 5;
      if (wrong.length !== expectedDistractors || !unique(values) || values.includes(word.correct) || wrong.some((entry) => !entry.why?.trim())) {
        add(blockers, ordinal, 'word_distractors_invalid', `${prefix}.words[${wordIndex}]`, `Each word needs exactly ${expectedDistractors} unique close wrong answers with reasons.`);
      }
    });
  });

  const qualityReport = quality.evaluateLearningV2SessionContentQuality(source, receipt);
  qualityReport.issues
    .filter((issue) => !REVIEW_ISSUE_CODES.has(issue.code))
    .forEach((issue) => add(blockers, ordinal, issue.code, issue.path, issue.message));
}

export async function loadLesson1ChapterProjection(from, to) {
  const registry = tsxRequire(
    resolve(ROOT, 'modules/learning-v2/content/source/authored_sessions_v1.ts'),
    import.meta.url,
  );
  const mapModule = tsxRequire(
    resolve(ROOT, 'modules/learning-v2/content/source/episode_01_session_map_v1.ts'),
    import.meta.url,
  );
  const quality = tsxRequire(
    resolve(ROOT, 'modules/learning-v2/content/source/learning_content_quality_gate_v1.ts'),
    import.meta.url,
  );
  const receiptModule = tsxRequire(
    resolve(ROOT, 'modules/learning-v2/content/source/learning_content_quality_review_receipts_v1.ts'),
    import.meta.url,
  );
  const sources = registry.AUTHORED_EPISODE_01_SESSIONS.filter(
    (source) => source.requiredSessionOrdinal >= from && source.requiredSessionOrdinal <= to,
  );
  const allPlans = mapModule.EPISODE_01_SESSION_MAP_V1;
  const plans = allPlans.filter(
    (plan) => plan.sessionOrdinal >= from && plan.sessionOrdinal <= to,
  );
  return {
    sources,
    plans,
    allPlans,
    quality,
    receipts: receiptModule.LEARNING_V2_CONTENT_QUALITY_REVIEW_RECEIPTS_V1,
  };
}

export async function evaluateLesson1Chapter(from, to) {
  const projection = await loadLesson1ChapterProjection(from, to);
  const blockers = [];
  const expectedOrdinals = Array.from({ length: to - from + 1 }, (_, index) => from + index);
  const actualOrdinals = projection.sources.map((source) => source.requiredSessionOrdinal);
  if (actualOrdinals.join('|') !== expectedOrdinals.join('|')) {
    add(blockers, 0, 'registry_range_incomplete', 'AUTHORED_EPISODE_01_SESSIONS', `Expected ${expectedOrdinals.join(',')}; received ${actualOrdinals.join(',') || 'none'}.`);
  }
  if (projection.plans.map((plan) => plan.sessionOrdinal).join('|') !== expectedOrdinals.join('|')) {
    add(blockers, 0, 'map_range_incomplete', 'EPISODE_01_SESSION_MAP_V1', 'Canonical map does not cover the requested range exactly.');
  }

  const cumulativeFeatures = new Set(['copula_be']);
  projection.allPlans
    .filter((entry) => entry.sessionOrdinal < from)
    .forEach((entry) => entry.teaches.forEach((feature) => cumulativeFeatures.add(feature)));
  for (const plan of projection.plans) {
    plan.teaches.forEach((feature) => cumulativeFeatures.add(feature));
    const source = projection.sources.find((entry) => entry.requiredSessionOrdinal === plan.sessionOrdinal);
    if (source) {
      inspectSourceShape(
        source,
        plan,
        cumulativeFeatures,
        projection.quality,
        projection.receipts[plan.sessionOrdinal],
        blockers,
      );
    }
  }

  const manualReviewOrdinals = projection.sources
    .filter((source) => {
      const report = projection.quality.evaluateLearningV2SessionContentQuality(
        source,
        projection.receipts[source.requiredSessionOrdinal],
      );
      return report.issues.some((issue) => REVIEW_ISSUE_CODES.has(issue.code));
    })
    .map((source) => source.requiredSessionOrdinal);
  const phraseCount = projection.sources.reduce((sum, source) => sum + source.phrases.length, 0);
  const wordDrillCount = projection.sources.reduce(
    (sum, source) => sum + source.phrases.reduce((phraseSum, phrase) => phraseSum + phrase.words.length, 0),
    0,
  );
  return {
    from,
    to,
    sources: projection.sources,
    blockers,
    manualReviewOrdinals,
    counts: {
      sessions: projection.sources.length,
      locales: REVIEW_LOCALES.length,
      introPages: projection.sources.length * REVIEW_LOCALES.length * 3,
      phrases: phraseCount,
      localizedPhrasePresentations: phraseCount * REVIEW_LOCALES.length,
      wordDrills: wordDrillCount,
    },
  };
}

export function formatChapterGateReport(result) {
  const auto = result.blockers.length === 0 ? 'AUTO PASS' : 'AUTO HOLD';
  const manual = result.manualReviewOrdinals.length === 0 ? 'MANUAL PASS' : 'MANUAL HOLD';
  const lines = [
    `Learning V2 · lesson 1 · ${result.from}-${result.to}`,
    auto,
    manual,
    `sessions: ${result.counts.sessions}`,
    `locales: ${result.counts.locales}`,
    `intro pages: ${result.counts.introPages}`,
    `phrases: ${result.counts.phrases}`,
    `localized phrase presentations: ${result.counts.localizedPhrasePresentations}`,
    `word drills: ${result.counts.wordDrills}`,
    `automatic blockers: ${result.blockers.length}`,
    `manual review blockers: ${result.manualReviewOrdinals.length}`,
  ];
  if (result.manualReviewOrdinals.length > 0) {
    lines.push(`manual review ordinals: ${result.manualReviewOrdinals.join(', ')}`);
  }
  result.blockers.forEach((issue) => {
    lines.push(`BLOCK S${String(issue.sessionOrdinal).padStart(2, '0')} ${issue.code} · ${issue.path} · ${issue.message}`);
  });
  return `${lines.join('\n')}\n`;
}

async function main() {
  const args = process.argv.slice(2);
  const { from, to } = parseChapterRange(args);
  const reportPath = resolve(ROOT, valueAfter(args, '--report') ?? `qa-artifacts/learning-v2-lesson1/chapter-${String(from).padStart(2, '0')}-${String(to).padStart(2, '0')}-gate.txt`);
  const result = await evaluateLesson1Chapter(from, to);
  const report = formatChapterGateReport(result);
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, report, 'utf8');
  process.stdout.write(report);
  process.exitCode = result.blockers.length === 0 ? 0 : 1;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    process.exitCode = 1;
  });
}
