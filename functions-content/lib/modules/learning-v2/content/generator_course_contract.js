"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNING_V2_APPROVAL_STAGES = exports.LEARNING_V2_LEARNING_CYCLE = exports.LEARNING_V2_REQUIRED_CONTENT_KINDS = exports.LEARNING_V2_CEFR_LADDER = exports.LEARNING_V2_INTERFACE_LOCALES = void 0;
exports.assertLearningV2LocalizedEnvelope = assertLearningV2LocalizedEnvelope;
exports.validateLearningV2GeneratedCoursePackage = validateLearningV2GeneratedCoursePackage;
exports.learningV2GeneratedCoursePackageFingerprint = learningV2GeneratedCoursePackageFingerprint;
exports.assertLearningV2GeneratedCourseReleaseApproved = assertLearningV2GeneratedCourseReleaseApproved;
const decision_registry_1 = require("../policies/decision_registry");
/**
 * Every generated Learning V2 package is atomic across these UI languages.
 *
 * зачем 'en' девятой (владелец, 2026-08-23): список — языки ОБЪЯСНЕНИЯ, а не
 * изучаемый язык. Пока курс был один (английский), 'es' работал объяснением.
 * У испанского курса 'es' стал target, и объяснять его надо на 'en', которого
 * в списке не было вовсе — то есть испанский курс физически не мог объяснить
 * себя англоязычному ученику. Список общий на платформу, поэтому 'en'
 * добавлен для всех курсов; у английского курса эта локаль остаётся
 * незаполненной (англоязычный интерфейс, изучающий английский, — вырожденная
 * пара) и покрывается обычным UNTRANSLATED_MARKER, а не молчаливой подменой.
 */
exports.LEARNING_V2_INTERFACE_LOCALES = Object.freeze([
    'ru',
    'uk',
    'es',
    'en',
    'pt-BR',
    'vi',
    'id',
    'tr',
    'pl',
]);
/** PRE_A1 is the product's absolute-zero entry point before ordinary CEFR A1. */
exports.LEARNING_V2_CEFR_LADDER = Object.freeze([
    'PRE_A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2',
]);
exports.LEARNING_V2_REQUIRED_CONTENT_KINDS = Object.freeze([
    'course_map',
    'section_intro',
    'lesson_intro',
    'explanation',
    'model',
    'supported_practice',
    'guided_practice',
    'retrieval_practice',
    'near_transfer',
    'independent_check',
    'delayed_review',
    'sector_exam',
    'hint',
    'error_explanation',
    'accessibility_copy',
    'audio_script',
]);
exports.LEARNING_V2_LEARNING_CYCLE = Object.freeze([
    'explain',
    'model',
    'supported_practice',
    'guided_practice',
    'retrieval',
    'near_transfer',
    'independent_check',
    'delayed_review',
    'exam',
]);
exports.LEARNING_V2_APPROVAL_STAGES = Object.freeze([
    'research',
    'curriculum',
    'lesson_outline',
    'localized_content',
    'audio',
    'quality_assurance',
    'owner_release',
]);
const TOKEN_RE = /^[A-Za-z0-9._:-]{1,160}$/;
const LANGUAGE_RE = /^[a-z]{2,12}(?:-[A-Z]{2})?$/;
const SHA256_RE = /^[a-f0-9]{64}$/;
const MAX_LOCALIZED_JSON_BYTES = 128 * 1024;
function assertToken(value, field) {
    if (typeof value !== 'string' || !TOKEN_RE.test(value)) {
        throw new Error(`learning_v2_generator_${field}_invalid`);
    }
}
function assertLearningV2LocalizedEnvelope(value, field) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error(`learning_v2_generator_${field}_locales_invalid`);
    }
    const keys = Object.keys(value);
    if (keys.length !== exports.LEARNING_V2_INTERFACE_LOCALES.length ||
        exports.LEARNING_V2_INTERFACE_LOCALES.some((locale, index) => keys[index] !== locale)) {
        throw new Error(`learning_v2_generator_${field}_locales_invalid`);
    }
    for (const locale of exports.LEARNING_V2_INTERFACE_LOCALES) {
        const localized = value[locale];
        if (localized == null || (typeof localized === 'string' && !localized.trim())) {
            throw new Error(`learning_v2_generator_${field}_${locale}_empty`);
        }
        let encoded;
        try {
            encoded = JSON.stringify(localized);
        }
        catch {
            throw new Error(`learning_v2_generator_${field}_${locale}_invalid`);
        }
        if (!encoded || encoded.length > MAX_LOCALIZED_JSON_BYTES || (0, decision_registry_1.utf8ByteLengthV1)(encoded) > MAX_LOCALIZED_JSON_BYTES) {
            throw new Error(`learning_v2_generator_${field}_${locale}_invalid`);
        }
    }
}
function assertUniqueTokens(values, field) {
    if (!Array.isArray(values) || values.some((value) => typeof value !== 'string' || !TOKEN_RE.test(value)) ||
        new Set(values).size !== values.length) {
        throw new Error(`learning_v2_generator_${field}_invalid`);
    }
}
/**
 * Validates the whole generated course package. This is intentionally broader
 * than intro validation: map copy, teaching, tasks, feedback, exams,
 * accessibility and audio scripts all share one all-locales release boundary.
 */
function validateLearningV2GeneratedCoursePackage(input) {
    if (input.schemaVersion !== 'learning-v2-generated-course-package.v1') {
        throw new Error('learning_v2_generator_course_schema_invalid');
    }
    assertToken(input.packageId, 'course_package_id');
    if (!LANGUAGE_RE.test(input.targetLanguage))
        throw new Error('learning_v2_generator_target_language_invalid');
    if (input.entryBand !== 'PRE_A1' || !exports.LEARNING_V2_CEFR_LADDER.includes(input.exitBand)) {
        throw new Error('learning_v2_generator_cefr_ladder_invalid');
    }
    if (input.interfaceLocales.length !== exports.LEARNING_V2_INTERFACE_LOCALES.length ||
        input.interfaceLocales.some((locale, index) => locale !== exports.LEARNING_V2_INTERFACE_LOCALES[index])) {
        throw new Error('learning_v2_generator_interface_locales_invalid');
    }
    if (input.learningCycle.length !== exports.LEARNING_V2_LEARNING_CYCLE.length ||
        input.learningCycle.some((stage, index) => stage !== exports.LEARNING_V2_LEARNING_CYCLE[index])) {
        throw new Error('learning_v2_generator_learning_cycle_invalid');
    }
    if (!Array.isArray(input.objectives) || input.objectives.length < 1 || input.objectives.length > 2_000) {
        throw new Error('learning_v2_generator_objectives_invalid');
    }
    const objectiveIds = new Set();
    for (const objective of input.objectives) {
        assertToken(objective.objectiveId, 'objective_id');
        if (objectiveIds.has(objective.objectiveId) || !exports.LEARNING_V2_CEFR_LADDER.includes(objective.cefrBand)) {
            throw new Error('learning_v2_generator_objective_invalid');
        }
        objectiveIds.add(objective.objectiveId);
        assertLearningV2LocalizedEnvelope(objective.canDoByLocale, 'objective');
    }
    if (!Array.isArray(input.artifacts) || input.artifacts.length < exports.LEARNING_V2_REQUIRED_CONTENT_KINDS.length || input.artifacts.length > 10_000) {
        throw new Error('learning_v2_generator_artifacts_invalid');
    }
    const kinds = new Set();
    const artifactIds = new Set();
    const introducedConcepts = new Set();
    let previousOrdinal = 0;
    for (const artifact of input.artifacts) {
        assertToken(artifact.artifactId, 'artifact_id');
        if (artifactIds.has(artifact.artifactId) || !exports.LEARNING_V2_REQUIRED_CONTENT_KINDS.includes(artifact.kind)) {
            throw new Error('learning_v2_generator_artifact_invalid');
        }
        if (!Number.isSafeInteger(artifact.sequenceOrdinal) || artifact.sequenceOrdinal !== previousOrdinal + 1) {
            throw new Error('learning_v2_generator_artifact_order_invalid');
        }
        previousOrdinal = artifact.sequenceOrdinal;
        assertLearningV2LocalizedEnvelope(artifact.contentByLocale, 'artifact');
        assertUniqueTokens(artifact.introducesConceptIds, 'introduced_concepts');
        assertUniqueTokens(artifact.usesConceptIds, 'used_concepts');
        assertUniqueTokens(artifact.dependsOnArtifactIds, 'artifact_dependencies');
        if (artifact.dependsOnArtifactIds.some((id) => !artifactIds.has(id))) {
            throw new Error('learning_v2_generator_dependency_not_previous');
        }
        if (artifact.usesConceptIds.some((id) => !introducedConcepts.has(id) && !artifact.introducesConceptIds.includes(id))) {
            throw new Error('learning_v2_generator_use_before_introduction');
        }
        if (artifact.introducesConceptIds.some((id) => introducedConcepts.has(id))) {
            throw new Error('learning_v2_generator_concept_reintroduced');
        }
        artifact.introducesConceptIds.forEach((id) => introducedConcepts.add(id));
        artifactIds.add(artifact.artifactId);
        kinds.add(artifact.kind);
    }
    if (exports.LEARNING_V2_REQUIRED_CONTENT_KINDS.some((kind) => !kinds.has(kind))) {
        throw new Error('learning_v2_generator_required_content_missing');
    }
    return input;
}
function learningV2GeneratedCoursePackageFingerprint(input) {
    validateLearningV2GeneratedCoursePackage(input);
    return (0, decision_registry_1.hashCanonicalBody)(input);
}
/** Release is impossible until the owner approved every generation stage. */
function assertLearningV2GeneratedCourseReleaseApproved(input) {
    const fingerprint = learningV2GeneratedCoursePackageFingerprint(input.coursePackage);
    if (input.approvalReceipts.length !== exports.LEARNING_V2_APPROVAL_STAGES.length) {
        throw new Error('learning_v2_generator_approval_incomplete');
    }
    for (const [index, stage] of exports.LEARNING_V2_APPROVAL_STAGES.entries()) {
        const receipt = input.approvalReceipts[index];
        if (receipt?.stage !== stage || receipt.state !== 'approved' || receipt.packageFingerprint !== fingerprint ||
            receipt.reviewerId !== 'owner' || typeof receipt.reviewedAtIso !== 'string' ||
            Number.isNaN(Date.parse(receipt.reviewedAtIso))) {
            throw new Error(`learning_v2_generator_approval_${stage}_missing`);
        }
    }
    if (!SHA256_RE.test(fingerprint))
        throw new Error('learning_v2_generator_fingerprint_invalid');
}
//# sourceMappingURL=generator_course_contract.js.map