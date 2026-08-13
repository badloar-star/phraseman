import {
  LEARNING_V2_INTERFACE_LOCALES,
  type LearningV2Localized,
} from "../content/generator_course_contract";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../policies/decision_registry";
import {
  parseLearningV2ActivityAudioRuntimeProjectionV1,
  type LearningV2ActivityAudioRuntimeProjectionV1,
} from "./activity_audio_runtime_projection_v1";
import {
  parseLearningV2ActivityLearnerActionResourceV1,
  type LearningV2ActivityLearnerActionResourceV1,
} from "./activity_learner_action_resource_v1";
import {
  parseLearningV2ActivityPostTerminalCardCapsuleV1,
  type LearningV2ActivityPostTerminalCardCapsuleV1,
} from "./activity_post_terminal_card_capsule_v1";

export const LEARNING_V2_ACTIVITY_AUXILIARY_CLIENT_DESCRIPTOR_SCHEMA_V1 =
  "learning-v2-activity-auxiliary-client-descriptor.v1" as const;
export const LEARNING_V2_ACTIVITY_AUXILIARY_CLIENT_DESCRIPTOR_MAX_BYTES_V1 =
  6 * 1024 * 1024;

export interface LearningV2ActivityClientErrorExplanationV1 {
  readonly explanationRef: string;
  readonly taskId: string;
  readonly activityId: string;
  readonly textByLocale: LearningV2Localized<string>;
}

export interface LearningV2ActivityAuxiliaryClientDescriptorV1 {
  readonly schemaVersion: typeof LEARNING_V2_ACTIVITY_AUXILIARY_CLIENT_DESCRIPTOR_SCHEMA_V1;
  readonly environment: "lab" | "staging" | "production";
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly seasonId: string;
  readonly releaseId: string;
  readonly activeManifestHash: string;
  readonly episodeId: string;
  readonly stageId: string;
  readonly sessionId: string;
  readonly sessionOrdinal: number;
  readonly activityPackageFingerprint: string;
  readonly auxiliaryIndexFingerprint: string;
  readonly auxiliaryManifestFingerprint: string;
  readonly sourceFingerprint: string;
  readonly renderFingerprint: string;
  readonly actionResource: LearningV2ActivityLearnerActionResourceV1;
  readonly postTerminalCards: LearningV2ActivityPostTerminalCardCapsuleV1;
  readonly audioRuntime: LearningV2ActivityAudioRuntimeProjectionV1;
  readonly errorSourceProjectionFingerprint: string;
  readonly errorExplanations: readonly LearningV2ActivityClientErrorExplanationV1[];
  readonly errorExplanationCount: 12;
  readonly serverProjectionClaim: "authenticated_active_release_session_readback";
  readonly originAuthority: "none_transport_authentication_required";
  readonly assessmentSecrecy: "none_device_inspectable";
  readonly evaluatorPayload: "absent_by_exact_schema";
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeConsumer: true;
  readonly releaseAuthority: false;
  readonly descriptorFingerprint: string;
}

const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const CODE_RE = /^[a-z]{2,12}(?:-[A-Z]{2})?$/u;
const CONTROL_RE =
  /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u;
const ROOT_KEYS = Object.freeze([
  "schemaVersion",
  "environment",
  "studyTarget",
  "learnerSourceLocale",
  "seasonId",
  "releaseId",
  "activeManifestHash",
  "episodeId",
  "stageId",
  "sessionId",
  "sessionOrdinal",
  "activityPackageFingerprint",
  "auxiliaryIndexFingerprint",
  "auxiliaryManifestFingerprint",
  "sourceFingerprint",
  "renderFingerprint",
  "actionResource",
  "postTerminalCards",
  "audioRuntime",
  "errorSourceProjectionFingerprint",
  "errorExplanations",
  "errorExplanationCount",
  "serverProjectionClaim",
  "originAuthority",
  "assessmentSecrecy",
  "evaluatorPayload",
  "walletAuthority",
  "masteryAuthority",
  "evidenceAuthority",
  "publicationAuthority",
  "runtimeConsumer",
  "releaseAuthority",
  "descriptorFingerprint",
] as const);
const ERROR_KEYS = Object.freeze([
  "explanationRef",
  "taskId",
  "activityId",
  "textByLocale",
] as const);
const handles = new WeakSet<object>();
const RESERVED_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function fail(): never {
  throw new Error("learning_v2_activity_auxiliary_client_descriptor_invalid");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const actual = Object.keys(value);
  if (
    actual.length !== keys.length ||
    actual.some((key) => !keys.includes(key))
  )
    fail();
}

function exactId(value: unknown): string {
  if (typeof value !== "string" || !ID_RE.test(value)) fail();
  return value;
}

function exactHash(value: unknown): string {
  if (typeof value !== "string" || !HASH_RE.test(value)) fail();
  return value;
}

function exactLocalized(value: unknown): LearningV2Localized<string> {
  if (!isPlainObject(value)) fail();
  exactKeys(value, LEARNING_V2_INTERFACE_LOCALES);
  const result: Record<string, string> = {};
  for (const locale of LEARNING_V2_INTERFACE_LOCALES) {
    const text = value[locale];
    if (
      typeof text !== "string" ||
      text.length < 1 ||
      text.length > 2_000 ||
      text !== text.normalize("NFC") ||
      CONTROL_RE.test(text)
    )
      fail();
    result[locale] = text;
  }
  return Object.freeze(result) as LearningV2Localized<string>;
}

function preflight(value: unknown): void {
  const stack: { value: unknown; depth: number }[] = [{ value, depth: 0 }];
  let nodes = 0;
  while (stack.length > 0) {
    const current = stack.pop()!;
    nodes += 1;
    if (nodes > 200_000 || current.depth > 32) fail();
    if (typeof current.value === "string") {
      if (
        current.value.length > 8_192 ||
        current.value !== current.value.normalize("NFC") ||
        CONTROL_RE.test(current.value)
      )
        fail();
    } else if (typeof current.value === "number") {
      if (
        !Number.isFinite(current.value) ||
        Object.is(current.value, -0) ||
        (Number.isInteger(current.value) &&
          !Number.isSafeInteger(current.value))
      )
        fail();
    } else if (Array.isArray(current.value)) {
      if (current.value.length > 8_192) fail();
      for (const entry of current.value)
        stack.push({ value: entry, depth: current.depth + 1 });
    } else if (current.value !== null && typeof current.value === "object") {
      if (!isPlainObject(current.value)) fail();
      const entries = Object.entries(current.value);
      if (entries.length > 64) fail();
      for (const [key, entry] of entries) {
        if (RESERVED_KEYS.has(key)) fail();
        stack.push({ value: entry, depth: current.depth + 1 });
      }
    } else if (current.value !== null && typeof current.value !== "boolean") {
      fail();
    }
  }
}

function parseDescriptor(
  value: unknown,
): LearningV2ActivityAuxiliaryClientDescriptorV1 {
  if (!isPlainObject(value)) fail();
  exactKeys(value, ROOT_KEYS);
  if (
    value.schemaVersion !==
      LEARNING_V2_ACTIVITY_AUXILIARY_CLIENT_DESCRIPTOR_SCHEMA_V1 ||
    !["lab", "staging", "production"].includes(String(value.environment)) ||
    typeof value.studyTarget !== "string" ||
    !CODE_RE.test(value.studyTarget) ||
    typeof value.learnerSourceLocale !== "string" ||
    !CODE_RE.test(value.learnerSourceLocale) ||
    !Number.isSafeInteger(value.sessionOrdinal) ||
    Number(value.sessionOrdinal) < 1 ||
    Number(value.sessionOrdinal) > 12 ||
    !Array.isArray(value.errorExplanations) ||
    value.errorExplanations.length !== 12 ||
    value.errorExplanationCount !== 12 ||
    value.serverProjectionClaim !==
      "authenticated_active_release_session_readback" ||
    value.originAuthority !== "none_transport_authentication_required" ||
    value.assessmentSecrecy !== "none_device_inspectable" ||
    value.evaluatorPayload !== "absent_by_exact_schema" ||
    value.walletAuthority !== "none" ||
    value.masteryAuthority !== "none" ||
    value.evidenceAuthority !== "none" ||
    value.publicationAuthority !== "none" ||
    value.runtimeConsumer !== true ||
    value.releaseAuthority !== false
  )
    fail();
  const sessionOrdinal = Number(value.sessionOrdinal);
  const episodeId = exactId(value.episodeId);
  const sessionId = exactId(value.sessionId);
  const action = parseLearningV2ActivityLearnerActionResourceV1(
    canonicalJsonV1(value.actionResource),
  );
  const cards = parseLearningV2ActivityPostTerminalCardCapsuleV1(
    canonicalJsonV1(value.postTerminalCards),
  );
  const audio = parseLearningV2ActivityAudioRuntimeProjectionV1(
    canonicalJsonV1(value.audioRuntime),
  );
  if (
    action.episodeId !== episodeId ||
    action.sessionId !== sessionId ||
    action.sessionOrdinal !== sessionOrdinal ||
    cards.episodeId !== episodeId ||
    cards.sessionId !== sessionId ||
    cards.sessionOrdinal !== sessionOrdinal ||
    cards.actionResourceFingerprint !== action.resourceFingerprint ||
    audio.episodeId !== episodeId ||
    audio.sessionId !== sessionId ||
    audio.sessionOrdinal !== sessionOrdinal ||
    action.sourceFingerprint !== value.sourceFingerprint ||
    action.renderFingerprint !== value.renderFingerprint
  )
    fail();
  const taskIds = new Set<string>();
  const activityIds = new Set<string>();
  const errorExplanations = Object.freeze(
    value.errorExplanations.map((raw, index) => {
      if (!isPlainObject(raw)) fail();
      exactKeys(raw, ERROR_KEYS);
      const explanationRef = exactId(raw.explanationRef);
      const taskId = exactId(raw.taskId);
      const activityId = exactId(raw.activityId);
      const actionEntry = action.entries[index];
      if (
        !actionEntry ||
        actionEntry.taskId !== taskId ||
        actionEntry.activityId !== activityId ||
        taskIds.has(taskId) ||
        activityIds.has(activityId)
      )
        fail();
      taskIds.add(taskId);
      activityIds.add(activityId);
      return Object.freeze({
        explanationRef,
        taskId,
        activityId,
        textByLocale: exactLocalized(raw.textByLocale),
      });
    }),
  );
  const body = {
    schemaVersion: LEARNING_V2_ACTIVITY_AUXILIARY_CLIENT_DESCRIPTOR_SCHEMA_V1,
    environment: value.environment as "lab" | "staging" | "production",
    studyTarget: value.studyTarget,
    learnerSourceLocale: value.learnerSourceLocale,
    seasonId: exactId(value.seasonId),
    releaseId: exactId(value.releaseId),
    activeManifestHash: exactHash(value.activeManifestHash),
    episodeId,
    stageId: exactId(value.stageId),
    sessionId,
    sessionOrdinal,
    activityPackageFingerprint: exactHash(value.activityPackageFingerprint),
    auxiliaryIndexFingerprint: exactHash(value.auxiliaryIndexFingerprint),
    auxiliaryManifestFingerprint: exactHash(value.auxiliaryManifestFingerprint),
    sourceFingerprint: exactHash(value.sourceFingerprint),
    renderFingerprint: exactHash(value.renderFingerprint),
    actionResource: action,
    postTerminalCards: cards,
    audioRuntime: audio,
    errorSourceProjectionFingerprint: exactHash(
      value.errorSourceProjectionFingerprint,
    ),
    errorExplanations,
    errorExplanationCount: 12 as const,
    serverProjectionClaim:
      "authenticated_active_release_session_readback" as const,
    originAuthority: "none_transport_authentication_required" as const,
    assessmentSecrecy: "none_device_inspectable" as const,
    evaluatorPayload: "absent_by_exact_schema" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    publicationAuthority: "none" as const,
    runtimeConsumer: true as const,
    releaseAuthority: false as const,
  };
  if (
    typeof value.descriptorFingerprint !== "string" ||
    value.descriptorFingerprint !== hashCanonicalBody(body)
  )
    fail();
  const descriptor = Object.freeze({
    ...body,
    descriptorFingerprint: value.descriptorFingerprint,
  });
  handles.add(descriptor);
  return descriptor;
}

export function materializeLearningV2ActivityAuxiliaryClientDescriptorV1(
  input: Omit<
    LearningV2ActivityAuxiliaryClientDescriptorV1,
    | "schemaVersion"
    | "errorExplanationCount"
    | "serverProjectionClaim"
    | "originAuthority"
    | "assessmentSecrecy"
    | "evaluatorPayload"
    | "walletAuthority"
    | "masteryAuthority"
    | "evidenceAuthority"
    | "publicationAuthority"
    | "runtimeConsumer"
    | "releaseAuthority"
    | "descriptorFingerprint"
  >,
): LearningV2ActivityAuxiliaryClientDescriptorV1 {
  const body = {
    schemaVersion: LEARNING_V2_ACTIVITY_AUXILIARY_CLIENT_DESCRIPTOR_SCHEMA_V1,
    ...input,
    errorExplanationCount: 12 as const,
    serverProjectionClaim:
      "authenticated_active_release_session_readback" as const,
    originAuthority: "none_transport_authentication_required" as const,
    assessmentSecrecy: "none_device_inspectable" as const,
    evaluatorPayload: "absent_by_exact_schema" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    publicationAuthority: "none" as const,
    runtimeConsumer: true as const,
    releaseAuthority: false as const,
  };
  return parseLearningV2ActivityAuxiliaryClientDescriptorV1(
    canonicalJsonV1({
      ...body,
      descriptorFingerprint: hashCanonicalBody(body),
    }),
  );
}

export function parseLearningV2ActivityAuxiliaryClientDescriptorV1(
  raw: string,
): LearningV2ActivityAuxiliaryClientDescriptorV1 {
  if (
    typeof raw !== "string" ||
    raw.length >
      LEARNING_V2_ACTIVITY_AUXILIARY_CLIENT_DESCRIPTOR_MAX_BYTES_V1 ||
    utf8ByteLengthV1(raw) >
      LEARNING_V2_ACTIVITY_AUXILIARY_CLIENT_DESCRIPTOR_MAX_BYTES_V1
  )
    fail();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    fail();
  }
  preflight(value);
  if (canonicalJsonV1(value) !== raw) fail();
  return parseDescriptor(value);
}

export function encodeLearningV2ActivityAuxiliaryClientDescriptorV1(
  value: LearningV2ActivityAuxiliaryClientDescriptorV1,
): string {
  if (!isLearningV2ActivityAuxiliaryClientDescriptorV1(value)) fail();
  return canonicalJsonV1(value);
}

export function isLearningV2ActivityAuxiliaryClientDescriptorV1(
  value: unknown,
): value is LearningV2ActivityAuxiliaryClientDescriptorV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}
