"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEARNING_V2_ACTIVITY_POST_TERMINAL_CARD_COUNT_V1 = exports.LEARNING_V2_ACTIVITY_POST_TERMINAL_CARD_CATALOG_MAX_BYTES_V1 = exports.LEARNING_V2_ACTIVITY_POST_TERMINAL_CARD_CATALOG_SCHEMA_V1 = void 0;
exports.materializeLearningV2ActivityPostTerminalCardCatalogV1 = materializeLearningV2ActivityPostTerminalCardCatalogV1;
exports.parseLearningV2ActivityPostTerminalCardCatalogV1 = parseLearningV2ActivityPostTerminalCardCatalogV1;
exports.encodeLearningV2ActivityPostTerminalCardCatalogV1 = encodeLearningV2ActivityPostTerminalCardCatalogV1;
exports.isLearningV2ActivityPostTerminalCardCatalogV1 = isLearningV2ActivityPostTerminalCardCatalogV1;
exports.getLearningV2ActivityPostTerminalCardEntryV1 = getLearningV2ActivityPostTerminalCardEntryV1;
const generator_course_contract_1 = require("../content/generator_course_contract");
const decision_registry_1 = require("../policies/decision_registry");
const activity_learner_action_resource_v1_1 = require("./activity_learner_action_resource_v1");
exports.LEARNING_V2_ACTIVITY_POST_TERMINAL_CARD_CATALOG_SCHEMA_V1 = "learning-v2-activity-post-terminal-card-catalog.v1";
exports.LEARNING_V2_ACTIVITY_POST_TERMINAL_CARD_CATALOG_MAX_BYTES_V1 = 512 * 1024;
exports.LEARNING_V2_ACTIVITY_POST_TERMINAL_CARD_COUNT_V1 = 12;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const HASH_RE = /^[a-f0-9]{64}$/u;
const LANGUAGE_RE = /^[a-z]{2,3}(?:-[A-Za-z0-9]{1,8}){0,15}$/u;
const CONTROL_OR_BIDI_RE = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u;
const RESERVED_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const catalogHandles = new WeakSet();
const ROOT_KEYS = Object.freeze([
    "schemaVersion",
    "catalogId",
    "packageId",
    "episodeId",
    "targetLanguage",
    "sessionId",
    "sessionOrdinal",
    "actionResourceFingerprint",
    "entries",
    "entryCount",
    "contentOriginAuthority",
    "terminalEvidenceAuthority",
    "clientDelivery",
    "artifactStorageAuthority",
    "runtimeAuthority",
    "publicationAuthority",
    "releaseAuthority",
    "catalogFingerprint",
]);
const ENTRY_KEYS = Object.freeze([
    "taskId",
    "activityId",
    "promptId",
    "slot",
    "savablePhraseRef",
    "sourceVisibility",
    "targetText",
    "meaningByLocale",
    "provenanceFingerprint",
    "entryFingerprint",
]);
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
    if (typeof value !== "string" ||
        !ID_RE.test(value) ||
        RESERVED_KEYS.has(value))
        fail(code);
    return value;
}
function exactHash(value, code) {
    if (typeof value !== "string" || !HASH_RE.test(value))
        fail(code);
    return value;
}
function exactText(value, code) {
    if (typeof value !== "string" ||
        value.length < 1 ||
        value.trim() !== value ||
        value.normalize("NFC") !== value ||
        CONTROL_OR_BIDI_RE.test(value) ||
        (0, decision_registry_1.utf8ByteLengthV1)(value) > 4_000)
        fail(code);
    return value;
}
function exactMeanings(value) {
    if (!isPlainObject(value))
        fail("learning_v2_post_terminal_card_meanings_invalid");
    const keys = Object.keys(value);
    if (keys.length !== generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES.length ||
        generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES.some((locale) => !keys.includes(locale)))
        fail("learning_v2_post_terminal_card_meanings_invalid");
    const result = {};
    for (const locale of generator_course_contract_1.LEARNING_V2_INTERFACE_LOCALES) {
        result[locale] = exactText(value[locale], "learning_v2_post_terminal_card_meanings_invalid");
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
        if (nodes > 4_000 || current.depth > 12)
            fail("learning_v2_post_terminal_card_complexity_invalid");
        const value = current.value;
        if (typeof value === "string") {
            if (value.length > 4_096 || value.normalize("NFC") !== value)
                fail("learning_v2_post_terminal_card_string_invalid");
            continue;
        }
        if (value === null || typeof value === "boolean")
            continue;
        if (typeof value === "number") {
            if (!Number.isSafeInteger(value) || Object.is(value, -0))
                fail("learning_v2_post_terminal_card_number_invalid");
            continue;
        }
        if (Array.isArray(value)) {
            arrayEntries += value.length;
            if (arrayEntries > 256)
                fail("learning_v2_post_terminal_card_complexity_invalid");
            value.forEach((child) => stack.push({ value: child, depth: current.depth + 1 }));
            continue;
        }
        if (!isPlainObject(value))
            fail("learning_v2_post_terminal_card_json_invalid");
        const keys = Object.keys(value);
        if (keys.length > 32 ||
            keys.some((key) => RESERVED_KEYS.has(key) || key.normalize("NFC") !== key))
            fail("learning_v2_post_terminal_card_fields_invalid");
        keys.forEach((key) => stack.push({ value: value[key], depth: current.depth + 1 }));
    }
}
function parseEntry(value) {
    if (!isPlainObject(value))
        fail("learning_v2_post_terminal_card_entry_invalid");
    exactKeys(value, ENTRY_KEYS, "learning_v2_post_terminal_card_entry_invalid");
    const taskId = exactId(value.taskId, "learning_v2_post_terminal_card_entry_invalid");
    const activityId = exactId(value.activityId, "learning_v2_post_terminal_card_entry_invalid");
    const promptId = exactId(value.promptId, "learning_v2_post_terminal_card_entry_invalid");
    if (!Number.isSafeInteger(value.slot) ||
        Number(value.slot) < 1 ||
        Number(value.slot) > 12)
        fail("learning_v2_post_terminal_card_entry_invalid");
    const savablePhraseRef = exactHash(value.savablePhraseRef, "learning_v2_post_terminal_card_entry_invalid");
    if (value.sourceVisibility !== "already_visible_prompt" &&
        value.sourceVisibility !== "post_terminal_only")
        fail("learning_v2_post_terminal_card_entry_invalid");
    const targetText = exactText(value.targetText, "learning_v2_post_terminal_card_entry_invalid");
    const meaningByLocale = exactMeanings(value.meaningByLocale);
    const provenanceFingerprint = exactHash(value.provenanceFingerprint, "learning_v2_post_terminal_card_entry_invalid");
    const body = {
        taskId,
        activityId,
        promptId,
        slot: Number(value.slot),
        savablePhraseRef,
        sourceVisibility: value.sourceVisibility,
        targetText,
        meaningByLocale,
        provenanceFingerprint,
    };
    const entryFingerprint = exactHash(value.entryFingerprint, "learning_v2_post_terminal_card_entry_invalid");
    if ((0, decision_registry_1.hashCanonicalBody)(body) !== entryFingerprint)
        fail("learning_v2_post_terminal_card_entry_fingerprint_invalid");
    return Object.freeze({ ...body, entryFingerprint });
}
function validateCatalog(value) {
    if (!isPlainObject(value))
        fail("learning_v2_post_terminal_card_catalog_invalid");
    exactKeys(value, ROOT_KEYS, "learning_v2_post_terminal_card_catalog_invalid");
    if (value.schemaVersion !==
        exports.LEARNING_V2_ACTIVITY_POST_TERMINAL_CARD_CATALOG_SCHEMA_V1 ||
        typeof value.targetLanguage !== "string" ||
        !LANGUAGE_RE.test(value.targetLanguage))
        fail("learning_v2_post_terminal_card_catalog_invalid");
    const catalogId = exactId(value.catalogId, "learning_v2_post_terminal_card_catalog_invalid");
    const packageId = exactId(value.packageId, "learning_v2_post_terminal_card_catalog_invalid");
    const episodeId = exactId(value.episodeId, "learning_v2_post_terminal_card_catalog_invalid");
    const sessionId = exactId(value.sessionId, "learning_v2_post_terminal_card_catalog_invalid");
    if (!Number.isSafeInteger(value.sessionOrdinal) ||
        Number(value.sessionOrdinal) < 1 ||
        Number(value.sessionOrdinal) > 12)
        fail("learning_v2_post_terminal_card_catalog_invalid");
    const actionResourceFingerprint = exactHash(value.actionResourceFingerprint, "learning_v2_post_terminal_card_catalog_invalid");
    if (!Array.isArray(value.entries) ||
        value.entries.length !== exports.LEARNING_V2_ACTIVITY_POST_TERMINAL_CARD_COUNT_V1 ||
        value.entryCount !== exports.LEARNING_V2_ACTIVITY_POST_TERMINAL_CARD_COUNT_V1)
        fail("learning_v2_post_terminal_card_count_invalid");
    const entries = value.entries.map(parseEntry);
    const taskIds = new Set();
    const activityIds = new Set();
    const refs = new Set();
    entries.forEach((entry, index) => {
        if (entry.slot !== index + 1 ||
            taskIds.has(entry.taskId) ||
            activityIds.has(entry.activityId) ||
            refs.has(entry.savablePhraseRef))
            fail("learning_v2_post_terminal_card_identity_invalid");
        taskIds.add(entry.taskId);
        activityIds.add(entry.activityId);
        refs.add(entry.savablePhraseRef);
    });
    if (value.contentOriginAuthority !== "unverified_owner_or_generator_claim" ||
        value.terminalEvidenceAuthority !== "none_runtime_terminal_gate_required" ||
        value.clientDelivery !== "forbidden" ||
        value.artifactStorageAuthority !== "none" ||
        value.runtimeAuthority !== "none" ||
        value.publicationAuthority !== "none" ||
        value.releaseAuthority !== false)
        fail("learning_v2_post_terminal_card_authority_invalid");
    const body = {
        schemaVersion: exports.LEARNING_V2_ACTIVITY_POST_TERMINAL_CARD_CATALOG_SCHEMA_V1,
        catalogId,
        packageId,
        episodeId,
        targetLanguage: value.targetLanguage,
        sessionId,
        sessionOrdinal: Number(value.sessionOrdinal),
        actionResourceFingerprint,
        entries: Object.freeze(entries),
        entryCount: exports.LEARNING_V2_ACTIVITY_POST_TERMINAL_CARD_COUNT_V1,
        contentOriginAuthority: "unverified_owner_or_generator_claim",
        terminalEvidenceAuthority: "none_runtime_terminal_gate_required",
        clientDelivery: "forbidden",
        artifactStorageAuthority: "none",
        runtimeAuthority: "none",
        publicationAuthority: "none",
        releaseAuthority: false,
    };
    const catalogFingerprint = exactHash(value.catalogFingerprint, "learning_v2_post_terminal_card_catalog_invalid");
    if ((0, decision_registry_1.hashCanonicalBody)(body) !== catalogFingerprint)
        fail("learning_v2_post_terminal_card_catalog_fingerprint_invalid");
    return deepFreeze({ ...body, catalogFingerprint });
}
function materializeLearningV2ActivityPostTerminalCardCatalogV1(input) {
    if (!isPlainObject(input) ||
        Object.keys(input).sort().join("|") !==
            "actionResource|catalogId|declarations|packageId" ||
        !(0, activity_learner_action_resource_v1_1.isLearningV2ActivityLearnerActionResourceV1)(input.actionResource) ||
        !Array.isArray(input.declarations) ||
        input.declarations.length !==
            exports.LEARNING_V2_ACTIVITY_POST_TERMINAL_CARD_COUNT_V1)
        fail("learning_v2_post_terminal_card_materialization_invalid");
    const declarations = new Map();
    for (const declaration of input.declarations) {
        if (!isPlainObject(declaration) ||
            Object.keys(declaration).sort().join("|") !==
                "meaningByLocale|provenanceFingerprint|targetText|taskId" ||
            typeof declaration.taskId !== "string" ||
            declarations.has(declaration.taskId))
            fail("learning_v2_post_terminal_card_materialization_invalid");
        declarations.set(declaration.taskId, declaration);
    }
    const entries = input.actionResource.entries.map((actionEntry) => {
        const declaration = declarations.get(actionEntry.taskId);
        if (!declaration)
            fail("learning_v2_post_terminal_card_materialization_invalid");
        const targetText = exactText(declaration.targetText, "learning_v2_post_terminal_card_materialization_invalid");
        if (actionEntry.save.resolution === "learner_visible_prompt" &&
            actionEntry.save.targetText !== targetText)
            fail("learning_v2_post_terminal_card_visible_text_mismatch");
        const body = {
            taskId: actionEntry.taskId,
            activityId: actionEntry.activityId,
            promptId: actionEntry.promptId,
            slot: actionEntry.slot,
            savablePhraseRef: actionEntry.save.savablePhraseRef,
            sourceVisibility: actionEntry.save.resolution === "learner_visible_prompt"
                ? "already_visible_prompt"
                : "post_terminal_only",
            targetText,
            meaningByLocale: exactMeanings(declaration.meaningByLocale),
            provenanceFingerprint: exactHash(declaration.provenanceFingerprint, "learning_v2_post_terminal_card_materialization_invalid"),
        };
        return Object.freeze({
            ...body,
            entryFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
        });
    });
    if (declarations.size !== entries.length)
        fail("learning_v2_post_terminal_card_materialization_invalid");
    const body = {
        schemaVersion: exports.LEARNING_V2_ACTIVITY_POST_TERMINAL_CARD_CATALOG_SCHEMA_V1,
        catalogId: input.catalogId,
        packageId: input.packageId,
        episodeId: input.actionResource.episodeId,
        targetLanguage: input.actionResource.targetLanguage,
        sessionId: input.actionResource.sessionId,
        sessionOrdinal: input.actionResource.sessionOrdinal,
        actionResourceFingerprint: input.actionResource.resourceFingerprint,
        entries,
        entryCount: exports.LEARNING_V2_ACTIVITY_POST_TERMINAL_CARD_COUNT_V1,
        contentOriginAuthority: "unverified_owner_or_generator_claim",
        terminalEvidenceAuthority: "none_runtime_terminal_gate_required",
        clientDelivery: "forbidden",
        artifactStorageAuthority: "none",
        runtimeAuthority: "none",
        publicationAuthority: "none",
        releaseAuthority: false,
    };
    return parseLearningV2ActivityPostTerminalCardCatalogV1((0, decision_registry_1.canonicalJsonV1)({
        ...body,
        catalogFingerprint: (0, decision_registry_1.hashCanonicalBody)(body),
    }));
}
function parseLearningV2ActivityPostTerminalCardCatalogV1(raw) {
    if (typeof raw !== "string" ||
        raw.length > exports.LEARNING_V2_ACTIVITY_POST_TERMINAL_CARD_CATALOG_MAX_BYTES_V1 ||
        (0, decision_registry_1.utf8ByteLengthV1)(raw) >
            exports.LEARNING_V2_ACTIVITY_POST_TERMINAL_CARD_CATALOG_MAX_BYTES_V1)
        fail("learning_v2_post_terminal_card_raw_invalid");
    let candidate;
    try {
        candidate = JSON.parse(raw);
    }
    catch {
        fail("learning_v2_post_terminal_card_json_invalid");
    }
    preflightJson(candidate);
    if ((0, decision_registry_1.canonicalJsonV1)(candidate) !== raw)
        fail("learning_v2_post_terminal_card_noncanonical");
    const result = validateCatalog(candidate);
    catalogHandles.add(result);
    return result;
}
function encodeLearningV2ActivityPostTerminalCardCatalogV1(catalog) {
    if (!isLearningV2ActivityPostTerminalCardCatalogV1(catalog))
        fail("learning_v2_post_terminal_card_handle_invalid");
    return (0, decision_registry_1.canonicalJsonV1)(catalog);
}
function isLearningV2ActivityPostTerminalCardCatalogV1(value) {
    return (typeof value === "object" && value !== null && catalogHandles.has(value));
}
function getLearningV2ActivityPostTerminalCardEntryV1(catalog, actionResource, taskId, activityId, savablePhraseRef) {
    if (!isLearningV2ActivityPostTerminalCardCatalogV1(catalog) ||
        !(0, activity_learner_action_resource_v1_1.isLearningV2ActivityLearnerActionResourceV1)(actionResource) ||
        catalog.actionResourceFingerprint !== actionResource.resourceFingerprint)
        fail("learning_v2_post_terminal_card_handle_invalid");
    const actionEntry = (0, activity_learner_action_resource_v1_1.getLearningV2ActivityLearnerActionEntryV1)(actionResource, taskId, activityId);
    if (actionEntry.save.savablePhraseRef !== savablePhraseRef)
        fail("learning_v2_post_terminal_card_identity_mismatch");
    const entry = catalog.entries.find((candidate) => candidate.taskId === taskId &&
        candidate.activityId === activityId &&
        candidate.savablePhraseRef === savablePhraseRef);
    if (!entry)
        fail("learning_v2_post_terminal_card_identity_mismatch");
    return entry;
}
//# sourceMappingURL=activity_post_terminal_card_catalog_v1.js.map