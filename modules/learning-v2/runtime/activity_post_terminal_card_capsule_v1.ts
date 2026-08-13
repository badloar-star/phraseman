import {
  LEARNING_V2_INTERFACE_LOCALES,
  type LearningV2InterfaceLocale,
  type LearningV2Localized,
} from "../content/generator_course_contract";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../policies/decision_registry";
import {
  isLearningV2ActivityLearnerActionResourceV1,
  type LearningV2ActivityLearnerActionResourceV1,
} from "./activity_learner_action_resource_v1";
import {
  isLearningV2ActivityPostTerminalCardCatalogV1,
  type LearningV2ActivityPostTerminalCardCatalogV1,
} from "./activity_post_terminal_card_catalog_v1";

export const LEARNING_V2_ACTIVITY_POST_TERMINAL_CARD_CAPSULE_SCHEMA_V1 =
  "learning-v2-activity-post-terminal-card-capsule.v1" as const;
export const LEARNING_V2_ACTIVITY_POST_TERMINAL_CARD_CAPSULE_MAX_BYTES_V1 =
  256 * 1024;

export interface LearningV2ActivityPostTerminalCardCapsuleEntryV1 {
  readonly taskId: string;
  readonly activityId: string;
  readonly promptId: string;
  readonly slot: number;
  readonly savablePhraseRef: string;
  readonly targetText: string;
  readonly meaningByLocale: LearningV2Localized<string>;
  readonly entryFingerprint: string;
}

export interface LearningV2ActivityPostTerminalCardCapsuleV1 {
  readonly schemaVersion: typeof LEARNING_V2_ACTIVITY_POST_TERMINAL_CARD_CAPSULE_SCHEMA_V1;
  readonly episodeId: string;
  readonly targetLanguage: string;
  readonly sessionId: string;
  readonly sessionOrdinal: number;
  readonly actionResourceFingerprint: string;
  readonly sourceCatalogFingerprint: string;
  readonly entries: readonly LearningV2ActivityPostTerminalCardCapsuleEntryV1[];
  readonly entryCount: 12;
  readonly consumer: "app_internal_post_terminal_save_only";
  readonly assessmentSecrecy: "none_device_inspectable";
  readonly terminalGateAuthority: "local_terminal_state_only";
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly runtimeAuthority: "none_release_binding_required";
  readonly releaseAuthority: false;
  readonly capsuleFingerprint: string;
}

export interface LearningV2ActivityPostTerminalCardResultV1 {
  readonly taskId: string;
  readonly activityId: string;
  readonly savablePhraseRef: string;
  readonly targetText: string;
  readonly meaning: string;
  readonly interfaceLocale: LearningV2InterfaceLocale;
  readonly sourceCatalogFingerprint: string;
  readonly localTerminalAuthority: "ui_save_availability_only";
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
}

const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const LANGUAGE_RE = /^[a-z]{2,3}(?:-[A-Za-z0-9]{1,8}){0,15}$/u;
const CONTROL_OR_BIDI_RE =
  /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u;
const RESERVED_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const capsuleHandles = new WeakSet<object>();
const ROOT_KEYS = Object.freeze([
  "schemaVersion",
  "episodeId",
  "targetLanguage",
  "sessionId",
  "sessionOrdinal",
  "actionResourceFingerprint",
  "sourceCatalogFingerprint",
  "entries",
  "entryCount",
  "consumer",
  "assessmentSecrecy",
  "terminalGateAuthority",
  "walletAuthority",
  "masteryAuthority",
  "evidenceAuthority",
  "runtimeAuthority",
  "releaseAuthority",
  "capsuleFingerprint",
] as const);
const ENTRY_KEYS = Object.freeze([
  "taskId",
  "activityId",
  "promptId",
  "slot",
  "savablePhraseRef",
  "targetText",
  "meaningByLocale",
  "entryFingerprint",
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

function exactId(value: unknown): string {
  if (
    typeof value !== "string" ||
    !ID_RE.test(value) ||
    RESERVED_KEYS.has(value)
  )
    fail("learning_v2_post_terminal_card_capsule_identity_invalid");
  return value;
}

function exactHash(value: unknown): string {
  if (typeof value !== "string" || !HASH_RE.test(value))
    fail("learning_v2_post_terminal_card_capsule_hash_invalid");
  return value;
}

function exactText(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.trim() !== value ||
    value.normalize("NFC") !== value ||
    CONTROL_OR_BIDI_RE.test(value) ||
    utf8ByteLengthV1(value) > 4_000
  )
    fail("learning_v2_post_terminal_card_capsule_text_invalid");
  return value;
}

function exactMeanings(value: unknown): LearningV2Localized<string> {
  if (!isPlainObject(value))
    fail("learning_v2_post_terminal_card_capsule_meanings_invalid");
  const keys = Object.keys(value);
  if (
    keys.length !== LEARNING_V2_INTERFACE_LOCALES.length ||
    LEARNING_V2_INTERFACE_LOCALES.some((locale) => !keys.includes(locale))
  )
    fail("learning_v2_post_terminal_card_capsule_meanings_invalid");
  const result = {} as Record<string, string>;
  for (const locale of LEARNING_V2_INTERFACE_LOCALES)
    result[locale] = exactText(value[locale]);
  return Object.freeze(result) as LearningV2Localized<string>;
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
  while (stack.length > 0) {
    const current = stack.pop()!;
    nodes += 1;
    if (nodes > 4_000 || current.depth > 12)
      fail("learning_v2_post_terminal_card_capsule_complexity_invalid");
    const value = current.value;
    if (typeof value === "string") continue;
    if (value === null || typeof value === "boolean") continue;
    if (typeof value === "number") {
      if (!Number.isSafeInteger(value) || Object.is(value, -0))
        fail("learning_v2_post_terminal_card_capsule_number_invalid");
      continue;
    }
    if (Array.isArray(value)) {
      value.forEach((child) =>
        stack.push({ value: child, depth: current.depth + 1 }),
      );
      continue;
    }
    if (!isPlainObject(value))
      fail("learning_v2_post_terminal_card_capsule_json_invalid");
    const keys = Object.keys(value);
    if (keys.some((key) => RESERVED_KEYS.has(key)))
      fail("learning_v2_post_terminal_card_capsule_fields_invalid");
    keys.forEach((key) =>
      stack.push({ value: value[key], depth: current.depth + 1 }),
    );
  }
}

function parseEntry(
  value: unknown,
): LearningV2ActivityPostTerminalCardCapsuleEntryV1 {
  if (!isPlainObject(value))
    fail("learning_v2_post_terminal_card_capsule_entry_invalid");
  exactKeys(
    value,
    ENTRY_KEYS,
    "learning_v2_post_terminal_card_capsule_entry_invalid",
  );
  const body = {
    taskId: exactId(value.taskId),
    activityId: exactId(value.activityId),
    promptId: exactId(value.promptId),
    slot: Number(value.slot),
    savablePhraseRef: exactHash(value.savablePhraseRef),
    targetText: exactText(value.targetText),
    meaningByLocale: exactMeanings(value.meaningByLocale),
  };
  if (!Number.isSafeInteger(value.slot) || body.slot < 1 || body.slot > 12)
    fail("learning_v2_post_terminal_card_capsule_entry_invalid");
  const entryFingerprint = exactHash(value.entryFingerprint);
  if (hashCanonicalBody(body) !== entryFingerprint)
    fail("learning_v2_post_terminal_card_capsule_entry_fingerprint_invalid");
  return Object.freeze({ ...body, entryFingerprint });
}

function validateCapsule(
  value: unknown,
): LearningV2ActivityPostTerminalCardCapsuleV1 {
  if (!isPlainObject(value))
    fail("learning_v2_post_terminal_card_capsule_invalid");
  exactKeys(value, ROOT_KEYS, "learning_v2_post_terminal_card_capsule_invalid");
  if (
    value.schemaVersion !==
      LEARNING_V2_ACTIVITY_POST_TERMINAL_CARD_CAPSULE_SCHEMA_V1 ||
    typeof value.targetLanguage !== "string" ||
    !LANGUAGE_RE.test(value.targetLanguage)
  )
    fail("learning_v2_post_terminal_card_capsule_invalid");
  const episodeId = exactId(value.episodeId);
  const sessionId = exactId(value.sessionId);
  if (
    !Number.isSafeInteger(value.sessionOrdinal) ||
    Number(value.sessionOrdinal) < 1 ||
    Number(value.sessionOrdinal) > 12 ||
    !Array.isArray(value.entries) ||
    value.entries.length !== 12 ||
    value.entryCount !== 12
  )
    fail("learning_v2_post_terminal_card_capsule_invalid");
  const actionResourceFingerprint = exactHash(value.actionResourceFingerprint);
  const sourceCatalogFingerprint = exactHash(value.sourceCatalogFingerprint);
  const entries = value.entries.map(parseEntry);
  entries.forEach((entry, index) => {
    if (entry.slot !== index + 1)
      fail("learning_v2_post_terminal_card_capsule_order_invalid");
  });
  if (
    new Set(entries.map((entry) => entry.taskId)).size !== 12 ||
    new Set(entries.map((entry) => entry.activityId)).size !== 12 ||
    new Set(entries.map((entry) => entry.savablePhraseRef)).size !== 12
  )
    fail("learning_v2_post_terminal_card_capsule_identity_invalid");
  if (
    value.consumer !== "app_internal_post_terminal_save_only" ||
    value.assessmentSecrecy !== "none_device_inspectable" ||
    value.terminalGateAuthority !== "local_terminal_state_only" ||
    value.walletAuthority !== "none" ||
    value.masteryAuthority !== "none" ||
    value.evidenceAuthority !== "none" ||
    value.runtimeAuthority !== "none_release_binding_required" ||
    value.releaseAuthority !== false
  )
    fail("learning_v2_post_terminal_card_capsule_authority_invalid");
  const body = {
    schemaVersion: LEARNING_V2_ACTIVITY_POST_TERMINAL_CARD_CAPSULE_SCHEMA_V1,
    episodeId,
    targetLanguage: value.targetLanguage,
    sessionId,
    sessionOrdinal: Number(value.sessionOrdinal),
    actionResourceFingerprint,
    sourceCatalogFingerprint,
    entries: Object.freeze(entries),
    entryCount: 12 as const,
    consumer: "app_internal_post_terminal_save_only" as const,
    assessmentSecrecy: "none_device_inspectable" as const,
    terminalGateAuthority: "local_terminal_state_only" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    runtimeAuthority: "none_release_binding_required" as const,
    releaseAuthority: false as const,
  };
  const capsuleFingerprint = exactHash(value.capsuleFingerprint);
  if (hashCanonicalBody(body) !== capsuleFingerprint)
    fail("learning_v2_post_terminal_card_capsule_fingerprint_invalid");
  return deepFreeze({ ...body, capsuleFingerprint });
}

export function materializeLearningV2ActivityPostTerminalCardCapsuleV1(
  catalog: LearningV2ActivityPostTerminalCardCatalogV1,
  actionResource: LearningV2ActivityLearnerActionResourceV1,
): LearningV2ActivityPostTerminalCardCapsuleV1 {
  if (
    !isLearningV2ActivityPostTerminalCardCatalogV1(catalog) ||
    !isLearningV2ActivityLearnerActionResourceV1(actionResource) ||
    catalog.actionResourceFingerprint !== actionResource.resourceFingerprint ||
    catalog.entries.length !== actionResource.entries.length
  )
    fail("learning_v2_post_terminal_card_capsule_source_invalid");
  const entries = catalog.entries.map((entry, index) => {
    const action = actionResource.entries[index];
    if (
      !action ||
      action.taskId !== entry.taskId ||
      action.activityId !== entry.activityId ||
      action.promptId !== entry.promptId ||
      action.slot !== entry.slot ||
      action.save.savablePhraseRef !== entry.savablePhraseRef
    )
      fail("learning_v2_post_terminal_card_capsule_source_invalid");
    const body = {
      taskId: entry.taskId,
      activityId: entry.activityId,
      promptId: entry.promptId,
      slot: entry.slot,
      savablePhraseRef: entry.savablePhraseRef,
      targetText: entry.targetText,
      meaningByLocale: entry.meaningByLocale,
    };
    return Object.freeze({
      ...body,
      entryFingerprint: hashCanonicalBody(body),
    });
  });
  const body = {
    schemaVersion: LEARNING_V2_ACTIVITY_POST_TERMINAL_CARD_CAPSULE_SCHEMA_V1,
    episodeId: catalog.episodeId,
    targetLanguage: catalog.targetLanguage,
    sessionId: catalog.sessionId,
    sessionOrdinal: catalog.sessionOrdinal,
    actionResourceFingerprint: actionResource.resourceFingerprint,
    sourceCatalogFingerprint: catalog.catalogFingerprint,
    entries,
    entryCount: 12 as const,
    consumer: "app_internal_post_terminal_save_only" as const,
    assessmentSecrecy: "none_device_inspectable" as const,
    terminalGateAuthority: "local_terminal_state_only" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    runtimeAuthority: "none_release_binding_required" as const,
    releaseAuthority: false as const,
  };
  return parseLearningV2ActivityPostTerminalCardCapsuleV1(
    canonicalJsonV1({
      ...body,
      capsuleFingerprint: hashCanonicalBody(body),
    }),
  );
}

export function parseLearningV2ActivityPostTerminalCardCapsuleV1(
  raw: string,
): LearningV2ActivityPostTerminalCardCapsuleV1 {
  if (
    typeof raw !== "string" ||
    raw.length > LEARNING_V2_ACTIVITY_POST_TERMINAL_CARD_CAPSULE_MAX_BYTES_V1 ||
    utf8ByteLengthV1(raw) >
      LEARNING_V2_ACTIVITY_POST_TERMINAL_CARD_CAPSULE_MAX_BYTES_V1
  )
    fail("learning_v2_post_terminal_card_capsule_raw_invalid");
  let candidate: unknown;
  try {
    candidate = JSON.parse(raw);
  } catch {
    fail("learning_v2_post_terminal_card_capsule_json_invalid");
  }
  preflightJson(candidate);
  if (canonicalJsonV1(candidate) !== raw)
    fail("learning_v2_post_terminal_card_capsule_noncanonical");
  const result = validateCapsule(candidate);
  capsuleHandles.add(result);
  return result;
}

export function encodeLearningV2ActivityPostTerminalCardCapsuleV1(
  capsule: LearningV2ActivityPostTerminalCardCapsuleV1,
): string {
  if (!isLearningV2ActivityPostTerminalCardCapsuleV1(capsule))
    fail("learning_v2_post_terminal_card_capsule_handle_invalid");
  return canonicalJsonV1(capsule);
}

export function isLearningV2ActivityPostTerminalCardCapsuleV1(
  value: unknown,
): value is LearningV2ActivityPostTerminalCardCapsuleV1 {
  return (
    typeof value === "object" && value !== null && capsuleHandles.has(value)
  );
}

export function resolveLearningV2ActivityPostTerminalCardV1(
  input: Readonly<{
    capsule: LearningV2ActivityPostTerminalCardCapsuleV1;
    actionResource: LearningV2ActivityLearnerActionResourceV1;
    taskId: string;
    activityId: string;
    savablePhraseRef: string;
    interfaceLocale: LearningV2InterfaceLocale;
    terminalState: "completed" | "skipped" | "not_terminal";
  }>,
): LearningV2ActivityPostTerminalCardResultV1 {
  if (
    !isPlainObject(input) ||
    Object.keys(input).sort().join("|") !==
      "actionResource|activityId|capsule|interfaceLocale|savablePhraseRef|taskId|terminalState" ||
    !isLearningV2ActivityPostTerminalCardCapsuleV1(input.capsule) ||
    !isLearningV2ActivityLearnerActionResourceV1(input.actionResource) ||
    input.capsule.actionResourceFingerprint !==
      input.actionResource.resourceFingerprint ||
    input.terminalState !== "completed" ||
    !LEARNING_V2_INTERFACE_LOCALES.includes(input.interfaceLocale)
  )
    fail("learning_v2_post_terminal_card_capsule_gate_invalid");
  const entry = input.capsule.entries.find(
    (candidate) =>
      candidate.taskId === input.taskId &&
      candidate.activityId === input.activityId &&
      candidate.savablePhraseRef === input.savablePhraseRef,
  );
  const action = input.actionResource.entries.find(
    (candidate) =>
      candidate.taskId === input.taskId &&
      candidate.activityId === input.activityId &&
      candidate.save.savablePhraseRef === input.savablePhraseRef,
  );
  if (!entry || !action)
    fail("learning_v2_post_terminal_card_capsule_identity_mismatch");
  return Object.freeze({
    taskId: entry.taskId,
    activityId: entry.activityId,
    savablePhraseRef: entry.savablePhraseRef,
    targetText: entry.targetText,
    meaning: entry.meaningByLocale[input.interfaceLocale],
    interfaceLocale: input.interfaceLocale,
    sourceCatalogFingerprint: input.capsule.sourceCatalogFingerprint,
    localTerminalAuthority: "ui_save_availability_only" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
  });
}
