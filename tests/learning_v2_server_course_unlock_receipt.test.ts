import {
  createServerCourseUnlockReceiptAuthority,
  materializeServerCourseUnlockReceiptCandidate,
  materializeServerCourseUnlockRequest,
  parseServerCourseUnlockIntent,
  parseServerCourseUnlockReceiptRaw,
  parseServerCourseUnlockRequest,
} from "../modules/learning-v2/progress/server_course_unlock_receipt";
import { createCourseUnlockState } from
  "../modules/learning-v2/progress/course_unlock_reducer";
import { createWalletState } from
  "../modules/learning-v2/progress/wallet_reducer";
import { WALLET_SUBUNITS_PER_STAR } from "../modules/learning-v2/contracts/wallet";
import { sha256Utf8 } from "../modules/learning-v2/policies/decision_registry";

const accountScopeHash = "a".repeat(64);
const fingerprint = (label: string) => sha256Utf8(label);
const intent = (ordinal: number) => ({
  schemaVersion: "learning-v2-server-course-unlock-intent.v1" as const,
  accountScopeHash,
  accountGeneration: 7,
  courseId: "english-core",
  studyTarget: "en",
  requiredSessionOrdinal: ordinal,
  walletRevisionBefore: 11,
  walletStateBeforeFingerprint: fingerprint(`wallet-${ordinal}`),
  courseRevisionBefore: ordinal - 1,
  courseStateBeforeFingerprint: fingerprint(`course-${ordinal}`),
});
const target = (ordinal: number) => ({
  courseReleaseId: "english-core-release-1",
  sessionSetId: "english-core-e1-session-set-1",
  sessionSetHash: fingerprint("session-set"),
  catalogFingerprint: fingerprint("catalog"),
  sessionId: `required-session-${ordinal}`,
});

describe("Learning V2 protected server course-unlock receipt", () => {
  it("materializes free first and exact paid ladder requests", () => {
    const first = materializeServerCourseUnlockReceiptCandidate({
      intent: intent(1), targetSessionRef: target(1),
    });
    const second = materializeServerCourseUnlockReceiptCandidate({
      intent: intent(2), targetSessionRef: target(2),
    });
    const seventh = materializeServerCourseUnlockReceiptCandidate({
      intent: intent(7), targetSessionRef: target(7),
    });
    expect(first.receipt.authorizedRequest).toMatchObject({
      requiredSessionOrdinal: 1,
      basis: "free_first_session",
      chargeSubunits: 0,
    });
    expect(second.receipt.authorizedRequest).toMatchObject({
      requiredSessionOrdinal: 2,
      basis: "stars",
      chargeSubunits: 45 * WALLET_SUBUNITS_PER_STAR,
    });
    expect(seventh.receipt.authorizedRequest.chargeSubunits)
      .toBe(65 * WALLET_SUBUNITS_PER_STAR);
  });

  it("round-trips canonical protected bytes and the bounded client reference", () => {
    const materialized = materializeServerCourseUnlockReceiptCandidate({
      intent: intent(2), targetSessionRef: target(2),
    });
    expect(parseServerCourseUnlockReceiptRaw(materialized.encoded)).toEqual(materialized);
    const request = materializeServerCourseUnlockRequest(materialized);
    expect(request.operationId).toBe(
      materialized.receipt.authorizedRequest.operationId,
    );
    expect(parseServerCourseUnlockRequest(JSON.parse(JSON.stringify(request))))
      .toEqual(request);
    expect(Object.isFrozen(materialized.receipt.authorizedRequest)).toBe(true);
  });

  it("binds release, catalog and local before-state into different identities", () => {
    const base = materializeServerCourseUnlockReceiptCandidate({
      intent: intent(2), targetSessionRef: target(2),
    });
    const changedCatalog = materializeServerCourseUnlockReceiptCandidate({
      intent: intent(2),
      targetSessionRef: { ...target(2), catalogFingerprint: fingerprint("catalog-2") },
    });
    const changedWallet = materializeServerCourseUnlockReceiptCandidate({
      intent: { ...intent(2), walletStateBeforeFingerprint: fingerprint("wallet-new") },
      targetSessionRef: target(2),
    });
    expect(changedCatalog.receipt.unlockId).not.toBe(base.receipt.unlockId);
    expect(changedCatalog.receipt.authorizedRequest.semanticFingerprint)
      .not.toBe(base.receipt.authorizedRequest.semanticFingerprint);
    expect(changedWallet.receipt.unlockId).not.toBe(base.receipt.unlockId);
    expect(changedWallet.receipt.authorizedRequest.semanticSubjectFingerprint)
      .toBe(base.receipt.authorizedRequest.semanticSubjectFingerprint);
  });

  it("rejects non-contiguous intents, forged bytes and hostile accessors", () => {
    expect(() => parseServerCourseUnlockIntent({
      ...intent(2), courseRevisionBefore: 0,
    })).toThrow("server_course_unlock_intent_invalid");

    const materialized = materializeServerCourseUnlockReceiptCandidate({
      intent: intent(2), targetSessionRef: target(2),
    });
    const forged = JSON.parse(materialized.encoded) as Record<string, unknown>;
    forged.unlockFingerprint = fingerprint("forged");
    expect(() => parseServerCourseUnlockReceiptRaw(JSON.stringify(forged)))
      .toThrow("server_course_unlock_receipt_indeterminate");

    let getterCalled = false;
    const hostile = Object.defineProperty({}, "schemaVersion", {
      enumerable: true,
      get() { getterCalled = true; return "learning-v2-server-course-unlock-intent.v1"; },
    });
    expect(() => parseServerCourseUnlockIntent(hostile))
      .toThrow("server_course_unlock_intent_invalid");
    expect(getterCalled).toBe(false);
  });

  it("grants repository authority only after protected exact readback", async () => {
    const walletState = createWalletState({ accountScopeHash });
    const courseUnlockState = createCourseUnlockState({
      accountScopeHash,
      courseId: "english-core",
      studyTarget: "en",
    });
    const materialized = materializeServerCourseUnlockReceiptCandidate({
      intent: {
        schemaVersion: "learning-v2-server-course-unlock-intent.v1",
        accountScopeHash,
        accountGeneration: 7,
        courseId: "english-core",
        studyTarget: "en",
        requiredSessionOrdinal: 1,
        walletRevisionBefore: walletState.revision,
        walletStateBeforeFingerprint: walletState.stateFingerprint,
        courseRevisionBefore: courseUnlockState.revision,
        courseStateBeforeFingerprint: courseUnlockState.stateFingerprint,
      },
      targetSessionRef: target(1),
    });
    const reference = materializeServerCourseUnlockRequest(materialized);
    const authority = createServerCourseUnlockReceiptAuthority({
      resolveCourseUnlockReceipt: async () => materialized.encoded,
    });
    await expect(authority({
      scope: { accountScopeHash, generation: 7 },
      walletState,
      courseUnlockState,
      canonicalAppliedReceipt: null,
      candidate: reference,
    })).resolves.toEqual(materialized.receipt.authorizedRequest);
    await expect(authority({
      scope: { accountScopeHash, generation: 7 },
      walletState,
      courseUnlockState,
      canonicalAppliedReceipt: null,
      candidate: { ...reference, operationId: "course-unlock:forged" },
    })).rejects.toThrow("server_course_unlock_receipt_conflict");
    await expect(authority({
      scope: { accountScopeHash, generation: 7 },
      walletState: { ...walletState, revision: 1 },
      courseUnlockState,
      canonicalAppliedReceipt: null,
      candidate: reference,
    })).rejects.toThrow();

    const forgedAuthority = createServerCourseUnlockReceiptAuthority({
      resolveCourseUnlockReceipt: async () => materializeServerCourseUnlockReceiptCandidate({
        intent: {
          ...intent(1),
          accountScopeHash: "b".repeat(64),
        },
        targetSessionRef: target(1),
      }).encoded,
    });
    await expect(forgedAuthority({
      scope: { accountScopeHash, generation: 7 },
      walletState,
      courseUnlockState,
      canonicalAppliedReceipt: null,
      candidate: reference,
    })).rejects.toThrow("server_course_unlock_receipt_conflict");
  });
});
