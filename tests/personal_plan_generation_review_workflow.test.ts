import {
  buildGeneratedPacketReviewInput,
  reviewGeneratedDayPacket,
  validateGeneratedPacketApprovalBundle,
} from '../app/personal_plan_generation_review_workflow';
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
    packetId: 'echo_d008_packet',
    planId: 'echo',
    dayIndex: 8,
    weekIndex: 2,
    dayTheme: 'Repeat the useful part',
    weekRole: 'polite_pressure',
    selectedDailyTimeAffectsTasks: true,
    productionReady: false,
    reviewStatus: 'needs_review',
    taskModes: ALL_GENERATION_MODES,
    phrases: [
      { id: 'echo_d008_phrase_1', english: 'Can you repeat the useful part?', translation: 'Можете повторить полезную часть?', teachingNote: 'Useful part keeps attention on the key detail.' },
      { id: 'echo_d008_phrase_2', english: 'I heard the first word.', translation: 'Я услышал первое слово.', teachingNote: 'Heard is the past form for what reached your ear.' },
      { id: 'echo_d008_phrase_3', english: 'I missed the last detail.', translation: 'Я пропустил последнюю деталь.', teachingNote: 'Missed here means did not catch while listening.' },
      { id: 'echo_d008_phrase_4', english: 'Please say that slower.', translation: 'Пожалуйста, скажите это медленнее.', teachingNote: 'Slower asks for speed, not volume.' },
      { id: 'echo_d008_phrase_5', english: 'Now I understand the time.', translation: 'Теперь я понимаю время.', teachingNote: 'Now marks the moment after clarification.' },
      { id: 'echo_d008_phrase_6', english: 'That answer is clear.', translation: 'Этот ответ понятен.', teachingNote: 'Clear means easy to understand.' },
    ],
    recallLinks: [{ fromDayIndex: 1, phraseIds: ['echo_d001_phrase_1'] }],
    audioNeeds: [
      { mode: 'plan_listen_choose', status: 'not_required' },
      { mode: 'plan_listen_build', status: 'not_required' },
    ],
    pronunciationNeeds: [{ mode: 'plan_pronunciation_repeat', status: 'not_required' }],
    blockers: [],
    ...overrides,
  };
}

describe('personal plan generation review workflow', () => {
  it('builds explicit approve/reject review input with packet checksum and reviewer metadata', () => {
    const input = buildGeneratedPacketReviewInput({
      packets: [packet()],
      reviewerId: 'content-reviewer-1',
      reviewedAt: '2026-06-05T12:00:00.000Z',
      decision: 'approve_for_source_intake',
      notes: 'Content is usable after review.',
    });

    expect(input.kind).toBe('personal_plan_generated_packet_review_input');
    expect(input.reviewerId).toBe('content-reviewer-1');
    expect(input.records).toHaveLength(1);
    expect(input.records[0]).toEqual(expect.objectContaining({
      packetId: 'echo_d008_packet',
      decision: 'approve_for_source_intake',
      sourceRuntimeWriteAllowed: false,
      liveRegistrationAllowed: false,
    }));
    expect(input.records[0].packetChecksum).toMatch(/^[a-f0-9]{16}$/);
  });

  it('approves only valid packets and keeps source/runtime intake blocked', () => {
    const input = buildGeneratedPacketReviewInput({
      packets: [packet()],
      reviewerId: 'content-reviewer-1',
      reviewedAt: '2026-06-05T12:00:00.000Z',
      decision: 'approve_for_source_intake',
      notes: 'Approved for source-intake review only.',
    });

    const result = reviewGeneratedDayPacket(packet(), input);

    expect(result.status).toBe('approved_for_source_intake');
    expect(result.sourceRuntimeWriteAllowed).toBe(false);
    expect(result.liveRegistrationAllowed).toBe(false);
    expect(result.approvedPacket?.review.decision).toBe('approve_for_source_intake');
    expect(result.nextRequiredStep).toBe('source_intake_preflight');
    expect(result.issueCodes).toEqual([]);
  });

  it('rejects invalid packets even when review input says approve', () => {
    const invalid = packet({
      taskModes: ['plan_phrase_build', 'lesson'],
    });
    const input = buildGeneratedPacketReviewInput({
      packets: [invalid],
      reviewerId: 'content-reviewer-1',
      reviewedAt: '2026-06-05T12:00:00.000Z',
      decision: 'approve_for_source_intake',
      notes: 'Trying to approve invalid packet.',
    });

    const result = reviewGeneratedDayPacket(invalid, input);

    expect(result.status).toBe('rejected');
    expect(result.issueCodes).toContain('packet_validation_failed');
    expect(result.issueCodes).toContain('lesson_task_not_allowed');
    expect(result.approvedPacket).toBeUndefined();
  });

  it('blocks approval when reviewer metadata, timestamp, record, checksum, or decision are wrong', () => {
    expect(reviewGeneratedDayPacket(packet(), {
      ...buildGeneratedPacketReviewInput({
        packets: [packet()],
        reviewerId: 'content-reviewer-1',
        reviewedAt: '2026-06-05T12:00:00.000Z',
        decision: 'approve_for_source_intake',
        notes: 'Approved.',
      }),
      reviewerId: '',
    }).issueCodes).toContain('missing_reviewer_id');

    expect(reviewGeneratedDayPacket(packet(), buildGeneratedPacketReviewInput({
      packets: [packet()],
      reviewerId: 'content-reviewer-1',
      reviewedAt: 'bad-date',
      decision: 'approve_for_source_intake',
      notes: 'Approved.',
    })).issueCodes).toContain('invalid_review_timestamp');

    const mismatched = buildGeneratedPacketReviewInput({
      packets: [packet()],
      reviewerId: 'content-reviewer-1',
      reviewedAt: '2026-06-05T12:00:00.000Z',
      decision: 'approve_for_source_intake',
      notes: 'Approved.',
    });
    mismatched.records[0].packetChecksum = '0000000000000000';
    expect(reviewGeneratedDayPacket(packet(), mismatched).issueCodes).toContain('packet_checksum_mismatch');

    const rejected = buildGeneratedPacketReviewInput({
      packets: [packet()],
      reviewerId: 'content-reviewer-1',
      reviewedAt: '2026-06-05T12:00:00.000Z',
      decision: 'reject',
      notes: 'Needs rewrite.',
    });
    expect(reviewGeneratedDayPacket(packet(), rejected).status).toBe('rejected');
    expect(reviewGeneratedDayPacket(packet(), rejected).nextRequiredStep).toBe('regenerate_or_rewrite_packet');
  });

  it('validates approval bundles and refuses bundles that imply live/source writes', () => {
    const approved = reviewGeneratedDayPacket(packet(), buildGeneratedPacketReviewInput({
      packets: [packet()],
      reviewerId: 'content-reviewer-1',
      reviewedAt: '2026-06-05T12:00:00.000Z',
      decision: 'approve_for_source_intake',
      notes: 'Approved.',
    })).approvedPacket!;

    expect(validateGeneratedPacketApprovalBundle({ kind: 'personal_plan_generated_packet_approval_bundle', approvedPackets: [approved] })).toEqual({
      status: 'valid_for_source_intake_preflight',
      issueCodes: [],
      approvedPacketCount: 1,
      sourceRuntimeWriteAllowed: false,
      liveRegistrationAllowed: false,
    });

    expect(validateGeneratedPacketApprovalBundle({
      kind: 'personal_plan_generated_packet_approval_bundle',
      approvedPackets: [{ ...approved, sourceRuntimeWriteAllowed: true } as any],
    }).issueCodes).toContain('source_runtime_write_not_allowed');
  });
});
