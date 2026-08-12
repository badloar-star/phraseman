import { createEmptyOwnerRepositoryCourseManifest } from "../modules/learning-v2/progress/owner_repository_course_manifest";
import {
  WALLET_SUBUNITS_PER_STAR,
  createWalletAuthorizedOperation,
  deriveWalletSemanticSubjectFingerprint,
} from "../modules/learning-v2/contracts/wallet";
import { createEmptyOwnerRepositoryEconomicManifest } from "../modules/learning-v2/progress/owner_repository_economic_manifest";
import {
  createOwnerRepository,
  ownerRepositoryRootKey,
  type OwnerRepositoryActiveOwnerFence,
  type OwnerRepositoryBlobRefV1,
  type OwnerRepositoryCasStorage,
} from "../modules/learning-v2/progress/owner_repository";
import {
  advanceOwnerRepositoryRootV3Generation,
  advanceOwnerRepositoryRootV3GenerationFromV2,
  createOwnerRepositoryRootV3AdoptionBaseFromFreshV2,
  parseOwnerRepositoryWalletCheckpointV1AnchorCandidate,
} from "../modules/learning-v2/progress/owner_repository_root_v3";
import { createGenesisOwnerRepositoryRootV2 } from "../modules/learning-v2/progress/owner_repository_root_v2";
import {
  createOwnerRepositoryWalletCheckpointAccumulator,
  materializeOwnerRepositoryWalletCheckpoint,
} from "../modules/learning-v2/progress/owner_repository_wallet_checkpoint";
import {
  createOwnerRepositoryWalletCheckpointV2AnchorCandidate,
  matchOwnerRepositoryWalletCheckpointV2Projection,
  materializeOwnerRepositoryWalletCheckpointV2,
  isOwnerRepositoryWalletCheckpointV2ProjectionMatched,
  ownerRepositoryWalletCheckpointV2Key,
  parseOwnerRepositoryWalletCheckpointV2,
} from "../modules/learning-v2/progress/owner_repository_wallet_checkpoint_v2";
import { materializeOwnerRepositoryWalletStateBlob } from "../modules/learning-v2/progress/owner_repository_wallet_blob";
import { planOwnerRepositoryWalletCredit } from "../modules/learning-v2/progress/owner_repository_wallet_credit_plan";
import {
  isOwnerRepositoryWalletWindowVerifiedCandidate,
  verifyOwnerRepositoryWalletWindow,
} from "../modules/learning-v2/progress/owner_repository_wallet_window";
import { createWalletState } from "../modules/learning-v2/progress/wallet_reducer";
import {
  canonicalJsonV1,
  sha256Utf8,
} from "../modules/learning-v2/policies/decision_registry";

const accountScopeHash = "aaaaaaaaaaaaaaaa";
const walletOperation = (
  accountGeneration: number,
  walletRevisionBefore: number,
  operationId: string,
  requiredSessionOrdinal = walletRevisionBefore + 1,
) => {
  const sourceReceiptRef = {
    receiptType: "required_session_credit_settlement" as const,
    receiptId: operationId,
    receiptFingerprint: sha256Utf8(operationId),
  };
  return createWalletAuthorizedOperation({
    schemaVersion: "learning-v2-wallet-authorized-operation.v1",
    authority: "trusted_server_boundary",
    operationId,
    semanticSubjectFingerprint: deriveWalletSemanticSubjectFingerprint({
      accountScopeHash,
      operationReason: "initial_required_session",
      sourceReceiptRef,
    }),
    accountScopeHash,
    accountGeneration,
    currency: "access_star",
    kind: "earning_credit",
    amountSubunits: 36 * WALLET_SUBUNITS_PER_STAR,
    earningCategory: "lesson",
    operationReason: "initial_required_session",
    sourceReceiptRef,
    walletRevisionBefore,
    origin: {
      kind: "course",
      courseId: "english-core",
      studyTarget: "en",
      requiredSessionOrdinal,
    },
  });
};
const firstGenerationFiveOperation = () =>
  walletOperation(5, 0, "root-v3-window-credit-1");

const fixture = async () => {
  const wallet = materializeOwnerRepositoryWalletStateBlob(
    createWalletState({ accountScopeHash }),
  );
  const course =
    await createEmptyOwnerRepositoryCourseManifest(accountScopeHash);
  const operation = await createEmptyOwnerRepositoryEconomicManifest(
    accountScopeHash,
    "operation",
  );
  const subject = await createEmptyOwnerRepositoryEconomicManifest(
    accountScopeHash,
    "subject",
  );
  const receipt = await createEmptyOwnerRepositoryEconomicManifest(
    accountScopeHash,
    "receipt",
  );
  const genesis = createGenesisOwnerRepositoryRootV2({
    accountScopeHash,
    currentGeneration: 4,
    walletStateRef: wallet.blob.ref,
    courseStateManifestRef: course.manifestBlob.ref,
    operationIndexManifestRef: operation.manifestBlob.ref,
    subjectIndexManifestRef: subject.manifestBlob.ref,
    receiptIndexManifestRef: receipt.manifestBlob.ref,
  });
  const checkpointV1 = materializeOwnerRepositoryWalletCheckpoint({
    accumulator: createOwnerRepositoryWalletCheckpointAccumulator({
      startingRoot: genesis,
      previousCheckpoint: null,
    }),
    endingWalletStateBlob: wallet.blob,
  });
  const anchorV1 = parseOwnerRepositoryWalletCheckpointV1AnchorCandidate({
    checkpoint: checkpointV1,
    checkpointRoot: genesis.root,
    walletStateBlob: wallet.blob,
  });
  const adoptionBase = createOwnerRepositoryRootV3AdoptionBaseFromFreshV2({
    rootBefore: genesis,
    checkpointAnchorCandidate: anchorV1,
  });
  const closedRoot = advanceOwnerRepositoryRootV3GenerationFromV2({
    adoptionBase,
    targetGeneration: 5,
  });
  const projection = {
    walletStateBlob: wallet.blob,
    courseManifestBlob: course.manifestBlob,
    operationManifestBlob: operation.manifestBlob,
    subjectManifestBlob: subject.manifestBlob,
    receiptManifestBlob: receipt.manifestBlob,
    resolveNode: () => null,
  };
  const checkpointV2 = await materializeOwnerRepositoryWalletCheckpointV2({
    checkpointRoot: closedRoot,
    ...projection,
  });
  return {
    wallet,
    course,
    operation,
    subject,
    receipt,
    genesis,
    checkpointV1,
    closedRoot,
    projection,
    checkpointV2,
  };
};

const storageFor = (value: Awaited<ReturnType<typeof fixture>>) => {
  const storage = new Map<string, string>();
  for (const blob of [
    value.wallet.blob,
    value.course.manifestBlob,
    value.operation.manifestBlob,
    value.subject.manifestBlob,
    value.receipt.manifestBlob,
  ])
    storage.set(blob.ref.blobKey, blob.encoded);
  storage.set(value.checkpointV1.key, value.checkpointV1.encoded);
  storage.set(value.checkpointV2.key, value.checkpointV2.encoded);
  storage.set(
    `learning_v2_owner_repository:v1:${accountScopeHash}:root-history:${value.genesis.root.rootFingerprint}`,
    value.genesis.encoded,
  );
  storage.set(
    `learning_v2_owner_repository:v1:${accountScopeHash}:root-history:${value.closedRoot.root.rootFingerprint}`,
    value.closedRoot.encoded,
  );
  return storage;
};

describe("Learning V2 Owner Repository Checkpoint V2", () => {
  it("materializes exact closed RootV3 bytes and promotes only its projection-matched anchor", async () => {
    const value = await fixture();
    expect(value.checkpointV2.checkpoint).toMatchObject({
      schemaVersion: "learning-v2-owner-repository-wallet-checkpoint.v2",
      checkpointKind: "wallet_credit_only",
      checkpointRootFingerprint: value.closedRoot.root.rootFingerprint,
      currentGeneration: 5,
      repositoryRevision: 1,
      journalSequence: 0,
      windowRootTransitions: 1,
      walletCreditTransitions: 0,
      generationRolloverTransitions: 1,
      operationEntryCount: 0,
      subjectEntryCount: 0,
      receiptEntryCount: 0,
    });
    expect(value.checkpointV2.key).toBe(
      ownerRepositoryWalletCheckpointV2Key(
        accountScopeHash,
        value.closedRoot.root.rootFingerprint,
      ),
    );
    expect(
      isOwnerRepositoryWalletCheckpointV2ProjectionMatched(value.checkpointV2),
    ).toBe(true);
    expect(Object.isFrozen(value.checkpointV2.checkpoint.checkpointRoot)).toBe(
      true,
    );

    const anchor = createOwnerRepositoryWalletCheckpointV2AnchorCandidate({
      checkpoint: value.checkpointV2,
    });
    const successor = advanceOwnerRepositoryRootV3Generation({
      rootBefore: value.closedRoot.root,
      targetGeneration: 6,
      promotedCheckpointAnchor: anchor,
    });
    expect(successor.root.walletCheckpointAnchor).toMatchObject({
      checkpointSchemaVersion:
        "learning-v2-owner-repository-wallet-checkpoint.v2",
      checkpointFingerprint:
        value.checkpointV2.checkpoint.checkpointFingerprint,
      checkpointRootFingerprint: value.closedRoot.root.rootFingerprint,
    });
    expect(successor.root.walletCheckpointLagRootTransitions).toBe(1);
  });

  it("requires projection match again for a storage-parsed candidate", async () => {
    const value = await fixture();
    const parsed = parseOwnerRepositoryWalletCheckpointV2({
      accountScopeHash,
      checkpointRoot: value.closedRoot.root,
      key: value.checkpointV2.key,
      raw: value.checkpointV2.encoded,
      walletStateBlob: value.wallet.blob,
    });
    expect(isOwnerRepositoryWalletCheckpointV2ProjectionMatched(parsed)).toBe(
      false,
    );
    expect(() =>
      createOwnerRepositoryWalletCheckpointV2AnchorCandidate({
        checkpoint: parsed,
      }),
    ).toThrow("owner_repository_wallet_checkpoint_v2_invalid");
    const matched = await matchOwnerRepositoryWalletCheckpointV2Projection({
      checkpoint: parsed,
      ...value.projection,
    });
    expect(isOwnerRepositoryWalletCheckpointV2ProjectionMatched(matched)).toBe(
      true,
    );
    expect(
      createOwnerRepositoryWalletCheckpointV2AnchorCandidate({
        checkpoint: matched,
      }).anchor,
    ).toMatchObject({
      checkpointRootFingerprint: value.closedRoot.root.rootFingerprint,
    });
  });

  it("rejects canonical rehashed coordinate/count tampering and wrong projection families", async () => {
    const value = await fixture();
    const mutations = [
      (copy: any) => {
        copy.currentGeneration += 1;
      },
      (copy: any) => {
        copy.repositoryRevision += 1;
      },
      (copy: any) => {
        copy.windowRootTransitions = 2;
      },
      (copy: any) => {
        copy.generationRolloverTransitions = 0;
      },
      (copy: any) => {
        copy.operationEntryCount = 1;
      },
      (copy: any) => {
        copy.previousCheckpointAnchor.checkpointFingerprint =
          sha256Utf8("wrong");
      },
      (copy: any) => {
        copy.checkpointRootFingerprint = sha256Utf8("wrong-root");
      },
    ];
    for (const mutate of mutations) {
      const copy = JSON.parse(JSON.stringify(value.checkpointV2.checkpoint));
      mutate(copy);
      const body = { ...copy };
      delete body.checkpointFingerprint;
      copy.checkpointFingerprint = sha256Utf8(canonicalJsonV1(body));
      expect(() =>
        parseOwnerRepositoryWalletCheckpointV2({
          accountScopeHash,
          checkpointRoot: value.closedRoot.root,
          key: value.checkpointV2.key,
          raw: canonicalJsonV1(copy),
          walletStateBlob: value.wallet.blob,
        }),
      ).toThrow("owner_repository_wallet_checkpoint_v2_indeterminate");
    }

    const parsed = parseOwnerRepositoryWalletCheckpointV2({
      accountScopeHash,
      checkpointRoot: value.closedRoot.root,
      key: value.checkpointV2.key,
      raw: value.checkpointV2.encoded,
      walletStateBlob: value.wallet.blob,
    });
    await expect(
      matchOwnerRepositoryWalletCheckpointV2Projection({
        checkpoint: parsed,
        ...value.projection,
        operationManifestBlob: value.subject.manifestBlob,
      }),
    ).rejects.toThrow("owner_repository_wallet_checkpoint_v2_indeterminate");
  });

  it("normalizes hostile wrappers, noncanonical bytes, Unicode and key aliases", async () => {
    const value = await fixture();
    let getterRuns = 0;
    const hostile = {
      accountScopeHash,
      checkpointRoot: value.closedRoot.root,
      key: value.checkpointV2.key,
      get raw() {
        getterRuns += 1;
        return value.checkpointV2.encoded;
      },
      walletStateBlob: value.wallet.blob,
    };
    expect(() => parseOwnerRepositoryWalletCheckpointV2(hostile)).toThrow(
      "owner_repository_wallet_checkpoint_v2_indeterminate",
    );
    expect(getterRuns).toBe(0);
    for (const raw of [` ${value.checkpointV2.encoded}`, "\ud800", 1, null]) {
      expect(() =>
        parseOwnerRepositoryWalletCheckpointV2({
          accountScopeHash,
          checkpointRoot: value.closedRoot.root,
          key: value.checkpointV2.key,
          raw,
          walletStateBlob: value.wallet.blob,
        }),
      ).toThrow("owner_repository_wallet_checkpoint_v2_indeterminate");
    }
    expect(() =>
      parseOwnerRepositoryWalletCheckpointV2({
        accountScopeHash,
        checkpointRoot: value.closedRoot.root,
        key: `${value.checkpointV2.key}:alias`,
        raw: value.checkpointV2.encoded,
        walletStateBlob: value.wallet.blob,
      }),
    ).toThrow("owner_repository_wallet_checkpoint_v2_indeterminate");
    expect(() =>
      ownerRepositoryWalletCheckpointV2Key(
        {} as unknown as string,
        value.closedRoot.root.rootFingerprint,
      ),
    ).toThrow("owner_repository_wallet_checkpoint_v2_invalid");
  });

  it("verifies exact bounded V1 and V2 anchor windows without granting CAS authority", async () => {
    const value = await fixture();
    const storage = storageFor(value);
    const v1Window = await verifyOwnerRepositoryWalletWindow({
      accountScopeHash,
      currentRootRaw: value.closedRoot.encoded,
      resolveRaw: (key: string) => storage.get(key) ?? null,
      resolveNode: () => null,
    });
    expect(v1Window).toMatchObject({
      verifiedRootTransitions: 1,
      authority: "window_verified_candidate",
    });
    expect(v1Window.anchorCheckpoint.checkpoint.schemaVersion).toBe(
      "learning-v2-owner-repository-wallet-checkpoint.v1",
    );
    expect(isOwnerRepositoryWalletWindowVerifiedCandidate(v1Window)).toBe(true);
    expect(
      isOwnerRepositoryWalletWindowVerifiedCandidate({ ...v1Window }),
    ).toBe(false);

    const anchorV2 = createOwnerRepositoryWalletCheckpointV2AnchorCandidate({
      checkpoint: value.checkpointV2,
    });
    const successor = advanceOwnerRepositoryRootV3Generation({
      rootBefore: value.closedRoot.root,
      targetGeneration: 6,
      promotedCheckpointAnchor: anchorV2,
    });
    const v2Window = await verifyOwnerRepositoryWalletWindow({
      accountScopeHash,
      currentRootRaw: successor.encoded,
      resolveRaw: (key: string) => storage.get(key) ?? null,
      resolveNode: () => null,
    });
    expect(v2Window.anchorCheckpoint.checkpoint.schemaVersion).toBe(
      "learning-v2-owner-repository-wallet-checkpoint.v2",
    );
    expect(v2Window.currentRoot.root.rootFingerprint).toBe(
      successor.root.rootFingerprint,
    );
    expect(v2Window.verifiedRootTransitions).toBe(1);
  });

  it("fails closed on missing/forked history or checkpoint bytes", async () => {
    const value = await fixture();
    const base = storageFor(value);
    const historyKey = `learning_v2_owner_repository:v1:${accountScopeHash}:root-history:${value.genesis.root.rootFingerprint}`;
    for (const mutate of [
      (storage: Map<string, string>) => storage.delete(historyKey),
      (storage: Map<string, string>) => storage.delete(value.checkpointV1.key),
      (storage: Map<string, string>) =>
        storage.set(historyKey, value.closedRoot.encoded),
      (storage: Map<string, string>) =>
        storage.set(value.checkpointV1.key, `${value.checkpointV1.encoded} `),
    ]) {
      const storage = new Map(base);
      mutate(storage);
      await expect(
        verifyOwnerRepositoryWalletWindow({
          accountScopeHash,
          currentRootRaw: value.closedRoot.encoded,
          resolveRaw: (key: string) => storage.get(key) ?? null,
          resolveNode: () => null,
        }),
      ).rejects.toThrow("owner_repository_wallet_window_indeterminate");
    }
  });

  it("replays the exact wallet and lifetime-index tail before admitting it", async () => {
    const value = await fixture();
    const storage = storageFor(value);
    const anchor = createOwnerRepositoryWalletCheckpointV2AnchorCandidate({
      checkpoint: value.checkpointV2,
    });
    const plan = await planOwnerRepositoryWalletCredit({
      rootBefore: value.closedRoot.root,
      walletStateBeforeBlob: value.wallet.blob,
      operationManifestBlob: value.operation.manifestBlob,
      subjectManifestBlob: value.subject.manifestBlob,
      receiptManifestBlob: value.receipt.manifestBlob,
      authorizedOperation: firstGenerationFiveOperation(),
      promotedCheckpointAnchor: anchor,
      resolveNode: (ref: OwnerRepositoryBlobRefV1) =>
        storage.get(ref.blobKey) ?? null,
    });
    if (
      plan.status !== "applied" ||
      plan.successorRoot.root.schemaVersion !==
        "learning-v2-owner-repository-root.v3"
    )
      throw new Error("expected RootV3 wallet successor");
    for (const blob of plan.immutableBlobs)
      storage.set(blob.ref.blobKey, blob.encoded);
    storage.set(
      `learning_v2_owner_repository:v1:${accountScopeHash}:root-history:${value.closedRoot.root.rootFingerprint}`,
      value.closedRoot.encoded,
    );
    const verified = await verifyOwnerRepositoryWalletWindow({
      accountScopeHash,
      currentRootRaw: plan.successorRoot.encoded,
      resolveRaw: (key: string) => storage.get(key) ?? null,
      resolveNode: (ref: OwnerRepositoryBlobRefV1) =>
        storage.get(ref.blobKey) ?? null,
    });
    expect(verified.currentRoot.root.rootFingerprint).toBe(
      plan.successorRoot.root.rootFingerprint,
    );

    const missingNode = plan.immutableBlobs.find(
      (blob) => blob.ref.kind === "index_radix_node",
    );
    expect(missingNode).toBeDefined();
    storage.delete(missingNode!.ref.blobKey);
    await expect(
      verifyOwnerRepositoryWalletWindow({
        accountScopeHash,
        currentRootRaw: plan.successorRoot.encoded,
        resolveRaw: (key: string) => storage.get(key) ?? null,
        resolveNode: (ref: OwnerRepositoryBlobRefV1) =>
          storage.get(ref.blobKey) ?? null,
      }),
    ).rejects.toThrow("owner_repository_wallet_window_indeterminate");
  });

  it("stages a closed checkpoint and all effect blobs before one RootV3 CAS", async () => {
    const value = await fixture();
    const storage = storageFor(value);
    const rootKey = ownerRepositoryRootKey(accountScopeHash);
    const closedHistoryKey = `learning_v2_owner_repository:v1:${accountScopeHash}:root-history:${value.closedRoot.root.rootFingerprint}`;
    storage.delete(value.checkpointV2.key);
    storage.delete(closedHistoryKey);
    storage.set(rootKey, value.closedRoot.encoded);
    let casCalls = 0;
    let setCalls = 0;
    const fence = { accountScopeHash, generation: 5 } as const;
    const adapter: OwnerRepositoryCasStorage = {
      getItem: async (key) => storage.get(key) ?? null,
      setItem: async (key, encoded) => {
        setCalls += 1;
        storage.set(key, encoded);
      },
      getCurrentOwnerFence: async () => fence,
      compareAndSet: async (key, expected, next, expectedFence) => {
        casCalls += 1;
        if (
          expectedFence.accountScopeHash !== accountScopeHash ||
          expectedFence.generation !== 5
        )
          return "stale_generation";
        if ((storage.get(key) ?? null) !== expected) return "conflict";
        storage.set(key, next);
        return "committed";
      },
    };
    const repository = createOwnerRepository(
      adapter,
      (scope) =>
        scope.accountScopeHash === accountScopeHash && scope.generation === 5,
      { materializeWalletCredit: () => firstGenerationFiveOperation() },
    );
    const result = await repository.commitWalletCreditV3(
      { accountScopeHash, generation: 5 },
      { settlementId: "root-v3-window-credit-1" },
    );
    expect(result).toMatchObject({
      status: "applied",
      snapshot: {
        root: {
          schemaVersion: "learning-v2-owner-repository-root.v3",
          journalSequence: 1,
          repositoryRevision: 2,
          walletCheckpointLagRootTransitions: 1,
          walletCheckpointPromotionRequired: false,
        },
      },
    });
    expect(casCalls).toBe(1);
    expect(setCalls).toBeGreaterThan(2);
    expect(storage.get(value.checkpointV2.key)).toBe(
      value.checkpointV2.encoded,
    );
    expect(storage.get(closedHistoryKey)).toBe(value.closedRoot.encoded);
    expect(storage.get(rootKey)).toBe(canonicalJsonV1(result.snapshot.root));

    const beforeReplaySets = setCalls;
    const beforeReplayCas = casCalls;
    const restarted = createOwnerRepository(
      adapter,
      (scope) =>
        scope.accountScopeHash === accountScopeHash && scope.generation === 5,
      { materializeWalletCredit: () => firstGenerationFiveOperation() },
    );
    await expect(
      restarted.load({ accountScopeHash, generation: 5 }),
    ).resolves.toMatchObject({
      root: { schemaVersion: "learning-v2-owner-repository-root.v3" },
    });
    const replay = await restarted.commitWalletCreditV3(
      { accountScopeHash, generation: 5 },
      { settlementId: "root-v3-window-credit-1" },
    );
    expect(replay.status).toBe("replayed");
    expect(setCalls).toBe(beforeReplaySets);
    expect(casCalls).toBe(beforeReplayCas);
  });

  it("adopts fresh V2 into RootV3 on the first real wallet transition", async () => {
    const value = await fixture();
    const storage = storageFor(value);
    const rootKey = ownerRepositoryRootKey(accountScopeHash);
    const genesisHistoryKey = `learning_v2_owner_repository:v1:${accountScopeHash}:root-history:${value.genesis.root.rootFingerprint}`;
    storage.delete(value.checkpointV1.key);
    storage.delete(genesisHistoryKey);
    storage.set(rootKey, value.genesis.encoded);
    let casCalls = 0;
    const adapter: OwnerRepositoryCasStorage = {
      getItem: async (key) => storage.get(key) ?? null,
      setItem: async (key, encoded) => {
        storage.set(key, encoded);
      },
      getCurrentOwnerFence: async () => ({ accountScopeHash, generation: 4 }),
      compareAndSet: async (key, expected, next) => {
        casCalls += 1;
        if ((storage.get(key) ?? null) !== expected) return "conflict";
        storage.set(key, next);
        return "committed";
      },
    };
    const repository = createOwnerRepository(adapter, () => true, {
      materializeWalletCredit: () =>
        walletOperation(4, 0, "root-v3-fresh-credit-1"),
    });
    const result = await repository.commitWalletCreditV3(
      { accountScopeHash, generation: 4 },
      { settlementId: "root-v3-fresh-credit-1" },
    );
    expect(result).toMatchObject({
      status: "applied",
      snapshot: {
        root: {
          schemaVersion: "learning-v2-owner-repository-root.v3",
          repositoryRevision: 1,
          journalSequence: 1,
          walletCheckpointLagRootTransitions: 1,
        },
      },
    });
    expect(casCalls).toBe(1);
    expect(storage.get(value.checkpointV1.key)).toBe(
      value.checkpointV1.encoded,
    );
    expect(storage.get(genesisHistoryKey)).toBe(value.genesis.encoded);
  });

  it("adopts the exact V1-genesis migration without a schema-only CAS", async () => {
    const storage = new Map<string, string>();
    let activeGeneration = 4;
    let casCalls = 0;
    const adapter: OwnerRepositoryCasStorage = {
      getItem: async (key) => storage.get(key) ?? null,
      setItem: async (key, encoded) => {
        storage.set(key, encoded);
      },
      getCurrentOwnerFence: async () => ({
        accountScopeHash,
        generation: activeGeneration,
      }),
      compareAndSet: async (key, expected, next, fence) => {
        casCalls += 1;
        if (fence.generation !== activeGeneration) return "stale_generation";
        if ((storage.get(key) ?? null) !== expected) return "conflict";
        storage.set(key, next);
        return "committed";
      },
    };
    const repository = createOwnerRepository(
      adapter,
      (scope) => scope.generation === activeGeneration,
      { materializeWalletCredit: () => firstGenerationFiveOperation() },
    );
    const v1 = await repository.initialize({
      accountScopeHash,
      generation: 4,
    });
    expect(v1.root.schemaVersion).toBe("learning-v2-owner-repository-root.v1");
    activeGeneration = 5;
    const migrated = await repository.ensureV2({
      accountScopeHash,
      generation: 5,
    });
    expect(migrated.root).toMatchObject({
      schemaVersion: "learning-v2-owner-repository-root.v2",
      repositoryRevision: 1,
      journalSequence: 0,
    });
    const adopted = await repository.commitWalletCreditV3(
      { accountScopeHash, generation: 5 },
      { settlementId: "root-v3-window-credit-1" },
    );
    expect(adopted).toMatchObject({
      status: "applied",
      snapshot: {
        root: {
          schemaVersion: "learning-v2-owner-repository-root.v3",
          repositoryRevision: 2,
          journalSequence: 1,
          walletCheckpointLagRootTransitions: 1,
        },
      },
    });
    expect(casCalls).toBe(3);
  });

  it("adopts a verified V2 seq1 root on its second wallet transition", async () => {
    const value = await fixture();
    const storage = storageFor(value);
    const rootKey = ownerRepositoryRootKey(accountScopeHash);
    storage.delete(value.checkpointV1.key);
    storage.set(rootKey, value.genesis.encoded);
    let casCalls = 0;
    const adapter: OwnerRepositoryCasStorage = {
      getItem: async (key) => storage.get(key) ?? null,
      setItem: async (key, encoded) => {
        storage.set(key, encoded);
      },
      getCurrentOwnerFence: async () => ({ accountScopeHash, generation: 4 }),
      compareAndSet: async (key, expected, next) => {
        casCalls += 1;
        if ((storage.get(key) ?? null) !== expected) return "conflict";
        storage.set(key, next);
        return "committed";
      },
    };
    const repository = createOwnerRepository(adapter, () => true, {
      materializeWalletCredit: ({ candidate }) =>
        (candidate as { settlementId: string }).settlementId ===
        "root-v3-seq1-credit-1"
          ? walletOperation(4, 0, "root-v3-seq1-credit-1")
          : walletOperation(4, 1, "root-v3-seq1-credit-2"),
    });
    const first = await repository.commitWalletCredit(
      { accountScopeHash, generation: 4 },
      { settlementId: "root-v3-seq1-credit-1" },
    );
    expect(first.snapshot.root.schemaVersion).toBe(
      "learning-v2-owner-repository-root.v2",
    );
    const second = await repository.commitWalletCreditV3(
      { accountScopeHash, generation: 4 },
      { settlementId: "root-v3-seq1-credit-2" },
    );
    expect(second).toMatchObject({
      status: "applied",
      snapshot: {
        root: {
          schemaVersion: "learning-v2-owner-repository-root.v3",
          repositoryRevision: 2,
          journalSequence: 2,
          walletCheckpointLagRootTransitions: 2,
        },
      },
    });
    expect(casCalls).toBe(2);
    expect(storage.get(value.checkpointV1.key)).toBe(
      value.checkpointV1.encoded,
    );
    await expect(
      repository.load({ accountScopeHash, generation: 4 }),
    ).resolves.toMatchObject({
      root: { schemaVersion: "learning-v2-owner-repository-root.v3" },
    });
  });

  it("rolls an admitted nonzero RootV3 history and promotes its checkpoint on the next credit", async () => {
    const value = await fixture();
    const storage = storageFor(value);
    const rootKey = ownerRepositoryRootKey(accountScopeHash);
    storage.set(rootKey, value.genesis.encoded);
    let activeGeneration = 4;
    let casCalls = 0;
    const adapter: OwnerRepositoryCasStorage = {
      getItem: async (key) => storage.get(key) ?? null,
      setItem: async (key, encoded) => {
        storage.set(key, encoded);
      },
      getCurrentOwnerFence: async () => ({
        accountScopeHash,
        generation: activeGeneration,
      }),
      compareAndSet: async (key, expected, next, fence) => {
        casCalls += 1;
        if (fence.generation !== activeGeneration) return "stale_generation";
        if ((storage.get(key) ?? null) !== expected) return "conflict";
        storage.set(key, next);
        return "committed";
      },
    };
    const repository = createOwnerRepository(
      adapter,
      (scope) => scope.generation === activeGeneration,
      {
        materializeWalletCredit: ({ candidate }) =>
          (candidate as { settlementId: string }).settlementId ===
          "root-v3-rollover-credit-1"
            ? walletOperation(4, 0, "root-v3-rollover-credit-1")
            : walletOperation(5, 1, "root-v3-rollover-credit-2"),
      },
    );
    const first = await repository.commitWalletCreditV3(
      { accountScopeHash, generation: 4 },
      { settlementId: "root-v3-rollover-credit-1" },
    );
    expect(first.snapshot.root).toMatchObject({
      schemaVersion: "learning-v2-owner-repository-root.v3",
      currentGeneration: 4,
      repositoryRevision: 1,
      journalSequence: 1,
      walletCheckpointPromotionRequired: false,
    });
    const firstRefs = {
      walletStateRef: first.snapshot.root.walletStateRef,
      operationIndexManifestRef: first.snapshot.root.operationIndexManifestRef,
      subjectIndexManifestRef: first.snapshot.root.subjectIndexManifestRef,
      receiptIndexManifestRef: first.snapshot.root.receiptIndexManifestRef,
      journalHeadRef: first.snapshot.root.journalHeadRef,
    };
    activeGeneration = 5;
    const rolled = await repository.initialize({
      accountScopeHash,
      generation: 5,
    });
    expect(rolled.root).toMatchObject({
      schemaVersion: "learning-v2-owner-repository-root.v3",
      currentGeneration: 5,
      repositoryRevision: 2,
      journalSequence: 1,
      walletCheckpointPromotionRequired: true,
      ...firstRefs,
    });
    const second = await repository.commitWalletCreditV3(
      { accountScopeHash, generation: 5 },
      { settlementId: "root-v3-rollover-credit-2" },
    );
    expect(second.snapshot.root).toMatchObject({
      schemaVersion: "learning-v2-owner-repository-root.v3",
      currentGeneration: 5,
      repositoryRevision: 3,
      journalSequence: 2,
      walletCheckpointLagRootTransitions: 1,
      walletCheckpointPromotionRequired: false,
    });
    expect(second.snapshot.walletState.revision).toBe(2);
    expect(casCalls).toBe(3);
  });

  it("never publishes RootV3 when checkpoint staging fails", async () => {
    const value = await fixture();
    const storage = storageFor(value);
    const rootKey = ownerRepositoryRootKey(accountScopeHash);
    storage.delete(value.checkpointV2.key);
    storage.set(rootKey, value.closedRoot.encoded);
    let casCalls = 0;
    const adapter: OwnerRepositoryCasStorage = {
      getItem: async (key) => storage.get(key) ?? null,
      setItem: async (key, encoded) => {
        if (key === value.checkpointV2.key) throw new Error("disk full");
        storage.set(key, encoded);
      },
      getCurrentOwnerFence: async () => ({ accountScopeHash, generation: 5 }),
      compareAndSet: async () => {
        casCalls += 1;
        return "committed";
      },
    };
    const repository = createOwnerRepository(adapter, () => true, {
      materializeWalletCredit: () => firstGenerationFiveOperation(),
    });
    await expect(
      repository.commitWalletCreditV3(
        { accountScopeHash, generation: 5 },
        { settlementId: "root-v3-window-credit-1" },
      ),
    ).rejects.toThrow("owner_repository_write_failed");
    expect(casCalls).toBe(0);
    expect(storage.get(rootKey)).toBe(value.closedRoot.encoded);
  });

  it("rejects a fake committed RootV3 CAS without durable root bytes", async () => {
    const value = await fixture();
    const storage = storageFor(value);
    const rootKey = ownerRepositoryRootKey(accountScopeHash);
    storage.set(rootKey, value.closedRoot.encoded);
    const adapter: OwnerRepositoryCasStorage = {
      getItem: async (key) => storage.get(key) ?? null,
      setItem: async (key, encoded) => {
        storage.set(key, encoded);
      },
      getCurrentOwnerFence: async () => ({ accountScopeHash, generation: 5 }),
      compareAndSet: async () => "committed",
    };
    const repository = createOwnerRepository(adapter, () => true, {
      materializeWalletCredit: () => firstGenerationFiveOperation(),
    });
    await expect(
      repository.commitWalletCreditV3(
        { accountScopeHash, generation: 5 },
        { settlementId: "root-v3-window-credit-1" },
      ),
    ).rejects.toThrow("owner_repository_commit_indeterminate");
    expect(storage.get(rootKey)).toBe(value.closedRoot.encoded);
  });

  it("admits only the exact fenced durable current root and rejects clones/root races", async () => {
    const value = await fixture();
    const storage = storageFor(value);
    const anchor = createOwnerRepositoryWalletCheckpointV2AnchorCandidate({
      checkpoint: value.checkpointV2,
    });
    const current = advanceOwnerRepositoryRootV3Generation({
      rootBefore: value.closedRoot.root,
      targetGeneration: 6,
      promotedCheckpointAnchor: anchor,
    });
    const rootKey = ownerRepositoryRootKey(accountScopeHash);
    storage.set(rootKey, current.encoded);
    const fence: OwnerRepositoryActiveOwnerFence = {
      accountScopeHash,
      generation: 6,
    };
    const adapter: OwnerRepositoryCasStorage = {
      getItem: async (key) => storage.get(key) ?? null,
      setItem: async (key, encoded) => {
        storage.set(key, encoded);
      },
      getCurrentOwnerFence: async () => fence,
      compareAndSet: async () => "conflict",
    };
    const repository = createOwnerRepository(
      adapter,
      (scope) =>
        scope.accountScopeHash === accountScopeHash && scope.generation === 6,
    );
    const admitted = await repository.admitWalletWindow({
      accountScopeHash,
      generation: 6,
    });
    expect(admitted).toMatchObject({
      currentRootRaw: current.encoded,
      authority: "repository_admitted",
    });
    expect(repository.isWalletWindowAdmitted(admitted)).toBe(true);
    expect(repository.isWalletWindowAdmitted({ ...admitted })).toBe(false);

    const firstAudit = await repository.auditWalletHistoryPage(
      { accountScopeHash, generation: 6 },
      null,
    );
    expect(firstAudit).toMatchObject({
      done: false,
      completedCheckpoints: 0,
      auditedIndexKind: "operation",
    });
    expect(repository.isWalletHistoryAuditCursor(firstAudit.cursor)).toBe(true);
    expect(
      repository.isWalletHistoryAuditCursor({ ...firstAudit.cursor }),
    ).toBe(false);
    const consumedCursor = firstAudit.cursor!;
    let audit = await repository.auditWalletHistoryPage(
      { accountScopeHash, generation: 6 },
      consumedCursor,
    );
    await expect(
      repository.auditWalletHistoryPage(
        { accountScopeHash, generation: 6 },
        consumedCursor,
      ),
    ).rejects.toThrow("owner_repository_history_audit_cursor_invalid");
    const phases = [firstAudit.auditedIndexKind, audit.auditedIndexKind];
    for (let page = 0; !audit.done && page < 8; page += 1) {
      audit = await repository.auditWalletHistoryPage(
        { accountScopeHash, generation: 6 },
        audit.cursor,
      );
      phases.push(audit.auditedIndexKind);
    }
    expect(audit).toMatchObject({ done: true, completedCheckpoints: 2 });
    expect(phases).toEqual([
      "operation",
      "subject",
      "receipt",
      "operation",
      "subject",
      "receipt",
    ]);

    let rootReads = 0;
    const racing = createOwnerRepository(
      {
        ...adapter,
        getItem: async (key) => {
          if (key === rootKey && ++rootReads === 2)
            return value.closedRoot.encoded;
          return storage.get(key) ?? null;
        },
      },
      (scope) =>
        scope.accountScopeHash === accountScopeHash && scope.generation === 6,
    );
    await expect(
      racing.admitWalletWindow({ accountScopeHash, generation: 6 }),
    ).rejects.toThrow("owner_repository_cas_conflict");
  });

  it("never admits after the active-owner fence switches during window reads", async () => {
    const value = await fixture();
    const storage = storageFor(value);
    const anchor = createOwnerRepositoryWalletCheckpointV2AnchorCandidate({
      checkpoint: value.checkpointV2,
    });
    const current = advanceOwnerRepositoryRootV3Generation({
      rootBefore: value.closedRoot.root,
      targetGeneration: 6,
      promotedCheckpointAnchor: anchor,
    });
    storage.set(ownerRepositoryRootKey(accountScopeHash), current.encoded);
    let fenceReads = 0;
    let locallyCurrent = true;
    const adapter: OwnerRepositoryCasStorage = {
      getItem: async (key) => storage.get(key) ?? null,
      setItem: async () => undefined,
      getCurrentOwnerFence: async () => {
        fenceReads += 1;
        if (fenceReads > 3) locallyCurrent = false;
        return { accountScopeHash, generation: locallyCurrent ? 6 : 7 };
      },
      compareAndSet: async () => "conflict",
    };
    const repository = createOwnerRepository(adapter, () => locallyCurrent);
    await expect(
      repository.admitWalletWindow({ accountScopeHash, generation: 6 }),
    ).rejects.toThrow("owner_repository_generation_stale");
  });
});
