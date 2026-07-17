import { disabledShadowJudgeReceipt, runShadowJudge } from './shadow_judge';
import type { StageGenerationProvider } from './stage_runner';

const evidence = { kind: 'arena_questions' as const, studyTarget: 'en', sourceLocale: 'ru', cefr: 'A2', artifact: { stage: 'arena_questions', items: [{ question: 'Where is it?', options: ['Here', 'There', 'Later', 'Never'] }] }, contentHash: 'a'.repeat(64), groundingHash: 'b'.repeat(64), qaStatus: 'passed', qaErrors: [] };
const output = (patch: Record<string, unknown> = {}) => JSON.stringify({ recommendation: 'pass', confidence: 0.96, dimensions: { grammar: 'pass', naturalness: 'pass', semanticAlignment: 'pass', answerUniqueness: 'pass', cefr: 'pass', locale: 'pass', grounding: 'pass' }, issues: [], ...patch });

describe('shadow content judge', () => {
  it('is advisory-only even for a high-confidence agreement', async () => {
    const provider: StageGenerationProvider = { generate: async () => output() }; const receipt = await runShadowJudge({ provider, model: 'fake-reviewer', evidence });
    expect(receipt).toMatchObject({ status: 'advisory_pass', authority: 'advisory_only', requiresHumanReview: true, confidence: 0.96, disagreesWithQa: false, privacy: { actorIdentifiersIncluded: false } });
    expect(receipt.inputHash).toMatch(/^[a-f0-9]{64}$/); expect(receipt.outputHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it.each([
    ['low confidence', { confidence: 0.6 }, 'human_review_required'],
    ['disagreement', { recommendation: 'human_review' }, 'human_review_required'],
    ['quality issue', { dimensions: { grammar: 'fail', naturalness: 'pass', semanticAlignment: 'pass', answerUniqueness: 'pass', cefr: 'pass', locale: 'pass', grounding: 'pass' }, issues: [{ code: 'grammar', severity: 'error', path: '$.items[0]', message: 'Broken grammar' }] }, 'human_review_required'],
  ])('routes %s to a human', async (_name, patch, status) => { const receipt = await runShadowJudge({ provider: { generate: async () => output(patch) }, model: 'fake-reviewer', evidence }); expect(receipt.status).toBe(status); expect(receipt.requiresHumanReview).toBe(true); });

  it('fails safely on provider or schema errors', async () => { const receipt = await runShadowJudge({ provider: { generate: async () => '{bad' }, model: 'fake-reviewer', evidence }); expect(receipt).toMatchObject({ status: 'judge_error', recommendation: 'human_review', requiresHumanReview: true, lowConfidence: true }); });
  it('is disabled by default without implying approval', () => { expect(disabledShadowJudgeReceipt('a'.repeat(64))).toMatchObject({ status: 'disabled', authority: 'advisory_only', requiresHumanReview: true }); });
});
