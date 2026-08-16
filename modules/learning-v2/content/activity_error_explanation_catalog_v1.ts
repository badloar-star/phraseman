import {
  LEARNING_V2_INTERFACE_LOCALES,
  type LearningV2InterfaceLocale,
  type LearningV2Localized,
} from "./generator_course_contract";
import { V2_REQUIRED_SESSION_FAMILIES_V2 } from "../contracts/activity_catalog_v2";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../policies/decision_registry";
import { LEARNING_V2_LESSON_SESSION_COUNT_V1 } from './course_topology_v1';

export const LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_CATALOG_SCHEMA_V1 =
  "learning-v2-activity-error-explanation-catalog.v1" as const;
export const LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_LEARNER_SCHEMA_V1 =
  "learning-v2-activity-error-explanation-learner.v1" as const;
export const LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_COUNT_V1 = 144 as const;
export const LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_VARIANT_MAX_V1 = 8 as const;
export const LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_CATALOG_MAX_BYTES_V1 =
  16 * 1024 * 1024;
export const LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_LEARNER_MAX_BYTES_V1 =
  4 * 1024 * 1024;

export type LearningV2RequiredActivityFamilyV1 =
  (typeof V2_REQUIRED_SESSION_FAMILIES_V2)[number];
export type LearningV2ErrorExplanationVariantStateV1 =
  | "candidate"
  | "selected_for_preview"
  | "rejected";
export type LearningV2ErrorExplanationVariantOriginV1 =
  | "owner_authored"
  | "generator_candidate";

export interface LearningV2ActivityErrorExplanationVariantV1 {
  readonly variantId: string;
  readonly state: LearningV2ErrorExplanationVariantStateV1;
  readonly origin: LearningV2ErrorExplanationVariantOriginV1;
  readonly provenanceFingerprint: string;
  readonly textByLocale: LearningV2Localized<string>;
}

export interface LearningV2ActivityErrorExplanationEntryV1 {
  readonly explanationId: string;
  readonly episodeId: string;
  readonly sessionId: string;
  readonly sessionOrdinal: number;
  readonly taskId: string;
  readonly activityId: string;
  readonly family: LearningV2RequiredActivityFamilyV1;
  readonly errorKind: "generic_wrong_answer";
  readonly selectedVariantId: string;
  readonly variants: readonly LearningV2ActivityErrorExplanationVariantV1[];
}

export interface LearningV2ActivityErrorExplanationCatalogV1 {
  readonly schemaVersion: typeof LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_CATALOG_SCHEMA_V1;
  readonly catalogId: string;
  readonly packageId: string;
  readonly targetLanguage: string;
  readonly episodeId: string;
  readonly episodeOrdinal: number;
  readonly interfaceLocales: typeof LEARNING_V2_INTERFACE_LOCALES;
  readonly entries: readonly LearningV2ActivityErrorExplanationEntryV1[];
  readonly entryCount: 144;
  readonly filterDimensions: readonly [
    "interface_locale",
    "family",
    "episode",
    "session",
    "task",
  ];
  readonly contentOriginAuthority: "unverified_owner_or_generator_claim";
  readonly selectionAuthority: "preview_only_no_release_authority";
  readonly runtimeAuthority: "none";
  readonly publicationAuthority: "none";
  readonly releaseAuthority: false;
  readonly catalogFingerprint: string;
}

export interface LearningV2ActivityErrorExplanationLearnerEntryV1 {
  readonly explanationRef: string;
  readonly episodeId: string;
  readonly sessionId: string;
  readonly sessionOrdinal: number;
  readonly taskId: string;
  readonly activityId: string;
  readonly family: LearningV2RequiredActivityFamilyV1;
  readonly errorKind: "generic_wrong_answer";
  readonly textByLocale: LearningV2Localized<string>;
  readonly sourceCatalogFingerprint: string;
}

export interface LearningV2ActivityErrorExplanationLearnerProjectionV1 {
  readonly schemaVersion: typeof LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_LEARNER_SCHEMA_V1;
  readonly catalogId: string;
  readonly packageId: string;
  readonly targetLanguage: string;
  readonly episodeId: string;
  readonly episodeOrdinal: number;
  readonly interfaceLocales: typeof LEARNING_V2_INTERFACE_LOCALES;
  readonly entries: readonly LearningV2ActivityErrorExplanationLearnerEntryV1[];
  readonly entryCount: 144;
  readonly sourceCatalogFingerprint: string;
  readonly contentOriginAuthority: "unverified_selected_preview_copy";
  readonly answerKeyAuthority: "none_structural_fields_only_semantic_qa_required";
  readonly runtimeAuthority: "learner_copy_only";
  readonly publicationAuthority: "none";
  readonly releaseAuthority: false;
  readonly projectionFingerprint: string;
}

const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const LANGUAGE_RE = /^[a-z]{2,3}(?:-[A-Za-z0-9]{1,8}){0,15}$/u;
const HASH_RE = /^[a-f0-9]{64}$/u;
const CONTROL_OR_BIDI_RE =
  /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u;
const FAMILY_SET = new Set<string>(V2_REQUIRED_SESSION_FAMILIES_V2);
const CATALOG_KEYS = Object.freeze([
  "schemaVersion",
  "catalogId",
  "packageId",
  "targetLanguage",
  "episodeId",
  "episodeOrdinal",
  "interfaceLocales",
  "entries",
  "entryCount",
  "filterDimensions",
  "contentOriginAuthority",
  "selectionAuthority",
  "runtimeAuthority",
  "publicationAuthority",
  "releaseAuthority",
  "catalogFingerprint",
] as const);
const ENTRY_KEYS = Object.freeze([
  "explanationId",
  "episodeId",
  "sessionId",
  "sessionOrdinal",
  "taskId",
  "activityId",
  "family",
  "errorKind",
  "selectedVariantId",
  "variants",
] as const);
const VARIANT_KEYS = Object.freeze([
  "variantId",
  "state",
  "origin",
  "provenanceFingerprint",
  "textByLocale",
] as const);
const LEARNER_KEYS = Object.freeze([
  "schemaVersion",
  "catalogId",
  "packageId",
  "targetLanguage",
  "episodeId",
  "episodeOrdinal",
  "interfaceLocales",
  "entries",
  "entryCount",
  "sourceCatalogFingerprint",
  "contentOriginAuthority",
  "answerKeyAuthority",
  "runtimeAuthority",
  "publicationAuthority",
  "releaseAuthority",
  "projectionFingerprint",
] as const);
const LEARNER_ENTRY_KEYS = Object.freeze([
  "explanationRef",
  "episodeId",
  "sessionId",
  "sessionOrdinal",
  "taskId",
  "activityId",
  "family",
  "errorKind",
  "textByLocale",
  "sourceCatalogFingerprint",
] as const);
const FILTER_DIMENSIONS = Object.freeze([
  "interface_locale",
  "family",
  "episode",
  "session",
  "task",
] as const);
const catalogHandles = new WeakSet<object>();
const learnerProjectionHandles = new WeakSet<object>();
const RESERVED_KEYS = new Set(["__proto__", "prototype", "constructor"]);

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
  if (typeof value !== "string" || !ID_RE.test(value)) fail(code);
  return value;
}

function exactLocalizedText(value: unknown): LearningV2Localized<string> {
  if (!isPlainObject(value))
    fail("learning_v2_error_explanation_locales_invalid");
  const keys = Object.keys(value);
  if (
    keys.length !== LEARNING_V2_INTERFACE_LOCALES.length ||
    LEARNING_V2_INTERFACE_LOCALES.some((locale) => !keys.includes(locale))
  )
    fail("learning_v2_error_explanation_locales_invalid");
  const result = {} as Record<LearningV2InterfaceLocale, string>;
  for (const locale of LEARNING_V2_INTERFACE_LOCALES) {
    const text = value[locale];
    if (
      typeof text !== "string" ||
      text.length < 1 ||
      text.trim() !== text ||
      text.normalize("NFC") !== text ||
      CONTROL_OR_BIDI_RE.test(text) ||
      utf8ByteLengthV1(text) > 1_000
    )
      fail("learning_v2_error_explanation_text_invalid");
    result[locale] = text;
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
  const stack: Readonly<{ value: unknown; depth: number }>[] = [
    { value: root, depth: 0 },
  ];
  let nodes = 0;
  let arrayEntries = 0;
  while (stack.length > 0) {
    const current = stack.pop()!;
    nodes += 1;
    if (nodes > 40_000 || current.depth > 16)
      fail("learning_v2_error_explanation_catalog_complexity_invalid");
    const value = current.value;
    if (typeof value === "string") {
      if (value.length > 4_096 || value.normalize("NFC") !== value)
        fail("learning_v2_error_explanation_catalog_string_invalid");
      continue;
    }
    if (value === null || typeof value === "boolean") continue;
    if (typeof value === "number") {
      if (!Number.isSafeInteger(value) || Object.is(value, -0))
        fail("learning_v2_error_explanation_catalog_number_invalid");
      continue;
    }
    if (Array.isArray(value)) {
      arrayEntries += value.length;
      if (arrayEntries > 4_000)
        fail("learning_v2_error_explanation_catalog_complexity_invalid");
      value.forEach((child) =>
        stack.push({ value: child, depth: current.depth + 1 }),
      );
      continue;
    }
    if (!isPlainObject(value))
      fail("learning_v2_error_explanation_catalog_json_invalid");
    const keys = Object.keys(value);
    if (
      keys.length > 32 ||
      keys.some((key) => RESERVED_KEYS.has(key) || key.normalize("NFC") !== key)
    )
      fail("learning_v2_error_explanation_catalog_fields_invalid");
    keys.forEach((key) =>
      stack.push({ value: value[key], depth: current.depth + 1 }),
    );
  }
}

function parseEntry(
  value: unknown,
  episodeId: string,
): LearningV2ActivityErrorExplanationEntryV1 {
  if (!isPlainObject(value))
    fail("learning_v2_error_explanation_entry_invalid");
  exactKeys(value, ENTRY_KEYS, "learning_v2_error_explanation_entry_invalid");
  const explanationId = exactId(
    value.explanationId,
    "learning_v2_error_explanation_entry_invalid",
  );
  if (value.episodeId !== episodeId)
    fail("learning_v2_error_explanation_episode_mismatch");
  const sessionId = exactId(
    value.sessionId,
    "learning_v2_error_explanation_entry_invalid",
  );
  if (
    !Number.isSafeInteger(value.sessionOrdinal) ||
    Number(value.sessionOrdinal) < 1 ||
    Number(value.sessionOrdinal) > LEARNING_V2_LESSON_SESSION_COUNT_V1
  )
    fail("learning_v2_error_explanation_session_invalid");
  const taskId = exactId(
    value.taskId,
    "learning_v2_error_explanation_entry_invalid",
  );
  const activityId = exactId(
    value.activityId,
    "learning_v2_error_explanation_entry_invalid",
  );
  if (!FAMILY_SET.has(String(value.family)))
    fail("learning_v2_error_explanation_family_invalid");
  if (value.errorKind !== "generic_wrong_answer")
    fail("learning_v2_error_explanation_kind_invalid");
  const selectedVariantId = exactId(
    value.selectedVariantId,
    "learning_v2_error_explanation_selection_invalid",
  );
  if (
    !Array.isArray(value.variants) ||
    value.variants.length < 1 ||
    value.variants.length >
      LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_VARIANT_MAX_V1
  )
    fail("learning_v2_error_explanation_variants_invalid");
  const variantIds = new Set<string>();
  let selectedCount = 0;
  const variants = value.variants.map((raw) => {
    if (!isPlainObject(raw))
      fail("learning_v2_error_explanation_variant_invalid");
    exactKeys(
      raw,
      VARIANT_KEYS,
      "learning_v2_error_explanation_variant_invalid",
    );
    const variantId = exactId(
      raw.variantId,
      "learning_v2_error_explanation_variant_invalid",
    );
    if (variantIds.has(variantId))
      fail("learning_v2_error_explanation_variant_duplicate");
    variantIds.add(variantId);
    if (
      !["candidate", "selected_for_preview", "rejected"].includes(
        String(raw.state),
      )
    )
      fail("learning_v2_error_explanation_variant_state_invalid");
    if (!["owner_authored", "generator_candidate"].includes(String(raw.origin)))
      fail("learning_v2_error_explanation_variant_origin_invalid");
    if (
      typeof raw.provenanceFingerprint !== "string" ||
      !HASH_RE.test(raw.provenanceFingerprint)
    )
      fail("learning_v2_error_explanation_provenance_invalid");
    if (raw.state === "selected_for_preview") {
      selectedCount += 1;
      if (variantId !== selectedVariantId)
        fail("learning_v2_error_explanation_selection_invalid");
    }
    return Object.freeze({
      variantId,
      state: raw.state,
      origin: raw.origin,
      provenanceFingerprint: raw.provenanceFingerprint,
      textByLocale: exactLocalizedText(raw.textByLocale),
    }) as LearningV2ActivityErrorExplanationVariantV1;
  });
  if (selectedCount !== 1 || !variantIds.has(selectedVariantId))
    fail("learning_v2_error_explanation_selection_invalid");
  return deepFreeze({
    explanationId,
    episodeId,
    sessionId,
    sessionOrdinal: value.sessionOrdinal,
    taskId,
    activityId,
    family: value.family,
    errorKind: value.errorKind,
    selectedVariantId,
    variants,
  } as LearningV2ActivityErrorExplanationEntryV1);
}

function decodeCanonical(
  rawCanonical: string,
  maxBytes: number,
  sizeErrorCode: string,
): Record<string, unknown> {
  if (
    typeof rawCanonical !== "string" ||
    rawCanonical.length > maxBytes ||
    utf8ByteLengthV1(rawCanonical) > maxBytes
  )
    fail(sizeErrorCode);
  let value: unknown;
  try {
    value = JSON.parse(rawCanonical);
  } catch {
    fail("learning_v2_error_explanation_catalog_json_invalid");
  }
  if (!isPlainObject(value))
    fail("learning_v2_error_explanation_catalog_invalid");
  preflightJson(value);
  if (canonicalJsonV1(value) !== rawCanonical)
    fail("learning_v2_error_explanation_catalog_noncanonical");
  return value;
}

export function parseLearningV2ActivityErrorExplanationCatalogV1(
  rawCanonical: string,
): LearningV2ActivityErrorExplanationCatalogV1 {
  const value = decodeCanonical(
    rawCanonical,
    LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_CATALOG_MAX_BYTES_V1,
    "learning_v2_error_explanation_catalog_size_invalid",
  );
  exactKeys(
    value,
    CATALOG_KEYS,
    "learning_v2_error_explanation_catalog_fields_invalid",
  );
  if (
    value.schemaVersion !==
      LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_CATALOG_SCHEMA_V1 ||
    typeof value.targetLanguage !== "string" ||
    !LANGUAGE_RE.test(value.targetLanguage) ||
    !Number.isSafeInteger(value.episodeOrdinal) ||
    Number(value.episodeOrdinal) < 1 ||
    Number(value.episodeOrdinal) > 32 ||
    value.entryCount !== LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_COUNT_V1 ||
    value.contentOriginAuthority !== "unverified_owner_or_generator_claim" ||
    value.selectionAuthority !== "preview_only_no_release_authority" ||
    value.runtimeAuthority !== "none" ||
    value.publicationAuthority !== "none" ||
    value.releaseAuthority !== false
  )
    fail("learning_v2_error_explanation_catalog_identity_invalid");
  const catalogId = exactId(
    value.catalogId,
    "learning_v2_error_explanation_catalog_identity_invalid",
  );
  const packageId = exactId(
    value.packageId,
    "learning_v2_error_explanation_catalog_identity_invalid",
  );
  const episodeId = exactId(
    value.episodeId,
    "learning_v2_error_explanation_catalog_identity_invalid",
  );
  if (
    !Array.isArray(value.interfaceLocales) ||
    value.interfaceLocales.length !== LEARNING_V2_INTERFACE_LOCALES.length ||
    value.interfaceLocales.some(
      (locale, index) => locale !== LEARNING_V2_INTERFACE_LOCALES[index],
    ) ||
    !Array.isArray(value.filterDimensions) ||
    value.filterDimensions.length !== FILTER_DIMENSIONS.length ||
    value.filterDimensions.some(
      (dimension, index) => dimension !== FILTER_DIMENSIONS[index],
    ) ||
    !Array.isArray(value.entries) ||
    value.entries.length !== LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_COUNT_V1
  )
    fail("learning_v2_error_explanation_catalog_shape_invalid");
  const explanationIds = new Set<string>();
  const taskIds = new Set<string>();
  const activityIds = new Set<string>();
  const perSession = new Map<number, number>();
  const entries = value.entries.map((raw, index) => {
    const entry = parseEntry(raw, episodeId);
    if (entry.sessionOrdinal !== Math.floor(index / 12) + 1)
      fail("learning_v2_error_explanation_catalog_order_invalid");
    if (
      explanationIds.has(entry.explanationId) ||
      taskIds.has(entry.taskId) ||
      activityIds.has(entry.activityId)
    )
      fail("learning_v2_error_explanation_catalog_duplicate");
    explanationIds.add(entry.explanationId);
    taskIds.add(entry.taskId);
    activityIds.add(entry.activityId);
    perSession.set(
      entry.sessionOrdinal,
      (perSession.get(entry.sessionOrdinal) ?? 0) + 1,
    );
    return entry;
  });
  if (
    perSession.size !== 12 ||
    [...perSession.values()].some((count) => count !== 12)
  )
    fail("learning_v2_error_explanation_session_bijection_invalid");
  const body = {
    ...value,
    catalogId,
    packageId,
    episodeId,
    interfaceLocales: LEARNING_V2_INTERFACE_LOCALES,
    entries,
    filterDimensions: FILTER_DIMENSIONS,
  } as unknown as LearningV2ActivityErrorExplanationCatalogV1;
  const { catalogFingerprint: _ignored, ...withoutFingerprint } = body;
  if (
    typeof value.catalogFingerprint !== "string" ||
    value.catalogFingerprint !== hashCanonicalBody(withoutFingerprint)
  )
    fail("learning_v2_error_explanation_catalog_fingerprint_invalid");
  const result = deepFreeze(body);
  catalogHandles.add(result);
  return result;
}

export function encodeLearningV2ActivityErrorExplanationCatalogV1(
  body: Omit<LearningV2ActivityErrorExplanationCatalogV1, "catalogFingerprint">,
): string {
  const rawBody = canonicalJsonV1(body);
  const decoded = JSON.parse(rawBody) as Record<string, unknown>;
  return canonicalJsonV1({
    ...decoded,
    catalogFingerprint: hashCanonicalBody(decoded),
  });
}

export function isLearningV2ActivityErrorExplanationCatalogV1(
  value: unknown,
): value is LearningV2ActivityErrorExplanationCatalogV1 {
  return (
    typeof value === "object" && value !== null && catalogHandles.has(value)
  );
}

export function projectLearningV2ActivityErrorExplanationsForLearnerV1(
  catalog: LearningV2ActivityErrorExplanationCatalogV1,
): LearningV2ActivityErrorExplanationLearnerProjectionV1 {
  if (!isLearningV2ActivityErrorExplanationCatalogV1(catalog))
    fail("learning_v2_error_explanation_catalog_handle_invalid");
  const entries = catalog.entries.map((entry) => {
    const selected = entry.variants.find(
      (variant) => variant.variantId === entry.selectedVariantId,
    );
    if (!selected || selected.state !== "selected_for_preview")
      fail("learning_v2_error_explanation_selection_invalid");
    return deepFreeze({
      explanationRef: `error-explanation-${hashCanonicalBody({
        schemaVersion: "learning-v2-error-explanation-ref.v1",
        explanationId: entry.explanationId,
        variantId: selected.variantId,
        sourceCatalogFingerprint: catalog.catalogFingerprint,
      })}`,
      episodeId: entry.episodeId,
      sessionId: entry.sessionId,
      sessionOrdinal: entry.sessionOrdinal,
      taskId: entry.taskId,
      activityId: entry.activityId,
      family: entry.family,
      errorKind: entry.errorKind,
      textByLocale: selected.textByLocale,
      sourceCatalogFingerprint: catalog.catalogFingerprint,
    } as LearningV2ActivityErrorExplanationLearnerEntryV1);
  });
  const body = {
    schemaVersion: LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_LEARNER_SCHEMA_V1,
    catalogId: catalog.catalogId,
    packageId: catalog.packageId,
    targetLanguage: catalog.targetLanguage,
    episodeId: catalog.episodeId,
    episodeOrdinal: catalog.episodeOrdinal,
    interfaceLocales: LEARNING_V2_INTERFACE_LOCALES,
    entries: Object.freeze(entries),
    entryCount: LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_COUNT_V1,
    sourceCatalogFingerprint: catalog.catalogFingerprint,
    contentOriginAuthority: "unverified_selected_preview_copy" as const,
    answerKeyAuthority:
      "none_structural_fields_only_semantic_qa_required" as const,
    runtimeAuthority: "learner_copy_only" as const,
    publicationAuthority: "none" as const,
    releaseAuthority: false as const,
  };
  const result = deepFreeze({
    ...body,
    projectionFingerprint: hashCanonicalBody(body),
  });
  learnerProjectionHandles.add(result);
  return result;
}

export function encodeLearningV2ActivityErrorExplanationLearnerProjectionV1(
  projection: LearningV2ActivityErrorExplanationLearnerProjectionV1,
): string {
  if (
    typeof projection !== "object" ||
    projection === null ||
    !learnerProjectionHandles.has(projection)
  )
    fail("learning_v2_error_explanation_projection_handle_invalid");
  return canonicalJsonV1(projection);
}

export function parseLearningV2ActivityErrorExplanationLearnerProjectionV1(
  rawCanonical: string,
): LearningV2ActivityErrorExplanationLearnerProjectionV1 {
  const value = decodeCanonical(
    rawCanonical,
    LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_LEARNER_MAX_BYTES_V1,
    "learning_v2_error_explanation_projection_size_invalid",
  );
  exactKeys(
    value,
    LEARNER_KEYS,
    "learning_v2_error_explanation_projection_fields_invalid",
  );
  if (
    value.schemaVersion !==
      LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_LEARNER_SCHEMA_V1 ||
    typeof value.targetLanguage !== "string" ||
    !LANGUAGE_RE.test(value.targetLanguage) ||
    !Number.isSafeInteger(value.episodeOrdinal) ||
    Number(value.episodeOrdinal) < 1 ||
    Number(value.episodeOrdinal) > 32 ||
    value.entryCount !== LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_COUNT_V1 ||
    typeof value.sourceCatalogFingerprint !== "string" ||
    !HASH_RE.test(value.sourceCatalogFingerprint) ||
    value.contentOriginAuthority !== "unverified_selected_preview_copy" ||
    value.answerKeyAuthority !==
      "none_structural_fields_only_semantic_qa_required" ||
    value.runtimeAuthority !== "learner_copy_only" ||
    value.publicationAuthority !== "none" ||
    value.releaseAuthority !== false
  )
    fail("learning_v2_error_explanation_projection_identity_invalid");
  const catalogId = exactId(
    value.catalogId,
    "learning_v2_error_explanation_projection_identity_invalid",
  );
  const packageId = exactId(
    value.packageId,
    "learning_v2_error_explanation_projection_identity_invalid",
  );
  const episodeId = exactId(
    value.episodeId,
    "learning_v2_error_explanation_projection_identity_invalid",
  );
  if (
    !Array.isArray(value.interfaceLocales) ||
    value.interfaceLocales.length !== LEARNING_V2_INTERFACE_LOCALES.length ||
    value.interfaceLocales.some(
      (locale, index) => locale !== LEARNING_V2_INTERFACE_LOCALES[index],
    ) ||
    !Array.isArray(value.entries) ||
    value.entries.length !== LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_COUNT_V1
  )
    fail("learning_v2_error_explanation_projection_shape_invalid");
  const taskIds = new Set<string>();
  const activityIds = new Set<string>();
  const explanationRefs = new Set<string>();
  const entries = value.entries.map((raw, index) => {
    if (!isPlainObject(raw))
      fail("learning_v2_error_explanation_projection_entry_invalid");
    exactKeys(
      raw,
      LEARNER_ENTRY_KEYS,
      "learning_v2_error_explanation_projection_entry_invalid",
    );
    const explanationRef = exactId(
      raw.explanationRef,
      "learning_v2_error_explanation_projection_entry_invalid",
    );
    const sessionId = exactId(
      raw.sessionId,
      "learning_v2_error_explanation_projection_entry_invalid",
    );
    const taskId = exactId(
      raw.taskId,
      "learning_v2_error_explanation_projection_entry_invalid",
    );
    const activityId = exactId(
      raw.activityId,
      "learning_v2_error_explanation_projection_entry_invalid",
    );
    if (
      raw.episodeId !== episodeId ||
      raw.sessionOrdinal !== Math.floor(index / 12) + 1 ||
      !FAMILY_SET.has(String(raw.family)) ||
      raw.errorKind !== "generic_wrong_answer" ||
      raw.sourceCatalogFingerprint !== value.sourceCatalogFingerprint ||
      taskIds.has(taskId) ||
      activityIds.has(activityId) ||
      explanationRefs.has(explanationRef)
    )
      fail("learning_v2_error_explanation_projection_bijection_invalid");
    taskIds.add(taskId);
    activityIds.add(activityId);
    explanationRefs.add(explanationRef);
    return deepFreeze({
      explanationRef,
      episodeId,
      sessionId,
      sessionOrdinal: raw.sessionOrdinal,
      taskId,
      activityId,
      family: raw.family,
      errorKind: raw.errorKind,
      textByLocale: exactLocalizedText(raw.textByLocale),
      sourceCatalogFingerprint: raw.sourceCatalogFingerprint,
    } as LearningV2ActivityErrorExplanationLearnerEntryV1);
  });
  const body = {
    schemaVersion: LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_LEARNER_SCHEMA_V1,
    catalogId,
    packageId,
    targetLanguage: value.targetLanguage as string,
    episodeId,
    episodeOrdinal: value.episodeOrdinal as number,
    interfaceLocales: LEARNING_V2_INTERFACE_LOCALES,
    entries: Object.freeze(entries),
    entryCount: LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_COUNT_V1,
    sourceCatalogFingerprint: value.sourceCatalogFingerprint as string,
    contentOriginAuthority: "unverified_selected_preview_copy" as const,
    answerKeyAuthority:
      "none_structural_fields_only_semantic_qa_required" as const,
    runtimeAuthority: "learner_copy_only" as const,
    publicationAuthority: "none" as const,
    releaseAuthority: false as const,
  };
  if (
    typeof value.projectionFingerprint !== "string" ||
    value.projectionFingerprint !== hashCanonicalBody(body)
  )
    fail("learning_v2_error_explanation_projection_fingerprint_invalid");
  const result = deepFreeze({
    ...body,
    projectionFingerprint: value.projectionFingerprint,
  });
  learnerProjectionHandles.add(result);
  return result;
}

export function resolveLearningV2ActivityErrorExplanationV1(
  projection: LearningV2ActivityErrorExplanationLearnerProjectionV1,
  input: Readonly<{
    taskId: string;
    activityId: string;
    interfaceLocale: LearningV2InterfaceLocale;
  }>,
): Readonly<{ explanationRef: string; localizedText: string }> {
  if (
    typeof projection !== "object" ||
    projection === null ||
    !learnerProjectionHandles.has(projection) ||
    !LEARNING_V2_INTERFACE_LOCALES.includes(input.interfaceLocale)
  )
    fail("learning_v2_error_explanation_projection_handle_invalid");
  const entry = projection.entries.find(
    (candidate) =>
      candidate.taskId === input.taskId &&
      candidate.activityId === input.activityId,
  );
  if (!entry) fail("learning_v2_error_explanation_runtime_entry_missing");
  return Object.freeze({
    explanationRef: entry.explanationRef,
    localizedText: entry.textByLocale[input.interfaceLocale],
  });
}
