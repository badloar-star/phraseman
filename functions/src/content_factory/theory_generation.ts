export interface TheoryExemplarFragment { readonly fragmentId: string; readonly text: string }
export interface TheoryExemplar { readonly exemplarId: string; readonly ruleKey: string; readonly canonicalRule: string; readonly objectiveTags: readonly string[]; readonly fragments: readonly TheoryExemplarFragment[] }
export interface TheoryExemplarRegistry { readonly registryId: string; readonly version: string; readonly registryHash: string; readonly exemplars: readonly TheoryExemplar[] }

const TOKEN_RE = /^[A-Za-z0-9._-]{1,160}$/;
const HASH_RE = /^[a-f0-9]{64}$/i;
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
const RETRIEVAL_STOP = new Set(['and', 'are', 'for', 'from', 'the', 'this', 'that', 'use', 'with', 'you', 'could']);
function words(value: string): Set<string> { return new Set((value.normalize('NFKC').toLocaleLowerCase('en').match(/[a-z]{3,}/g) ?? []).filter((token) => !RETRIEVAL_STOP.has(token))); }

export function validateTheoryExemplarRegistry(value: unknown): string[] {
  if (!isRecord(value)) return ['theory_exemplar_registry_required'];
  const errors: string[] = [];
  if (!TOKEN_RE.test(String(value.registryId ?? '')) || !TOKEN_RE.test(String(value.version ?? '')) || !HASH_RE.test(String(value.registryHash ?? ''))) errors.push('theory_exemplar_registry_identity_invalid');
  if (!Array.isArray(value.exemplars) || value.exemplars.length < 2) errors.push('theory_exemplars_insufficient');
  else for (const exemplar of value.exemplars) {
    if (!isRecord(exemplar) || !TOKEN_RE.test(String(exemplar.exemplarId ?? '')) || !TOKEN_RE.test(String(exemplar.ruleKey ?? '')) || !String(exemplar.canonicalRule ?? '').trim() || !Array.isArray(exemplar.objectiveTags) || exemplar.objectiveTags.length === 0 || !Array.isArray(exemplar.fragments) || exemplar.fragments.length === 0 || exemplar.fragments.some((fragment) => !isRecord(fragment) || !TOKEN_RE.test(String(fragment.fragmentId ?? '')) || !String(fragment.text ?? '').trim())) errors.push('theory_exemplar_invalid');
  }
  return [...new Set(errors)];
}

export function retrieveTheoryExemplars(registry: TheoryExemplarRegistry, input: { readonly objective: string; readonly approvedTargetPhrases: readonly string[]; readonly requiredExemplarIds?: readonly string[] }) {
  const registryErrors = validateTheoryExemplarRegistry(registry);
  if (registryErrors.length) throw new Error(`theory_exemplar_registry_invalid:${registryErrors.join(',')}`);
  const query = words(`${input.objective} ${input.approvedTargetPhrases.join(' ')}`);
  const scored = registry.exemplars.map((exemplar) => ({ exemplar, score: [...words(`${exemplar.objectiveTags.join(' ')} ${exemplar.canonicalRule} ${exemplar.fragments.map((item) => item.text).join(' ')}`)].filter((token) => query.has(token)).length })).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || a.exemplar.exemplarId.localeCompare(b.exemplar.exemplarId)).slice(0, 4).map((item) => item.exemplar);
  const required = (input.requiredExemplarIds ?? []).map((id) => registry.exemplars.find((item) => item.exemplarId === id)).filter(Boolean) as TheoryExemplar[];
  if (required.length !== (input.requiredExemplarIds ?? []).length) throw new Error('theory_required_exemplar_missing');
  const ranked = scored.length >= 2 ? scored : registry.exemplars.slice(0, Math.min(2, registry.exemplars.length));
  const selected = [...required, ...ranked.filter((item) => !required.some((requiredItem) => requiredItem.exemplarId === item.exemplarId))].slice(0, 4);
  const rules = new Map<string, Set<string>>();
  for (const exemplar of selected) { const variants = rules.get(exemplar.ruleKey) ?? new Set<string>(); variants.add(exemplar.canonicalRule.normalize('NFKC').trim().toLocaleLowerCase('en')); rules.set(exemplar.ruleKey, variants); }
  const conflictingRuleKeys = [...rules.entries()].filter(([, variants]) => variants.size > 1).map(([ruleKey]) => ruleKey).sort();
  if (conflictingRuleKeys.length) return Object.freeze({ state: 'review_required' as const, reason: 'exemplar_conflict' as const, conflictingRuleKeys: Object.freeze(conflictingRuleKeys), exemplars: Object.freeze(selected) });
  return Object.freeze({ state: 'ready' as const, conflictingRuleKeys: Object.freeze([]), exemplars: Object.freeze(selected) });
}

export function validateTheoryArtifact(artifact: unknown, evidence: { readonly allowedPhraseIds: readonly string[]; readonly allowedExemplarFragmentIds: readonly string[] }): string[] {
  if (!isRecord(artifact) || artifact.stage !== 'lesson_theory' || !isRecord(artifact.result)) return ['theory_result_required'];
  const result = artifact.result;
  const errors: string[] = [];
  const sections = ['rules', 'examples', 'commonMistakes', 'miniCheck'] as const;
  const allowed = new Set([...evidence.allowedPhraseIds.map((id) => `phrase:${id}`), ...evidence.allowedExemplarFragmentIds.map((id) => `exemplar:${id}`)]);
  for (const section of sections) {
    const entries = result[section];
    if (!Array.isArray(entries) || entries.length === 0) { errors.push(`theory_${section}_required`); continue; }
    for (const entry of entries) {
      if (!isRecord(entry)) { errors.push(`theory_${section}_entry_invalid`); continue; }
      const requiredFields = section === 'rules' ? ['rule'] : section === 'examples' ? ['targetText', 'explanation'] : section === 'commonMistakes' ? ['wrong', 'correction'] : ['prompt', 'answer'];
      if (requiredFields.some((field) => typeof entry[field] !== 'string' || !String(entry[field]).trim())) errors.push(`theory_${section}_content_invalid`);
      if (!Array.isArray(entry.evidenceRefs) || entry.evidenceRefs.length === 0) errors.push('theory_evidence_reference_required');
      else if (entry.evidenceRefs.some((reference) => typeof reference !== 'string' || !allowed.has(reference))) errors.push('theory_evidence_reference_invalid');
    }
  }
  if (!Array.isArray(result.exemplarIds) || result.exemplarIds.length < 2 || result.exemplarIds.length > 4) errors.push('theory_exemplar_provenance_invalid');
  return [...new Set(errors)];
}
