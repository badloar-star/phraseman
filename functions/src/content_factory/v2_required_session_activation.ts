// зачем: V2 pointer становится видимым только после того, как все immutable
// required-session publications этого release записаны и exact-readback
// подтверждён. Legacy content_factory_catalog не является этим authority.
import type { Firestore } from "firebase-admin/firestore";
import { detachBoundedWalletJson } from "../../../modules/learning-v2/contracts/wallet";
import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";
import {
  assertV2SeasonReleaseManifestBody,
  assertV2SeasonReleasePointer,
  resolveV2ReleaseManifest,
  v2ManifestHash,
  type V2ReleaseEnvironment,
  type V2SeasonReleaseManifestBody,
  type V2SeasonReleaseManifestRecord,
  type V2SeasonReleasePointer,
} from "./v2_release_adapter";
import {
  publishRequiredSessionSetFromApprovedRelease,
  createFirestoreRequiredSessionPublicationStore,
  createFirestoreRequiredSessionAnswerManifestStore,
  type PublishRequiredSessionSetInput,
  type RequiredSessionPublicationDependencies,
} from "./v2_required_session_publication";
import type { V2CompiledEpisodeArtifact } from "./v2_content_compilation";
import {
  createFirestoreEpisodeRevisionResolver,
  createFirestoreModeTemplateResolver,
} from "../content_studio/firestore_authoring_store";
import {
  resolveImmutableSeasonRevision,
} from "../content_studio/season_revision_resolver";
import {
  readImmutableCanonicalObject,
  type ImmutableObjectFile,
} from "../content_studio/immutable_object_reader";

const SAFE_ID = /^[A-Za-z0-9._:-]{1,160}$/;

export const v2SeasonReleasePointerId = (
  environment: V2ReleaseEnvironment,
  studyTarget: string,
  learnerSourceLocale: string,
  seasonId: string,
): string => {
  const id = `${environment}:${studyTarget}:${learnerSourceLocale}:${seasonId}`;
  if (!SAFE_ID.test(id)) throw new Error("v2_required_session_activation_invalid");
  return id;
};

export const v2SeasonReleasePointerDocumentId = (pointerId: string): string => {
  if (!SAFE_ID.test(pointerId)) throw new Error("v2_required_session_activation_invalid");
  return `v2srp_${hashCanonicalBody({
    schemaVersion: "v2-season-release-pointer-document-key.v1",
    pointerId,
  })}`;
};

export const v2SeasonReleaseManifestDocumentId = (releaseId: string): string => {
  if (!SAFE_ID.test(releaseId)) throw new Error("v2_required_session_activation_invalid");
  return `v2srm_${hashCanonicalBody({
    schemaVersion: "v2-season-release-manifest-document-key.v1",
    releaseId,
  })}`;
};

const detach = (value: unknown): unknown =>
  detachBoundedWalletJson(value, "v2_required_session_activation_invalid");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (
  value: unknown,
  required: readonly string[],
  optional: readonly string[] = [],
): value is Record<string, unknown> => {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  return required.every((key) => Object.prototype.hasOwnProperty.call(value, key)) &&
    keys.every((key) => required.includes(key) || optional.includes(key));
};

const POINTER_KEYS = [
  "schemaVersion", "pointerId", "environment", "studyTarget",
  "learnerSourceLocale", "seasonId", "activeReleaseId", "activeManifestHash",
  "rollout", "expectedCatalogRevision", "updatedBy", "updatedAt",
] as const;
const ROLLOUT_KEYS = [
  "revision", "state", "percent", "cohortSaltVersion",
  "allowlistCohortIds", "excludeCohortIds",
] as const;
const MANIFEST_KEYS = [
  "schemaVersion", "releaseId", "courseReleaseId", "seasonId",
  "seasonRevision", "seasonContentHash", "studyTarget", "learnerSourceLocale",
  "releaseScope", "decisionRegistryRef", "supportManifestRefs",
  "voiceNetworkEgressRefs", "lessonUnits",
] as const;
const RECORD_KEYS = [
  "schemaVersion", "releaseId", "seasonId", "manifestHash", "object", "createdAt",
] as const;
const OBJECT_REF_KEYS = ["path", "generation", "contentHash", "byteSize"] as const;
const VERSION_REF_KEYS = ["id", "version", "contentHash"] as const;
const SUPPORT_REF_KEYS = [
  "platform", "environment", "minAppVersion", "manifestId", "contentHash",
] as const;

const assertExactManifestShape = (
  recordValue: unknown,
  bodyValue: unknown,
): { readonly record: unknown; readonly body: unknown } => {
  const record = detach(recordValue);
  const body = detach(bodyValue);
  if (
    !exactKeys(record, RECORD_KEYS) ||
    !exactKeys(record.object, OBJECT_REF_KEYS) ||
    !exactKeys(body, MANIFEST_KEYS) ||
    !exactKeys(body.decisionRegistryRef, VERSION_REF_KEYS) ||
    !Array.isArray(body.supportManifestRefs) ||
    body.supportManifestRefs.some((ref) => !exactKeys(ref, SUPPORT_REF_KEYS)) ||
    !Array.isArray(body.voiceNetworkEgressRefs) ||
    body.voiceNetworkEgressRefs.some((ref) => !exactKeys(ref, VERSION_REF_KEYS)) ||
    !Array.isArray(body.lessonUnits) ||
    body.lessonUnits.some((unit) =>
      !exactKeys(unit, ["episodeId", "lessonId", "object"]) ||
      !exactKeys(unit.object, OBJECT_REF_KEYS),
    )
  ) throw new Error("v2_required_session_activation_invalid");
  return { record, body };
};

const parsePointer = (
  value: unknown,
  environment: V2ReleaseEnvironment,
): V2SeasonReleasePointer => {
  try {
    const stable = detach(value);
    if (
      !exactKeys(stable, POINTER_KEYS, ["previousReleaseId"]) ||
      !exactKeys(stable.rollout, ROLLOUT_KEYS, ["healthReceiptHash", "pauseReason"])
    ) throw new Error("v2_required_session_activation_invalid");
    return assertV2SeasonReleasePointer(stable, environment);
  } catch {
    throw new Error("v2_required_session_activation_invalid");
  }
};

const exactPointer = (left: unknown, right: unknown): boolean => {
  try {
    return hashCanonicalBody(detach(left)) === hashCanonicalBody(detach(right));
  } catch {
    return false;
  }
};

export interface V2SeasonReleasePointerStore {
  read(pointerId: string): Promise<unknown | undefined>;
  compareAndSet(
    pointerId: string,
    expected: V2SeasonReleasePointer | undefined,
    next: V2SeasonReleasePointer,
  ): Promise<"committed" | "conflict">;
}

export interface V2SeasonReleaseManifestStore {
  resolve(releaseId: string): Promise<{
    readonly record: V2SeasonReleaseManifestRecord;
    readonly body: V2SeasonReleaseManifestBody;
  }>;
}

export interface ActivateRequiredSessionReleaseInput
  extends Omit<PublishRequiredSessionSetInput, "activePointer" | "episodeId"> {
  readonly nextPointer: unknown;
  readonly expectedCurrentRolloutRevision: number;
  readonly expectedCurrentReleaseId: string | null;
}

export interface RequiredSessionActivationDependencies
  extends RequiredSessionPublicationDependencies {
  readonly pointerStore: V2SeasonReleasePointerStore;
  readonly courseCatalog: {
    read(studyTarget: string, learnerSourceLocale: string): Promise<{
      readonly revision: number;
      readonly activeReleaseId: string;
    }>;
  };
  /** Test seam. Production always uses the strict release-pinned publisher. */
  readonly publishSessionSet?: typeof publishRequiredSessionSetFromApprovedRelease;
}

export interface StoredRequiredSessionActivationDependencies
  extends RequiredSessionActivationDependencies {
  readonly manifestStore: V2SeasonReleaseManifestStore;
}

const assertActivationTransition = (
  next: V2SeasonReleasePointer,
  current: V2SeasonReleasePointer | undefined,
  input: ActivateRequiredSessionReleaseInput,
): void => {
  if (
    next.pointerId !== v2SeasonReleasePointerId(
      next.environment,
      next.studyTarget,
      next.learnerSourceLocale,
      next.seasonId,
    ) ||
    next.rollout.state !== "internal" ||
    next.rollout.percent !== 0 ||
    input.expectedCurrentRolloutRevision !== (current?.rollout.revision ?? 0) ||
    input.expectedCurrentReleaseId !== (current?.activeReleaseId ?? null)
  ) throw new Error("v2_required_session_activation_conflict");

  if (!current) {
    if (next.rollout.revision !== 1 || next.previousReleaseId !== undefined) {
      throw new Error("v2_required_session_activation_invalid");
    }
    return;
  }
  if (
    current.pointerId !== next.pointerId ||
    current.environment !== next.environment ||
    current.studyTarget !== next.studyTarget ||
    current.learnerSourceLocale !== next.learnerSourceLocale ||
    current.seasonId !== next.seasonId ||
    current.activeReleaseId === next.activeReleaseId ||
    next.previousReleaseId !== current.activeReleaseId ||
    next.rollout.revision !== current.rollout.revision + 1
  ) throw new Error("v2_required_session_activation_invalid");
};

const assertReleaseUnitSet = (
  releaseScope: "vertical_slice" | "chapter_internal" | "full_season",
  units: readonly { readonly episodeId: string; readonly lessonId: number }[],
): void => {
  const expected = releaseScope === "vertical_slice" ? 1 : releaseScope === "chapter_internal" ? 8 : 32;
  if (
    units.length !== expected ||
    new Set(units.map((unit) => unit.episodeId)).size !== units.length ||
    new Set(units.map((unit) => unit.lessonId)).size !== units.length
  ) throw new Error("v2_required_session_activation_unit_set_invalid");
};

/**
 * Stages every exact required-session publication before a single pointer CAS.
 * This function is server coordination, not an admin/client authorization seam.
 */
export async function activateRequiredSessionRelease(
  input: ActivateRequiredSessionReleaseInput,
  dependencies: RequiredSessionActivationDependencies,
): Promise<{
  readonly status: "activated" | "replayed";
  readonly pointer: V2SeasonReleasePointer;
  readonly publishedEpisodeIds: readonly string[];
}> {
  if (
    !Number.isSafeInteger(input.expectedCurrentRolloutRevision) ||
    input.expectedCurrentRolloutRevision < 0 ||
    (input.expectedCurrentReleaseId !== null && !SAFE_ID.test(input.expectedCurrentReleaseId))
  ) throw new Error("v2_required_session_activation_invalid");
  const next = parsePointer(input.nextPointer, input.expectedEnvironment);
  const exactManifest = assertExactManifestShape(input.manifestRecord, input.manifestBody);
  const release = resolveV2ReleaseManifest(
    next,
    exactManifest.record,
    exactManifest.body,
    input.expectedEnvironment,
  );
  if (input.expectedEnvironment === "production" && release.body.releaseScope !== "full_season") {
    throw new Error("v2_required_session_activation_scope_not_production_ready");
  }
  assertReleaseUnitSet(release.body.releaseScope, release.body.lessonUnits);
  if (release.body.supportManifestRefs.some((ref) => ref.environment !== next.environment)) {
    throw new Error("v2_required_session_activation_support_environment_mismatch");
  }
  const catalog = await dependencies.courseCatalog.read(
    release.body.studyTarget,
    release.body.learnerSourceLocale,
  );
  if (
    !Number.isSafeInteger(catalog.revision) ||
    catalog.revision < 1 ||
    catalog.revision !== next.expectedCatalogRevision ||
    catalog.activeReleaseId !== release.body.courseReleaseId
  ) throw new Error("v2_required_session_activation_catalog_mismatch");

  const currentValue = await dependencies.pointerStore.read(next.pointerId);
  const current = currentValue === undefined
    ? undefined
    : parsePointer(currentValue, input.expectedEnvironment);
  const alreadyCurrent = current !== undefined && exactPointer(current, next);
  if (!alreadyCurrent) assertActivationTransition(next, current, input);

  const publish = dependencies.publishSessionSet ?? publishRequiredSessionSetFromApprovedRelease;
  const publishedEpisodeIds: string[] = [];
  for (const unit of release.body.lessonUnits) {
    await publish({
      expectedEnvironment: input.expectedEnvironment,
      activePointer: next,
      manifestRecord: release.record,
      manifestBody: release.body,
      seasonRevisionId: input.seasonRevisionId,
      episodeId: unit.episodeId,
    }, dependencies);
    publishedEpisodeIds.push(unit.episodeId);
  }

  if (alreadyCurrent) {
    return Object.freeze({
      status: "replayed",
      pointer: next,
      publishedEpisodeIds: Object.freeze(publishedEpisodeIds),
    });
  }

  let outcome: "committed" | "conflict";
  try {
    outcome = await dependencies.pointerStore.compareAndSet(next.pointerId, current, next);
  } catch {
    const observed = await dependencies.pointerStore.read(next.pointerId);
    if (observed !== undefined && exactPointer(observed, next)) outcome = "committed";
    else throw new Error("v2_required_session_activation_indeterminate");
  }
  const observed = await dependencies.pointerStore.read(next.pointerId);
  if (observed !== undefined && exactPointer(observed, next)) {
    return Object.freeze({
      status: outcome === "conflict" ? "replayed" : "activated",
      pointer: next,
      publishedEpisodeIds: Object.freeze(publishedEpisodeIds),
    });
  }
  if (outcome === "conflict") throw new Error("v2_required_session_activation_conflict");
  throw new Error("v2_required_session_activation_indeterminate");
}

/** Production entry: manifest bytes come only from the server-owned store. */
export async function activateStoredRequiredSessionRelease(
  input: Omit<ActivateRequiredSessionReleaseInput, "manifestRecord" | "manifestBody"> & {
    readonly releaseId: string;
  },
  dependencies: StoredRequiredSessionActivationDependencies,
) {
  if (!SAFE_ID.test(input.releaseId)) {
    throw new Error("v2_required_session_activation_invalid");
  }
  const manifest = await dependencies.manifestStore.resolve(input.releaseId);
  if (
    manifest.record.releaseId !== input.releaseId ||
    manifest.body.releaseId !== input.releaseId
  ) throw new Error("v2_required_session_activation_manifest_mismatch");
  return activateRequiredSessionRelease({
    expectedEnvironment: input.expectedEnvironment,
    nextPointer: input.nextPointer,
    manifestRecord: manifest.record,
    manifestBody: manifest.body,
    seasonRevisionId: input.seasonRevisionId,
    expectedCurrentRolloutRevision: input.expectedCurrentRolloutRevision,
    expectedCurrentReleaseId: input.expectedCurrentReleaseId,
  }, dependencies);
}

export function createFirestoreV2SeasonReleasePointerStore(
  db: Firestore,
): V2SeasonReleasePointerStore {
  const refFor = (pointerId: string) =>
    db.collection("content_v2_season_release_pointers").doc(
      v2SeasonReleasePointerDocumentId(pointerId),
    );
  return {
    read: async (pointerId) => {
      const snapshot = await refFor(pointerId).get();
      return snapshot.exists ? snapshot.data() : undefined;
    },
    compareAndSet: async (pointerId, expected, next) => db.runTransaction(async (transaction) => {
      const ref = refFor(pointerId);
      const snapshot = await transaction.get(ref);
      const current = snapshot.exists ? snapshot.data() : undefined;
      if (
        (expected === undefined && current !== undefined) ||
        (expected !== undefined && (current === undefined || !exactPointer(current, expected)))
      ) return "conflict" as const;
      transaction.set(ref, next as unknown as FirebaseFirestore.DocumentData, { merge: false });
      return "committed" as const;
    }),
  };
}

export function createFirestoreV2CourseCatalogReader(
  db: Firestore,
): RequiredSessionActivationDependencies["courseCatalog"] {
  return {
    read: async (studyTarget, learnerSourceLocale) => {
      const catalogId = `${studyTarget}:${learnerSourceLocale}`;
      if (!SAFE_ID.test(catalogId)) throw new Error("v2_required_session_activation_invalid");
      const snapshot = await db.collection("content_factory_catalog").doc(catalogId).get();
      const data = snapshot.data();
      const active = isRecord(data?.activeRelease) ? data.activeRelease : undefined;
      if (
        !snapshot.exists ||
        !Number.isSafeInteger(data?.revision) ||
        Number(data?.revision) < 1 ||
        typeof active?.releaseId !== "string" ||
        !SAFE_ID.test(active.releaseId) ||
        active.studyTarget !== studyTarget ||
        active.learnerSourceLocale !== learnerSourceLocale
      ) throw new Error("v2_required_session_activation_catalog_mismatch");
      return Object.freeze({
        revision: Number(data?.revision),
        activeReleaseId: active.releaseId,
      });
    },
  };
}

export interface V2RequiredSessionArtifactBucket {
  file(path: string): ImmutableObjectFile;
}

export function createFirestoreV2SeasonReleaseManifestStore(
  db: Firestore,
  bucket: V2RequiredSessionArtifactBucket,
): V2SeasonReleaseManifestStore {
  return {
    resolve: async (releaseId) => {
      if (!SAFE_ID.test(releaseId)) throw new Error("v2_required_session_activation_invalid");
      const snapshot = await db.collection("content_v2_season_release_manifests")
        .doc(v2SeasonReleaseManifestDocumentId(releaseId)).get();
      if (!snapshot.exists) throw new Error("v2_required_session_activation_manifest_missing");
      const recordValue = detach(snapshot.data());
      if (!exactKeys(recordValue, RECORD_KEYS) || !exactKeys(recordValue.object, OBJECT_REF_KEYS)) {
        throw new Error("v2_required_session_activation_manifest_invalid");
      }
      const object = recordValue.object as unknown as {
        readonly path: string;
        readonly generation: string;
        readonly contentHash: string;
        readonly byteSize: number;
      };
      const resolved = await readImmutableCanonicalObject(bucket.file(object.path), {
        expectedHash: object.contentHash,
        expectedGeneration: object.generation,
        expectedByteSize: object.byteSize,
      });
      const exact = assertExactManifestShape(recordValue, resolved.body);
      const body = assertV2SeasonReleaseManifestBody(exact.body);
      const record = exact.record as unknown as V2SeasonReleaseManifestRecord;
      if (
        record.releaseId !== releaseId ||
        body.releaseId !== releaseId ||
        record.seasonId !== body.seasonId ||
        record.manifestHash !== v2ManifestHash(body) ||
        record.object.contentHash !== record.manifestHash
      ) throw new Error("v2_required_session_activation_manifest_mismatch");
      return Object.freeze({ record, body });
    },
  };
}

/** Builds the complete production resolver/storage graph without client data. */
export function createProductionRequiredSessionActivationDependencies(
  db: Firestore,
  bucket: V2RequiredSessionArtifactBucket,
): StoredRequiredSessionActivationDependencies {
  const immutableReader = {
    read: async (
      path: string,
      expectedHash: string,
      expectedGeneration: string,
      expectedByteSize: number,
    ) => readImmutableCanonicalObject(bucket.file(path), {
      expectedHash,
      expectedGeneration,
      expectedByteSize,
    }),
  };
  const episodeResolver = createFirestoreEpisodeRevisionResolver(
    db,
    immutableReader,
    createFirestoreModeTemplateResolver(db, undefined, { allowDeprecated: true }),
  );
  const seasonObjectReader = immutableReader;
  return {
    episodeResolver,
    resolveSeasonRevision: async (seasonRevisionId) =>
      resolveImmutableSeasonRevision({
        revisionPath: `content_season_revisions/${seasonRevisionId}`,
        lifecyclePath: `content_season_lifecycle/${seasonRevisionId}`,
        objectReader: seasonObjectReader,
        documentReader: {
          read: async (path) => {
            const snapshot = await db.doc(path).get();
            return { exists: snapshot.exists, data: () => snapshot.data() };
          },
        },
      }),
    resolveCompiledLessonUnit: async (ref) => {
      const resolved = await readImmutableCanonicalObject(bucket.file(ref.path), {
        expectedHash: ref.contentHash,
        expectedGeneration: ref.generation,
        expectedByteSize: ref.byteSize,
      });
      return {
        body: resolved.body as V2CompiledEpisodeArtifact,
        contentHash: resolved.contentHash,
        generation: resolved.objectGeneration,
        byteSize: resolved.byteSize,
      };
    },
    publicationStore: createFirestoreRequiredSessionPublicationStore(db),
    answerManifestStore: createFirestoreRequiredSessionAnswerManifestStore(db),
    pointerStore: createFirestoreV2SeasonReleasePointerStore(db),
    courseCatalog: createFirestoreV2CourseCatalogReader(db),
    manifestStore: createFirestoreV2SeasonReleaseManifestStore(db, bucket),
  };
}
