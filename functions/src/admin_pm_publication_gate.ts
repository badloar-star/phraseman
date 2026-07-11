import type { PmDomain, PmEvidenceBundle } from './admin_pm_evidence';

export const PM_CORE_DOMAINS: readonly PmDomain[] = [
  'growth_activation',
  'learning_engagement',
  'revenue',
  'quality_support',
] as const;

export interface PmPublicationGateResult {
  mode: 'full' | 'coverage_only';
  missingDomains: PmDomain[];
  coreDomains: readonly PmDomain[];
}

export function evaluatePmPublicationGate(bundle: PmEvidenceBundle): PmPublicationGateResult {
  const missingDomains = PM_CORE_DOMAINS.filter((domain) => {
    const metrics = Object.values(bundle.metrics).filter((metric) => metric.domain === domain);
    if (!metrics.length) return true;
    return !metrics.some((metric) => {
      const sourceCoverage = bundle.coverage[metric.sourceId];
      return sourceCoverage?.current?.status === 'ok' && sourceCoverage?.previous?.status === 'ok';
    });
  });
  return {
    mode: missingDomains.length ? 'coverage_only' : 'full',
    missingDomains,
    coreDomains: PM_CORE_DOMAINS,
  };
}
