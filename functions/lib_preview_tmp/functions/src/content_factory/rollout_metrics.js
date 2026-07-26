"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregateContentFactoryRolloutMetrics = aggregateContentFactoryRolloutMetrics;
exports.normalizeRolloutFailureCategory = normalizeRolloutFailureCategory;
exports.deriveContentFactoryRolloutMetricsFromDocuments = deriveContentFactoryRolloutMetricsFromDocuments;
function finiteNonNegative(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
function round(value, digits = 4) {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}
function percentile(sorted, percentileValue) {
    if (sorted.length === 0)
        return 0;
    return sorted[Math.max(0, Math.ceil(percentileValue * sorted.length) - 1)];
}
function aggregateContentFactoryRolloutMetrics(input) {
    if (!Number.isSafeInteger(input.window.fromMs) || !Number.isSafeInteger(input.window.toMs) || input.window.fromMs < 0 || input.window.toMs <= input.window.fromMs)
        throw new Error('rollout_metrics_window_invalid');
    if (!Array.isArray(input.attempts) || input.attempts.length > 5000)
        throw new Error('rollout_metrics_input_too_large');
    if (!finiteNonNegative(input.budgetCapUnits))
        throw new Error('rollout_metrics_budget_invalid');
    const failuresByCategory = {};
    const accepted = new Map();
    const latencies = [];
    const qaScores = [];
    let qaPassed = 0;
    let qaFailed = 0;
    let qaUnscored = 0;
    let reservedUnits = 0;
    let consumedUnits = 0;
    input.attempts.forEach((attempt, index) => {
        const numeric = [attempt.latencyMs ?? 0, attempt.reservedBudgetUnits ?? 0, attempt.consumedBudgetUnits ?? 0];
        if (numeric.some((value) => !finiteNonNegative(value)) || (attempt.qaScore != null && (!finiteNonNegative(attempt.qaScore) || attempt.qaScore > 1)))
            throw new Error('rollout_metrics_attempt_invalid');
        const artifactId = String(attempt.artifactId ?? '').trim();
        if (attempt.accepted && !artifactId)
            throw new Error('rollout_metrics_attempt_invalid');
        if (attempt.failureCode) {
            const code = String(attempt.failureCode).trim();
            if (!/^[a-z0-9_]{1,80}$/.test(code))
                throw new Error('rollout_metrics_attempt_invalid');
            failuresByCategory[code] = (failuresByCategory[code] ?? 0) + 1;
        }
        if (attempt.accepted)
            accepted.set(artifactId, { corrected: attempt.operatorCorrected === true || accepted.get(artifactId)?.corrected === true, collected: typeof attempt.operatorCorrected === 'boolean' || accepted.get(artifactId)?.collected === true });
        if (attempt.qaStatus === 'passed')
            qaPassed += 1;
        else if (attempt.qaStatus === 'failed')
            qaFailed += 1;
        else
            qaUnscored += 1;
        if (attempt.qaScore != null)
            qaScores.push(attempt.qaScore);
        latencies.push(attempt.latencyMs ?? 0);
        reservedUnits += attempt.reservedBudgetUnits ?? 0;
        consumedUnits += attempt.consumedBudgetUnits ?? 0;
        if (!Number.isSafeInteger(index))
            throw new Error('rollout_metrics_attempt_invalid');
    });
    latencies.sort((left, right) => left - right);
    const correctedAccepted = [...accepted.values()].filter((value) => value.corrected).length;
    const collectedAccepted = [...accepted.values()].filter((value) => value.collected).length;
    return Object.freeze({
        window: Object.freeze({ ...input.window }),
        attemptCount: input.attempts.length,
        acceptedArtifactCount: accepted.size,
        attemptsPerAcceptedArtifact: accepted.size ? round(input.attempts.length / accepted.size) : 0,
        failuresByCategory: Object.freeze({ ...failuresByCategory }),
        qa: Object.freeze({ passed: qaPassed, failed: qaFailed, unscored: qaUnscored, averageScore: qaScores.length ? round(qaScores.reduce((sum, value) => sum + value, 0) / qaScores.length) : 0 }),
        operatorCorrectionRate: accepted.size ? round(correctedAccepted / accepted.size) : 0,
        operatorCorrection: Object.freeze({ status: collectedAccepted ? 'available' : 'unavailable_not_collected', collectedAcceptedArtifacts: collectedAccepted, correctedAcceptedArtifacts: correctedAccepted }),
        latencyMs: Object.freeze({ p50: percentile(latencies, 0.5), p95: percentile(latencies, 0.95) }),
        budgetProxy: Object.freeze({ reservedUnits, consumedUnits, capUnits: input.budgetCapUnits, utilization: input.budgetCapUnits ? round(reservedUnits / input.budgetCapUnits) : 0, unit: 'generation_reservations', label: 'budget_proxy_not_billed_cost' }),
    });
}
function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : undefined;
}
function normalizeRolloutFailureCategory(value) {
    const code = String(value ?? '').trim().toLowerCase();
    if (!code)
        return '';
    if (['resource_exhausted', 'rate_limited', 'provider_rate_limit', '429'].some((token) => code.includes(token)))
        return 'provider_rate_limit';
    if (code.includes('schema') || code.includes('json') || code.includes('validation'))
        return 'schema_validation';
    if (code.includes('timeout') || code.includes('deadline'))
        return 'timeout';
    if (code.includes('permission') || code.includes('unauth'))
        return 'authorization';
    if (code.includes('cancel'))
        return 'cancelled';
    return 'provider_or_internal';
}
function deriveContentFactoryRolloutMetricsFromDocuments(input) {
    if (input.stageDocs.length > 100 || input.unitDocs.length > 100 || input.jobDocs.length > 100)
        throw new Error('rollout_metrics_document_limit_exceeded');
    if (!Number.isSafeInteger(input.nowMs) || input.nowMs < 1)
        throw new Error('rollout_metrics_window_invalid');
    const timestampMs = (value) => {
        if (Number.isSafeInteger(value) && Number(value) >= 0)
            return Number(value);
        if (value && typeof value === 'object' && typeof value.toMillis === 'function') {
            const result = Number(value.toMillis());
            return Number.isSafeInteger(result) && result >= 0 ? result : 0;
        }
        return 0;
    };
    const attemptsFrom = (documents) => {
        const attempts = [];
        for (const document of documents) {
            const history = Array.isArray(document.attemptHistory) ? document.attemptHistory : [];
            const totalAttempts = Math.max(1, Number.isSafeInteger(document.attempts) ? Number(document.attempts) : history.length || 1);
            const startedAtMs = timestampMs(document.startedAtMs ?? document.startedAt);
            const completedAtMs = timestampMs(document.completedAtMs ?? document.completedAt ?? document.failedAt ?? document.generatedAt);
            for (let index = 0; index < Math.max(0, totalAttempts - 1); index += 1) {
                const previous = record(history[index]);
                attempts.push({ failureCode: normalizeRolloutFailureCategory(previous?.errorCode ?? previous?.failureCode ?? previous?.code ?? 'provider_or_internal'), qaStatus: null, latencyMs: 0 });
            }
            const qa = record(document.qaReceipt);
            const accepted = document.state === 'approved' || document.state === 'succeeded';
            attempts.push({
                artifactId: accepted ? String(document.artifactId ?? document.contentHash ?? document.unitId ?? document.id ?? '').trim() : undefined,
                accepted,
                failureCode: accepted ? null : normalizeRolloutFailureCategory(document.errorCode ?? document.failureCode),
                qaStatus: qa?.status === 'passed' || qa?.status === 'failed' ? qa.status : null,
                qaScore: typeof qa?.score === 'number' ? qa.score : null,
                operatorCorrected: typeof document.operatorCorrected === 'boolean' ? document.operatorCorrected : undefined,
                latencyMs: startedAtMs > 0 && completedAtMs >= startedAtMs ? completedAtMs - startedAtMs : 0,
                reservedBudgetUnits: 0,
                consumedBudgetUnits: 0,
            });
        }
        return attempts;
    };
    const stagedAttempts = attemptsFrom(input.stageDocs);
    const legacyAttempts = attemptsFrom(input.unitDocs);
    const attempts = [...stagedAttempts, ...legacyAttempts];
    let earliestMs = input.nowMs - 1;
    for (const document of [...input.stageDocs, ...input.unitDocs]) {
        const started = timestampMs(document.startedAtMs ?? document.startedAt);
        if (started > 0)
            earliestMs = Math.min(earliestMs, started);
    }
    const window = { fromMs: Math.max(0, earliestMs), toMs: input.nowMs };
    const metrics = aggregateContentFactoryRolloutMetrics({ window: { fromMs: Math.max(0, earliestMs), toMs: input.nowMs }, attempts, budgetCapUnits: input.budgetCapUnits });
    const staged = aggregateContentFactoryRolloutMetrics({ window, attempts: stagedAttempts, budgetCapUnits: 0 });
    const legacy = aggregateContentFactoryRolloutMetrics({ window, attempts: legacyAttempts, budgetCapUnits: 0 });
    const reservedUnits = finiteNonNegative(input.budgetReservedUnits) ? input.budgetReservedUnits : metrics.budgetProxy.reservedUnits;
    const truncation = input.truncation ?? { stages: false, units: false, jobs: false };
    const isPartial = truncation.stages || truncation.units || truncation.jobs;
    const sample = (returned, truncated) => Object.freeze({ returned, limit: 100, truncated });
    return Object.freeze({ ...metrics, budgetProxy: Object.freeze({ ...metrics.budgetProxy, reservedUnits, utilization: input.budgetCapUnits ? round(reservedUnits / input.budgetCapUnits) : 0 }), populations: Object.freeze({ staged, legacy }), samples: Object.freeze({ stages: sample(input.stageDocs.length, truncation.stages), units: sample(input.unitDocs.length, truncation.units), jobs: sample(input.jobDocs.length, truncation.jobs) }), isPartial, rolloutEligible: !isPartial, documentCount: input.stageDocs.length + input.unitDocs.length + input.jobDocs.length, stageDocumentCount: input.stageDocs.length, unitDocumentCount: input.unitDocs.length, jobDocumentCount: input.jobDocs.length, deploymentStatus: 'not_deployed', deploymentLabel: 'Deployment не выполнялся' });
}
//# sourceMappingURL=rollout_metrics.js.map