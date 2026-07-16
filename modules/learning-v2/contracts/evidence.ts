import { canonicalJsonV1 } from "../policies/decision_registry";
import { hashCanonicalBody } from "../policies/decision_registry";
import type { CanonicalAttemptRef } from "./attempt";

export type LearningConstruct =
  | "semantic"
  | "listening"
  | "recall"
  | "spoken"
  | "interaction";

export type LearningEvidencePhase =
  | "encounter_build"
  | "near_transfer"
  | "independent_probe"
  | "delayed_probe";

export type LearningAssessmentTargetKind =
  | "objective"
  | "semantic_slot"
  | "critical_constraint";

/** The complete identity of one declared learning-evidence tuple. */
export interface LearningEvidenceTupleIdentity {
  readonly nodeId: string;
  readonly objectiveId: string;
  readonly skillId: string;
  readonly construct: LearningConstruct;
  readonly phase: LearningEvidencePhase;
  readonly targetKind: LearningAssessmentTargetKind;
  readonly targetId: string;
}

export type LearningEvidenceTupleKey = `letk1.${string}`;

export type LearningPedagogicalProvenance =
  | {
      readonly phase: "encounter_build" | "near_transfer";
      readonly support: { readonly hintsUsed: number };
      readonly context: { readonly contextId: string };
      readonly prompt: { readonly promptId: string };
    }
  | {
      readonly phase: "independent_probe" | "delayed_probe";
      readonly support: { readonly hintsUsed: 0 };
      readonly context: { readonly contextId: string };
      readonly prompt: { readonly promptId: string };
    };
export type LearningAssessedRoute =
  | {
      readonly kind: "non_voice";
      readonly input: {
        readonly source:
          | "tap"
          | "word_bank"
          | "keyboard"
          | "accessibility_alternative";
        readonly runtimeEvidenceRef: {
          readonly runtimeEvidenceHash: string;
          readonly sourceAttempt: CanonicalAttemptRef;
        };
      };
    }
  | {
      readonly kind: "voice";
      readonly input: {
        readonly source: "microphone";
        readonly runtimeEvidenceRef: {
          readonly runtimeEvidenceHash: string;
          readonly sourceAttempt: CanonicalAttemptRef;
        };
      };
    };
export type LearningAssessedTiming =
  | { readonly occurredAt: string }
  | {
      readonly occurredAtServer: string;
      readonly assignmentRef: string;
      readonly launchReceiptRef: string;
      readonly timingReceiptRef: string;
    };

export interface LearningEvidenceBody extends LearningEvidenceTupleIdentity {
  readonly schemaVersion: "learning-evidence-body.v1";
  readonly observationId: string;
  readonly assessmentStatus: "assessed";
  readonly outcome: "success" | "needs_work";
  readonly sourceAttempt: CanonicalAttemptRef;
  readonly policyId: string;
  readonly policyVersion: number;
  readonly provenance: LearningPedagogicalProvenance;
  readonly route: LearningAssessedRoute;
  readonly timing: LearningAssessedTiming;
}

export interface LearningNonAssessmentBody extends LearningEvidenceTupleIdentity {
  readonly schemaVersion: "learning-non-assessment-body.v1";
  readonly nonAssessmentId: string;
  readonly sourceAttempt: CanonicalAttemptRef;
  readonly occurredAt: string;
  readonly assessmentStatus:
    | "not_assessed_accessibility"
    | "not_assessed_system"
    | "not_assessed_for_window"
    | "invalid";
  readonly reasonCode: string;
  readonly assignmentRef?: string;
  readonly launchReceiptRef?: string;
  readonly timingReceiptRef?: string;
  readonly failureReceiptRef?: string;
}

export interface LearningEvidenceRef {
  readonly observationId: string;
  readonly evidenceBodyHash: string;
  readonly tupleKey: LearningEvidenceTupleKey;
  readonly sourceAttempt: CanonicalAttemptRef;
}

export interface LearningNonAssessmentRef {
  readonly nonAssessmentId: string;
  readonly nonAssessmentBodyHash: string;
  readonly tupleKey: LearningEvidenceTupleKey;
  readonly sourceAttempt: CanonicalAttemptRef;
}

export type LearningMaterializationRef =
  | LearningEvidenceRef
  | LearningNonAssessmentRef;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const hasOnlyKeys = (
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean => Object.keys(value).every((key) => keys.includes(key));
const isAttemptRef = (value: unknown): value is CanonicalAttemptRef =>
  isRecord(value) &&
  hasOnlyKeys(value, ["schemaVersion", "opId", "attemptBodyHash"]) &&
  value.schemaVersion === "v2-attempt-ref.v1" &&
  typeof value.opId === "string" &&
  value.opId.length > 0 &&
  /^[a-f0-9]{64}$/.test(String(value.attemptBodyHash));
const isHash = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const isTupleKey = (value: unknown): value is LearningEvidenceTupleKey =>
  typeof value === "string" && /^letk1\.[A-Za-z0-9_-]+$/.test(value);
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;
const isPhase = (value: unknown): value is LearningEvidencePhase =>
  value === "encounter_build" ||
  value === "near_transfer" ||
  value === "independent_probe" ||
  value === "delayed_probe";
const isConstruct = (value: unknown): value is LearningConstruct =>
  value === "semantic" ||
  value === "listening" ||
  value === "recall" ||
  value === "spoken" ||
  value === "interaction";
const isTargetKind = (value: unknown): value is LearningAssessmentTargetKind =>
  value === "objective" ||
  value === "semantic_slot" ||
  value === "critical_constraint";
const isTupleIdentity = (value: Record<string, unknown>): boolean =>
  ["nodeId", "objectiveId", "skillId", "targetId"].every((key) =>
    isNonEmptyString(value[key]),
  ) &&
  isConstruct(value.construct) &&
  isPhase(value.phase) &&
  isTargetKind(value.targetKind);
const sameAttemptRef = (left: unknown, right: CanonicalAttemptRef): boolean =>
  isAttemptRef(left) &&
  left.schemaVersion === right.schemaVersion &&
  left.opId === right.opId &&
  left.attemptBodyHash === right.attemptBodyHash;
export const validateLearningEvidenceBody = (
  value: unknown,
): { readonly ok: boolean } => {
  if (
    !isRecord(value) ||
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
    !isRecord(value.timing)
  )
    return { ok: false };
  if (
    !isTupleIdentity(value) ||
    value.assessmentStatus !== "assessed" ||
    (value.outcome !== "success" && value.outcome !== "needs_work") ||
    !isNonEmptyString(value.observationId) ||
    !isNonEmptyString(value.policyId) ||
    typeof value.policyVersion !== "number" ||
    !Number.isInteger(value.policyVersion) ||
    value.policyVersion < 1 ||
    !isAttemptRef(value.sourceAttempt)
  )
    return { ok: false };
  const phase = value.provenance.phase;
  const hints = isRecord(value.provenance.support)
    ? value.provenance.support.hintsUsed
    : undefined;
  const runtime = isRecord(value.route.input)
    ? value.route.input.runtimeEvidenceRef
    : undefined;
  const delayed = phase === "delayed_probe";
  const provenanceOk =
    isRecord(value.provenance) &&
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
  const routeOk =
    isRecord(value.route) &&
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
        ["tap", "word_bank", "keyboard", "accessibility_alternative"].includes(
          String(value.route.input.source),
        ) &&
        value.construct !== "spoken"));
  const timingOk =
    isRecord(value.timing) &&
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
        ].every((key) =>
          isNonEmptyString((value.timing as Record<string, unknown>)[key]),
        )
      : hasOnlyKeys(value.timing, ["occurredAt"]) &&
        isNonEmptyString(value.timing.occurredAt));
  return {
    ok: provenanceOk && routeOk && timingOk,
  };
};
export const validateLearningNonAssessmentBody = (
  value: unknown,
): { readonly ok: boolean } => {
  if (
    !isRecord(value) ||
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
    !isNonEmptyString(value.occurredAt)
  )
    return { ok: false };
  const delayed = value.phase === "delayed_probe";
  if (!delayed && value.assessmentStatus === "not_assessed_for_window")
    return { ok: false };
  if (value.assessmentStatus === "not_assessed_for_window")
    return {
      ok:
        value.reasonCode === "outside_pinned_assessment_window" &&
        isNonEmptyString(value.assignmentRef) &&
        isNonEmptyString(value.launchReceiptRef) &&
        isNonEmptyString(value.timingReceiptRef) &&
        value.failureReceiptRef === undefined,
    };
  if (value.assessmentStatus === "not_assessed_system")
    return {
      ok:
        delayed &&
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
      ok:
        [
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
      ok:
        [
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

const canonicalAttemptRefEqual = (
  left: CanonicalAttemptRef,
  right: CanonicalAttemptRef,
): boolean =>
  left.schemaVersion === right.schemaVersion &&
  left.opId === right.opId &&
  left.attemptBodyHash === right.attemptBodyHash;

const validateEvidenceRefShape = (ref: LearningEvidenceRef): boolean =>
  isRecord(ref) &&
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

const validateNonAssessmentRefShape = (
  ref: LearningNonAssessmentRef,
): boolean =>
  isRecord(ref) &&
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

export const buildLearningEvidenceRef = (
  body: LearningEvidenceBody,
): LearningEvidenceRef => {
  if (!validateLearningEvidenceBody(body).ok)
    throw new Error("learning_evidence_body_invalid");
  return {
    observationId: body.observationId,
    evidenceBodyHash: hashCanonicalBody(body),
    tupleKey: buildLearningEvidenceTupleKey(body),
    sourceAttempt: body.sourceAttempt,
  };
};

export const buildLearningNonAssessmentRef = (
  body: LearningNonAssessmentBody,
): LearningNonAssessmentRef => {
  if (!validateLearningNonAssessmentBody(body).ok)
    throw new Error("learning_non_assessment_body_invalid");
  return {
    nonAssessmentId: body.nonAssessmentId,
    nonAssessmentBodyHash: hashCanonicalBody(body),
    tupleKey: buildLearningEvidenceTupleKey(body),
    sourceAttempt: body.sourceAttempt,
  };
};

export const validateLearningMaterialization = (
  body: LearningEvidenceBody | LearningNonAssessmentBody,
  ref: LearningMaterializationRef,
): { readonly ok: boolean } => {
  const bodyValid =
    body.schemaVersion === "learning-evidence-body.v1"
      ? validateLearningEvidenceBody(body).ok
      : validateLearningNonAssessmentBody(body).ok;
  if (!bodyValid) return { ok: false };
  if (
    body.schemaVersion === "learning-evidence-body.v1"
      ? !validateEvidenceRefShape(ref as LearningEvidenceRef)
      : !validateNonAssessmentRefShape(ref as LearningNonAssessmentRef)
  )
    return { ok: false };
  const tupleKey = buildLearningEvidenceTupleKey(body);
  if (!canonicalAttemptRefEqual(body.sourceAttempt, ref.sourceAttempt)) {
    return { ok: false };
  }
  if (ref.tupleKey !== tupleKey) return { ok: false };
  if (body.schemaVersion === "learning-evidence-body.v1") {
    return {
      ok:
        "observationId" in ref &&
        ref.observationId === body.observationId &&
        ref.evidenceBodyHash === hashCanonicalBody(body),
    };
  }
  return {
    ok:
      "nonAssessmentId" in ref &&
      ref.nonAssessmentId === body.nonAssessmentId &&
      ref.nonAssessmentBodyHash === hashCanonicalBody(body),
  };
};

export const validateLearningEvidenceRef = (
  body: LearningEvidenceBody,
  ref: LearningEvidenceRef,
): { readonly ok: boolean } => validateLearningMaterialization(body, ref);

export const validateLearningNonAssessmentRef = (
  body: LearningNonAssessmentBody,
  ref: LearningNonAssessmentRef,
): { readonly ok: boolean } => validateLearningMaterialization(body, ref);

const utf8Bytes = (value: string): number[] => {
  const bytes: number[] = [];

  for (let index = 0; index < value.length; index += 1) {
    const codePoint = value.codePointAt(index);
    if (codePoint === undefined) break;
    if (codePoint >= 0xd800 && codePoint <= 0xdbff) index += 1;

    if (codePoint <= 0x7f) {
      bytes.push(codePoint);
    } else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
      bytes.push(
        0xe0 | (codePoint >> 12),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    }
  }

  return bytes;
};

const BASE64URL_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

const base64url = (value: string): string => {
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
    if (third !== undefined) encoded += BASE64URL_ALPHABET[packed & 0x3f];
  }

  return encoded;
};

/**
 * Builds the only allowed identity key for a learning-evidence tuple.
 *
 * The versioned key prevents delimiter collisions and pins field order through
 * canonical JSON before base64url encoding.
 */
export const buildLearningEvidenceTupleKey = (
  tuple: LearningEvidenceTupleIdentity,
): LearningEvidenceTupleKey =>
  `letk1.${base64url(
    canonicalJsonV1([
      tuple.nodeId,
      tuple.objectiveId,
      tuple.skillId,
      tuple.construct,
      tuple.phase,
      tuple.targetKind,
      tuple.targetId,
    ]),
  )}`;
