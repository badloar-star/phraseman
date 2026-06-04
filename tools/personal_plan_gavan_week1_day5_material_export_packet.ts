import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import type {
  GavanWeek1ContentAuthoringSeed,
} from './personal_plan_gavan_week1_content_authoring_seed';
import type {
  GavanWeek1Day4MaterialExportPacket,
} from './personal_plan_gavan_week1_day4_material_export_packet';
import type {
  GavanWeek1Day5MaterialCandidate,
  GavanWeek1Day5MaterialCandidateIssue,
} from './personal_plan_gavan_week1_day5_material_candidate';
import {
  validateGavanWeek1Day5MaterialCandidate,
} from './personal_plan_gavan_week1_day5_material_candidate';

export const GAVAN_WEEK1_DAY5_MATERIAL_EXPORT_PACKET_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-day5-material-export-packet.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

export type GavanWeek1Day5MaterialExportGateId =
  | 'broadness'
  | 'word_tile_counts'
  | 'distractor_safety'
  | 'choice_option_counts'
  | 'listening_placeholder_honesty'
  | 'explanation_coverage'
  | 'no_recall_highlighting'
  | 'quiz_count'
  | 'media_honesty'
  | 'no_production_writes';

export type GavanWeek1Day5MaterialExportGate = {
  id: GavanWeek1Day5MaterialExportGateId;
  status: 'pass' | 'fail';
  evidence: string;
  issueCodes: string[];
};

export type GavanWeek1Day5MaterialExportPacket = {
  kind: 'gavan_week1_day5_material_export_packet';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  dayId: 'gavan-week1-day5';
  status: 'day5_material_export_not_live' | 'day5_material_export_blocked';
  sourceCandidateStatus: 'day5_material_candidate_not_live';
  exportApproved: false;
  liveIntegration: false;
  sourceWritesUsed: false;
  phaseWriteTargets: [];
  reviewerSummary: {
    blockCount: number;
    phraseCount: number;
    phraseBuildItemCount: number;
    listeningPlaceholderCount: number;
    naturalChoiceItemCount: number;
    quizBlueprintCount: number;
    recallHasHints: boolean;
    recallHighlightsCorrectWords: boolean;
    exerciseTypes: string[];
  };
  qualityGates: GavanWeek1Day5MaterialExportGate[];
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
    phraseBuildItems: Array<{
      english: string;
      wordTiles: string[];
      distractorTiles: string[];
    }>;
    listeningPlaceholders: Array<{
      english: string;
      assetStatus: 'not_generated';
      finalAudioReady: false;
    }>;
    naturalChoices: Array<{
      correctEnglish: string;
      optionCount: number;
    }>;
    phraseTileLine: string;
    listeningPlaceholderLine: string;
    naturalChoiceLine: string;
    recallLine: string;
    quizLine: string;
  };
  validationIssues: GavanWeek1Day5MaterialCandidateIssue[];
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: string[];
    liveFilesEdited: false;
  };
};

export type GavanWeek1Day5MaterialExportPacketOptions = {
  generatedAt: string;
};

export type GavanWeek1Day5MaterialExportPacketWriteOptions =
  GavanWeek1Day5MaterialExportPacketOptions & {
    targetPath: string;
  };

export type GavanWeek1Day5MaterialExportPacketIssueCode =
  | 'target_path_not_allowed'
  | 'export_packet_blocked';

export type GavanWeek1Day5MaterialExportPacketIssue = {
  code: GavanWeek1Day5MaterialExportPacketIssueCode;
  detail: string;
};

export type GavanWeek1Day5MaterialExportPacketWriteResult = {
  valid: boolean;
  issues: GavanWeek1Day5MaterialExportPacketIssue[];
  targetPath?: string;
  bytesWritten?: number;
  packet?: GavanWeek1Day5MaterialExportPacket;
};

function issue(
  code: GavanWeek1Day5MaterialExportPacketIssueCode,
  detail: string,
): GavanWeek1Day5MaterialExportPacketIssue {
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

export function isGavanWeek1Day5MaterialExportPacketTargetAllowed(
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
  issues: GavanWeek1Day5MaterialCandidateIssue[],
  codes: string[],
): boolean {
  return issues.some((candidateIssue) => codes.includes(candidateIssue.code));
}

function gate(
  id: GavanWeek1Day5MaterialExportGateId,
  issues: GavanWeek1Day5MaterialCandidateIssue[],
  issueCodes: string[],
  passEvidence: string,
): GavanWeek1Day5MaterialExportGate {
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
  code: GavanWeek1Day5MaterialCandidateIssue['code'],
): GavanWeek1Day5MaterialCandidateIssue {
  return {
    code,
    detail: 'Derived export gate issue.',
  };
}

function qualityGates(
  candidate: GavanWeek1Day5MaterialCandidate,
  issues: GavanWeek1Day5MaterialCandidateIssue[],
): GavanWeek1Day5MaterialExportGate[] {
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
    gate('word_tile_counts', allIssues, ['word_tile_count_mismatch'], 'Phrase-build tiles match exact target token counts.'),
    gate('distractor_safety', allIssues, ['unsafe_distractor_tile'], 'Distractors do not duplicate target tiles.'),
    gate('choice_option_counts', allIssues, ['choice_option_count_mismatch'], 'Natural-choice items include exactly 4 unique options and the correct phrase.'),
    gate('listening_placeholder_honesty', allIssues, ['fake_listening_audio_claim'], 'Listening items are marked as placeholders without generated audio.'),
    gate('explanation_coverage', allIssues, ['missing_after_answer_explanation', 'invented_wrong_option_feedback'], 'After-answer explanations cover new words and avoid invented wrong-option feedback.'),
    gate('no_recall_highlighting', allIssues, ['recall_highlighting_enabled'], 'Recall has no correct-word highlighting or hints.'),
    gate('quiz_count', allIssues, ['wrong_quiz_question_count', 'quiz_registered'], 'Quiz intent has 10 planned questions and is not registered.'),
    gate('media_honesty', allIssues, ['fake_audio_claim', 'fake_pronunciation_claim'], 'Audio and pronunciation claims remain non-final.'),
    gate('no_production_writes', allIssues, ['live_integration_enabled'], 'No production writes are allowed in this packet.'),
  ];
}

export function buildGavanWeek1Day5MaterialExportPacket(
  candidate: GavanWeek1Day5MaterialCandidate,
  seed: GavanWeek1ContentAuthoringSeed,
  day4Export: GavanWeek1Day4MaterialExportPacket,
  options: GavanWeek1Day5MaterialExportPacketOptions,
): GavanWeek1Day5MaterialExportPacket {
  const validation = validateGavanWeek1Day5MaterialCandidate(candidate, seed, day4Export);
  const gates = qualityGates(candidate, validation.issues);
  const blocked = gates.some((item) => item.status === 'fail');

  return {
    kind: 'gavan_week1_day5_material_export_packet',
    generatedAt: options.generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    dayId: 'gavan-week1-day5',
    status: blocked ? 'day5_material_export_blocked' : 'day5_material_export_not_live',
    sourceCandidateStatus: candidate.status,
    exportApproved: false,
    liveIntegration: false,
    sourceWritesUsed: false,
    phaseWriteTargets: [],
    reviewerSummary: {
      blockCount: candidate.exerciseBlocks.length,
      phraseCount: candidate.materialPhrases.length,
      phraseBuildItemCount: candidate.phraseBuildItems.length,
      listeningPlaceholderCount: candidate.listeningPlaceholders.length,
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
      phraseBuildItems: candidate.phraseBuildItems.map((item) => ({
        english: item.targetEnglish,
        wordTiles: item.wordTiles,
        distractorTiles: item.distractorTiles,
      })),
      listeningPlaceholders: candidate.listeningPlaceholders.map((item) => ({
        english: item.targetEnglish,
        assetStatus: item.assetStatus,
        finalAudioReady: item.finalAudioReady,
      })),
      naturalChoices: candidate.naturalChoiceItems.map((item) => ({
        correctEnglish: item.correctEnglish,
        optionCount: item.options.length,
      })),
      phraseTileLine: `${candidate.phraseBuildItems.length} phrase-build items with exact word tiles.`,
      listeningPlaceholderLine: `${candidate.listeningPlaceholders.length} listening placeholders, audio not generated.`,
      naturalChoiceLine: `${candidate.naturalChoiceItems.length} natural-choice items, 4 options each.`,
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

export function writeGavanWeek1Day5MaterialExportPacket(
  candidate: GavanWeek1Day5MaterialCandidate,
  seed: GavanWeek1ContentAuthoringSeed,
  day4Export: GavanWeek1Day4MaterialExportPacket,
  options: GavanWeek1Day5MaterialExportPacketWriteOptions,
): GavanWeek1Day5MaterialExportPacketWriteResult {
  if (!isGavanWeek1Day5MaterialExportPacketTargetAllowed(options.targetPath)) {
    return {
      valid: false,
      issues: [
        issue('target_path_not_allowed', 'Target path must stay under .codex-tmp or docs/reports.'),
      ],
    };
  }

  const packet = buildGavanWeek1Day5MaterialExportPacket(candidate, seed, day4Export, {
    generatedAt: options.generatedAt,
  });

  if (packet.status === 'day5_material_export_blocked') {
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
