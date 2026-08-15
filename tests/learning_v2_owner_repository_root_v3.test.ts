import {
  createWalletAuthorizedOperation,
  deriveWalletSemanticSubjectFingerprint,
} from "../modules/learning-v2/contracts/wallet";
import type {
  OwnerRepositoryBlobRefV1,
  OwnerRepositoryRootV1,
} from "../modules/learning-v2/progress/owner_repository";
import { createEmptyOwnerRepositoryCourseManifest } from "../modules/learning-v2/progress/owner_repository_course_manifest";
import { createEmptyOwnerRepositoryEconomicManifest } from "../modules/learning-v2/progress/owner_repository_economic_manifest";
import {
  createOwnerRepositoryCanonicalEconomicIndexValuesV2,
  createOwnerRepositoryOperationAliasIndexValueV2,
  createOwnerRepositoryOperationAliasRecordV2,
  createOwnerRepositoryWalletCreditEffectRecordV2,
  materializeOwnerRepositoryOperationAliasRecordBlobV2,
  materializeOwnerRepositoryWalletCreditEffectRecordBlobV2,
} from "../modules/learning-v2/progress/owner_repository_economic_effect_v2";
import {
  createOwnerRepositoryMissingIndexEntryJournalRecord,
  createOwnerRepositoryOperationAliasJournalRecord,
  createOwnerRepositoryWalletCreditJournalRecord,
} from "../modules/learning-v2/progress/owner_repository_journal";
import {
  bindOwnerRepositoryWalletCreditSuccessorRootV2,
  materializeOwnerRepositoryJournalRecordBlob,
  parseOwnerRepositoryJournalRecordBlob,
} from "../modules/learning-v2/progress/owner_repository_root_fold";
import {
  bindOwnerRepositoryMissingIndexRepairSuccessorRootV3,
  bindOwnerRepositoryOperationAliasSuccessorRootV3FromV2,
  bindOwnerRepositoryOperationAliasV2SuccessorRootV3,
  bindOwnerRepositoryWalletCreditSuccessorRootV3,
  bindOwnerRepositoryWalletCreditSuccessorRootV3FromV2,
  bindOwnerRepositoryWalletCreditEffectV2SuccessorRootV3,
  bindOwnerRepositoryWalletCreditEffectV2SuccessorRootV3FromV2,
  createOwnerRepositoryRootV3AdoptionBaseFromFreshV2,
  createOwnerRepositoryRootV3AdoptionBaseFromVerifiedV1Migration,
  createOwnerRepositoryRootV3AdoptionBaseFromV2Seq1,
  advanceOwnerRepositoryRootV3Generation,
  advanceOwnerRepositoryRootV3GenerationFromV2,
  materializeOwnerRepositoryWalletCheckpointV2AnchorCandidate,
  parseOwnerRepositoryWalletCheckpointV1AnchorCandidate,
  parseOwnerRepositoryRootV3,
  parseOwnerRepositoryRootV3Raw,
  type OwnerRepositoryRootV3,
} from "../modules/learning-v2/progress/owner_repository_root_v3";
import {
  advanceOwnerRepositoryRootV2Generation,
  createGenesisOwnerRepositoryRootV2,
  migrateVerifiedGenesisOwnerRepositoryRootV1,
  type OwnerRepositoryRootV2,
  type OwnerRepositoryRootV2Materialization,
} from "../modules/learning-v2/progress/owner_repository_root_v2";
import { createWalletState, reduceAuthorizedWalletOperation } from "../modules/learning-v2/progress/wallet_reducer";
import {
  appendOwnerRepositoryWalletGenerationRolloverCheckpointTransition,
  createOwnerRepositoryWalletCheckpointAccumulator,
  createOwnerRepositoryWalletCheckpointAccumulatorFromVerifiedV1Migration,
  matchOwnerRepositoryWalletCheckpointProjection,
  materializeOwnerRepositoryWalletCheckpoint,
  type OwnerRepositoryWalletCheckpointMaterialization,
} from "../modules/learning-v2/progress/owner_repository_wallet_checkpoint";
import {
  materializeOwnerRepositoryWalletStateBlob,
  type OwnerRepositoryWalletStateBlobV1,
} from "../modules/learning-v2/progress/owner_repository_wallet_blob";
import { canonicalJsonV1, sha256Utf8 } from "../modules/learning-v2/policies/decision_registry";

const accountScopeHash = "aaaaaaaaaaaaaaaa";
const generation = 4;
type RootLike = OwnerRepositoryRootV2 | OwnerRepositoryRootV3;

const ref = (kind: OwnerRepositoryBlobRefV1["kind"], label: string): OwnerRepositoryBlobRefV1 => {
  const blobFingerprint = sha256Utf8(label);
  return {
    schemaVersion: "learning-v2-owner-repository-blob-ref.v1",
    kind,
    blobKey: `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${blobFingerprint}`,
    blobFingerprint,
  };
};

const receipt = (ordinal: number, receiptGeneration: number) => {
  let state = createWalletState({ accountScopeHash });
  for (let index = 0; index < ordinal - 1; index += 1) {
    const sourceReceiptRef = {
      receiptType: "coin_exchange_trade" as const,
      receiptId: `root-v3-prior-${receiptGeneration}-${index}`,
      receiptFingerprint: sha256Utf8(`root-v3-prior-${receiptGeneration}-${index}`),
    };
    state = reduceAuthorizedWalletOperation(state, createWalletAuthorizedOperation({
      schemaVersion: "learning-v2-wallet-authorized-operation.v1",
      authority: "trusted_server_boundary",
      operationId: `root-v3-prior-${receiptGeneration}-${index}`,
      semanticSubjectFingerprint: deriveWalletSemanticSubjectFingerprint({
        accountScopeHash,
        operationReason: "coin_exchange",
        sourceReceiptRef,
      }),
      accountScopeHash,
      accountGeneration: receiptGeneration,
      currency: "access_star",
      walletRevisionBefore: state.revision,
      kind: "external_credit",
      amountSubunits: 10_000,
      earningCategory: null,
      operationReason: "coin_exchange",
      sourceReceiptRef,
      origin: { kind: "coin_exchange", tradeId: sourceReceiptRef.receiptId },
    }), { currentAccountGeneration: receiptGeneration }).state;
  }
  const sourceReceiptRef = {
    receiptType: "coin_exchange_trade" as const,
    receiptId: `root-v3-credit-${receiptGeneration}-${ordinal}`,
    receiptFingerprint: sha256Utf8(`root-v3-credit-${receiptGeneration}-${ordinal}`),
  };
  return reduceAuthorizedWalletOperation(state, createWalletAuthorizedOperation({
    schemaVersion: "learning-v2-wallet-authorized-operation.v1",
    authority: "trusted_server_boundary",
    operationId: `root-v3-credit-${receiptGeneration}-${ordinal}`,
    semanticSubjectFingerprint: deriveWalletSemanticSubjectFingerprint({
      accountScopeHash,
      operationReason: "coin_exchange",
      sourceReceiptRef,
    }),
    accountScopeHash,
    accountGeneration: receiptGeneration,
    currency: "access_star",
    walletRevisionBefore: state.revision,
    kind: "external_credit",
    amountSubunits: 45_000,
    earningCategory: null,
    operationReason: "coin_exchange",
    sourceReceiptRef,
    origin: { kind: "coin_exchange", tradeId: sourceReceiptRef.receiptId },
  }), { currentAccountGeneration: receiptGeneration }).appliedReceipt;
};

let genesis: OwnerRepositoryRootV2Materialization;
let genesisWallet: OwnerRepositoryWalletStateBlobV1;
let genesisAnchor: ReturnType<typeof parseOwnerRepositoryWalletCheckpointV1AnchorCandidate>;
let genesisCheckpoint: OwnerRepositoryWalletCheckpointMaterialization;
let genesisCourse: Awaited<ReturnType<typeof createEmptyOwnerRepositoryCourseManifest>>;
let genesisOperationManifest: Awaited<ReturnType<typeof createEmptyOwnerRepositoryEconomicManifest>>;
let genesisSubjectManifest: Awaited<ReturnType<typeof createEmptyOwnerRepositoryEconomicManifest>>;
let genesisReceiptManifest: Awaited<ReturnType<typeof createEmptyOwnerRepositoryEconomicManifest>>;

const recordBlobFor = (root: RootLike) => {
  const sequence = root.journalSequence + 1;
  const suffix = `${sequence}-${root.rootFingerprint.slice(0, 12)}`;
  return materializeOwnerRepositoryJournalRecordBlob(
    createOwnerRepositoryWalletCreditJournalRecord({
      accountScopeHash,
      journalSequence: sequence,
      repositoryRevisionBefore: root.repositoryRevision,
      rootBeforeFingerprint: root.rootFingerprint,
      previousJournalRecordRef: root.journalHeadRef,
      walletStateBeforeRef: root.walletStateRef,
      walletStateAfterRef: ref("wallet_state", `root-v3-wallet-${suffix}`),
      operationIndexManifestBeforeRef: root.operationIndexManifestRef,
      operationIndexManifestAfterRef: ref("operation_index_manifest", `root-v3-operation-${suffix}`),
      subjectIndexManifestBeforeRef: root.subjectIndexManifestRef,
      subjectIndexManifestAfterRef: ref("subject_index_manifest", `root-v3-subject-${suffix}`),
      receiptIndexManifestBeforeRef: root.receiptIndexManifestRef,
      receiptIndexManifestAfterRef: ref("receipt_index_manifest", `root-v3-receipt-${suffix}`),
      appliedReceipt: receipt(sequence, root.currentGeneration),
    }),
  );
};

const effectV2For = (root: RootLike) => {
  const sequence = root.journalSequence + 1;
  const suffix = `effect-v2-${sequence}-${root.rootFingerprint.slice(0, 12)}`;
  const record = createOwnerRepositoryWalletCreditEffectRecordV2({
    accountScopeHash,
    journalSequence: sequence,
    repositoryRevisionBefore: root.repositoryRevision,
    rootBeforeFingerprint: root.rootFingerprint,
    previousJournalRecordRef: root.journalHeadRef,
    walletStateBeforeRef: root.walletStateRef,
    walletStateAfterRef: ref("wallet_state", `root-v3-wallet-${suffix}`),
    operationIndexManifestBeforeRef: root.operationIndexManifestRef,
    subjectIndexManifestBeforeRef: root.subjectIndexManifestRef,
    receiptIndexManifestBeforeRef: root.receiptIndexManifestRef,
    appliedReceipt: receipt(sequence, root.currentGeneration),
  });
  return {
    blob: materializeOwnerRepositoryWalletCreditEffectRecordBlobV2(record),
    operationIndexManifestAfterRef: ref(
      "operation_index_manifest",
      `root-v3-operation-${suffix}`,
    ),
    subjectIndexManifestAfterRef: ref(
      "subject_index_manifest",
      `root-v3-subject-${suffix}`,
    ),
    receiptIndexManifestAfterRef: ref(
      "receipt_index_manifest",
      `root-v3-receipt-${suffix}`,
    ),
  };
};

const anchorFor = (
  root: RootLike,
  bootstrapOrigin: null = null,
) => materializeOwnerRepositoryWalletCheckpointV2AnchorCandidate({
  schemaVersion: "learning-v2-owner-repository-wallet-checkpoint-anchor.v1",
  checkpointSchemaVersion: "learning-v2-owner-repository-wallet-checkpoint.v2",
  checkpointKind: "wallet_credit_only",
  accountScopeHash,
  checkpointKey: `learning_v2_owner_repository:v1:${accountScopeHash}:wallet-checkpoint:${root.rootFingerprint}`,
  checkpointRootFingerprint: root.rootFingerprint,
  checkpointFingerprint: sha256Utf8(`root-v3-checkpoint-${root.rootFingerprint}`),
  checkpointCurrentGeneration: root.currentGeneration,
  checkpointRepositoryRevision: root.repositoryRevision,
  checkpointJournalSequence: root.journalSequence,
  bootstrapOrigin,
});

const freshBase = () => createOwnerRepositoryRootV3AdoptionBaseFromFreshV2({
  rootBefore: genesis,
  checkpointAnchorCandidate: genesisAnchor,
});

const firstV3 = () => bindOwnerRepositoryWalletCreditSuccessorRootV3FromV2({
  adoptionBase: freshBase(),
  journalRecordBlob: recordBlobFor(genesis.root),
});

const aliasOperationFor = (recordBlob: ReturnType<typeof recordBlobFor>) => {
  const parsed = parseOwnerRepositoryJournalRecordBlob({
    accountScopeHash,
    ref: recordBlob.ref,
    raw: recordBlob.encoded,
  });
  if (parsed.record.recordKind !== "wallet_credit") throw new Error("test_fixture_invalid");
  const canonical = parsed.record.appliedReceipt.authorizedOperation;
  const {
    semanticFingerprint: _semanticFingerprint,
    operationFingerprint: _operationFingerprint,
    ...unmaterialized
  } = canonical;
  return createWalletAuthorizedOperation({
    ...unmaterialized,
    operationId: `${canonical.operationId}-alias`,
  });
};

describe("Learning V2 owner repository Root V3 lagging checkpoint anchor", () => {
  beforeAll(async () => {
    const wallet = materializeOwnerRepositoryWalletStateBlob(createWalletState({ accountScopeHash }));
    genesisCourse = await createEmptyOwnerRepositoryCourseManifest(accountScopeHash);
    genesisOperationManifest = await createEmptyOwnerRepositoryEconomicManifest(
      accountScopeHash,
      "operation",
    );
    genesisSubjectManifest = await createEmptyOwnerRepositoryEconomicManifest(
      accountScopeHash,
      "subject",
    );
    genesisReceiptManifest = await createEmptyOwnerRepositoryEconomicManifest(
      accountScopeHash,
      "receipt",
    );
    genesisWallet = wallet.blob;
    genesis = createGenesisOwnerRepositoryRootV2({
      accountScopeHash,
      currentGeneration: generation,
      walletStateRef: wallet.blob.ref,
      courseStateManifestRef: genesisCourse.manifestBlob.ref,
      operationIndexManifestRef: genesisOperationManifest.manifestBlob.ref,
      subjectIndexManifestRef: genesisSubjectManifest.manifestBlob.ref,
      receiptIndexManifestRef: genesisReceiptManifest.manifestBlob.ref,
    });
    const checkpoint = materializeOwnerRepositoryWalletCheckpoint({
      accumulator: createOwnerRepositoryWalletCheckpointAccumulator({
        startingRoot: genesis,
        previousCheckpoint: null,
      }),
      endingWalletStateBlob: wallet.blob,
    });
    genesisCheckpoint = await matchOwnerRepositoryWalletCheckpointProjection({
      checkpoint,
      checkpointRoot: genesis.root,
      walletStateBlob: wallet.blob,
      courseManifestBlob: genesisCourse.manifestBlob,
      operationManifestBlob: genesisOperationManifest.manifestBlob,
      subjectManifestBlob: genesisSubjectManifest.manifestBlob,
      receiptManifestBlob: genesisReceiptManifest.manifestBlob,
      resolveNode: () => null,
    });
    genesisAnchor = parseOwnerRepositoryWalletCheckpointV1AnchorCandidate({
      checkpoint: genesisCheckpoint,
      checkpointRoot: genesis.root,
      walletStateBlob: wallet.blob,
    });
  });

  it("adopts fresh V2 only together with the first wallet transition", () => {
    const first = firstV3();
    expect(first.root).toMatchObject({
      schemaVersion: "learning-v2-owner-repository-root.v3",
      repositoryRevision: 1,
      journalSequence: 1,
      previousRootFingerprint: genesis.root.rootFingerprint,
      walletCheckpointLagRootTransitions: 1,
      walletCheckpointPromotionRequired: false,
    });
    expect(first.root.walletCheckpointAnchor.checkpointRootFingerprint)
      .toBe(genesis.root.rootFingerprint);
    expect(parseOwnerRepositoryRootV3Raw(first.encoded, accountScopeHash)).toEqual(first);
    expect(Object.isFrozen(first.root.walletCheckpointAnchor)).toBe(true);

    const clonedAnchor = JSON.parse(JSON.stringify(genesisAnchor));
    expect(() => createOwnerRepositoryRootV3AdoptionBaseFromFreshV2({
      rootBefore: genesis,
      checkpointAnchorCandidate: clonedAnchor,
    })).toThrow("owner_repository_root_v3_invalid");
  });

  it("binds a pre-COW effect V2 journal to exact planned after manifests", () => {
    const firstEffect = effectV2For(genesis.root);
    const first = bindOwnerRepositoryWalletCreditEffectV2SuccessorRootV3FromV2({
      adoptionBase: freshBase(),
      journalRecordBlob: firstEffect.blob,
      operationIndexManifestAfterRef:
        firstEffect.operationIndexManifestAfterRef,
      subjectIndexManifestAfterRef: firstEffect.subjectIndexManifestAfterRef,
      receiptIndexManifestAfterRef: firstEffect.receiptIndexManifestAfterRef,
    });
    expect(first.root).toMatchObject({
      repositoryRevision: 1,
      journalSequence: 1,
      journalHeadRef: firstEffect.blob.ref,
      walletStateRef: firstEffect.blob.record.walletStateAfterRef,
      operationIndexManifestRef:
        firstEffect.operationIndexManifestAfterRef,
      subjectIndexManifestRef: firstEffect.subjectIndexManifestAfterRef,
      receiptIndexManifestRef: firstEffect.receiptIndexManifestAfterRef,
    });

    const canonicalValues =
      createOwnerRepositoryCanonicalEconomicIndexValuesV2({
        journalRecordBlob: firstEffect.blob,
      });
    const canonicalOperation =
      firstEffect.blob.record.appliedReceipt.authorizedOperation;
    const {
      semanticFingerprint: _semanticFingerprint,
      operationFingerprint: _operationFingerprint,
      ...aliasInput
    } = canonicalOperation;
    const authorizedAliasOperation = createWalletAuthorizedOperation({
      ...aliasInput,
      operationId: `${canonicalOperation.operationId}-bound-alias`,
      walletRevisionBefore: 1,
    });
    const aliasValue = createOwnerRepositoryOperationAliasIndexValueV2({
      accountScopeHash,
      authorizedAliasOperation,
      receiptValue: canonicalValues.receiptValue,
    });
    const aliasRecord = createOwnerRepositoryOperationAliasRecordV2({
      accountScopeHash,
      journalSequence: 2,
      repositoryRevisionBefore: 1,
      rootBeforeFingerprint: first.root.rootFingerprint,
      previousJournalRecordRef: firstEffect.blob.ref,
      walletStateRef: first.root.walletStateRef,
      operationIndexManifestBeforeRef:
        first.root.operationIndexManifestRef,
      operationIndexManifestAfterRef: ref(
        "operation_index_manifest",
        "effect-v2-alias-operation-after",
      ),
      subjectIndexManifestRef: first.root.subjectIndexManifestRef,
      receiptIndexManifestRef: first.root.receiptIndexManifestRef,
      aliasValue,
    });
    const aliasBlob =
      materializeOwnerRepositoryOperationAliasRecordBlobV2(aliasRecord);
    const aliased = bindOwnerRepositoryOperationAliasV2SuccessorRootV3({
      rootBefore: first.root,
      journalRecordBlob: aliasBlob,
      promotedCheckpointAnchor: null,
    });
    expect(aliased.root).toMatchObject({
      repositoryRevision: 2,
      journalSequence: 2,
      journalHeadRef: aliasBlob.ref,
      walletStateRef: first.root.walletStateRef,
      operationIndexManifestRef:
        aliasRecord.operationIndexManifestAfterRef,
      subjectIndexManifestRef: first.root.subjectIndexManifestRef,
      receiptIndexManifestRef: first.root.receiptIndexManifestRef,
    });

    const secondEffect = effectV2For(first.root);
    const second = bindOwnerRepositoryWalletCreditEffectV2SuccessorRootV3({
      rootBefore: first.root,
      journalRecordBlob: secondEffect.blob,
      operationIndexManifestAfterRef:
        secondEffect.operationIndexManifestAfterRef,
      subjectIndexManifestAfterRef: secondEffect.subjectIndexManifestAfterRef,
      receiptIndexManifestAfterRef: secondEffect.receiptIndexManifestAfterRef,
      promotedCheckpointAnchor: null,
    });
    expect(second.root).toMatchObject({
      repositoryRevision: 2,
      journalSequence: 2,
      previousRootFingerprint: first.root.rootFingerprint,
      journalHeadRef: secondEffect.blob.ref,
      walletCheckpointLagRootTransitions: 2,
    });
    expect(() =>
      bindOwnerRepositoryWalletCreditEffectV2SuccessorRootV3({
        rootBefore: first.root,
        journalRecordBlob: secondEffect.blob,
        operationIndexManifestAfterRef: ref(
          "receipt_index_manifest",
          "wrong-after-kind",
        ),
        subjectIndexManifestAfterRef:
          secondEffect.subjectIndexManifestAfterRef,
        receiptIndexManifestAfterRef: secondEffect.receiptIndexManifestAfterRef,
        promotedCheckpointAnchor: null,
      }),
    ).toThrow("owner_repository_root_v3_invalid");
  });

  it("adopts an exact supported V2 seq1 parent chain on the second credit", () => {
    const firstBlob = recordBlobFor(genesis.root);
    const firstV2 = bindOwnerRepositoryWalletCreditSuccessorRootV2({
      rootBefore: genesis.root,
      journalRecordBlob: firstBlob,
    });
    const base = createOwnerRepositoryRootV3AdoptionBaseFromV2Seq1({
      rootBefore: firstV2,
      parentRoot: genesis,
      parentJournalRecordBlob: firstBlob,
      checkpointAnchorCandidate: genesisAnchor,
    });
    const second = bindOwnerRepositoryWalletCreditSuccessorRootV3FromV2({
      adoptionBase: base,
      journalRecordBlob: recordBlobFor(firstV2.root),
    });
    expect(second.root).toMatchObject({
      repositoryRevision: 2,
      journalSequence: 2,
      previousRootFingerprint: firstV2.root.rootFingerprint,
      walletCheckpointLagRootTransitions: 2,
      walletCheckpointPromotionRequired: false,
    });

    const wrongParent = { root: { ...genesis.root, currentGeneration: 5 }, encoded: genesis.encoded };
    expect(() => createOwnerRepositoryRootV3AdoptionBaseFromV2Seq1({
      rootBefore: firstV2,
      parentRoot: wrongParent,
      parentJournalRecordBlob: firstBlob,
      checkpointAnchorCandidate: genesisAnchor,
    })).toThrow("owner_repository_root_v3_invalid");
  });

  it("structurally advances alias and one-key repair records without changing wallet", () => {
    const firstBlob = recordBlobFor(genesis.root);
    const parsedFirst = parseOwnerRepositoryJournalRecordBlob({
      accountScopeHash,
      ref: firstBlob.ref,
      raw: firstBlob.encoded,
    });
    if (parsedFirst.record.recordKind !== "wallet_credit") throw new Error("test_fixture_invalid");
    const firstV2 = bindOwnerRepositoryWalletCreditSuccessorRootV2({
      rootBefore: genesis.root,
      journalRecordBlob: firstBlob,
    });
    const base = createOwnerRepositoryRootV3AdoptionBaseFromV2Seq1({
      rootBefore: firstV2,
      parentRoot: genesis,
      parentJournalRecordBlob: firstBlob,
      checkpointAnchorCandidate: genesisAnchor,
    });
    const aliasRecord = createOwnerRepositoryOperationAliasJournalRecord({
      accountScopeHash,
      journalSequence: 2,
      repositoryRevisionBefore: firstV2.root.repositoryRevision,
      rootBeforeFingerprint: firstV2.root.rootFingerprint,
      previousJournalRecordRef: firstV2.root.journalHeadRef,
      canonicalEffectJournalRecordRef: firstBlob.ref,
      walletStateRef: firstV2.root.walletStateRef,
      operationIndexManifestBeforeRef: firstV2.root.operationIndexManifestRef,
      operationIndexManifestAfterRef: ref("operation_index_manifest", "root-v3-alias-operation-2"),
      subjectIndexManifestRef: firstV2.root.subjectIndexManifestRef,
      receiptIndexManifestRef: firstV2.root.receiptIndexManifestRef,
      canonicalEffectRecord: parsedFirst.record,
      authorizedAliasOperation: aliasOperationFor(firstBlob),
    });
    const aliasBlob = materializeOwnerRepositoryJournalRecordBlob(aliasRecord);
    const aliasRoot = bindOwnerRepositoryOperationAliasSuccessorRootV3FromV2({
      adoptionBase: base,
      journalRecordBlob: aliasBlob,
    });
    expect(aliasRoot.root).toMatchObject({
      repositoryRevision: 2,
      journalSequence: 2,
      walletStateRef: firstV2.root.walletStateRef,
      operationIndexManifestRef: aliasRecord.operationIndexManifestAfterRef,
      subjectIndexManifestRef: firstV2.root.subjectIndexManifestRef,
      receiptIndexManifestRef: firstV2.root.receiptIndexManifestRef,
      journalHeadRef: aliasBlob.ref,
      walletCheckpointLagRootTransitions: 2,
    });

    const repairRecord = createOwnerRepositoryMissingIndexEntryJournalRecord({
      accountScopeHash,
      acceptedAccountGeneration: generation,
      journalSequence: 3,
      repositoryRevisionBefore: aliasRoot.root.repositoryRevision,
      rootBeforeFingerprint: aliasRoot.root.rootFingerprint,
      previousJournalRecordRef: aliasRoot.root.journalHeadRef,
      canonicalEffectJournalRecordRef: firstBlob.ref,
      repairKeyKind: "applied_receipt",
      walletStateRef: aliasRoot.root.walletStateRef,
      operationIndexManifestBeforeRef: aliasRoot.root.operationIndexManifestRef,
      operationIndexManifestAfterRef: aliasRoot.root.operationIndexManifestRef,
      subjectIndexManifestBeforeRef: aliasRoot.root.subjectIndexManifestRef,
      subjectIndexManifestAfterRef: aliasRoot.root.subjectIndexManifestRef,
      receiptIndexManifestBeforeRef: aliasRoot.root.receiptIndexManifestRef,
      receiptIndexManifestAfterRef: ref("receipt_index_manifest", "root-v3-repair-receipt-3"),
      canonicalEffectRecord: parsedFirst.record,
    });
    const repairBlob = materializeOwnerRepositoryJournalRecordBlob(repairRecord);
    const repairRoot = bindOwnerRepositoryMissingIndexRepairSuccessorRootV3({
      rootBefore: aliasRoot.root,
      journalRecordBlob: repairBlob,
      promotedCheckpointAnchor: null,
    });
    expect(repairRoot.root).toMatchObject({
      repositoryRevision: 3,
      journalSequence: 3,
      walletStateRef: firstV2.root.walletStateRef,
      operationIndexManifestRef: aliasRoot.root.operationIndexManifestRef,
      subjectIndexManifestRef: aliasRoot.root.subjectIndexManifestRef,
      receiptIndexManifestRef: repairRecord.receiptIndexManifestAfterRef,
      journalHeadRef: repairBlob.ref,
      walletCheckpointLagRootTransitions: 3,
    });

    const wrongBefore = createOwnerRepositoryMissingIndexEntryJournalRecord({
      accountScopeHash,
      acceptedAccountGeneration: generation,
      journalSequence: 3,
      repositoryRevisionBefore: aliasRoot.root.repositoryRevision,
      rootBeforeFingerprint: aliasRoot.root.rootFingerprint,
      previousJournalRecordRef: aliasRoot.root.journalHeadRef,
      canonicalEffectJournalRecordRef: firstBlob.ref,
      repairKeyKind: "applied_receipt",
      walletStateRef: aliasRoot.root.walletStateRef,
      operationIndexManifestBeforeRef: aliasRoot.root.operationIndexManifestRef,
      operationIndexManifestAfterRef: aliasRoot.root.operationIndexManifestRef,
      subjectIndexManifestBeforeRef: aliasRoot.root.subjectIndexManifestRef,
      subjectIndexManifestAfterRef: aliasRoot.root.subjectIndexManifestRef,
      receiptIndexManifestBeforeRef: ref("receipt_index_manifest", "wrong-repair-before"),
      receiptIndexManifestAfterRef: ref("receipt_index_manifest", "root-v3-repair-receipt-3"),
      canonicalEffectRecord: parsedFirst.record,
    });
    expect(() => bindOwnerRepositoryMissingIndexRepairSuccessorRootV3({
      rootBefore: aliasRoot.root,
      journalRecordBlob: materializeOwnerRepositoryJournalRecordBlob(wrongBefore),
      promotedCheckpointAnchor: null,
    })).toThrow("owner_repository_root_v3_mismatch");
  });

  it("preserves a canonical Checkpoint V1 rollover anchor when adopting V2 seq1", () => {
    const rolloverParent = advanceOwnerRepositoryRootV2Generation({
      root: genesis.root,
      targetGeneration: 5,
    });
    const rolloverAccumulator = appendOwnerRepositoryWalletGenerationRolloverCheckpointTransition({
      accumulator: createOwnerRepositoryWalletCheckpointAccumulator({
        startingRoot: genesis,
        previousCheckpoint: genesisCheckpoint,
      }),
      successorRoot: rolloverParent,
    });
    const rolloverCheckpoint = materializeOwnerRepositoryWalletCheckpoint({
      accumulator: rolloverAccumulator,
      endingWalletStateBlob: genesisWallet,
    });
    expect(rolloverCheckpoint.checkpoint).toMatchObject({
      bootstrapOrigin: null,
      repositoryRevision: 1,
      journalSequence: 0,
    });
    const rolloverAnchor = parseOwnerRepositoryWalletCheckpointV1AnchorCandidate({
      checkpoint: rolloverCheckpoint,
      checkpointRoot: rolloverParent.root,
      walletStateBlob: genesisWallet,
    });
    const firstBlob = recordBlobFor(rolloverParent.root);
    const firstV2 = bindOwnerRepositoryWalletCreditSuccessorRootV2({
      rootBefore: rolloverParent.root,
      journalRecordBlob: firstBlob,
    });
    const base = createOwnerRepositoryRootV3AdoptionBaseFromV2Seq1({
      rootBefore: firstV2,
      parentRoot: rolloverParent,
      parentJournalRecordBlob: firstBlob,
      checkpointAnchorCandidate: rolloverAnchor,
    });
    const second = bindOwnerRepositoryWalletCreditSuccessorRootV3FromV2({
      adoptionBase: base,
      journalRecordBlob: recordBlobFor(firstV2.root),
    });
    expect(second.root.walletCheckpointAnchor).toMatchObject({
      checkpointSchemaVersion: "learning-v2-owner-repository-wallet-checkpoint.v1",
      bootstrapOrigin: null,
      checkpointRootFingerprint: rolloverParent.root.rootFingerprint,
    });
    expect(second.root).toMatchObject({
      currentGeneration: 5,
      repositoryRevision: 3,
      journalSequence: 2,
      walletCheckpointLagRootTransitions: 2,
      walletCheckpointPromotionRequired: false,
    });
  });

  it("admits the exact V1-genesis migration root but not an ordinary V2 rollover clone", async () => {
    const emptyCourse = await createEmptyOwnerRepositoryCourseManifest(accountScopeHash);
    const v1Body = {
      schemaVersion: "learning-v2-owner-repository-root.v1" as const,
      accountScopeHash,
      currentGeneration: generation,
      repositoryRevision: 0,
      journalSequence: 0,
      previousRootFingerprint: null,
      journalHeadRef: null,
      walletStateRef: genesis.root.walletStateRef,
      courseStateRefs: [] as const,
      operationIndexManifestRef: genesis.root.operationIndexManifestRef,
      subjectIndexManifestRef: genesis.root.subjectIndexManifestRef,
      receiptIndexManifestRef: genesis.root.receiptIndexManifestRef,
    };
    const rootV1: OwnerRepositoryRootV1 = {
      ...v1Body,
      rootFingerprint: sha256Utf8(canonicalJsonV1(v1Body)),
    };
    const migrated = await migrateVerifiedGenesisOwnerRepositoryRootV1({
      rootV1,
      targetGeneration: 5,
      emptyCourseStateManifestBlob: emptyCourse.manifestBlob,
      resolveCourseNode: async () => null,
    });
    const migrationCheckpoint = materializeOwnerRepositoryWalletCheckpoint({
      accumulator: await createOwnerRepositoryWalletCheckpointAccumulatorFromVerifiedV1Migration({
        rootV1,
        targetGeneration: 5,
        emptyCourseStateManifestBlob: emptyCourse.manifestBlob,
        resolveCourseNode: async () => null,
        migratedRoot: migrated,
      }),
      endingWalletStateBlob: genesisWallet,
    });
    const candidate = parseOwnerRepositoryWalletCheckpointV1AnchorCandidate({
      checkpoint: migrationCheckpoint,
      checkpointRoot: migrated.root,
      walletStateBlob: genesisWallet,
    });
    const migrationBase = await createOwnerRepositoryRootV3AdoptionBaseFromVerifiedV1Migration({
      rootV1,
      targetGeneration: 5,
      emptyCourseStateManifestBlob: emptyCourse.manifestBlob,
      resolveCourseNode: async () => null,
      migratedRoot: migrated,
      checkpointAnchorCandidate: candidate,
    });
    const first = bindOwnerRepositoryWalletCreditSuccessorRootV3FromV2({
      adoptionBase: migrationBase,
      journalRecordBlob: recordBlobFor(migrated.root),
    });
    expect(first.root).toMatchObject({
      currentGeneration: 5,
      repositoryRevision: 2,
      journalSequence: 1,
      walletCheckpointLagRootTransitions: 1,
      walletCheckpointPromotionRequired: false,
    });
    const migratedRollover = advanceOwnerRepositoryRootV3GenerationFromV2({
      adoptionBase: migrationBase,
      targetGeneration: 6,
    });
    const migratedRolloverSuccessor = advanceOwnerRepositoryRootV3Generation({
      rootBefore: migratedRollover.root,
      targetGeneration: 7,
      promotedCheckpointAnchor: anchorFor(migratedRollover.root),
    });
    expect(migratedRolloverSuccessor.root).toMatchObject({
      currentGeneration: 7,
      repositoryRevision: 3,
      journalSequence: 0,
      walletCheckpointLagRootTransitions: 1,
      walletCheckpointPromotionRequired: true,
    });

    const ordinaryRollover = advanceOwnerRepositoryRootV2Generation({
      root: genesis.root,
      targetGeneration: 5,
    });
    await expect(createOwnerRepositoryRootV3AdoptionBaseFromVerifiedV1Migration({
      rootV1,
      targetGeneration: 5,
      emptyCourseStateManifestBlob: emptyCourse.manifestBlob,
      resolveCourseNode: async () => null,
      migratedRoot: ordinaryRollover,
      checkpointAnchorCandidate: candidate,
    })).rejects.toThrow("owner_repository_root_v3_mismatch");
  });

  it("closes at lag 16 and requires exact promotion on the next transition", () => {
    let current = firstV3();
    while (current.root.journalSequence < 16) {
      current = bindOwnerRepositoryWalletCreditSuccessorRootV3({
        rootBefore: current.root,
        journalRecordBlob: recordBlobFor(current.root),
        promotedCheckpointAnchor: null,
      });
    }
    expect(current.root).toMatchObject({
      walletCheckpointLagRootTransitions: 16,
      walletCheckpointPromotionRequired: true,
    });
    const nextBlob = recordBlobFor(current.root);
    expect(() => bindOwnerRepositoryWalletCreditSuccessorRootV3({
      rootBefore: current.root,
      journalRecordBlob: nextBlob,
      promotedCheckpointAnchor: null,
    })).toThrow("owner_repository_root_v3_invalid");

    const promoted = anchorFor(current.root);
    const next = bindOwnerRepositoryWalletCreditSuccessorRootV3({
      rootBefore: current.root,
      journalRecordBlob: nextBlob,
      promotedCheckpointAnchor: promoted,
    });
    expect(next.root.walletCheckpointAnchor.checkpointRootFingerprint)
      .toBe(current.root.rootFingerprint);
    expect(next.root).toMatchObject({
      walletCheckpointLagRootTransitions: 1,
      walletCheckpointPromotionRequired: false,
      journalSequence: 17,
    });
    expect(() => bindOwnerRepositoryWalletCreditSuccessorRootV3({
      rootBefore: next.root,
      journalRecordBlob: recordBlobFor(next.root),
      promotedCheckpointAnchor: promoted,
    })).toThrow("owner_repository_root_v3_invalid");
  });

  it("a generation rollover closes early and its successor must promote it", () => {
    const first = firstV3();
    const rolled = advanceOwnerRepositoryRootV3Generation({
      rootBefore: first.root,
      targetGeneration: 5,
      promotedCheckpointAnchor: null,
    });
    expect(rolled.root).toMatchObject({
      currentGeneration: 5,
      repositoryRevision: 2,
      journalSequence: 1,
      walletCheckpointLagRootTransitions: 2,
      walletCheckpointPromotionRequired: true,
      journalHeadRef: first.root.journalHeadRef,
      walletStateRef: first.root.walletStateRef,
    });
    expect(() => advanceOwnerRepositoryRootV3Generation({
      rootBefore: rolled.root,
      targetGeneration: 6,
      promotedCheckpointAnchor: null,
    })).toThrow("owner_repository_root_v3_invalid");
    const promoted = advanceOwnerRepositoryRootV3Generation({
      rootBefore: rolled.root,
      targetGeneration: 6,
      promotedCheckpointAnchor: anchorFor(rolled.root),
    });
    expect(promoted.root).toMatchObject({
      currentGeneration: 6,
      walletCheckpointLagRootTransitions: 1,
      walletCheckpointPromotionRequired: true,
      journalSequence: 1,
    });
  });

  it("promotes a legitimate seq0 checkpoint after an immediate V2-to-V3 rollover", () => {
    const rolled = advanceOwnerRepositoryRootV3GenerationFromV2({
      adoptionBase: freshBase(),
      targetGeneration: 5,
    });
    expect(rolled.root).toMatchObject({
      repositoryRevision: 1,
      journalSequence: 0,
      walletCheckpointLagRootTransitions: 1,
      walletCheckpointPromotionRequired: true,
    });
    const next = advanceOwnerRepositoryRootV3Generation({
      rootBefore: rolled.root,
      targetGeneration: 6,
      promotedCheckpointAnchor: anchorFor(rolled.root),
    });
    expect(next.root).toMatchObject({
      currentGeneration: 6,
      repositoryRevision: 2,
      journalSequence: 0,
      walletCheckpointLagRootTransitions: 1,
      walletCheckpointPromotionRequired: true,
    });
  });

  it("rejects anchor/root tampering and hostile descriptors without executing them", () => {
    const first = firstV3();
    const cases = [
      (copy: any) => { copy.walletCheckpointAnchor.checkpointKey += "-alias"; },
      (copy: any) => { copy.walletCheckpointAnchor.checkpointRepositoryRevision = 1; },
      (copy: any) => { copy.walletCheckpointAnchor.checkpointJournalSequence = 2; },
      (copy: any) => { copy.walletCheckpointLagRootTransitions = 0; },
      (copy: any) => { copy.walletCheckpointLagRootTransitions = 17; },
      (copy: any) => { copy.walletCheckpointPromotionRequired = true; },
      (copy: any) => { copy.currentGeneration += 1; },
    ];
    for (const mutate of cases) {
      const copy = JSON.parse(JSON.stringify(first.root));
      mutate(copy);
      const body = { ...copy };
      delete body.rootFingerprint;
      copy.rootFingerprint = sha256Utf8(canonicalJsonV1(body));
      expect(() => parseOwnerRepositoryRootV3(copy, accountScopeHash))
        .toThrow("owner_repository_root_v3_invalid");
    }

    let getterRuns = 0;
    const hostileAnchor = {
      ...genesisAnchor.anchor,
      get checkpointSchemaVersion() {
        getterRuns += 1;
        return "learning-v2-owner-repository-wallet-checkpoint.v1";
      },
    };
    expect(() => materializeOwnerRepositoryWalletCheckpointV2AnchorCandidate(hostileAnchor))
      .toThrow("owner_repository_root_v3_invalid");
    expect(getterRuns).toBe(0);
    expect(() => parseOwnerRepositoryRootV3Raw("\ud800", accountScopeHash))
      .toThrow("owner_repository_root_v3_invalid");
  });

  it("rejects overflow and stale journal coordinates before constructing a successor", () => {
    const first = firstV3();
    const staleBlob = recordBlobFor(genesis.root);
    expect(() => bindOwnerRepositoryWalletCreditSuccessorRootV3({
      rootBefore: first.root,
      journalRecordBlob: staleBlob,
      promotedCheckpointAnchor: null,
    })).toThrow("owner_repository_root_v3_mismatch");

    const body = { ...first.root, repositoryRevision: Number.MAX_SAFE_INTEGER } as any;
    delete body.rootFingerprint;
    body.walletCheckpointLagRootTransitions = Number.MAX_SAFE_INTEGER;
    body.rootFingerprint = sha256Utf8(canonicalJsonV1(body));
    expect(() => parseOwnerRepositoryRootV3(body, accountScopeHash))
      .toThrow("owner_repository_root_v3_invalid");
  });
});
