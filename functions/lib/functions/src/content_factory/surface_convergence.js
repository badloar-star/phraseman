"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ARENA_COMPARATOR_VERSION = void 0;
exports.compareArenaSurfaceArtifacts = compareArenaSurfaceArtifacts;
exports.buildArenaShadowComparison = buildArenaShadowComparison;
const node_crypto_1 = require("node:crypto");
exports.ARENA_COMPARATOR_VERSION = 'arena-parity-v1';
function record(value) { return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : undefined; }
function normalized(value) { return String(value ?? '').normalize('NFKC').trim().toLocaleLowerCase().replace(/\s+/g, ' '); }
function stableJson(value) { if (Array.isArray(value))
    return `[${value.map(stableJson).join(',')}]`; if (value && typeof value === 'object')
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`; return JSON.stringify(value); }
function sha(value) { return (0, node_crypto_1.createHash)('sha256').update(stableJson(value)).digest('hex'); }
function normalizeItems(artifact, structured) {
    const output = record(artifact);
    const values = Array.isArray(output?.items) ? output.items : [];
    return Object.freeze(values.map((value) => {
        const item = record(value) ?? {};
        const prompt = normalized(structured ? item.question : item.prompt);
        const answer = normalized(structured ? item.correct : item.answer);
        const options = Array.isArray(item.options) ? item.options.map(normalized) : [];
        const correctIndex = structured ? Number(item.correctIndex) : options.indexOf(answer);
        return Object.freeze({ prompt, answer, options: Object.freeze([...options].sort()), singleCorrect: options.length === 4 && new Set(options).size === 4 && options.filter((option) => option === answer).length === 1 && Number.isInteger(correctIndex) && normalized((Array.isArray(item.options) ? item.options : [])[correctIndex]) === answer, hasEvidence: !structured || (Array.isArray(item.sourceReferences) && item.sourceReferences.some((reference) => normalized(reference))) });
    }).sort((a, b) => `${a.prompt}\0${a.answer}`.localeCompare(`${b.prompt}\0${b.answer}`)));
}
const CRITICAL = new Set(['identity_locale_mismatch', 'identity_lesson_mismatch', 'item_count_mismatch', 'semantic_item_mismatch', 'correct_answer_mismatch', 'single_correct_invariant_mismatch', 'artifact_hash_invalid']);
function compareArenaSurfaceArtifacts(input) {
    const mismatches = new Set();
    if (input.comparatorVersion !== exports.ARENA_COMPARATOR_VERSION)
        throw new Error('arena_comparator_version_unsupported');
    if (input.legacyIdentity.studyTarget !== input.stageIdentity.studyTarget || input.legacyIdentity.learnerSourceLocale !== input.stageIdentity.learnerSourceLocale)
        mismatches.add('identity_locale_mismatch');
    if (input.legacyIdentity.lessonId !== input.stageIdentity.lessonId)
        mismatches.add('identity_lesson_mismatch');
    if (!/^[a-f0-9]{64}$/.test(input.legacyArtifactHash) || !/^[a-f0-9]{64}$/.test(input.stageArtifactHash))
        mismatches.add('artifact_hash_invalid');
    const legacyItems = normalizeItems(input.legacyArtifact, false);
    const stageItems = normalizeItems(input.stageArtifact, true);
    if (legacyItems.length !== stageItems.length)
        mismatches.add('item_count_mismatch');
    for (let index = 0; index < Math.min(legacyItems.length, stageItems.length); index += 1) {
        const legacy = legacyItems[index];
        const stage = stageItems[index];
        if (legacy.prompt !== stage.prompt)
            mismatches.add('semantic_item_mismatch');
        if (legacy.answer !== stage.answer)
            mismatches.add('correct_answer_mismatch');
        if (stableJson(legacy.options) !== stableJson(stage.options))
            mismatches.add('semantic_item_mismatch');
        if (!legacy.singleCorrect || !stage.singleCorrect)
            mismatches.add('single_correct_invariant_mismatch');
        if (!stage.hasEvidence)
            mismatches.add('source_evidence_missing');
    }
    if (input.legacyQaOutcome !== input.stageQaOutcome)
        mismatches.add('qa_outcome_mismatch');
    if ((input.legacyError?.category ?? null) !== (input.stageError?.category ?? null))
        mismatches.add('error_category_mismatch');
    if ((input.legacyError?.retryable ?? null) !== (input.stageError?.retryable ?? null))
        mismatches.add('retryability_mismatch');
    const ordered = Object.freeze([...mismatches].sort());
    const severity = ordered.some((code) => CRITICAL.has(code)) ? 'critical' : ordered.length ? 'major' : 'none';
    const basis = { comparatorVersion: input.comparatorVersion, legacyFingerprint: sha({ identity: input.legacyIdentity, artifact: input.legacyArtifact, qa: input.legacyQaOutcome, error: input.legacyError ?? null }), stageFingerprint: sha({ identity: input.stageIdentity, artifact: input.stageArtifact, qa: input.stageQaOutcome, error: input.stageError ?? null }), legacyArtifactHash: input.legacyArtifactHash, stageArtifactHash: input.stageArtifactHash, mismatches: ordered, severity };
    return Object.freeze({ receiptId: sha(basis), ...basis, eligible: ordered.length === 0 });
}
function buildArenaShadowComparison(input) {
    const shadowComparisonState = 'unavailable';
    const candidate = Object.freeze({ providerRequestsAdded: Math.max(0, Math.trunc(input.providerRequestsAdded)) });
    const basis = {
        unitId: input.unitId,
        comparatorVersion: input.comparatorVersion,
        engineRequested: input.engineRequested,
        engineResolved: input.engineResolved,
        configRevision: input.configRevision,
        legacyArtifactHash: input.legacyArtifactHash,
        legacyQaOutcome: input.legacyQaOutcome,
        shadowComparisonState,
        candidate,
    };
    return Object.freeze({ documentId: sha(basis), ...basis, eligible: false });
}
//# sourceMappingURL=surface_convergence.js.map