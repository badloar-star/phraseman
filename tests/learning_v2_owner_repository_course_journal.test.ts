import {
  WALLET_SUBUNITS_PER_STAR,
  createWalletAuthorizedOperation,
  deriveWalletSemanticSubjectFingerprint,
} from "../modules/learning-v2/contracts/wallet";
import {
  COURSE_UNLOCK_POLICY_FINGERPRINT_V1,
  createAuthorizedCourseUnlockRequest,
  deriveCourseUnlockSemanticSubjectFingerprint,
} from "../modules/learning-v2/contracts/course_unlock";
import {
  createOwnerRepositoryCourseUnlockJournalRecord,
  parseOwnerRepositoryEconomicEffectJournalRecord,
  parseOwnerRepositoryCourseUnlockJournalRecord,
} from "../modules/learning-v2/progress/owner_repository_journal";
import type {
  OwnerRepositoryBlobRefV1,
  OwnerRepositoryCourseStateRefV1,
} from "../modules/learning-v2/progress/owner_repository";
import {
  createCourseUnlockState,
  reduceAuthorizedCourseUnlock,
  type CourseUnlockAppliedReceiptV1,
} from "../modules/learning-v2/progress/course_unlock_reducer";
import {
  createWalletState,
  reduceAuthorizedWalletOperation,
} from "../modules/learning-v2/progress/wallet_reducer";
import { hashCanonicalBody, sha256Utf8 } from "../modules/learning-v2/policies/decision_registry";

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
const courseRef = (courseIdentityFingerprint: string, label: string): OwnerRepositoryCourseStateRefV1 => ({
  schemaVersion: "learning-v2-owner-repository-course-ref.v1",
  courseIdentityFingerprint,
  stateRef: ref("course_unlock_state", label),
});
const indexes = (label: string) => ({
  operationIndexManifestBeforeRef: ref("operation_index_manifest", `${label}:operation:before`),
  operationIndexManifestAfterRef: ref("operation_index_manifest", `${label}:operation:after`),
  subjectIndexManifestBeforeRef: ref("subject_index_manifest", `${label}:subject:before`),
  subjectIndexManifestAfterRef: ref("subject_index_manifest", `${label}:subject:after`),
  receiptIndexManifestBeforeRef: ref("receipt_index_manifest", `${label}:receipt:before`),
  receiptIndexManifestAfterRef: ref("receipt_index_manifest", `${label}:receipt:after`),
});

const unlockRequest = (
  walletState: ReturnType<typeof createWalletState>,
  courseState: ReturnType<typeof createCourseUnlockState>,
  ordinal: number,
) => {
  const scopeHash = courseState.accountScopeHash;
  return createAuthorizedCourseUnlockRequest({
  schemaVersion: "learning-v2-course-unlock-authorized-request.v1",
  authority: "trusted_server_boundary",
  operationId: `journal-unlock-${ordinal}`,
  semanticSubjectFingerprint: deriveCourseUnlockSemanticSubjectFingerprint({
    accountScopeHash: scopeHash,
    courseId: courseState.courseId,
    studyTarget: courseState.studyTarget,
    requiredSessionOrdinal: ordinal,
  }),
  accountScopeHash: scopeHash,
  accountGeneration: generation,
  courseId: courseState.courseId,
  studyTarget: courseState.studyTarget,
  requiredSessionOrdinal: ordinal,
  walletRevisionBefore: walletState.revision,
  walletStateBeforeFingerprint: walletState.stateFingerprint,
  courseRevisionBefore: courseState.revision,
  courseStateBeforeFingerprint: courseState.stateFingerprint,
  chargeSubunits: (ordinal === 1 ? 0 : 45) * WALLET_SUBUNITS_PER_STAR,
  basis: ordinal === 1 ? "free_first_session" : "stars",
  policyFingerprint: COURSE_UNLOCK_POLICY_FINGERPRINT_V1,
  targetSessionRef: {
    courseReleaseId: "release-1",
    sessionSetId: "session-set-1",
    sessionSetHash: sha256Utf8("journal-session-set"),
    catalogFingerprint: sha256Utf8("journal-catalog"),
    sessionId: `required-session-${ordinal}`,
  },
  });
};

const fundedWallet = () => {
  const state = createWalletState({ accountScopeHash });
  const sourceReceiptRef = {
    receiptType: "coin_exchange_trade" as const,
    receiptId: "journal-unlock-funding",
    receiptFingerprint: sha256Utf8("journal-unlock-funding-receipt"),
  };
  const operation = createWalletAuthorizedOperation({
    schemaVersion: "learning-v2-wallet-authorized-operation.v1",
    authority: "trusted_server_boundary",
    operationId: "journal-unlock-funding",
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
    amountSubunits: 45 * WALLET_SUBUNITS_PER_STAR,
    earningCategory: null,
    operationReason: "coin_exchange",
    sourceReceiptRef,
    origin: { kind: "coin_exchange", tradeId: "journal-unlock-funding" },
  });
  return reduceAuthorizedWalletOperation(state, operation, {
    currentAccountGeneration: generation,
  }).state;
};

const fixtures = () => {
  const genesisWallet = createWalletState({ accountScopeHash });
  const genesisCourse = createCourseUnlockState({
    accountScopeHash,
    courseId: "english-core",
    studyTarget: "en",
  });
  const free = reduceAuthorizedCourseUnlock({
    walletState: genesisWallet,
    courseUnlockState: genesisCourse,
    authorizedRequest: unlockRequest(genesisWallet, genesisCourse, 1),
    lookup: { currentAccountGeneration: generation },
  });
  if (free.status !== "applied") throw new Error("expected_free_applied");

  const paidWallet = fundedWallet();
  const paid = reduceAuthorizedCourseUnlock({
    walletState: paidWallet,
    courseUnlockState: free.courseUnlockState,
    authorizedRequest: unlockRequest(paidWallet, free.courseUnlockState, 2),
    lookup: { currentAccountGeneration: generation },
  });
  if (paid.status !== "applied") throw new Error("expected_paid_applied");
  return { free: free.appliedReceipt, paid: paid.appliedReceipt };
};

const input = (receipt: CourseUnlockAppliedReceiptV1, overrides: Record<string, unknown> = {}) => {
  const free = receipt.chargedSubunits === 0;
  const identity = receipt.courseUnlockStateBefore.courseIdentityFingerprint;
  const walletBefore = ref("wallet_state", `${free ? "free" : "paid"}:wallet:before`);
  return {
    accountScopeHash,
    journalSequence: 1,
    repositoryRevisionBefore: 0,
    rootBeforeFingerprint: sha256Utf8(`${free ? "free" : "paid"}:root:before`),
    previousJournalRecordRef: null,
    walletStateBeforeRef: walletBefore,
    walletStateAfterRef: free ? walletBefore : ref("wallet_state", "paid:wallet:after"),
    courseStateBeforeRef: free ? null : courseRef(identity, "paid:course:before"),
    courseStateAfterRef: courseRef(identity, `${free ? "free" : "paid"}:course:after`),
    ...indexes(free ? "free" : "paid"),
    appliedReceipt: receipt,
    ...overrides,
  };
};

describe("Learning V2 owner repository course-unlock journal record", () => {
  it("round-trips a free-first unlock with no prior course projection and unchanged wallet ref", () => {
    const { free } = fixtures();
    const record = createOwnerRepositoryCourseUnlockJournalRecord(input(free));
    expect(record).toMatchObject({
      recordKind: "course_unlock",
      acceptedAccountGeneration: generation,
      courseStateBeforeRef: null,
      canonicalOperationId: free.authorizedRequest.operationId,
      semanticFingerprint: free.authorizedRequest.semanticFingerprint,
    });
    expect(record.walletStateAfterRef).toEqual(record.walletStateBeforeRef);
    expect(record.courseIdentityFingerprint).toBe(free.courseUnlockStateAfter.courseIdentityFingerprint);
    const body = { ...record } as Record<string, unknown>;
    delete body.journalRecordFingerprint;
    expect(record.journalRecordFingerprint).toBe(hashCanonicalBody(body));
    expect(parseOwnerRepositoryCourseUnlockJournalRecord(JSON.parse(JSON.stringify(record)))).toEqual(record);
    expect(parseOwnerRepositoryEconomicEffectJournalRecord(record)).toEqual(record);
    expect(Object.isFrozen(record.appliedReceipt.courseUnlockStateAfter)).toBe(true);
  });

  it("round-trips a paid unlock with compound debit and both projections changed", () => {
    const { paid } = fixtures();
    const record = createOwnerRepositoryCourseUnlockJournalRecord(input(paid));
    expect(record.courseStateBeforeRef).not.toBeNull();
    expect(record.walletStateAfterRef).not.toEqual(record.walletStateBeforeRef);
    expect(record.courseStateAfterRef).not.toEqual(record.courseStateBeforeRef);
    expect(record.appliedReceipt.walletDebitReceipt).not.toBeNull();
    expect(record.appliedReceipt.chargedSubunits).toBe(45 * WALLET_SUBUNITS_PER_STAR);
    expect(parseOwnerRepositoryCourseUnlockJournalRecord(record)).toEqual(record);
  });

  it("enforces the exact free/paid nullable and ref-transition matrix", () => {
    const { free, paid } = fixtures();
    expect(() => createOwnerRepositoryCourseUnlockJournalRecord(input(free, {
      courseStateBeforeRef: courseRef(free.courseUnlockStateBefore.courseIdentityFingerprint, "forged-free-before"),
    }))).toThrow("owner_repository_journal_invalid");
    expect(() => createOwnerRepositoryCourseUnlockJournalRecord(input(free, {
      walletStateAfterRef: ref("wallet_state", "forged-free-wallet-after"),
    }))).toThrow("owner_repository_journal_invalid");
    expect(() => createOwnerRepositoryCourseUnlockJournalRecord(input(paid, {
      courseStateBeforeRef: null,
    }))).toThrow("owner_repository_journal_invalid");
    const paidBase = input(paid);
    expect(() => createOwnerRepositoryCourseUnlockJournalRecord(input(paid, {
      walletStateAfterRef: paidBase.walletStateBeforeRef,
    }))).toThrow("owner_repository_journal_invalid");
  });

  it("rejects unchanged indexes, course identity mismatch and impossible global ref aliases", () => {
    const { paid } = fixtures();
    const base = input(paid);
    for (const [after, before] of [
      ["operationIndexManifestAfterRef", "operationIndexManifestBeforeRef"],
      ["subjectIndexManifestAfterRef", "subjectIndexManifestBeforeRef"],
      ["receiptIndexManifestAfterRef", "receiptIndexManifestBeforeRef"],
    ] as const) {
      expect(() => createOwnerRepositoryCourseUnlockJournalRecord(input(paid, {
        [after]: base[before],
      }))).toThrow("owner_repository_journal_invalid");
    }
    expect(() => createOwnerRepositoryCourseUnlockJournalRecord(input(paid, {
      courseStateAfterRef: courseRef(sha256Utf8("wrong-course"), "wrong-course-after"),
    }))).toThrow("owner_repository_journal_invalid");
    const courseAfterStateRef = (base.courseStateAfterRef as OwnerRepositoryCourseStateRefV1).stateRef;
    expect(() => createOwnerRepositoryCourseUnlockJournalRecord(input(paid, {
      walletStateAfterRef: {
        ...ref("wallet_state", "aliased-wallet-after"),
        blobFingerprint: courseAfterStateRef.blobFingerprint,
        blobKey: courseAfterStateRef.blobKey,
      },
    }))).toThrow("owner_repository_journal_invalid");
    const walletBefore = base.walletStateBeforeRef as OwnerRepositoryBlobRefV1;
    expect(() => createOwnerRepositoryCourseUnlockJournalRecord(input(paid, {
      journalSequence: 2,
      repositoryRevisionBefore: 1,
      previousJournalRecordRef: {
        ...ref("journal_record", "aliased-predecessor"),
        blobFingerprint: walletBefore.blobFingerprint,
        blobKey: walletBefore.blobKey,
      },
    }))).toThrow("owner_repository_journal_invalid");
  });

  it("rejects a fully valid foreign-account receipt and foreign projection refs", () => {
    const foreignAccount = "bbbbbbbbbbbbbbbb";
    const walletState = createWalletState({ accountScopeHash: foreignAccount });
    const courseState = createCourseUnlockState({
      accountScopeHash: foreignAccount,
      courseId: "english-core",
      studyTarget: "en",
    });
    const foreign = reduceAuthorizedCourseUnlock({
      walletState,
      courseUnlockState: courseState,
      authorizedRequest: unlockRequest(walletState, courseState, 1),
      lookup: { currentAccountGeneration: generation },
    });
    if (foreign.status !== "applied") throw new Error("expected_foreign_applied");
    expect(() => createOwnerRepositoryCourseUnlockJournalRecord(input(foreign.appliedReceipt)))
      .toThrow("owner_repository_journal_invalid");

    const { free } = fixtures();
    const foreignFingerprint = sha256Utf8("foreign-course-ref");
    expect(() => createOwnerRepositoryCourseUnlockJournalRecord(input(free, {
      courseStateAfterRef: {
        schemaVersion: "learning-v2-owner-repository-course-ref.v1",
        courseIdentityFingerprint: free.courseUnlockStateAfter.courseIdentityFingerprint,
        stateRef: {
          schemaVersion: "learning-v2-owner-repository-blob-ref.v1",
          kind: "course_unlock_state",
          blobKey: `learning_v2_owner_repository:v1:${foreignAccount}:blob:${foreignFingerprint}`,
          blobFingerprint: foreignFingerprint,
        },
      },
    }))).toThrow("owner_repository_journal_invalid");
  });

  it("rejects derived-field and nested receipt tampering after outer rehash", () => {
    const { paid } = fixtures();
    const record = createOwnerRepositoryCourseUnlockJournalRecord(input(paid));
    for (const mutate of [
      (copy: any) => { copy.acceptedAccountGeneration += 1; },
      (copy: any) => { copy.courseIdentityFingerprint = sha256Utf8("forged-course-identity"); },
      (copy: any) => { copy.walletStateAfterFingerprint = sha256Utf8("forged-wallet-state"); },
      (copy: any) => { copy.appliedReceipt.chargedSubunits += 1; },
    ]) {
      const copy = JSON.parse(JSON.stringify(record));
      mutate(copy);
      const body = { ...copy };
      delete body.journalRecordFingerprint;
      copy.journalRecordFingerprint = hashCanonicalBody(body);
      expect(() => parseOwnerRepositoryCourseUnlockJournalRecord(copy))
        .toThrow("owner_repository_journal_invalid");
    }
  });

  it("rejects unsafe sequence/revision and never executes creator or parser accessors", () => {
    const { free } = fixtures();
    expect(() => createOwnerRepositoryCourseUnlockJournalRecord(input(free, {
      journalSequence: 2,
    }))).toThrow("owner_repository_journal_invalid");
    expect(() => createOwnerRepositoryCourseUnlockJournalRecord(input(free, {
      journalSequence: 2,
      repositoryRevisionBefore: 0,
      previousJournalRecordRef: ref("journal_record", "seq2-rev0-predecessor"),
    }))).toThrow("owner_repository_journal_invalid");
    expect(createOwnerRepositoryCourseUnlockJournalRecord(input(free, {
      journalSequence: 2,
      repositoryRevisionBefore: 1,
      previousJournalRecordRef: ref("journal_record", "seq2-rev1-predecessor"),
    })).journalSequence).toBe(2);
    expect(() => createOwnerRepositoryCourseUnlockJournalRecord(input(free, {
      repositoryRevisionBefore: Number.MAX_SAFE_INTEGER,
    }))).toThrow("owner_repository_journal_invalid");
    const record = createOwnerRepositoryCourseUnlockJournalRecord(input(free));
    let getterRuns = 0;
    for (const candidate of [input(free), { ...record }]) {
      Object.defineProperty(candidate, "appliedReceipt", {
        enumerable: true,
        get: () => { getterRuns += 1; return free; },
      });
      const invoke = "recordKind" in candidate
        ? () => parseOwnerRepositoryCourseUnlockJournalRecord(candidate)
        : () => createOwnerRepositoryCourseUnlockJournalRecord(candidate);
      expect(invoke).toThrow("owner_repository_journal_invalid");
    }
    expect(getterRuns).toBe(0);

    const nested = input(free) as Record<string, unknown>;
    const nestedCourseRef = { ...(nested.courseStateAfterRef as object) } as Record<string, unknown>;
    Object.defineProperty(nestedCourseRef, "stateRef", {
      enumerable: true,
      get: () => { getterRuns += 1; return ref("course_unlock_state", "nested-getter"); },
    });
    nested.courseStateAfterRef = nestedCourseRef;
    const symbol = { ...record } as Record<string | symbol, unknown>;
    symbol[Symbol("poison")] = true;
    const hidden = { ...record } as Record<string, unknown>;
    Object.defineProperty(hidden, "hidden", { enumerable: false, value: true });
    for (const [candidate, parser] of [
      [nested, false],
      [symbol, true],
      [{ ...record, unexpected: true }, true],
      [hidden, true],
    ] as const) {
      const invoke = parser
        ? () => parseOwnerRepositoryCourseUnlockJournalRecord(candidate)
        : () => createOwnerRepositoryCourseUnlockJournalRecord(candidate);
      expect(invoke).toThrow("owner_repository_journal_invalid");
    }
    expect(getterRuns).toBe(0);
  });
});
