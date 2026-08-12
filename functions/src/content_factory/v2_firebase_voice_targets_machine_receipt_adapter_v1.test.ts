import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";

const h = (value: unknown) => hashCanonicalBody(value);
const workspace = Object.freeze({
  planFingerprint: h("plan"),
  workspaceFingerprint: h("workspace"),
  stage: Object.freeze({ stageId: "voice-stage", kind: "v2_voice_targets" }),
});
const candidate = Object.freeze({
  stageId: "voice-stage",
  stageKind: "v2_voice_targets",
  workspaceFingerprint: workspace.workspaceFingerprint,
  candidateFingerprint: h("candidate"),
  bodyFingerprint: h("body"),
});
const packageValue = Object.freeze({
  root: Object.freeze({
    artifactFingerprint: h("package"),
    sessionRefs: Object.freeze(
      Array.from({ length: 12 }, (_, index) =>
        Object.freeze({ sessionOrdinal: index + 1 }),
      ),
    ),
    targetCount: 12,
    wordTargetCount: 24,
    variantCount: 48,
    generationTargetCount: 144,
  }),
  sessionShards: Object.freeze(
    Array.from({ length: 12 }, (_, index) =>
      Object.freeze({
        sessionOrdinal: index + 1,
        sessionFingerprint: h(["session", index + 1]),
      }),
    ),
  ),
});
const validation = Object.freeze({
  candidateFingerprint: candidate.candidateFingerprint,
  stageId: candidate.stageId,
  workspaceFingerprint: workspace.workspaceFingerprint,
  packageFingerprint: packageValue.root.artifactFingerprint,
  validatorRulesFingerprint: h({
    schemaVersion: "v2-voice-targets-validator-rules.v1",
    validatorId: "learning-v2-voice-targets-validator",
    validatorVersion: 1,
    checkedRuleCodes: [
      "v2_voice_targets_exact_12_session_shards",
      "v2_voice_targets_exact_four_ordered_voices",
      "v2_voice_targets_exact_source_derived_package",
      "v2_voice_targets_exact_trusted_binding",
      "v2_voice_targets_full_phrase_and_word_identity_complete",
      "v2_voice_targets_one_voice_index_per_task",
      "v2_voice_targets_public_authority_ceiling",
    ],
    requiredBodySchemaVersion: "v2-voice-targets-artifact.v2",
  }),
  registryFingerprint: h({
    v2_activity_instances: { state: "installed" },
    v2_voice_targets: { state: "not_installed" },
  }),
  resultFingerprint: h("validation"),
  checkedRuleCodes: Object.freeze(["v2_voice_targets_exact_12_session_shards"]),
  blockingIssueCodes: Object.freeze([]),
});

jest.mock("./v2_generation_workspace_contract_v2", () => ({
  V2_STAGE_VALIDATOR_REGISTRY_V2: Object.freeze({
    v2_activity_instances: Object.freeze({ state: "installed" }),
    v2_voice_targets: Object.freeze({ state: "not_installed" }),
  }),
  isV2GenerationStageWorkspaceV2: (value: unknown) => value === workspace,
  isV2CanonicalStageCandidateV2: (value: unknown) => value === candidate,
}));
jest.mock("./v2_voice_targets_package_v2", () => ({
  V2_VOICE_TARGETS_ARTIFACT_SCHEMA_V2: "v2-voice-targets-artifact.v2",
  isV2VoiceTargetsPackageV2: (value: unknown) => value === packageValue,
}));
jest.mock("./v2_voice_targets_validator_v1", () => ({
  V2_VOICE_TARGETS_VALIDATOR_ID_V1: "learning-v2-voice-targets-validator",
  V2_VOICE_TARGETS_VALIDATOR_VERSION_V1: 1,
  V2_VOICE_TARGETS_VALIDATOR_RULES_FINGERPRINT_V1:
    validation.validatorRulesFingerprint,
  isV2VoiceTargetsValidationResultV1: (value: unknown) => value === validation,
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
const state = { tamperDownloadAt: null as number | null, downloads: 0 };
const createExact = jest.fn(
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
const createDocument = jest.fn(async (path: string, raw: string) => {
  if (documents.has(path)) throw new Error("test_document_exists");
  documents.set(path, raw);
});
const storage = {
  readMetadataExact: jest.fn(
    async (path: string) => objects.get(path)?.metadata ?? null,
  ),
  createExact,
  downloadGenerationExact: jest.fn(
    async (input: { objectPath: string; ifGenerationMatch: string }) => {
      const value = objects.get(input.objectPath);
      if (!value) return { kind: "not_found" as const };
      if (value.metadata.generation !== input.ifGenerationMatch)
        return { kind: "generation_mismatch" as const };
      state.downloads += 1;
      const bytes = new Uint8Array(value.bytes);
      if (state.tamperDownloadAt === state.downloads) bytes[0] ^= 1;
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
    ) =>
      body({
        readExact: async (path) => {
          const raw = documents.get(path);
          return raw === undefined
            ? { exists: false as const }
            : { exists: true as const, raw };
        },
        createExact: createDocument,
        compareAndSetExact: async () => undefined,
      }),
  ),
};

jest.mock("./v2_firebase_admin_repository_io_v1", () => ({
  createV2FirebaseAdminRepositoryIoV1: () => ({ storage, firestore }),
}));

// eslint-disable-next-line import/first
import {
  createFirebaseAdminV2VoiceTargetsMachineReceiptAdapterV1,
  getV2FirebaseVoiceTargetsMachineReceiptSummaryV1,
  isV2FirebaseVoiceTargetsMachineReceiptHandleV1,
} from "./v2_firebase_voice_targets_machine_receipt_adapter_v1";

describe("Firebase Voice Targets blocked machine receipt adapter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    objects.clear();
    documents.clear();
    nextGeneration = 1;
    state.tamperDownloadAt = null;
    state.downloads = 0;
  });

  it("persists, commits and cold-reads only a blocked authority-none receipt", async () => {
    expect(
      createFirebaseAdminV2VoiceTargetsMachineReceiptAdapterV1.length,
    ).toBe(0);
    const handle =
      await createFirebaseAdminV2VoiceTargetsMachineReceiptAdapterV1().commitBlockedReceipt(
        {
          workspace: workspace as never,
          candidate: candidate as never,
          packageValue: packageValue as never,
          validation: validation as never,
        },
      );
    expect(isV2FirebaseVoiceTargetsMachineReceiptHandleV1(handle)).toBe(true);
    const summary = getV2FirebaseVoiceTargetsMachineReceiptSummaryV1(handle);
    expect(summary).toMatchObject({
      outcome: "blocked",
      durableReceiptStorageAuthority:
        "firebase_admin_generation_pinned_readback",
      durableCommitAuthority: "firebase_admin_transaction_exact_readback",
      repositoryOriginAuthority: "none",
      profileLifecycleAuthority: "none",
      providerExecutionAuthority: "none",
      audioByteAuthority: "none",
      machineValidationAuthority: "none",
      humanReviewAuthority: "none",
      releaseAuthority: false,
    });
    expect(createExact).toHaveBeenCalledTimes(1);
    expect(createDocument).toHaveBeenCalledTimes(1);
    expect(isV2FirebaseVoiceTargetsMachineReceiptHandleV1({ ...handle })).toBe(
      false,
    );
  });

  it("replays with zero writes and fails closed on readback tamper", async () => {
    const adapter = createFirebaseAdminV2VoiceTargetsMachineReceiptAdapterV1();
    const input = {
      workspace: workspace as never,
      candidate: candidate as never,
      packageValue: packageValue as never,
      validation: validation as never,
    };
    await adapter.commitBlockedReceipt(input);
    await adapter.commitBlockedReceipt(input);
    expect(createExact).toHaveBeenCalledTimes(1);
    expect(createDocument).toHaveBeenCalledTimes(1);

    objects.clear();
    documents.clear();
    nextGeneration = 1;
    jest.clearAllMocks();
    state.downloads = 0;
    state.tamperDownloadAt = 2;
    await expect(adapter.commitBlockedReceipt(input)).rejects.toThrow(
      "v2_firebase_voice_targets_machine_receipt_readback_mismatch",
    );
  });
});
