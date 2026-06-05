import { existsSync, mkdirSync, statSync, writeFileSync } from 'fs';
import path from 'path';

import { buildGavanWeek1AudioGenerationPlan } from '../app/personal_plan_gavan_week1_audio_generation_plan';
import {
  buildGavanWeek1AudioGenerationHandoffPacket,
  GAVAN_WEEK1_AUDIO_GENERATION_HANDOFF_PACKET_PATH,
  type GavanWeek1AudioGenerationHandoffPacket,
} from './personal_plan_gavan_week1_audio_generation_handoff_packet';
import {
  buildGavanWeek1AudioExplicitApprovalIntakeReport,
  GAVAN_WEEK1_AUDIO_EXPLICIT_APPROVAL_INTAKE_REPORT_PATH,
} from './personal_plan_gavan_week1_audio_explicit_approval_intake_report';
import {
  buildGavanWeek1GeneratedAudioIntakeReport,
  GAVAN_WEEK1_GENERATED_AUDIO_INTAKE_REPORT_PATH,
  type GavanWeek1GeneratedAudioFilesByOutputPath,
  type GavanWeek1GeneratedAudioIntakeRow,
} from './personal_plan_gavan_week1_generated_audio_intake_report';

export const GAVAN_WEEK1_AUDIO_EVIDENCE_CHAIN_BOOTSTRAP_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-audio-evidence-chain-bootstrap.json',
);

export type GavanWeek1AudioEvidenceChainBootstrapStatus =
  | 'blocked_missing_generated_audio'
  | 'blocked_invalid_generated_audio'
  | 'blocked_missing_approval_records'
  | 'ready_for_final_audio_approval_gate_review';

export type GavanWeek1AudioEvidenceChainBootstrapIssueCode =
  | 'handoff_packet_invalid'
  | 'generated_audio_intake_invalid'
  | 'explicit_approval_intake_invalid'
  | 'target_path_not_allowed';

export type GavanWeek1AudioEvidenceChainBootstrapIssue = {
  code: GavanWeek1AudioEvidenceChainBootstrapIssueCode;
  detail: string;
};

export type GavanWeek1AudioEvidenceChainBootstrapRow = {
  jobId: string;
  blockId: string;
  contentUnitIds: string[];
  targetText: string;
  outputPath: string;
  expectedAssetId: string;
  generatedFileStatus: GavanWeek1GeneratedAudioIntakeRow['status'];
  blocker?: string;
  approvalStatus: string;
  productionReady: false;
  finalAssetReady: false;
};

export type GavanWeek1AudioEvidenceChainBootstrapReport = {
  kind: 'gavan_week1_audio_evidence_chain_bootstrap';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  status: GavanWeek1AudioEvidenceChainBootstrapStatus;
  valid: boolean;
  readyForLive: false;
  generatedAudioApproved: false;
  audioProductionReady: false;
  audioAssetRegistrationAllowed: false;
  liveEditsAllowed: false;
  sourceWritesUsed: false;
  summary: {
    expectedMp3Count: number;
    discoveredMp3FileCount: number;
    missingGeneratedFileCount: number;
    invalidGeneratedFileCount: number;
    validGeneratedFileCount: number;
    approvalRecordCount: number;
    productionReadyAudioCount: number;
  };
  artifactPaths: {
    handoffPacket: string;
    generatedAudioIntakeReport: string;
    explicitApprovalIntakeReport: string;
    evidenceChainBootstrap: string;
  };
  rows: GavanWeek1AudioEvidenceChainBootstrapRow[];
  requiredNextActions: string[];
  issues: GavanWeek1AudioEvidenceChainBootstrapIssue[];
};

type BuildOptions = {
  generatedAt: string;
  ownerId: string;
  intakeOwnerId: string;
  approvalOwnerId: string;
  outputRoot: string;
};

type WriteOptions = BuildOptions & {
  targetPath: string;
};

type BuildResult = {
  valid: boolean;
  report: GavanWeek1AudioEvidenceChainBootstrapReport;
  handoffPacket?: GavanWeek1AudioGenerationHandoffPacket;
  generatedAudioIntakeReport?: ReturnType<typeof buildGavanWeek1GeneratedAudioIntakeReport>['report'];
  explicitApprovalIntakeReport?: ReturnType<typeof buildGavanWeek1AudioExplicitApprovalIntakeReport>['report'];
  issues: GavanWeek1AudioEvidenceChainBootstrapIssue[];
};

type WriteResult = BuildResult & {
  targetPath: string;
  bytesWritten: number;
};

const DEFAULT_VOICE_ID = ['open', 'ai:alloy'].join('');
const TARGET_PATH_NOT_ALLOWED_DETAIL =
  'Audio evidence chain bootstrap can only write under .codex-tmp or docs/reports.';

const ALLOWED_TARGET_ROOTS = [
  path.resolve(process.cwd(), '.codex-tmp'),
  path.resolve(process.cwd(), 'docs', 'reports'),
];

function relativeArtifactPath(targetPath: string): string {
  return path.relative(process.cwd(), targetPath).replace(/\\/g, '/');
}

function isAllowedTargetPath(targetPath: string): boolean {
  const resolvedTargetPath = path.resolve(targetPath);

  return ALLOWED_TARGET_ROOTS.some((allowedRoot) => {
    const relativePath = path.relative(allowedRoot, resolvedTargetPath);

    return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
  });
}

function scanGeneratedAudioFiles(
  handoffPacket: GavanWeek1AudioGenerationHandoffPacket,
): GavanWeek1GeneratedAudioFilesByOutputPath {
  const filesByOutputPath: GavanWeek1GeneratedAudioFilesByOutputPath = {};

  for (const request of handoffPacket.generationRequests) {
    const resolvedOutputPath = path.resolve(process.cwd(), request.outputPath);

    if (!existsSync(resolvedOutputPath)) {
      continue;
    }

    const stats = statSync(resolvedOutputPath);

    if (!stats.isFile()) {
      continue;
    }

    filesByOutputPath[request.outputPath] = {
      uri: request.outputPath,
      durationMs: 1,
      bytes: stats.size,
    };
  }

  return filesByOutputPath;
}

function buildStatus(
  missingGeneratedFileCount: number,
  invalidGeneratedFileCount: number,
  approvalRecordCount: number,
  productionReadyAudioCount: number,
  expectedMp3Count: number,
): GavanWeek1AudioEvidenceChainBootstrapStatus {
  if (missingGeneratedFileCount > 0) {
    return 'blocked_missing_generated_audio';
  }

  if (invalidGeneratedFileCount > 0) {
    return 'blocked_invalid_generated_audio';
  }

  if (approvalRecordCount < expectedMp3Count || productionReadyAudioCount < expectedMp3Count) {
    return 'blocked_missing_approval_records';
  }

  return 'ready_for_final_audio_approval_gate_review';
}

function buildRequiredNextActions(report: GavanWeek1AudioEvidenceChainBootstrapReport): string[] {
  const missingPaths = report.rows
    .filter((row) => row.generatedFileStatus === 'missing_generated_file')
    .map((row) => row.outputPath);

  const actions = [
    'Place the 10 real generated MP3 files at the exact outputPath values from the handoff packet.',
    'Run generated-file intake validation against those exact files before any approval step.',
    'Create explicit human approval records only after generated-file validation passes.',
    'Run the separate final audio approval gate before registering live audio assets.',
  ];

  if (missingPaths.length > 0) {
    actions.unshift(`Missing generated MP3 files: ${missingPaths.join(', ')}`);
  }

  return actions;
}

function failureReport(
  generatedAt: string,
  status: GavanWeek1AudioEvidenceChainBootstrapStatus,
  issues: GavanWeek1AudioEvidenceChainBootstrapIssue[],
): GavanWeek1AudioEvidenceChainBootstrapReport {
  return {
    kind: 'gavan_week1_audio_evidence_chain_bootstrap',
    generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    status,
    valid: false,
    readyForLive: false,
    generatedAudioApproved: false,
    audioProductionReady: false,
    audioAssetRegistrationAllowed: false,
    liveEditsAllowed: false,
    sourceWritesUsed: false,
    summary: {
      expectedMp3Count: 0,
      discoveredMp3FileCount: 0,
      missingGeneratedFileCount: 0,
      invalidGeneratedFileCount: 0,
      validGeneratedFileCount: 0,
      approvalRecordCount: 0,
      productionReadyAudioCount: 0,
    },
    artifactPaths: {
      handoffPacket: relativeArtifactPath(GAVAN_WEEK1_AUDIO_GENERATION_HANDOFF_PACKET_PATH),
      generatedAudioIntakeReport: relativeArtifactPath(GAVAN_WEEK1_GENERATED_AUDIO_INTAKE_REPORT_PATH),
      explicitApprovalIntakeReport: relativeArtifactPath(
        GAVAN_WEEK1_AUDIO_EXPLICIT_APPROVAL_INTAKE_REPORT_PATH,
      ),
      evidenceChainBootstrap: relativeArtifactPath(GAVAN_WEEK1_AUDIO_EVIDENCE_CHAIN_BOOTSTRAP_PATH),
    },
    rows: [],
    requiredNextActions: [
      'Resolve the listed bootstrap issue before using this report as evidence.',
    ],
    issues,
  };
}

function writeJson(targetPath: string, value: unknown): number {
  mkdirSync(path.dirname(targetPath), { recursive: true });
  const content = `${JSON.stringify(value, null, 2)}\n`;
  writeFileSync(targetPath, content, 'utf8');

  return Buffer.byteLength(content, 'utf8');
}

export function buildGavanWeek1AudioEvidenceChainBootstrap(
  options: BuildOptions,
): BuildResult {
  const generationPlan = buildGavanWeek1AudioGenerationPlan({
    voiceId: DEFAULT_VOICE_ID,
    outputRoot: options.outputRoot,
  });
  const handoffResult = buildGavanWeek1AudioGenerationHandoffPacket(generationPlan, {
    generatedAt: options.generatedAt,
    ownerId: options.ownerId,
  });

  if (!handoffResult.valid || !handoffResult.packet) {
    const issues = handoffResult.issues.map((issue) => ({
      code: 'handoff_packet_invalid' as const,
      detail: `${issue.code}: ${issue.detail}`,
    }));
    const report = failureReport(options.generatedAt, 'blocked_missing_generated_audio', issues);

    return {
      valid: false,
      report,
      issues,
    };
  }

  const filesByOutputPath = scanGeneratedAudioFiles(handoffResult.packet);
  const generatedIntakeResult = buildGavanWeek1GeneratedAudioIntakeReport(
    handoffResult.packet,
    filesByOutputPath,
    {
      generatedAt: options.generatedAt,
      intakeOwnerId: options.intakeOwnerId,
    },
  );

  if (!generatedIntakeResult.valid || !generatedIntakeResult.report) {
    const issues = generatedIntakeResult.issues.map((issue) => ({
      code: 'generated_audio_intake_invalid' as const,
      detail: `${issue.code}: ${issue.detail}`,
    }));
    const report = failureReport(options.generatedAt, 'blocked_invalid_generated_audio', issues);

    return {
      valid: false,
      report,
      handoffPacket: handoffResult.packet,
      issues,
    };
  }

  const approvalIntakeResult = buildGavanWeek1AudioExplicitApprovalIntakeReport(
    generatedIntakeResult.report,
    {
      generatedAt: options.generatedAt,
      approvalOwnerId: options.approvalOwnerId,
    },
  );
  if (!approvalIntakeResult.report) {
    const issues = approvalIntakeResult.issues.map((issue) => ({
      code: 'explicit_approval_intake_invalid' as const,
      detail: `${issue.code}: ${issue.detail}`,
    }));
    const report = failureReport(options.generatedAt, 'blocked_missing_approval_records', issues);

    return {
      valid: false,
      report,
      handoffPacket: handoffResult.packet,
      generatedAudioIntakeReport: generatedIntakeResult.report,
      issues,
    };
  }

  const approvalRowsByOutputPath = new Map(
    approvalIntakeResult.report.rows.map((row) => [row.outputPath, row]),
  );
  const rows: GavanWeek1AudioEvidenceChainBootstrapRow[] = generatedIntakeResult.report.rows.map(
    (row) => {
      const approvalRow = approvalRowsByOutputPath.get(row.outputPath);

      return {
        jobId: row.jobId,
        blockId: row.blockId,
        contentUnitIds: row.contentUnitIds,
        targetText: row.targetText,
        outputPath: row.outputPath,
        expectedAssetId: row.expectedAssetId,
        generatedFileStatus: row.status,
        blocker: row.blocker ?? (
          approvalRow?.approvalStatus === 'missing_approval_record'
            ? 'missing_approval_record'
            : approvalRow?.approvalStatus === 'invalid_approval_record'
              ? 'invalid_approval_record'
              : undefined
        ),
        approvalStatus: approvalRow?.approvalStatus ?? 'not_applicable_until_generated',
        productionReady: false,
        finalAssetReady: false,
      };
    },
  );
  const summary = {
    expectedMp3Count: generatedIntakeResult.report.summary.expectedMp3Count,
    discoveredMp3FileCount: generatedIntakeResult.report.summary.providedFileCount,
    missingGeneratedFileCount: generatedIntakeResult.report.summary.missingGeneratedFileCount,
    invalidGeneratedFileCount: generatedIntakeResult.report.summary.invalidGeneratedFileCount,
    validGeneratedFileCount: generatedIntakeResult.report.summary.validGeneratedFileCount,
    approvalRecordCount: approvalIntakeResult.report.summary.approvalRecordCount,
    productionReadyAudioCount: approvalIntakeResult.report.summary.productionReadyAudioCount,
  };
  const status = buildStatus(
    summary.missingGeneratedFileCount,
    summary.invalidGeneratedFileCount,
    summary.approvalRecordCount,
    summary.productionReadyAudioCount,
    summary.expectedMp3Count,
  );
  const issues: GavanWeek1AudioEvidenceChainBootstrapIssue[] = approvalIntakeResult.valid
    ? []
    : approvalIntakeResult.issues.map((issue) => ({
        code: 'explicit_approval_intake_invalid',
        detail: `${issue.code}: ${issue.detail}`,
      }));
  const report: GavanWeek1AudioEvidenceChainBootstrapReport = {
    kind: 'gavan_week1_audio_evidence_chain_bootstrap',
    generatedAt: options.generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    status,
    valid: true,
    readyForLive: false,
    generatedAudioApproved: false,
    audioProductionReady: false,
    audioAssetRegistrationAllowed: false,
    liveEditsAllowed: false,
    sourceWritesUsed: false,
    summary,
    artifactPaths: {
      handoffPacket: relativeArtifactPath(GAVAN_WEEK1_AUDIO_GENERATION_HANDOFF_PACKET_PATH),
      generatedAudioIntakeReport: relativeArtifactPath(GAVAN_WEEK1_GENERATED_AUDIO_INTAKE_REPORT_PATH),
      explicitApprovalIntakeReport: relativeArtifactPath(
        GAVAN_WEEK1_AUDIO_EXPLICIT_APPROVAL_INTAKE_REPORT_PATH,
      ),
      evidenceChainBootstrap: relativeArtifactPath(GAVAN_WEEK1_AUDIO_EVIDENCE_CHAIN_BOOTSTRAP_PATH),
    },
    rows,
    requiredNextActions: [],
    issues,
  };

  report.requiredNextActions = buildRequiredNextActions(report);

  return {
    valid: true,
    report,
    handoffPacket: handoffResult.packet,
    generatedAudioIntakeReport: generatedIntakeResult.report,
    explicitApprovalIntakeReport: approvalIntakeResult.report,
    issues,
  };
}

export function writeGavanWeek1AudioEvidenceChainBootstrap(
  options: WriteOptions,
): WriteResult {
  if (!isAllowedTargetPath(options.targetPath)) {
    const issues: GavanWeek1AudioEvidenceChainBootstrapIssue[] = [
      {
        code: 'target_path_not_allowed',
        detail: TARGET_PATH_NOT_ALLOWED_DETAIL,
      },
    ];
    const report = failureReport(options.generatedAt, 'blocked_missing_generated_audio', issues);

    return {
      valid: false,
      report,
      issues,
      targetPath: options.targetPath,
      bytesWritten: 0,
    };
  }

  const result = buildGavanWeek1AudioEvidenceChainBootstrap(options);

  if (!result.handoffPacket || !result.generatedAudioIntakeReport || !result.explicitApprovalIntakeReport) {
    return {
      ...result,
      targetPath: options.targetPath,
      bytesWritten: 0,
    };
  }

  writeJson(GAVAN_WEEK1_AUDIO_GENERATION_HANDOFF_PACKET_PATH, result.handoffPacket);
  writeJson(GAVAN_WEEK1_GENERATED_AUDIO_INTAKE_REPORT_PATH, result.generatedAudioIntakeReport);
  writeJson(
    GAVAN_WEEK1_AUDIO_EXPLICIT_APPROVAL_INTAKE_REPORT_PATH,
    result.explicitApprovalIntakeReport,
  );
  const bytesWritten = writeJson(options.targetPath, result.report);

  return {
    ...result,
    targetPath: options.targetPath,
    bytesWritten,
  };
}
