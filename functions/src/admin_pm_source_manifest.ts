import { DIGEST_SOURCE_REGISTRY } from './admin_digest_sources';

export type PmManifestStatus = 'included' | 'excluded' | 'unmapped';

export interface PmAdminSectionManifestEntry {
  adminTab: string;
  status: PmManifestStatus;
  domain: string;
  owner: string;
  sourceIds: string[];
  reason?: string;
}

const INCLUDED_ADMIN_SECTIONS: Record<string, { domain: string; sourceIds: string[] }> = {
  'daily-digest': { domain: 'operations', sourceIds: ['admin_digest_runs'] },
  'product-manager': { domain: 'operations', sourceIds: ['admin_pm_briefs', 'admin_pm_decisions'] },
  'app-codex': { domain: 'operations', sourceIds: ['product_codex'] },
  overview: { domain: 'growth_activation', sourceIds: ['users'] },
  analytics: { domain: 'learning_engagement', sourceIds: ['progress_events'] },
  reports: { domain: 'quality_support', sourceIds: ['error_reports'] },
  'app-errors': { domain: 'quality_support', sourceIds: ['app_errors'] },
  'safety-flags': { domain: 'safety_community', sourceIds: ['safety_flags'] },
};

export function buildAdminSectionManifest(adminTabs: readonly string[]): PmAdminSectionManifestEntry[] {
  return [...new Set(adminTabs)].map((adminTab) => {
    const included = INCLUDED_ADMIN_SECTIONS[adminTab];
    return included
      ? { adminTab, status: 'included', domain: included.domain, owner: 'product', sourceIds: included.sourceIds }
      : { adminTab, status: 'unmapped', domain: 'unknown', owner: 'product', sourceIds: [], reason: 'Requires an explicit PM source mapping.' };
  });
}

export const PM_BACKEND_SOURCES = DIGEST_SOURCE_REGISTRY.map((source) => ({
  sourceId: source.id,
  status: source.included ? 'included' as const : 'excluded' as const,
  adapterId: source.included ? `digest:${source.id}` : undefined,
  metricIds: source.included ? [`${source.id}.events`] : [],
  reason: source.exclusionReason,
}));

export const PM_SOURCE_MANIFEST_VERSION = 1;
