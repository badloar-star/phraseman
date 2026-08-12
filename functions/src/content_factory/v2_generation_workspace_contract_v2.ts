import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
  utf8ByteLengthV1,
  type ImmutableObjectRef,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  isV2CanonicalSeasonPlanV2,
  type V2CanonicalExternalRequirementV2,
  type V2CanonicalSeasonPlanV2,
  type V2CanonicalStageNodeV2,
} from "./v2_canonical_generation_plan_v2";
import {
  isV2ActivityRepositoryCapabilityBindingV1,
  type V2ActivityRepositoryCapabilityBindingV1,
} from "./v2_repository_capability_observation_v1";

export const V2_STAGE_DEPENDENCY_SNAPSHOT_SCHEMA_V2 =
  "v2-stage-dependency-snapshot.v2" as const;
export const V2_GENERATION_STAGE_WORKSPACE_SCHEMA_V2 =
  "v2-generation-stage-workspace.v2" as const;
export const V2_CANONICAL_STAGE_CANDIDATE_SCHEMA_V2 =
  "v2-canonical-stage-artifact-candidate.v2" as const;
export const V2_STRUCTURAL_STAGE_RECEIPT_SCHEMA_V2 =
  "v2-structural-stage-reader-receipt.v2" as const;

export const V2_WORKSPACE_DEPENDENCY_MAX_COUNT_V2 = 32;
export const V2_WORKSPACE_DEPENDENCY_MAX_BYTES_V2 = 128 * 1024;
export const V2_WORKSPACE_MAX_BYTES_V2 = 64 * 1024;
export const V2_STAGE_CANDIDATE_MAX_BYTES_V2 = 512 * 1024;

const HASH_RE = /^[a-f0-9]{64}$/;
const TOKEN_RE = /^[a-z0-9][a-z0-9._:-]{0,159}$/;
const STAGE_RE = /^[A-Za-z0-9._:-]{1,1000}$/;
const PATH_RE = /^[A-Za-z0-9._/@:+-]{1,1000}$/;
const GENERATION_RE = /^[A-Za-z0-9._:-]{1,160}$/;
const RESERVED_KEYS = new Set(["__proto__", "prototype", "constructor"]);

type V2StageKind = V2CanonicalStageNodeV2["kind"];

const STAGE_KINDS = Object.freeze([
  "v2_season_outline",
  "v2_episode_outline",
  "v2_scene_set",
  "v2_dialogue_script",
  "v2_speaking_mission",
  "v2_voice_targets",
  "v2_activity_instances",
  "v2_activity_graph",
  "v2_asset_manifest",
  "v2_localization",
  "v2_preview_receipt",
  "v2_episode_bundle",
  "v2_season_qa",
] as const satisfies readonly V2StageKind[]);

type V2StageValidatorRegistryEntryV2 =
  | Readonly<{
      state: "installed";
      bodySchemaVersion: string;
      validatorId: string;
      validatorVersion: number;
    }>
  | Readonly<{
      state: "not_installed";
      bodySchemaVersion: null;
      validatorId: null;
      validatorVersion: null;
    }>;

export const V2_STAGE_VALIDATOR_REGISTRY_V2 = Object.freeze(
  Object.fromEntries(
    STAGE_KINDS.map((kind) => [
      kind,
      kind === "v2_activity_instances"
        ? Object.freeze({
            state: "installed" as const,
            bodySchemaVersion: "v2-activity-instances-package-root.v2",
            validatorId: "learning-v2-activity-instances-validator",
            validatorVersion: 1,
          })
        : Object.freeze({
            state: "not_installed" as const,
            bodySchemaVersion: null,
            validatorId: null,
            validatorVersion: null,
          }),
    ]),
  ) as Readonly<Record<V2StageKind, V2StageValidatorRegistryEntryV2>>,
);

export type V2WorkspaceObjectRefV2 = ImmutableObjectRef;

export type V2StageDependencyEntryV2 =
  | Readonly<{
      dependencyType: "stage";
      stageId: string;
      candidateFingerprint: string;
      machineReceiptFingerprint: string;
      artifactRef: V2WorkspaceObjectRefV2;
      lifecycleFingerprint: string;
    }>
  | Readonly<{
      dependencyType: "external";
      requirementId: string;
      requirement: V2CanonicalExternalRequirementV2;
      artifactRef: V2WorkspaceObjectRefV2;
      lifecycleFingerprint: string;
    }>;

export interface V2StageDependencySnapshotV2 {
  readonly schemaVersion: typeof V2_STAGE_DEPENDENCY_SNAPSHOT_SCHEMA_V2;
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly stageKind: V2StageKind;
  readonly entries: readonly V2StageDependencyEntryV2[];
  readonly entryCount: number;
  readonly resolutionOrigin: "not_established";
  readonly snapshotFingerprint: string;
}

export type V2WorkspaceCapabilityBindingV2 =
  | Readonly<{ kind: "none" }>
  | Readonly<{
      kind: "activity_instances";
      bindingFingerprint: string;
      resolutionOrigin: "not_established";
    }>;

export interface V2GenerationStageWorkspaceV2 {
  readonly schemaVersion: typeof V2_GENERATION_STAGE_WORKSPACE_SCHEMA_V2;
  readonly planSchemaVersion: "v2-canonical-season-plan.v2";
  readonly compilerVersion: "v2-canonical-plan-compiler.v2";
  readonly coordinateSchemaVersion: "v2-stage-coordinate.v2";
  readonly artifactModel: "episode-v2-session-set-v2";
  readonly planFingerprint: string;
  readonly courseContractFingerprint: string;
  readonly subject: Readonly<{
    workspaceId: string;
    jobId: string;
    authoringRevision: number;
    seasonId: string;
    targetLanguage: string;
    subjectFingerprint: string;
  }>;
  readonly stage: Readonly<{
    stageId: string;
    kind: V2StageKind;
    episodeId: string | null;
    locale: string | null;
  }>;
  readonly dependencySnapshotFingerprint: string;
  readonly capabilityBinding: V2WorkspaceCapabilityBindingV2;
  readonly dependencyResolutionOrigin: "not_established";
  readonly executionAuthority: "none";
  readonly storageAuthority: "none";
  readonly publicationPolicy: "draft_only_no_consumer";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly workspaceFingerprint: string;
}

export type V2CandidateProvenanceRefV2 = Readonly<{
  provenanceType:
    | "authoring_revision"
    | "stage_artifact"
    | "published_template"
    | "language_profile"
    | "speech_profile"
    | "voice_generation_profile"
    | "authoritative_source"
    | "decision_registry"
    | "generated_asset_receipt";
  provenanceId: string;
  objectPath: string;
  contentHash: string;
  objectGeneration: string;
  byteSize: number;
}>;

export interface V2CanonicalStageCandidateV2 {
  readonly schemaVersion: typeof V2_CANONICAL_STAGE_CANDIDATE_SCHEMA_V2;
  readonly workspaceFingerprint: string;
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly stageKind: V2StageKind;
  readonly subjectFingerprint: string;
  readonly bodySchemaVersion: string;
  readonly body: unknown;
  readonly bodyFingerprint: string;
  readonly dependencySnapshotFingerprint: string;
  readonly capabilityBindingFingerprint: string | null;
  readonly contentClass: "production_candidate" | "test_only" | "demo_content";
  readonly provenanceRefs: readonly V2CandidateProvenanceRefV2[];
  readonly provenanceFingerprint: string;
  readonly producerFingerprint: string;
  readonly configurationFingerprint: string;
  readonly candidateBytesOrigin: "caller_supplied_canonical_bytes";
  readonly candidateOriginAuthenticity: "not_established";
  readonly contentTrackAuthority: "unverified_candidate_claim";
  readonly artifactStorageAuthority: "none";
  readonly repositoryAuthority: "none";
  readonly humanReviewAuthority: "none";
  readonly specialistEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly listeningEvidenceAuthority: "none";
  readonly executionAuthority: "none";
  readonly publicationPolicy: "draft_only_no_consumer";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly candidateFingerprint: string;
}

export interface V2BlockedStructuralStageReceiptV2 {
  readonly schemaVersion: typeof V2_STRUCTURAL_STAGE_RECEIPT_SCHEMA_V2;
  readonly readerProfile: Readonly<{
    id: "learning-v2-structural-stage-reader-v2";
    version: 1;
    rulesFingerprint: string;
  }>;
  readonly workspaceFingerprint: string;
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly stageKind: V2StageKind;
  readonly subjectFingerprint: string;
  readonly candidateFingerprint: string;
  readonly bodySchemaVersion: string;
  readonly bodyFingerprint: string;
  readonly dependencySnapshotFingerprint: string;
  readonly capabilityBindingFingerprint: string | null;
  readonly repositoryObservationFingerprint: string | null;
  readonly artifactRef: V2WorkspaceObjectRefV2;
  readonly checkedRuleCodes: readonly string[];
  readonly blockingIssueCodes: readonly string[];
  readonly outcome: "blocked";
  readonly candidateClassification: "structural_candidate_only";
  readonly machineValidationAuthority: "structural_checks_only";
  readonly humanReviewState: "not_evaluated";
  readonly humanApprovalAuthority: "none";
  readonly sourceEvidenceAuthority: "unverified_canonical_bytes";
  readonly externalDependencyAuthority: "unverified_injected_readback";
  readonly readerEvidenceOrigin: "not_established";
  readonly evidenceAuthority: "structural_snapshot_only";
  readonly dependencyResolutionAuthority: "none";
  readonly humanReviewAuthority: "none";
  readonly specialistEvidenceAuthority: "none";
  readonly deviceEvidenceAuthority: "none";
  readonly listeningEvidenceAuthority: "none";
  readonly executionAuthority: "none";
  readonly artifactStorageAuthority: "none";
  readonly publicationPolicy: "draft_only_no_consumer";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly receiptFingerprint: string;
}

const snapshotHandles = new WeakSet<object>();
const snapshotMetadata = new WeakMap<
  object,
  Readonly<{ plan: V2CanonicalSeasonPlanV2; stageId: string }>
>();
const workspaceHandles = new WeakSet<object>();
const workspaceMetadata = new WeakMap<
  object,
  Readonly<{
    plan: V2CanonicalSeasonPlanV2;
    snapshot: V2StageDependencySnapshotV2;
  }>
>();
const candidateHandles = new WeakSet<object>();
const candidateMetadata = new WeakMap<
  object,
  Readonly<{ rawHash: string; rawBytes: number }>
>();
const receiptHandles = new WeakSet<object>();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const exactKeys = (
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean => {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return (
    actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index])
  );
};

const compareCodePoint = (left: string, right: string): number =>
  left < right ? -1 : left > right ? 1 : 0;

const exactString = (value: unknown, pattern: RegExp, code: string): string => {
  if (typeof value !== "string" || !pattern.test(value)) throw new Error(code);
  return value;
};

const exactObjectPath = (value: unknown, code: string): string => {
  const objectPath = exactString(value, PATH_RE, code);
  const segments = objectPath.split("/");
  if (
    objectPath.startsWith("/") ||
    objectPath.endsWith("/") ||
    segments.some(
      (segment) => segment === "" || segment === "." || segment === "..",
    )
  )
    throw new Error(code);
  return objectPath;
};

function deepFreeze<T>(root: T): T {
  const pending: object[] =
    typeof root === "object" && root !== null ? [root as object] : [];
  const ordered: object[] = [];
  while (pending.length > 0) {
    const value = pending.pop()!;
    ordered.push(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      if (typeof child === "object" && child !== null) pending.push(child);
    }
  }
  for (let index = ordered.length - 1; index >= 0; index -= 1) {
    Object.freeze(ordered[index]);
  }
  return root;
}

function preflightJson(root: unknown): void {
  const pending: { value: unknown; depth: number }[] = [
    { value: root, depth: 0 },
  ];
  let nodes = 0;
  let arrayEntries = 0;
  while (pending.length > 0) {
    const current = pending.pop()!;
    nodes += 1;
    if (nodes > 50_000 || current.depth > 24)
      throw new Error("v2_workspace_json_complexity_invalid");
    const value = current.value;
    if (typeof value === "string") {
      if (value.length > 128 * 1024 || value.normalize("NFC") !== value)
        throw new Error("v2_workspace_json_string_invalid");
      continue;
    }
    if (value === null || typeof value === "boolean") continue;
    if (typeof value === "number") {
      if (
        !Number.isFinite(value) ||
        Object.is(value, -0) ||
        (Number.isInteger(value) && !Number.isSafeInteger(value))
      )
        throw new Error("v2_workspace_json_number_invalid");
      continue;
    }
    if (Array.isArray(value)) {
      arrayEntries += value.length;
      if (arrayEntries > 20_000)
        throw new Error("v2_workspace_json_complexity_invalid");
      value.forEach((child) =>
        pending.push({ value: child, depth: current.depth + 1 }),
      );
      continue;
    }
    if (!isRecord(value)) throw new Error("v2_workspace_json_invalid");
    const keys = Object.keys(value);
    if (
      keys.length > 128 ||
      keys.some((key) => RESERVED_KEYS.has(key) || key.normalize("NFC") !== key)
    )
      throw new Error("v2_workspace_json_object_invalid");
    keys.forEach((key) =>
      pending.push({ value: value[key], depth: current.depth + 1 }),
    );
  }
}

function parseCanonicalRoot(
  raw: unknown,
  maximum: number,
  code: string,
): { readonly value: Record<string, unknown>; readonly bytes: number } {
  if (typeof raw !== "string" || raw.length > maximum) throw new Error(code);
  let bytes: number;
  try {
    bytes = utf8ByteLengthV1(raw);
  } catch {
    throw new Error(code);
  }
  if (bytes > maximum) throw new Error(code);
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error(code);
  }
  preflightJson(value);
  if (!isRecord(value) || canonicalJsonV1(value) !== raw) throw new Error(code);
  return { value, bytes };
}

function objectRef(value: unknown, code: string): V2WorkspaceObjectRefV2 {
  if (
    !isRecord(value) ||
    !exactKeys(value, [
      "objectPath",
      "contentHash",
      "objectGeneration",
      "byteSize",
    ]) ||
    !Number.isSafeInteger(value.byteSize) ||
    Number(value.byteSize) < 1 ||
    Number(value.byteSize) > 512 * 1024 * 1024
  )
    throw new Error(code);
  return Object.freeze({
    objectPath: exactObjectPath(value.objectPath, code),
    contentHash: exactString(value.contentHash, HASH_RE, code),
    objectGeneration: exactString(value.objectGeneration, GENERATION_RE, code),
    byteSize: Number(value.byteSize),
  });
}

function requirement(value: unknown): V2CanonicalExternalRequirementV2 {
  if (!isRecord(value)) throw new Error("v2_workspace_requirement_invalid");
  const type = value.dependencyType;
  if (type === "published_template") {
    if (
      !exactKeys(value, [
        "dependencyType",
        "templateId",
        "version",
        "contentHash",
      ])
    )
      throw new Error("v2_workspace_requirement_invalid");
    return Object.freeze({
      dependencyType: type,
      templateId: exactString(
        value.templateId,
        TOKEN_RE,
        "v2_workspace_requirement_invalid",
      ),
      version: exactVersion(value.version),
      contentHash: exactString(
        value.contentHash,
        HASH_RE,
        "v2_workspace_requirement_invalid",
      ),
    });
  }
  if (
    type !== "language_profile" &&
    type !== "speech_profile" &&
    type !== "voice_generation_profile"
  )
    throw new Error("v2_workspace_requirement_invalid");
  if (
    !exactKeys(value, ["dependencyType", "profileId", "version", "contentHash"])
  )
    throw new Error("v2_workspace_requirement_invalid");
  return Object.freeze({
    dependencyType: type,
    profileId: exactString(
      value.profileId,
      TOKEN_RE,
      "v2_workspace_requirement_invalid",
    ),
    version: exactVersion(value.version),
    contentHash: exactString(
      value.contentHash,
      HASH_RE,
      "v2_workspace_requirement_invalid",
    ),
  });
}

function exactVersion(value: unknown): number {
  if (
    !Number.isSafeInteger(value) ||
    Number(value) < 1 ||
    Number(value) > 1_000_000
  )
    throw new Error("v2_workspace_requirement_invalid");
  return Number(value);
}

function entryIdentity(value: V2StageDependencyEntryV2): string {
  return value.dependencyType === "stage"
    ? `stage:${value.stageId}`
    : `external:${value.requirementId}`;
}

function parseEntry(value: unknown): V2StageDependencyEntryV2 {
  if (!isRecord(value)) throw new Error("v2_workspace_dependency_invalid");
  if (value.dependencyType === "stage") {
    if (
      !exactKeys(value, [
        "dependencyType",
        "stageId",
        "candidateFingerprint",
        "machineReceiptFingerprint",
        "artifactRef",
        "lifecycleFingerprint",
      ])
    )
      throw new Error("v2_workspace_dependency_invalid");
    return Object.freeze({
      dependencyType: "stage" as const,
      stageId: exactString(
        value.stageId,
        STAGE_RE,
        "v2_workspace_dependency_invalid",
      ),
      candidateFingerprint: exactString(
        value.candidateFingerprint,
        HASH_RE,
        "v2_workspace_dependency_invalid",
      ),
      machineReceiptFingerprint: exactString(
        value.machineReceiptFingerprint,
        HASH_RE,
        "v2_workspace_dependency_invalid",
      ),
      artifactRef: objectRef(
        value.artifactRef,
        "v2_workspace_dependency_invalid",
      ),
      lifecycleFingerprint: exactString(
        value.lifecycleFingerprint,
        HASH_RE,
        "v2_workspace_dependency_invalid",
      ),
    });
  }
  if (
    value.dependencyType !== "external" ||
    !exactKeys(value, [
      "dependencyType",
      "requirementId",
      "requirement",
      "artifactRef",
      "lifecycleFingerprint",
    ])
  )
    throw new Error("v2_workspace_dependency_invalid");
  const parsedRequirement = requirement(value.requirement);
  const artifactRef = objectRef(
    value.artifactRef,
    "v2_workspace_dependency_invalid",
  );
  if (artifactRef.contentHash !== parsedRequirement.contentHash)
    throw new Error("v2_workspace_dependency_invalid");
  return Object.freeze({
    dependencyType: "external" as const,
    requirementId: exactString(
      value.requirementId,
      TOKEN_RE,
      "v2_workspace_dependency_invalid",
    ),
    requirement: parsedRequirement,
    artifactRef,
    lifecycleFingerprint: exactString(
      value.lifecycleFingerprint,
      HASH_RE,
      "v2_workspace_dependency_invalid",
    ),
  });
}

function snapshotBody(
  value: Omit<V2StageDependencySnapshotV2, "snapshotFingerprint">,
) {
  return value;
}

export function parseV2StageDependencySnapshotV2(
  plan: V2CanonicalSeasonPlanV2,
  raw: string,
): V2StageDependencySnapshotV2 {
  if (!isV2CanonicalSeasonPlanV2(plan))
    throw new Error("v2_workspace_plan_untrusted");
  const { value } = parseCanonicalRoot(
    raw,
    V2_WORKSPACE_DEPENDENCY_MAX_BYTES_V2,
    "v2_workspace_dependency_snapshot_invalid",
  );
  if (
    !exactKeys(value, [
      "schemaVersion",
      "planFingerprint",
      "stageId",
      "stageKind",
      "entries",
      "entryCount",
      "resolutionOrigin",
      "snapshotFingerprint",
    ]) ||
    value.schemaVersion !== V2_STAGE_DEPENDENCY_SNAPSHOT_SCHEMA_V2 ||
    value.planFingerprint !== plan.planFingerprint ||
    !Array.isArray(value.entries) ||
    value.entries.length > V2_WORKSPACE_DEPENDENCY_MAX_COUNT_V2 ||
    value.entryCount !== value.entries.length ||
    value.resolutionOrigin !== "not_established"
  )
    throw new Error("v2_workspace_dependency_snapshot_invalid");
  const stageId = exactString(
    value.stageId,
    STAGE_RE,
    "v2_workspace_dependency_snapshot_invalid",
  );
  const stage = plan.stages.find((candidate) => candidate.stageId === stageId);
  if (!stage || value.stageKind !== stage.kind)
    throw new Error("v2_workspace_dependency_snapshot_invalid");
  const entries = Object.freeze(value.entries.map(parseEntry));
  const identities = entries.map(entryIdentity);
  if (
    new Set(identities).size !== identities.length ||
    identities.some(
      (identity, index) =>
        index > 0 && compareCodePoint(identities[index - 1], identity) >= 0,
    )
  )
    throw new Error("v2_workspace_dependency_order_invalid");
  const expected = [
    ...stage.dependsOn.map((dependency) => `stage:${dependency}`),
    ...stage.externalRequirementIds.map(
      (requirementId) => `external:${requirementId}`,
    ),
  ].sort(compareCodePoint);
  if (canonicalJsonV1(identities) !== canonicalJsonV1(expected))
    throw new Error("v2_workspace_dependency_closure_invalid");
  const catalog = new Map(
    plan.externalRequirementCatalog.map((item) => [
      item.requirementId,
      item.requirement,
    ]),
  );
  for (const entry of entries) {
    if (entry.dependencyType !== "external") continue;
    const expectedRequirement = catalog.get(entry.requirementId);
    if (
      !expectedRequirement ||
      canonicalJsonV1(expectedRequirement) !==
        canonicalJsonV1(entry.requirement)
    )
      throw new Error("v2_workspace_dependency_closure_invalid");
  }
  const base = deepFreeze({
    schemaVersion: V2_STAGE_DEPENDENCY_SNAPSHOT_SCHEMA_V2,
    planFingerprint: plan.planFingerprint,
    stageId,
    stageKind: stage.kind,
    entries,
    entryCount: entries.length,
    resolutionOrigin: "not_established" as const,
  });
  const fingerprint = exactString(
    value.snapshotFingerprint,
    HASH_RE,
    "v2_workspace_dependency_snapshot_invalid",
  );
  if (fingerprint !== hashCanonicalBody(snapshotBody(base)))
    throw new Error("v2_workspace_dependency_snapshot_invalid");
  const snapshot = deepFreeze({
    ...base,
    snapshotFingerprint: fingerprint,
  }) as V2StageDependencySnapshotV2;
  snapshotHandles.add(snapshot);
  snapshotMetadata.set(snapshot, Object.freeze({ plan, stageId }));
  return snapshot;
}

function capabilityBinding(
  value: unknown,
  stageKind: V2StageKind,
): V2WorkspaceCapabilityBindingV2 {
  if (!isRecord(value)) throw new Error("v2_workspace_capability_invalid");
  if (stageKind === "v2_activity_instances") {
    if (
      !exactKeys(value, ["kind", "bindingFingerprint", "resolutionOrigin"]) ||
      value.kind !== "activity_instances" ||
      value.resolutionOrigin !== "not_established"
    )
      throw new Error("v2_workspace_capability_invalid");
    return Object.freeze({
      kind: "activity_instances" as const,
      bindingFingerprint: exactString(
        value.bindingFingerprint,
        HASH_RE,
        "v2_workspace_capability_invalid",
      ),
      resolutionOrigin: "not_established" as const,
    });
  }
  if (!exactKeys(value, ["kind"]) || value.kind !== "none")
    throw new Error("v2_workspace_capability_invalid");
  return Object.freeze({ kind: "none" as const });
}

function subjectFor(plan: V2CanonicalSeasonPlanV2, stageId: string) {
  return deepFreeze({
    workspaceId: plan.workspaceId,
    jobId: plan.jobId,
    authoringRevision: plan.authoringRevision,
    seasonId: plan.seasonId,
    targetLanguage: plan.targetLanguage,
    subjectFingerprint: hashCanonicalBody({
      schemaVersion: "v2-generation-stage-subject.v2",
      planFingerprint: plan.planFingerprint,
      stageId,
      workspaceId: plan.workspaceId,
      jobId: plan.jobId,
      authoringRevision: plan.authoringRevision,
      seasonId: plan.seasonId,
      targetLanguage: plan.targetLanguage,
    }),
  });
}

function workspaceBody(
  plan: V2CanonicalSeasonPlanV2,
  stage: V2CanonicalStageNodeV2,
  snapshot: V2StageDependencySnapshotV2,
  capability: V2WorkspaceCapabilityBindingV2,
) {
  return deepFreeze({
    schemaVersion: V2_GENERATION_STAGE_WORKSPACE_SCHEMA_V2,
    planSchemaVersion: plan.schemaVersion,
    compilerVersion: plan.compilerVersion,
    coordinateSchemaVersion: plan.coordinateSchemaVersion,
    artifactModel: plan.courseContract.artifactModel,
    planFingerprint: plan.planFingerprint,
    courseContractFingerprint: plan.courseContract.courseContractFingerprint,
    subject: subjectFor(plan, stage.stageId),
    stage: Object.freeze({
      stageId: stage.stageId,
      kind: stage.kind,
      episodeId: stage.episodeId,
      locale: stage.locale,
    }),
    dependencySnapshotFingerprint: snapshot.snapshotFingerprint,
    capabilityBinding: capability,
    dependencyResolutionOrigin: "not_established" as const,
    executionAuthority: "none" as const,
    storageAuthority: "none" as const,
    publicationPolicy: "draft_only_no_consumer" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  });
}

export function materializeV2GenerationStageWorkspaceV2(input: {
  readonly plan: V2CanonicalSeasonPlanV2;
  readonly stageId: string;
  readonly dependencySnapshot: V2StageDependencySnapshotV2;
  readonly capabilityBinding: V2WorkspaceCapabilityBindingV2;
}): V2GenerationStageWorkspaceV2 {
  if (!isRecord(input) || !isV2CanonicalSeasonPlanV2(input.plan))
    throw new Error("v2_workspace_plan_untrusted");
  if (!snapshotHandles.has(input.dependencySnapshot as object))
    throw new Error("v2_workspace_dependency_snapshot_untrusted");
  const metadata = snapshotMetadata.get(input.dependencySnapshot as object);
  if (metadata?.plan !== input.plan || metadata.stageId !== input.stageId)
    throw new Error("v2_workspace_dependency_snapshot_untrusted");
  const stage = input.plan.stages.find(
    (candidate) => candidate.stageId === input.stageId,
  );
  if (!stage) throw new Error("v2_workspace_stage_invalid");
  const capability = capabilityBinding(input.capabilityBinding, stage.kind);
  const body = workspaceBody(
    input.plan,
    stage,
    input.dependencySnapshot,
    capability,
  );
  const workspace = deepFreeze({
    ...body,
    workspaceFingerprint: hashCanonicalBody(body),
  }) as V2GenerationStageWorkspaceV2;
  if (utf8ByteLengthV1(canonicalJsonV1(workspace)) > V2_WORKSPACE_MAX_BYTES_V2)
    throw new Error("v2_workspace_too_large");
  workspaceHandles.add(workspace);
  workspaceMetadata.set(
    workspace,
    Object.freeze({ plan: input.plan, snapshot: input.dependencySnapshot }),
  );
  return workspace;
}

const PROVENANCE_TYPES = new Set([
  "authoring_revision",
  "stage_artifact",
  "published_template",
  "language_profile",
  "speech_profile",
  "voice_generation_profile",
  "authoritative_source",
  "decision_registry",
  "generated_asset_receipt",
]);

function provenance(value: unknown): V2CandidateProvenanceRefV2 {
  if (
    !isRecord(value) ||
    !exactKeys(value, [
      "provenanceType",
      "provenanceId",
      "objectPath",
      "contentHash",
      "objectGeneration",
      "byteSize",
    ]) ||
    !PROVENANCE_TYPES.has(String(value.provenanceType)) ||
    !Number.isSafeInteger(value.byteSize) ||
    Number(value.byteSize) < 1 ||
    Number(value.byteSize) > 512 * 1024 * 1024
  )
    throw new Error("v2_workspace_candidate_provenance_invalid");
  return Object.freeze({
    provenanceType:
      value.provenanceType as V2CandidateProvenanceRefV2["provenanceType"],
    provenanceId: exactString(
      value.provenanceId,
      TOKEN_RE,
      "v2_workspace_candidate_provenance_invalid",
    ),
    objectPath: exactObjectPath(
      value.objectPath,
      "v2_workspace_candidate_provenance_invalid",
    ),
    contentHash: exactString(
      value.contentHash,
      HASH_RE,
      "v2_workspace_candidate_provenance_invalid",
    ),
    objectGeneration: exactString(
      value.objectGeneration,
      GENERATION_RE,
      "v2_workspace_candidate_provenance_invalid",
    ),
    byteSize: Number(value.byteSize),
  });
}

function provenanceIdentity(value: V2CandidateProvenanceRefV2): string {
  return canonicalJsonV1([
    value.provenanceType,
    value.provenanceId,
    value.objectPath,
    value.objectGeneration,
  ]);
}

function candidateBody(
  value: Omit<V2CanonicalStageCandidateV2, "candidateFingerprint">,
) {
  return value;
}

export function parseV2CanonicalStageCandidateV2(
  workspace: V2GenerationStageWorkspaceV2,
  raw: string,
): V2CanonicalStageCandidateV2 {
  if (!workspaceHandles.has(workspace as object))
    throw new Error("v2_workspace_untrusted");
  const { value, bytes } = parseCanonicalRoot(
    raw,
    V2_STAGE_CANDIDATE_MAX_BYTES_V2,
    "v2_workspace_candidate_invalid",
  );
  if (
    !exactKeys(value, [
      "schemaVersion",
      "workspaceFingerprint",
      "planFingerprint",
      "stageId",
      "stageKind",
      "subjectFingerprint",
      "bodySchemaVersion",
      "body",
      "bodyFingerprint",
      "dependencySnapshotFingerprint",
      "capabilityBindingFingerprint",
      "contentClass",
      "provenanceRefs",
      "provenanceFingerprint",
      "producerFingerprint",
      "configurationFingerprint",
      "candidateBytesOrigin",
      "candidateOriginAuthenticity",
      "contentTrackAuthority",
      "artifactStorageAuthority",
      "repositoryAuthority",
      "humanReviewAuthority",
      "specialistEvidenceAuthority",
      "deviceEvidenceAuthority",
      "listeningEvidenceAuthority",
      "executionAuthority",
      "publicationPolicy",
      "runtimeConsumer",
      "releaseEligible",
      "releaseAuthority",
      "candidateFingerprint",
    ]) ||
    value.schemaVersion !== V2_CANONICAL_STAGE_CANDIDATE_SCHEMA_V2 ||
    value.workspaceFingerprint !== workspace.workspaceFingerprint ||
    value.planFingerprint !== workspace.planFingerprint ||
    value.stageId !== workspace.stage.stageId ||
    value.stageKind !== workspace.stage.kind ||
    value.subjectFingerprint !== workspace.subject.subjectFingerprint ||
    value.dependencySnapshotFingerprint !==
      workspace.dependencySnapshotFingerprint ||
    value.candidateBytesOrigin !== "caller_supplied_canonical_bytes" ||
    value.candidateOriginAuthenticity !== "not_established" ||
    value.contentTrackAuthority !== "unverified_candidate_claim" ||
    value.artifactStorageAuthority !== "none" ||
    value.repositoryAuthority !== "none" ||
    value.humanReviewAuthority !== "none" ||
    value.specialistEvidenceAuthority !== "none" ||
    value.deviceEvidenceAuthority !== "none" ||
    value.listeningEvidenceAuthority !== "none" ||
    value.executionAuthority !== "none" ||
    value.publicationPolicy !== "draft_only_no_consumer" ||
    value.runtimeConsumer !== false ||
    value.releaseEligible !== false ||
    value.releaseAuthority !== false ||
    (value.contentClass !== "production_candidate" &&
      value.contentClass !== "test_only" &&
      value.contentClass !== "demo_content") ||
    !Array.isArray(value.provenanceRefs) ||
    value.provenanceRefs.length < 1 ||
    value.provenanceRefs.length > 128
  )
    throw new Error("v2_workspace_candidate_invalid");
  const expectedCapabilityFingerprint =
    workspace.capabilityBinding.kind === "activity_instances"
      ? workspace.capabilityBinding.bindingFingerprint
      : null;
  if (value.capabilityBindingFingerprint !== expectedCapabilityFingerprint)
    throw new Error("v2_workspace_candidate_invalid");
  const provenanceRefs = Object.freeze(value.provenanceRefs.map(provenance));
  const identities = provenanceRefs.map(provenanceIdentity);
  if (
    new Set(identities).size !== identities.length ||
    identities.some(
      (identity, index) =>
        index > 0 && compareCodePoint(identities[index - 1], identity) >= 0,
    )
  )
    throw new Error("v2_workspace_candidate_provenance_invalid");
  const bodySchemaVersion = exactString(
    value.bodySchemaVersion,
    TOKEN_RE,
    "v2_workspace_candidate_invalid",
  );
  const bodyFingerprint = exactString(
    value.bodyFingerprint,
    HASH_RE,
    "v2_workspace_candidate_invalid",
  );
  if (bodyFingerprint !== hashCanonicalBody(value.body))
    throw new Error("v2_workspace_candidate_invalid");
  const provenanceFingerprint = exactString(
    value.provenanceFingerprint,
    HASH_RE,
    "v2_workspace_candidate_invalid",
  );
  if (
    provenanceFingerprint !==
    hashCanonicalBody({
      schemaVersion: "v2-stage-artifact-provenance.v2",
      provenanceRefs,
    })
  )
    throw new Error("v2_workspace_candidate_invalid");
  const base = deepFreeze({
    schemaVersion: V2_CANONICAL_STAGE_CANDIDATE_SCHEMA_V2,
    workspaceFingerprint: workspace.workspaceFingerprint,
    planFingerprint: workspace.planFingerprint,
    stageId: workspace.stage.stageId,
    stageKind: workspace.stage.kind,
    subjectFingerprint: workspace.subject.subjectFingerprint,
    bodySchemaVersion,
    body: value.body,
    bodyFingerprint,
    dependencySnapshotFingerprint: workspace.dependencySnapshotFingerprint,
    capabilityBindingFingerprint: expectedCapabilityFingerprint,
    contentClass: value.contentClass as
      | "production_candidate"
      | "test_only"
      | "demo_content",
    provenanceRefs,
    provenanceFingerprint,
    producerFingerprint: exactString(
      value.producerFingerprint,
      HASH_RE,
      "v2_workspace_candidate_invalid",
    ),
    configurationFingerprint: exactString(
      value.configurationFingerprint,
      HASH_RE,
      "v2_workspace_candidate_invalid",
    ),
    candidateBytesOrigin: "caller_supplied_canonical_bytes" as const,
    candidateOriginAuthenticity: "not_established" as const,
    contentTrackAuthority: "unverified_candidate_claim" as const,
    artifactStorageAuthority: "none" as const,
    repositoryAuthority: "none" as const,
    humanReviewAuthority: "none" as const,
    specialistEvidenceAuthority: "none" as const,
    deviceEvidenceAuthority: "none" as const,
    listeningEvidenceAuthority: "none" as const,
    executionAuthority: "none" as const,
    publicationPolicy: "draft_only_no_consumer" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  });
  const candidateFingerprint = exactString(
    value.candidateFingerprint,
    HASH_RE,
    "v2_workspace_candidate_invalid",
  );
  if (
    candidateFingerprint !==
    hashCanonicalBody({
      schemaVersion: "v2-stage-artifact-candidate-fingerprint.v2",
      candidate: candidateBody(base),
    })
  )
    throw new Error("v2_workspace_candidate_invalid");
  const candidate = deepFreeze({
    ...base,
    candidateFingerprint,
  }) as V2CanonicalStageCandidateV2;
  candidateHandles.add(candidate);
  candidateMetadata.set(
    candidate,
    Object.freeze({ rawHash: sha256Utf8(raw), rawBytes: bytes }),
  );
  return candidate;
}

const CHECKED_RULE_CODES = Object.freeze([
  "canonical_candidate_bytes",
  "capability_binding_shape",
  "dependency_snapshot_shape",
  "plan_stage_subject_binding",
  "validator_registry",
]);
const BASE_BLOCKING_ISSUE_CODES = Object.freeze([
  "v2_candidate_origin_authenticity_not_established",
  "v2_repository_origin_authenticity_not_established",
]);
const VALIDATOR_NOT_INSTALLED_BLOCKING_ISSUE_CODE =
  "v2_stage_validator_not_installed" as const;
const NONPRODUCTION_BLOCKING_ISSUE_CODE =
  "v2_stage_nonproduction_content_forbidden" as const;
const READER_RULES_FINGERPRINT = hashCanonicalBody({
  schemaVersion: "v2-structural-stage-reader-rules.v2",
  dependencySnapshotSchema: V2_STAGE_DEPENDENCY_SNAPSHOT_SCHEMA_V2,
  workspaceSchema: V2_GENERATION_STAGE_WORKSPACE_SCHEMA_V2,
  candidateSchema: V2_CANONICAL_STAGE_CANDIDATE_SCHEMA_V2,
  registry: V2_STAGE_VALIDATOR_REGISTRY_V2,
  checkedRuleCodes: CHECKED_RULE_CODES,
  blockingIssueCodes: Object.freeze([
    ...BASE_BLOCKING_ISSUE_CODES,
    VALIDATOR_NOT_INSTALLED_BLOCKING_ISSUE_CODE,
    NONPRODUCTION_BLOCKING_ISSUE_CODE,
  ]),
});

export function materializeBlockedV2StructuralStageReceiptV2(input: {
  readonly workspace: V2GenerationStageWorkspaceV2;
  readonly candidate: V2CanonicalStageCandidateV2;
  readonly repositoryCapabilityBinding: V2ActivityRepositoryCapabilityBindingV1 | null;
  readonly artifactRefRaw: string;
}): V2BlockedStructuralStageReceiptV2 {
  if (
    !isRecord(input) ||
    !workspaceHandles.has(input.workspace as object) ||
    !candidateHandles.has(input.candidate as object)
  )
    throw new Error("v2_workspace_receipt_input_untrusted");
  const metadata = candidateMetadata.get(input.candidate as object);
  const parsedRef = parseCanonicalRoot(
    input.artifactRefRaw,
    8 * 1024,
    "v2_workspace_receipt_artifact_invalid",
  ).value;
  const artifactRef = objectRef(
    parsedRef,
    "v2_workspace_receipt_artifact_invalid",
  );
  const workspacePlan = workspaceMetadata.get(input.workspace as object)?.plan;
  const activityBinding = input.workspace.capabilityBinding;
  const binding = input.repositoryCapabilityBinding;
  const snapshot = workspaceMetadata.get(input.workspace as object)?.snapshot;
  const externalSnapshotEntries = snapshot?.entries.filter(
    (entry) => entry.dependencyType === "external",
  );
  const bindingValid =
    activityBinding.kind === "activity_instances"
      ? isV2ActivityRepositoryCapabilityBindingV1(binding) &&
        binding.planFingerprint === input.workspace.planFingerprint &&
        binding.courseContractFingerprint ===
          input.workspace.courseContractFingerprint &&
        binding.stageId === input.workspace.stage.stageId &&
        binding.episodeId === input.workspace.stage.episodeId &&
        binding.bindingFingerprint === activityBinding.bindingFingerprint &&
        workspacePlan !== undefined &&
        canonicalJsonV1(externalSnapshotEntries) ===
          canonicalJsonV1(
            binding.templateBindings.map((template) => ({
              dependencyType: "external" as const,
              requirementId: template.requirementId,
              requirement: template.requirement,
              artifactRef: template.artifactRef,
              lifecycleFingerprint: template.lifecycleFingerprint,
            })),
          )
      : binding === null;
  if (
    !metadata ||
    !bindingValid ||
    input.candidate.workspaceFingerprint !==
      input.workspace.workspaceFingerprint ||
    artifactRef.contentHash !== metadata.rawHash ||
    artifactRef.byteSize !== metadata.rawBytes ||
    artifactRef.objectPath !==
      `learning-v2/v2-candidates/${input.candidate.stageId}.json` ||
    artifactRef.objectGeneration !== "unpersisted"
  )
    throw new Error("v2_workspace_receipt_artifact_invalid");
  const blockingIssueCodes = Object.freeze(
    [
      ...BASE_BLOCKING_ISSUE_CODES,
      ...(V2_STAGE_VALIDATOR_REGISTRY_V2[input.workspace.stage.kind].state ===
      "installed"
        ? []
        : [VALIDATOR_NOT_INSTALLED_BLOCKING_ISSUE_CODE]),
      ...(input.candidate.contentClass === "production_candidate"
        ? []
        : [NONPRODUCTION_BLOCKING_ISSUE_CODE]),
    ].sort(compareCodePoint),
  );
  const base = deepFreeze({
    schemaVersion: V2_STRUCTURAL_STAGE_RECEIPT_SCHEMA_V2,
    readerProfile: Object.freeze({
      id: "learning-v2-structural-stage-reader-v2" as const,
      version: 1 as const,
      rulesFingerprint: READER_RULES_FINGERPRINT,
    }),
    workspaceFingerprint: input.workspace.workspaceFingerprint,
    planFingerprint: input.workspace.planFingerprint,
    stageId: input.workspace.stage.stageId,
    stageKind: input.workspace.stage.kind,
    subjectFingerprint: input.workspace.subject.subjectFingerprint,
    candidateFingerprint: input.candidate.candidateFingerprint,
    bodySchemaVersion: input.candidate.bodySchemaVersion,
    bodyFingerprint: input.candidate.bodyFingerprint,
    dependencySnapshotFingerprint:
      input.workspace.dependencySnapshotFingerprint,
    capabilityBindingFingerprint: input.candidate.capabilityBindingFingerprint,
    repositoryObservationFingerprint:
      binding?.repositoryObservationFingerprint ?? null,
    artifactRef,
    checkedRuleCodes: CHECKED_RULE_CODES,
    blockingIssueCodes,
    outcome: "blocked" as const,
    candidateClassification: "structural_candidate_only" as const,
    machineValidationAuthority: "structural_checks_only" as const,
    humanReviewState: "not_evaluated" as const,
    humanApprovalAuthority: "none" as const,
    sourceEvidenceAuthority: "unverified_canonical_bytes" as const,
    externalDependencyAuthority: "unverified_injected_readback" as const,
    readerEvidenceOrigin: "not_established" as const,
    evidenceAuthority: "structural_snapshot_only" as const,
    dependencyResolutionAuthority: "none" as const,
    humanReviewAuthority: "none" as const,
    specialistEvidenceAuthority: "none" as const,
    deviceEvidenceAuthority: "none" as const,
    listeningEvidenceAuthority: "none" as const,
    executionAuthority: "none" as const,
    artifactStorageAuthority: "none" as const,
    publicationPolicy: "draft_only_no_consumer" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  });
  const receipt = deepFreeze({
    ...base,
    receiptFingerprint: hashCanonicalBody(base),
  }) as V2BlockedStructuralStageReceiptV2;
  receiptHandles.add(receipt);
  return receipt;
}

export const isV2StageDependencySnapshotV2 = (
  value: unknown,
): value is V2StageDependencySnapshotV2 =>
  typeof value === "object" && value !== null && snapshotHandles.has(value);

export const isV2GenerationStageWorkspaceV2 = (
  value: unknown,
): value is V2GenerationStageWorkspaceV2 =>
  typeof value === "object" && value !== null && workspaceHandles.has(value);

export const isV2CanonicalStageCandidateV2 = (
  value: unknown,
): value is V2CanonicalStageCandidateV2 =>
  typeof value === "object" && value !== null && candidateHandles.has(value);

export const isV2BlockedStructuralStageReceiptV2 = (
  value: unknown,
): value is V2BlockedStructuralStageReceiptV2 =>
  typeof value === "object" && value !== null && receiptHandles.has(value);
