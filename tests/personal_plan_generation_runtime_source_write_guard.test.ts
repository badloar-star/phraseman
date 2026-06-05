import {
  buildGeneratedPacketReviewInput,
  reviewGeneratedDayPacket,
} from '../app/personal_plan_generation_review_workflow';
import { buildGeneratedPacketSourceIntakePreflight } from '../app/personal_plan_generation_source_intake_preflight';
import { buildGeneratedContentImportFormat } from '../app/personal_plan_generation_import_format';
import {
  buildRuntimeSourceWriteGuard,
  validateRuntimeSourceWriteGuard,
} from '../app/personal_plan_generation_runtime_source_write_guard';
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
    packetId: 'mitap_d011_packet',
    planId: 'mitap',
    dayIndex: 11,
    weekIndex: 2,
    dayTheme: 'Clarify and correct',
    weekRole: 'clarify_and_correct',
    selectedDailyTimeAffectsTasks: true,
    productionReady: false,
    reviewStatus: 'needs_review',
    taskModes: ALL_GENERATION_MODES,
    phrases: [
      { id: 'mitap_d011_phrase_1', english: 'Can I clarify one point?', translation: 'Можно уточнить один момент?', teachingNote: 'Clarify is calm and professional.' },
      { id: 'mitap_d011_phrase_2', english: 'I meant the second option.', translation: 'Я имел в виду второй вариант.', teachingNote: 'Meant explains your intended meaning.' },
      { id: 'mitap_d011_phrase_3', english: 'That was my mistake.', translation: 'Это была моя ошибка.', teachingNote: 'My mistake sounds direct without drama.' },
      { id: 'mitap_d011_phrase_4', english: 'Let me correct that.', translation: 'Позвольте это исправить.', teachingNote: 'Correct that is useful after a wrong detail.' },
      { id: 'mitap_d011_phrase_5', english: 'The number is different.', translation: 'Число другое.', teachingNote: 'Different marks a correction.' },
      { id: 'mitap_d011_phrase_6', english: 'Now the update is clear.', translation: 'Теперь обновление понятно.', teachingNote: 'Update is the current work status.' },
    ],
    recallLinks: [{ fromDayIndex: 5, phraseIds: ['mitap_d005_phrase_1'] }],
    audioNeeds: [
      { mode: 'plan_listen_choose', status: 'not_required' },
      { mode: 'plan_listen_build', status: 'not_required' },
    ],
    pronunciationNeeds: [{ mode: 'plan_pronunciation_repeat', status: 'not_required' }],
    blockers: [],
    ...overrides,
  };
}

function importFormat() {
  const basePacket = packet();
  const reviewInput = buildGeneratedPacketReviewInput({
    packets: [basePacket],
    reviewerId: 'content-reviewer-1',
    reviewedAt: '2026-06-05T15:00:00.000Z',
    decision: 'approve_for_source_intake',
    notes: 'Approved for guarded import only.',
  });
  const approved = reviewGeneratedDayPacket(basePacket, reviewInput).approvedPacket;
  if (!approved) throw new Error('Expected approved packet fixture.');
  const preflight = buildGeneratedPacketSourceIntakePreflight({
    kind: 'personal_plan_generated_packet_approval_bundle',
    approvedPackets: [approved],
  });
  return buildGeneratedContentImportFormat(preflight, [basePacket]);
}

describe('personal plan generation runtime/source write guard', () => {
  it('builds a hold guard from import format and keeps every write family blocked', () => {
    const guard = buildRuntimeSourceWriteGuard(importFormat());

    expect(guard.kind).toBe('personal_plan_generation_runtime_source_write_guard');
    expect(guard.status).toBe('hold_before_integration_pass');
    expect(guard.sourceRuntimeWriteAllowed).toBe(false);
    expect(guard.liveRegistrationAllowed).toBe(false);
    expect(guard.generatedContentCreationAllowed).toBe(false);
    expect(guard.integrationPassRequired).toBe(true);
    expect(guard.guardedFamilies.map((family) => family.family)).toEqual([
      'catalog_source',
      'route_source',
      'ui_surface',
      'storage_contract',
      'asset_registry',
      'test_fixture_source',
    ]);
    expect(guard.guardedFamilies.every((family) => family.status === 'blocked_until_integration_pass')).toBe(true);
    expect(guard.nextRequiredStep).toBe('plan_specific_generation_prompts');
  });

  it('validates the guard as non-live and blocks attempts to enable source/runtime writes', () => {
    const guard = buildRuntimeSourceWriteGuard(importFormat());

    expect(validateRuntimeSourceWriteGuard(guard)).toEqual({
      status: 'valid_hold_guard',
      issueCodes: [],
      guardedFamilyCount: 6,
      sourceRuntimeWriteAllowed: false,
      liveRegistrationAllowed: false,
      nextRequiredStep: 'plan_specific_generation_prompts',
    });

    expect(validateRuntimeSourceWriteGuard({
      ...guard,
      sourceRuntimeWriteAllowed: true as any,
    }).issueCodes).toContain('source_runtime_write_not_allowed');

    expect(validateRuntimeSourceWriteGuard({
      ...guard,
      liveRegistrationAllowed: true as any,
    }).issueCodes).toContain('live_registration_not_allowed');

    expect(validateRuntimeSourceWriteGuard({
      ...guard,
      generatedContentCreationAllowed: true as any,
    }).issueCodes).toContain('generated_content_creation_not_allowed');
  });

  it('blocks missing families, unblocked families, invalid import formats, and production-ready claims', () => {
    const guard = buildRuntimeSourceWriteGuard(importFormat());

    expect(validateRuntimeSourceWriteGuard({
      ...guard,
      guardedFamilies: guard.guardedFamilies.slice(0, 5),
    }).issueCodes).toContain('missing_guarded_family');

    expect(validateRuntimeSourceWriteGuard({
      ...guard,
      guardedFamilies: [
        { ...guard.guardedFamilies[0], status: 'allowed' as any },
        ...guard.guardedFamilies.slice(1),
      ],
    }).issueCodes).toContain('guarded_family_not_blocked');

    expect(validateRuntimeSourceWriteGuard({
      ...guard,
      importFormatStatus: 'invalid' as any,
    }).issueCodes).toContain('import_format_not_valid');

    expect(validateRuntimeSourceWriteGuard({
      ...guard,
      productionReady: true as any,
    }).issueCodes).toContain('production_ready_not_allowed');
  });
});
