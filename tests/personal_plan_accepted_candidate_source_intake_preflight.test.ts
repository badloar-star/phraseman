import type { PersonalPlanInternalQualityGate } from '../app/personal_plan_internal_quality_gate';
import {
  buildAcceptedCandidateSourceIntakePreflight,
  validateAcceptedCandidateSourceIntakePreflight,
} from '../app/personal_plan_generation_source_intake_preflight';

const PLAN_IDS = ['voyazh', 'mitap', 'gavan', 'impuls', 'echo'] as const;

function acceptedGate(): PersonalPlanInternalQualityGate {
  const rows = PLAN_IDS.flatMap((planId) =>
    Array.from({ length: 28 }, (_, index) => {
      const dayIndex = index + 1;
      return {
        candidateId: `${planId}_d${String(dayIndex).padStart(3, '0')}_chat_draft_candidate`,
        planId,
        dayIndex,
        label: `${planId} Day ${dayIndex}`,
        quality: 91,
        qualityDecision: 'accepted_for_source_intake_candidate' as const,
        issueCodes: [],
        requiredMaterialSummary: 'Phrases, translations, teaching notes, task payloads, recall links, quiz options.',
        notes: 'Accepted internal-quality candidate for non-live source-intake preflight.',
        sourceRuntimeWriteAllowed: false as const,
        liveRegistrationAllowed: false as const,
        generatedContentCreationAllowed: false as const,
        productionReady: false as const,
        nextRequiredStep: 'source_intake_preflight_candidate' as const,
      };
    })
  );

  return {
    kind: 'personal_plan_internal_quality_gate',
    status: 'ready_for_source_intake_preflight',
    rows,
    totalCandidateDays: 140,
    acceptedCandidateDays: 140,
    reworkRequiredDays: 0,
    blockedDays: 0,
    issueCodes: [],
    sourceRuntimeWriteAllowed: false,
    liveRegistrationAllowed: false,
    generatedContentCreationAllowed: false,
    productionReady: false,
    nextRequiredStep: 'source_intake_preflight',
  };
}

describe('accepted candidate source-intake preflight', () => {
  it('accepts all 140 internally approved candidates without writing runtime/source', () => {
    const gate = acceptedGate();
    const preflight = buildAcceptedCandidateSourceIntakePreflight(gate);

    expect(preflight.kind).toBe('personal_plan_accepted_candidate_source_intake_preflight');
    expect(preflight.status).toBe('ready_for_content_packet_import_format');
    expect(preflight.totalCandidateDays).toBe(140);
    expect(preflight.acceptedRows).toBe(140);
    expect(preflight.blockedRows).toBe(0);
    expect(preflight.sourceRuntimeWriteAllowed).toBe(false);
    expect(preflight.liveRegistrationAllowed).toBe(false);
    expect(preflight.generatedContentCreationAllowed).toBe(false);
    expect(preflight.productionReady).toBe(false);
    expect(preflight.nextRequiredStep).toBe('content_packet_import_format');
    expect(preflight.rows).toHaveLength(140);
    expect(preflight.rows[0]).toEqual(expect.objectContaining({
      intakeStatus: 'accepted_for_content_packet_import_format',
      sourceRuntimeWriteAllowed: false,
      liveRegistrationAllowed: false,
      productionReady: false,
    }));
  });

  it('validates checksums, accepted status, and fake live/source flags', () => {
    const gate = acceptedGate();
    const preflight = buildAcceptedCandidateSourceIntakePreflight(gate);

    expect(validateAcceptedCandidateSourceIntakePreflight(preflight)).toEqual({
      status: 'valid_non_live_accepted_candidate_source_intake_preflight',
      issueCodes: [],
      totalCandidateDays: 140,
      acceptedRows: 140,
      blockedRows: 0,
      sourceRuntimeWriteAllowed: false,
      liveRegistrationAllowed: false,
      nextRequiredStep: 'content_packet_import_format',
    });

    expect(validateAcceptedCandidateSourceIntakePreflight({
      ...preflight,
      productionReady: true as any,
    }).issueCodes).toContain('production_ready_not_allowed');

    expect(validateAcceptedCandidateSourceIntakePreflight({
      ...preflight,
      rows: [{ ...preflight.rows[0], candidateChecksum: '0000000000000000' }],
    }).issueCodes).toContain('candidate_checksum_mismatch');

    expect(validateAcceptedCandidateSourceIntakePreflight({
      ...preflight,
      rows: [{ ...preflight.rows[0], intakeStatus: 'blocked_by_internal_quality_gate' }],
    }).issueCodes).toContain('candidate_not_accepted_for_source_intake');
  });
});
