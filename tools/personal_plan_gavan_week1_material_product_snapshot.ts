import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import {
  buildGavanWeek1ContentAuthoringSeed,
} from './personal_plan_gavan_week1_content_authoring_seed';
import {
  buildGavanWeek1Day1MaterialCandidate,
} from './personal_plan_gavan_week1_day1_material_candidate';
import {
  buildGavanWeek1Day1MaterialExportPacket,
} from './personal_plan_gavan_week1_day1_material_export_packet';
import {
  buildGavanWeek1Day2MaterialCandidate,
} from './personal_plan_gavan_week1_day2_material_candidate';
import {
  buildGavanWeek1Day2MaterialExportPacket,
} from './personal_plan_gavan_week1_day2_material_export_packet';
import {
  buildGavanWeek1Day3MaterialCandidate,
} from './personal_plan_gavan_week1_day3_material_candidate';
import {
  buildGavanWeek1Day3MaterialExportPacket,
} from './personal_plan_gavan_week1_day3_material_export_packet';
import {
  buildGavanWeek1Day4MaterialCandidate,
} from './personal_plan_gavan_week1_day4_material_candidate';
import {
  buildGavanWeek1Day4MaterialExportPacket,
} from './personal_plan_gavan_week1_day4_material_export_packet';
import {
  buildGavanWeek1Day5MaterialCandidate,
} from './personal_plan_gavan_week1_day5_material_candidate';
import {
  buildGavanWeek1Day5MaterialExportPacket,
} from './personal_plan_gavan_week1_day5_material_export_packet';
import {
  buildGavanWeek1Day6MaterialCandidate,
} from './personal_plan_gavan_week1_day6_material_candidate';
import {
  buildGavanWeek1Day6MaterialExportPacket,
} from './personal_plan_gavan_week1_day6_material_export_packet';
import {
  buildGavanWeek1ExpansionStandards,
} from './personal_plan_gavan_week1_expansion_standards';
import {
  buildGavanWeek1Day7BlueprintCandidate,
} from './personal_plan_gavan_week1_day7_blueprint_candidate';
import {
  buildGavanWeek1Day7ReviewerExport,
} from './personal_plan_gavan_week1_day7_reviewer_export';
import {
  approveGavanWeek1Day7ReviewerExport,
  buildGavanWeek1Day7ReviewerApprovalInput,
} from './personal_plan_gavan_week1_day7_reviewer_approval_gate';
import {
  buildGavanWeek1Day7MaterialCandidate,
} from './personal_plan_gavan_week1_day7_material_candidate';

export const GAVAN_WEEK1_MATERIAL_PRODUCT_SNAPSHOT_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-material-product-snapshot.json',
);

export type GavanWeek1MaterialProductSnapshotOptions = {
  generatedAt: string;
};

export type GavanWeek1MaterialProductSnapshotWriteOptions =
  GavanWeek1MaterialProductSnapshotOptions & {
    targetPath: string;
  };

export type GavanWeek1MaterialProductSnapshotDay = {
  dayId: string;
  dayIndex: number;
  title: string;
  sourceKind: 'material_candidate' | 'blueprint_candidate';
  status: string;
  phraseCount: number;
  phraseTexts: string[];
  exerciseTypes: string[];
  quizQuestionCount: number;
  finalExerciseBuilt: boolean;
  finalQuizWritten: boolean;
  audioReady: boolean;
  pronunciationReady: boolean;
  liveIntegration: false;
  nextActions: string[];
};

export type GavanWeek1MaterialProductSnapshot = {
  kind: 'gavan_week1_material_product_snapshot';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  liveIntegration: false;
  releaseReady: false;
  days: GavanWeek1MaterialProductSnapshotDay[];
  summary: {
    days: number;
    materialCandidateDays: number;
    blueprintCandidateDays: number;
    phraseCount: number;
    exerciseTypeCount: number;
    liveIntegratedDays: number;
    finalAudioReadyDays: number;
    finalPronunciationReadyDays: number;
    finalQuizWrittenDays: number;
  };
};

export type GavanWeek1MaterialProductSnapshotWriteResult = {
  valid: boolean;
  targetPath?: string;
  bytesWritten?: number;
  issues: Array<{
    code: 'target_path_not_allowed';
    detail: string;
  }>;
};

type MaterialCandidateLike = {
  dayId: string;
  dayIndex: number;
  sourceSeedDayTitle: string;
  status: string;
  liveIntegration: false;
  materialPhrases: Array<{ english: string }>;
  exerciseBlocks: Array<{ exerciseType: string; finalExerciseBuilt: boolean }>;
  dayQuizIntent: {
    questionCount: number;
    finalQuizWritten: boolean;
  };
  mediaClaims: {
    finalAudioReady: boolean;
    finalPronunciationScoringReady: boolean;
  };
};

function isAllowedTarget(targetPath: string): boolean {
  const resolved = path.resolve(targetPath);
  const allowed = [
    path.resolve(process.cwd(), '.codex-tmp'),
    path.resolve(process.cwd(), 'docs', 'reports'),
  ];
  return allowed.some((root) => resolved === root || resolved.startsWith(`${root}${path.sep}`));
}

function nextActionsForDay(input: {
  finalExerciseBuilt: boolean;
  finalQuizWritten: boolean;
  audioReady: boolean;
  pronunciationReady: boolean;
  sourceKind: 'material_candidate' | 'blueprint_candidate';
}): string[] {
  const actions: string[] = [];
  if (!input.finalExerciseBuilt) actions.push('build_live_exercise_renderer');
  if (!input.finalQuizWritten) actions.push('build_final_quiz');
  if (!input.audioReady) actions.push('generate_and_approve_audio');
  if (!input.pronunciationReady) actions.push('build_real_pronunciation_scoring');
  if (input.sourceKind === 'blueprint_candidate') actions.push('promote_blueprint_to_material_candidate');
  return actions;
}

function summarizeMaterialCandidate(candidate: MaterialCandidateLike): GavanWeek1MaterialProductSnapshotDay {
  const finalExerciseBuilt = candidate.exerciseBlocks.every((block) => block.finalExerciseBuilt);
  const audioReady = candidate.mediaClaims.finalAudioReady;
  const pronunciationReady = candidate.mediaClaims.finalPronunciationScoringReady;
  const finalQuizWritten = candidate.dayQuizIntent.finalQuizWritten;

  return {
    dayId: candidate.dayId,
    dayIndex: candidate.dayIndex,
    title: candidate.sourceSeedDayTitle,
    sourceKind: 'material_candidate',
    status: candidate.status,
    phraseCount: candidate.materialPhrases.length,
    phraseTexts: candidate.materialPhrases.map((phrase) => phrase.english),
    exerciseTypes: [...new Set(candidate.exerciseBlocks.map((block) => block.exerciseType))],
    quizQuestionCount: candidate.dayQuizIntent.questionCount,
    finalExerciseBuilt,
    finalQuizWritten,
    audioReady,
    pronunciationReady,
    liveIntegration: false,
    nextActions: nextActionsForDay({
      finalExerciseBuilt,
      finalQuizWritten,
      audioReady,
      pronunciationReady,
      sourceKind: 'material_candidate',
    }),
  };
}

function buildDays(generatedAt: string): GavanWeek1MaterialProductSnapshotDay[] {
  const seed = buildGavanWeek1ContentAuthoringSeed({ generatedAt });
  const day1 = buildGavanWeek1Day1MaterialCandidate(seed, { generatedAt });
  const day1Export = buildGavanWeek1Day1MaterialExportPacket(day1, seed, { generatedAt });
  const day2 = buildGavanWeek1Day2MaterialCandidate(seed, day1Export, { generatedAt });
  const day2Export = buildGavanWeek1Day2MaterialExportPacket(day2, seed, day1Export, { generatedAt });
  const day3 = buildGavanWeek1Day3MaterialCandidate(seed, day2Export, { generatedAt });
  const day3Export = buildGavanWeek1Day3MaterialExportPacket(day3, seed, day2Export, { generatedAt });
  const day4 = buildGavanWeek1Day4MaterialCandidate(seed, day3Export, { generatedAt });
  const day4Export = buildGavanWeek1Day4MaterialExportPacket(day4, seed, day3Export, { generatedAt });
  const day5 = buildGavanWeek1Day5MaterialCandidate(seed, day4Export, { generatedAt });
  const day5Export = buildGavanWeek1Day5MaterialExportPacket(day5, seed, day4Export, { generatedAt });
  const day6 = buildGavanWeek1Day6MaterialCandidate(seed, day5Export, { generatedAt });
  const day6Export = buildGavanWeek1Day6MaterialExportPacket(day6, seed, day5Export, { generatedAt });
  const standards = buildGavanWeek1ExpansionStandards({ generatedAt });
  const day7Blueprint = buildGavanWeek1Day7BlueprintCandidate(standards, { generatedAt });
  const day7ReviewerExport = buildGavanWeek1Day7ReviewerExport(day7Blueprint, { generatedAt });
  const day7ApprovalInput = buildGavanWeek1Day7ReviewerApprovalInput(day7ReviewerExport, {
    reviewerId: 'snapshot-reviewer',
    approvedAt: generatedAt,
  });
  const day7Approved = approveGavanWeek1Day7ReviewerExport(
    day7ReviewerExport,
    day7ApprovalInput,
    generatedAt,
  ).approvedExport;

  if (!day7Approved) {
    throw new Error('Gavan week 1 day 7 snapshot requires an approved reviewer export.');
  }

  const day7 = buildGavanWeek1Day7MaterialCandidate(day7Approved, day6Export, { generatedAt });

  return [
    summarizeMaterialCandidate(day1),
    summarizeMaterialCandidate(day2),
    summarizeMaterialCandidate(day3),
    summarizeMaterialCandidate(day4),
    summarizeMaterialCandidate(day5),
    summarizeMaterialCandidate(day6),
    summarizeMaterialCandidate(day7),
  ];
}

function summary(days: GavanWeek1MaterialProductSnapshotDay[]): GavanWeek1MaterialProductSnapshot['summary'] {
  const exerciseTypes = new Set(days.flatMap((day) => day.exerciseTypes));
  return {
    days: days.length,
    materialCandidateDays: days.filter((day) => day.sourceKind === 'material_candidate').length,
    blueprintCandidateDays: days.filter((day) => day.sourceKind === 'blueprint_candidate').length,
    phraseCount: days.reduce((total, day) => total + day.phraseCount, 0),
    exerciseTypeCount: exerciseTypes.size,
    liveIntegratedDays: days.filter((day) => day.liveIntegration !== false).length,
    finalAudioReadyDays: days.filter((day) => day.audioReady).length,
    finalPronunciationReadyDays: days.filter((day) => day.pronunciationReady).length,
    finalQuizWrittenDays: days.filter((day) => day.finalQuizWritten).length,
  };
}

export function buildGavanWeek1MaterialProductSnapshot(
  options: GavanWeek1MaterialProductSnapshotOptions,
): GavanWeek1MaterialProductSnapshot {
  const days = buildDays(options.generatedAt);
  return {
    kind: 'gavan_week1_material_product_snapshot',
    generatedAt: options.generatedAt,
    planId: 'gavan',
    weekId: 'gavan-week1',
    liveIntegration: false,
    releaseReady: false,
    days,
    summary: summary(days),
  };
}

export function writeGavanWeek1MaterialProductSnapshot(
  options: GavanWeek1MaterialProductSnapshotWriteOptions,
): GavanWeek1MaterialProductSnapshotWriteResult {
  if (!isAllowedTarget(options.targetPath)) {
    return {
      valid: false,
      issues: [{
        code: 'target_path_not_allowed',
        detail: 'Target path must stay under .codex-tmp or docs/reports.',
      }],
    };
  }

  const snapshot = buildGavanWeek1MaterialProductSnapshot({
    generatedAt: options.generatedAt,
  });
  const resolvedTarget = path.resolve(options.targetPath);
  const body = `${JSON.stringify(snapshot, null, 2)}\n`;

  mkdirSync(path.dirname(resolvedTarget), { recursive: true });
  writeFileSync(resolvedTarget, body, 'utf8');

  return {
    valid: true,
    issues: [],
    targetPath: resolvedTarget,
    bytesWritten: Buffer.byteLength(body, 'utf8'),
  };
}

if (require.main === module) {
  const generatedAt = process.env.PERSONAL_PLAN_SNAPSHOT_AT || new Date().toISOString();
  const result = writeGavanWeek1MaterialProductSnapshot({
    generatedAt,
    targetPath: GAVAN_WEEK1_MATERIAL_PRODUCT_SNAPSHOT_PATH,
  });
  const snapshot = buildGavanWeek1MaterialProductSnapshot({ generatedAt });

  console.log(JSON.stringify({
    targetPath: result.targetPath,
    valid: result.valid,
    ...snapshot.summary,
  }, null, 2));
}
