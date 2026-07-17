import type { StageGenerationProvider } from './stage_runner';
import { buildShadowJudgePrompt, SHADOW_JUDGE_OUTPUT_SCHEMA, SHADOW_JUDGE_POLICY_VERSION, shadowJudgeHash, type ShadowJudgeInput } from './shadow_judge_prompt';

const DIMENSIONS = ['grammar', 'naturalness', 'semanticAlignment', 'answerUniqueness', 'cefr', 'locale', 'grounding'] as const;
type Dimension = (typeof DIMENSIONS)[number];
type DimensionResult = 'pass' | 'fail' | 'uncertain';
export const SHADOW_JUDGE_CONFIDENCE_THRESHOLD = 0.85;

function parseOutput(raw: string) {
  const value = JSON.parse(raw) as Record<string, unknown>; const recommendation = String(value.recommendation ?? ''); const confidence = Number(value.confidence);
  if (!['pass', 'human_review'].includes(recommendation) || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) throw new Error('shadow_judge_output_invalid');
  const dimensionsRaw = value.dimensions as Record<string, unknown> | undefined; const dimensions = {} as Record<Dimension, DimensionResult>;
  for (const key of DIMENSIONS) { const result = String(dimensionsRaw?.[key] ?? '') as DimensionResult; if (!['pass', 'fail', 'uncertain'].includes(result)) throw new Error('shadow_judge_dimensions_invalid'); dimensions[key] = result; }
  if (!Array.isArray(value.issues) || value.issues.length > 50) throw new Error('shadow_judge_issues_invalid');
  const issues = value.issues.map((rawIssue) => { const issue = rawIssue as Record<string, unknown>; const severity = String(issue.severity ?? ''); const code = String(issue.code ?? '').slice(0, 80); const path = String(issue.path ?? '').slice(0, 200); const message = String(issue.message ?? '').slice(0, 500); if (!code || !path || !message || !['warning', 'error'].includes(severity)) throw new Error('shadow_judge_issue_invalid'); return Object.freeze({ code, severity: severity as 'warning' | 'error', path, message }); });
  return Object.freeze({ recommendation: recommendation as 'pass' | 'human_review', confidence, dimensions: Object.freeze(dimensions), issues: Object.freeze(issues) });
}

export async function runShadowJudge(input: { readonly provider: StageGenerationProvider; readonly model: string; readonly evidence: ShadowJudgeInput }) {
  const prompt = buildShadowJudgePrompt(input.evidence); const base = { policyVersion: SHADOW_JUDGE_POLICY_VERSION, authority: 'advisory_only' as const, requiresHumanReview: true as const, model: input.model, inputHash: prompt.inputHash, schemaHash: prompt.schemaHash, contentHash: input.evidence.contentHash, groundingHash: input.evidence.groundingHash, privacy: Object.freeze({ dataClass: 'generated_content_only' as const, actorIdentifiersIncluded: false as const }) };
  try {
    const raw = await input.provider.generate({ model: input.model, prompt: `${prompt.system}\n${prompt.task}`, responseFormat: { type: 'json_schema', json_schema: { name: 'content_shadow_judge_v1', strict: false, schema: SHADOW_JUDGE_OUTPUT_SCHEMA } }, maxTokens: 4000, temperature: 0 });
    const result = parseOutput(raw); const disagreesWithQa = (input.evidence.qaStatus === 'passed') !== (result.recommendation === 'pass'); const lowConfidence = result.confidence < SHADOW_JUDGE_CONFIDENCE_THRESHOLD; const hasConcern = result.issues.length > 0 || Object.values(result.dimensions).some((value) => value !== 'pass');
    const status = !disagreesWithQa && !lowConfidence && !hasConcern && result.recommendation === 'pass' ? 'advisory_pass' as const : 'human_review_required' as const;
    return Object.freeze({ ...base, status, recommendation: result.recommendation, confidence: result.confidence, disagreesWithQa, lowConfidence, dimensions: result.dimensions, issues: result.issues, outputHash: shadowJudgeHash(result) });
  } catch (error) {
    return Object.freeze({ ...base, status: 'judge_error' as const, recommendation: 'human_review' as const, confidence: 0, disagreesWithQa: false, lowConfidence: true, dimensions: null, issues: Object.freeze([{ code: error instanceof SyntaxError ? 'judge_output_invalid' : 'judge_unavailable', severity: 'error' as const, path: '$', message: 'shadow_judge_failed' }]), outputHash: null });
  }
}

export function disabledShadowJudgeReceipt(contentHash: string, groundingHash: string | null = null) {
  return Object.freeze({ policyVersion: SHADOW_JUDGE_POLICY_VERSION, authority: 'advisory_only' as const, requiresHumanReview: true as const, status: 'disabled' as const, recommendation: 'human_review' as const, confidence: 0, contentHash, groundingHash, privacy: Object.freeze({ dataClass: 'generated_content_only' as const, actorIdentifiersIncluded: false as const }) });
}

export function shadowJudgeConfigErrorReceipt(contentHash: string, groundingHash: string | null, configError: string) {
  return Object.freeze({ policyVersion: SHADOW_JUDGE_POLICY_VERSION, authority: 'advisory_only' as const, requiresHumanReview: true as const, status: 'config_error' as const, recommendation: 'human_review' as const, confidence: 0, contentHash, groundingHash, configError, privacy: Object.freeze({ dataClass: 'generated_content_only' as const, actorIdentifiersIncluded: false as const }) });
}
