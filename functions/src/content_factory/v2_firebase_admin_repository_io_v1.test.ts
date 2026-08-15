import { createHash } from "node:crypto";
import {
  canonicalJsonV1,
  sha256Utf8,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  v2LanguageProfileLifecycleDocumentPathV1,
  v2LanguageProfileObjectPathV1,
  v2LanguageProfileVersionDocumentPathV1,
  v2ModeTemplateLifecycleDocumentPathV1,
  v2ModeTemplateVersionDocumentPathV1,
  type V2AuthenticatedRepositoryRequirementV1,
} from "./v2_authenticated_repository_contract_v1";
import { createV2FirebaseAdminRepositoryIoV1 } from "./v2_firebase_admin_repository_io_v1";

const mockState = {
  app: {
    name: "[DEFAULT]",
    options: {
      projectId: "phraseman-ea0b3",
      storageBucket: "phraseman-ea0b3.firebasestorage.app",
    },
  },
  documents: new Map<string, any>(),
  objectMetadata: null as any,
  objectBytes: Buffer.alloc(0),
  fileCalls: [] as { path: string; options: unknown }[],
  nativeCreates: [] as unknown[],
  nativeUpdates: [] as unknown[],
};

const mockDb = {
  doc: (path: string) => ({ path }),
  getAll: jest.fn(async (...refs: { path: string }[]) =>
    refs.map((ref) => mockState.documents.get(ref.path)),
  ),
  runTransaction: jest.fn(async (body: (transaction: any) => Promise<any>) =>
    body({
      get: async (ref: { path: string }) =>
        mockState.documents.get(ref.path) ?? {
          exists: false,
          ref,
          data: () => undefined,
        },
      create: (...args: unknown[]) => mockState.nativeCreates.push(args),
      update: (...args: unknown[]) => mockState.nativeUpdates.push(args),
    }),
  ),
};

const mockBucket = {
  name: "phraseman-ea0b3.firebasestorage.app",
  file: jest.fn((path: string, options?: unknown) => {
    mockState.fileCalls.push({ path, options });
    return {
      getMetadata: async () => [mockState.objectMetadata],
      download: async () => [Buffer.from(mockState.objectBytes)],
      save: jest.fn(),
    };
  }),
};

jest.mock("firebase-admin", () => ({
  app: jest.fn(() => mockState.app),
  firestore: jest.fn(() => mockDb),
  storage: jest.fn(() => ({
    bucket: jest.fn(() => mockBucket),
  })),
}));

const objectRaw = canonicalJsonV1({
  profileId: "english-core",
  schemaVersion: "test-language-profile.v1",
});
const requirement: V2AuthenticatedRepositoryRequirementV1 = Object.freeze({
  dependencyType: "language_profile",
  profileId: "english-core",
  version: 1,
  contentHash: sha256Utf8(objectRaw),
});
const versionPath = v2LanguageProfileVersionDocumentPathV1("english-core", 1);
const lifecyclePath = v2LanguageProfileLifecycleDocumentPathV1(
  "english-core",
  1,
);
const objectPath = v2LanguageProfileObjectPathV1(
  "english-core",
  1,
  requirement.contentHash,
);
const templateRequirement: V2AuthenticatedRepositoryRequirementV1 =
  Object.freeze({
    dependencyType: "published_template",
    templateId: "template-a",
    version: 1,
    contentHash: sha256Utf8(canonicalJsonV1({ templateId: "template-a" })),
  });
const templateVersionPath = v2ModeTemplateVersionDocumentPathV1(
  "template-a",
  1,
);
const templateLifecyclePath = v2ModeTemplateLifecycleDocumentPathV1(
  "template-a",
  1,
);
const time = Object.freeze({ seconds: 1_800_000_000, nanoseconds: 123 });

function snapshot(path: string, data: Record<string, unknown>) {
  return {
    exists: true,
    ref: { path },
    readTime: time,
    updateTime: time,
    data: () => data,
  };
}

describe("V2 Firebase Admin repository low-level IO", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState.fileCalls.length = 0;
    mockState.nativeCreates.length = 0;
    mockState.nativeUpdates.length = 0;
    mockState.app.name = "[DEFAULT]";
    mockState.app.options.projectId = "phraseman-ea0b3";
    mockState.app.options.storageBucket = "phraseman-ea0b3.firebasestorage.app";
    mockBucket.name = "phraseman-ea0b3.firebasestorage.app";
    mockState.documents.clear();
    mockState.documents.set(
      versionPath,
      snapshot(versionPath, { record: "value" }),
    );
    mockState.documents.set(
      lifecyclePath,
      snapshot(lifecyclePath, { lifecycle: "published" }),
    );
    mockState.documents.set(
      templateVersionPath,
      snapshot(templateVersionPath, { template: "value" }),
    );
    mockState.documents.set(
      templateLifecyclePath,
      snapshot(templateLifecyclePath, { lifecycle: "published" }),
    );
    mockState.objectBytes = Buffer.from(objectRaw);
    mockState.objectMetadata = {
      generation: "123",
      size: String(mockState.objectBytes.byteLength),
      contentType: "application/json; charset=utf-8",
      metadata: { contentHash: requirement.contentHash },
    };
    for (const key of [
      "FUNCTIONS_EMULATOR",
      "FIRESTORE_EMULATOR_HOST",
      "STORAGE_EMULATOR_HOST",
      "FIREBASE_STORAGE_EMULATOR_HOST",
      "FIREBASE_EMULATOR_HUB",
    ])
      delete process.env[key];
  });

  it("acquires the exact default namespace and reads one coherent head pair", async () => {
    const io = createV2FirebaseAdminRepositoryIoV1();
    expect(Object.keys(io).sort()).toEqual([
      "firestore",
      "readCanonicalDocumentExact",
      "readCoherentHeadSnapshot",
      "readCoherentVoiceProfileHeadSnapshot",
      "readRequirementObjectGenerationExact",
      "readVoiceProfileObjectGenerationExact",
      "storage",
    ]);
    const coherent = await io.readCoherentHeadSnapshot([
      requirement,
      templateRequirement,
    ]);
    expect(coherent.readTime).toEqual({
      seconds: "1800000000",
      nanoseconds: 123,
    });
    expect(new TextDecoder().decode(coherent.entries[0]!.recordBytes)).toBe(
      canonicalJsonV1({ record: "value" }),
    );
    expect(coherent.entries[0]).toMatchObject({
      versionDocumentPath: versionPath,
      lifecycleDocumentPath: lifecyclePath,
    });
    expect(coherent.entries[1]).toMatchObject({
      versionDocumentPath: templateVersionPath,
      lifecycleDocumentPath: templateLifecyclePath,
    });
  });

  it("reads one exact direct-key document with authenticated snapshot times", async () => {
    const documentPath = "content_v2_season_release_pointers/pointer-1";
    mockState.documents.set(
      documentPath,
      snapshot(documentPath, { state: "internal", revision: 1 }),
    );
    const io = createV2FirebaseAdminRepositoryIoV1();
    await expect(
      io.readCanonicalDocumentExact({
        documentPath,
        maximumBytes: 32 * 1024,
      }),
    ).resolves.toEqual({
      documentPath,
      canonicalRaw: canonicalJsonV1({ state: "internal", revision: 1 }),
      readTime: { seconds: "1800000000", nanoseconds: 123 },
      updateTime: { seconds: "1800000000", nanoseconds: 123 },
    });
    await expect(
      io.readCanonicalDocumentExact({
        documentPath: "content_v2_season_release_pointers/missing",
        maximumBytes: 32 * 1024,
      }),
    ).rejects.toThrow("v2_firebase_admin_repository_document_read_missing");
  });

  it("rejects a getAll result whose snapshot read times are not coherent", async () => {
    const drifted = {
      ...snapshot(templateLifecyclePath, { lifecycle: "published" }),
      readTime: { seconds: Number(time.seconds) + 1, nanoseconds: 0 },
    };
    mockState.documents.set(templateLifecyclePath, drifted);
    const io = createV2FirebaseAdminRepositoryIoV1();
    await expect(
      io.readCoherentHeadSnapshot([requirement, templateRequirement]),
    ).rejects.toThrow("v2_firebase_admin_repository_read_time_incoherent");
  });

  it("generation-pins an object after metadata size/hash preflight", async () => {
    const io = createV2FirebaseAdminRepositoryIoV1();
    const result = await io.readRequirementObjectGenerationExact({
      requirement,
      objectGeneration: "123",
      declaredByteSize: mockState.objectBytes.byteLength,
      maximumBytes: 128 * 1024,
    });
    expect(result).toMatchObject({
      objectPath,
      objectGeneration: "123",
      contentHash: requirement.contentHash,
    });
    expect(mockState.fileCalls.at(-1)).toEqual({
      path: objectPath,
      options: { generation: "123" },
    });

    mockState.objectMetadata = {
      ...mockState.objectMetadata,
      generation: "124",
    };
    await expect(
      io.readRequirementObjectGenerationExact({
        requirement,
        objectGeneration: "123",
        declaredByteSize: mockState.objectBytes.byteLength,
        maximumBytes: 128 * 1024,
      }),
    ).rejects.toThrow("v2_firebase_admin_repository_object_metadata_mismatch");
  });

  it("adapts the exact transaction state document without authority", async () => {
    const io = createV2FirebaseAdminRepositoryIoV1();
    const result = await io.firestore.runTransaction(async (transaction) => {
      expect(
        await transaction.readExact("content_v2_repository_auth/missing"),
      ).toEqual({
        exists: false,
      });
      await transaction.createExact(
        "content_v2_repository_auth/missing",
        canonicalJsonV1({ state: "claiming" }),
      );
      return "done";
    });
    expect(result).toBe("done");
    expect(mockState.nativeCreates).toHaveLength(1);
  });

  it("fails a compare-and-set when the transaction read revision drifted", async () => {
    const documentPath = "content_v2_repository_auth/plan--request";
    mockState.documents.set(
      documentPath,
      snapshot(documentPath, {
        canonicalRaw: canonicalJsonV1({
          operationRevision: 2,
          operationFingerprint: sha256Utf8("current-operation"),
        }),
      }),
    );
    const io = createV2FirebaseAdminRepositoryIoV1();
    await expect(
      io.firestore.runTransaction(async (transaction) => {
        await transaction.readExact(documentPath);
        await transaction.compareAndSetExact(
          documentPath,
          {
            operationRevision: 1,
            operationFingerprint: sha256Utf8("stale-operation"),
          },
          canonicalJsonV1({ next: true }),
        );
      }),
    ).rejects.toThrow("v2_firebase_admin_repository_cas_conflict");
    expect(mockState.nativeUpdates).toHaveLength(0);
  });

  it("rejects emulator and wrong default-app coordinates before IO", () => {
    process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
    expect(() => createV2FirebaseAdminRepositoryIoV1()).toThrow(
      "v2_firebase_repository_trust_root_invalid",
    );
    delete process.env.FIRESTORE_EMULATOR_HOST;
    mockState.app.options.projectId = "wrong-project";
    expect(() => createV2FirebaseAdminRepositoryIoV1()).toThrow(
      "v2_firebase_admin_repository_app_invalid",
    );
    mockState.app.options.projectId = "phraseman-ea0b3";
    mockBucket.name = "wrong-bucket";
    expect(() => createV2FirebaseAdminRepositoryIoV1()).toThrow(
      "v2_firebase_admin_repository_bucket_invalid",
    );
    expect(mockDb.getAll).not.toHaveBeenCalled();
  });

  it("rejects oversized metadata before any generation download", async () => {
    const io = createV2FirebaseAdminRepositoryIoV1();
    mockState.objectMetadata = {
      ...mockState.objectMetadata,
      size: String(128 * 1024 + 1),
    };
    await expect(
      io.readRequirementObjectGenerationExact({
        requirement,
        objectGeneration: "123",
        declaredByteSize: 128 * 1024,
        maximumBytes: 128 * 1024,
      }),
    ).rejects.toThrow("v2_firebase_admin_repository_object_metadata_mismatch");
    expect(mockState.fileCalls).toEqual([
      { path: objectPath, options: undefined },
    ]);
  });

  it("fails closed on object byte tampering and logs no body", async () => {
    const io = createV2FirebaseAdminRepositoryIoV1();
    mockState.objectBytes = Buffer.from(
      canonicalJsonV1({ profileId: "tampered" }),
    );
    await expect(
      io.readRequirementObjectGenerationExact({
        requirement,
        objectGeneration: "123",
        declaredByteSize: Number(mockState.objectMetadata.size),
        maximumBytes: 128 * 1024,
      }),
    ).rejects.toThrow("v2_firebase_admin_repository_object_readback_mismatch");
    expect(createHash("sha256").update(objectRaw).digest("hex")).toBe(
      requirement.contentHash,
    );
  });
});
