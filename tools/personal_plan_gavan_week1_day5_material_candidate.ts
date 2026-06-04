import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1ContentAuthoringSeed,
  GavanWeek1SeedExplanationCard,
  GavanWeek1SeedPhrase,
} from './personal_plan_gavan_week1_content_authoring_seed';
import type {
  GavanWeek1Day4MaterialExportPacket,
} from './personal_plan_gavan_week1_day4_material_export_packet';

export const GAVAN_WEEK1_DAY5_MATERIAL_CANDIDATE_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-day5-material-candidate.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

const REQUIRED_BLOCK_TYPES = [
  'lesson_bridge',
  'phrase_build',
  'listening_choice',
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

const INVENTED_WRONG_OPTION_COPY = /ты выбрал|выбранный вариант|этого варианта/i;

export type GavanWeek1Day5MaterialExerciseType =
  | 'lesson_bridge'
  | 'phrase_build'
  | 'listening_choice'
  | 'natural_choice'
  | 'active_recall'
  | 'day_quiz_intent';

export type GavanWeek1Day5ExerciseBlock = {
  id: string;
  exerciseType: GavanWeek1Day5MaterialExerciseType;
  userFacingLabelRu: string;
  purposeRu: string;
  sourcePhraseIds: string[];
  finalExerciseBuilt: false;
};

export type GavanWeek1Day5AfterAnswerExplanation = GavanWeek1SeedExplanationCard & {
  trigger: 'after_answer';
};

export type GavanWeek1Day5MaterialPhrase = Omit<GavanWeek1SeedPhrase, 'explanationCards'> & {
  afterAnswerExplanations: GavanWeek1Day5AfterAnswerExplanation[];
};

export type GavanWeek1Day5PhraseBuildItem = {
  id: string;
  phraseId: string;
  targetEnglish: string;
  normalizedTarget: string;
  targetTokenCount: number;
  wordTiles: string[];
  distractorTiles: string[];
  targetRu: string;
};

export type GavanWeek1Day5ListeningPlaceholder = {
  id: string;
  phraseId: string;
  targetEnglish: string;
  assetStatus: 'not_generated';
  provider: 'openai_audio_not_requested';
  finalAudioReady: false;
};

export type GavanWeek1Day5NaturalChoiceItem = {
  id: string;
  phraseId: string;
  promptRu: string;
  correctEnglish: string;
  options: string[];
};

export type GavanWeek1Day5ActiveRecall = {
  recallOrder: string[];
  correctWordHighlighting: false;
  hintsEnabled: false;
  errorsReturnLater: true;
  orderChanges: true;
};

export type GavanWeek1Day5QuizBlueprint = {
  id: string;
  sourcePhraseIds: string[];
  questionType: 'meaning_choice' | 'phrase_order' | 'listening_placeholder' | 'natural_choice' | 'repair_choice';
  purposeRu: string;
  finalQuestionWritten: false;
};

export type GavanWeek1Day5MaterialCandidate = {
  kind: 'gavan_week1_day5_material_candidate';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  dayId: 'gavan-week1-day5';
  dayIndex: 5;
  status: 'day5_material_candidate_not_live';
  sourceSeedStatus: 'content_authoring_seed_not_live';
  sourceDay4ExportStatus: 'day4_material_export_not_live';
  sourceSeedDayTitle: string;
  liveIntegration: false;
  sourceWritesUsed: false;
  phaseWriteTargets: [];
  exerciseBlocks: GavanWeek1Day5ExerciseBlock[];
  materialPhrases: GavanWeek1Day5MaterialPhrase[];
  phraseBuildItems: GavanWeek1Day5PhraseBuildItem[];
  listeningPlaceholders: GavanWeek1Day5ListeningPlaceholder[];
  naturalChoiceItems: GavanWeek1Day5NaturalChoiceItem[];
  activeRecall: GavanWeek1Day5ActiveRecall;
  dayQuizIntent: {
    questionCount: 10;
    finalQuizWritten: false;
    quizRegistered: false;
    questionBlueprints: GavanWeek1Day5QuizBlueprint[];
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

export type GavanWeek1Day5MaterialCandidateOptions = {
  generatedAt: string;
};

export type GavanWeek1Day5MaterialCandidateWriteOptions =
  GavanWeek1Day5MaterialCandidateOptions & {
    targetPath: string;
  };

export type GavanWeek1Day5MaterialCandidateIssueCode =
  | 'source_seed_not_ready'
  | 'source_day4_export_not_ready'
  | 'wrong_day_id'
  | 'live_integration_enabled'
  | 'missing_required_block_type'
  | 'word_tile_count_mismatch'
  | 'unsafe_distractor_tile'
  | 'choice_option_count_mismatch'
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

export type GavanWeek1Day5MaterialCandidateIssue = {
  code: GavanWeek1Day5MaterialCandidateIssueCode;
  detail: string;
  target?: string;
};

export type GavanWeek1Day5MaterialCandidateValidationResult = {
  valid: boolean;
  issues: GavanWeek1Day5MaterialCandidateIssue[];
};

export type GavanWeek1Day5MaterialCandidateWriteResult = {
  valid: boolean;
  issues: GavanWeek1Day5MaterialCandidateIssue[];
  targetPath?: string;
  bytesWritten?: number;
  candidate?: GavanWeek1Day5MaterialCandidate;
};

function issue(
  code: GavanWeek1Day5MaterialCandidateIssueCode,
  detail: string,
  target?: string,
): GavanWeek1Day5MaterialCandidateIssue {
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

export function isGavanWeek1Day5MaterialCandidateTargetAllowed(
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
  if (normalized === 'could you explain it simply') {
    return ['show', 'down'];
  }
  if (normalized === 'could you show me') {
    return ['simply', 'write'];
  }
  if (normalized === 'can you write it down') {
    return ['explain', 'show'];
  }
  if (normalized === 'please use simple words') {
    return ['could', 'down'];
  }
  return ['simple', 'show'];
}

function materialPhrase(phraseItem: GavanWeek1SeedPhrase): GavanWeek1Day5MaterialPhrase {
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
): GavanWeek1Day5PhraseBuildItem {
  const wordTiles = tokenise(phraseItem.english);

  return {
    id: `gavan-week1-day5:phrase-build-${index}`,
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
): GavanWeek1Day5ListeningPlaceholder {
  return {
    id: `gavan-week1-day5:listening-placeholder-${index}`,
    phraseId: phraseItem.id,
    targetEnglish: phraseItem.english,
    assetStatus: 'not_generated',
    provider: 'openai_audio_not_requested',
    finalAudioReady: false,
  };
}

function naturalChoiceItem(
  phraseItem: GavanWeek1SeedPhrase,
  index: number,
): GavanWeek1Day5NaturalChoiceItem {
  const optionsByTarget: Record<string, string[]> = {
    'Could you explain it simply?': ['Could you explain it simply?', 'Could you simply it explain?', 'Can you explain it loudly?', 'Please explain it hard.'],
    'Could you show me?': ['Could you show me?', 'Could you me show?', 'Can you write it down?', 'Please use simple words.'],
    'Can you write it down?': ['Can you write it down?', 'Can you down it write?', 'Could you show me?', 'Can you write it up?'],
    'Please use simple words.': ['Please use simple words.', 'Please use words simple.', 'Could you say it slower?', 'Please make words difficult.'],
  };

  return {
    id: `gavan-week1-day5:natural-choice-${index}`,
    phraseId: phraseItem.id,
    promptRu: phraseItem.meaningRu,
    correctEnglish: phraseItem.english,
    options: optionsByTarget[phraseItem.english] ?? [phraseItem.english],
  };
}

function exerciseBlock(
  exerciseType: GavanWeek1Day5MaterialExerciseType,
  index: number,
  userFacingLabelRu: string,
  purposeRu: string,
  sourcePhraseIds: string[],
): GavanWeek1Day5ExerciseBlock {
  return {
    id: `gavan-week1-day5:material-block-${index}`,
    exerciseType,
    userFacingLabelRu,
    purposeRu,
    sourcePhraseIds,
    finalExerciseBuilt: false,
  };
}

function quizBlueprints(sourcePhraseIds: string[]): GavanWeek1Day5QuizBlueprint[] {
  const types: GavanWeek1Day5QuizBlueprint['questionType'][] = [
    'meaning_choice',
    'phrase_order',
    'listening_placeholder',
    'natural_choice',
    'repair_choice',
    'meaning_choice',
    'phrase_order',
    'listening_placeholder',
    'natural_choice',
    'repair_choice',
  ];

  return types.map((questionType, index) => ({
    id: `gavan-week1-day5:quiz-blueprint-${index + 1}`,
    sourcePhraseIds,
    questionType,
    purposeRu: 'Проверить просьбы объяснить проще, показать или записать без финальной регистрации квиза.',
    finalQuestionWritten: false,
  }));
}

function day5(seed: GavanWeek1ContentAuthoringSeed) {
  return seed.days.find((dayItem) => dayItem.dayId === 'gavan-week1-day5');
}

export function buildGavanWeek1Day5MaterialCandidate(
  seed: GavanWeek1ContentAuthoringSeed,
  day4Export: GavanWeek1Day4MaterialExportPacket,
  options: GavanWeek1Day5MaterialCandidateOptions,
): GavanWeek1Day5MaterialCandidate {
  const sourceDay = day5(seed);
  if (!sourceDay) {
    throw new Error('Gavan week 1 day 5 is missing from the content authoring seed.');
  }
  if (day4Export.status !== 'day4_material_export_not_live') {
    throw new Error('Gavan week 1 day 4 export must be non-live and unblocked before day 5 material.');
  }

  const sourcePhraseIds = sourceDay.phraseBank.map((phraseItem) => phraseItem.id);

  return {
    kind: 'gavan_week1_day5_material_candidate',
    generatedAt: options.generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    dayId: 'gavan-week1-day5',
    dayIndex: 5,
    status: 'day5_material_candidate_not_live',
    sourceSeedStatus: seed.status,
    sourceDay4ExportStatus: day4Export.status,
    sourceSeedDayTitle: sourceDay.userFacingTitle,
    liveIntegration: false,
    sourceWritesUsed: false,
    phaseWriteTargets: [],
    exerciseBlocks: [
      exerciseBlock('lesson_bridge', 1, 'Просьба о формате', 'Объяснить explain, show, write down и simple words перед практикой.', sourcePhraseIds),
      exerciseBlock('phrase_build', 2, 'Собрать просьбу', 'Собрать просьбу объяснить проще, показать или записать.', sourcePhraseIds),
      exerciseBlock('listening_choice', 3, 'Услышать просьбу', 'Подготовить честные listening placeholders без сгенерированного аудио.', sourcePhraseIds),
      exerciseBlock('natural_choice', 4, 'Выбрать естественно', 'Отличить нормальную просьбу о формате от странного порядка слов.', sourcePhraseIds),
      exerciseBlock('active_recall', 5, 'Вспомнить без подсказок', 'Вернуть просьбы в другом порядке без подсветки правильных слов.', sourcePhraseIds),
      exerciseBlock('day_quiz_intent', 6, 'Проверить день', 'Запланировать 10 вопросов без регистрации квиза.', sourcePhraseIds),
    ],
    materialPhrases: sourceDay.phraseBank.map(materialPhrase),
    phraseBuildItems: sourceDay.phraseBank.map((phraseItem, index) =>
      phraseBuildItem(phraseItem, index + 1),
    ),
    listeningPlaceholders: sourceDay.phraseBank.map((phraseItem, index) =>
      listeningPlaceholder(phraseItem, index + 1),
    ),
    naturalChoiceItems: sourceDay.phraseBank.map((phraseItem, index) =>
      naturalChoiceItem(phraseItem, index + 1),
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

function phraseMissingAfterAnswerExplanation(phraseItem: GavanWeek1Day5MaterialPhrase): boolean {
  if (phraseItem.afterAnswerExplanations.length === 0) {
    return true;
  }

  const covered = new Set(phraseItem.afterAnswerExplanations.flatMap((card) => card.covers));
  return [...phraseItem.newWords, ...phraseItem.firstSeenConstructions]
    .some((target) => !covered.has(target));
}

function phraseHasInventedWrongOptionCopy(phraseItem: GavanWeek1Day5MaterialPhrase): boolean {
  return phraseItem.afterAnswerExplanations.some((card) =>
    INVENTED_WRONG_OPTION_COPY.test(`${card.correctFeedbackRu} ${card.wrongFeedbackRu}`),
  );
}

function choiceOptionsInvalid(item: GavanWeek1Day5NaturalChoiceItem): boolean {
  return (
    item.options.length !== 4 ||
    new Set(item.options).size !== item.options.length ||
    !item.options.includes(item.correctEnglish)
  );
}

export function validateGavanWeek1Day5MaterialCandidate(
  candidate: GavanWeek1Day5MaterialCandidate,
  seed: GavanWeek1ContentAuthoringSeed,
  day4Export: GavanWeek1Day4MaterialExportPacket,
): GavanWeek1Day5MaterialCandidateValidationResult {
  const issues: GavanWeek1Day5MaterialCandidateIssue[] = [];
  const seedDay = day5(seed);

  if (!seedDay || seed.status !== 'content_authoring_seed_not_live') {
    issues.push(issue('source_seed_not_ready', 'Source seed must be the non-live reset content seed.'));
  }

  if (day4Export.status !== 'day4_material_export_not_live') {
    issues.push(issue('source_day4_export_not_ready', 'Day 4 material export must be non-live and unblocked.'));
  }

  if (candidate.dayId !== 'gavan-week1-day5' || candidate.dayIndex !== 5) {
    issues.push(issue('wrong_day_id', 'Candidate must target Gavan week 1 day 5.'));
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

  candidate.naturalChoiceItems.forEach((item) => {
    if (choiceOptionsInvalid(item)) {
      issues.push(issue('choice_option_count_mismatch', 'Natural choice items must include the correct answer and exactly 4 unique options.', item.id));
    }
  });

  candidate.listeningPlaceholders.forEach((item) => {
    if (item.assetStatus !== 'not_generated' || item.finalAudioReady) {
      issues.push(issue('fake_listening_audio_claim', 'Listening placeholders must not claim generated audio.', item.id));
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

export function writeGavanWeek1Day5MaterialCandidate(
  seed: GavanWeek1ContentAuthoringSeed,
  day4Export: GavanWeek1Day4MaterialExportPacket,
  options: GavanWeek1Day5MaterialCandidateWriteOptions,
): GavanWeek1Day5MaterialCandidateWriteResult {
  if (!isGavanWeek1Day5MaterialCandidateTargetAllowed(options.targetPath)) {
    return {
      valid: false,
      issues: [
        issue('target_path_not_allowed', 'Target path must stay under .codex-tmp or docs/reports.'),
      ],
    };
  }

  const candidate = buildGavanWeek1Day5MaterialCandidate(seed, day4Export, {
    generatedAt: options.generatedAt,
  });
  const validation = validateGavanWeek1Day5MaterialCandidate(candidate, seed, day4Export);

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
