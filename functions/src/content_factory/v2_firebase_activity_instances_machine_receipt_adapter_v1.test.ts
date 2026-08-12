import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  createFirebaseAdminV2ActivityInstancesMachineReceiptAdapterV1,
  getV2FirebaseActivityInstancesMachineReceiptSummaryV1,
  isV2FirebaseActivityInstancesMachineReceiptHandleV1,
} from "./v2_firebase_activity_instances_machine_receipt_adapter_v1";

const h = (value: unknown) => hashCanonicalBody(value);
const plan = Object.freeze({ planFingerprint: h("plan") });
const validationHandle = Object.freeze({ kind: "validation-handle" });
const baseSummary = Object.freeze({
  planFingerprint: plan.planFingerprint,
  courseContractFingerprint: h("course"),
  workspaceFingerprint: h("workspace"),
  stageId: "stage-activity",
  episodeId: "episode-1",
  candidateFingerprint: h("candidate"),
  bodySchemaVersion: "v2-activity-instances-package-root.v2",
  bodyFingerprint: h("body"),
  packageFingerprint: h("package"),
  candidateCapabilitySnapshotFingerprint: h("capability"),
  repositoryOriginReceiptFingerprint: h("origin"),
  repositoryObservationFingerprint: h("observation"),
  outerReceiptFingerprint: h("outer"),
  committedManifestFingerprint: h("d2-manifest"),
  committedOperationFingerprint: h("d2-operation"),
  permitAggregateFingerprint: h("permits"),
  childReadbackAggregateFingerprint: h("readback"),
  storageReadbackFingerprint: h("storage-readback"),
  childObjectCount: 48 as const,
  childTotalByteSize: 4800,
  pureValidationResultFingerprint: h("pure-result"),
  validatedSessionCount: 12 as const,
  outcome: "eligible_for_human_review_only" as const,
});
const state = {
  blocked: false,
  failManifestCreateOnce: false,
  tamperDownloadAt: null as number | null,
  downloadCount: 0,
  firestoreTransactionCount: 0,
};
const blockedSummary = Object.freeze({
  ...baseSummary,
  packageFingerprint: null,
  candidateCapabilitySnapshotFingerprint: null,
  permitAggregateFingerprint: null,
  childReadbackAggregateFingerprint: null,
  storageReadbackFingerprint: null,
  childObjectCount: null,
  childTotalByteSize: null,
  validatedSessionCount: null,
  outcome: "blocked" as const,
});

function validatorSummary() {
  return state.blocked ? blockedSummary : baseSummary;
}

function pureResult() {
  const summary = validatorSummary();
  return Object.freeze({
    validatorProfile: Object.freeze({
      id: "learning-v2-activity-instances-validator",
      version: 1,
      rulesFingerprint: h("rules"),
    }),
    checkedRuleCodes: Object.freeze([
      "activity_authority_ceiling",
      "activity_candidate_body_binding",
    ]),
    blockingIssueCodes: state.blocked
      ? Object.freeze(["activity_candidate_body_invalid"])
      : Object.freeze([]),
    resultFingerprint: summary.pureValidationResultFingerprint,
    outcome: summary.outcome,
  });
}

const getValidatorSummary = jest.fn((handle: unknown) => {
  if (handle !== validationHandle) throw new Error("test_validation_invalid");
  return validatorSummary();
});
const resolveValidatorMaterial = jest.fn(
  (input: { handle: unknown; plan: unknown }) => {
    if (input.handle !== validationHandle || input.plan !== plan)
      throw new Error("test_validation_resolve_invalid");
    return Object.freeze({
      plan,
      summary: validatorSummary(),
      pureValidationResult: pureResult(),
    });
  },
);

jest.mock("./v2_firebase_activity_instances_validator_adapter_v1", () => ({
  getV2FirebaseActivityInstancesValidatorSummaryV1: (handle: unknown) =>
    getValidatorSummary(handle),
  resolveV2FirebaseActivityInstancesValidatorResultMaterialV1: (input: {
    handle: unknown;
    plan: unknown;
  }) => resolveValidatorMaterial(input),
}));

type Stored = {
  bytes: Uint8Array;
  metadata: {
    generation: string;
    byteSize: number;
    contentType: "application/json; charset=utf-8";
    contentHash: string;
  };
};
const objects = new Map<string, Stored>();
const documents = new Map<string, string>();
let nextGeneration = 1;
const storageCreate = jest.fn(
  async (input: {
    objectPath: string;
    bytes: Uint8Array;
    contentType: "application/json; charset=utf-8";
    contentHash: string;
  }) => {
    if (objects.has(input.objectPath))
      return { kind: "precondition_failed" as const };
    const metadata = Object.freeze({
      generation: String(nextGeneration++),
      byteSize: input.bytes.byteLength,
      contentType: input.contentType,
      contentHash: input.contentHash,
    });
    objects.set(input.objectPath, {
      bytes: new Uint8Array(input.bytes),
      metadata,
    });
    return { kind: "created" as const, metadata };
  },
);
const firestoreCreate = jest.fn(
  async (documentPath: string, canonicalRaw: string) => {
    if (state.failManifestCreateOnce) {
      state.failManifestCreateOnce = false;
      throw new Error("test_manifest_create_crash");
    }
    if (documents.has(documentPath)) throw new Error("test_document_exists");
    documents.set(documentPath, canonicalRaw);
  },
);
const storage = {
  readMetadataExact: jest.fn(
    async (objectPath: string) => objects.get(objectPath)?.metadata ?? null,
  ),
  createExact: storageCreate,
  downloadGenerationExact: jest.fn(
    async (input: { objectPath: string; ifGenerationMatch: string }) => {
      const stored = objects.get(input.objectPath);
      if (!stored) return { kind: "not_found" as const };
      if (stored.metadata.generation !== input.ifGenerationMatch)
        return { kind: "generation_mismatch" as const };
      state.downloadCount += 1;
      const bytes = new Uint8Array(stored.bytes);
      if (state.tamperDownloadAt === state.downloadCount) bytes[0] ^= 1;
      return { kind: "downloaded" as const, bytes };
    },
  ),
  quarantineConflict: jest.fn(async () => undefined),
};
const firestore = {
  runTransaction: jest.fn(
    async <T>(
      body: (transaction: {
        readExact(
          path: string,
        ): Promise<{ exists: false } | { exists: true; raw: string }>;
        createExact(path: string, raw: string): Promise<void>;
        compareAndSetExact(): Promise<void>;
      }) => Promise<T>,
    ) => {
      state.firestoreTransactionCount += 1;
      return body({
        readExact: async (path) => {
          const raw = documents.get(path);
          return raw === undefined
            ? { exists: false as const }
            : { exists: true as const, raw };
        },
        createExact: firestoreCreate,
        compareAndSetExact: async () => undefined,
      });
    },
  ),
};
const createIo = jest.fn(() => ({ storage, firestore }));

jest.mock("./v2_firebase_admin_repository_io_v1", () => ({
  createV2FirebaseAdminRepositoryIoV1: () => createIo(),
}));

describe("Firebase Activity Instances durable machine receipt adapter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    objects.clear();
    documents.clear();
    nextGeneration = 1;
    state.blocked = false;
    state.failManifestCreateOnce = false;
    state.tamperDownloadAt = null;
    state.downloadCount = 0;
    state.firestoreTransactionCount = 0;
  });

  it("persists, transactionally commits, cold replays, and mints an eligible private handle", async () => {
    expect(
      createFirebaseAdminV2ActivityInstancesMachineReceiptAdapterV1.length,
    ).toBe(0);
    const handle =
      await createFirebaseAdminV2ActivityInstancesMachineReceiptAdapterV1().commitMachineReceipt(
        { plan: plan as never, validationHandle: validationHandle as never },
      );
    expect(isV2FirebaseActivityInstancesMachineReceiptHandleV1(handle)).toBe(
      true,
    );
    const summary =
      getV2FirebaseActivityInstancesMachineReceiptSummaryV1(handle);
    expect(summary).toMatchObject({
      planFingerprint: plan.planFingerprint,
      candidateFingerprint: baseSummary.candidateFingerprint,
      outcome: "eligible_for_human_review_only",
      repositoryOriginAuthority: "authenticated_repository_snapshot_only",
      dependencyResolutionAuthority:
        "authenticated_repository_stage_subset_only",
      artifactStorageAuthority: "firebase_admin_generation_pinned_readback",
      durableReceiptStorageAuthority:
        "firebase_admin_generation_pinned_readback",
      durableCommitAuthority: "firebase_admin_transaction_exact_readback",
      machineValidationAuthority:
        "deterministic_activity_instances_structural_semantic_checks_only",
      storedReceiptAuthority: "none",
      humanReviewAuthority: "none",
      publicationAuthority: "none",
      releaseAuthority: false,
    });
    expect(summary.machineReceiptFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(storageCreate).toHaveBeenCalledTimes(1);
    expect(firestoreCreate).toHaveBeenCalledTimes(1);
    expect(state.firestoreTransactionCount).toBe(2);
    expect(
      isV2FirebaseActivityInstancesMachineReceiptHandleV1({ ...handle }),
    ).toBe(false);
    expect(() =>
      getV2FirebaseActivityInstancesMachineReceiptSummaryV1({
        ...handle,
      } as never),
    ).toThrow("v2_firebase_activity_instances_machine_receipt_handle_invalid");
  });

  it("replays the identical receipt with zero immutable or manifest writes", async () => {
    await createFirebaseAdminV2ActivityInstancesMachineReceiptAdapterV1().commitMachineReceipt(
      { plan: plan as never, validationHandle: validationHandle as never },
    );
    const storageWrites = storageCreate.mock.calls.length;
    const firestoreWrites = firestoreCreate.mock.calls.length;
    const handle =
      await createFirebaseAdminV2ActivityInstancesMachineReceiptAdapterV1().commitMachineReceipt(
        { plan: plan as never, validationHandle: validationHandle as never },
      );
    expect(storageCreate).toHaveBeenCalledTimes(storageWrites);
    expect(firestoreCreate).toHaveBeenCalledTimes(firestoreWrites);
    expect(
      getV2FirebaseActivityInstancesMachineReceiptSummaryV1(handle).outcome,
    ).toBe("eligible_for_human_review_only");
  });

  it("recovers from an orphan receipt after a crash before the manifest create", async () => {
    state.failManifestCreateOnce = true;
    await expect(
      createFirebaseAdminV2ActivityInstancesMachineReceiptAdapterV1().commitMachineReceipt(
        { plan: plan as never, validationHandle: validationHandle as never },
      ),
    ).rejects.toThrow("test_manifest_create_crash");
    expect(storageCreate).toHaveBeenCalledTimes(1);
    expect(documents.size).toBe(0);
    const handle =
      await createFirebaseAdminV2ActivityInstancesMachineReceiptAdapterV1().commitMachineReceipt(
        { plan: plan as never, validationHandle: validationHandle as never },
      );
    expect(isV2FirebaseActivityInstancesMachineReceiptHandleV1(handle)).toBe(
      true,
    );
    expect(storageCreate).toHaveBeenCalledTimes(1);
    expect(firestoreCreate).toHaveBeenCalledTimes(2);
  });

  it("persists a blocked receipt without claiming child storage authority", async () => {
    state.blocked = true;
    const handle =
      await createFirebaseAdminV2ActivityInstancesMachineReceiptAdapterV1().commitMachineReceipt(
        { plan: plan as never, validationHandle: validationHandle as never },
      );
    expect(
      getV2FirebaseActivityInstancesMachineReceiptSummaryV1(handle),
    ).toMatchObject({
      outcome: "blocked",
      packageFingerprint: null,
      capabilitySnapshotFingerprint: null,
      artifactStorageAuthority: "none",
      durableReceiptStorageAuthority:
        "firebase_admin_generation_pinned_readback",
      humanReviewAuthority: "none",
      releaseAuthority: false,
    });
  });

  it("fails closed on receipt byte tamper and on cloned/cross-plan handles", async () => {
    state.tamperDownloadAt = 2;
    await expect(
      createFirebaseAdminV2ActivityInstancesMachineReceiptAdapterV1().commitMachineReceipt(
        { plan: plan as never, validationHandle: validationHandle as never },
      ),
    ).rejects.toThrow(
      "v2_firebase_activity_instances_machine_receipt_readback_mismatch",
    );
    await expect(
      createFirebaseAdminV2ActivityInstancesMachineReceiptAdapterV1().commitMachineReceipt(
        {
          plan: plan as never,
          validationHandle: { ...validationHandle } as never,
        },
      ),
    ).rejects.toThrow("test_validation_invalid");
    await expect(
      createFirebaseAdminV2ActivityInstancesMachineReceiptAdapterV1().commitMachineReceipt(
        {
          plan: { ...plan } as never,
          validationHandle: validationHandle as never,
        },
      ),
    ).rejects.toThrow("test_validation_resolve_invalid");
  });

  it("rejects a different machine result for the same candidate identity", async () => {
    await createFirebaseAdminV2ActivityInstancesMachineReceiptAdapterV1().commitMachineReceipt(
      { plan: plan as never, validationHandle: validationHandle as never },
    );
    state.blocked = true;
    await expect(
      createFirebaseAdminV2ActivityInstancesMachineReceiptAdapterV1().commitMachineReceipt(
        { plan: plan as never, validationHandle: validationHandle as never },
      ),
    ).rejects.toThrow(
      "v2_firebase_activity_instances_machine_manifest_conflict",
    );
  });

  it("stores canonical authority-none receipt bytes", async () => {
    await createFirebaseAdminV2ActivityInstancesMachineReceiptAdapterV1().commitMachineReceipt(
      { plan: plan as never, validationHandle: validationHandle as never },
    );
    const stored = [...objects.values()][0]!;
    const receipt = JSON.parse(new TextDecoder().decode(stored.bytes));
    expect(canonicalJsonV1(receipt)).toBe(
      new TextDecoder().decode(stored.bytes),
    );
    expect(receipt).toMatchObject({
      repositoryOriginAuthority: "none",
      dependencyResolutionAuthority: "none",
      storageAuthority: "none",
      machineValidationAuthority: "none",
      humanReviewAuthority: "none",
      publicationAuthority: "none",
      releaseAuthority: false,
    });
  });
});
