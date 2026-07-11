export const PM_SCHEMA_VERSION = 1;
export const PM_LIMITS = {
  articleMinWords: 1200,
  articleMaxWords: 2000,
  recommendationsMin: 3,
  recommendationsMax: 5,
  experimentsMin: 1,
  experimentsMax: 3,
  documentBytes: 700 * 1024,
} as const;

export interface PmClaim {
  id: string;
  text: string;
  evidenceIds: string[];
  codexEntityIds: string[];
  confidence: number;
}

export interface PmRecommendation {
  id: string;
  fingerprint: string;
  title: string;
  evidenceIds: string[];
  codexEntityIds: string[];
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
}

export interface PmIdea extends PmRecommendation {}

export interface PmExperiment {
  id: string;
  hypothesis: string;
  evidenceIds: string[];
  codexEntityIds: string[];
  primaryMetricId: string;
}

interface PmBriefBase {
  schemaVersion: 1;
  executiveSummary: string;
  article: string;
  observations: PmClaim[];
  risks: PmClaim[];
  questionsForOwner: string[];
  blindSpots: string[];
}

export interface FullPmBrief extends PmBriefBase {
  mode: 'full';
  hypotheses: PmClaim[];
  recommendations: PmRecommendation[];
  ideas: PmIdea[];
  experiments: PmExperiment[];
}

export interface CoverageOnlyPmBrief extends PmBriefBase {
  mode: 'coverage_only';
  hypotheses: [];
  recommendations: [];
  ideas: [];
  experiments: [];
}

export type PmBrief = FullPmBrief | CoverageOnlyPmBrief;
export type PmRecommendationStatus = 'proposed' | 'accepted' | 'deferred' | 'rejected' | 'completed' | 'validated';
export interface PmDecision { itemId: string; from: string; to: string; comment: string; decidedAtMs: number }
export interface PmRun { runId: string; idempotencyKey: string; status: 'running' | 'succeeded' | 'failed'; briefId?: string }
export interface PmEvidence { evidenceId: string; metricId: string; value: number; codexEntityIds: string[] }

export type ValidationResult = { ok: true } | { ok: false; errors: string[] };

export function serializedBytes(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), 'utf8');
}

function wordCount(value: unknown): number {
  return typeof value === 'string' ? value.trim().split(/\s+/).filter(Boolean).length : 0;
}

function validateClaim(value: unknown, evidenceIds: ReadonlySet<string>, codexIds: ReadonlySet<string>, errors: string[]): void {
  if (!value || typeof value !== 'object') { errors.push('claim_not_object'); return; }
  const claim = value as Partial<PmClaim>;
  if (!Number.isFinite(claim.confidence) || Number(claim.confidence) < 0 || Number(claim.confidence) > 1) errors.push('confidence_out_of_range');
  if (!Array.isArray(claim.evidenceIds) || claim.evidenceIds.some((id) => !evidenceIds.has(id))) errors.push('unknown_evidence_id');
  if (!Array.isArray(claim.codexEntityIds) || claim.codexEntityIds.some((id) => !codexIds.has(id))) errors.push('unknown_codex_id');
}

export function validatePmBrief(value: unknown, evidenceIds: ReadonlySet<string>, codexIds: ReadonlySet<string>): ValidationResult {
  const errors: string[] = [];
  if (!value || typeof value !== 'object') return { ok: false, errors: ['brief_not_object'] };
  const brief = value as Partial<PmBrief> & Record<string, unknown>;
  if (brief.schemaVersion !== PM_SCHEMA_VERSION) errors.push('schema_version');
  if (serializedBytes(value) > PM_LIMITS.documentBytes) errors.push('document_too_large');
  for (const claim of [...(Array.isArray(brief.observations) ? brief.observations : []), ...(Array.isArray(brief.risks) ? brief.risks : [])]) validateClaim(claim, evidenceIds, codexIds, errors);

  if (brief.mode === 'full') {
    const articleWords = wordCount(brief.article);
    if (articleWords < PM_LIMITS.articleMinWords || articleWords > PM_LIMITS.articleMaxWords) errors.push('article_word_count');
    if (!Array.isArray(brief.recommendations) || brief.recommendations.length < PM_LIMITS.recommendationsMin || brief.recommendations.length > PM_LIMITS.recommendationsMax) errors.push('recommendation_count');
    if (!Array.isArray(brief.experiments) || brief.experiments.length < PM_LIMITS.experimentsMin || brief.experiments.length > PM_LIMITS.experimentsMax) errors.push('experiment_count');
    for (const claim of [...(Array.isArray(brief.hypotheses) ? brief.hypotheses : []), ...(Array.isArray(brief.recommendations) ? brief.recommendations : []), ...(Array.isArray(brief.ideas) ? brief.ideas : [])]) validateClaim(claim, evidenceIds, codexIds, errors);
    for (const experiment of Array.isArray(brief.experiments) ? brief.experiments : []) {
      if (!experiment.evidenceIds?.every((id) => evidenceIds.has(id))) errors.push('unknown_evidence_id');
      if (!experiment.codexEntityIds?.every((id) => codexIds.has(id))) errors.push('unknown_codex_id');
    }
  } else if (brief.mode === 'coverage_only') {
    if ((brief.hypotheses as unknown[])?.length || (brief.recommendations as unknown[])?.length || (brief.ideas as unknown[])?.length || (brief.experiments as unknown[])?.length) errors.push('coverage_only_content');
  } else {
    errors.push('invalid_mode');
  }
  return errors.length ? { ok: false, errors: [...new Set(errors)] } : { ok: true };
}
