import {
  createWalletAuthorizedOperation,
  deriveWalletSemanticSubjectFingerprint,
} from "../modules/learning-v2/contracts/wallet";
import {
  createOwnerRepositoryWalletCreditJournalRecord,
  parseOwnerRepositoryEconomicEffectJournalRecord,
  parseOwnerRepositoryWalletCreditJournalRecord,
} from "../modules/learning-v2/progress/owner_repository_journal";
import type { OwnerRepositoryBlobRefV1 } from "../modules/learning-v2/progress/owner_repository";
import {
  createWalletState,
  reduceAuthorizedWalletOperation,
} from "../modules/learning-v2/progress/wallet_reducer";
import { hashCanonicalBody, sha256Utf8 } from "../modules/learning-v2/policies/decision_registry";

const accountScopeHash = "aaaaaaaaaaaaaaaa";
const accountGeneration = 4;

const ref = (kind: OwnerRepositoryBlobRefV1["kind"], label: string): OwnerRepositoryBlobRefV1 => {
  const blobFingerprint = sha256Utf8(label);
  return {
    schemaVersion: "learning-v2-owner-repository-blob-ref.v1",
    kind,
    blobKey: `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${blobFingerprint}`,
    blobFingerprint,
  };
};

const receipt = (scopeHash = accountScopeHash) => {
  const state = createWalletState({ accountScopeHash: scopeHash });
  const sourceReceiptRef = {
    receiptType: "coin_exchange_trade" as const,
    receiptId: "journal-trade-1",
    receiptFingerprint: sha256Utf8("journal-trade-receipt-1"),
  };
  const operation = createWalletAuthorizedOperation({
    schemaVersion: "learning-v2-wallet-authorized-operation.v1",
    authority: "trusted_server_boundary",
    operationId: "journal-wallet-credit-1",
    semanticSubjectFingerprint: deriveWalletSemanticSubjectFingerprint({
      accountScopeHash: scopeHash,
      operationReason: "coin_exchange",
      sourceReceiptRef,
    }),
    accountScopeHash: scopeHash,
    accountGeneration,
    currency: "access_star",
    walletRevisionBefore: state.revision,
    kind: "external_credit",
    amountSubunits: 450_000,
    earningCategory: null,
    operationReason: "coin_exchange",
    sourceReceiptRef,
    origin: { kind: "coin_exchange", tradeId: "journal-trade-1" },
  });
  return reduceAuthorizedWalletOperation(state, operation, {
    currentAccountGeneration: accountGeneration,
  }).appliedReceipt;
};

const input = (overrides: Record<string, unknown> = {}) => ({
  accountScopeHash,
  journalSequence: 1,
  repositoryRevisionBefore: 0,
  rootBeforeFingerprint: sha256Utf8("root-before-0"),
  previousJournalRecordRef: null,
  walletStateBeforeRef: ref("wallet_state", "wallet-before"),
  walletStateAfterRef: ref("wallet_state", "wallet-after"),
  operationIndexManifestBeforeRef: ref("operation_index_manifest", "operation-before"),
  operationIndexManifestAfterRef: ref("operation_index_manifest", "operation-after"),
  subjectIndexManifestBeforeRef: ref("subject_index_manifest", "subject-before"),
  subjectIndexManifestAfterRef: ref("subject_index_manifest", "subject-after"),
  receiptIndexManifestBeforeRef: ref("receipt_index_manifest", "receipt-before"),
  receiptIndexManifestAfterRef: ref("receipt_index_manifest", "receipt-after"),
  appliedReceipt: receipt(),
  ...overrides,
});

describe("Learning V2 owner repository wallet-credit journal record", () => {
  it("derives every economic identity from the strict receipt and round-trips deeply frozen", () => {
    const record = createOwnerRepositoryWalletCreditJournalRecord(input());
    expect(record).toMatchObject({
      recordKind: "wallet_credit",
      accountScopeHash,
      acceptedAccountGeneration: accountGeneration,
      canonicalOperationId: record.appliedReceipt.operationId,
      operationFingerprint: record.appliedReceipt.operationFingerprint,
      semanticSubjectFingerprint: record.appliedReceipt.semanticSubjectFingerprint,
      semanticFingerprint: record.appliedReceipt.semanticFingerprint,
      appliedReceiptFingerprint: record.appliedReceipt.appliedReceiptFingerprint,
    });
    const body = { ...record } as Record<string, unknown>;
    delete body.journalRecordFingerprint;
    expect(record.journalRecordFingerprint).toBe(hashCanonicalBody(body));
    expect(parseOwnerRepositoryWalletCreditJournalRecord(JSON.parse(JSON.stringify(record)))).toEqual(record);
    expect(Object.isFrozen(record)).toBe(true);
    expect(Object.isFrozen(record.appliedReceipt.authorizedOperation.origin)).toBe(true);
  });

  it("enforces the genesis/predecessor sequence and safe repository revision", () => {
    expect(() => createOwnerRepositoryWalletCreditJournalRecord(input({
      journalSequence: 1,
      previousJournalRecordRef: ref("journal_record", "unexpected-predecessor"),
    }))).toThrow("owner_repository_journal_invalid");
    expect(() => createOwnerRepositoryWalletCreditJournalRecord(input({ journalSequence: 2 })))
      .toThrow("owner_repository_journal_invalid");
    expect(() => createOwnerRepositoryWalletCreditJournalRecord(input({
      journalSequence: 2,
      previousJournalRecordRef: ref("journal_record", "expected-predecessor"),
    }))).toThrow("owner_repository_journal_invalid");
    expect(createOwnerRepositoryWalletCreditJournalRecord(input({
      journalSequence: 2,
      repositoryRevisionBefore: 1,
      previousJournalRecordRef: ref("journal_record", "expected-predecessor"),
    })).journalSequence).toBe(2);
    expect(createOwnerRepositoryWalletCreditJournalRecord(input({
      journalSequence: 1,
      repositoryRevisionBefore: 9,
    })).repositoryRevisionBefore).toBe(9);
    expect(() => createOwnerRepositoryWalletCreditJournalRecord(input({
      repositoryRevisionBefore: Number.MAX_SAFE_INTEGER,
    }))).toThrow("owner_repository_journal_invalid");
  });

  it("requires wallet and all lifetime index projections to advance", () => {
    const base = input();
    for (const [afterKey, beforeKey] of [
      ["walletStateAfterRef", "walletStateBeforeRef"],
      ["operationIndexManifestAfterRef", "operationIndexManifestBeforeRef"],
      ["subjectIndexManifestAfterRef", "subjectIndexManifestBeforeRef"],
      ["receiptIndexManifestAfterRef", "receiptIndexManifestBeforeRef"],
    ] as const) {
      expect(() => createOwnerRepositoryWalletCreditJournalRecord(input({
        [afterKey]: base[beforeKey],
      }))).toThrow("owner_repository_journal_invalid");
    }
  });

  it("rejects nested or top-level tampering even with a recomputed outer fingerprint", () => {
    const record = createOwnerRepositoryWalletCreditJournalRecord(input());
    for (const mutate of [
      (copy: any) => { copy.acceptedAccountGeneration += 1; },
      (copy: any) => { copy.semanticFingerprint = sha256Utf8("forged-semantic"); },
      (copy: any) => { copy.walletStateAfterFingerprint = sha256Utf8("forged-wallet-after"); },
      (copy: any) => { copy.appliedReceipt.amountSubunits += 1; },
      (copy: any) => { copy.walletStateAfterRef.kind = "receipt_index_manifest"; },
    ]) {
      const copy = JSON.parse(JSON.stringify(record));
      mutate(copy);
      const body = { ...copy };
      delete body.journalRecordFingerprint;
      copy.journalRecordFingerprint = hashCanonicalBody(body);
      expect(() => parseOwnerRepositoryWalletCreditJournalRecord(copy))
        .toThrow("owner_repository_journal_invalid");
    }
  });

  it("never executes accessors and rejects symbol, hidden, extra and hostile nested data", () => {
    const good = createOwnerRepositoryWalletCreditJournalRecord(input());
    let getterRuns = 0;
    const getter = { ...good } as Record<string, unknown>;
    Object.defineProperty(getter, "recordKind", {
      enumerable: true,
      get: () => { getterRuns += 1; return "wallet_credit"; },
    });
    const symbol = { ...good } as Record<string | symbol, unknown>;
    symbol[Symbol("poison")] = true;
    const hidden = { ...good } as Record<string, unknown>;
    Object.defineProperty(hidden, "hidden", { enumerable: false, value: true });
    const extra = { ...good, unexpected: true };
    for (const candidate of [getter, symbol, hidden, extra]) {
      expect(() => parseOwnerRepositoryWalletCreditJournalRecord(candidate))
        .toThrow("owner_repository_journal_invalid");
    }
    expect(getterRuns).toBe(0);

    const createGetter = input() as Record<string, unknown>;
    Object.defineProperty(createGetter, "appliedReceipt", {
      enumerable: true,
      get: () => { getterRuns += 1; return receipt(); },
    });
    expect(() => createOwnerRepositoryWalletCreditJournalRecord(createGetter))
      .toThrow("owner_repository_journal_invalid");
    expect(getterRuns).toBe(0);
  });

  it("dispatches only strict value-changing economic records", () => {
    const record = createOwnerRepositoryWalletCreditJournalRecord(input());
    expect(parseOwnerRepositoryEconomicEffectJournalRecord(record)).toEqual(record);
    expect(() => parseOwnerRepositoryEconomicEffectJournalRecord({
      ...record,
      recordKind: "index_repair",
    })).toThrow("owner_repository_journal_invalid");
    let getterRuns = 0;
    const poisoned = { ...record } as Record<string, unknown>;
    Object.defineProperty(poisoned, "recordKind", {
      enumerable: true,
      get: () => { getterRuns += 1; return "wallet_credit"; },
    });
    expect(() => parseOwnerRepositoryEconomicEffectJournalRecord(poisoned))
      .toThrow("owner_repository_journal_invalid");
    expect(getterRuns).toBe(0);
  });

  it("rejects cross-account receipts, malformed refs and cross-kind blob aliasing", () => {
    const wrongAccountReceipt = receipt("bbbbbbbbbbbbbbbb");
    expect(() => createOwnerRepositoryWalletCreditJournalRecord(input({
      appliedReceipt: wrongAccountReceipt,
    }))).toThrow("owner_repository_journal_invalid");

    const wrongAccountRef = ref("wallet_state", "wrong-account-wallet");
    const wrongFingerprint = wrongAccountRef.blobFingerprint;
    expect(() => createOwnerRepositoryWalletCreditJournalRecord(input({
      walletStateBeforeRef: {
        ...wrongAccountRef,
        blobKey: `learning_v2_owner_repository:v1:bbbbbbbbbbbbbbbb:blob:${wrongFingerprint}`,
      },
    }))).toThrow("owner_repository_journal_invalid");

    const malformed = ref("wallet_state", "malformed-wallet");
    expect(() => createOwnerRepositoryWalletCreditJournalRecord(input({
      walletStateBeforeRef: { ...malformed, blobKey: `${malformed.blobKey}:wrong` },
    }))).toThrow("owner_repository_journal_invalid");

    const sharedFingerprint = sha256Utf8("cross-kind-alias");
    const walletBefore = {
      ...ref("wallet_state", "temporary-wallet"),
      blobFingerprint: sharedFingerprint,
      blobKey: `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${sharedFingerprint}`,
    };
    const operationBefore = {
      ...ref("operation_index_manifest", "temporary-operation"),
      blobFingerprint: sharedFingerprint,
      blobKey: `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${sharedFingerprint}`,
    };
    expect(() => createOwnerRepositoryWalletCreditJournalRecord(input({
      walletStateBeforeRef: walletBefore,
      operationIndexManifestBeforeRef: operationBefore,
    }))).toThrow("owner_repository_journal_invalid");

    expect(() => createOwnerRepositoryWalletCreditJournalRecord(input({
      journalSequence: 2,
      repositoryRevisionBefore: 1,
      previousJournalRecordRef: {
        ...ref("journal_record", "temporary-predecessor"),
        blobFingerprint: walletBefore.blobFingerprint,
        blobKey: walletBefore.blobKey,
      },
      walletStateBeforeRef: walletBefore,
    }))).toThrow("owner_repository_journal_invalid");
  });
});
