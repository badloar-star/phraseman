"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convergenceReceiptDocumentId = convergenceReceiptDocumentId;
exports.buildArenaShadowComparison = buildArenaShadowComparison;
exports.buildArenaShadowFailureComparison = buildArenaShadowFailureComparison;
exports.groupArenaConvergenceReceipts = groupArenaConvergenceReceipts;
exports.summarizeArenaConvergenceReceipts = summarizeArenaConvergenceReceipts;
const node_crypto_1 = require("node:crypto");
const surface_convergence_1 = require("./surface_convergence");
function record(value) { return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : undefined; }
function stableJson(value) { if (Array.isArray(value))
    return `[${value.map(stableJson).join(',')}]`; if (value && typeof value === 'object')
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`; return JSON.stringify(value); }
function sha(value) { return (0, node_crypto_1.createHash)('sha256').update(stableJson(value)).digest('hex'); }
function levelForLesson(lessonId) { return lessonId <= 8 ? 'A1' : lessonId <= 16 ? 'A2' : lessonId <= 24 ? 'B1' : 'B2'; }
function convergenceReceiptDocumentId(unitId, legacyArtifactHash, comparatorVersion, configRevision, attempt) {
    if (!unitId || !/^[a-f0-9]{64}$/.test(legacyArtifactHash) || comparatorVersion !== surface_convergence_1.ARENA_COMPARATOR_VERSION || !Number.isSafeInteger(configRevision) || configRevision < 0 || !Number.isSafeInteger(attempt) || attempt < 1)
        throw new Error('surface_convergence_receipt_identity_invalid');
    return (0, node_crypto_1.createHash)('sha256').update(`${unitId}\0${legacyArtifactHash}\0${comparatorVersion}\0${configRevision}\0${attempt}`).digest('hex');
}
function buildArenaShadowComparison(input) {
    const legacy = record(input.legacyArtifact);
    const items = Array.isArray(legacy?.items) ? legacy.items : [];
    const evidence = input.evidenceIds.map(String).filter(Boolean);
    const stageArtifact = Object.freeze({ lessonId: input.lessonId, surface: 'arena', items: Object.freeze(items.map((value) => {
            const item = record(value) ?? {};
            const options = Array.isArray(item.options) ? item.options.map(String) : [];
            const answer = String(item.answer ?? '');
            return Object.freeze({ id: String(item.id ?? ''), level: levelForLesson(input.lessonId), type: 'translate', task: String(item.prompt ?? ''), question: String(item.prompt ?? ''), options: Object.freeze(options), correct: answer, correctIndex: options.indexOf(answer), rule: 'shadow_projection_from_accepted_legacy', expectedAnswerTimeMs: 5000, sourceReferences: Object.freeze(evidence) });
        })) });
    const stageArtifactHash = sha(stageArtifact);
    const identity = { studyTarget: input.studyTarget, learnerSourceLocale: input.learnerSourceLocale, lessonId: input.lessonId };
    const comparison = (0, surface_convergence_1.compareArenaSurfaceArtifacts)({ comparatorVersion: surface_convergence_1.ARENA_COMPARATOR_VERSION, legacyIdentity: identity, stageIdentity: identity, legacyArtifact: input.legacyArtifact, stageArtifact, legacyArtifactHash: input.legacyArtifactHash, stageArtifactHash, legacyQaOutcome: input.qaOutcome, stageQaOutcome: input.qaOutcome });
    const mismatchSet = new Set(comparison.mismatches);
    return Object.freeze({ documentId: convergenceReceiptDocumentId(input.unitId, input.legacyArtifactHash, surface_convergence_1.ARENA_COMPARATOR_VERSION, input.configRevision, input.attempt), surface: 'arena', unitId: input.unitId, jobId: input.jobId, attempt: input.attempt, studyTarget: input.studyTarget, learnerSourceLocale: input.learnerSourceLocale, lessonId: input.lessonId, level: levelForLesson(input.lessonId), configRevision: input.configRevision, comparatorVersion: surface_convergence_1.ARENA_COMPARATOR_VERSION, authoritativeEngine: 'legacy', shadowEngine: 'stage_projection', artifactComparison: true, authoritativeOutcome: input.qaOutcome, shadowOutcome: input.qaOutcome, errorCategoryAgreement: true, retryabilityAgreement: true, providerRequestsAdded: 0, complete: true, eligible: comparison.eligible, severity: comparison.severity, mismatches: comparison.mismatches, agreements: Object.freeze({ identity: !mismatchSet.has('identity_locale_mismatch') && !mismatchSet.has('identity_lesson_mismatch'), itemCount: !mismatchSet.has('item_count_mismatch'), correctness: !mismatchSet.has('correct_answer_mismatch') && !mismatchSet.has('single_correct_invariant_mismatch'), qa: !mismatchSet.has('qa_outcome_mismatch'), evidence: !mismatchSet.has('source_evidence_missing'), semanticCoverage: !mismatchSet.has('semantic_item_mismatch') }), legacyArtifactHash: input.legacyArtifactHash, stageArtifactHash, comparisonReceiptId: comparison.receiptId, fallbackReason: comparison.eligible ? null : 'parity_mismatch' });
}
function buildArenaShadowFailureComparison(input) {
    const failureHash = sha({ unitId: input.unitId, attempt: input.attempt, category: input.error.category, retryable: input.error.retryable });
    return Object.freeze({ documentId: convergenceReceiptDocumentId(input.unitId, failureHash, surface_convergence_1.ARENA_COMPARATOR_VERSION, input.configRevision, input.attempt), surface: 'arena', unitId: input.unitId, jobId: input.jobId, attempt: input.attempt, studyTarget: input.studyTarget, learnerSourceLocale: input.learnerSourceLocale, lessonId: input.lessonId, level: levelForLesson(input.lessonId), configRevision: input.configRevision, comparatorVersion: surface_convergence_1.ARENA_COMPARATOR_VERSION, authoritativeEngine: 'legacy', shadowEngine: 'stage_projection', artifactComparison: false, authoritativeOutcome: 'failed', shadowOutcome: 'failed', errorCategory: input.error.category, retryable: input.error.retryable, errorCategoryAgreement: true, retryabilityAgreement: true, providerRequestsAdded: 0, complete: true, eligible: false, severity: 'none', mismatches: Object.freeze([]), agreements: Object.freeze({ identity: false, itemCount: false, correctness: false, qa: false, evidence: false, semanticCoverage: false }), legacyArtifactHash: failureHash, stageArtifactHash: failureHash, comparisonReceiptId: sha({ failureHash, comparatorVersion: surface_convergence_1.ARENA_COMPARATOR_VERSION, configRevision: input.configRevision, attempt: input.attempt }), fallbackReason: 'generation_failed' });
}
function groupArenaConvergenceReceipts(values, limit) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500 || values.length > limit)
        throw new Error('surface_convergence_metrics_limit_invalid');
    const groups = new Map();
    for (const value of values) {
        const receipt = record(value);
        const comparatorVersion = String(receipt?.comparatorVersion ?? '');
        const configRevision = Number(receipt?.configRevision);
        if (!receipt || !comparatorVersion || !Number.isSafeInteger(configRevision) || configRevision < 0)
            continue;
        const key = `${comparatorVersion}\0${configRevision}`;
        const group = groups.get(key) ?? { comparatorVersion, configRevision, receipts: [] };
        group.receipts.push(receipt);
        groups.set(key, group);
    }
    return Object.freeze([...groups.values()].sort((a, b) => a.comparatorVersion.localeCompare(b.comparatorVersion) || a.configRevision - b.configRevision).map((group) => Object.freeze({ ...group, receipts: Object.freeze(group.receipts) })));
}
function summarizeArenaConvergenceReceipts(values, input) {
    if (!Number.isSafeInteger(input.limit) || input.limit < 1 || input.limit > 500 || values.length > input.limit)
        throw new Error('surface_convergence_metrics_limit_invalid');
    const matchingReceipts = values.map(record).filter((value) => Boolean(value)).filter((value) => value.comparatorVersion === input.expectedComparatorVersion && Number(value.configRevision) === input.expectedConfigRevision);
    const timestampMs = (value) => { if (Number.isFinite(Number(value)))
        return Number(value); if (value && typeof value === 'object' && typeof value.toMillis === 'function')
        return Number(value.toMillis()); return 0; };
    const latestByUnit = new Map();
    matchingReceipts.forEach((receipt, index) => {
        const unitId = String(receipt.unitId ?? '') || `missing-unit-${index}`;
        const previous = latestByUnit.get(unitId);
        const rank = (value) => [Number(value.attempt ?? 0), timestampMs(value.createdAtMs ?? value.createdAt)];
        if (!previous)
            latestByUnit.set(unitId, receipt);
        else {
            const [attempt, time] = rank(receipt);
            const [previousAttempt, previousTime] = rank(previous);
            if (attempt > previousAttempt || (attempt === previousAttempt && time >= previousTime))
                latestByUnit.set(unitId, receipt);
        }
    });
    const receipts = [...latestByUnit.values()];
    const receiptCount = matchingReceipts.length;
    const successfulArtifacts = receipts.filter((value) => value.artifactComparison === true);
    const successfulQaArtifacts = successfulArtifacts.filter((value) => value.authoritativeOutcome === 'pass' && value.shadowOutcome === 'pass');
    const sampleCount = receipts.length;
    const successfulArtifactCount = successfulArtifacts.length;
    const successfulQaArtifactCount = successfulQaArtifacts.length;
    const completeCount = receipts.filter((value) => value.complete === true).length;
    const criticalMismatchCount = receipts.filter((value) => value.severity === 'critical').length;
    const eligibleCount = receipts.filter((value) => value.eligible === true).length;
    const explicitFallbackCount = receipts.filter((value) => typeof value.fallbackReason === 'string' && value.fallbackReason).length;
    const distinctJobs = new Set(receipts.map((value) => String(value.jobId ?? '')).filter(Boolean)).size;
    const missingReceiptCount = Math.max(0, Number(input.expectedShadowUnitCount ?? sampleCount) - sampleCount);
    const fallbackCount = explicitFallbackCount + missingReceiptCount;
    const agreementRate = (population, predicate) => population.length ? population.filter(predicate).length / population.length : 0;
    const agreements = Object.freeze({ identity: agreementRate(successfulQaArtifacts, (value) => record(value.agreements)?.identity === true), itemCount: agreementRate(successfulQaArtifacts, (value) => record(value.agreements)?.itemCount === true), correctness: agreementRate(successfulQaArtifacts, (value) => record(value.agreements)?.correctness === true), qa: agreementRate(successfulQaArtifacts, (value) => record(value.agreements)?.qa === true), evidence: agreementRate(successfulQaArtifacts, (value) => record(value.agreements)?.evidence === true), semanticCoverage: agreementRate(successfulQaArtifacts, (value) => record(value.agreements)?.semanticCoverage === true), terminalOutcome: agreementRate(receipts, (value) => value.authoritativeOutcome === value.shadowOutcome), errorCategory: agreementRate(receipts, (value) => value.errorCategoryAgreement === true), retryability: agreementRate(receipts, (value) => value.retryabilityAgreement === true) });
    const levels = [...new Set(receipts.map((value) => String(value.level ?? '')).filter(Boolean))].sort();
    const localePairs = [...new Set(receipts.map((value) => `${String(value.studyTarget ?? '')}:${String(value.learnerSourceLocale ?? '')}`).filter((value) => value !== ':'))].sort();
    const times = receipts.map((value) => timestampMs(value.createdAtMs ?? value.createdAt)).filter((value) => value > 0);
    const evidenceDays = times.length ? Math.floor((Math.max(...times) - Math.min(...times)) / 86400000) + 1 : 0;
    const goBlockers = [];
    if (completeCount !== sampleCount)
        goBlockers.push('evidence_incomplete');
    if (criticalMismatchCount)
        goBlockers.push('critical_mismatch');
    if (sampleCount < 200)
        goBlockers.push('minimum_comparisons_not_met');
    if (successfulQaArtifactCount < 200)
        goBlockers.push('minimum_successful_artifacts_not_met');
    if (distinctJobs < 20)
        goBlockers.push('minimum_jobs_not_met');
    if (fallbackCount)
        goBlockers.push('unexplained_fallback');
    if (missingReceiptCount)
        goBlockers.push('missing_shadow_receipts');
    if (input.isPartial)
        goBlockers.push('bounded_sample_partial');
    if (!['A1', 'A2', 'B1', 'B2'].every((level) => levels.includes(level)))
        goBlockers.push('level_coverage_incomplete');
    if (input.expectedLocalePairs?.some((pair) => !localePairs.includes(pair)))
        goBlockers.push('locale_coverage_incomplete');
    if (evidenceDays < 7)
        goBlockers.push('minimum_days_not_met');
    if (agreements.identity < 1 || agreements.itemCount < 1 || agreements.correctness < 1 || agreements.qa < 1 || agreements.evidence < 1)
        goBlockers.push('required_agreement_below_100_percent');
    if (agreements.terminalOutcome < 0.995 || agreements.errorCategory < 0.995 || agreements.retryability < 0.995)
        goBlockers.push('terminal_agreement_below_threshold');
    if (agreements.semanticCoverage < 0.98)
        goBlockers.push('semantic_coverage_below_threshold');
    return Object.freeze({ receiptCount, sampleCount, successfulArtifactCount, successfulQaArtifactCount, completeCount, distinctJobs, criticalMismatchCount, eligibleCount, fallbackCount, missingReceiptCount, levels: Object.freeze(levels), localePairs: Object.freeze(localePairs), evidenceDays, agreements, goEligible: goBlockers.length === 0, goBlockers: Object.freeze([...new Set(goBlockers)]) });
}
//# sourceMappingURL=arena_shadow_convergence.js.map