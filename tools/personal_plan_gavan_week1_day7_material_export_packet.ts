import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1Day6MaterialExportPacket,
} from './personal_plan_gavan_week1_day6_material_export_packet';
import type {
  GavanWeek1Day7ApprovedReviewerExport,
} from './personal_plan_gavan_week1_day7_reviewer_approval_gate';
import type {
  GavanWeek1Day7MaterialCandidate,
  GavanWeek1Day7MaterialCandidateIssue,
} from './personal_plan_gavan_week1_day7_material_candidate';
import {
  validateGavanWeek1Day7MaterialCandidate,
} from './personal_plan_gavan_week1_day7_material_candidate';

export const GAVAN_WEEK1_DAY7_MATERIAL_EXPORT_PACKET_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-day7-material-export-packet.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

export type GavanWeek1Day7MaterialExportGateId =
  | 'broadness'
  | 'listening_choice_option_counts'
  | 'listening_audio_honesty'
  | 'natural_choice_option_counts'
  | 'micro_dialogue_option_counts'
  | 'explanation_coverage'
  | 'no_recall_highlighting'
  | 'quiz_count'
  | 'media_honesty'
  | 'no_production_writes';

export type GavanWeek1Day7MaterialExportGate = {
  id: GavanWeek1Day7MaterialExportGateId;
  status: 'pass' | 'fail';
  evidence: string;
  issueCodes: string[];
};

export type GavanWeek1Day7MaterialExportPacket = {
  kind: 'gavan_week1_day7_material_export_packet';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  dayId: 'gavan-week1-day7';
  status: 'day7_material_export_not_live' | 'day7_material_export_blocked';
  sourceCandidateStatus: 'day7_material_candidate_not_live';
  sourceApprovedReviewerExportKind: 'gavan_week1_day7_approved_reviewer_export';
  sourceDay6ExportStatus: GavanWeek1Day6MaterialExportPacket['status'];
  exportApproved: false;
  liveIntegration: false;
  sourceWritesUsed: false;
  phaseWriteTargets: [];
  reviewerSummary: {
    blockCount: number;
    phraseCount: number;
    listeningChoiceItemCount: number;
    naturalChoiceItemCount: number;
    microDialogueItemCount: number;
    approvedContentUnitCount: number;
    approvedExplanationCount: number;
    approvedExerciseBlueprintCount: number;
    quizBlueprintCount: number;
    recallHasHints: boolean;
    recallHighlightsCorrectWords: boolean;
    exerciseTypes: string[];
  };
  qualityGates: GavanWeek1Day7MaterialExportGate[];
  preview: {
    titleRu: string;
    blocks: Array<{
      type: string;
      labelRu: string;
      purposeRu: string;
    }>;
    phrases: Array<{
      english: string;
      meaningRu: string;
    }>;
    listeningChoices: Array<{
      correctEnglish: string;
      optionCount: number;
      audioAssetStatus: 'not_generated';
      finalAudioReady: false;
    }>;
    naturalChoices: Array<{
      correctEnglish: string;
      optionCount: number;
    }>;
    microDialogues: Array<{
      targetEnglish: string;
      responseOptionCount: number;
    }>;
    listeningChoiceLine: string;
    naturalChoiceLine: string;
    microDialogueLine: string;
    recallLine: string;
    quizLine: string;
  };
  validationIssues: GavanWeek1Day7MaterialCandidateIssue[];
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: string[];
    liveFilesEdited: false;
  };
};

export type GavanWeek1Day7MaterialExportPacketOptions = {
  generatedAt: string;
};

export type GavanWeek1Day7MaterialExportPacketWriteOptions =
  GavanWeek1Day7MaterialExportPacketOptions & {
    targetPath: string;
  };

export type GavanWeek1Day7MaterialExportPacketIssueCode =
  | 'target_path_not_allowed'
  | 'export_packet_blocked';

export type GavanWeek1Day7MaterialExportPacketIssue = {
  code: GavanWeek1Day7MaterialExportPacketIssueCode;
  detail: string;
};

export type GavanWeek1Day7MaterialExportPacketWriteResult = {
  valid: boolean;
  issues: GavanWeek1Day7MaterialExportPacketIssue[];
  targetPath?: string;
  bytesWritten?: number;
  packet?: GavanWeek1Day7MaterialExportPacket;
};

function issue(
  code: GavanWeek1Day7MaterialExportPacketIssueCode,
  detail: string,
): GavanWeek1Day7MaterialExportPacketIssue {
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

export function isGavanWeek1Day7MaterialExportPacketTargetAllowed(
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

function hasIssue(
  issues: GavanWeek1Day7MaterialCandidateIssue[],
  codes: string[],
): boolean {
  return issues.some((candidateIssue) => codes.includes(candidateIssue.code));
}

function gate(
  id: GavanWeek1Day7MaterialExportGateId,
  issues: GavanWeek1Day7MaterialCandidateIssue[],
  issueCodes: string[],
  passEvidence: string,
): GavanWeek1Day7MaterialExportGate {
  const failed = hasIssue(issues, issueCodes);

  return {
    id,
    status: failed ? 'fail' : 'pass',
    evidence: failed ? `Failed issue codes: ${issueCodes.join(', ')}` : passEvidence,
    issueCodes: failed
      ? issues.filter((candidateIssue) => issueCodes.includes(candidateIssue.code))
        .map((candidateIssue) => candidateIssue.code)
      : [],
  };
}

function derivedIssue(
  code: GavanWeek1Day7MaterialCandidateIssue['code'],
): GavanWeek1Day7MaterialCandidateIssue {
  return {
    code,
    detail: 'Derived export gate issue.',
  };
}

function qualityGates(
  candidate: GavanWeek1Day7MaterialCandidate,
  issues: GavanWeek1Day7MaterialCandidateIssue[],
): GavanWeek1Day7MaterialExportGate[] {
  const productionWriteIssue = (
    candidate.liveIntegration ||
    candidate.sourceWritesUsed ||
    candidate.phaseWriteTargets.length > 0 ||
    candidate.writePolicy.liveFilesEdited
  )
    ? [derivedIssue('live_integration_enabled')]
    : [];
  const allIssues = [...issues, ...productionWriteIssue];

  return [
    gate('broadness', allIssues, ['forbidden_anchor_present'], 'No narrow identity anchors found.'),
    gate('listening_choice_option_counts', allIssues, ['listening_choice_option_count_mismatch'], 'Listening-choice items include exactly 3 unique options and the correct answer.'),
    gate('listening_audio_honesty', allIssues, ['listening_choice_fake_audio_claim'], 'Listening-choice audio remains not generated.'),
    gate('natural_choice_option_counts', allIssues, ['natural_choice_option_count_mismatch'], 'Natural-choice items include exactly 3 unique options and the correct answer.'),
    gate('micro_dialogue_option_counts', allIssues, ['micro_dialogue_option_count_mismatch'], 'Micro-dialogue items include exactly 3 unique response options and the target answer.'),
    gate('explanation_coverage', allIssues, ['missing_after_answer_explanation', 'invented_wrong_option_feedback'], 'Approved after-answer explanations cover new words and avoid invented wrong-option feedback.'),
    gate('no_recall_highlighting', allIssues, ['recall_highlighting_enabled'], 'Recall has no correct-word highlighting or hints.'),
    gate('quiz_count', allIssues, ['wrong_quiz_question_count', 'quiz_registered'], 'Quiz intent has 10 planned questions and is not registered.'),
    gate('media_honesty', allIssues, ['fake_audio_claim', 'fake_pronunciation_claim'], 'Audio and pronunciation claims remain non-final.'),
    gate('no_production_writes', allIssues, ['live_integration_enabled'], 'No production writes are allowed in this packet.'),
  ];
}

export function buildGavanWeek1Day7MaterialExportPacket(
  candidate: GavanWeek1Day7MaterialCandidate,
  approvedExport: GavanWeek1Day7ApprovedReviewerExport,
  day6Export: GavanWeek1Day6MaterialExportPacket,
  options: GavanWeek1Day7MaterialExportPacketOptions,
): GavanWeek1Day7MaterialExportPacket {
  const validation = validateGavanWeek1Day7MaterialCandidate(candidate, approvedExport, day6Export);
  const gates = qualityGates(candidate, validation.issues);
  const blocked = gates.some((item) => item.status === 'fail');

  return {
    kind: 'gavan_week1_day7_material_export_packet',
    generatedAt: options.generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    dayId: 'gavan-week1-day7',
    status: blocked ? 'day7_material_export_blocked' : 'day7_material_export_not_live',
    sourceCandidateStatus: candidate.status,
    sourceApprovedReviewerExportKind: approvedExport.kind,
    sourceDay6ExportStatus: day6Export.status,
    exportApproved: false,
    liveIntegration: false,
    sourceWritesUsed: false,
    phaseWriteTargets: [],
    reviewerSummary: {
      blockCount: candidate.exerciseBlocks.length,
      phraseCount: candidate.materialPhrases.length,
      listeningChoiceItemCount: candidate.listeningChoiceItems.length,
      naturalChoiceItemCount: candidate.naturalChoiceItems.length,
      microDialogueItemCount: candidate.microDialogueItems.length,
      approvedContentUnitCount: approvedExport.summary.contentUnits,
      approvedExplanationCount: approvedExport.summary.explanationCards,
      approvedExerciseBlueprintCount: approvedExport.summary.exerciseBlueprints,
      quizBlueprintCount: candidate.dayQuizIntent.questionBlueprints.length,
      recallHasHints: candidate.activeRecall.hintsEnabled,
      recallHighlightsCorrectWords: candidate.activeRecall.correctWordHighlighting,
      exerciseTypes: candidate.exerciseBlocks.map((blockItem) => blockItem.exerciseType),
    },
    qualityGates: gates,
    preview: {
      titleRu: candidate.sourceSeedDayTitle,
      blocks: candidate.exerciseBlocks.map((blockItem) => ({
        type: blockItem.exerciseType,
        labelRu: blockItem.userFacingLabelRu,
        purposeRu: blockItem.purposeRu,
      })),
      phrases: candidate.materialPhrases.map((phraseItem) => ({
        english: phraseItem.english,
        meaningRu: phraseItem.meaningRu,
      })),
      listeningChoices: candidate.listeningChoiceItems.map((item) => ({
        correctEnglish: item.correctEnglish,
        optionCount: item.options.length,
        audioAssetStatus: item.audioAssetStatus,
        finalAudioReady: item.finalAudioReady,
      })),
      naturalChoices: candidate.naturalChoiceItems.map((item) => ({
        correctEnglish: item.correctEnglish,
        optionCount: item.options.length,
      })),
      microDialogues: candidate.microDialogueItems.map((item) => ({
        targetEnglish: item.targetEnglish,
        responseOptionCount: item.responseOptions.length,
      })),
      listeningChoiceLine: `${candidate.listeningChoiceItems.length} listening-choice items, audio not generated.`,
      naturalChoiceLine: `${candidate.naturalChoiceItems.length} natural-choice items with short answer choices.`,
      microDialogueLine: `${candidate.microDialogueItems.length} micro-dialogue items with response options.`,
      recallLine: 'Recall uses changed order, no hints, and no correct-word highlighting.',
      quizLine: `${candidate.dayQuizIntent.questionBlueprints.length} planned questions, not written or registered.`,
    },
    validationIssues: validation.issues,
    writePolicy: {
      dryRunOnly: true,
      allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
      liveFilesEdited: false,
    },
  };
}

export function writeGavanWeek1Day7MaterialExportPacket(
  candidate: GavanWeek1Day7MaterialCandidate,
  approvedExport: GavanWeek1Day7ApprovedReviewerExport,
  day6Export: GavanWeek1Day6MaterialExportPacket,
  options: GavanWeek1Day7MaterialExportPacketWriteOptions,
): GavanWeek1Day7MaterialExportPacketWriteResult {
  if (!isGavanWeek1Day7MaterialExportPacketTargetAllowed(options.targetPath)) {
    return {
      valid: false,
      issues: [
        issue('target_path_not_allowed', 'Target path must stay under .codex-tmp or docs/reports.'),
      ],
    };
  }

  const packet = buildGavanWeek1Day7MaterialExportPacket(candidate, approvedExport, day6Export, {
    generatedAt: options.generatedAt,
  });

  if (packet.status === 'day7_material_export_blocked') {
    return {
      valid: false,
      issues: [
        issue('export_packet_blocked', 'Material export packet is blocked by failed quality gates.'),
      ],
      packet,
    };
  }

  const resolvedTarget = path.resolve(options.targetPath);
  mkdirSync(path.dirname(resolvedTarget), { recursive: true });
  const body = `${JSON.stringify(packet, null, 2)}\n`;
  writeFileSync(resolvedTarget, body, 'utf8');

  return {
    valid: true,
    issues: [],
    targetPath: resolvedTarget,
    bytesWritten: Buffer.byteLength(body, 'utf8'),
    packet,
  };
}
