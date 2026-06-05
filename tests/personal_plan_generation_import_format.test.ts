import {
  buildGeneratedPacketReviewInput,
  reviewGeneratedDayPacket,
} from '../app/personal_plan_generation_review_workflow';
import {
  buildGeneratedPacketSourceIntakePreflight,
} from '../app/personal_plan_generation_source_intake_preflight';
import {
  buildGeneratedContentImportFormat,
  validateGeneratedContentImportFormat,
} from '../app/personal_plan_generation_import_format';
import type { GeneratedPersonalPlanDayPacket } from '../app/personal_plan_generation_contract';

const ALL_GENERATION_MODES: GeneratedPersonalPlanDayPacket['taskModes'] = [
  'plan_phrase_build',
  'plan_missing_word',
  'plan_choose_natural_phrase',
  'plan_listen_choose',
  'plan_listen_build',
  'plan_pronunciation_repeat',
  'plan_phrase_recall',
  'plan_quiz',
];

function packet(overrides: Partial<GeneratedPersonalPlanDayPacket> = {}): GeneratedPersonalPlanDayPacket {
  return {
    packetId: 'impuls_d010_packet',
    planId: 'impuls',
    dayIndex: 10,
    weekIndex: 2,
    dayTheme: 'Build a short reply',
    weekRole: 'short_reply_build',
    selectedDailyTimeAffectsTasks: true,
    productionReady: false,
    reviewStatus: 'needs_review',
    taskModes: ALL_GENERATION_MODES,
    phrases: [
      { id: 'impuls_d010_phrase_1', english: 'I need a second.', translation: 'Мне нужна секунда.', teachingNote: 'A second is a natural tiny pause.' },
      { id: 'impuls_d010_phrase_2', english: 'Let me answer clearly.', translation: 'Дайте ответить ясно.', teachingNote: 'Clearly tells how you want to answer.' },
      { id: 'impuls_d010_phrase_3', english: 'The main point is simple.', translation: 'Главная мысль простая.', teachingNote: 'Main point means the central idea.' },
      { id: 'impuls_d010_phrase_4', english: 'I can explain it briefly.', translation: 'Я могу коротко это объяснить.', teachingNote: 'Briefly keeps the answer short.' },
      { id: 'impuls_d010_phrase_5', english: 'That is my quick answer.', translation: 'Это мой быстрый ответ.', teachingNote: 'Quick answer is short and direct.' },
      { id: 'impuls_d010_phrase_6', english: 'I will add one reason.', translation: 'Я добавлю одну причину.', teachingNote: 'One reason keeps the answer controlled.' },
    ],
    recallLinks: [{ fromDayIndex: 4, phraseIds: ['impuls_d004_phrase_1'] }],
    audioNeeds: [
      { mode: 'plan_listen_choose', status: 'not_required' },
      { mode: 'plan_listen_build', status: 'not_required' },
    ],
    pronunciationNeeds: [{ mode: 'plan_pronunciation_repeat', status: 'not_required' }],
    blockers: [],
    ...overrides,
  };
}

function sourcePreflight() {
  const basePacket = packet();
  const reviewInput = buildGeneratedPacketReviewInput({
    packets: [basePacket],
    reviewerId: 'content-reviewer-1',
    reviewedAt: '2026-06-05T14:00:00.000Z',
    decision: 'approve_for_source_intake',
    notes: 'Approved for source-intake only.',
  });
  const approved = reviewGeneratedDayPacket(basePacket, reviewInput).approvedPacket;
  if (!approved) throw new Error('Expected approved packet fixture.');
  return buildGeneratedPacketSourceIntakePreflight({
    kind: 'personal_plan_generated_packet_approval_bundle',
    approvedPackets: [approved],
  });
}

describe('personal plan generation import format', () => {
  it('builds a stable non-live import artifact from source-intake preflight and approved packets', () => {
    const format = buildGeneratedContentImportFormat(sourcePreflight(), [packet()]);

    expect(format.kind).toBe('personal_plan_generated_content_import_format');
    expect(format.status).toBe('ready_for_runtime_write_guard');
    expect(format.sourceRuntimeWriteAllowed).toBe(false);
    expect(format.liveRegistrationAllowed).toBe(false);
    expect(format.generatedContentCreationAllowed).toBe(false);
    expect(format.days).toHaveLength(1);
    expect(format.days[0]).toEqual(expect.objectContaining({
      packetId: 'impuls_d010_packet',
      planId: 'impuls',
      dayIndex: 10,
      weekIndex: 2,
      dayTheme: 'Build a short reply',
      taskModes: ALL_GENERATION_MODES,
      nextRequiredStep: 'runtime_source_write_guard',
    }));
    expect(format.days[0].phrases).toHaveLength(6);
    expect(format.days[0].audioNeeds.every((need) => need.status === 'not_required')).toBe(true);
    expect(format.days[0].pronunciationNeeds[0].status).toBe('not_required');
  });

  it('validates the import format and keeps runtime/source writes blocked', () => {
    const format = buildGeneratedContentImportFormat(sourcePreflight(), [packet()]);

    expect(validateGeneratedContentImportFormat(format)).toEqual({
      status: 'valid_non_live_import_format',
      issueCodes: [],
      dayCount: 1,
      sourceRuntimeWriteAllowed: false,
      liveRegistrationAllowed: false,
      nextRequiredStep: 'runtime_source_write_guard',
    });
  });

  it('blocks missing days, packet drift, duplicate day ids, source writes, live registration, and generation attempts', () => {
    const format = buildGeneratedContentImportFormat(sourcePreflight(), [packet()]);

    expect(validateGeneratedContentImportFormat({
      ...format,
      days: [],
    }).issueCodes).toContain('missing_import_day');

    expect(validateGeneratedContentImportFormat({
      ...format,
      sourceRuntimeWriteAllowed: true as any,
    }).issueCodes).toContain('source_runtime_write_not_allowed');

    expect(validateGeneratedContentImportFormat({
      ...format,
      liveRegistrationAllowed: true as any,
    }).issueCodes).toContain('live_registration_not_allowed');

    expect(validateGeneratedContentImportFormat({
      ...format,
      generatedContentCreationAllowed: true as any,
    }).issueCodes).toContain('generated_content_creation_not_allowed');

    expect(validateGeneratedContentImportFormat({
      ...format,
      days: [format.days[0], format.days[0]],
    }).issueCodes).toContain('duplicate_import_day');

    expect(validateGeneratedContentImportFormat({
      ...format,
      days: [{ ...format.days[0], packetChecksum: '0000000000000000' }],
    }).issueCodes).toContain('packet_checksum_mismatch');
  });
});
