import { detachBoundedWalletJson } from "../../../modules/learning-v2/contracts/wallet";
import {
  hashCanonicalBody,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  isServerVerifiableRequiredSessionFamily,
  normalizeRequiredSessionShortAnswer,
  requiredSessionAnswerProofFingerprint,
  type ServerVerifiableRequiredSessionFamily,
} from "../../../modules/learning-v2/contracts/required_session_answer";
export {
  normalizeRequiredSessionShortAnswer,
  requiredSessionAnswerProofFingerprint,
};
export type { ServerVerifiableRequiredSessionFamily };

export interface RequiredSessionTaskAnswerKeyV1 {
  readonly schemaVersion: "learning-v2-required-session-task-answer-key.v1";
  readonly taskId: string;
  readonly activityId: string;
  readonly family: ServerVerifiableRequiredSessionFamily;
  readonly normalization: "learning-v2-short-answer-normalization.v1";
  readonly expectedAnswerFingerprint: string;
  readonly answerKeyFingerprint: string;
}

export interface RequiredSessionTaskAnswerResponseV1 {
  readonly schemaVersion: "learning-v2-required-session-task-answer-response.v1";
  readonly taskId: string;
  readonly activityId: string;
  readonly family: ServerVerifiableRequiredSessionFamily;
  /** Ephemeral callable input. It must never enter the durable attempt body. */
  readonly submittedAnswer: string;
}

export interface VerifiedRequiredSessionTaskOutcomeV1 {
  readonly schemaVersion: "learning-v2-verified-required-task-outcome.v1";
  readonly authority: "server_answer_verifier";
  readonly taskId: string;
  readonly activityId: string;
  readonly family: ServerVerifiableRequiredSessionFamily;
  readonly resultCode: "CORRECT" | "WRONG";
  readonly answerKeyFingerprint: string;
  readonly responseFingerprint: string;
  readonly decisionFingerprint: string;
}

export interface PublishedRequiredSessionAnswerManifestV1 {
  readonly schemaVersion: "learning-v2-published-required-session-answer-manifest.v1";
  readonly courseId: string;
  readonly studyTarget: string;
  readonly courseReleaseId: string;
  readonly seasonRevisionId: string;
  readonly episodeRevisionFingerprint: string;
  readonly episodeContentHash: string;
  readonly sessionSetId: string;
  readonly sessionSetHash: string;
  readonly answerKeys: readonly RequiredSessionTaskAnswerKeyV1[];
  readonly manifestFingerprint: string;
}

const KEY_INPUT_KEYS = [
  "taskId",
  "activityId",
  "family",
  "expectedAnswer",
] as const;
const KEY_KEYS = [
  "schemaVersion",
  "taskId",
  "activityId",
  "family",
  "normalization",
  "expectedAnswerFingerprint",
  "answerKeyFingerprint",
] as const;
const RESPONSE_KEYS = [
  "schemaVersion",
  "taskId",
  "activityId",
  "family",
  "submittedAnswer",
] as const;
const ANSWER_MANIFEST_BODY_KEYS = [
  "schemaVersion",
  "courseId",
  "studyTarget",
  "courseReleaseId",
  "seasonRevisionId",
  "episodeRevisionFingerprint",
  "episodeContentHash",
  "sessionSetId",
  "sessionSetHash",
  "answerKeys",
] as const;
const ANSWER_MANIFEST_KEYS = [
  ...ANSWER_MANIFEST_BODY_KEYS,
  "manifestFingerprint",
] as const;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const HASH = /^[a-f0-9]{64}$/;
const VERIFIED = new WeakSet<object>();

const fail = (): never => {
  throw new Error("required_session_answer_invalid");
};
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean => {
  const keys = Reflect.ownKeys(value);
  return keys.length === expected.length && keys.every((key) =>
    typeof key === "string" && expected.includes(key));
};
const isFamily = (
  value: unknown,
): value is ServerVerifiableRequiredSessionFamily =>
  isServerVerifiableRequiredSessionFamily(value);
const isId = (value: unknown): value is string =>
  typeof value === "string" && ID.test(value);
const deepFreeze = <T>(value: T): T => {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return value;
};

const detach = (input: unknown): Record<string, unknown> => {
  let detached: unknown;
  try {
    detached = detachBoundedWalletJson(input, "required_session_answer_invalid");
  } catch {
    return fail();
  }
  if (!isRecord(detached) || Object.getPrototypeOf(detached) !== Object.prototype) {
    return fail();
  }
  return detached;
};

const readAnswerManifestRecord = (
  input: unknown,
  keys: readonly string[],
): Record<string, unknown> => {
  try {
    if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype) return fail();
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const ownKeys = Reflect.ownKeys(input);
    if (ownKeys.length !== keys.length || ownKeys.some((key) =>
      typeof key !== "string" || !keys.includes(key))) return fail();
    const result = Object.create(null) as Record<string, unknown>;
    for (const key of keys) {
      const descriptor = descriptors[key];
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) return fail();
      result[key] = descriptor.value;
    }
    return result;
  } catch {
    return fail();
  }
};

const readAnswerKeyArray = (input: unknown): readonly unknown[] => {
  try {
    if (!Array.isArray(input) || Object.getPrototypeOf(input) !== Array.prototype ||
      input.length < 1 || input.length > 144 ||
      Reflect.ownKeys(input).length !== input.length + 1) return fail();
    const result: unknown[] = [];
    for (let index = 0; index < input.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(input, String(index));
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) return fail();
      result.push(descriptor.value);
    }
    return result;
  } catch {
    return fail();
  }
};

export const materializeRequiredSessionTaskAnswerKey = (
  input: unknown,
): RequiredSessionTaskAnswerKeyV1 => {
  const value = detach(input);
  if (!exactKeys(value, KEY_INPUT_KEYS) || !isId(value.taskId) ||
    !isId(value.activityId) || !isFamily(value.family)) return fail();
  const expectedAnswerFingerprint = requiredSessionAnswerProofFingerprint(value.expectedAnswer);
  const body = {
    schemaVersion: "learning-v2-required-session-task-answer-key.v1" as const,
    taskId: value.taskId,
    activityId: value.activityId,
    family: value.family,
    normalization: "learning-v2-short-answer-normalization.v1" as const,
    expectedAnswerFingerprint,
  };
  return deepFreeze({
    ...body,
    answerKeyFingerprint: hashCanonicalBody(body),
  });
};

export const parseRequiredSessionTaskAnswerKey = (
  input: unknown,
): RequiredSessionTaskAnswerKeyV1 => {
  const value = detach(input);
  if (!exactKeys(value, KEY_KEYS) ||
    value.schemaVersion !== "learning-v2-required-session-task-answer-key.v1" ||
    !isId(value.taskId) || !isId(value.activityId) || !isFamily(value.family) ||
    value.normalization !== "learning-v2-short-answer-normalization.v1" ||
    typeof value.expectedAnswerFingerprint !== "string" ||
    !HASH.test(value.expectedAnswerFingerprint) ||
    typeof value.answerKeyFingerprint !== "string" ||
    !HASH.test(value.answerKeyFingerprint)) return fail();
  const body = {
    schemaVersion: "learning-v2-required-session-task-answer-key.v1" as const,
    taskId: value.taskId,
    activityId: value.activityId,
    family: value.family,
    normalization: "learning-v2-short-answer-normalization.v1" as const,
    expectedAnswerFingerprint: value.expectedAnswerFingerprint,
  };
  if (hashCanonicalBody(body) !== value.answerKeyFingerprint) return fail();
  return deepFreeze({ ...body, answerKeyFingerprint: value.answerKeyFingerprint });
};

export const parseRequiredSessionTaskAnswerResponse = (
  input: unknown,
): RequiredSessionTaskAnswerResponseV1 => {
  const response = detach(input);
  if (!exactKeys(response, RESPONSE_KEYS) ||
    response.schemaVersion !== "learning-v2-required-session-task-answer-response.v1" ||
    !isId(response.taskId) || !isId(response.activityId) ||
    !isFamily(response.family) || typeof response.submittedAnswer !== "string") {
    return fail();
  }
  // Validate bounds/Unicode now; keep the original only until server scoring.
  normalizeRequiredSessionShortAnswer(response.submittedAnswer);
  return deepFreeze({
    schemaVersion: "learning-v2-required-session-task-answer-response.v1",
    taskId: response.taskId,
    activityId: response.activityId,
    family: response.family,
    submittedAnswer: response.submittedAnswer,
  });
};

export const requiredSessionTaskAnswerResponseFingerprint = (
  input: unknown,
): string => {
  const response = parseRequiredSessionTaskAnswerResponse(input);
  return hashCanonicalBody({
    schemaVersion: "learning-v2-required-session-task-answer-response-fingerprint.v1",
    taskId: response.taskId,
    activityId: response.activityId,
    family: response.family,
    normalizedAnswer: normalizeRequiredSessionShortAnswer(response.submittedAnswer),
  });
};

export const createPublishedRequiredSessionAnswerManifest = (
  input: unknown,
): PublishedRequiredSessionAnswerManifestV1 => {
  const value = readAnswerManifestRecord(input, ANSWER_MANIFEST_BODY_KEYS);
  if (!exactKeys(value, ANSWER_MANIFEST_BODY_KEYS) ||
    value.schemaVersion !== "learning-v2-published-required-session-answer-manifest.v1" ||
    !isId(value.courseId) || typeof value.studyTarget !== "string" ||
    !/^[a-z]{2,12}(?:-[A-Za-z0-9]{2,12})*$/.test(value.studyTarget) ||
    !isId(value.courseReleaseId) || !isId(value.seasonRevisionId) ||
    typeof value.episodeRevisionFingerprint !== "string" ||
    !HASH.test(value.episodeRevisionFingerprint) ||
    typeof value.episodeContentHash !== "string" || !HASH.test(value.episodeContentHash) ||
    !isId(value.sessionSetId) || typeof value.sessionSetHash !== "string" ||
    !HASH.test(value.sessionSetHash)) return fail();
  const answerKeys = readAnswerKeyArray(value.answerKeys).map(parseRequiredSessionTaskAnswerKey)
    .sort((left, right) => left.taskId.localeCompare(right.taskId, "en"));
  if (new Set(answerKeys.map((entry) => entry.taskId)).size !== answerKeys.length) return fail();
  const body = {
    schemaVersion: "learning-v2-published-required-session-answer-manifest.v1" as const,
    courseId: value.courseId,
    studyTarget: value.studyTarget,
    courseReleaseId: value.courseReleaseId,
    seasonRevisionId: value.seasonRevisionId,
    episodeRevisionFingerprint: value.episodeRevisionFingerprint,
    episodeContentHash: value.episodeContentHash,
    sessionSetId: value.sessionSetId,
    sessionSetHash: value.sessionSetHash,
    answerKeys: Object.freeze(answerKeys),
  };
  return deepFreeze({ ...body, manifestFingerprint: hashCanonicalBody(body) });
};

export const parsePublishedRequiredSessionAnswerManifest = (
  input: unknown,
): PublishedRequiredSessionAnswerManifestV1 => {
  const value = readAnswerManifestRecord(input, ANSWER_MANIFEST_KEYS);
  if (!exactKeys(value, ANSWER_MANIFEST_KEYS) ||
    typeof value.manifestFingerprint !== "string" ||
    !HASH.test(value.manifestFingerprint)) return fail();
  const body = Object.fromEntries(
    ANSWER_MANIFEST_BODY_KEYS.map((key) => [key, value[key]]),
  );
  const parsed = createPublishedRequiredSessionAnswerManifest(body);
  if (parsed.manifestFingerprint !== value.manifestFingerprint ||
    hashCanonicalBody(value.answerKeys) !== hashCanonicalBody(parsed.answerKeys)) return fail();
  return parsed;
};

export const verifyRequiredSessionTaskAnswer = (input: {
  readonly answerKey: unknown;
  readonly response: unknown;
}): VerifiedRequiredSessionTaskOutcomeV1 => {
  const request = detach(input);
  if (!exactKeys(request, ["answerKey", "response"])) return fail();
  const answerKey = parseRequiredSessionTaskAnswerKey(request.answerKey);
  const response = parseRequiredSessionTaskAnswerResponse(request.response);
  if (response.taskId !== answerKey.taskId ||
    response.activityId !== answerKey.activityId ||
    response.family !== answerKey.family) return fail();
  const responseFingerprint = requiredSessionAnswerProofFingerprint(response.submittedAnswer);
  const body = {
    schemaVersion: "learning-v2-verified-required-task-outcome.v1" as const,
    authority: "server_answer_verifier" as const,
    taskId: answerKey.taskId,
    activityId: answerKey.activityId,
    family: answerKey.family,
    resultCode: responseFingerprint === answerKey.expectedAnswerFingerprint
      ? "CORRECT" as const
      : "WRONG" as const,
    answerKeyFingerprint: answerKey.answerKeyFingerprint,
    responseFingerprint,
  };
  const outcome = deepFreeze({
    ...body,
    decisionFingerprint: hashCanonicalBody(body),
  });
  VERIFIED.add(outcome);
  return outcome;
};

/** Runtime capability check used before a verified outcome may reach scoring. */
export const isVerifiedRequiredSessionTaskOutcome = (
  input: unknown,
): input is VerifiedRequiredSessionTaskOutcomeV1 =>
  isRecord(input) && VERIFIED.has(input);
