import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

import type {
  GavanWeek1AudioGenerationPlan,
} from '../app/personal_plan_gavan_week1_audio_generation_plan';
import type {
  PlanAudioGenerationJob,
} from '../app/personal_plan_audio_generation_jobs';

export const GAVAN_WEEK1_AUDIO_GENERATION_HANDOFF_PACKET_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-audio-generation-handoff-packet.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
] as const;

export type GavanWeek1AudioGenerationHandoffPacketStatus =
  | 'ready_for_audio_generation_inputs';

export type GavanWeek1AudioGenerationHandoffIssueCode =
  | 'wrong_plan_or_week'
  | 'generation_plan_not_ready'
  | 'duplicate_output_path'
  | 'target_path_not_allowed';

export type GavanWeek1AudioGenerationHandoffIssue = {
  code: GavanWeek1AudioGenerationHandoffIssueCode;
  detail: string;
};

export type GavanWeek1AudioGenerationHandoffPacketOptions = {
  generatedAt: string;
  ownerId: string;
};

export type GavanWeek1AudioGenerationHandoffPacketWriteOptions =
  GavanWeek1AudioGenerationHandoffPacketOptions & {
    targetPath: string;
  };

export type GavanWeek1AudioGenerationRequest = {
  jobId: string;
  blockId: string;
  contentUnitId?: string;
  contentUnitIds: string[];
  exerciseType: string;
  targetText: string;
  sourceBlockTargetText: string;
  provider: string;
  voiceId: string;
  outputPath: string;
  expectedAssetId: string;
  expectedFileType: 'mp3';
  splitPolicy: 'per_content_unit' | 'whole_block';
  requiredMetadata: {
    uri: string;
    durationMs: 'positive_number_after_generation';
    bytes: 'positive_number_after_generation';
  };
};

export type GavanWeek1AudioGenerationHandoffPacket = {
  kind: 'gavan_week1_audio_generation_handoff_packet';
  generatedAt: string;
  ownerId: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  sourceAudioWeekId: 'week1';
  status: GavanWeek1AudioGenerationHandoffPacketStatus;
  readyForLive: false;
  audioProductionReady: false;
  audioApprovalReady: false;
  approvalMayBeInferred: false;
  sourceWritesUsed: false;
  liveEditsAllowed: false;
  audioAssetRegistrationAllowed: false;
  pronunciationReadinessMayBeInferred: false;
  summary: {
    manifestItems: number;
    expectedGenerationJobCount: number;
    expectedMp3Count: number;
    uniqueOutputPathCount: number;
    generationBlockerCount: number;
    approvalRecordCount: number;
    productionReadyAudioCount: number;
  };
  generationRequests: GavanWeek1AudioGenerationRequest[];
  approvalChecklist: [
    'Generate or provide every expected MP3 before creating approval records.',
    'Validate each generated file has a playable URI, positive duration, positive bytes, provider, and voice id.',
    'Create one explicit approval record per generated asset with reviewer id, ISO approvedAt, and checksum.',
    'Only after explicit approval may assets be promoted to approved/final in a separate guarded pass.',
  ];
  requiredNextActions: [
    'Generate or provide the listed MP3 files at the exact outputPath values.',
    'Run generated audio validation against the outputPath map.',
    'Create explicit approval records only after every generated file validates.',
    'Keep audio registry, runtime, pronunciation, and live route edits for a separate approved pass.',
  ];
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: ['.codex-tmp', 'docs/reports'];
    liveFilesEdited: false;
    audioFilesWritten: false;
  };
};

export type GavanWeek1AudioGenerationHandoffPacketBuildResult = {
  valid: boolean;
  issues: GavanWeek1AudioGenerationHandoffIssue[];
  packet?: GavanWeek1AudioGenerationHandoffPacket;
};

export type GavanWeek1AudioGenerationHandoffPacketWriteResult =
  GavanWeek1AudioGenerationHandoffPacketBuildResult & {
    targetPath?: string;
    bytesWritten?: number;
  };

function issue(
  code: GavanWeek1AudioGenerationHandoffIssueCode,
  detail: string,
): GavanWeek1AudioGenerationHandoffIssue {
  return { code, detail };
}

function withTrailingSeparator(value: string): string {
  const resolved = path.resolve(value);
  return resolved.endsWith(path.sep) ? resolved : `${resolved}${path.sep}`;
}

function isInside(target: string, parentWithSeparator: string): boolean {
  return target === parentWithSeparator.slice(0, -1) || target.startsWith(parentWithSeparator);
}

function allowedRootPaths(cwd = process.cwd()): string[] {
  return ALLOWED_TARGET_ROOTS.map((segments) =>
    withTrailingSeparator(path.join(cwd, ...segments)),
  );
}

export function isGavanWeek1AudioGenerationHandoffPacketTargetAllowed(
  targetPath: string,
  cwd = process.cwd(),
): boolean {
  const resolvedTarget = path.resolve(cwd, targetPath);
  const rootWithSeparator = withTrailingSeparator(cwd);

  if (!isInside(resolvedTarget, rootWithSeparator)) {
    return false;
  }

  return allowedRootPaths(cwd).some((allowedRoot) => isInside(resolvedTarget, allowedRoot));
}

function validateGenerationPlan(
  generationPlan: GavanWeek1AudioGenerationPlan,
): GavanWeek1AudioGenerationHandoffIssue[] {
  const issues: GavanWeek1AudioGenerationHandoffIssue[] = [];

  if (generationPlan.planId !== 'gavan' || generationPlan.weekId !== 'week1') {
    issues.push(issue(
      'wrong_plan_or_week',
      'Audio generation handoff can only target the Gavan week 1 generation plan.',
    ));
  }

  if (
    generationPlan.generation.summary.jobs <= 0 ||
    generationPlan.generation.summary.blockers !== 0 ||
    generationPlan.generation.jobs.some((job) => job.status !== 'ready_to_generate')
  ) {
    issues.push(issue(
      'generation_plan_not_ready',
      'Audio generation handoff requires a blocker-free ready-to-generate Gavan week 1 plan.',
    ));
  }

  const outputPaths = generationPlan.generation.jobs.map((job) => job.outputPath);
  if (new Set(outputPaths).size !== outputPaths.length) {
    issues.push(issue(
      'duplicate_output_path',
      'Audio generation handoff requires every job to have a unique output path.',
    ));
  }

  return issues;
}

function requestForJob(job: PlanAudioGenerationJob): GavanWeek1AudioGenerationRequest {
  return {
    jobId: job.id,
    blockId: job.blockId,
    ...(job.contentUnitId ? { contentUnitId: job.contentUnitId } : {}),
    contentUnitIds: job.contentUnitIds,
    exerciseType: job.exerciseType,
    targetText: job.targetText,
    sourceBlockTargetText: job.sourceBlockTargetText,
    provider: job.provider,
    voiceId: job.voiceId,
    outputPath: job.outputPath,
    expectedAssetId: job.expectedAssetId,
    expectedFileType: 'mp3',
    splitPolicy: job.splitPolicy,
    requiredMetadata: {
      uri: job.outputPath,
      durationMs: 'positive_number_after_generation',
      bytes: 'positive_number_after_generation',
    },
  };
}

export function buildGavanWeek1AudioGenerationHandoffPacket(
  generationPlan: GavanWeek1AudioGenerationPlan,
  options: GavanWeek1AudioGenerationHandoffPacketOptions,
): GavanWeek1AudioGenerationHandoffPacketBuildResult {
  const issues = validateGenerationPlan(generationPlan);
  if (issues.length > 0) {
    return { valid: false, issues };
  }

  const generationRequests = generationPlan.generation.jobs.map(requestForJob);
  const uniqueOutputPathCount = new Set(generationRequests.map((request) => request.outputPath)).size;

  return {
    valid: true,
    issues: [],
    packet: {
      kind: 'gavan_week1_audio_generation_handoff_packet',
      generatedAt: options.generatedAt,
      ownerId: options.ownerId,
      planId: 'gavan',
      weekId: 'gavan-week1',
      sourceAudioWeekId: 'week1',
      status: 'ready_for_audio_generation_inputs',
      readyForLive: false,
      audioProductionReady: false,
      audioApprovalReady: false,
      approvalMayBeInferred: false,
      sourceWritesUsed: false,
      liveEditsAllowed: false,
      audioAssetRegistrationAllowed: false,
      pronunciationReadinessMayBeInferred: false,
      summary: {
        manifestItems: generationPlan.audioManifest.summary.totalListeningBlocks,
        expectedGenerationJobCount: generationPlan.generation.summary.jobs,
        expectedMp3Count: generationRequests.length,
        uniqueOutputPathCount,
        generationBlockerCount: generationPlan.generation.summary.blockers,
        approvalRecordCount: 0,
        productionReadyAudioCount: 0,
      },
      generationRequests,
      approvalChecklist: [
        'Generate or provide every expected MP3 before creating approval records.',
        'Validate each generated file has a playable URI, positive duration, positive bytes, provider, and voice id.',
        'Create one explicit approval record per generated asset with reviewer id, ISO approvedAt, and checksum.',
        'Only after explicit approval may assets be promoted to approved/final in a separate guarded pass.',
      ],
      requiredNextActions: [
        'Generate or provide the listed MP3 files at the exact outputPath values.',
        'Run generated audio validation against the outputPath map.',
        'Create explicit approval records only after every generated file validates.',
        'Keep audio registry, runtime, pronunciation, and live route edits for a separate approved pass.',
      ],
      writePolicy: {
        dryRunOnly: true,
        allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
        liveFilesEdited: false,
        audioFilesWritten: false,
      },
    },
  };
}

export function writeGavanWeek1AudioGenerationHandoffPacket(
  generationPlan: GavanWeek1AudioGenerationPlan,
  options: GavanWeek1AudioGenerationHandoffPacketWriteOptions,
): GavanWeek1AudioGenerationHandoffPacketWriteResult {
  if (!isGavanWeek1AudioGenerationHandoffPacketTargetAllowed(options.targetPath)) {
    return {
      valid: false,
      issues: [issue(
        'target_path_not_allowed',
        'Audio generation handoff packet can only write under .codex-tmp or docs/reports.',
      )],
    };
  }

  const result = buildGavanWeek1AudioGenerationHandoffPacket(generationPlan, options);
  if (!result.valid || !result.packet) return result;

  const output = `${JSON.stringify(result.packet, null, 2)}\n`;
  mkdirSync(path.dirname(options.targetPath), { recursive: true });
  writeFileSync(options.targetPath, output, 'utf8');

  return {
    ...result,
    targetPath: options.targetPath,
    bytesWritten: Buffer.byteLength(output, 'utf8'),
  };
}
