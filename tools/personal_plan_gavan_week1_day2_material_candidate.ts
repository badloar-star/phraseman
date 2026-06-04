import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1ContentAuthoringSeed,
  GavanWeek1SeedExplanationCard,
  GavanWeek1SeedPhrase,
} from './personal_plan_gavan_week1_content_authoring_seed';
import type {
  GavanWeek1Day1MaterialExportPacket,
} from './personal_plan_gavan_week1_day1_material_export_packet';

export const GAVAN_WEEK1_DAY2_MATERIAL_CANDIDATE_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-day2-material-candidate.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

const REQUIRED_BLOCK_TYPES = [
  'lesson_bridge',
  'listening_choice',
  'active_recall',
  'phrase_build',
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

export type GavanWeek1Day2MaterialExerciseType =
  | 'lesson_bridge'
  | 'listening_choice'
  | 'active_recall'
  | 'phrase_build'
  | 'day_quiz_intent';

export type GavanWeek1Day2ExerciseBlock = {
  id: string;
  exerciseType: GavanWeek1Day2MaterialExerciseType;
  userFacingLabelRu: string;
  purposeRu: string;
  sourcePhraseIds: string[];
  finalExerciseBuilt: false;
};

export type GavanWeek1Day2AfterAnswerExplanation = GavanWeek1SeedExplanationCard & {
  trigger: 'after_answer';
};

export type GavanWeek1Day2MaterialPhrase = Omit<GavanWeek1SeedPhrase, 'explanationCards'> & {
  afterAnswerExplanations: GavanWeek1Day2AfterAnswerExplanation[];
};

export type GavanWeek1Day2PhraseBuildItem = {
  id: string;
  phraseId: string;
  targetEnglish: string;
  normalizedTarget: string;
  targetTokenCount: number;
  wordTiles: string[];
  distractorTiles: string[];
  targetRu: string;
};

export type GavanWeek1Day2ListeningPlaceholder = {
  id: string;
  assetId: string;
  sourcePhraseId: string;
  targetEnglish: string;
  meaningRu: string;
  audioPromptRu: string;
  provider: 'openai_audio_later';
  assetStatus: 'not_generated';
  finalAudioReady: false;
};

export type GavanWeek1Day2ActiveRecall = {
  recallOrder: string[];
  correctWordHighlighting: false;
  hintsEnabled: false;
  errorsReturnLater: true;
  orderChanges: true;
};

export type GavanWeek1Day2QuizBlueprint = {
  id: string;
  sourcePhraseIds: string[];
  questionType: 'meaning_choice' | 'phrase_order' | 'listening_choice' | 'missing_word';
  purposeRu: string;
  finalQuestionWritten: false;
};

export type GavanWeek1Day2MaterialCandidate = {
  kind: 'gavan_week1_day2_material_candidate';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  dayId: 'gavan-week1-day2';
  dayIndex: 2;
  status: 'day2_material_candidate_not_live';
  sourceSeedStatus: 'content_authoring_seed_not_live';
  sourceDay1ExportStatus: 'day1_material_export_not_live';
  sourceSeedDayTitle: string;
  liveIntegration: false;
  sourceWritesUsed: false;
  phaseWriteTargets: [];
  exerciseBlocks: GavanWeek1Day2ExerciseBlock[];
  materialPhrases: GavanWeek1Day2MaterialPhrase[];
  phraseBuildItems: GavanWeek1Day2PhraseBuildItem[];
  listeningPlaceholders: GavanWeek1Day2ListeningPlaceholder[];
  activeRecall: GavanWeek1Day2ActiveRecall;
  dayQuizIntent: {
    questionCount: 10;
    finalQuizWritten: false;
    quizRegistered: false;
    questionBlueprints: GavanWeek1Day2QuizBlueprint[];
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

export type GavanWeek1Day2MaterialCandidateOptions = {
  generatedAt: string;
};

export type GavanWeek1Day2MaterialCandidateWriteOptions =
  GavanWeek1Day2MaterialCandidateOptions & {
    targetPath: string;
  };

export type GavanWeek1Day2MaterialCandidateIssueCode =
  | 'source_seed_not_ready'
  | 'source_day1_export_not_ready'
  | 'wrong_day_id'
  | 'live_integration_enabled'
  | 'missing_required_block_type'
  | 'word_tile_count_mismatch'
  | 'unsafe_distractor_tile'
  | 'fake_listening_audio_claim'
  | 'recall_highlighting_enabled'
  | 'forbidden_anchor_present'
  | 'missing_after_answer_explanation'
  | 'invented_wrong_option_feedback'
  | 'wrong_quiz_question_count'
  | 'quiz_registered'
  | 'fake_audio_claim'
  | 'fake_pronunciation_claim'
  | 'target_path_not_allowed';

export type GavanWeek1Day2MaterialCandidateIssue = {
  code: GavanWeek1Day2MaterialCandidateIssueCode;
  detail: string;
  target?: string;
};

export type GavanWeek1Day2MaterialCandidateValidationResult = {
  valid: boolean;
  issues: GavanWeek1Day2MaterialCandidateIssue[];
};

export type GavanWeek1Day2MaterialCandidateWriteResult = {
  valid: boolean;
  issues: GavanWeek1Day2MaterialCandidateIssue[];
  targetPath?: string;
  bytesWritten?: number;
  candidate?: GavanWeek1Day2MaterialCandidate;
};

function issue(
  code: GavanWeek1Day2MaterialCandidateIssueCode,
  detail: string,
  target?: string,
): GavanWeek1Day2MaterialCandidateIssue {
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

export function isGavanWeek1Day2MaterialCandidateTargetAllowed(
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
  if (normalized === 'could you say that again') {
    return ['slower', 'please'];
  }
  if (normalized === 'could you say it slower') {
    return ['again', 'please'];
  }
  if (normalized === "i didn't catch that") {
    return ['again', 'slower'];
  }
  if (normalized === 'one more time please') {
    return ['catch', 'that'];
  }
  return ['again', 'slower'];
}

function materialPhrase(phraseItem: GavanWeek1SeedPhrase): GavanWeek1Day2MaterialPhrase {
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
): GavanWeek1Day2PhraseBuildItem {
  const wordTiles = tokenise(phraseItem.english);

  return {
    id: `gavan-week1-day2:phrase-build-${index}`,
    phraseId: phraseItem.id,
    targetEnglish: phraseItem.english,
    normalizedTarget: normalizeTarget(phraseItem.english),
    targetTokenCount: wordTiles.length,
    wordTiles,
    distractorTiles: distractorsFor(phraseItem.english),
    targetRu: phraseItem.meaningRu,
  };
}

function listeningPlaceholder(
  phraseItem: GavanWeek1SeedPhrase,
  index: number,
): GavanWeek1Day2ListeningPlaceholder {
  return {
    id: `gavan-week1-day2:listening-placeholder-${index}`,
    assetId: `gavan-week1-day2:audio-placeholder-${index}`,
    sourcePhraseId: phraseItem.id,
    targetEnglish: phraseItem.english,
    meaningRu: phraseItem.meaningRu,
    audioPromptRu: 'Сгенерировать позже короткую естественную реплику без фонового шума и без учебникового дикторского тона.',
    provider: 'openai_audio_later',
    assetStatus: 'not_generated',
    finalAudioReady: false,
  };
}

function exerciseBlock(
  exerciseType: GavanWeek1Day2MaterialExerciseType,
  index: number,
  userFacingLabelRu: string,
  purposeRu: string,
  sourcePhraseIds: string[],
): GavanWeek1Day2ExerciseBlock {
  return {
    id: `gavan-week1-day2:material-block-${index}`,
    exerciseType,
    userFacingLabelRu,
    purposeRu,
    sourcePhraseIds,
    finalExerciseBuilt: false,
  };
}

function quizBlueprints(sourcePhraseIds: string[]): GavanWeek1Day2QuizBlueprint[] {
  const types: GavanWeek1Day2QuizBlueprint['questionType'][] = [
    'meaning_choice',
    'listening_choice',
    'phrase_order',
    'missing_word',
    'meaning_choice',
    'listening_choice',
    'phrase_order',
    'missing_word',
    'meaning_choice',
    'phrase_order',
  ];

  return types.map((questionType, index) => ({
    id: `gavan-week1-day2:quiz-blueprint-${index + 1}`,
    sourcePhraseIds,
    questionType,
    purposeRu: 'Проверить просьбы повторить, сказать медленнее и понять короткую реплику на слух.',
    finalQuestionWritten: false,
  }));
}

function day2(seed: GavanWeek1ContentAuthoringSeed) {
  return seed.days.find((dayItem) => dayItem.dayId === 'gavan-week1-day2');
}

export function buildGavanWeek1Day2MaterialCandidate(
  seed: GavanWeek1ContentAuthoringSeed,
  day1Export: GavanWeek1Day1MaterialExportPacket,
  options: GavanWeek1Day2MaterialCandidateOptions,
): GavanWeek1Day2MaterialCandidate {
  const sourceDay = day2(seed);
  if (!sourceDay) {
    throw new Error('Gavan week 1 day 2 is missing from the content authoring seed.');
  }
  if (day1Export.status !== 'day1_material_export_not_live') {
    throw new Error('Gavan week 1 day 1 export must be non-live and unblocked before day 2 material.');
  }

  const sourcePhraseIds = sourceDay.phraseBank.map((phraseItem) => phraseItem.id);

  return {
    kind: 'gavan_week1_day2_material_candidate',
    generatedAt: options.generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    dayId: 'gavan-week1-day2',
    dayIndex: 2,
    status: 'day2_material_candidate_not_live',
    sourceSeedStatus: seed.status,
    sourceDay1ExportStatus: day1Export.status,
    sourceSeedDayTitle: sourceDay.userFacingTitle,
    liveIntegration: false,
    sourceWritesUsed: false,
    phaseWriteTargets: [],
    exerciseBlocks: [
      exerciseBlock('lesson_bridge', 1, 'Мягко переспросить', 'Разобрать Could you перед практикой переспроса.', sourcePhraseIds),
      exerciseBlock('listening_choice', 2, 'Узнать на слух', 'Отличить просьбу повторить от просьбы сказать медленнее.', sourcePhraseIds),
      exerciseBlock('active_recall', 3, 'Вспомнить самому', 'Вернуть фразы в другом порядке без подсказок.', sourcePhraseIds),
      exerciseBlock('phrase_build', 4, 'Собрать просьбу', 'Собрать короткую просьбу из точного количества слов.', sourcePhraseIds),
      exerciseBlock('day_quiz_intent', 5, 'Проверить себя', 'Ответить на 10 коротких вопросов по фразам дня.', sourcePhraseIds),
    ],
    materialPhrases: sourceDay.phraseBank.map(materialPhrase),
    phraseBuildItems: sourceDay.phraseBank.map((phraseItem, index) =>
      phraseBuildItem(phraseItem, index + 1),
    ),
    listeningPlaceholders: sourceDay.phraseBank.map((phraseItem, index) =>
      listeningPlaceholder(phraseItem, index + 1),
    ),
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

function phraseMissingAfterAnswerExplanation(phraseItem: GavanWeek1Day2MaterialPhrase): boolean {
  if (phraseItem.afterAnswerExplanations.length === 0) {
    return true;
  }

  const covered = new Set(phraseItem.afterAnswerExplanations.flatMap((card) => card.covers));
  return [...phraseItem.newWords, ...phraseItem.firstSeenConstructions]
    .some((target) => !covered.has(target));
}

function phraseHasInventedWrongOptionCopy(phraseItem: GavanWeek1Day2MaterialPhrase): boolean {
  return phraseItem.afterAnswerExplanations.some((card) =>
    INVENTED_WRONG_OPTION_COPY.test(`${card.correctFeedbackRu} ${card.wrongFeedbackRu}`),
  );
}

export function validateGavanWeek1Day2MaterialCandidate(
  candidate: GavanWeek1Day2MaterialCandidate,
  seed: GavanWeek1ContentAuthoringSeed,
  day1Export: GavanWeek1Day1MaterialExportPacket,
): GavanWeek1Day2MaterialCandidateValidationResult {
  const issues: GavanWeek1Day2MaterialCandidateIssue[] = [];
  const seedDay = day2(seed);

  if (!seedDay || seed.status !== 'content_authoring_seed_not_live') {
    issues.push(issue('source_seed_not_ready', 'Source seed must be the non-live reset content seed.'));
  }

  if (day1Export.status !== 'day1_material_export_not_live') {
    issues.push(issue('source_day1_export_not_ready', 'Day 1 material export must be non-live and unblocked.'));
  }

  if (candidate.dayId !== 'gavan-week1-day2' || candidate.dayIndex !== 2) {
    issues.push(issue('wrong_day_id', 'Candidate must target Gavan week 1 day 2.'));
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

  candidate.listeningPlaceholders.forEach((placeholder) => {
    if (placeholder.assetStatus !== 'not_generated' || placeholder.finalAudioReady) {
      issues.push(issue('fake_listening_audio_claim', 'Listening placeholder must not claim generated audio.', placeholder.id));
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

export function writeGavanWeek1Day2MaterialCandidate(
  seed: GavanWeek1ContentAuthoringSeed,
  day1Export: GavanWeek1Day1MaterialExportPacket,
  options: GavanWeek1Day2MaterialCandidateWriteOptions,
): GavanWeek1Day2MaterialCandidateWriteResult {
  if (!isGavanWeek1Day2MaterialCandidateTargetAllowed(options.targetPath)) {
    return {
      valid: false,
      issues: [
        issue('target_path_not_allowed', 'Target path must stay under .codex-tmp or docs/reports.'),
      ],
    };
  }

  const candidate = buildGavanWeek1Day2MaterialCandidate(seed, day1Export, {
    generatedAt: options.generatedAt,
  });
  const validation = validateGavanWeek1Day2MaterialCandidate(candidate, seed, day1Export);

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
