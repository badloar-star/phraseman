"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildLearningEvidenceTupleKey = exports.validateLearningNonAssessmentRef = exports.validateLearningEvidenceRef = exports.validateLearningMaterialization = exports.buildLearningNonAssessmentRef = exports.buildLearningEvidenceRef = exports.validateLearningNonAssessmentBody = exports.validateLearningEvidenceBody = void 0;
const decision_registry_1 = require("../policies/decision_registry");
const decision_registry_2 = require("../policies/decision_registry");
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const hasOnlyKeys = (value, keys) => Object.keys(value).every((key) => keys.includes(key));
const isAttemptRef = (value) => isRecord(value) &&
    hasOnlyKeys(value, ["schemaVersion", "opId", "attemptBodyHash"]) &&
    value.schemaVersion === "v2-attempt-ref.v1" &&
    typeof value.opId === "string" &&
    value.opId.length > 0 &&
    /^[a-f0-9]{64}$/.test(String(value.attemptBodyHash));
const isHash = (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const isTupleKey = (value) => typeof value === "string" && /^letk1\.[A-Za-z0-9_-]+$/.test(value);
const isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
const isPhase = (value) => value === "encounter_build" ||
    value === "near_transfer" ||
    value === "independent_probe" ||
    value === "delayed_probe";
const isConstruct = (value) => value === "semantic" ||
    value === "listening" ||
    value === "recall" ||
    value === "spoken" ||
    value === "interaction";
const isTargetKind = (value) => value === "objective" ||
    value === "semantic_slot" ||
    value === "critical_constraint";
const isTupleIdentity = (value) => ["nodeId", "objectiveId", "skillId", "targetId"].every((key) => isNonEmptyString(value[key])) &&
    isConstruct(value.construct) &&
    isPhase(value.phase) &&
    isTargetKind(value.targetKind);
const sameAttemptRef = (left, right) => isAttemptRef(left) &&
    left.schemaVersion === right.schemaVersion &&
    left.opId === right.opId &&
    left.attemptBodyHash === right.attemptBodyHash;
const validateLearningEvidenceBody = (value) => {
    if (!isRecord(value) ||
        !hasOnlyKeys(value, [
            "schemaVersion",
            "observationId",
            "nodeId",
            "objectiveId",
            "skillId",
            "construct",
            "phase",
            "targetKind",
            "targetId",
            "assessmentStatus",
            "outcome",
            "sourceAttempt",
            "policyId",
            "policyVersion",
            "provenance",
            "route",
            "timing",
        ]) ||
        value.schemaVersion !== "learning-evidence-body.v1" ||
        "evidenceBodyHash" in value ||
        !isAttemptRef(value.sourceAttempt) ||
        !isRecord(value.provenance) ||
        !isRecord(value.route) ||
        !isRecord(value.timing))
        return { ok: false };
    if (!isTupleIdentity(value) ||
        value.assessmentStatus !== "assessed" ||
        (value.outcome !== "success" && value.outcome !== "needs_work") ||
        !isNonEmptyString(value.observationId) ||
        !isNonEmptyString(value.policyId) ||
        typeof value.policyVersion !== "number" ||
        !Number.isInteger(value.policyVersion) ||
        value.policyVersion < 1 ||
        !isAttemptRef(value.sourceAttempt))
        return { ok: false };
    const phase = value.provenance.phase;
    const hints = isRecord(value.provenance.support)
        ? value.provenance.support.hintsUsed
        : undefined;
    const runtime = isRecord(value.route.input)
        ? value.route.input.runtimeEvidenceRef
        : undefined;
    const delayed = phase === "delayed_probe";
    const provenanceOk = isRecord(value.provenance) &&
        hasOnlyKeys(value.provenance, ["phase", "support", "context", "prompt"]) &&
        phase === value.phase &&
        isPhase(phase) &&
        isRecord(value.provenance.support) &&
        hasOnlyKeys(value.provenance.support, ["hintsUsed"]) &&
        typeof hints === "number" &&
        Number.isInteger(hints) &&
        hints >= 0 &&
        (phase === "independent_probe" || phase === "delayed_probe"
            ? hints === 0
            : true) &&
        isRecord(value.provenance.context) &&
        hasOnlyKeys(value.provenance.context, ["contextId"]) &&
        isNonEmptyString(value.provenance.context.contextId) &&
        isRecord(value.provenance.prompt) &&
        hasOnlyKeys(value.provenance.prompt, ["promptId"]) &&
        isNonEmptyString(value.provenance.prompt.promptId);
    const routeOk = isRecord(value.route) &&
        hasOnlyKeys(value.route, ["kind", "input"]) &&
        isRecord(value.route.input) &&
        hasOnlyKeys(value.route.input, ["source", "runtimeEvidenceRef"]) &&
        isRecord(runtime) &&
        hasOnlyKeys(runtime, ["runtimeEvidenceHash", "sourceAttempt"]) &&
        isHash(runtime.runtimeEvidenceHash) &&
        sameAttemptRef(runtime.sourceAttempt, value.sourceAttempt) &&
        ((value.route.kind === "voice" &&
            value.route.input.source === "microphone") ||
            (value.route.kind === "non_voice" &&
                ["tap", "word_bank", "keyboard", "accessibility_alternative"].includes(String(value.route.input.source)) &&
                value.construct !== "spoken"));
    const timingOk = isRecord(value.timing) &&
        (delayed
            ? hasOnlyKeys(value.timing, [
                "occurredAtServer",
                "assignmentRef",
                "launchReceiptRef",
                "timingReceiptRef",
            ]) &&
                [
                    "occurredAtServer",
                    "assignmentRef",
                    "launchReceiptRef",
                    "timingReceiptRef",
                ].every((key) => isNonEmptyString(value.timing[key]))
            : hasOnlyKeys(value.timing, ["occurredAt"]) &&
                isNonEmptyString(value.timing.occurredAt));
    return {
        ok: provenanceOk && routeOk && timingOk,
    };
};
exports.validateLearningEvidenceBody = validateLearningEvidenceBody;
const validateLearningNonAssessmentBody = (value) => {
    if (!isRecord(value) ||
        !hasOnlyKeys(value, [
            "schemaVersion",
            "nonAssessmentId",
            "nodeId",
            "objectiveId",
            "skillId",
            "construct",
            "phase",
            "targetKind",
            "targetId",
            "sourceAttempt",
            "occurredAt",
            "assessmentStatus",
            "reasonCode",
            "assignmentRef",
            "launchReceiptRef",
            "timingReceiptRef",
            "failureReceiptRef",
        ]) ||
        value.schemaVersion !== "learning-non-assessment-body.v1" ||
        "nonAssessmentBodyHash" in value ||
        !isAttemptRef(value.sourceAttempt) ||
        typeof value.reasonCode !== "string" ||
        !isTupleIdentity(value) ||
        !isNonEmptyString(value.nonAssessmentId) ||
        !isNonEmptyString(value.occurredAt))
        return { ok: false };
    const delayed = value.phase === "delayed_probe";
    if (!delayed && value.assessmentStatus === "not_assessed_for_window")
        return { ok: false };
    if (value.assessmentStatus === "not_assessed_for_window")
        return {
            ok: value.reasonCode === "outside_pinned_assessment_window" &&
                isNonEmptyString(value.assignmentRef) &&
                isNonEmptyString(value.launchReceiptRef) &&
                isNonEmptyString(value.timingReceiptRef) &&
                value.failureReceiptRef === undefined,
        };
    if (value.assessmentStatus === "not_assessed_system")
        return {
            ok: delayed &&
                [
                    "assignment_missing",
                    "assignment_stale",
                    "launch_missing",
                    "launch_expired",
                    "server_timing_unavailable",
                ].includes(value.reasonCode) &&
                isNonEmptyString(value.failureReceiptRef) &&
                value.assignmentRef === undefined &&
                value.launchReceiptRef === undefined &&
                value.timingReceiptRef === undefined,
        };
    if (value.assessmentStatus === "not_assessed_accessibility")
        return {
            ok: [
                "accessibility_route_does_not_measure_construct",
                "microphone_unavailable",
            ].includes(value.reasonCode) &&
                value.assignmentRef === undefined &&
                value.launchReceiptRef === undefined &&
                value.timingReceiptRef === undefined &&
                value.failureReceiptRef === undefined,
        };
    if (value.assessmentStatus === "invalid")
        return {
            ok: [
                "uncertain_measurement",
                "invalid_audio_or_system",
                "technical_failure",
                "support_or_hint_contract_violated",
            ].includes(value.reasonCode) &&
                value.assignmentRef === undefined &&
                value.launchReceiptRef === undefined &&
                value.timingReceiptRef === undefined &&
                value.failureReceiptRef === undefined,
        };
    return { ok: false };
};
exports.validateLearningNonAssessmentBody = validateLearningNonAssessmentBody;
const canonicalAttemptRefEqual = (left, right) => left.schemaVersion === right.schemaVersion &&
    left.opId === right.opId &&
    left.attemptBodyHash === right.attemptBodyHash;
const validateEvidenceRefShape = (ref) => isRecord(ref) &&
    hasOnlyKeys(ref, [
        "observationId",
        "evidenceBodyHash",
        "tupleKey",
        "sourceAttempt",
    ]) &&
    isNonEmptyString(ref.observationId) &&
    isHash(ref.evidenceBodyHash) &&
    isTupleKey(ref.tupleKey) &&
    isAttemptRef(ref.sourceAttempt);
const validateNonAssessmentRefShape = (ref) => isRecord(ref) &&
    hasOnlyKeys(ref, [
        "nonAssessmentId",
        "nonAssessmentBodyHash",
        "tupleKey",
        "sourceAttempt",
    ]) &&
    isNonEmptyString(ref.nonAssessmentId) &&
    isHash(ref.nonAssessmentBodyHash) &&
    isTupleKey(ref.tupleKey) &&
    isAttemptRef(ref.sourceAttempt);
const buildLearningEvidenceRef = (body) => {
    if (!(0, exports.validateLearningEvidenceBody)(body).ok)
        throw new Error("learning_evidence_body_invalid");
    return {
        observationId: body.observationId,
        evidenceBodyHash: (0, decision_registry_2.hashCanonicalBody)(body),
        tupleKey: (0, exports.buildLearningEvidenceTupleKey)(body),
        sourceAttempt: body.sourceAttempt,
    };
};
exports.buildLearningEvidenceRef = buildLearningEvidenceRef;
const buildLearningNonAssessmentRef = (body) => {
    if (!(0, exports.validateLearningNonAssessmentBody)(body).ok)
        throw new Error("learning_non_assessment_body_invalid");
    return {
        nonAssessmentId: body.nonAssessmentId,
        nonAssessmentBodyHash: (0, decision_registry_2.hashCanonicalBody)(body),
        tupleKey: (0, exports.buildLearningEvidenceTupleKey)(body),
        sourceAttempt: body.sourceAttempt,
    };
};
exports.buildLearningNonAssessmentRef = buildLearningNonAssessmentRef;
const validateLearningMaterialization = (body, ref) => {
    const bodyValid = body.schemaVersion === "learning-evidence-body.v1"
        ? (0, exports.validateLearningEvidenceBody)(body).ok
        : (0, exports.validateLearningNonAssessmentBody)(body).ok;
    if (!bodyValid)
        return { ok: false };
    if (body.schemaVersion === "learning-evidence-body.v1"
        ? !validateEvidenceRefShape(ref)
        : !validateNonAssessmentRefShape(ref))
        return { ok: false };
    const tupleKey = (0, exports.buildLearningEvidenceTupleKey)(body);
    if (!canonicalAttemptRefEqual(body.sourceAttempt, ref.sourceAttempt)) {
        return { ok: false };
    }
    if (ref.tupleKey !== tupleKey)
        return { ok: false };
    if (body.schemaVersion === "learning-evidence-body.v1") {
        return {
            ok: "observationId" in ref &&
                ref.observationId === body.observationId &&
                ref.evidenceBodyHash === (0, decision_registry_2.hashCanonicalBody)(body),
        };
    }
    return {
        ok: "nonAssessmentId" in ref &&
            ref.nonAssessmentId === body.nonAssessmentId &&
            ref.nonAssessmentBodyHash === (0, decision_registry_2.hashCanonicalBody)(body),
    };
};
exports.validateLearningMaterialization = validateLearningMaterialization;
const validateLearningEvidenceRef = (body, ref) => (0, exports.validateLearningMaterialization)(body, ref);
exports.validateLearningEvidenceRef = validateLearningEvidenceRef;
const validateLearningNonAssessmentRef = (body, ref) => (0, exports.validateLearningMaterialization)(body, ref);
exports.validateLearningNonAssessmentRef = validateLearningNonAssessmentRef;
const utf8Bytes = (value) => {
    const bytes = [];
    for (let index = 0; index < value.length; index += 1) {
        const codePoint = value.codePointAt(index);
        if (codePoint === undefined)
            break;
        if (codePoint >= 0xd800 && codePoint <= 0xdbff)
            index += 1;
        if (codePoint <= 0x7f) {
            bytes.push(codePoint);
        }
        else if (codePoint <= 0x7ff) {
            bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
        }
        else if (codePoint <= 0xffff) {
            bytes.push(0xe0 | (codePoint >> 12), 0x80 | ((codePoint >> 6) & 0x3f), 0x80 | (codePoint & 0x3f));
        }
        else {
            bytes.push(0xf0 | (codePoint >> 18), 0x80 | ((codePoint >> 12) & 0x3f), 0x80 | ((codePoint >> 6) & 0x3f), 0x80 | (codePoint & 0x3f));
        }
    }
    return bytes;
};
const BASE64URL_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const base64url = (value) => {
    const bytes = utf8Bytes(value);
    let encoded = "";
    for (let index = 0; index < bytes.length; index += 3) {
        const first = bytes[index];
        const second = bytes[index + 1];
        const third = bytes[index + 2];
        const packed = (first << 16) | ((second ?? 0) << 8) | (third ?? 0);
        encoded += BASE64URL_ALPHABET[(packed >> 18) & 0x3f];
        encoded += BASE64URL_ALPHABET[(packed >> 12) & 0x3f];
        if (second !== undefined)
            encoded += BASE64URL_ALPHABET[(packed >> 6) & 0x3f];
        if (third !== undefined)
            encoded += BASE64URL_ALPHABET[packed & 0x3f];
    }
    return encoded;
};
/**
 * Builds the only allowed identity key for a learning-evidence tuple.
 *
 * The versioned key prevents delimiter collisions and pins field order through
 * canonical JSON before base64url encoding.
 */
const buildLearningEvidenceTupleKey = (tuple) => `letk1.${base64url((0, decision_registry_1.canonicalJsonV1)([
    tuple.nodeId,
    tuple.objectiveId,
    tuple.skillId,
    tuple.construct,
    tuple.phase,
    tuple.targetKind,
    tuple.targetId,
]))}`;
exports.buildLearningEvidenceTupleKey = buildLearningEvidenceTupleKey;
