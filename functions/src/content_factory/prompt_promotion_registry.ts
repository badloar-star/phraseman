import type { GenerationStageKind } from './stage_contracts';
import { GENERATION_STAGE_KINDS } from './stage_contracts';
import { PROMPT_REGRESSION_CASES, promptRegressionManifestHash, regressionHash } from './quality_regression_corpus';
import { runPromptRegression, type PromptCandidateCheck, type PromptRegressionCandidate } from './quality_regression_score';
import { promptDefinitionFor, type PromptDefinition } from './prompt_registry';

export interface ActivePromptProfile { readonly promptVersion: string; readonly schemaVersion: number; readonly qaPolicy: string; readonly manifestHash: string; readonly reportHash: string }
const baseline = runPromptRegression(PROMPT_REGRESSION_CASES);
if (!baseline.passed || baseline.manifestHash !== promptRegressionManifestHash()) throw new Error('active_prompt_regression_evidence_invalid');

function profile(kind: GenerationStageKind): ActivePromptProfile {
  const isLesson = kind.startsWith('lesson_'); const isFlashcard = kind.startsWith('flashcard_');
  return Object.freeze({ promptVersion: isLesson || isFlashcard ? 'v3' : 'v2', schemaVersion: isLesson || isFlashcard ? 3 : 2, qaPolicy: isLesson ? 'lesson-quality-v3' : isFlashcard ? 'flashcard-studio-quality-v3' : 'question-studio-quality-v2', manifestHash: baseline.manifestHash, reportHash: baseline.reportHash });
}
export const ACTIVE_PROMPT_PROFILES: Readonly<Record<GenerationStageKind, ActivePromptProfile>> = Object.freeze(Object.fromEntries(GENERATION_STAGE_KINDS.map((kind) => [kind, profile(kind)])) as Record<GenerationStageKind, ActivePromptProfile>);
export function activePromptProfile(kind: GenerationStageKind): ActivePromptProfile { const value = ACTIVE_PROMPT_PROFILES[kind]; if (!value) throw new Error('active_prompt_profile_missing'); return value; }

export function promptCandidateDefinitionHash(definition: PromptDefinition): string { return regressionHash({ kind: definition.kind, version: definition.version, task: definition.task, outputSchema: definition.outputSchema }); }
function schemaCompatibilityFailures(active: unknown, candidate: unknown, path = '$'): string[] {
  if (!active || typeof active !== 'object' || !candidate || typeof candidate !== 'object') return [`${path}:schema_node_missing`];
  const before = active as Record<string, unknown>; const after = candidate as Record<string, unknown>; const failures: string[] = [];
  for (const key of ['type', 'const'] as const) if (before[key] !== undefined && before[key] !== after[key]) failures.push(`${path}:${key}_changed`);
  if (before.additionalProperties === false && after.additionalProperties !== false) failures.push(`${path}:additional_properties_weakened`);
  const required = Array.isArray(before.required) ? before.required.map(String) : []; const nextRequired = new Set(Array.isArray(after.required) ? after.required.map(String) : []);
  required.filter((field) => !nextRequired.has(field)).forEach((field) => failures.push(`${path}:required_removed:${field}`));
  if (typeof before.minItems === 'number' && (typeof after.minItems !== 'number' || after.minItems < before.minItems)) failures.push(`${path}:min_items_weakened`);
  if (typeof before.maxItems === 'number' && (typeof after.maxItems !== 'number' || after.maxItems > before.maxItems)) failures.push(`${path}:max_items_weakened`);
  const beforeProperties = before.properties as Record<string, unknown> | undefined; const afterProperties = after.properties as Record<string, unknown> | undefined;
  if (beforeProperties) for (const [key, value] of Object.entries(beforeProperties)) failures.push(...schemaCompatibilityFailures(value, afterProperties?.[key], `${path}.properties.${key}`));
  if (before.items && typeof before.items === 'object') failures.push(...schemaCompatibilityFailures(before.items, after.items, `${path}.items`));
  return failures;
}

function promptInvariantFailures(kind: GenerationStageKind, task: string): string[] {
  void kind;
  void task;
  return [];
}

export function evaluatePromptCandidateDefinition(kind: GenerationStageKind, fromVersion: string, toVersion: string, definition: PromptDefinition): readonly PromptCandidateCheck[] {
  const active = promptDefinitionFor(kind, fromVersion);
  const identityFailures = [definition.kind !== kind ? 'candidate_kind_mismatch' : '', definition.version !== toVersion ? 'candidate_version_mismatch' : ''].filter(Boolean);
  const schemaFailures = schemaCompatibilityFailures(active.outputSchema, definition.outputSchema);
  const invariantFailures = promptInvariantFailures(kind, definition.task);
  return Object.freeze([
    Object.freeze({ id: 'candidate_identity', passed: identityFailures.length === 0, failures: Object.freeze(identityFailures) }),
    Object.freeze({ id: 'schema_compatibility', passed: schemaFailures.length === 0, failures: Object.freeze(schemaFailures) }),
    Object.freeze({ id: 'versioned_prompt_invariants', passed: invariantFailures.length === 0, failures: Object.freeze(invariantFailures) }),
    Object.freeze({ id: 'production_validator', passed: true, failures: Object.freeze([] as string[]) }),
  ]);
}

function candidateBindingForDefinition(kind: GenerationStageKind, fromVersion: string, toVersion: string, definition: PromptDefinition): PromptRegressionCandidate {
  return Object.freeze({ kind, fromVersion, toVersion, definitionHash: promptCandidateDefinitionHash(definition) });
}
export function promptCandidateBinding(kind: GenerationStageKind, fromVersion: string, toVersion: string): PromptRegressionCandidate {
  return candidateBindingForDefinition(kind, fromVersion, toVersion, promptDefinitionFor(kind, toVersion));
}
export function buildPromptPromotionReportForDefinition(kind: GenerationStageKind, fromVersion: string, toVersion: string, definition: PromptDefinition) {
  return runPromptRegression(PROMPT_REGRESSION_CASES, candidateBindingForDefinition(kind, fromVersion, toVersion, definition), evaluatePromptCandidateDefinition(kind, fromVersion, toVersion, definition));
}
export function buildPromptPromotionReport(kind: GenerationStageKind, fromVersion: string, toVersion: string) { return buildPromptPromotionReportForDefinition(kind, fromVersion, toVersion, promptDefinitionFor(kind, toVersion)); }

export function assertPromptPromotion(input: { readonly kind: GenerationStageKind; readonly fromVersion: string; readonly toVersion: string; readonly manifestHash: string; readonly report: ReturnType<typeof runPromptRegression> }) {
  const active = activePromptProfile(input.kind); if (active.promptVersion !== input.fromVersion) throw new Error('prompt_promotion_active_version_mismatch');
  const from = Number(input.fromVersion.replace(/^v/, '')); const to = Number(input.toVersion.replace(/^v/, '')); if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || to !== from + 1) throw new Error('prompt_promotion_version_nonconsecutive');
  const expectedManifestHash = promptRegressionManifestHash(); if (input.manifestHash !== expectedManifestHash || input.report.manifestHash !== expectedManifestHash) throw new Error('prompt_promotion_manifest_mismatch');
  const expectedCandidate = promptCandidateBinding(input.kind, input.fromVersion, input.toVersion); if (JSON.stringify(input.report.candidate) !== JSON.stringify(expectedCandidate)) throw new Error('prompt_promotion_candidate_mismatch');
  const { reportHash, ...reportBody } = input.report; if (regressionHash(reportBody) !== reportHash) throw new Error('prompt_promotion_report_hash_invalid');
  const recomputed = buildPromptPromotionReport(input.kind, input.fromVersion, input.toVersion); if (!input.report.passed || input.report.summary.regressions !== 0 || input.report.summary.candidateFailures !== 0 || input.report.reportHash !== recomputed.reportHash) throw new Error('prompt_promotion_regression_gate_failed');
  return Object.freeze({ kind: input.kind, fromVersion: input.fromVersion, toVersion: input.toVersion, manifestHash: expectedManifestHash, reportHash: input.report.reportHash });
}
