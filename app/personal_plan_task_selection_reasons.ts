import type { PlanExerciseBlock } from './personal_plan_engine_contracts';
import type {
  PlanWeakSpotSignal,
  PlanWeakSpotSummary,
} from './personal_plan_weak_spot_summary';

export type PlanTaskSelectionReasonCode =
  | 'lesson_foundation'
  | 'new_phrase_practice'
  | 'natural_choice_practice'
  | 'listening_practice'
  | 'recall_due'
  | 'trainer_due'
  | 'mistake_review_due'
  | 'weak_spot_recovery'
  | 'quiz_check';

export type PlanTaskSelectionReasonSource = 'plan_structure' | 'weak_spot_summary';

export type PlanTaskSelectionReasonTone = 'foundation' | 'practice' | 'check' | 'recovery';

export type PlanTaskSelectionReasonEvidence = {
  weakSpotIds?: string[];
  weakSpotTags?: string[];
  contentUnitIds?: string[];
  recallDueCount?: number;
  trainerDueCount?: number;
  mistakeAnalyticsDueCount?: number;
};

export type PlanTaskSelectionReason = {
  id: string;
  blockId: string;
  code: PlanTaskSelectionReasonCode;
  source: PlanTaskSelectionReasonSource;
  priority: number;
  tone: PlanTaskSelectionReasonTone;
  evidence: PlanTaskSelectionReasonEvidence;
};

export type PlanTaskSelectionReasonIssueCode =
  | 'missing_task_selection_reason'
  | 'reason_for_unknown_block'
  | 'weak_spot_reason_without_evidence'
  | 'due_reason_without_due_count';

export type PlanTaskSelectionReasonIssue = {
  code: PlanTaskSelectionReasonIssueCode;
  blockId?: string;
  reasonId?: string;
  detail: string;
};

export type PlanTaskSelectionReasonReadinessInput = {
  blocks: PlanExerciseBlock[];
  weakSpotSummary: PlanWeakSpotSummary;
};

export type PlanTaskSelectionReasonValidationInput = {
  blocks: PlanExerciseBlock[];
  reasonsByBlockId: Record<string, PlanTaskSelectionReason[]>;
};

export type PlanTaskSelectionReasonReadiness = {
  valid: boolean;
  issues: PlanTaskSelectionReasonIssue[];
  reasonsByBlockId: Record<string, PlanTaskSelectionReason[]>;
  summary: {
    blocks: number;
    reasons: number;
    weakSpotReasons: number;
    recallDueCount: number;
    trainerDueCount: number;
    mistakeAnalyticsDueCount: number;
  };
};

function compactStrings(values: Iterable<string | undefined>): string[] {
  return [...new Set([...values].map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
}

function reason(
  block: PlanExerciseBlock,
  code: PlanTaskSelectionReasonCode,
  source: PlanTaskSelectionReasonSource,
  priority: number,
  tone: PlanTaskSelectionReasonTone,
  evidence: PlanTaskSelectionReasonEvidence = {},
): PlanTaskSelectionReason {
  return {
    id: `${block.id}:${code}`,
    blockId: block.id,
    code,
    source,
    priority,
    tone,
    evidence,
  };
}

function baseReasonForBlock(block: PlanExerciseBlock): PlanTaskSelectionReason {
  if (block.type === 'linked_lesson_slice') {
    return reason(block, 'lesson_foundation', 'plan_structure', 100, 'foundation');
  }

  if (block.type === 'plan_phrase_recall') {
    return reason(block, 'new_phrase_practice', 'plan_structure', 60, 'practice');
  }

  if (block.type === 'trainer_weak_spot') {
    return reason(block, 'new_phrase_practice', 'plan_structure', 60, 'practice');
  }

  if (block.type === 'personal_practice_seeded' || block.type === 'flashcards_plan_review') {
    return reason(block, 'new_phrase_practice', 'plan_structure', 55, 'practice');
  }

  if (block.type === 'plan_choose_natural_phrase') {
    return reason(block, 'natural_choice_practice', 'plan_structure', 80, 'practice');
  }

  if (block.type === 'plan_listen_choose' || block.type === 'plan_listen_build') {
    return reason(block, 'listening_practice', 'plan_structure', 80, 'practice');
  }

  if (block.type === 'plan_quiz') {
    return reason(block, 'quiz_check', 'plan_structure', 70, 'check');
  }

  return reason(block, 'new_phrase_practice', 'plan_structure', 90, 'practice');
}

function weakSpotsForBlock(
  block: PlanExerciseBlock,
  weakSpots: PlanWeakSpotSignal[],
): PlanWeakSpotSignal[] {
  const blockUnits = new Set(block.contentUnitIds);
  return weakSpots.filter((spot) =>
    spot.contentUnitIds.some((contentUnitId) => blockUnits.has(contentUnitId)),
  );
}

function weakSpotReasonForBlock(
  block: PlanExerciseBlock,
  weakSpots: PlanWeakSpotSignal[],
): PlanTaskSelectionReason | undefined {
  const related = weakSpotsForBlock(block, weakSpots);
  if (related.length === 0) return undefined;

  return reason(block, 'weak_spot_recovery', 'weak_spot_summary', 95, 'recovery', {
    weakSpotIds: compactStrings(related.map((spot) => spot.id)),
    weakSpotTags: compactStrings(related.map((spot) => spot.tag)),
    contentUnitIds: compactStrings(related.flatMap((spot) => spot.contentUnitIds)),
    recallDueCount: related.reduce((sum, spot) => sum + spot.recallDueCount, 0),
    trainerDueCount: related.reduce((sum, spot) => sum + spot.trainerDueCount, 0),
    mistakeAnalyticsDueCount: related.reduce((sum, spot) => sum + spot.mistakeAnalyticsDueCount, 0),
  });
}

function dueReasonForBlock(
  block: PlanExerciseBlock,
  weakSpotSummary: PlanWeakSpotSummary,
): PlanTaskSelectionReason | undefined {
  if (block.type === 'plan_phrase_recall' && weakSpotSummary.due.recall.count > 0) {
    return reason(block, 'recall_due', 'weak_spot_summary', 85, 'recovery', {
      recallDueCount: weakSpotSummary.due.recall.count,
    });
  }

  if (block.type === 'trainer_weak_spot' && weakSpotSummary.due.trainer.count > 0) {
    return reason(block, 'trainer_due', 'weak_spot_summary', 85, 'recovery', {
      trainerDueCount: weakSpotSummary.due.trainer.count,
    });
  }

  if (
    (block.type === 'personal_practice_seeded' || block.type === 'flashcards_plan_review') &&
    weakSpotSummary.due.mistakeAnalytics.count > 0
  ) {
    return reason(block, 'mistake_review_due', 'weak_spot_summary', 80, 'recovery', {
      mistakeAnalyticsDueCount: weakSpotSummary.due.mistakeAnalytics.count,
    });
  }

  return undefined;
}

function issue(
  code: PlanTaskSelectionReasonIssueCode,
  detail: string,
  blockId?: string,
  reasonId?: string,
): PlanTaskSelectionReasonIssue {
  return { code, detail, blockId, reasonId };
}

export function validatePlanTaskSelectionReasons(
  input: PlanTaskSelectionReasonValidationInput,
): { valid: boolean; issues: PlanTaskSelectionReasonIssue[] } {
  const issues: PlanTaskSelectionReasonIssue[] = [];
  const knownBlockIds = new Set(input.blocks.map((block) => block.id));

  input.blocks.forEach((block) => {
    if ((input.reasonsByBlockId[block.id] ?? []).length === 0) {
      issues.push(issue(
        'missing_task_selection_reason',
        'Every plan task block needs at least one reason before it can explain why it appears today.',
        block.id,
      ));
    }
  });

  Object.entries(input.reasonsByBlockId).forEach(([blockId, reasons]) => {
    if (!knownBlockIds.has(blockId)) {
      issues.push(issue(
        'reason_for_unknown_block',
        'Task selection reason references a block that is not part of the package.',
        blockId,
      ));
    }

    reasons.forEach((item) => {
      if (
        item.code === 'weak_spot_recovery' &&
        (item.evidence.weakSpotIds ?? []).length === 0
      ) {
        issues.push(issue(
          'weak_spot_reason_without_evidence',
          'Weak-spot recovery reasons must include concrete weak spot ids.',
          blockId,
          item.id,
        ));
      }

      if (
        item.source === 'weak_spot_summary' &&
        (item.code === 'recall_due' || item.code === 'trainer_due' || item.code === 'mistake_review_due') &&
        !item.evidence.recallDueCount &&
        !item.evidence.trainerDueCount &&
        !item.evidence.mistakeAnalyticsDueCount
      ) {
        issues.push(issue(
          'due_reason_without_due_count',
          'Due reasons from weak-spot summary must expose the due count they are based on.',
          blockId,
          item.id,
        ));
      }
    });
  });

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function buildPlanTaskSelectionReasonReadiness(
  input: PlanTaskSelectionReasonReadinessInput,
): PlanTaskSelectionReasonReadiness {
  const reasonsByBlockId: Record<string, PlanTaskSelectionReason[]> = {};

  input.blocks.forEach((block) => {
    const reasons = [baseReasonForBlock(block)];
    const weakSpotReason = weakSpotReasonForBlock(block, input.weakSpotSummary.weakSpots);
    const dueReason = dueReasonForBlock(block, input.weakSpotSummary);

    if (weakSpotReason) reasons.push(weakSpotReason);
    if (dueReason) reasons.push(dueReason);

    reasonsByBlockId[block.id] = reasons.sort((a, b) => b.priority - a.priority || a.code.localeCompare(b.code));
  });

  const validation = validatePlanTaskSelectionReasons({
    blocks: input.blocks,
    reasonsByBlockId,
  });
  const reasons = Object.values(reasonsByBlockId).flat();

  return {
    valid: validation.valid,
    issues: validation.issues,
    reasonsByBlockId,
    summary: {
      blocks: input.blocks.length,
      reasons: reasons.length,
      weakSpotReasons: reasons.filter((item) => item.code === 'weak_spot_recovery').length,
      recallDueCount: input.weakSpotSummary.due.recall.count,
      trainerDueCount: input.weakSpotSummary.due.trainer.count,
      mistakeAnalyticsDueCount: input.weakSpotSummary.due.mistakeAnalytics.count,
    },
  };
}
