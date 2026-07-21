"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAdjudicationReply = parseAdjudicationReply;
exports.adjudicateExplanation = adjudicateExplanation;
const explain_prompts_1 = require("./explain_prompts");
const explain_provider_1 = require("./explain_provider");
const LANGUAGE_MATCHES = new Set(['match', 'mismatch', 'uncertain']);
const QUALITY_VERDICTS = new Set(['ok', 'too_short', 'empty', 'toxic', 'off_topic', 'incoherent']);
function parseAdjudicationReply(raw) {
    const value = String(raw ?? '').trim();
    const start = value.indexOf('{');
    const end = value.lastIndexOf('}');
    const candidate = start >= 0 && end > start ? value.slice(start, end + 1) : value;
    try {
        const parsed = JSON.parse(candidate);
        const languageMatch = parsed.languageMatch;
        const qualityVerdict = parsed.qualityVerdict;
        if (!LANGUAGE_MATCHES.has(languageMatch) || !QUALITY_VERDICTS.has(qualityVerdict))
            return null;
        return { languageMatch, qualityVerdict };
    }
    catch {
        return null;
    }
}
async function adjudicateExplanation(params) {
    const result = await (0, explain_provider_1.openAiChat)({
        apiKey: params.apiKey,
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: explain_prompts_1.ADJUDICATOR_SYSTEM_PROMPT },
            { role: 'user', content: (0, explain_prompts_1.buildAdjudicatorUserPrompt)(params.text, params.lang, params.studyTarget ?? 'en', params.phraseEn) },
        ],
        maxTokens: 40,
        temperature: 0,
        responseFormat: { type: 'json_object' },
        beforeRequest: params.beforeRequest,
        deadlineAtMs: params.deadlineAtMs,
    });
    const parsed = parseAdjudicationReply(result.text);
    if (!parsed) {
        return {
            usable: false,
            languageMatch: 'uncertain',
            qualityVerdict: 'incoherent',
            promptTokens: result.promptTokens,
            completionTokens: result.completionTokens,
        };
    }
    return { usable: true, ...parsed, promptTokens: result.promptTokens, completionTokens: result.completionTokens };
}
//# sourceMappingURL=explain_adjudicator.js.map