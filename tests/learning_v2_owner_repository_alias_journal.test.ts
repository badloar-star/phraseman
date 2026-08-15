import {
  createWalletAuthorizedOperation,
  deriveWalletSemanticSubjectFingerprint,
} from "../modules/learning-v2/contracts/wallet";
import type { OwnerRepositoryBlobRefV1 } from "../modules/learning-v2/progress/owner_repository";
import {
  createOwnerRepositoryOperationAliasJournalRecord,
  createOwnerRepositoryWalletCreditJournalRecord,
  parseOwnerRepositoryEconomicEffectJournalRecord,
  parseOwnerRepositoryJournalRecord,
  parseOwnerRepositoryOperationAliasJournalRecord,
} from "../modules/learning-v2/progress/owner_repository_journal";
import {
  bindOwnerRepositoryWalletCreditSuccessorRootV2,
  materializeOwnerRepositoryJournalRecordBlob,
  parseOwnerRepositoryJournalRecordBlob,
} from "../modules/learning-v2/progress/owner_repository_root_fold";
import { createGenesisOwnerRepositoryRootV2 } from "../modules/learning-v2/progress/owner_repository_root_v2";
import {
  createWalletOperationAliasLedgerEntry,
  createWalletState,
  reduceAuthorizedWalletOperation,
} from "../modules/learning-v2/progress/wallet_reducer";
import {
  hashCanonicalBody,
  sha256Utf8,
} from "../modules/learning-v2/policies/decision_registry";

const accountScopeHash = "aaaaaaaaaaaaaaaa";
const accountGeneration = 4;

const ref = (
  kind: OwnerRepositoryBlobRefV1["kind"],
  label: string,
  account = accountScopeHash,
): OwnerRepositoryBlobRefV1 => {
  const blobFingerprint = sha256Utf8(label);
  return {
    schemaVersion: "learning-v2-owner-repository-blob-ref.v1",
    kind,
    blobKey: `learning_v2_owner_repository:v1:${account}:blob:${blobFingerprint}`,
    blobFingerprint,
  };
};

const canonicalReceipt = () => {
  const state = createWalletState({ accountScopeHash });
  const sourceReceiptRef = {
    receiptType: "coin_exchange_trade" as const,
    receiptId: "alias-settlement-1",
    receiptFingerprint: sha256Utf8("alias-settlement-receipt-1"),
  };
  const operation = createWalletAuthorizedOperation({
    schemaVersion: "learning-v2-wallet-authorized-operation.v1",
    authority: "trusted_server_boundary",
    operationId: "canonical-credit-operation-1",
    semanticSubjectFingerprint: deriveWalletSemanticSubjectFingerprint({
      accountScopeHash,
      operationReason: "coin_exchange",
      sourceReceiptRef,
    }),
    accountScopeHash,
    accountGeneration,
    currency: "access_star",
    walletRevisionBefore: 0,
    kind: "external_credit",
    amountSubunits: 250_000,
    earningCategory: null,
    operationReason: "coin_exchange",
    sourceReceiptRef,
    origin: { kind: "coin_exchange", tradeId: "alias-settlement-1" },
  });
  return reduceAuthorizedWalletOperation(state, operation, {
    currentAccountGeneration: accountGeneration,
  }).appliedReceipt;
};

const canonicalRecord = () => createOwnerRepositoryWalletCreditJournalRecord({
  accountScopeHash,
  journalSequence: 1,
  repositoryRevisionBefore: 0,
  rootBeforeFingerprint: sha256Utf8("alias-root-0"),
  previousJournalRecordRef: null,
  walletStateBeforeRef: ref("wallet_state", "alias-wallet-0"),
  walletStateAfterRef: ref("wallet_state", "alias-wallet-1"),
  operationIndexManifestBeforeRef: ref("operation_index_manifest", "alias-operation-0"),
  operationIndexManifestAfterRef: ref("operation_index_manifest", "alias-operation-1"),
  subjectIndexManifestBeforeRef: ref("subject_index_manifest", "alias-subject-0"),
  subjectIndexManifestAfterRef: ref("subject_index_manifest", "alias-subject-1"),
  receiptIndexManifestBeforeRef: ref("receipt_index_manifest", "alias-receipt-0"),
  receiptIndexManifestAfterRef: ref("receipt_index_manifest", "alias-receipt-1"),
  appliedReceipt: canonicalReceipt(),
});

const aliasOperation = (operationId = "transport-alias-operation-1") => {
  const receipt = canonicalReceipt();
  const canonical = receipt.authorizedOperation;
  const {
    semanticFingerprint: _semanticFingerprint,
    operationFingerprint: _operationFingerprint,
    ...unmaterialized
  } = canonical;
  return createWalletAuthorizedOperation({
    ...unmaterialized,
    operationId,
  });
};

const aliasInput = (overrides: Record<string, unknown> = {}) => {
  const effect = canonicalRecord();
  const effectBlob = materializeOwnerRepositoryJournalRecordBlob(effect);
  return {
    accountScopeHash,
    journalSequence: 2,
    repositoryRevisionBefore: 1,
    rootBeforeFingerprint: sha256Utf8("alias-root-1"),
    previousJournalRecordRef: effectBlob.ref,
    canonicalEffectJournalRecordRef: effectBlob.ref,
    walletStateRef: effect.walletStateAfterRef,
    operationIndexManifestBeforeRef: effect.operationIndexManifestAfterRef,
    operationIndexManifestAfterRef: ref("operation_index_manifest", "alias-operation-2"),
    subjectIndexManifestRef: effect.subjectIndexManifestAfterRef,
    receiptIndexManifestRef: effect.receiptIndexManifestAfterRef,
    canonicalEffectRecord: effect,
    authorizedAliasOperation: aliasOperation(),
    ...overrides,
  };
};

const rehash = (input: unknown) => {
  const copy = JSON.parse(JSON.stringify(input)) as Record<string, unknown>;
  delete copy.journalRecordFingerprint;
  return { ...copy, journalRecordFingerprint: hashCanonicalBody(copy) };
};

describe("Learning V2 owner repository operation-alias journal record", () => {
  it("derives the alias binding, permits the canonical effect as immediate predecessor, and round-trips", () => {
    const record = createOwnerRepositoryOperationAliasJournalRecord(aliasInput());
    expect(record).toMatchObject({
      recordKind: "operation_alias",
      acceptedAccountGeneration: accountGeneration,
      canonicalOperationId: record.canonicalEffectRecord.canonicalOperationId,
      aliasOperationId: record.aliasEntry.operationId,
      aliasOperationFingerprint: record.aliasEntry.operationFingerprint,
      semanticSubjectFingerprint: record.canonicalEffectRecord.semanticSubjectFingerprint,
      semanticFingerprint: record.canonicalEffectRecord.semanticFingerprint,
      appliedReceiptFingerprint: record.canonicalEffectRecord.appliedReceiptFingerprint,
      previousJournalRecordRef: record.canonicalEffectJournalRecordRef,
    });
    const body = { ...record } as Record<string, unknown>;
    delete body.journalRecordFingerprint;
    expect(record.journalRecordFingerprint).toBe(hashCanonicalBody(body));
    expect(parseOwnerRepositoryOperationAliasJournalRecord(record)).toEqual(record);
    expect(parseOwnerRepositoryJournalRecord(record)).toEqual(record);
    expect(Object.isFrozen(record.aliasEntry.authorizedAliasOperation.origin)).toBe(true);
    expect(() => parseOwnerRepositoryEconomicEffectJournalRecord(record))
      .toThrow("owner_repository_journal_invalid");
  });

  it("stores alias records in the generic journal envelope but never treats them as wallet effects", () => {
    const record = createOwnerRepositoryOperationAliasJournalRecord(aliasInput());
    const blob = materializeOwnerRepositoryJournalRecordBlob(record);
    expect(parseOwnerRepositoryJournalRecordBlob({
      accountScopeHash,
      ref: blob.ref,
      raw: blob.encoded,
    }).record).toEqual(record);

    const effect = canonicalRecord();
    const genesis = createGenesisOwnerRepositoryRootV2({
      accountScopeHash,
      currentGeneration: accountGeneration,
      walletStateRef: effect.walletStateBeforeRef,
      courseStateManifestRef: ref("course_state_manifest", "alias-course-empty"),
      operationIndexManifestRef: effect.operationIndexManifestBeforeRef,
      subjectIndexManifestRef: effect.subjectIndexManifestBeforeRef,
      receiptIndexManifestRef: effect.receiptIndexManifestBeforeRef,
    });
    expect(() => bindOwnerRepositoryWalletCreditSuccessorRootV2({
      rootBefore: genesis.root,
      journalRecordBlob: blob,
    })).toThrow("owner_repository_root_fold_invalid");
  });

  it("rejects false aliases, torn coordinates, and impossible cross-kind refs", () => {
    const effect = canonicalRecord();
    expect(() => createOwnerRepositoryOperationAliasJournalRecord(aliasInput({
      authorizedAliasOperation: effect.appliedReceipt.authorizedOperation,
    }))).toThrow("owner_repository_journal_invalid");
    expect(() => createOwnerRepositoryOperationAliasJournalRecord(aliasInput({
      operationIndexManifestAfterRef: effect.operationIndexManifestAfterRef,
    }))).toThrow("owner_repository_journal_invalid");
    expect(() => createOwnerRepositoryOperationAliasJournalRecord(aliasInput({
      journalSequence: 2,
      repositoryRevisionBefore: 0,
    }))).toThrow("owner_repository_journal_invalid");
    expect(() => createOwnerRepositoryOperationAliasJournalRecord(aliasInput({
      previousJournalRecordRef: null,
    }))).toThrow("owner_repository_journal_invalid");

    const shared = sha256Utf8("alias-cross-kind-ref");
    expect(() => createOwnerRepositoryOperationAliasJournalRecord(aliasInput({
      walletStateRef: {
        ...ref("wallet_state", "alias-wallet-shared"),
        blobFingerprint: shared,
        blobKey: `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${shared}`,
      },
      operationIndexManifestBeforeRef: {
        ...ref("operation_index_manifest", "alias-operation-shared"),
        blobFingerprint: shared,
        blobKey: `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${shared}`,
      },
    }))).toThrow("owner_repository_journal_invalid");
    const effectRef = aliasInput().canonicalEffectJournalRecordRef as OwnerRepositoryBlobRefV1;
    expect(() => createOwnerRepositoryOperationAliasJournalRecord(aliasInput({
      walletStateRef: {
        ...ref("wallet_state", "alias-wallet-effect-collision"),
        blobFingerprint: effectRef.blobFingerprint,
        blobKey: effectRef.blobKey,
      },
    }))).toThrow("owner_repository_journal_invalid");
  });

  it("rejects derived-field, embedded-effect, and alias-entry tampering after rehash", () => {
    const record = createOwnerRepositoryOperationAliasJournalRecord(aliasInput());
    for (const mutate of [
      (copy: any) => { copy.acceptedAccountGeneration += 1; },
      (copy: any) => { copy.canonicalEffectJournalRecordFingerprint = sha256Utf8("wrong-effect"); },
      (copy: any) => { copy.aliasOperationFingerprint = sha256Utf8("wrong-alias"); },
      (copy: any) => { copy.canonicalEffectRecord.semanticFingerprint = sha256Utf8("wrong-semantic"); },
      (copy: any) => { copy.aliasEntry.aliasEntryFingerprint = sha256Utf8("wrong-entry"); },
    ]) {
      const copy = JSON.parse(JSON.stringify(record));
      mutate(copy);
      expect(() => parseOwnerRepositoryOperationAliasJournalRecord(rehash(copy)))
        .toThrow("owner_repository_journal_invalid");
    }

    const otherAlias = aliasOperation("transport-alias-operation-2");
    const replacementEntry = createWalletOperationAliasLedgerEntry({
      authorizedAliasOperation: otherAlias,
      appliedReceipt: record.canonicalEffectRecord.appliedReceipt,
    });
    const changed = JSON.parse(JSON.stringify(record));
    changed.aliasEntry = replacementEntry;
    expect(() => parseOwnerRepositoryOperationAliasJournalRecord(rehash(changed)))
      .toThrow("owner_repository_journal_invalid");
  });

  it("never executes accessors and rejects hidden, symbol, and extra fields", () => {
    const good = createOwnerRepositoryOperationAliasJournalRecord(aliasInput());
    let getterRuns = 0;
    const getter = { ...good } as Record<string, unknown>;
    Object.defineProperty(getter, "aliasEntry", {
      enumerable: true,
      get: () => { getterRuns += 1; return good.aliasEntry; },
    });
    const hidden = { ...good } as Record<string, unknown>;
    Object.defineProperty(hidden, "hidden", { enumerable: false, value: true });
    const symbol = { ...good } as Record<string | symbol, unknown>;
    symbol[Symbol("poison")] = true;
    const extra = { ...good, extra: true };
    for (const candidate of [getter, hidden, symbol, extra]) {
      expect(() => parseOwnerRepositoryOperationAliasJournalRecord(candidate))
        .toThrow("owner_repository_journal_invalid");
    }
    expect(getterRuns).toBe(0);

    const createGetter = aliasInput() as Record<string, unknown>;
    Object.defineProperty(createGetter, "authorizedAliasOperation", {
      enumerable: true,
      get: () => { getterRuns += 1; return aliasOperation(); },
    });
    expect(() => createOwnerRepositoryOperationAliasJournalRecord(createGetter))
      .toThrow("owner_repository_journal_invalid");
    expect(getterRuns).toBe(0);
  });
});
