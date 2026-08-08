import { HttpsError } from 'firebase-functions/v2/https';

export const ADMIN_PLAN_SCHEMA_VERSION = 1 as const;
export const ADMIN_PLAN_KINDS = ['reliability', 'retention', 'conversion', 'content_quality', 'support_quality', 'cost_control'] as const;
export const ADMIN_PLAN_EFFECTS = ['reduce_failures', 'improve_resilience', 'reduce_drop_off', 'improve_conversion', 'improve_quality', 'reduce_cost', 'improve_response_time'] as const;
export const ADMIN_PLAN_ACTION_CODES = ['investigate_metrics', 'reproduce_issue', 'prepare_change', 'verify_change', 'define_rollback', 'monitor_outcome'] as const;
export type AdminPlanPriority = 'low' | 'normal' | 'high' | 'critical';
export type AdminPlanKind = (typeof ADMIN_PLAN_KINDS)[number];
export type AdminPlanEffect = (typeof ADMIN_PLAN_EFFECTS)[number];
export type AdminPlanActionCode = (typeof ADMIN_PLAN_ACTION_CODES)[number];
export type AdminPlanStep = Readonly<{ title: string; outcome: string }>;
export type AdminPlanDraft = Readonly<{
  schemaVersion: 1;
  planKind: AdminPlanKind;
  title: string;
  summary: string;
  priority: AdminPlanPriority;
  expectedEffect: AdminPlanEffect;
  source: Readonly<{ kind: 'director_digest'; ref: string }>;
  actionCodes: readonly AdminPlanActionCode[];
  steps: readonly AdminPlanStep[];
  status: 'draft';
}>;

const PLAN_TITLES: Readonly<Record<AdminPlanKind, string>> = Object.freeze({
  reliability: 'Reliability improvement plan',
  retention: 'Retention improvement plan',
  conversion: 'Conversion improvement plan',
  content_quality: 'Content quality improvement plan',
  support_quality: 'Support quality improvement plan',
  cost_control: 'Cost control plan',
});

const EFFECT_SUMMARIES: Readonly<Record<AdminPlanEffect, string>> = Object.freeze({
  reduce_failures: 'Reduce verified failures while preserving current behavior.',
  improve_resilience: 'Improve operational resilience while preserving current behavior.',
  reduce_drop_off: 'Reduce verified drop-off while preserving current behavior.',
  improve_conversion: 'Improve verified conversion while preserving current behavior.',
  improve_quality: 'Improve verified quality while preserving current behavior.',
  reduce_cost: 'Reduce verified cost while preserving current behavior.',
  improve_response_time: 'Improve verified response time while preserving current behavior.',
});

const ACTION_STEPS: Readonly<Record<AdminPlanActionCode, AdminPlanStep>> = Object.freeze({
  investigate_metrics: Object.freeze({
    title: 'Investigate verified metrics',
    outcome: 'A bounded evidence summary is ready for owner review.',
  }),
  reproduce_issue: Object.freeze({
    title: 'Reproduce the verified issue',
    outcome: 'A bounded reproduction is ready for owner review.',
  }),
  prepare_change: Object.freeze({
    title: 'Prepare a bounded change',
    outcome: 'A non-executing change proposal is ready for owner review.',
  }),
  verify_change: Object.freeze({
    title: 'Verify the prepared change',
    outcome: 'Deterministic verification evidence is ready for owner review.',
  }),
  define_rollback: Object.freeze({
    title: 'Define rollback criteria',
    outcome: 'Explicit rollback conditions are recorded before execution.',
  }),
  monitor_outcome: Object.freeze({
    title: 'Monitor the verified outcome',
    outcome: 'A bounded outcome comparison is ready for owner review.',
  }),
});

function fail(message: string): never {
  throw new HttpsError('invalid-argument', message);
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function exact(input: Record<string, unknown>, keys: readonly string[], label: string): void {
  if (Object.keys(input).some((key) => !keys.includes(key)) || keys.some((key) => !(key in input))) {
    fail(`${label} fields are invalid`);
  }
}

function priority(value: unknown): AdminPlanPriority {
  const values: readonly AdminPlanPriority[] = ['low', 'normal', 'high', 'critical'];
  if (typeof value !== 'string' || !values.includes(value as AdminPlanPriority)) fail('priority is invalid');
  return value as AdminPlanPriority;
}

function choice<T extends string>(value: unknown, values: readonly T[], label: string): T {
  if (typeof value !== 'string' || !values.includes(value as T)) fail(`${label} is invalid`);
  return value as T;
}

function source(value: unknown): Readonly<{ kind: 'director_digest'; ref: string }> {
  const input = record(value, 'admin plan source');
  exact(input, ['kind', 'ref'], 'admin plan source');
  if (input.kind !== 'director_digest'
    || typeof input.ref !== 'string'
    || !/^director_digest:sha256:[a-f0-9]{64}$/.test(input.ref)) {
    fail('admin plan source is invalid');
  }
  return Object.freeze({ kind: 'director_digest', ref: input.ref });
}

function actionCodes(value: unknown): readonly AdminPlanActionCode[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 8) fail('actionCodes is invalid');
  const codes = value.map((item) => choice(item, ADMIN_PLAN_ACTION_CODES, 'actionCode'));
  if (new Set(codes).size !== codes.length) fail('actionCodes is invalid');
  return Object.freeze(codes);
}

function buildAdminPlanDraft(input: {
  planKind: unknown;
  priority: unknown;
  expectedEffect: unknown;
  source: unknown;
  actionCodes: unknown;
}): AdminPlanDraft {
  const planKind = choice(input.planKind, ADMIN_PLAN_KINDS, 'planKind');
  const expectedEffect = choice(input.expectedEffect, ADMIN_PLAN_EFFECTS, 'expectedEffect');
  const codes = actionCodes(input.actionCodes);
  return Object.freeze({
    schemaVersion: ADMIN_PLAN_SCHEMA_VERSION,
    planKind,
    title: PLAN_TITLES[planKind],
    summary: EFFECT_SUMMARIES[expectedEffect],
    priority: priority(input.priority),
    expectedEffect,
    source: source(input.source),
    actionCodes: codes,
    steps: Object.freeze(codes.map((code) => ACTION_STEPS[code])),
    status: 'draft',
  });
}

export function parseIdempotencyKey(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{15,199}$/.test(value)) {
    fail('idempotencyKey is invalid');
  }
  return value;
}

export function parsePlanId(value: unknown): string {
  if (typeof value !== 'string' || !/^plan_[a-f0-9]{64}$/.test(value)) fail('planId is invalid');
  return value;
}

export function parseAdminPlanDraft(value: unknown): AdminPlanDraft {
  const input = record(value, 'admin plan');
  exact(input, [
    'planKind', 'title', 'summary', 'priority', 'expectedEffect', 'source', 'actionCodes', 'steps',
  ], 'admin plan');
  const derived = buildAdminPlanDraft({
    planKind: input.planKind,
    priority: input.priority,
    expectedEffect: input.expectedEffect,
    source: input.source,
    actionCodes: input.actionCodes,
  });
  if (input.title !== derived.title
    || input.summary !== derived.summary
    || JSON.stringify(input.steps) !== JSON.stringify(derived.steps)) {
    fail('admin plan derived fields are invalid');
  }
  return derived;
}

export function parseCreatePlanInput(value: unknown): Readonly<{ idempotencyKey: string; draft: AdminPlanDraft }> {
  const input = record(value, 'create admin plan');
  exact(input, ['idempotencyKey', 'planKind', 'priority', 'expectedEffect', 'source', 'actionCodes'], 'create admin plan');
  return Object.freeze({
    idempotencyKey: parseIdempotencyKey(input.idempotencyKey),
    draft: buildAdminPlanDraft({
      planKind: input.planKind,
      priority: input.priority,
      expectedEffect: input.expectedEffect,
      source: input.source,
      actionCodes: input.actionCodes,
    }),
  });
}

export function parseGetPlanInput(value: unknown): Readonly<{ planId: string }> {
  const input = record(value, 'get admin plan');
  exact(input, ['planId'], 'get admin plan');
  return Object.freeze({ planId: parsePlanId(input.planId) });
}

export function parseListPlansInput(value: unknown): Readonly<{ limit: number }> {
  const input = record(value, 'list admin plans');
  exact(input, ['limit'], 'list admin plans');
  if (typeof input.limit !== 'number' || !Number.isSafeInteger(input.limit) || input.limit < 1 || input.limit > 100) {
    fail('limit is invalid');
  }
  return Object.freeze({ limit: input.limit });
}
