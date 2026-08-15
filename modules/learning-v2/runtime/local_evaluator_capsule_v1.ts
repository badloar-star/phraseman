import { V2_REQUIRED_SESSION_FAMILIES_V2 } from "../contracts/activity_catalog_v2";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../policies/decision_registry";

export type V2LocalEvaluatorFamilyV1 =
  (typeof V2_REQUIRED_SESSION_FAMILIES_V2)[number];
export type V2LocalEvaluatorInputKindV1 =
  | "text"
  | "choice_token"
  | "transcript";
export const V2_LOCAL_EVALUATOR_NORMALIZATION_V1 =
  "v2-local-evaluator-normalization.v1" as const;
const normalizationProfileBody = Object.freeze({
  schemaVersion: "v2-local-evaluator-normalization-profile.v1" as const,
  normalizationRef: V2_LOCAL_EVALUATOR_NORMALIZATION_V1,
  unicodeForm: "NFKC" as const,
  caseMapping: "locale_lowercase" as const,
  unicodeCaseDataAuthority: "runtime_compatibility_unverified" as const,
  punctuationPolicy: "letters_numbers_internal_apostrophe" as const,
});
export const V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1 =
  hashCanonicalBody(normalizationProfileBody);

export const V2_LOCAL_EVALUATOR_RESPONSE_KIND_BY_FAMILY_V1 = Object.freeze({
  phrase_builder: "text",
  listen_choose: "choice_token",
  sound_contrast: "choice_token",
  listen_build_dictation: "text",
  context_gap_grammar: "choice_token",
  speed_match: "choice_token",
  scripted_repeat_compare: "transcript",
} as const satisfies Readonly<
  Record<V2LocalEvaluatorFamilyV1, V2LocalEvaluatorInputKindV1>
>);

export const v2LocalEvaluatorInputKindForFamilyV1 = (
  family: V2LocalEvaluatorFamilyV1,
): V2LocalEvaluatorInputKindV1 => {
  const inputKind = V2_LOCAL_EVALUATOR_RESPONSE_KIND_BY_FAMILY_V1[family];
  if (inputKind === undefined) throw new Error("invalid evaluator family");
  return inputKind;
};

export interface V2LocalEvaluatorCapsuleBodyV1 {
  readonly schemaVersion: "v2-local-evaluator-capsule.v1";
  readonly capsuleId: string;
  readonly taskId: string;
  readonly activityId: string;
  readonly family: V2LocalEvaluatorFamilyV1;
  readonly inputKind: V2LocalEvaluatorInputKindV1;
  readonly normalizationRef: typeof V2_LOCAL_EVALUATOR_NORMALIZATION_V1;
  readonly normalizationLocale: string;
  readonly normalizationProfileHash: string;
  readonly salt: string;
  readonly acceptedCommitments: readonly string[];
  readonly assessmentSecrecy: "none_device_inspectable";
  readonly verdictAuthority: "local_provisional_only";
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly completionAuthority: "none";
  readonly releaseAuthority: "none";
}

export interface V2LocalEvaluatorCapsuleHandleV1 {
  readonly schemaVersion: "v2-local-evaluator-capsule-handle.v1";
  readonly capsuleId: string;
  readonly taskId: string;
  readonly activityId: string;
  readonly family: V2LocalEvaluatorFamilyV1;
  readonly inputKind: V2LocalEvaluatorInputKindV1;
  readonly normalizationRef: typeof V2_LOCAL_EVALUATOR_NORMALIZATION_V1;
  readonly normalizationLocale: string;
  readonly normalizationProfileHash: string;
  readonly assessmentSecrecy: "none_device_inspectable";
  readonly verdictAuthority: "local_provisional_only";
}

export type V2LocalEvaluatorResponseV1 = Readonly<{
  kind: V2LocalEvaluatorInputKindV1;
  value: string | null;
}>;
export interface V2LocalEvaluatorVerdictV1 {
  readonly schemaVersion: "v2-local-evaluator-verdict.v1";
  readonly capsuleId: string;
  readonly taskId: string;
  readonly activityId: string;
  readonly family: V2LocalEvaluatorFamilyV1;
  readonly resultCode:
    | "provisional_correct"
    | "provisional_wrong"
    | "technical_invalid";
  readonly assessmentSecrecy: "none_device_inspectable";
  readonly verdictAuthority: "local_provisional_only";
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly completionAuthority: "none";
  readonly releaseAuthority: "none";
  readonly decisionFingerprint: string;
}

const BODY_KEYS = [
  "schemaVersion",
  "capsuleId",
  "taskId",
  "activityId",
  "family",
  "inputKind",
  "normalizationRef",
  "normalizationLocale",
  "normalizationProfileHash",
  "salt",
  "acceptedCommitments",
  "assessmentSecrecy",
  "verdictAuthority",
  "walletAuthority",
  "masteryAuthority",
  "evidenceAuthority",
  "completionAuthority",
  "releaseAuthority",
] as const;
const FAMILY_SET = new Set<string>(V2_REQUIRED_SESSION_FAMILIES_V2);
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const HEX_64 = /^[0-9a-f]{64}$/;
const LOCALE_PATTERN = /^[a-z]{2,3}(?:-[A-Za-z0-9]{1,8}){0,15}$/;
const internals = new WeakMap<
  object,
  Readonly<V2LocalEvaluatorCapsuleBodyV1>
>();

const expectedInputKind = (
  family: V2LocalEvaluatorFamilyV1,
): V2LocalEvaluatorInputKindV1 => v2LocalEvaluatorInputKindForFamilyV1(family);
const normalizeUnicodeText = (value: string, locale: string): string | null => {
  if (
    value.length > 1024 ||
    utf8ByteLengthV1(value) > 1024 ||
    /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(
      value,
    )
  )
    return null;
  let normalized: string;
  try {
    normalized = value
      .normalize("NFKC")
      .toLocaleLowerCase(locale)
      .replace(/[’‘`´]/gu, "'");
  } catch {
    return null;
  }
  const tokens = normalized.match(/[\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)*/gu) ?? [];
  const result = tokens.join(" ");
  return result.length > 0 && utf8ByteLengthV1(result) <= 512 ? result : null;
};

export const normalizeV2LocalEvaluatorResponseV1 = (
  inputKind: V2LocalEvaluatorInputKindV1,
  value: string,
  locale: string,
): string | null => {
  if (
    typeof value !== "string" ||
    typeof locale !== "string" ||
    locale.length > 255 ||
    !LOCALE_PATTERN.test(locale)
  )
    return null;
  if (inputKind === "choice_token") {
    if (value.length > 1024) return null;
    let token: string;
    try {
      token = value.normalize("NFKC").trim().toLocaleLowerCase(locale);
    } catch {
      return null;
    }
    return /^[a-z0-9][a-z0-9._:-]{0,159}$/.test(token) ? token : null;
  }
  return normalizeUnicodeText(value, locale);
};

export const createV2LocalEvaluatorCommitmentV1 = (
  input: Readonly<{
    capsuleId: string;
    taskId: string;
    activityId: string;
    family: V2LocalEvaluatorFamilyV1;
    inputKind: V2LocalEvaluatorInputKindV1;
    normalizationLocale: string;
    normalizationProfileHash: string;
    salt: string;
    response: string;
  }>,
): string => {
  if (
    !ID_PATTERN.test(input.capsuleId) ||
    !ID_PATTERN.test(input.taskId) ||
    !ID_PATTERN.test(input.activityId)
  )
    throw new Error("invalid evaluator commitment identity");
  if (
    !FAMILY_SET.has(input.family) ||
    expectedInputKind(input.family) !== input.inputKind
  )
    throw new Error("invalid evaluator family/input kind pair");
  if (!HEX_64.test(input.salt))
    throw new Error("invalid evaluator commitment salt");
  if (
    !LOCALE_PATTERN.test(input.normalizationLocale) ||
    input.normalizationLocale.length > 255 ||
    input.normalizationProfileHash !==
      V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1
  )
    throw new Error("invalid evaluator normalization profile");
  const normalizedResponse = normalizeV2LocalEvaluatorResponseV1(
    input.inputKind,
    input.response,
    input.normalizationLocale,
  );
  if (normalizedResponse === null)
    throw new Error("invalid evaluator commitment response");
  return hashCanonicalBody({
    schemaVersion: "v2-local-evaluator-response-commitment.v1",
    capsuleId: input.capsuleId,
    taskId: input.taskId,
    activityId: input.activityId,
    family: input.family,
    inputKind: input.inputKind,
    normalizationRef: V2_LOCAL_EVALUATOR_NORMALIZATION_V1,
    normalizationLocale: input.normalizationLocale,
    normalizationProfileHash: input.normalizationProfileHash,
    salt: input.salt,
    normalizedResponse,
  });
};

export const buildV2LocalEvaluatorCapsuleRawV1 = (
  input: Readonly<{
    capsuleId: string;
    taskId: string;
    activityId: string;
    family: V2LocalEvaluatorFamilyV1;
    inputKind: V2LocalEvaluatorInputKindV1;
    normalizationLocale: string;
    normalizationProfileHash: string;
    salt: string;
    acceptedCommitments: readonly string[];
  }>,
): string =>
  canonicalJsonV1({
    schemaVersion: "v2-local-evaluator-capsule.v1",
    ...input,
    normalizationRef: V2_LOCAL_EVALUATOR_NORMALIZATION_V1,
    assessmentSecrecy: "none_device_inspectable",
    verdictAuthority: "local_provisional_only",
    walletAuthority: "none",
    masteryAuthority: "none",
    evidenceAuthority: "none",
    completionAuthority: "none",
    releaseAuthority: "none",
  });

export const parseV2LocalEvaluatorCapsuleV1 = (
  rawCanonical: string,
): V2LocalEvaluatorCapsuleHandleV1 => {
  if (
    typeof rawCanonical !== "string" ||
    rawCanonical.length > 64 * 1024 ||
    utf8ByteLengthV1(rawCanonical) > 64 * 1024
  )
    throw new Error("invalid local evaluator capsule bytes");
  let decoded: unknown;
  try {
    decoded = JSON.parse(rawCanonical);
  } catch {
    throw new Error("invalid local evaluator capsule JSON");
  }
  if (
    canonicalJsonV1(decoded) !== rawCanonical ||
    typeof decoded !== "object" ||
    decoded === null ||
    Array.isArray(decoded)
  )
    throw new Error("local evaluator capsule must be a canonical object");
  const body = decoded as Record<string, unknown>;
  const actualKeys = Object.keys(body).sort();
  const expectedKeys = [...BODY_KEYS].sort();
  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key, index) => key !== expectedKeys[index])
  )
    throw new Error("local evaluator capsule keys mismatch");
  for (const key of ["capsuleId", "taskId", "activityId"] as const)
    if (typeof body[key] !== "string" || !ID_PATTERN.test(body[key] as string))
      throw new Error(`invalid ${key}`);
  if (
    body.schemaVersion !== "v2-local-evaluator-capsule.v1" ||
    !FAMILY_SET.has(String(body.family))
  )
    throw new Error("invalid evaluator capsule schema/family");
  const family = body.family as V2LocalEvaluatorFamilyV1;
  if (body.inputKind !== expectedInputKind(family))
    throw new Error("invalid evaluator family/input kind pair");
  if (
    body.normalizationRef !== V2_LOCAL_EVALUATOR_NORMALIZATION_V1 ||
    typeof body.normalizationLocale !== "string" ||
    body.normalizationLocale.length > 255 ||
    !LOCALE_PATTERN.test(body.normalizationLocale) ||
    body.normalizationProfileHash !==
      V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1 ||
    typeof body.salt !== "string" ||
    !HEX_64.test(body.salt)
  )
    throw new Error("invalid evaluator normalization/salt");
  if (
    !Array.isArray(body.acceptedCommitments) ||
    body.acceptedCommitments.length < 1 ||
    body.acceptedCommitments.length > 32 ||
    body.acceptedCommitments.some(
      (value) => typeof value !== "string" || !HEX_64.test(value),
    )
  )
    throw new Error("invalid accepted commitments");
  const acceptedCommitments = body.acceptedCommitments as string[];
  const sorted = [...acceptedCommitments].sort();
  if (
    new Set(sorted).size !== sorted.length ||
    sorted.some((value, index) => value !== acceptedCommitments[index])
  )
    throw new Error("accepted commitments must be sorted and unique");
  const literals: Readonly<Record<string, unknown>> = {
    assessmentSecrecy: "none_device_inspectable",
    verdictAuthority: "local_provisional_only",
    walletAuthority: "none",
    masteryAuthority: "none",
    evidenceAuthority: "none",
    completionAuthority: "none",
    releaseAuthority: "none",
  };
  for (const [key, value] of Object.entries(literals))
    if (body[key] !== value)
      throw new Error(`invalid evaluator authority: ${key}`);
  const internal = Object.freeze(decoded) as V2LocalEvaluatorCapsuleBodyV1;
  Object.freeze(internal.acceptedCommitments);
  const handle = Object.freeze({
    schemaVersion: "v2-local-evaluator-capsule-handle.v1" as const,
    capsuleId: internal.capsuleId,
    taskId: internal.taskId,
    activityId: internal.activityId,
    family: internal.family,
    inputKind: internal.inputKind,
    normalizationRef: internal.normalizationRef,
    normalizationLocale: internal.normalizationLocale,
    normalizationProfileHash: internal.normalizationProfileHash,
    assessmentSecrecy: internal.assessmentSecrecy,
    verdictAuthority: internal.verdictAuthority,
  });
  internals.set(handle, internal);
  return handle;
};

export const isV2LocalEvaluatorCapsuleHandleV1 = (
  value: unknown,
): value is V2LocalEvaluatorCapsuleHandleV1 =>
  typeof value === "object" && value !== null && internals.has(value);

export const evaluateV2LocalEvaluatorCapsuleV1 = (
  handle: V2LocalEvaluatorCapsuleHandleV1,
  response: V2LocalEvaluatorResponseV1,
): V2LocalEvaluatorVerdictV1 => {
  const capsule = internals.get(handle as object);
  if (!capsule) throw new Error("unrecognized local evaluator capsule handle");
  let resultCode: V2LocalEvaluatorVerdictV1["resultCode"] = "technical_invalid";
  let responseCommitment: string | null = null;
  if (
    typeof response === "object" &&
    response !== null &&
    response.kind === capsule.inputKind &&
    typeof response.value === "string"
  ) {
    try {
      responseCommitment = createV2LocalEvaluatorCommitmentV1({
        ...capsule,
        response: response.value,
      });
      resultCode = capsule.acceptedCommitments.includes(responseCommitment)
        ? "provisional_correct"
        : "provisional_wrong";
    } catch {
      resultCode = "technical_invalid";
    }
  }
  const verdictWithoutFingerprint = {
    schemaVersion: "v2-local-evaluator-verdict.v1" as const,
    capsuleId: capsule.capsuleId,
    taskId: capsule.taskId,
    activityId: capsule.activityId,
    family: capsule.family,
    resultCode,
    assessmentSecrecy: "none_device_inspectable" as const,
    verdictAuthority: "local_provisional_only" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    completionAuthority: "none" as const,
    releaseAuthority: "none" as const,
  };
  return Object.freeze({
    ...verdictWithoutFingerprint,
    decisionFingerprint: hashCanonicalBody({
      ...verdictWithoutFingerprint,
      responseCommitment,
    }),
  });
};
