import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1ContentAuthoringSeed,
} from './personal_plan_gavan_week1_content_authoring_seed';
import type {
  GavanWeek1Day2MaterialExportPacket,
} from './personal_plan_gavan_week1_day2_material_export_packet';
import type {
  GavanWeek1Day3MaterialCandidate,
  GavanWeek1Day3MaterialCandidateIssue,
} from './personal_plan_gavan_week1_day3_material_candidate';
import {
  validateGavanWeek1Day3MaterialCandidate,
} from './personal_plan_gavan_week1_day3_material_candidate';

export const GAVAN_WEEK1_DAY3_MATERIAL_EXPORT_PACKET_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-day3-material-export-packet.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

export type GavanWeek1Day3MaterialExportGateId =
  | 'broadness'
  | 'word_tile_counts'
  | 'distractor_safety'
  | 'explanation_coverage'
  | 'missing_word_slot_quality'
  | 'no_recall_highlighting'
  | 'quiz_count'
  | 'media_honesty'
  | 'no_production_writes';

export type GavanWeek1Day3MaterialExportGate = {
  id: GavanWeek1Day3MaterialExportGateId;
  status: 'pass' | 'fail';
  evidence: string;
  issueCodes: string[];
};

export type GavanWeek1Day3MaterialExportPacket = {
  kind: 'gavan_week1_day3_material_export_packet';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  dayId: 'gavan-week1-day3';
  status: 'day3_material_export_not_live' | 'day3_material_export_blocked';
  sourceCandidateStatus: 'day3_material_candidate_not_live';
  exportApproved: false;
  liveIntegration: false;
  sourceWritesUsed: false;
  phaseWriteTargets: [];
  reviewerSummary: {
    blockCount: number;
    phraseCount: number;
    phraseBuildItemCount: number;
    missingWordItemCount: number;
    quizBlueprintCount: number;
    recallHasHints: boolean;
    recallHighlightsCorrectWords: boolean;
    exerciseTypes: string[];
  };
  qualityGates: GavanWeek1Day3MaterialExportGate[];
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
    missingWordItems: Array<{
      english: string;
      visibleSlots: string[];
      answer: string;
      distractorTiles: string[];
    }>;
    missingWordLine: string;
    recallLine: string;
    quizLine: string;
  };
  validationIssues: GavanWeek1Day3MaterialCandidateIssue[];
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: string[];
    liveFilesEdited: false;
  };
};

export type GavanWeek1Day3MaterialExportPacketOptions = {
  generatedAt: string;
};

export type GavanWeek1Day3MaterialExportPacketWriteOptions =
  GavanWeek1Day3MaterialExportPacketOptions & {
    targetPath: string;
  };

export type GavanWeek1Day3MaterialExportPacketIssueCode =
  | 'target_path_not_allowed'
  | 'export_packet_blocked';

export type GavanWeek1Day3MaterialExportPacketIssue = {
  code: GavanWeek1Day3MaterialExportPacketIssueCode;
  detail: string;
};

export type GavanWeek1Day3MaterialExportPacketWriteResult = {
  valid: boolean;
  issues: GavanWeek1Day3MaterialExportPacketIssue[];
  targetPath?: string;
  bytesWritten?: number;
  packet?: GavanWeek1Day3MaterialExportPacket;
};

function issue(
  code: GavanWeek1Day3MaterialExportPacketIssueCode,
  detail: string,
): GavanWeek1Day3MaterialExportPacketIssue {
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

export function isGavanWeek1Day3MaterialExportPacketTargetAllowed(
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
  issues: GavanWeek1Day3MaterialCandidateIssue[],
  codes: string[],
): boolean {
  return issues.some((candidateIssue) => codes.includes(candidateIssue.code));
}

function gate(
  id: GavanWeek1Day3MaterialExportGateId,
  issues: GavanWeek1Day3MaterialCandidateIssue[],
  issueCodes: string[],
  passEvidence: string,
): GavanWeek1Day3MaterialExportGate {
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
  code: GavanWeek1Day3MaterialCandidateIssue['code'],
): GavanWeek1Day3MaterialCandidateIssue {
  return {
    code,
    detail: 'Derived export gate issue.',
  };
}

function qualityGates(
  candidate: GavanWeek1Day3MaterialCandidate,
  issues: GavanWeek1Day3MaterialCandidateIssue[],
): GavanWeek1Day3MaterialExportGate[] {
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
    gate('explanation_coverage', allIssues, ['missing_after_answer_explanation', 'invented_wrong_option_feedback'], 'After-answer explanations cover new words and avoid invented wrong-option feedback.'),
    gate('missing_word_slot_quality', allIssues, ['missing_word_slot_mismatch', 'unsafe_missing_word_distractor'], 'Missing-word items use one blank, exact token counts, and safe distractors.'),
    gate('no_recall_highlighting', allIssues, ['recall_highlighting_enabled'], 'Recall has no correct-word highlighting or hints.'),
    gate('quiz_count', allIssues, ['wrong_quiz_question_count', 'quiz_registered'], 'Quiz intent has 10 planned questions and is not registered.'),
    gate('media_honesty', allIssues, ['fake_audio_claim', 'fake_pronunciation_claim'], 'Audio and pronunciation claims remain non-final.'),
    gate('no_production_writes', allIssues, ['live_integration_enabled'], 'No production writes are allowed in this packet.'),
  ];
}

export function buildGavanWeek1Day3MaterialExportPacket(
  candidate: GavanWeek1Day3MaterialCandidate,
  seed: GavanWeek1ContentAuthoringSeed,
  day2Export: GavanWeek1Day2MaterialExportPacket,
  options: GavanWeek1Day3MaterialExportPacketOptions,
): GavanWeek1Day3MaterialExportPacket {
  const validation = validateGavanWeek1Day3MaterialCandidate(candidate, seed, day2Export);
  const gates = qualityGates(candidate, validation.issues);
  const blocked = gates.some((item) => item.status === 'fail');

  return {
    kind: 'gavan_week1_day3_material_export_packet',
    generatedAt: options.generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    dayId: 'gavan-week1-day3',
    status: blocked ? 'day3_material_export_blocked' : 'day3_material_export_not_live',
    sourceCandidateStatus: candidate.status,
    exportApproved: false,
    liveIntegration: false,
    sourceWritesUsed: false,
    phaseWriteTargets: [],
    reviewerSummary: {
      blockCount: candidate.exerciseBlocks.length,
      phraseCount: candidate.materialPhrases.length,
      phraseBuildItemCount: candidate.phraseBuildItems.length,
      missingWordItemCount: candidate.missingWordItems.length,
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
      missingWordItems: candidate.missingWordItems.map((item) => ({
        english: item.targetEnglish,
        visibleSlots: item.visibleSlots,
        answer: item.answer,
        distractorTiles: item.distractorTiles,
      })),
      missingWordLine: `${candidate.missingWordItems.length} missing-word items, one blank each.`,
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

export function writeGavanWeek1Day3MaterialExportPacket(
  candidate: GavanWeek1Day3MaterialCandidate,
  seed: GavanWeek1ContentAuthoringSeed,
  day2Export: GavanWeek1Day2MaterialExportPacket,
  options: GavanWeek1Day3MaterialExportPacketWriteOptions,
): GavanWeek1Day3MaterialExportPacketWriteResult {
  if (!isGavanWeek1Day3MaterialExportPacketTargetAllowed(options.targetPath)) {
    return {
      valid: false,
      issues: [
        issue('target_path_not_allowed', 'Target path must stay under .codex-tmp or docs/reports.'),
      ],
    };
  }

  const packet = buildGavanWeek1Day3MaterialExportPacket(candidate, seed, day2Export, {
    generatedAt: options.generatedAt,
  });

  if (packet.status === 'day3_material_export_blocked') {
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
