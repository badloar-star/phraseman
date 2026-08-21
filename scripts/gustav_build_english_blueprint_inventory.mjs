import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'english_blueprint');
const INVENTORY_PATH = path.join(OUT_DIR, 'english_blueprint_inventory_v1.json');

const SOURCE_PATHS = {
  courseLevels: path.join(ROOT, 'app', 'course_levels.ts'),
  lessonNames: path.join(ROOT, 'constants', 'lessons.ts'),
  theoryRegistry: path.join(ROOT, 'app', 'theory_content_registry.ts'),
  lessonData: [
    path.join(ROOT, 'app', 'lesson_data_1_8.ts'),
    path.join(ROOT, 'app', 'lesson_data_1_8_phrases_source.ts'),
    path.join(ROOT, 'app', 'lesson_data_1_8_phrases_es.gen.ts'),
    path.join(ROOT, 'app', 'lesson_data_9_16.ts'),
    path.join(ROOT, 'app', 'lesson_data_9_16_phrases_es.gen.ts'),
    path.join(ROOT, 'app', 'lesson_data_17_24.ts'),
    path.join(ROOT, 'app', 'lesson_data_25_32.ts'),
  ],
  lessonIntros: [
    path.join(ROOT, 'app', 'lesson_intro_screens_es_l2.ts'),
    path.join(ROOT, 'app', 'lesson_intros_17_32.ts'),
  ],
};

const FEATURE_SURFACES = [
  {
    id: 'core_lessons',
    sourcePaths: SOURCE_PATHS.lessonData,
    requiredMarkers: ['english:', 'russian:', 'ukrainian:', 'wordsEn', 'distractors'],
    frenchBuildRule: 'copy product row shape; rebuild French phrases, wordsFr, answers, and distractors natively',
  },
  {
    id: 'lesson_theory',
    sourcePaths: [SOURCE_PATHS.theoryRegistry],
    requiredMarkers: ['LESSON1_THEORY', 'LESSON32_THEORY', 'THEORY_LESSON_IDS'],
    frenchBuildRule: 'copy theory section shape; write French grammar explanations and examples natively',
  },
  {
    id: 'lesson_intro_screens',
    sourcePaths: SOURCE_PATHS.lessonIntros,
    requiredMarkers: ['INTRO_SCREENS'],
    frenchBuildRule: 'copy intro screen contract; write French-specific onboarding/explanation screens per lesson',
  },
  {
    id: 'vocabulary_word_training',
    sourcePaths: [
      path.join(ROOT, 'app', 'lesson_data_all.ts'),
      path.join(ROOT, 'app', 'personal_practice_lesson_router.ts'),
      ...SOURCE_PATHS.lessonData,
    ],
    requiredMarkers: ['wordsEn', 'LessonPhrase'],
    frenchBuildRule: 'derive words from French lesson rows and French feature banks, never fan out English vocabulary blindly',
  },
  {
    id: 'preposition_drills',
    sourcePaths: [
      path.join(ROOT, 'app', 'preposition_drill.tsx'),
      path.join(ROOT, 'app', 'preposition_explanations.ts'),
      path.join(ROOT, 'app', 'lesson_prepositions.ts'),
      path.join(ROOT, 'app', 'diagnosis_training_preposition_time_in_on_at.ts'),
      path.join(ROOT, 'app', 'diagnosis_training_preposition_place_in_on_at.ts'),
    ],
    requiredMarkers: ['preposition', 'explanation'],
    frenchBuildRule: 'replace with French preposition and contraction behavior, including a/de contractions where relevant',
  },
  {
    id: 'irregular_or_conjugation_drills',
    sourcePaths: [
      path.join(ROOT, 'app', 'lesson_irregular_verbs.tsx'),
      path.join(ROOT, 'app', 'irregular_verbs_data.ts'),
      path.join(ROOT, 'app', 'diagnosis_training_verb_past_simple_regular_irregular.ts'),
    ],
    requiredMarkers: ['irregular', 'verb'],
    frenchBuildRule: 'preserve drill intent; implement French verb/conjugation practice instead of English irregular-verb copying',
  },
  {
    id: 'flashcards_collection_cards',
    sourcePaths: [
      path.join(ROOT, 'app', 'flashcards_collection.tsx'),
      path.join(ROOT, 'app', 'flashcards_target_gate.ts'),
      path.join(ROOT, 'app', 'flashcards', 'bundled_marketplace_manifest.json'),
      path.join(ROOT, 'app', 'flashcards', 'bundles', 'phrasalVerbsBundle.ts'),
    ],
    requiredMarkers: ['flashcard'],
    frenchBuildRule: 'copy pack/collection contract; create French decks and collectibles from French themes and realities',
  },
  {
    id: 'ai_prompt_surfaces',
    sourcePaths: [
      path.join(ROOT, 'app', 'ai_mistake_explain_client.ts'),
      path.join(ROOT, 'app', 'ai_dialog_scenarios.ts'),
      path.join(ROOT, 'app', 'ai_dialog_session.tsx'),
      path.join(ROOT, 'app', 'explain_quiz_client.ts'),
      path.join(ROOT, 'app', 'compass', 'compass_brain.ts'),
    ],
    requiredMarkers: ['ai', 'prompt', 'language'],
    frenchBuildRule: 'copy prompt purpose; require studyTarget=fr, target-language cache keys, and rejected-output return blocking',
  },
  {
    id: 'server_runtime_admin_storage_cloud',
    sourcePaths: [
      path.join(ROOT, 'app', 'french_quiz_remote_runtime.ts'),
      path.join(ROOT, 'app', 'french_flashcard_remote_runtime.ts'),
      path.join(ROOT, 'app', 'cloud_sync.ts'),
      path.join(ROOT, 'admin', 'index.html'),
      path.join(ROOT, 'docs', 'gustav', 'GUSTAV_TARGET_STORAGE_PLAN.md'),
      path.join(ROOT, 'docs', 'gustav', 'GUSTAV_CLOUD_SYNC_IMPACT_PLAN.md'),
    ],
    requiredMarkers: ['fr', 'studyTarget'],
    frenchBuildRule: 'deliver French through isolated server packs and target-aware runtime/admin/storage/cloud paths',
  },
];

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readText(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

function sha256Text(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function extractCourseLevels(source) {
  const levelsMatch = source.match(/COURSE_LEVELS\s*=\s*\[([^\]]+)\]/);
  const levels = levelsMatch
    ? [...levelsMatch[1].matchAll(/'([^']+)'/g)].map((match) => match[1])
    : [];
  const ranges = {};
  for (const match of source.matchAll(/\b(A1|A2|B1|B2)\s*:\s*\[(\d+),\s*(\d+)\]/g)) {
    ranges[match[1]] = [Number(match[2]), Number(match[3])];
  }
  return { levels, ranges };
}

function extractArrayCount(source, exportName) {
  const start = source.indexOf(`export const ${exportName} = [`);
  if (start < 0) return 0;
  const end = source.indexOf('] as const', start);
  if (end < 0) return 0;
  const block = source.slice(start, end);
  return [...block.matchAll(/\/\/\s*(\d+)/g)].length;
}

function uniqueMatches(source, pattern) {
  return new Set([...source.matchAll(pattern)].map((match) => match[1]));
}

function markerPresence(paths, markers) {
  const combined = paths.map(readText).join('\n');
  return Object.fromEntries(markers.map((marker) => [marker, combined.toLowerCase().includes(marker.toLowerCase())]));
}

function countSurfaceMarkers(paths, markers) {
  const presence = markerPresence(paths, markers);
  return Object.values(presence).filter(Boolean).length;
}

function buildLessonPhraseInventory(lessonSources) {
  const combined = lessonSources.map(readText).join('\n');
  return Array.from({ length: 32 }, (_, index) => {
    const lessonId = index + 1;
    const ids = uniqueMatches(combined, new RegExp(`\\b(lesson${lessonId}_phrase_\\d+)\\b`, 'g'));
    const phraseExportPresent = combined.includes(`LESSON_${lessonId}_PHRASES`);
    const introExportPresent = combined.includes(`LESSON_${lessonId}_INTRO_SCREENS`);
    return {
      lessonId,
      phraseRowsObserved: ids.size,
      phraseExportPresent,
      introExportPresent,
      expectedPhraseRows: 50,
      rowShapeMarkers: markerPresence(lessonSources, ['english:', 'russian:', 'ukrainian:', 'spanish:', 'words', 'wordsEn', 'correct', 'distractors', 'category']),
    };
  });
}

function buildTheoryInventory() {
  const source = readText(SOURCE_PATHS.theoryRegistry);
  const ids = [...new Set([...source.matchAll(/LESSON(\d+)_THEORY/g)].map((match) => Number(match[1])))].sort((a, b) => a - b);
  return {
    path: rel(SOURCE_PATHS.theoryRegistry),
    exists: fs.existsSync(SOURCE_PATHS.theoryRegistry),
    lessonIds: ids,
    lessonCount: ids.length,
    registryMarkers: markerPresence([SOURCE_PATHS.theoryRegistry], ['THEORY_CONTENT', 'THEORY_LESSON_IDS', 'getTheoryForLesson']),
  };
}

function buildFeatureSurfaceInventory() {
  return FEATURE_SURFACES.map((surface) => {
    const existingPaths = surface.sourcePaths.filter((sourcePath) => fs.existsSync(sourcePath));
    const markerPresenceMap = markerPresence(existingPaths, surface.requiredMarkers);
    return {
      id: surface.id,
      sourcePaths: surface.sourcePaths.map(rel),
      existingSourcePaths: existingPaths.map(rel),
      missingSourcePaths: surface.sourcePaths.filter((sourcePath) => !fs.existsSync(sourcePath)).map(rel),
      requiredMarkers: surface.requiredMarkers,
      observedMarkers: markerPresenceMap,
      markerHits: countSurfaceMarkers(existingPaths, surface.requiredMarkers),
      frenchBuildRule: surface.frenchBuildRule,
      status: existingPaths.length > 0 && Object.values(markerPresenceMap).some(Boolean) ? 'MAPPED' : 'NOT_PROVEN',
    };
  });
}

function main() {
  const generatedAt = new Date().toISOString();
  const courseLevelSource = readText(SOURCE_PATHS.courseLevels);
  const lessonNameSource = readText(SOURCE_PATHS.lessonNames);
  const courseLevels = extractCourseLevels(courseLevelSource);
  const lessonNameCounts = {
    ru: extractArrayCount(lessonNameSource, 'LESSON_NAMES_RU'),
    uk: extractArrayCount(lessonNameSource, 'LESSON_NAMES_UK'),
    es: extractArrayCount(lessonNameSource, 'LESSON_NAMES_ES'),
  };
  const lessonRows = buildLessonPhraseInventory([...SOURCE_PATHS.lessonData, ...SOURCE_PATHS.lessonIntros]);
  const theory = buildTheoryInventory();
  const featureSurfaces = buildFeatureSurfaceInventory();

  const blockers = [];
  const productionBlockers = [];
  const expectedRanges = { A1: [1, 8], A2: [9, 18], B1: [19, 28], B2: [29, 32] };

  if (JSON.stringify(courseLevels.levels) !== JSON.stringify(['A1', 'A2', 'B1', 'B2'])) blockers.push('APP_LEVEL_LIST_MISMATCH');
  if (JSON.stringify(courseLevels.ranges) !== JSON.stringify(expectedRanges)) blockers.push('APP_LEVEL_RANGE_MISMATCH');
  if (lessonNameCounts.ru !== 32 || lessonNameCounts.uk !== 32 || lessonNameCounts.es !== 32) blockers.push('LESSON_NAME_COUNT_NOT_32');
  if (lessonRows.some((row) => row.phraseRowsObserved !== 50 || !row.phraseExportPresent)) blockers.push('LESSON_PHRASE_BLUEPRINT_INCOMPLETE');
  if (theory.lessonCount !== 32) blockers.push('THEORY_BLUEPRINT_NOT_32');
  if (featureSurfaces.some((surface) => surface.status !== 'MAPPED')) blockers.push('FEATURE_SURFACE_NOT_MAPPED');

  productionBlockers.push(
    'FRENCH_BLUEPRINT_PLAN_NOT_MATERIALIZED_FOR_ALL_SURFACES',
    'FRENCH_CONTENT_NOT_YET_REBUILT_AGAINST_THIS_BLUEPRINT',
    'FRENCH_ACTIVATION_MUST_REMAIN_HOLD'
  );

  const inventory = {
    schemaVersion: 'gustav-english-blueprint-inventory-v1',
    generatedAt,
    status: blockers.length === 0 ? 'PASS' : 'BLOCK',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    sourceLocales: ['ru', 'uk'],
    activationApproved: false,
    readyForApply: false,
    courseLevels,
    lessonNameCounts,
    lessonRows,
    theory,
    featureSurfaces,
    summary: {
      appLevelsObserved: courseLevels.levels,
      lessonCount: 32,
      expectedRowsPerLesson: 50,
      totalPhraseRowsObserved: lessonRows.reduce((sum, row) => sum + row.phraseRowsObserved, 0),
      lessonsWith50Rows: lessonRows.filter((row) => row.phraseRowsObserved === 50).length,
      lessonsWithPhraseExports: lessonRows.filter((row) => row.phraseExportPresent).length,
      introExportsObserved: lessonRows.filter((row) => row.introExportPresent).length,
      theoryLessonCount: theory.lessonCount,
      mappedFeatureSurfaces: featureSurfaces.filter((surface) => surface.status === 'MAPPED').length,
      featureSurfacesTotal: featureSurfaces.length,
      blockers: blockers.length,
      productionBlockers: productionBlockers.length,
      sourceHash: sha256Text([
        courseLevelSource,
        lessonNameSource,
        ...SOURCE_PATHS.lessonData.map(readText),
        ...SOURCE_PATHS.lessonIntros.map(readText),
        readText(SOURCE_PATHS.theoryRegistry),
      ].join('\n')),
    },
    blockers,
    productionBlockers,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      frenchContentModifiedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    },
  };

  writeJson(INVENTORY_PATH, inventory);
  console.log(`${inventory.status} ${rel(INVENTORY_PATH)} blockers=${blockers.length} surfaces=${inventory.summary.mappedFeatureSurfaces}/${inventory.summary.featureSurfacesTotal}`);
}

main();
