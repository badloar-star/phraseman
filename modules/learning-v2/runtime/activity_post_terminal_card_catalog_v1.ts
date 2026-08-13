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
  getLearningV2ActivityLearnerActionEntryV1,
  isLearningV2ActivityLearnerActionResourceV1,
  type LearningV2ActivityLearnerActionResourceV1,
} from "./activity_learner_action_resource_v1";

export const LEARNING_V2_ACTIVITY_POST_TERMINAL_CARD_CATALOG_SCHEMA_V1 =
  "learning-v2-activity-post-terminal-card-catalog.v1" as const;
export const LEARNING_V2_ACTIVITY_POST_TERMINAL_CARD_CATALOG_MAX_BYTES_V1 =
  512 * 1024;
export const LEARNING_V2_ACTIVITY_POST_TERMINAL_CARD_COUNT_V1 = 12 as const;

export interface LearningV2ActivityPostTerminalCardEntryV1 {
  readonly taskId: string;
  readonly activityId: string;
  readonly promptId: string;
  readonly slot: number;
  readonly savablePhraseRef: string;
  readonly sourceVisibility: "already_visible_prompt" | "post_terminal_only";
  readonly targetText: string;
  readonly meaningByLocale: LearningV2Localized<string>;
  readonly provenanceFingerprint: string;
  readonly entryFingerprint: string;
}

export interface LearningV2ActivityPostTerminalCardCatalogV1 {
  readonly schemaVersion: typeof LEARNING_V2_ACTIVITY_POST_TERMINAL_CARD_CATALOG_SCHEMA_V1;
  readonly catalogId: string;
  readonly packageId: string;
  readonly episodeId: string;
  readonly targetLanguage: string;
  readonly sessionId: string;
  readonly sessionOrdinal: number;
  readonly actionResourceFingerprint: string;
  readonly entries: readonly LearningV2ActivityPostTerminalCardEntryV1[];
  readonly entryCount: 12;
  readonly contentOriginAuthority: "unverified_owner_or_generator_claim";
  readonly terminalEvidenceAuthority: "none_runtime_terminal_gate_required";
  readonly clientDelivery: "forbidden";
  readonly artifactStorageAuthority: "none";
  readonly runtimeAuthority: "none";
  readonly publicationAuthority: "none";
  readonly releaseAuthority: false;
  readonly catalogFingerprint: string;
}

export interface LearningV2ActivityPostTerminalCardDeclarationV1 {
  readonly taskId: string;
  readonly targetText: string;
  readonly meaningByLocale: LearningV2Localized<string>;
  readonly provenanceFingerprint: string;
}

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const HASH_RE = /^[a-f0-9]{64}$/u;
const LANGUAGE_RE = /^[a-z]{2,3}(?:-[A-Za-z0-9]{1,8}){0,15}$/u;
const CONTROL_OR_BIDI_RE =
  /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u;
const RESERVED_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const catalogHandles = new WeakSet<object>();
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
] as const);
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

function exactText(value: unknown, code: string): string {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.trim() !== value ||
    value.normalize("NFC") !== value ||
    CONTROL_OR_BIDI_RE.test(value) ||
    utf8ByteLengthV1(value) > 4_000
  )
    fail(code);
  return value;
}

function exactMeanings(value: unknown): LearningV2Localized<string> {
  if (!isPlainObject(value))
    fail("learning_v2_post_terminal_card_meanings_invalid");
  const keys = Object.keys(value);
  if (
    keys.length !== LEARNING_V2_INTERFACE_LOCALES.length ||
    LEARNING_V2_INTERFACE_LOCALES.some((locale) => !keys.includes(locale))
  )
    fail("learning_v2_post_terminal_card_meanings_invalid");
  const result = {} as Record<string, string>;
  for (const locale of LEARNING_V2_INTERFACE_LOCALES) {
    result[locale] = exactText(
      value[locale],
      "learning_v2_post_terminal_card_meanings_invalid",
    );
  }
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
  let arrayEntries = 0;
  while (stack.length > 0) {
    const current = stack.pop()!;
    nodes += 1;
    if (nodes > 4_000 || current.depth > 12)
      fail("learning_v2_post_terminal_card_complexity_invalid");
    const value = current.value;
    if (typeof value === "string") {
      if (value.length > 4_096 || value.normalize("NFC") !== value)
        fail("learning_v2_post_terminal_card_string_invalid");
      continue;
    }
    if (value === null || typeof value === "boolean") continue;
    if (typeof value === "number") {
      if (!Number.isSafeInteger(value) || Object.is(value, -0))
        fail("learning_v2_post_terminal_card_number_invalid");
      continue;
    }
    if (Array.isArray(value)) {
      arrayEntries += value.length;
      if (arrayEntries > 256)
        fail("learning_v2_post_terminal_card_complexity_invalid");
      value.forEach((child) =>
        stack.push({ value: child, depth: current.depth + 1 }),
      );
      continue;
    }
    if (!isPlainObject(value))
      fail("learning_v2_post_terminal_card_json_invalid");
    const keys = Object.keys(value);
    if (
      keys.length > 32 ||
      keys.some((key) => RESERVED_KEYS.has(key) || key.normalize("NFC") !== key)
    )
      fail("learning_v2_post_terminal_card_fields_invalid");
    keys.forEach((key) =>
      stack.push({ value: value[key], depth: current.depth + 1 }),
    );
  }
}

function parseEntry(value: unknown): LearningV2ActivityPostTerminalCardEntryV1 {
  if (!isPlainObject(value))
    fail("learning_v2_post_terminal_card_entry_invalid");
  exactKeys(value, ENTRY_KEYS, "learning_v2_post_terminal_card_entry_invalid");
  const taskId = exactId(
    value.taskId,
    "learning_v2_post_terminal_card_entry_invalid",
  );
  const activityId = exactId(
    value.activityId,
    "learning_v2_post_terminal_card_entry_invalid",
  );
  const promptId = exactId(
    value.promptId,
    "learning_v2_post_terminal_card_entry_invalid",
  );
  if (
    !Number.isSafeInteger(value.slot) ||
    Number(value.slot) < 1 ||
    Number(value.slot) > 12
  )
    fail("learning_v2_post_terminal_card_entry_invalid");
  const savablePhraseRef = exactHash(
    value.savablePhraseRef,
    "learning_v2_post_terminal_card_entry_invalid",
  );
  if (
    value.sourceVisibility !== "already_visible_prompt" &&
    value.sourceVisibility !== "post_terminal_only"
  )
    fail("learning_v2_post_terminal_card_entry_invalid");
  const targetText = exactText(
    value.targetText,
    "learning_v2_post_terminal_card_entry_invalid",
  );
  const meaningByLocale = exactMeanings(value.meaningByLocale);
  const provenanceFingerprint = exactHash(
    value.provenanceFingerprint,
    "learning_v2_post_terminal_card_entry_invalid",
  );
  const body = {
    taskId,
    activityId,
    promptId,
    slot: Number(value.slot),
    savablePhraseRef,
    sourceVisibility: value.sourceVisibility as
      | "already_visible_prompt"
      | "post_terminal_only",
    targetText,
    meaningByLocale,
    provenanceFingerprint,
  };
  const entryFingerprint = exactHash(
    value.entryFingerprint,
    "learning_v2_post_terminal_card_entry_invalid",
  );
  if (hashCanonicalBody(body) !== entryFingerprint)
    fail("learning_v2_post_terminal_card_entry_fingerprint_invalid");
  return Object.freeze({ ...body, entryFingerprint });
}

function validateCatalog(
  value: unknown,
): LearningV2ActivityPostTerminalCardCatalogV1 {
  if (!isPlainObject(value))
    fail("learning_v2_post_terminal_card_catalog_invalid");
  exactKeys(value, ROOT_KEYS, "learning_v2_post_terminal_card_catalog_invalid");
  if (
    value.schemaVersion !==
      LEARNING_V2_ACTIVITY_POST_TERMINAL_CARD_CATALOG_SCHEMA_V1 ||
    typeof value.targetLanguage !== "string" ||
    !LANGUAGE_RE.test(value.targetLanguage)
  )
    fail("learning_v2_post_terminal_card_catalog_invalid");
  const catalogId = exactId(
    value.catalogId,
    "learning_v2_post_terminal_card_catalog_invalid",
  );
  const packageId = exactId(
    value.packageId,
    "learning_v2_post_terminal_card_catalog_invalid",
  );
  const episodeId = exactId(
    value.episodeId,
    "learning_v2_post_terminal_card_catalog_invalid",
  );
  const sessionId = exactId(
    value.sessionId,
    "learning_v2_post_terminal_card_catalog_invalid",
  );
  if (
    !Number.isSafeInteger(value.sessionOrdinal) ||
    Number(value.sessionOrdinal) < 1 ||
    Number(value.sessionOrdinal) > 12
  )
    fail("learning_v2_post_terminal_card_catalog_invalid");
  const actionResourceFingerprint = exactHash(
    value.actionResourceFingerprint,
    "learning_v2_post_terminal_card_catalog_invalid",
  );
  if (
    !Array.isArray(value.entries) ||
    value.entries.length !== LEARNING_V2_ACTIVITY_POST_TERMINAL_CARD_COUNT_V1 ||
    value.entryCount !== LEARNING_V2_ACTIVITY_POST_TERMINAL_CARD_COUNT_V1
  )
    fail("learning_v2_post_terminal_card_count_invalid");
  const entries = value.entries.map(parseEntry);
  const taskIds = new Set<string>();
  const activityIds = new Set<string>();
  const refs = new Set<string>();
  entries.forEach((entry, index) => {
    if (
      entry.slot !== index + 1 ||
      taskIds.has(entry.taskId) ||
      activityIds.has(entry.activityId) ||
      refs.has(entry.savablePhraseRef)
    )
      fail("learning_v2_post_terminal_card_identity_invalid");
    taskIds.add(entry.taskId);
    activityIds.add(entry.activityId);
    refs.add(entry.savablePhraseRef);
  });
  if (
    value.contentOriginAuthority !== "unverified_owner_or_generator_claim" ||
    value.terminalEvidenceAuthority !== "none_runtime_terminal_gate_required" ||
    value.clientDelivery !== "forbidden" ||
    value.artifactStorageAuthority !== "none" ||
    value.runtimeAuthority !== "none" ||
    value.publicationAuthority !== "none" ||
    value.releaseAuthority !== false
  )
    fail("learning_v2_post_terminal_card_authority_invalid");
  const body = {
    schemaVersion: LEARNING_V2_ACTIVITY_POST_TERMINAL_CARD_CATALOG_SCHEMA_V1,
    catalogId,
    packageId,
    episodeId,
    targetLanguage: value.targetLanguage,
    sessionId,
    sessionOrdinal: Number(value.sessionOrdinal),
    actionResourceFingerprint,
    entries: Object.freeze(entries),
    entryCount: LEARNING_V2_ACTIVITY_POST_TERMINAL_CARD_COUNT_V1,
    contentOriginAuthority: "unverified_owner_or_generator_claim" as const,
    terminalEvidenceAuthority: "none_runtime_terminal_gate_required" as const,
    clientDelivery: "forbidden" as const,
    artifactStorageAuthority: "none" as const,
    runtimeAuthority: "none" as const,
    publicationAuthority: "none" as const,
    releaseAuthority: false as const,
  };
  const catalogFingerprint = exactHash(
    value.catalogFingerprint,
    "learning_v2_post_terminal_card_catalog_invalid",
  );
  if (hashCanonicalBody(body) !== catalogFingerprint)
    fail("learning_v2_post_terminal_card_catalog_fingerprint_invalid");
  return deepFreeze({ ...body, catalogFingerprint });
}

export function materializeLearningV2ActivityPostTerminalCardCatalogV1(
  input: Readonly<{
    catalogId: string;
    packageId: string;
    actionResource: LearningV2ActivityLearnerActionResourceV1;
    declarations: readonly LearningV2ActivityPostTerminalCardDeclarationV1[];
  }>,
): LearningV2ActivityPostTerminalCardCatalogV1 {
  if (
    !isPlainObject(input) ||
    Object.keys(input).sort().join("|") !==
      "actionResource|catalogId|declarations|packageId" ||
    !isLearningV2ActivityLearnerActionResourceV1(input.actionResource) ||
    !Array.isArray(input.declarations) ||
    input.declarations.length !==
      LEARNING_V2_ACTIVITY_POST_TERMINAL_CARD_COUNT_V1
  )
    fail("learning_v2_post_terminal_card_materialization_invalid");
  const declarations = new Map<
    string,
    LearningV2ActivityPostTerminalCardDeclarationV1
  >();
  for (const declaration of input.declarations) {
    if (
      !isPlainObject(declaration) ||
      Object.keys(declaration).sort().join("|") !==
        "meaningByLocale|provenanceFingerprint|targetText|taskId" ||
      typeof declaration.taskId !== "string" ||
      declarations.has(declaration.taskId)
    )
      fail("learning_v2_post_terminal_card_materialization_invalid");
    declarations.set(
      declaration.taskId,
      declaration as unknown as LearningV2ActivityPostTerminalCardDeclarationV1,
    );
  }
  const entries = input.actionResource.entries.map((actionEntry) => {
    const declaration = declarations.get(actionEntry.taskId);
    if (!declaration)
      fail("learning_v2_post_terminal_card_materialization_invalid");
    const targetText = exactText(
      declaration.targetText,
      "learning_v2_post_terminal_card_materialization_invalid",
    );
    if (
      actionEntry.save.resolution === "learner_visible_prompt" &&
      actionEntry.save.targetText !== targetText
    )
      fail("learning_v2_post_terminal_card_visible_text_mismatch");
    const body = {
      taskId: actionEntry.taskId,
      activityId: actionEntry.activityId,
      promptId: actionEntry.promptId,
      slot: actionEntry.slot,
      savablePhraseRef: actionEntry.save.savablePhraseRef,
      sourceVisibility:
        actionEntry.save.resolution === "learner_visible_prompt"
          ? ("already_visible_prompt" as const)
          : ("post_terminal_only" as const),
      targetText,
      meaningByLocale: exactMeanings(declaration.meaningByLocale),
      provenanceFingerprint: exactHash(
        declaration.provenanceFingerprint,
        "learning_v2_post_terminal_card_materialization_invalid",
      ),
    };
    return Object.freeze({
      ...body,
      entryFingerprint: hashCanonicalBody(body),
    });
  });
  if (declarations.size !== entries.length)
    fail("learning_v2_post_terminal_card_materialization_invalid");
  const body = {
    schemaVersion: LEARNING_V2_ACTIVITY_POST_TERMINAL_CARD_CATALOG_SCHEMA_V1,
    catalogId: input.catalogId,
    packageId: input.packageId,
    episodeId: input.actionResource.episodeId,
    targetLanguage: input.actionResource.targetLanguage,
    sessionId: input.actionResource.sessionId,
    sessionOrdinal: input.actionResource.sessionOrdinal,
    actionResourceFingerprint: input.actionResource.resourceFingerprint,
    entries,
    entryCount: LEARNING_V2_ACTIVITY_POST_TERMINAL_CARD_COUNT_V1,
    contentOriginAuthority: "unverified_owner_or_generator_claim" as const,
    terminalEvidenceAuthority: "none_runtime_terminal_gate_required" as const,
    clientDelivery: "forbidden" as const,
    artifactStorageAuthority: "none" as const,
    runtimeAuthority: "none" as const,
    publicationAuthority: "none" as const,
    releaseAuthority: false as const,
  };
  return parseLearningV2ActivityPostTerminalCardCatalogV1(
    canonicalJsonV1({
      ...body,
      catalogFingerprint: hashCanonicalBody(body),
    }),
  );
}

export function parseLearningV2ActivityPostTerminalCardCatalogV1(
  raw: string,
): LearningV2ActivityPostTerminalCardCatalogV1 {
  if (
    typeof raw !== "string" ||
    raw.length > LEARNING_V2_ACTIVITY_POST_TERMINAL_CARD_CATALOG_MAX_BYTES_V1 ||
    utf8ByteLengthV1(raw) >
      LEARNING_V2_ACTIVITY_POST_TERMINAL_CARD_CATALOG_MAX_BYTES_V1
  )
    fail("learning_v2_post_terminal_card_raw_invalid");
  let candidate: unknown;
  try {
    candidate = JSON.parse(raw);
  } catch {
    fail("learning_v2_post_terminal_card_json_invalid");
  }
  preflightJson(candidate);
  if (canonicalJsonV1(candidate) !== raw)
    fail("learning_v2_post_terminal_card_noncanonical");
  const result = validateCatalog(candidate);
  catalogHandles.add(result);
  return result;
}

export function encodeLearningV2ActivityPostTerminalCardCatalogV1(
  catalog: LearningV2ActivityPostTerminalCardCatalogV1,
): string {
  if (!isLearningV2ActivityPostTerminalCardCatalogV1(catalog))
    fail("learning_v2_post_terminal_card_handle_invalid");
  return canonicalJsonV1(catalog);
}

export function isLearningV2ActivityPostTerminalCardCatalogV1(
  value: unknown,
): value is LearningV2ActivityPostTerminalCardCatalogV1 {
  return (
    typeof value === "object" && value !== null && catalogHandles.has(value)
  );
}

export function getLearningV2ActivityPostTerminalCardEntryV1(
  catalog: LearningV2ActivityPostTerminalCardCatalogV1,
  actionResource: LearningV2ActivityLearnerActionResourceV1,
  taskId: string,
  activityId: string,
  savablePhraseRef: string,
): LearningV2ActivityPostTerminalCardEntryV1 {
  if (
    !isLearningV2ActivityPostTerminalCardCatalogV1(catalog) ||
    !isLearningV2ActivityLearnerActionResourceV1(actionResource) ||
    catalog.actionResourceFingerprint !== actionResource.resourceFingerprint
  )
    fail("learning_v2_post_terminal_card_handle_invalid");
  const actionEntry = getLearningV2ActivityLearnerActionEntryV1(
    actionResource,
    taskId,
    activityId,
  );
  if (actionEntry.save.savablePhraseRef !== savablePhraseRef)
    fail("learning_v2_post_terminal_card_identity_mismatch");
  const entry = catalog.entries.find(
    (candidate) =>
      candidate.taskId === taskId &&
      candidate.activityId === activityId &&
      candidate.savablePhraseRef === savablePhraseRef,
  );
  if (!entry) fail("learning_v2_post_terminal_card_identity_mismatch");
  return entry;
}
