import { createHash } from "node:crypto";
import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";
import { v2ActivitySessionIdV2 } from "../../../modules/learning-v2/contracts/activity_session_package_v2";
import {
  V2_ACTIVITY_INSTANCES_CHILD_TOTAL_MAX_BYTES,
  V2_ACTIVITY_SESSION_CAPSULE_MAX_BYTES,
  V2_ACTIVITY_SESSION_RENDER_MAX_BYTES,
  V2_ACTIVITY_SESSION_SIDECAR_MAX_BYTES,
  V2_ACTIVITY_SESSION_SOURCE_MAX_BYTES,
  v2ActivitySessionProjectionObjectPath,
  v2ActivitySessionSourceObjectPath,
  type V2ActivityInstancesUntrustedObjectReadPermitV2,
  type V2ActivityInstancesUntrustedPermitKindV2,
  type V2ActivityInstancesUntrustedReadPermitAggregateV2,
  type V2ActivitySessionCanonicalBytesInputV2,
} from "./v2_activity_instances_package_v2";
import {
  V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
  type V2RepositoryImmutableStoragePortV1,
} from "./v2_firebase_repository_persistence_v1";

export const V2_ACTIVITY_INSTANCES_CHILD_READBACK_SCHEMA_V1 =
  "v2-activity-instances-child-readback.v1" as const;
export const V2_ACTIVITY_INSTANCES_CHILD_READBACK_MAX_CONCURRENCY_V1 = 4;

export interface V2ActivityInstancesChildReadbackV1 {
  readonly schemaVersion: typeof V2_ACTIVITY_INSTANCES_CHILD_READBACK_SCHEMA_V1;
  readonly planFingerprint: string;
  readonly stageId: string;
  readonly episodeId: string;
  readonly packageFingerprint: string;
  readonly permitAggregateFingerprint: string;
  readonly sessionCount: 12;
  readonly objectCount: 48;
  readonly totalReadbackBytes: number;
  readonly sessions: readonly V2ActivitySessionCanonicalBytesInputV2[];
  readonly repositoryAuthority: "none";
  readonly storageAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly readbackAggregateFingerprint: string;
}

const HASH_RE = /^[a-f0-9]{64}$/;
const GENERATION_RE = /^[A-Za-z0-9._:-]{1,160}$/;
const PERMIT_KINDS = ["source", "render", "capsule", "sidecar"] as const;
const MANIFEST_KEYS = [
  "schemaVersion",
  "trust",
  "planFingerprint",
  "stageId",
  "episodeId",
  "packageFingerprint",
  "permitCount",
  "totalDeclaredByteSize",
  "maximumAggregateBytes",
  "permits",
  "permitAggregateFingerprint",
] as const;
const PERMIT_KEYS = [
  "sessionOrdinal",
  "sessionId",
  "kind",
  "objectPath",
  "contentHash",
  "objectGeneration",
  "declaredByteSize",
  "maximumBytes",
] as const;
const decoder = new TextDecoder("utf-8", { fatal: true });

function fail(code: string): never {
  throw new Error(code);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value);
  return (
    actual.length === expected.length &&
    expected.every((key) => Object.prototype.hasOwnProperty.call(value, key))
  );
}

function sha256Bytes(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function maximumBytesForKind(
  kind: V2ActivityInstancesUntrustedPermitKindV2,
): number {
  return kind === "source"
    ? V2_ACTIVITY_SESSION_SOURCE_MAX_BYTES
    : kind === "render"
      ? V2_ACTIVITY_SESSION_RENDER_MAX_BYTES
      : kind === "capsule"
        ? V2_ACTIVITY_SESSION_CAPSULE_MAX_BYTES
        : V2_ACTIVITY_SESSION_SIDECAR_MAX_BYTES;
}

function expectedPath(
  stageId: string,
  permit: V2ActivityInstancesUntrustedObjectReadPermitV2,
): string {
  return permit.kind === "source"
    ? v2ActivitySessionSourceObjectPath(
        stageId,
        permit.sessionOrdinal,
        permit.contentHash,
      )
    : v2ActivitySessionProjectionObjectPath(
        stageId,
        permit.sessionOrdinal,
        permit.kind,
        permit.contentHash,
      );
}

function preflightManifest(
  value: unknown,
): V2ActivityInstancesUntrustedReadPermitAggregateV2 {
  if (
    !isRecord(value) ||
    !exactKeys(value, MANIFEST_KEYS) ||
    value.schemaVersion !== "v2-activity-instances-untrusted-read-permits.v2" ||
    value.trust !== "untrusted_structural_only" ||
    typeof value.planFingerprint !== "string" ||
    !HASH_RE.test(value.planFingerprint) ||
    typeof value.stageId !== "string" ||
    typeof value.episodeId !== "string" ||
    typeof value.packageFingerprint !== "string" ||
    !HASH_RE.test(value.packageFingerprint) ||
    value.permitCount !== 48 ||
    value.maximumAggregateBytes !==
      V2_ACTIVITY_INSTANCES_CHILD_TOTAL_MAX_BYTES ||
    !Number.isSafeInteger(value.totalDeclaredByteSize) ||
    Number(value.totalDeclaredByteSize) < 48 ||
    Number(value.totalDeclaredByteSize) >
      V2_ACTIVITY_INSTANCES_CHILD_TOTAL_MAX_BYTES ||
    typeof value.permitAggregateFingerprint !== "string" ||
    !HASH_RE.test(value.permitAggregateFingerprint) ||
    !Array.isArray(value.permits) ||
    value.permits.length !== 48
  ) {
    fail("v2_activity_instances_child_manifest_invalid");
  }
  const permits: V2ActivityInstancesUntrustedObjectReadPermitV2[] = [];
  const paths = new Set<string>();
  let totalDeclaredByteSize = 0;
  for (let index = 0; index < value.permits.length; index += 1) {
    const candidate = value.permits[index];
    const sessionOrdinal = Math.floor(index / 4) + 1;
    const kind = PERMIT_KINDS[index % 4];
    const sessionId = v2ActivitySessionIdV2(value.episodeId, sessionOrdinal);
    const maximumBytes = maximumBytesForKind(kind);
    if (
      !isRecord(candidate) ||
      !exactKeys(candidate, PERMIT_KEYS) ||
      candidate.sessionOrdinal !== sessionOrdinal ||
      candidate.sessionId !== sessionId ||
      candidate.kind !== kind ||
      typeof candidate.objectPath !== "string" ||
      typeof candidate.contentHash !== "string" ||
      !HASH_RE.test(candidate.contentHash) ||
      typeof candidate.objectGeneration !== "string" ||
      !GENERATION_RE.test(candidate.objectGeneration) ||
      !Number.isSafeInteger(candidate.declaredByteSize) ||
      Number(candidate.declaredByteSize) < 1 ||
      Number(candidate.declaredByteSize) > maximumBytes ||
      candidate.maximumBytes !== maximumBytes
    ) {
      fail("v2_activity_instances_child_permit_invalid");
    }
    const permit = Object.freeze({
      sessionOrdinal,
      sessionId,
      kind,
      objectPath: candidate.objectPath,
      contentHash: candidate.contentHash,
      objectGeneration: candidate.objectGeneration,
      declaredByteSize: Number(candidate.declaredByteSize),
      maximumBytes,
    });
    let codeOwnedPath: string;
    try {
      codeOwnedPath = expectedPath(value.stageId, permit);
    } catch {
      fail("v2_activity_instances_child_permit_invalid");
    }
    if (permit.objectPath !== codeOwnedPath || paths.has(permit.objectPath))
      fail("v2_activity_instances_child_permit_invalid");
    paths.add(permit.objectPath);
    const nextTotal = totalDeclaredByteSize + permit.declaredByteSize;
    if (
      !Number.isSafeInteger(nextTotal) ||
      nextTotal > V2_ACTIVITY_INSTANCES_CHILD_TOTAL_MAX_BYTES
    ) {
      fail("v2_activity_instances_child_aggregate_oversize");
    }
    totalDeclaredByteSize = nextTotal;
    permits.push(permit);
  }
  if (totalDeclaredByteSize !== value.totalDeclaredByteSize)
    fail("v2_activity_instances_child_aggregate_invalid");
  const body = Object.freeze({
    schemaVersion: value.schemaVersion,
    trust: value.trust,
    planFingerprint: value.planFingerprint,
    stageId: value.stageId,
    episodeId: value.episodeId,
    packageFingerprint: value.packageFingerprint,
    permitCount: 48 as const,
    totalDeclaredByteSize,
    maximumAggregateBytes: V2_ACTIVITY_INSTANCES_CHILD_TOTAL_MAX_BYTES,
    permits: Object.freeze(permits),
  });
  if (value.permitAggregateFingerprint !== hashCanonicalBody(body))
    fail("v2_activity_instances_child_aggregate_invalid");
  return Object.freeze({
    ...body,
    permitAggregateFingerprint: value.permitAggregateFingerprint,
  }) as V2ActivityInstancesUntrustedReadPermitAggregateV2;
}

async function readPermit(
  storage: V2RepositoryImmutableStoragePortV1,
  permit: V2ActivityInstancesUntrustedObjectReadPermitV2,
): Promise<string> {
  const metadata = await storage.readMetadataExact(permit.objectPath);
  if (metadata === null) fail("v2_activity_instances_child_metadata_missing");
  if (
    metadata.byteSize > permit.maximumBytes ||
    metadata.generation !== permit.objectGeneration ||
    metadata.contentHash !== permit.contentHash ||
    metadata.byteSize !== permit.declaredByteSize ||
    metadata.contentType !== V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1
  ) {
    fail("v2_activity_instances_child_metadata_mismatch");
  }
  const download = await storage.downloadGenerationExact({
    objectPath: permit.objectPath,
    ifGenerationMatch: permit.objectGeneration,
    maximumBytes: permit.maximumBytes,
  });
  if (download.kind !== "downloaded")
    fail("v2_activity_instances_child_download_failed");
  if (
    !(download.bytes instanceof Uint8Array) ||
    download.bytes.byteLength !== permit.declaredByteSize ||
    download.bytes.byteLength > permit.maximumBytes ||
    sha256Bytes(download.bytes) !== permit.contentHash
  ) {
    fail("v2_activity_instances_child_readback_mismatch");
  }
  try {
    return decoder.decode(download.bytes);
  } catch {
    fail("v2_activity_instances_child_utf8_invalid");
  }
}

export async function readbackV2ActivityInstancesChildrenV1(input: {
  readonly permitManifest: V2ActivityInstancesUntrustedReadPermitAggregateV2;
  readonly storage: V2RepositoryImmutableStoragePortV1;
  readonly concurrency?: number;
}): Promise<V2ActivityInstancesChildReadbackV1> {
  if (
    !isRecord(input) ||
    typeof input.storage !== "object" ||
    input.storage === null
  )
    fail("v2_activity_instances_child_readback_input_invalid");
  const concurrency = input.concurrency ?? 4;
  if (
    !Number.isSafeInteger(concurrency) ||
    concurrency < 1 ||
    concurrency > V2_ACTIVITY_INSTANCES_CHILD_READBACK_MAX_CONCURRENCY_V1 ||
    typeof input.storage.readMetadataExact !== "function" ||
    typeof input.storage.downloadGenerationExact !== "function"
  ) {
    fail("v2_activity_instances_child_readback_input_invalid");
  }
  const manifest = preflightManifest(input.permitManifest);
  const rawByIndex: (string | undefined)[] = new Array(48);
  let cursor = 0;
  let failure: unknown = null;
  const worker = async (): Promise<void> => {
    while (failure === null) {
      const index = cursor;
      cursor += 1;
      if (index >= manifest.permits.length) return;
      try {
        rawByIndex[index] = await readPermit(
          input.storage,
          manifest.permits[index],
        );
      } catch (error) {
        if (failure === null) failure = error;
      }
    }
  };
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  if (failure !== null) throw failure;
  if (rawByIndex.some((raw) => raw === undefined))
    fail("v2_activity_instances_child_readback_incomplete");
  const sessions = Object.freeze(
    Array.from({ length: 12 }, (_, sessionIndex) => {
      const permitIndex = sessionIndex * 4;
      const source = manifest.permits[permitIndex];
      return Object.freeze({
        sessionOrdinal: source.sessionOrdinal,
        sessionId: source.sessionId,
        sourceRaw: rawByIndex[permitIndex]!,
        renderRaw: rawByIndex[permitIndex + 1]!,
        capsuleEnvelopeRaw: rawByIndex[permitIndex + 2]!,
        sidecarRaw: rawByIndex[permitIndex + 3]!,
        objectGenerations: Object.freeze({
          source: source.objectGeneration,
          render: manifest.permits[permitIndex + 1].objectGeneration,
          capsule: manifest.permits[permitIndex + 2].objectGeneration,
          sidecar: manifest.permits[permitIndex + 3].objectGeneration,
        }),
      });
    }),
  );
  const body = Object.freeze({
    schemaVersion: V2_ACTIVITY_INSTANCES_CHILD_READBACK_SCHEMA_V1,
    planFingerprint: manifest.planFingerprint,
    stageId: manifest.stageId,
    episodeId: manifest.episodeId,
    packageFingerprint: manifest.packageFingerprint,
    permitAggregateFingerprint: manifest.permitAggregateFingerprint,
    sessionCount: 12 as const,
    objectCount: 48 as const,
    totalReadbackBytes: manifest.totalDeclaredByteSize,
    sessions,
    repositoryAuthority: "none" as const,
    storageAuthority: "none" as const,
    evidenceAuthority: "none" as const,
  });
  const readbackAggregateFingerprint = hashCanonicalBody({
    schemaVersion: "v2-activity-instances-child-readback-aggregate.v1",
    planFingerprint: manifest.planFingerprint,
    stageId: manifest.stageId,
    episodeId: manifest.episodeId,
    packageFingerprint: manifest.packageFingerprint,
    permitAggregateFingerprint: manifest.permitAggregateFingerprint,
    totalReadbackBytes: manifest.totalDeclaredByteSize,
    readbacks: manifest.permits.map((permit) => ({
      sessionOrdinal: permit.sessionOrdinal,
      kind: permit.kind,
      objectPath: permit.objectPath,
      contentHash: permit.contentHash,
      objectGeneration: permit.objectGeneration,
      byteSize: permit.declaredByteSize,
    })),
  });
  return Object.freeze({
    ...body,
    readbackAggregateFingerprint,
  });
}
