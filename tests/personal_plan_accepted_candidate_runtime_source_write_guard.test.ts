import type { AcceptedCandidateContentPacketImportFormat } from '../app/personal_plan_generation_import_format';
import {
  buildAcceptedCandidateRuntimeSourceWriteGuard,
  validateAcceptedCandidateRuntimeSourceWriteGuard,
} from '../app/personal_plan_generation_runtime_source_write_guard';

const PLAN_IDS = ['voyazh', 'mitap', 'gavan', 'impuls', 'echo'] as const;

function importFormat(): AcceptedCandidateContentPacketImportFormat {
  const importDays = PLAN_IDS.flatMap((planId) =>
    Array.from({ length: 28 }, (_, index) => {
      const dayIndex = index + 1;
      return {
        candidateId: `${planId}_d${String(dayIndex).padStart(3, '0')}_chat_draft_candidate`,
        candidateChecksum: `${(dayIndex + planId.length).toString(16).padStart(8, '0')}${(dayIndex * 19).toString(16).padStart(8, '0')}`,
        planId,
        dayIndex,
        sourceLabel: `${planId} Day ${dayIndex}`,
        quality: 93,
        importStatus: 'ready_for_non_live_packet_format' as const,
        contentSourceStatus: 'chat_draft_candidate' as const,
        sourceRuntimeWriteAllowed: false as const,
        liveRegistrationAllowed: false as const,
        generatedContentCreationAllowed: false as const,
        productionReady: false as const,
        nextRequiredStep: 'runtime_source_write_guard' as const,
      };
    }),
  );

  return {
    kind: 'personal_plan_accepted_candidate_content_packet_import_format',
    status: 'ready_for_runtime_source_write_guard',
    importDays,
    totalCandidateDays: 140,
    acceptedRows: 140,
    blockedRows: 0,
    sourceRuntimeWriteAllowed: false,
    liveRegistrationAllowed: false,
    generatedContentCreationAllowed: false,
    productionReady: false,
    nextRequiredStep: 'runtime_source_write_guard',
  };
}

describe('accepted candidate runtime/source write guard', () => {
  it('holds the 140-row import format before any runtime/source integration pass', () => {
    const guard = buildAcceptedCandidateRuntimeSourceWriteGuard(importFormat());

    expect(guard.kind).toBe('personal_plan_accepted_candidate_runtime_source_write_guard');
    expect(guard.status).toBe('hold_before_integration_pass');
    expect(guard.importFormatStatus).toBe('valid_non_live_content_packet_import_format');
    expect(guard.totalCandidateDays).toBe(140);
    expect(guard.importDayCount).toBe(140);
    expect(guard.sourceRuntimeWriteAllowed).toBe(false);
    expect(guard.liveRegistrationAllowed).toBe(false);
    expect(guard.generatedContentCreationAllowed).toBe(false);
    expect(guard.productionReady).toBe(false);
    expect(guard.integrationPassRequired).toBe(true);
    expect(guard.nextRequiredStep).toBe('explicit_integration_plan');
    expect(guard.guardedFamilies.map((family) => family.family)).toEqual([
      'catalog_source',
      'route_source',
      'ui_surface',
      'storage_contract',
      'asset_registry',
      'test_fixture_source',
    ]);
    expect(guard.guardedFamilies.every((family) => family.status === 'blocked_until_explicit_integration_plan')).toBe(true);
  });

  it('validates hold state and blocks fake write/live/production claims', () => {
    const guard = buildAcceptedCandidateRuntimeSourceWriteGuard(importFormat());

    expect(validateAcceptedCandidateRuntimeSourceWriteGuard(guard)).toEqual({
      status: 'valid_non_live_runtime_source_write_guard',
      issueCodes: [],
      totalCandidateDays: 140,
      importDayCount: 140,
      guardedFamilyCount: 6,
      sourceRuntimeWriteAllowed: false,
      liveRegistrationAllowed: false,
      nextRequiredStep: 'explicit_integration_plan',
    });

    expect(validateAcceptedCandidateRuntimeSourceWriteGuard({
      ...guard,
      sourceRuntimeWriteAllowed: true as any,
    }).issueCodes).toContain('source_runtime_write_not_allowed');

    expect(validateAcceptedCandidateRuntimeSourceWriteGuard({
      ...guard,
      liveRegistrationAllowed: true as any,
    }).issueCodes).toContain('live_registration_not_allowed');

    expect(validateAcceptedCandidateRuntimeSourceWriteGuard({
      ...guard,
      productionReady: true as any,
    }).issueCodes).toContain('production_ready_not_allowed');
  });

  it('blocks invalid import formats, missing families, and unblocked families', () => {
    const guard = buildAcceptedCandidateRuntimeSourceWriteGuard(importFormat());

    expect(validateAcceptedCandidateRuntimeSourceWriteGuard({
      ...guard,
      importFormatStatus: 'invalid' as any,
    }).issueCodes).toContain('import_format_not_valid');

    expect(validateAcceptedCandidateRuntimeSourceWriteGuard({
      ...guard,
      guardedFamilies: guard.guardedFamilies.slice(0, 5),
    }).issueCodes).toContain('missing_guarded_family');

    expect(validateAcceptedCandidateRuntimeSourceWriteGuard({
      ...guard,
      guardedFamilies: [
        { ...guard.guardedFamilies[0], status: 'allowed' as any },
        ...guard.guardedFamilies.slice(1),
      ],
    }).issueCodes).toContain('guarded_family_not_blocked');
  });
});
