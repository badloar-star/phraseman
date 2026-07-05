import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'core_lessons_32');
const OUT_PATH = path.join(OUT_DIR, 'fr_surgical_lesson_work_order_v1.json');
const BLUEPRINT_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'english_blueprint', 'english_lesson_surgical_blueprint_v1.json');
const RECLASSIFICATION_PATH = path.join(OUT_DIR, 'fr_lesson_cefr_reclassification_plan_v1.json');

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

function buildPriority(lesson) {
  if (lesson.appCourseLevel === 'B2') return 'P0_B2_REBUILD_OR_EVIDENCE';
  if (lesson.appCourseLevel === 'B1') return 'P0_B1_REBUILD_OR_EVIDENCE';
  if (lesson.phraseBlueprint.wordSlotSource === 'words_fallback') return 'P1_LEGACY_WORD_SLOT_SHAPE';
  return 'P2_NATIVE_REBUILD_AFTER_B1_B2';
}

function requiredFrenchConcept(lesson) {
  const topic = lesson.englishTopic.toLowerCase();
  if (topic.includes('used to')) return 'French past habit/state with imparfait and avant/habituellement where natural';
  if (topic.includes('relative')) return 'French relative pronouns qui/que/ou/dont with subject/object distinction';
  if (topic.includes('complex object')) return 'French causative/perception/valency equivalents such as faire, laisser, entendre/voir + infinitive, demander a';
  if (topic.includes('preposition')) return 'French preposition system with contractions, valency, place/time distinctions';
  if (topic.includes('irregular')) return 'French high-frequency irregular verbs and conjugation families';
  if (topic.includes('article')) return 'French articles, gender/number, elision, partitive where needed';
  if (topic.includes('present perfect')) return 'French passe compose/result/experience equivalents, not English perfect mechanics';
  if (topic.includes('past continuous')) return 'French imparfait vs passe compose background/interruption contrast';
  if (topic.includes('condition')) return 'French si-clause and conditionnel sequencing';
  if (topic.includes('reported')) return 'French indirect speech with que/si, pronoun and tense shifts';
  if (topic.includes('reflexive')) return 'French pronominal verbs and reflexive pronouns';
  return `French-native equivalent for English product intent: ${lesson.englishTopic}`;
}

function main() {
  const generatedAt = new Date().toISOString();
  const blueprint = readJson(BLUEPRINT_PATH);
  const reclassification = readJson(RECLASSIFICATION_PATH);
  const blockers = [];

  if (blueprint.schemaVersion !== 'gustav-english-lesson-surgical-blueprint-v1' || blueprint.status !== 'PASS') {
    blockers.push('ENGLISH_SURGICAL_BLUEPRINT_NOT_PASS');
  }
  if (reclassification.schemaVersion !== 'gustav-fr-lesson-cefr-reclassification-plan-v1') {
    blockers.push('FR_RECLASSIFICATION_PLAN_MISSING');
  }

  const reclassByLesson = new Map((reclassification.metadataPlan ?? []).map((row) => [row.lessonId, row]));
  const lessonWorkOrders = (blueprint.lessons ?? []).map((lesson) => {
    const meta = reclassByLesson.get(lesson.lessonId);
    const requiredCategoryFamilies = Object.keys(lesson.phraseBlueprint.categoryDistribution ?? {}).sort();
    return {
      lessonId: lesson.lessonId,
      appCourseLevel: lesson.appCourseLevel,
      buildPriority: buildPriority(lesson),
      englishTopic: lesson.englishTopic,
      englishSequencingReasonToStudy: lesson.sequencingReason,
      englishVocabularyPrincipleToStudy: lesson.vocabularyPrinciple,
      requiredFrenchConcept: requiredFrenchConcept(lesson),
      mustInspectBeforeWriting: {
        allEnglish50Phrases: true,
        sampleEnglishPhrases: lesson.phraseBlueprint.sampleEnglishPhrases,
        englishWordSlotSource: lesson.phraseBlueprint.wordSlotSource,
        englishWordSlots: lesson.phraseBlueprint.analyzedWordSlots,
        englishCategoryFamilies: requiredCategoryFamilies,
        englishDistractorAverage: lesson.distractorBlueprint.averageDistractorsPerSlot,
        englishDistractorPrinciples: lesson.distractorBlueprint.inferredPrinciples,
        theoryShapeRequired: true,
      },
      frenchMustCreate: {
        phraseRows: 50,
        wordsFrSlots: 'one slot map per French phrase, French grammar category aware',
        ruUkMeanings: true,
        distractors: [
          'same French grammatical slot',
          'plausible French learner confusion',
          'same part of speech/conjugation family where applicable',
          'no sourceLocale words inside French target slots',
          'no duplicate correct answer',
          'no distractor that is also correct in context',
        ],
        theory: {
          sectionShapeFromEnglishTheory: true,
          frenchGrammarOnly: true,
          examplesAndCommonMistakesRequired: true,
        },
        audio: 'OpenAI TTS only after accepted review and audio gates',
        serverPackDelivery: 'downloadable fr pack only after review/audio/server/runtime gates',
      },
      currentMetadataPlan: meta?.metadataToMaterialize ?? null,
      rebuildOrEvidenceRequired: Boolean(meta?.rebuildOrEvidenceRequired),
      materializationAllowedNow: false,
      generationAllowedNow: false,
      productionBlockers: [
        'MUST_COMPLETE_SURGICAL_REVIEW_BEFORE_GENERATION',
        ...(meta?.rebuildOrEvidenceRequired ? ['B1_B2_REBUILD_OR_EVIDENCE_REQUIRED'] : []),
        'LLM_OFFICIAL_SOURCE_REVIEW_INCOMPLETE',
        'THEORY_VOCAB_DRILLS_PROMPTS_NOT_READY',
      ],
    };
  });

  if (lessonWorkOrders.length !== 32) blockers.push('WORK_ORDER_NOT_32_LESSONS');
  if (lessonWorkOrders.some((row) => row.frenchMustCreate.phraseRows !== 50)) blockers.push('WORK_ORDER_PHRASE_ROW_TARGET_NOT_50');
  if (lessonWorkOrders.some((row) => row.mustInspectBeforeWriting.englishWordSlots <= 0)) blockers.push('WORK_ORDER_MISSING_ENGLISH_WORD_SLOTS');
  if (lessonWorkOrders.some((row) => row.materializationAllowedNow || row.generationAllowedNow)) blockers.push('WORK_ORDER_OPENED_GENERATION_OR_MATERIALIZATION');

  const productionBlockers = [
    'FRENCH_GENERATION_HOLD_UNTIL_SURGICAL_WORK_ORDER_IS_REVIEWED',
    'FRENCH_B1_B2_REBUILD_OR_EVIDENCE_REQUIRED_FOR_LESSONS_19_32',
    'FRENCH_DISTRACTOR_THEORY_VOCAB_DRILL_GATES_NOT_COMPLETE',
  ];

  const workOrder = {
    schemaVersion: 'gustav-fr-surgical-lesson-work-order-v1',
    generatedAt,
    status: blockers.length > 0 ? 'BLOCK' : 'HOLD',
    studyTarget: 'fr',
    sourceStudyTarget: 'en',
    sourceLocales: ['ru', 'uk'],
    activationApproved: false,
    readyForApply: false,
    inputs: {
      englishSurgicalBlueprint: rel(BLUEPRINT_PATH),
      frCefrReclassificationPlan: rel(RECLASSIFICATION_PATH),
    },
    policy: {
      surgicalBeforeGeneration: true,
      inspectEnglish50RowsPerLesson: true,
      copyProductShapeOnly: true,
      rebuildFrenchNatively: true,
      noDirectAppBundleProductionContent: true,
      noServerUploadOrRuntimeActivation: true,
    },
    lessonWorkOrders,
    drillWorkOrders: {
      frenchConjugationReplacementForEnglishIrregulars: {
        sourceEnglishPrinciple: blueprint.drills.irregularVerbs.principle,
        requiredFrenchReplacement: 'high-frequency French conjugation families, irregular verbs, tense/person agreement, and auxiliary patterns',
        generationAllowedNow: false,
      },
      frenchPrepositionReplacementForEnglishPrepositions: {
        sourceEnglishPrinciple: blueprint.drills.prepositions.principle,
        requiredFrenchReplacement: 'French prepositions, contractions, de/a valency, place/time/function distinctions, and source-backed explanations',
        generationAllowedNow: false,
      },
    },
    summary: {
      lessonCount: lessonWorkOrders.length,
      phraseRowsTarget: lessonWorkOrders.reduce((sum, row) => sum + row.frenchMustCreate.phraseRows, 0),
      p0Lessons: lessonWorkOrders.filter((row) => row.buildPriority.startsWith('P0')).map((row) => row.lessonId),
      lessonsRequiringB1B2RebuildOrEvidence: lessonWorkOrders.filter((row) => row.rebuildOrEvidenceRequired).map((row) => row.lessonId),
      generationAllowedRows: lessonWorkOrders.filter((row) => row.generationAllowedNow).length,
      materializationAllowedRows: lessonWorkOrders.filter((row) => row.materializationAllowedNow).length,
      blockers: blockers.length,
      productionBlockers: productionBlockers.length,
      activationApproved: false,
      readyForApply: false,
    },
    blockers,
    productionBlockers,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      frenchContentModifiedByThisScript: false,
      appApplyStarted: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  writeJson(OUT_PATH, workOrder);
  console.log(`${workOrder.status} ${rel(OUT_PATH)} lessons=${lessonWorkOrders.length} phraseTarget=${workOrder.summary.phraseRowsTarget} p0=${workOrder.summary.p0Lessons.length}`);
}

main();
