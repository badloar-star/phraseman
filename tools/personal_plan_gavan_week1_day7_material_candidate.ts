import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1Day6MaterialExportPacket,
} from './personal_plan_gavan_week1_day6_material_export_packet';
import type {
  GavanWeek1Day7ApprovedContentUnitRow,
  GavanWeek1Day7ApprovedExplanationRow,
  GavanWeek1Day7ApprovedReviewerExport,
} from './personal_plan_gavan_week1_day7_reviewer_approval_gate';

export const GAVAN_WEEK1_DAY7_MATERIAL_CANDIDATE_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-day7-material-candidate.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

const REQUIRED_BLOCK_TYPES = [
  'lesson_bridge',
  'active_recall',
  'listening_choice',
  'natural_choice',
  'micro_dialogue',
  'day_quiz_intent',
] as const;

const FORBIDDEN_CONTENT_MATCHERS: Array<[string, RegExp]> = [
  ['phone', /phone/i],
  ['email', /email/i],
  ['apartment', /apartment/i],
  ['rent', /rent/i],
  ['document', /document/i],
  ['doctor', /doctor/i],
  ['bank', /bank/i],
  ['087', /087/],
  ['at-sign', /@/],
  ['alex', /\balex\b/i],
  ['beta', /beta8958|beta/i],
  ['broken-encoding', /[\u00d0\u00d1\u00c2\u00e2\ufffd]/],
];

const INVENTED_WRONG_OPTION_COPY = /selected option|you chose|chosen option/i;

export type GavanWeek1Day7MaterialExerciseType = typeof REQUIRED_BLOCK_TYPES[number];

export type GavanWeek1Day7ExerciseBlock = {
  id: string;
  exerciseType: GavanWeek1Day7MaterialExerciseType;
  userFacingLabelRu: string;
  purposeRu: string;
  sourcePhraseIds: string[];
  finalExerciseBuilt: false;
};

export type GavanWeek1Day7AfterAnswerExplanation = {
  id: string;
  covers: string[];
  body: string;
  trigger: 'after_answer';
  mustNotMentionUnseenWrongOption: true;
  approval: GavanWeek1Day7ApprovedExplanationRow['approval'];
};

export type GavanWeek1Day7MaterialPhrase = {
  id: string;
  english: string;
  meaningRu: string;
  newWords: string[];
  firstSeenConstructions: string[];
  reviewStatus: 'approved';
  approval: GavanWeek1Day7ApprovedContentUnitRow['approval'];
  afterAnswerExplanations: GavanWeek1Day7AfterAnswerExplanation[];
};

export type GavanWeek1Day7ListeningChoiceItem = {
  id: string;
  phraseId: string;
  promptRu: string;
  correctEnglish: string;
  options: string[];
  audioAssetStatus: 'not_generated';
  finalAudioReady: false;
};

export type GavanWeek1Day7NaturalChoiceItem = {
  id: string;
  phraseId: string;
  promptRu: string;
  correctEnglish: string;
  options: string[];
};

export type GavanWeek1Day7MicroDialogueItem = {
  id: string;
  phraseId: string;
  setup: string;
  targetEnglish: string;
  responseOptions: string[];
};

export type GavanWeek1Day7ActiveRecall = {
  recallOrder: string[];
  correctWordHighlighting: false;
  hintsEnabled: false;
  errorsReturnLater: true;
  orderChanges: true;
};

export type GavanWeek1Day7QuizBlueprint = {
  id: string;
  sourcePhraseIds: string[];
  questionType:
    | 'meaning_choice'
    | 'listening_choice'
    | 'natural_choice'
    | 'micro_dialogue'
    | 'active_recall';
  purposeRu: string;
  finalQuestionWritten: false;
};

export type GavanWeek1Day7MaterialCandidate = {
  kind: 'gavan_week1_day7_material_candidate';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  dayId: 'gavan-week1-day7';
  dayIndex: 7;
  status: 'day7_material_candidate_not_live';
  sourceApprovedReviewerExportKind: 'gavan_week1_day7_approved_reviewer_export';
  sourceApprovedReviewerSummary: GavanWeek1Day7ApprovedReviewerExport['summary'];
  sourceDay6ExportStatus: 'day6_material_export_not_live';
  sourceSeedDayTitle: string;
  liveIntegration: false;
  sourceWritesUsed: false;
  phaseWriteTargets: [];
  exerciseBlocks: GavanWeek1Day7ExerciseBlock[];
  materialPhrases: GavanWeek1Day7MaterialPhrase[];
  listeningChoiceItems: GavanWeek1Day7ListeningChoiceItem[];
  naturalChoiceItems: GavanWeek1Day7NaturalChoiceItem[];
  microDialogueItems: GavanWeek1Day7MicroDialogueItem[];
  activeRecall: GavanWeek1Day7ActiveRecall;
  dayQuizIntent: {
    questionCount: 10;
    finalQuizWritten: false;
    quizRegistered: false;
    questionBlueprints: GavanWeek1Day7QuizBlueprint[];
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

export type GavanWeek1Day7MaterialCandidateOptions = {
  generatedAt: string;
};

export type GavanWeek1Day7MaterialCandidateWriteOptions =
  GavanWeek1Day7MaterialCandidateOptions & {
    targetPath: string;
  };

export type GavanWeek1Day7MaterialCandidateIssueCode =
  | 'source_day6_export_not_ready'
  | 'source_day7_approval_not_ready'
  | 'wrong_day_id'
  | 'live_integration_enabled'
  | 'missing_required_block_type'
  | 'listening_choice_option_count_mismatch'
  | 'listening_choice_fake_audio_claim'
  | 'natural_choice_option_count_mismatch'
  | 'micro_dialogue_option_count_mismatch'
  | 'recall_highlighting_enabled'
  | 'forbidden_anchor_present'
  | 'missing_after_answer_explanation'
  | 'invented_wrong_option_feedback'
  | 'wrong_quiz_question_count'
  | 'quiz_registered'
  | 'fake_audio_claim'
  | 'fake_pronunciation_claim'
  | 'target_path_not_allowed';

export type GavanWeek1Day7MaterialCandidateIssue = {
  code: GavanWeek1Day7MaterialCandidateIssueCode;
  detail: string;
  target?: string;
};

export type GavanWeek1Day7MaterialCandidateValidationResult = {
  valid: boolean;
  issues: GavanWeek1Day7MaterialCandidateIssue[];
};

export type GavanWeek1Day7MaterialCandidateWriteResult = {
  valid: boolean;
  issues: GavanWeek1Day7MaterialCandidateIssue[];
  targetPath?: string;
  bytesWritten?: number;
  candidate?: GavanWeek1Day7MaterialCandidate;
};

function issue(
  code: GavanWeek1Day7MaterialCandidateIssueCode,
  detail: string,
  target?: string,
): GavanWeek1Day7MaterialCandidateIssue {
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

export function isGavanWeek1Day7MaterialCandidateTargetAllowed(
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

function explanationsFor(
  contentUnitId: string,
  approvedExport: GavanWeek1Day7ApprovedReviewerExport,
): GavanWeek1Day7AfterAnswerExplanation[] {
  return approvedExport.explanationRows
    .filter((row) => row.contentUnitId === contentUnitId)
    .map((row) => ({
      id: row.explanationId,
      covers: [...row.covers],
      body: row.body,
      trigger: 'after_answer',
      mustNotMentionUnseenWrongOption: true,
      approval: row.approval,
    }));
}

function materialPhrase(
  row: GavanWeek1Day7ApprovedContentUnitRow,
  approvedExport: GavanWeek1Day7ApprovedReviewerExport,
): GavanWeek1Day7MaterialPhrase {
  return {
    id: row.contentUnitId,
    english: row.english,
    meaningRu: row.meaningRu,
    newWords: [...row.newWords],
    firstSeenConstructions: [...row.firstSeenConstructions],
    reviewStatus: 'approved',
    approval: row.approval,
    afterAnswerExplanations: explanationsFor(row.contentUnitId, approvedExport),
  };
}

function exerciseBlock(
  exerciseType: GavanWeek1Day7MaterialExerciseType,
  index: number,
  userFacingLabelRu: string,
  purposeRu: string,
  sourcePhraseIds: string[],
): GavanWeek1Day7ExerciseBlock {
  return {
    id: `gavan-week1-day7:material-block-${index}`,
    exerciseType,
    userFacingLabelRu,
    purposeRu,
    sourcePhraseIds,
    finalExerciseBuilt: false,
  };
}

function optionSet(correct: string, fallbackOne: string, fallbackTwo: string): string[] {
  return [correct, fallbackOne, fallbackTwo];
}

function listeningChoiceItem(
  phraseItem: GavanWeek1Day7MaterialPhrase,
  index: number,
): GavanWeek1Day7ListeningChoiceItem {
  const optionsByTarget: Record<string, string[]> = {
    'I need a moment.': optionSet('I need a moment.', 'I need a minute.', 'I have a moment.'),
    'Could you say that again?': optionSet('Could you say that again?', 'Could I say that again?', 'Can you see that again?'),
    'What should I do next?': optionSet('What should I do next?', 'What should I say now?', 'What can I do yesterday?'),
    "I'll check and come back.": optionSet("I'll check and come back.", "I'll check and go back.", "I'll checked and come back."),
  };

  return {
    id: `gavan-week1-day7:listening-choice-${index}`,
    phraseId: phraseItem.id,
    promptRu: phraseItem.meaningRu,
    correctEnglish: phraseItem.english,
    options: optionsByTarget[phraseItem.english] ?? optionSet(phraseItem.english, 'I need a moment.', 'Could you say that again?'),
    audioAssetStatus: 'not_generated',
    finalAudioReady: false,
  };
}

function naturalChoiceItem(
  phraseItem: GavanWeek1Day7MaterialPhrase,
  index: number,
): GavanWeek1Day7NaturalChoiceItem {
  const optionsByTarget: Record<string, string[]> = {
    'I need a moment.': optionSet('I need a moment.', 'I need a long story.', 'I need the answer now.'),
    'Could you say that again?': optionSet('Could you say that again?', 'Could you stop talking?', 'Could you finish now?'),
    'What should I do next?': optionSet('What should I do next?', 'What did I do wrong?', 'What should you do for me?'),
    "I'll check and come back.": optionSet("I'll check and come back.", "I'll guess and leave.", "I'll forget and come back."),
  };

  return {
    id: `gavan-week1-day7:natural-choice-${index}`,
    phraseId: phraseItem.id,
    promptRu: phraseItem.meaningRu,
    correctEnglish: phraseItem.english,
    options: optionsByTarget[phraseItem.english] ?? optionSet(phraseItem.english, 'I need a moment.', 'Could you say that again?'),
  };
}

function microDialogueItem(
  phraseItem: GavanWeek1Day7MaterialPhrase,
  index: number,
): GavanWeek1Day7MicroDialogueItem {
  const setupByTarget: Record<string, string> = {
    'I need a moment.': 'The other person asks you to decide now.',
    'Could you say that again?': 'You missed the last sentence.',
    'What should I do next?': 'You finished one step and need guidance.',
    "I'll check and come back.": 'You need to verify something before answering.',
  };
  const optionsByTarget: Record<string, string[]> = {
    'I need a moment.': optionSet('I need a moment.', 'I need the wrong answer.', 'I need to disappear.'),
    'Could you say that again?': optionSet('Could you say that again?', 'Could you say goodbye?', 'Could you pay that again?'),
    'What should I do next?': optionSet('What should I do next?', 'What should I forget now?', 'What should you ask me?'),
    "I'll check and come back.": optionSet("I'll check and come back.", "I'll check and not return.", "I'll checking and come back."),
  };

  return {
    id: `gavan-week1-day7:micro-dialogue-${index}`,
    phraseId: phraseItem.id,
    setup: setupByTarget[phraseItem.english] ?? 'Choose the calm everyday reply.',
    targetEnglish: phraseItem.english,
    responseOptions: optionsByTarget[phraseItem.english] ?? optionSet(phraseItem.english, 'I need a moment.', 'Could you say that again?'),
  };
}

function quizBlueprints(sourcePhraseIds: string[]): GavanWeek1Day7QuizBlueprint[] {
  const types: GavanWeek1Day7QuizBlueprint['questionType'][] = [
    'meaning_choice',
    'listening_choice',
    'natural_choice',
    'micro_dialogue',
    'active_recall',
    'meaning_choice',
    'listening_choice',
    'natural_choice',
    'micro_dialogue',
    'active_recall',
  ];

  return types.map((questionType, index) => ({
    id: `gavan-week1-day7:quiz-blueprint-${index + 1}`,
    sourcePhraseIds,
    questionType,
    purposeRu: 'Plan a day review question without registering a final quiz yet.',
    finalQuestionWritten: false,
  }));
}

export function buildGavanWeek1Day7MaterialCandidate(
  approvedExport: GavanWeek1Day7ApprovedReviewerExport,
  day6Export: GavanWeek1Day6MaterialExportPacket,
  options: GavanWeek1Day7MaterialCandidateOptions,
): GavanWeek1Day7MaterialCandidate {
  if (approvedExport.kind !== 'gavan_week1_day7_approved_reviewer_export') {
    throw new Error('Gavan week 1 day 7 material needs an approved reviewer export.');
  }
  if (day6Export.status !== 'day6_material_export_not_live') {
    throw new Error('Gavan week 1 day 6 export must be non-live and unblocked before day 7 material.');
  }

  const materialPhrases = approvedExport.contentUnitRows.map((row) =>
    materialPhrase(row, approvedExport),
  );
  const sourcePhraseIds = materialPhrases.map((phrase) => phrase.id);

  return {
    kind: 'gavan_week1_day7_material_candidate',
    generatedAt: options.generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    dayId: 'gavan-week1-day7',
    dayIndex: 7,
    status: 'day7_material_candidate_not_live',
    sourceApprovedReviewerExportKind: approvedExport.kind,
    sourceApprovedReviewerSummary: { ...approvedExport.summary },
    sourceDay6ExportStatus: day6Export.status,
    sourceSeedDayTitle: 'Week 1 review',
    liveIntegration: false,
    sourceWritesUsed: false,
    phaseWriteTargets: [],
    exerciseBlocks: [
      exerciseBlock('lesson_bridge', 1, 'Week review bridge', 'Connect the reviewed day 7 phrases before practice.', sourcePhraseIds),
      exerciseBlock('active_recall', 2, 'Recall without hints', 'Recall the review phrases in a changed order.', sourcePhraseIds),
      exerciseBlock('listening_choice', 3, 'Listening choice', 'Prepare choice items for future approved audio only.', sourcePhraseIds),
      exerciseBlock('natural_choice', 4, 'Natural answer', 'Choose the calm public-safe phrase for the situation.', sourcePhraseIds),
      exerciseBlock('micro_dialogue', 5, 'Micro dialogue', 'Finish a short review exchange with an approved phrase.', sourcePhraseIds),
      exerciseBlock('day_quiz_intent', 6, 'Day review quiz intent', 'Plan ten review questions without registering the quiz.', sourcePhraseIds),
    ],
    materialPhrases,
    listeningChoiceItems: materialPhrases.map((phrase, index) =>
      listeningChoiceItem(phrase, index + 1),
    ),
    naturalChoiceItems: materialPhrases.map((phrase, index) =>
      naturalChoiceItem(phrase, index + 1),
    ),
    microDialogueItems: materialPhrases.map((phrase, index) =>
      microDialogueItem(phrase, index + 1),
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

function optionsInvalid(options: string[], correct: string, expectedCount: number): boolean {
  return (
    options.length !== expectedCount ||
    new Set(options).size !== options.length ||
    !options.includes(correct)
  );
}

function phraseMissingAfterAnswerExplanation(phraseItem: GavanWeek1Day7MaterialPhrase): boolean {
  if (phraseItem.afterAnswerExplanations.length === 0) {
    return true;
  }

  const covered = new Set(phraseItem.afterAnswerExplanations.flatMap((card) => card.covers));
  return [...phraseItem.newWords, ...phraseItem.firstSeenConstructions]
    .some((target) => !covered.has(target));
}

function phraseHasInventedWrongOptionCopy(phraseItem: GavanWeek1Day7MaterialPhrase): boolean {
  return phraseItem.afterAnswerExplanations.some((card) =>
    INVENTED_WRONG_OPTION_COPY.test(card.body),
  );
}

function visibleCopy(candidate: GavanWeek1Day7MaterialCandidate): string {
  return JSON.stringify({
    materialPhrases: candidate.materialPhrases.map((phrase) => ({
      english: phrase.english,
      meaningRu: phrase.meaningRu,
      newWords: phrase.newWords,
      firstSeenConstructions: phrase.firstSeenConstructions,
      explanations: phrase.afterAnswerExplanations.map((card) => card.body),
    })),
    exerciseBlocks: candidate.exerciseBlocks.map((block) => ({
      exerciseType: block.exerciseType,
      label: block.userFacingLabelRu,
      purpose: block.purposeRu,
    })),
    listeningChoiceItems: candidate.listeningChoiceItems.map((item) => ({
      promptRu: item.promptRu,
      correctEnglish: item.correctEnglish,
      options: item.options,
    })),
    naturalChoiceItems: candidate.naturalChoiceItems.map((item) => ({
      promptRu: item.promptRu,
      correctEnglish: item.correctEnglish,
      options: item.options,
    })),
    microDialogueItems: candidate.microDialogueItems.map((item) => ({
      setup: item.setup,
      targetEnglish: item.targetEnglish,
      responseOptions: item.responseOptions,
    })),
  });
}

export function validateGavanWeek1Day7MaterialCandidate(
  candidate: GavanWeek1Day7MaterialCandidate,
  approvedExport: GavanWeek1Day7ApprovedReviewerExport,
  day6Export: GavanWeek1Day6MaterialExportPacket,
): GavanWeek1Day7MaterialCandidateValidationResult {
  const issues: GavanWeek1Day7MaterialCandidateIssue[] = [];

  if (
    approvedExport.kind !== 'gavan_week1_day7_approved_reviewer_export' ||
    approvedExport.dayId !== 'gavan-week1-day7' ||
    approvedExport.summary.totalApproved < 16 ||
    approvedExport.liveIntegration !== false
  ) {
    issues.push(issue('source_day7_approval_not_ready', 'Day 7 approved reviewer export must be complete and non-live.'));
  }

  if (day6Export.status !== 'day6_material_export_not_live') {
    issues.push(issue('source_day6_export_not_ready', 'Day 6 material export must be non-live and unblocked.'));
  }

  if (candidate.dayId !== 'gavan-week1-day7' || candidate.dayIndex !== 7) {
    issues.push(issue('wrong_day_id', 'Candidate must target Gavan week 1 day 7.'));
  }

  if (candidate.liveIntegration || candidate.sourceWritesUsed || candidate.phaseWriteTargets.length > 0) {
    issues.push(issue('live_integration_enabled', 'Material candidate must stay non-live.'));
  }

  const blockTypes = new Set(candidate.exerciseBlocks.map((block) => block.exerciseType));
  REQUIRED_BLOCK_TYPES.forEach((blockType) => {
    if (!blockTypes.has(blockType)) {
      issues.push(issue('missing_required_block_type', `Missing material block: ${blockType}`, blockType));
    }
  });

  candidate.listeningChoiceItems.forEach((item) => {
    if (optionsInvalid(item.options, item.correctEnglish, 3)) {
      issues.push(issue('listening_choice_option_count_mismatch', 'Listening-choice items must include the correct answer and exactly 3 unique options.', item.id));
    }
    if (item.audioAssetStatus !== 'not_generated' || item.finalAudioReady) {
      issues.push(issue('listening_choice_fake_audio_claim', 'Listening-choice items must not claim generated audio.', item.id));
    }
  });

  candidate.naturalChoiceItems.forEach((item) => {
    if (optionsInvalid(item.options, item.correctEnglish, 3)) {
      issues.push(issue('natural_choice_option_count_mismatch', 'Natural-choice items must include the correct answer and exactly 3 unique options.', item.id));
    }
  });

  candidate.microDialogueItems.forEach((item) => {
    if (optionsInvalid(item.responseOptions, item.targetEnglish, 3)) {
      issues.push(issue('micro_dialogue_option_count_mismatch', 'Micro-dialogue items must include the target and exactly 3 unique response options.', item.id));
    }
  });

  if (candidate.activeRecall.correctWordHighlighting || candidate.activeRecall.hintsEnabled) {
    issues.push(issue('recall_highlighting_enabled', 'Plan recall must not highlight correct words or use hints.'));
  }

  const serializedVisibleCopy = visibleCopy(candidate);
  FORBIDDEN_CONTENT_MATCHERS.forEach(([label, matcher]) => {
    if (matcher.test(serializedVisibleCopy)) {
      issues.push(issue('forbidden_anchor_present', `Forbidden anchor found: ${label}`, label));
    }
  });

  candidate.materialPhrases.forEach((phraseItem) => {
    if (phraseMissingAfterAnswerExplanation(phraseItem)) {
      issues.push(issue(
        'missing_after_answer_explanation',
        'Every approved phrase must have after-answer explanation coverage.',
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

export function writeGavanWeek1Day7MaterialCandidate(
  approvedExport: GavanWeek1Day7ApprovedReviewerExport,
  day6Export: GavanWeek1Day6MaterialExportPacket,
  options: GavanWeek1Day7MaterialCandidateWriteOptions,
): GavanWeek1Day7MaterialCandidateWriteResult {
  if (!isGavanWeek1Day7MaterialCandidateTargetAllowed(options.targetPath)) {
    return {
      valid: false,
      issues: [
        issue('target_path_not_allowed', 'Target path must stay under .codex-tmp or docs/reports.'),
      ],
    };
  }

  const candidate = buildGavanWeek1Day7MaterialCandidate(approvedExport, day6Export, {
    generatedAt: options.generatedAt,
  });
  const validation = validateGavanWeek1Day7MaterialCandidate(candidate, approvedExport, day6Export);

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
