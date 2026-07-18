import fs from 'node:fs';
import {
  ACTIVE_PROMPT_PROFILES,
  activePromptProfile,
  buildPromptPromotionReportForDefinition,
} from './prompt_promotion_registry';
import { promptDefinitionFor } from './prompt_registry';
import { GENERATION_STAGE_KINDS } from './stage_contracts';

describe('prompt promotion registry', () => {
  it('has evidence-pinned active versions for every supported stage kind', () => {
    expect(Object.keys(ACTIVE_PROMPT_PROFILES).sort()).toEqual([...GENERATION_STAGE_KINDS].sort());
    expect(activePromptProfile('challenge_questions')).toMatchObject({
      promptVersion: 'v2',
      schemaVersion: 2,
      qaPolicy: 'question-studio-quality-v2',
    });
    expect(activePromptProfile('lesson_phrases')).toMatchObject({ promptVersion: 'v3', schemaVersion: 3 });
  });

  it('rejects a candidate that weakens the active challenge schema', () => {
    const current = promptDefinitionFor('challenge_questions', 'v2');
    const weak = {
      ...current,
      version: 'v3',
      outputSchema: { type: 'object', properties: { stage: { const: 'challenge_questions' }, items: { type: 'array' } } },
    };
    const report = buildPromptPromotionReportForDefinition('challenge_questions', 'v2', 'v3', weak);
    expect(report.summary.regressions).toBe(0);
    expect(report.summary.candidateFailures).toBeGreaterThan(0);
    expect(report.passed).toBe(false);
    expect(report.candidateChecks.find((check) => check.id === 'schema_compatibility')?.passed).toBe(false);
  });

  it('routes single and bulk stage creation through the promotion registry', () => {
    const adminSource = fs.readFileSync(__filename.replace(/content_factory[\\/]prompt_promotion_registry\.test\.ts$/, 'admin_content_stages.ts'), 'utf8');
    const bulkSource = fs.readFileSync(__filename.replace(/prompt_promotion_registry\.test\.ts$/, 'bulk_stage_plan.ts'), 'utf8');
    expect(adminSource).toContain('activePromptProfile(input.kind)');
    expect(bulkSource).toContain('activePromptProfile(kind)');
  });
});
