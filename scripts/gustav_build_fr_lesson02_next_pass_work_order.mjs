import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const ENGLISH_BLUEPRINT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'english_blueprint', 'english_lesson_surgical_blueprint_v1.json');
const SURGICAL_WORK_ORDER_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'core_lessons_32', 'fr_surgical_lesson_work_order_v1.json');
const LESSON01_INTEGRITY_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'materialized', 'lesson01', 'fr_lesson01_integrity_gate_audit_v1.json');
const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'planning');
const WORK_ORDER_PATH = path.join(OUT_DIR, 'fr_lesson02_next_pass_work_order_v1.json');
const MD_PATH = path.join(OUT_DIR, 'fr_lesson02_next_pass_work_order_v1.md');
const STATE_PATH = path.join(ROOT, 'docs', 'gustav', 'state.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function main() {
  const generatedAt = new Date().toISOString();
  const englishBlueprint = readJson(ENGLISH_BLUEPRINT_PATH);
  const surgicalWorkOrder = readJson(SURGICAL_WORK_ORDER_PATH);
  const lesson01Integrity = readJson(LESSON01_INTEGRITY_PATH);
  const englishLesson2 = (englishBlueprint.lessons || []).find((lesson) => lesson.lessonId === 2);
  const frenchLesson2 = (surgicalWorkOrder.lessonWorkOrders || []).find((lesson) => lesson.lessonId === 2);
  const blockers = [];

  if (!englishLesson2) blockers.push('english_lesson2_blueprint_missing');
  if (!frenchLesson2) blockers.push('french_lesson2_work_order_missing');
  if (lesson01Integrity.status !== 'PASS_INTEGRITY_WITH_AUDIO_HOLD') blockers.push('lesson01_integrity_gate_not_pass');

  const workOrder = {
    schemaVersion: 'gustav-fr-lesson02-next-pass-work-order-v1',
    generatedAt,
    status: blockers.length === 0 ? 'READY_FOR_LESSON02_REVIEW_DRAFT' : 'BLOCK',
    blockers,
    studyTarget: 'fr',
    targetContentLang: 'fr',
    sourceLocales: ['ru', 'uk'],
    lessonId: 2,
    appCourseLevel: 'A1',
    internalFrenchBand: 'A1.1',
    previousLessonIntegrity: {
      path: rel(LESSON01_INTEGRITY_PATH),
      status: lesson01Integrity.status,
      structuralIntegrityReady: lesson01Integrity.summary?.structuralIntegrityReady === true,
      readyForAudioGeneration: lesson01Integrity.summary?.readyForAudioGeneration === true,
      productionStillBlocked: true,
    },
    englishBlueprint: {
      path: rel(ENGLISH_BLUEPRINT_PATH),
      englishTopic: englishLesson2?.englishTopic,
      sequencingReason: englishLesson2?.sequencingReason,
      vocabularyPrinciple: englishLesson2?.vocabularyPrinciple,
      sampleEnglishPhrases: englishLesson2?.phraseBlueprint?.sampleEnglishPhrases ?? [],
      phraseRows: englishLesson2?.phraseBlueprint?.phraseRows,
      wordsEnSlots: englishLesson2?.phraseBlueprint?.wordsEnSlots,
      categoryDistribution: englishLesson2?.phraseBlueprint?.categoryDistribution,
      distractorPrinciples: englishLesson2?.distractorBlueprint?.inferredPrinciples ?? [],
    },
    frenchNativeBuildTarget: {
      requiredConcept: frenchLesson2?.requiredFrenchConcept,
      lessonIntent: 'Teach beginner French negation and yes/no questions after Lesson 1 affirmative identity/state phrases.',
      mustCreate: {
        phraseRows: 50,
        sourceMeanings: ['ru', 'uk'],
        wordsFrSlots: 'French slot-aware wordsFr with 5 distractors per slot',
        theoryShape: 'Same app theory block model: titleRu/titleUk + sections + body/formula/examples/fix/tip blocks',
        reviewPacket: '50 row LLM official-source review packet plus lesson-level gate',
        packCandidates: 'RU and UK source-locale pack candidates only after 50 accepted decisions',
        audioManifest: '100 source-locale TTS slots only after pack candidates pass',
      },
      frenchScopeBoundaries: [
        'Use ne ... pas for simple negation.',
        'Use Est-ce que ... ? as the main beginner yes/no question frame.',
        'Use intonation questions only where natural and beginner-safe.',
        'Introduce inversion only as recognition, not the main production pattern.',
        'Keep tu/vous stable inside a row.',
        'Reuse Lesson 1 vocabulary where possible so the new operation is negation/question form.',
      ],
      trustedSourceNeeds: [
        'CEFR A1 simple interaction and familiar expressions',
        'TV5MONDE / trusted grammar source for negation and question forms',
        'Le Robert for être forms',
        'Dictionary cross-check for adjective/state vocabulary',
      ],
    },
    exactNextCommands: [
      'Create scripts/gustav_build_fr_lesson02_review_draft.mjs',
      'Create tests/gustav_fr_lesson02_review_draft.test.ts',
      'Run node scripts/gustav_build_fr_lesson02_review_draft.mjs',
      'Run node node_modules/jest/bin/jest.js --watchman=false --runTestsByPath tests/gustav_fr_lesson02_review_draft.test.ts',
    ],
    safety: {
      appBundleModifiedByThisScript: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    },
  };

  writeJson(WORK_ORDER_PATH, workOrder);
  const lines = [
    '# French Lesson 2 Next Pass Work Order',
    '',
    `Status: ${workOrder.status}`,
    `English topic: ${workOrder.englishBlueprint.englishTopic}`,
    `French target: ${workOrder.frenchNativeBuildTarget.lessonIntent}`,
    '',
    '## French Scope',
    '',
    ...workOrder.frenchNativeBuildTarget.frenchScopeBoundaries.map((item) => `- ${item}`),
    '',
    '## Next Commands',
    '',
    ...workOrder.exactNextCommands.map((item) => `- ${item}`),
    '',
  ];
  fs.writeFileSync(MD_PATH, `${lines.join('\n')}\n`, 'utf8');

  if (fs.existsSync(STATE_PATH)) {
    const state = readJson(STATE_PATH);
    state.lesson02NextPassWorkOrder = rel(WORK_ORDER_PATH);
    state.lesson02NextPassWorkOrderStatus = workOrder.status;
    state.nextPassPlan = workOrder.exactNextCommands;
    fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  console.log(`${workOrder.status} ${rel(WORK_ORDER_PATH)} lessonId=2 blockers=${blockers.length}`);
  if (blockers.length > 0) process.exitCode = 1;
}

main();
