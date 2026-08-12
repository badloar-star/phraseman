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
import type {
  OwnerRepositoryBlobRefV1,
  OwnerRepositoryCourseStateRefV1,
} from "../modules/learning-v2/progress/owner_repository";
import {
  createOwnerRepositoryCourseUnlockEffectRecordV2,
  materializeOwnerRepositoryCourseUnlockEffectRecordBlobV2,
  parseOwnerRepositoryCourseUnlockEffectRecordBlobV2,
  parseOwnerRepositoryCourseUnlockEffectRecordV2,
} from "../modules/learning-v2/progress/owner_repository_course_unlock_effect_v2";
import {
  createOwnerRepositoryCourseUnlockCanonicalIndexValuesV2,
  parseOwnerRepositoryCourseUnlockEconomicIndexValueV2,
} from "../modules/learning-v2/progress/owner_repository_course_unlock_economic_values_v2";
import {
  createEmptyOwnerRepositoryEconomicManifest,
  planOwnerRepositoryCourseUnlockEconomicClosureV2,
} from "../modules/learning-v2/progress/owner_repository_economic_manifest";
import {
  createCourseUnlockState,
  reduceAuthorizedCourseUnlock,
  type CourseUnlockAppliedReceiptV1,
} from "../modules/learning-v2/progress/course_unlock_reducer";
import {
  createWalletState,
  reduceAuthorizedWalletOperation,
} from "../modules/learning-v2/progress/wallet_reducer";
import {
  bindOwnerRepositoryCourseUnlockEffectV2SuccessorRootV3,
  parseOwnerRepositoryRootV3,
} from "../modules/learning-v2/progress/owner_repository_root_v3";
import {
  canonicalJsonV1,
  hashCanonicalBody,
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
const courseRef = (
  identity: string,
  label: string,
): OwnerRepositoryCourseStateRefV1 => ({
  schemaVersion: "learning-v2-owner-repository-course-ref.v1",
  courseIdentityFingerprint: identity,
  stateRef: ref("course_unlock_state", label),
});
const fundedWallet = () => {
  const state = createWalletState({ accountScopeHash });
  const sourceReceiptRef = {
    receiptType: "coin_exchange_trade" as const,
    receiptId: "course-effect-funding",
    receiptFingerprint: sha256Utf8("course-effect-funding-receipt"),
  };
  const operation = createWalletAuthorizedOperation({
    schemaVersion: "learning-v2-wallet-authorized-operation.v1",
    authority: "trusted_server_boundary",
    operationId: "course-effect-funding",
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
    origin: { kind: "coin_exchange", tradeId: "course-effect-funding" },
  });
  return reduceAuthorizedWalletOperation(state, operation, {
    currentAccountGeneration: generation,
  }).state;
};
const authorize = (
  walletState: ReturnType<typeof createWalletState>,
  courseState: ReturnType<typeof createCourseUnlockState>,
  ordinal: number,
) =>
  createAuthorizedCourseUnlockRequest({
    schemaVersion: "learning-v2-course-unlock-authorized-request.v1",
    authority: "trusted_server_boundary",
    operationId: `course-effect-unlock-${ordinal}`,
    semanticSubjectFingerprint: deriveCourseUnlockSemanticSubjectFingerprint({
      accountScopeHash,
      courseId: courseState.courseId,
      studyTarget: courseState.studyTarget,
      requiredSessionOrdinal: ordinal,
    }),
    accountScopeHash,
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
      sessionSetHash: sha256Utf8("course-effect-session-set"),
      catalogFingerprint: sha256Utf8("course-effect-catalog"),
      sessionId: `required-session-${ordinal}`,
    },
  });
const receipts = () => {
  const course0 = createCourseUnlockState({
    accountScopeHash,
    courseId: "english-core",
    studyTarget: "en",
  });
  const wallet0 = createWalletState({ accountScopeHash });
  const free = reduceAuthorizedCourseUnlock({
    walletState: wallet0,
    courseUnlockState: course0,
    authorizedRequest: authorize(wallet0, course0, 1),
    lookup: { currentAccountGeneration: generation },
  });
  if (free.status !== "applied") throw new Error("expected_free");
  const wallet1 = fundedWallet();
  const paid = reduceAuthorizedCourseUnlock({
    walletState: wallet1,
    courseUnlockState: free.courseUnlockState,
    authorizedRequest: authorize(wallet1, free.courseUnlockState, 2),
    lookup: { currentAccountGeneration: generation },
  });
  if (paid.status !== "applied") throw new Error("expected_paid");
  return { free: free.appliedReceipt, paid: paid.appliedReceipt };
};
const input = (
  receipt: CourseUnlockAppliedReceiptV1,
  overrides: Record<string, unknown> = {},
) => {
  const free = receipt.chargedSubunits === 0;
  const prefix = free ? "free" : "paid";
  const identity = receipt.courseUnlockStateBefore.courseIdentityFingerprint;
  const walletBefore = ref("wallet_state", `${prefix}:wallet:before`);
  return {
    accountScopeHash,
    journalSequence: 1,
    repositoryRevisionBefore: 0,
    rootBeforeFingerprint: sha256Utf8(`${prefix}:root:before`),
    previousJournalRecordRef: null,
    walletStateBeforeRef: walletBefore,
    walletStateAfterRef: free
      ? walletBefore
      : ref("wallet_state", `${prefix}:wallet:after`),
    courseStateBeforeRef: free
      ? null
      : courseRef(identity, `${prefix}:course:before`),
    courseStateAfterRef: courseRef(identity, `${prefix}:course:after`),
    courseStateManifestBeforeRef: ref(
      "course_state_manifest",
      `${prefix}:course-manifest:before`,
    ),
    courseStateManifestAfterRef: ref(
      "course_state_manifest",
      `${prefix}:course-manifest:after`,
    ),
    operationIndexManifestBeforeRef: ref(
      "operation_index_manifest",
      `${prefix}:operation:before`,
    ),
    subjectIndexManifestBeforeRef: ref(
      "subject_index_manifest",
      `${prefix}:subject:before`,
    ),
    receiptIndexManifestBeforeRef: ref(
      "receipt_index_manifest",
      `${prefix}:receipt:before`,
    ),
    appliedReceipt: receipt,
    ...overrides,
  };
};

const currentRoot = () => {
  const body = {
    schemaVersion: "learning-v2-owner-repository-root.v3" as const,
    accountScopeHash,
    currentGeneration: generation,
    repositoryRevision: 1,
    journalSequence: 1,
    previousRootFingerprint: sha256Utf8("course-effect-root-parent"),
    journalHeadRef: ref("journal_record", "course-effect-prior-journal"),
    walletStateRef: ref("wallet_state", "course-effect-current-wallet"),
    courseStateManifestRef: ref(
      "course_state_manifest",
      "course-effect-current-course-manifest",
    ),
    operationIndexManifestRef: ref(
      "operation_index_manifest",
      "course-effect-current-operation",
    ),
    subjectIndexManifestRef: ref(
      "subject_index_manifest",
      "course-effect-current-subject",
    ),
    receiptIndexManifestRef: ref(
      "receipt_index_manifest",
      "course-effect-current-receipt",
    ),
    walletCheckpointAnchor: {
      schemaVersion:
        "learning-v2-owner-repository-wallet-checkpoint-anchor.v1" as const,
      checkpointSchemaVersion:
        "learning-v2-owner-repository-wallet-checkpoint.v1" as const,
      checkpointKind: "wallet_credit_only" as const,
      accountScopeHash,
      checkpointKey: `learning_v2_owner_repository:v1:${accountScopeHash}:wallet-checkpoint:${sha256Utf8("course-effect-checkpoint-root")}`,
      checkpointRootFingerprint: sha256Utf8("course-effect-checkpoint-root"),
      checkpointFingerprint: sha256Utf8("course-effect-checkpoint"),
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
  );
};

describe("Learning V2 Owner Repository course-unlock effect V2", () => {
  test("round-trips a free-first effect with an unchanged wallet and changed course manifest", () => {
    const record = createOwnerRepositoryCourseUnlockEffectRecordV2(
      input(receipts().free),
    );
    expect(record.walletStateAfterRef).toEqual(record.walletStateBeforeRef);
    expect(record.courseStateBeforeRef).toBeNull();
    expect(record.courseStateManifestAfterRef).not.toEqual(
      record.courseStateManifestBeforeRef,
    );
    const body = { ...record } as Record<string, unknown>;
    delete body.journalRecordFingerprint;
    expect(record.journalRecordFingerprint).toBe(hashCanonicalBody(body));
    expect(parseOwnerRepositoryCourseUnlockEffectRecordV2(record)).toEqual(
      record,
    );

    const blob = materializeOwnerRepositoryCourseUnlockEffectRecordBlobV2(
      record,
    );
    expect(
      parseOwnerRepositoryCourseUnlockEffectRecordBlobV2({
        accountScopeHash,
        ref: blob.ref,
        raw: blob.encoded,
      }),
    ).toEqual(blob);
  });

  test("round-trips a paid effect with both wallet and course projections changed", () => {
    const record = createOwnerRepositoryCourseUnlockEffectRecordV2(
      input(receipts().paid),
    );
    expect(record.walletStateAfterRef).not.toEqual(record.walletStateBeforeRef);
    expect(record.courseStateBeforeRef).not.toBeNull();
    expect(record.appliedReceipt.walletDebitReceipt).not.toBeNull();
    expect(parseOwnerRepositoryCourseUnlockEffectRecordV2(record)).toEqual(
      record,
    );
  });

  test("rejects unchanged manifests, projection aliases, tampering and hostile stored bytes", () => {
    const { paid } = receipts();
    const base = input(paid);
    expect(() =>
      createOwnerRepositoryCourseUnlockEffectRecordV2({
        ...base,
        courseStateManifestAfterRef: base.courseStateManifestBeforeRef,
      }),
    ).toThrow("owner_repository_course_unlock_effect_v2_invalid");
    expect(() =>
      createOwnerRepositoryCourseUnlockEffectRecordV2({
        ...base,
        walletStateAfterRef: base.walletStateBeforeRef,
      }),
    ).toThrow("owner_repository_course_unlock_effect_v2_invalid");

    const record = createOwnerRepositoryCourseUnlockEffectRecordV2(base);
    expect(() =>
      parseOwnerRepositoryCourseUnlockEffectRecordV2({
        ...record,
        appliedReceiptFingerprint: "b".repeat(64),
      }),
    ).toThrow("owner_repository_course_unlock_effect_v2_indeterminate");

    const blob = materializeOwnerRepositoryCourseUnlockEffectRecordBlobV2(
      record,
    );
    let getterCalled = false;
    const hostile = Object.defineProperty(
      { accountScopeHash, ref: blob.ref },
      "raw",
      {
        enumerable: true,
        get() {
          getterCalled = true;
          return blob.encoded;
        },
      },
    );
    expect(() =>
      parseOwnerRepositoryCourseUnlockEffectRecordBlobV2(hostile),
    ).toThrow("owner_repository_course_unlock_effect_v2_indeterminate");
    expect(getterCalled).toBe(false);

    const parseSpy = jest.spyOn(JSON, "parse");
    expect(() =>
      parseOwnerRepositoryCourseUnlockEffectRecordBlobV2({
        accountScopeHash,
        ref: blob.ref,
        raw: "x".repeat(512 * 1024 + 1),
      }),
    ).toThrow("owner_repository_course_unlock_effect_v2_indeterminate");
    expect(parseSpy).not.toHaveBeenCalled();
    parseSpy.mockRestore();
  });

  test("binds the exact compound effect into a RootV3 successor", () => {
    const current = currentRoot();
    const base = input(receipts().paid, {
      journalSequence: 2,
      repositoryRevisionBefore: 1,
      rootBeforeFingerprint: current.root.rootFingerprint,
      previousJournalRecordRef: current.root.journalHeadRef,
      walletStateBeforeRef: current.root.walletStateRef,
      courseStateManifestBeforeRef: current.root.courseStateManifestRef,
      operationIndexManifestBeforeRef:
        current.root.operationIndexManifestRef,
      subjectIndexManifestBeforeRef: current.root.subjectIndexManifestRef,
      receiptIndexManifestBeforeRef: current.root.receiptIndexManifestRef,
    });
    const record = createOwnerRepositoryCourseUnlockEffectRecordV2(base);
    const blob = materializeOwnerRepositoryCourseUnlockEffectRecordBlobV2(
      record,
    );
    const operationAfter = ref(
      "operation_index_manifest",
      "course-effect-operation-after",
    );
    const subjectAfter = ref(
      "subject_index_manifest",
      "course-effect-subject-after",
    );
    const receiptAfter = ref(
      "receipt_index_manifest",
      "course-effect-receipt-after",
    );
    const successor =
      bindOwnerRepositoryCourseUnlockEffectV2SuccessorRootV3({
        rootBefore: current.root,
        journalRecordBlob: blob,
        operationIndexManifestAfterRef: operationAfter,
        subjectIndexManifestAfterRef: subjectAfter,
        receiptIndexManifestAfterRef: receiptAfter,
        promotedCheckpointAnchor: null,
      });

    expect(successor.root).toMatchObject({
      repositoryRevision: 2,
      journalSequence: 2,
      previousRootFingerprint: current.root.rootFingerprint,
      journalHeadRef: blob.ref,
      walletStateRef: record.walletStateAfterRef,
      courseStateManifestRef: record.courseStateManifestAfterRef,
      operationIndexManifestRef: operationAfter,
      subjectIndexManifestRef: subjectAfter,
      receiptIndexManifestRef: receiptAfter,
      walletCheckpointLagRootTransitions: 2,
    });
    expect(() =>
      bindOwnerRepositoryCourseUnlockEffectV2SuccessorRootV3({
        rootBefore: current.root,
        journalRecordBlob: blob,
        operationIndexManifestAfterRef: operationAfter,
        subjectIndexManifestAfterRef: subjectAfter,
        receiptIndexManifestAfterRef: ref(
          "subject_index_manifest",
          "wrong-receipt-kind",
        ),
        promotedCheckpointAnchor: null,
      }),
    ).toThrow("owner_repository_root_v3_invalid");
  });

  test("materializes and parses the four lifetime uniqueness coordinates", () => {
    const record = createOwnerRepositoryCourseUnlockEffectRecordV2(
      input(receipts().paid),
    );
    const blob = materializeOwnerRepositoryCourseUnlockEffectRecordBlobV2(
      record,
    );
    const values = createOwnerRepositoryCourseUnlockCanonicalIndexValuesV2({
      journalRecordBlob: blob,
    });
    const operation = record.appliedReceipt.authorizedRequest;

    expect(
      parseOwnerRepositoryCourseUnlockEconomicIndexValueV2({
        accountScopeHash,
        indexKind: "operation",
        keyKind: "operation_id",
        logicalKey: operation.operationId,
        value: values.operationValue,
      }),
    ).toEqual(values.operationValue);
    expect(
      parseOwnerRepositoryCourseUnlockEconomicIndexValueV2({
        accountScopeHash,
        indexKind: "operation",
        keyKind: "operation_fingerprint",
        logicalKey: operation.operationFingerprint,
        value: values.operationValue,
      }),
    ).toEqual(values.operationValue);
    expect(
      parseOwnerRepositoryCourseUnlockEconomicIndexValueV2({
        accountScopeHash,
        indexKind: "subject",
        keyKind: "semantic_subject",
        logicalKey: operation.semanticSubjectFingerprint,
        value: values.subjectValue,
      }),
    ).toEqual(values.subjectValue);
    expect(
      parseOwnerRepositoryCourseUnlockEconomicIndexValueV2({
        accountScopeHash,
        indexKind: "receipt",
        keyKind: "applied_receipt",
        logicalKey: record.appliedReceiptFingerprint,
        value: values.receiptValue,
      }),
    ).toEqual(values.receiptValue);
    expect(() =>
      parseOwnerRepositoryCourseUnlockEconomicIndexValueV2({
        accountScopeHash,
        indexKind: "subject",
        keyKind: "semantic_subject",
        logicalKey: "b".repeat(64),
        value: values.subjectValue,
      }),
    ).toThrow(
      "owner_repository_course_unlock_economic_value_indeterminate",
    );
  });

  test("plans one atomic four-key closure and replays it without new nodes", async () => {
    const record = createOwnerRepositoryCourseUnlockEffectRecordV2(
      input(receipts().paid),
    );
    const blob = materializeOwnerRepositoryCourseUnlockEffectRecordBlobV2(
      record,
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
    const plan = await planOwnerRepositoryCourseUnlockEconomicClosureV2({
      accountScopeHash,
      operationManifest: operation.manifest,
      subjectManifest: subject.manifest,
      receiptManifest: receipt.manifest,
      journalRecordBlob: blob,
      resolveNode: () => null,
    });
    expect(plan.changed).toBe(true);
    expect(plan.operationManifest.entryCount).toBe(2);
    expect(plan.subjectManifest.entryCount).toBe(1);
    expect(plan.receiptManifest.entryCount).toBe(1);

    const nodes = new Map(
      plan.immutableNodeBlobs.map((node) => [node.ref.blobKey, node.encoded]),
    );
    const replay = await planOwnerRepositoryCourseUnlockEconomicClosureV2({
      accountScopeHash,
      operationManifest: plan.operationManifest,
      subjectManifest: plan.subjectManifest,
      receiptManifest: plan.receiptManifest,
      journalRecordBlob: blob,
      resolveNode: (nodeRef: OwnerRepositoryBlobRefV1) =>
        nodes.get(nodeRef.blobKey) ?? null,
    });
    expect(replay.changed).toBe(false);
    expect(replay.immutableNodeBlobs).toHaveLength(0);
  });
});
