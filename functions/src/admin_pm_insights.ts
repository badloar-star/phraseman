import crypto from 'node:crypto';
import type { PmDomain, PmEvidenceBundle } from './admin_pm_evidence';

export interface PmMetricFact {
  metricId: string;
  sourceId: string;
  domain: PmDomain;
  current: number;
  previous: number;
  absoluteDelta: number;
  percentDelta: number | null;
  confidence: number;
  evidenceIds: string[];
}

export interface PmMetricAnomaly extends PmMetricFact {
  direction: 'up' | 'down';
  reason: string;
}

export interface ProductInsights {
  facts: PmMetricFact[];
  anomalies: PmMetricAnomaly[];
}

export interface ComputeProductInsightsOptions {
  anomalyPercentThreshold?: number;
}

function confidenceFor(caveats: string[]): number {
  if (!caveats.length) return 1;
  return Math.max(0.35, 1 - caveats.length * 0.2);
}

function evidenceIdsFor(bundle: PmEvidenceBundle, metricId: string): string[] {
  return bundle.evidence
    .filter((item) => item.metricId === metricId && (item.windowKey === 'current' || item.windowKey === 'previous'))
    .map((item) => item.evidenceId)
    .sort();
}

export function computeProductInsights(bundle: PmEvidenceBundle, options: ComputeProductInsightsOptions = {}): ProductInsights {
  const threshold = options.anomalyPercentThreshold ?? 150;
  const facts = Object.values(bundle.metrics).filter((metric) => typeof metric.current === 'number' && typeof metric.previous === 'number').map((metric) => {
    const current = metric.current as number;
    const previous = metric.previous as number;
    const absoluteDelta = current - previous;
    const percentDelta = previous === 0 ? null : (absoluteDelta / previous) * 100;
    return {
      metricId: metric.metricId,
      sourceId: metric.sourceId,
      domain: metric.domain,
      current,
      previous,
      absoluteDelta,
      percentDelta,
      confidence: confidenceFor(metric.caveats),
      evidenceIds: evidenceIdsFor(bundle, metric.metricId),
    };
  });
  const anomalies = facts
    .filter((fact) => fact.percentDelta !== null && Math.abs(fact.percentDelta) >= threshold)
    .map((fact) => ({
      ...fact,
      direction: fact.absoluteDelta >= 0 ? 'up' as const : 'down' as const,
      reason: `absolute_delta=${fact.absoluteDelta};percent_delta=${fact.percentDelta}`,
    }));
  return { facts, anomalies };
}

function normalizeIntent(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9а-яё]+/gi, ' ').replace(/\s+/g, ' ').trim();
}

export function fingerprintProductIntent(input: { domain: PmDomain; title: string; evidenceIds: string[] }): string {
  const normalized = normalizeIntent(input.title);
  const evidenceHash = crypto.createHash('sha256').update([...input.evidenceIds].sort().join('\n')).digest('hex').slice(0, 16);
  const intentHash = crypto.createHash('sha256').update(`${input.domain}\n${normalized}`).digest('hex').slice(0, 16);
  return `${input.domain}:${intentHash}:${evidenceHash}`;
}

export function filterRejectedProductIntents<T extends { domain: PmDomain; title: string; evidenceIds: string[] }>(
  items: readonly T[],
  rejectedFingerprints: ReadonlySet<string>,
): T[] {
  return items.filter((item) => !rejectedFingerprints.has(fingerprintProductIntent(item)));
}
