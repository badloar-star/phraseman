import type { PersonalPlanId } from './personal_plan_catalog';

export type PersonalPlanGenerationMode =
  | 'plan_phrase_build'
  | 'plan_missing_word'
  | 'plan_choose_natural_phrase'
  | 'plan_listen_choose'
  | 'plan_listen_build'
  | 'plan_pronunciation_repeat'
  | 'plan_phrase_recall'
  | 'plan_quiz';

export type GenerationModeContract = {
  mode: PersonalPlanGenerationMode;
  requiredFields: string[];
  optionalFields: string[];
  blockedWhen: string[];
};

export type DailyTaskSetMatrixRow = {
  dayIndex: number;
  weekIndex: number;
  progressionRole: string;
  modes: PersonalPlanGenerationMode[];
};

export type DailyTaskOrderMatrixRow = DailyTaskSetMatrixRow;

export type GeneratedPhraseCandidate = {
  id: string;
  english: string;
  translation: string;
  teachingNote: string;
};

export type GeneratedRecallLink = {
  fromDayIndex: number;
  phraseIds: string[];
};

export type GeneratedEvidenceNeed = {
  mode: PersonalPlanGenerationMode;
  status: 'blocked_until_audio_approved' | 'blocked_until_scorer_evidence' | 'not_required';
};

export type GeneratedPersonalPlanDayPacket = {
  packetId: string;
  planId: PersonalPlanId;
  dayIndex: number;
  weekIndex: number;
  dayTheme: string;
  weekRole: string;
  selectedDailyTimeAffectsTasks: boolean;
  productionReady: boolean;
  reviewStatus: 'needs_review' | 'approved_for_generation_fixture' | 'rejected';
  taskModes: Array<PersonalPlanGenerationMode | 'lesson' | 'linked_lesson_slice'>;
  phrases: GeneratedPhraseCandidate[];
  recallLinks: GeneratedRecallLink[];
  audioNeeds: GeneratedEvidenceNeed[];
  pronunciationNeeds: GeneratedEvidenceNeed[];
  blockers: string[];
};

export type GeneratedDayPacketIssueCode =
  | 'missing_packet_id'
  | 'lesson_task_not_allowed'
  | 'time_based_task_selection_required_for_visible_slice'
  | 'production_ready_not_allowed'
  | 'missing_maximum_day_mode_pool'
  | 'unknown_mode'
  | 'too_few_phrases'
  | 'duplicate_phrase_text'
  | 'missing_phrase_fields'
  | 'technical_placeholder_copy';

export type GeneratedDayPacketIssue = {
  code: GeneratedDayPacketIssueCode;
  message: string;
};

export type GeneratedDayPacketValidationResult = {
  status: 'valid_needs_review' | 'invalid';
  issueCodes: GeneratedDayPacketIssueCode[];
  issues: GeneratedDayPacketIssue[];
};

export const GENERATION_MODE_CONTRACT: GenerationModeContract[] = [
  {
    mode: 'plan_phrase_build',
    requiredFields: ['lessonId', 'contentUnitIds', 'requiredPhrases'],
    optionalFields: ['recallLinks', 'teachingNotes'],
    blockedWhen: ['missing_phrase_candidates', 'technical_placeholder_copy'],
  },
  {
    mode: 'plan_missing_word',
    requiredFields: ['lessonId', 'contentUnitIds', 'requiredCorrect'],
    optionalFields: ['distractors', 'teachingNotes'],
    blockedWhen: ['missing_target_word', 'duplicate_phrase_text'],
  },
  {
    mode: 'plan_choose_natural_phrase',
    requiredFields: ['lessonId', 'contentUnitIds', 'requiredCorrect'],
    optionalFields: ['scenarioPrompt', 'wrongChoiceReason'],
    blockedWhen: ['missing_natural_choice', 'technical_placeholder_copy'],
  },
  {
    mode: 'plan_listen_choose',
    requiredFields: ['lessonId', 'contentUnitIds', 'requiredCorrect', 'audioNeeds'],
    optionalFields: ['approvedAudioAssetIds'],
    blockedWhen: ['audio_not_approved', 'missing_audio_checksum'],
  },
  {
    mode: 'plan_listen_build',
    requiredFields: ['lessonId', 'contentUnitIds', 'requiredCorrect', 'audioNeeds'],
    optionalFields: ['wordBank'],
    blockedWhen: ['audio_not_approved', 'missing_audio_checksum'],
  },
  {
    mode: 'plan_pronunciation_repeat',
    requiredFields: ['lessonId', 'contentUnitIds', 'pronunciationNeeds'],
    optionalFields: ['scorerProvider', 'recordingEvidence'],
    blockedWhen: ['missing_scorer_provider', 'missing_recording_evidence'],
  },
  {
    mode: 'plan_phrase_recall',
    requiredFields: ['recallLinks', 'requiredPhrases'],
    optionalFields: ['weakSpotSource', 'carryoverReason'],
    blockedWhen: ['missing_recall_links'],
  },
  {
    mode: 'plan_quiz',
    requiredFields: ['quizId', 'questionCount', 'sourcePhraseIds'],
    optionalFields: ['level', 'thematicCategoryId'],
    blockedWhen: ['missing_quiz_source', 'technical_placeholder_copy'],
  },
];

export const DAILY_TASK_SET_MATRIX: DailyTaskSetMatrixRow[] = [
  ...Array.from({ length: 28 }, (_, index) => ({
    dayIndex: index + 1,
    weekIndex: Math.ceil((index + 1) / 7),
    progressionRole: [
      'first_usable_phrases',
      'same_situation_faster_choice',
      'second_angle',
      'short_response_pressure',
      'mixed_input',
      'scenario_mini_flow',
      'weekly_check',
      'polite_pressure',
      'timing_listening',
      'short_reply_build',
      'clarify_and_correct',
      'listening_pressure',
      'mini_flow_rehearsal',
      'week_two_check',
      'combine_two_situations',
      'listen_and_rebuild',
      'active_recall',
      'speak_the_repair',
      'natural_choice',
      'scenario_chain',
      'review_and_transfer',
      'production_rehearsal_a',
      'production_rehearsal_b',
      'fast_correction',
      'dialog_pressure',
      'memory_day',
      'final_rehearsal',
      'final_review',
    ][index],
    modes: GENERATION_MODE_CONTRACT.map((mode) => mode.mode),
  })),
];

const DAILY_TASK_TAIL_ORDER: PersonalPlanGenerationMode[][] = [
  [
    'plan_missing_word',
    'plan_choose_natural_phrase',
    'plan_listen_choose',
    'plan_listen_build',
    'plan_pronunciation_repeat',
    'plan_phrase_recall',
    'plan_quiz',
  ],
  [
    'plan_choose_natural_phrase',
    'plan_missing_word',
    'plan_phrase_recall',
    'plan_listen_choose',
    'plan_listen_build',
    'plan_pronunciation_repeat',
    'plan_quiz',
  ],
  [
    'plan_listen_choose',
    'plan_missing_word',
    'plan_listen_build',
    'plan_choose_natural_phrase',
    'plan_pronunciation_repeat',
    'plan_phrase_recall',
    'plan_quiz',
  ],
  [
    'plan_missing_word',
    'plan_pronunciation_repeat',
    'plan_choose_natural_phrase',
    'plan_listen_build',
    'plan_phrase_recall',
    'plan_listen_choose',
    'plan_quiz',
  ],
  [
    'plan_choose_natural_phrase',
    'plan_listen_build',
    'plan_missing_word',
    'plan_listen_choose',
    'plan_quiz',
    'plan_pronunciation_repeat',
    'plan_phrase_recall',
  ],
  [
    'plan_listen_build',
    'plan_phrase_recall',
    'plan_choose_natural_phrase',
    'plan_missing_word',
    'plan_listen_choose',
    'plan_pronunciation_repeat',
    'plan_quiz',
  ],
  [
    'plan_phrase_recall',
    'plan_quiz',
    'plan_missing_word',
    'plan_choose_natural_phrase',
    'plan_listen_choose',
    'plan_listen_build',
    'plan_pronunciation_repeat',
  ],
];

export const DAILY_TASK_ORDER_MATRIX: DailyTaskOrderMatrixRow[] = DAILY_TASK_SET_MATRIX.map((row, index) => ({
  ...row,
  modes: ['plan_phrase_build', ...DAILY_TASK_TAIL_ORDER[index % DAILY_TASK_TAIL_ORDER.length]],
}));

export const GENERATION_PROMPT_TEMPLATE = [
  'Do not import generated Day 2-28 chat drafts into runtime/source without review approval.',
  'Use this template only after the generation fixture gate is green.',
  'Generate the full maximum day pool with one task per plan-native mode.',
  'Always start the day with plan_phrase_build so the learner meets the main new phrases first.',
  'Vary the remaining task order by day using DAILY_TASK_ORDER_MATRIX; do not repeat the same tail order every day.',
  'Selected daily time chooses only the initial visible slice, not which tasks exist.',
  'lessons are not plan tasks.',
  'Choose the daily task set from DAILY_TASK_SET_MATRIX.',
  '5 minutes starts with 2-4 visible tasks.',
  '10 minutes starts with 3-5 visible tasks.',
  '15 minutes starts with 4-5 visible tasks.',
  '20 minutes starts with 5-6 visible tasks.',
  'After the visible tasks are completed, show Add more tasks while unrevealed tasks remain.',
  'Return blockers instead of claiming fake readiness.',
].join('\n');

export const GENERATION_REVIEW_RUBRIC = [
  'phrases_must_sound_alive',
  'translations_must_be_short',
  'each_phrase_needs_teaching_note',
  'task_modes_must_match_progression_role',
  'review_days_must_recall_older_phrases',
  'listening_modes_require_audio_approval_or_blocker',
  'pronunciation_modes_require_scorer_evidence_or_blocker',
  'review_status_must_not_be_production_ready',
];

const allowedModes = new Set(GENERATION_MODE_CONTRACT.map((mode) => mode.mode));
const technicalCopyPattern = /placeholder|scaffold|generated shell|normal lesson shell|exercise mode|dry-run|fake readiness/i;

function normalizedPhrase(value: string): string {
  return value.trim().toLowerCase().replace(/[.!?]+$/g, '').replace(/\s+/g, ' ');
}

function addIssue(
  issues: GeneratedDayPacketIssue[],
  code: GeneratedDayPacketIssueCode,
  message: string,
): void {
  issues.push({ code, message });
}

export function validateGeneratedDayPacket(
  packet: GeneratedPersonalPlanDayPacket,
): GeneratedDayPacketValidationResult {
  const issues: GeneratedDayPacketIssue[] = [];

  if (!packet.packetId.trim()) {
    addIssue(issues, 'missing_packet_id', 'Packet id is required.');
  }

  if (packet.taskModes.some((mode) => mode === 'lesson' || mode === 'linked_lesson_slice')) {
    addIssue(issues, 'lesson_task_not_allowed', 'Personal Plan generated packets cannot include lesson tasks.');
  }

  if (!packet.selectedDailyTimeAffectsTasks) {
    addIssue(issues, 'time_based_task_selection_required_for_visible_slice', 'Selected daily time must choose the initial visible task count.');
  }

  if (packet.productionReady) {
    addIssue(issues, 'production_ready_not_allowed', 'Generated packets cannot mark themselves production-ready.');
  }

  const generationModes = packet.taskModes.filter((mode): mode is PersonalPlanGenerationMode => allowedModes.has(mode as PersonalPlanGenerationMode));
  const missingModes = GENERATION_MODE_CONTRACT
    .map((mode) => mode.mode)
    .filter((mode) => !generationModes.includes(mode));
  if (missingModes.length > 0) {
    addIssue(issues, 'missing_maximum_day_mode_pool', `Generated day is missing maximum-pool modes: ${missingModes.join(', ')}`);
  }

  for (const mode of packet.taskModes) {
    if (mode !== 'lesson' && mode !== 'linked_lesson_slice' && !allowedModes.has(mode)) {
      addIssue(issues, 'unknown_mode', `Unknown mode: ${mode}`);
    }
  }

  if (packet.phrases.length < 6) {
    addIssue(issues, 'too_few_phrases', 'At least 6 phrase candidates are required before review.');
  }

  const seenPhrases = new Set<string>();
  for (const phrase of packet.phrases) {
    const normalized = normalizedPhrase(phrase.english);
    if (!phrase.id.trim() || !phrase.english.trim() || !phrase.translation.trim() || !phrase.teachingNote.trim()) {
      addIssue(issues, 'missing_phrase_fields', 'Every phrase needs id, English text, translation, and teaching note.');
    }
    if (seenPhrases.has(normalized)) {
      addIssue(issues, 'duplicate_phrase_text', `Duplicate phrase text: ${phrase.english}`);
    }
    seenPhrases.add(normalized);

    const userFacingCopy = `${phrase.english}\n${phrase.translation}\n${phrase.teachingNote}`;
    if (technicalCopyPattern.test(userFacingCopy)) {
      addIssue(issues, 'technical_placeholder_copy', 'Phrase copy contains placeholder or internal technical language.');
    }
  }

  return {
    status: issues.length === 0 ? 'valid_needs_review' : 'invalid',
    issueCodes: [...new Set(issues.map((issue) => issue.code))],
    issues,
  };
}
