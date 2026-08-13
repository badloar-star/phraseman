import { createHash } from "node:crypto";
import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";
import type { LearningV2ActivitySessionIntroProjectionV1 } from "../../../modules/learning-v2/runtime/activity_session_intro_projection_v1";
import {
  buildV2CanonicalSeasonPlanV2,
  isV2CanonicalSeasonPlanV2,
  parseV2CanonicalPlanRequestV2,
  type V2CanonicalSeasonPlanV2,
} from "./v2_canonical_generation_plan_v2";
import { createV2FirebaseAdminRepositoryIoV1 } from "./v2_firebase_admin_repository_io_v1";
import {
  V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
  type V2RepositoryImmutableStoragePortV1,
} from "./v2_firebase_repository_persistence_v1";
import {
  parseV2OwnerAuthoredEpisodeInputV2,
  V2_OWNER_AUTHORED_EPISODE_INPUT_MAX_BYTES_V2,
  V2_OWNER_AUTHORED_EPISODE_INPUT_SCHEMA_V2,
} from "./v2_owner_authored_episode_input_v2";
import {
  V2_OWNER_EPISODE_CONFIRMATION_MAX_BYTES_V1,
  parseV2OwnerEpisodeConfirmationV1,
} from "./v2_owner_episode_confirmation_v1";
import {
  projectV2OwnerEpisodeSessionIntrosV1,
  type V2OwnerEpisodeIntroProjectionSetV1,
} from "./v2_owner_episode_intro_projection_v1";
import {
  V2_OWNER_EPISODE_STAGE_COLLECTION_V1,
  V2_OWNER_EPISODE_STAGE_SCHEMA_V2,
} from "./v2_owner_episode_stage_repository_v1";

export const V2_FIREBASE_CONFIRMED_OWNER_EPISODE_INTRO_SUMMARY_SCHEMA_V1 =
  "v2-firebase-confirmed-owner-episode-intro-summary.v1" as const;

export interface V2FirebaseConfirmedOwnerEpisodeIntroHandleV1 {
  readonly __brand: "V2FirebaseConfirmedOwnerEpisodeIntroHandleV1";
}

export interface V2FirebaseConfirmedOwnerEpisodeIntroSummaryV1 {
  readonly schemaVersion: typeof V2_FIREBASE_CONFIRMED_OWNER_EPISODE_INTRO_SUMMARY_SCHEMA_V1;
  readonly planFingerprint: string;
  readonly courseContractFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly ownerInputFingerprint: string;
  readonly introAggregateFingerprint: string;
  readonly projectionSetFingerprint: string;
  readonly ownerConfirmationFingerprint: string;
  readonly sessionCount: 12;
  readonly questionCount: 36;
  readonly repositoryReadbackAuthority: "firebase_admin_exact_stage_and_immutable_object_readback";
  readonly ownerConfirmationAuthority: "single_owner_exact_confirmation_readback_only";
  readonly learnerProjectionAuthority: "exact_confirmed_owner_input_allowlist_projection";
  readonly languageAccuracyAuthority: "none";
  readonly curriculumAuthority: "none";
  readonly publicationAuthority: "none";
  readonly runtimeAuthority: "none_release_readback_required";
  readonly releaseAuthority: false;
  readonly summaryFingerprint: string;
}

export interface V2FirebaseConfirmedOwnerEpisodeIntroMaterialV1 {
  readonly summary: V2FirebaseConfirmedOwnerEpisodeIntroSummaryV1;
  readonly projectionSet: V2OwnerEpisodeIntroProjectionSetV1;
  readonly projections: readonly LearningV2ActivitySessionIntroProjectionV1[];
  readonly projectionRaws: readonly string[];
}

export interface V2FirebaseConfirmedOwnerEpisodeIntroAdapterV1 {
  load(input: {
    readonly plan: V2CanonicalSeasonPlanV2;
    readonly stageId: string;
  }): Promise<V2FirebaseConfirmedOwnerEpisodeIntroHandleV1>;
}

const HASH_RE = /^[a-f0-9]{64}$/u;
const STAGE_ID_RE = /^[A-Za-z0-9._:-]{1,500}$/u;
const handles = new WeakSet<object>();
const materials = new WeakMap<
  object,
  V2FirebaseConfirmedOwnerEpisodeIntroMaterialV1
>();
const decoder = new TextDecoder("utf-8", { fatal: true });

function fail(): never {
  throw new Error("v2_firebase_confirmed_owner_episode_intro_invalid");
}

function record(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function stringField(value: Record<string, unknown>, key: string): string {
  const found = value[key];
  if (typeof found !== "string" || found.length < 1) fail();
  return found;
}

function hashField(value: Record<string, unknown>, key: string): string {
  const found = stringField(value, key);
  if (!HASH_RE.test(found)) fail();
  return found;
}

function byteSizeField(
  value: Record<string, unknown>,
  key: string,
  maximum: number,
): number {
  const found = value[key];
  if (
    typeof found !== "number" ||
    !Number.isSafeInteger(found) ||
    found < 2 ||
    found > maximum
  )
    fail();
  return found;
}

async function readPinnedRaw(input: {
  readonly storage: V2RepositoryImmutableStoragePortV1;
  readonly objectPath: string;
  readonly objectGeneration: string;
  readonly contentHash: string;
  readonly byteSize: number;
  readonly maximumBytes: number;
}): Promise<string> {
  const metadata = await input.storage.readMetadataExact(input.objectPath);
  if (
    !metadata ||
    metadata.generation !== input.objectGeneration ||
    metadata.contentHash !== input.contentHash ||
    metadata.byteSize !== input.byteSize ||
    metadata.contentType !== V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1
  )
    fail();
  const downloaded = await input.storage.downloadGenerationExact({
    objectPath: input.objectPath,
    ifGenerationMatch: input.objectGeneration,
    maximumBytes: input.maximumBytes,
  });
  if (
    downloaded.kind !== "downloaded" ||
    downloaded.bytes.byteLength !== input.byteSize ||
    createHash("sha256").update(downloaded.bytes).digest("hex") !==
      input.contentHash
  )
    fail();
  try {
    return decoder.decode(downloaded.bytes);
  } catch {
    fail();
  }
}

export function createFirebaseAdminV2ConfirmedOwnerEpisodeIntroAdapterV1(): V2FirebaseConfirmedOwnerEpisodeIntroAdapterV1 {
  const io = createV2FirebaseAdminRepositoryIoV1();
  return Object.freeze({
    async load(
      input: Parameters<
        V2FirebaseConfirmedOwnerEpisodeIntroAdapterV1["load"]
      >[0],
    ) {
      if (
        !record(input) ||
        Object.keys(input).sort().join("|") !== "plan|stageId" ||
        !isV2CanonicalSeasonPlanV2(input.plan) ||
        typeof input.stageId !== "string" ||
        !STAGE_ID_RE.test(input.stageId)
      )
        fail();
      const stageRead = await io.readCanonicalDocumentExact({
        documentPath: `${V2_OWNER_EPISODE_STAGE_COLLECTION_V1}/${input.stageId}`,
        maximumBytes: 128 * 1024,
      });
      let stage: unknown;
      try {
        stage = JSON.parse(stageRead.canonicalRaw);
      } catch {
        fail();
      }
      if (
        !record(stage) ||
        stage.schemaVersion !== V2_OWNER_EPISODE_STAGE_SCHEMA_V2 ||
        stage.state !== "owner_confirmed" ||
        stage.kind !== "v2_activity_instances" ||
        stage.contentClass !== "production_candidate" ||
        stage.ownerInputSchemaVersion !==
          V2_OWNER_AUTHORED_EPISODE_INPUT_SCHEMA_V2 ||
        stage.introCount !== 12 ||
        stage.introQuestionCount !== 36 ||
        stage.humanApprovalAuthority !==
          "single_owner_exact_confirmation_only" ||
        stage.planFingerprint !== input.plan.planFingerprint ||
        stage.courseContractFingerprint !==
          input.plan.courseContract.courseContractFingerprint
      )
        fail();
      const expectedStage = input.plan.stages.find(
        (candidate) => candidate.stageId === input.stageId,
      );
      if (
        !expectedStage ||
        expectedStage.kind !== "v2_activity_instances" ||
        expectedStage.episodeId !== stage.scopeId
      )
        fail();
      const planRaw = await readPinnedRaw({
        storage: io.storage,
        objectPath: stringField(stage, "planRequestObjectPath"),
        objectGeneration: stringField(stage, "planRequestObjectGeneration"),
        contentHash: hashField(stage, "planRequestRawHash"),
        byteSize: byteSizeField(stage, "planRequestByteSize", 1024 * 1024),
        maximumBytes: 1024 * 1024,
      });
      const rebuiltPlan = buildV2CanonicalSeasonPlanV2(
        parseV2CanonicalPlanRequestV2(planRaw),
      );
      if (
        rebuiltPlan.planFingerprint !== input.plan.planFingerprint ||
        rebuiltPlan.courseContract.courseContractFingerprint !==
          input.plan.courseContract.courseContractFingerprint
      )
        fail();
      const ownerInputRaw = await readPinnedRaw({
        storage: io.storage,
        objectPath: stringField(stage, "objectPath"),
        objectGeneration: stringField(stage, "objectGeneration"),
        contentHash: hashField(stage, "contentHash"),
        byteSize: byteSizeField(
          stage,
          "byteSize",
          V2_OWNER_AUTHORED_EPISODE_INPUT_MAX_BYTES_V2,
        ),
        maximumBytes: V2_OWNER_AUTHORED_EPISODE_INPUT_MAX_BYTES_V2,
      });
      const ownerHandle = parseV2OwnerAuthoredEpisodeInputV2(
        ownerInputRaw,
        input.plan,
        input.stageId,
      );
      const projectionSet = projectV2OwnerEpisodeSessionIntrosV1(ownerHandle);
      if (
        projectionSet.ownerInputFingerprint !==
          hashField(stage, "ownerInputFingerprint") ||
        projectionSet.introAggregateFingerprint !==
          hashField(stage, "introAggregateFingerprint") ||
        projectionSet.episodeId !== stage.scopeId
      )
        fail();
      const confirmationPin = stage.ownerConfirmationPin;
      if (
        !record(confirmationPin) ||
        Object.keys(confirmationPin).sort().join("|") !==
          "byteSize|contentHash|contentType|objectGeneration|objectPath" ||
        confirmationPin.contentType !==
          V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1
      )
        fail();
      const confirmationRaw = await readPinnedRaw({
        storage: io.storage,
        objectPath: stringField(confirmationPin, "objectPath"),
        objectGeneration: stringField(confirmationPin, "objectGeneration"),
        contentHash: hashField(confirmationPin, "contentHash"),
        byteSize: byteSizeField(
          confirmationPin,
          "byteSize",
          V2_OWNER_EPISODE_CONFIRMATION_MAX_BYTES_V1,
        ),
        maximumBytes: V2_OWNER_EPISODE_CONFIRMATION_MAX_BYTES_V1,
      });
      let confirmationClaim: unknown;
      try {
        confirmationClaim = JSON.parse(confirmationRaw);
      } catch {
        fail();
      }
      if (!record(confirmationClaim)) fail();
      const confirmation = parseV2OwnerEpisodeConfirmationV1(confirmationRaw, {
        planFingerprint: input.plan.planFingerprint,
        courseContractFingerprint:
          input.plan.courseContract.courseContractFingerprint,
        stageId: input.stageId,
        episodeId: stringField(stage, "scopeId"),
        ownerInputFingerprint: projectionSet.ownerInputFingerprint,
        activityAssemblyFingerprint: hashField(
          stage,
          "activityAssemblyFingerprint",
        ),
        stageReviewFingerprint: hashField(
          confirmationClaim,
          "stageReviewFingerprint",
        ),
        ownerIdentityFingerprint: hashField(
          confirmationClaim,
          "ownerIdentityFingerprint",
        ),
        confirmedAtIso: stringField(confirmationClaim, "confirmedAtIso"),
        reason: stringField(confirmationClaim, "reason"),
        contentClass: "production_candidate",
      });
      if (
        confirmation.confirmationFingerprint !==
        hashField(stage, "ownerConfirmationFingerprint")
      )
        fail();
      const summaryBody = Object.freeze({
        schemaVersion:
          V2_FIREBASE_CONFIRMED_OWNER_EPISODE_INTRO_SUMMARY_SCHEMA_V1,
        planFingerprint: input.plan.planFingerprint,
        courseContractFingerprint:
          input.plan.courseContract.courseContractFingerprint,
        stageId: input.stageId,
        episodeId: projectionSet.episodeId,
        ownerInputFingerprint: projectionSet.ownerInputFingerprint,
        introAggregateFingerprint: projectionSet.introAggregateFingerprint,
        projectionSetFingerprint: projectionSet.projectionSetFingerprint,
        ownerConfirmationFingerprint: confirmation.confirmationFingerprint,
        sessionCount: 12 as const,
        questionCount: 36 as const,
        repositoryReadbackAuthority:
          "firebase_admin_exact_stage_and_immutable_object_readback" as const,
        ownerConfirmationAuthority:
          "single_owner_exact_confirmation_readback_only" as const,
        learnerProjectionAuthority:
          "exact_confirmed_owner_input_allowlist_projection" as const,
        languageAccuracyAuthority: "none" as const,
        curriculumAuthority: "none" as const,
        publicationAuthority: "none" as const,
        runtimeAuthority: "none_release_readback_required" as const,
        releaseAuthority: false as const,
      });
      const summary = Object.freeze({
        ...summaryBody,
        summaryFingerprint: hashCanonicalBody(summaryBody),
      });
      const handle = Object.freeze({
        __brand: "V2FirebaseConfirmedOwnerEpisodeIntroHandleV1" as const,
      });
      handles.add(handle);
      materials.set(
        handle,
        Object.freeze({
          summary,
          projectionSet,
          projections: projectionSet.projections,
          projectionRaws: projectionSet.projectionRaws,
        }),
      );
      return handle;
    },
  });
}

export function isV2FirebaseConfirmedOwnerEpisodeIntroHandleV1(
  value: unknown,
): value is V2FirebaseConfirmedOwnerEpisodeIntroHandleV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}

export function getV2FirebaseConfirmedOwnerEpisodeIntroSummaryV1(
  handle: V2FirebaseConfirmedOwnerEpisodeIntroHandleV1,
): V2FirebaseConfirmedOwnerEpisodeIntroSummaryV1 {
  const material = materials.get(handle);
  if (!material) fail();
  return material.summary;
}

export function resolveV2FirebaseConfirmedOwnerEpisodeIntroMaterialV1(
  handle: V2FirebaseConfirmedOwnerEpisodeIntroHandleV1,
): V2FirebaseConfirmedOwnerEpisodeIntroMaterialV1 {
  const material = materials.get(handle);
  if (!material) fail();
  return material;
}
