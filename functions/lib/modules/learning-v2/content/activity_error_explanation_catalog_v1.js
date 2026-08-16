"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_LEARNER_MAX_BYTES_V1 = exports.LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_CATALOG_MAX_BYTES_V1 = exports.LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_VARIANT_MAX_V1 = exports.LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_COUNT_V1 = exports.LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_LEARNER_SCHEMA_V1 = exports.LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_CATALOG_SCHEMA_V1 = void 0;
exports.parseLearningV2ActivityErrorExplanationCatalogV1 = parseLearningV2ActivityErrorExplanationCatalogV1;
exports.encodeLearningV2ActivityErrorExplanationCatalogV1 = encodeLearningV2ActivityErrorExplanationCatalogV1;
exports.isLearningV2ActivityErrorExplanationCatalogV1 = isLearningV2ActivityErrorExplanationCatalogV1;
exports.projectLearningV2ActivityErrorExplanationsForLearnerV1 = projectLearningV2ActivityErrorExplanationsForLearnerV1;
exports.encodeLearningV2ActivityErrorExplanationLearnerProjectionV1 = encodeLearningV2ActivityErrorExplanationLearnerProjectionV1;
exports.parseLearningV2ActivityErrorExplanationLearnerProjectionV1 = parseLearningV2ActivityErrorExplanationLearnerProjectionV1;
exports.resolveLearningV2ActivityErrorExplanationV1 = resolveLearningV2ActivityErrorExplanationV1;
const generator_course_contract_1 = require("./generator_course_contract");
const activity_catalog_v2_1 = require("../contracts/activity_catalog_v2");
const decision_registry_1 = require("../policies/decision_registry");
const course_topology_v1_1 = require("./course_topology_v1");
exports.LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_CATALOG_SCHEMA_V1 = "learning-v2-activity-error-explanation-catalog.v1";
exports.LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_LEARNER_SCHEMA_V1 = "learning-v2-activity-error-explanation-learner.v1";
exports.LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_COUNT_V1 = 144;
exports.LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_VARIANT_MAX_V1 = 8;
exports.LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_CATALOG_MAX_BYTES_V1 = 16 * 1024 * 1024;
exports.LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_LEARNER_MAX_BYTES_V1 = 4 * 1024 * 1024;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const LANGUAGE_RE = /^[a-z]{2,3}(?:-[A-Za-z0-9]{1,8}){0,15}$/u;
const HASH_RE = /^[a-f0-9]{64}$/u;
const CONTROL_OR_BIDI_RE = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u;
const FAMILY_SET = new Set(activity_catalog_v2_1.V2_REQUIRED_SESSION_FAMILIES_V2);
const CATALOG_KEYS = Object.freeze([
    "schemaVersion",
    "catalogId",
    "packageId",
    "targetLanguage",
    "episodeId",
    "episodeOrdinal",
    "interfaceLocales",
    "entries",
    "entryCount",
    "filterDimensions",
    "contentOriginAuthority",
    "selectionAuthority",
    "runtimeAuthority",
    "publicationAuthority",
    "releaseAuthority",
    "catalogFingerprint",
]);
const ENTRY_KEYS = Object.freeze([
    "explanationId",
    "episodeId",
    "sessionId",
    "sessionOrdinal",
    "taskId",
    "activityId",
    "family",
    "errorKind",
    "selectedVariantId",
    "variants",
]);
const VARIANT_KEYS = Object.freeze([
    "variantId",
    "state",
    "origin",
    "provenanceFingerprint",
    "textByLocale",
]);
const LEARNER_KEYS = Object.freeze([
    "schemaVersion",
    "catalogId",
    "packageId",
    "targetLanguage",
    "episodeId",
    "episodeOrdinal",
    "interfaceLocales",
    "entries",
    "entryCount",
    "sourceCatalogFingerprint",
    "contentOriginAuthority",
    "answerKeyAuthority",
    "runtimeAuthority",
    "publicationAuthority",
    "releaseAuthority",
    "projectionFingerprint",
]);
const LEARNER_ENTRY_KEYS = Object.freeze([
    "explanationRef",
    "episodeId",
    "sessionId",
    "sessionOrdinal",
    "taskId",
    "activityId",
    "family",
    "errorKind",
    "textByLocale",
    "sourceCatalogFingerprint",
]);
const FILTER_DIMENSIONS = Object.freeze([
    "interface_locale",
    "family",
    "episode",
    "session",
    "task",
]);
const catalogHandles = new WeakSet();
const learnerProjectionHandles = new WeakSet();
const RESERVED_KEYS = new Set(["__proto__", "prototype", "constructor"]);
function fail(code) {
    throw new Error(code);
}
function isPlainObject(value) {
    return (typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) === Object.prototype);
}
function exactKeys(value, expected, code) {
    const keys = Object.keys(value);
    if (keys.length !== expected.length ||
        keys.some((key) => !expected.includes(key)))
        fail(code);
}
function exactId(value, code) {
    if (typeof value !== "string" || !ID_RE.test(value))
        fail(code);
    return value;
}
function exactLocalizedText(value) {
    if (!isPlainObject(value))
        fail("learning_v2_error_explanation_locales_invalid");
    const keys = Object.keys(value);
    if (keys.length !== generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES.length ||
        generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES.some((locale) => !keys.includes(locale)))
        fail("learning_v2_error_explanation_locales_invalid");
    const result = {};
    for (const locale of generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES) {
        const text = value[locale];
        if (typeof text !== "string" ||
            text.length < 1 ||
            text.trim() !== text ||
            text.normalize("NFC") !== text ||
            CONTROL_OR_BIDI_RE.test(text) ||
            (0, decision_registry_1.utf8ByteLengthV1)(text) > 1000)
            fail("learning_v2_error_explanation_text_invalid");
        result[locale] = text;
    }
    return Object.freeze(result);
}
function deepFreeze(value) {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
        for (const child of Object.values(value))
            deepFreeze(child);
        Object.freeze(value);
    }
    return value;
}
function preflightJson(root) {
    const stack = [
        { value: root, depth: 0 },
    ];
    let nodes = 0;
    let arrayEntries = 0;
    while (stack.length > 0) {
        const current = stack.pop();
        nodes += 1;
        if (nodes > 40000 || current.depth > 16)
            fail("learning_v2_error_explanation_catalog_complexity_invalid");
        const value = current.value;
        if (typeof value === "string") {
            if (value.length > 4096 || value.normalize("NFC") !== value)
                fail("learning_v2_error_explanation_catalog_string_invalid");
            continue;
        }
        if (value === null || typeof value === "boolean")
            continue;
        if (typeof value === "number") {
            if (!Number.isSafeInteger(value) || Object.is(value, -0))
                fail("learning_v2_error_explanation_catalog_number_invalid");
            continue;
        }
        if (Array.isArray(value)) {
            arrayEntries += value.length;
            if (arrayEntries > 4000)
                fail("learning_v2_error_explanation_catalog_complexity_invalid");
            value.forEach((child) => stack.push({ value: child, depth: current.depth + 1 }));
            continue;
        }
        if (!isPlainObject(value))
            fail("learning_v2_error_explanation_catalog_json_invalid");
        const keys = Object.keys(value);
        if (keys.length > 32 ||
            keys.some((key) => RESERVED_KEYS.has(key) || key.normalize("NFC") !== key))
            fail("learning_v2_error_explanation_catalog_fields_invalid");
        keys.forEach((key) => stack.push({ value: value[key], depth: current.depth + 1 }));
    }
}
function parseEntry(value, episodeId) {
    if (!isPlainObject(value))
        fail("learning_v2_error_explanation_entry_invalid");
    exactKeys(value, ENTRY_KEYS, "learning_v2_error_explanation_entry_invalid");
    const explanationId = exactId(value.explanationId, "learning_v2_error_explanation_entry_invalid");
    if (value.episodeId !== episodeId)
        fail("learning_v2_error_explanation_episode_mismatch");
    const sessionId = exactId(value.sessionId, "learning_v2_error_explanation_entry_invalid");
    if (!Number.isSafeInteger(value.sessionOrdinal) ||
        Number(value.sessionOrdinal) < 1 ||
        Number(value.sessionOrdinal) > course_topology_v1_1.LEARNING_V2_LESSON_SESSION_COUNT_V1)
        fail("learning_v2_error_explanation_session_invalid");
    const taskId = exactId(value.taskId, "learning_v2_error_explanation_entry_invalid");
    const activityId = exactId(value.activityId, "learning_v2_error_explanation_entry_invalid");
    if (!FAMILY_SET.has(String(value.family)))
        fail("learning_v2_error_explanation_family_invalid");
    if (value.errorKind !== "generic_wrong_answer")
        fail("learning_v2_error_explanation_kind_invalid");
    const selectedVariantId = exactId(value.selectedVariantId, "learning_v2_error_explanation_selection_invalid");
    if (!Array.isArray(value.variants) ||
        value.variants.length < 1 ||
        value.variants.length >
            exports.LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_VARIANT_MAX_V1)
        fail("learning_v2_error_explanation_variants_invalid");
    const variantIds = new Set();
    let selectedCount = 0;
    const variants = value.variants.map((raw) => {
        if (!isPlainObject(raw))
            fail("learning_v2_error_explanation_variant_invalid");
        exactKeys(raw, VARIANT_KEYS, "learning_v2_error_explanation_variant_invalid");
        const variantId = exactId(raw.variantId, "learning_v2_error_explanation_variant_invalid");
        if (variantIds.has(variantId))
            fail("learning_v2_error_explanation_variant_duplicate");
        variantIds.add(variantId);
        if (!["candidate", "selected_for_preview", "rejected"].includes(String(raw.state)))
            fail("learning_v2_error_explanation_variant_state_invalid");
        if (!["owner_authored", "generator_candidate"].includes(String(raw.origin)))
            fail("learning_v2_error_explanation_variant_origin_invalid");
        if (typeof raw.provenanceFingerprint !== "string" ||
            !HASH_RE.test(raw.provenanceFingerprint))
            fail("learning_v2_error_explanation_provenance_invalid");
        if (raw.state === "selected_for_preview") {
            selectedCount += 1;
            if (variantId !== selectedVariantId)
                fail("learning_v2_error_explanation_selection_invalid");
        }
        return Object.freeze({
            variantId,
            state: raw.state,
            origin: raw.origin,
            provenanceFingerprint: raw.provenanceFingerprint,
            textByLocale: exactLocalizedText(raw.textByLocale),
        });
    });
    if (selectedCount !== 1 || !variantIds.has(selectedVariantId))
        fail("learning_v2_error_explanation_selection_invalid");
    return deepFreeze({
        explanationId,
        episodeId,
        sessionId,
        sessionOrdinal: value.sessionOrdinal,
        taskId,
        activityId,
        family: value.family,
        errorKind: value.errorKind,
        selectedVariantId,
        variants,
    });
}
function decodeCanonical(rawCanonical, maxBytes, sizeErrorCode) {
    if (typeof rawCanonical !== "string" ||
        rawCanonical.length > maxBytes ||
        (0, decision_registry_1.utf8ByteLengthV1)(rawCanonical) > maxBytes)
        fail(sizeErrorCode);
    let value;
    try {
        value = JSON.parse(rawCanonical);
    }
    catch {
        fail("learning_v2_error_explanation_catalog_json_invalid");
    }
    if (!isPlainObject(value))
        fail("learning_v2_error_explanation_catalog_invalid");
    preflightJson(value);
    if ((0, decision_registry_1.canonicalJsonV1)(value) !== rawCanonical)
        fail("learning_v2_error_explanation_catalog_noncanonical");
    return value;
}
function parseLearningV2ActivityErrorExplanationCatalogV1(rawCanonical) {
    const value = decodeCanonical(rawCanonical, exports.LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_CATALOG_MAX_BYTES_V1, "learning_v2_error_explanation_catalog_size_invalid");
    exactKeys(value, CATALOG_KEYS, "learning_v2_error_explanation_catalog_fields_invalid");
    if (value.schemaVersion !==
        exports.LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_CATALOG_SCHEMA_V1 ||
        typeof value.targetLanguage !== "string" ||
        !LANGUAGE_RE.test(value.targetLanguage) ||
        !Number.isSafeInteger(value.episodeOrdinal) ||
        Number(value.episodeOrdinal) < 1 ||
        Number(value.episodeOrdinal) > 32 ||
        value.entryCount !== exports.LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_COUNT_V1 ||
        value.contentOriginAuthority !== "unverified_owner_or_generator_claim" ||
        value.selectionAuthority !== "preview_only_no_release_authority" ||
        value.runtimeAuthority !== "none" ||
        value.publicationAuthority !== "none" ||
        value.releaseAuthority !== false)
        fail("learning_v2_error_explanation_catalog_identity_invalid");
    const catalogId = exactId(value.catalogId, "learning_v2_error_explanation_catalog_identity_invalid");
    const packageId = exactId(value.packageId, "learning_v2_error_explanation_catalog_identity_invalid");
    const episodeId = exactId(value.episodeId, "learning_v2_error_explanation_catalog_identity_invalid");
    if (!Array.isArray(value.interfaceLocales) ||
        value.interfaceLocales.length !== generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES.length ||
        value.interfaceLocales.some((locale, index) => locale !== generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES[index]) ||
        !Array.isArray(value.filterDimensions) ||
        value.filterDimensions.length !== FILTER_DIMENSIONS.length ||
        value.filterDimensions.some((dimension, index) => dimension !== FILTER_DIMENSIONS[index]) ||
        !Array.isArray(value.entries) ||
        value.entries.length !== exports.LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_COUNT_V1)
        fail("learning_v2_error_explanation_catalog_shape_invalid");
    const explanationIds = new Set();
    const taskIds = new Set();
    const activityIds = new Set();
    const perSession = new Map();
    const entries = value.entries.map((raw, index) => {
        const entry = parseEntry(raw, episodeId);
        if (entry.sessionOrdinal !== Math.floor(index / 12) + 1)
            fail("learning_v2_error_explanation_catalog_order_invalid");
        if (explanationIds.has(entry.explanationId) ||
            taskIds.has(entry.taskId) ||
            activityIds.has(entry.activityId))
            fail("learning_v2_error_explanation_catalog_duplicate");
        explanationIds.add(entry.explanationId);
        taskIds.add(entry.taskId);
        activityIds.add(entry.activityId);
        perSession.set(entry.sessionOrdinal, (perSession.get(entry.sessionOrdinal) ?? 0) + 1);
        return entry;
    });
    if (perSession.size !== 12 ||
        [...perSession.values()].some((count) => count !== 12))
        fail("learning_v2_error_explanation_session_bijection_invalid");
    const body = {
        ...value,
        catalogId,
        packageId,
        episodeId,
        interfaceLocales: generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES,
        entries,
        filterDimensions: FILTER_DIMENSIONS,
    };
    const { catalogFingerprint: _ignored, ...withoutFingerprint } = body;
    if (typeof value.catalogFingerprint !== "string" ||
        value.catalogFingerprint !== (0, decision_registry_1.hashCanonicalBody)(withoutFingerprint))
        fail("learning_v2_error_explanation_catalog_fingerprint_invalid");
    const result = deepFreeze(body);
    catalogHandles.add(result);
    return result;
}
function encodeLearningV2ActivityErrorExplanationCatalogV1(body) {
    const rawBody = (0, decision_registry_1.canonicalJsonV1)(body);
    const decoded = JSON.parse(rawBody);
    return (0, decision_registry_1.canonicalJsonV1)({
        ...decoded,
        catalogFingerprint: (0, decision_registry_1.hashCanonicalBody)(decoded),
    });
}
function isLearningV2ActivityErrorExplanationCatalogV1(value) {
    return (typeof value === "object" && value !== null && catalogHandles.has(value));
}
function projectLearningV2ActivityErrorExplanationsForLearnerV1(catalog) {
    if (!isLearningV2ActivityErrorExplanationCatalogV1(catalog))
        fail("learning_v2_error_explanation_catalog_handle_invalid");
    const entries = catalog.entries.map((entry) => {
        const selected = entry.variants.find((variant) => variant.variantId === entry.selectedVariantId);
        if (!selected || selected.state !== "selected_for_preview")
            fail("learning_v2_error_explanation_selection_invalid");
        return deepFreeze({
            explanationRef: `error-explanation-${(0, decision_registry_1.hashCanonicalBody)({
                schemaVersion: "learning-v2-error-explanation-ref.v1",
                explanationId: entry.explanationId,
                variantId: selected.variantId,
                sourceCatalogFingerprint: catalog.catalogFingerprint,
            })}`,
            episodeId: entry.episodeId,
            sessionId: entry.sessionId,
            sessionOrdinal: entry.sessionOrdinal,
            taskId: entry.taskId,
            activityId: entry.activityId,
            family: entry.family,
            errorKind: entry.errorKind,
            textByLocale: selected.textByLocale,
            sourceCatalogFingerprint: catalog.catalogFingerprint,
        });
    });
    const body = {
        schemaVersion: exports.LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_LEARNER_SCHEMA_V1,
        catalogId: catalog.catalogId,
        packageId: catalog.packageId,
        targetLanguage: catalog.targetLanguage,
        episodeId: catalog.episodeId,
        episodeOrdinal: catalog.episodeOrdinal,
        interfaceLocales: generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES,
        entries: Object.freeze(entries),
        entryCount: exports.LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_COUNT_V1,
        sourceCatalogFingerprint: catalog.catalogFingerprint,
        contentOriginAuthority: "unverified_selected_preview_copy",
        answerKeyAuthority: "none_structural_fields_only_semantic_qa_required",
        runtimeAuthority: "learner_copy_only",
        publicationAuthority: "none",
        releaseAuthority: false,
    };
    const result = deepFreeze({
        ...body,
        projectionFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
    });
    learnerProjectionHandles.add(result);
    return result;
}
function encodeLearningV2ActivityErrorExplanationLearnerProjectionV1(projection) {
    if (typeof projection !== "object" ||
        projection === null ||
        !learnerProjectionHandles.has(projection))
        fail("learning_v2_error_explanation_projection_handle_invalid");
    return (0, decision_registry_1.canonicalJsonV1)(projection);
}
function parseLearningV2ActivityErrorExplanationLearnerProjectionV1(rawCanonical) {
    const value = decodeCanonical(rawCanonical, exports.LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_LEARNER_MAX_BYTES_V1, "learning_v2_error_explanation_projection_size_invalid");
    exactKeys(value, LEARNER_KEYS, "learning_v2_error_explanation_projection_fields_invalid");
    if (value.schemaVersion !==
        exports.LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_LEARNER_SCHEMA_V1 ||
        typeof value.targetLanguage !== "string" ||
        !LANGUAGE_RE.test(value.targetLanguage) ||
        !Number.isSafeInteger(value.episodeOrdinal) ||
        Number(value.episodeOrdinal) < 1 ||
        Number(value.episodeOrdinal) > 32 ||
        value.entryCount !== exports.LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_COUNT_V1 ||
        typeof value.sourceCatalogFingerprint !== "string" ||
        !HASH_RE.test(value.sourceCatalogFingerprint) ||
        value.contentOriginAuthority !== "unverified_selected_preview_copy" ||
        value.answerKeyAuthority !==
            "none_structural_fields_only_semantic_qa_required" ||
        value.runtimeAuthority !== "learner_copy_only" ||
        value.publicationAuthority !== "none" ||
        value.releaseAuthority !== false)
        fail("learning_v2_error_explanation_projection_identity_invalid");
    const catalogId = exactId(value.catalogId, "learning_v2_error_explanation_projection_identity_invalid");
    const packageId = exactId(value.packageId, "learning_v2_error_explanation_projection_identity_invalid");
    const episodeId = exactId(value.episodeId, "learning_v2_error_explanation_projection_identity_invalid");
    if (!Array.isArray(value.interfaceLocales) ||
        value.interfaceLocales.length !== generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES.length ||
        value.interfaceLocales.some((locale, index) => locale !== generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES[index]) ||
        !Array.isArray(value.entries) ||
        value.entries.length !== exports.LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_COUNT_V1)
        fail("learning_v2_error_explanation_projection_shape_invalid");
    const taskIds = new Set();
    const activityIds = new Set();
    const explanationRefs = new Set();
    const entries = value.entries.map((raw, index) => {
        if (!isPlainObject(raw))
            fail("learning_v2_error_explanation_projection_entry_invalid");
        exactKeys(raw, LEARNER_ENTRY_KEYS, "learning_v2_error_explanation_projection_entry_invalid");
        const explanationRef = exactId(raw.explanationRef, "learning_v2_error_explanation_projection_entry_invalid");
        const sessionId = exactId(raw.sessionId, "learning_v2_error_explanation_projection_entry_invalid");
        const taskId = exactId(raw.taskId, "learning_v2_error_explanation_projection_entry_invalid");
        const activityId = exactId(raw.activityId, "learning_v2_error_explanation_projection_entry_invalid");
        if (raw.episodeId !== episodeId ||
            raw.sessionOrdinal !== Math.floor(index / 12) + 1 ||
            !FAMILY_SET.has(String(raw.family)) ||
            raw.errorKind !== "generic_wrong_answer" ||
            raw.sourceCatalogFingerprint !== value.sourceCatalogFingerprint ||
            taskIds.has(taskId) ||
            activityIds.has(activityId) ||
            explanationRefs.has(explanationRef))
            fail("learning_v2_error_explanation_projection_bijection_invalid");
        taskIds.add(taskId);
        activityIds.add(activityId);
        explanationRefs.add(explanationRef);
        return deepFreeze({
            explanationRef,
            episodeId,
            sessionId,
            sessionOrdinal: raw.sessionOrdinal,
            taskId,
            activityId,
            family: raw.family,
            errorKind: raw.errorKind,
            textByLocale: exactLocalizedText(raw.textByLocale),
            sourceCatalogFingerprint: raw.sourceCatalogFingerprint,
        });
    });
    const body = {
        schemaVersion: exports.LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_LEARNER_SCHEMA_V1,
        catalogId,
        packageId,
        targetLanguage: value.targetLanguage,
        episodeId,
        episodeOrdinal: value.episodeOrdinal,
        interfaceLocales: generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES,
        entries: Object.freeze(entries),
        entryCount: exports.LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_COUNT_V1,
        sourceCatalogFingerprint: value.sourceCatalogFingerprint,
        contentOriginAuthority: "unverified_selected_preview_copy",
        answerKeyAuthority: "none_structural_fields_only_semantic_qa_required",
        runtimeAuthority: "learner_copy_only",
        publicationAuthority: "none",
        releaseAuthority: false,
    };
    if (typeof value.projectionFingerprint !== "string" ||
        value.projectionFingerprint !== (0, decision_registry_1.hashCanonicalBody)(body))
        fail("learning_v2_error_explanation_projection_fingerprint_invalid");
    const result = deepFreeze({
        ...body,
        projectionFingerprint: value.projectionFingerprint,
    });
    learnerProjectionHandles.add(result);
    return result;
}
function resolveLearningV2ActivityErrorExplanationV1(projection, input) {
    if (typeof projection !== "object" ||
        projection === null ||
        !learnerProjectionHandles.has(projection) ||
        !generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES.includes(input.interfaceLocale))
        fail("learning_v2_error_explanation_projection_handle_invalid");
    const entry = projection.entries.find((candidate) => candidate.taskId === input.taskId &&
        candidate.activityId === input.activityId);
    if (!entry)
        fail("learning_v2_error_explanation_runtime_entry_missing");
    return Object.freeze({
        explanationRef: entry.explanationRef,
        localizedText: entry.textByLocale[input.interfaceLocale],
    });
}
//# sourceMappingURL=activity_error_explanation_catalog_v1.js.map