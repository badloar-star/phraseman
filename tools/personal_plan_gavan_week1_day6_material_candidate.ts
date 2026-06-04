import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1ContentAuthoringSeed,
  GavanWeek1SeedExplanationCard,
  GavanWeek1SeedPhrase,
} from './personal_plan_gavan_week1_content_authoring_seed';
import type {
  GavanWeek1Day5MaterialExportPacket,
} from './personal_plan_gavan_week1_day5_material_export_packet';

export const GAVAN_WEEK1_DAY6_MATERIAL_CANDIDATE_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-day6-material-candidate.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

const REQUIRED_BLOCK_TYPES = [
  'lesson_bridge',
  'quick_reply',
  'missing_word',
  'mistake_repair',
  'pronunciation_shadow',
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

const INVENTED_WRONG_OPTION_COPY = /selected option|you chose|chosen option/i;

export type GavanWeek1Day6MaterialExerciseType =
  | 'lesson_bridge'
  | 'quick_reply'
  | 'missing_word'
  | 'mistake_repair'
  | 'pronunciation_shadow'
  | 'active_recall'
  | 'day_quiz_intent';

export type GavanWeek1Day6ExerciseBlock = {
  id: string;
  exerciseType: GavanWeek1Day6MaterialExerciseType;
  userFacingLabelRu: string;
  purposeRu: string;
  sourcePhraseIds: string[];
  finalExerciseBuilt: false;
};

export type GavanWeek1Day6AfterAnswerExplanation = GavanWeek1SeedExplanationCard & {
  trigger: 'after_answer';
};

export type GavanWeek1Day6MaterialPhrase = Omit<GavanWeek1SeedPhrase, 'explanationCards'> & {
  afterAnswerExplanations: GavanWeek1Day6AfterAnswerExplanation[];
};

export type GavanWeek1Day6QuickReplyItem = {
  id: string;
  phraseId: string;
  promptRu: string;
  correctEnglish: string;
  options: string[];
};

export type GavanWeek1Day6MissingWordItem = {
  id: string;
  phraseId: string;
  targetEnglish: string;
  sentenceWithBlank: string;
  correctToken: string;
  options: string[];
};

export type GavanWeek1Day6RepairItem = {
  id: string;
  phraseId: string;
  targetEnglish: string;
  normalizedTarget: string;
  targetTokenCount: number;
  wordTiles: string[];
  scrambledTiles: string[];
  distractorTiles: string[];
};

export type GavanWeek1Day6PronunciationPlaceholder = {
  id: string;
  phraseId: string;
  targetEnglish: string;
  scoringStatus: 'not_built';
  finalScoringReady: false;
};

export type GavanWeek1Day6ActiveRecall = {
  recallOrder: string[];
  correctWordHighlighting: false;
  hintsEnabled: false;
  errorsReturnLater: true;
  orderChanges: true;
};

export type GavanWeek1Day6QuizBlueprint = {
  id: string;
  sourcePhraseIds: string[];
  questionType: 'meaning_choice' | 'quick_reply' | 'missing_word' | 'repair_choice' | 'pronunciation_placeholder';
  purposeRu: string;
  finalQuestionWritten: false;
};

export type GavanWeek1Day6MaterialCandidate = {
  kind: 'gavan_week1_day6_material_candidate';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  dayId: 'gavan-week1-day6';
  dayIndex: 6;
  status: 'day6_material_candidate_not_live';
  sourceSeedStatus: 'content_authoring_seed_not_live';
  sourceDay5ExportStatus: 'day5_material_export_not_live';
  sourceSeedDayTitle: string;
  liveIntegration: false;
  sourceWritesUsed: false;
  phaseWriteTargets: [];
  exerciseBlocks: GavanWeek1Day6ExerciseBlock[];
  materialPhrases: GavanWeek1Day6MaterialPhrase[];
  quickReplyItems: GavanWeek1Day6QuickReplyItem[];
  missingWordItems: GavanWeek1Day6MissingWordItem[];
  repairItems: GavanWeek1Day6RepairItem[];
  pronunciationPlaceholders: GavanWeek1Day6PronunciationPlaceholder[];
  activeRecall: GavanWeek1Day6ActiveRecall;
  dayQuizIntent: {
    questionCount: 10;
    finalQuizWritten: false;
    quizRegistered: false;
    questionBlueprints: GavanWeek1Day6QuizBlueprint[];
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

export type GavanWeek1Day6MaterialCandidateOptions = {
  generatedAt: string;
};

export type GavanWeek1Day6MaterialCandidateWriteOptions =
  GavanWeek1Day6MaterialCandidateOptions & {
    targetPath: string;
  };

export type GavanWeek1Day6MaterialCandidateIssueCode =
  | 'source_seed_not_ready'
  | 'source_day5_export_not_ready'
  | 'wrong_day_id'
  | 'live_integration_enabled'
  | 'missing_required_block_type'
  | 'quick_reply_option_count_mismatch'
  | 'missing_word_option_count_mismatch'
  | 'missing_word_blank_missing'
  | 'repair_tile_count_mismatch'
  | 'unsafe_distractor_tile'
  | 'fake_pronunciation_placeholder_claim'
  | 'recall_highlighting_enabled'
  | 'forbidden_anchor_present'
  | 'missing_after_answer_explanation'
  | 'invented_wrong_option_feedback'
  | 'wrong_quiz_question_count'
  | 'quiz_registered'
  | 'fake_audio_claim'
  | 'fake_pronunciation_claim'
  | 'target_path_not_allowed';

export type GavanWeek1Day6MaterialCandidateIssue = {
  code: GavanWeek1Day6MaterialCandidateIssueCode;
  detail: string;
  target?: string;
};

export type GavanWeek1Day6MaterialCandidateValidationResult = {
  valid: boolean;
  issues: GavanWeek1Day6MaterialCandidateIssue[];
};

export type GavanWeek1Day6MaterialCandidateWriteResult = {
  valid: boolean;
  issues: GavanWeek1Day6MaterialCandidateIssue[];
  targetPath?: string;
  bytesWritten?: number;
  candidate?: GavanWeek1Day6MaterialCandidate;
};

function issue(
  code: GavanWeek1Day6MaterialCandidateIssueCode,
  detail: string,
  target?: string,
): GavanWeek1Day6MaterialCandidateIssue {
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

export function isGavanWeek1Day6MaterialCandidateTargetAllowed(
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

function day6(seed: GavanWeek1ContentAuthoringSeed) {
  return seed.days.find((dayItem) => dayItem.dayId === 'gavan-week1-day6');
}

function materialPhrase(phraseItem: GavanWeek1SeedPhrase): GavanWeek1Day6MaterialPhrase {
  return {
    ...phraseItem,
    afterAnswerExplanations: phraseItem.explanationCards.map((card) => ({
      ...card,
      trigger: 'after_answer',
    })),
  };
}

function quickReplyItem(
  phraseItem: GavanWeek1SeedPhrase,
  index: number,
): GavanWeek1Day6QuickReplyItem {
  const optionsByTarget: Record<string, string[]> = {
    'That works for me.': ['That works for me.', 'That works at me.', 'I can do that.'],
    'I can do that.': ['I can do that.', "I can't do that today.", 'Can I do that?'],
    "I can't do that today.": ["I can't do that today.", 'I can do that today.', 'That works for me.'],
    "I'll check and come back.": ["I'll check and come back.", "I'll checking and come back.", 'I check and came back.'],
  };

  return {
    id: `gavan-week1-day6:quick-reply-${index}`,
    phraseId: phraseItem.id,
    promptRu: phraseItem.meaningRu,
    correctEnglish: phraseItem.english,
    options: optionsByTarget[phraseItem.english] ?? [phraseItem.english],
  };
}

function missingWordItem(
  phraseItem: GavanWeek1SeedPhrase,
  index: number,
): GavanWeek1Day6MissingWordItem {
  const rows: Record<string, { sentenceWithBlank: string; correctToken: string; options: string[] }> = {
    'That works for me.': {
      sentenceWithBlank: 'That ___ for me.',
      correctToken: 'works',
      options: ['works', 'work', 'working', 'worked'],
    },
    'I can do that.': {
      sentenceWithBlank: 'I ___ do that.',
      correctToken: 'can',
      options: ['can', 'am', 'will', 'did'],
    },
    "I can't do that today.": {
      sentenceWithBlank: "I can't do that ___.",
      correctToken: 'today',
      options: ['today', 'works', 'me', 'back'],
    },
    "I'll check and come back.": {
      sentenceWithBlank: "I'll ___ and come back.",
      correctToken: 'check',
      options: ['check', 'do', 'works', 'can'],
    },
  };
  const row = rows[phraseItem.english] ?? {
    sentenceWithBlank: `${normalizeTarget(phraseItem.english)} ___.`,
    correctToken: tokenise(phraseItem.english)[0] ?? '',
    options: tokenise(phraseItem.english).slice(0, 4),
  };

  return {
    id: `gavan-week1-day6:missing-word-${index}`,
    phraseId: phraseItem.id,
    targetEnglish: phraseItem.english,
    ...row,
  };
}

function repairItem(
  phraseItem: GavanWeek1SeedPhrase,
  index: number,
): GavanWeek1Day6RepairItem {
  const wordTiles = tokenise(phraseItem.english);
  const distractorsByTarget: Record<string, string[]> = {
    'That works for me.': ['work', 'at'],
    'I can do that.': ['am', 'doing'],
    "I can't do that today.": ['can', 'tomorrow'],
    "I'll check and come back.": ['checking', 'came'],
  };

  return {
    id: `gavan-week1-day6:repair-${index}`,
    phraseId: phraseItem.id,
    targetEnglish: phraseItem.english,
    normalizedTarget: normalizeTarget(phraseItem.english),
    targetTokenCount: wordTiles.length,
    wordTiles,
    scrambledTiles: [...wordTiles].reverse(),
    distractorTiles: distractorsByTarget[phraseItem.english] ?? ['will', 'works'],
  };
}

function pronunciationPlaceholder(
  phraseItem: GavanWeek1SeedPhrase,
  index: number,
): GavanWeek1Day6PronunciationPlaceholder {
  return {
    id: `gavan-week1-day6:pronunciation-placeholder-${index}`,
    phraseId: phraseItem.id,
    targetEnglish: phraseItem.english,
    scoringStatus: 'not_built',
    finalScoringReady: false,
  };
}

function exerciseBlock(
  exerciseType: GavanWeek1Day6MaterialExerciseType,
  index: number,
  userFacingLabelRu: string,
  purposeRu: string,
  sourcePhraseIds: string[],
): GavanWeek1Day6ExerciseBlock {
  return {
    id: `gavan-week1-day6:material-block-${index}`,
    exerciseType,
    userFacingLabelRu,
    purposeRu,
    sourcePhraseIds,
    finalExerciseBuilt: false,
  };
}

function quizBlueprints(sourcePhraseIds: string[]): GavanWeek1Day6QuizBlueprint[] {
  const types: GavanWeek1Day6QuizBlueprint['questionType'][] = [
    'meaning_choice',
    'quick_reply',
    'missing_word',
    'repair_choice',
    'pronunciation_placeholder',
    'meaning_choice',
    'quick_reply',
    'missing_word',
    'repair_choice',
    'pronunciation_placeholder',
  ];

  return types.map((questionType, index) => ({
    id: `gavan-week1-day6:quiz-blueprint-${index + 1}`,
    sourcePhraseIds,
    questionType,
    purposeRu: 'Проверить короткие ответы без финальной регистрации квиза.',
    finalQuestionWritten: false,
  }));
}

export function buildGavanWeek1Day6MaterialCandidate(
  seed: GavanWeek1ContentAuthoringSeed,
  day5Export: GavanWeek1Day5MaterialExportPacket,
  options: GavanWeek1Day6MaterialCandidateOptions,
): GavanWeek1Day6MaterialCandidate {
  const sourceDay = day6(seed);
  if (!sourceDay) {
    throw new Error('Gavan week 1 day 6 is missing from the content authoring seed.');
  }
  if (day5Export.status !== 'day5_material_export_not_live') {
    throw new Error('Gavan week 1 day 5 export must be non-live and unblocked before day 6 material.');
  }

  const sourcePhraseIds = sourceDay.phraseBank.map((phraseItem) => phraseItem.id);

  return {
    kind: 'gavan_week1_day6_material_candidate',
    generatedAt: options.generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    dayId: 'gavan-week1-day6',
    dayIndex: 6,
    status: 'day6_material_candidate_not_live',
    sourceSeedStatus: seed.status,
    sourceDay5ExportStatus: day5Export.status,
    sourceSeedDayTitle: sourceDay.userFacingTitle,
    liveIntegration: false,
    sourceWritesUsed: false,
    phaseWriteTargets: [],
    exerciseBlocks: [
      exerciseBlock('lesson_bridge', 1, 'Короткий ответ', 'Объяснить works for me, can, cannot и will перед практикой.', sourcePhraseIds),
      exerciseBlock('quick_reply', 2, 'Ответить быстро', 'Выбрать короткий ответ, когда вариант подходит или не подходит.', sourcePhraseIds),
      exerciseBlock('missing_word', 3, 'Вставить слово', 'Вставить works, can, today или check по смыслу.', sourcePhraseIds),
      exerciseBlock('mistake_repair', 4, 'Починить порядок', 'Собрать короткий ответ без лишних слов и неверных форм.', sourcePhraseIds),
      exerciseBlock('pronunciation_shadow', 5, 'Повторить ритм', 'Подготовить будущую отработку произношения без финального скоринга.', sourcePhraseIds),
      exerciseBlock('active_recall', 6, 'Вспомнить без подсказок', 'Вернуть короткие ответы в другом порядке без подсветки правильных слов.', sourcePhraseIds),
      exerciseBlock('day_quiz_intent', 7, 'Проверить день', 'Запланировать 10 вопросов без регистрации квиза.', sourcePhraseIds),
    ],
    materialPhrases: sourceDay.phraseBank.map(materialPhrase),
    quickReplyItems: sourceDay.phraseBank.map((phraseItem, index) =>
      quickReplyItem(phraseItem, index + 1),
    ),
    missingWordItems: sourceDay.phraseBank.map((phraseItem, index) =>
      missingWordItem(phraseItem, index + 1),
    ),
    repairItems: sourceDay.phraseBank.map((phraseItem, index) =>
      repairItem(phraseItem, index + 1),
    ),
    pronunciationPlaceholders: sourceDay.phraseBank.map((phraseItem, index) =>
      pronunciationPlaceholder(phraseItem, index + 1),
    ),
    activeRecall: {
      recallOrder: [sourcePhraseIds[3], sourcePhraseIds[1], sourcePhraseIds[0], sourcePhraseIds[2]],
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

function phraseMissingAfterAnswerExplanation(phraseItem: GavanWeek1Day6MaterialPhrase): boolean {
  if (phraseItem.afterAnswerExplanations.length === 0) {
    return true;
  }

  const covered = new Set(phraseItem.afterAnswerExplanations.flatMap((card) => card.covers));
  return [...phraseItem.newWords, ...phraseItem.firstSeenConstructions]
    .some((target) => !covered.has(target));
}

function phraseHasInventedWrongOptionCopy(phraseItem: GavanWeek1Day6MaterialPhrase): boolean {
  return phraseItem.afterAnswerExplanations.some((card) =>
    INVENTED_WRONG_OPTION_COPY.test(`${card.correctFeedbackRu} ${card.wrongFeedbackRu}`),
  );
}

function quickReplyOptionsInvalid(item: GavanWeek1Day6QuickReplyItem): boolean {
  return (
    item.options.length !== 3 ||
    new Set(item.options).size !== item.options.length ||
    !item.options.includes(item.correctEnglish)
  );
}

function missingWordInvalid(item: GavanWeek1Day6MissingWordItem): {
  optionIssue: boolean;
  blankIssue: boolean;
} {
  return {
    optionIssue: (
      item.options.length !== 4 ||
      new Set(item.options).size !== item.options.length ||
      !item.options.includes(item.correctToken)
    ),
    blankIssue: !item.sentenceWithBlank.includes('___'),
  };
}

export function validateGavanWeek1Day6MaterialCandidate(
  candidate: GavanWeek1Day6MaterialCandidate,
  seed: GavanWeek1ContentAuthoringSeed,
  day5Export: GavanWeek1Day5MaterialExportPacket,
): GavanWeek1Day6MaterialCandidateValidationResult {
  const issues: GavanWeek1Day6MaterialCandidateIssue[] = [];
  const seedDay = day6(seed);

  if (!seedDay || seed.status !== 'content_authoring_seed_not_live') {
    issues.push(issue('source_seed_not_ready', 'Source seed must be the non-live reset content seed.'));
  }

  if (day5Export.status !== 'day5_material_export_not_live') {
    issues.push(issue('source_day5_export_not_ready', 'Day 5 material export must be non-live and unblocked.'));
  }

  if (candidate.dayId !== 'gavan-week1-day6' || candidate.dayIndex !== 6) {
    issues.push(issue('wrong_day_id', 'Candidate must target Gavan week 1 day 6.'));
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

  candidate.quickReplyItems.forEach((item) => {
    if (quickReplyOptionsInvalid(item)) {
      issues.push(issue('quick_reply_option_count_mismatch', 'Quick reply items must include the correct answer and exactly 3 unique options.', item.id));
    }
  });

  candidate.missingWordItems.forEach((item) => {
    const result = missingWordInvalid(item);
    if (result.optionIssue) {
      issues.push(issue('missing_word_option_count_mismatch', 'Missing-word items must include the correct token and exactly 4 unique options.', item.id));
    }
    if (result.blankIssue) {
      issues.push(issue('missing_word_blank_missing', 'Missing-word items must include a visible blank.', item.id));
    }
  });

  candidate.repairItems.forEach((item) => {
    if (item.wordTiles.length !== item.targetTokenCount || item.wordTiles.join(' ') !== item.normalizedTarget) {
      issues.push(issue('repair_tile_count_mismatch', 'Repair word tiles must match target token count.', item.id));
    }

    item.distractorTiles.forEach((tile) => {
      if (item.wordTiles.includes(tile)) {
        issues.push(issue('unsafe_distractor_tile', 'Distractor tile must not duplicate a correct tile.', item.id));
      }
    });
  });

  candidate.pronunciationPlaceholders.forEach((item) => {
    if (item.scoringStatus !== 'not_built' || item.finalScoringReady) {
      issues.push(issue('fake_pronunciation_placeholder_claim', 'Pronunciation placeholders must not claim final scoring.', item.id));
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

export function writeGavanWeek1Day6MaterialCandidate(
  seed: GavanWeek1ContentAuthoringSeed,
  day5Export: GavanWeek1Day5MaterialExportPacket,
  options: GavanWeek1Day6MaterialCandidateWriteOptions,
): GavanWeek1Day6MaterialCandidateWriteResult {
  if (!isGavanWeek1Day6MaterialCandidateTargetAllowed(options.targetPath)) {
    return {
      valid: false,
      issues: [
        issue('target_path_not_allowed', 'Target path must stay under .codex-tmp or docs/reports.'),
      ],
    };
  }

  const candidate = buildGavanWeek1Day6MaterialCandidate(seed, day5Export, {
    generatedAt: options.generatedAt,
  });
  const validation = validateGavanWeek1Day6MaterialCandidate(candidate, seed, day5Export);

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
