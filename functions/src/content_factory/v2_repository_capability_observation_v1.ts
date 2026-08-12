import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  validateModeTemplateArtifactBody,
  validateModeTemplateLifecycleHead,
} from "../../../modules/learning-v2/contracts/validation";
import type { ModeTemplateArtifactBody } from "../../../modules/learning-v2/contracts/activity";
import {
  validateV2LanguageProfile,
  type V2LanguageProfileBody,
} from "../../../modules/learning-v2/content/language_profile";
import {
  isV2CanonicalSeasonPlanV2,
  type V2CanonicalSeasonPlanV2,
} from "./v2_canonical_generation_plan_v2";

export const V2_REPOSITORY_CAPABILITY_OBSERVATION_SCHEMA_V1 =
  "v2-repository-capability-observation.v1" as const;
export const V2_ACTIVITY_REPOSITORY_CAPABILITY_BINDING_SCHEMA_V1 =
  "v2-activity-repository-capability-binding.v1" as const;
export const V2_REPOSITORY_CAPABILITY_RECORD_MAX_BYTES_V1 = 64 * 1024;
export const V2_REPOSITORY_CAPABILITY_LIFECYCLE_MAX_BYTES_V1 = 64 * 1024;
export const V2_REPOSITORY_CAPABILITY_MODE_TEMPLATE_MAX_BYTES_V1 = 512 * 1024;
export const V2_REPOSITORY_CAPABILITY_LANGUAGE_PROFILE_MAX_BYTES_V1 =
  128 * 1024;
export const V2_REPOSITORY_CAPABILITY_MAX_TEMPLATES_V1 = 28;
export const V2_REPOSITORY_CAPABILITY_MAX_REQUIREMENTS_V1 = 32;
export const V2_REPOSITORY_CAPABILITY_RECEIPT_MAX_BYTES_V1 = 64 * 1024;
export const V2_REPOSITORY_CAPABILITY_ACTIVITY_MAX_OBJECT_BYTES_V1 =
  V2_REPOSITORY_CAPABILITY_MODE_TEMPLATE_MAX_BYTES_V1 *
    V2_REPOSITORY_CAPABILITY_MAX_TEMPLATES_V1 +
  V2_REPOSITORY_CAPABILITY_LANGUAGE_PROFILE_MAX_BYTES_V1;

const HASH_RE = /^[0-9a-f]{64}$/;
const TOKEN_RE = /^[a-z0-9][a-z0-9._:-]{0,159}$/;
const GENERATION_RE = /^[A-Za-z0-9._:-]{1,160}$/;
const RESERVED_KEYS = new Set(["__proto__", "prototype", "constructor"]);

export type V2RepositoryCapabilityRequirementV1 =
  | Readonly<{
      dependencyType: "language_profile";
      profileId: string;
      version: number;
      contentHash: string;
    }>
  | Readonly<{
      dependencyType: "published_template";
      templateId: string;
      version: number;
      contentHash: string;
    }>;

export interface V2RepositoryObjectReadPermitV1 {
  readonly requirement: V2RepositoryCapabilityRequirementV1;
  readonly objectPath: string;
  readonly contentHash: string;
  readonly objectGeneration: string;
  readonly declaredByteSize: number;
  readonly maxBytes: number;
}

export interface V2RepositoryCapabilityObservationReaderV1 {
  readRecord(
    requirement: V2RepositoryCapabilityRequirementV1,
    phase: "before" | "after",
    maxBytes: number,
  ): Promise<Uint8Array>;
  readLifecycle(
    requirement: V2RepositoryCapabilityRequirementV1,
    phase: "before" | "after",
    maxBytes: number,
  ): Promise<Uint8Array>;
  readObject(permit: V2RepositoryObjectReadPermitV1): Promise<
    Readonly<{
      bytes: Uint8Array;
      contentHash: string;
      objectGeneration: string;
    }>
  >;
}

export interface V2ActivityRepositoryCapabilityObservationInputV1 {
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly reader: V2RepositoryCapabilityObservationReaderV1;
}

export interface V2RepositoryCapabilityEntryObservationV1 {
  readonly requirement: V2RepositoryCapabilityRequirementV1;
  readonly recordBeforeRawHash: string;
  readonly recordBeforeCanonicalHash: string;
  readonly lifecycleBeforeRawHash: string;
  readonly lifecycleBeforeCanonicalHash: string;
  readonly objectPin: Readonly<{
    objectPath: string;
    contentHash: string;
    objectGeneration: string;
    byteSize: number;
  }>;
  readonly objectReadbackFingerprint: string;
  readonly bodyBindingFingerprint: string;
  readonly kernelBindingFingerprint: string | null;
  readonly policySetFingerprint: string | null;
  readonly recordAfterRawHash: string;
  readonly recordAfterCanonicalHash: string;
  readonly lifecycleAfterRawHash: string;
  readonly lifecycleAfterCanonicalHash: string;
  readonly lifecycleRevision: number;
  readonly lifecycleStatus: "published";
  readonly lifecycleBindingFingerprint: string;
  readonly prePostRecordBytesEqual: true;
  readonly prePostLifecycleBytesEqual: true;
  readonly entryFingerprint: string;
}

export interface V2RepositoryCapabilityObservationReceiptV1 {
  readonly schemaVersion: typeof V2_REPOSITORY_CAPABILITY_OBSERVATION_SCHEMA_V1;
  readonly planFingerprint: string;
  readonly courseContractFingerprint: string;
  readonly workspaceId: string;
  readonly authoringRevision: number;
  readonly targetLanguage: string;
  readonly requirementCount: number;
  readonly templateCount: number;
  readonly requirementAggregateFingerprint: string;
  readonly languageProfileFingerprint: string;
  readonly templateAggregateFingerprint: string;
  readonly familyCatalogFingerprint: string;
  readonly requiredSessionFamilyPolicyFingerprint: string;
  readonly templateKernelDeclarationAggregateFingerprint: string;
  readonly templatePolicyDeclarationAggregateFingerprint: string;
  readonly capabilityCatalogFingerprint: string;
  readonly totalDeclaredObjectBytes: number;
  readonly entries: readonly V2RepositoryCapabilityEntryObservationV1[];
  readonly readbackSource: "injected_repository_reader";
  readonly readbackByteMatch: "exact_against_injected_observation";
  readonly repositoryOriginAuthenticity: "not_established_by_pure_packet";
  readonly repositoryOriginAuthority: "none";
  readonly storageExistenceAuthority: "none";
  readonly lifecycleEvidence: "unverified_structural_record_claim";
  readonly lifecycleAuthority: "none";
  readonly kernelBindingEvidence: "template_body_declaration_only";
  readonly runtimeKernelAuthority: "none";
  readonly humanApprovalAuthority: "none";
  readonly publicationAuthority: "none";
  readonly executionAuthority: "none";
  readonly releaseAuthority: false;
  readonly runtimeConsumer: false;
  readonly receiptFingerprint: string;
}

export interface V2ActivityRepositoryCapabilityBindingV1 {
  readonly schemaVersion: typeof V2_ACTIVITY_REPOSITORY_CAPABILITY_BINDING_SCHEMA_V1;
  readonly planFingerprint: string;
  readonly courseContractFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly repositoryObservationFingerprint: string;
  readonly languageProfileFingerprint: string;
  readonly templateBindings: readonly Readonly<{
    requirementId: string;
    requirement: Extract<
      V2RepositoryCapabilityRequirementV1,
      { dependencyType: "published_template" }
    >;
    artifactRef: Readonly<{
      objectPath: string;
      contentHash: string;
      objectGeneration: string;
      byteSize: number;
    }>;
    lifecycleFingerprint: string;
    entryFingerprint: string;
  }>[];
  readonly templateAggregateFingerprint: string;
  readonly familyCatalogFingerprint: string;
  readonly requiredSessionFamilyPolicyFingerprint: string;
  readonly capabilityBindingAuthority: "structural_exact_match_only";
  readonly repositoryResolutionAuthority: "unverified_injected_readback";
  readonly catalogPolicyEvidence: "code_owned_contract_hashes_only";
  readonly runtimeKernelAuthority: "none";
  readonly publicationAuthority: "none";
  readonly releaseAuthority: false;
  readonly bindingFingerprint: string;
}

type JsonRecord = Record<string, unknown>;

interface ParsedObservation {
  readonly rawHash: string;
  readonly canonicalHash: string;
  readonly value: JsonRecord;
}

interface PreparedRequirement {
  readonly requirement: V2RepositoryCapabilityRequirementV1;
  readonly beforeRecord: ParsedObservation;
  readonly beforeLifecycle: ParsedObservation;
  readonly permit: V2RepositoryObjectReadPermitV1;
  readonly lifecycleRevision: number;
}

const receiptHandles = new WeakSet<object>();
const bindingHandles = new WeakSet<object>();

const compareCodePoint = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: JsonRecord, expected: readonly string[]): boolean {
  return Object.keys(value).sort().join("|") === [...expected].sort().join("|");
}

function assertHash(value: unknown, code: string): asserts value is string {
  if (typeof value !== "string" || !HASH_RE.test(value)) throw new Error(code);
}

function assertToken(value: unknown, code: string): asserts value is string {
  if (typeof value !== "string" || !TOKEN_RE.test(value)) throw new Error(code);
}

function assertVersion(value: unknown, code: string): asserts value is number {
  if (!Number.isSafeInteger(value) || Number(value) < 1) throw new Error(code);
}

function assertRawBound(
  bytes: Uint8Array,
  maxBytes: number,
  code: string,
): void {
  if (
    !(bytes instanceof Uint8Array) ||
    bytes.byteLength < 1 ||
    bytes.byteLength > maxBytes
  ) {
    throw new Error(code);
  }
}

function parseCanonicalObservation(
  bytes: Uint8Array,
  maxBytes: number,
  prefix: string,
): ParsedObservation {
  assertRawBound(bytes, maxBytes, `${prefix}_byte_size_invalid`);
  let raw: string;
  try {
    raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`${prefix}_utf8_invalid`);
  }
  let value: unknown;
  try {
    value = JSON.parse(raw) as unknown;
  } catch {
    throw new Error(`${prefix}_json_invalid`);
  }
  const pending: Readonly<{ value: unknown; depth: number }>[] = [
    { value, depth: 0 },
  ];
  const work = [...pending];
  let nodeCount = 0;
  let arrayEntryCount = 0;
  while (work.length > 0) {
    const current = work.pop()!;
    nodeCount += 1;
    if (nodeCount > 50_000 || current.depth > 24)
      throw new Error(`${prefix}_complexity_invalid`);
    const child = current.value;
    if (typeof child === "string") {
      if (child.length > 128 * 1024 || child.normalize("NFC") !== child)
        throw new Error(`${prefix}_string_invalid`);
      continue;
    }
    if (child === null || typeof child === "boolean") continue;
    if (typeof child === "number") {
      if (
        !Number.isFinite(child) ||
        Object.is(child, -0) ||
        (Number.isInteger(child) && !Number.isSafeInteger(child))
      )
        throw new Error(`${prefix}_number_invalid`);
      continue;
    }
    if (Array.isArray(child)) {
      arrayEntryCount += child.length;
      if (arrayEntryCount > 20_000)
        throw new Error(`${prefix}_complexity_invalid`);
      child.forEach((entry) =>
        work.push({ value: entry, depth: current.depth + 1 }),
      );
      continue;
    }
    if (!isRecord(child)) throw new Error(`${prefix}_shape_invalid`);
    const keys = Object.keys(child);
    if (
      keys.length > 128 ||
      keys.some((key) => RESERVED_KEYS.has(key) || key.normalize("NFC") !== key)
    )
      throw new Error(`${prefix}_object_invalid`);
    keys.forEach((key) =>
      work.push({ value: child[key], depth: current.depth + 1 }),
    );
  }
  if (!isRecord(value)) throw new Error(`${prefix}_shape_invalid`);
  if (canonicalJsonV1(value) !== raw) throw new Error(`${prefix}_noncanonical`);
  return Object.freeze({
    rawHash: sha256Utf8(raw),
    canonicalHash: hashCanonicalBody(value),
    value,
  });
}

function assertRequirement(
  requirement: V2RepositoryCapabilityRequirementV1,
): void {
  if (!isRecord(requirement)) throw new Error("repository_requirement_invalid");
  if (requirement.dependencyType === "language_profile") {
    if (
      !exactKeys(requirement, [
        "dependencyType",
        "profileId",
        "version",
        "contentHash",
      ])
    ) {
      throw new Error("repository_requirement_shape_invalid");
    }
    assertToken(requirement.profileId, "repository_profile_ref_invalid");
  } else if (requirement.dependencyType === "published_template") {
    if (
      !exactKeys(requirement, [
        "dependencyType",
        "templateId",
        "version",
        "contentHash",
      ])
    ) {
      throw new Error("repository_requirement_shape_invalid");
    }
    assertToken(requirement.templateId, "repository_template_ref_invalid");
  } else {
    throw new Error("repository_requirement_type_invalid");
  }
  assertVersion(requirement.version, "repository_requirement_version_invalid");
  assertHash(requirement.contentHash, "repository_requirement_hash_invalid");
}

function requirementKey(
  requirement: V2RepositoryCapabilityRequirementV1,
): string {
  return requirement.dependencyType === "language_profile"
    ? `language_profile:${requirement.profileId}:v${requirement.version}:${requirement.contentHash}`
    : `published_template:${requirement.templateId}:v${requirement.version}:${requirement.contentHash}`;
}

function expectedObjectPath(
  requirement: V2RepositoryCapabilityRequirementV1,
): string {
  if (requirement.dependencyType === "language_profile") {
    return `content-studio/language-profiles/${sha256Utf8(requirement.profileId)}/v${requirement.version}/${requirement.contentHash}.json`;
  }
  return `content-studio/mode-templates/${sha256Utf8(requirement.templateId)}/v${requirement.version}/${requirement.contentHash}.json`;
}

function validateProvenance(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (
    Object.keys(value).some(
      (key) =>
        !["createdAt", "createdBy", "basedOn", "generator"].includes(key),
    ) ||
    typeof value.createdAt !== "string" ||
    value.createdAt.length < 1 ||
    typeof value.createdBy !== "string" ||
    value.createdBy.length < 1
  ) {
    return false;
  }
  if (
    value.basedOn !== undefined &&
    (!isRecord(value.basedOn) ||
      !exactKeys(value.basedOn, [
        "entityType",
        "entityId",
        "versionOrRevision",
        "contentHash",
      ]) ||
      typeof value.basedOn.entityType !== "string" ||
      value.basedOn.entityType.length < 1 ||
      typeof value.basedOn.entityId !== "string" ||
      value.basedOn.entityId.length < 1 ||
      !Number.isSafeInteger(value.basedOn.versionOrRevision) ||
      Number(value.basedOn.versionOrRevision) < 1 ||
      typeof value.basedOn.contentHash !== "string" ||
      !HASH_RE.test(value.basedOn.contentHash))
  ) {
    return false;
  }
  if (
    value.generator !== undefined &&
    (!isRecord(value.generator) ||
      !exactKeys(value.generator, [
        "stageId",
        "artifactId",
        "promptVersion",
        "schemaVersion",
      ]) ||
      typeof value.generator.stageId !== "string" ||
      value.generator.stageId.length < 1 ||
      typeof value.generator.artifactId !== "string" ||
      value.generator.artifactId.length < 1 ||
      typeof value.generator.promptVersion !== "string" ||
      value.generator.promptVersion.length < 1 ||
      !Number.isSafeInteger(value.generator.schemaVersion) ||
      Number(value.generator.schemaVersion) < 1)
  ) {
    return false;
  }
  return true;
}

function parseRecordPermit(
  requirement: V2RepositoryCapabilityRequirementV1,
  record: JsonRecord,
): V2RepositoryObjectReadPermitV1 {
  const idKey =
    requirement.dependencyType === "language_profile"
      ? "profileId"
      : "templateId";
  const schemaVersion =
    requirement.dependencyType === "language_profile"
      ? "v2-language-profile-record.v1"
      : "v2-mode-template-record.v1";
  if (
    !exactKeys(record, [
      "schemaVersion",
      idKey,
      "version",
      "contentHash",
      "object",
      "provenance",
      "createdAt",
    ]) ||
    record.schemaVersion !== schemaVersion ||
    record[idKey] !==
      (requirement.dependencyType === "language_profile"
        ? requirement.profileId
        : requirement.templateId) ||
    record.version !== requirement.version ||
    record.contentHash !== requirement.contentHash ||
    typeof record.createdAt !== "string" ||
    record.createdAt.length < 1 ||
    !validateProvenance(record.provenance) ||
    !isRecord(record.object) ||
    !exactKeys(record.object, [
      "objectPath",
      "contentHash",
      "objectGeneration",
      "byteSize",
    ])
  ) {
    throw new Error("repository_record_invalid");
  }
  const object = record.object;
  const maxBytes =
    requirement.dependencyType === "language_profile"
      ? V2_REPOSITORY_CAPABILITY_LANGUAGE_PROFILE_MAX_BYTES_V1
      : V2_REPOSITORY_CAPABILITY_MODE_TEMPLATE_MAX_BYTES_V1;
  if (
    object.objectPath !== expectedObjectPath(requirement) ||
    object.contentHash !== requirement.contentHash ||
    typeof object.objectGeneration !== "string" ||
    !GENERATION_RE.test(object.objectGeneration) ||
    !Number.isSafeInteger(object.byteSize) ||
    Number(object.byteSize) < 1 ||
    Number(object.byteSize) > maxBytes
  ) {
    throw new Error("repository_object_pin_invalid");
  }
  return Object.freeze({
    requirement,
    objectPath: object.objectPath,
    contentHash: requirement.contentHash,
    objectGeneration: object.objectGeneration,
    declaredByteSize: Number(object.byteSize),
    maxBytes,
  });
}

function parsePublishedLifecycle(
  requirement: V2RepositoryCapabilityRequirementV1,
  lifecycle: JsonRecord,
): number {
  const idKey =
    requirement.dependencyType === "language_profile"
      ? "profileId"
      : "templateId";
  const schemaVersion =
    requirement.dependencyType === "language_profile"
      ? "v2-language-profile-lifecycle.v1"
      : "v2-mode-template-lifecycle.v1";
  if (
    !exactKeys(lifecycle, [
      "schemaVersion",
      idKey,
      "version",
      "contentHash",
      "status",
      "reason",
      "changedBy",
      "changedAt",
      "lifecycleRevision",
    ]) ||
    lifecycle.schemaVersion !== schemaVersion ||
    lifecycle[idKey] !==
      (requirement.dependencyType === "language_profile"
        ? requirement.profileId
        : requirement.templateId) ||
    lifecycle.version !== requirement.version ||
    lifecycle.contentHash !== requirement.contentHash ||
    lifecycle.status !== "published" ||
    typeof lifecycle.reason !== "string" ||
    lifecycle.reason.length < 1 ||
    typeof lifecycle.changedBy !== "string" ||
    lifecycle.changedBy.length < 1 ||
    typeof lifecycle.changedAt !== "string" ||
    lifecycle.changedAt.length < 1 ||
    !Number.isSafeInteger(lifecycle.lifecycleRevision) ||
    Number(lifecycle.lifecycleRevision) < 1
  ) {
    throw new Error("repository_lifecycle_invalid");
  }
  if (
    requirement.dependencyType === "published_template" &&
    !validateModeTemplateLifecycleHead(lifecycle).ok
  ) {
    throw new Error("repository_lifecycle_invalid");
  }
  return Number(lifecycle.lifecycleRevision);
}

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>))
      deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function assertInput(
  input: V2ActivityRepositoryCapabilityObservationInputV1,
): readonly V2RepositoryCapabilityRequirementV1[] {
  if (!isRecord(input)) throw new Error("repository_observation_input_invalid");
  if (!exactKeys(input, ["plan", "reader"])) {
    throw new Error("repository_observation_input_shape_invalid");
  }
  if (!isV2CanonicalSeasonPlanV2(input.plan))
    throw new Error("repository_observation_plan_handle_required");
  if (
    !input.reader ||
    typeof input.reader.readRecord !== "function" ||
    typeof input.reader.readLifecycle !== "function" ||
    typeof input.reader.readObject !== "function"
  ) {
    throw new Error("repository_observation_reader_invalid");
  }
  const languageEntries = input.plan.externalRequirementCatalog.filter(
    (entry) => entry.requirement.dependencyType === "language_profile",
  );
  if (languageEntries.length !== 1)
    throw new Error("repository_profile_ref_invalid");
  const languageRef = languageEntries[0]!.requirement;
  if (languageRef.dependencyType !== "language_profile")
    throw new Error("repository_profile_ref_invalid");
  const templateRefs = input.plan.externalRequirementCatalog.flatMap((entry) =>
    entry.requirement.dependencyType === "published_template"
      ? [entry.requirement]
      : [],
  );
  if (templateRefs.length > V2_REPOSITORY_CAPABILITY_MAX_TEMPLATES_V1)
    throw new Error("repository_template_count_invalid");
  const languageRequirement: V2RepositoryCapabilityRequirementV1 =
    Object.freeze({
      dependencyType: "language_profile",
      profileId: languageRef.profileId,
      version: languageRef.version,
      contentHash: languageRef.contentHash,
    });
  const requirements: V2RepositoryCapabilityRequirementV1[] = [
    languageRequirement,
    ...templateRefs.map((ref) =>
      Object.freeze({
        dependencyType: "published_template" as const,
        templateId: ref.templateId,
        version: ref.version,
        contentHash: ref.contentHash,
      }),
    ),
  ];
  requirements.forEach(assertRequirement);
  if (requirements.length > V2_REPOSITORY_CAPABILITY_MAX_REQUIREMENTS_V1) {
    throw new Error("repository_requirement_count_invalid");
  }
  const identities = new Set<string>();
  for (const requirement of requirements) {
    const identity =
      requirement.dependencyType === "language_profile"
        ? `language_profile:${requirement.profileId}:v${requirement.version}`
        : `published_template:${requirement.templateId}:v${requirement.version}`;
    if (identities.has(identity))
      throw new Error("repository_requirement_duplicate");
    identities.add(identity);
  }
  return Object.freeze(
    [...requirements].sort((left, right) =>
      compareCodePoint(requirementKey(left), requirementKey(right)),
    ),
  );
}

async function prepareRequirement(
  reader: V2RepositoryCapabilityObservationReaderV1,
  requirement: V2RepositoryCapabilityRequirementV1,
): Promise<PreparedRequirement> {
  const beforeRecord = parseCanonicalObservation(
    await reader.readRecord(
      requirement,
      "before",
      V2_REPOSITORY_CAPABILITY_RECORD_MAX_BYTES_V1,
    ),
    V2_REPOSITORY_CAPABILITY_RECORD_MAX_BYTES_V1,
    "repository_record",
  );
  const beforeLifecycle = parseCanonicalObservation(
    await reader.readLifecycle(
      requirement,
      "before",
      V2_REPOSITORY_CAPABILITY_LIFECYCLE_MAX_BYTES_V1,
    ),
    V2_REPOSITORY_CAPABILITY_LIFECYCLE_MAX_BYTES_V1,
    "repository_lifecycle",
  );
  const permit = parseRecordPermit(requirement, beforeRecord.value);
  const lifecycleRevision = parsePublishedLifecycle(
    requirement,
    beforeLifecycle.value,
  );
  return Object.freeze({
    requirement,
    beforeRecord,
    beforeLifecycle,
    permit,
    lifecycleRevision,
  });
}

function validateBody(
  requirement: V2RepositoryCapabilityRequirementV1,
  body: JsonRecord,
  targetLanguage: string,
): Readonly<{
  bodyBindingFingerprint: string;
  kernelBindingFingerprint: string | null;
  policySetFingerprint: string | null;
  family: string | null;
  languageProfile: Readonly<V2LanguageProfileBody> | null;
}> {
  if (requirement.dependencyType === "language_profile") {
    const validation = validateV2LanguageProfile(body);
    if (
      !validation.ok ||
      validation.value.profileId !== requirement.profileId ||
      validation.value.version !== requirement.version ||
      validation.value.targetLanguage !== targetLanguage
    ) {
      throw new Error("repository_language_profile_body_invalid");
    }
    return Object.freeze({
      bodyBindingFingerprint: hashCanonicalBody({
        profileRef: requirement,
        targetLanguage,
        supportedActivityFamilies: validation.value.supportedActivityFamilies,
      }),
      kernelBindingFingerprint: null,
      policySetFingerprint: null,
      family: null,
      languageProfile: validation.value,
    });
  }
  const validation = validateModeTemplateArtifactBody(body);
  if (
    !validation.ok ||
    body.templateId !== requirement.templateId ||
    body.version !== requirement.version
  ) {
    throw new Error("repository_mode_template_body_invalid");
  }
  const template = body as unknown as ModeTemplateArtifactBody;
  return Object.freeze({
    bodyBindingFingerprint: hashCanonicalBody({
      templateRef: requirement,
      family: template.family,
      authoring: template.authoring,
      capabilityContract: template.capabilityContract,
      learningContractRefs: template.learningContractRefs,
      compatibility: template.compatibility,
    }),
    kernelBindingFingerprint: hashCanonicalBody(template.kernel),
    policySetFingerprint: hashCanonicalBody(template.policies),
    family: template.family,
    languageProfile: null,
  });
}

async function observePreparedRequirement(
  reader: V2RepositoryCapabilityObservationReaderV1,
  prepared: PreparedRequirement,
  targetLanguage: string,
): Promise<
  Readonly<{
    entry: V2RepositoryCapabilityEntryObservationV1;
    family: string | null;
    languageProfile: Readonly<V2LanguageProfileBody> | null;
  }>
> {
  const readback = await reader.readObject(prepared.permit);
  assertRawBound(
    readback.bytes,
    prepared.permit.maxBytes,
    "repository_object_byte_size_invalid",
  );
  if (
    readback.bytes.byteLength !== prepared.permit.declaredByteSize ||
    readback.contentHash !== prepared.permit.contentHash ||
    readback.objectGeneration !== prepared.permit.objectGeneration
  ) {
    throw new Error("repository_object_readback_invalid");
  }
  const parsedBody = parseCanonicalObservation(
    readback.bytes,
    prepared.permit.maxBytes,
    "repository_object",
  );
  if (
    parsedBody.rawHash !== prepared.permit.contentHash ||
    parsedBody.canonicalHash !== prepared.permit.contentHash
  ) {
    throw new Error("repository_object_hash_invalid");
  }
  const binding = validateBody(
    prepared.requirement,
    parsedBody.value,
    targetLanguage,
  );
  const afterRecord = parseCanonicalObservation(
    await reader.readRecord(
      prepared.requirement,
      "after",
      V2_REPOSITORY_CAPABILITY_RECORD_MAX_BYTES_V1,
    ),
    V2_REPOSITORY_CAPABILITY_RECORD_MAX_BYTES_V1,
    "repository_record",
  );
  const afterLifecycle = parseCanonicalObservation(
    await reader.readLifecycle(
      prepared.requirement,
      "after",
      V2_REPOSITORY_CAPABILITY_LIFECYCLE_MAX_BYTES_V1,
    ),
    V2_REPOSITORY_CAPABILITY_LIFECYCLE_MAX_BYTES_V1,
    "repository_lifecycle",
  );
  parseRecordPermit(prepared.requirement, afterRecord.value);
  const afterRevision = parsePublishedLifecycle(
    prepared.requirement,
    afterLifecycle.value,
  );
  if (
    prepared.beforeRecord.rawHash !== afterRecord.rawHash ||
    prepared.beforeRecord.canonicalHash !== afterRecord.canonicalHash
  ) {
    throw new Error("repository_record_changed_during_read");
  }
  if (
    prepared.beforeLifecycle.rawHash !== afterLifecycle.rawHash ||
    prepared.beforeLifecycle.canonicalHash !== afterLifecycle.canonicalHash ||
    prepared.lifecycleRevision !== afterRevision
  ) {
    throw new Error("repository_lifecycle_changed_during_read");
  }
  const entryBody = {
    requirement: prepared.requirement,
    recordBeforeRawHash: prepared.beforeRecord.rawHash,
    recordBeforeCanonicalHash: prepared.beforeRecord.canonicalHash,
    lifecycleBeforeRawHash: prepared.beforeLifecycle.rawHash,
    lifecycleBeforeCanonicalHash: prepared.beforeLifecycle.canonicalHash,
    objectPin: {
      objectPath: prepared.permit.objectPath,
      contentHash: prepared.permit.contentHash,
      objectGeneration: prepared.permit.objectGeneration,
      byteSize: prepared.permit.declaredByteSize,
    },
    objectReadbackFingerprint: hashCanonicalBody({
      contentHash: readback.contentHash,
      objectGeneration: readback.objectGeneration,
      byteSize: readback.bytes.byteLength,
      canonicalBodyHash: parsedBody.canonicalHash,
    }),
    bodyBindingFingerprint: binding.bodyBindingFingerprint,
    kernelBindingFingerprint: binding.kernelBindingFingerprint,
    policySetFingerprint: binding.policySetFingerprint,
    recordAfterRawHash: afterRecord.rawHash,
    recordAfterCanonicalHash: afterRecord.canonicalHash,
    lifecycleAfterRawHash: afterLifecycle.rawHash,
    lifecycleAfterCanonicalHash: afterLifecycle.canonicalHash,
    lifecycleRevision: prepared.lifecycleRevision,
    lifecycleStatus: "published" as const,
    lifecycleBindingFingerprint: hashCanonicalBody({
      schemaVersion: "v2-repository-lifecycle-binding.structural.v1",
      requirement: prepared.requirement,
      lifecycleCanonicalHash: prepared.beforeLifecycle.canonicalHash,
      lifecycleRevision: prepared.lifecycleRevision,
      lifecycleStatus: "published",
    }),
    prePostRecordBytesEqual: true as const,
    prePostLifecycleBytesEqual: true as const,
  };
  const entry = deepFreeze({
    ...entryBody,
    entryFingerprint: hashCanonicalBody(entryBody),
  });
  return Object.freeze({
    entry,
    family: binding.family,
    languageProfile: binding.languageProfile,
  });
}

export async function observeV2ActivityRepositoryCapabilityV1(
  input: V2ActivityRepositoryCapabilityObservationInputV1,
): Promise<V2RepositoryCapabilityObservationReceiptV1> {
  const requirements = assertInput(input);
  const prepared: PreparedRequirement[] = [];
  for (const requirement of requirements) {
    prepared.push(await prepareRequirement(input.reader, requirement));
  }
  const totalDeclaredObjectBytes = prepared.reduce(
    (total, current) => total + current.permit.declaredByteSize,
    0,
  );
  if (
    totalDeclaredObjectBytes >
    V2_REPOSITORY_CAPABILITY_ACTIVITY_MAX_OBJECT_BYTES_V1
  ) {
    throw new Error("repository_activity_byte_budget_exceeded");
  }
  const observed = [] as Awaited<
    ReturnType<typeof observePreparedRequirement>
  >[];
  for (const current of prepared) {
    observed.push(
      await observePreparedRequirement(
        input.reader,
        current,
        input.plan.targetLanguage,
      ),
    );
  }
  const language = observed.find(
    (value) => value.languageProfile !== null,
  )?.languageProfile;
  if (!language) throw new Error("repository_language_profile_missing");
  for (const value of observed) {
    if (
      value.family !== null &&
      !language.supportedActivityFamilies.includes(value.family as never)
    ) {
      throw new Error("repository_template_family_not_supported");
    }
  }
  const entries = Object.freeze(observed.map((value) => value.entry));
  const templateEntries = entries.filter(
    (entry) => entry.requirement.dependencyType === "published_template",
  );
  const languageEntry = entries.find(
    (entry) => entry.requirement.dependencyType === "language_profile",
  );
  if (!languageEntry) throw new Error("repository_language_profile_missing");
  const receiptBody = {
    schemaVersion: V2_REPOSITORY_CAPABILITY_OBSERVATION_SCHEMA_V1,
    planFingerprint: input.plan.planFingerprint,
    courseContractFingerprint:
      input.plan.courseContract.courseContractFingerprint,
    workspaceId: input.plan.workspaceId,
    authoringRevision: input.plan.authoringRevision,
    targetLanguage: input.plan.targetLanguage,
    requirementCount: entries.length,
    templateCount: templateEntries.length,
    requirementAggregateFingerprint: hashCanonicalBody(requirements),
    languageProfileFingerprint: languageEntry.entryFingerprint,
    templateAggregateFingerprint: hashCanonicalBody(
      templateEntries.map((entry) => entry.entryFingerprint),
    ),
    familyCatalogFingerprint:
      input.plan.courseContract.familyCatalogRef.contentHash,
    requiredSessionFamilyPolicyFingerprint:
      input.plan.courseContract.requiredSessionFamilyPolicyRef.contentHash,
    templateKernelDeclarationAggregateFingerprint: hashCanonicalBody(
      templateEntries.map((entry) => entry.kernelBindingFingerprint),
    ),
    templatePolicyDeclarationAggregateFingerprint: hashCanonicalBody(
      templateEntries.map((entry) => entry.policySetFingerprint),
    ),
    capabilityCatalogFingerprint: hashCanonicalBody({
      schemaVersion: "v2-activity-capability-catalog.structural.v1",
      planFingerprint: input.plan.planFingerprint,
      courseContractFingerprint:
        input.plan.courseContract.courseContractFingerprint,
      languageProfileFingerprint: languageEntry.entryFingerprint,
      templateAggregateFingerprint: hashCanonicalBody(
        templateEntries.map((entry) => entry.entryFingerprint),
      ),
      familyCatalogFingerprint:
        input.plan.courseContract.familyCatalogRef.contentHash,
      requiredSessionFamilyPolicyFingerprint:
        input.plan.courseContract.requiredSessionFamilyPolicyRef.contentHash,
    }),
    totalDeclaredObjectBytes,
    entries,
    readbackSource: "injected_repository_reader" as const,
    readbackByteMatch: "exact_against_injected_observation" as const,
    repositoryOriginAuthenticity: "not_established_by_pure_packet" as const,
    repositoryOriginAuthority: "none" as const,
    storageExistenceAuthority: "none" as const,
    lifecycleEvidence: "unverified_structural_record_claim" as const,
    lifecycleAuthority: "none" as const,
    kernelBindingEvidence: "template_body_declaration_only" as const,
    runtimeKernelAuthority: "none" as const,
    humanApprovalAuthority: "none" as const,
    publicationAuthority: "none" as const,
    executionAuthority: "none" as const,
    releaseAuthority: false as const,
    runtimeConsumer: false as const,
  };
  const receipt = deepFreeze({
    ...receiptBody,
    receiptFingerprint: hashCanonicalBody(receiptBody),
  });
  if (
    utf8ByteLengthV1(canonicalJsonV1(receipt)) >
    V2_REPOSITORY_CAPABILITY_RECEIPT_MAX_BYTES_V1
  ) {
    throw new Error("repository_observation_receipt_byte_size_invalid");
  }
  receiptHandles.add(receipt);
  return receipt;
}

export function bindV2ActivityRepositoryCapabilityV1(input: {
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly stageId: string;
  readonly observation: V2RepositoryCapabilityObservationReceiptV1;
}): V2ActivityRepositoryCapabilityBindingV1 {
  if (
    !isRecord(input) ||
    !exactKeys(input, ["plan", "stageId", "observation"]) ||
    !isV2CanonicalSeasonPlanV2(input.plan) ||
    !isV2RepositoryCapabilityObservationReceiptV1(input.observation) ||
    input.observation.planFingerprint !== input.plan.planFingerprint ||
    input.observation.courseContractFingerprint !==
      input.plan.courseContract.courseContractFingerprint
  )
    throw new Error("repository_capability_binding_input_invalid");
  const stage = input.plan.stages.find(
    (candidate) => candidate.stageId === input.stageId,
  );
  if (
    !stage ||
    stage.kind !== "v2_activity_instances" ||
    stage.episodeId === null ||
    stage.locale !== null
  )
    throw new Error("repository_capability_binding_stage_invalid");
  const catalog = new Map(
    input.plan.externalRequirementCatalog.map((entry) => [
      entry.requirementId,
      entry.requirement,
    ]),
  );
  const templateBindings = Object.freeze(
    stage.externalRequirementIds
      .map((requirementId) => {
        const requirement = catalog.get(requirementId);
        if (!requirement || requirement.dependencyType !== "published_template")
          throw new Error("repository_capability_binding_requirement_invalid");
        const observed = input.observation.entries.find(
          (entry) =>
            entry.requirement.dependencyType === "published_template" &&
            entry.requirement.templateId === requirement.templateId &&
            entry.requirement.version === requirement.version &&
            entry.requirement.contentHash === requirement.contentHash,
        );
        if (!observed)
          throw new Error("repository_capability_binding_requirement_invalid");
        return deepFreeze({
          requirementId,
          requirement: observed.requirement as Extract<
            V2RepositoryCapabilityRequirementV1,
            { dependencyType: "published_template" }
          >,
          artifactRef: observed.objectPin,
          lifecycleFingerprint: observed.lifecycleBindingFingerprint,
          entryFingerprint: observed.entryFingerprint,
        });
      })
      .sort((left, right) =>
        compareCodePoint(left.requirementId, right.requirementId),
      ),
  );
  const body = deepFreeze({
    schemaVersion: V2_ACTIVITY_REPOSITORY_CAPABILITY_BINDING_SCHEMA_V1,
    planFingerprint: input.plan.planFingerprint,
    courseContractFingerprint:
      input.plan.courseContract.courseContractFingerprint,
    stageId: stage.stageId,
    episodeId: stage.episodeId,
    repositoryObservationFingerprint: input.observation.receiptFingerprint,
    languageProfileFingerprint: input.observation.languageProfileFingerprint,
    templateBindings,
    templateAggregateFingerprint: hashCanonicalBody(
      templateBindings.map((binding) => binding.entryFingerprint),
    ),
    familyCatalogFingerprint: input.observation.familyCatalogFingerprint,
    requiredSessionFamilyPolicyFingerprint:
      input.observation.requiredSessionFamilyPolicyFingerprint,
    capabilityBindingAuthority: "structural_exact_match_only" as const,
    repositoryResolutionAuthority: "unverified_injected_readback" as const,
    catalogPolicyEvidence: "code_owned_contract_hashes_only" as const,
    runtimeKernelAuthority: "none" as const,
    publicationAuthority: "none" as const,
    releaseAuthority: false as const,
  });
  const binding = deepFreeze({
    ...body,
    bindingFingerprint: hashCanonicalBody(body),
  });
  bindingHandles.add(binding);
  return binding;
}

export function isV2RepositoryCapabilityObservationReceiptV1(
  value: unknown,
): value is V2RepositoryCapabilityObservationReceiptV1 {
  return isRecord(value) && receiptHandles.has(value);
}

export function isV2ActivityRepositoryCapabilityBindingV1(
  value: unknown,
): value is V2ActivityRepositoryCapabilityBindingV1 {
  return isRecord(value) && bindingHandles.has(value);
}

export function v2RepositoryCapabilityObservationFingerprintV1(
  value: V2RepositoryCapabilityObservationReceiptV1,
): string {
  if (!isV2RepositoryCapabilityObservationReceiptV1(value)) {
    throw new Error("repository_observation_receipt_handle_required");
  }
  return value.receiptFingerprint;
}
