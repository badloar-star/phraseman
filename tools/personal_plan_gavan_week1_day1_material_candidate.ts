import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1ContentAuthoringSeed,
  GavanWeek1SeedExplanationCard,
  GavanWeek1SeedPhrase,
} from './personal_plan_gavan_week1_content_authoring_seed';

export const GAVAN_WEEK1_DAY1_MATERIAL_CANDIDATE_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-day1-material-candidate.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

const REQUIRED_BLOCK_TYPES = [
  'lesson_bridge',
  'phrase_build',
  'natural_choice',
  'active_recall',
  'day_quiz_intent',
] as const;

const FORBIDDEN_CONTENT_MATCHERS: Array<[string, RegExp]> = [
  ['alex', /\balex\b/i],
  ['beta', /\bbeta\b/i],
  ['phone', /phone/i],
  ['email', /email/i],
  ['apartment', /apartment/i],
  ['rent', /rent/i],
  ['landlord', /landlord/i],
  ['viewing', /viewing/i],
  ['087', /087/],
  ['at-sign', /@/],
];

export type GavanWeek1Day1MaterialExerciseType =
  | 'lesson_bridge'
  | 'phrase_build'
  | 'natural_choice'
  | 'active_recall'
  | 'day_quiz_intent';

export type GavanWeek1Day1ExerciseBlock = {
  id: string;
  exerciseType: GavanWeek1Day1MaterialExerciseType;
  userFacingLabelRu: string;
  purposeRu: string;
  sourcePhraseIds: string[];
  finalExerciseBuilt: false;
};

export type GavanWeek1Day1AfterAnswerExplanation = GavanWeek1SeedExplanationCard & {
  trigger: 'after_answer';
};

export type GavanWeek1Day1MaterialPhrase = Omit<GavanWeek1SeedPhrase, 'explanationCards'> & {
  afterAnswerExplanations: GavanWeek1Day1AfterAnswerExplanation[];
};

export type GavanWeek1Day1PhraseBuildItem = {
  id: string;
  phraseId: string;
  targetEnglish: string;
  normalizedTarget: string;
  targetTokenCount: number;
  wordTiles: string[];
  distractorTiles: string[];
  targetRu: string;
};

export type GavanWeek1Day1NaturalChoiceItem = {
  id: string;
  promptRu: string;
  correctEnglish: string;
  options: string[];
  explanationAfterAnswer: string;
  mustNotMentionUnseenWrongOption: true;
};

export type GavanWeek1Day1ActiveRecall = {
  recallOrder: string[];
  correctWordHighlighting: false;
  hintsEnabled: false;
  errorsReturnLater: true;
  orderChanges: true;
};

export type GavanWeek1Day1QuizBlueprint = {
  id: string;
  sourcePhraseIds: string[];
  questionType: 'meaning_choice' | 'phrase_order' | 'natural_choice' | 'missing_word';
  purposeRu: string;
  finalQuestionWritten: false;
};

export type GavanWeek1Day1MaterialCandidate = {
  kind: 'gavan_week1_day1_material_candidate';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  dayId: 'gavan-week1-day1';
  dayIndex: 1;
  status: 'day1_material_candidate_not_live';
  sourceSeedStatus: 'content_authoring_seed_not_live';
  sourceSeedDayTitle: string;
  liveIntegration: false;
  sourceWritesUsed: false;
  phaseWriteTargets: [];
  exerciseBlocks: GavanWeek1Day1ExerciseBlock[];
  materialPhrases: GavanWeek1Day1MaterialPhrase[];
  phraseBuildItems: GavanWeek1Day1PhraseBuildItem[];
  naturalChoiceItems: GavanWeek1Day1NaturalChoiceItem[];
  activeRecall: GavanWeek1Day1ActiveRecall;
  dayQuizIntent: {
    questionCount: 10;
    finalQuizWritten: false;
    quizRegistered: false;
    questionBlueprints: GavanWeek1Day1QuizBlueprint[];
  };
  mediaClaims: {
    audioAssetStatus: 'not_generated';
    pronunciationScoringStatus: 'not_built';
    finalAudioReady: false;
    finalPronunciationScoringReady: false;
  };
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: string[];
    liveFilesEdited: false;
  };
};

export type GavanWeek1Day1MaterialCandidateOptions = {
  generatedAt: string;
};

export type GavanWeek1Day1MaterialCandidateWriteOptions =
  GavanWeek1Day1MaterialCandidateOptions & {
    targetPath: string;
  };

export type GavanWeek1Day1MaterialCandidateIssueCode =
  | 'source_seed_not_ready'
  | 'wrong_day_id'
  | 'live_integration_enabled'
  | 'missing_required_block_type'
  | 'word_tile_count_mismatch'
  | 'unsafe_distractor_tile'
  | 'recall_highlighting_enabled'
  | 'forbidden_anchor_present'
  | 'missing_after_answer_explanation'
  | 'wrong_quiz_question_count'
  | 'quiz_registered'
  | 'fake_audio_claim'
  | 'fake_pronunciation_claim'
  | 'target_path_not_allowed';

export type GavanWeek1Day1MaterialCandidateIssue = {
  code: GavanWeek1Day1MaterialCandidateIssueCode;
  detail: string;
  target?: string;
};

export type GavanWeek1Day1MaterialCandidateValidationResult = {
  valid: boolean;
  issues: GavanWeek1Day1MaterialCandidateIssue[];
};

export type GavanWeek1Day1MaterialCandidateWriteResult = {
  valid: boolean;
  issues: GavanWeek1Day1MaterialCandidateIssue[];
  targetPath?: string;
  bytesWritten?: number;
  candidate?: GavanWeek1Day1MaterialCandidate;
};

function issue(
  code: GavanWeek1Day1MaterialCandidateIssueCode,
  detail: string,
  target?: string,
): GavanWeek1Day1MaterialCandidateIssue {
  return { code, detail, target };
}

function withTrailingSeparator(value: string): string {
  const resolved = path.resolve(value);
  return resolved.endsWith(path.sep) ? resolved : `${resolved}${path.sep}`;
}

function isInside(target: string, parentWithSeparator: string): boolean {
  return target === parentWithSeparator.slice(0, -1) || target.startsWith(parentWithSeparator);
}

function allowedRootPaths(cwd = process.cwd()): string[] {
  return ALLOWED_TARGET_ROOTS.map((segments) =>
    withTrailingSeparator(path.join(cwd, ...segments)),
  );
}

export function isGavanWeek1Day1MaterialCandidateTargetAllowed(
  targetPath: string,
  cwd = process.cwd(),
): boolean {
  const resolvedTarget = path.resolve(cwd, targetPath);
  const rootWithSeparator = withTrailingSeparator(cwd);

  if (!isInside(resolvedTarget, rootWithSeparator)) {
    return false;
  }

  return allowedRootPaths(cwd).some((allowedRoot) => isInside(resolvedTarget, allowedRoot));
}

function normalizeTarget(value: string): string {
  return value.replace(/[.?]/g, '').trim();
}

function tokenise(value: string): string[] {
  return normalizeTarget(value).split(/\s+/).filter(Boolean);
}

function distractorsFor(english: string): string[] {
  const normalized = normalizeTarget(english).toLowerCase();
  if (normalized === 'i am here') {
    return ['ready', 'okay'];
  }
  if (normalized === 'i am ready') {
    return ['here', 'sure'];
  }
  if (normalized === "i'm not sure") {
    return ['ready', 'okay'];
  }
  return ['here', 'ready'];
}

function materialPhrase(phraseItem: GavanWeek1SeedPhrase): GavanWeek1Day1MaterialPhrase {
  return {
    ...phraseItem,
    afterAnswerExplanations: phraseItem.explanationCards.map((card) => ({
      ...card,
      trigger: 'after_answer',
    })),
  };
}

function phraseBuildItem(
  phraseItem: GavanWeek1SeedPhrase,
  index: number,
): GavanWeek1Day1PhraseBuildItem {
  const wordTiles = tokenise(phraseItem.english);

  return {
    id: `gavan-week1-day1:phrase-build-${index}`,
    phraseId: phraseItem.id,
    targetEnglish: phraseItem.english,
    normalizedTarget: normalizeTarget(phraseItem.english),
    targetTokenCount: wordTiles.length,
    wordTiles,
    distractorTiles: distractorsFor(phraseItem.english),
    targetRu: phraseItem.meaningRu,
  };
}

function exerciseBlock(
  exerciseType: GavanWeek1Day1MaterialExerciseType,
  index: number,
  userFacingLabelRu: string,
  purposeRu: string,
  sourcePhraseIds: string[],
): GavanWeek1Day1ExerciseBlock {
  return {
    id: `gavan-week1-day1:material-block-${index}`,
    exerciseType,
    userFacingLabelRu,
    purposeRu,
    sourcePhraseIds,
    finalExerciseBuilt: false,
  };
}

function quizBlueprints(sourcePhraseIds: string[]): GavanWeek1Day1QuizBlueprint[] {
  const types: GavanWeek1Day1QuizBlueprint['questionType'][] = [
    'meaning_choice',
    'phrase_order',
    'natural_choice',
    'missing_word',
    'meaning_choice',
    'phrase_order',
    'natural_choice',
    'missing_word',
    'meaning_choice',
    'phrase_order',
  ];

  return types.map((questionType, index) => ({
    id: `gavan-week1-day1:quiz-blueprint-${index + 1}`,
    sourcePhraseIds,
    questionType,
    purposeRu: 'Проверить фразы дня без финальной регистрации квиза.',
    finalQuestionWritten: false,
  }));
}

function day1(seed: GavanWeek1ContentAuthoringSeed) {
  return seed.days.find((dayItem) => dayItem.dayId === 'gavan-week1-day1');
}

export function buildGavanWeek1Day1MaterialCandidate(
  seed: GavanWeek1ContentAuthoringSeed,
  options: GavanWeek1Day1MaterialCandidateOptions,
): GavanWeek1Day1MaterialCandidate {
  const sourceDay = day1(seed);
  if (!sourceDay) {
    throw new Error('Gavan week 1 day 1 is missing from the content authoring seed.');
  }

  const sourcePhraseIds = sourceDay.phraseBank.map((phraseItem) => phraseItem.id);

  return {
    kind: 'gavan_week1_day1_material_candidate',
    generatedAt: options.generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    dayId: 'gavan-week1-day1',
    dayIndex: 1,
    status: 'day1_material_candidate_not_live',
    sourceSeedStatus: seed.status,
    sourceSeedDayTitle: sourceDay.userFacingTitle,
    liveIntegration: false,
    sourceWritesUsed: false,
    phaseWriteTargets: [],
    exerciseBlocks: [
      exerciseBlock('lesson_bridge', 1, 'Короткая база', 'Вспомнить I am и it is перед фразами дня.', sourcePhraseIds),
      exerciseBlock('phrase_build', 2, 'Собрать фразы', 'Собрать каждую фразу с точным количеством слов.', sourcePhraseIds),
      exerciseBlock('natural_choice', 3, 'Выбрать естественно', 'Выбрать короткий вариант, который звучит нормально.', sourcePhraseIds),
      exerciseBlock('active_recall', 4, 'Вспомнить без подсказок', 'Повторить фразы в другом порядке без подсветок.', sourcePhraseIds),
      exerciseBlock('day_quiz_intent', 5, 'Проверить день', 'Подготовить 10 вопросов, но не регистрировать квиз.', sourcePhraseIds),
    ],
    materialPhrases: sourceDay.phraseBank.map(materialPhrase),
    phraseBuildItems: sourceDay.phraseBank.map((phraseItem, index) =>
      phraseBuildItem(phraseItem, index + 1),
    ),
    naturalChoiceItems: sourceDay.phraseBank.map((phraseItem, index) => ({
      id: `gavan-week1-day1:natural-choice-${index + 1}`,
      promptRu: phraseItem.meaningRu,
      correctEnglish: phraseItem.english,
      options: [
        phraseItem.english,
        ...distractorsFor(phraseItem.english).map((tile) => `I am ${tile}.`),
      ],
      explanationAfterAnswer: phraseItem.explanationCards[0]?.correctFeedbackRu ?? '',
      mustNotMentionUnseenWrongOption: true,
    })),
    activeRecall: {
      recallOrder: [...sourcePhraseIds].reverse(),
      correctWordHighlighting: false,
      hintsEnabled: false,
      errorsReturnLater: true,
      orderChanges: true,
    },
    dayQuizIntent: {
      questionCount: 10,
      finalQuizWritten: false,
      quizRegistered: false,
      questionBlueprints: quizBlueprints(sourcePhraseIds),
    },
    mediaClaims: {
      audioAssetStatus: 'not_generated',
      pronunciationScoringStatus: 'not_built',
      finalAudioReady: false,
      finalPronunciationScoringReady: false,
    },
    writePolicy: {
      dryRunOnly: true,
      allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
      liveFilesEdited: false,
    },
  };
}

function phraseMissingAfterAnswerExplanation(phraseItem: GavanWeek1Day1MaterialPhrase): boolean {
  if (phraseItem.afterAnswerExplanations.length === 0) {
    return true;
  }

  const covered = new Set(phraseItem.afterAnswerExplanations.flatMap((card) => card.covers));
  return [...phraseItem.newWords, ...phraseItem.firstSeenConstructions]
    .some((target) => !covered.has(target));
}

export function validateGavanWeek1Day1MaterialCandidate(
  candidate: GavanWeek1Day1MaterialCandidate,
  seed: GavanWeek1ContentAuthoringSeed,
): GavanWeek1Day1MaterialCandidateValidationResult {
  const issues: GavanWeek1Day1MaterialCandidateIssue[] = [];
  const seedDay = day1(seed);

  if (!seedDay || seed.status !== 'content_authoring_seed_not_live') {
    issues.push(issue('source_seed_not_ready', 'Source seed must be the non-live reset content seed.'));
  }

  if (candidate.dayId !== 'gavan-week1-day1' || candidate.dayIndex !== 1) {
    issues.push(issue('wrong_day_id', 'Candidate must target Gavan week 1 day 1.'));
  }

  if (candidate.liveIntegration || candidate.sourceWritesUsed || candidate.phaseWriteTargets.length > 0) {
    issues.push(issue('live_integration_enabled', 'Material candidate must stay non-live.'));
  }

  const blockTypes = new Set(candidate.exerciseBlocks.map((blockItem) => blockItem.exerciseType));
  REQUIRED_BLOCK_TYPES.forEach((blockType) => {
    if (!blockTypes.has(blockType)) {
      issues.push(issue('missing_required_block_type', `Missing material block: ${blockType}`, blockType));
    }
  });

  candidate.phraseBuildItems.forEach((item) => {
    if (item.wordTiles.length !== item.targetTokenCount || item.wordTiles.join(' ') !== item.normalizedTarget) {
      issues.push(issue('word_tile_count_mismatch', 'Phrase build word tiles must match target token count.', item.id));
    }

    item.distractorTiles.forEach((tile) => {
      if (item.wordTiles.includes(tile)) {
        issues.push(issue('unsafe_distractor_tile', 'Distractor tile must not duplicate a correct tile.', item.id));
      }
    });
  });

  if (candidate.activeRecall.correctWordHighlighting || candidate.activeRecall.hintsEnabled) {
    issues.push(issue('recall_highlighting_enabled', 'Plan recall must not highlight correct words or use hints.'));
  }

  const serializedPhrases = JSON.stringify(candidate.materialPhrases);
  FORBIDDEN_CONTENT_MATCHERS.forEach(([label, matcher]) => {
    if (matcher.test(serializedPhrases)) {
      issues.push(issue('forbidden_anchor_present', `Forbidden anchor found: ${label}`, label));
    }
  });

  candidate.materialPhrases.forEach((phraseItem) => {
    if (phraseMissingAfterAnswerExplanation(phraseItem)) {
      issues.push(issue(
        'missing_after_answer_explanation',
        'Every phrase must have after-answer explanation coverage.',
        phraseItem.id,
      ));
    }
  });

  if (candidate.dayQuizIntent.questionCount !== 10 || candidate.dayQuizIntent.questionBlueprints.length !== 10) {
    issues.push(issue('wrong_quiz_question_count', 'Day quiz intent must plan exactly 10 questions.'));
  }

  if (candidate.dayQuizIntent.finalQuizWritten || candidate.dayQuizIntent.quizRegistered) {
    issues.push(issue('quiz_registered', 'Day quiz must not be written or registered in this pass.'));
  }

  if (candidate.mediaClaims.audioAssetStatus !== 'not_generated' || candidate.mediaClaims.finalAudioReady) {
    issues.push(issue('fake_audio_claim', 'Material candidate must not claim generated audio.'));
  }

  if (
    candidate.mediaClaims.pronunciationScoringStatus !== 'not_built' ||
    candidate.mediaClaims.finalPronunciationScoringReady
  ) {
    issues.push(issue('fake_pronunciation_claim', 'Material candidate must not claim pronunciation scoring.'));
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function writeGavanWeek1Day1MaterialCandidate(
  seed: GavanWeek1ContentAuthoringSeed,
  options: GavanWeek1Day1MaterialCandidateWriteOptions,
): GavanWeek1Day1MaterialCandidateWriteResult {
  if (!isGavanWeek1Day1MaterialCandidateTargetAllowed(options.targetPath)) {
    return {
      valid: false,
      issues: [
        issue('target_path_not_allowed', 'Target path must stay under .codex-tmp or docs/reports.'),
      ],
    };
  }

  const candidate = buildGavanWeek1Day1MaterialCandidate(seed, {
    generatedAt: options.generatedAt,
  });
  const validation = validateGavanWeek1Day1MaterialCandidate(candidate, seed);

  if (!validation.valid) {
    return validation;
  }

  const resolvedTarget = path.resolve(options.targetPath);
  mkdirSync(path.dirname(resolvedTarget), { recursive: true });
  const body = `${JSON.stringify(candidate, null, 2)}\n`;
  writeFileSync(resolvedTarget, body, 'utf8');

  return {
    valid: true,
    issues: [],
    targetPath: resolvedTarget,
    bytesWritten: Buffer.byteLength(body, 'utf8'),
    candidate,
  };
}
