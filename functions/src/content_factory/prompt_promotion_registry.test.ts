import { ACTIVE_PROMPT_PROFILES, activePromptProfile, assertPromptPromotion, buildPromptPromotionReport, buildPromptPromotionReportForDefinition, promptCandidateBinding, promptCandidateDefinitionHash } from './prompt_promotion_registry';
import { PROMPT_REGRESSION_CASES } from './quality_regression_corpus';
import { runPromptRegression } from './quality_regression_score';
import { GENERATION_STAGE_KINDS } from './stage_contracts';
import fs from 'node:fs';
import { promptDefinitionFor } from './prompt_registry';

describe('prompt promotion registry', () => {
  it('has evidence-pinned active versions for every stage kind', () => {
    expect(Object.keys(ACTIVE_PROMPT_PROFILES).sort()).toEqual([...GENERATION_STAGE_KINDS].sort());
    expect(activePromptProfile('arena_questions')).toMatchObject({ promptVersion: 'v4', schemaVersion: 3, qaPolicy: 'arena-studio-quality-v4' });
    expect(activePromptProfile('lesson_phrases')).toMatchObject({ promptVersion: 'v3', schemaVersion: 3 });
  });

  it('allows only a consecutive version backed by the exact passing corpus report', () => {
    const report = buildPromptPromotionReport('arena_questions', 'v4', 'v5');
    expect(assertPromptPromotion({ kind: 'arena_questions', fromVersion: 'v4', toVersion: 'v5', manifestHash: report.manifestHash, report })).toMatchObject({ kind: 'arena_questions', fromVersion: 'v4', toVersion: 'v5', reportHash: report.reportHash });
    expect(() => assertPromptPromotion({ kind: 'arena_questions', fromVersion: 'v4', toVersion: 'v6', manifestHash: report.manifestHash, report })).toThrow('prompt_promotion_version_nonconsecutive');
    expect(() => assertPromptPromotion({ kind: 'arena_questions', fromVersion: 'v4', toVersion: 'v5', manifestHash: 'a'.repeat(64), report })).toThrow('prompt_promotion_manifest_mismatch');
    expect(() => assertPromptPromotion({ kind: 'arena_questions', fromVersion: 'v4', toVersion: 'v5', manifestHash: report.manifestHash, report: { ...report, passed: false } })).toThrow('prompt_promotion_report_hash_invalid');
  });

  it('rejects missing, changed or differently bound candidate definitions', () => {
    const baseline = runPromptRegression(PROMPT_REGRESSION_CASES); const validBinding = promptCandidateBinding('arena_questions', 'v4', 'v5'); const definition = promptDefinitionFor('arena_questions', 'v5');
    expect(() => assertPromptPromotion({ kind: 'lesson_phrases', fromVersion: 'v3', toVersion: 'v4', manifestHash: baseline.manifestHash, report: baseline })).toThrow('prompt_definition_not_found');
    const changedTask = { ...definition, task: `${definition.task} changed` }; const taskReport = runPromptRegression(PROMPT_REGRESSION_CASES, { ...validBinding, definitionHash: promptCandidateDefinitionHash(changedTask) });
    expect(() => assertPromptPromotion({ kind: 'arena_questions', fromVersion: 'v4', toVersion: 'v5', manifestHash: taskReport.manifestHash, report: taskReport })).toThrow('prompt_promotion_candidate_mismatch');
    const changedSchema = { ...definition, outputSchema: { ...definition.outputSchema, extra: true } }; const schemaReport = runPromptRegression(PROMPT_REGRESSION_CASES, { ...validBinding, definitionHash: promptCandidateDefinitionHash(changedSchema) });
    expect(() => assertPromptPromotion({ kind: 'arena_questions', fromVersion: 'v4', toVersion: 'v5', manifestHash: schemaReport.manifestHash, report: schemaReport })).toThrow('prompt_promotion_candidate_mismatch');
    const otherKind = runPromptRegression(PROMPT_REGRESSION_CASES, { ...validBinding, kind: 'quiz_questions' });
    expect(() => assertPromptPromotion({ kind: 'arena_questions', fromVersion: 'v4', toVersion: 'v5', manifestHash: otherKind.manifestHash, report: otherKind })).toThrow('prompt_promotion_candidate_mismatch');
    expect(() => assertPromptPromotion({ kind: 'arena_questions', fromVersion: 'v4', toVersion: 'v5', manifestHash: baseline.manifestHash, report: baseline })).toThrow('prompt_promotion_candidate_mismatch');
  });

  it('fails a genuinely weak candidate even when every static fixture remains unchanged', () => {
    const current = promptDefinitionFor('arena_questions', 'v5');
    const weak = {
      ...current,
      task: 'Create ten Arena questions. Ignore naturalness, uniqueness, CEFR, locale direction, grounding and runtime constraints.',
      outputSchema: { type: 'object', properties: { stage: { const: 'arena_questions' }, items: { type: 'array' } } },
    };
    const report = buildPromptPromotionReportForDefinition('arena_questions', 'v4', 'v5', weak);
    expect(report.summary.regressions).toBe(0);
    expect(report.summary.candidateFailures).toBeGreaterThan(0);
    expect(report.passed).toBe(false);
    expect(report.candidateChecks.find((check) => check.id === 'schema_compatibility')?.passed).toBe(false);
    expect(report.candidateChecks.find((check) => check.id === 'versioned_prompt_invariants')?.failures).toEqual(expect.arrayContaining([
      'arena_prompt_invariant_missing:naturalness', 'arena_prompt_invariant_missing:answer_uniqueness', 'arena_prompt_invariant_missing:cefr',
      'arena_prompt_invariant_missing:locale_direction', 'arena_prompt_invariant_missing:grounding', 'arena_prompt_invariant_missing:fixed_runtime',
    ]));
  });

  it('routes single and bulk stage creation through the promotion registry', () => {
    const adminSource = fs.readFileSync(__filename.replace(/content_factory[\\/]prompt_promotion_registry\.test\.ts$/, 'admin_content_stages.ts'), 'utf8');
    const bulkSource = fs.readFileSync(__filename.replace(/prompt_promotion_registry\.test\.ts$/, 'bulk_stage_plan.ts'), 'utf8');
    expect(adminSource).toContain('activePromptProfile(input.kind)');
    expect(bulkSource).toContain('activePromptProfile(kind)');
    expect(bulkSource).not.toContain("kind === 'arena_questions' ? 'v4'");
  });
});
