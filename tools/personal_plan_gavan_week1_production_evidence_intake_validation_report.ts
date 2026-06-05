import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import path from 'path';

import type {
  GavanWeek1ProductionEvidenceAcquisitionPacket,
  GavanWeek1ProductionEvidenceRequest,
} from './personal_plan_gavan_week1_production_evidence_acquisition_packet';

export const GAVAN_WEEK1_PRODUCTION_EVIDENCE_INTAKE_VALIDATION_REPORT_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-production-evidence-intake-validation-report.json',
);

type IntakeStatus =
  | 'blocked_missing_external_evidence'
  | 'blocked_partial_external_evidence'
  | 'awaiting_review_for_all_external_evidence';

type RowStatus =
  | 'missing_expected_file'
  | 'invalid_evidence_file'
  | 'present_pending_review';

type IssueCode =
  | 'wrong_acquisition_packet_kind'
  | 'wrong_plan_or_week'
  | 'acquisition_packet_not_non_live'
  | 'target_path_not_allowed';

export type GavanWeek1ProductionEvidenceIntakeValidationIssue = {
  code: IssueCode;
  detail: string;
};

export type GavanWeek1ProductionEvidenceIntakeValidationRow = {
  requestId: string;
  stream: GavanWeek1ProductionEvidenceRequest['stream'];
  expectedPath: string;
  resolvedPath: string;
  status: RowStatus;
  fileSizeBytes: number;
  blockingReason: string;
};

export type GavanWeek1ProductionEvidenceIntakeValidationReport = {
  kind: 'gavan_week1_production_evidence_intake_validation_report';
  generatedAt: string;
  intakeOwnerId: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  sourceAcquisitionStatus: GavanWeek1ProductionEvidenceAcquisitionPacket['status'];
  status: IntakeStatus;
  releaseDecision: 'hold';
  productionReady: false;
  readyForLive: false;
  evidenceIntakeComplete: false;
  audioEvidenceComplete: false;
  pronunciationEvidenceComplete: false;
  routeEvidenceComplete: false;
  sourceWritesUsed: false;
  liveEditsAllowed: false;
  summary: {
    sourceEvidenceRequestCount: number;
    intakeRowCount: number;
    presentEvidenceCount: number;
    missingEvidenceCount: number;
    invalidEvidenceCount: number;
    pendingReviewEvidenceCount: number;
    audioPresentEvidenceCount: number;
    pronunciationPresentEvidenceCount: number;
    routePresentEvidenceCount: number;
    blockedRequestCount: number;
  };
  rows: GavanWeek1ProductionEvidenceIntakeValidationRow[];
  writePolicy: {
    allowedTargetRoots: ['.codex-tmp', 'docs/reports'];
    sourceWritesAllowed: false;
    liveWritesAllowed: false;
  };
};

export type GavanWeek1ProductionEvidenceIntakeValidationBuildResult = {
  valid: boolean;
  issues: GavanWeek1ProductionEvidenceIntakeValidationIssue[];
  report?: GavanWeek1ProductionEvidenceIntakeValidationReport;
};

export type GavanWeek1ProductionEvidenceIntakeValidationWriteResult =
  GavanWeek1ProductionEvidenceIntakeValidationBuildResult & {
    targetPath?: string;
    bytesWritten?: number;
  };

function issue(
  code: IssueCode,
  detail: string,
): GavanWeek1ProductionEvidenceIntakeValidationIssue {
  return { code, detail };
}

function withTrailingSeparator(value: string): string {
  const resolved = path.resolve(value);
  return resolved.endsWith(path.sep) ? resolved : `${resolved}${path.sep}`;
}

function isInside(target: string, parentWithSeparator: string): boolean {
  return target === parentWithSeparator.slice(0, -1) || target.startsWith(parentWithSeparator);
}

function isTargetAllowed(targetPath: string, cwd = process.cwd()): boolean {
  const resolvedTarget = path.resolve(cwd, targetPath);
  const rootWithSeparator = withTrailingSeparator(cwd);
  if (!isInside(resolvedTarget, rootWithSeparator)) {
    return false;
  }

  return [
    withTrailingSeparator(path.join(cwd, '.codex-tmp')),
    withTrailingSeparator(path.join(cwd, 'docs', 'reports')),
  ].some((allowedRoot) => isInside(resolvedTarget, allowedRoot));
}

function validateAcquisitionPacket(
  packet: GavanWeek1ProductionEvidenceAcquisitionPacket,
): GavanWeek1ProductionEvidenceIntakeValidationIssue[] {
  const issues: GavanWeek1ProductionEvidenceIntakeValidationIssue[] = [];

  if (packet.kind !== 'gavan_week1_production_evidence_acquisition_packet') {
    issues.push(issue(
      'wrong_acquisition_packet_kind',
      'Production evidence intake validation requires the Gavan week 1 acquisition packet.',
    ));
  }
  if (packet.planId !== 'gavan' || packet.weekId !== 'gavan-week1') {
    issues.push(issue(
      'wrong_plan_or_week',
      'Production evidence intake validation can only target Gavan week 1.',
    ));
  }
  if (
    packet.productionReady ||
    packet.readyForLive ||
    packet.evidenceAcquisitionComplete ||
    packet.sourceWritesUsed ||
    packet.liveEditsAllowed
  ) {
    issues.push(issue(
      'acquisition_packet_not_non_live',
      'Production evidence intake validation cannot consume a live-ready or completed acquisition packet.',
    ));
  }

  return issues;
}

function isUnsafeJsonEvidence(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    record.productionReady === true ||
    record.readyForLive === true ||
    record.approvedForRuntime === true ||
    record.liveEditsAllowed === true ||
    record.sourceWritesUsed === true
  );
}

function validateEvidenceFile(expectedPath: string): {
  status: RowStatus;
  fileSizeBytes: number;
  blockingReason: string;
} {
  const resolvedPath = path.resolve(expectedPath);
  if (!existsSync(resolvedPath)) {
    return {
      status: 'missing_expected_file',
      fileSizeBytes: 0,
      blockingReason: 'Expected external evidence file is missing.',
    };
  }

  const fileSizeBytes = statSync(resolvedPath).size;
  const extension = path.extname(resolvedPath).toLowerCase();

  if (extension === '.mp3') {
    const header = readFileSync(resolvedPath, { encoding: null, flag: 'r' }).subarray(0, 3);
    const hasMp3Header =
      header.toString('utf8') === 'ID3' ||
      (header[0] === 0xff && (header[1] & 0xe0) === 0xe0);

    if (fileSizeBytes < 32 || !hasMp3Header) {
      return {
        status: 'invalid_evidence_file',
        fileSizeBytes,
        blockingReason: 'MP3 evidence file is missing an MP3 header or is too small.',
      };
    }
  }

  if (extension === '.json') {
    try {
      const parsed = JSON.parse(readFileSync(resolvedPath, 'utf8'));
      if (isUnsafeJsonEvidence(parsed)) {
        return {
          status: 'invalid_evidence_file',
          fileSizeBytes,
          blockingReason: 'Evidence file contains unsafe live or production-ready claims.',
        };
      }
    } catch {
      return {
        status: 'invalid_evidence_file',
        fileSizeBytes,
        blockingReason: 'JSON evidence file could not be parsed.',
      };
    }
  }

  return {
    status: 'present_pending_review',
    fileSizeBytes,
    blockingReason: 'Evidence file is present but still requires its explicit downstream gate.',
  };
}

function buildRows(
  packet: GavanWeek1ProductionEvidenceAcquisitionPacket,
): GavanWeek1ProductionEvidenceIntakeValidationRow[] {
  return packet.requests.map((request) => {
    const expectedPath = request.expectedPath ?? '';
    const resolvedPath = path.resolve(expectedPath);
    const validation = validateEvidenceFile(expectedPath);

    return {
      requestId: request.id,
      stream: request.stream,
      expectedPath,
      resolvedPath,
      status: validation.status,
      fileSizeBytes: validation.fileSizeBytes,
      blockingReason: validation.blockingReason,
    };
  });
}

function countRows(
  rows: GavanWeek1ProductionEvidenceIntakeValidationRow[],
  status: RowStatus,
): number {
  return rows.filter((row) => row.status === status).length;
}

function countPresentRows(
  rows: GavanWeek1ProductionEvidenceIntakeValidationRow[],
  stream: GavanWeek1ProductionEvidenceRequest['stream'],
): number {
  return rows.filter((row) => row.stream === stream && row.status === 'present_pending_review').length;
}

function reportStatus(
  presentEvidenceCount: number,
  blockedRequestCount: number,
): IntakeStatus {
  if (presentEvidenceCount === 0) {
    return 'blocked_missing_external_evidence';
  }
  if (blockedRequestCount === 0) {
    return 'awaiting_review_for_all_external_evidence';
  }
  return 'blocked_partial_external_evidence';
}

export function buildGavanWeek1ProductionEvidenceIntakeValidationReport(
  packet: GavanWeek1ProductionEvidenceAcquisitionPacket,
  options: {
    generatedAt: string;
    intakeOwnerId: string;
  },
): GavanWeek1ProductionEvidenceIntakeValidationBuildResult {
  const issues = validateAcquisitionPacket(packet);
  if (issues.length > 0) {
    return {
      valid: false,
      issues,
    };
  }

  const rows = buildRows(packet);
  const presentEvidenceCount = countRows(rows, 'present_pending_review');
  const missingEvidenceCount = countRows(rows, 'missing_expected_file');
  const invalidEvidenceCount = countRows(rows, 'invalid_evidence_file');
  const blockedRequestCount = missingEvidenceCount + invalidEvidenceCount;

  return {
    valid: true,
    issues: [],
    report: {
      kind: 'gavan_week1_production_evidence_intake_validation_report',
      generatedAt: options.generatedAt,
      intakeOwnerId: options.intakeOwnerId,
      planId: 'gavan',
      weekId: 'gavan-week1',
      sourceAcquisitionStatus: packet.status,
      status: reportStatus(presentEvidenceCount, blockedRequestCount),
      releaseDecision: 'hold',
      productionReady: false,
      readyForLive: false,
      evidenceIntakeComplete: false,
      audioEvidenceComplete: false,
      pronunciationEvidenceComplete: false,
      routeEvidenceComplete: false,
      sourceWritesUsed: false,
      liveEditsAllowed: false,
      summary: {
        sourceEvidenceRequestCount: packet.summary.evidenceRequestCount,
        intakeRowCount: rows.length,
        presentEvidenceCount,
        missingEvidenceCount,
        invalidEvidenceCount,
        pendingReviewEvidenceCount: presentEvidenceCount,
        audioPresentEvidenceCount: countPresentRows(rows, 'audio'),
        pronunciationPresentEvidenceCount: countPresentRows(rows, 'pronunciation'),
        routePresentEvidenceCount: countPresentRows(rows, 'route'),
        blockedRequestCount,
      },
      rows,
      writePolicy: {
        allowedTargetRoots: ['.codex-tmp', 'docs/reports'],
        sourceWritesAllowed: false,
        liveWritesAllowed: false,
      },
    },
  };
}

export function writeGavanWeek1ProductionEvidenceIntakeValidationReport(
  packet: GavanWeek1ProductionEvidenceAcquisitionPacket,
  options: {
    generatedAt: string;
    intakeOwnerId: string;
    targetPath?: string;
  },
): GavanWeek1ProductionEvidenceIntakeValidationWriteResult {
  const targetPath = path.resolve(
    options.targetPath ?? GAVAN_WEEK1_PRODUCTION_EVIDENCE_INTAKE_VALIDATION_REPORT_PATH,
  );

  if (!isTargetAllowed(targetPath)) {
    return {
      valid: false,
      issues: [
        issue(
          'target_path_not_allowed',
          'Production evidence intake validation report can only write under .codex-tmp or docs/reports.',
        ),
      ],
    };
  }

  const result = buildGavanWeek1ProductionEvidenceIntakeValidationReport(packet, options);
  if (!result.valid || !result.report) {
    return result;
  }

  const serialized = `${JSON.stringify(result.report, null, 2)}\n`;
  mkdirSync(path.dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, serialized, 'utf8');

  return {
    ...result,
    targetPath,
    bytesWritten: Buffer.byteLength(serialized, 'utf8'),
  };
}
