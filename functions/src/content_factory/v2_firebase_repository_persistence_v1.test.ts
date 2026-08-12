import { createHash } from "node:crypto";
import {
  canonicalJsonV1,
  sha256Utf8,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  V2_REPOSITORY_SINGLEFLIGHT_RECEIPT_PREFIX_V1,
  parseV2RepositorySingleflightStateV1,
  type V2RepositorySingleflightIdentityV1,
  type V2RepositorySingleflightReceiptPinV1,
} from "./v2_repository_singleflight_state_v1";
import {
  V2_REPOSITORY_IMMUTABLE_AUDIO_CONTENT_TYPE_V1,
  V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
  executeV2RepositorySingleflightClaimTransactionV1,
  executeV2RepositorySingleflightFinalizeTransactionV1,
  persistV2ImmutableRepositoryObjectV1,
  type V2RepositoryFirestorePortV1,
  type V2RepositoryFirestoreTransactionPortV1,
  type V2RepositoryImmutableConflictV1,
  type V2RepositoryImmutableCreateResultV1,
  type V2RepositoryImmutableDownloadResultV1,
  type V2RepositoryImmutableObjectMetadataV1,
  type V2RepositoryImmutableStoragePortV1,
} from "./v2_firebase_repository_persistence_v1";

const hash = (value: string): string => sha256Utf8(value);
const hashBytes = (value: Uint8Array): string =>
  createHash("sha256").update(value).digest("hex");
const tokenA = "worker-a-token-000000000000000000000001";
const tokenB = "worker-b-token-000000000000000000000002";
const now = 1_800_000_000_000;
const identity: V2RepositorySingleflightIdentityV1 = Object.freeze({
  planFingerprint: hash("plan"),
  courseContractFingerprint: hash("course"),
  repositoryScopeFingerprint: hash("repository-scope"),
  resolverContractFingerprint: hash("resolver"),
  requestFingerprint: hash("request"),
});

function receiptPin(
  receiptFingerprint = hash("receipt"),
): V2RepositorySingleflightReceiptPinV1 {
  return Object.freeze({
    objectPath: `${V2_REPOSITORY_SINGLEFLIGHT_RECEIPT_PREFIX_V1}/${identity.planFingerprint}/${receiptFingerprint}.json`,
    contentHash: hash("receipt-full-canonical-bytes"),
    objectGeneration: "1",
    byteSize: 1024,
  });
}

class MemoryFirestore implements V2RepositoryFirestorePortV1 {
  readonly documents = new Map<string, string>();
  writes = 0;

  async runTransaction<T>(
    body: (transaction: V2RepositoryFirestoreTransactionPortV1) => Promise<T>,
  ): Promise<T> {
    const transaction: V2RepositoryFirestoreTransactionPortV1 = {
      readExact: async (path) => {
        const raw = this.documents.get(path);
        return raw === undefined
          ? Object.freeze({ exists: false as const })
          : Object.freeze({ exists: true as const, raw });
      },
      createExact: async (path, raw) => {
        if (this.documents.has(path)) throw new Error("fake_create_conflict");
        this.documents.set(path, raw);
        this.writes += 1;
      },
      compareAndSetExact: async (path, expected, raw) => {
        const currentRaw = this.documents.get(path);
        if (currentRaw === undefined) throw new Error("fake_cas_missing");
        const current = parseV2RepositorySingleflightStateV1(currentRaw);
        if (
          current.operationRevision !== expected.operationRevision ||
          current.operationFingerprint !== expected.operationFingerprint
        ) {
          throw new Error("fake_cas_conflict");
        }
        this.documents.set(path, raw);
        this.writes += 1;
      },
    };
    return body(transaction);
  }
}

class MemoryStorage implements V2RepositoryImmutableStoragePortV1 {
  metadata: V2RepositoryImmutableObjectMetadataV1 | null = null;
  storedBytes: Uint8Array | null = null;
  metadataReads = 0;
  creates = 0;
  downloads = 0;
  quarantines: V2RepositoryImmutableConflictV1[] = [];
  createRace = false;
  generationConflict = false;
  readbackOverride: Uint8Array | null = null;
  quarantineFails = false;

  async readMetadataExact(): Promise<V2RepositoryImmutableObjectMetadataV1 | null> {
    this.metadataReads += 1;
    return this.metadata;
  }

  async createExact(
    input: Parameters<V2RepositoryImmutableStoragePortV1["createExact"]>[0],
  ): Promise<V2RepositoryImmutableCreateResultV1> {
    this.creates += 1;
    if (input.ifGenerationMatch !== 0) throw new Error("fake_bad_precondition");
    const metadata = Object.freeze({
      generation: "1",
      byteSize: input.bytes.byteLength,
      contentType: input.contentType,
      contentHash: input.contentHash,
    });
    if (this.createRace) {
      this.metadata = metadata;
      this.storedBytes = new Uint8Array(input.bytes);
      return Object.freeze({ kind: "precondition_failed" as const });
    }
    if (this.metadata !== null)
      return Object.freeze({ kind: "precondition_failed" as const });
    this.metadata = metadata;
    this.storedBytes = new Uint8Array(input.bytes);
    return Object.freeze({ kind: "created" as const, metadata });
  }

  async downloadGenerationExact(
    input: Parameters<
      V2RepositoryImmutableStoragePortV1["downloadGenerationExact"]
    >[0],
  ): Promise<V2RepositoryImmutableDownloadResultV1> {
    this.downloads += 1;
    if (
      this.generationConflict ||
      this.metadata?.generation !== input.ifGenerationMatch
    ) {
      return Object.freeze({ kind: "generation_mismatch" as const });
    }
    if (this.storedBytes === null)
      return Object.freeze({ kind: "not_found" as const });
    return Object.freeze({
      kind: "downloaded" as const,
      bytes: new Uint8Array(this.readbackOverride ?? this.storedBytes),
    });
  }

  async quarantineConflict(
    conflict: V2RepositoryImmutableConflictV1,
  ): Promise<void> {
    this.quarantines.push(conflict);
    if (this.quarantineFails) throw new Error("fake_quarantine_failed");
  }
}

const objectPath =
  "learning-v2/repository-auth/private/manifests/plan/request/manifest.json";
const objectBytes = new TextEncoder().encode(canonicalJsonV1({ ok: true }));
const persist = (storage: MemoryStorage, bytes = objectBytes) =>
  persistV2ImmutableRepositoryObjectV1({
    storage,
    objectPath,
    bytes,
    maximumBytes: 64 * 1024,
    contentType: V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
    contentHash: hashBytes(bytes),
  });

describe("V2 Firebase repository persistence ports", () => {
  it("persists exact audio/mpeg objects and rejects unlisted audio MIME", async () => {
    const storage = new MemoryStorage();
    const bytes = new Uint8Array([0x49, 0x44, 0x33, 1]);
    const result = await persistV2ImmutableRepositoryObjectV1({
      storage,
      objectPath: `learning-v2/voice-audio/${hash("audio")}.mp3`,
      bytes,
      maximumBytes: 1024,
      contentType: V2_REPOSITORY_IMMUTABLE_AUDIO_CONTENT_TYPE_V1,
      contentHash: hashBytes(bytes),
    });
    expect(result.pin.contentType).toBe("audio/mpeg");
    await expect(
      persistV2ImmutableRepositoryObjectV1({
        storage: new MemoryStorage(),
        objectPath: `learning-v2/voice-audio/${hash("wav")}.wav`,
        bytes,
        maximumBytes: 1024,
        contentType: "audio/wav" as never,
        contentHash: hashBytes(bytes),
      }),
    ).rejects.toThrow("v2_repository_immutable_content_type_invalid");
  });
  it("transactionally creates, reports active work, and takes over a stale claim", async () => {
    const firestore = new MemoryFirestore();
    const created = await executeV2RepositorySingleflightClaimTransactionV1({
      firestore,
      identity,
      claimToken: tokenA,
      nowEpochMs: now,
      leaseSeconds: 60,
    });
    expect(created.kind).toBe("create");
    expect(firestore.writes).toBe(1);

    const active = await executeV2RepositorySingleflightClaimTransactionV1({
      firestore,
      identity,
      claimToken: tokenB,
      nowEpochMs: now + 1,
      leaseSeconds: 60,
    });
    expect(active.kind).toBe("in_progress");
    expect(firestore.writes).toBe(1);

    const takeover = await executeV2RepositorySingleflightClaimTransactionV1({
      firestore,
      identity,
      claimToken: tokenB,
      nowEpochMs: now + 60_000,
      leaseSeconds: 60,
    });
    expect(takeover).toMatchObject({ kind: "stale_takeover" });
    expect(firestore.writes).toBe(2);
  });

  it("rejects the stale loser, finalizes the winner, and exact-replays without a write", async () => {
    const firestore = new MemoryFirestore();
    await executeV2RepositorySingleflightClaimTransactionV1({
      firestore,
      identity,
      claimToken: tokenA,
      nowEpochMs: now,
      leaseSeconds: 60,
    });
    await executeV2RepositorySingleflightClaimTransactionV1({
      firestore,
      identity,
      claimToken: tokenB,
      nowEpochMs: now + 60_000,
      leaseSeconds: 300,
    });
    const receiptFingerprint = hash("receipt");
    await expect(
      executeV2RepositorySingleflightFinalizeTransactionV1({
        firestore,
        identity,
        claimEpoch: 1,
        claimToken: tokenA,
        nowEpochMs: now + 61_000,
        receiptFingerprint,
        receiptPin: receiptPin(receiptFingerprint),
      }),
    ).rejects.toThrow("v2_repository_singleflight_claim_lost");
    const finalized =
      await executeV2RepositorySingleflightFinalizeTransactionV1({
        firestore,
        identity,
        claimEpoch: 2,
        claimToken: tokenB,
        nowEpochMs: now + 61_000,
        receiptFingerprint,
        receiptPin: receiptPin(receiptFingerprint),
      });
    expect(finalized.kind).toBe("finalize");
    const writesAfterFinalize = firestore.writes;
    const replay = await executeV2RepositorySingleflightFinalizeTransactionV1({
      firestore,
      identity,
      claimEpoch: 2,
      claimToken: tokenB,
      nowEpochMs: now + 62_000,
      receiptFingerprint,
      receiptPin: receiptPin(receiptFingerprint),
    });
    expect(replay.kind).toBe("exact_replay");
    expect(firestore.writes).toBe(writesAfterFinalize);
  });

  it("creates an immutable object then returns a generation-pinned exact replay", async () => {
    const storage = new MemoryStorage();
    await expect(persist(storage)).resolves.toMatchObject({
      kind: "created",
      pin: { objectGeneration: "1", contentHash: hashBytes(objectBytes) },
    });
    await expect(persist(storage)).resolves.toMatchObject({
      kind: "exact_replay",
      pin: { objectGeneration: "1" },
    });
    expect(storage.creates).toBe(1);
    expect(storage.downloads).toBe(2);
  });

  it("converts a create race into exact replay only after metadata and readback", async () => {
    const storage = new MemoryStorage();
    storage.createRace = true;
    await expect(persist(storage)).resolves.toMatchObject({
      kind: "exact_replay",
      pin: { objectGeneration: "1" },
    });
    expect(storage.metadataReads).toBe(2);
    expect(storage.downloads).toBe(1);
  });

  it("quarantines metadata conflict before download and preserves the primary error", async () => {
    const storage = new MemoryStorage();
    storage.metadata = Object.freeze({
      generation: "9",
      byteSize: objectBytes.byteLength,
      contentType: V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
      contentHash: hash("different"),
    });
    storage.quarantineFails = true;
    await expect(persist(storage)).rejects.toThrow(
      "v2_repository_immutable_object_conflict",
    );
    expect(storage.downloads).toBe(0);
    expect(storage.quarantines).toHaveLength(1);
    expect(storage.quarantines[0]?.kind).toBe("metadata_conflict");
  });

  it("quarantines generation and byte readback conflicts", async () => {
    const generationConflict = new MemoryStorage();
    await persist(generationConflict);
    generationConflict.generationConflict = true;
    await expect(persist(generationConflict)).rejects.toThrow(
      "v2_repository_immutable_object_conflict",
    );
    expect(generationConflict.quarantines.at(-1)?.kind).toBe(
      "generation_conflict",
    );

    const readbackConflict = new MemoryStorage();
    await persist(readbackConflict);
    readbackConflict.readbackOverride = new Uint8Array(objectBytes);
    readbackConflict.readbackOverride[objectBytes.byteLength - 1] ^= 1;
    await expect(persist(readbackConflict)).rejects.toThrow(
      "v2_repository_immutable_object_conflict",
    );
    expect(readbackConflict.quarantines.at(-1)?.kind).toBe("readback_conflict");
    expect(
      readbackConflict.quarantines.at(-1)?.observedReadback?.contentHash,
    ).not.toBeNull();

    const oversizedReadback = new MemoryStorage();
    await persist(oversizedReadback);
    oversizedReadback.readbackOverride = new Uint8Array(65 * 1024);
    await expect(persist(oversizedReadback)).rejects.toThrow(
      "v2_repository_immutable_object_conflict",
    );
    expect(oversizedReadback.quarantines.at(-1)?.observedReadback).toEqual({
      contentHash: null,
      byteSize: 65 * 1024,
    });
  });

  it("rejects oversize and hash mismatch before any Storage operation", async () => {
    const oversize = new MemoryStorage();
    await expect(
      persistV2ImmutableRepositoryObjectV1({
        storage: oversize,
        objectPath,
        bytes: new Uint8Array(65),
        maximumBytes: 64,
        contentType: V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
        contentHash: hashBytes(new Uint8Array(65)),
      }),
    ).rejects.toThrow("v2_repository_immutable_byte_size_invalid");
    expect(oversize.metadataReads).toBe(0);

    const mismatch = new MemoryStorage();
    await expect(
      persistV2ImmutableRepositoryObjectV1({
        storage: mismatch,
        objectPath,
        bytes: objectBytes,
        maximumBytes: 64 * 1024,
        contentType: V2_REPOSITORY_IMMUTABLE_JSON_CONTENT_TYPE_V1,
        contentHash: hash("wrong"),
      }),
    ).rejects.toThrow("v2_repository_immutable_content_hash_mismatch");
    expect(mismatch.metadataReads).toBe(0);
  });
});
