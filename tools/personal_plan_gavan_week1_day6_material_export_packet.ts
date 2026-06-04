import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1ContentAuthoringSeed,
} from './personal_plan_gavan_week1_content_authoring_seed';
import type {
  GavanWeek1Day5MaterialExportPacket,
} from './personal_plan_gavan_week1_day5_material_export_packet';
import type {
  GavanWeek1Day6MaterialCandidate,
  GavanWeek1Day6MaterialCandidateIssue,
} from './personal_plan_gavan_week1_day6_material_candidate';
import {
  validateGavanWeek1Day6MaterialCandidate,
} from './personal_plan_gavan_week1_day6_material_candidate';

export const GAVAN_WEEK1_DAY6_MATERIAL_EXPORT_PACKET_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-day6-material-export-packet.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

export type GavanWeek1Day6MaterialExportGateId =
  | 'broadness'
  | 'quick_reply_option_counts'
  | 'missing_word_slot_quality'
  | 'repair_tile_counts'
  | 'pronunciation_placeholder_honesty'
  | 'explanation_coverage'
  | 'no_recall_highlighting'
  | 'quiz_count'
  | 'media_honesty'
  | 'no_production_writes';

export type GavanWeek1Day6MaterialExportGate = {
  id: GavanWeek1Day6MaterialExportGateId;
  status: 'pass' | 'fail';
  evidence: string;
  issueCodes: string[];
};

export type GavanWeek1Day6MaterialExportPacket = {
  kind: 'gavan_week1_day6_material_export_packet';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  dayId: 'gavan-week1-day6';
  status: 'day6_material_export_not_live' | 'day6_material_export_blocked';
  sourceCandidateStatus: 'day6_material_candidate_not_live';
  exportApproved: false;
  liveIntegration: false;
  sourceWritesUsed: false;
  phaseWriteTargets: [];
  reviewerSummary: {
    blockCount: number;
    phraseCount: number;
    quickReplyItemCount: number;
    missingWordItemCount: number;
    repairItemCount: number;
    pronunciationPlaceholderCount: number;
    quizBlueprintCount: number;
    recallHasHints: boolean;
    recallHighlightsCorrectWords: boolean;
    exerciseTypes: string[];
  };
  qualityGates: GavanWeek1Day6MaterialExportGate[];
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
    quickReplies: Array<{
      correctEnglish: string;
      optionCount: number;
    }>;
    missingWords: Array<{
      sentenceWithBlank: string;
      correctToken: string;
      optionCount: number;
    }>;
    repairItems: Array<{
      english: string;
      wordTiles: string[];
      distractorTiles: string[];
    }>;
    pronunciationPlaceholders: Array<{
      english: string;
      scoringStatus: 'not_built';
      finalScoringReady: false;
    }>;
    quickReplyLine: string;
    missingWordLine: string;
    repairLine: string;
    pronunciationPlaceholderLine: string;
    recallLine: string;
    quizLine: string;
  };
  validationIssues: GavanWeek1Day6MaterialCandidateIssue[];
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: string[];
    liveFilesEdited: false;
  };
};

export type GavanWeek1Day6MaterialExportPacketOptions = {
  generatedAt: string;
};

export type GavanWeek1Day6MaterialExportPacketWriteOptions =
  GavanWeek1Day6MaterialExportPacketOptions & {
    targetPath: string;
  };

export type GavanWeek1Day6MaterialExportPacketIssueCode =
  | 'target_path_not_allowed'
  | 'export_packet_blocked';

export type GavanWeek1Day6MaterialExportPacketIssue = {
  code: GavanWeek1Day6MaterialExportPacketIssueCode;
  detail: string;
};

export type GavanWeek1Day6MaterialExportPacketWriteResult = {
  valid: boolean;
  issues: GavanWeek1Day6MaterialExportPacketIssue[];
  targetPath?: string;
  bytesWritten?: number;
  packet?: GavanWeek1Day6MaterialExportPacket;
};

function issue(
  code: GavanWeek1Day6MaterialExportPacketIssueCode,
  detail: string,
): GavanWeek1Day6MaterialExportPacketIssue {
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

export function isGavanWeek1Day6MaterialExportPacketTargetAllowed(
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
  issues: GavanWeek1Day6MaterialCandidateIssue[],
  codes: string[],
): boolean {
  return issues.some((candidateIssue) => codes.includes(candidateIssue.code));
}

function gate(
  id: GavanWeek1Day6MaterialExportGateId,
  issues: GavanWeek1Day6MaterialCandidateIssue[],
  issueCodes: string[],
  passEvidence: string,
): GavanWeek1Day6MaterialExportGate {
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
  code: GavanWeek1Day6MaterialCandidateIssue['code'],
): GavanWeek1Day6MaterialCandidateIssue {
  return {
    code,
    detail: 'Derived export gate issue.',
  };
}

function qualityGates(
  candidate: GavanWeek1Day6MaterialCandidate,
  issues: GavanWeek1Day6MaterialCandidateIssue[],
): GavanWeek1Day6MaterialExportGate[] {
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
    gate('quick_reply_option_counts', allIssues, ['quick_reply_option_count_mismatch'], 'Quick replies include exactly 3 unique options and the correct answer.'),
    gate('missing_word_slot_quality', allIssues, ['missing_word_option_count_mismatch', 'missing_word_blank_missing'], 'Missing-word items include one visible blank and exactly 4 unique options.'),
    gate('repair_tile_counts', allIssues, ['repair_tile_count_mismatch', 'unsafe_distractor_tile'], 'Repair tiles match exact target token counts and safe distractors.'),
    gate('pronunciation_placeholder_honesty', allIssues, ['fake_pronunciation_placeholder_claim'], 'Pronunciation remains a placeholder without final scoring.'),
    gate('explanation_coverage', allIssues, ['missing_after_answer_explanation', 'invented_wrong_option_feedback'], 'After-answer explanations cover new words and avoid invented wrong-option feedback.'),
    gate('no_recall_highlighting', allIssues, ['recall_highlighting_enabled'], 'Recall has no correct-word highlighting or hints.'),
    gate('quiz_count', allIssues, ['wrong_quiz_question_count', 'quiz_registered'], 'Quiz intent has 10 planned questions and is not registered.'),
    gate('media_honesty', allIssues, ['fake_audio_claim', 'fake_pronunciation_claim'], 'Audio and pronunciation claims remain non-final.'),
    gate('no_production_writes', allIssues, ['live_integration_enabled'], 'No production writes are allowed in this packet.'),
  ];
}

export function buildGavanWeek1Day6MaterialExportPacket(
  candidate: GavanWeek1Day6MaterialCandidate,
  seed: GavanWeek1ContentAuthoringSeed,
  day5Export: GavanWeek1Day5MaterialExportPacket,
  options: GavanWeek1Day6MaterialExportPacketOptions,
): GavanWeek1Day6MaterialExportPacket {
  const validation = validateGavanWeek1Day6MaterialCandidate(candidate, seed, day5Export);
  const gates = qualityGates(candidate, validation.issues);
  const blocked = gates.some((item) => item.status === 'fail');

  return {
    kind: 'gavan_week1_day6_material_export_packet',
    generatedAt: options.generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    dayId: 'gavan-week1-day6',
    status: blocked ? 'day6_material_export_blocked' : 'day6_material_export_not_live',
    sourceCandidateStatus: candidate.status,
    exportApproved: false,
    liveIntegration: false,
    sourceWritesUsed: false,
    phaseWriteTargets: [],
    reviewerSummary: {
      blockCount: candidate.exerciseBlocks.length,
      phraseCount: candidate.materialPhrases.length,
      quickReplyItemCount: candidate.quickReplyItems.length,
      missingWordItemCount: candidate.missingWordItems.length,
      repairItemCount: candidate.repairItems.length,
      pronunciationPlaceholderCount: candidate.pronunciationPlaceholders.length,
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
      quickReplies: candidate.quickReplyItems.map((item) => ({
        correctEnglish: item.correctEnglish,
        optionCount: item.options.length,
      })),
      missingWords: candidate.missingWordItems.map((item) => ({
        sentenceWithBlank: item.sentenceWithBlank,
        correctToken: item.correctToken,
        optionCount: item.options.length,
      })),
      repairItems: candidate.repairItems.map((item) => ({
        english: item.targetEnglish,
        wordTiles: item.wordTiles,
        distractorTiles: item.distractorTiles,
      })),
      pronunciationPlaceholders: candidate.pronunciationPlaceholders.map((item) => ({
        english: item.targetEnglish,
        scoringStatus: item.scoringStatus,
        finalScoringReady: item.finalScoringReady,
      })),
      quickReplyLine: `${candidate.quickReplyItems.length} quick-reply items with short answer choices.`,
      missingWordLine: `${candidate.missingWordItems.length} missing-word items with visible blanks.`,
      repairLine: `${candidate.repairItems.length} repair items with exact word tiles.`,
      pronunciationPlaceholderLine: `${candidate.pronunciationPlaceholders.length} pronunciation placeholders, scoring not built.`,
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

export function writeGavanWeek1Day6MaterialExportPacket(
  candidate: GavanWeek1Day6MaterialCandidate,
  seed: GavanWeek1ContentAuthoringSeed,
  day5Export: GavanWeek1Day5MaterialExportPacket,
  options: GavanWeek1Day6MaterialExportPacketWriteOptions,
): GavanWeek1Day6MaterialExportPacketWriteResult {
  if (!isGavanWeek1Day6MaterialExportPacketTargetAllowed(options.targetPath)) {
    return {
      valid: false,
      issues: [
        issue('target_path_not_allowed', 'Target path must stay under .codex-tmp or docs/reports.'),
      ],
    };
  }

  const packet = buildGavanWeek1Day6MaterialExportPacket(candidate, seed, day5Export, {
    generatedAt: options.generatedAt,
  });

  if (packet.status === 'day6_material_export_blocked') {
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
