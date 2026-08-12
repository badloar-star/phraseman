"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateV2SessionSet = void 0;
const activity_1 = require("./activity");
const identities_1 = require("./identities");
const BODY_KEYS = [
    "schemaVersion",
    "episodeId",
    "version",
    "sessions",
    "optionalPracticeSlots",
];
const SESSION_KEYS = [
    "sessionId",
    "ordinal",
    "zone",
    "targetSeconds",
    "cards",
];
const CARD_KEYS = [
    "cardId",
    "contentItemId",
    "objectiveId",
    "family",
    "learningFunction",
    "support",
    "promptId",
    "promptNovelty",
];
const CARD_KEYS_V2 = [...CARD_KEYS, "activityId"];
const OPTIONAL_KEYS = [
    "slotId",
    "episodeId",
    "capabilityId",
    "family",
    "sourcePriority",
    "expectedSeconds",
    "requiredForProgress",
    "canWriteMastery",
];
const LEARNING_FUNCTIONS = new Set([
    "notice",
    "comprehend",
    "retrieve",
    "discriminate",
    "assemble",
    "pronounce",
    "respond",
    "transfer",
    "review",
]);
const SUPPORT_LEVELS = new Set([
    "model",
    "full_text",
    "partial_cue",
    "visual_only",
    "none",
]);
const REQUIRED_SESSION_ALLOWED_FAMILIES = new Set([
    "phrase_builder",
    "listen_choose",
    "sound_contrast",
    "listen_build_dictation",
    "context_gap_grammar",
    "speed_match",
    "scripted_repeat_compare",
]);
/**
 * Copies canonical JSON data without invoking accessors. Non-enumerable or
 * symbol keys, accessors, cycles, sparse arrays, exotic prototypes and Proxy
 * trap failures are rejected before semantic validation reads any field.
 */
const snapshotSessionSetInput = (input) => {
    const active = new WeakSet();
    const visit = (value) => {
        if (value === null ||
            typeof value === "string" ||
            typeof value === "boolean") {
            return value;
        }
        if (typeof value === "number") {
            if (!Number.isFinite(value))
                throw new Error("non-canonical number");
            return value;
        }
        if (typeof value !== "object")
            throw new Error("non-JSON value");
        const objectValue = value;
        if (active.has(objectValue))
            throw new Error("cyclic input");
        active.add(objectValue);
        try {
            const prototype = Reflect.getPrototypeOf(objectValue);
            const ownKeys = Reflect.ownKeys(objectValue);
            if (Array.isArray(value)) {
                const lengthDescriptor = Reflect.getOwnPropertyDescriptor(objectValue, "length");
                if (prototype !== Array.prototype ||
                    !lengthDescriptor ||
                    lengthDescriptor.get ||
                    lengthDescriptor.set ||
                    lengthDescriptor.enumerable !== false ||
                    !Object.prototype.hasOwnProperty.call(lengthDescriptor, "value") ||
                    !Number.isSafeInteger(lengthDescriptor.value) ||
                    Number(lengthDescriptor.value) < 0) {
                    throw new Error("non-canonical array");
                }
                const length = Number(lengthDescriptor.value);
                const entries = [];
                for (const key of ownKeys) {
                    if (key === "length")
                        continue;
                    if (typeof key !== "string" || !/^(0|[1-9]\d*)$/.test(key)) {
                        throw new Error("non-canonical array key");
                    }
                    const index = Number(key);
                    const descriptor = Reflect.getOwnPropertyDescriptor(objectValue, key);
                    if (!Number.isSafeInteger(index) ||
                        index < 0 ||
                        index >= length ||
                        !descriptor ||
                        descriptor.get ||
                        descriptor.set ||
                        descriptor.enumerable !== true ||
                        !Object.prototype.hasOwnProperty.call(descriptor, "value")) {
                        throw new Error("non-canonical array entry");
                    }
                    entries.push({ index, value: descriptor.value });
                }
                if (ownKeys.length !== length + 1 || entries.length !== length) {
                    throw new Error("sparse array");
                }
                const snapshot = new Array(length);
                for (const entry of entries)
                    snapshot[entry.index] = visit(entry.value);
                return snapshot;
            }
            if (prototype !== Object.prototype && prototype !== null) {
                throw new Error("non-canonical object prototype");
            }
            if (ownKeys.some((key) => typeof key !== "string")) {
                throw new Error("symbol key");
            }
            const snapshot = prototype === null
                ? Object.create(null)
                : {};
            for (const key of ownKeys) {
                const descriptor = Reflect.getOwnPropertyDescriptor(objectValue, key);
                if (!descriptor ||
                    descriptor.get ||
                    descriptor.set ||
                    descriptor.enumerable !== true ||
                    !Object.prototype.hasOwnProperty.call(descriptor, "value")) {
                    throw new Error("non-canonical object field");
                }
                Object.defineProperty(snapshot, key, {
                    configurable: true,
                    enumerable: true,
                    value: visit(descriptor.value),
                    writable: true,
                });
            }
            return snapshot;
        }
        finally {
            active.delete(objectValue);
        }
    };
    try {
        return { ok: true, value: visit(input) };
    }
    catch {
        return { ok: false };
    }
};
const isRecord = (value) => value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype ||
        Object.getPrototypeOf(value) === null);
const hasExactKeys = (value, expected) => {
    const actual = Object.keys(value).sort();
    const sortedExpected = [...expected].sort();
    return (actual.length === sortedExpected.length &&
        actual.every((key, index) => key === sortedExpected[index]));
};
const isIdentity = (value) => typeof value === "string" && identities_1.V2_IDENTITY_REGEX.test(value);
const expectedZone = (index) => index < 4 ? "understand" : index < 8 ? "use" : "master";
const fail = (issues) => ({
    ok: false,
    issues: [...new Set(issues)],
});
const validateV2SessionSet = (input) => {
    const snapshot = snapshotSessionSetInput(input);
    if (snapshot.ok === false)
        return fail(["session_set_input_invalid"]);
    input = snapshot.value;
    if (!isRecord(input))
        return fail(["session_set_invalid"]);
    if (!hasExactKeys(input, BODY_KEYS))
        return fail(["session_set_field_unknown"]);
    const issues = [];
    const isV2 = input.schemaVersion === "v2-session-set.v2";
    if (input.schemaVersion !== "v2-session-set.v1" && !isV2)
        issues.push("session_set_schema_version");
    if (!isIdentity(input.episodeId) ||
        !Number.isSafeInteger(input.version) ||
        Number(input.version) < 1)
        issues.push("session_set_identity");
    if (!Array.isArray(input.sessions))
        return fail([...issues, "session_set_required_count"]);
    if (input.sessions.length !== 12)
        issues.push("session_set_required_count");
    const sessionIds = new Set();
    const cardIds = new Set();
    input.sessions.forEach((candidate, index) => {
        if (!isRecord(candidate) || !hasExactKeys(candidate, SESSION_KEYS)) {
            issues.push("session_field_invalid");
            return;
        }
        if (!isIdentity(candidate.sessionId) || sessionIds.has(candidate.sessionId))
            issues.push("session_identity_invalid");
        else
            sessionIds.add(candidate.sessionId);
        if (candidate.ordinal !== index + 1 ||
            candidate.zone !== expectedZone(index))
            issues.push("session_set_required_order");
        if (!Number.isSafeInteger(candidate.targetSeconds) ||
            Number(candidate.targetSeconds) < 150 ||
            Number(candidate.targetSeconds) > 360)
            issues.push("session_target_seconds");
        if (!Array.isArray(candidate.cards) ||
            candidate.cards.length !== 12) {
            issues.push("session_card_count");
            return;
        }
        const families = new Set();
        for (const card of candidate.cards) {
            if (!isRecord(card) || !hasExactKeys(card, isV2 ? CARD_KEYS_V2 : CARD_KEYS)) {
                issues.push("session_card_invalid");
                continue;
            }
            if (!isIdentity(card.cardId)) {
                issues.push("session_card_identity_invalid");
            }
            else if (cardIds.has(card.cardId)) {
                issues.push("session_set_duplicate_card_id");
            }
            else {
                cardIds.add(card.cardId);
            }
            if (!isIdentity(card.contentItemId) ||
                !isIdentity(card.objectiveId) ||
                !isIdentity(card.promptId) ||
                !activity_1.V2_ACTIVITY_FAMILIES.includes(card.family) ||
                !LEARNING_FUNCTIONS.has(card.learningFunction) ||
                !SUPPORT_LEVELS.has(card.support) ||
                !["trained", "varied", "novel"].includes(String(card.promptNovelty)))
                issues.push("session_card_invalid");
            if (isV2 && !isIdentity(card.activityId)) {
                issues.push("session_card_activity_invalid");
            }
            if (typeof card.family !== "string" ||
                !REQUIRED_SESSION_ALLOWED_FAMILIES.has(card.family)) {
                issues.push("session_card_family_unapproved");
            }
            if (typeof card.family === "string")
                families.add(card.family);
        }
        if (families.size < 3 || families.size > 4)
            issues.push("session_family_count");
    });
    if (!Array.isArray(input.optionalPracticeSlots)) {
        issues.push("optional_practice_slots_invalid");
    }
    else {
        if (input.optionalPracticeSlots.length > 2)
            issues.push("optional_practice_slot_count");
        const optionalSlotIds = new Set();
        const optionalCapabilityIds = new Set();
        for (const slot of input.optionalPracticeSlots) {
            if (!isRecord(slot) || !hasExactKeys(slot, OPTIONAL_KEYS)) {
                issues.push("optional_practice_slot_invalid");
                continue;
            }
            if (slot.requiredForProgress !== false)
                issues.push("optional_practice_progress_forbidden");
            if (slot.canWriteMastery !== false)
                issues.push("optional_practice_mastery_forbidden");
            if (isIdentity(slot.slotId)) {
                if (optionalSlotIds.has(slot.slotId)) {
                    issues.push("session_set_duplicate_optional_slot_id");
                }
                else {
                    optionalSlotIds.add(slot.slotId);
                }
            }
            if (isIdentity(slot.capabilityId)) {
                if (optionalCapabilityIds.has(slot.capabilityId)) {
                    issues.push("session_set_duplicate_optional_capability_id");
                }
                else {
                    optionalCapabilityIds.add(slot.capabilityId);
                }
            }
            if (!isIdentity(slot.slotId) ||
                slot.episodeId !== input.episodeId ||
                !isIdentity(slot.capabilityId) ||
                !activity_1.V2_ACTIVITY_FAMILIES.includes(slot.family) ||
                !["mistake", "due", "personal_plan", "current_unit"].includes(String(slot.sourcePriority)) ||
                !Number.isSafeInteger(slot.expectedSeconds) ||
                Number(slot.expectedSeconds) < 1)
                issues.push("optional_practice_slot_invalid");
        }
    }
    return issues.length > 0
        ? fail(issues)
        : { ok: true, issues: [], value: input };
};
exports.validateV2SessionSet = validateV2SessionSet;
//# sourceMappingURL=session.js.map