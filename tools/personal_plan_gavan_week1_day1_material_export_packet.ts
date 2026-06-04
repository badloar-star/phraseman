import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1ContentAuthoringSeed,
} from './personal_plan_gavan_week1_content_authoring_seed';
import type {
  GavanWeek1Day1MaterialCandidate,
  GavanWeek1Day1MaterialCandidateIssue,
} from './personal_plan_gavan_week1_day1_material_candidate';
import {
  validateGavanWeek1Day1MaterialCandidate,
} from './personal_plan_gavan_week1_day1_material_candidate';

export const GAVAN_WEEK1_DAY1_MATERIAL_EXPORT_PACKET_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-day1-material-export-packet.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

export type GavanWeek1Day1MaterialExportGateId =
  | 'broadness'
  | 'word_tile_counts'
  | 'distractor_safety'
  | 'explanation_coverage'
  | 'no_recall_highlighting'
  | 'quiz_count'
  | 'media_honesty'
  | 'no_production_writes';

export type GavanWeek1Day1MaterialExportGate = {
  id: GavanWeek1Day1MaterialExportGateId;
  status: 'pass' | 'fail';
  evidence: string;
  issueCodes: string[];
};

export type GavanWeek1Day1MaterialExportPacket = {
  kind: 'gavan_week1_day1_material_export_packet';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  dayId: 'gavan-week1-day1';
  status: 'day1_material_export_not_live' | 'day1_material_export_blocked';
  sourceCandidateStatus: 'day1_material_candidate_not_live';
  exportApproved: false;
  liveIntegration: false;
  sourceWritesUsed: false;
  phaseWriteTargets: [];
  reviewerSummary: {
    blockCount: number;
    phraseCount: number;
    phraseBuildItemCount: number;
    naturalChoiceItemCount: number;
    quizBlueprintCount: number;
    recallHasHints: boolean;
    recallHighlightsCorrectWords: boolean;
    exerciseTypes: string[];
  };
  qualityGates: GavanWeek1Day1MaterialExportGate[];
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
    phraseTiles: Array<{
      english: string;
      wordTiles: string[];
      distractorTiles: string[];
    }>;
    recallLine: string;
    quizLine: string;
  };
  validationIssues: GavanWeek1Day1MaterialCandidateIssue[];
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: string[];
    liveFilesEdited: false;
  };
};

export type GavanWeek1Day1MaterialExportPacketOptions = {
  generatedAt: string;
};

export type GavanWeek1Day1MaterialExportPacketWriteOptions =
  GavanWeek1Day1MaterialExportPacketOptions & {
    targetPath: string;
  };

export type GavanWeek1Day1MaterialExportPacketIssueCode =
  | 'target_path_not_allowed'
  | 'export_packet_blocked';

export type GavanWeek1Day1MaterialExportPacketIssue = {
  code: GavanWeek1Day1MaterialExportPacketIssueCode;
  detail: string;
};

export type GavanWeek1Day1MaterialExportPacketWriteResult = {
  valid: boolean;
  issues: GavanWeek1Day1MaterialExportPacketIssue[];
  targetPath?: string;
  bytesWritten?: number;
  packet?: GavanWeek1Day1MaterialExportPacket;
};

function issue(
  code: GavanWeek1Day1MaterialExportPacketIssueCode,
  detail: string,
): GavanWeek1Day1MaterialExportPacketIssue {
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

export function isGavanWeek1Day1MaterialExportPacketTargetAllowed(
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
  issues: GavanWeek1Day1MaterialCandidateIssue[],
  codes: string[],
): boolean {
  return issues.some((candidateIssue) => codes.includes(candidateIssue.code));
}

function gate(
  id: GavanWeek1Day1MaterialExportGateId,
  issues: GavanWeek1Day1MaterialCandidateIssue[],
  issueCodes: string[],
  passEvidence: string,
): GavanWeek1Day1MaterialExportGate {
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

function qualityGates(
  candidate: GavanWeek1Day1MaterialCandidate,
  issues: GavanWeek1Day1MaterialCandidateIssue[],
): GavanWeek1Day1MaterialExportGate[] {
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
    gate('word_tile_counts', allIssues, ['word_tile_count_mismatch'], 'Word tiles match target token counts.'),
    gate('distractor_safety', allIssues, ['unsafe_distractor_tile'], 'Distractors do not duplicate target tiles.'),
    gate('explanation_coverage', allIssues, ['missing_after_answer_explanation'], 'After-answer explanations cover new words and constructions.'),
    gate('no_recall_highlighting', allIssues, ['recall_highlighting_enabled'], 'Recall has no correct-word highlighting or hints.'),
    gate('quiz_count', allIssues, ['wrong_quiz_question_count', 'quiz_registered'], 'Quiz intent has 10 planned questions and is not registered.'),
    gate('media_honesty', allIssues, ['fake_audio_claim', 'fake_pronunciation_claim'], 'Audio and pronunciation claims remain non-final.'),
    gate('no_production_writes', allIssues, ['live_integration_enabled'], 'No production writes are allowed in this packet.'),
  ];
}

function issueCode(code: GavanWeek1Day1MaterialCandidateIssue['code']): GavanWeek1Day1MaterialCandidateIssue {
  return {
    code,
    detail: 'Derived export gate issue.',
  };
}

export function buildGavanWeek1Day1MaterialExportPacket(
  candidate: GavanWeek1Day1MaterialCandidate,
  seed: GavanWeek1ContentAuthoringSeed,
  options: GavanWeek1Day1MaterialExportPacketOptions,
): GavanWeek1Day1MaterialExportPacket {
  const validation = validateGavanWeek1Day1MaterialCandidate(candidate, seed);
  const gates = qualityGates(candidate, validation.issues);
  const blocked = gates.some((item) => item.status === 'fail');

  return {
    kind: 'gavan_week1_day1_material_export_packet',
    generatedAt: options.generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    dayId: 'gavan-week1-day1',
    status: blocked ? 'day1_material_export_blocked' : 'day1_material_export_not_live',
    sourceCandidateStatus: candidate.status,
    exportApproved: false,
    liveIntegration: false,
    sourceWritesUsed: false,
    phaseWriteTargets: [],
    reviewerSummary: {
      blockCount: candidate.exerciseBlocks.length,
      phraseCount: candidate.materialPhrases.length,
      phraseBuildItemCount: candidate.phraseBuildItems.length,
      naturalChoiceItemCount: candidate.naturalChoiceItems.length,
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
      phraseTiles: candidate.phraseBuildItems.map((item) => ({
        english: item.targetEnglish,
        wordTiles: item.wordTiles,
        distractorTiles: item.distractorTiles,
      })),
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

export function writeGavanWeek1Day1MaterialExportPacket(
  candidate: GavanWeek1Day1MaterialCandidate,
  seed: GavanWeek1ContentAuthoringSeed,
  options: GavanWeek1Day1MaterialExportPacketWriteOptions,
): GavanWeek1Day1MaterialExportPacketWriteResult {
  if (!isGavanWeek1Day1MaterialExportPacketTargetAllowed(options.targetPath)) {
    return {
      valid: false,
      issues: [
        issue('target_path_not_allowed', 'Target path must stay under .codex-tmp or docs/reports.'),
      ],
    };
  }

  const packet = buildGavanWeek1Day1MaterialExportPacket(candidate, seed, {
    generatedAt: options.generatedAt,
  });

  if (packet.status === 'day1_material_export_blocked') {
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
