import {
  COURSE_UNLOCK_POLICY_FINGERPRINT_V1,
  createAuthorizedCourseUnlockRequest,
  deriveCourseUnlockSemanticSubjectFingerprint,
} from "../modules/learning-v2/contracts/course_unlock";
import {
  WALLET_SUBUNITS_PER_STAR,
  createWalletAuthorizedOperation,
  deriveWalletSemanticSubjectFingerprint,
} from "../modules/learning-v2/contracts/wallet";
import type { OwnerRepositoryBlobRefV1 } from "../modules/learning-v2/progress/owner_repository";
import { createEmptyOwnerRepositoryCourseManifest } from "../modules/learning-v2/progress/owner_repository_course_manifest";
import { createEmptyOwnerRepositoryEconomicManifest } from "../modules/learning-v2/progress/owner_repository_economic_manifest";
import {
  planOwnerRepositoryCourseUnlock,
  type OwnerRepositoryCourseUnlockPlanResult,
} from "../modules/learning-v2/progress/owner_repository_course_unlock_plan";
import {
  createCourseUnlockState,
  type CourseUnlockStateV1,
} from "../modules/learning-v2/progress/course_unlock_reducer";
import {
  parseOwnerRepositoryRootV3,
  type OwnerRepositoryRootV3,
} from "../modules/learning-v2/progress/owner_repository_root_v3";
import {
  materializeOwnerRepositoryWalletStateBlob,
  type OwnerRepositoryWalletStateBlobV1,
} from "../modules/learning-v2/progress/owner_repository_wallet_blob";
import {
  createWalletState,
  reduceAuthorizedWalletOperation,
  type WalletStateV1,
} from "../modules/learning-v2/progress/wallet_reducer";
import {
  canonicalJsonV1,
  sha256Utf8,
} from "../modules/learning-v2/policies/decision_registry";

const accountScopeHash = "a".repeat(64);
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
const fundedWallet = (): WalletStateV1 => {
  const state = createWalletState({ accountScopeHash });
  const sourceReceiptRef = {
    receiptType: "coin_exchange_trade" as const,
    receiptId: "course-plan-funding",
    receiptFingerprint: sha256Utf8("course-plan-funding-receipt"),
  };
  const authorized = createWalletAuthorizedOperation({
    schemaVersion: "learning-v2-wallet-authorized-operation.v1",
    authority: "trusted_server_boundary",
    operationId: "course-plan-funding",
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
    origin: { kind: "coin_exchange", tradeId: "course-plan-funding" },
  });
  return reduceAuthorizedWalletOperation(state, authorized, {
    currentAccountGeneration: generation,
  }).state;
};
const authorize = (
  wallet: WalletStateV1,
  course: CourseUnlockStateV1,
  ordinal: number,
) =>
  createAuthorizedCourseUnlockRequest({
    schemaVersion: "learning-v2-course-unlock-authorized-request.v1",
    authority: "trusted_server_boundary",
    operationId: `course-plan-unlock-${ordinal}`,
    semanticSubjectFingerprint: deriveCourseUnlockSemanticSubjectFingerprint({
      accountScopeHash,
      courseId: course.courseId,
      studyTarget: course.studyTarget,
      requiredSessionOrdinal: ordinal,
    }),
    accountScopeHash,
    accountGeneration: generation,
    courseId: course.courseId,
    studyTarget: course.studyTarget,
    requiredSessionOrdinal: ordinal,
    walletRevisionBefore: wallet.revision,
    walletStateBeforeFingerprint: wallet.stateFingerprint,
    courseRevisionBefore: course.revision,
    courseStateBeforeFingerprint: course.stateFingerprint,
    chargeSubunits: (ordinal === 1 ? 0 : 45) * WALLET_SUBUNITS_PER_STAR,
    basis: ordinal === 1 ? "free_first_session" : "stars",
    policyFingerprint: COURSE_UNLOCK_POLICY_FINGERPRINT_V1,
    targetSessionRef: {
      courseReleaseId: "release-1",
      sessionSetId: "session-set-1",
      sessionSetHash: sha256Utf8("course-plan-session-set"),
      catalogFingerprint: sha256Utf8("course-plan-catalog"),
      sessionId: `required-session-${ordinal}`,
    },
  });
const root = (input: {
  walletStateRef: OwnerRepositoryBlobRefV1;
  courseStateManifestRef: OwnerRepositoryBlobRefV1;
  operationIndexManifestRef: OwnerRepositoryBlobRefV1;
  subjectIndexManifestRef: OwnerRepositoryBlobRefV1;
  receiptIndexManifestRef: OwnerRepositoryBlobRefV1;
}): OwnerRepositoryRootV3 => {
  const checkpointRootFingerprint = sha256Utf8("course-plan-checkpoint-root");
  const body = {
    schemaVersion: "learning-v2-owner-repository-root.v3" as const,
    accountScopeHash,
    currentGeneration: generation,
    repositoryRevision: 1,
    journalSequence: 1,
    previousRootFingerprint: sha256Utf8("course-plan-parent-root"),
    journalHeadRef: ref("journal_record", "course-plan-prior-journal"),
    ...input,
    walletCheckpointAnchor: {
      schemaVersion:
        "learning-v2-owner-repository-wallet-checkpoint-anchor.v1" as const,
      checkpointSchemaVersion:
        "learning-v2-owner-repository-wallet-checkpoint.v1" as const,
      checkpointKind: "wallet_credit_only" as const,
      accountScopeHash,
      checkpointKey: `learning_v2_owner_repository:v1:${accountScopeHash}:wallet-checkpoint:${checkpointRootFingerprint}`,
      checkpointRootFingerprint,
      checkpointFingerprint: sha256Utf8("course-plan-checkpoint"),
      checkpointCurrentGeneration: generation,
      checkpointRepositoryRevision: 0,
      checkpointJournalSequence: 0,
      bootstrapOrigin: "fresh_v2_genesis" as const,
    },
    walletCheckpointLagRootTransitions: 1,
    walletCheckpointPromotionRequired: false,
  };
  return parseOwnerRepositoryRootV3(
    { ...body, rootFingerprint: sha256Utf8(canonicalJsonV1(body)) },
    accountScopeHash,
  ).root;
};

const fixture = async (walletState: WalletStateV1) => {
  const wallet = materializeOwnerRepositoryWalletStateBlob(walletState);
  const course = await createEmptyOwnerRepositoryCourseManifest(accountScopeHash);
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
  const currentRoot = root({
    walletStateRef: wallet.blob.ref,
    courseStateManifestRef: course.manifestBlob.ref,
    operationIndexManifestRef: operation.manifestBlob.ref,
    subjectIndexManifestRef: subject.manifestBlob.ref,
    receiptIndexManifestRef: receipt.manifestBlob.ref,
  });
  const storage = new Map<string, string>([
    [wallet.blob.ref.blobKey, wallet.blob.encoded],
    [course.manifestBlob.ref.blobKey, course.manifestBlob.encoded],
    [operation.manifestBlob.ref.blobKey, operation.manifestBlob.encoded],
    [subject.manifestBlob.ref.blobKey, subject.manifestBlob.encoded],
    [receipt.manifestBlob.ref.blobKey, receipt.manifestBlob.encoded],
  ]);
  return {
    wallet,
    course,
    operation,
    subject,
    receipt,
    currentRoot,
    storage,
  };
};
const storePlan = (
  storage: Map<string, string>,
  plan: Extract<OwnerRepositoryCourseUnlockPlanResult, { status: "planned" }>,
) => {
  for (const blob of plan.immutableBlobs) {
    storage.set(blob.ref.blobKey, blob.encoded);
  }
};

describe("Learning V2 Owner Repository compound course-unlock plan", () => {
  test("plans free then paid unlock atomically and replays the paid operation", async () => {
    const initialWallet = fundedWallet();
    const base = await fixture(initialWallet);
    const course0 = createCourseUnlockState({
      accountScopeHash,
      courseId: "english-core",
      studyTarget: "en",
    });
    const resolve = (blobRef: OwnerRepositoryBlobRefV1) =>
      base.storage.get(blobRef.blobKey) ?? null;
    const free = await planOwnerRepositoryCourseUnlock({
      accountScopeHash,
      rootBefore: base.currentRoot,
      walletStateBlob: base.wallet.blob,
      courseManifestBlob: base.course.manifestBlob,
      operationManifestBlob: base.operation.manifestBlob,
      subjectManifestBlob: base.subject.manifestBlob,
      receiptManifestBlob: base.receipt.manifestBlob,
      authorizedRequest: authorize(initialWallet, course0, 1),
      resolveNode: resolve,
      resolveBlob: resolve,
    });
    expect(free.status).toBe("planned");
    if (free.status !== "planned") throw new Error("expected_free_plan");
    expect(free.appliedReceipt.chargedSubunits).toBe(0);
    expect(free.successorRoot.root.walletStateRef).toEqual(
      base.wallet.blob.ref,
    );
    expect(free.successorRoot.root.courseStateManifestRef).toEqual(
      free.courseManifestAfterBlob.ref,
    );
    storePlan(base.storage, free);

    const paidRequest = authorize(
      initialWallet,
      free.appliedReceipt.courseUnlockStateAfter,
      2,
    );
    const paid = await planOwnerRepositoryCourseUnlock({
      accountScopeHash,
      rootBefore: free.successorRoot.root,
      walletStateBlob: free.walletStateAfterBlob,
      courseManifestBlob: free.courseManifestAfterBlob,
      operationManifestBlob: free.economicClosure.operationManifestBlob,
      subjectManifestBlob: free.economicClosure.subjectManifestBlob,
      receiptManifestBlob: free.economicClosure.receiptManifestBlob,
      authorizedRequest: paidRequest,
      resolveNode: resolve,
      resolveBlob: resolve,
    });
    expect(paid.status).toBe("planned");
    if (paid.status !== "planned") throw new Error("expected_paid_plan");
    expect(paid.appliedReceipt.chargedSubunits).toBe(
      45 * WALLET_SUBUNITS_PER_STAR,
    );
    expect(paid.appliedReceipt.walletStateAfter.balanceSubunits).toBe(0);
    expect(
      paid.appliedReceipt.courseUnlockStateAfter
        .highestUnlockedRequiredSessionOrdinal,
    ).toBe(2);
    expect(paid.successorRoot.root.walletStateRef).toEqual(
      paid.walletStateAfterBlob.ref,
    );
    expect(paid.successorRoot.root.courseStateManifestRef).toEqual(
      paid.courseManifestAfterBlob.ref,
    );
    storePlan(base.storage, paid);

    const replay = await planOwnerRepositoryCourseUnlock({
      accountScopeHash,
      rootBefore: paid.successorRoot.root,
      walletStateBlob: paid.walletStateAfterBlob,
      courseManifestBlob: paid.courseManifestAfterBlob,
      operationManifestBlob: paid.economicClosure.operationManifestBlob,
      subjectManifestBlob: paid.economicClosure.subjectManifestBlob,
      receiptManifestBlob: paid.economicClosure.receiptManifestBlob,
      authorizedRequest: paidRequest,
      resolveNode: resolve,
      resolveBlob: resolve,
    });
    expect(replay.status).toBe("replayed");
    if (replay.status !== "replayed") throw new Error("expected_replay");
    expect(replay.root.rootFingerprint).toBe(
      paid.successorRoot.root.rootFingerprint,
    );
    expect(replay.walletState.balanceSubunits).toBe(0);
  });

  test("returns insufficient balance without producing a successor or blobs", async () => {
    const emptyWallet = createWalletState({ accountScopeHash });
    const base = await fixture(emptyWallet);
    const course0 = createCourseUnlockState({
      accountScopeHash,
      courseId: "english-core",
      studyTarget: "en",
    });
    const resolve = (blobRef: OwnerRepositoryBlobRefV1) =>
      base.storage.get(blobRef.blobKey) ?? null;
    const free = await planOwnerRepositoryCourseUnlock({
      accountScopeHash,
      rootBefore: base.currentRoot,
      walletStateBlob: base.wallet.blob,
      courseManifestBlob: base.course.manifestBlob,
      operationManifestBlob: base.operation.manifestBlob,
      subjectManifestBlob: base.subject.manifestBlob,
      receiptManifestBlob: base.receipt.manifestBlob,
      authorizedRequest: authorize(emptyWallet, course0, 1),
      resolveNode: resolve,
      resolveBlob: resolve,
    });
    if (free.status !== "planned") throw new Error("expected_free_plan");
    storePlan(base.storage, free);
    const denied = await planOwnerRepositoryCourseUnlock({
      accountScopeHash,
      rootBefore: free.successorRoot.root,
      walletStateBlob: free.walletStateAfterBlob,
      courseManifestBlob: free.courseManifestAfterBlob,
      operationManifestBlob: free.economicClosure.operationManifestBlob,
      subjectManifestBlob: free.economicClosure.subjectManifestBlob,
      receiptManifestBlob: free.economicClosure.receiptManifestBlob,
      authorizedRequest: authorize(
        emptyWallet,
        free.appliedReceipt.courseUnlockStateAfter,
        2,
      ),
      resolveNode: resolve,
      resolveBlob: resolve,
    });
    expect(denied).toMatchObject({
      status: "insufficient_balance",
      requiredSubunits: 45 * WALLET_SUBUNITS_PER_STAR,
      currentBalanceSubunits: 0,
    });
  });
});
