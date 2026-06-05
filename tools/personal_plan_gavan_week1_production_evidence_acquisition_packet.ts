import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

import type {
  GavanWeek1MasterFinalReleaseReadinessV2,
} from './personal_plan_gavan_week1_master_final_release_readiness_v2';

export const GAVAN_WEEK1_PRODUCTION_EVIDENCE_ACQUISITION_PACKET_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-production-evidence-acquisition-packet.json',
);

type StreamId = 'audio' | 'pronunciation' | 'route';

type IssueCode =
  | 'wrong_final_readiness_kind'
  | 'wrong_plan_or_week'
  | 'final_readiness_not_non_live'
  | 'target_path_not_allowed';

export type GavanWeek1ProductionEvidenceAcquisitionIssue = {
  code: IssueCode;
  detail: string;
};

export type GavanWeek1ProductionEvidenceRequest = {
  id: string;
  stream: StreamId;
  status: 'blocked_missing_external_evidence';
  expectedPath: string | null;
  requiredEvidence: string;
  blocksProduction: true;
};

export type GavanWeek1ProductionEvidenceStream = {
  id: StreamId;
  status: 'awaiting_external_evidence';
  requestCount: number;
  fulfilledRequestCount: 0;
  blockedRequestCount: number;
};

export type GavanWeek1ProductionEvidenceAcquisitionPacket = {
  kind: 'gavan_week1_production_evidence_acquisition_packet';
  generatedAt: string;
  acquisitionOwnerId: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  sourceFinalReadinessStatus: GavanWeek1MasterFinalReleaseReadinessV2['status'];
  status: 'awaiting_external_production_evidence';
  releaseDecision: 'hold';
  productionReady: false;
  readyForLive: false;
  evidenceAcquisitionComplete: false;
  audioEvidenceComplete: false;
  pronunciationEvidenceComplete: false;
  routeEvidenceComplete: false;
  sourceWritesUsed: false;
  liveEditsAllowed: false;
  summary: {
    sourceFinalBlockerCount: number;
    acquisitionStreamCount: number;
    evidenceRequestCount: number;
    audioRequestCount: number;
    pronunciationRequestCount: number;
    routeRequestCount: number;
    fulfilledRequestCount: 0;
    blockedRequestCount: number;
  };
  streams: GavanWeek1ProductionEvidenceStream[];
  requests: GavanWeek1ProductionEvidenceRequest[];
  writePolicy: {
    allowedTargetRoots: ['.codex-tmp', 'docs/reports'];
    sourceWritesAllowed: false;
    liveWritesAllowed: false;
  };
};

export type BuildOptions = {
  generatedAt: string;
  acquisitionOwnerId: string;
};

export type WriteOptions = BuildOptions & {
  targetPath: string;
};

export type BuildResult = {
  valid: boolean;
  issues: GavanWeek1ProductionEvidenceAcquisitionIssue[];
  packet: GavanWeek1ProductionEvidenceAcquisitionPacket;
};

export type WriteResult = {
  valid: boolean;
  issues: GavanWeek1ProductionEvidenceAcquisitionIssue[];
  targetPath?: string;
  bytesWritten?: number;
  packet?: GavanWeek1ProductionEvidenceAcquisitionPacket;
};

const TARGET_PATH_NOT_ALLOWED_DETAIL =
  'Production evidence acquisition packet can only write under .codex-tmp or docs/reports.';

function issue(code: IssueCode, detail: string): GavanWeek1ProductionEvidenceAcquisitionIssue {
  return { code, detail };
}

function isAllowedTargetPath(targetPath: string): boolean {
  const resolved = path.resolve(targetPath);
  const roots = [
    path.resolve(process.cwd(), '.codex-tmp'),
    path.resolve(process.cwd(), 'docs', 'reports'),
  ];

  return roots.some((root) => resolved === root || resolved.startsWith(`${root}${path.sep}`));
}

function validateFinalReadiness(
  readiness: GavanWeek1MasterFinalReleaseReadinessV2,
): GavanWeek1ProductionEvidenceAcquisitionIssue[] {
  const issues: GavanWeek1ProductionEvidenceAcquisitionIssue[] = [];

  if (readiness.kind !== 'gavan_week1_master_final_release_readiness_v2') {
    issues.push(issue('wrong_final_readiness_kind', 'Production evidence acquisition requires master final release readiness v2.'));
  }
  if (readiness.planId !== 'gavan' || readiness.weekId !== 'gavan-week1') {
    issues.push(issue('wrong_plan_or_week', 'Production evidence acquisition can only target Gavan week 1.'));
  }
  if (
    readiness.finalReleaseReady !== false ||
    readiness.productionReady !== false ||
    readiness.readyForLive !== false ||
    readiness.sourceWritesUsed !== false ||
    readiness.liveEditsAllowed !== false
  ) {
    issues.push(issue('final_readiness_not_non_live', 'Production evidence acquisition cannot start from a live-ready final readiness artifact.'));
  }

  return issues;
}

function audioRequests(): GavanWeek1ProductionEvidenceRequest[] {
  const mp3Requests = Array.from({ length: 10 }, (_, index) => {
    const number = String(index + 1).padStart(2, '0');
    return {
      id: `audio_mp3_${number}`,
      stream: 'audio' as const,
      status: 'blocked_missing_external_evidence' as const,
      expectedPath: `assets/audio/personal-plans/gavan/week1/day1/gavan_d1_t${number}.mp3`,
      requiredEvidence: 'Real MP3 file at the exact expected output path.',
      blocksProduction: true as const,
    };
  });

  return [
    ...mp3Requests,
    {
      id: 'audio_checksum_manifest',
      stream: 'audio',
      status: 'blocked_missing_external_evidence',
      expectedPath: '.codex-tmp/personal-plans/gavan-week1-generated-audio-checksums.json',
      requiredEvidence: 'Checksum manifest for all validated MP3 files.',
      blocksProduction: true,
    },
    {
      id: 'audio_explicit_approval_records',
      stream: 'audio',
      status: 'blocked_missing_external_evidence',
      expectedPath: '.codex-tmp/personal-plans/gavan-week1-audio-explicit-approval-records.json',
      requiredEvidence: 'Explicit reviewer approval records for all final audio assets.',
      blocksProduction: true,
    },
  ];
}

function pronunciationRequests(): GavanWeek1ProductionEvidenceRequest[] {
  return [
    {
      id: 'pronunciation_scorer_provider_contract',
      stream: 'pronunciation',
      status: 'blocked_missing_external_evidence',
      expectedPath: '.codex-tmp/personal-plans/gavan-week1-pronunciation-scorer-provider-contract.signed.json',
      requiredEvidence: 'Signed real scorer provider contract.',
      blocksProduction: true,
    },
    ...Array.from({ length: 4 }, (_, index) => ({
      id: `pronunciation_reference_${index + 1}_recording_and_score`,
      stream: 'pronunciation' as const,
      status: 'blocked_missing_external_evidence' as const,
      expectedPath: `.codex-tmp/personal-plans/gavan-week1-pronunciation-reference-${index + 1}-scored-attempt.json`,
      requiredEvidence: 'Real recording and scored-attempt evidence for the pronunciation reference.',
      blocksProduction: true as const,
    })),
    {
      id: 'pronunciation_explicit_approval_records',
      stream: 'pronunciation',
      status: 'blocked_missing_external_evidence',
      expectedPath: '.codex-tmp/personal-plans/gavan-week1-pronunciation-explicit-approval-records.json',
      requiredEvidence: 'Explicit reviewer approval records for pronunciation scoring readiness.',
      blocksProduction: true,
    },
  ];
}

function routeRequests(): GavanWeek1ProductionEvidenceRequest[] {
  return [
    {
      id: 'route_signed_approval_payload',
      stream: 'route',
      status: 'blocked_missing_external_evidence',
      expectedPath: '.codex-tmp/personal-plans/gavan-week1-signed-route-approval-payload.json',
      requiredEvidence: 'Complete signed route approval payload.',
      blocksProduction: true,
    },
    {
      id: 'route_signed_approval_artifact',
      stream: 'route',
      status: 'blocked_missing_external_evidence',
      expectedPath: '.codex-tmp/personal-plans/gavan-week1-signed-route-approval-artifact.json',
      requiredEvidence: 'Separate signed approval artifact created from the accepted payload.',
      blocksProduction: true,
    },
    {
      id: 'route_source_registration_report',
      stream: 'route',
      status: 'blocked_missing_external_evidence',
      expectedPath: '.codex-tmp/personal-plans/gavan-week1-route-source-registration-report.json',
      requiredEvidence: 'Catalog, quiz, and UI source-registration implementation evidence.',
      blocksProduction: true,
    },
    ...Array.from({ length: 7 }, (_, index) => ({
      id: `route_regression_suite_${index + 1}`,
      stream: 'route' as const,
      status: 'blocked_missing_external_evidence' as const,
      expectedPath: `.codex-tmp/personal-plans/gavan-week1-route-regression-suite-${index + 1}.json`,
      requiredEvidence: 'Post-registration live route regression evidence.',
      blocksProduction: true as const,
    })),
  ];
}

function requests(): GavanWeek1ProductionEvidenceRequest[] {
  return [
    ...audioRequests(),
    ...pronunciationRequests(),
    ...routeRequests(),
  ];
}

function streams(allRequests: GavanWeek1ProductionEvidenceRequest[]): GavanWeek1ProductionEvidenceStream[] {
  return (['audio', 'pronunciation', 'route'] as const).map((id) => {
    const requestCount = allRequests.filter((request) => request.stream === id).length;
    return {
      id,
      status: 'awaiting_external_evidence',
      requestCount,
      fulfilledRequestCount: 0,
      blockedRequestCount: requestCount,
    };
  });
}

export function buildGavanWeek1ProductionEvidenceAcquisitionPacket(
  readiness: GavanWeek1MasterFinalReleaseReadinessV2,
  options: BuildOptions,
): BuildResult {
  const issues = validateFinalReadiness(readiness);
  const allRequests = requests();
  const allStreams = streams(allRequests);
  const audioRequestCount = allRequests.filter((request) => request.stream === 'audio').length;
  const pronunciationRequestCount = allRequests.filter((request) => request.stream === 'pronunciation').length;
  const routeRequestCount = allRequests.filter((request) => request.stream === 'route').length;

  return {
    valid: issues.length === 0,
    issues,
    packet: {
      kind: 'gavan_week1_production_evidence_acquisition_packet',
      generatedAt: options.generatedAt,
      acquisitionOwnerId: options.acquisitionOwnerId,
      planId: 'gavan',
      weekId: 'gavan-week1',
      sourceFinalReadinessStatus: readiness.status,
      status: 'awaiting_external_production_evidence',
      releaseDecision: 'hold',
      productionReady: false,
      readyForLive: false,
      evidenceAcquisitionComplete: false,
      audioEvidenceComplete: false,
      pronunciationEvidenceComplete: false,
      routeEvidenceComplete: false,
      sourceWritesUsed: false,
      liveEditsAllowed: false,
      summary: {
        sourceFinalBlockerCount: readiness.summary.totalBlockerCount,
        acquisitionStreamCount: allStreams.length,
        evidenceRequestCount: allRequests.length,
        audioRequestCount,
        pronunciationRequestCount,
        routeRequestCount,
        fulfilledRequestCount: 0,
        blockedRequestCount: allRequests.length,
      },
      streams: allStreams,
      requests: allRequests,
      writePolicy: {
        allowedTargetRoots: ['.codex-tmp', 'docs/reports'],
        sourceWritesAllowed: false,
        liveWritesAllowed: false,
      },
    },
  };
}

export function writeGavanWeek1ProductionEvidenceAcquisitionPacket(
  readiness: GavanWeek1MasterFinalReleaseReadinessV2,
  options: WriteOptions,
): WriteResult {
  if (!isAllowedTargetPath(options.targetPath)) {
    return {
      valid: false,
      issues: [{
        code: 'target_path_not_allowed',
        detail: TARGET_PATH_NOT_ALLOWED_DETAIL,
      }],
    };
  }

  const result = buildGavanWeek1ProductionEvidenceAcquisitionPacket(readiness, options);
  mkdirSync(path.dirname(options.targetPath), { recursive: true });
  const json = `${JSON.stringify(result.packet, null, 2)}\n`;
  writeFileSync(options.targetPath, json, 'utf8');

  return {
    valid: result.valid,
    issues: result.issues,
    targetPath: options.targetPath,
    bytesWritten: Buffer.byteLength(json, 'utf8'),
    packet: result.packet,
  };
}
