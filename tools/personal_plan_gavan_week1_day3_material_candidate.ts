import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1ContentAuthoringSeed,
  GavanWeek1SeedExplanationCard,
  GavanWeek1SeedPhrase,
} from './personal_plan_gavan_week1_content_authoring_seed';
import type {
  GavanWeek1Day2MaterialExportPacket,
} from './personal_plan_gavan_week1_day2_material_export_packet';

export const GAVAN_WEEK1_DAY3_MATERIAL_CANDIDATE_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-day3-material-candidate.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

const REQUIRED_BLOCK_TYPES = [
  'lesson_bridge',
  'phrase_build',
  'missing_word',
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

const INVENTED_WRONG_OPTION_COPY = /ты выбрал|выбранный вариант|этого варианта/i;

export type GavanWeek1Day3MaterialExerciseType =
  | 'lesson_bridge'
  | 'phrase_build'
  | 'missing_word'
  | 'active_recall'
  | 'day_quiz_intent';

export type GavanWeek1Day3ExerciseBlock = {
  id: string;
  exerciseType: GavanWeek1Day3MaterialExerciseType;
  userFacingLabelRu: string;
  purposeRu: string;
  sourcePhraseIds: string[];
  finalExerciseBuilt: false;
};

export type GavanWeek1Day3AfterAnswerExplanation = GavanWeek1SeedExplanationCard & {
  trigger: 'after_answer';
};

export type GavanWeek1Day3MaterialPhrase = Omit<GavanWeek1SeedPhrase, 'explanationCards'> & {
  afterAnswerExplanations: GavanWeek1Day3AfterAnswerExplanation[];
};

export type GavanWeek1Day3PhraseBuildItem = {
  id: string;
  phraseId: string;
  targetEnglish: string;
  normalizedTarget: string;
  targetTokenCount: number;
  wordTiles: string[];
  distractorTiles: string[];
  targetRu: string;
};

export type GavanWeek1Day3MissingWordItem = {
  id: string;
  phraseId: string;
  targetEnglish: string;
  normalizedTarget: string;
  targetTokenCount: number;
  wordTiles: string[];
  visibleSlots: string[];
  blankIndex: number;
  answer: string;
  distractorTiles: string[];
  targetRu: string;
};

export type GavanWeek1Day3ActiveRecall = {
  recallOrder: string[];
  correctWordHighlighting: false;
  hintsEnabled: false;
  errorsReturnLater: true;
  orderChanges: true;
};

export type GavanWeek1Day3QuizBlueprint = {
  id: string;
  sourcePhraseIds: string[];
  questionType: 'meaning_choice' | 'phrase_order' | 'missing_word' | 'repair_choice';
  purposeRu: string;
  finalQuestionWritten: false;
};

export type GavanWeek1Day3MaterialCandidate = {
  kind: 'gavan_week1_day3_material_candidate';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  dayId: 'gavan-week1-day3';
  dayIndex: 3;
  status: 'day3_material_candidate_not_live';
  sourceSeedStatus: 'content_authoring_seed_not_live';
  sourceDay2ExportStatus: 'day2_material_export_not_live';
  sourceSeedDayTitle: string;
  liveIntegration: false;
  sourceWritesUsed: false;
  phaseWriteTargets: [];
  exerciseBlocks: GavanWeek1Day3ExerciseBlock[];
  materialPhrases: GavanWeek1Day3MaterialPhrase[];
  phraseBuildItems: GavanWeek1Day3PhraseBuildItem[];
  missingWordItems: GavanWeek1Day3MissingWordItem[];
  activeRecall: GavanWeek1Day3ActiveRecall;
  dayQuizIntent: {
    questionCount: 10;
    finalQuizWritten: false;
    quizRegistered: false;
    questionBlueprints: GavanWeek1Day3QuizBlueprint[];
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

export type GavanWeek1Day3MaterialCandidateOptions = {
  generatedAt: string;
};

export type GavanWeek1Day3MaterialCandidateWriteOptions =
  GavanWeek1Day3MaterialCandidateOptions & {
    targetPath: string;
  };

export type GavanWeek1Day3MaterialCandidateIssueCode =
  | 'source_seed_not_ready'
  | 'source_day2_export_not_ready'
  | 'wrong_day_id'
  | 'live_integration_enabled'
  | 'missing_required_block_type'
  | 'word_tile_count_mismatch'
  | 'unsafe_distractor_tile'
  | 'missing_word_slot_mismatch'
  | 'unsafe_missing_word_distractor'
  | 'recall_highlighting_enabled'
  | 'forbidden_anchor_present'
  | 'missing_after_answer_explanation'
  | 'invented_wrong_option_feedback'
  | 'wrong_quiz_question_count'
  | 'quiz_registered'
  | 'fake_audio_claim'
  | 'fake_pronunciation_claim'
  | 'target_path_not_allowed';

export type GavanWeek1Day3MaterialCandidateIssue = {
  code: GavanWeek1Day3MaterialCandidateIssueCode;
  detail: string;
  target?: string;
};

export type GavanWeek1Day3MaterialCandidateValidationResult = {
  valid: boolean;
  issues: GavanWeek1Day3MaterialCandidateIssue[];
};

export type GavanWeek1Day3MaterialCandidateWriteResult = {
  valid: boolean;
  issues: GavanWeek1Day3MaterialCandidateIssue[];
  targetPath?: string;
  bytesWritten?: number;
  candidate?: GavanWeek1Day3MaterialCandidate;
};

function issue(
  code: GavanWeek1Day3MaterialCandidateIssueCode,
  detail: string,
  target?: string,
): GavanWeek1Day3MaterialCandidateIssue {
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

export function isGavanWeek1Day3MaterialCandidateTargetAllowed(
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
  return value.replace(/[.?]/g, '').replace(/,/g, '').trim();
}

function tokenise(value: string): string[] {
  return normalizeTarget(value).split(/\s+/).filter(Boolean);
}

function distractorsFor(english: string): string[] {
  const normalized = normalizeTarget(english).toLowerCase();
  if (normalized === 'i need some help') {
    return ['minute', 'ready'];
  }
  if (normalized === 'i need a minute') {
    return ['help', 'today'];
  }
  if (normalized === 'i need to check') {
    return ['minute', 'here'];
  }
  if (normalized === 'could you help me with this') {
    return ['need', 'check'];
  }
  return ['help', 'minute'];
}

function blankIndexFor(wordTiles: string[]): number {
  const preferred = ['need', 'help', 'minute', 'check'];
  const index = wordTiles.findIndex((word) => preferred.includes(word.toLowerCase()));
  return index >= 0 ? index : Math.max(0, wordTiles.length - 1);
}

function materialPhrase(phraseItem: GavanWeek1SeedPhrase): GavanWeek1Day3MaterialPhrase {
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
): GavanWeek1Day3PhraseBuildItem {
  const wordTiles = tokenise(phraseItem.english);

  return {
    id: `gavan-week1-day3:phrase-build-${index}`,
    phraseId: phraseItem.id,
    targetEnglish: phraseItem.english,
    normalizedTarget: normalizeTarget(phraseItem.english),
    targetTokenCount: wordTiles.length,
    wordTiles,
    distractorTiles: distractorsFor(phraseItem.english),
    targetRu: phraseItem.meaningRu,
  };
}

function missingWordItem(
  phraseItem: GavanWeek1SeedPhrase,
  index: number,
): GavanWeek1Day3MissingWordItem {
  const wordTiles = tokenise(phraseItem.english);
  const blankIndex = blankIndexFor(wordTiles);
  const visibleSlots = [...wordTiles];
  visibleSlots[blankIndex] = '__';

  return {
    id: `gavan-week1-day3:missing-word-${index}`,
    phraseId: phraseItem.id,
    targetEnglish: phraseItem.english,
    normalizedTarget: normalizeTarget(phraseItem.english),
    targetTokenCount: wordTiles.length,
    wordTiles,
    visibleSlots,
    blankIndex,
    answer: wordTiles[blankIndex],
    distractorTiles: distractorsFor(phraseItem.english),
    targetRu: phraseItem.meaningRu,
  };
}

function exerciseBlock(
  exerciseType: GavanWeek1Day3MaterialExerciseType,
  index: number,
  userFacingLabelRu: string,
  purposeRu: string,
  sourcePhraseIds: string[],
): GavanWeek1Day3ExerciseBlock {
  return {
    id: `gavan-week1-day3:material-block-${index}`,
    exerciseType,
    userFacingLabelRu,
    purposeRu,
    sourcePhraseIds,
    finalExerciseBuilt: false,
  };
}

function quizBlueprints(sourcePhraseIds: string[]): GavanWeek1Day3QuizBlueprint[] {
  const types: GavanWeek1Day3QuizBlueprint['questionType'][] = [
    'meaning_choice',
    'missing_word',
    'phrase_order',
    'repair_choice',
    'meaning_choice',
    'missing_word',
    'phrase_order',
    'repair_choice',
    'meaning_choice',
    'missing_word',
  ];

  return types.map((questionType, index) => ({
    id: `gavan-week1-day3:quiz-blueprint-${index + 1}`,
    sourcePhraseIds,
    questionType,
    purposeRu: 'Проверить просьбы о помощи и короткой паузе без финальной регистрации квиза.',
    finalQuestionWritten: false,
  }));
}

function day3(seed: GavanWeek1ContentAuthoringSeed) {
  return seed.days.find((dayItem) => dayItem.dayId === 'gavan-week1-day3');
}

export function buildGavanWeek1Day3MaterialCandidate(
  seed: GavanWeek1ContentAuthoringSeed,
  day2Export: GavanWeek1Day2MaterialExportPacket,
  options: GavanWeek1Day3MaterialCandidateOptions,
): GavanWeek1Day3MaterialCandidate {
  const sourceDay = day3(seed);
  if (!sourceDay) {
    throw new Error('Gavan week 1 day 3 is missing from the content authoring seed.');
  }
  if (day2Export.status !== 'day2_material_export_not_live') {
    throw new Error('Gavan week 1 day 2 export must be non-live and unblocked before day 3 material.');
  }

  const sourcePhraseIds = sourceDay.phraseBank.map((phraseItem) => phraseItem.id);

  return {
    kind: 'gavan_week1_day3_material_candidate',
    generatedAt: options.generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    dayId: 'gavan-week1-day3',
    dayIndex: 3,
    status: 'day3_material_candidate_not_live',
    sourceSeedStatus: seed.status,
    sourceDay2ExportStatus: day2Export.status,
    sourceSeedDayTitle: sourceDay.userFacingTitle,
    liveIntegration: false,
    sourceWritesUsed: false,
    phaseWriteTargets: [],
    exerciseBlocks: [
      exerciseBlock('lesson_bridge', 1, 'Сказать, что нужно', 'Объяснить I need перед просьбами о помощи и паузе.', sourcePhraseIds),
      exerciseBlock('phrase_build', 2, 'Собрать просьбу', 'Собрать короткие фразы с точным количеством слов.', sourcePhraseIds),
      exerciseBlock('missing_word', 3, 'Вставить ключевое слово', 'Проверить need, help, minute и check без лишних подсказок.', sourcePhraseIds),
      exerciseBlock('active_recall', 4, 'Вспомнить без подсказок', 'Вернуть фразы в другом порядке без подсветки правильных слов.', sourcePhraseIds),
      exerciseBlock('day_quiz_intent', 5, 'Проверить день', 'Запланировать 10 вопросов без регистрации квиза.', sourcePhraseIds),
    ],
    materialPhrases: sourceDay.phraseBank.map(materialPhrase),
    phraseBuildItems: sourceDay.phraseBank.map((phraseItem, index) =>
      phraseBuildItem(phraseItem, index + 1),
    ),
    missingWordItems: sourceDay.phraseBank.map((phraseItem, index) =>
      missingWordItem(phraseItem, index + 1),
    ),
    activeRecall: {
      recallOrder: [sourcePhraseIds[2], sourcePhraseIds[0], sourcePhraseIds[3], sourcePhraseIds[1]],
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

function phraseMissingAfterAnswerExplanation(phraseItem: GavanWeek1Day3MaterialPhrase): boolean {
  if (phraseItem.afterAnswerExplanations.length === 0) {
    return true;
  }

  const covered = new Set(phraseItem.afterAnswerExplanations.flatMap((card) => card.covers));
  return [...phraseItem.newWords, ...phraseItem.firstSeenConstructions]
    .some((target) => !covered.has(target));
}

function phraseHasInventedWrongOptionCopy(phraseItem: GavanWeek1Day3MaterialPhrase): boolean {
  return phraseItem.afterAnswerExplanations.some((card) =>
    INVENTED_WRONG_OPTION_COPY.test(`${card.correctFeedbackRu} ${card.wrongFeedbackRu}`),
  );
}

function missingWordSlotMismatch(item: GavanWeek1Day3MissingWordItem): boolean {
  return (
    item.visibleSlots.length !== item.targetTokenCount ||
    item.wordTiles.length !== item.targetTokenCount ||
    item.visibleSlots.filter((slot) => slot === '__').length !== 1 ||
    item.visibleSlots[item.blankIndex] !== '__' ||
    item.answer !== item.wordTiles[item.blankIndex]
  );
}

export function validateGavanWeek1Day3MaterialCandidate(
  candidate: GavanWeek1Day3MaterialCandidate,
  seed: GavanWeek1ContentAuthoringSeed,
  day2Export: GavanWeek1Day2MaterialExportPacket,
): GavanWeek1Day3MaterialCandidateValidationResult {
  const issues: GavanWeek1Day3MaterialCandidateIssue[] = [];
  const seedDay = day3(seed);

  if (!seedDay || seed.status !== 'content_authoring_seed_not_live') {
    issues.push(issue('source_seed_not_ready', 'Source seed must be the non-live reset content seed.'));
  }

  if (day2Export.status !== 'day2_material_export_not_live') {
    issues.push(issue('source_day2_export_not_ready', 'Day 2 material export must be non-live and unblocked.'));
  }

  if (candidate.dayId !== 'gavan-week1-day3' || candidate.dayIndex !== 3) {
    issues.push(issue('wrong_day_id', 'Candidate must target Gavan week 1 day 3.'));
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

  candidate.missingWordItems.forEach((item) => {
    if (missingWordSlotMismatch(item)) {
      issues.push(issue('missing_word_slot_mismatch', 'Missing-word slots must match target token count.', item.id));
    }

    if (item.distractorTiles.includes(item.answer)) {
      issues.push(issue('unsafe_missing_word_distractor', 'Missing-word distractors must not duplicate the answer.', item.id));
    }
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
    if (phraseHasInventedWrongOptionCopy(phraseItem)) {
      issues.push(issue(
        'invented_wrong_option_feedback',
        'Feedback must explain the correct idea without naming unseen wrong choices.',
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

export function writeGavanWeek1Day3MaterialCandidate(
  seed: GavanWeek1ContentAuthoringSeed,
  day2Export: GavanWeek1Day2MaterialExportPacket,
  options: GavanWeek1Day3MaterialCandidateWriteOptions,
): GavanWeek1Day3MaterialCandidateWriteResult {
  if (!isGavanWeek1Day3MaterialCandidateTargetAllowed(options.targetPath)) {
    return {
      valid: false,
      issues: [
        issue('target_path_not_allowed', 'Target path must stay under .codex-tmp or docs/reports.'),
      ],
    };
  }

  const candidate = buildGavanWeek1Day3MaterialCandidate(seed, day2Export, {
    generatedAt: options.generatedAt,
  });
  const validation = validateGavanWeek1Day3MaterialCandidate(candidate, seed, day2Export);

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
