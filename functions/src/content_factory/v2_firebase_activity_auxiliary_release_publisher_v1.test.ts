import { createHash } from "node:crypto";
import { canonicalJsonV1 } from "../../../modules/learning-v2/policies/decision_registry";
import { createFirebaseAdminV2ActivityAuxiliaryReleasePublisherV1 } from "./v2_firebase_activity_auxiliary_release_publisher_v1";

const objectState = new Map<
  string,
  Readonly<{
    bytes: Uint8Array;
    generation: string;
    contentType: string;
    contentHash: string;
  }>
>();
const firestoreState = new Map<string, string>();
let createCount = 0;
let currentReleaseDrift = false;
let missingChild = false;

const hash = (value: Uint8Array | string) =>
  createHash("sha256").update(value).digest("hex");
const childRaw = canonicalJsonV1({ schemaVersion: "test-child.v1" });
const childHash = hash(childRaw);
const childBytes = new TextEncoder().encode(childRaw);
const manifestRaws = Array.from({ length: 12 }, (_, index) =>
  canonicalJsonV1({
    schemaVersion: "test-manifest.v1",
    sessionOrdinal: index + 1,
  }),
);
const releaseIndex = Object.freeze({
  environment: "lab",
  activeManifestHash: "a".repeat(64),
  episodeId: "episode-1",
  stageId: "stage-1",
  activityPackageFingerprint: "b".repeat(64),
  indexFingerprint: "c".repeat(64),
  sessions: Object.freeze(
    manifestRaws.map((raw, index) =>
      Object.freeze({
        objectPath: `learning-v2/canonical/activity-auxiliary-index/${"a".repeat(64)}/${"d".repeat(64)}/${"b".repeat(64)}/sessions/${String(index + 1).padStart(2, "0")}/${"e".repeat(64)}/${hash(raw)}.json`,
      }),
    ),
  ),
});
const indexRaw = canonicalJsonV1({ schemaVersion: "test-index.v1" });
const releaseHandle = Object.freeze({ kind: "release-handle" });

const storage = Object.freeze({
  readMetadataExact: jest.fn(async (objectPath: string) => {
    if (objectPath.startsWith("learning-v2/test-child/"))
      return missingChild
        ? null
        : Object.freeze({
            generation: "7",
            byteSize: childBytes.byteLength,
            contentType: "application/json; charset=utf-8",
            contentHash: childHash,
          });
    const value = objectState.get(objectPath);
    return value
      ? Object.freeze({
          generation: value.generation,
          byteSize: value.bytes.byteLength,
          contentType: value.contentType,
          contentHash: value.contentHash,
        })
      : null;
  }),
  createExact: jest.fn(
    async (input: {
      objectPath: string;
      bytes: Uint8Array;
      contentType: string;
      contentHash: string;
    }) => {
      if (objectState.has(input.objectPath))
        return Object.freeze({ kind: "precondition_failed" as const });
      createCount += 1;
      const generation = String(100 + createCount);
      const value = Object.freeze({
        bytes: new Uint8Array(input.bytes),
        generation,
        contentType: input.contentType,
        contentHash: input.contentHash,
      });
      objectState.set(input.objectPath, value);
      return Object.freeze({
        kind: "created" as const,
        metadata: Object.freeze({
          generation,
          byteSize: input.bytes.byteLength,
          contentType: input.contentType,
          contentHash: input.contentHash,
        }),
      });
    },
  ),
  downloadGenerationExact: jest.fn(
    async (input: { objectPath: string; ifGenerationMatch: string }) => {
      if (
        input.objectPath.startsWith("learning-v2/test-child/") &&
        !missingChild &&
        input.ifGenerationMatch === "7"
      )
        return Object.freeze({
          kind: "downloaded" as const,
          bytes: childBytes,
        });
      const value = objectState.get(input.objectPath);
      return value?.generation === input.ifGenerationMatch
        ? Object.freeze({ kind: "downloaded" as const, bytes: value.bytes })
        : Object.freeze({ kind: "not_found" as const });
    },
  ),
  quarantineConflict: jest.fn(async () => undefined),
});
const firestore = Object.freeze({
  runTransaction: jest.fn(
    async <T>(body: (transaction: any) => Promise<T>): Promise<T> =>
      body({
        readExact: async (path: string) => {
          const raw = firestoreState.get(path);
          return raw === undefined
            ? Object.freeze({ exists: false as const })
            : Object.freeze({ exists: true as const, raw });
        },
        createExact: async (path: string, raw: string) => {
          if (firestoreState.has(path)) throw new Error("conflict");
          firestoreState.set(path, raw);
        },
      }),
  ),
});

jest.mock("./v2_firebase_admin_repository_io_v1", () => ({
  createV2FirebaseAdminRepositoryIoV1: jest.fn(() => ({
    storage,
    firestore,
    readCanonicalDocumentExact: jest.fn(
      async (request: { documentPath: string }) => ({
        documentPath: request.documentPath,
        canonicalRaw: request.documentPath.includes("season_release_pointers")
          ? canonicalJsonV1(
              currentReleaseDrift
                ? { ...publishedPointer, activeReleaseId: "release-2" }
                : publishedPointer,
            )
          : canonicalJsonV1(publishedManifestRecord),
        readTime: { seconds: "1", nanoseconds: 0 },
        updateTime: { seconds: "1", nanoseconds: 0 },
      }),
    ),
  })),
}));
jest.mock(
  "../../../modules/learning-v2/runtime/activity_auxiliary_release_manifest_v1",
  () => ({
    parseLearningV2ActivityAuxiliaryReleaseManifestV1: jest.fn(
      (raw: string) => {
        const ordinal = manifestRaws.indexOf(raw) + 1;
        return {
          stageId: "stage-1",
          episodeId: "episode-1",
          sessionId: `session-${ordinal}`,
          sessionOrdinal: ordinal,
          activityPackageFingerprint: releaseIndex.activityPackageFingerprint,
          sourceFingerprint: hash(["source", ordinal].join(":")),
          renderFingerprint: hash(["render", ordinal].join(":")),
          objects: Array.from({ length: 4 }, (_, index) => ({
            kind: [
              "learner_action",
              "post_terminal_card_capsule",
              "audio_runtime",
              "error_explanations",
            ][index],
            objectPath: `learning-v2/test-child/${ordinal}/${index + 1}.json`,
            contentHash: childHash,
            objectGeneration: "7",
            byteSize: childBytes.byteLength,
            contentType: "application/json; charset=utf-8",
          })),
        };
      },
    ),
  }),
);
jest.mock(
  "../../../modules/learning-v2/runtime/activity_auxiliary_integrity_loader_v1",
  () => ({
    loadLearningV2ActivityAuxiliaryIntegrityV1: jest.fn(
      async (input: {
        manifest: { objects: readonly any[] };
        reader: { readExact(pin: any): Promise<unknown> };
      }) => {
        for (const pin of input.manifest.objects)
          await input.reader.readExact(pin);
        return Object.freeze({ kind: "test-integrity-handle" });
      },
    ),
  }),
);
jest.mock(
  "../../../modules/learning-v2/runtime/activity_auxiliary_release_index_v1",
  () => ({
    materializeLearningV2ActivityAuxiliaryReleaseIndexV1: jest.fn(
      (input: { manifests: readonly { objectGeneration: string }[] }) => ({
        ...releaseIndex,
        sessions: releaseIndex.sessions,
        manifestGenerations: input.manifests.map(
          (entry) => entry.objectGeneration,
        ),
      }),
    ),
    encodeLearningV2ActivityAuxiliaryReleaseIndexV1: jest.fn(() => indexRaw),
  }),
);
jest.mock("./v2_activity_auxiliary_release_pointer_v1", () => ({
  v2ActivityAuxiliaryReleaseIndexObjectPathV1: jest.fn(
    () => `learning-v2/activity-auxiliary-release-index/${hash(indexRaw)}.json`,
  ),
  materializeV2ActivityAuxiliaryReleasePointerV1: jest.fn(
    (input: { indexObjectGeneration: string }) => ({
      schemaVersion: "test-pointer.v1",
      indexObjectGeneration: input.indexObjectGeneration,
    }),
  ),
  encodeV2ActivityAuxiliaryReleasePointerV1: jest.fn((value) =>
    canonicalJsonV1(value),
  ),
  v2ActivityAuxiliaryReleasePointerDocumentPathV1: jest.fn(
    () => "content_v2_activity_auxiliary_release_pointers/pointer",
  ),
}));
jest.mock("./v2_firebase_activity_auxiliary_release_adapter_v1", () => ({
  createFirebaseAdminV2ActivityAuxiliaryReleaseAdapterV1: jest.fn(() => ({
    load: jest.fn(async () => releaseHandle),
  })),
  getV2FirebaseActivityAuxiliaryReleaseSummaryV1: jest.fn(() => ({
    indexFingerprint: releaseIndex.indexFingerprint,
    activityPackageFingerprint: releaseIndex.activityPackageFingerprint,
    activeManifestHash: releaseIndex.activeManifestHash,
  })),
}));

const publishedPointer = Object.freeze({
  studyTarget: "en",
  learnerSourceLocale: "ru",
  seasonId: "season-1",
  activeReleaseId: "release-1",
});
const publishedManifestRecord = Object.freeze({ releaseId: "release-1" });
const input = Object.freeze({
  publishedView: Object.freeze({
    activePointer: publishedPointer,
    manifestRecord: publishedManifestRecord,
  }) as never,
  expectedEnvironment: "lab" as const,
  episodeId: "episode-1",
  stageId: "stage-1",
  activityPackageFingerprint: releaseIndex.activityPackageFingerprint,
  sessionManifestRaws: manifestRaws,
});

describe("V2 Firebase Activity auxiliary release publisher", () => {
  beforeEach(() => {
    objectState.clear();
    firestoreState.clear();
    createCount = 0;
    currentReleaseDrift = false;
    missingChild = false;
    jest.clearAllMocks();
  });

  it("rejects a stale published view before any immutable or pointer write", async () => {
    currentReleaseDrift = true;
    await expect(
      createFirebaseAdminV2ActivityAuxiliaryReleasePublisherV1().publish(input),
    ).rejects.toThrow("v2_firebase_activity_auxiliary_release_publish_invalid");
    expect(storage.createExact).not.toHaveBeenCalled();
    expect(firestore.runTransaction).not.toHaveBeenCalled();
    expect(objectState.size).toBe(0);
    expect(firestoreState.size).toBe(0);
  });

  it("rejects a missing learner child before publishing manifests or pointer", async () => {
    missingChild = true;
    await expect(
      createFirebaseAdminV2ActivityAuxiliaryReleasePublisherV1().publish(input),
    ).rejects.toThrow("v2_firebase_activity_auxiliary_release_publish_invalid");
    expect(storage.createExact).not.toHaveBeenCalled();
    expect(firestore.runTransaction).not.toHaveBeenCalled();
  });

  it("persists 12 manifests and the index before one root-last pointer", async () => {
    const publisher =
      createFirebaseAdminV2ActivityAuxiliaryReleasePublisherV1();
    await expect(publisher.publish(input)).resolves.toBe(releaseHandle);
    expect(objectState.size).toBe(13);
    expect(firestoreState.size).toBe(1);
    expect(createCount).toBe(13);
  });

  it("exact replay performs no immutable or Firestore create", async () => {
    const publisher =
      createFirebaseAdminV2ActivityAuxiliaryReleasePublisherV1();
    await publisher.publish(input);
    const storageCreates = storage.createExact.mock.calls.length;
    const pointerCreates = firestoreState.size;
    const totalCreates = createCount;
    await expect(publisher.publish(input)).resolves.toBe(releaseHandle);
    expect(storage.createExact.mock.calls).toHaveLength(storageCreates);
    expect(firestoreState.size).toBe(pointerCreates);
    expect(createCount).toBe(totalCreates);
  });

  it("a conflicting pointer fails closed after immutable children", async () => {
    firestoreState.set(
      "content_v2_activity_auxiliary_release_pointers/pointer",
      canonicalJsonV1({ conflict: true }),
    );
    await expect(
      createFirebaseAdminV2ActivityAuxiliaryReleasePublisherV1().publish(input),
    ).rejects.toThrow("v2_firebase_activity_auxiliary_release_publish_invalid");
    expect(objectState.size).toBe(13);
    expect(firestoreState.size).toBe(1);
  });
});
