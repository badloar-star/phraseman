import {
  validateGeneratedDayPacket,
  type GeneratedDayPacketValidationResult,
  type GeneratedPersonalPlanDayPacket,
} from './personal_plan_generation_contract';
import {
  buildGeneratedPacketReviewInput,
  reviewGeneratedDayPacket,
  type GeneratedPacketReviewResult,
} from './personal_plan_generation_review_workflow';
import {
  buildGeneratedPacketSourceIntakePreflight,
  type GeneratedPacketSourceIntakePreflight,
} from './personal_plan_generation_source_intake_preflight';
import {
  buildGeneratedContentImportFormat,
  validateGeneratedContentImportFormat,
  type GeneratedContentImportFormat,
  type GeneratedContentImportValidation,
} from './personal_plan_generation_import_format';
import {
  buildRuntimeSourceWriteGuard,
  validateRuntimeSourceWriteGuard,
  type RuntimeSourceWriteGuard,
  type RuntimeSourceWriteGuardValidation,
} from './personal_plan_generation_runtime_source_write_guard';
import { getPersonalPlanPhraseLesson } from './personal_plan_phrase_lessons';

export type PersonalPlanGenerationDryRunHarnessOptions = {
  packet: GeneratedPersonalPlanDayPacket;
  reviewerId: string;
  reviewedAt: string;
};

export type PersonalPlanGenerationDryRunHarnessIssueCode =
  | 'packet_validation_failed'
  | 'review_not_approved'
  | 'source_intake_not_ready'
  | 'import_format_not_ready'
  | 'import_format_validation_failed'
  | 'runtime_source_guard_invalid'
  | 'source_runtime_write_not_allowed'
  | 'live_registration_not_allowed'
  | 'generated_content_creation_not_allowed'
  | 'production_ready_not_allowed'
  | 'source_family_write_detected';

export type PersonalPlanGenerationDryRunHarnessReport = {
  kind: 'personal_plan_generation_dry_run_harness_report';
  status: 'valid_non_live_dry_run' | 'blocked';
  packetId: string;
  packetValidation: GeneratedDayPacketValidationResult;
  review: GeneratedPacketReviewResult;
  sourceIntake: GeneratedPacketSourceIntakePreflight;
  importFormat: GeneratedContentImportFormat;
  importFormatValidation: GeneratedContentImportValidation;
  runtimeSourceGuard: RuntimeSourceWriteGuard;
  runtimeSourceGuardValidation: RuntimeSourceWriteGuardValidation;
  issueCodes: PersonalPlanGenerationDryRunHarnessIssueCode[];
  writtenSourceFamilies: string[];
  sourceRuntimeWriteAllowed: false;
  liveRegistrationAllowed: false;
  generatedContentCreationAllowed: false;
  productionReady: false;
  nextRequiredStep: 'bulk_generation_review_queue' | 'regenerate_or_rewrite_packet';
};

export type PersonalPlanGenerationDryRunHarnessValidation = {
  status: 'valid_non_live_dry_run' | 'invalid';
  issueCodes: PersonalPlanGenerationDryRunHarnessIssueCode[];
  sourceRuntimeWriteAllowed: false;
  liveRegistrationAllowed: false;
  nextRequiredStep: 'bulk_generation_review_queue' | 'regenerate_or_rewrite_packet';
};

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export function buildDryRunSampleGeneratedDayPacket(
  overrides: Partial<GeneratedPersonalPlanDayPacket> = {},
): GeneratedPersonalPlanDayPacket {
  return {
    packetId: 'mitap_d022_dry_run_packet',
    planId: 'mitap',
    dayIndex: 22,
    weekIndex: 4,
    dayTheme: 'Free answer status update',
    weekRole: 'week_4_free_answer',
    selectedDailyTimeAffectsTasks: true,
    productionReady: false,
    reviewStatus: 'needs_review',
    taskModes: [
      'plan_phrase_build',
      'plan_missing_word',
      'plan_choose_natural_phrase',
      'plan_listen_choose',
      'plan_listen_build',
      'plan_pronunciation_repeat',
      'plan_phrase_recall',
      'plan_quiz',
    ],
    phrases: [
      { id: 'mitap_d022_phrase_1', english: 'The first part is done.', translation: 'Первая часть готова.', teachingNote: 'First part is a simple way to split status.' },
      { id: 'mitap_d022_phrase_2', english: 'I need to check one thing.', translation: 'Мне нужно проверить одну вещь.', teachingNote: 'One thing keeps the blocker small.' },
      { id: 'mitap_d022_phrase_3', english: 'It is almost ready.', translation: 'Это почти готово.', teachingNote: 'Almost ready avoids over-promising.' },
      { id: 'mitap_d022_phrase_4', english: 'I will update you soon.', translation: 'Я скоро дам обновление.', teachingNote: 'Update means a short status message.' },
      { id: 'mitap_d022_phrase_5', english: 'Please check the latest version.', translation: 'Проверьте последнюю версию.', teachingNote: 'Latest version means the newest file or draft.' },
      { id: 'mitap_d022_phrase_6', english: 'I will send the file soon.', translation: 'Я скоро отправлю файл.', teachingNote: 'Send the file is more specific than update.' },
    ],
    recallLinks: [{ fromDayIndex: 10, phraseIds: ['mitap_d010_phrase_1', 'mitap_d010_phrase_2'] }],
    audioNeeds: [{ mode: 'plan_phrase_build', status: 'not_required' }],
    pronunciationNeeds: [{ mode: 'plan_phrase_recall', status: 'blocked_until_scorer_evidence' }],
    blockers: ['pronunciation_scorer_missing', 'content_review_required_before_source_intake'],
    ...overrides,
  };
}

export function buildVoyazhDay1GeneratedDayPacket(
  overrides: Partial<GeneratedPersonalPlanDayPacket> = {},
): GeneratedPersonalPlanDayPacket {
  const lesson = getPersonalPlanPhraseLesson('voyazh_d001_content_unit');

  return {
    packetId: 'voyazh_d001_generator_packet',
    planId: 'voyazh',
    dayIndex: 1,
    weekIndex: 1,
    dayTheme: 'Аэропорт: попросить помощь',
    weekRole: 'first_usable_phrases',
    selectedDailyTimeAffectsTasks: true,
    productionReady: false,
    reviewStatus: 'needs_review',
    taskModes: [
      'plan_phrase_build',
      'plan_missing_word',
      'plan_choose_natural_phrase',
      'plan_listen_choose',
      'plan_listen_build',
      'plan_pronunciation_repeat',
      'plan_phrase_recall',
      'plan_quiz',
    ],
    phrases: (lesson?.phrases ?? []).map((phrase) => ({
      id: String(phrase.id),
      english: phrase.english,
      translation: phrase.russian,
      teachingNote: phrase.words.find((word) => word.teachingNote)?.teachingNote?.correctRu
        ?? 'Use the whole short phrase first, then practice the separate words.',
    })),
    recallLinks: [{ fromDayIndex: 1, phraseIds: ['voyazh_d001_content_unit_phrase_1', 'voyazh_d001_content_unit_phrase_2'] }],
    audioNeeds: [
      { mode: 'plan_listen_choose', status: 'blocked_until_audio_approved' },
      { mode: 'plan_listen_build', status: 'blocked_until_audio_approved' },
    ],
    pronunciationNeeds: [{ mode: 'plan_pronunciation_repeat', status: 'blocked_until_scorer_evidence' }],
    blockers: ['audio_approval_required_before_live', 'pronunciation_scorer_missing'],
    ...overrides,
  };
}

export function buildVoyazhDay2GeneratedDayPacket(
  overrides: Partial<GeneratedPersonalPlanDayPacket> = {},
): GeneratedPersonalPlanDayPacket {
  const lesson = getPersonalPlanPhraseLesson('voyazh_d002_content_unit');

  return {
    packetId: 'voyazh_d002_generator_packet',
    planId: 'voyazh',
    dayIndex: 2,
    weekIndex: 1,
    dayTheme: 'Паспортный контроль',
    weekRole: 'first_usable_phrases',
    selectedDailyTimeAffectsTasks: true,
    productionReady: false,
    reviewStatus: 'needs_review',
    taskModes: [
      'plan_phrase_build',
      'plan_missing_word',
      'plan_choose_natural_phrase',
      'plan_listen_choose',
      'plan_listen_build',
      'plan_pronunciation_repeat',
      'plan_phrase_recall',
      'plan_quiz',
    ],
    phrases: (lesson?.phrases ?? []).map((phrase) => ({
      id: String(phrase.id),
      english: phrase.english,
      translation: phrase.russian,
      teachingNote: phrase.words.find((word) => word.teachingNote)?.teachingNote?.correctRu
        ?? 'Use the whole short phrase first, then practice the separate words.',
    })),
    recallLinks: [{ fromDayIndex: 1, phraseIds: ['voyazh_d001_content_unit_phrase_1', 'voyazh_d001_content_unit_phrase_2'] }],
    audioNeeds: [
      { mode: 'plan_listen_choose', status: 'blocked_until_audio_approved' },
      { mode: 'plan_listen_build', status: 'blocked_until_audio_approved' },
    ],
    pronunciationNeeds: [{ mode: 'plan_pronunciation_repeat', status: 'blocked_until_scorer_evidence' }],
    blockers: ['audio_approval_required_before_live', 'pronunciation_scorer_missing'],
    ...overrides,
  };
}

export function buildVoyazhDay3GeneratedDayPacket(
  overrides: Partial<GeneratedPersonalPlanDayPacket> = {},
): GeneratedPersonalPlanDayPacket {
  const lesson = getPersonalPlanPhraseLesson('voyazh_d003_content_unit');

  return {
    packetId: 'voyazh_d003_generator_packet',
    planId: 'voyazh',
    dayIndex: 3,
    weekIndex: 1,
    dayTheme: 'Багаж и регистрация',
    weekRole: 'first_usable_phrases',
    selectedDailyTimeAffectsTasks: true,
    productionReady: false,
    reviewStatus: 'needs_review',
    taskModes: [
      'plan_phrase_build',
      'plan_missing_word',
      'plan_choose_natural_phrase',
      'plan_listen_choose',
      'plan_listen_build',
      'plan_pronunciation_repeat',
      'plan_phrase_recall',
      'plan_quiz',
    ],
    phrases: (lesson?.phrases ?? []).map((phrase) => ({
      id: String(phrase.id),
      english: phrase.english,
      translation: phrase.russian,
      teachingNote: phrase.words.find((word) => word.teachingNote)?.teachingNote?.correctRu
        ?? 'Use the whole short phrase first, then practice the separate words.',
    })),
    recallLinks: [{ fromDayIndex: 2, phraseIds: ['voyazh_d002_content_unit_phrase_1', 'voyazh_d002_content_unit_phrase_2'] }],
    audioNeeds: [
      { mode: 'plan_listen_choose', status: 'blocked_until_audio_approved' },
      { mode: 'plan_listen_build', status: 'blocked_until_audio_approved' },
    ],
    pronunciationNeeds: [{ mode: 'plan_pronunciation_repeat', status: 'blocked_until_scorer_evidence' }],
    blockers: ['audio_approval_required_before_live', 'pronunciation_scorer_missing'],
    ...overrides,
  };
}

export function buildMitapDay1GeneratedDayPacket(
  overrides: Partial<GeneratedPersonalPlanDayPacket> = {},
): GeneratedPersonalPlanDayPacket {
  const lesson = getPersonalPlanPhraseLesson('mitap_d001_content_unit');

  return {
    packetId: 'mitap_d001_generator_packet',
    planId: 'mitap',
    dayIndex: 1,
    weekIndex: 1,
    dayTheme: 'Созвон: зафиксировать next steps',
    weekRole: 'first_usable_phrases',
    selectedDailyTimeAffectsTasks: true,
    productionReady: false,
    reviewStatus: 'needs_review',
    taskModes: [
      'plan_phrase_build',
      'plan_missing_word',
      'plan_choose_natural_phrase',
      'plan_listen_choose',
      'plan_listen_build',
      'plan_pronunciation_repeat',
      'plan_phrase_recall',
      'plan_quiz',
    ],
    phrases: (lesson?.phrases ?? []).map((phrase) => ({
      id: String(phrase.id),
      english: phrase.english,
      translation: phrase.russian,
      teachingNote: phrase.words.find((word) => word.teachingNote)?.teachingNote?.correctRu
        ?? 'Use the whole short phrase first, then practice the separate words.',
    })),
    recallLinks: [{ fromDayIndex: 1, phraseIds: ['mitap_d001_content_unit_phrase_1', 'mitap_d001_content_unit_phrase_2'] }],
    audioNeeds: [
      { mode: 'plan_listen_choose', status: 'blocked_until_audio_approved' },
      { mode: 'plan_listen_build', status: 'blocked_until_audio_approved' },
    ],
    pronunciationNeeds: [{ mode: 'plan_pronunciation_repeat', status: 'blocked_until_scorer_evidence' }],
    blockers: ['audio_approval_required_before_live', 'pronunciation_scorer_missing'],
    ...overrides,
  };
}

export function buildMitapDay2GeneratedDayPacket(
  overrides: Partial<GeneratedPersonalPlanDayPacket> = {},
): GeneratedPersonalPlanDayPacket {
  const lesson = getPersonalPlanPhraseLesson('mitap_d002_content_unit');

  return {
    packetId: 'mitap_d002_generator_packet',
    planId: 'mitap',
    dayIndex: 2,
    weekIndex: 1,
    dayTheme: 'Короткий standup update',
    weekRole: 'first_usable_phrases',
    selectedDailyTimeAffectsTasks: true,
    productionReady: false,
    reviewStatus: 'needs_review',
    taskModes: [
      'plan_phrase_build',
      'plan_missing_word',
      'plan_choose_natural_phrase',
      'plan_listen_choose',
      'plan_listen_build',
      'plan_pronunciation_repeat',
      'plan_phrase_recall',
      'plan_quiz',
    ],
    phrases: (lesson?.phrases ?? []).map((phrase) => ({
      id: String(phrase.id),
      english: phrase.english,
      translation: phrase.russian,
      teachingNote: phrase.words.find((word) => word.teachingNote)?.teachingNote?.correctRu
        ?? 'Use the whole short phrase first, then practice the separate words.',
    })),
    recallLinks: [{ fromDayIndex: 1, phraseIds: ['mitap_d001_content_unit_phrase_1', 'mitap_d001_content_unit_phrase_2'] }],
    audioNeeds: [
      { mode: 'plan_listen_choose', status: 'blocked_until_audio_approved' },
      { mode: 'plan_listen_build', status: 'blocked_until_audio_approved' },
    ],
    pronunciationNeeds: [{ mode: 'plan_pronunciation_repeat', status: 'blocked_until_scorer_evidence' }],
    blockers: ['audio_approval_required_before_live', 'pronunciation_scorer_missing'],
    ...overrides,
  };
}

export function buildGavanDay1GeneratedDayPacket(
  overrides: Partial<GeneratedPersonalPlanDayPacket> = {},
): GeneratedPersonalPlanDayPacket {
  const lesson = getPersonalPlanPhraseLesson('gavan_d001_content_unit');

  return {
    packetId: 'gavan_d001_generator_packet',
    planId: 'gavan',
    dayIndex: 1,
    weekIndex: 1,
    dayTheme: 'Короткие ответы',
    weekRole: 'first_usable_phrases',
    selectedDailyTimeAffectsTasks: true,
    productionReady: false,
    reviewStatus: 'needs_review',
    taskModes: [
      'plan_phrase_build',
      'plan_missing_word',
      'plan_choose_natural_phrase',
      'plan_listen_choose',
      'plan_listen_build',
      'plan_pronunciation_repeat',
      'plan_phrase_recall',
      'plan_quiz',
    ],
    phrases: (lesson?.phrases ?? []).map((phrase) => ({
      id: String(phrase.id),
      english: phrase.english,
      translation: phrase.russian,
      teachingNote: phrase.words.find((word) => word.teachingNote)?.teachingNote?.correctRu
        ?? 'Use the whole short phrase first, then practice the separate words.',
    })),
    recallLinks: [{ fromDayIndex: 1, phraseIds: ['gavan_d001_content_unit_phrase_1', 'gavan_d001_content_unit_phrase_2'] }],
    audioNeeds: [
      { mode: 'plan_listen_choose', status: 'blocked_until_audio_approved' },
      { mode: 'plan_listen_build', status: 'blocked_until_audio_approved' },
    ],
    pronunciationNeeds: [{ mode: 'plan_pronunciation_repeat', status: 'blocked_until_scorer_evidence' }],
    blockers: ['audio_approval_required_before_live', 'pronunciation_scorer_missing'],
    ...overrides,
  };
}

export function buildGavanDay2GeneratedDayPacket(
  overrides: Partial<GeneratedPersonalPlanDayPacket> = {},
): GeneratedPersonalPlanDayPacket {
  const lesson = getPersonalPlanPhraseLesson('gavan_d002_content_unit');

  return {
    packetId: 'gavan_d002_generator_packet',
    planId: 'gavan',
    dayIndex: 2,
    weekIndex: 1,
    dayTheme: 'Postcode и номер квартиры',
    weekRole: 'first_usable_phrases',
    selectedDailyTimeAffectsTasks: true,
    productionReady: false,
    reviewStatus: 'needs_review',
    taskModes: [
      'plan_phrase_build',
      'plan_missing_word',
      'plan_choose_natural_phrase',
      'plan_listen_choose',
      'plan_listen_build',
      'plan_pronunciation_repeat',
      'plan_phrase_recall',
      'plan_quiz',
    ],
    phrases: (lesson?.phrases ?? []).map((phrase) => ({
      id: String(phrase.id),
      english: phrase.english,
      translation: phrase.russian,
      teachingNote: phrase.words.find((word) => word.teachingNote)?.teachingNote?.correctRu
        ?? 'Use the whole short phrase first, then practice the separate words.',
    })),
    recallLinks: [{ fromDayIndex: 1, phraseIds: ['gavan_d001_content_unit_phrase_1', 'gavan_d001_content_unit_phrase_2'] }],
    audioNeeds: [
      { mode: 'plan_listen_choose', status: 'blocked_until_audio_approved' },
      { mode: 'plan_listen_build', status: 'blocked_until_audio_approved' },
    ],
    pronunciationNeeds: [{ mode: 'plan_pronunciation_repeat', status: 'blocked_until_scorer_evidence' }],
    blockers: ['audio_approval_required_before_live', 'pronunciation_scorer_missing'],
    ...overrides,
  };
}

export function buildImpulsDay1GeneratedDayPacket(
  overrides: Partial<GeneratedPersonalPlanDayPacket> = {},
): GeneratedPersonalPlanDayPacket {
  const lesson = getPersonalPlanPhraseLesson('impuls_d001_content_unit');

  return {
    packetId: 'impuls_d001_generator_packet',
    planId: 'impuls',
    dayIndex: 1,
    weekIndex: 1,
    dayTheme: 'Короткая история',
    weekRole: 'first_usable_phrases',
    selectedDailyTimeAffectsTasks: true,
    productionReady: false,
    reviewStatus: 'needs_review',
    taskModes: [
      'plan_phrase_build',
      'plan_missing_word',
      'plan_choose_natural_phrase',
      'plan_listen_choose',
      'plan_listen_build',
      'plan_pronunciation_repeat',
      'plan_phrase_recall',
      'plan_quiz',
    ],
    phrases: (lesson?.phrases ?? []).map((phrase) => ({
      id: String(phrase.id),
      english: phrase.english,
      translation: phrase.russian,
      teachingNote: phrase.words.find((word) => word.teachingNote)?.teachingNote?.correctRu
        ?? 'Use the whole short phrase first, then practice the separate words.',
    })),
    recallLinks: [{ fromDayIndex: 1, phraseIds: ['impuls_d001_content_unit_phrase_1', 'impuls_d001_content_unit_phrase_2'] }],
    audioNeeds: [
      { mode: 'plan_listen_choose', status: 'blocked_until_audio_approved' },
      { mode: 'plan_listen_build', status: 'blocked_until_audio_approved' },
    ],
    pronunciationNeeds: [{ mode: 'plan_pronunciation_repeat', status: 'blocked_until_scorer_evidence' }],
    blockers: ['audio_approval_required_before_live', 'pronunciation_scorer_missing'],
    ...overrides,
  };
}

export function buildImpulsDay2GeneratedDayPacket(
  overrides: Partial<GeneratedPersonalPlanDayPacket> = {},
): GeneratedPersonalPlanDayPacket {
  const lesson = getPersonalPlanPhraseLesson('impuls_d002_content_unit');

  return {
    packetId: 'impuls_d002_generator_packet',
    planId: 'impuls',
    dayIndex: 2,
    weekIndex: 1,
    dayTheme: 'Сказать мнение',
    weekRole: 'first_usable_phrases',
    selectedDailyTimeAffectsTasks: true,
    productionReady: false,
    reviewStatus: 'needs_review',
    taskModes: [
      'plan_phrase_build',
      'plan_missing_word',
      'plan_choose_natural_phrase',
      'plan_listen_choose',
      'plan_listen_build',
      'plan_pronunciation_repeat',
      'plan_phrase_recall',
      'plan_quiz',
    ],
    phrases: (lesson?.phrases ?? []).map((phrase) => ({
      id: String(phrase.id),
      english: phrase.english,
      translation: phrase.russian,
      teachingNote: phrase.words.find((word) => word.teachingNote)?.teachingNote?.correctRu
        ?? 'Use the whole short phrase first, then practice the separate words.',
    })),
    recallLinks: [{ fromDayIndex: 1, phraseIds: ['impuls_d001_content_unit_phrase_1', 'impuls_d001_content_unit_phrase_2'] }],
    audioNeeds: [
      { mode: 'plan_listen_choose', status: 'blocked_until_audio_approved' },
      { mode: 'plan_listen_build', status: 'blocked_until_audio_approved' },
    ],
    pronunciationNeeds: [{ mode: 'plan_pronunciation_repeat', status: 'blocked_until_scorer_evidence' }],
    blockers: ['audio_approval_required_before_live', 'pronunciation_scorer_missing'],
    ...overrides,
  };
}

export function buildEchoDay1GeneratedDayPacket(
  overrides: Partial<GeneratedPersonalPlanDayPacket> = {},
): GeneratedPersonalPlanDayPacket {
  const lesson = getPersonalPlanPhraseLesson('echo_d001_content_unit');

  return {
    packetId: 'echo_d001_generator_packet',
    planId: 'echo',
    dayIndex: 1,
    weekIndex: 1,
    dayTheme: 'Повторить и уточнить услышанное',
    weekRole: 'first_usable_phrases',
    selectedDailyTimeAffectsTasks: true,
    productionReady: false,
    reviewStatus: 'needs_review',
    taskModes: [
      'plan_phrase_build',
      'plan_missing_word',
      'plan_choose_natural_phrase',
      'plan_listen_choose',
      'plan_listen_build',
      'plan_pronunciation_repeat',
      'plan_phrase_recall',
      'plan_quiz',
    ],
    phrases: (lesson?.phrases ?? []).map((phrase) => ({
      id: String(phrase.id),
      english: phrase.english,
      translation: phrase.russian,
      teachingNote: phrase.words.find((word) => word.teachingNote)?.teachingNote?.correctRu
        ?? 'Use the whole short phrase first, then practice the separate words.',
    })),
    recallLinks: [{ fromDayIndex: 1, phraseIds: ['echo_d001_content_unit_phrase_1', 'echo_d001_content_unit_phrase_2'] }],
    audioNeeds: [
      { mode: 'plan_listen_choose', status: 'blocked_until_audio_approved' },
      { mode: 'plan_listen_build', status: 'blocked_until_audio_approved' },
    ],
    pronunciationNeeds: [{ mode: 'plan_pronunciation_repeat', status: 'blocked_until_scorer_evidence' }],
    blockers: ['audio_approval_required_before_live', 'pronunciation_scorer_missing'],
    ...overrides,
  };
}

export function buildEchoDay2GeneratedDayPacket(
  overrides: Partial<GeneratedPersonalPlanDayPacket> = {},
): GeneratedPersonalPlanDayPacket {
  const lesson = getPersonalPlanPhraseLesson('echo_d002_content_unit');

  return {
    packetId: 'echo_d002_generator_packet',
    planId: 'echo',
    dayIndex: 2,
    weekIndex: 1,
    dayTheme: 'Ответить коротко',
    weekRole: 'first_usable_phrases',
    selectedDailyTimeAffectsTasks: true,
    productionReady: false,
    reviewStatus: 'needs_review',
    taskModes: [
      'plan_phrase_build',
      'plan_missing_word',
      'plan_choose_natural_phrase',
      'plan_listen_choose',
      'plan_listen_build',
      'plan_pronunciation_repeat',
      'plan_phrase_recall',
      'plan_quiz',
    ],
    phrases: (lesson?.phrases ?? []).map((phrase) => ({
      id: String(phrase.id),
      english: phrase.english,
      translation: phrase.russian,
      teachingNote: phrase.words.find((word) => word.teachingNote)?.teachingNote?.correctRu
        ?? 'Use the whole short phrase first, then practice the separate words.',
    })),
    recallLinks: [{ fromDayIndex: 1, phraseIds: ['echo_d001_content_unit_phrase_1', 'echo_d001_content_unit_phrase_2'] }],
    audioNeeds: [
      { mode: 'plan_listen_choose', status: 'blocked_until_audio_approved' },
      { mode: 'plan_listen_build', status: 'blocked_until_audio_approved' },
    ],
    pronunciationNeeds: [{ mode: 'plan_pronunciation_repeat', status: 'blocked_until_scorer_evidence' }],
    blockers: ['audio_approval_required_before_live', 'pronunciation_scorer_missing'],
    ...overrides,
  };
}

export function runPersonalPlanGenerationDryRunHarness(
  options: PersonalPlanGenerationDryRunHarnessOptions,
): PersonalPlanGenerationDryRunHarnessReport {
  const packetValidation = validateGeneratedDayPacket(options.packet);
  const reviewInput = buildGeneratedPacketReviewInput({
    packets: [options.packet],
    reviewerId: options.reviewerId,
    reviewedAt: options.reviewedAt,
    decision: 'approve_for_source_intake',
    notes: 'Dry-run approval for non-live harness only.',
  });
  const review = reviewGeneratedDayPacket(options.packet, reviewInput);
  const approvedPackets = review.approvedPacket ? [review.approvedPacket] : [];
  const sourceIntake = buildGeneratedPacketSourceIntakePreflight({
    kind: 'personal_plan_generated_packet_approval_bundle',
    approvedPackets,
  });
  const importFormat = buildGeneratedContentImportFormat(sourceIntake, [options.packet]);
  const importFormatValidation = validateGeneratedContentImportFormat(importFormat);
  const runtimeSourceGuard = buildRuntimeSourceWriteGuard(importFormat);
  const runtimeSourceGuardValidation = validateRuntimeSourceWriteGuard(runtimeSourceGuard);

  const issueCodes: PersonalPlanGenerationDryRunHarnessIssueCode[] = [];
  if (packetValidation.status !== 'valid_needs_review') issueCodes.push('packet_validation_failed');
  if (review.status !== 'approved_for_source_intake') issueCodes.push('review_not_approved');
  if (sourceIntake.status !== 'ready_for_import_format_design') issueCodes.push('source_intake_not_ready');
  if (importFormat.status !== 'ready_for_runtime_write_guard') issueCodes.push('import_format_not_ready');
  if (importFormatValidation.status !== 'valid_non_live_import_format') issueCodes.push('import_format_validation_failed');
  if (runtimeSourceGuardValidation.status !== 'valid_hold_guard') issueCodes.push('runtime_source_guard_invalid');

  return {
    kind: 'personal_plan_generation_dry_run_harness_report',
    status: issueCodes.length === 0 ? 'valid_non_live_dry_run' : 'blocked',
    packetId: options.packet.packetId,
    packetValidation,
    review,
    sourceIntake,
    importFormat,
    importFormatValidation,
    runtimeSourceGuard,
    runtimeSourceGuardValidation,
    issueCodes: unique(issueCodes),
    writtenSourceFamilies: [],
    sourceRuntimeWriteAllowed: false,
    liveRegistrationAllowed: false,
    generatedContentCreationAllowed: false,
    productionReady: false,
    nextRequiredStep: issueCodes.length === 0 ? 'bulk_generation_review_queue' : 'regenerate_or_rewrite_packet',
  };
}

export function validatePersonalPlanGenerationDryRunHarnessReport(
  report: PersonalPlanGenerationDryRunHarnessReport,
): PersonalPlanGenerationDryRunHarnessValidation {
  const issueCodes: PersonalPlanGenerationDryRunHarnessIssueCode[] = [...report.issueCodes];

  if ((report as { sourceRuntimeWriteAllowed?: boolean }).sourceRuntimeWriteAllowed) {
    issueCodes.push('source_runtime_write_not_allowed');
  }
  if ((report as { liveRegistrationAllowed?: boolean }).liveRegistrationAllowed) {
    issueCodes.push('live_registration_not_allowed');
  }
  if ((report as { generatedContentCreationAllowed?: boolean }).generatedContentCreationAllowed) {
    issueCodes.push('generated_content_creation_not_allowed');
  }
  if ((report as { productionReady?: boolean }).productionReady) {
    issueCodes.push('production_ready_not_allowed');
  }
  if (report.writtenSourceFamilies.length > 0) {
    issueCodes.push('source_family_write_detected');
  }

  if (report.packetValidation.status !== 'valid_needs_review') issueCodes.push('packet_validation_failed');
  if (report.review.status !== 'approved_for_source_intake') issueCodes.push('review_not_approved');
  if (report.sourceIntake.status !== 'ready_for_import_format_design') issueCodes.push('source_intake_not_ready');
  if (report.importFormat.status !== 'ready_for_runtime_write_guard') issueCodes.push('import_format_not_ready');
  if (report.importFormatValidation.status !== 'valid_non_live_import_format') issueCodes.push('import_format_validation_failed');
  if (report.runtimeSourceGuardValidation.status !== 'valid_hold_guard') issueCodes.push('runtime_source_guard_invalid');

  const uniqueCodes = unique(issueCodes);
  return {
    status: uniqueCodes.length === 0 ? 'valid_non_live_dry_run' : 'invalid',
    issueCodes: uniqueCodes,
    sourceRuntimeWriteAllowed: false,
    liveRegistrationAllowed: false,
    nextRequiredStep: uniqueCodes.length === 0 ? 'bulk_generation_review_queue' : 'regenerate_or_rewrite_packet',
  };
}
