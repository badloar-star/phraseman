import {
  createWalletAuthorizedOperation,
  deriveWalletSemanticSubjectFingerprint,
} from "../modules/learning-v2/contracts/wallet";
import {
  createOwnerRepository,
  type OwnerRepositoryBlobRefV1,
  type OwnerRepositoryCasStorage,
} from "../modules/learning-v2/progress/owner_repository";
import { createEmptyOwnerRepositoryCourseManifest } from "../modules/learning-v2/progress/owner_repository_course_manifest";
import {
  createOwnerRepositoryEconomicCheckpointV3AnchorCandidate,
  materializeOwnerRepositoryEconomicCheckpointV3,
  ownerRepositoryEconomicCheckpointV3Key,
  parseOwnerRepositoryEconomicCheckpointV3,
} from "../modules/learning-v2/progress/owner_repository_economic_checkpoint_v3";
import {
  parseOwnerRepositoryOperationAliasRecordBlobV2,
  parseOwnerRepositoryWalletCreditEffectRecordBlobV2,
} from "../modules/learning-v2/progress/owner_repository_economic_effect_v2";
import {
  createEmptyOwnerRepositoryEconomicManifest,
  parseOwnerRepositoryEconomicManifestBlob,
  planOwnerRepositoryCanonicalEconomicClosure,
  planOwnerRepositoryOperationAlias,
} from "../modules/learning-v2/progress/owner_repository_economic_manifest";
import type {
  OwnerRepositoryRadixBlob,
  OwnerRepositoryRadixNodeRefV1,
} from "../modules/learning-v2/progress/owner_repository_radix";
import {
  createOwnerRepositoryOperationAliasJournalRecord,
} from "../modules/learning-v2/progress/owner_repository_journal";
import {
  materializeOwnerRepositoryJournalRecordBlob,
} from "../modules/learning-v2/progress/owner_repository_root_fold";
import {
  advanceOwnerRepositoryRootV3Generation,
  bindOwnerRepositoryOperationAliasSuccessorRootV3FromV2,
  createOwnerRepositoryRootV3AdoptionBaseFromV2Seq1,
  parseOwnerRepositoryWalletCheckpointV1AnchorCandidate,
  parseOwnerRepositoryRootV3,
  type OwnerRepositoryRootV3,
} from "../modules/learning-v2/progress/owner_repository_root_v3";
import { createGenesisOwnerRepositoryRootV2 } from "../modules/learning-v2/progress/owner_repository_root_v2";
import {
  createWalletState,
  reduceAuthorizedWalletOperation,
} from "../modules/learning-v2/progress/wallet_reducer";
import { materializeOwnerRepositoryWalletStateBlob } from "../modules/learning-v2/progress/owner_repository_wallet_blob";
import {
  createOwnerRepositoryWalletCheckpointAccumulator,
  materializeOwnerRepositoryWalletCheckpoint,
} from "../modules/learning-v2/progress/owner_repository_wallet_checkpoint";
import { planOwnerRepositoryWalletCredit } from "../modules/learning-v2/progress/owner_repository_wallet_credit_plan";
import { verifyOwnerRepositoryWalletWindow } from "../modules/learning-v2/progress/owner_repository_wallet_window";
import {
  canonicalJsonV1,
  sha256Utf8,
} from "../modules/learning-v2/policies/decision_registry";

const accountScopeHash = "aaaaaaaaaaaaaaaa";
const generation = 4;
const values = new Map<string, string>();
const resolver = (ref: OwnerRepositoryRadixNodeRefV1) =>
  values.get(ref.blobKey) ?? null;
const addBlobs = (blobs: readonly OwnerRepositoryRadixBlob[]) => {
  for (const blob of blobs) values.set(blob.ref.blobKey, blob.encoded);
};
const ref = (
  kind: OwnerRepositoryBlobRefV1["kind"],
  label: string,
): OwnerRepositoryBlobRefV1 => {
  const blobFingerprint = sha256Utf8(label);
  return {
    schemaVersion: "learning-v2-owner-repository-blob-ref.v1",
    kind,
    blobKey: `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${blobFingerprint}`,
    blobFingerprint,
  };
};

const rootMaterialization = (
  body: Omit<OwnerRepositoryRootV3, "rootFingerprint">,
) => parseOwnerRepositoryRootV3({
  ...body,
  rootFingerprint: sha256Utf8(canonicalJsonV1(body)),
}, accountScopeHash);

const canonicalAndAlias = async () => {
  const emptyOperation = await createEmptyOwnerRepositoryEconomicManifest(
    accountScopeHash,
    "operation",
  );
  const emptySubject = await createEmptyOwnerRepositoryEconomicManifest(
    accountScopeHash,
    "subject",
  );
  const emptyReceipt = await createEmptyOwnerRepositoryEconomicManifest(
    accountScopeHash,
    "receipt",
  );
  const walletBefore = createWalletState({ accountScopeHash });
  const sourceReceiptRef = {
    receiptType: "coin_exchange_trade" as const,
    receiptId: "mixed-checkpoint-settlement-1",
    receiptFingerprint: sha256Utf8("mixed-checkpoint-settlement-receipt-1"),
  };
  const operation = createWalletAuthorizedOperation({
    schemaVersion: "learning-v2-wallet-authorized-operation.v1",
    authority: "trusted_server_boundary",
    operationId: "mixed-checkpoint-credit-1",
    semanticSubjectFingerprint: deriveWalletSemanticSubjectFingerprint({
      accountScopeHash,
      operationReason: "coin_exchange",
      sourceReceiptRef,
    }),
    accountScopeHash,
    accountGeneration: generation,
    currency: "access_star",
    walletRevisionBefore: 0,
    kind: "external_credit",
    amountSubunits: 200_000,
    earningCategory: null,
    operationReason: "coin_exchange",
    sourceReceiptRef,
    origin: { kind: "coin_exchange", tradeId: "mixed-checkpoint-settlement-1" },
  });
  const applied = reduceAuthorizedWalletOperation(walletBefore, operation, {
    currentAccountGeneration: generation,
  });
  const canonical = await planOwnerRepositoryCanonicalEconomicClosure({
    accountScopeHash,
    operationManifest: emptyOperation.manifest,
    subjectManifest: emptySubject.manifest,
    receiptManifest: emptyReceipt.manifest,
    operationLedgerEntry: applied.operationLedgerEntry,
    subjectLedgerEntry: applied.subjectLedgerEntry,
    appliedReceipt: applied.appliedReceipt,
    resolveNode: resolver,
  });
  addBlobs(canonical.immutableNodeBlobs);
  const materialized = applied.appliedReceipt.authorizedOperation;
  const {
    semanticFingerprint: _semanticFingerprint,
    operationFingerprint: _operationFingerprint,
    ...unmaterialized
  } = materialized;
  const aliasOperation = createWalletAuthorizedOperation({
    ...unmaterialized,
    operationId: "mixed-checkpoint-alias-1",
    walletRevisionBefore: 1,
  });
  const alias = await planOwnerRepositoryOperationAlias({
    accountScopeHash,
    operationManifest: canonical.operationManifest,
    subjectManifest: canonical.subjectManifest,
    receiptManifest: canonical.receiptManifest,
    authorizedAliasOperation: aliasOperation,
    resolveNode: resolver,
  });
  addBlobs(alias.immutableNodeBlobs);
  return { applied, canonical, alias };
};

describe("Learning V2 owner repository Economic Checkpoint V3", () => {
  beforeEach(() => values.clear());

  it("derives exact credit/alias/repair counters from mixed projections", async () => {
    const { applied, canonical, alias } = await canonicalAndAlias();
    const wallet = materializeOwnerRepositoryWalletStateBlob(applied.state);
    const course = await createEmptyOwnerRepositoryCourseManifest(accountScopeHash);
    const anchorRootFingerprint = sha256Utf8("mixed-checkpoint-anchor-root-0");
    const anchor = {
      schemaVersion: "learning-v2-owner-repository-wallet-checkpoint-anchor.v1" as const,
      checkpointSchemaVersion: "learning-v2-owner-repository-wallet-checkpoint.v1" as const,
      checkpointKind: "wallet_credit_only" as const,
      accountScopeHash,
      checkpointKey: `learning_v2_owner_repository:v1:${accountScopeHash}:wallet-checkpoint:${anchorRootFingerprint}`,
      checkpointRootFingerprint: anchorRootFingerprint,
      checkpointFingerprint: sha256Utf8("mixed-checkpoint-anchor-0"),
      checkpointCurrentGeneration: generation,
      checkpointRepositoryRevision: 0,
      checkpointJournalSequence: 0,
      bootstrapOrigin: "fresh_v2_genesis" as const,
    };
    const root = rootMaterialization({
      schemaVersion: "learning-v2-owner-repository-root.v3",
      accountScopeHash,
      currentGeneration: generation + 1,
      repositoryRevision: 4,
      journalSequence: 3,
      previousRootFingerprint: sha256Utf8("mixed-checkpoint-parent-3"),
      journalHeadRef: ref("journal_record", "mixed-checkpoint-head-3"),
      walletStateRef: wallet.blob.ref,
      courseStateManifestRef: course.manifestBlob.ref,
      operationIndexManifestRef: alias.operationManifestBlob.ref,
      subjectIndexManifestRef: canonical.subjectManifestBlob.ref,
      receiptIndexManifestRef: canonical.receiptManifestBlob.ref,
      walletCheckpointAnchor: anchor,
      walletCheckpointLagRootTransitions: 4,
      walletCheckpointPromotionRequired: true,
    });
    const checkpoint = await materializeOwnerRepositoryEconomicCheckpointV3({
      checkpointRoot: root,
      previousCheckpoint: null,
      walletStateBlob: wallet.blob,
      courseManifestBlob: course.manifestBlob,
      operationManifestBlob: alias.operationManifestBlob,
      subjectManifestBlob: canonical.subjectManifestBlob,
      receiptManifestBlob: canonical.receiptManifestBlob,
      resolveNode: resolver,
    });
    expect(checkpoint.checkpoint).toMatchObject({
      checkpointKind: "economic_mixed",
      journalSequence: 3,
      windowRootTransitions: 4,
      walletCreditTransitions: 1,
      operationAliasTransitions: 1,
      missingIndexRepairTransitions: 1,
      generationRolloverTransitions: 1,
      walletRevision: 1,
      walletCreditCount: 1,
      operationAliasCount: 1,
      missingIndexRepairCount: 1,
      operationEntryCount: 4,
      subjectEntryCount: 1,
      receiptEntryCount: 1,
    });
    expect(checkpoint.key).toBe(ownerRepositoryEconomicCheckpointV3Key(
      accountScopeHash,
      root.root.rootFingerprint,
    ));
    const parsed = await parseOwnerRepositoryEconomicCheckpointV3({
      accountScopeHash,
      checkpointRoot: root.root,
      key: checkpoint.key,
      raw: checkpoint.encoded,
      walletStateBlob: wallet.blob,
      courseManifestBlob: course.manifestBlob,
      operationManifestBlob: alias.operationManifestBlob,
      subjectManifestBlob: canonical.subjectManifestBlob,
      receiptManifestBlob: canonical.receiptManifestBlob,
      resolveNode: resolver,
    });
    expect(parsed).toEqual(checkpoint);
    const checkpointAnchor = createOwnerRepositoryEconomicCheckpointV3AnchorCandidate({
      checkpoint,
    });
    expect(checkpointAnchor).toMatchObject({
      anchor: {
        checkpointSchemaVersion: "learning-v2-owner-repository-economic-checkpoint.v3",
        checkpointKind: "economic_mixed",
        checkpointRootFingerprint: root.root.rootFingerprint,
      },
    });

    const nextRoot = rootMaterialization({
      schemaVersion: "learning-v2-owner-repository-root.v3",
      accountScopeHash,
      currentGeneration: generation + 2,
      repositoryRevision: 5,
      journalSequence: 3,
      previousRootFingerprint: root.root.rootFingerprint,
      journalHeadRef: root.root.journalHeadRef,
      walletStateRef: root.root.walletStateRef,
      courseStateManifestRef: root.root.courseStateManifestRef,
      operationIndexManifestRef: root.root.operationIndexManifestRef,
      subjectIndexManifestRef: root.root.subjectIndexManifestRef,
      receiptIndexManifestRef: root.root.receiptIndexManifestRef,
      walletCheckpointAnchor: checkpointAnchor.anchor,
      walletCheckpointLagRootTransitions: 1,
      walletCheckpointPromotionRequired: true,
    });
    const nextCheckpoint = await materializeOwnerRepositoryEconomicCheckpointV3({
      checkpointRoot: nextRoot,
      previousCheckpoint: checkpoint,
      walletStateBlob: wallet.blob,
      courseManifestBlob: course.manifestBlob,
      operationManifestBlob: alias.operationManifestBlob,
      subjectManifestBlob: canonical.subjectManifestBlob,
      receiptManifestBlob: canonical.receiptManifestBlob,
      resolveNode: resolver,
    });
    expect(nextCheckpoint.checkpoint).toMatchObject({
      walletCreditTransitions: 0,
      operationAliasTransitions: 0,
      missingIndexRepairTransitions: 0,
      generationRolloverTransitions: 1,
      walletCreditCount: 1,
      operationAliasCount: 1,
      missingIndexRepairCount: 1,
    });
  });

  it("rebuilds a durable credit-alias-rollover window and admits its promoted V3 checkpoint", async () => {
    const storage = new Map<string, string>();
    const storeBlob = (blob: { readonly ref: OwnerRepositoryBlobRefV1; readonly encoded: string }) => {
      storage.set(blob.ref.blobKey, blob.encoded);
      values.set(blob.ref.blobKey, blob.encoded);
    };
    const walletBefore = materializeOwnerRepositoryWalletStateBlob(
      createWalletState({ accountScopeHash }),
    );
    const course = await createEmptyOwnerRepositoryCourseManifest(accountScopeHash);
    const emptyOperation = await createEmptyOwnerRepositoryEconomicManifest(
      accountScopeHash,
      "operation",
    );
    const emptySubject = await createEmptyOwnerRepositoryEconomicManifest(
      accountScopeHash,
      "subject",
    );
    const emptyReceipt = await createEmptyOwnerRepositoryEconomicManifest(
      accountScopeHash,
      "receipt",
    );
    for (const blob of [
      walletBefore.blob,
      course.manifestBlob,
      emptyOperation.manifestBlob,
      emptySubject.manifestBlob,
      emptyReceipt.manifestBlob,
    ]) storeBlob(blob);
    const genesis = createGenesisOwnerRepositoryRootV2({
      accountScopeHash,
      currentGeneration: generation,
      walletStateRef: walletBefore.blob.ref,
      courseStateManifestRef: course.manifestBlob.ref,
      operationIndexManifestRef: emptyOperation.manifestBlob.ref,
      subjectIndexManifestRef: emptySubject.manifestBlob.ref,
      receiptIndexManifestRef: emptyReceipt.manifestBlob.ref,
    });
    const checkpointV1 = materializeOwnerRepositoryWalletCheckpoint({
      accumulator: createOwnerRepositoryWalletCheckpointAccumulator({
        startingRoot: genesis,
        previousCheckpoint: null,
      }),
      endingWalletStateBlob: walletBefore.blob,
    });
    storage.set(checkpointV1.key, checkpointV1.encoded);
    const anchorV1 = parseOwnerRepositoryWalletCheckpointV1AnchorCandidate({
      checkpoint: checkpointV1,
      checkpointRoot: genesis.root,
      walletStateBlob: walletBefore.blob,
    });
    const sourceReceiptRef = {
      receiptType: "coin_exchange_trade" as const,
      receiptId: "mixed-window-credit-1",
      receiptFingerprint: sha256Utf8("mixed-window-credit-receipt-1"),
    };
    const operation = createWalletAuthorizedOperation({
      schemaVersion: "learning-v2-wallet-authorized-operation.v1",
      authority: "trusted_server_boundary",
      operationId: "mixed-window-credit-1",
      semanticSubjectFingerprint: deriveWalletSemanticSubjectFingerprint({
        accountScopeHash,
        operationReason: "coin_exchange",
        sourceReceiptRef,
      }),
      accountScopeHash,
      accountGeneration: generation,
      currency: "access_star",
      walletRevisionBefore: 0,
      kind: "external_credit",
      amountSubunits: 300_000,
      earningCategory: null,
      operationReason: "coin_exchange",
      sourceReceiptRef,
      origin: { kind: "coin_exchange", tradeId: "mixed-window-credit-1" },
    });
    const creditPlan = await planOwnerRepositoryWalletCredit({
      rootBefore: genesis.root,
      walletStateBeforeBlob: walletBefore.blob,
      operationManifestBlob: emptyOperation.manifestBlob,
      subjectManifestBlob: emptySubject.manifestBlob,
      receiptManifestBlob: emptyReceipt.manifestBlob,
      authorizedOperation: operation,
      resolveNode: resolver,
    });
    if (creditPlan.status !== "applied" ||
      creditPlan.successorRoot.root.schemaVersion !==
        "learning-v2-owner-repository-root.v2") {
      throw new Error("test_fixture_invalid");
    }
    for (const blob of creditPlan.immutableBlobs) storeBlob(blob);
    const blobFor = (refValue: OwnerRepositoryBlobRefV1) => ({
      ref: refValue,
      encoded: storage.get(refValue.blobKey)!,
    });
    const operationAfter = await parseOwnerRepositoryEconomicManifestBlob({
      accountScopeHash,
      indexKind: "operation",
      ref: creditPlan.successorRoot.root.operationIndexManifestRef,
      raw: storage.get(creditPlan.successorRoot.root.operationIndexManifestRef.blobKey),
      resolveNode: resolver,
    });
    const subjectAfter = await parseOwnerRepositoryEconomicManifestBlob({
      accountScopeHash,
      indexKind: "subject",
      ref: creditPlan.successorRoot.root.subjectIndexManifestRef,
      raw: storage.get(creditPlan.successorRoot.root.subjectIndexManifestRef.blobKey),
      resolveNode: resolver,
    });
    const receiptAfter = await parseOwnerRepositoryEconomicManifestBlob({
      accountScopeHash,
      indexKind: "receipt",
      ref: creditPlan.successorRoot.root.receiptIndexManifestRef,
      raw: storage.get(creditPlan.successorRoot.root.receiptIndexManifestRef.blobKey),
      resolveNode: resolver,
    });
    const materialized = creditPlan.appliedReceipt.authorizedOperation;
    const {
      semanticFingerprint: _semanticFingerprint,
      operationFingerprint: _operationFingerprint,
      ...unmaterialized
    } = materialized;
    const aliasOperation = createWalletAuthorizedOperation({
      ...unmaterialized,
      operationId: "mixed-window-credit-alias-1",
      walletRevisionBefore: 1,
    });
    const aliasPlan = await planOwnerRepositoryOperationAlias({
      accountScopeHash,
      operationManifest: operationAfter.manifest,
      subjectManifest: subjectAfter.manifest,
      receiptManifest: receiptAfter.manifest,
      authorizedAliasOperation: aliasOperation,
      resolveNode: resolver,
    });
    for (const blob of aliasPlan.immutableNodeBlobs) storeBlob(blob);
    storeBlob(aliasPlan.operationManifestBlob);
    const aliasRecord = createOwnerRepositoryOperationAliasJournalRecord({
      accountScopeHash,
      journalSequence: 2,
      repositoryRevisionBefore: creditPlan.successorRoot.root.repositoryRevision,
      rootBeforeFingerprint: creditPlan.successorRoot.root.rootFingerprint,
      previousJournalRecordRef: creditPlan.successorRoot.root.journalHeadRef,
      canonicalEffectJournalRecordRef: creditPlan.journalRecordBlob.ref,
      walletStateRef: creditPlan.successorRoot.root.walletStateRef,
      operationIndexManifestBeforeRef:
        creditPlan.successorRoot.root.operationIndexManifestRef,
      operationIndexManifestAfterRef: aliasPlan.operationManifestBlob.ref,
      subjectIndexManifestRef: creditPlan.successorRoot.root.subjectIndexManifestRef,
      receiptIndexManifestRef: creditPlan.successorRoot.root.receiptIndexManifestRef,
      canonicalEffectRecord: creditPlan.journalRecord,
      authorizedAliasOperation: aliasOperation,
    });
    const aliasBlob = materializeOwnerRepositoryJournalRecordBlob(aliasRecord);
    storeBlob(aliasBlob);
    const adoptionBase = createOwnerRepositoryRootV3AdoptionBaseFromV2Seq1({
      rootBefore: creditPlan.successorRoot,
      parentRoot: genesis,
      parentJournalRecordBlob: creditPlan.journalRecordBlob,
      checkpointAnchorCandidate: anchorV1,
    });
    const aliasRoot = bindOwnerRepositoryOperationAliasSuccessorRootV3FromV2({
      adoptionBase,
      journalRecordBlob: aliasBlob,
    });
    const closedRoot = advanceOwnerRepositoryRootV3Generation({
      rootBefore: aliasRoot.root,
      targetGeneration: generation + 1,
      promotedCheckpointAnchor: null,
    });
    const walletAfter = blobFor(closedRoot.root.walletStateRef);
    const checkpointV3 = await materializeOwnerRepositoryEconomicCheckpointV3({
      checkpointRoot: closedRoot,
      previousCheckpoint: null,
      walletStateBlob: walletAfter,
      courseManifestBlob: course.manifestBlob,
      operationManifestBlob: aliasPlan.operationManifestBlob,
      subjectManifestBlob: subjectAfter.sourceManifestBlob,
      receiptManifestBlob: receiptAfter.sourceManifestBlob,
      resolveNode: resolver,
    });
    storage.set(checkpointV3.key, checkpointV3.encoded);
    const historyKey = (fingerprint: string) =>
      `learning_v2_owner_repository:v1:${accountScopeHash}:root-history:${fingerprint}`;
    storage.set(historyKey(genesis.root.rootFingerprint), genesis.encoded);
    storage.set(
      historyKey(creditPlan.successorRoot.root.rootFingerprint),
      creditPlan.successorRoot.encoded,
    );
    storage.set(historyKey(aliasRoot.root.rootFingerprint), aliasRoot.encoded);
    const resolveRaw = (key: string) => storage.get(key) ?? null;
    const mixedWindow = await verifyOwnerRepositoryWalletWindow({
      accountScopeHash,
      currentRootRaw: closedRoot.encoded,
      resolveRaw,
      resolveNode: (nodeRef: OwnerRepositoryRadixNodeRefV1) => resolveRaw(nodeRef.blobKey),
    });
    expect(mixedWindow).toMatchObject({
      verifiedRootTransitions: 3,
      anchorCheckpoint: {
        checkpoint: {
          schemaVersion: "learning-v2-owner-repository-wallet-checkpoint.v1",
        },
      },
    });

    const promoted = createOwnerRepositoryEconomicCheckpointV3AnchorCandidate({
      checkpoint: checkpointV3,
    });
    const promotedRoot = advanceOwnerRepositoryRootV3Generation({
      rootBefore: closedRoot.root,
      targetGeneration: generation + 2,
      promotedCheckpointAnchor: promoted,
    });
    const rootKey =
      `learning_v2_owner_repository:v1:${accountScopeHash}:root`;
    storage.delete(checkpointV3.key);
    storage.set(rootKey, closedRoot.encoded);
    let casCalls = 0;
    let mixedCheckpointVisibleAtFirstCas = false;
    const adapter: OwnerRepositoryCasStorage = {
      getItem: async (key) => storage.get(key) ?? null,
      setItem: async (key, encoded) => {
        storage.set(key, encoded);
      },
      getCurrentOwnerFence: async () => ({
        accountScopeHash,
        generation: generation + 2,
      }),
      compareAndSet: async (key, expected, next, fence) => {
        casCalls += 1;
        if (casCalls === 1) {
          mixedCheckpointVisibleAtFirstCas =
            storage.get(checkpointV3.key) === checkpointV3.encoded;
        }
        if (fence.accountScopeHash !== accountScopeHash ||
          fence.generation !== generation + 2) return "stale_generation";
        if ((storage.get(key) ?? null) !== expected) return "conflict";
        storage.set(key, next);
        return "committed";
      },
    };
    const repository = createOwnerRepository(adapter, () => true);
    const repositoryPromoted = await repository.initialize({
      accountScopeHash,
      generation: generation + 2,
    });
    expect(repositoryPromoted.root).toEqual(promotedRoot.root);
    expect(casCalls).toBe(1);
    expect(mixedCheckpointVisibleAtFirstCas).toBe(true);
    expect(storage.get(checkpointV3.key)).toBe(checkpointV3.encoded);
    expect(storage.get(historyKey(closedRoot.root.rootFingerprint))).toBe(
      closedRoot.encoded,
    );
    const admitted = await verifyOwnerRepositoryWalletWindow({
      accountScopeHash,
      currentRootRaw: storage.get(rootKey),
      resolveRaw,
      resolveNode: (nodeRef: OwnerRepositoryRadixNodeRefV1) => resolveRaw(nodeRef.blobKey),
    });
    expect(admitted).toMatchObject({
      verifiedRootTransitions: 1,
      anchorCheckpoint: {
        checkpoint: {
          schemaVersion: "learning-v2-owner-repository-economic-checkpoint.v3",
          walletCreditCount: 1,
          operationAliasCount: 1,
          missingIndexRepairCount: 0,
        },
      },
    });

    const nextSourceReceiptRef = {
      receiptType: "coin_exchange_trade" as const,
      receiptId: "mixed-window-credit-2",
      receiptFingerprint: sha256Utf8("mixed-window-credit-receipt-2"),
    };
    const nextOperation = createWalletAuthorizedOperation({
      schemaVersion: "learning-v2-wallet-authorized-operation.v1",
      authority: "trusted_server_boundary",
      operationId: "mixed-window-credit-2",
      semanticSubjectFingerprint: deriveWalletSemanticSubjectFingerprint({
        accountScopeHash,
        operationReason: "coin_exchange",
        sourceReceiptRef: nextSourceReceiptRef,
      }),
      accountScopeHash,
      accountGeneration: generation + 2,
      currency: "access_star",
      walletRevisionBefore: 1,
      kind: "external_credit",
      amountSubunits: 200_000,
      earningCategory: null,
      operationReason: "coin_exchange",
      sourceReceiptRef: nextSourceReceiptRef,
      origin: { kind: "coin_exchange", tradeId: "mixed-window-credit-2" },
    });
    const restarted = createOwnerRepository(adapter, () => true, {
      materializeWalletCredit: () => nextOperation,
    });
    const continued = await restarted.commitWalletCreditV3(
      { accountScopeHash, generation: generation + 2 },
      { settlementId: "mixed-window-credit-2" },
    );
    expect(continued).toMatchObject({
      status: "applied",
      snapshot: {
        root: {
          schemaVersion: "learning-v2-owner-repository-root.v3",
          currentGeneration: generation + 2,
          journalSequence: 3,
          walletCheckpointAnchor: {
            checkpointSchemaVersion:
              "learning-v2-owner-repository-economic-checkpoint.v3",
          },
          walletCheckpointLagRootTransitions: 1,
          walletCheckpointPromotionRequired: false,
        },
        walletState: { revision: 2, balanceSubunits: 500_000 },
      },
    });
    const continuedHead = continued.snapshot.root.journalHeadRef;
    if (continuedHead === null) throw new Error("test_fixture_invalid");
    expect(
      parseOwnerRepositoryWalletCreditEffectRecordBlobV2({
        accountScopeHash,
        ref: continuedHead,
        raw: storage.get(continuedHead.blobKey),
      }).record,
    ).toMatchObject({
      schemaVersion:
        "learning-v2-owner-repository-wallet-credit-effect-record.v2",
      journalSequence: 3,
      operationIndexManifestBeforeRef:
        repositoryPromoted.root.operationIndexManifestRef,
    });
    const casCallsBeforeReplay = casCalls;
    const replayed = await restarted.commitWalletCreditV3(
      { accountScopeHash, generation: generation + 2 },
      { settlementId: "mixed-window-credit-2" },
    );
    expect(replayed).toMatchObject({
      status: "replayed",
      appliedReceipt: continued.appliedReceipt,
      snapshot: { root: continued.snapshot.root },
    });
    expect(casCalls).toBe(casCallsBeforeReplay);

    const {
      semanticFingerprint: _nextSemanticFingerprint,
      operationFingerprint: _nextOperationFingerprint,
      ...aliasInput
    } = nextOperation;
    const durableAliasOperation = createWalletAuthorizedOperation({
      ...aliasInput,
      operationId: "mixed-window-credit-2-alias",
      walletRevisionBefore: 2,
    });
    const aliasRepository = createOwnerRepository(adapter, () => true, {
      materializeWalletCredit: () => durableAliasOperation,
    });
    const aliased = await aliasRepository.commitWalletCreditV3(
      { accountScopeHash, generation: generation + 2 },
      { settlementId: "mixed-window-credit-2-alias" },
    );
    expect(aliased).toMatchObject({
      status: "aliased",
      appliedReceipt: continued.appliedReceipt,
      snapshot: {
        root: {
          journalSequence: 4,
          walletCheckpointLagRootTransitions: 2,
        },
        walletState: { revision: 2, balanceSubunits: 500_000 },
      },
    });
    const aliasHead = aliased.snapshot.root.journalHeadRef;
    if (aliasHead === null) throw new Error("test_fixture_invalid");
    expect(
      parseOwnerRepositoryOperationAliasRecordBlobV2({
        accountScopeHash,
        ref: aliasHead,
        raw: storage.get(aliasHead.blobKey),
      }).record,
    ).toMatchObject({
      schemaVersion: "learning-v2-owner-repository-operation-alias-record.v2",
      aliasValue: {
        ledgerEntry: {
          operationId: durableAliasOperation.operationId,
          operationFingerprint: durableAliasOperation.operationFingerprint,
        },
      },
    });
    const casCallsBeforeAliasReplay = casCalls;
    const aliasReplay = await aliasRepository.commitWalletCreditV3(
      { accountScopeHash, generation: generation + 2 },
      { settlementId: "mixed-window-credit-2-alias" },
    );
    expect(aliasReplay).toMatchObject({
      status: "replayed",
      appliedReceipt: continued.appliedReceipt,
      snapshot: { root: aliased.snapshot.root },
    });
    expect(casCalls).toBe(casCallsBeforeAliasReplay);
    expect(
      storage.get(
        ownerRepositoryEconomicCheckpointV3Key(
          accountScopeHash,
          repositoryPromoted.root.rootFingerprint,
        ),
      ),
    ).toBeDefined();
  });

  it("rejects projection and counter substitutions even after rehash", async () => {
    const { applied, canonical, alias } = await canonicalAndAlias();
    const wallet = materializeOwnerRepositoryWalletStateBlob(applied.state);
    const course = await createEmptyOwnerRepositoryCourseManifest(accountScopeHash);
    const anchorRootFingerprint = sha256Utf8("mixed-checkpoint-tamper-anchor-root");
    const root = rootMaterialization({
      schemaVersion: "learning-v2-owner-repository-root.v3",
      accountScopeHash,
      currentGeneration: generation + 1,
      repositoryRevision: 4,
      journalSequence: 3,
      previousRootFingerprint: sha256Utf8("mixed-checkpoint-tamper-parent"),
      journalHeadRef: ref("journal_record", "mixed-checkpoint-tamper-head"),
      walletStateRef: wallet.blob.ref,
      courseStateManifestRef: course.manifestBlob.ref,
      operationIndexManifestRef: alias.operationManifestBlob.ref,
      subjectIndexManifestRef: canonical.subjectManifestBlob.ref,
      receiptIndexManifestRef: canonical.receiptManifestBlob.ref,
      walletCheckpointAnchor: {
        schemaVersion: "learning-v2-owner-repository-wallet-checkpoint-anchor.v1",
        checkpointSchemaVersion: "learning-v2-owner-repository-wallet-checkpoint.v1",
        checkpointKind: "wallet_credit_only",
        accountScopeHash,
        checkpointKey: `learning_v2_owner_repository:v1:${accountScopeHash}:wallet-checkpoint:${anchorRootFingerprint}`,
        checkpointRootFingerprint: anchorRootFingerprint,
        checkpointFingerprint: sha256Utf8("mixed-checkpoint-tamper-anchor"),
        checkpointCurrentGeneration: generation,
        checkpointRepositoryRevision: 0,
        checkpointJournalSequence: 0,
        bootstrapOrigin: "fresh_v2_genesis",
      },
      walletCheckpointLagRootTransitions: 4,
      walletCheckpointPromotionRequired: true,
    });
    const checkpoint = await materializeOwnerRepositoryEconomicCheckpointV3({
      checkpointRoot: root,
      previousCheckpoint: null,
      walletStateBlob: wallet.blob,
      courseManifestBlob: course.manifestBlob,
      operationManifestBlob: alias.operationManifestBlob,
      subjectManifestBlob: canonical.subjectManifestBlob,
      receiptManifestBlob: canonical.receiptManifestBlob,
      resolveNode: resolver,
    });
    const mutated = JSON.parse(checkpoint.encoded);
    mutated.operationAliasCount = 0;
    mutated.missingIndexRepairCount = 2;
    const body = { ...mutated };
    delete body.checkpointFingerprint;
    mutated.checkpointFingerprint = sha256Utf8(canonicalJsonV1(body));
    const raw = canonicalJsonV1(mutated);
    await expect(parseOwnerRepositoryEconomicCheckpointV3({
      accountScopeHash,
      checkpointRoot: root.root,
      key: checkpoint.key,
      raw,
      walletStateBlob: wallet.blob,
      courseManifestBlob: course.manifestBlob,
      operationManifestBlob: alias.operationManifestBlob,
      subjectManifestBlob: canonical.subjectManifestBlob,
      receiptManifestBlob: canonical.receiptManifestBlob,
      resolveNode: resolver,
    })).rejects.toThrow("owner_repository_economic_checkpoint_v3_indeterminate");

    await expect(materializeOwnerRepositoryEconomicCheckpointV3({
      checkpointRoot: root,
      previousCheckpoint: null,
      walletStateBlob: wallet.blob,
      courseManifestBlob: course.manifestBlob,
      operationManifestBlob: canonical.operationManifestBlob,
      subjectManifestBlob: canonical.subjectManifestBlob,
      receiptManifestBlob: canonical.receiptManifestBlob,
      resolveNode: resolver,
    })).rejects.toThrow("owner_repository_economic_checkpoint_v3_mismatch");
  });

  it("never executes hostile outer accessors", async () => {
    let getterRuns = 0;
    const poisoned = {
      checkpointRoot: {},
      previousCheckpoint: null,
      walletStateBlob: {},
      courseManifestBlob: {},
      operationManifestBlob: {},
      subjectManifestBlob: {},
      receiptManifestBlob: {},
      resolveNode: resolver,
    } as Record<string, unknown>;
    Object.defineProperty(poisoned, "checkpointRoot", {
      enumerable: true,
      get: () => { getterRuns += 1; return {}; },
    });
    await expect(materializeOwnerRepositoryEconomicCheckpointV3(poisoned))
      .rejects.toThrow("owner_repository_economic_checkpoint_v3_invalid");
    expect(getterRuns).toBe(0);
  });
});
