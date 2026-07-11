export type PmPublicationMode = 'full' | 'coverage_only';
export type PmItemType = 'recommendation' | 'experiment';
export type PmRecommendationMutationStatus = 'proposed' | 'accepted' | 'deferred' | 'rejected' | 'completed' | 'validated';
export type PmExperimentMutationStatus = 'proposed' | 'running' | 'stopped' | 'validated' | 'rejected';

export interface PmWritePlanItem {
  path: string;
  kind: 'set';
}

export interface PmPublicationWriteInput {
  mode: PmPublicationMode;
  runId: string;
  briefId: string;
}

export interface PmItemMutationInput {
  itemType: PmItemType;
  from: string;
  to: string;
  comment?: string;
  result?: string;
}

export type PmValidationResult = { ok: true } | { ok: false; errors: string[] };

const RECOMMENDATION_TRANSITIONS: Record<string, readonly string[]> = {
  proposed: ['accepted', 'deferred', 'rejected'],
  accepted: ['completed', 'deferred'],
  deferred: ['accepted', 'rejected'],
  completed: ['validated'],
  rejected: [],
  validated: [],
};

const EXPERIMENT_TRANSITIONS: Record<string, readonly string[]> = {
  proposed: ['running', 'rejected'],
  running: ['stopped', 'validated'],
  stopped: ['running', 'validated'],
  rejected: [],
  validated: [],
};

export function buildPmPublicationWrites(input: PmPublicationWriteInput): PmWritePlanItem[] {
  const required: PmWritePlanItem[] = [
    { path: `admin_pm_runs/${input.runId}`, kind: 'set' },
    { path: 'admin_pm_state/latest', kind: 'set' },
    { path: `admin_pm_briefs/${input.briefId}`, kind: 'set' },
    { path: `admin_pm_evidence_manifests/${input.briefId}`, kind: 'set' },
  ];
  if (input.mode === 'coverage_only') return required;
  return [
    ...required,
    { path: `admin_pm_recommendation_bundles/${input.briefId}`, kind: 'set' },
    { path: `admin_pm_idea_bundles/${input.briefId}`, kind: 'set' },
    { path: `admin_pm_experiment_bundles/${input.briefId}`, kind: 'set' },
  ];
}

export function validatePmItemMutation(input: PmItemMutationInput): PmValidationResult {
  const errors: string[] = [];
  const transitions = input.itemType === 'recommendation' ? RECOMMENDATION_TRANSITIONS : EXPERIMENT_TRANSITIONS;
  if (!transitions[input.from]?.includes(input.to)) errors.push('invalid_transition');
  if (input.comment && input.comment.length > 1000) errors.push('comment_too_long');
  if (input.result && input.result.length > 2000) errors.push('result_too_long');
  if (input.itemType === 'recommendation' && input.result) errors.push('recommendation_result_not_allowed');
  return errors.length ? { ok: false, errors } : { ok: true };
}

export function buildPmDecisionAudit(input: {
  briefId: string;
  itemId: string;
  itemType: PmItemType;
  from: string;
  to: string;
  actorEmail: string;
  comment?: string;
  result?: string;
  nowMs: number;
}): { path: string; data: Record<string, unknown> } {
  return {
    path: `admin_pm_decisions/${input.briefId}_${input.itemId}_${input.nowMs}`,
    data: {
      schemaVersion: 1,
      briefId: input.briefId,
      itemId: input.itemId,
      itemType: input.itemType,
      from: input.from,
      to: input.to,
      actorEmail: input.actorEmail,
      comment: input.comment || '',
      result: input.result || '',
      decidedAtMs: input.nowMs,
    },
  };
}
