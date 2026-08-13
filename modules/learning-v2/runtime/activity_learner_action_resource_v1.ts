import { V2_REQUIRED_SESSION_FAMILIES_V2 } from "../contracts/activity_catalog_v2";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../policies/decision_registry";

export const LEARNING_V2_ACTIVITY_LEARNER_ACTION_RESOURCE_SCHEMA_V1 =
  "learning-v2-activity-learner-action-resource.v1" as const;
export const LEARNING_V2_ACTIVITY_LEARNER_ACTION_RESOURCE_MAX_BYTES_V1 =
  512 * 1024;
export const LEARNING_V2_ACTIVITY_LEARNER_ACTION_COUNT_V1 = 12 as const;

export type LearningV2ActivityActionFamilyV1 =
  (typeof V2_REQUIRED_SESSION_FAMILIES_V2)[number];

export interface LearningV2ActivityVisibleResponseOptionV1 {
  readonly responseId: string;
  readonly text: string;
}

export interface LearningV2ActivityReportContextV1 {
  readonly reportContextRef: string;
  readonly screen: "learning_v2_activity";
  readonly dataId: string;
  readonly prompt: string;
  readonly responseOptions: readonly LearningV2ActivityVisibleResponseOptionV1[];
  readonly accessibilityLabel: string;
  readonly learnerSurfaceFingerprint: string;
}

export type LearningV2ActivitySavablePhraseV1 =
  | Readonly<{
      savablePhraseRef: string;
      resolution: "learner_visible_prompt";
      targetText: string;
      meaningResolution: "server_post_terminal_release_resource";
      sourceTextFingerprint: string;
    }>
  | Readonly<{
      savablePhraseRef: string;
      resolution: "server_post_terminal";
      targetText: null;
      meaningResolution: "server_post_terminal_release_resource";
      sourceTextFingerprint: null;
    }>;

export interface LearningV2ActivityLearnerActionEntryV1 {
  readonly taskId: string;
  readonly activityId: string;
  readonly promptId: string;
  readonly slot: number;
  readonly family: LearningV2ActivityActionFamilyV1;
  readonly report: LearningV2ActivityReportContextV1;
  readonly save: LearningV2ActivitySavablePhraseV1;
  readonly voiceAvailable: boolean;
  readonly entryFingerprint: string;
}

export interface LearningV2ActivityLearnerActionResourceV1 {
  readonly schemaVersion: typeof LEARNING_V2_ACTIVITY_LEARNER_ACTION_RESOURCE_SCHEMA_V1;
  readonly episodeId: string;
  readonly targetLanguage: string;
  readonly sessionId: string;
  readonly sessionOrdinal: number;
  readonly sourceFingerprint: string;
  readonly renderFingerprint: string;
  readonly entries: readonly LearningV2ActivityLearnerActionEntryV1[];
  readonly entryCount: 12;
  readonly reportContextBinding: "learner_visible_render_claim";
  readonly reportContextAuthority: "none_release_binding_required";
  readonly savablePhraseBinding: "visible_prompt_or_post_terminal_ref_claim";
  readonly savablePhraseAuthority: "none_release_binding_required";
  readonly answerKeyAuthority: "none_structural_allowlist_semantic_qa_required";
  readonly voiceControlAuthority: "command_only_no_recording_artifact";
  readonly runtimeAuthority: "none_release_binding_required";
  readonly publicationAuthority: "none";
  readonly releaseAuthority: false;
  readonly resourceFingerprint: string;
}

export interface LearningV2ActivityLearnerActionMaterializeInputV1 {
  readonly episodeId: string;
  readonly targetLanguage: string;
  readonly sessionId: string;
  readonly sessionOrdinal: number;
  readonly sourceFingerprint: string;
  readonly renderFingerprint: string;
  readonly entries: readonly LearningV2ActivityLearnerActionEntryV1[];
}

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const LANGUAGE_RE = /^[a-z]{2,3}(?:-[A-Za-z0-9]{1,8}){0,15}$/u;
const HASH_RE = /^[a-f0-9]{64}$/u;
const CONTROL_OR_BIDI_RE =
  /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u;
const RESERVED_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const FAMILY_SET = new Set<string>(V2_REQUIRED_SESSION_FAMILIES_V2);
const resourceHandles = new WeakSet<object>();

const ROOT_KEYS = Object.freeze([
  "schemaVersion",
  "episodeId",
  "targetLanguage",
  "sessionId",
  "sessionOrdinal",
  "sourceFingerprint",
  "renderFingerprint",
  "entries",
  "entryCount",
  "reportContextBinding",
  "reportContextAuthority",
  "savablePhraseBinding",
  "savablePhraseAuthority",
  "answerKeyAuthority",
  "voiceControlAuthority",
  "runtimeAuthority",
  "publicationAuthority",
  "releaseAuthority",
  "resourceFingerprint",
] as const);
const ENTRY_KEYS = Object.freeze([
  "taskId",
  "activityId",
  "promptId",
  "slot",
  "family",
  "report",
  "save",
  "voiceAvailable",
  "entryFingerprint",
] as const);
const REPORT_KEYS = Object.freeze([
  "reportContextRef",
  "screen",
  "dataId",
  "prompt",
  "responseOptions",
  "accessibilityLabel",
  "learnerSurfaceFingerprint",
] as const);
const RESPONSE_OPTION_KEYS = Object.freeze(["responseId", "text"] as const);
const SAVE_KEYS = Object.freeze([
  "savablePhraseRef",
  "resolution",
  "targetText",
  "meaningResolution",
  "sourceTextFingerprint",
] as const);

function fail(code: string): never {
  throw new Error(code);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  code: string,
): void {
  const keys = Object.keys(value);
  if (
    keys.length !== expected.length ||
    keys.some((key) => !expected.includes(key))
  )
    fail(code);
}

function exactId(value: unknown, code: string): string {
  if (
    typeof value !== "string" ||
    !ID_RE.test(value) ||
    RESERVED_KEYS.has(value)
  )
    fail(code);
  return value;
}

function exactHash(value: unknown, code: string): string {
  if (typeof value !== "string" || !HASH_RE.test(value)) fail(code);
  return value;
}

function exactText(value: unknown, maximumBytes: number, code: string): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.trim() !== value ||
    value.normalize("NFC") !== value ||
    CONTROL_OR_BIDI_RE.test(value) ||
    utf8ByteLengthV1(value) > maximumBytes
  )
    fail(code);
  return value;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>))
      deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function preflightJson(root: unknown): void {
  const stack: { value: unknown; depth: number }[] = [
    { value: root, depth: 0 },
  ];
  let nodes = 0;
  let arrayEntries = 0;
  while (stack.length > 0) {
    const current = stack.pop()!;
    nodes += 1;
    if (nodes > 4_000 || current.depth > 12)
      fail("learning_v2_activity_action_complexity_invalid");
    const value = current.value;
    if (typeof value === "string") {
      if (value.length > 4_096 || value.normalize("NFC") !== value)
        fail("learning_v2_activity_action_string_invalid");
      continue;
    }
    if (value === null || typeof value === "boolean") continue;
    if (typeof value === "number") {
      if (!Number.isSafeInteger(value) || Object.is(value, -0))
        fail("learning_v2_activity_action_number_invalid");
      continue;
    }
    if (Array.isArray(value)) {
      arrayEntries += value.length;
      if (arrayEntries > 512)
        fail("learning_v2_activity_action_complexity_invalid");
      value.forEach((child) =>
        stack.push({ value: child, depth: current.depth + 1 }),
      );
      continue;
    }
    if (!isPlainObject(value)) fail("learning_v2_activity_action_json_invalid");
    const keys = Object.keys(value);
    if (
      keys.length > 32 ||
      keys.some((key) => RESERVED_KEYS.has(key) || key.normalize("NFC") !== key)
    )
      fail("learning_v2_activity_action_fields_invalid");
    keys.forEach((key) =>
      stack.push({ value: value[key], depth: current.depth + 1 }),
    );
  }
}

function parseEntry(
  value: unknown,
  sessionOrdinal: number,
): LearningV2ActivityLearnerActionEntryV1 {
  if (!isPlainObject(value)) fail("learning_v2_activity_action_entry_invalid");
  exactKeys(value, ENTRY_KEYS, "learning_v2_activity_action_entry_invalid");
  const taskId = exactId(
    value.taskId,
    "learning_v2_activity_action_entry_invalid",
  );
  const activityId = exactId(
    value.activityId,
    "learning_v2_activity_action_entry_invalid",
  );
  const promptId = exactId(
    value.promptId,
    "learning_v2_activity_action_entry_invalid",
  );
  if (
    !Number.isSafeInteger(value.slot) ||
    Number(value.slot) < 1 ||
    Number(value.slot) > 12
  )
    fail("learning_v2_activity_action_slot_invalid");
  if (!FAMILY_SET.has(String(value.family)))
    fail("learning_v2_activity_action_family_invalid");
  if (typeof value.voiceAvailable !== "boolean")
    fail("learning_v2_activity_action_voice_invalid");

  if (!isPlainObject(value.report))
    fail("learning_v2_activity_action_report_invalid");
  exactKeys(
    value.report,
    REPORT_KEYS,
    "learning_v2_activity_action_report_invalid",
  );
  const reportContextRef = exactHash(
    value.report.reportContextRef,
    "learning_v2_activity_action_report_invalid",
  );
  if (value.report.screen !== "learning_v2_activity")
    fail("learning_v2_activity_action_report_invalid");
  const dataId = exactId(
    value.report.dataId,
    "learning_v2_activity_action_report_invalid",
  );
  const prompt = exactText(
    value.report.prompt,
    4_000,
    "learning_v2_activity_action_report_invalid",
  );
  if (
    !Array.isArray(value.report.responseOptions) ||
    value.report.responseOptions.length < 2 ||
    value.report.responseOptions.length > 6
  )
    fail("learning_v2_activity_action_report_invalid");
  const responseIds = new Set<string>();
  const responseOptions = value.report.responseOptions.map((raw) => {
    if (!isPlainObject(raw))
      fail("learning_v2_activity_action_response_option_invalid");
    exactKeys(
      raw,
      RESPONSE_OPTION_KEYS,
      "learning_v2_activity_action_response_option_invalid",
    );
    const responseId = exactId(
      raw.responseId,
      "learning_v2_activity_action_response_option_invalid",
    );
    if (responseIds.has(responseId))
      fail("learning_v2_activity_action_response_option_duplicate");
    responseIds.add(responseId);
    return Object.freeze({
      responseId,
      text: exactText(
        raw.text,
        1_000,
        "learning_v2_activity_action_response_option_invalid",
      ),
    });
  });
  const accessibilityLabel = exactText(
    value.report.accessibilityLabel,
    4_000,
    "learning_v2_activity_action_report_invalid",
  );
  const learnerSurfaceFingerprint = exactHash(
    value.report.learnerSurfaceFingerprint,
    "learning_v2_activity_action_report_invalid",
  );
  const reportBody = {
    taskId,
    activityId,
    promptId,
    sessionOrdinal,
    screen: "learning_v2_activity" as const,
    dataId,
    prompt,
    responseOptions,
    accessibilityLabel,
    learnerSurfaceFingerprint,
  };
  if (hashCanonicalBody(reportBody) !== reportContextRef)
    fail("learning_v2_activity_action_report_fingerprint_invalid");
  const report = Object.freeze({
    reportContextRef,
    screen: "learning_v2_activity" as const,
    dataId,
    prompt,
    responseOptions: Object.freeze(responseOptions),
    accessibilityLabel,
    learnerSurfaceFingerprint,
  });

  if (!isPlainObject(value.save))
    fail("learning_v2_activity_action_save_invalid");
  exactKeys(value.save, SAVE_KEYS, "learning_v2_activity_action_save_invalid");
  const savablePhraseRef = exactHash(
    value.save.savablePhraseRef,
    "learning_v2_activity_action_save_invalid",
  );
  if (value.save.meaningResolution !== "server_post_terminal_release_resource")
    fail("learning_v2_activity_action_save_invalid");
  let save: LearningV2ActivitySavablePhraseV1;
  if (value.save.resolution === "learner_visible_prompt") {
    const targetText = exactText(
      value.save.targetText,
      4_000,
      "learning_v2_activity_action_save_invalid",
    );
    if (targetText !== prompt)
      fail("learning_v2_activity_action_save_not_visible");
    const sourceTextFingerprint = exactHash(
      value.save.sourceTextFingerprint,
      "learning_v2_activity_action_save_invalid",
    );
    const saveBody = {
      taskId,
      activityId,
      promptId,
      resolution: "learner_visible_prompt" as const,
      targetText,
      meaningResolution: "server_post_terminal_release_resource" as const,
      sourceTextFingerprint,
    };
    if (
      hashCanonicalBody({ targetText }) !== sourceTextFingerprint ||
      hashCanonicalBody(saveBody) !== savablePhraseRef
    )
      fail("learning_v2_activity_action_save_fingerprint_invalid");
    save = Object.freeze({
      savablePhraseRef,
      resolution: "learner_visible_prompt" as const,
      targetText,
      meaningResolution: "server_post_terminal_release_resource" as const,
      sourceTextFingerprint,
    });
  } else if (value.save.resolution === "server_post_terminal") {
    if (
      value.save.targetText !== null ||
      value.save.sourceTextFingerprint !== null ||
      hashCanonicalBody({
        taskId,
        activityId,
        promptId,
        resolution: "server_post_terminal",
      }) !== savablePhraseRef
    )
      fail("learning_v2_activity_action_save_invalid");
    save = Object.freeze({
      savablePhraseRef,
      resolution: "server_post_terminal" as const,
      targetText: null,
      meaningResolution: "server_post_terminal_release_resource" as const,
      sourceTextFingerprint: null,
    });
  } else {
    fail("learning_v2_activity_action_save_invalid");
  }

  const entryBody = {
    taskId,
    activityId,
    promptId,
    slot: Number(value.slot),
    family: value.family as LearningV2ActivityActionFamilyV1,
    report,
    save,
    voiceAvailable: value.voiceAvailable,
  };
  const entryFingerprint = exactHash(
    value.entryFingerprint,
    "learning_v2_activity_action_entry_invalid",
  );
  if (hashCanonicalBody(entryBody) !== entryFingerprint)
    fail("learning_v2_activity_action_entry_fingerprint_invalid");
  return Object.freeze({ ...entryBody, entryFingerprint });
}

function validateRoot(
  value: unknown,
): LearningV2ActivityLearnerActionResourceV1 {
  if (!isPlainObject(value)) fail("learning_v2_activity_action_root_invalid");
  exactKeys(value, ROOT_KEYS, "learning_v2_activity_action_root_invalid");
  if (
    value.schemaVersion !==
      LEARNING_V2_ACTIVITY_LEARNER_ACTION_RESOURCE_SCHEMA_V1 ||
    typeof value.targetLanguage !== "string" ||
    !LANGUAGE_RE.test(value.targetLanguage)
  )
    fail("learning_v2_activity_action_root_invalid");
  const episodeId = exactId(
    value.episodeId,
    "learning_v2_activity_action_root_invalid",
  );
  const sessionId = exactId(
    value.sessionId,
    "learning_v2_activity_action_root_invalid",
  );
  if (
    !Number.isSafeInteger(value.sessionOrdinal) ||
    Number(value.sessionOrdinal) < 1 ||
    Number(value.sessionOrdinal) > 12
  )
    fail("learning_v2_activity_action_root_invalid");
  const sessionOrdinal = Number(value.sessionOrdinal);
  const sourceFingerprint = exactHash(
    value.sourceFingerprint,
    "learning_v2_activity_action_root_invalid",
  );
  const renderFingerprint = exactHash(
    value.renderFingerprint,
    "learning_v2_activity_action_root_invalid",
  );
  if (
    !Array.isArray(value.entries) ||
    value.entries.length !== LEARNING_V2_ACTIVITY_LEARNER_ACTION_COUNT_V1 ||
    value.entryCount !== LEARNING_V2_ACTIVITY_LEARNER_ACTION_COUNT_V1
  )
    fail("learning_v2_activity_action_count_invalid");
  const entries = value.entries.map((entry) =>
    parseEntry(entry, sessionOrdinal),
  );
  const taskIds = new Set<string>();
  const activityIds = new Set<string>();
  const promptIds = new Set<string>();
  const reportRefs = new Set<string>();
  const saveRefs = new Set<string>();
  entries.forEach((entry, index) => {
    if (entry.slot !== index + 1)
      fail("learning_v2_activity_action_order_invalid");
    if (
      taskIds.has(entry.taskId) ||
      activityIds.has(entry.activityId) ||
      promptIds.has(entry.promptId) ||
      reportRefs.has(entry.report.reportContextRef) ||
      saveRefs.has(entry.save.savablePhraseRef)
    )
      fail("learning_v2_activity_action_identity_duplicate");
    taskIds.add(entry.taskId);
    activityIds.add(entry.activityId);
    promptIds.add(entry.promptId);
    reportRefs.add(entry.report.reportContextRef);
    saveRefs.add(entry.save.savablePhraseRef);
    if (
      (entry.slot === 9 || entry.slot === 10 || entry.slot === 12) &&
      entry.save.resolution !== "server_post_terminal"
    )
      fail("learning_v2_activity_action_assessment_save_leak");
  });
  if (
    value.reportContextBinding !== "learner_visible_render_claim" ||
    value.reportContextAuthority !== "none_release_binding_required" ||
    value.savablePhraseBinding !==
      "visible_prompt_or_post_terminal_ref_claim" ||
    value.savablePhraseAuthority !== "none_release_binding_required" ||
    value.answerKeyAuthority !==
      "none_structural_allowlist_semantic_qa_required" ||
    value.voiceControlAuthority !== "command_only_no_recording_artifact" ||
    value.runtimeAuthority !== "none_release_binding_required" ||
    value.publicationAuthority !== "none" ||
    value.releaseAuthority !== false
  )
    fail("learning_v2_activity_action_authority_invalid");
  const body = {
    schemaVersion: LEARNING_V2_ACTIVITY_LEARNER_ACTION_RESOURCE_SCHEMA_V1,
    episodeId,
    targetLanguage: value.targetLanguage,
    sessionId,
    sessionOrdinal,
    sourceFingerprint,
    renderFingerprint,
    entries: Object.freeze(entries),
    entryCount: LEARNING_V2_ACTIVITY_LEARNER_ACTION_COUNT_V1,
    reportContextBinding: "learner_visible_render_claim" as const,
    reportContextAuthority: "none_release_binding_required" as const,
    savablePhraseBinding: "visible_prompt_or_post_terminal_ref_claim" as const,
    savablePhraseAuthority: "none_release_binding_required" as const,
    answerKeyAuthority:
      "none_structural_allowlist_semantic_qa_required" as const,
    voiceControlAuthority: "command_only_no_recording_artifact" as const,
    runtimeAuthority: "none_release_binding_required" as const,
    publicationAuthority: "none" as const,
    releaseAuthority: false as const,
  };
  const resourceFingerprint = exactHash(
    value.resourceFingerprint,
    "learning_v2_activity_action_root_invalid",
  );
  if (hashCanonicalBody(body) !== resourceFingerprint)
    fail("learning_v2_activity_action_root_fingerprint_invalid");
  return deepFreeze({ ...body, resourceFingerprint });
}

export function materializeLearningV2ActivityLearnerActionResourceV1(
  input: LearningV2ActivityLearnerActionMaterializeInputV1,
): LearningV2ActivityLearnerActionResourceV1 {
  const candidate = {
    schemaVersion: LEARNING_V2_ACTIVITY_LEARNER_ACTION_RESOURCE_SCHEMA_V1,
    episodeId: input.episodeId,
    targetLanguage: input.targetLanguage,
    sessionId: input.sessionId,
    sessionOrdinal: input.sessionOrdinal,
    sourceFingerprint: input.sourceFingerprint,
    renderFingerprint: input.renderFingerprint,
    entries: input.entries,
    entryCount: LEARNING_V2_ACTIVITY_LEARNER_ACTION_COUNT_V1,
    reportContextBinding: "learner_visible_render_claim" as const,
    reportContextAuthority: "none_release_binding_required" as const,
    savablePhraseBinding: "visible_prompt_or_post_terminal_ref_claim" as const,
    savablePhraseAuthority: "none_release_binding_required" as const,
    answerKeyAuthority:
      "none_structural_allowlist_semantic_qa_required" as const,
    voiceControlAuthority: "command_only_no_recording_artifact" as const,
    runtimeAuthority: "none_release_binding_required" as const,
    publicationAuthority: "none" as const,
    releaseAuthority: false as const,
  };
  return parseLearningV2ActivityLearnerActionResourceV1(
    canonicalJsonV1({
      ...candidate,
      resourceFingerprint: hashCanonicalBody(candidate),
    }),
  );
}

export function parseLearningV2ActivityLearnerActionResourceV1(
  raw: string,
): LearningV2ActivityLearnerActionResourceV1 {
  if (
    typeof raw !== "string" ||
    raw.length > LEARNING_V2_ACTIVITY_LEARNER_ACTION_RESOURCE_MAX_BYTES_V1 ||
    utf8ByteLengthV1(raw) >
      LEARNING_V2_ACTIVITY_LEARNER_ACTION_RESOURCE_MAX_BYTES_V1
  )
    fail("learning_v2_activity_action_raw_invalid");
  let candidate: unknown;
  try {
    candidate = JSON.parse(raw);
  } catch {
    fail("learning_v2_activity_action_json_invalid");
  }
  preflightJson(candidate);
  if (canonicalJsonV1(candidate) !== raw)
    fail("learning_v2_activity_action_noncanonical");
  const result = validateRoot(candidate);
  resourceHandles.add(result);
  return result;
}

export function encodeLearningV2ActivityLearnerActionResourceV1(
  resource: LearningV2ActivityLearnerActionResourceV1,
): string {
  if (!isLearningV2ActivityLearnerActionResourceV1(resource))
    fail("learning_v2_activity_action_handle_invalid");
  return canonicalJsonV1(resource);
}

export function isLearningV2ActivityLearnerActionResourceV1(
  value: unknown,
): value is LearningV2ActivityLearnerActionResourceV1 {
  return (
    typeof value === "object" && value !== null && resourceHandles.has(value)
  );
}

export function getLearningV2ActivityLearnerActionEntryV1(
  resource: LearningV2ActivityLearnerActionResourceV1,
  taskId: string,
  activityId: string,
): LearningV2ActivityLearnerActionEntryV1 {
  if (!isLearningV2ActivityLearnerActionResourceV1(resource))
    fail("learning_v2_activity_action_handle_invalid");
  const exactTaskId = exactId(
    taskId,
    "learning_v2_activity_action_identity_invalid",
  );
  const exactActivityId = exactId(
    activityId,
    "learning_v2_activity_action_identity_invalid",
  );
  const entry = resource.entries.find(
    (candidate) =>
      candidate.taskId === exactTaskId &&
      candidate.activityId === exactActivityId,
  );
  if (!entry) fail("learning_v2_activity_action_identity_mismatch");
  return entry;
}
