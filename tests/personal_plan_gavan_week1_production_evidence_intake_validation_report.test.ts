import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

import type {
  GavanWeek1ProductionEvidenceAcquisitionPacket,
  GavanWeek1ProductionEvidenceRequest,
} from '../tools/personal_plan_gavan_week1_production_evidence_acquisition_packet';
import {
  GAVAN_WEEK1_PRODUCTION_EVIDENCE_INTAKE_VALIDATION_REPORT_PATH,
  buildGavanWeek1ProductionEvidenceIntakeValidationReport,
  writeGavanWeek1ProductionEvidenceIntakeValidationReport,
} from '../tools/personal_plan_gavan_week1_production_evidence_intake_validation_report';

const GENERATED_AT = '2026-06-04T23:59:00.000Z';
const MISSING_EVIDENCE_ROOT = path.join('.codex-tmp', 'personal-plans', 'p3-129-missing-evidence');

function request(
  id: string,
  stream: 'audio' | 'pronunciation' | 'route',
  expectedPath: string,
): GavanWeek1ProductionEvidenceRequest {
  return {
    id,
    stream,
    status: 'blocked_missing_external_evidence',
    expectedPath,
    requiredEvidence: `Evidence for ${id}.`,
    blocksProduction: true,
  };
}

function acquisitionPacket(overrides: {
  expectedPathByRequestId?: Record<string, string>;
  productionReady?: false;
  readyForLive?: false;
} = {}): GavanWeek1ProductionEvidenceAcquisitionPacket {
  const audioMp3Requests = Array.from({ length: 10 }, (_, index) => {
    const id = `audio_mp3_${String(index + 1).padStart(2, '0')}`;
    return request(
      id,
      'audio',
      overrides.expectedPathByRequestId?.[id] ??
        path.join(MISSING_EVIDENCE_ROOT, `gavan_d1_t${String(index + 1).padStart(2, '0')}.mp3`),
    );
  });
  const requests: GavanWeek1ProductionEvidenceRequest[] = [
    ...audioMp3Requests,
    request(
      'audio_checksum_manifest',
      'audio',
      overrides.expectedPathByRequestId?.audio_checksum_manifest ??
        path.join(MISSING_EVIDENCE_ROOT, 'gavan-week1-generated-audio-checksums.json'),
    ),
    request(
      'audio_explicit_approval_records',
      'audio',
      overrides.expectedPathByRequestId?.audio_explicit_approval_records ??
        path.join(MISSING_EVIDENCE_ROOT, 'gavan-week1-audio-explicit-approval-records.json'),
    ),
    request(
      'pronunciation_scorer_provider_contract',
      'pronunciation',
      overrides.expectedPathByRequestId?.pronunciation_scorer_provider_contract ??
        path.join(MISSING_EVIDENCE_ROOT, 'gavan-week1-pronunciation-scorer-provider-contract.signed.json'),
    ),
    ...Array.from({ length: 4 }, (_, index) => {
      const id = `pronunciation_reference_${index + 1}_recording_and_score`;
      return request(
        id,
        'pronunciation',
        overrides.expectedPathByRequestId?.[id] ??
          path.join(MISSING_EVIDENCE_ROOT, `gavan-week1-pronunciation-reference-${index + 1}-scored-attempt.json`),
      );
    }),
    request(
      'pronunciation_explicit_approval_records',
      'pronunciation',
      overrides.expectedPathByRequestId?.pronunciation_explicit_approval_records ??
        path.join(MISSING_EVIDENCE_ROOT, 'gavan-week1-pronunciation-explicit-approval-records.json'),
    ),
    request(
      'route_signed_approval_payload',
      'route',
      overrides.expectedPathByRequestId?.route_signed_approval_payload ??
        path.join(MISSING_EVIDENCE_ROOT, 'gavan-week1-signed-route-approval-payload.json'),
    ),
    request(
      'route_signed_approval_artifact',
      'route',
      overrides.expectedPathByRequestId?.route_signed_approval_artifact ??
        path.join(MISSING_EVIDENCE_ROOT, 'gavan-week1-signed-route-approval-artifact.json'),
    ),
    request(
      'route_source_registration_report',
      'route',
      overrides.expectedPathByRequestId?.route_source_registration_report ??
        path.join(MISSING_EVIDENCE_ROOT, 'gavan-week1-route-source-registration-report.json'),
    ),
    ...Array.from({ length: 7 }, (_, index) => {
      const id = `route_regression_suite_${index + 1}`;
      return request(
        id,
        'route',
        overrides.expectedPathByRequestId?.[id] ??
          path.join(MISSING_EVIDENCE_ROOT, `gavan-week1-route-regression-suite-${index + 1}.json`),
      );
    }),
  ];

  return {
    kind: 'gavan_week1_production_evidence_acquisition_packet',
    generatedAt: GENERATED_AT,
    acquisitionOwnerId: 'production-evidence-acquisition-owner',
    planId: 'gavan',
    weekId: 'gavan-week1',
    sourceFinalReadinessStatus: 'hold_audio_pronunciation_route_evidence_blocked',
    status: 'awaiting_external_production_evidence',
    releaseDecision: 'hold',
    productionReady: overrides.productionReady ?? false,
    readyForLive: overrides.readyForLive ?? false,
    evidenceAcquisitionComplete: false,
    audioEvidenceComplete: false,
    pronunciationEvidenceComplete: false,
    routeEvidenceComplete: false,
    sourceWritesUsed: false,
    liveEditsAllowed: false,
    summary: {
      sourceFinalBlockerCount: 26,
      acquisitionStreamCount: 3,
      evidenceRequestCount: 28,
      audioRequestCount: 12,
      pronunciationRequestCount: 6,
      routeRequestCount: 10,
      fulfilledRequestCount: 0,
      blockedRequestCount: 28,
    },
    streams: [
      { id: 'audio', status: 'awaiting_external_evidence', requestCount: 12, fulfilledRequestCount: 0, blockedRequestCount: 12 },
      { id: 'pronunciation', status: 'awaiting_external_evidence', requestCount: 6, fulfilledRequestCount: 0, blockedRequestCount: 6 },
      { id: 'route', status: 'awaiting_external_evidence', requestCount: 10, fulfilledRequestCount: 0, blockedRequestCount: 10 },
    ],
    requests,
    writePolicy: {
      allowedTargetRoots: ['.codex-tmp', 'docs/reports'],
      sourceWritesAllowed: false,
      liveWritesAllowed: false,
    },
  };
}

describe('Gavan week 1 production evidence intake validation report', () => {
  it('keeps every production evidence request blocked when no external files exist', () => {
    const result = buildGavanWeek1ProductionEvidenceIntakeValidationReport(acquisitionPacket(), {
      generatedAt: GENERATED_AT,
      intakeOwnerId: 'production-evidence-intake-owner',
    });

    expect(result.valid).toBe(true);
    const report = result.report!;
    expect(report).toMatchObject({
      kind: 'gavan_week1_production_evidence_intake_validation_report',
      status: 'blocked_missing_external_evidence',
      releaseDecision: 'hold',
      productionReady: false,
      readyForLive: false,
      evidenceIntakeComplete: false,
      sourceWritesUsed: false,
      liveEditsAllowed: false,
    });
    expect(report.summary).toEqual({
      sourceEvidenceRequestCount: 28,
      intakeRowCount: 28,
      presentEvidenceCount: 0,
      missingEvidenceCount: 28,
      invalidEvidenceCount: 0,
      pendingReviewEvidenceCount: 0,
      audioPresentEvidenceCount: 0,
      pronunciationPresentEvidenceCount: 0,
      routePresentEvidenceCount: 0,
      blockedRequestCount: 28,
    });
    expect(report.rows).toHaveLength(28);
    expect(report.rows.every((row) => row.status === 'missing_expected_file')).toBe(true);
  });

  it('treats present MP3 and JSON files as pending review without approving readiness', () => {
    const root = path.join(process.cwd(), '.codex-tmp', 'personal-plans', 'p3-129-test-evidence');
    const mp3Path = path.join(root, 'gavan_d1_t01.mp3');
    const jsonPath = path.join(root, 'signed-route-approval-payload.json');
    mkdirSync(root, { recursive: true });
    writeFileSync(mp3Path, Buffer.concat([Buffer.from('ID3'), Buffer.alloc(64)]));
    writeFileSync(jsonPath, JSON.stringify({
      kind: 'signed_route_approval_payload',
      productionReady: false,
      readyForLive: false,
      approvedForRuntime: false,
    }));

    const result = buildGavanWeek1ProductionEvidenceIntakeValidationReport(acquisitionPacket({
      expectedPathByRequestId: {
        audio_mp3_01: mp3Path,
        route_signed_approval_payload: jsonPath,
      },
    }), {
      generatedAt: GENERATED_AT,
      intakeOwnerId: 'production-evidence-intake-owner',
    });

    expect(result.valid).toBe(true);
    const report = result.report!;
    expect(report.status).toBe('blocked_partial_external_evidence');
    expect(report.productionReady).toBe(false);
    expect(report.readyForLive).toBe(false);
    expect(report.summary.presentEvidenceCount).toBe(2);
    expect(report.summary.pendingReviewEvidenceCount).toBe(2);
    expect(report.summary.blockedRequestCount).toBe(26);
    expect(report.rows.find((row) => row.requestId === 'audio_mp3_01')).toMatchObject({
      status: 'present_pending_review',
      stream: 'audio',
    });
    expect(report.rows.find((row) => row.requestId === 'route_signed_approval_payload')).toMatchObject({
      status: 'present_pending_review',
      stream: 'route',
    });
  });

  it('rejects unsafe JSON evidence claims instead of using them as approval', () => {
    const root = path.join(process.cwd(), '.codex-tmp', 'personal-plans', 'p3-129-test-evidence');
    const jsonPath = path.join(root, 'unsafe-approval.json');
    mkdirSync(root, { recursive: true });
    writeFileSync(jsonPath, JSON.stringify({
      productionReady: true,
      readyForLive: true,
      approvedForRuntime: true,
    }));

    const result = buildGavanWeek1ProductionEvidenceIntakeValidationReport(acquisitionPacket({
      expectedPathByRequestId: {
        audio_explicit_approval_records: jsonPath,
      },
    }), {
      generatedAt: GENERATED_AT,
      intakeOwnerId: 'production-evidence-intake-owner',
    });

    expect(result.valid).toBe(true);
    const report = result.report!;
    expect(report.summary.invalidEvidenceCount).toBe(1);
    expect(report.rows.find((row) => row.requestId === 'audio_explicit_approval_records')).toMatchObject({
      status: 'invalid_evidence_file',
      blockingReason: 'Evidence file contains unsafe live or production-ready claims.',
    });
  });

  it('rejects acquisition packets that already claim live readiness', () => {
    const result = buildGavanWeek1ProductionEvidenceIntakeValidationReport(acquisitionPacket({
      productionReady: true as false,
      readyForLive: true as false,
    }), {
      generatedAt: GENERATED_AT,
      intakeOwnerId: 'production-evidence-intake-owner',
    });

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      'acquisition_packet_not_non_live',
    ]));
  });

  it('writes deterministic JSON only under temp or report roots', () => {
    const targetPath = path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-production-evidence-intake-validation-report.test.json',
    );

    const result = writeGavanWeek1ProductionEvidenceIntakeValidationReport(acquisitionPacket(), {
      generatedAt: GENERATED_AT,
      intakeOwnerId: 'production-evidence-intake-owner',
      targetPath,
    });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(targetPath);
    expect(result.bytesWritten).toBeGreaterThan(1000);

    const stored = JSON.parse(readFileSync(targetPath, 'utf8'));
    expect(stored).toEqual(result.report);
    expect(stored.status).toBe('blocked_missing_external_evidence');
  });

  it.each([
    'app/personal_plan_catalog.ts',
    'assets/audio/personal-plans/gavan/week1/day1/gavan_d1_t01.mp3',
    'package.json',
  ])('rejects source or asset target path %s', (relativeTargetPath) => {
    const result = writeGavanWeek1ProductionEvidenceIntakeValidationReport(acquisitionPacket(), {
      generatedAt: GENERATED_AT,
      intakeOwnerId: 'production-evidence-intake-owner',
      targetPath: path.join(process.cwd(), relativeTargetPath),
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual([{
      code: 'target_path_not_allowed',
      detail: 'Production evidence intake validation report can only write under .codex-tmp or docs/reports.',
    }]);
  });

  it('does not import runtime route, storage, audio registration, or navigation modules', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_gavan_week1_production_evidence_intake_validation_report.ts'),
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

  it('uses the canonical intake validation report path', () => {
    expect(GAVAN_WEEK1_PRODUCTION_EVIDENCE_INTAKE_VALIDATION_REPORT_PATH).toBe(path.join(
      process.cwd(),
      '.codex-tmp',
      'personal-plans',
      'gavan-week1-production-evidence-intake-validation-report.json',
    ));
  });
});
