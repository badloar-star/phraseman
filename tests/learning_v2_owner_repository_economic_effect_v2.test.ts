import {
  createWalletAuthorizedOperation,
  deriveWalletSemanticSubjectFingerprint,
} from "../modules/learning-v2/contracts/wallet";
import type { OwnerRepositoryBlobRefV1 } from "../modules/learning-v2/progress/owner_repository";
import {
  assertOwnerRepositoryCanonicalEffectBindingV2,
  createOwnerRepositoryCanonicalEconomicIndexValuesV2,
  createOwnerRepositoryOperationAliasRecordV2,
  createOwnerRepositoryWalletCreditEffectRecordV2,
  materializeOwnerRepositoryOperationAliasRecordBlobV2,
  materializeOwnerRepositoryWalletCreditEffectRecordBlobV2,
  parseOwnerRepositoryOperationAliasRecordBlobV2,
  parseOwnerRepositoryCanonicalEconomicIndexValueV2,
  parseOwnerRepositoryWalletCreditEffectRecordBlobV2,
  parseOwnerRepositoryWalletCreditEffectRecordV2,
} from "../modules/learning-v2/progress/owner_repository_economic_effect_v2";
import {
  auditOwnerRepositoryEconomicClosurePage,
  createEmptyOwnerRepositoryEconomicManifest,
  lookupOwnerRepositoryCanonicalEconomicLedgerClosureV2,
  parseOwnerRepositoryEconomicManifestBlob,
  planOwnerRepositoryCanonicalEconomicClosureV2,
  planOwnerRepositoryOperationAliasV2,
} from "../modules/learning-v2/progress/owner_repository_economic_manifest";
import { createEmptyOwnerRepositoryCourseManifest } from "../modules/learning-v2/progress/owner_repository_course_manifest";
import {
  planOwnerRepositoryRadixBatch,
  type OwnerRepositoryRadixNodeRefV1,
} from "../modules/learning-v2/progress/owner_repository_radix";
import {
  createWalletState,
  reduceAuthorizedWalletOperation,
} from "../modules/learning-v2/progress/wallet_reducer";
import {
  bindOwnerRepositoryOperationAliasV2SuccessorRootV3,
  bindOwnerRepositoryWalletCreditEffectV2SuccessorRootV3FromV2,
  createOwnerRepositoryRootV3AdoptionBaseFromFreshV2,
  parseOwnerRepositoryWalletCheckpointV1AnchorCandidate,
} from "../modules/learning-v2/progress/owner_repository_root_v3";
import { createGenesisOwnerRepositoryRootV2 } from "../modules/learning-v2/progress/owner_repository_root_v2";
import {
  createOwnerRepositoryWalletCheckpointAccumulator,
  matchOwnerRepositoryWalletCheckpointProjection,
  materializeOwnerRepositoryWalletCheckpoint,
} from "../modules/learning-v2/progress/owner_repository_wallet_checkpoint";
import { materializeOwnerRepositoryWalletStateBlob } from "../modules/learning-v2/progress/owner_repository_wallet_blob";
import { verifyOwnerRepositoryWalletWindow } from "../modules/learning-v2/progress/owner_repository_wallet_window";
import { planOwnerRepositoryWalletCreditV2 } from "../modules/learning-v2/progress/owner_repository_wallet_credit_plan";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
} from "../modules/learning-v2/policies/decision_registry";

const accountScopeHash = "aaaaaaaaaaaaaaaa";
const ref = (
  kind: OwnerRepositoryBlobRefV1["kind"],
  label: string,
): OwnerRepositoryBlobRefV1 => {
  const blobFingerprint = sha256Utf8(label);
  return {
    schemaVersion: "learning-v2-owner-repository-blob-ref.v1",
    kind,
    blobKey:
      `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${blobFingerprint}`,
    blobFingerprint,
  };
};

const fixture = () => {
  const wallet = createWalletState({ accountScopeHash });
  const sourceReceiptRef = {
    receiptType: "coin_exchange_trade" as const,
    receiptId: "economic-effect-v2-credit-1",
    receiptFingerprint: sha256Utf8("economic-effect-v2-source-1"),
  };
  const operation = createWalletAuthorizedOperation({
    schemaVersion: "learning-v2-wallet-authorized-operation.v1",
    authority: "trusted_server_boundary",
    operationId: "economic-effect-v2-credit-1",
    semanticSubjectFingerprint: deriveWalletSemanticSubjectFingerprint({
      accountScopeHash,
      operationReason: "coin_exchange",
      sourceReceiptRef,
    }),
    accountScopeHash,
    accountGeneration: 4,
    currency: "access_star",
    walletRevisionBefore: 0,
    kind: "external_credit",
    amountSubunits: 300_000,
    earningCategory: null,
    operationReason: "coin_exchange",
    sourceReceiptRef,
    origin: { kind: "coin_exchange", tradeId: "economic-effect-v2-credit-1" },
  });
  const applied = reduceAuthorizedWalletOperation(wallet, operation, {
    currentAccountGeneration: 4,
  });
  const input = {
    accountScopeHash,
    journalSequence: 1,
    repositoryRevisionBefore: 0,
    rootBeforeFingerprint: sha256Utf8("economic-effect-v2-root-before"),
    previousJournalRecordRef: null,
    walletStateBeforeRef: ref("wallet_state", "economic-effect-v2-wallet-before"),
    walletStateAfterRef: ref("wallet_state", "economic-effect-v2-wallet-after"),
    operationIndexManifestBeforeRef: ref(
      "operation_index_manifest",
      "economic-effect-v2-operation-before",
    ),
    subjectIndexManifestBeforeRef: ref(
      "subject_index_manifest",
      "economic-effect-v2-subject-before",
    ),
    receiptIndexManifestBeforeRef: ref(
      "receipt_index_manifest",
      "economic-effect-v2-receipt-before",
    ),
    appliedReceipt: applied.appliedReceipt,
  } as const;
  const record = createOwnerRepositoryWalletCreditEffectRecordV2(input);
  const blob = materializeOwnerRepositoryWalletCreditEffectRecordBlobV2(record);
  const values = createOwnerRepositoryCanonicalEconomicIndexValuesV2({
    journalRecordBlob: blob,
  });
  return { applied, input, record, blob, values };
};

describe("Learning V2 cycle-free economic effect/index binding V2", () => {
  it("materializes the journal ref before COW and binds all canonical index values", () => {
    const { record, blob, values } = fixture();
    expect(parseOwnerRepositoryWalletCreditEffectRecordV2(record)).toEqual(record);
    expect(
      parseOwnerRepositoryWalletCreditEffectRecordBlobV2({
        accountScopeHash,
        ref: blob.ref,
        raw: blob.encoded,
      }),
    ).toEqual(blob);
    expect(values.effectBinding).toMatchObject({
      canonicalEffectJournalRecordRef: blob.ref,
      canonicalEffectJournalRecordFingerprint: record.journalRecordFingerprint,
      effectJournalSequence: 1,
      appliedReceiptFingerprint: record.appliedReceiptFingerprint,
    });
    expect(blob.encoded).not.toContain("operationIndexManifestAfterRef");
    expect(blob.encoded).not.toContain("subjectIndexManifestAfterRef");
    expect(blob.encoded).not.toContain("receiptIndexManifestAfterRef");

    const coordinates = [
      [
        "operation",
        "operation_id",
        record.canonicalOperationId,
        values.operationValue,
      ],
      [
        "operation",
        "operation_fingerprint",
        record.operationFingerprint,
        values.operationValue,
      ],
      [
        "subject",
        "semantic_subject",
        record.semanticSubjectFingerprint,
        values.subjectValue,
      ],
      [
        "receipt",
        "applied_receipt",
        record.appliedReceiptFingerprint,
        values.receiptValue,
      ],
    ] as const;
    for (const [indexKind, keyKind, logicalKey, value] of coordinates) {
      expect(
        parseOwnerRepositoryCanonicalEconomicIndexValueV2({
          accountScopeHash,
          indexKind,
          keyKind,
          logicalKey,
          value,
        }),
      ).toEqual(value);
    }
    expect(
      assertOwnerRepositoryCanonicalEffectBindingV2({
        effectBinding: values.effectBinding,
        raw: blob.encoded,
      }),
    ).toEqual(blob);
    expect(Object.isFrozen(values.receiptValue.effectBinding)).toBe(true);
  });

  it("rejects after-manifest authority and impossible chain/ref coordinates", () => {
    const { input } = fixture();
    expect(() =>
      createOwnerRepositoryWalletCreditEffectRecordV2({
        ...input,
        operationIndexManifestAfterRef: ref(
          "operation_index_manifest",
          "not-allowed-after-ref",
        ),
      }),
    ).toThrow("owner_repository_economic_effect_v2_invalid");
    expect(() =>
      createOwnerRepositoryWalletCreditEffectRecordV2({
        ...input,
        journalSequence: 2,
      }),
    ).toThrow("owner_repository_economic_effect_v2_invalid");
    expect(() =>
      createOwnerRepositoryWalletCreditEffectRecordV2({
        ...input,
        walletStateAfterRef: input.walletStateBeforeRef,
      }),
    ).toThrow("owner_repository_economic_effect_v2_invalid");
  });

  it("rejects key/value substitutions and a rehashed off-chain journal reference", () => {
    const { record, blob, values } = fixture();
    expect(() =>
      parseOwnerRepositoryCanonicalEconomicIndexValueV2({
        accountScopeHash,
        indexKind: "operation",
        keyKind: "operation_id",
        logicalKey: "different-operation-id",
        value: values.operationValue,
      }),
    ).toThrow("owner_repository_economic_effect_v2_indeterminate");

    const forgedRef = ref("journal_record", "off-chain-effect-record");
    const bindingBody = {
      ...values.effectBinding,
      canonicalEffectJournalRecordRef: forgedRef,
    } as Record<string, unknown>;
    delete bindingBody.bindingFingerprint;
    const forgedBinding = {
      ...bindingBody,
      bindingFingerprint: hashCanonicalBody(bindingBody),
    };
    const valueBody = {
      ...values.receiptValue,
      effectBinding: forgedBinding,
    } as Record<string, unknown>;
    delete valueBody.valueFingerprint;
    const forgedValue = {
      ...valueBody,
      valueFingerprint: hashCanonicalBody(valueBody),
    };
    const parsed = parseOwnerRepositoryCanonicalEconomicIndexValueV2({
      accountScopeHash,
      indexKind: "receipt",
      keyKind: "applied_receipt",
      logicalKey: record.appliedReceiptFingerprint,
      value: forgedValue,
    });
    expect(parsed.effectBinding.canonicalEffectJournalRecordRef).toEqual(
      forgedRef,
    );
    expect(() =>
      assertOwnerRepositoryCanonicalEffectBindingV2({
        effectBinding: parsed.effectBinding,
        raw: blob.encoded,
      }),
    ).toThrow("owner_repository_economic_effect_v2_invalid");
  });

  it("plans exact 2/1/1 lifetime COW, replays it and rejects a partial closure", async () => {
    const { record, blob, values } = fixture();
    const nodes = new Map<string, string>();
    const resolveNode = (nodeRef: OwnerRepositoryRadixNodeRefV1) =>
      nodes.get(nodeRef.blobKey) ?? null;
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
    const plan = await planOwnerRepositoryCanonicalEconomicClosureV2({
      accountScopeHash,
      operationManifest: operation.manifest,
      subjectManifest: subject.manifest,
      receiptManifest: receipt.manifest,
      journalRecordBlob: blob,
      resolveNode,
    });
    expect(plan).toMatchObject({
      changed: true,
      operationManifest: { entryCount: 2 },
      subjectManifest: { entryCount: 1 },
      receiptManifest: { entryCount: 1 },
    });
    for (const blob of plan.immutableNodeBlobs) {
      nodes.set(blob.ref.blobKey, blob.encoded);
    }
    const closure = await lookupOwnerRepositoryCanonicalEconomicLedgerClosureV2({
      accountScopeHash,
      operationManifest: plan.operationManifest,
      subjectManifest: plan.subjectManifest,
      receiptManifest: plan.receiptManifest,
      operationId: record.canonicalOperationId,
      operationFingerprint: record.operationFingerprint,
      semanticSubjectFingerprint: record.semanticSubjectFingerprint,
      resolveNode,
    });
    expect(closure).toMatchObject({
      status: "canonical",
      effectBinding: {
        canonicalEffectJournalRecordRef:
          values.effectBinding.canonicalEffectJournalRecordRef,
      },
    });
    const replay = await planOwnerRepositoryCanonicalEconomicClosureV2({
      accountScopeHash,
      operationManifest: plan.operationManifest,
      subjectManifest: plan.subjectManifest,
      receiptManifest: plan.receiptManifest,
      journalRecordBlob: blob,
      resolveNode,
    });
    expect(replay).toMatchObject({ changed: false, immutableNodeBlobs: [] });
    expect(replay.operationManifest).toEqual(plan.operationManifest);

    const canonicalOperation = record.appliedReceipt.authorizedOperation;
    const {
      operationFingerprint: _operationFingerprint,
      semanticFingerprint: _semanticFingerprint,
      ...aliasBody
    } = canonicalOperation;
    const aliasOperation = createWalletAuthorizedOperation({
      ...aliasBody,
      operationId: "economic-effect-v2-credit-alias-1",
      walletRevisionBefore: 1,
    });
    const alias = await planOwnerRepositoryOperationAliasV2({
      accountScopeHash,
      operationManifest: plan.operationManifest,
      subjectManifest: plan.subjectManifest,
      receiptManifest: plan.receiptManifest,
      authorizedAliasOperation: aliasOperation,
      resolveNode,
    });
    expect(alias).toMatchObject({
      changed: true,
      operationManifest: { entryCount: 4 },
      aliasValue: {
        valueKind: "operation_alias",
        effectBinding: values.effectBinding,
      },
    });
    const aliasRecord = createOwnerRepositoryOperationAliasRecordV2({
      accountScopeHash,
      journalSequence: 2,
      repositoryRevisionBefore: 1,
      rootBeforeFingerprint: sha256Utf8("economic-effect-v2-alias-root"),
      previousJournalRecordRef: blob.ref,
      walletStateRef: record.walletStateAfterRef,
      operationIndexManifestBeforeRef: plan.operationManifestBlob.ref,
      operationIndexManifestAfterRef: alias.operationManifestBlob.ref,
      subjectIndexManifestRef: plan.subjectManifestBlob.ref,
      receiptIndexManifestRef: plan.receiptManifestBlob.ref,
      aliasValue: alias.aliasValue,
    });
    const aliasRecordBlob =
      materializeOwnerRepositoryOperationAliasRecordBlobV2(aliasRecord);
    expect(
      parseOwnerRepositoryOperationAliasRecordBlobV2({
        accountScopeHash,
        ref: aliasRecordBlob.ref,
        raw: aliasRecordBlob.encoded,
      }),
    ).toEqual(aliasRecordBlob);
    expect(aliasRecord).toMatchObject({
      acceptedAccountGeneration:
        aliasOperation.accountGeneration,
      canonicalEffectBinding: values.effectBinding,
      aliasValue: alias.aliasValue,
    });
    expect(aliasRecordBlob.encoded).not.toContain("canonicalEffectRecord");
    for (const nodeBlob of alias.immutableNodeBlobs) {
      nodes.set(nodeBlob.ref.blobKey, nodeBlob.encoded);
    }
    const aliasClosure =
      await lookupOwnerRepositoryCanonicalEconomicLedgerClosureV2({
        accountScopeHash,
        operationManifest: alias.operationManifest,
        subjectManifest: plan.subjectManifest,
        receiptManifest: plan.receiptManifest,
        operationId: aliasOperation.operationId,
        operationFingerprint: aliasOperation.operationFingerprint,
        semanticSubjectFingerprint:
          aliasOperation.semanticSubjectFingerprint,
        resolveNode,
      });
    expect(aliasClosure).toMatchObject({
      status: "alias",
      operationValue: alias.aliasValue,
      effectBinding: values.effectBinding,
    });
    const aliasReplay = await planOwnerRepositoryOperationAliasV2({
      accountScopeHash,
      operationManifest: alias.operationManifest,
      subjectManifest: plan.subjectManifest,
      receiptManifest: plan.receiptManifest,
      authorizedAliasOperation: aliasOperation,
      resolveNode,
    });
    expect(aliasReplay).toMatchObject({
      changed: false,
      immutableNodeBlobs: [],
    });
    let auditCursor: Parameters<
      typeof auditOwnerRepositoryEconomicClosurePage
    >[0]["cursor"] = null;
    let auditDone = false;
    for (let page = 0; page < 4 && !auditDone; page += 1) {
      const audit = await auditOwnerRepositoryEconomicClosurePage({
        accountScopeHash,
        operationManifest: alias.operationManifest,
        subjectManifest: plan.subjectManifest,
        receiptManifest: plan.receiptManifest,
        cursor: auditCursor,
        maxNodes: 128,
        resolveNode,
      });
      auditDone = audit.done;
      auditCursor = audit.cursor;
    }
    expect(auditDone).toBe(true);
    expect(auditCursor).toBeNull();

    const partial = await planOwnerRepositoryRadixBatch({
      accountScopeHash,
      indexKind: "operation",
      manifest: operation.manifest,
      mutations: [
        {
          keyKind: "operation_id",
          logicalKey: record.canonicalOperationId,
          value: values.operationValue,
        },
      ],
      resolveNode,
    });
    for (const blob of partial.immutableBlobs) {
      nodes.set(blob.ref.blobKey, blob.encoded);
    }
    await expect(
      planOwnerRepositoryCanonicalEconomicClosureV2({
        accountScopeHash,
        operationManifest: partial.manifest,
        subjectManifest: subject.manifest,
        receiptManifest: receipt.manifest,
        journalRecordBlob: blob,
        resolveNode,
      }),
    ).rejects.toThrow("owner_economic_manifest_indeterminate");

    let getterRuns = 0;
    await expect(
      planOwnerRepositoryCanonicalEconomicClosureV2({
        accountScopeHash,
        operationManifest: operation.manifest,
        subjectManifest: subject.manifest,
        receiptManifest: receipt.manifest,
        journalRecordBlob: {
          ...blob,
          record: Object.defineProperty(
            { ...blob.record },
            "accountScopeHash",
            {
              enumerable: true,
              get: () => {
                getterRuns += 1;
                return accountScopeHash;
              },
            },
          ),
        },
        resolveNode,
      }),
    ).rejects.toThrow("owner_economic_manifest_invalid");
    expect(getterRuns).toBe(0);
  });

  it("cold-verifies two RootV3 transitions by rebuilding V2 wallet effects and indexes", async () => {
    const { applied } = fixture();
    const storage = new Map<string, string>();
    const walletBefore = materializeOwnerRepositoryWalletStateBlob(
      createWalletState({ accountScopeHash }),
    );
    const walletAfter = materializeOwnerRepositoryWalletStateBlob(applied.state);
    const course = await createEmptyOwnerRepositoryCourseManifest(
      accountScopeHash,
    );
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
      walletStateRef: walletBefore.blob.ref,
      courseStateManifestRef: course.manifestBlob.ref,
      operationIndexManifestRef: operation.manifestBlob.ref,
      subjectIndexManifestRef: subject.manifestBlob.ref,
      receiptIndexManifestRef: receipt.manifestBlob.ref,
    });
    const record = createOwnerRepositoryWalletCreditEffectRecordV2({
      accountScopeHash,
      journalSequence: 1,
      repositoryRevisionBefore: 0,
      rootBeforeFingerprint: genesis.root.rootFingerprint,
      previousJournalRecordRef: null,
      walletStateBeforeRef: walletBefore.blob.ref,
      walletStateAfterRef: walletAfter.blob.ref,
      operationIndexManifestBeforeRef: operation.manifestBlob.ref,
      subjectIndexManifestBeforeRef: subject.manifestBlob.ref,
      receiptIndexManifestBeforeRef: receipt.manifestBlob.ref,
      appliedReceipt: applied.appliedReceipt,
    });
    const journal = materializeOwnerRepositoryWalletCreditEffectRecordBlobV2(
      record,
    );
    const nodes = new Map<string, string>();
    const resolveNode = (nodeRef: OwnerRepositoryRadixNodeRefV1) =>
      nodes.get(nodeRef.blobKey) ?? null;
    const closure = await planOwnerRepositoryCanonicalEconomicClosureV2({
      accountScopeHash,
      operationManifest: operation.manifest,
      subjectManifest: subject.manifest,
      receiptManifest: receipt.manifest,
      journalRecordBlob: journal,
      resolveNode,
    });
    for (const node of closure.immutableNodeBlobs) {
      nodes.set(node.ref.blobKey, node.encoded);
      storage.set(node.ref.blobKey, node.encoded);
    }
    const store = (blob: Readonly<{
      readonly ref: OwnerRepositoryBlobRefV1;
      readonly encoded: string;
    }>) => storage.set(blob.ref.blobKey, blob.encoded);
    for (const blob of [
      walletBefore.blob,
      walletAfter.blob,
      course.manifestBlob,
      operation.manifestBlob,
      subject.manifestBlob,
      receipt.manifestBlob,
      closure.operationManifestBlob,
      closure.subjectManifestBlob,
      closure.receiptManifestBlob,
      journal,
    ]) store(blob);
    const checkpoint = materializeOwnerRepositoryWalletCheckpoint({
      accumulator: createOwnerRepositoryWalletCheckpointAccumulator({
        startingRoot: genesis,
        previousCheckpoint: null,
      }),
      endingWalletStateBlob: walletBefore.blob,
    });
    const matchedCheckpoint = await matchOwnerRepositoryWalletCheckpointProjection({
      checkpoint,
      checkpointRoot: genesis.root,
      walletStateBlob: walletBefore.blob,
      courseManifestBlob: course.manifestBlob,
      operationManifestBlob: operation.manifestBlob,
      subjectManifestBlob: subject.manifestBlob,
      receiptManifestBlob: receipt.manifestBlob,
      resolveNode,
    });
    const anchor = parseOwnerRepositoryWalletCheckpointV1AnchorCandidate({
      checkpoint: matchedCheckpoint,
      checkpointRoot: genesis.root,
      walletStateBlob: walletBefore.blob,
    });
    const successor =
      bindOwnerRepositoryWalletCreditEffectV2SuccessorRootV3FromV2({
        adoptionBase: createOwnerRepositoryRootV3AdoptionBaseFromFreshV2({
          rootBefore: genesis,
          checkpointAnchorCandidate: anchor,
        }),
        journalRecordBlob: journal,
        operationIndexManifestAfterRef: closure.operationManifestBlob.ref,
        subjectIndexManifestAfterRef: closure.subjectManifestBlob.ref,
        receiptIndexManifestAfterRef: closure.receiptManifestBlob.ref,
      });
    const nextSourceReceiptRef = {
      receiptType: "coin_exchange_trade" as const,
      receiptId: "economic-effect-v2-credit-2",
      receiptFingerprint: sha256Utf8("economic-effect-v2-source-2"),
    };
    const nextOperation = createWalletAuthorizedOperation({
      schemaVersion: "learning-v2-wallet-authorized-operation.v1",
      authority: "trusted_server_boundary",
      operationId: "economic-effect-v2-credit-2",
      semanticSubjectFingerprint: deriveWalletSemanticSubjectFingerprint({
        accountScopeHash,
        operationReason: "coin_exchange",
        sourceReceiptRef: nextSourceReceiptRef,
      }),
      accountScopeHash,
      accountGeneration: 4,
      currency: "access_star",
      walletRevisionBefore: 1,
      kind: "external_credit",
      amountSubunits: 200_000,
      earningCategory: null,
      operationReason: "coin_exchange",
      sourceReceiptRef: nextSourceReceiptRef,
      origin: {
        kind: "coin_exchange",
        tradeId: "economic-effect-v2-credit-2",
      },
    });
    const nextPlan = await planOwnerRepositoryWalletCreditV2({
      rootBefore: successor.root,
      walletStateBeforeBlob: walletAfter.blob,
      operationManifestBlob: closure.operationManifestBlob,
      subjectManifestBlob: closure.subjectManifestBlob,
      receiptManifestBlob: closure.receiptManifestBlob,
      authorizedOperation: nextOperation,
      promotedCheckpointAnchor: null,
      resolveNode,
    });
    if (nextPlan.status !== "applied") throw new Error("test_fixture_invalid");
    expect(nextPlan.journalRecord).toMatchObject({
      schemaVersion:
        "learning-v2-owner-repository-wallet-credit-effect-record.v2",
      journalSequence: 2,
      previousJournalRecordRef: journal.ref,
    });
    expect(nextPlan.journalRecordBlob.encoded).not.toContain(
      "operationIndexManifestAfterRef",
    );
    for (const blob of nextPlan.immutableBlobs) {
      storage.set(blob.ref.blobKey, blob.encoded);
    }
    const nextSuccessor = nextPlan.successorRoot;
    const storageResolver = (nodeRef: OwnerRepositoryRadixNodeRefV1) =>
      storage.get(nodeRef.blobKey) ?? null;
    const operationAtSecond = await parseOwnerRepositoryEconomicManifestBlob({
      accountScopeHash,
      indexKind: "operation",
      ref: nextSuccessor.root.operationIndexManifestRef,
      raw: storage.get(nextSuccessor.root.operationIndexManifestRef.blobKey),
      resolveNode: storageResolver,
    });
    const subjectAtSecond = await parseOwnerRepositoryEconomicManifestBlob({
      accountScopeHash,
      indexKind: "subject",
      ref: nextSuccessor.root.subjectIndexManifestRef,
      raw: storage.get(nextSuccessor.root.subjectIndexManifestRef.blobKey),
      resolveNode: storageResolver,
    });
    const receiptAtSecond = await parseOwnerRepositoryEconomicManifestBlob({
      accountScopeHash,
      indexKind: "receipt",
      ref: nextSuccessor.root.receiptIndexManifestRef,
      raw: storage.get(nextSuccessor.root.receiptIndexManifestRef.blobKey),
      resolveNode: storageResolver,
    });
    const {
      semanticFingerprint: _nextSemanticFingerprint,
      operationFingerprint: _nextOperationFingerprint,
      ...nextAliasInput
    } = nextOperation;
    const nextAliasOperation = createWalletAuthorizedOperation({
      ...nextAliasInput,
      operationId: "economic-effect-v2-credit-2-alias",
      walletRevisionBefore: 2,
    });
    const aliasPlan = await planOwnerRepositoryOperationAliasV2({
      accountScopeHash,
      operationManifest: operationAtSecond.manifest,
      subjectManifest: subjectAtSecond.manifest,
      receiptManifest: receiptAtSecond.manifest,
      authorizedAliasOperation: nextAliasOperation,
      resolveNode: storageResolver,
    });
    for (const node of aliasPlan.immutableNodeBlobs) store(node);
    store(aliasPlan.operationManifestBlob);
    const aliasRecord = createOwnerRepositoryOperationAliasRecordV2({
      accountScopeHash,
      journalSequence: 3,
      repositoryRevisionBefore: 2,
      rootBeforeFingerprint: nextSuccessor.root.rootFingerprint,
      previousJournalRecordRef: nextPlan.journalRecordBlob.ref,
      walletStateRef: nextSuccessor.root.walletStateRef,
      operationIndexManifestBeforeRef:
        nextSuccessor.root.operationIndexManifestRef,
      operationIndexManifestAfterRef: aliasPlan.operationManifestBlob.ref,
      subjectIndexManifestRef: nextSuccessor.root.subjectIndexManifestRef,
      receiptIndexManifestRef: nextSuccessor.root.receiptIndexManifestRef,
      aliasValue: aliasPlan.aliasValue,
    });
    const aliasJournal =
      materializeOwnerRepositoryOperationAliasRecordBlobV2(aliasRecord);
    store(aliasJournal);
    const aliasSuccessor =
      bindOwnerRepositoryOperationAliasV2SuccessorRootV3({
        rootBefore: nextSuccessor.root,
        journalRecordBlob: aliasJournal,
        promotedCheckpointAnchor: null,
      });
    storage.set(checkpoint.key, checkpoint.encoded);
    storage.set(
      `learning_v2_owner_repository:v1:${accountScopeHash}:root-history:${genesis.root.rootFingerprint}`,
      genesis.encoded,
    );
    storage.set(
      `learning_v2_owner_repository:v1:${accountScopeHash}:root-history:${successor.root.rootFingerprint}`,
      successor.encoded,
    );
    storage.set(
      `learning_v2_owner_repository:v1:${accountScopeHash}:root-history:${nextSuccessor.root.rootFingerprint}`,
      nextSuccessor.encoded,
    );
    const resolveRaw = (key: string) => storage.get(key) ?? null;
    const verified = await verifyOwnerRepositoryWalletWindow({
      accountScopeHash,
      currentRootRaw: aliasSuccessor.encoded,
      resolveRaw,
      resolveNode: (nodeRef: OwnerRepositoryRadixNodeRefV1) =>
        resolveRaw(nodeRef.blobKey),
    });
    expect(verified).toMatchObject({
      currentRoot: { root: aliasSuccessor.root },
      verifiedRootTransitions: 3,
      authority: "window_verified_candidate",
    });

    storage.delete(aliasSuccessor.root.operationIndexManifestRef.blobKey);
    await expect(
      verifyOwnerRepositoryWalletWindow({
        accountScopeHash,
        currentRootRaw: aliasSuccessor.encoded,
        resolveRaw,
        resolveNode: (nodeRef: OwnerRepositoryRadixNodeRefV1) =>
          resolveRaw(nodeRef.blobKey),
      }),
    ).rejects.toThrow("owner_repository_wallet_window_indeterminate");
  });

  it("normalizes stored tampering and never executes accessors", () => {
    const { blob, values } = fixture();
    const envelope = JSON.parse(blob.encoded) as Record<string, unknown>;
    const payload = envelope.payload as Record<string, unknown>;
    envelope.payload = {
      ...payload,
      canonicalOperationId: "tampered-operation",
    };
    const tamperedRaw = canonicalJsonV1(envelope);
    const tamperedFingerprint = sha256Utf8(tamperedRaw);
    expect(() =>
      parseOwnerRepositoryWalletCreditEffectRecordBlobV2({
        accountScopeHash,
        ref: {
          ...blob.ref,
          blobFingerprint: tamperedFingerprint,
          blobKey:
            `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${tamperedFingerprint}`,
        },
        raw: tamperedRaw,
      }),
    ).toThrow("owner_repository_economic_effect_v2_indeterminate");

    let getterRuns = 0;
    const hostile = Object.defineProperty(
      {
        accountScopeHash,
        indexKind: "receipt",
        keyKind: "applied_receipt",
        logicalKey: values.receiptValue.appliedReceipt.appliedReceiptFingerprint,
      },
      "value",
      {
        enumerable: true,
        get: () => {
          getterRuns += 1;
          return values.receiptValue;
        },
      },
    );
    expect(() =>
      parseOwnerRepositoryCanonicalEconomicIndexValueV2(hostile),
    ).toThrow("owner_repository_economic_effect_v2_indeterminate");
    expect(getterRuns).toBe(0);

    const hostileRecord = Object.defineProperty(
      { ...blob.record },
      "accountScopeHash",
      {
        enumerable: true,
        get: () => {
          getterRuns += 1;
          return accountScopeHash;
        },
      },
    );
    expect(() =>
      createOwnerRepositoryCanonicalEconomicIndexValuesV2({
        journalRecordBlob: { ...blob, record: hostileRecord },
      }),
    ).toThrow("owner_repository_economic_effect_v2_invalid");
    expect(getterRuns).toBe(0);
  });
});
