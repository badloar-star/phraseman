import {
  createWalletAuthorizedOperation,
  deriveWalletSemanticSubjectFingerprint,
} from "../modules/learning-v2/contracts/wallet";
import type { OwnerRepositoryBlobRefV1 } from "../modules/learning-v2/progress/owner_repository";
import { createOwnerRepositoryWalletCreditJournalRecord } from "../modules/learning-v2/progress/owner_repository_journal";
import {
  bindOwnerRepositoryWalletCreditSuccessorRootV2,
  materializeOwnerRepositoryJournalRecordBlob,
  parseOwnerRepositoryJournalRecordBlob,
} from "../modules/learning-v2/progress/owner_repository_root_fold";
import {
  advanceOwnerRepositoryRootV2Generation,
  createGenesisOwnerRepositoryRootV2,
} from "../modules/learning-v2/progress/owner_repository_root_v2";
import { createWalletState, reduceAuthorizedWalletOperation } from "../modules/learning-v2/progress/wallet_reducer";
import { canonicalJsonV1, hashCanonicalBody, sha256Utf8 } from "../modules/learning-v2/policies/decision_registry";

const accountScopeHash = "aaaaaaaaaaaaaaaa";
const generation = 4;
const ref = (kind: OwnerRepositoryBlobRefV1["kind"], label: string): OwnerRepositoryBlobRefV1 => {
  const blobFingerprint = sha256Utf8(label);
  return {
    schemaVersion: "learning-v2-owner-repository-blob-ref.v1",
    kind,
    blobKey: `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${blobFingerprint}`,
    blobFingerprint,
  };
};
const receipt = (label: string, revision = 0, receiptGeneration = generation) => {
  let state = createWalletState({ accountScopeHash });
  for (let index = 0; index < revision; index += 1) {
    const source = { receiptType: "coin_exchange_trade" as const, receiptId: `prior-${index}`, receiptFingerprint: sha256Utf8(`prior-${index}`) };
    state = reduceAuthorizedWalletOperation(state, createWalletAuthorizedOperation({
      schemaVersion: "learning-v2-wallet-authorized-operation.v1", authority: "trusted_server_boundary",
      operationId: `prior-${index}`, semanticSubjectFingerprint: deriveWalletSemanticSubjectFingerprint({ accountScopeHash, operationReason: "coin_exchange", sourceReceiptRef: source }),
      accountScopeHash, accountGeneration: receiptGeneration, currency: "access_star", walletRevisionBefore: state.revision,
      kind: "external_credit", amountSubunits: 10_000, earningCategory: null, operationReason: "coin_exchange",
      sourceReceiptRef: source, origin: { kind: "coin_exchange", tradeId: `prior-${index}` },
    }), { currentAccountGeneration: receiptGeneration }).state;
  }
  const sourceReceiptRef = { receiptType: "coin_exchange_trade" as const, receiptId: label, receiptFingerprint: sha256Utf8(label) };
  const operation = createWalletAuthorizedOperation({
    schemaVersion: "learning-v2-wallet-authorized-operation.v1", authority: "trusted_server_boundary",
    operationId: label, semanticSubjectFingerprint: deriveWalletSemanticSubjectFingerprint({ accountScopeHash, operationReason: "coin_exchange", sourceReceiptRef }),
    accountScopeHash, accountGeneration: receiptGeneration, currency: "access_star", walletRevisionBefore: state.revision,
    kind: "external_credit", amountSubunits: 45_000, earningCategory: null, operationReason: "coin_exchange",
    sourceReceiptRef, origin: { kind: "coin_exchange", tradeId: label },
  });
  return reduceAuthorizedWalletOperation(state, operation, { currentAccountGeneration: receiptGeneration }).appliedReceipt;
};

const genesis = createGenesisOwnerRepositoryRootV2({
  accountScopeHash, currentGeneration: generation,
  walletStateRef: ref("wallet_state", "wallet-0"),
  courseStateManifestRef: ref("course_state_manifest", "course-manifest"),
  operationIndexManifestRef: ref("operation_index_manifest", "operation-0"),
  subjectIndexManifestRef: ref("subject_index_manifest", "subject-0"),
  receiptIndexManifestRef: ref("receipt_index_manifest", "receipt-0"),
});
const recordFor = (root: typeof genesis.root, sequence: number, receiptGeneration = generation) => createOwnerRepositoryWalletCreditJournalRecord({
  accountScopeHash, journalSequence: sequence, repositoryRevisionBefore: root.repositoryRevision,
  rootBeforeFingerprint: root.rootFingerprint, previousJournalRecordRef: root.journalHeadRef,
  walletStateBeforeRef: root.walletStateRef, walletStateAfterRef: ref("wallet_state", `wallet-${sequence}`),
  operationIndexManifestBeforeRef: root.operationIndexManifestRef,
  operationIndexManifestAfterRef: ref("operation_index_manifest", `operation-${sequence}`),
  subjectIndexManifestBeforeRef: root.subjectIndexManifestRef,
  subjectIndexManifestAfterRef: ref("subject_index_manifest", `subject-${sequence}`),
  receiptIndexManifestBeforeRef: root.receiptIndexManifestRef,
  receiptIndexManifestAfterRef: ref("receipt_index_manifest", `receipt-${sequence}`),
  appliedReceipt: receipt(`credit-${sequence}`, sequence - 1, receiptGeneration),
});
const mutateRecord = (record: ReturnType<typeof recordFor>, mutate: (copy: any) => void) => {
  const copy = JSON.parse(JSON.stringify(record));
  mutate(copy);
  const body = { ...copy };
  delete body.journalRecordFingerprint;
  copy.journalRecordFingerprint = hashCanonicalBody(body);
  return copy;
};

describe("Learning V2 owner repository root/journal fold", () => {
  it("binds the first canonical wallet journal blob to the exact successor root", () => {
    const blob = materializeOwnerRepositoryJournalRecordBlob(recordFor(genesis.root, 1));
    const next = bindOwnerRepositoryWalletCreditSuccessorRootV2({ rootBefore: genesis.root, journalRecordBlob: blob });
    expect(next.root).toMatchObject({
      repositoryRevision: 1, journalSequence: 1, previousRootFingerprint: genesis.root.rootFingerprint,
      journalHeadRef: blob.ref, courseStateManifestRef: genesis.root.courseStateManifestRef,
      walletStateRef: recordFor(genesis.root, 1).walletStateAfterRef,
      operationIndexManifestRef: recordFor(genesis.root, 1).operationIndexManifestAfterRef,
      subjectIndexManifestRef: recordFor(genesis.root, 1).subjectIndexManifestAfterRef,
      receiptIndexManifestRef: recordFor(genesis.root, 1).receiptIndexManifestAfterRef,
    });
    expect(parseOwnerRepositoryJournalRecordBlob({ accountScopeHash, ref: blob.ref, raw: blob.encoded }).blob).toEqual(blob);
    expect(Object.isFrozen(next.root)).toBe(true);
  });

  it("chains a second record and rejects replay against a later root", () => {
    const firstBlob = materializeOwnerRepositoryJournalRecordBlob(recordFor(genesis.root, 1));
    const first = bindOwnerRepositoryWalletCreditSuccessorRootV2({ rootBefore: genesis.root, journalRecordBlob: firstBlob });
    const secondBlob = materializeOwnerRepositoryJournalRecordBlob(recordFor(first.root, 2));
    const second = bindOwnerRepositoryWalletCreditSuccessorRootV2({ rootBefore: first.root, journalRecordBlob: secondBlob });
    expect(second.root).toMatchObject({ repositoryRevision: 2, journalSequence: 2, journalHeadRef: secondBlob.ref });
    expect(() => bindOwnerRepositoryWalletCreditSuccessorRootV2({ rootBefore: second.root, journalRecordBlob: firstBlob }))
      .toThrow("owner_repository_root_fold_invalid");
    const wrongHeadRecord = mutateRecord(recordFor(first.root, 2), (copy) => {
      copy.previousJournalRecordRef = ref("journal_record", "wrong-canonical-head");
    });
    expect(() => bindOwnerRepositoryWalletCreditSuccessorRootV2({
      rootBefore: first.root,
      journalRecordBlob: materializeOwnerRepositoryJournalRecordBlob(wrongHeadRecord),
    })).toThrow("owner_repository_root_fold_invalid");
  });

  it("rejects ancestry/ref tampering and accessors without executing them", () => {
    const record = recordFor(genesis.root, 1);
    const wrong = JSON.parse(JSON.stringify(record)) as any;
    wrong.rootBeforeFingerprint = sha256Utf8("wrong-root");
    const wrongBody = { ...wrong };
    delete wrongBody.journalRecordFingerprint;
    wrong.journalRecordFingerprint = hashCanonicalBody(wrongBody);
    expect(() => bindOwnerRepositoryWalletCreditSuccessorRootV2({
      rootBefore: genesis.root,
      journalRecordBlob: materializeOwnerRepositoryJournalRecordBlob(wrong),
    })).toThrow("owner_repository_root_fold_invalid");
    let getterRuns = 0;
    const hostile = { ...genesis.root } as Record<string, unknown>;
    Object.defineProperty(hostile, "accountScopeHash", { enumerable: true, get: () => { getterRuns += 1; return accountScopeHash; } });
    expect(() => bindOwnerRepositoryWalletCreditSuccessorRootV2({
      rootBefore: hostile,
      journalRecordBlob: materializeOwnerRepositoryJournalRecordBlob(record),
    })).toThrow("owner_repository_root_fold_invalid");
    expect(getterRuns).toBe(0);
  });

  it("rejects every mismatched root coordinate and before projection", () => {
    const record = recordFor(genesis.root, 1);
    const mutations: Array<(copy: any) => void> = [
      (copy) => { copy.repositoryRevisionBefore = 1; },
      (copy) => { copy.rootBeforeFingerprint = sha256Utf8("other-root"); },
      (copy) => {
        copy.journalSequence = 2;
        copy.repositoryRevisionBefore = 1;
        copy.previousJournalRecordRef = ref("journal_record", "other-head");
      },
      (copy) => { copy.walletStateBeforeRef = ref("wallet_state", "other-wallet"); },
      (copy) => { copy.operationIndexManifestBeforeRef = ref("operation_index_manifest", "other-operation"); },
      (copy) => { copy.subjectIndexManifestBeforeRef = ref("subject_index_manifest", "other-subject"); },
      (copy) => { copy.receiptIndexManifestBeforeRef = ref("receipt_index_manifest", "other-receipt"); },
    ];
    for (const mutate of mutations) {
      const blob = materializeOwnerRepositoryJournalRecordBlob(mutateRecord(record, mutate));
      expect(() => bindOwnerRepositoryWalletCreditSuccessorRootV2({
        rootBefore: genesis.root,
        journalRecordBlob: blob,
      })).toThrow("owner_repository_root_fold_invalid");
    }
  });

  it("fails closed on journal envelope corruption and stale generation", () => {
    const blob = materializeOwnerRepositoryJournalRecordBlob(recordFor(genesis.root, 1));
    expect(() => parseOwnerRepositoryJournalRecordBlob({
      accountScopeHash,
      ref: blob.ref,
      raw: ` ${blob.encoded}`,
    })).toThrow("owner_repository_root_fold_invalid");
    for (const raw of ["\ud800", 42, "x".repeat(512 * 1024 + 1)]) {
      expect(() => parseOwnerRepositoryJournalRecordBlob({
        accountScopeHash,
        ref: blob.ref,
        raw,
      })).toThrow("owner_repository_root_fold_invalid");
    }
    let getterRuns = 0;
    const hostileRef = { ...blob.ref } as Record<string, unknown>;
    Object.defineProperty(hostileRef, "blobFingerprint", {
      enumerable: true,
      get: () => { getterRuns += 1; return blob.ref.blobFingerprint; },
    });
    expect(() => parseOwnerRepositoryJournalRecordBlob({
      accountScopeHash,
      ref: hostileRef,
      raw: blob.encoded,
    })).toThrow("owner_repository_root_fold_invalid");
    expect(getterRuns).toBe(0);
    for (const mutate of [
      (envelope: any) => { envelope.schemaVersion = "wrong-schema"; },
      (envelope: any) => { envelope.accountScopeHash = "bbbbbbbbbbbbbbbb"; },
      (envelope: any) => { envelope.kind = "wallet_state"; },
      (envelope: any) => { envelope.payload.rootBeforeFingerprint = sha256Utf8("inner-tamper"); },
    ]) {
      const envelope = JSON.parse(blob.encoded);
      mutate(envelope);
      const encoded = canonicalJsonV1(envelope);
      const blobFingerprint = sha256Utf8(encoded);
      expect(() => parseOwnerRepositoryJournalRecordBlob({
        accountScopeHash,
        ref: {
          ...blob.ref,
          blobFingerprint,
          blobKey: `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${blobFingerprint}`,
        },
        raw: encoded,
      })).toThrow("owner_repository_root_fold_invalid");
    }
    expect(() => parseOwnerRepositoryJournalRecordBlob({
      accountScopeHash,
      ref: { ...blob.ref, blobKey: `${blob.ref.blobKey}:wrong` },
      raw: blob.encoded,
    })).toThrow("owner_repository_root_fold_invalid");
    const rolled = advanceOwnerRepositoryRootV2Generation({
      root: genesis.root,
      targetGeneration: generation + 1,
    });
    const staleBlob = materializeOwnerRepositoryJournalRecordBlob(recordFor(rolled.root, 1));
    expect(() => bindOwnerRepositoryWalletCreditSuccessorRootV2({
      rootBefore: rolled.root,
      journalRecordBlob: staleBlob,
    })).toThrow("owner_repository_root_fold_invalid");
    const currentBlob = materializeOwnerRepositoryJournalRecordBlob(
      recordFor(rolled.root, 1, generation + 1),
    );
    const current = bindOwnerRepositoryWalletCreditSuccessorRootV2({
      rootBefore: rolled.root,
      journalRecordBlob: currentBlob,
    });
    expect(current.root).toMatchObject({
      currentGeneration: generation + 1,
      repositoryRevision: 2,
      journalSequence: 1,
      journalHeadRef: currentBlob.ref,
    });
  });
});
