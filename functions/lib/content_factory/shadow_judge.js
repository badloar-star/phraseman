"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SHADOW_JUDGE_CONFIDENCE_THRESHOLD = void 0;
exports.runShadowJudge = runShadowJudge;
exports.disabledShadowJudgeReceipt = disabledShadowJudgeReceipt;
exports.shadowJudgeConfigErrorReceipt = shadowJudgeConfigErrorReceipt;
const shadow_judge_prompt_1 = require("./shadow_judge_prompt");
const DIMENSIONS = ['grammar', 'naturalness', 'semanticAlignment', 'answerUniqueness', 'cefr', 'locale', 'grounding'];
exports.SHADOW_JUDGE_CONFIDENCE_THRESHOLD = 0.85;
function parseOutput(raw) {
    const value = JSON.parse(raw);
    const recommendation = String(value.recommendation ?? '');
    const confidence = Number(value.confidence);
    if (!['pass', 'human_review'].includes(recommendation) || !Number.isFinite(confidence) || confidence < 0 || confidence > 1)
        throw new Error('shadow_judge_output_invalid');
    const dimensionsRaw = value.dimensions;
    const dimensions = {};
    for (const key of DIMENSIONS) {
        const result = String(dimensionsRaw?.[key] ?? '');
        if (!['pass', 'fail', 'uncertain'].includes(result))
            throw new Error('shadow_judge_dimensions_invalid');
        dimensions[key] = result;
    }
    if (!Array.isArray(value.issues) || value.issues.length > 50)
        throw new Error('shadow_judge_issues_invalid');
    const issues = value.issues.map((rawIssue) => { const issue = rawIssue; const severity = String(issue.severity ?? ''); const code = String(issue.code ?? '').slice(0, 80); const path = String(issue.path ?? '').slice(0, 200); const message = String(issue.message ?? '').slice(0, 500); if (!code || !path || !message || !['warning', 'error'].includes(severity))
        throw new Error('shadow_judge_issue_invalid'); return Object.freeze({ code, severity: severity, path, message }); });
    return Object.freeze({ recommendation: recommendation, confidence, dimensions: Object.freeze(dimensions), issues: Object.freeze(issues) });
}
async function runShadowJudge(input) {
    const prompt = (0, shadow_judge_prompt_1.buildShadowJudgePrompt)(input.evidence);
    const base = { policyVersion: shadow_judge_prompt_1.SHADOW_JUDGE_POLICY_VERSION, authority: 'advisory_only', requiresHumanReview: true, model: input.model, inputHash: prompt.inputHash, schemaHash: prompt.schemaHash, contentHash: input.evidence.contentHash, groundingHash: input.evidence.groundingHash, privacy: Object.freeze({ dataClass: 'generated_content_only', actorIdentifiersIncluded: false }) };
    try {
        const raw = await input.provider.generate({ model: input.model, prompt: `${prompt.system}\n${prompt.task}`, responseFormat: { type: 'json_schema', json_schema: { name: 'content_shadow_judge_v1', strict: false, schema: shadow_judge_prompt_1.SHADOW_JUDGE_OUTPUT_SCHEMA } }, maxTokens: 4000, temperature: 0 });
        const result = parseOutput(raw);
        const disagreesWithQa = (input.evidence.qaStatus === 'passed') !== (result.recommendation === 'pass');
        const lowConfidence = result.confidence < exports.SHADOW_JUDGE_CONFIDENCE_THRESHOLD;
        const hasConcern = result.issues.length > 0 || Object.values(result.dimensions).some((value) => value !== 'pass');
        const status = !disagreesWithQa && !lowConfidence && !hasConcern && result.recommendation === 'pass' ? 'advisory_pass' : 'human_review_required';
        return Object.freeze({ ...base, status, recommendation: result.recommendation, confidence: result.confidence, disagreesWithQa, lowConfidence, dimensions: result.dimensions, issues: result.issues, outputHash: (0, shadow_judge_prompt_1.shadowJudgeHash)(result) });
    }
    catch (error) {
        return Object.freeze({ ...base, status: 'judge_error', recommendation: 'human_review', confidence: 0, disagreesWithQa: false, lowConfidence: true, dimensions: null, issues: Object.freeze([{ code: error instanceof SyntaxError ? 'judge_output_invalid' : 'judge_unavailable', severity: 'error', path: '$', message: 'shadow_judge_failed' }]), outputHash: null });
    }
}
function disabledShadowJudgeReceipt(contentHash, groundingHash = null) {
    return Object.freeze({ policyVersion: shadow_judge_prompt_1.SHADOW_JUDGE_POLICY_VERSION, authority: 'advisory_only', requiresHumanReview: true, status: 'disabled', recommendation: 'human_review', confidence: 0, contentHash, groundingHash, privacy: Object.freeze({ dataClass: 'generated_content_only', actorIdentifiersIncluded: false }) });
}
function shadowJudgeConfigErrorReceipt(contentHash, groundingHash, configError) {
    return Object.freeze({ policyVersion: shadow_judge_prompt_1.SHADOW_JUDGE_POLICY_VERSION, authority: 'advisory_only', requiresHumanReview: true, status: 'config_error', recommendation: 'human_review', confidence: 0, contentHash, groundingHash, configError, privacy: Object.freeze({ dataClass: 'generated_content_only', actorIdentifiersIncluded: false }) });
}
//# sourceMappingURL=shadow_judge.js.map