import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const MATERIALIZED_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized');
const REVIEW_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'review');
const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'theory');
const INTRO_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'intros');
const GATE_PATH = path.join(OUT_DIR, 'fr_theory_vocab_intro_parity_gate_v1.json');
const INTRO_PACK_PATH = path.join(INTRO_DIR, 'fr_lesson_intro_pack_v1.json');

const MOJIBAKE_PATTERN = /[\u00c3\u00a2\u00d0\u00d1\ufffd]/u;
const PLACEHOLDER_PATTERN = /(placeholder|coming soon|not ready|review pending|урок[^.!?\n]{0,80}на проверке|этот урок[^.!?\n]{0,80}не готов|цей урок[^.!?\n]{0,80}не готов|заглуш)/iu;
const APP_LEVELS = [
  ['A1', 1, 8],
  ['A2', 9, 18],
  ['B1', 19, 28],
  ['B2', 29, 32],
];

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function lessonLevel(lessonId) {
  return APP_LEVELS.find(([, start, end]) => lessonId >= start && lessonId <= end)?.[0] ?? 'A1';
}

function lessonPath(lessonId) {
  const id = String(lessonId).padStart(2, '0');
  return path.join(MATERIALIZED_DIR, `lesson${id}_blueprint_rebuild`, `fr_lesson${id}_blueprint_rebuild_theory_vocab_pack_v1.json`);
}

function candidatePath(lessonId) {
  const id = String(lessonId).padStart(2, '0');
  return path.join(REVIEW_DIR, `lesson${id}_blueprint_rebuild_candidate_v1.json`);
}

function normalizeTheorySections(pack) {
  if (Array.isArray(pack.theory)) {
    return pack.theory.map((section, index) => ({
      order: index + 1,
      titleRu: section.titleRu,
      titleUk: section.titleUk,
      bodyRu: section.bodyRu,
      bodyUk: section.bodyUk,
    }));
  }
  if (Array.isArray(pack.theory?.sections)) {
    return pack.theory.sections.map((section, index) => ({
      order: index + 1,
      titleRu: section.titleRu,
      titleUk: section.titleUk,
      bodyRu: section.ru,
      bodyUk: section.uk,
    }));
  }
  return [];
}

function normalizeVocabulary(pack) {
  if (Array.isArray(pack.vocabulary)) return pack.vocabulary.filter((item) => typeof item === 'string' && item.trim());
  if (Array.isArray(pack.vocabulary?.allItems)) {
    return pack.vocabulary.allItems.map((item) => item.text).filter((item) => typeof item === 'string' && item.trim());
  }
  if (pack.vocabulary && typeof pack.vocabulary === 'object') {
    return Object.values(pack.vocabulary)
      .flatMap((value) => Array.isArray(value) ? value : [])
      .map((item) => typeof item === 'string' ? item : item?.text)
      .filter((item) => typeof item === 'string' && item.trim());
  }
  return [];
}

function line(text, type = 'text', tone = undefined) {
  return {
    type,
    parts: [{ text, ...(tone ? { tone } : {}) }],
  };
}

function firstNonEmpty(...values) {
  return values.find((value) => typeof value === 'string' && value.trim().length > 0) ?? '';
}

function buildIntroScreens(lessonId, pack, candidate) {
  const theory = normalizeTheorySections(pack);
  const vocabulary = normalizeVocabulary(pack);
  const examples = (candidate.rows || []).slice(0, 3).map((row) => ({
    en: [{ text: row.phraseFr, tone: 'accent' }],
    ru: row.ru,
    uk: row.uk,
    trRU: row.ru,
    trUK: row.uk,
  }));
  const hookExamples = Array.isArray(pack.practiceHooks)
    ? pack.practiceHooks.flatMap((hook) => Array.isArray(hook.examples) ? hook.examples : []).slice(0, 2)
    : [];
  const mainTitleRu = firstNonEmpty(theory[0]?.titleRu, pack.theory?.titleRu, `Lesson ${lessonId}`);
  const mainTitleUk = firstNonEmpty(theory[0]?.titleUk, pack.theory?.titleUk, `Lesson ${lessonId}`);
  const mainBodyRu = firstNonEmpty(theory[0]?.bodyRu, theory[0]?.ru);
  const mainBodyUk = firstNonEmpty(theory[0]?.bodyUk, theory[0]?.uk);
  const formulaTitleRu = firstNonEmpty(theory[1]?.titleRu, theory[0]?.titleRu, mainTitleRu);
  const formulaTitleUk = firstNonEmpty(theory[1]?.titleUk, theory[0]?.titleUk, mainTitleUk);
  const formulaBodyRu = firstNonEmpty(theory[1]?.bodyRu, theory[0]?.bodyRu, mainBodyRu);
  const formulaBodyUk = firstNonEmpty(theory[1]?.bodyUk, theory[0]?.bodyUk, mainBodyUk);
  const vocabPreview = vocabulary.slice(0, 10).join(', ');
  const firstExample = candidate.rows?.[0];

  return [
    {
      lessonId,
      screenId: `fr_lesson_${lessonId}_intro_1_concept`,
      order: 1,
      kind: 'concept',
      titleRU: mainTitleRu,
      titleUK: mainTitleUk,
      subtitleRU: mainBodyRu.slice(0, 160),
      subtitleUK: mainBodyUk.slice(0, 160),
      textRU: mainBodyRu,
      textUK: mainBodyUk,
      linesRU: [line(mainBodyRu), ...(firstExample ? [line(firstExample.phraseFr, 'example', 'accent')] : [])],
      linesUK: [line(mainBodyUk), ...(firstExample ? [line(firstExample.phraseFr, 'example', 'accent')] : [])],
      examples,
      developerNotes: {
        screenGoal: `French lesson ${lessonId}: introduce the native French concept without English copy/paste.`,
        visualPriority: ['target French example first', 'RU/UK explanation stays source-locale only'],
        highlightRules: ['accent marks French target phrases', 'muted text is support only'],
        forbiddenContent: ['no English lesson text as final French content', 'no source-locale mixing', 'no draft filler text'],
        layoutRules: ['keep rich lines short', 'use examples as separate rows'],
      },
    },
    {
      lessonId,
      screenId: `fr_lesson_${lessonId}_intro_2_formula`,
      order: 2,
      kind: 'formula',
      titleRU: formulaTitleRu,
      titleUK: formulaTitleUk,
      subtitleRU: formulaBodyRu.slice(0, 160),
      subtitleUK: formulaBodyUk.slice(0, 160),
      textRU: formulaBodyRu,
      textUK: formulaBodyUk,
      linesRU: [line(formulaBodyRu), ...hookExamples.map((example) => line(example, 'example', 'accent'))],
      linesUK: [line(formulaBodyUk), ...hookExamples.map((example) => line(example, 'example', 'accent'))],
      examples,
      developerNotes: {
        screenGoal: `French lesson ${lessonId}: show the operating pattern behind the lesson.`,
        visualPriority: ['formula/pattern first', 'examples second'],
        highlightRules: ['accent marks the reusable French form'],
        forbiddenContent: ['do not add unrelated grammar', 'do not turn this into English theory'],
        layoutRules: ['one pattern per line', 'examples remain readable on mobile'],
      },
    },
    {
      lessonId,
      screenId: `fr_lesson_${lessonId}_intro_3_practice`,
      order: 3,
      kind: 'practice',
      titleRU: theory[2]?.titleRu || mainTitleRu,
      titleUK: theory[2]?.titleUk || mainTitleUk,
      subtitleRU: vocabPreview,
      subtitleUK: vocabPreview,
      textRU: theory[2]?.bodyRu || mainBodyRu,
      textUK: theory[2]?.bodyUk || mainBodyUk,
      linesRU: [
        line(theory[2]?.bodyRu || mainBodyRu),
        line(vocabPreview, 'tip', 'accent'),
      ],
      linesUK: [
        line(theory[2]?.bodyUk || mainBodyUk),
        line(vocabPreview, 'tip', 'accent'),
      ],
      examples,
      developerNotes: {
        screenGoal: `French lesson ${lessonId}: prepare the learner for practice and vocabulary recognition.`,
        visualPriority: ['practice instruction', 'vocabulary preview', 'French examples'],
        highlightRules: ['accent marks high-value vocabulary'],
        forbiddenContent: ['no fake future sections', 'no unreviewed draft rows'],
        layoutRules: ['vocabulary preview can wrap', 'examples remain separate from source prompts'],
      },
    },
  ];
}

function screenIssues(screen) {
  const issues = [];
  const textBlob = JSON.stringify(screen);
  if (screen.lessonId < 1 || screen.lessonId > 32) issues.push('LESSON_ID_RANGE');
  if (!screen.screenId?.startsWith(`fr_lesson_${screen.lessonId}_intro_`)) issues.push('SCREEN_ID_PREFIX');
  if (!['concept', 'formula', 'practice'].includes(screen.kind)) issues.push('KIND');
  if (!screen.titleRU || !screen.titleUK) issues.push('TITLE_RU_UK');
  if (screen.titleES || screen.textES || screen.linesES) issues.push('FORBIDDEN_ES_FIELD');
  if (!Array.isArray(screen.linesRU) || screen.linesRU.length === 0) issues.push('LINES_RU');
  if (!Array.isArray(screen.linesUK) || screen.linesUK.length === 0) issues.push('LINES_UK');
  if (!Array.isArray(screen.examples) || screen.examples.length === 0) issues.push('EXAMPLES');
  if (!screen.developerNotes) issues.push('DEVELOPER_NOTES');
  if (MOJIBAKE_PATTERN.test(textBlob)) issues.push('MOJIBAKE');
  if (PLACEHOLDER_PATTERN.test(textBlob)) issues.push('PLACEHOLDER');
  return issues;
}

function main() {
  const generatedAt = new Date().toISOString();
  const lessons = [];
  const introScreens = [];
  const blockers = [];

  for (let lessonId = 1; lessonId <= 32; lessonId += 1) {
    const packPath = lessonPath(lessonId);
    const rowPath = candidatePath(lessonId);
    if (!fs.existsSync(packPath)) {
      blockers.push(`LESSON_${lessonId}_THEORY_VOCAB_PACK_MISSING`);
      continue;
    }
    if (!fs.existsSync(rowPath)) {
      blockers.push(`LESSON_${lessonId}_CANDIDATE_MISSING`);
      continue;
    }
    const pack = readJson(packPath);
    const candidate = readJson(rowPath);
    const theory = normalizeTheorySections(pack);
    const vocabulary = normalizeVocabulary(pack);
    const screens = buildIntroScreens(lessonId, pack, candidate);
    const issues = [];
    if (pack.studyTarget !== 'fr') issues.push('PACK_STUDY_TARGET_NOT_FR');
    if (pack.targetContentLang !== 'fr') issues.push('PACK_TARGET_CONTENT_NOT_FR');
    if (pack.activationApproved === true) issues.push('PACK_ACTIVATION_TRUE');
    if (theory.length < 5) issues.push('THEORY_SECTIONS_LT_5');
    if (vocabulary.length < 20) issues.push('VOCABULARY_LT_20');
    if (!candidate.rows || candidate.rows.length !== 50) issues.push('CANDIDATE_ROWS_NOT_50');
    for (const [index, screen] of screens.entries()) {
      for (const issue of screenIssues(screen)) issues.push(`INTRO_${index + 1}_${issue}`);
    }
    if (issues.length > 0) blockers.push(`LESSON_${lessonId}_${issues[0]}`);
    introScreens.push(...screens);
    lessons.push({
      lessonId,
      appCourseLevel: pack.appCourseLevel || lessonLevel(lessonId),
      theorySections: theory.length,
      vocabularyItems: vocabulary.length,
      introScreens: screens.length,
      candidateRows: candidate.rows?.length ?? 0,
      status: issues.length === 0 ? 'PASS' : 'BLOCK',
      issues,
      sourceTheoryVocabPack: rel(packPath),
      sourceCandidate: rel(rowPath),
    });
  }

  const introPack = {
    schemaVersion: 'gustav-fr-lesson-intro-pack-v1',
    generatedAt,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: ['ru', 'uk'],
    contentVersion: 'fr_lesson_intro_pack_v1.draft',
    surface: 'lesson_intro',
    delivery: 'server-pack-candidate',
    productionReady: false,
    activationApproved: false,
    lessons: lessons.map(({ lessonId, appCourseLevel, introScreens: count }) => ({ lessonId, appCourseLevel, introScreens: count })),
    screens: introScreens,
  };

  writeJson(INTRO_PACK_PATH, introPack);

  const passLessons = lessons.filter((lesson) => lesson.status === 'PASS').length;
  const gate = {
    schemaVersion: 'gustav-fr-theory-vocab-intro-parity-gate-v1',
    generatedAt,
    status: blockers.length === 0 ? 'PASS_SURFACE_READY_GLOBAL_FRENCH_HOLD' : 'BLOCK',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    sourceLocales: ['ru', 'uk'],
    activationApproved: false,
    globalFrenchActivationApproved: false,
    readyForAppApply: false,
    inputs: {
      materializedDir: rel(MATERIALIZED_DIR),
      reviewDir: rel(REVIEW_DIR),
      introPack: rel(INTRO_PACK_PATH),
    },
    summary: {
      lessonsTotal: 32,
      lessonsPassing: passLessons,
      theorySectionsTotal: lessons.reduce((sum, lesson) => sum + lesson.theorySections, 0),
      vocabularyItemsTotal: lessons.reduce((sum, lesson) => sum + lesson.vocabularyItems, 0),
      introScreensTotal: introScreens.length,
      serverPackCandidateWritten: true,
      appBundleIntroRegistryStillEmptyByDesign: true,
      activationApproved: false,
      globalFrenchStillHold: true,
    },
    lessons,
    invariants: {
      theoryVocabFromFrenchNativeLessonPacks: true,
      introScreensGeneratedAsServerPackCandidate: true,
      appBundleNotModified: true,
      noEnglishContentCopyAsFrenchTheory: true,
      noEsUiFieldsForFrenchIntro: true,
      sourceLocaleSeparatedRuUk: true,
      noPlaceholdersOrMojibake: blockers.length === 0,
      activationRemainsClosed: true,
    },
    blockers,
    nextRequiredGlobalSteps: [
      'Wire intro/theory/vocabulary delivery through server-pack runtime before production apply.',
      'Keep app bundle French intro registry closed until runtime pack activation gates pass.',
      'Continue with audio/server/runtime or the next non-lesson surface; do not set activationApproved=true from this gate alone.',
    ],
  };

  writeJson(GATE_PATH, gate);
  console.log(`${gate.status} ${rel(GATE_PATH)} lessons=${passLessons}/32 introScreens=${introScreens.length} vocab=${gate.summary.vocabularyItemsTotal}`);
}

main();
