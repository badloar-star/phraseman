"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyGenerationError = classifyGenerationError;
exports.sanitizeGenerationErrorDetail = sanitizeGenerationErrorDetail;
exports.buildGenerationFailureRecord = buildGenerationFailureRecord;
const CLASSIFIERS = [
    { pattern: /source_registry_(?:not_found|required|missing)/i, code: 'source_missing', retryable: false },
    { pattern: /blueprint_lesson_not_found|source_coverage/i, code: 'source_coverage', retryable: false },
    { pattern: /provider_rate_limit|rate.?limit|too many requests/i, code: 'provider_rate_limit', retryable: true },
    { pattern: /generated_(?:surface|lesson)_invalid|provider_schema/i, code: 'provider_schema', retryable: false },
    { pattern: /qa_failed|quality.?gate/i, code: 'qa_failed', retryable: false },
    { pattern: /daily_budget_exceeded|budget_exhausted/i, code: 'budget_exhausted', retryable: false },
    { pattern: /artifact_.+_(?:unavailable|timeout)|storage_(?:failed|unavailable)/i, code: 'storage_failed', retryable: true },
    { pattern: /permission.?denied|unauthenticated/i, code: 'permission_denied', retryable: false },
    { pattern: /cancel(?:led|ed)/i, code: 'cancelled', retryable: false },
];
function errorText(error) {
    if (error instanceof Error)
        return `${error.name}: ${error.message}`;
    return String(error ?? '');
}
function classifyGenerationError(error) {
    const text = errorText(error);
    const match = CLASSIFIERS.find((entry) => entry.pattern.test(text));
    return match
        ? Object.freeze({ code: match.code, retryable: match.retryable })
        : Object.freeze({ code: 'unknown', retryable: false });
}
function sanitizeGenerationErrorDetail(value, maxLength = 300) {
    const safeLimit = Number.isSafeInteger(maxLength) ? Math.max(1, Math.min(1000, maxLength)) : 300;
    return String(value ?? '')
        .replace(/[\u0000-\u001F\u007F]/g, ' ')
        .replace(/\bOPENAI_API_KEY\s*=\s*[^\s]+/gi, 'OPENAI_API_KEY=[REDACTED]')
        .replace(/\bAuthorization\s*:\s*Bearer\s+[^\s]+/gi, 'Authorization: Bearer [REDACTED]')
        .trim()
        .slice(0, safeLimit);
}
function buildGenerationFailureRecord(error, attempt, occurredAt = new Date().toISOString()) {
    const classified = classifyGenerationError(error);
    return Object.freeze({
        attempt: Number.isSafeInteger(attempt) && attempt > 0 ? attempt : 1,
        code: classified.code,
        retryable: classified.retryable,
        message: sanitizeGenerationErrorDetail(errorText(error)),
        occurredAt,
    });
}
//# sourceMappingURL=generation_errors.js.map