import type { PmDomain, PmEvidenceBundle } from './admin_pm_evidence';

export const PM_CORE_DOMAINS: readonly PmDomain[] = [
  'growth_activation',
  'learning_engagement',
  'revenue',
  'quality_support',
] as const;

const REQUIRED_SEMANTIC_METRICS: Readonly<Record<PmDomain, readonly string[]>> = {
  growth_activation: ['growth_activation.activation_rate'],
  learning_engagement: ['learning_engagement.unique_learners', 'learning_engagement.lesson_completions'],
  revenue: ['revenue.paywall_cta_rate', 'revenue.initial_paid_purchases', 'revenue.refunds'],
  quality_support: ['quality_support.errors_per_100_learners'],
  safety_community: [],
  operations: [],
};

export interface PmPublicationGateResult {
  mode: 'full' | 'coverage_only';
  missingDomains: PmDomain[];
  coreDomains: readonly PmDomain[];
}

export function evaluatePmPublicationGate(bundle: PmEvidenceBundle): PmPublicationGateResult {
  const missingDomains = PM_CORE_DOMAINS.filter((domain) => {
    const required = REQUIRED_SEMANTIC_METRICS[domain];
    if (!required.length || required.some((metricId) => !bundle.metrics[metricId])) return true;
    return required.some((metricId) => {
      const metric = bundle.metrics[metricId];
      const sourceCoverage = bundle.coverage[metric.sourceId];
      return sourceCoverage?.current?.status !== 'ok' || sourceCoverage?.previous?.status !== 'ok';
    });
  });
  return {
    mode: missingDomains.length ? 'coverage_only' : 'full',
    missingDomains,
    coreDomains: PM_CORE_DOMAINS,
  };
}
