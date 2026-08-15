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
  type V2ActivityInstancesUntrustedPermitKindV2,
  type V2ActivityInstancesUntrustedReadPermitAggregateV2,
} from "./v2_activity_instances_package_v2";
import {
  V2_ACTIVITY_INSTANCES_CHILD_READBACK_MAX_CONCURRENCY_V1,
  readbackV2ActivityInstancesChildrenV1,
} from "./v2_activity_instances_child_readback_v1";
import {
  V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
  type V2RepositoryImmutableDownloadResultV1,
  type V2RepositoryImmutableObjectMetadataV1,
  type V2RepositoryImmutableStoragePortV1,
} from "./v2_firebase_repository_persistence_v1";

const encoder = new TextEncoder();
const kinds = ["source", "render", "capsule", "sidecar"] as const;
const planFingerprint = hashCanonicalBody("plan");
const packageFingerprint = hashCanonicalBody("package");
const stageId = "stage-activity-instances-1";
const episodeId = "episode-1";

function sha256Bytes(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function maximum(kind: V2ActivityInstancesUntrustedPermitKindV2): number {
  return kind === "source"
    ? V2_ACTIVITY_SESSION_SOURCE_MAX_BYTES
    : kind === "render"
      ? V2_ACTIVITY_SESSION_RENDER_MAX_BYTES
      : kind === "capsule"
        ? V2_ACTIVITY_SESSION_CAPSULE_MAX_BYTES
        : V2_ACTIVITY_SESSION_SIDECAR_MAX_BYTES;
}

function fixture(overrides?: ReadonlyMap<number, Uint8Array>) {
  const bytesByPath = new Map<string, Uint8Array>();
  const permits = Array.from({ length: 48 }, (_, index) => {
    const sessionOrdinal = Math.floor(index / 4) + 1;
    const kind = kinds[index % 4];
    const bytes =
      overrides?.get(index) ??
      encoder.encode(
        JSON.stringify({ kind, sessionOrdinal, value: `value-${index}` }),
      );
    const contentHash = sha256Bytes(bytes);
    const objectPath =
      kind === "source"
        ? v2ActivitySessionSourceObjectPath(
            stageId,
            sessionOrdinal,
            contentHash,
          )
        : v2ActivitySessionProjectionObjectPath(
            stageId,
            sessionOrdinal,
            kind,
            contentHash,
          );
    bytesByPath.set(objectPath, bytes);
    return Object.freeze({
      sessionOrdinal,
      sessionId: v2ActivitySessionIdV2(episodeId, sessionOrdinal),
      kind,
      objectPath,
      contentHash,
      objectGeneration: String(index + 1),
      declaredByteSize: bytes.byteLength,
      maximumBytes: maximum(kind),
    });
  });
  const totalDeclaredByteSize = permits.reduce(
    (total, permit) => total + permit.declaredByteSize,
    0,
  );
  const body = Object.freeze({
    schemaVersion: "v2-activity-instances-untrusted-read-permits.v2" as const,
    trust: "untrusted_structural_only" as const,
    planFingerprint,
    stageId,
    episodeId,
    packageFingerprint,
    permitCount: 48 as const,
    totalDeclaredByteSize,
    maximumAggregateBytes: V2_ACTIVITY_INSTANCES_CHILD_TOTAL_MAX_BYTES,
    permits: Object.freeze(permits),
  });
  const manifest = Object.freeze({
    ...body,
    permitAggregateFingerprint: hashCanonicalBody(body),
  });
  return { manifest, bytesByPath };
}

class MemoryStorage implements V2RepositoryImmutableStoragePortV1 {
  readonly metadata = new Map<string, V2RepositoryImmutableObjectMetadataV1>();
  readonly bytes = new Map<string, Uint8Array>();
  metadataReads = 0;
  downloads = 0;
  activeDownloads = 0;
  peakDownloads = 0;
  readonly downloadedPaths: string[] = [];
  delayDownloads = false;
  metadataOverride:
    | ((
        path: string,
        value: V2RepositoryImmutableObjectMetadataV1 | null,
      ) => V2RepositoryImmutableObjectMetadataV1 | null)
    | null = null;
  downloadOverride:
    | ((
        path: string,
        value: Uint8Array,
      ) => V2RepositoryImmutableDownloadResultV1)
    | null = null;

  constructor(
    manifest: V2ActivityInstancesUntrustedReadPermitAggregateV2,
    bytesByPath: ReadonlyMap<string, Uint8Array>,
  ) {
    for (const permit of manifest.permits) {
      const bytes = bytesByPath.get(permit.objectPath)!;
      this.bytes.set(permit.objectPath, bytes);
      this.metadata.set(
        permit.objectPath,
        Object.freeze({
          generation: permit.objectGeneration,
          byteSize: bytes.byteLength,
          contentType: V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
          contentHash: sha256Bytes(bytes),
        }),
      );
    }
  }

  async readMetadataExact(
    objectPath: string,
  ): Promise<V2RepositoryImmutableObjectMetadataV1 | null> {
    this.metadataReads += 1;
    const value = this.metadata.get(objectPath) ?? null;
    return this.metadataOverride
      ? this.metadataOverride(objectPath, value)
      : value;
  }

  async createExact(): Promise<never> {
    throw new Error("readback_must_not_create");
  }

  async downloadGenerationExact(
    input: Parameters<
      V2RepositoryImmutableStoragePortV1["downloadGenerationExact"]
    >[0],
  ): Promise<V2RepositoryImmutableDownloadResultV1> {
    this.downloads += 1;
    this.downloadedPaths.push(input.objectPath);
    this.activeDownloads += 1;
    this.peakDownloads = Math.max(this.peakDownloads, this.activeDownloads);
    try {
      if (this.delayDownloads)
        await new Promise<void>((resolve) => setTimeout(resolve, 1));
      const bytes = this.bytes.get(input.objectPath);
      if (!bytes) return Object.freeze({ kind: "not_found" as const });
      return (
        this.downloadOverride?.(input.objectPath, bytes) ??
        Object.freeze({
          kind: "downloaded" as const,
          bytes: new Uint8Array(bytes),
        })
      );
    } finally {
      this.activeDownloads -= 1;
    }
  }

  async quarantineConflict(): Promise<void> {
    throw new Error("readback_must_not_quarantine");
  }
}

describe("Learning V2 activity instances bounded child readback", () => {
  it("reads exact 48 objects with a hard four-worker bound and groups 12 sessions", async () => {
    const { manifest, bytesByPath } = fixture();
    const storage = new MemoryStorage(manifest, bytesByPath);
    storage.delayDownloads = true;
    const result = await readbackV2ActivityInstancesChildrenV1({
      permitManifest: manifest,
      storage,
    });
    expect(storage.metadataReads).toBe(48);
    expect(storage.downloads).toBe(48);
    expect(storage.peakDownloads).toBeGreaterThan(1);
    expect(storage.peakDownloads).toBeLessThanOrEqual(
      V2_ACTIVITY_INSTANCES_CHILD_READBACK_MAX_CONCURRENCY_V1,
    );
    expect(result.sessions).toHaveLength(12);
    expect(result.objectCount).toBe(48);
    expect(result.totalReadbackBytes).toBe(manifest.totalDeclaredByteSize);
    expect(result.sessions[0]).toMatchObject({
      sessionOrdinal: 1,
      sessionId: v2ActivitySessionIdV2(episodeId, 1),
      objectGenerations: {
        source: "1",
        render: "2",
        capsule: "3",
        sidecar: "4",
      },
    });
    expect(result.repositoryAuthority).toBe("none");
    expect(result.storageAuthority).toBe("none");
    expect(result.evidenceAuthority).toBe("none");
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.sessions)).toBe(true);
  });

  it("rejects excessive concurrency, permit order and aggregate drift before I/O", async () => {
    const { manifest, bytesByPath } = fixture();
    const storage = new MemoryStorage(manifest, bytesByPath);
    await expect(
      readbackV2ActivityInstancesChildrenV1({
        permitManifest: manifest,
        storage,
        concurrency: 5,
      }),
    ).rejects.toThrow("v2_activity_instances_child_readback_input_invalid");
    const swappedPermits = [...manifest.permits];
    [swappedPermits[0], swappedPermits[1]] = [
      swappedPermits[1],
      swappedPermits[0],
    ];
    const swapped = { ...manifest, permits: swappedPermits };
    await expect(
      readbackV2ActivityInstancesChildrenV1({
        permitManifest: swapped,
        storage,
      }),
    ).rejects.toThrow("v2_activity_instances_child_permit_invalid");
    const aggregateDrift = {
      ...manifest,
      totalDeclaredByteSize: manifest.totalDeclaredByteSize + 1,
    };
    await expect(
      readbackV2ActivityInstancesChildrenV1({
        permitManifest: aggregateDrift,
        storage,
      }),
    ).rejects.toThrow("v2_activity_instances_child_aggregate_invalid");
    expect(storage.metadataReads).toBe(0);
    expect(storage.downloads).toBe(0);
  });

  it.each([
    ["missing", "v2_activity_instances_child_metadata_missing"],
    ["generation", "v2_activity_instances_child_metadata_mismatch"],
    ["hash", "v2_activity_instances_child_metadata_mismatch"],
    ["size", "v2_activity_instances_child_metadata_mismatch"],
    ["type", "v2_activity_instances_child_metadata_mismatch"],
    ["oversize", "v2_activity_instances_child_metadata_mismatch"],
  ])(
    "rejects %s metadata before downloading that object",
    async (fault, code) => {
      const { manifest, bytesByPath } = fixture();
      const storage = new MemoryStorage(manifest, bytesByPath);
      const target = manifest.permits[0];
      storage.metadataOverride = (path, value) => {
        if (path !== target.objectPath || value === null) return value;
        if (fault === "missing") return null;
        if (fault === "generation") return { ...value, generation: "999" };
        if (fault === "hash")
          return { ...value, contentHash: hashCanonicalBody("wrong") };
        if (fault === "size") return { ...value, byteSize: value.byteSize + 1 };
        if (fault === "type")
          return {
            ...value,
            contentType: "application/octet-stream",
          };
        return { ...value, byteSize: target.maximumBytes + 1 };
      };
      await expect(
        readbackV2ActivityInstancesChildrenV1({
          permitManifest: manifest,
          storage,
          concurrency: 1,
        }),
      ).rejects.toThrow(code);
      expect(storage.downloadedPaths).not.toContain(target.objectPath);
      expect(storage.downloads).toBe(0);
    },
  );

  it.each(["generation_mismatch", "not_found", "truncate", "tamper"])(
    "rejects %s generation-pinned download",
    async (fault) => {
      const { manifest, bytesByPath } = fixture();
      const storage = new MemoryStorage(manifest, bytesByPath);
      storage.downloadOverride = (_path, bytes) => {
        if (fault === "generation_mismatch")
          return Object.freeze({ kind: "generation_mismatch" as const });
        if (fault === "not_found")
          return Object.freeze({ kind: "not_found" as const });
        const changed =
          fault === "truncate"
            ? bytes.slice(0, bytes.byteLength - 1)
            : Uint8Array.from(bytes, (value, index) =>
                index === 0 ? value ^ 1 : value,
              );
        return Object.freeze({ kind: "downloaded" as const, bytes: changed });
      };
      await expect(
        readbackV2ActivityInstancesChildrenV1({
          permitManifest: manifest,
          storage,
          concurrency: 1,
        }),
      ).rejects.toThrow(
        fault === "generation_mismatch" || fault === "not_found"
          ? "v2_activity_instances_child_download_failed"
          : "v2_activity_instances_child_readback_mismatch",
      );
    },
  );

  it("rejects fatal UTF-8 after exact metadata, generation, size and SHA", async () => {
    const invalidUtf8 = Uint8Array.from([0xc3, 0x28]);
    const { manifest, bytesByPath } = fixture(new Map([[0, invalidUtf8]]));
    const storage = new MemoryStorage(manifest, bytesByPath);
    await expect(
      readbackV2ActivityInstancesChildrenV1({
        permitManifest: manifest,
        storage,
        concurrency: 1,
      }),
    ).rejects.toThrow("v2_activity_instances_child_utf8_invalid");
  });
});
