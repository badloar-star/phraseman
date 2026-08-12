import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
  utf8ByteLengthV1,
  type ImmutableObjectRef,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  V2_CANONICAL_INTERFACE_LOCALES,
  V2_CANONICAL_MAX_EXTERNAL_DEPENDENCIES,
  V2_CANONICAL_STAGE_KINDS,
  isV2CanonicalSeasonPlan,
  type V2CanonicalSeasonPlanV1,
  type V2CanonicalStageKind,
  type V2CanonicalStageNode,
} from "./v2_canonical_generation_plan";
import {
  parseV2ImmutableDependencySnapshot,
  v2DependencyFingerprint,
  type V2ImmutableDependency,
} from "./v2_generation_workspace_contract";
import {
  validateV2B2StageBody,
  type V2B2CandidateView,
} from "./v2_canonical_stage_validation_b2";

export const V2_CANONICAL_STAGE_ARTIFACT_MAX_BYTES = 512 * 1024;
const MAX_JSON_DEPTH = 24;
const MAX_JSON_NODES = 50_000;
const MAX_OBJECT_KEYS = 128;
const MAX_ARRAY_ENTRIES = 20_000;
const MAX_STRING_CODE_UNITS = 128 * 1024;
const MAX_PROVENANCE_REFS = 128;
const MAX_ISSUES = 128;
const SHA256_RE = /^[a-f0-9]{64}$/;
const TOKEN_RE = /^[A-Za-z0-9._:-]{1,240}$/;
const STAGE_ID_RE = /^[A-Za-z0-9._:-]{1,1000}$/;
const OBJECT_PATH_RE = /^[A-Za-z0-9._/@:+-]{1,1000}$/;
const GENERATION_RE = /^[A-Za-z0-9._:-]{1,160}$/;
const LANGUAGE_TAG_RE = /^[a-z]{2,3}(?:-[A-Za-z]{2,8})*$/;
const ISSUE_RE = /^[a-z0-9][a-z0-9._:-]{0,159}$/;
const RESERVED_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const CEFR_LADDER = Object.freeze([
  "PRE_A1",
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
] as const);
const CEFR_ORDER = new Map(CEFR_LADDER.map((band, index) => [band, index]));
const VALIDATOR_ID = "learning-v2-canonical-stage-validator";
const VALIDATOR_VERSION = 1;
const CANDIDATE_KEYS = Object.freeze([
  "schemaVersion",
  "planFingerprint",
  "stageId",
  "stageKind",
  "subject",
  "bodySchemaVersion",
  "body",
  "bodyFingerprint",
  "dependencyFingerprint",
  "contentClass",
  "provenanceRefs",
  "provenanceFingerprint",
  "producerFingerprint",
  "configurationFingerprint",
  "executionAuthority",
  "publicationPolicy",
  "runtimeConsumer",
  "releaseEligible",
  "releaseAuthority",
  "candidateFingerprint",
] as const);
const SUBJECT_KEYS = Object.freeze([
  "workspaceId",
  "jobId",
  "seasonId",
  "episodeId",
  "locale",
  "authoringRevision",
  "subjectFingerprint",
] as const);
const PROVENANCE_KEYS = Object.freeze([
  "provenanceType",
  "provenanceId",
  "objectPath",
  "contentHash",
  "objectGeneration",
  "byteSize",
] as const);
const OBJECT_REF_KEYS = Object.freeze([
  "objectPath",
  "contentHash",
  "objectGeneration",
  "byteSize",
] as const);

const PROVENANCE_TYPES = Object.freeze([
  "authoring_revision",
  "stage_artifact",
  "published_template",
  "language_profile",
  "authoritative_source",
  "decision_registry",
  "generated_asset_receipt",
] as const);
type V2StageProvenanceType = (typeof PROVENANCE_TYPES)[number];

export type V2StageArtifactProvenanceRefV1 = Readonly<{
  provenanceType: V2StageProvenanceType;
  provenanceId: string;
  objectPath: string;
  contentHash: string;
  objectGeneration: string;
  byteSize: number;
}>;

type V2StageArtifactCandidateV1 = Readonly<{
  schemaVersion: "v2-canonical-stage-artifact-candidate.v1";
  planFingerprint: string;
  stageId: string;
  stageKind: V2CanonicalStageKind;
  subject: Readonly<{
    workspaceId: string;
    jobId: string;
    seasonId: string;
    episodeId: string | null;
    locale: (typeof V2_CANONICAL_INTERFACE_LOCALES)[number] | null;
    authoringRevision: number;
    subjectFingerprint: string;
  }>;
  bodySchemaVersion: string;
  body: unknown;
  bodyFingerprint: string;
  dependencyFingerprint: string;
  contentClass: "production_candidate" | "test_only";
  provenanceRefs: readonly V2StageArtifactProvenanceRefV1[];
  provenanceFingerprint: string;
  producerFingerprint: string;
  configurationFingerprint: string;
  executionAuthority: "none";
  publicationPolicy: "draft_only_no_consumer";
  runtimeConsumer: false;
  releaseEligible: false;
  releaseAuthority: false;
  candidateFingerprint: string;
}>;

/** Opaque, canonical-byte-backed candidate. There is intentionally no object constructor. */
export type V2CanonicalStageArtifactCandidateHandle =
  V2StageArtifactCandidateV1;

export type V2MachineStageValidationReceiptV1 = Readonly<{
  schemaVersion: "v2-machine-stage-validation-receipt.v1";
  validatorProfile: Readonly<{
    id: typeof VALIDATOR_ID;
    version: typeof VALIDATOR_VERSION;
    rulesFingerprint: string;
  }>;
  planFingerprint: string;
  stageId: string;
  stageKind: V2CanonicalStageKind;
  subjectFingerprint: string;
  artifactRef: ImmutableObjectRef;
  bodySchemaVersion: string;
  bodyFingerprint: string;
  candidateFingerprint: string;
  dependencyFingerprint: string;
  dependencyMachineReceiptFingerprints: readonly string[];
  checkedRuleCodes: readonly string[];
  blockingIssueCodes: readonly string[];
  outcome: "blocked" | "eligible_for_human_review";
  humanReviewState: "not_evaluated";
  specialistEvidenceAuthority: "none";
  deviceEvidenceAuthority: "none";
  listeningEvidenceAuthority: "none";
  requiredHumanEvidence: readonly string[];
  requiredDeviceEvidence: readonly string[];
  requiredListeningEvidence: readonly string[];
  evidenceAuthority: "machine_validation_only";
  artifactStorageAuthority: "none";
  sourceEvidenceAuthority: "unverified_external_refs";
  externalDependencyAuthority: "unverified_external_refs";
  humanApprovalAuthority: "none";
  executionAuthority: "none";
  publicationPolicy: "draft_only_no_consumer";
  runtimeConsumer: false;
  releaseEligible: false;
  releaseAuthority: false;
  receiptFingerprint: string;
}>;

type ValidatorInstallation = Readonly<{
  state: "installed" | "not_installed";
  bodySchemaVersion: string | null;
}>;

export const V2_CANONICAL_STAGE_VALIDATOR_INSTALLATION = Object.freeze({
  v2_season_outline: Object.freeze({
    state: "installed",
    bodySchemaVersion: "v2-season-outline-artifact.v1",
  }),
  v2_episode_outline: Object.freeze({
    state: "installed",
    bodySchemaVersion: "v2-episode-outline-artifact.v1",
  }),
  v2_scene_set: Object.freeze({
    state: "installed",
    bodySchemaVersion: "v2-scene-set-artifact.v1",
  }),
  v2_dialogue_script: Object.freeze({
    state: "installed",
    bodySchemaVersion: "v2-dialogue-script-artifact.v1",
  }),
  v2_speaking_mission: Object.freeze({
    state: "installed",
    bodySchemaVersion: "v2-speaking-mission-artifact.v1",
  }),
  v2_voice_targets: Object.freeze({
    state: "not_installed",
    bodySchemaVersion: null,
  }),
  v2_activity_instances: Object.freeze({
    state: "not_installed",
    bodySchemaVersion: null,
  }),
  v2_activity_graph: Object.freeze({
    state: "not_installed",
    bodySchemaVersion: null,
  }),
  v2_asset_manifest: Object.freeze({
    state: "not_installed",
    bodySchemaVersion: null,
  }),
  v2_localization: Object.freeze({
    state: "not_installed",
    bodySchemaVersion: null,
  }),
  v2_preview_receipt: Object.freeze({
    state: "not_installed",
    bodySchemaVersion: null,
  }),
  v2_episode_bundle: Object.freeze({
    state: "not_installed",
    bodySchemaVersion: null,
  }),
  v2_season_qa: Object.freeze({
    state: "not_installed",
    bodySchemaVersion: null,
  }),
} as const satisfies Readonly<
  Record<V2CanonicalStageKind, ValidatorInstallation>
>);

const RULES_FINGERPRINT = hashCanonicalBody(
  Object.freeze({
    schemaVersion: "v2-canonical-stage-validator-rules.v1",
    validatorId: VALIDATOR_ID,
    validatorVersion: VALIDATOR_VERSION,
    installation: V2_CANONICAL_STAGE_VALIDATOR_INSTALLATION,
    artifactRootMaxBytes: V2_CANONICAL_STAGE_ARTIFACT_MAX_BYTES,
    jsonDepthMax: MAX_JSON_DEPTH,
    jsonNodeMax: MAX_JSON_NODES,
  }),
);

const candidateHandles = new WeakSet<object>();
const candidateMetadata = new WeakMap<
  object,
  Readonly<{ rawHash: string; rawBytes: number }>
>();
const receiptHandles = new WeakSet<object>();
const resolvedDependencyHandles = new WeakSet<object>();
const resolvedDependencyMetadata = new WeakMap<
  object,
  Readonly<{
    candidate: V2CanonicalStageArtifactCandidateHandle;
    receipt: V2MachineStageValidationReceiptV1;
  }>
>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const keys = Object.keys(value);
  return (
    keys.length === expected.length &&
    expected.every((key) => keys.includes(key))
  );
}

function exactString(value: unknown, pattern: RegExp): string | null {
  return typeof value === "string" && pattern.test(value) ? value : null;
}

function exactPositiveInteger(value: unknown, max = 1_000_000): number | null {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 1 &&
    value <= max
    ? value
    : null;
}

function compareCodePoint(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortedUnique(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort(compareCodePoint));
}

function hasLoneSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return true;
  }
  return false;
}

function preflightDecodedJson(root: unknown): void {
  const stack: Readonly<{ value: unknown; depth: number }>[] = [
    { value: root, depth: 0 },
  ];
  let nodes = 0;
  let arrayEntries = 0;
  while (stack.length > 0) {
    const current = stack.pop()!;
    nodes += 1;
    if (nodes > MAX_JSON_NODES || current.depth > MAX_JSON_DEPTH)
      throw new Error("v2_stage_artifact_complexity_invalid");
    const value = current.value;
    if (typeof value === "string") {
      if (
        value.length > MAX_STRING_CODE_UNITS ||
        hasLoneSurrogate(value) ||
        value.normalize("NFC") !== value
      ) {
        throw new Error("v2_stage_artifact_string_invalid");
      }
      continue;
    }
    if (value === null || typeof value === "boolean") continue;
    if (typeof value === "number") {
      if (!Number.isSafeInteger(value) || Object.is(value, -0)) {
        throw new Error("v2_stage_artifact_number_invalid");
      }
      if (Math.abs(value) > Number.MAX_SAFE_INTEGER)
        throw new Error("v2_stage_artifact_number_invalid");
      continue;
    }
    if (Array.isArray(value)) {
      arrayEntries += value.length;
      if (arrayEntries > MAX_ARRAY_ENTRIES)
        throw new Error("v2_stage_artifact_array_budget_invalid");
      for (let index = value.length - 1; index >= 0; index -= 1)
        stack.push({ value: value[index], depth: current.depth + 1 });
      continue;
    }
    if (!isRecord(value)) throw new Error("v2_stage_artifact_json_invalid");
    const keys = Object.keys(value);
    if (
      keys.length > MAX_OBJECT_KEYS ||
      keys.some((key) => RESERVED_KEYS.has(key))
    ) {
      throw new Error("v2_stage_artifact_object_invalid");
    }
    for (const key of keys) {
      if (hasLoneSurrogate(key) || key.normalize("NFC") !== key)
        throw new Error("v2_stage_artifact_string_invalid");
      stack.push({ value: value[key], depth: current.depth + 1 });
    }
  }
}

function deepFreeze<T>(root: T): T {
  const stack: object[] =
    typeof root === "object" && root !== null ? [root as object] : [];
  const ordered: object[] = [];
  while (stack.length > 0) {
    const value = stack.pop()!;
    ordered.push(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      if (typeof child === "object" && child !== null) stack.push(child);
    }
  }
  for (let index = ordered.length - 1; index >= 0; index -= 1)
    Object.freeze(ordered[index]);
  return root;
}

function provenanceIdentity(value: V2StageArtifactProvenanceRefV1): string {
  return canonicalJsonV1([
    value.provenanceType,
    value.provenanceId,
    value.objectPath,
    value.objectGeneration,
  ]);
}

function parseProvenanceRef(value: unknown): V2StageArtifactProvenanceRefV1 {
  if (!isRecord(value) || !exactKeys(value, PROVENANCE_KEYS))
    throw new Error("v2_stage_artifact_provenance_invalid");
  const provenanceType = value.provenanceType;
  const provenanceId = exactString(value.provenanceId, TOKEN_RE);
  const objectPath = exactString(value.objectPath, OBJECT_PATH_RE);
  const contentHash = exactString(value.contentHash, SHA256_RE);
  const objectGeneration = exactString(value.objectGeneration, GENERATION_RE);
  const byteSize = exactPositiveInteger(value.byteSize, 512 * 1024 * 1024);
  if (
    !PROVENANCE_TYPES.includes(provenanceType as V2StageProvenanceType) ||
    !provenanceId ||
    !objectPath ||
    !contentHash ||
    !objectGeneration ||
    byteSize === null
  ) {
    throw new Error("v2_stage_artifact_provenance_invalid");
  }
  return Object.freeze({
    provenanceType: provenanceType as V2StageProvenanceType,
    provenanceId,
    objectPath,
    contentHash,
    objectGeneration,
    byteSize,
  });
}

function candidateBodyForFingerprint(
  candidate: Omit<V2StageArtifactCandidateV1, "candidateFingerprint">,
) {
  return Object.freeze({
    schemaVersion: candidate.schemaVersion,
    planFingerprint: candidate.planFingerprint,
    stageId: candidate.stageId,
    stageKind: candidate.stageKind,
    subject: candidate.subject,
    bodySchemaVersion: candidate.bodySchemaVersion,
    body: candidate.body,
    bodyFingerprint: candidate.bodyFingerprint,
    dependencyFingerprint: candidate.dependencyFingerprint,
    contentClass: candidate.contentClass,
    provenanceRefs: candidate.provenanceRefs,
    provenanceFingerprint: candidate.provenanceFingerprint,
    producerFingerprint: candidate.producerFingerprint,
    configurationFingerprint: candidate.configurationFingerprint,
    executionAuthority: candidate.executionAuthority,
    publicationPolicy: candidate.publicationPolicy,
    runtimeConsumer: candidate.runtimeConsumer,
    releaseEligible: candidate.releaseEligible,
    releaseAuthority: candidate.releaseAuthority,
  });
}

export function parseV2CanonicalStageArtifactRaw(
  raw: string,
): V2CanonicalStageArtifactCandidateHandle {
  if (
    typeof raw !== "string" ||
    raw.length > V2_CANONICAL_STAGE_ARTIFACT_MAX_BYTES
  ) {
    throw new Error("v2_stage_artifact_too_large");
  }
  let rawBytes: number;
  try {
    rawBytes = utf8ByteLengthV1(raw);
  } catch {
    throw new Error("v2_stage_artifact_json_invalid");
  }
  if (rawBytes > V2_CANONICAL_STAGE_ARTIFACT_MAX_BYTES)
    throw new Error("v2_stage_artifact_too_large");
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    throw new Error("v2_stage_artifact_json_invalid");
  }
  preflightDecodedJson(decoded);
  if (!isRecord(decoded) || !exactKeys(decoded, CANDIDATE_KEYS))
    throw new Error("v2_stage_artifact_fields_invalid");
  if (!isRecord(decoded.subject) || !exactKeys(decoded.subject, SUBJECT_KEYS))
    throw new Error("v2_stage_artifact_subject_invalid");
  if (
    !Array.isArray(decoded.provenanceRefs) ||
    decoded.provenanceRefs.length < 1 ||
    decoded.provenanceRefs.length > MAX_PROVENANCE_REFS
  )
    throw new Error("v2_stage_artifact_provenance_invalid");
  const provenanceRefs = Object.freeze(
    decoded.provenanceRefs
      .map(parseProvenanceRef)
      .sort((left, right) =>
        compareCodePoint(provenanceIdentity(left), provenanceIdentity(right)),
      ),
  );
  const provenanceIdentities = provenanceRefs.map(provenanceIdentity);
  const provenanceLogicalIdentities = provenanceRefs.map(
    (ref) => `${ref.provenanceType}:${ref.provenanceId}`,
  );
  if (
    new Set(provenanceIdentities).size !== provenanceIdentities.length ||
    new Set(provenanceLogicalIdentities).size !==
      provenanceLogicalIdentities.length
  ) {
    throw new Error("v2_stage_artifact_provenance_duplicate");
  }

  const subject = decoded.subject;
  const stageKind = decoded.stageKind;
  const locale = subject.locale;
  const normalizedSubject = Object.freeze({
    workspaceId: exactString(subject.workspaceId, TOKEN_RE),
    jobId: exactString(subject.jobId, TOKEN_RE),
    seasonId: exactString(subject.seasonId, TOKEN_RE),
    episodeId:
      subject.episodeId === null
        ? null
        : exactString(subject.episodeId, TOKEN_RE),
    locale: locale === null ? null : locale,
    authoringRevision: exactPositiveInteger(subject.authoringRevision),
    subjectFingerprint: exactString(subject.subjectFingerprint, SHA256_RE),
  });
  if (
    !normalizedSubject.workspaceId ||
    !normalizedSubject.jobId ||
    !normalizedSubject.seasonId ||
    (normalizedSubject.episodeId === null && subject.episodeId !== null) ||
    normalizedSubject.authoringRevision === null ||
    !normalizedSubject.subjectFingerprint ||
    (locale !== null &&
      !V2_CANONICAL_INTERFACE_LOCALES.includes(locale as never))
  ) {
    throw new Error("v2_stage_artifact_subject_invalid");
  }
  const bodySchemaVersion = exactString(decoded.bodySchemaVersion, TOKEN_RE);
  const base = {
    schemaVersion: decoded.schemaVersion,
    planFingerprint: exactString(decoded.planFingerprint, SHA256_RE),
    stageId: exactString(decoded.stageId, STAGE_ID_RE),
    stageKind,
    subject: normalizedSubject,
    bodySchemaVersion,
    body: decoded.body,
    bodyFingerprint: exactString(decoded.bodyFingerprint, SHA256_RE),
    dependencyFingerprint: exactString(
      decoded.dependencyFingerprint,
      SHA256_RE,
    ),
    contentClass: decoded.contentClass,
    provenanceRefs,
    provenanceFingerprint: exactString(
      decoded.provenanceFingerprint,
      SHA256_RE,
    ),
    producerFingerprint: exactString(decoded.producerFingerprint, SHA256_RE),
    configurationFingerprint: exactString(
      decoded.configurationFingerprint,
      SHA256_RE,
    ),
    executionAuthority: decoded.executionAuthority,
    publicationPolicy: decoded.publicationPolicy,
    runtimeConsumer: decoded.runtimeConsumer,
    releaseEligible: decoded.releaseEligible,
    releaseAuthority: decoded.releaseAuthority,
  } as const;
  if (
    base.schemaVersion !== "v2-canonical-stage-artifact-candidate.v1" ||
    !base.planFingerprint ||
    !base.stageId ||
    !V2_CANONICAL_STAGE_KINDS.includes(stageKind as V2CanonicalStageKind) ||
    !bodySchemaVersion ||
    !base.bodyFingerprint ||
    !base.dependencyFingerprint ||
    !base.provenanceFingerprint ||
    !base.producerFingerprint ||
    !base.configurationFingerprint ||
    (base.contentClass !== "production_candidate" &&
      base.contentClass !== "test_only") ||
    base.executionAuthority !== "none" ||
    base.publicationPolicy !== "draft_only_no_consumer" ||
    base.runtimeConsumer !== false ||
    base.releaseEligible !== false ||
    base.releaseAuthority !== false
  ) {
    throw new Error("v2_stage_artifact_identity_invalid");
  }
  const expectedSubjectFingerprint = hashCanonicalBody(
    Object.freeze({
      schemaVersion: "v2-stage-artifact-subject.v1",
      planFingerprint: base.planFingerprint,
      stageId: base.stageId,
      stageKind: base.stageKind,
      workspaceId: normalizedSubject.workspaceId,
      jobId: normalizedSubject.jobId,
      seasonId: normalizedSubject.seasonId,
      episodeId: normalizedSubject.episodeId,
      locale: normalizedSubject.locale,
      authoringRevision: normalizedSubject.authoringRevision,
    }),
  );
  const expectedBodyFingerprint = hashCanonicalBody(base.body);
  const expectedProvenanceFingerprint = hashCanonicalBody(
    Object.freeze({
      schemaVersion: "v2-stage-artifact-provenance.v1",
      provenanceRefs,
    }),
  );
  if (
    normalizedSubject.subjectFingerprint !== expectedSubjectFingerprint ||
    base.bodyFingerprint !== expectedBodyFingerprint ||
    base.provenanceFingerprint !== expectedProvenanceFingerprint
  ) {
    throw new Error("v2_stage_artifact_fingerprint_invalid");
  }
  const candidateFingerprint = exactString(
    decoded.candidateFingerprint,
    SHA256_RE,
  );
  const candidateWithoutFingerprint = candidateBodyForFingerprint(
    base as Omit<V2StageArtifactCandidateV1, "candidateFingerprint">,
  );
  if (
    !candidateFingerprint ||
    candidateFingerprint !==
      hashCanonicalBody(
        Object.freeze({
          schemaVersion: "v2-stage-artifact-candidate-fingerprint.v1",
          candidate: candidateWithoutFingerprint,
        }),
      )
  )
    throw new Error("v2_stage_artifact_fingerprint_invalid");
  const candidate = deepFreeze({
    ...candidateWithoutFingerprint,
    candidateFingerprint,
  }) as V2StageArtifactCandidateV1;
  let canonical: string;
  try {
    canonical = canonicalJsonV1(candidate);
  } catch {
    throw new Error("v2_stage_artifact_json_invalid");
  }
  if (canonical !== raw) throw new Error("v2_stage_artifact_noncanonical");
  candidateHandles.add(candidate);
  candidateMetadata.set(
    candidate,
    Object.freeze({ rawHash: sha256Utf8(raw), rawBytes }),
  );
  return candidate;
}

function parseArtifactRef(
  raw: string,
  candidate: V2CanonicalStageArtifactCandidateHandle,
): ImmutableObjectRef {
  if (typeof raw !== "string" || raw.length > 8 * 1024)
    throw new Error("v2_stage_artifact_ref_invalid");
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    throw new Error("v2_stage_artifact_ref_invalid");
  }
  if (!isRecord(decoded) || !exactKeys(decoded, OBJECT_REF_KEYS))
    throw new Error("v2_stage_artifact_ref_invalid");
  const metadata = candidateMetadata.get(candidate as object);
  const ref = Object.freeze({
    objectPath: exactString(decoded.objectPath, OBJECT_PATH_RE),
    contentHash: exactString(decoded.contentHash, SHA256_RE),
    objectGeneration: exactString(decoded.objectGeneration, GENERATION_RE),
    byteSize: exactPositiveInteger(
      decoded.byteSize,
      V2_CANONICAL_STAGE_ARTIFACT_MAX_BYTES,
    ),
  });
  if (
    !metadata ||
    !ref.objectPath ||
    !ref.contentHash ||
    !ref.objectGeneration ||
    ref.byteSize === null ||
    ref.contentHash !== metadata.rawHash ||
    ref.byteSize !== metadata.rawBytes ||
    ref.objectPath !== `learning-v2/candidates/${candidate.stageId}.json` ||
    ref.objectGeneration !== "unpersisted" ||
    canonicalJsonV1(ref) !== raw
  )
    throw new Error("v2_stage_artifact_ref_invalid");
  return ref as ImmutableObjectRef;
}

/**
 * Opaque proof that an exact predecessor candidate produced an exact successful
 * machine receipt in this process. It is not a storage, human-review or release
 * receipt and cannot be constructed from caller JSON.
 */
export type V2ResolvedValidatedStageDependencyHandle = Readonly<{
  readonly dependencyStageId: string;
}>;

export function bindV2ValidatedStageDependency(
  candidate: V2CanonicalStageArtifactCandidateHandle,
  receipt: V2MachineStageValidationReceiptV1,
): V2ResolvedValidatedStageDependencyHandle {
  if (
    !candidate ||
    typeof candidate !== "object" ||
    !candidateHandles.has(candidate as object) ||
    !receipt ||
    typeof receipt !== "object" ||
    !receiptHandles.has(receipt as object)
  ) {
    throw new Error("v2_stage_dependency_receipt_untrusted");
  }
  const metadata = candidateMetadata.get(candidate as object);
  if (
    !metadata ||
    receipt.outcome !== "eligible_for_human_review" ||
    candidate.contentClass !== "production_candidate" ||
    receipt.stageId !== candidate.stageId ||
    receipt.stageKind !== candidate.stageKind ||
    receipt.planFingerprint !== candidate.planFingerprint ||
    receipt.subjectFingerprint !== candidate.subject.subjectFingerprint ||
    receipt.bodyFingerprint !== candidate.bodyFingerprint ||
    receipt.candidateFingerprint !== candidate.candidateFingerprint ||
    receipt.dependencyFingerprint !== candidate.dependencyFingerprint ||
    receipt.artifactRef.contentHash !== metadata.rawHash ||
    receipt.artifactRef.byteSize !== metadata.rawBytes
  ) {
    throw new Error("v2_stage_dependency_receipt_invalid");
  }
  const handle = Object.freeze({ dependencyStageId: candidate.stageId });
  resolvedDependencyHandles.add(handle);
  resolvedDependencyMetadata.set(handle, Object.freeze({ candidate, receipt }));
  return handle;
}

function stageDependencyLifecycleFingerprint(
  receipt: V2MachineStageValidationReceiptV1,
): string {
  return hashCanonicalBody(
    Object.freeze({
      schemaVersion: "v2-stage-dependency-machine-lifecycle.v1",
      receiptFingerprint: receipt.receiptFingerprint,
      artifactRef: receipt.artifactRef,
    }),
  );
}

function dependencyIdentity(value: V2ImmutableDependency): string {
  if (value.dependencyType === "stage") return `stage:${value.stageId}`;
  if (value.dependencyType === "published_template")
    return `published_template:${value.templateId}@${value.version}`;
  return `language_profile:${value.profileId}@${value.version}`;
}

function expectedExternalIdentity(
  value: V2CanonicalStageNode["externalRequirements"][number],
): string {
  if (value.dependencyType === "published_template")
    return `published_template:${value.templateId}@${value.version}`;
  return `language_profile:${value.profileId}@${value.version}`;
}

function validateDependencyClosure(
  planFingerprint: string,
  stage: V2CanonicalStageNode,
  snapshot: readonly V2ImmutableDependency[],
  resolved: readonly V2ResolvedValidatedStageDependencyHandle[],
): readonly string[] {
  const issues: string[] = [];
  const actual = new Map(
    snapshot.map((dependency) => [dependencyIdentity(dependency), dependency]),
  );
  const expected = [
    ...stage.dependsOn.map((stageId) => `stage:${stageId}`),
    ...stage.externalRequirements.map(expectedExternalIdentity),
  ];
  if (
    actual.size !== expected.length ||
    expected.some((identity) => !actual.has(identity))
  ) {
    issues.push("v2_stage_dependency_closure_invalid");
  }
  for (const requirement of stage.externalRequirements) {
    const dependency = actual.get(expectedExternalIdentity(requirement));
    if (
      !dependency ||
      dependency.dependencyType !== requirement.dependencyType ||
      dependency.contentHash !== requirement.contentHash
    )
      issues.push("v2_stage_dependency_external_stale");
  }
  const resolvedByStageId = new Map<
    string,
    Readonly<{
      candidate: V2CanonicalStageArtifactCandidateHandle;
      receipt: V2MachineStageValidationReceiptV1;
    }>
  >();
  for (const handle of resolved) {
    if (
      !handle ||
      typeof handle !== "object" ||
      !resolvedDependencyHandles.has(handle as object)
    ) {
      issues.push("v2_stage_dependency_receipt_untrusted");
      continue;
    }
    const metadata = resolvedDependencyMetadata.get(handle as object);
    if (!metadata) {
      issues.push("v2_stage_dependency_receipt_untrusted");
      continue;
    }
    if (resolvedByStageId.has(metadata.candidate.stageId))
      issues.push("v2_stage_dependency_candidate_duplicate");
    resolvedByStageId.set(metadata.candidate.stageId, metadata);
  }
  if (
    resolvedByStageId.size !== stage.dependsOn.length ||
    stage.dependsOn.some((stageId) => !resolvedByStageId.has(stageId))
  ) {
    issues.push("v2_stage_dependency_candidate_missing");
  }
  for (const stageId of stage.dependsOn) {
    const dependency = actual.get(`stage:${stageId}`);
    const resolvedEntry = resolvedByStageId.get(stageId);
    const candidate = resolvedEntry?.candidate;
    const receipt = resolvedEntry?.receipt;
    const metadata = candidate
      ? candidateMetadata.get(candidate as object)
      : null;
    if (
      !dependency ||
      dependency.dependencyType !== "stage" ||
      !candidate ||
      !receipt ||
      !metadata ||
      candidate.planFingerprint !== planFingerprint ||
      candidate.stageId !== stageId ||
      dependency.artifactHash !== metadata.rawHash ||
      dependency.reviewFingerprint !== receipt.receiptFingerprint ||
      dependency.objectPath !== receipt.artifactRef.objectPath ||
      dependency.objectGeneration !== receipt.artifactRef.objectGeneration ||
      dependency.lifecycleFingerprint !==
        stageDependencyLifecycleFingerprint(receipt)
    ) {
      issues.push("v2_stage_dependency_candidate_stale");
    }
  }
  return sortedUnique(issues);
}

function stringArray(
  value: unknown,
  min: number,
  max: number,
): readonly string[] | null {
  if (
    !Array.isArray(value) ||
    value.length < min ||
    value.length > max ||
    value.some((entry) => typeof entry !== "string" || !TOKEN_RE.test(entry)) ||
    new Set(value).size !== value.length
  )
    return null;
  return value as readonly string[];
}

function hashArray(
  value: unknown,
  min: number,
  max: number,
): readonly string[] | null {
  if (
    !Array.isArray(value) ||
    value.length < min ||
    value.length > max ||
    value.some(
      (entry) => typeof entry !== "string" || !SHA256_RE.test(entry),
    ) ||
    new Set(value).size !== value.length
  )
    return null;
  return value as readonly string[];
}

function brief(value: unknown, min = 10, max = 2_000): string | null {
  return typeof value === "string" &&
    value.trim().length >= min &&
    value.length <= max
    ? value
    : null;
}

function sourceIdsResolve(
  value: unknown,
  provenanceIds: ReadonlySet<string>,
  min = 1,
  max = 16,
): boolean {
  const ids = stringArray(value, min, max);
  return Boolean(ids && ids.every((id) => provenanceIds.has(id)));
}

type BodyValidation = Readonly<{
  checked: readonly string[];
  issues: readonly string[];
  requiredHuman: readonly string[];
  requiredDevice: readonly string[];
  requiredListening: readonly string[];
}>;

function validateSeasonOutlineBody(
  plan: V2CanonicalSeasonPlanV1,
  candidate: V2CanonicalStageArtifactCandidateHandle,
): BodyValidation {
  const checked = [
    "season_schema",
    "season_claim_honesty",
    "season_scope_cardinality",
    "season_checkpoint_boundaries",
    "season_outcome_dag",
    "season_language_profile_binding",
    "season_introduce_before_use",
  ];
  const issues: string[] = [];
  const body = candidate.body;
  const topKeys = [
    "schemaVersion",
    "claimKind",
    "coverageClaim",
    "certificationClaim",
    "entryBand",
    "cefrLadder",
    "targetLanguage",
    "episodeRows",
    "checkpoints",
    "outcomes",
    "linguisticUnits",
    "promptHistoryCommitments",
  ];
  if (!isRecord(body) || !exactKeys(body, topKeys)) {
    return Object.freeze({
      checked,
      issues: Object.freeze(["v2_season_outline_schema_invalid"]),
      requiredHuman: Object.freeze([
        "curriculum_scientist",
        "target_language_linguist",
      ]),
      requiredDevice: Object.freeze([]),
      requiredListening: Object.freeze([]),
    });
  }
  if (
    candidate.bodySchemaVersion !== "v2-season-outline-artifact.v1" ||
    body.schemaVersion !== candidate.bodySchemaVersion
  )
    issues.push("v2_season_outline_schema_invalid");
  const expectedCoverageClaim =
    plan.scope === "full_season"
      ? "full_season_sampled_descriptor_alignment"
      : "scoped_partial_curriculum";
  if (
    body.claimKind !== "curriculum_alignment_not_learner_attainment" ||
    body.coverageClaim !== expectedCoverageClaim ||
    body.certificationClaim !== false ||
    body.entryBand !== "PRE_A1" ||
    !Array.isArray(body.cefrLadder) ||
    body.cefrLadder.length !== CEFR_LADDER.length ||
    body.cefrLadder.some((band, index) => band !== CEFR_LADDER[index])
  ) {
    issues.push("v2_season_outline_claim_invalid");
  }
  if (
    typeof body.targetLanguage !== "string" ||
    !LANGUAGE_TAG_RE.test(body.targetLanguage) ||
    body.targetLanguage !== plan.targetLanguage
  ) {
    issues.push("v2_season_outline_target_language_invalid");
  }
  const provenanceIds = new Set(
    candidate.provenanceRefs
      .filter((ref) => ref.provenanceType === "authoritative_source")
      .map((ref) => ref.provenanceId),
  );
  const languageProfile = plan.stages[0]?.externalRequirements.find(
    (ref) => ref.dependencyType === "language_profile",
  );
  const outcomes = Array.isArray(body.outcomes) ? body.outcomes : [];
  const outcomeIds = new Set<string>();
  const outcomeById = new Map<string, Record<string, unknown>>();
  for (const raw of outcomes) {
    const keys = [
      "outcomeId",
      "cefrBand",
      "cefrSourceRefIds",
      "scaleKey",
      "descriptorLocator",
      "activity",
      "modality",
      "domain",
      "function",
      "context",
      "textType",
      "successCriteriaIds",
      "prerequisiteOutcomeIds",
      "enablingUnitIds",
      "requiredCapabilityKeys",
    ];
    if (!isRecord(raw) || !exactKeys(raw, keys)) {
      issues.push("v2_season_outline_outcome_invalid");
      continue;
    }
    const outcomeId = exactString(raw.outcomeId, TOKEN_RE);
    const prerequisiteIds = stringArray(raw.prerequisiteOutcomeIds, 0, 64);
    if (
      !outcomeId ||
      outcomeIds.has(outcomeId) ||
      !CEFR_ORDER.has(raw.cefrBand as never) ||
      !sourceIdsResolve(raw.cefrSourceRefIds, provenanceIds) ||
      !brief(raw.scaleKey, 1, 160) ||
      !brief(raw.descriptorLocator, 1, 320) ||
      !["reception", "production", "interaction", "mediation"].includes(
        String(raw.activity),
      ) ||
      !["spoken", "written", "multimodal"].includes(String(raw.modality)) ||
      !brief(raw.domain, 1, 160) ||
      !brief(raw.function, 1, 320) ||
      !brief(raw.context, 1, 320) ||
      !brief(raw.textType, 1, 160) ||
      !stringArray(raw.successCriteriaIds, 1, 16) ||
      !prerequisiteIds ||
      !stringArray(raw.enablingUnitIds, 1, 64) ||
      !stringArray(raw.requiredCapabilityKeys, 1, 16) ||
      prerequisiteIds.some((id) => !outcomeIds.has(id))
    ) {
      issues.push("v2_season_outline_outcome_invalid");
      continue;
    }
    outcomeIds.add(outcomeId);
    outcomeById.set(outcomeId, raw);
  }
  if (outcomeIds.size < 1) issues.push("v2_season_outline_outcome_required");

  const linguisticUnits = Array.isArray(body.linguisticUnits)
    ? body.linguisticUnits
    : [];
  const unitIds = new Set<string>();
  const unitIntroducedAt = new Map<string, number>();
  for (const raw of linguisticUnits) {
    const keys = [
      "unitId",
      "kind",
      "languageProfileRef",
      "sourceRefIds",
      "prerequisiteUnitIds",
      "outcomeIds",
      "introducedAtEpisodeOrdinal",
      "revisitEpisodeOrdinals",
    ];
    if (
      !isRecord(raw) ||
      !exactKeys(raw, keys) ||
      !isRecord(raw.languageProfileRef)
    ) {
      issues.push("v2_season_outline_linguistic_unit_invalid");
      continue;
    }
    const unitId = exactString(raw.unitId, TOKEN_RE);
    const prerequisiteIds = stringArray(raw.prerequisiteUnitIds, 0, 64);
    const linkedOutcomes = stringArray(raw.outcomeIds, 1, 64);
    const introduced = exactPositiveInteger(
      raw.introducedAtEpisodeOrdinal,
      plan.episodeIds.length,
    );
    const revisits = Array.isArray(raw.revisitEpisodeOrdinals)
      ? raw.revisitEpisodeOrdinals
      : [];
    const ref = raw.languageProfileRef;
    if (
      !unitId ||
      unitIds.has(unitId) ||
      !["grammar", "lexis", "phonology", "orthography", "pragmatics"].includes(
        String(raw.kind),
      ) ||
      !languageProfile ||
      !exactKeys(ref, ["profileId", "version", "contentHash"]) ||
      ref.profileId !== languageProfile.profileId ||
      ref.version !== languageProfile.version ||
      ref.contentHash !== languageProfile.contentHash ||
      !sourceIdsResolve(raw.sourceRefIds, provenanceIds) ||
      !prerequisiteIds ||
      prerequisiteIds.some((id) => !unitIds.has(id)) ||
      !linkedOutcomes ||
      linkedOutcomes.some((id) => !outcomeIds.has(id)) ||
      introduced === null ||
      revisits.length > plan.episodeIds.length ||
      revisits.some(
        (ordinal, index) =>
          !Number.isSafeInteger(ordinal) ||
          ordinal <= introduced ||
          ordinal > plan.episodeIds.length ||
          (index > 0 && ordinal <= revisits[index - 1]),
      ) ||
      new Set(revisits).size !== revisits.length
    ) {
      issues.push("v2_season_outline_linguistic_unit_invalid");
      continue;
    }
    unitIds.add(unitId);
    unitIntroducedAt.set(unitId, introduced);
  }
  if (unitIds.size < 1)
    issues.push("v2_season_outline_linguistic_unit_required");
  for (const [outcomeId, raw] of outcomeById) {
    const enabling = raw.enablingUnitIds as readonly string[];
    if (enabling.some((id) => !unitIds.has(id)))
      issues.push("v2_season_outline_outcome_unit_invalid");
    if (
      raw.modality === "spoken" &&
      (raw.activity === "production" ||
        raw.activity === "interaction" ||
        raw.activity === "mediation") &&
      !(raw.requiredCapabilityKeys as readonly string[]).includes(
        "speaking_mission",
      )
    ) {
      issues.push("v2_season_outline_spoken_capability_missing");
    }
    if (!outcomeIds.has(outcomeId))
      issues.push("v2_season_outline_outcome_invalid");
  }

  const rows = Array.isArray(body.episodeRows) ? body.episodeRows : [];
  const firstEpisodeByOutcome = new Map<string, number>();
  let priorBand = -1;
  if (rows.length !== plan.episodeIds.length)
    issues.push("v2_season_outline_episode_count_invalid");
  rows.forEach((raw, index) => {
    const keys = [
      "episodeId",
      "ordinal",
      "sectorOrdinal",
      "cefrBand",
      "primaryOutcomeIds",
    ];
    if (!isRecord(raw) || !exactKeys(raw, keys)) {
      issues.push("v2_season_outline_episode_invalid");
      return;
    }
    const band = CEFR_ORDER.get(raw.cefrBand as never);
    const primary = stringArray(raw.primaryOutcomeIds, 1, 8);
    const expectedSector = Math.ceil((index + 1) / 8);
    if (
      raw.episodeId !== plan.episodeIds[index] ||
      raw.ordinal !== index + 1 ||
      raw.sectorOrdinal !== expectedSector ||
      band === undefined ||
      band < priorBand ||
      band > priorBand + 1 ||
      !primary ||
      primary.some((id) => !outcomeIds.has(id))
    ) {
      issues.push("v2_season_outline_episode_invalid");
    } else {
      priorBand = band;
      for (const outcomeId of primary) {
        if (outcomeById.get(outcomeId)?.cefrBand !== raw.cefrBand)
          issues.push("v2_season_outline_episode_band_invalid");
        if (!firstEpisodeByOutcome.has(outcomeId))
          firstEpisodeByOutcome.set(outcomeId, index + 1);
      }
      for (const unitId of primary.flatMap(
        (id) =>
          (outcomeById.get(id)?.enablingUnitIds as readonly string[]) ?? [],
      )) {
        if (
          (unitIntroducedAt.get(unitId) ?? Number.POSITIVE_INFINITY) >
          index + 1
        ) {
          issues.push("v2_season_outline_introduce_before_use_invalid");
        }
      }
      const needsSpeaking = primary.some((id) => {
        const outcome = outcomeById.get(id);
        return (
          outcome?.modality === "spoken" &&
          (outcome.activity === "production" ||
            outcome.activity === "interaction" ||
            outcome.activity === "mediation")
        );
      });
      if (
        needsSpeaking &&
        plan.optionalStageDispositions[index]?.speakingMission !== "required"
      ) {
        issues.push("v2_season_outline_spoken_recipe_invalid");
      }
    }
  });
  if (
    [...outcomeIds].some((outcomeId) => !firstEpisodeByOutcome.has(outcomeId))
  ) {
    issues.push("v2_season_outline_outcome_unassigned");
  }
  for (const [outcomeId, raw] of outcomeById) {
    const first =
      firstEpisodeByOutcome.get(outcomeId) ?? Number.POSITIVE_INFINITY;
    for (const prerequisiteId of raw.prerequisiteOutcomeIds as readonly string[]) {
      if (
        (firstEpisodeByOutcome.get(prerequisiteId) ??
          Number.POSITIVE_INFINITY) >= first
      ) {
        issues.push("v2_season_outline_introduce_before_use_invalid");
      }
    }
  }
  for (const raw of linguisticUnits) {
    if (
      !isRecord(raw) ||
      typeof raw.unitId !== "string" ||
      !Array.isArray(raw.prerequisiteUnitIds)
    )
      continue;
    const introduced =
      unitIntroducedAt.get(raw.unitId) ?? Number.POSITIVE_INFINITY;
    if (
      (raw.prerequisiteUnitIds as readonly unknown[]).some(
        (id) =>
          typeof id !== "string" ||
          (unitIntroducedAt.get(id) ?? Number.POSITIVE_INFINITY) >= introduced,
      )
    ) {
      issues.push("v2_season_outline_introduce_before_use_invalid");
    }
  }
  if (plan.scope === "full_season") {
    const actualBands = new Set(
      rows.flatMap((row) =>
        isRecord(row) && CEFR_ORDER.has(row.cefrBand as never)
          ? [row.cefrBand as string]
          : [],
      ),
    );
    if (
      !isRecord(rows[0]) ||
      rows[0].cefrBand !== "PRE_A1" ||
      CEFR_LADDER.some((band) => !actualBands.has(band))
    ) {
      issues.push("v2_season_outline_cefr_coverage_invalid");
    }
  }
  const promptHistoryCommitments = Array.isArray(body.promptHistoryCommitments)
    ? body.promptHistoryCommitments
    : [];
  if (promptHistoryCommitments.length !== plan.episodeIds.length) {
    issues.push("v2_season_outline_prompt_history_invalid");
  }
  promptHistoryCommitments.forEach((raw, index) => {
    const keys = [
      "episodeId",
      "trainingPromptSemanticHashes",
      "trainingContentSemanticHashes",
      "trainingSurfaceSemanticHashes",
      "trainingVisibleSurfaceSemanticHashes",
      "transferSurfaceSemanticHashes",
      "transferVisibleSurfaceSemanticHashes",
      "independentPromptSemanticHashes",
      "independentContentSemanticHashes",
      "delayedPromptSemanticHashes",
      "delayedContentSemanticHashes",
    ];
    if (
      !isRecord(raw) ||
      !exactKeys(raw, keys) ||
      raw.episodeId !== plan.episodeIds[index] ||
      !hashArray(raw.trainingPromptSemanticHashes, 1, 768) ||
      !hashArray(raw.trainingContentSemanticHashes, 1, 768) ||
      !hashArray(raw.trainingSurfaceSemanticHashes, 1, 768) ||
      !hashArray(raw.trainingVisibleSurfaceSemanticHashes, 1, 768) ||
      !hashArray(raw.transferSurfaceSemanticHashes, 1, 64) ||
      !hashArray(raw.transferVisibleSurfaceSemanticHashes, 1, 64) ||
      !hashArray(raw.independentPromptSemanticHashes, 1, 128) ||
      !hashArray(raw.independentContentSemanticHashes, 1, 128) ||
      !hashArray(raw.delayedPromptSemanticHashes, 1, 128) ||
      !hashArray(raw.delayedContentSemanticHashes, 1, 128)
    ) {
      issues.push("v2_season_outline_prompt_history_invalid");
    }
  });

  const expectedCheckpointOrdinals =
    plan.episodeIds.length === 1
      ? []
      : plan.episodeIds.length === 8
        ? [8]
        : [8, 16, 24, 32];
  const checkpoints = Array.isArray(body.checkpoints) ? body.checkpoints : [];
  if (checkpoints.length !== expectedCheckpointOrdinals.length)
    issues.push("v2_season_outline_checkpoint_count_invalid");
  checkpoints.forEach((raw, index) => {
    const keys = [
      "checkpointId",
      "afterEpisodeOrdinal",
      "coveredOutcomeIds",
      "heldOutPromptPolicy",
      "certificationClaim",
    ];
    const covered = isRecord(raw)
      ? stringArray(raw.coveredOutcomeIds, 1, 128)
      : null;
    const requiredCovered = [...firstEpisodeByOutcome.entries()]
      .filter(
        ([, firstEpisode]) => firstEpisode <= expectedCheckpointOrdinals[index],
      )
      .map(([outcomeId]) => outcomeId);
    if (
      !isRecord(raw) ||
      !exactKeys(raw, keys) ||
      !exactString(raw.checkpointId, TOKEN_RE) ||
      raw.afterEpisodeOrdinal !== expectedCheckpointOrdinals[index] ||
      !covered ||
      covered.some((id) => !outcomeIds.has(id)) ||
      covered.length !== requiredCovered.length ||
      requiredCovered.some((id) => !covered.includes(id)) ||
      raw.heldOutPromptPolicy !== "novel_unseen_only" ||
      raw.certificationClaim !== false
    ) {
      issues.push("v2_season_outline_checkpoint_invalid");
    }
  });
  return Object.freeze({
    checked: Object.freeze(checked),
    issues: sortedUnique(issues),
    requiredHuman: sortedUnique([
      "curriculum_scientist",
      "target_language_linguist",
      ...(linguisticUnits.some(
        (row) => isRecord(row) && row.kind === "phonology",
      )
        ? ["pronunciation_specialist"]
        : []),
    ]),
    requiredDevice: Object.freeze([]),
    requiredListening: Object.freeze([]),
  });
}

function validateIntroBlueprint(
  value: unknown,
  provenanceById: ReadonlyMap<string, string>,
): readonly string[] {
  const issues: string[] = [];
  const topKeys = [
    "introId",
    "title",
    "summary",
    "learningGoal",
    "blocks",
    "claims",
    "questions",
  ];
  if (
    !isRecord(value) ||
    !exactKeys(value, topKeys) ||
    !exactString(value.introId, TOKEN_RE) ||
    !brief(value.title, 3, 320) ||
    !brief(value.summary, 10, 1_000) ||
    !brief(value.learningGoal, 10, 1_000)
  )
    return Object.freeze(["v2_episode_outline_intro_invalid"]);
  const blocks = Array.isArray(value.blocks) ? value.blocks : [];
  const blockIds = new Set<string>();
  const blockBodyHashes = new Map<string, string>();
  if (blocks.length < 3 || blocks.length > 6)
    issues.push("v2_episode_outline_intro_block_count_invalid");
  for (const raw of blocks) {
    if (
      !isRecord(raw) ||
      !exactKeys(raw, ["blockId", "kind", "title", "body"]) ||
      !exactString(raw.blockId, TOKEN_RE) ||
      blockIds.has(raw.blockId as string) ||
      ![
        "meaning",
        "structure",
        "usage",
        "pronunciation",
        "contrast",
        "example",
      ].includes(String(raw.kind)) ||
      !brief(raw.title, 2, 240) ||
      !brief(raw.body, 10, 2_000)
    ) {
      issues.push("v2_episode_outline_intro_block_invalid");
      continue;
    }
    blockIds.add(raw.blockId as string);
    blockBodyHashes.set(
      raw.blockId as string,
      hashCanonicalBody(
        Object.freeze({
          schemaVersion: "v2-intro-block-semantics.v1",
          kind: raw.kind,
          title: raw.title,
          body: raw.body,
        }),
      ),
    );
  }
  const claims = Array.isArray(value.claims) ? value.claims : [];
  const claimById = new Map<string, Record<string, unknown>>();
  if (claims.length < 3 || claims.length > 24)
    issues.push("v2_episode_outline_intro_claim_count_invalid");
  for (const raw of claims) {
    const keys = [
      "claimId",
      "blockId",
      "semanticAssertionId",
      "sourceHash",
      "expectedAnswerSemanticId",
      "misconceptionIds",
      "sourceRefIds",
    ];
    if (!isRecord(raw) || !exactKeys(raw, keys)) {
      issues.push("v2_episode_outline_intro_claim_invalid");
      continue;
    }
    const claimId = exactString(raw.claimId, TOKEN_RE);
    const sourceRefIds = stringArray(raw.sourceRefIds, 1, 1);
    const sourceContentHash = sourceRefIds
      ? provenanceById.get(sourceRefIds[0])
      : null;
    const expectedSourceHash =
      sourceContentHash &&
      typeof raw.semanticAssertionId === "string" &&
      typeof raw.expectedAnswerSemanticId === "string" &&
      Array.isArray(raw.misconceptionIds)
        ? hashCanonicalBody(
            Object.freeze({
              schemaVersion: "v2-intro-claim-source-binding.v1",
              sourceContentHash,
              blockBodyHash:
                typeof raw.blockId === "string"
                  ? blockBodyHashes.get(raw.blockId)
                  : null,
              semanticAssertionId: raw.semanticAssertionId,
              expectedAnswerSemanticId: raw.expectedAnswerSemanticId,
              misconceptionIds: raw.misconceptionIds,
            }),
          )
        : null;
    if (
      !claimId ||
      claimById.has(claimId) ||
      !blockIds.has(String(raw.blockId)) ||
      !exactString(raw.semanticAssertionId, TOKEN_RE) ||
      !exactString(raw.sourceHash, SHA256_RE) ||
      !exactString(raw.expectedAnswerSemanticId, TOKEN_RE) ||
      !stringArray(raw.misconceptionIds, 2, 8) ||
      !sourceRefIds ||
      !sourceContentHash ||
      raw.sourceHash !== expectedSourceHash
    ) {
      issues.push("v2_episode_outline_intro_claim_invalid");
      continue;
    }
    claimById.set(claimId, raw);
  }
  const questions = Array.isArray(value.questions) ? value.questions : [];
  const questionIds = new Set<string>();
  const slots = new Set<number>();
  const testedClaims = new Set<string>();
  const testedAssertions = new Set<string>();
  const testedSourceHashes = new Set<string>();
  const testedAnswers = new Set<string>();
  const visibleQuestionSignatures = new Set<string>();
  if (questions.length !== 3)
    issues.push("v2_episode_outline_intro_question_count_invalid");
  for (const raw of questions) {
    const keys = [
      "questionId",
      "requiredTaskSlot",
      "assessmentClass",
      "learningEvidenceEligible",
      "introClaimId",
      "prompt",
      "choices",
      "correctChoiceSemanticId",
      "explanation",
      "questionSemanticHash",
    ];
    if (!isRecord(raw) || !exactKeys(raw, keys)) {
      issues.push("v2_episode_outline_intro_question_invalid");
      continue;
    }
    const questionId = exactString(raw.questionId, TOKEN_RE);
    const claimId = exactString(raw.introClaimId, TOKEN_RE);
    const claim = claimId ? claimById.get(claimId) : null;
    const choices = Array.isArray(raw.choices) ? raw.choices : [];
    const choiceSemanticIds = new Set<string>();
    const misconceptionIds = new Set<string>();
    const visibleSignature =
      isRecord(raw) && Array.isArray(raw.choices)
        ? hashCanonicalBody(
            Object.freeze({
              schemaVersion: "v2-intro-visible-question.v1",
              prompt:
                typeof raw.prompt === "string"
                  ? raw.prompt.trim().toLowerCase()
                  : raw.prompt,
              choices: raw.choices.map((choice) =>
                isRecord(choice) && typeof choice.text === "string"
                  ? choice.text.trim().toLowerCase()
                  : null,
              ),
              explanation:
                typeof raw.explanation === "string"
                  ? raw.explanation.trim().toLowerCase()
                  : raw.explanation,
            }),
          )
        : null;
    let correctCount = 0;
    for (const choice of choices) {
      if (
        !isRecord(choice) ||
        !exactKeys(choice, [
          "semanticId",
          "text",
          "misconceptionId",
          "misconceptionRationale",
        ]) ||
        !exactString(choice.semanticId, TOKEN_RE) ||
        !brief(choice.text, 1, 500) ||
        choiceSemanticIds.has(choice.semanticId as string)
      ) {
        issues.push("v2_episode_outline_intro_choice_invalid");
        continue;
      }
      choiceSemanticIds.add(choice.semanticId as string);
      if (choice.semanticId === raw.correctChoiceSemanticId) {
        correctCount += 1;
        if (
          choice.misconceptionId !== null ||
          choice.misconceptionRationale !== null
        ) {
          issues.push("v2_episode_outline_intro_choice_invalid");
        }
      } else if (
        !exactString(choice.misconceptionId, TOKEN_RE) ||
        !brief(choice.misconceptionRationale, 3, 500) ||
        misconceptionIds.has(choice.misconceptionId as string) ||
        !(claim?.misconceptionIds as readonly string[] | undefined)?.includes(
          choice.misconceptionId as string,
        )
      ) {
        issues.push("v2_episode_outline_intro_choice_invalid");
      } else misconceptionIds.add(choice.misconceptionId as string);
    }
    if (
      !questionId ||
      questionIds.has(questionId) ||
      ![1, 2, 3].includes(Number(raw.requiredTaskSlot)) ||
      slots.has(raw.requiredTaskSlot as number) ||
      raw.assessmentClass !== "intro_comprehension" ||
      raw.learningEvidenceEligible !== false ||
      !claim ||
      testedClaims.has(claimId!) ||
      testedAssertions.has(claim.semanticAssertionId as string) ||
      testedSourceHashes.has(claim.sourceHash as string) ||
      testedAnswers.has(claim.expectedAnswerSemanticId as string) ||
      !brief(raw.prompt, 3, 1_000) ||
      choices.length !== 3 ||
      correctCount !== 1 ||
      new Set(
        choices.flatMap((choice) =>
          isRecord(choice) && typeof choice.text === "string"
            ? [choice.text.trim().toLowerCase()]
            : [],
        ),
      ).size !== 3 ||
      raw.correctChoiceSemanticId !== claim.expectedAnswerSemanticId ||
      misconceptionIds.size !== 2 ||
      !brief(raw.explanation, 3, 1_000) ||
      !exactString(raw.questionSemanticHash, SHA256_RE) ||
      raw.questionSemanticHash !==
        hashCanonicalBody(
          Object.freeze({
            schemaVersion: "v2-intro-question-semantics.v1",
            claimSourceHash: claim.sourceHash,
            prompt: raw.prompt,
            choices: raw.choices,
            correctChoiceSemanticId: raw.correctChoiceSemanticId,
            explanation: raw.explanation,
          }),
        ) ||
      !visibleSignature ||
      visibleQuestionSignatures.has(visibleSignature)
    ) {
      issues.push("v2_episode_outline_intro_question_invalid");
    } else {
      questionIds.add(questionId);
      slots.add(raw.requiredTaskSlot as number);
      testedClaims.add(claimId!);
      testedAssertions.add(claim.semanticAssertionId as string);
      testedSourceHashes.add(claim.sourceHash as string);
      testedAnswers.add(claim.expectedAnswerSemanticId as string);
      visibleQuestionSignatures.add(visibleSignature);
    }
  }
  if (slots.size !== 3 || testedClaims.size !== 3)
    issues.push("v2_episode_outline_intro_question_coverage_invalid");
  return sortedUnique(issues);
}

function validateEpisodeOutlineBody(
  plan: V2CanonicalSeasonPlanV1,
  stage: V2CanonicalStageNode,
  candidate: V2CanonicalStageArtifactCandidateHandle,
  resolved: readonly V2CanonicalStageArtifactCandidateHandle[],
): BodyValidation {
  const checked = [
    "episode_schema",
    "episode_identity",
    "episode_session_12",
    "episode_zone_4_4_4",
    "episode_intro_claim_checks",
    "episode_evidence_roles",
    "episode_independent_conditions",
    "episode_delayed_external",
    "episode_checkpoint_novelty",
    "episode_spoken_mission",
  ];
  const issues: string[] = [];
  const body = candidate.body;
  const topKeys = [
    "schemaVersion",
    "episodeId",
    "episodeOrdinal",
    "cefrBand",
    "scenario",
    "primaryOutcomeIds",
    "supportingOutcomeIds",
    "outcomeConstraintBindings",
    "priorTrainingSurfaceSemanticHashes",
    "plannedTransferSurfaceSemanticHashes",
    "plannedTransferVisibleSurfaceSemanticHashes",
    "priorTransferSurfaceSemanticHashes",
    "priorVisibleSurfaceSemanticHashes",
    "sessions",
    "delayedProbeDefinitions",
    "checkpointBlueprint",
  ];
  if (!isRecord(body) || !exactKeys(body, topKeys)) {
    return Object.freeze({
      checked,
      issues: Object.freeze(["v2_episode_outline_schema_invalid"]),
      requiredHuman: Object.freeze([
        "assessment_specialist",
        "curriculum_scientist",
        "target_language_linguist",
      ]),
      requiredDevice: Object.freeze([]),
      requiredListening: Object.freeze([]),
    });
  }
  if (
    candidate.bodySchemaVersion !== "v2-episode-outline-artifact.v1" ||
    body.schemaVersion !== candidate.bodySchemaVersion
  )
    issues.push("v2_episode_outline_schema_invalid");
  const episodeOrdinal = plan.episodeIds.indexOf(stage.episodeId ?? "") + 1;
  const seasonCandidate = resolved.find(
    (item) => item.stageKind === "v2_season_outline",
  );
  const seasonValidation = seasonCandidate
    ? validateSeasonOutlineBody(plan, seasonCandidate)
    : null;
  if (
    !seasonCandidate ||
    seasonValidation!.issues.length > 0 ||
    !isRecord(seasonCandidate.body)
  ) {
    issues.push("v2_episode_outline_season_dependency_invalid");
  }
  const seasonBody = seasonCandidate?.body as
    | Record<string, unknown>
    | undefined;
  const seasonOutcomes = new Map<string, Record<string, unknown>>();
  if (Array.isArray(seasonBody?.outcomes)) {
    for (const row of seasonBody.outcomes)
      if (isRecord(row) && typeof row.outcomeId === "string")
        seasonOutcomes.set(row.outcomeId, row);
  }
  const seasonEpisodeRow = Array.isArray(seasonBody?.episodeRows)
    ? seasonBody.episodeRows.find(
        (row) => isRecord(row) && row.episodeId === stage.episodeId,
      )
    : null;
  const promptHistoryCommitment = Array.isArray(
    seasonBody?.promptHistoryCommitments,
  )
    ? seasonBody.promptHistoryCommitments.find(
        (row) => isRecord(row) && row.episodeId === stage.episodeId,
      )
    : null;
  const priorPromptHistory = Array.isArray(seasonBody?.promptHistoryCommitments)
    ? seasonBody.promptHistoryCommitments.slice(
        0,
        Math.max(0, episodeOrdinal - 1),
      )
    : [];
  const priorEpisodePromptHashes = new Set(
    priorPromptHistory.flatMap((row) =>
      isRecord(row)
        ? [
            "trainingPromptSemanticHashes",
            "independentPromptSemanticHashes",
            "delayedPromptSemanticHashes",
          ].flatMap((key) =>
            Array.isArray(row[key])
              ? row[key].filter(
                  (value): value is string => typeof value === "string",
                )
              : [],
          )
        : [],
    ),
  );
  const priorEpisodeContentHashes = new Set(
    priorPromptHistory.flatMap((row) =>
      isRecord(row)
        ? [
            "trainingContentSemanticHashes",
            "independentContentSemanticHashes",
            "delayedContentSemanticHashes",
          ].flatMap((key) =>
            Array.isArray(row[key])
              ? row[key].filter(
                  (value): value is string => typeof value === "string",
                )
              : [],
          )
        : [],
    ),
  );
  const expectedPriorSurfaceHashes = new Set(
    priorPromptHistory.flatMap((row) =>
      isRecord(row) && Array.isArray(row.trainingSurfaceSemanticHashes)
        ? row.trainingSurfaceSemanticHashes.filter(
            (value): value is string => typeof value === "string",
          )
        : [],
    ),
  );
  const priorTrainingSurfaceHashes = hashArray(
    body.priorTrainingSurfaceSemanticHashes,
    0,
    24_576,
  );
  if (
    !priorTrainingSurfaceHashes ||
    priorTrainingSurfaceHashes.length !== expectedPriorSurfaceHashes.size ||
    priorTrainingSurfaceHashes.some(
      (value) => !expectedPriorSurfaceHashes.has(value),
    )
  ) {
    issues.push("v2_episode_outline_prior_surface_history_invalid");
  }
  const expectedPlannedTransferHashes = isRecord(promptHistoryCommitment)
    ? hashArray(promptHistoryCommitment.transferSurfaceSemanticHashes, 1, 64)
    : null;
  const plannedTransferHashes = hashArray(
    body.plannedTransferSurfaceSemanticHashes,
    1,
    64,
  );
  const expectedPlannedTransferVisibleHashes = isRecord(promptHistoryCommitment)
    ? hashArray(
        promptHistoryCommitment.transferVisibleSurfaceSemanticHashes,
        1,
        64,
      )
    : null;
  const plannedTransferVisibleHashes = hashArray(
    body.plannedTransferVisibleSurfaceSemanticHashes,
    1,
    64,
  );
  const expectedPriorTransferHashes = new Set(
    priorPromptHistory.flatMap((row) =>
      isRecord(row) && Array.isArray(row.transferSurfaceSemanticHashes)
        ? row.transferSurfaceSemanticHashes.filter(
            (value): value is string => typeof value === "string",
          )
        : [],
    ),
  );
  const priorTransferHashes = hashArray(
    body.priorTransferSurfaceSemanticHashes,
    0,
    2_048,
  );
  const expectedPriorVisibleHashes = new Set(
    priorPromptHistory.flatMap((row) =>
      isRecord(row)
        ? [
            "trainingVisibleSurfaceSemanticHashes",
            "transferVisibleSurfaceSemanticHashes",
          ].flatMap((key) =>
            Array.isArray(row[key])
              ? row[key].filter(
                  (value): value is string => typeof value === "string",
                )
              : [],
          )
        : [],
    ),
  );
  const priorVisibleHashes = hashArray(
    body.priorVisibleSurfaceSemanticHashes,
    0,
    26_624,
  );
  if (
    !expectedPlannedTransferHashes ||
    !plannedTransferHashes ||
    canonicalJsonV1(expectedPlannedTransferHashes) !==
      canonicalJsonV1(plannedTransferHashes) ||
    !expectedPlannedTransferVisibleHashes ||
    !plannedTransferVisibleHashes ||
    canonicalJsonV1(expectedPlannedTransferVisibleHashes) !==
      canonicalJsonV1(plannedTransferVisibleHashes) ||
    !priorTransferHashes ||
    priorTransferHashes.length !== expectedPriorTransferHashes.size ||
    priorTransferHashes.some(
      (value) => !expectedPriorTransferHashes.has(value),
    ) ||
    !priorVisibleHashes ||
    priorVisibleHashes.length !== expectedPriorVisibleHashes.size ||
    priorVisibleHashes.some((value) => !expectedPriorVisibleHashes.has(value))
  ) {
    issues.push("v2_episode_outline_transfer_surface_history_invalid");
  }
  if (
    episodeOrdinal < 1 ||
    body.episodeId !== stage.episodeId ||
    body.episodeOrdinal !== episodeOrdinal ||
    !CEFR_ORDER.has(body.cefrBand as never) ||
    !isRecord(seasonEpisodeRow) ||
    body.cefrBand !== seasonEpisodeRow.cefrBand
  )
    issues.push("v2_episode_outline_identity_invalid");
  const primary = stringArray(body.primaryOutcomeIds, 1, 8);
  const supporting = stringArray(body.supportingOutcomeIds, 0, 16);
  const expectedPrimary = isRecord(seasonEpisodeRow)
    ? stringArray(seasonEpisodeRow.primaryOutcomeIds, 1, 8)
    : null;
  if (
    !primary ||
    !supporting ||
    [...(primary ?? []), ...(supporting ?? [])].some(
      (id) => !seasonOutcomes.has(id),
    )
  ) {
    issues.push("v2_episode_outline_outcome_binding_invalid");
  }
  if (
    !primary ||
    !expectedPrimary ||
    primary.length !== expectedPrimary.length ||
    primary.some((id, index) => id !== expectedPrimary[index]) ||
    !supporting ||
    supporting.some((id) => primary.includes(id)) ||
    supporting.some(
      (id) =>
        !Array.isArray(seasonBody?.episodeRows) ||
        !seasonBody.episodeRows.some(
          (row, rowIndex) =>
            rowIndex + 1 <= episodeOrdinal &&
            isRecord(row) &&
            Array.isArray(row.primaryOutcomeIds) &&
            row.primaryOutcomeIds.includes(id),
        ),
    )
  ) {
    issues.push("v2_episode_outline_outcome_binding_invalid");
  }
  const outcomeConstraintBindings = Array.isArray(
    body.outcomeConstraintBindings,
  )
    ? body.outcomeConstraintBindings
    : [];
  const constrainedOutcomes = new Set<string>();
  for (const binding of outcomeConstraintBindings) {
    const outcomeId =
      isRecord(binding) &&
      typeof binding.outcomeId === "string" &&
      exactString(binding.outcomeId, TOKEN_RE)
        ? binding.outcomeId
        : null;
    const semanticSlotIds = isRecord(binding)
      ? stringArray(binding.semanticSlotIds, 1, 32)
      : null;
    const constraintIds = isRecord(binding)
      ? stringArray(binding.constraintIds, 1, 32)
      : null;
    const seasonOutcome = outcomeId ? seasonOutcomes.get(outcomeId) : null;
    const seasonSuccessCriteriaIds = seasonOutcome
      ? stringArray(seasonOutcome.successCriteriaIds, 1, 16)
      : null;
    if (
      !isRecord(binding) ||
      !exactKeys(binding, ["outcomeId", "semanticSlotIds", "constraintIds"]) ||
      !outcomeId ||
      constrainedOutcomes.has(outcomeId) ||
      ![...(primary ?? []), ...(supporting ?? [])].includes(outcomeId) ||
      !semanticSlotIds ||
      !constraintIds ||
      !seasonSuccessCriteriaIds ||
      constraintIds.some((id) => !seasonSuccessCriteriaIds.includes(id))
    ) {
      issues.push("v2_episode_outline_outcome_constraint_invalid");
    } else constrainedOutcomes.add(outcomeId);
  }
  if (
    [...(primary ?? []), ...(supporting ?? [])].some(
      (id) => !constrainedOutcomes.has(id),
    )
  ) {
    issues.push("v2_episode_outline_outcome_constraint_invalid");
  }
  const authoritativeSources = new Map(
    candidate.provenanceRefs
      .filter((ref) => ref.provenanceType === "authoritative_source")
      .map((ref) => [ref.provenanceId, ref.contentHash] as const),
  );
  const decisionRefs = new Map(
    candidate.provenanceRefs
      .filter((ref) => ref.provenanceType === "decision_registry")
      .map((ref) => [ref.provenanceId, ref.contentHash] as const),
  );
  if (
    !isRecord(body.scenario) ||
    !exactKeys(body.scenario, [
      "scenarioId",
      "domain",
      "function",
      "context",
      "textType",
      "sourceRefIds",
    ]) ||
    !exactString(body.scenario.scenarioId, TOKEN_RE) ||
    !brief(body.scenario.domain, 1, 160) ||
    !brief(body.scenario.function, 1, 320) ||
    !brief(body.scenario.context, 1, 320) ||
    !brief(body.scenario.textType, 1, 160) ||
    !sourceIdsResolve(
      body.scenario.sourceRefIds,
      new Set(authoritativeSources.keys()),
    )
  ) {
    issues.push("v2_episode_outline_scenario_invalid");
  }
  const sessions = Array.isArray(body.sessions) ? body.sessions : [];
  if (sessions.length !== 12)
    issues.push("v2_episode_outline_session_count_invalid");
  const rolePositions = new Map<
    string,
    {
      introduce?: number;
      retrieval?: number;
      near?: number;
      independent?: number;
    }
  >();
  const independentHashes = new Set<string>();
  const independentContentHashes = new Set<string>();
  const trainingPromptHashes = new Set<string>();
  const trainingContentHashes = new Set<string>();
  const trainingSurfaceHashes = new Set<string>();
  const trainingVisibleSurfaceHashes = new Set<string>();
  const seasonUnitIds = new Set<string>();
  const seasonUnitIntroducedAt = new Map<string, number>();
  if (Array.isArray(seasonBody?.linguisticUnits)) {
    for (const row of seasonBody.linguisticUnits)
      if (isRecord(row) && typeof row.unitId === "string") {
        seasonUnitIds.add(row.unitId);
        if (typeof row.introducedAtEpisodeOrdinal === "number") {
          seasonUnitIntroducedAt.set(
            row.unitId,
            row.introducedAtEpisodeOrdinal,
          );
        }
      }
  }
  sessions.forEach((raw, index) => {
    const keys = [
      "ordinal",
      "sessionTemplateId",
      "zone",
      "primaryOutcomeIds",
      "focusUnitIds",
      "prerequisiteOutcomeIds",
      "teachingBrief",
      "practiceBrief",
      "assessmentBrief",
      "intro",
      "evidencePlan",
      "trainingPromptRefs",
      "independentCandidates",
    ];
    if (!isRecord(raw) || !exactKeys(raw, keys)) {
      issues.push("v2_episode_outline_session_invalid");
      return;
    }
    const ordinal = index + 1;
    const expectedZone =
      ordinal <= 4 ? "understand" : ordinal <= 8 ? "use" : "master";
    if (
      raw.ordinal !== ordinal ||
      raw.sessionTemplateId !==
        `${stage.episodeId}:session-${String(ordinal).padStart(2, "0")}` ||
      raw.zone !== expectedZone ||
      !stringArray(raw.primaryOutcomeIds, 1, 8) ||
      (raw.primaryOutcomeIds as readonly string[]).some(
        (id) => !primary?.includes(id),
      ) ||
      !stringArray(raw.focusUnitIds, 1, 32) ||
      (raw.focusUnitIds as readonly string[]).some(
        (id) => !seasonUnitIds.has(id),
      ) ||
      (raw.focusUnitIds as readonly string[]).some(
        (id) =>
          (seasonUnitIntroducedAt.get(id) ?? Number.POSITIVE_INFINITY) >
          episodeOrdinal,
      ) ||
      !stringArray(raw.prerequisiteOutcomeIds, 0, 32) ||
      (raw.prerequisiteOutcomeIds as readonly string[]).some((id) => {
        const outcome = seasonOutcomes.get(id);
        return (
          !outcome ||
          !Array.isArray(seasonBody?.episodeRows) ||
          !seasonBody.episodeRows.some(
            (row, rowIndex) =>
              isRecord(row) &&
              rowIndex + 1 < episodeOrdinal &&
              Array.isArray(row.primaryOutcomeIds) &&
              row.primaryOutcomeIds.includes(id),
          )
        );
      }) ||
      !brief(raw.teachingBrief) ||
      !brief(raw.practiceBrief) ||
      !brief(raw.assessmentBrief)
    ) {
      issues.push("v2_episode_outline_session_invalid");
    }
    issues.push(...validateIntroBlueprint(raw.intro, authoritativeSources));
    const trainingPromptRefs = Array.isArray(raw.trainingPromptRefs)
      ? raw.trainingPromptRefs
      : [];
    const sessionPromptCoverage = new Set<string>();
    if (trainingPromptRefs.length < 1 || trainingPromptRefs.length > 64) {
      issues.push("v2_episode_outline_training_prompt_invalid");
    }
    for (const prompt of trainingPromptRefs) {
      if (
        !isRecord(prompt) ||
        !exactKeys(prompt, [
          "promptId",
          "purpose",
          "phase",
          "promptText",
          "contentBody",
          "outcomeIds",
          "linguisticUnitIds",
          "promptSemanticHash",
          "contentSemanticHash",
          "sourceRefId",
        ]) ||
        !exactString(prompt.promptId, TOKEN_RE) ||
        !["teaching", "practice", "retrieval"].includes(
          String(prompt.purpose),
        ) ||
        !["introduce", "practice", "retrieval"].includes(
          String(prompt.phase),
        ) ||
        prompt.phase !==
          (prompt.purpose === "teaching"
            ? "introduce"
            : prompt.purpose === "retrieval"
              ? "retrieval"
              : "practice") ||
        !brief(prompt.promptText, 3, 2_000) ||
        !brief(prompt.contentBody, 3, 4_000) ||
        !stringArray(prompt.outcomeIds, 1, 8) ||
        (prompt.outcomeIds as readonly string[]).some(
          (id) => !primary?.includes(id),
        ) ||
        !stringArray(prompt.linguisticUnitIds, 1, 32) ||
        (prompt.linguisticUnitIds as readonly string[]).some(
          (id) => !(raw.focusUnitIds as readonly string[]).includes(id),
        ) ||
        !exactString(prompt.promptSemanticHash, SHA256_RE) ||
        !exactString(prompt.contentSemanticHash, SHA256_RE) ||
        !exactString(prompt.sourceRefId, TOKEN_RE) ||
        !authoritativeSources.has(prompt.sourceRefId as string) ||
        prompt.promptSemanticHash !==
          hashCanonicalBody(
            Object.freeze({
              schemaVersion: "v2-training-prompt-semantics.v1",
              sourceContentHash: authoritativeSources.get(
                prompt.sourceRefId as string,
              ),
              promptText: prompt.promptText,
              outcomeIds: prompt.outcomeIds,
              linguisticUnitIds: prompt.linguisticUnitIds,
              phase: prompt.phase,
            }),
          ) ||
        prompt.contentSemanticHash !==
          hashCanonicalBody(
            Object.freeze({
              schemaVersion: "v2-training-content-semantics.v1",
              sourceContentHash: authoritativeSources.get(
                prompt.sourceRefId as string,
              ),
              contentBody: prompt.contentBody,
              outcomeIds: prompt.outcomeIds,
              linguisticUnitIds: prompt.linguisticUnitIds,
            }),
          ) ||
        trainingPromptHashes.has(prompt.promptSemanticHash as string) ||
        trainingContentHashes.has(prompt.contentSemanticHash as string)
      ) {
        issues.push("v2_episode_outline_training_prompt_invalid");
      } else {
        trainingPromptHashes.add(prompt.promptSemanticHash as string);
        trainingContentHashes.add(prompt.contentSemanticHash as string);
        const sourceContentHash = authoritativeSources.get(
          prompt.sourceRefId as string,
        );
        const focusUnitIds = prompt.linguisticUnitIds as readonly string[];
        trainingSurfaceHashes.add(
          hashCanonicalBody(
            Object.freeze({
              schemaVersion: "v2-learning-surface-semantics.v1",
              targetLanguage: plan.targetLanguage,
              promptText: prompt.promptText,
              contextBody: prompt.contentBody,
              outcomeIds: prompt.outcomeIds,
              linguisticUnitIds: focusUnitIds,
              sourceContentHashes: [sourceContentHash],
            }),
          ),
        );
        trainingVisibleSurfaceHashes.add(
          hashCanonicalBody(
            Object.freeze({
              schemaVersion: "v2-visible-learning-surface.v1",
              targetLanguage: plan.targetLanguage,
              promptText: prompt.promptText,
              contextBody: prompt.contentBody,
              outcomeIds: prompt.outcomeIds,
              linguisticUnitIds: focusUnitIds,
            }),
          ),
        );
        for (const outcomeId of prompt.outcomeIds as readonly string[]) {
          sessionPromptCoverage.add(`${String(prompt.phase)}:${outcomeId}`);
        }
      }
    }
    if (
      !isRecord(raw.evidencePlan) ||
      !exactKeys(raw.evidencePlan, [
        "introduceOutcomeIds",
        "retrievalOutcomeIds",
        "nearTransferOutcomeIds",
        "delayedPracticeOutcomeIds",
      ])
    ) {
      issues.push("v2_episode_outline_evidence_plan_invalid");
    } else {
      for (const [field, key] of [
        ["introduceOutcomeIds", "introduce"],
        ["retrievalOutcomeIds", "retrieval"],
        ["nearTransferOutcomeIds", "near"],
      ] as const) {
        const ids = stringArray(raw.evidencePlan[field], 0, 8);
        const requiredPhase =
          key === "introduce"
            ? "introduce"
            : key === "retrieval"
              ? "retrieval"
              : "practice";
        if (
          !ids ||
          ids.some(
            (id) =>
              !primary?.includes(id) ||
              !sessionPromptCoverage.has(`${requiredPhase}:${id}`),
          )
        ) {
          issues.push("v2_episode_outline_evidence_plan_invalid");
        } else
          for (const id of ids) {
            const positions = rolePositions.get(id) ?? {};
            if (positions[key] === undefined) positions[key] = ordinal;
            rolePositions.set(id, positions);
          }
      }
      const delayedPractice = stringArray(
        raw.evidencePlan.delayedPracticeOutcomeIds,
        0,
        8,
      );
      if (
        !delayedPractice ||
        delayedPractice.some((id) => !primary?.includes(id))
      )
        issues.push("v2_episode_outline_evidence_plan_invalid");
    }
    const candidates = Array.isArray(raw.independentCandidates)
      ? raw.independentCandidates
      : [];
    for (const item of candidates) {
      const candidateKeys = [
        "outcomeId",
        "support",
        "maxHints",
        "answerExposure",
        "promptNovelty",
        "promptSemanticHash",
        "contentSemanticHash",
      ];
      if (
        !isRecord(item) ||
        !exactKeys(item, candidateKeys) ||
        !primary?.includes(String(item.outcomeId)) ||
        ordinal < 9 ||
        item.support !== "none" ||
        item.maxHints !== 0 ||
        item.answerExposure !== "forbidden" ||
        item.promptNovelty !== "novel" ||
        !exactString(item.promptSemanticHash, SHA256_RE) ||
        !exactString(item.contentSemanticHash, SHA256_RE) ||
        trainingPromptHashes.has(item.promptSemanticHash as string) ||
        trainingContentHashes.has(item.contentSemanticHash as string) ||
        priorEpisodePromptHashes.has(item.promptSemanticHash as string) ||
        priorEpisodeContentHashes.has(item.contentSemanticHash as string) ||
        independentHashes.has(item.promptSemanticHash as string) ||
        independentContentHashes.has(item.contentSemanticHash as string)
      ) {
        issues.push("v2_episode_outline_independent_invalid");
      } else {
        independentHashes.add(item.promptSemanticHash as string);
        independentContentHashes.add(item.contentSemanticHash as string);
        const positions = rolePositions.get(item.outcomeId as string) ?? {};
        if (positions.independent === undefined)
          positions.independent = ordinal;
        rolePositions.set(item.outcomeId as string, positions);
      }
    }
  });
  for (const outcomeId of primary ?? []) {
    const positions = rolePositions.get(outcomeId);
    if (
      !positions ||
      positions.introduce === undefined ||
      positions.retrieval === undefined ||
      positions.near === undefined ||
      positions.independent === undefined ||
      !(
        positions.introduce < positions.retrieval &&
        positions.retrieval < positions.near &&
        positions.near < positions.independent
      )
    )
      issues.push("v2_episode_outline_evidence_role_closure_invalid");
  }
  const delayed = Array.isArray(body.delayedProbeDefinitions)
    ? body.delayedProbeDefinitions
    : [];
  const delayedOutcomes = new Set<string>();
  const delayedProbeIds = new Set<string>();
  const delayedPromptHashes = new Set<string>();
  const delayedContentHashes = new Set<string>();
  for (const raw of delayed) {
    const keys = [
      "probeId",
      "outcomeId",
      "decisionRegistryRef",
      "minimumDelayDays",
      "maximumDelayDays",
      "novelPromptSemanticHash",
      "novelContentSemanticHash",
      "sourceRefId",
      "newSurfaceForm",
      "support",
      "maxHints",
      "answerExposure",
      "learningEvidenceClass",
      "requiredTimingReceipt",
    ];
    const policy =
      isRecord(raw) && isRecord(raw.decisionRegistryRef)
        ? raw.decisionRegistryRef
        : null;
    if (
      !isRecord(raw) ||
      !exactKeys(raw, keys) ||
      !exactString(raw.probeId, TOKEN_RE) ||
      delayedProbeIds.has(raw.probeId as string) ||
      !primary?.includes(String(raw.outcomeId)) ||
      delayedOutcomes.has(raw.outcomeId as string) ||
      !policy ||
      !exactKeys(policy, ["decisionId", "version", "contentHash"]) ||
      policy.decisionId !== plan.decisionRegistryRef.decisionId ||
      policy.version !== plan.decisionRegistryRef.version ||
      !exactString(policy.contentHash, SHA256_RE) ||
      policy.contentHash !== plan.decisionRegistryRef.contentHash ||
      decisionRefs.get(plan.decisionRegistryRef.decisionId) !==
        policy.contentHash ||
      raw.probeId !== `${stage.episodeId}:delayed:${String(raw.outcomeId)}` ||
      raw.minimumDelayDays !== 3 ||
      raw.maximumDelayDays !== 7 ||
      !exactString(raw.novelPromptSemanticHash, SHA256_RE) ||
      !exactString(raw.novelContentSemanticHash, SHA256_RE) ||
      !exactString(raw.sourceRefId, TOKEN_RE) ||
      !authoritativeSources.has(raw.sourceRefId as string) ||
      raw.newSurfaceForm !== true ||
      raw.support !== "none" ||
      raw.maxHints !== 0 ||
      raw.answerExposure !== "forbidden" ||
      trainingPromptHashes.has(raw.novelPromptSemanticHash as string) ||
      trainingContentHashes.has(raw.novelContentSemanticHash as string) ||
      priorEpisodePromptHashes.has(raw.novelPromptSemanticHash as string) ||
      priorEpisodeContentHashes.has(raw.novelContentSemanticHash as string) ||
      delayedPromptHashes.has(raw.novelPromptSemanticHash as string) ||
      delayedContentHashes.has(raw.novelContentSemanticHash as string) ||
      raw.learningEvidenceClass !== "external_delayed_candidate" ||
      raw.requiredTimingReceipt !== true
    ) {
      issues.push("v2_episode_outline_delayed_probe_invalid");
    } else {
      if (
        independentHashes.has(raw.novelPromptSemanticHash as string) ||
        independentContentHashes.has(raw.novelContentSemanticHash as string)
      ) {
        issues.push("v2_episode_outline_delayed_prompt_leak");
      }
      delayedProbeIds.add(raw.probeId as string);
      delayedPromptHashes.add(raw.novelPromptSemanticHash as string);
      delayedContentHashes.add(raw.novelContentSemanticHash as string);
      delayedOutcomes.add(raw.outcomeId as string);
    }
  }
  if (primary?.some((id) => !delayedOutcomes.has(id)) ?? true)
    issues.push("v2_episode_outline_delayed_probe_closure_invalid");
  if (
    [...independentHashes].some((hash) => trainingPromptHashes.has(hash)) ||
    [...independentContentHashes].some((hash) =>
      trainingContentHashes.has(hash),
    )
  ) {
    issues.push("v2_episode_outline_independent_rehearsal_leak");
  }
  const exactHashSetMatches = (
    actual: ReadonlySet<string>,
    expected: unknown,
  ) => {
    const parsed = hashArray(expected, 1, 768);
    return Boolean(
      parsed &&
      parsed.length === actual.size &&
      parsed.every((hash) => actual.has(hash)),
    );
  };
  if (
    !isRecord(promptHistoryCommitment) ||
    !exactHashSetMatches(
      trainingPromptHashes,
      promptHistoryCommitment.trainingPromptSemanticHashes,
    ) ||
    !exactHashSetMatches(
      trainingContentHashes,
      promptHistoryCommitment.trainingContentSemanticHashes,
    ) ||
    !exactHashSetMatches(
      trainingSurfaceHashes,
      promptHistoryCommitment.trainingSurfaceSemanticHashes,
    ) ||
    !exactHashSetMatches(
      trainingVisibleSurfaceHashes,
      promptHistoryCommitment.trainingVisibleSurfaceSemanticHashes,
    ) ||
    !exactHashSetMatches(
      independentHashes,
      promptHistoryCommitment.independentPromptSemanticHashes,
    ) ||
    !exactHashSetMatches(
      independentContentHashes,
      promptHistoryCommitment.independentContentSemanticHashes,
    ) ||
    !exactHashSetMatches(
      delayedPromptHashes,
      promptHistoryCommitment.delayedPromptSemanticHashes,
    ) ||
    !exactHashSetMatches(
      delayedContentHashes,
      promptHistoryCommitment.delayedContentSemanticHashes,
    )
  ) {
    issues.push("v2_episode_outline_prompt_history_mismatch");
  }

  const checkpointExpected = episodeOrdinal % 8 === 0;
  if (!checkpointExpected && body.checkpointBlueprint !== null)
    issues.push("v2_episode_outline_checkpoint_unexpected");
  if (checkpointExpected) {
    const checkpoint = body.checkpointBlueprint;
    const keys = [
      "checkpointId",
      "coveredOutcomeIds",
      "heldOutPromptRefs",
      "criticalTargets",
      "support",
      "maxHints",
      "answerExposure",
      "certificationClaim",
    ];
    const expectedCovered = Array.isArray(seasonBody?.episodeRows)
      ? sortedUnique(
          seasonBody.episodeRows
            .slice(0, episodeOrdinal)
            .flatMap((row) =>
              isRecord(row) && Array.isArray(row.primaryOutcomeIds)
                ? row.primaryOutcomeIds.filter(
                    (id): id is string => typeof id === "string",
                  )
                : [],
            ),
        )
      : [];
    const covered = isRecord(checkpoint)
      ? stringArray(checkpoint.coveredOutcomeIds, 1, 128)
      : null;
    const heldOut =
      isRecord(checkpoint) && Array.isArray(checkpoint.heldOutPromptRefs)
        ? checkpoint.heldOutPromptRefs
        : [];
    const priorPromptHistory = Array.isArray(
      seasonBody?.promptHistoryCommitments,
    )
      ? seasonBody.promptHistoryCommitments.slice(0, episodeOrdinal)
      : [];
    const priorPromptHashes = new Set(
      priorPromptHistory.flatMap((row) =>
        isRecord(row)
          ? [
              "trainingPromptSemanticHashes",
              "independentPromptSemanticHashes",
              "delayedPromptSemanticHashes",
            ].flatMap((key) =>
              Array.isArray(row[key])
                ? row[key].filter(
                    (value): value is string => typeof value === "string",
                  )
                : [],
            )
          : [],
      ),
    );
    const priorContentHashes = new Set(
      priorPromptHistory.flatMap((row) =>
        isRecord(row)
          ? [
              "trainingContentSemanticHashes",
              "independentContentSemanticHashes",
              "delayedContentSemanticHashes",
            ].flatMap((key) =>
              Array.isArray(row[key])
                ? row[key].filter(
                    (value): value is string => typeof value === "string",
                  )
                : [],
            )
          : [],
      ),
    );
    let heldOutValid = heldOut.length >= 1 && heldOut.length <= 128;
    const checkpointPromptHashes = new Set<string>();
    const checkpointContentHashes = new Set<string>();
    const heldOutOutcomeIds = new Set<string>();
    const heldOutCriticalTargetIds = new Set<string>();
    const heldOutCriticalTargetCounts = new Map<string, number>();
    const heldOutBindings: Readonly<{
      outcomeIds: readonly string[];
      criticalTargetIds: readonly string[];
    }>[] = [];
    for (const prompt of heldOut) {
      const promptOutcomeIds = isRecord(prompt)
        ? stringArray(prompt.outcomeIds, 1, 8)
        : null;
      const promptConstructIds = isRecord(prompt)
        ? stringArray(prompt.constructIds, 1, 16)
        : null;
      const promptCriticalTargetIds = isRecord(prompt)
        ? stringArray(prompt.criticalTargetIds, 1, 8)
        : null;
      if (
        !isRecord(prompt) ||
        !exactKeys(prompt, [
          "promptSemanticHash",
          "contentSemanticHash",
          "sourceRefId",
          "outcomeIds",
          "constructIds",
          "criticalTargetIds",
        ]) ||
        !exactString(prompt.promptSemanticHash, SHA256_RE) ||
        !exactString(prompt.contentSemanticHash, SHA256_RE) ||
        !exactString(prompt.sourceRefId, TOKEN_RE) ||
        !authoritativeSources.has(prompt.sourceRefId as string) ||
        !promptOutcomeIds ||
        promptOutcomeIds.some((id) => !covered?.includes(id)) ||
        !promptConstructIds ||
        promptConstructIds.some(
          (constructId) =>
            !promptOutcomeIds.some((outcomeId) => {
              const outcome = seasonOutcomes.get(outcomeId);
              return (
                outcome?.scaleKey === constructId ||
                (
                  outcome?.successCriteriaIds as readonly string[] | undefined
                )?.includes(constructId)
              );
            }),
        ) ||
        !promptCriticalTargetIds ||
        trainingPromptHashes.has(prompt.promptSemanticHash as string) ||
        trainingContentHashes.has(prompt.contentSemanticHash as string) ||
        independentHashes.has(prompt.promptSemanticHash as string) ||
        independentContentHashes.has(prompt.contentSemanticHash as string) ||
        delayedPromptHashes.has(prompt.promptSemanticHash as string) ||
        delayedContentHashes.has(prompt.contentSemanticHash as string) ||
        priorPromptHashes.has(prompt.promptSemanticHash as string) ||
        priorContentHashes.has(prompt.contentSemanticHash as string) ||
        checkpointPromptHashes.has(prompt.promptSemanticHash as string) ||
        checkpointContentHashes.has(prompt.contentSemanticHash as string)
      ) {
        heldOutValid = false;
      } else {
        checkpointPromptHashes.add(prompt.promptSemanticHash as string);
        checkpointContentHashes.add(prompt.contentSemanticHash as string);
        promptOutcomeIds.forEach((id) => heldOutOutcomeIds.add(id));
        promptCriticalTargetIds.forEach((id) => {
          heldOutCriticalTargetIds.add(id);
          heldOutCriticalTargetCounts.set(
            id,
            (heldOutCriticalTargetCounts.get(id) ?? 0) + 1,
          );
        });
        heldOutBindings.push(
          Object.freeze({
            outcomeIds: promptOutcomeIds,
            criticalTargetIds: promptCriticalTargetIds,
          }),
        );
      }
    }
    const criticalTargets =
      isRecord(checkpoint) && Array.isArray(checkpoint.criticalTargets)
        ? checkpoint.criticalTargets
        : [];
    const criticalOutcomeIds = new Set<string>();
    const criticalTargetIds = new Set<string>();
    const criticalTargetOutcomeById = new Map<string, string>();
    let criticalTargetsValid =
      criticalTargets.length === expectedCovered.length;
    for (const target of criticalTargets) {
      if (
        !isRecord(target) ||
        !exactKeys(target, [
          "criticalTargetId",
          "outcomeId",
          "semanticSlotIds",
          "constraintIds",
          "alternate",
          "repair",
          "reassessment",
        ]) ||
        !exactString(target.criticalTargetId, TOKEN_RE) ||
        criticalTargetIds.has(target.criticalTargetId as string) ||
        !covered?.includes(String(target.outcomeId)) ||
        criticalOutcomeIds.has(target.outcomeId as string) ||
        !stringArray(target.semanticSlotIds, 1, 64) ||
        !stringArray(target.constraintIds, 1, 64) ||
        !(target.constraintIds as readonly string[]).every((id) =>
          (
            seasonOutcomes.get(target.outcomeId as string)
              ?.successCriteriaIds as readonly string[] | undefined
          )?.includes(id),
        ) ||
        !isRecord(target.alternate) ||
        !exactKeys(target.alternate, ["mode", "semanticSlotIds"]) ||
        target.alternate.mode !== "deterministic_non_ai" ||
        !stringArray(target.alternate.semanticSlotIds, 1, 64) ||
        canonicalJsonV1(target.alternate.semanticSlotIds) !==
          canonicalJsonV1(target.semanticSlotIds) ||
        !isRecord(target.repair) ||
        !exactKeys(target.repair, [
          "targetOutcomeId",
          "issueCode",
          "activityPlanId",
        ]) ||
        target.repair.targetOutcomeId !== target.outcomeId ||
        !exactString(target.repair.issueCode, ISSUE_RE) ||
        !exactString(target.repair.activityPlanId, TOKEN_RE) ||
        !isRecord(target.reassessment) ||
        !exactKeys(target.reassessment, [
          "targetOutcomeId",
          "policyId",
          "heldOutRequired",
        ]) ||
        target.reassessment.targetOutcomeId !== target.outcomeId ||
        !exactString(target.reassessment.policyId, TOKEN_RE) ||
        target.reassessment.heldOutRequired !== true
      ) {
        criticalTargetsValid = false;
      } else {
        criticalOutcomeIds.add(target.outcomeId as string);
        criticalTargetIds.add(target.criticalTargetId as string);
        criticalTargetOutcomeById.set(
          target.criticalTargetId as string,
          target.outcomeId as string,
        );
      }
    }
    const heldOutBindingsValid = heldOutBindings.every(
      (binding) =>
        binding.criticalTargetIds.every((targetId) => {
          const targetOutcomeId = criticalTargetOutcomeById.get(targetId);
          return Boolean(
            targetOutcomeId && binding.outcomeIds.includes(targetOutcomeId),
          );
        }) &&
        binding.outcomeIds.every((outcomeId) =>
          binding.criticalTargetIds.some(
            (targetId) => criticalTargetOutcomeById.get(targetId) === outcomeId,
          ),
        ),
    );
    if (
      !isRecord(checkpoint) ||
      !exactKeys(checkpoint, keys) ||
      !exactString(checkpoint.checkpointId, TOKEN_RE) ||
      !covered ||
      covered.length !== expectedCovered.length ||
      expectedCovered.some((id) => !covered.includes(id)) ||
      !heldOutValid ||
      !criticalTargetsValid ||
      expectedCovered.some((id) => !criticalOutcomeIds.has(id)) ||
      expectedCovered.some((id) => !heldOutOutcomeIds.has(id)) ||
      criticalTargetIds.size !== heldOutCriticalTargetIds.size ||
      [...criticalTargetIds].some((id) => !heldOutCriticalTargetIds.has(id)) ||
      [...criticalTargetIds].some(
        (id) => heldOutCriticalTargetCounts.get(id) !== 1,
      ) ||
      !heldOutBindingsValid ||
      checkpoint.support !== "none" ||
      checkpoint.maxHints !== 0 ||
      checkpoint.answerExposure !== "forbidden" ||
      checkpoint.certificationClaim !== false
    ) {
      issues.push("v2_episode_outline_checkpoint_invalid");
    }
  }
  const needsSpeaking = (primary ?? []).some((id) => {
    const outcome = seasonOutcomes.get(id);
    return (
      outcome?.modality === "spoken" &&
      (outcome.activity === "production" ||
        outcome.activity === "interaction" ||
        outcome.activity === "mediation")
    );
  });
  const disposition = plan.optionalStageDispositions[episodeOrdinal - 1];
  if (needsSpeaking && disposition?.speakingMission !== "required")
    issues.push("v2_episode_outline_spoken_mission_invalid");
  return Object.freeze({
    checked: Object.freeze(checked),
    issues: sortedUnique(issues),
    requiredHuman: Object.freeze([
      "assessment_specialist",
      "curriculum_scientist",
      "target_language_linguist",
    ]),
    requiredDevice: Object.freeze([]),
    requiredListening: Object.freeze([]),
  });
}

function notInstalledValidation(): BodyValidation {
  return Object.freeze({
    checked: Object.freeze(["validator_installation"]),
    issues: Object.freeze(["v2_stage_validator_not_installed"]),
    requiredHuman: Object.freeze([]),
    requiredDevice: Object.freeze([]),
    requiredListening: Object.freeze([]),
  });
}

function validateBody(
  plan: V2CanonicalSeasonPlanV1,
  stage: V2CanonicalStageNode,
  candidate: V2CanonicalStageArtifactCandidateHandle,
  resolved: readonly V2CanonicalStageArtifactCandidateHandle[],
): BodyValidation {
  const installation = V2_CANONICAL_STAGE_VALIDATOR_INSTALLATION[stage.kind];
  if (installation.state === "not_installed") return notInstalledValidation();
  if (candidate.bodySchemaVersion !== installation.bodySchemaVersion) {
    return Object.freeze({
      checked: Object.freeze(["body_schema"]),
      issues: Object.freeze(["v2_stage_body_schema_invalid"]),
      requiredHuman: Object.freeze([]),
      requiredDevice: Object.freeze([]),
      requiredListening: Object.freeze([]),
    });
  }
  if (stage.kind === "v2_season_outline")
    return validateSeasonOutlineBody(plan, candidate);
  if (stage.kind === "v2_episode_outline")
    return validateEpisodeOutlineBody(plan, stage, candidate, resolved);
  const b2 = validateV2B2StageBody({
    plan,
    stage,
    candidate: candidate as V2B2CandidateView,
    episodeOutline: (resolved.find(
      (row) => row.stageKind === "v2_episode_outline",
    ) ?? null) as V2B2CandidateView | null,
  });
  if (b2) return b2;
  return notInstalledValidation();
}

function receiptBody(
  receipt: Omit<V2MachineStageValidationReceiptV1, "receiptFingerprint">,
) {
  return receipt;
}

export function validateV2CanonicalStageArtifact(
  plan: V2CanonicalSeasonPlanV1,
  candidate: V2CanonicalStageArtifactCandidateHandle,
  dependencySnapshotRaw: string,
  artifactRefRaw: string,
  ...resolvedDependencies: readonly V2ResolvedValidatedStageDependencyHandle[]
): V2MachineStageValidationReceiptV1 {
  if (!isV2CanonicalSeasonPlan(plan))
    throw new Error("v2_stage_validation_plan_invalid");
  if (
    !candidate ||
    typeof candidate !== "object" ||
    !candidateHandles.has(candidate as object)
  ) {
    throw new Error("v2_stage_validation_candidate_untrusted");
  }
  if (resolvedDependencies.length > V2_CANONICAL_MAX_EXTERNAL_DEPENDENCIES) {
    throw new Error("v2_stage_dependency_receipt_count_invalid");
  }
  const artifactRef = parseArtifactRef(artifactRefRaw, candidate);
  const stage = plan.stages.find((row) => row.stageId === candidate.stageId);
  if (!stage) throw new Error("v2_stage_validation_stage_invalid");
  const issues: string[] = [];
  if (
    candidate.planFingerprint !== plan.planFingerprint ||
    candidate.stageKind !== stage.kind ||
    candidate.subject.workspaceId !== stage.workspaceId ||
    candidate.subject.jobId !== stage.jobId ||
    candidate.subject.seasonId !== stage.seasonId ||
    candidate.subject.episodeId !== stage.episodeId ||
    candidate.subject.locale !== stage.locale ||
    candidate.subject.authoringRevision !== stage.authoringRevision
  ) {
    issues.push("v2_stage_validation_subject_mismatch");
  }
  const dependencySnapshot = parseV2ImmutableDependencySnapshot(
    dependencySnapshotRaw,
  );
  const dependencyFingerprint = v2DependencyFingerprint(dependencySnapshot);
  if (candidate.dependencyFingerprint !== dependencyFingerprint)
    issues.push("v2_stage_dependency_fingerprint_mismatch");
  const installation = V2_CANONICAL_STAGE_VALIDATOR_INSTALLATION[stage.kind];
  if (installation.state === "installed") {
    issues.push(
      ...validateDependencyClosure(
        plan.planFingerprint,
        stage,
        dependencySnapshot,
        resolvedDependencies,
      ),
    );
  }
  if (candidate.contentClass === "test_only")
    issues.push("v2_stage_test_content_forbidden");
  const resolvedCandidates = resolvedDependencies.flatMap((handle) => {
    if (
      !handle ||
      typeof handle !== "object" ||
      !resolvedDependencyHandles.has(handle as object)
    )
      return [];
    const metadata = resolvedDependencyMetadata.get(handle as object);
    return metadata ? [metadata.candidate] : [];
  });
  let bodyValidation: BodyValidation;
  try {
    bodyValidation = validateBody(plan, stage, candidate, resolvedCandidates);
  } catch {
    bodyValidation = Object.freeze({
      checked: Object.freeze(["validator_internal"]),
      issues: Object.freeze(["v2_stage_validator_internal_error"]),
      requiredHuman: Object.freeze([]),
      requiredDevice: Object.freeze([]),
      requiredListening: Object.freeze([]),
    });
  }
  issues.push(...bodyValidation.issues);
  const blockingIssueCodes = sortedUnique(issues);
  if (
    blockingIssueCodes.length > MAX_ISSUES ||
    blockingIssueCodes.some((code) => !ISSUE_RE.test(code))
  ) {
    throw new Error("v2_stage_validation_issue_budget_invalid");
  }
  const dependencyMachineReceiptFingerprints = Object.freeze(
    resolvedDependencies
      .flatMap((handle) => {
        if (
          !handle ||
          typeof handle !== "object" ||
          !resolvedDependencyHandles.has(handle as object)
        )
          return [];
        const metadata = resolvedDependencyMetadata.get(handle as object);
        return metadata ? [metadata.receipt.receiptFingerprint] : [];
      })
      .sort(compareCodePoint),
  );
  const base = Object.freeze({
    schemaVersion: "v2-machine-stage-validation-receipt.v1" as const,
    validatorProfile: Object.freeze({
      id: VALIDATOR_ID,
      version: VALIDATOR_VERSION,
      rulesFingerprint: RULES_FINGERPRINT,
    }),
    planFingerprint: plan.planFingerprint,
    stageId: stage.stageId,
    stageKind: stage.kind,
    subjectFingerprint: candidate.subject.subjectFingerprint,
    artifactRef,
    bodySchemaVersion: candidate.bodySchemaVersion,
    bodyFingerprint: candidate.bodyFingerprint,
    candidateFingerprint: candidate.candidateFingerprint,
    dependencyFingerprint,
    dependencyMachineReceiptFingerprints,
    checkedRuleCodes: sortedUnique(bodyValidation.checked),
    blockingIssueCodes,
    outcome:
      blockingIssueCodes.length === 0
        ? ("eligible_for_human_review" as const)
        : ("blocked" as const),
    humanReviewState: "not_evaluated" as const,
    specialistEvidenceAuthority: "none" as const,
    deviceEvidenceAuthority: "none" as const,
    listeningEvidenceAuthority: "none" as const,
    requiredHumanEvidence: sortedUnique(bodyValidation.requiredHuman),
    requiredDeviceEvidence: sortedUnique(bodyValidation.requiredDevice),
    requiredListeningEvidence: sortedUnique(bodyValidation.requiredListening),
    evidenceAuthority: "machine_validation_only" as const,
    artifactStorageAuthority: "none" as const,
    sourceEvidenceAuthority: "unverified_external_refs" as const,
    externalDependencyAuthority: "unverified_external_refs" as const,
    humanApprovalAuthority: "none" as const,
    executionAuthority: "none" as const,
    publicationPolicy: "draft_only_no_consumer" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  });
  const receipt = Object.freeze({
    ...base,
    receiptFingerprint: hashCanonicalBody(receiptBody(base)),
  });
  receiptHandles.add(receipt);
  return receipt;
}

export function isV2CanonicalStageArtifactCandidateHandle(
  value: unknown,
): value is V2CanonicalStageArtifactCandidateHandle {
  return (
    typeof value === "object" &&
    value !== null &&
    candidateHandles.has(value as object)
  );
}
