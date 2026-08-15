import {
  WALLET_SUBUNITS_PER_STAR,
  createWalletAuthorizedOperation,
  deriveWalletSemanticSubjectFingerprint,
} from "../modules/learning-v2/contracts/wallet";
import {
  createOwnerRepository,
  type OwnerRepositoryActiveOwnerFence,
  type OwnerRepositoryCasStorage,
  type OwnerRepositoryScope,
  type OwnerRepositoryWalletCreditAuthorityInput,
} from "../modules/learning-v2/progress/owner_repository";
import { createCourseUnlockState } from
  "../modules/learning-v2/progress/course_unlock_reducer";
import {
  createServerCourseUnlockReceiptAuthority,
  materializeServerCourseUnlockReceiptCandidate,
  materializeServerCourseUnlockRequest,
} from "../modules/learning-v2/progress/server_course_unlock_receipt";
import { sha256Utf8 } from
  "../modules/learning-v2/policies/decision_registry";

const accountScopeHash = "a".repeat(64);
const generation = 4;
const scope: OwnerRepositoryScope = { accountScopeHash, generation };

class Storage implements OwnerRepositoryCasStorage {
  readonly values = new Map<string, string>();
  owner: OwnerRepositoryActiveOwnerFence | null = scope;
  setCalls = 0;
  casCalls = 0;

  async getItem(key: string) { return this.values.get(key) ?? null; }
  async setItem(key: string, value: string) {
    this.setCalls += 1;
    const existing = this.values.get(key);
    if (existing !== undefined && existing !== value) {
      throw new Error("immutable_collision");
    }
    this.values.set(key, value);
  }
  async getCurrentOwnerFence() { return this.owner; }
  async compareAndSet(
    key: string,
    expected: string | null,
    next: string,
    fence: OwnerRepositoryActiveOwnerFence,
  ): Promise<"committed" | "conflict" | "stale_generation"> {
    this.casCalls += 1;
    if (!this.owner || this.owner.accountScopeHash !== fence.accountScopeHash ||
      this.owner.generation !== fence.generation) return "stale_generation";
    if ((this.values.get(key) ?? null) !== expected) return "conflict";
    this.values.set(key, next);
    return "committed";
  }
}

const walletAuthority = ({
  scope: ownerScope,
  walletState,
  canonicalAppliedReceipt,
  candidate,
}: OwnerRepositoryWalletCreditAuthorityInput) => {
  const value = candidate as Readonly<{ readonly operationId: string }>;
  if (canonicalAppliedReceipt?.operationId === value.operationId) {
    return canonicalAppliedReceipt.authorizedOperation;
  }
  const sourceReceiptRef = {
    receiptType: "coin_exchange_trade" as const,
    receiptId: "course-unlock-funding",
    receiptFingerprint: sha256Utf8("course-unlock-funding-receipt"),
  };
  return createWalletAuthorizedOperation({
    schemaVersion: "learning-v2-wallet-authorized-operation.v1",
    authority: "trusted_server_boundary",
    operationId: value.operationId,
    semanticSubjectFingerprint: deriveWalletSemanticSubjectFingerprint({
      accountScopeHash: ownerScope.accountScopeHash,
      operationReason: "coin_exchange",
      sourceReceiptRef,
    }),
    accountScopeHash: ownerScope.accountScopeHash,
    accountGeneration: ownerScope.generation,
    currency: "access_star",
    kind: "external_credit",
    amountSubunits: 45 * WALLET_SUBUNITS_PER_STAR,
    earningCategory: null,
    operationReason: "coin_exchange",
    sourceReceiptRef,
    walletRevisionBefore: walletState.revision,
    origin: { kind: "coin_exchange", tradeId: "course-unlock-funding" },
  });
};

const target = (ordinal: number) => ({
  courseReleaseId: "english-core-release-1",
  sessionSetId: "english-core-session-set-1",
  sessionSetHash: sha256Utf8("course-unlock-session-set"),
  catalogFingerprint: sha256Utf8("course-unlock-catalog"),
  sessionId: `required-session-${ordinal}`,
});

describe("Learning V2 Owner Repository course-unlock durable commit", () => {
  test("adopts a fresh V2 repository while opening the first session for free", async () => {
    const storage = new Storage();
    let protectedRaw: string | undefined;
    const repository = createOwnerRepository(storage, () => true, {
      materializeCourseUnlock: createServerCourseUnlockReceiptAuthority({
        resolveCourseUnlockReceipt: () => protectedRaw,
      }),
    });
    const genesis = await repository.ensureV2(scope);
    const emptyCourse = createCourseUnlockState({
      accountScopeHash,
      courseId: "english-core",
      studyTarget: "en",
    });
    const receipt = materializeServerCourseUnlockReceiptCandidate({
      intent: {
        schemaVersion: "learning-v2-server-course-unlock-intent.v1",
        accountScopeHash,
        accountGeneration: generation,
        courseId: emptyCourse.courseId,
        studyTarget: emptyCourse.studyTarget,
        requiredSessionOrdinal: 1,
        walletRevisionBefore: genesis.walletState.revision,
        walletStateBeforeFingerprint: genesis.walletState.stateFingerprint,
        courseRevisionBefore: emptyCourse.revision,
        courseStateBeforeFingerprint: emptyCourse.stateFingerprint,
      },
      targetSessionRef: target(1),
    });
    protectedRaw = receipt.encoded;
    const result = await repository.commitCourseUnlock(
      scope,
      materializeServerCourseUnlockRequest(receipt),
    );
    expect(result.status).toBe("applied");
    expect(result.snapshot.root.schemaVersion).toBe(
      "learning-v2-owner-repository-root.v3",
    );
    expect(result.courseUnlockState.revision).toBe(1);
    expect(result.snapshot.walletState.balanceSubunits).toBe(0);
  });

  test("atomically applies free and paid access, replays exactly and writes nothing on insufficient balance", async () => {
    const storage = new Storage();
    const protectedReceipts = new Map<string, string>();
    const repository = createOwnerRepository(storage, () => true, {
      materializeWalletCredit: walletAuthority,
      materializeCourseUnlock: createServerCourseUnlockReceiptAuthority({
        resolveCourseUnlockReceipt: ({ unlockId }: {
          readonly unlockId: string;
        }) =>
          protectedReceipts.get(unlockId),
      }),
    });
    await repository.ensureV2(scope);
    const funded = await repository.commitWalletCreditV3(scope, {
      operationId: "course-unlock-funding-operation",
    });
    expect(funded.snapshot.walletState.balanceSubunits).toBe(
      45 * WALLET_SUBUNITS_PER_STAR,
    );

    const authorize = (ordinal: number, courseState = createCourseUnlockState({
      accountScopeHash,
      courseId: "english-core",
      studyTarget: "en",
    })) => {
      const materialized = materializeServerCourseUnlockReceiptCandidate({
        intent: {
          schemaVersion: "learning-v2-server-course-unlock-intent.v1",
          accountScopeHash,
          accountGeneration: generation,
          courseId: courseState.courseId,
          studyTarget: courseState.studyTarget,
          requiredSessionOrdinal: ordinal,
          walletRevisionBefore: funded.snapshot.walletState.revision,
          walletStateBeforeFingerprint: funded.snapshot.walletState.stateFingerprint,
          courseRevisionBefore: courseState.revision,
          courseStateBeforeFingerprint: courseState.stateFingerprint,
        },
        targetSessionRef: target(ordinal),
      });
      protectedReceipts.set(materialized.receipt.unlockId, materialized.encoded);
      return materializeServerCourseUnlockRequest(materialized);
    };

    const freeRequest = authorize(1);
    const free = await repository.commitCourseUnlock(scope, freeRequest);
    expect(free.status).toBe("applied");
    expect(free.courseUnlockState.revision).toBe(1);
    expect(free.snapshot.walletState.balanceSubunits).toBe(
      45 * WALLET_SUBUNITS_PER_STAR,
    );

    const paidMaterialized = materializeServerCourseUnlockReceiptCandidate({
      intent: {
        schemaVersion: "learning-v2-server-course-unlock-intent.v1",
        accountScopeHash,
        accountGeneration: generation,
        courseId: free.courseUnlockState.courseId,
        studyTarget: free.courseUnlockState.studyTarget,
        requiredSessionOrdinal: 2,
        walletRevisionBefore: free.snapshot.walletState.revision,
        walletStateBeforeFingerprint: free.snapshot.walletState.stateFingerprint,
        courseRevisionBefore: free.courseUnlockState.revision,
        courseStateBeforeFingerprint: free.courseUnlockState.stateFingerprint,
      },
      targetSessionRef: target(2),
    });
    protectedReceipts.set(
      paidMaterialized.receipt.unlockId,
      paidMaterialized.encoded,
    );
    const paidRequest = materializeServerCourseUnlockRequest(paidMaterialized);
    const paid = await repository.commitCourseUnlock(scope, paidRequest);
    expect(paid.status).toBe("applied");
    if (paid.status === "insufficient_balance") {
      throw new Error("expected_paid_course_unlock");
    }
    expect(paid.appliedReceipt.chargedSubunits).toBe(
      45 * WALLET_SUBUNITS_PER_STAR,
    );
    expect(paid.snapshot.walletState.balanceSubunits).toBe(0);
    expect(paid.courseUnlockState.revision).toBe(2);
    const rootAfterPaid = paid.snapshot.root.rootFingerprint;
    const writesAfterPaid = storage.setCalls;

    const replay = await repository.commitCourseUnlock(scope, paidRequest);
    expect(replay.status).toBe("replayed");
    expect(replay.snapshot.root.rootFingerprint).toBe(rootAfterPaid);
    expect(storage.setCalls).toBe(writesAfterPaid);

    const insufficientMaterialized =
      materializeServerCourseUnlockReceiptCandidate({
        intent: {
          schemaVersion: "learning-v2-server-course-unlock-intent.v1",
          accountScopeHash,
          accountGeneration: generation,
          courseId: paid.courseUnlockState.courseId,
          studyTarget: paid.courseUnlockState.studyTarget,
          requiredSessionOrdinal: 3,
          walletRevisionBefore: paid.snapshot.walletState.revision,
          walletStateBeforeFingerprint: paid.snapshot.walletState.stateFingerprint,
          courseRevisionBefore: paid.courseUnlockState.revision,
          courseStateBeforeFingerprint: paid.courseUnlockState.stateFingerprint,
        },
        targetSessionRef: target(3),
      });
    protectedReceipts.set(
      insufficientMaterialized.receipt.unlockId,
      insufficientMaterialized.encoded,
    );
    const writesBeforeInsufficient = storage.setCalls;
    const insufficient = await repository.commitCourseUnlock(
      scope,
      materializeServerCourseUnlockRequest(insufficientMaterialized),
    );
    expect(insufficient.status).toBe("insufficient_balance");
    expect(insufficient.snapshot.root.rootFingerprint).toBe(rootAfterPaid);
    expect(storage.setCalls).toBe(writesBeforeInsufficient);
  });
});
