import {
  createWalletAuthorizedOperation,
  deriveWalletSemanticSubjectFingerprint,
} from "../modules/learning-v2/contracts/wallet";
import type { OwnerRepositoryBlobRefV1 } from "../modules/learning-v2/progress/owner_repository";
import {
  createOwnerRepositoryMissingIndexEntryJournalRecord,
  createOwnerRepositoryWalletCreditJournalRecord,
  parseOwnerRepositoryEconomicEffectJournalRecord,
  parseOwnerRepositoryJournalRecord,
  parseOwnerRepositoryMissingIndexEntryJournalRecord,
  type OwnerRepositoryCanonicalIndexRepairKeyKind,
} from "../modules/learning-v2/progress/owner_repository_journal";
import {
  materializeOwnerRepositoryJournalRecordBlob,
  parseOwnerRepositoryJournalRecordBlob,
} from "../modules/learning-v2/progress/owner_repository_root_fold";
import {
  createWalletCanonicalLedgerEntriesFromAppliedReceipt,
  createWalletState,
  reduceAuthorizedWalletOperation,
} from "../modules/learning-v2/progress/wallet_reducer";
import {
  hashCanonicalBody,
  sha256Utf8,
} from "../modules/learning-v2/policies/decision_registry";

const accountScopeHash = "aaaaaaaaaaaaaaaa";
const generation = 4;
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

const effectRecord = () => {
  const state = createWalletState({ accountScopeHash });
  const sourceReceiptRef = {
    receiptType: "coin_exchange_trade" as const,
    receiptId: "repair-settlement-1",
    receiptFingerprint: sha256Utf8("repair-settlement-receipt-1"),
  };
  const operation = createWalletAuthorizedOperation({
    schemaVersion: "learning-v2-wallet-authorized-operation.v1",
    authority: "trusted_server_boundary",
    operationId: "repair-canonical-operation-1",
    semanticSubjectFingerprint: deriveWalletSemanticSubjectFingerprint({
      accountScopeHash,
      operationReason: "coin_exchange",
      sourceReceiptRef,
    }),
    accountScopeHash,
    accountGeneration: generation,
    currency: "access_star",
    walletRevisionBefore: state.revision,
    kind: "external_credit",
    amountSubunits: 175_000,
    earningCategory: null,
    operationReason: "coin_exchange",
    sourceReceiptRef,
    origin: { kind: "coin_exchange", tradeId: "repair-settlement-1" },
  });
  const receipt = reduceAuthorizedWalletOperation(state, operation, {
    currentAccountGeneration: generation,
  }).appliedReceipt;
  return createOwnerRepositoryWalletCreditJournalRecord({
    accountScopeHash,
    journalSequence: 1,
    repositoryRevisionBefore: 0,
    rootBeforeFingerprint: sha256Utf8("repair-root-0"),
    previousJournalRecordRef: null,
    walletStateBeforeRef: ref("wallet_state", "repair-wallet-0"),
    walletStateAfterRef: ref("wallet_state", "repair-wallet-1"),
    operationIndexManifestBeforeRef: ref("operation_index_manifest", "repair-operation-0"),
    operationIndexManifestAfterRef: ref("operation_index_manifest", "repair-operation-1"),
    subjectIndexManifestBeforeRef: ref("subject_index_manifest", "repair-subject-0"),
    subjectIndexManifestAfterRef: ref("subject_index_manifest", "repair-subject-1"),
    receiptIndexManifestBeforeRef: ref("receipt_index_manifest", "repair-receipt-0"),
    receiptIndexManifestAfterRef: ref("receipt_index_manifest", "repair-receipt-1"),
    appliedReceipt: receipt,
  });
};

const input = (
  repairKeyKind: OwnerRepositoryCanonicalIndexRepairKeyKind,
  overrides: Record<string, unknown> = {},
) => {
  const effect = effectRecord();
  const effectBlob = materializeOwnerRepositoryJournalRecordBlob(effect);
  const operationBefore = effect.operationIndexManifestAfterRef;
  const subjectBefore = effect.subjectIndexManifestAfterRef;
  const receiptBefore = effect.receiptIndexManifestAfterRef;
  return {
    accountScopeHash,
    acceptedAccountGeneration: generation,
    journalSequence: 2,
    repositoryRevisionBefore: 1,
    rootBeforeFingerprint: sha256Utf8("repair-root-1"),
    previousJournalRecordRef: effectBlob.ref,
    canonicalEffectJournalRecordRef: effectBlob.ref,
    repairKeyKind,
    walletStateRef: effect.walletStateAfterRef,
    operationIndexManifestBeforeRef: operationBefore,
    operationIndexManifestAfterRef:
      repairKeyKind === "operation_id" || repairKeyKind === "operation_fingerprint"
        ? ref("operation_index_manifest", `repair-operation-after-${repairKeyKind}`)
        : operationBefore,
    subjectIndexManifestBeforeRef: subjectBefore,
    subjectIndexManifestAfterRef:
      repairKeyKind === "semantic_subject"
        ? ref("subject_index_manifest", "repair-subject-after")
        : subjectBefore,
    receiptIndexManifestBeforeRef: receiptBefore,
    receiptIndexManifestAfterRef:
      repairKeyKind === "applied_receipt"
        ? ref("receipt_index_manifest", "repair-receipt-after")
        : receiptBefore,
    canonicalEffectRecord: effect,
    ...overrides,
  };
};

const rehash = (record: unknown) => {
  const copy = JSON.parse(JSON.stringify(record)) as Record<string, unknown>;
  delete copy.journalRecordFingerprint;
  return { ...copy, journalRecordFingerprint: hashCanonicalBody(copy) };
};

describe("Learning V2 owner repository missing-index repair journal", () => {
  it("derives every one-key repair value from the canonical receipt", () => {
    const effect = effectRecord();
    const entries = createWalletCanonicalLedgerEntriesFromAppliedReceipt(effect.appliedReceipt);
    const expected = {
      operation_id: {
        indexKind: "operation",
        logicalKey: entries.operationLedgerEntry.operationId,
        value: entries.operationLedgerEntry,
      },
      operation_fingerprint: {
        indexKind: "operation",
        logicalKey: entries.operationLedgerEntry.operationFingerprint,
        value: entries.operationLedgerEntry,
      },
      semantic_subject: {
        indexKind: "subject",
        logicalKey: entries.subjectLedgerEntry.semanticSubjectFingerprint,
        value: entries.subjectLedgerEntry,
      },
      applied_receipt: {
        indexKind: "receipt",
        logicalKey: entries.appliedReceipt.appliedReceiptFingerprint,
        value: entries.appliedReceipt,
      },
    } as const;
    for (const keyKind of Object.keys(expected) as OwnerRepositoryCanonicalIndexRepairKeyKind[]) {
      const record = createOwnerRepositoryMissingIndexEntryJournalRecord(input(keyKind));
      expect(record).toMatchObject({
        recordKind: "missing_index_entry",
        repairKeyKind: keyKind,
        repairIndexKind: expected[keyKind].indexKind,
        repairLogicalKey: expected[keyKind].logicalKey,
        repairValueFingerprint: hashCanonicalBody(expected[keyKind].value),
        canonicalOperationId: effect.canonicalOperationId,
        appliedReceiptFingerprint: effect.appliedReceiptFingerprint,
        previousJournalRecordRef: record.canonicalEffectJournalRecordRef,
      });
      expect(parseOwnerRepositoryMissingIndexEntryJournalRecord(record)).toEqual(record);
      expect(parseOwnerRepositoryJournalRecord(record)).toEqual(record);
      expect(Object.isFrozen(record.canonicalEffectRecord.appliedReceipt)).toBe(true);
    }
  });

  it("requires exactly the selected manifest family to change", () => {
    const base = input("operation_id");
    expect(() => createOwnerRepositoryMissingIndexEntryJournalRecord({
      ...base,
      operationIndexManifestAfterRef: base.operationIndexManifestBeforeRef,
    })).toThrow("owner_repository_journal_invalid");
    expect(() => createOwnerRepositoryMissingIndexEntryJournalRecord({
      ...base,
      subjectIndexManifestAfterRef: ref("subject_index_manifest", "unexpected-subject-change"),
    })).toThrow("owner_repository_journal_invalid");
    expect(() => createOwnerRepositoryMissingIndexEntryJournalRecord(input("semantic_subject", {
      receiptIndexManifestAfterRef: ref("receipt_index_manifest", "unexpected-receipt-change"),
    }))).toThrow("owner_repository_journal_invalid");
    expect(() => createOwnerRepositoryMissingIndexEntryJournalRecord(input("applied_receipt", {
      operationIndexManifestAfterRef: ref("operation_index_manifest", "unexpected-operation-change"),
    }))).toThrow("owner_repository_journal_invalid");
  });

  it("permits a later generation but rejects stale generation and impossible coordinates", () => {
    expect(createOwnerRepositoryMissingIndexEntryJournalRecord(input("operation_id", {
      acceptedAccountGeneration: generation + 1,
    })).acceptedAccountGeneration).toBe(generation + 1);
    expect(() => createOwnerRepositoryMissingIndexEntryJournalRecord(input("operation_id", {
      acceptedAccountGeneration: generation - 1,
    }))).toThrow("owner_repository_journal_invalid");
    expect(() => createOwnerRepositoryMissingIndexEntryJournalRecord(input("operation_id", {
      repositoryRevisionBefore: 0,
    }))).toThrow("owner_repository_journal_invalid");
    expect(() => createOwnerRepositoryMissingIndexEntryJournalRecord(input("operation_id", {
      previousJournalRecordRef: null,
    }))).toThrow("owner_repository_journal_invalid");
    expect(() => createOwnerRepositoryMissingIndexEntryJournalRecord(input("unknown" as any)))
      .toThrow("owner_repository_journal_invalid");
  });

  it("rejects caller-forged derived fields, embedded effects, and ref aliases", () => {
    const record = createOwnerRepositoryMissingIndexEntryJournalRecord(input("operation_id"));
    for (const mutate of [
      (copy: any) => { copy.repairIndexKind = "receipt"; },
      (copy: any) => { copy.repairLogicalKey = sha256Utf8("wrong-key"); },
      (copy: any) => { copy.repairValueFingerprint = sha256Utf8("wrong-value"); },
      (copy: any) => { copy.canonicalEffectRecord.semanticFingerprint = sha256Utf8("wrong-effect"); },
      (copy: any) => { copy.canonicalEffectJournalRecordFingerprint = sha256Utf8("wrong-ref"); },
    ]) {
      const copy = JSON.parse(JSON.stringify(record));
      mutate(copy);
      expect(() => parseOwnerRepositoryMissingIndexEntryJournalRecord(rehash(copy)))
        .toThrow("owner_repository_journal_invalid");
    }
    const shared = sha256Utf8("repair-cross-kind-alias");
    expect(() => createOwnerRepositoryMissingIndexEntryJournalRecord(input("operation_id", {
      walletStateRef: {
        ...ref("wallet_state", "repair-shared-wallet"),
        blobFingerprint: shared,
        blobKey: `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${shared}`,
      },
      subjectIndexManifestBeforeRef: {
        ...ref("subject_index_manifest", "repair-shared-subject"),
        blobFingerprint: shared,
        blobKey: `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${shared}`,
      },
      subjectIndexManifestAfterRef: {
        ...ref("subject_index_manifest", "repair-shared-subject-after"),
        blobFingerprint: shared,
        blobKey: `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${shared}`,
      },
    }))).toThrow("owner_repository_journal_invalid");
  });

  it("uses the generic journal envelope but never the value-changing dispatcher", () => {
    const record = createOwnerRepositoryMissingIndexEntryJournalRecord(input("semantic_subject"));
    const blob = materializeOwnerRepositoryJournalRecordBlob(record);
    expect(parseOwnerRepositoryJournalRecordBlob({
      accountScopeHash,
      ref: blob.ref,
      raw: blob.encoded,
    }).record).toEqual(record);
    expect(() => parseOwnerRepositoryEconomicEffectJournalRecord(record))
      .toThrow("owner_repository_journal_invalid");
  });

  it("never executes create or parse accessors", () => {
    const record = createOwnerRepositoryMissingIndexEntryJournalRecord(input("applied_receipt"));
    let getterRuns = 0;
    const poisoned = { ...record } as Record<string, unknown>;
    Object.defineProperty(poisoned, "repairKeyKind", {
      enumerable: true,
      get: () => { getterRuns += 1; return "applied_receipt"; },
    });
    expect(() => parseOwnerRepositoryMissingIndexEntryJournalRecord(poisoned))
      .toThrow("owner_repository_journal_invalid");
    const createPoisoned = input("operation_fingerprint") as Record<string, unknown>;
    Object.defineProperty(createPoisoned, "canonicalEffectRecord", {
      enumerable: true,
      get: () => { getterRuns += 1; return effectRecord(); },
    });
    expect(() => createOwnerRepositoryMissingIndexEntryJournalRecord(createPoisoned))
      .toThrow("owner_repository_journal_invalid");
    expect(getterRuns).toBe(0);
  });
});
