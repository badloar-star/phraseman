import type { StudyTargetLang } from './study_target_lang_dev';

export const SOFT_UPSELL_TRIGGERS = [
  'first_lesson',
  'free_lessons_complete',
  'weekly_review',
  'second_ai_dialogue',
  'streak_milestone',
  'repeated_training',
] as const;

export const SOFT_UPSELL_CONTEXTS = [
  'first_lesson_success',
  'free_lessons_complete',
  'weekly_review',
  'dialog_repeat_success',
  'streak_milestone',
  'trainer_repeat_success',
] as const;

export type SoftUpsellTrigger = (typeof SOFT_UPSELL_TRIGGERS)[number];
export type SoftUpsellContext = (typeof SOFT_UPSELL_CONTEXTS)[number];
export type SoftUpsellStudyTarget = StudyTargetLang;
export type SoftUpsellDestination = 'paywall';

export type SoftUpsellSuppressionReason =
  | 'no_candidate'
  | 'premium'
  | 'disabled'
  | 'overlay_occupied'
  | 'session_cap'
  | 'global_cooldown'
  | 'context_cooldown'
  | 'milestone_consumed'
  | 'invalid_trigger_value';

export interface SoftUpsellCandidate {
  trigger: SoftUpsellTrigger;
  value: number;
  studyTarget: SoftUpsellStudyTarget;
}

export interface SoftUpsellInput {
  candidates: readonly SoftUpsellCandidate[];
  hasPremiumAccess: boolean;
  enabled: Partial<Record<SoftUpsellTrigger, boolean>>;
  overlayOccupied: boolean;
  sessionClaimed: boolean;
  nowMs: number;
  lastGlobalImpressionMs?: number | null;
  contextDismissedAtMs: Partial<Record<SoftUpsellContext, number | null>>;
  consumedMilestones: readonly string[];
}

export interface SoftUpsellOpportunity extends SoftUpsellCandidate {
  context: SoftUpsellContext;
  destination: SoftUpsellDestination;
  milestoneId: string;
}

export type SoftUpsellDecision =
  | { status: 'eligible'; opportunity: SoftUpsellOpportunity }
  | { status: 'suppressed'; reason: SoftUpsellSuppressionReason };

const DAY_MS = 24 * 60 * 60 * 1000;
export const SOFT_UPSELL_GLOBAL_COOLDOWN_MS = 7 * DAY_MS;
export const SOFT_UPSELL_CONTEXT_COOLDOWN_MS = 7 * DAY_MS;

const TRIGGER_PRIORITY: Record<SoftUpsellTrigger, number> = {
  free_lessons_complete: 6,
  second_ai_dialogue: 5,
  weekly_review: 4,
  streak_milestone: 3,
  first_lesson: 2,
  repeated_training: 1,
};

const OPPORTUNITY_BY_TRIGGER: Record<
  SoftUpsellTrigger,
  Pick<SoftUpsellOpportunity, 'context' | 'destination'>
> = {
  first_lesson: { context: 'first_lesson_success', destination: 'paywall' },
  free_lessons_complete: { context: 'free_lessons_complete', destination: 'paywall' },
  weekly_review: { context: 'weekly_review', destination: 'paywall' },
  second_ai_dialogue: { context: 'dialog_repeat_success', destination: 'paywall' },
  streak_milestone: { context: 'streak_milestone', destination: 'paywall' },
  repeated_training: { context: 'trainer_repeat_success', destination: 'paywall' },
};

function selectCandidate(candidates: readonly SoftUpsellCandidate[]): SoftUpsellCandidate | undefined {
  return candidates.reduce<SoftUpsellCandidate | undefined>((selected, current) => {
    if (!selected) return current;
    const priorityDelta = TRIGGER_PRIORITY[current.trigger] - TRIGGER_PRIORITY[selected.trigger];
    if (priorityDelta > 0) return current;
    if (priorityDelta === 0 && current.trigger === 'streak_milestone' && current.value > selected.value) {
      return current;
    }
    return selected;
  }, undefined);
}

function hasValidValue(candidate: SoftUpsellCandidate): boolean {
  switch (candidate.trigger) {
    case 'first_lesson': return candidate.value === 1;
    case 'free_lessons_complete': return candidate.value === 8;
    case 'second_ai_dialogue': return candidate.value === 2;
    case 'weekly_review':
    case 'repeated_training': return candidate.value === 1;
    case 'streak_milestone': return [7, 14, 30].includes(candidate.value);
  }
}

function isCoolingDown(timestampMs: number | null | undefined, nowMs: number, cooldownMs: number): boolean {
  if (timestampMs == null) return false;
  if (!Number.isFinite(timestampMs) || timestampMs < 0) return true;
  const elapsedMs = nowMs - timestampMs;
  return elapsedMs < 0 || elapsedMs < cooldownMs;
}

export function decideSoftUpsell(input: SoftUpsellInput): SoftUpsellDecision {
  const candidate = selectCandidate(input.candidates);
  if (!candidate) return { status: 'suppressed', reason: 'no_candidate' };

  const mapping = OPPORTUNITY_BY_TRIGGER[candidate.trigger];
  const milestoneId = `${candidate.trigger}:${candidate.value}:${candidate.studyTarget}`;

  // This order is contractual: callers and analytics receive the first applicable reason.
  if (input.hasPremiumAccess) return { status: 'suppressed', reason: 'premium' };
  if (!hasValidValue(candidate)) return { status: 'suppressed', reason: 'invalid_trigger_value' };
  if (input.enabled[candidate.trigger] !== true) return { status: 'suppressed', reason: 'disabled' };
  if (input.overlayOccupied) return { status: 'suppressed', reason: 'overlay_occupied' };
  if (input.sessionClaimed) return { status: 'suppressed', reason: 'session_cap' };
  if (isCoolingDown(input.lastGlobalImpressionMs, input.nowMs, SOFT_UPSELL_GLOBAL_COOLDOWN_MS)) {
    return { status: 'suppressed', reason: 'global_cooldown' };
  }
  if (isCoolingDown(input.contextDismissedAtMs[mapping.context], input.nowMs, SOFT_UPSELL_CONTEXT_COOLDOWN_MS)) {
    return { status: 'suppressed', reason: 'context_cooldown' };
  }
  if (input.consumedMilestones.includes(milestoneId)) {
    return { status: 'suppressed', reason: 'milestone_consumed' };
  }

  return {
    status: 'eligible',
    opportunity: { ...candidate, ...mapping, milestoneId },
  };
}
