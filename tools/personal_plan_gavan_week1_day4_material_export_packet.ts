import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1ContentAuthoringSeed,
} from './personal_plan_gavan_week1_content_authoring_seed';
import type {
  GavanWeek1Day3MaterialExportPacket,
} from './personal_plan_gavan_week1_day3_material_export_packet';
import type {
  GavanWeek1Day4MaterialCandidate,
  GavanWeek1Day4MaterialCandidateIssue,
} from './personal_plan_gavan_week1_day4_material_candidate';
import {
  validateGavanWeek1Day4MaterialCandidate,
} from './personal_plan_gavan_week1_day4_material_candidate';

export const GAVAN_WEEK1_DAY4_MATERIAL_EXPORT_PACKET_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-day4-material-export-packet.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

export type GavanWeek1Day4MaterialExportGateId =
  | 'broadness'
  | 'choice_option_counts'
  | 'repair_tile_counts'
  | 'distractor_safety'
  | 'explanation_coverage'
  | 'no_recall_highlighting'
  | 'quiz_count'
  | 'media_honesty'
  | 'no_production_writes';

export type GavanWeek1Day4MaterialExportGate = {
  id: GavanWeek1Day4MaterialExportGateId;
  status: 'pass' | 'fail';
  evidence: string;
  issueCodes: string[];
};

export type GavanWeek1Day4MaterialExportPacket = {
  kind: 'gavan_week1_day4_material_export_packet';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  dayId: 'gavan-week1-day4';
  status: 'day4_material_export_not_live' | 'day4_material_export_blocked';
  sourceCandidateStatus: 'day4_material_candidate_not_live';
  exportApproved: false;
  liveIntegration: false;
  sourceWritesUsed: false;
  phaseWriteTargets: [];
  reviewerSummary: {
    blockCount: number;
    phraseCount: number;
    naturalChoiceItemCount: number;
    repairItemCount: number;
    quickReplyItemCount: number;
    quizBlueprintCount: number;
    recallHasHints: boolean;
    recallHighlightsCorrectWords: boolean;
    exerciseTypes: string[];
  };
  qualityGates: GavanWeek1Day4MaterialExportGate[];
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
    naturalChoices: Array<{
      correctEnglish: string;
      optionCount: number;
    }>;
    repairItems: Array<{
      english: string;
      wordTiles: string[];
      scrambledTiles: string[];
      distractorTiles: string[];
    }>;
    quickReplies: Array<{
      correctEnglish: string;
      optionCount: number;
    }>;
    naturalChoiceLine: string;
    repairLine: string;
    quickReplyLine: string;
    recallLine: string;
    quizLine: string;
  };
  validationIssues: GavanWeek1Day4MaterialCandidateIssue[];
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: string[];
    liveFilesEdited: false;
  };
};

export type GavanWeek1Day4MaterialExportPacketOptions = {
  generatedAt: string;
};

export type GavanWeek1Day4MaterialExportPacketWriteOptions =
  GavanWeek1Day4MaterialExportPacketOptions & {
    targetPath: string;
  };

export type GavanWeek1Day4MaterialExportPacketIssueCode =
  | 'target_path_not_allowed'
  | 'export_packet_blocked';

export type GavanWeek1Day4MaterialExportPacketIssue = {
  code: GavanWeek1Day4MaterialExportPacketIssueCode;
  detail: string;
};

export type GavanWeek1Day4MaterialExportPacketWriteResult = {
  valid: boolean;
  issues: GavanWeek1Day4MaterialExportPacketIssue[];
  targetPath?: string;
  bytesWritten?: number;
  packet?: GavanWeek1Day4MaterialExportPacket;
};

function issue(
  code: GavanWeek1Day4MaterialExportPacketIssueCode,
  detail: string,
): GavanWeek1Day4MaterialExportPacketIssue {
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

export function isGavanWeek1Day4MaterialExportPacketTargetAllowed(
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
  issues: GavanWeek1Day4MaterialCandidateIssue[],
  codes: string[],
): boolean {
  return issues.some((candidateIssue) => codes.includes(candidateIssue.code));
}

function gate(
  id: GavanWeek1Day4MaterialExportGateId,
  issues: GavanWeek1Day4MaterialCandidateIssue[],
  issueCodes: string[],
  passEvidence: string,
): GavanWeek1Day4MaterialExportGate {
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

function issueCode(
  code: GavanWeek1Day4MaterialCandidateIssue['code'],
): GavanWeek1Day4MaterialCandidateIssue {
  return {
    code,
    detail: 'Derived export gate issue.',
  };
}

function qualityGates(
  candidate: GavanWeek1Day4MaterialCandidate,
  issues: GavanWeek1Day4MaterialCandidateIssue[],
): GavanWeek1Day4MaterialExportGate[] {
  const productionWriteIssue = (
    candidate.liveIntegration ||
    candidate.sourceWritesUsed ||
    candidate.phaseWriteTargets.length > 0 ||
    candidate.writePolicy.liveFilesEdited
  )
    ? [issueCode('live_integration_enabled')]
    : [];
  const allIssues = [...issues, ...productionWriteIssue];

  return [
    gate('broadness', allIssues, ['forbidden_anchor_present'], 'No narrow identity anchors found.'),
    gate('choice_option_counts', allIssues, ['choice_option_count_mismatch'], 'Choice and quick-reply options have exact counts and unique values.'),
    gate('repair_tile_counts', allIssues, ['repair_tile_count_mismatch'], 'Repair tiles match target token counts.'),
    gate('distractor_safety', allIssues, ['unsafe_distractor_tile'], 'Distractors do not duplicate target tiles.'),
    gate('explanation_coverage', allIssues, ['missing_after_answer_explanation', 'invented_wrong_option_feedback'], 'After-answer explanations cover new words and avoid invented wrong-option feedback.'),
    gate('no_recall_highlighting', allIssues, ['recall_highlighting_enabled'], 'Recall has no correct-word highlighting or hints.'),
    gate('quiz_count', allIssues, ['wrong_quiz_question_count', 'quiz_registered'], 'Quiz intent has 10 planned questions and is not registered.'),
    gate('media_honesty', allIssues, ['fake_audio_claim', 'fake_pronunciation_claim'], 'Audio and pronunciation claims remain non-final.'),
    gate('no_production_writes', allIssues, ['live_integration_enabled'], 'No production writes are allowed in this packet.'),
  ];
}

export function buildGavanWeek1Day4MaterialExportPacket(
  candidate: GavanWeek1Day4MaterialCandidate,
  seed: GavanWeek1ContentAuthoringSeed,
  day3Export: GavanWeek1Day3MaterialExportPacket,
  options: GavanWeek1Day4MaterialExportPacketOptions,
): GavanWeek1Day4MaterialExportPacket {
  const validation = validateGavanWeek1Day4MaterialCandidate(candidate, seed, day3Export);
  const gates = qualityGates(candidate, validation.issues);
  const blocked = gates.some((item) => item.status === 'fail');

  return {
    kind: 'gavan_week1_day4_material_export_packet',
    generatedAt: options.generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    dayId: 'gavan-week1-day4',
    status: blocked ? 'day4_material_export_blocked' : 'day4_material_export_not_live',
    sourceCandidateStatus: candidate.status,
    exportApproved: false,
    liveIntegration: false,
    sourceWritesUsed: false,
    phaseWriteTargets: [],
    reviewerSummary: {
      blockCount: candidate.exerciseBlocks.length,
      phraseCount: candidate.materialPhrases.length,
      naturalChoiceItemCount: candidate.naturalChoiceItems.length,
      repairItemCount: candidate.repairItems.length,
      quickReplyItemCount: candidate.quickReplyItems.length,
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
      naturalChoices: candidate.naturalChoiceItems.map((item) => ({
        correctEnglish: item.correctEnglish,
        optionCount: item.options.length,
      })),
      repairItems: candidate.repairItems.map((item) => ({
        english: item.targetEnglish,
        wordTiles: item.wordTiles,
        scrambledTiles: item.scrambledTiles,
        distractorTiles: item.distractorTiles,
      })),
      quickReplies: candidate.quickReplyItems.map((item) => ({
        correctEnglish: item.correctEnglish,
        optionCount: item.options.length,
      })),
      naturalChoiceLine: `${candidate.naturalChoiceItems.length} natural-choice items, 4 options each.`,
      repairLine: `${candidate.repairItems.length} repair items with exact target token counts.`,
      quickReplyLine: `${candidate.quickReplyItems.length} quick-reply items, 3 options each.`,
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

export function writeGavanWeek1Day4MaterialExportPacket(
  candidate: GavanWeek1Day4MaterialCandidate,
  seed: GavanWeek1ContentAuthoringSeed,
  day3Export: GavanWeek1Day3MaterialExportPacket,
  options: GavanWeek1Day4MaterialExportPacketWriteOptions,
): GavanWeek1Day4MaterialExportPacketWriteResult {
  if (!isGavanWeek1Day4MaterialExportPacketTargetAllowed(options.targetPath)) {
    return {
      valid: false,
      issues: [
        issue('target_path_not_allowed', 'Target path must stay under .codex-tmp or docs/reports.'),
      ],
    };
  }

  const packet = buildGavanWeek1Day4MaterialExportPacket(candidate, seed, day3Export, {
    generatedAt: options.generatedAt,
  });

  if (packet.status === 'day4_material_export_blocked') {
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
