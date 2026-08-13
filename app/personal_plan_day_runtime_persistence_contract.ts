import type { PlanMinutesChoice, PersonalPlanId } from './personal_plan_catalog';
import type { PlanDayRuntimeLoop } from './personal_plan_day_runtime_loop_coordinator';

export type PlanDayRuntimePersistedStateV1 = {
  schemaVersion: 1;
  planInstanceId: string;
  planId: PersonalPlanId;
  dayIndex: number;
  minutesPerDay: PlanMinutesChoice;
  activeBlockId?: string;
  completedBlockIds: string[];
  carryoverPhraseIds: string[];
  updatedAt: string;
};

export type BuildPlanDayRuntimePersistedStateOptions = {
  updatedAt?: string;
};

export type PlanDayRuntimePersistedStateIssue =
  | 'unsupported_schema_version'
  | 'missing_plan_instance_id'
  | 'missing_plan_id'
  | 'invalid_day_index'
  | 'invalid_minutes_per_day'
  | 'invalid_updated_at'
  | 'invalid_completed_block_ids'
  | 'invalid_carryover_phrase_ids'
  | 'private_payload_field';

export type ParsePlanDayRuntimePersistedStateResult =
  | {
    status: 'ready';
    state: PlanDayRuntimePersistedStateV1;
  }
  | {
    status: 'blocked';
    issues: Array<PlanDayRuntimePersistedStateIssue | 'invalid_json' | 'invalid_shape'>;
  };

const VALID_PLAN_IDS = new Set<PersonalPlanId>(['voyazh', 'mitap', 'gavan', 'impuls', 'echo']);
const VALID_MINUTES = new Set<PlanMinutesChoice>([5, 10, 15, 20]);
const PRIVATE_PAYLOAD_FIELDS = new Set([
  'selectedAnswer',
  'expectedAnswer',
  'activeSession',
  'items',
  'attempts',
  'phrases',
  'targetRu',
  'displayEnglish',
  'correctAnswer',
]);

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasPrivatePayloadField(value: Record<string, unknown>): boolean {
  return Object.keys(value).some((key) => PRIVATE_PAYLOAD_FIELDS.has(key));
}

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    return undefined;
  }
  return value;
}

export function buildPlanDayRuntimePersistedState(
  loop: PlanDayRuntimeLoop,
  options: BuildPlanDayRuntimePersistedStateOptions = {},
): PlanDayRuntimePersistedStateV1 {
  const activeBlockId = loop.assembly.activeBlockId;

  return {
    schemaVersion: 1,
    planInstanceId: loop.planInstanceId,
    planId: loop.assembly.activeSession?.block.planId
      ?? loop.bundles[0]?.block.planId
      ?? 'gavan',
    dayIndex: loop.assembly.activeSession?.block.dayIndex
      ?? loop.bundles[0]?.block.dayIndex
      ?? 1,
    minutesPerDay: loop.minutesPerDay,
    activeBlockId,
    completedBlockIds: unique(loop.completedBlockIds),
    carryoverPhraseIds: unique(loop.carryoverPhraseIds),
    updatedAt: options.updatedAt ?? new Date().toISOString(),
  };
}

export function validatePlanDayRuntimePersistedState(
  state: PlanDayRuntimePersistedStateV1,
): PlanDayRuntimePersistedStateIssue[] {
  const issues: PlanDayRuntimePersistedStateIssue[] = [];

  if (state.schemaVersion !== 1) {
    issues.push('unsupported_schema_version');
  }
  if (!state.planInstanceId.trim()) {
    issues.push('missing_plan_instance_id');
  }
  if (!VALID_PLAN_IDS.has(state.planId)) {
    issues.push('missing_plan_id');
  }
  if (!Number.isInteger(state.dayIndex) || state.dayIndex < 1) {
    issues.push('invalid_day_index');
  }
  if (!VALID_MINUTES.has(state.minutesPerDay)) {
    issues.push('invalid_minutes_per_day');
  }
  if (!state.updatedAt.trim() || Number.isNaN(Date.parse(state.updatedAt))) {
    issues.push('invalid_updated_at');
  }
  if (
    !Array.isArray(state.completedBlockIds) ||
    state.completedBlockIds.some((id) => typeof id !== 'string' || !id.trim())
  ) {
    issues.push('invalid_completed_block_ids');
  }
  if (
    !Array.isArray(state.carryoverPhraseIds) ||
    state.carryoverPhraseIds.some((id) => typeof id !== 'string' || !id.trim())
  ) {
    issues.push('invalid_carryover_phrase_ids');
  }

  return [...new Set(issues)];
}

export function serializePlanDayRuntimePersistedState(
  state: PlanDayRuntimePersistedStateV1,
): string {
  return JSON.stringify({
    schemaVersion: state.schemaVersion,
    planInstanceId: state.planInstanceId,
    planId: state.planId,
    dayIndex: state.dayIndex,
    minutesPerDay: state.minutesPerDay,
    activeBlockId: state.activeBlockId,
    completedBlockIds: unique(state.completedBlockIds),
    carryoverPhraseIds: unique(state.carryoverPhraseIds),
    updatedAt: state.updatedAt,
  });
}

export function parsePlanDayRuntimePersistedState(
  raw: string,
): ParsePlanDayRuntimePersistedStateResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      status: 'blocked',
      issues: ['invalid_json'],
    };
  }

  if (!isRecord(parsed)) {
    return {
      status: 'blocked',
      issues: ['invalid_shape'],
    };
  }
  if (hasPrivatePayloadField(parsed)) {
    return {
      status: 'blocked',
      issues: ['private_payload_field'],
    };
  }

  const completedBlockIds = stringArray(parsed.completedBlockIds);
  const carryoverPhraseIds = stringArray(parsed.carryoverPhraseIds);
  if (!completedBlockIds || !carryoverPhraseIds) {
    return {
      status: 'blocked',
      issues: ['invalid_shape'],
    };
  }

  const state = {
    schemaVersion: parsed.schemaVersion,
    planInstanceId: parsed.planInstanceId,
    planId: parsed.planId,
    dayIndex: parsed.dayIndex,
    minutesPerDay: parsed.minutesPerDay,
    activeBlockId: typeof parsed.activeBlockId === 'string' ? parsed.activeBlockId : undefined,
    completedBlockIds,
    carryoverPhraseIds,
    updatedAt: parsed.updatedAt,
  } as PlanDayRuntimePersistedStateV1;
  const issues = validatePlanDayRuntimePersistedState(state);

  if (issues.length > 0) {
    return {
      status: 'blocked',
      issues,
    };
  }

  return {
    status: 'ready',
    state,
  };
}

export function planDayRuntimeStateBelongsToInstance(
  state: PlanDayRuntimePersistedStateV1,
  planInstanceId: string,
): boolean {
  return Boolean(planInstanceId.trim()) && state.planInstanceId === planInstanceId.trim();
}
