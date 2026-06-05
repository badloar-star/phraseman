import { readFileSync } from 'fs';
import path from 'path';

import type {
  GavanWeek1SignedRouteApprovalIntakeReport,
} from '../tools/personal_plan_gavan_week1_signed_route_approval_intake_report';
import {
  GAVAN_WEEK1_SIGNED_ROUTE_APPROVAL_ARTIFACT_GATE_PATH,
  buildGavanWeek1SignedRouteApprovalArtifactGate,
  writeGavanWeek1SignedRouteApprovalArtifactGate,
} from '../tools/personal_plan_gavan_week1_signed_route_approval_artifact_gate';

const GENERATED_AT = '2026-06-04T20:55:00.000Z';

function intakeReport(overrides: Partial<GavanWeek1SignedRouteApprovalIntakeReport> = {}): GavanWeek1SignedRouteApprovalIntakeReport {
  const base: GavanWeek1SignedRouteApprovalIntakeReport = {
    kind: 'gavan_week1_signed_route_approval_intake_report',
    generatedAt: GENERATED_AT,
    intakeOwnerId: 'route-signed-approval-intake-owner',
    planId: 'gavan',
    weekId: 'gavan-week1',
    sourceHandoffStatus: 'signed_approval_handoff_ready_for_human_review_unsigned',
    status: 'blocked_missing_signed_payload',
    releaseDecision: 'hold',
    approved: false,
    readyForLive: false,
    signedApprovalPayloadAccepted: false,
    signedApprovalArtifactCreated: false,
    routeApprovalAccepted: false,
    routeRegistrationAllowed: false,
    liveRegressionAllowed: false,
    deviceVerificationAllowed: false,
    sourceWritesUsed: false,
    liveEditsAllowed: false,
    suppliedPayloadPresent: false,
    fieldChecklist: [
      'reviewerName',
      'reviewerRole',
      'approvedAtIso',
      'approvalScope',
      'approvedEvidenceFilePaths',
      'regressionScope',
      'decisionText',
    ].map((id) => ({
      id: id as GavanWeek1SignedRouteApprovalIntakeReport['fieldChecklist'][number]['id'],
      status: 'missing',
      required: true,
      detail: 'Signed route approval payload has not been supplied.',
    })),
    blockers: [{
      code: 'signed_payload_missing_or_invalid',
      blocksProduction: true,
      detail: 'A complete signed route approval payload is required.',
    }],
    summary: {
      requiredFieldCount: 7,
      validFieldCount: 0,
      missingFieldCount: 7,
      invalidFieldCount: 0,
      requiredEvidencePathCount: 13,
      suppliedEvidencePathCount: 0,
      acceptedEvidencePathCount: 0,
      missingEvidencePathCount: 13,
      blockerCount: 8,
    },
    requiredNextActions: [
      'Supply a complete signed route approval payload.',
    ],
    writePolicy: {
      allowedTargetRoots: ['.codex-tmp', 'docs/reports'],
      sourceWritesAllowed: false,
      liveWritesAllowed: false,
    },
  };

  return { ...base, ...overrides };
}

function acceptedIntakeReport(): GavanWeek1SignedRouteApprovalIntakeReport {
  return intakeReport({
    status: 'signed_payload_ready_for_separate_route_approval_review',
    signedApprovalPayloadAccepted: true,
    suppliedPayloadPresent: true,
    fieldChecklist: intakeReport().fieldChecklist.map((item) => ({
      ...item,
      status: 'valid',
      detail: 'Signed route approval payload field is valid.',
    })),
    blockers: [
      {
        code: 'separate_signed_approval_artifact_required',
        blocksProduction: true,
        detail: 'A separate signed route approval artifact must be created before routes can be registered.',
      },
      {
        code: 'route_registration_pass_required',
        blocksProduction: true,
        detail: 'Catalog, quiz, and UI route registration require a separate source-editing pass.',
      },
      {
        code: 'live_regression_required',
        blocksProduction: true,
        detail: 'Live route regression evidence is still required.',
      },
      {
        code: 'device_verification_required',
        blocksProduction: true,
        detail: 'Device route opening verification is still required.',
      },
      {
        code: 'audio_pronunciation_master_blockers_still_open',
        blocksProduction: true,
        detail: 'Audio and pronunciation blockers remain open in the master readiness matrix.',
      },
    ],
    summary: {
      requiredFieldCount: 7,
      validFieldCount: 7,
      missingFieldCount: 0,
      invalidFieldCount: 0,
      requiredEvidencePathCount: 13,
      suppliedEvidencePathCount: 13,
      acceptedEvidencePathCount: 13,
      missingEvidencePathCount: 0,
      blockerCount: 5,
    },
  });
}

describe('Gavan week 1 signed route approval artifact gate', () => {
  it('blocks artifact creation until the signed route approval intake accepts a complete payload', () => {
    const result = buildGavanWeek1SignedRouteApprovalArtifactGate(intakeReport(), {
      generatedAt: GENERATED_AT,
      artifactOwnerId: 'route-signed-approval-artifact-owner',
    });

    expect(result.valid).toBe(true);
    expect(result.gate).toMatchObject({
      kind: 'gavan_week1_signed_route_approval_artifact_gate',
      status: 'blocked_before_signed_payload_acceptance',
      releaseDecision: 'hold',
      signedApprovalArtifactReady: false,
      signedApprovalArtifactCreated: false,
      routeApprovalAccepted: false,
      approved: false,
      readyForLive: false,
      routeRegistrationAllowed: false,
      liveRegressionAllowed: false,
      deviceVerificationAllowed: false,
      sourceWritesUsed: false,
      liveEditsAllowed: false,
    });
    expect(result.gate.summary).toEqual({
      intakeRequiredFieldCount: 7,
      intakeValidFieldCount: 0,
      intakeAcceptedEvidencePathCount: 0,
      intakeMissingEvidencePathCount: 13,
      carriedBlockerCount: 8,
      artifactBlockerCount: 6,
    });
    expect(result.gate.blockers.map((blocker) => blocker.code)).toEqual([
      'signed_payload_not_accepted',
      'signed_approval_artifact_not_created',
      'route_registration_pass_required',
      'live_regression_required',
      'device_verification_required',
      'audio_pronunciation_master_blockers_still_open',
    ]);
  });

  it('allows only a non-live signed approval artifact candidate when intake accepted the payload', () => {
    const result = buildGavanWeek1SignedRouteApprovalArtifactGate(acceptedIntakeReport(), {
      generatedAt: GENERATED_AT,
      artifactOwnerId: 'route-signed-approval-artifact-owner',
    });

    expect(result.valid).toBe(true);
    expect(result.gate).toMatchObject({
      status: 'signed_approval_artifact_candidate_ready_non_live',
      releaseDecision: 'hold',
      signedApprovalArtifactReady: true,
      signedApprovalArtifactCreated: false,
      routeApprovalAccepted: false,
      approved: false,
      readyForLive: false,
      routeRegistrationAllowed: false,
      liveRegressionAllowed: false,
      deviceVerificationAllowed: false,
      sourceWritesUsed: false,
      liveEditsAllowed: false,
    });
    expect(result.gate.summary).toEqual({
      intakeRequiredFieldCount: 7,
      intakeValidFieldCount: 7,
      intakeAcceptedEvidencePathCount: 13,
      intakeMissingEvidencePathCount: 0,
      carriedBlockerCount: 5,
      artifactBlockerCount: 5,
    });
  });

  it('rejects unsafe intake reports that already claim approval or live readiness', () => {
    const result = buildGavanWeek1SignedRouteApprovalArtifactGate(intakeReport({
      approved: true as false,
      readyForLive: true as false,
      routeRegistrationAllowed: true as false,
    }), {
      generatedAt: GENERATED_AT,
      artifactOwnerId: 'route-signed-approval-artifact-owner',
    });

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      'intake_already_approved',
      'intake_not_non_live',
    ]));
  });

  it('writes deterministic JSON only under temp or report roots', () => {
    const targetPath = path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-signed-route-approval-artifact-gate.test.json',
    );

    const result = writeGavanWeek1SignedRouteApprovalArtifactGate(intakeReport(), {
      generatedAt: GENERATED_AT,
      artifactOwnerId: 'route-signed-approval-artifact-owner',
      targetPath,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(targetPath);
    expect(result.bytesWritten).toBeGreaterThan(1000);

    const stored = JSON.parse(readFileSync(targetPath, 'utf8'));
    expect(stored).toEqual(result.gate);
    expect(stored.status).toBe('blocked_before_signed_payload_acceptance');
  });

  it.each([
    'app/personal_plan_catalog.ts',
    'app/personal_plan_day_open_actions.ts',
    'app/personal_plan_navigation.ts',
    'assets/audio/personal-plans/gavan/week1/day1/gavan_d1_t01.mp3',
    'package.json',
  ])('rejects source or asset target path %s', (relativeTargetPath) => {
    const result = writeGavanWeek1SignedRouteApprovalArtifactGate(intakeReport(), {
      generatedAt: GENERATED_AT,
      artifactOwnerId: 'route-signed-approval-artifact-owner',
      targetPath: path.join(process.cwd(), relativeTargetPath),
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual([{
      code: 'target_path_not_allowed',
      detail: 'Signed route approval artifact gate can only write under .codex-tmp or docs/reports.',
    }]);
  });

  it('does not import runtime route, storage, audio registration, or navigation modules', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_signed_route_approval_artifact_gate.ts'),
      'utf8',
    );

    for (const forbidden of [
      'react-native',
      'AsyncStorage',
      'navigation',
      'expo-av',
      'expo-audio',
      'personal_plan_catalog',
      'personal_plan_day_open_actions',
      'personal_plan_audio_openai_worker',
      'approvePlanAudioAssets',
      'registerPlanAudioAssetsForRuntime',
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });

  it('uses the canonical gate path', () => {
    expect(GAVAN_WEEK1_SIGNED_ROUTE_APPROVAL_ARTIFACT_GATE_PATH).toBe(path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-signed-route-approval-artifact-gate.json',
    ));
  });
});
