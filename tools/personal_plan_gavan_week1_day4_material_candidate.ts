import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1ContentAuthoringSeed,
  GavanWeek1SeedExplanationCard,
  GavanWeek1SeedPhrase,
} from './personal_plan_gavan_week1_content_authoring_seed';
import type {
  GavanWeek1Day3MaterialExportPacket,
} from './personal_plan_gavan_week1_day3_material_export_packet';

export const GAVAN_WEEK1_DAY4_MATERIAL_CANDIDATE_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-day4-material-candidate.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

const REQUIRED_BLOCK_TYPES = [
  'lesson_bridge',
  'natural_choice',
  'mistake_repair',
  'quick_reply',
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

export type GavanWeek1Day4MaterialExerciseType =
  | 'lesson_bridge'
  | 'natural_choice'
  | 'mistake_repair'
  | 'quick_reply'
  | 'active_recall'
  | 'day_quiz_intent';

export type GavanWeek1Day4ExerciseBlock = {
  id: string;
  exerciseType: GavanWeek1Day4MaterialExerciseType;
  userFacingLabelRu: string;
  purposeRu: string;
  sourcePhraseIds: string[];
  finalExerciseBuilt: false;
};

export type GavanWeek1Day4AfterAnswerExplanation = GavanWeek1SeedExplanationCard & {
  trigger: 'after_answer';
};

export type GavanWeek1Day4MaterialPhrase = Omit<GavanWeek1SeedPhrase, 'explanationCards'> & {
  afterAnswerExplanations: GavanWeek1Day4AfterAnswerExplanation[];
};

export type GavanWeek1Day4NaturalChoiceItem = {
  id: string;
  phraseId: string;
  promptRu: string;
  correctEnglish: string;
  options: string[];
};

export type GavanWeek1Day4RepairItem = {
  id: string;
  phraseId: string;
  targetEnglish: string;
  normalizedTarget: string;
  targetTokenCount: number;
  wordTiles: string[];
  scrambledTiles: string[];
  distractorTiles: string[];
  targetRu: string;
};

export type GavanWeek1Day4QuickReplyItem = {
  id: string;
  phraseId: string;
  situationRu: string;
  correctEnglish: string;
  options: string[];
};

export type GavanWeek1Day4ActiveRecall = {
  recallOrder: string[];
  correctWordHighlighting: false;
  hintsEnabled: false;
  errorsReturnLater: true;
  orderChanges: true;
};

export type GavanWeek1Day4QuizBlueprint = {
  id: string;
  sourcePhraseIds: string[];
  questionType: 'meaning_choice' | 'question_order' | 'natural_choice' | 'repair_choice' | 'quick_reply';
  purposeRu: string;
  finalQuestionWritten: false;
};

export type GavanWeek1Day4MaterialCandidate = {
  kind: 'gavan_week1_day4_material_candidate';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  dayId: 'gavan-week1-day4';
  dayIndex: 4;
  status: 'day4_material_candidate_not_live';
  sourceSeedStatus: 'content_authoring_seed_not_live';
  sourceDay3ExportStatus: 'day3_material_export_not_live';
  sourceSeedDayTitle: string;
  liveIntegration: false;
  sourceWritesUsed: false;
  phaseWriteTargets: [];
  exerciseBlocks: GavanWeek1Day4ExerciseBlock[];
  materialPhrases: GavanWeek1Day4MaterialPhrase[];
  naturalChoiceItems: GavanWeek1Day4NaturalChoiceItem[];
  repairItems: GavanWeek1Day4RepairItem[];
  quickReplyItems: GavanWeek1Day4QuickReplyItem[];
  activeRecall: GavanWeek1Day4ActiveRecall;
  dayQuizIntent: {
    questionCount: 10;
    finalQuizWritten: false;
    quizRegistered: false;
    questionBlueprints: GavanWeek1Day4QuizBlueprint[];
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

export type GavanWeek1Day4MaterialCandidateOptions = {
  generatedAt: string;
};

export type GavanWeek1Day4MaterialCandidateWriteOptions =
  GavanWeek1Day4MaterialCandidateOptions & {
    targetPath: string;
  };

export type GavanWeek1Day4MaterialCandidateIssueCode =
  | 'source_seed_not_ready'
  | 'source_day3_export_not_ready'
  | 'wrong_day_id'
  | 'live_integration_enabled'
  | 'missing_required_block_type'
  | 'choice_option_count_mismatch'
  | 'repair_tile_count_mismatch'
  | 'unsafe_distractor_tile'
  | 'recall_highlighting_enabled'
  | 'forbidden_anchor_present'
  | 'missing_after_answer_explanation'
  | 'invented_wrong_option_feedback'
  | 'wrong_quiz_question_count'
  | 'quiz_registered'
  | 'fake_audio_claim'
  | 'fake_pronunciation_claim'
  | 'target_path_not_allowed';

export type GavanWeek1Day4MaterialCandidateIssue = {
  code: GavanWeek1Day4MaterialCandidateIssueCode;
  detail: string;
  target?: string;
};

export type GavanWeek1Day4MaterialCandidateValidationResult = {
  valid: boolean;
  issues: GavanWeek1Day4MaterialCandidateIssue[];
};

export type GavanWeek1Day4MaterialCandidateWriteResult = {
  valid: boolean;
  issues: GavanWeek1Day4MaterialCandidateIssue[];
  targetPath?: string;
  bytesWritten?: number;
  candidate?: GavanWeek1Day4MaterialCandidate;
};

function issue(
  code: GavanWeek1Day4MaterialCandidateIssueCode,
  detail: string,
  target?: string,
): GavanWeek1Day4MaterialCandidateIssue {
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

export function isGavanWeek1Day4MaterialCandidateTargetAllowed(
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
  if (normalized === 'is this right') {
    return ['okay', 'need'];
  }
  if (normalized === 'is it here') {
    return ['that', 'else'];
  }
  if (normalized === 'is that okay') {
    return ['this', 'right'];
  }
  if (normalized === 'do i need anything else') {
    return ['here', 'okay'];
  }
  return ['right', 'here'];
}

function materialPhrase(phraseItem: GavanWeek1SeedPhrase): GavanWeek1Day4MaterialPhrase {
  return {
    ...phraseItem,
    afterAnswerExplanations: phraseItem.explanationCards.map((card) => ({
      ...card,
      trigger: 'after_answer',
    })),
  };
}

function repairItem(
  phraseItem: GavanWeek1SeedPhrase,
  index: number,
): GavanWeek1Day4RepairItem {
  const wordTiles = tokenise(phraseItem.english);

  return {
    id: `gavan-week1-day4:repair-${index}`,
    phraseId: phraseItem.id,
    targetEnglish: phraseItem.english,
    normalizedTarget: normalizeTarget(phraseItem.english),
    targetTokenCount: wordTiles.length,
    wordTiles,
    scrambledTiles: [...wordTiles].reverse(),
    distractorTiles: distractorsFor(phraseItem.english),
    targetRu: phraseItem.meaningRu,
  };
}

function naturalChoiceItem(
  phraseItem: GavanWeek1SeedPhrase,
  index: number,
): GavanWeek1Day4NaturalChoiceItem {
  const optionsByTarget: Record<string, string[]> = {
    'Is this right?': ['Is this right?', 'This is right?', 'Are this right?', 'Is right this?'],
    'Is it here?': ['Is it here?', 'It is here?', 'Are it here?', 'Is here it?'],
    'Is that okay?': ['Is that okay?', 'That is okay?', 'Are that okay?', 'Is okay that?'],
    'Do I need anything else?': ['Do I need anything else?', 'I need anything else?', 'Do need I anything else?', 'Do I anything need else?'],
  };

  return {
    id: `gavan-week1-day4:natural-choice-${index}`,
    phraseId: phraseItem.id,
    promptRu: phraseItem.meaningRu,
    correctEnglish: phraseItem.english,
    options: optionsByTarget[phraseItem.english] ?? [phraseItem.english],
  };
}

function quickReplyItem(
  phraseItem: GavanWeek1SeedPhrase,
  index: number,
): GavanWeek1Day4QuickReplyItem {
  const optionsByTarget: Record<string, string[]> = {
    'Is this right?': ['Is this right?', 'I need some help.', 'One more time, please.'],
    'Is it here?': ['Is it here?', 'I am ready.', 'Could you say it slower?'],
    'Is that okay?': ['Is that okay?', "I'm not sure.", 'I need to check.'],
    'Do I need anything else?': ['Do I need anything else?', 'Is this right?', 'I am here.'],
  };

  return {
    id: `gavan-week1-day4:quick-reply-${index}`,
    phraseId: phraseItem.id,
    situationRu: phraseItem.meaningRu,
    correctEnglish: phraseItem.english,
    options: optionsByTarget[phraseItem.english] ?? [phraseItem.english],
  };
}

function exerciseBlock(
  exerciseType: GavanWeek1Day4MaterialExerciseType,
  index: number,
  userFacingLabelRu: string,
  purposeRu: string,
  sourcePhraseIds: string[],
): GavanWeek1Day4ExerciseBlock {
  return {
    id: `gavan-week1-day4:material-block-${index}`,
    exerciseType,
    userFacingLabelRu,
    purposeRu,
    sourcePhraseIds,
    finalExerciseBuilt: false,
  };
}

function quizBlueprints(sourcePhraseIds: string[]): GavanWeek1Day4QuizBlueprint[] {
  const types: GavanWeek1Day4QuizBlueprint['questionType'][] = [
    'meaning_choice',
    'question_order',
    'natural_choice',
    'repair_choice',
    'quick_reply',
    'meaning_choice',
    'question_order',
    'natural_choice',
    'repair_choice',
    'quick_reply',
  ];

  return types.map((questionType, index) => ({
    id: `gavan-week1-day4:quiz-blueprint-${index + 1}`,
    sourcePhraseIds,
    questionType,
    purposeRu: 'Проверить короткие вопросы this, it, that и anything else без финальной регистрации квиза.',
    finalQuestionWritten: false,
  }));
}

function day4(seed: GavanWeek1ContentAuthoringSeed) {
  return seed.days.find((dayItem) => dayItem.dayId === 'gavan-week1-day4');
}

export function buildGavanWeek1Day4MaterialCandidate(
  seed: GavanWeek1ContentAuthoringSeed,
  day3Export: GavanWeek1Day3MaterialExportPacket,
  options: GavanWeek1Day4MaterialCandidateOptions,
): GavanWeek1Day4MaterialCandidate {
  const sourceDay = day4(seed);
  if (!sourceDay) {
    throw new Error('Gavan week 1 day 4 is missing from the content authoring seed.');
  }
  if (day3Export.status !== 'day3_material_export_not_live') {
    throw new Error('Gavan week 1 day 3 export must be non-live and unblocked before day 4 material.');
  }

  const sourcePhraseIds = sourceDay.phraseBank.map((phraseItem) => phraseItem.id);

  return {
    kind: 'gavan_week1_day4_material_candidate',
    generatedAt: options.generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    dayId: 'gavan-week1-day4',
    dayIndex: 4,
    status: 'day4_material_candidate_not_live',
    sourceSeedStatus: seed.status,
    sourceDay3ExportStatus: day3Export.status,
    sourceSeedDayTitle: sourceDay.userFacingTitle,
    liveIntegration: false,
    sourceWritesUsed: false,
    phaseWriteTargets: [],
    exerciseBlocks: [
      exerciseBlock('lesson_bridge', 1, 'Короткий вопрос', 'Объяснить порядок слов в Is this, Is it и Do I need перед практикой.', sourcePhraseIds),
      exerciseBlock('natural_choice', 2, 'Выбрать естественный вопрос', 'Отличить нормальный короткий вопрос от странного порядка слов.', sourcePhraseIds),
      exerciseBlock('mistake_repair', 3, 'Починить порядок слов', 'Собрать вопрос в правильном порядке без новых тяжёлых правил.', sourcePhraseIds),
      exerciseBlock('quick_reply', 4, 'Ответить коротко', 'Быстро выбрать вопрос для проверки места, варианта или следующего шага.', sourcePhraseIds),
      exerciseBlock('active_recall', 5, 'Вспомнить без подсказок', 'Вернуть вопросы в другом порядке без подсветки правильных слов.', sourcePhraseIds),
      exerciseBlock('day_quiz_intent', 6, 'Проверить день', 'Запланировать 10 вопросов без регистрации квиза.', sourcePhraseIds),
    ],
    materialPhrases: sourceDay.phraseBank.map(materialPhrase),
    naturalChoiceItems: sourceDay.phraseBank.map((phraseItem, index) =>
      naturalChoiceItem(phraseItem, index + 1),
    ),
    repairItems: sourceDay.phraseBank.map((phraseItem, index) =>
      repairItem(phraseItem, index + 1),
    ),
    quickReplyItems: sourceDay.phraseBank.map((phraseItem, index) =>
      quickReplyItem(phraseItem, index + 1),
    ),
    activeRecall: {
      recallOrder: [sourcePhraseIds[1], sourcePhraseIds[3], sourcePhraseIds[0], sourcePhraseIds[2]],
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

function phraseMissingAfterAnswerExplanation(phraseItem: GavanWeek1Day4MaterialPhrase): boolean {
  if (phraseItem.afterAnswerExplanations.length === 0) {
    return true;
  }

  const covered = new Set(phraseItem.afterAnswerExplanations.flatMap((card) => card.covers));
  return [...phraseItem.newWords, ...phraseItem.firstSeenConstructions]
    .some((target) => !covered.has(target));
}

function phraseHasInventedWrongOptionCopy(phraseItem: GavanWeek1Day4MaterialPhrase): boolean {
  return phraseItem.afterAnswerExplanations.some((card) =>
    INVENTED_WRONG_OPTION_COPY.test(`${card.correctFeedbackRu} ${card.wrongFeedbackRu}`),
  );
}

function choiceOptionsInvalid(item: GavanWeek1Day4NaturalChoiceItem | GavanWeek1Day4QuickReplyItem): boolean {
  const expectedCount = item.id.includes(':quick-reply-') ? 3 : 4;
  return (
    item.options.length !== expectedCount ||
    new Set(item.options).size !== item.options.length ||
    !item.options.includes(item.correctEnglish)
  );
}

function repairTileMismatch(item: GavanWeek1Day4RepairItem): boolean {
  return (
    item.wordTiles.length !== item.targetTokenCount ||
    item.scrambledTiles.length !== item.targetTokenCount ||
    item.wordTiles.join(' ') !== item.normalizedTarget
  );
}

export function validateGavanWeek1Day4MaterialCandidate(
  candidate: GavanWeek1Day4MaterialCandidate,
  seed: GavanWeek1ContentAuthoringSeed,
  day3Export: GavanWeek1Day3MaterialExportPacket,
): GavanWeek1Day4MaterialCandidateValidationResult {
  const issues: GavanWeek1Day4MaterialCandidateIssue[] = [];
  const seedDay = day4(seed);

  if (!seedDay || seed.status !== 'content_authoring_seed_not_live') {
    issues.push(issue('source_seed_not_ready', 'Source seed must be the non-live reset content seed.'));
  }

  if (day3Export.status !== 'day3_material_export_not_live') {
    issues.push(issue('source_day3_export_not_ready', 'Day 3 material export must be non-live and unblocked.'));
  }

  if (candidate.dayId !== 'gavan-week1-day4' || candidate.dayIndex !== 4) {
    issues.push(issue('wrong_day_id', 'Candidate must target Gavan week 1 day 4.'));
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

  [...candidate.naturalChoiceItems, ...candidate.quickReplyItems].forEach((item) => {
    if (choiceOptionsInvalid(item)) {
      issues.push(issue('choice_option_count_mismatch', 'Choice items must include the correct answer and exact unique option counts.', item.id));
    }
  });

  candidate.repairItems.forEach((item) => {
    if (repairTileMismatch(item)) {
      issues.push(issue('repair_tile_count_mismatch', 'Repair item tiles must match target token count.', item.id));
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

export function writeGavanWeek1Day4MaterialCandidate(
  seed: GavanWeek1ContentAuthoringSeed,
  day3Export: GavanWeek1Day3MaterialExportPacket,
  options: GavanWeek1Day4MaterialCandidateWriteOptions,
): GavanWeek1Day4MaterialCandidateWriteResult {
  if (!isGavanWeek1Day4MaterialCandidateTargetAllowed(options.targetPath)) {
    return {
      valid: false,
      issues: [
        issue('target_path_not_allowed', 'Target path must stay under .codex-tmp or docs/reports.'),
      ],
    };
  }

  const candidate = buildGavanWeek1Day4MaterialCandidate(seed, day3Export, {
    generatedAt: options.generatedAt,
  });
  const validation = validateGavanWeek1Day4MaterialCandidate(candidate, seed, day3Export);

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
