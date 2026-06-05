import {
  buildGeneratedPacketReviewInput,
  reviewGeneratedDayPacket,
} from '../app/personal_plan_generation_review_workflow';
import {
  buildGeneratedPacketSourceIntakePreflight,
  validateGeneratedPacketSourceIntakePreflight,
} from '../app/personal_plan_generation_source_intake_preflight';
import type { GeneratedPersonalPlanDayPacket } from '../app/personal_plan_generation_contract';

function packet(overrides: Partial<GeneratedPersonalPlanDayPacket> = {}): GeneratedPersonalPlanDayPacket {
  return {
    packetId: 'voyazh_d009_packet',
    planId: 'voyazh',
    dayIndex: 9,
    weekIndex: 2,
    dayTheme: 'Ask for timing help',
    weekRole: 'timing_listening',
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
      { id: 'voyazh_d009_phrase_1', english: 'What time does it leave?', translation: 'Во сколько это отправляется?', teachingNote: 'Leave is used for transport departure time.' },
      { id: 'voyazh_d009_phrase_2', english: 'Can you help me with the time?', translation: 'Можете помочь мне со временем?', teachingNote: 'With the time makes the request specific.' },
      { id: 'voyazh_d009_phrase_3', english: 'I need the next bus.', translation: 'Мне нужен следующий автобус.', teachingNote: 'Next bus means the closest upcoming bus.' },
      { id: 'voyazh_d009_phrase_4', english: 'Is this the right platform?', translation: 'Это правильная платформа?', teachingNote: 'Right means correct in this question.' },
      { id: 'voyazh_d009_phrase_5', english: 'Please show me the schedule.', translation: 'Пожалуйста, покажите расписание.', teachingNote: 'Schedule is the list of times.' },
      { id: 'voyazh_d009_phrase_6', english: 'I can wait ten minutes.', translation: 'Я могу подождать десять минут.', teachingNote: 'Can wait keeps the tone calm.' },
    ],
    recallLinks: [{ fromDayIndex: 2, phraseIds: ['voyazh_d002_phrase_1'] }],
    audioNeeds: [
      { mode: 'plan_listen_choose', status: 'not_required' },
      { mode: 'plan_listen_build', status: 'not_required' },
    ],
    pronunciationNeeds: [{ mode: 'plan_pronunciation_repeat', status: 'not_required' }],
    blockers: [],
    ...overrides,
  };
}

function approvedBundle() {
  const basePacket = packet();
  const reviewInput = buildGeneratedPacketReviewInput({
    packets: [basePacket],
    reviewerId: 'content-reviewer-1',
    reviewedAt: '2026-06-05T13:00:00.000Z',
    decision: 'approve_for_source_intake',
    notes: 'Approved for intake preflight only.',
  });
  const approved = reviewGeneratedDayPacket(basePacket, reviewInput).approvedPacket;
  if (!approved) throw new Error('Expected approved packet fixture.');
  return {
    kind: 'personal_plan_generated_packet_approval_bundle' as const,
    approvedPackets: [approved],
  };
}

describe('personal plan generation source-intake preflight', () => {
  it('builds a non-live preflight from approved packets without writing source/runtime', () => {
    const preflight = buildGeneratedPacketSourceIntakePreflight(approvedBundle());

    expect(preflight.kind).toBe('personal_plan_generated_packet_source_intake_preflight');
    expect(preflight.status).toBe('ready_for_import_format_design');
    expect(preflight.sourceRuntimeWriteAllowed).toBe(false);
    expect(preflight.liveRegistrationAllowed).toBe(false);
    expect(preflight.generatedContentCreationAllowed).toBe(false);
    expect(preflight.rows).toHaveLength(1);
    expect(preflight.rows[0]).toEqual(expect.objectContaining({
      packetId: 'voyazh_d009_packet',
      planId: 'voyazh',
      dayIndex: 9,
      intakeStatus: 'accepted_for_import_format_design',
      nextRequiredStep: 'content_packet_import_format',
    }));
  });

  it('validates the preflight and keeps import design separate from runtime integration', () => {
    const preflight = buildGeneratedPacketSourceIntakePreflight(approvedBundle());
    const validation = validateGeneratedPacketSourceIntakePreflight(preflight);

    expect(validation).toEqual({
      status: 'valid_non_live_source_intake_preflight',
      issueCodes: [],
      acceptedRows: 1,
      blockedRows: 0,
      sourceRuntimeWriteAllowed: false,
      liveRegistrationAllowed: false,
      nextRequiredStep: 'content_packet_import_format',
    });
  });

  it('blocks invalid bundles, checksum drift, source writes, live registration, and unapproved packets', () => {
    const preflight = buildGeneratedPacketSourceIntakePreflight(approvedBundle());

    expect(validateGeneratedPacketSourceIntakePreflight({
      ...preflight,
      sourceRuntimeWriteAllowed: true as any,
    }).issueCodes).toContain('source_runtime_write_not_allowed');

    expect(validateGeneratedPacketSourceIntakePreflight({
      ...preflight,
      liveRegistrationAllowed: true as any,
    }).issueCodes).toContain('live_registration_not_allowed');

    expect(validateGeneratedPacketSourceIntakePreflight({
      ...preflight,
      rows: [{ ...preflight.rows[0], packetChecksum: '0000000000000000' }],
    }).issueCodes).toContain('packet_checksum_mismatch');

    expect(validateGeneratedPacketSourceIntakePreflight({
      ...preflight,
      rows: [{ ...preflight.rows[0], intakeStatus: 'blocked_unapproved_packet' }],
    }).issueCodes).toContain('unapproved_packet_not_allowed');
  });
});
