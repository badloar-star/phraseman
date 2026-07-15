import { trackEvent } from './analytics';
import Constants from 'expo-constants';

export type ExperimentVariantId = 'A' | 'B' | 'C';
export type ExperimentAssignmentQuality = 'frozen' | 'pending_fallback';

export interface ExperimentPassport {
  experimentId: string;
  definitionVersion: number;
  assignmentSalt: string;
  allocation: Record<ExperimentVariantId, number>;
  controlVariant: ExperimentVariantId;
  audience: string;
  primaryMetric: string;
  guardrails: string[];
  startUtc: string;
  endUtc: string;
  minimumSample: number;
  maturityWindowDays: number;
  stopRule: string;
  configRevision: number;
  status: 'draft' | 'running' | 'stopped' | 'completed';
}

const CODE = /^[a-z][a-z0-9_.-]{2,79}$/i;
const METRIC = /^[a-z][a-z0-9_.-]{2,99}$/i;
const seenExposureIds = new Set<string>();

function integer(value: unknown, min: number, max: number): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

export function normalizeExperimentPassport(value: unknown): ExperimentPassport | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const experimentId = String(row.experimentId ?? '').trim();
  const assignmentSalt = String(row.assignmentSalt ?? '').trim();
  const controlVariant = String(row.controlVariant ?? '') as ExperimentVariantId;
  const audience = String(row.audience ?? '').trim();
  const primaryMetric = String(row.primaryMetric ?? '').trim();
  const stopRule = String(row.stopRule ?? '').trim();
  const status = String(row.status ?? '') as ExperimentPassport['status'];
  const definitionVersion = integer(row.definitionVersion, 1, 1000);
  const minimumSample = integer(row.minimumSample, 1, 10_000_000);
  const maturityWindowDays = integer(row.maturityWindowDays, 0, 365);
  const configRevision = integer(row.configRevision, 1, 1_000_000);
  const allocationRaw = row.allocation && typeof row.allocation === 'object'
    ? row.allocation as Record<string, unknown> : {};
  const allocation = {
    A: integer(allocationRaw.A, 0, 100),
    B: integer(allocationRaw.B, 0, 100),
    C: integer(allocationRaw.C, 0, 100),
  };
  const startMs = Date.parse(String(row.startUtc ?? ''));
  const endMs = Date.parse(String(row.endUtc ?? ''));
  const rawGuardrails = Array.isArray(row.guardrails) ? row.guardrails.map(String) : [];
  const guardrails = rawGuardrails.filter((item) => METRIC.test(item)).slice(0, 10);
  const controlAllocation = ['A', 'B', 'C'].includes(controlVariant)
    ? allocation[controlVariant]
    : null;
  if (!CODE.test(experimentId) || !CODE.test(assignmentSalt) || !CODE.test(audience)
    || !METRIC.test(primaryMetric) || !CODE.test(stopRule)
    || guardrails.length === 0 || guardrails.length !== rawGuardrails.length
    || !['A', 'B', 'C'].includes(controlVariant)
    || !['draft', 'running', 'stopped', 'completed'].includes(status)
    || definitionVersion == null || minimumSample == null || maturityWindowDays == null || configRevision == null
    || allocation.A == null || allocation.B == null || allocation.C == null
    || allocation.A + allocation.B + allocation.C !== 100
    || controlAllocation == null || controlAllocation <= 0
    || !Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null;
  return {
    experimentId,
    definitionVersion,
    assignmentSalt,
    allocation: allocation as Record<ExperimentVariantId, number>,
    controlVariant,
    audience,
    primaryMetric,
    guardrails,
    startUtc: new Date(startMs).toISOString(),
    endUtc: new Date(endMs).toISOString(),
    minimumSample,
    maturityWindowDays,
    stopRule,
    configRevision,
    status,
  };
}

export function buildExperimentExposurePayload(input: {
  passport: ExperimentPassport;
  variantId: ExperimentVariantId;
  exposureId: string;
  surface: 'paywall';
  assignmentQuality: ExperimentAssignmentQuality;
  occurredAtMs: number;
}) {
  if (input.assignmentQuality !== 'frozen' || input.passport.status !== 'running') {
    throw new Error('experiment_exposure_not_analyzable');
  }
  if (!(input.variantId in input.passport.allocation) || input.passport.allocation[input.variantId] <= 0) {
    throw new Error('experiment_variant_invalid');
  }
  return {
      schema_version: 1,
      event_id: String(input.exposureId).slice(0, 80),
    experiment_id: input.passport.experimentId,
    definition_version: input.passport.definitionVersion,
    variant_id: input.variantId,
    control_variant_id: input.passport.controlVariant,
    exposure_id: String(input.exposureId).slice(0, 80),
    surface: input.surface,
    config_revision: input.passport.configRevision,
      assignment_quality: input.assignmentQuality,
      app_version: Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? 'unknown',
      build_number: Constants.nativeBuildVersion ?? 'unknown',
    occurred_at_ms: Math.max(0, Math.round(input.occurredAtMs)),
  };
}

export async function trackPaywallExperimentExposure(
  variantId: ExperimentVariantId,
  exposureId: string,
): Promise<void> {
  if (seenExposureIds.has(exposureId)) return;
  const { getPaywallExperimentMeasurementContext } = await import('./paywall_variant');
  const context = getPaywallExperimentMeasurementContext(variantId);
  if (!context) return;
  const payload = buildExperimentExposurePayload({
    ...context,
    variantId,
    exposureId,
    surface: 'paywall',
    occurredAtMs: Date.now(),
  });
  seenExposureIds.add(exposureId);
  if (seenExposureIds.size > 200) seenExposureIds.delete(seenExposureIds.values().next().value as string);
  await trackEvent('experiment_exposure', payload);
}

export default function __RouteShim() { return null; }
