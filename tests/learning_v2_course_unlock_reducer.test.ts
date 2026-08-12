import {
  WALLET_SUBUNITS_PER_STAR,
  createWalletAuthorizedOperation,
  deriveWalletSemanticSubjectFingerprint,
} from "../modules/learning-v2/contracts/wallet";
import {
  COURSE_UNLOCK_POLICY_V1,
  COURSE_UNLOCK_POLICY_FINGERPRINT_V1,
  createAuthorizedCourseUnlockRequest,
  deriveCourseUnlockSemanticSubjectFingerprint,
  requiredCourseUnlockPriceStars,
} from "../modules/learning-v2/contracts/course_unlock";
import {
  createCourseUnlockState,
  parseCourseUnlockAppliedReceipt,
  rebuildCourseUnlockStatesFromAppliedReceipt,
  reduceAuthorizedCourseUnlock,
} from "../modules/learning-v2/progress/course_unlock_reducer";
import {
  createWalletState,
  rebuildWalletStateFromAppliedReceipts,
  reduceAuthorizedWalletOperation,
} from "../modules/learning-v2/progress/wallet_reducer";
import * as walletReducerExports from "../modules/learning-v2/progress/wallet_reducer";
import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";

const hash = (value: string) => value.repeat(64);
const accountScopeHash = "aaaaaaaaaaaaaaaa";
const generation = 4;

const creditWalletState = (
  state: ReturnType<typeof createWalletState>,
  amountSubunits: number,
  id: string,
) => {
  const sourceReceiptRef = {
    receiptType: "coin_exchange_trade" as const,
    receiptId: id,
    receiptFingerprint: hash("c"),
  };
  const operation = createWalletAuthorizedOperation({
    schemaVersion: "learning-v2-wallet-authorized-operation.v1",
    authority: "trusted_server_boundary",
    operationId: id,
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
    amountSubunits,
    earningCategory: null,
    operationReason: "coin_exchange",
    sourceReceiptRef,
    origin: { kind: "coin_exchange", tradeId: id },
  });
  return reduceAuthorizedWalletOperation(state, operation, {
    currentAccountGeneration: generation,
  });
};
const walletWithBalanceSubunits = (amountSubunits: number) => {
  const state = createWalletState({ accountScopeHash });
  if (amountSubunits === 0) return state;
  return creditWalletState(state, amountSubunits, `fund-wallet-${amountSubunits}`).state;
};
const walletWithBalance = (wholeStars: number) =>
  walletWithBalanceSubunits(wholeStars * WALLET_SUBUNITS_PER_STAR);

const request = (
  walletState: ReturnType<typeof createWalletState>,
  courseState: ReturnType<typeof createCourseUnlockState>,
  ordinal: number,
  overrides: Partial<{
    operationId: string;
    accountGeneration: number;
    courseId: string;
    studyTarget: string;
    walletRevisionBefore: number;
    walletStateBeforeFingerprint: string;
    courseRevisionBefore: number;
    courseStateBeforeFingerprint: string;
    chargeSubunits: number;
    targetSessionId: string;
    courseReleaseId: string;
    sessionSetId: string;
    sessionSetHash: string;
    catalogFingerprint: string;
  }> = {},
) => {
  const courseId = overrides.courseId ?? courseState.courseId;
  const studyTarget = overrides.studyTarget ?? courseState.studyTarget;
  return createAuthorizedCourseUnlockRequest({
    schemaVersion: "learning-v2-course-unlock-authorized-request.v1",
    authority: "trusted_server_boundary",
    operationId: overrides.operationId ?? `unlock-${courseId}-${ordinal}`,
    semanticSubjectFingerprint: deriveCourseUnlockSemanticSubjectFingerprint({
      accountScopeHash,
      courseId,
      studyTarget,
      requiredSessionOrdinal: ordinal,
    }),
    accountScopeHash,
    accountGeneration: overrides.accountGeneration ?? generation,
    courseId,
    studyTarget,
    requiredSessionOrdinal: ordinal,
    walletRevisionBefore: overrides.walletRevisionBefore ?? walletState.revision,
    walletStateBeforeFingerprint: overrides.walletStateBeforeFingerprint ?? walletState.stateFingerprint,
    courseRevisionBefore: overrides.courseRevisionBefore ?? courseState.revision,
    courseStateBeforeFingerprint: overrides.courseStateBeforeFingerprint ?? courseState.stateFingerprint,
    chargeSubunits: overrides.chargeSubunits ?? [0, 45, 50, 55, 60, 65][Math.min(ordinal - 1, 5)] * WALLET_SUBUNITS_PER_STAR,
    basis: ordinal === 1 ? "free_first_session" : "stars",
    policyFingerprint: COURSE_UNLOCK_POLICY_FINGERPRINT_V1,
    targetSessionRef: {
      courseReleaseId: overrides.courseReleaseId ?? "release-1",
      sessionSetId: overrides.sessionSetId ?? "session-set-1",
      sessionSetHash: overrides.sessionSetHash ?? hash("b"),
      catalogFingerprint: overrides.catalogFingerprint ?? hash("d"),
      sessionId: overrides.targetSessionId ?? `required-session-${ordinal}`,
    },
  });
};

const lookup = () => ({ currentAccountGeneration: generation });
const ancestry = (
  receipt: { appliedReceiptFingerprint: string },
  walletState: { stateFingerprint: string },
  courseState: { stateFingerprint: string },
) => ({
  schemaVersion: "learning-v2-course-unlock-repository-ancestry.v1" as const,
  canonicalAppliedReceiptFingerprint: receipt.appliedReceiptFingerprint,
  currentWalletStateFingerprint: walletState.stateFingerprint,
  currentCourseStateFingerprint: courseState.stateFingerprint,
  proofSource: "authoritative_compound_journal" as const,
});

describe("Learning V2 atomic required-session unlock", () => {
  it("pins a dedicated unlock-only policy fingerprint", () => {
    expect(COURSE_UNLOCK_POLICY_FINGERPRINT_V1).toBe(hashCanonicalBody(COURSE_UNLOCK_POLICY_V1));
    expect(COURSE_UNLOCK_POLICY_V1).toEqual({
      schemaVersion: "learning-v2-required-session-unlock-policy.v1",
      totalRequiredSessions: 384,
      unlockPriceLadderStars: [0, 45, 50, 55, 60, 65],
      freeFirstScope: "stable_course_and_study_target",
      progression: "strictly_contiguous_1_to_384",
      subscriptionWaivesStarPrice: false,
      walletSubunitsPerStar: WALLET_SUBUNITS_PER_STAR,
    });
    expect(COURSE_UNLOCK_POLICY_V1).not.toHaveProperty("repeatRewardBasisPoints");
    expect(COURSE_UNLOCK_POLICY_V1).not.toHaveProperty("requiredTasksPerSession");
    expect([0, 45, 50, 55, 60, 65, 65]).toEqual(
      Array.from({ length: 7 }, (_, prior) => requiredCourseUnlockPriceStars(prior)),
    );
  });
  it("unlocks ordinal 1 for free without inventing a wallet debit", () => {
    const walletState = walletWithBalance(0);
    const courseState = createCourseUnlockState({
      accountScopeHash,
      courseId: "english-core",
      studyTarget: "en",
    });
    const result = reduceAuthorizedCourseUnlock({
      walletState,
      courseUnlockState: courseState,
      authorizedRequest: request(walletState, courseState, 1),
      lookup: lookup(),
    });
    expect(result.status).toBe("applied");
    if (result.status !== "applied") throw new Error("expected_applied");
    expect(result.walletState).toEqual(walletState);
    expect(result.courseUnlockState.highestUnlockedRequiredSessionOrdinal).toBe(1);
    expect(result.appliedReceipt).toMatchObject({
      chargedSubunits: 0,
      basis: "free_first_session",
      walletDebitReceipt: null,
    });
  });

  it("derives the exact course-wide ladder without resetting at lesson boundaries", () => {
    let walletState = walletWithBalance(1_000);
    let courseState = createCourseUnlockState({ accountScopeHash, courseId: "english-core", studyTarget: "en" });
    const prices = [0, 45, 50, 55, 60, 65, 65, 65, 65, 65, 65, 65, 65];
    for (let ordinal = 1; ordinal <= prices.length; ordinal += 1) {
      const result = reduceAuthorizedCourseUnlock({
        walletState,
        courseUnlockState: courseState,
        authorizedRequest: request(walletState, courseState, ordinal),
        lookup: lookup(),
      });
      expect(result.status).toBe("applied");
      if (result.status !== "applied") throw new Error("expected_applied");
      expect(result.appliedReceipt.chargedSubunits).toBe(prices[ordinal - 1] * WALLET_SUBUNITS_PER_STAR);
      walletState = result.walletState;
      courseState = result.courseUnlockState;
    }
    expect(courseState.highestUnlockedRequiredSessionOrdinal).toBe(13);
    expect(walletState.balanceSubunits).toBe((1_000 - prices.reduce((sum, price) => sum + price, 0)) * WALLET_SUBUNITS_PER_STAR);
  });

  it("preserves fractional remainder and leaves both states unchanged when short by one subunit", () => {
    let walletState = walletWithBalanceSubunits(45 * WALLET_SUBUNITS_PER_STAR + 5_000);
    let courseState = createCourseUnlockState({ accountScopeHash, courseId: "english-core", studyTarget: "en" });
    const first = reduceAuthorizedCourseUnlock({ walletState, courseUnlockState: courseState, authorizedRequest: request(walletState, courseState, 1), lookup: lookup() });
    if (first.status !== "applied") throw new Error("expected_applied");
    walletState = first.walletState;
    courseState = first.courseUnlockState;
    const paid = reduceAuthorizedCourseUnlock({ walletState, courseUnlockState: courseState, authorizedRequest: request(walletState, courseState, 2), lookup: lookup() });
    if (paid.status !== "applied") throw new Error("expected_applied");
    expect(paid.walletState.balanceSubunits).toBe(5_000);
    expect(paid.walletState.spentSubunits).toBe(45 * WALLET_SUBUNITS_PER_STAR);

    let shortWallet = walletWithBalanceSubunits(45 * WALLET_SUBUNITS_PER_STAR - 1);
    let shortCourse = createCourseUnlockState({ accountScopeHash, courseId: "short-core", studyTarget: "en" });
    const shortFree = reduceAuthorizedCourseUnlock({
      walletState: shortWallet,
      courseUnlockState: shortCourse,
      authorizedRequest: request(shortWallet, shortCourse, 1),
      lookup: lookup(),
    });
    if (shortFree.status !== "applied") throw new Error("expected_applied");
    shortWallet = shortFree.walletState;
    shortCourse = shortFree.courseUnlockState;
    const short = reduceAuthorizedCourseUnlock({
      walletState: shortWallet,
      courseUnlockState: shortCourse,
      authorizedRequest: request(shortWallet, shortCourse, 2),
      lookup: lookup(),
    });
    expect(short).toMatchObject({
      status: "insufficient_balance",
      currentBalanceSubunits: 45 * WALLET_SUBUNITS_PER_STAR - 1,
      requiredSubunits: 45 * WALLET_SUBUNITS_PER_STAR,
    });
  });

  it("rejects ordinal gaps, forged charge, stale generation and stale CAS", () => {
    const walletState = walletWithBalance(100);
    const courseState = createCourseUnlockState({ accountScopeHash, courseId: "english-core", studyTarget: "en" });
    expect(() => reduceAuthorizedCourseUnlock({ walletState, courseUnlockState: courseState, authorizedRequest: request(walletState, courseState, 2), lookup: lookup() })).toThrow("course_unlock_not_contiguous");
    expect(() => request(walletState, courseState, 1, { chargeSubunits: 45 * WALLET_SUBUNITS_PER_STAR })).toThrow("course_unlock_request_invalid");
    expect(() => reduceAuthorizedCourseUnlock({ walletState, courseUnlockState: courseState, authorizedRequest: request(walletState, courseState, 1, { accountGeneration: 3 }), lookup: lookup() })).toThrow("course_unlock_generation_stale");
    expect(() => reduceAuthorizedCourseUnlock({ walletState, courseUnlockState: courseState, authorizedRequest: request(walletState, courseState, 1, { walletRevisionBefore: walletState.revision + 1 }), lookup: lookup() })).toThrow("course_unlock_request_out_of_order");
  });

  it("replays exact and cross-generation semantic aliases without a second charge", () => {
    const walletState = walletWithBalance(100);
    const courseState = createCourseUnlockState({ accountScopeHash, courseId: "english-core", studyTarget: "en" });
    const authorized = request(walletState, courseState, 1);
    const first = reduceAuthorizedCourseUnlock({ walletState, courseUnlockState: courseState, authorizedRequest: authorized, lookup: lookup() });
    if (first.status !== "applied") throw new Error("expected_applied");
    const exact = reduceAuthorizedCourseUnlock({
      walletState: first.walletState,
      courseUnlockState: first.courseUnlockState,
      authorizedRequest: authorized,
      lookup: { currentAccountGeneration: generation, operationLedgerEntry: first.operationLedgerEntry, subjectLedgerEntry: first.subjectLedgerEntry },
    });
    expect(exact).toMatchObject({ status: "applied", changed: false, ledgerWriteRequired: false });
    const alias = request(first.walletState, first.courseUnlockState, 1, {
      operationId: "unlock-alias-generation-5",
      accountGeneration: generation + 1,
    });
    const replay = reduceAuthorizedCourseUnlock({
      walletState: first.walletState,
      courseUnlockState: first.courseUnlockState,
      authorizedRequest: alias,
      lookup: { currentAccountGeneration: generation + 1, subjectLedgerEntry: first.subjectLedgerEntry },
    });
    expect(replay).toMatchObject({ status: "applied", changed: false, ledgerWriteRequired: true });
    if (replay.status !== "applied") throw new Error("expected_applied");
    expect(replay.appliedReceipt).toEqual(first.appliedReceipt);
  });

  it("uses one global wallet across independent language-course ladders", () => {
    let walletState = walletWithBalance(100);
    let english = createCourseUnlockState({ accountScopeHash, courseId: "english-core", studyTarget: "en" });
    let spanish = createCourseUnlockState({ accountScopeHash, courseId: "spanish-core", studyTarget: "es" });
    for (const state of [english, spanish]) {
      const opened = reduceAuthorizedCourseUnlock({ walletState, courseUnlockState: state, authorizedRequest: request(walletState, state, 1), lookup: lookup() });
      if (opened.status !== "applied") throw new Error("expected_applied");
      walletState = opened.walletState;
      if (state.courseId === "english-core") english = opened.courseUnlockState;
      else spanish = opened.courseUnlockState;
    }
    const enPaid = reduceAuthorizedCourseUnlock({ walletState, courseUnlockState: english, authorizedRequest: request(walletState, english, 2), lookup: lookup() });
    if (enPaid.status !== "applied") throw new Error("expected_applied");
    walletState = enPaid.walletState;
    const esPaid = reduceAuthorizedCourseUnlock({ walletState, courseUnlockState: spanish, authorizedRequest: request(walletState, spanish, 2), lookup: lookup() });
    if (esPaid.status !== "applied") throw new Error("expected_applied");
    expect(esPaid.walletState.balanceSubunits).toBe(10 * WALLET_SUBUNITS_PER_STAR);
  });

  it("returns an explicit insufficient result without receipt or state mutation", () => {
    let walletState = walletWithBalance(44);
    let courseState = createCourseUnlockState({ accountScopeHash, courseId: "english-core", studyTarget: "en" });
    const first = reduceAuthorizedCourseUnlock({ walletState, courseUnlockState: courseState, authorizedRequest: request(walletState, courseState, 1), lookup: lookup() });
    if (first.status !== "applied") throw new Error("expected_applied");
    walletState = first.walletState;
    courseState = first.courseUnlockState;
    const denied = reduceAuthorizedCourseUnlock({ walletState, courseUnlockState: courseState, authorizedRequest: request(walletState, courseState, 2), lookup: lookup() });
    expect(denied).toEqual(expect.objectContaining({
      status: "insufficient_balance",
      changed: false,
      requiredSubunits: 45 * WALLET_SUBUNITS_PER_STAR,
      walletState,
      courseUnlockState: courseState,
    }));
    expect(denied).not.toHaveProperty("appliedReceipt");
  });

  it("replays a paid unlock, repairs either torn projection and rejects a missing canonical ledger", () => {
    let walletState = walletWithBalance(200);
    let courseState = createCourseUnlockState({ accountScopeHash, courseId: "english-core", studyTarget: "en" });
    const free = reduceAuthorizedCourseUnlock({ walletState, courseUnlockState: courseState, authorizedRequest: request(walletState, courseState, 1), lookup: lookup() });
    if (free.status !== "applied") throw new Error("expected_applied");
    walletState = free.walletState;
    courseState = free.courseUnlockState;
    const paidRequest = request(walletState, courseState, 2);
    const paid = reduceAuthorizedCourseUnlock({ walletState, courseUnlockState: courseState, authorizedRequest: paidRequest, lookup: lookup() });
    if (paid.status !== "applied") throw new Error("expected_applied");
    const exactLookup = {
      currentAccountGeneration: generation,
      operationLedgerEntry: paid.operationLedgerEntry,
      subjectLedgerEntry: paid.subjectLedgerEntry,
    };
    const replay = reduceAuthorizedCourseUnlock({
      walletState: paid.walletState,
      courseUnlockState: paid.courseUnlockState,
      authorizedRequest: paidRequest,
      lookup: exactLookup,
    });
    expect(replay).toMatchObject({ status: "applied", changed: false, ledgerWriteRequired: false });

    const walletRepair = reduceAuthorizedCourseUnlock({
      walletState,
      courseUnlockState: paid.courseUnlockState,
      authorizedRequest: paidRequest,
      lookup: exactLookup,
    });
    expect(walletRepair).toMatchObject({ status: "applied", walletStateChanged: true, courseUnlockStateChanged: false });
    if (walletRepair.status !== "applied") throw new Error("expected_applied");
    expect(walletRepair.walletState).toEqual(paid.walletState);

    const courseRepair = reduceAuthorizedCourseUnlock({
      walletState: paid.walletState,
      courseUnlockState: courseState,
      authorizedRequest: paidRequest,
      lookup: exactLookup,
    });
    expect(courseRepair).toMatchObject({ status: "applied", walletStateChanged: false, courseUnlockStateChanged: true });
    if (courseRepair.status !== "applied") throw new Error("expected_applied");
    expect(courseRepair.courseUnlockState).toEqual(paid.courseUnlockState);

    expect(() => reduceAuthorizedCourseUnlock({
      walletState: paid.walletState,
      courseUnlockState: paid.courseUnlockState,
      authorizedRequest: request(paid.walletState, paid.courseUnlockState, 2, { operationId: "missing-ledger-alias" }),
      lookup: lookup(),
    })).toThrow("course_unlock_projection_indeterminate");
  });

  it("keeps historical replay stable and rejects forged compound receipt or canonical-key poisoning", () => {
    let walletState = walletWithBalance(300);
    let courseState = createCourseUnlockState({ accountScopeHash, courseId: "english-core", studyTarget: "en" });
    const results: Array<Extract<ReturnType<typeof reduceAuthorizedCourseUnlock>, { status: "applied" }>> = [];
    for (let ordinal = 1; ordinal <= 3; ordinal += 1) {
      const authorized = request(walletState, courseState, ordinal);
      const result = reduceAuthorizedCourseUnlock({ walletState, courseUnlockState: courseState, authorizedRequest: authorized, lookup: lookup() });
      if (result.status !== "applied") throw new Error("expected_applied");
      results.push(result);
      walletState = result.walletState;
      courseState = result.courseUnlockState;
    }
    const historicalRequest = results[1].appliedReceipt.authorizedRequest;
    const historical = reduceAuthorizedCourseUnlock({
      walletState,
      courseUnlockState: courseState,
      authorizedRequest: historicalRequest,
      lookup: {
        currentAccountGeneration: generation,
        operationLedgerEntry: results[1].operationLedgerEntry,
        subjectLedgerEntry: results[1].subjectLedgerEntry,
        repositoryVerifiedAncestry: ancestry(results[1].appliedReceipt, walletState, courseState),
      },
    });
    expect(historical).toMatchObject({ status: "applied", changed: false });
    expect(historical.walletState).toEqual(walletState);
    expect(historical.courseUnlockState).toEqual(courseState);

    expect(() => reduceAuthorizedCourseUnlock({
      walletState,
      courseUnlockState: courseState,
      authorizedRequest: historicalRequest,
      lookup: {
        currentAccountGeneration: generation,
        operationLedgerEntry: {
          ...results[1].operationLedgerEntry,
          appliedReceipt: {
            ...results[1].appliedReceipt,
            chargedSubunits: 1,
          },
        },
      },
    })).toThrow("course_unlock_ledger_invalid");

    const poisoned = request(walletState, courseState, 2, {
      operationId: historicalRequest.operationId,
      accountGeneration: generation + 1,
    });
    expect(() => reduceAuthorizedCourseUnlock({
      walletState,
      courseUnlockState: courseState,
      authorizedRequest: poisoned,
      lookup: {
        currentAccountGeneration: generation + 1,
        subjectLedgerEntry: results[1].subjectLedgerEntry,
      },
    })).toThrow("course_unlock_operation_conflict");
  });

  it("rejects mixed ancestry instead of repairing access over an alternate wallet branch", () => {
    let walletState = walletWithBalance(200);
    let courseState = createCourseUnlockState({ accountScopeHash, courseId: "english-core", studyTarget: "en" });
    const free = reduceAuthorizedCourseUnlock({ walletState, courseUnlockState: courseState, authorizedRequest: request(walletState, courseState, 1), lookup: lookup() });
    if (free.status !== "applied") throw new Error("expected_applied");
    walletState = free.walletState;
    courseState = free.courseUnlockState;
    const paidRequest = request(walletState, courseState, 2);
    const paid = reduceAuthorizedCourseUnlock({ walletState, courseUnlockState: courseState, authorizedRequest: paidRequest, lookup: lookup() });
    if (paid.status !== "applied") throw new Error("expected_applied");
    const exactLookup = { currentAccountGeneration: generation, operationLedgerEntry: paid.operationLedgerEntry, subjectLedgerEntry: paid.subjectLedgerEntry };
    const alternate1 = creditWalletState(walletState, WALLET_SUBUNITS_PER_STAR, "alternate-wallet-1");
    const alternate2 = creditWalletState(alternate1.state, WALLET_SUBUNITS_PER_STAR, "alternate-wallet-2");
    expect(alternate2.state.revision).toBeGreaterThan(paid.walletState.revision);
    expect(alternate2.state.spentSubunits).toBe(0);
    expect(() => reduceAuthorizedCourseUnlock({
      walletState: alternate2.state,
      courseUnlockState: paid.courseUnlockState,
      authorizedRequest: paidRequest,
      lookup: exactLookup,
    })).toThrow("course_unlock_projection_indeterminate");

    const third = reduceAuthorizedCourseUnlock({
      walletState: paid.walletState,
      courseUnlockState: paid.courseUnlockState,
      authorizedRequest: request(paid.walletState, paid.courseUnlockState, 3),
      lookup: lookup(),
    });
    if (third.status !== "applied") throw new Error("expected_applied");
    expect(() => reduceAuthorizedCourseUnlock({
      walletState,
      courseUnlockState: third.courseUnlockState,
      authorizedRequest: paidRequest,
      lookup: exactLookup,
    })).toThrow("course_unlock_projection_indeterminate");
    expect(() => reduceAuthorizedCourseUnlock({
      walletState: alternate2.state,
      courseUnlockState: third.courseUnlockState,
      authorizedRequest: paidRequest,
      lookup: exactLookup,
    })).toThrow("course_unlock_projection_indeterminate");

    const provenHistorical = reduceAuthorizedCourseUnlock({
      walletState: third.walletState,
      courseUnlockState: third.courseUnlockState,
      authorizedRequest: paidRequest,
      lookup: {
        ...exactLookup,
        repositoryVerifiedAncestry: ancestry(paid.appliedReceipt, third.walletState, third.courseUnlockState),
      },
    });
    expect(provenHistorical).toMatchObject({ status: "applied", changed: false });

    const validProof = ancestry(paid.appliedReceipt, third.walletState, third.courseUnlockState);
    const forgedProofs = [
      { ...validProof, canonicalAppliedReceiptFingerprint: hash("e") },
      { ...validProof, currentWalletStateFingerprint: hash("e") },
      { ...validProof, currentCourseStateFingerprint: hash("e") },
      { ...validProof, schemaVersion: "wrong-schema" },
      { ...validProof, proofSource: "client_claim" },
    ];
    for (const forgedProof of forgedProofs) {
      expect(() => reduceAuthorizedCourseUnlock({
        walletState: third.walletState,
        courseUnlockState: third.courseUnlockState,
        authorizedRequest: paidRequest,
        lookup: {
          ...exactLookup,
          repositoryVerifiedAncestry: forgedProof,
        },
      })).toThrow(
        forgedProof.schemaVersion === "wrong-schema" || forgedProof.proofSource === "client_claim"
          ? "course_unlock_ledger_invalid"
          : "course_unlock_projection_indeterminate",
      );
    }
  });

  it("rejects target provenance substitutions under the same entitlement subject", () => {
    const walletState = walletWithBalance(0);
    const courseState = createCourseUnlockState({ accountScopeHash, courseId: "english-core", studyTarget: "en" });
    const firstRequest = request(walletState, courseState, 1);
    const first = reduceAuthorizedCourseUnlock({ walletState, courseUnlockState: courseState, authorizedRequest: firstRequest, lookup: lookup() });
    if (first.status !== "applied") throw new Error("expected_applied");
    const variants = [
      { courseReleaseId: "release-2" },
      { sessionSetId: "session-set-2" },
      { sessionSetHash: hash("e") },
      { catalogFingerprint: hash("f") },
      { targetSessionId: "different-session" },
    ];
    for (const [index, variant] of variants.entries()) {
      const alias = request(first.walletState, first.courseUnlockState, 1, {
        operationId: `target-alias-${index}`,
        ...variant,
      });
      expect(() => reduceAuthorizedCourseUnlock({
        walletState: first.walletState,
        courseUnlockState: first.courseUnlockState,
        authorizedRequest: alias,
        lookup: { currentAccountGeneration: generation, subjectLedgerEntry: first.subjectLedgerEntry },
      })).toThrow("course_unlock_operation_conflict");
    }
  });

  it("normalizes every malformed nested receipt as ledger corruption", () => {
    const walletState = walletWithBalance(0);
    const courseState = createCourseUnlockState({ accountScopeHash, courseId: "english-core", studyTarget: "en" });
    const applied = reduceAuthorizedCourseUnlock({ walletState, courseUnlockState: courseState, authorizedRequest: request(walletState, courseState, 1), lookup: lookup() });
    if (applied.status !== "applied") throw new Error("expected_applied");
    expect(() => parseCourseUnlockAppliedReceipt({
      ...applied.appliedReceipt,
      authorizedRequest: { ...applied.appliedReceipt.authorizedRequest, accountGeneration: -1 },
    })).toThrow("course_unlock_ledger_invalid");
    expect(() => parseCourseUnlockAppliedReceipt({
      ...applied.appliedReceipt,
      walletStateAfter: { ...applied.appliedReceipt.walletStateAfter, balanceSubunits: -1 },
    })).toThrow("course_unlock_ledger_invalid");
    const { semanticFingerprint: _semantic, operationFingerprint: _operation, ...bodyOnly } = applied.appliedReceipt.authorizedRequest;
    expect(() => parseCourseUnlockAppliedReceipt({
      ...applied.appliedReceipt,
      authorizedRequest: bodyOnly,
    })).toThrow("course_unlock_ledger_invalid");
  });

  it("rebuilds an interleaved credit and compound-unlock journal exactly", () => {
    const wallet0 = createWalletState({ accountScopeHash });
    const course0 = createCourseUnlockState({ accountScopeHash, courseId: "english-core", studyTarget: "en" });
    const credit1 = creditWalletState(wallet0, 200 * WALLET_SUBUNITS_PER_STAR + 5_000, "audit-credit-1");
    const free = reduceAuthorizedCourseUnlock({ walletState: credit1.state, courseUnlockState: course0, authorizedRequest: request(credit1.state, course0, 1), lookup: lookup() });
    if (free.status !== "applied") throw new Error("expected_applied");
    const paid2 = reduceAuthorizedCourseUnlock({ walletState: free.walletState, courseUnlockState: free.courseUnlockState, authorizedRequest: request(free.walletState, free.courseUnlockState, 2), lookup: lookup() });
    if (paid2.status !== "applied") throw new Error("expected_applied");
    const credit2 = creditWalletState(paid2.walletState, 10 * WALLET_SUBUNITS_PER_STAR, "audit-credit-2");
    const paid3 = reduceAuthorizedCourseUnlock({ walletState: credit2.state, courseUnlockState: paid2.courseUnlockState, authorizedRequest: request(credit2.state, paid2.courseUnlockState, 3), lookup: lookup() });
    if (paid3.status !== "applied") throw new Error("expected_applied");

    let rebuiltWallet = rebuildWalletStateFromAppliedReceipts({
      startingState: wallet0,
      canonicalAppliedReceipts: [credit1.appliedReceipt],
    });
    let rebuiltCourse = course0;
    ({ walletState: rebuiltWallet, courseUnlockState: rebuiltCourse } = rebuildCourseUnlockStatesFromAppliedReceipt({
      startingWalletState: rebuiltWallet,
      startingCourseUnlockState: rebuiltCourse,
      appliedReceipt: free.appliedReceipt,
    }));
    ({ walletState: rebuiltWallet, courseUnlockState: rebuiltCourse } = rebuildCourseUnlockStatesFromAppliedReceipt({
      startingWalletState: rebuiltWallet,
      startingCourseUnlockState: rebuiltCourse,
      appliedReceipt: paid2.appliedReceipt,
    }));
    rebuiltWallet = rebuildWalletStateFromAppliedReceipts({
      startingState: rebuiltWallet,
      canonicalAppliedReceipts: [credit2.appliedReceipt],
    });
    ({ walletState: rebuiltWallet, courseUnlockState: rebuiltCourse } = rebuildCourseUnlockStatesFromAppliedReceipt({
      startingWalletState: rebuiltWallet,
      startingCourseUnlockState: rebuiltCourse,
      appliedReceipt: paid3.appliedReceipt,
    }));
    expect(rebuiltWallet).toEqual(paid3.walletState);
    expect(rebuiltCourse).toEqual(paid3.courseUnlockState);
    expect(rebuiltWallet.balanceSubunits).toBe(115 * WALLET_SUBUNITS_PER_STAR + 5_000);
    expect(rebuiltWallet.spentSubunits).toBe(95 * WALLET_SUBUNITS_PER_STAR);
  });

  it("rejects scope, study target, stale fingerprints, falsy ledgers and raw requests", () => {
    const walletState = walletWithBalance(100);
    const courseState = createCourseUnlockState({ accountScopeHash, courseId: "english-core", studyTarget: "en" });
    expect(() => reduceAuthorizedCourseUnlock({
      walletState,
      courseUnlockState: courseState,
      authorizedRequest: request(walletState, courseState, 1, { courseId: "other-core" }),
      lookup: lookup(),
    })).toThrow("course_unlock_scope_mismatch");
    expect(() => reduceAuthorizedCourseUnlock({
      walletState,
      courseUnlockState: courseState,
      authorizedRequest: request(walletState, courseState, 1, { studyTarget: "es" }),
      lookup: lookup(),
    })).toThrow("course_unlock_scope_mismatch");
    expect(() => reduceAuthorizedCourseUnlock({
      walletState,
      courseUnlockState: courseState,
      authorizedRequest: request(walletState, courseState, 1, { walletStateBeforeFingerprint: hash("e") }),
      lookup: lookup(),
    })).toThrow("course_unlock_request_out_of_order");
    expect(() => reduceAuthorizedCourseUnlock({
      walletState,
      courseUnlockState: courseState,
      authorizedRequest: request(walletState, courseState, 1, { courseRevisionBefore: 1 }),
      lookup: lookup(),
    })).toThrow("course_unlock_request_out_of_order");
    expect(() => reduceAuthorizedCourseUnlock({
      walletState,
      courseUnlockState: courseState,
      authorizedRequest: request(walletState, courseState, 1, { courseStateBeforeFingerprint: hash("e") }),
      lookup: lookup(),
    })).toThrow("course_unlock_request_out_of_order");

    const materialized = request(walletState, courseState, 1);
    const { semanticFingerprint: _semantic, operationFingerprint: _operation, ...rawBody } = materialized;
    expect(() => reduceAuthorizedCourseUnlock({
      walletState,
      courseUnlockState: courseState,
      authorizedRequest: rawBody,
      lookup: lookup(),
    })).toThrow("course_unlock_request_invalid");
    expect(() => reduceAuthorizedCourseUnlock({
      walletState,
      courseUnlockState: courseState,
      authorizedRequest: materialized,
      lookup: { currentAccountGeneration: generation, operationLedgerEntry: null },
    })).toThrow("course_unlock_ledger_invalid");
    for (const malformed of [null, false, 0, ""]) {
      expect(() => reduceAuthorizedCourseUnlock({
        walletState,
        courseUnlockState: courseState,
        authorizedRequest: materialized,
        lookup: { currentAccountGeneration: generation, repositoryVerifiedAncestry: malformed },
      })).toThrow("course_unlock_ledger_invalid");
    }
  });

  it("fails closed on hostile envelopes and deeply freezes compound outputs", () => {
    const walletState = walletWithBalance(0);
    const courseState = createCourseUnlockState({ accountScopeHash, courseId: "english-core", studyTarget: "en" });
    const authorizedRequest = request(walletState, courseState, 1);
    let getterCalled = false;
    const hostile = Object.defineProperty({ walletState, courseUnlockState: courseState, lookup: lookup() }, "authorizedRequest", {
      enumerable: true,
      get: () => {
        getterCalled = true;
        return authorizedRequest;
      },
    });
    expect(() => reduceAuthorizedCourseUnlock(hostile)).toThrow("course_unlock_input_invalid");
    expect(getterCalled).toBe(false);
    expect(() => reduceAuthorizedCourseUnlock({
      walletState,
      courseUnlockState: courseState,
      authorizedRequest,
      lookup: lookup(),
      [Symbol("hidden")]: true,
    })).toThrow("course_unlock_input_invalid");
    const applied = reduceAuthorizedCourseUnlock({ walletState, courseUnlockState: courseState, authorizedRequest, lookup: lookup() });
    if (applied.status !== "applied") throw new Error("expected_applied");
    expect(Object.isFrozen(applied)).toBe(true);
    expect(Object.isFrozen(applied.appliedReceipt)).toBe(true);
    expect(Object.isFrozen(applied.appliedReceipt.authorizedRequest.targetSessionRef)).toBe(true);
    expect(Object.isFrozen(applied.operationLedgerEntry)).toBe(true);
    expect(Object.isFrozen(applied.courseUnlockState)).toBe(true);
    expect(Object.keys(walletReducerExports).some((key) => /debit/i.test(key))).toBe(false);
  });

  it("supports ordinal 384, rejects 385 and exposes one shared-wallet CAS winner", () => {
    let walletState = walletWithBalance(30_000);
    let courseState = createCourseUnlockState({ accountScopeHash, courseId: "long-course", studyTarget: "en" });
    for (let ordinal = 1; ordinal <= 384; ordinal += 1) {
      const applied = reduceAuthorizedCourseUnlock({
        walletState,
        courseUnlockState: courseState,
        authorizedRequest: request(walletState, courseState, ordinal),
        lookup: lookup(),
      });
      if (applied.status !== "applied") throw new Error("expected_applied");
      walletState = applied.walletState;
      courseState = applied.courseUnlockState;
    }
    expect(courseState.highestUnlockedRequiredSessionOrdinal).toBe(384);
    expect(() => request(walletState, courseState, 385)).toThrow("course_unlock_request_invalid");

    const sharedWallet = walletWithBalance(90);
    const en0 = createCourseUnlockState({ accountScopeHash, courseId: "cas-en", studyTarget: "en" });
    const es0 = createCourseUnlockState({ accountScopeHash, courseId: "cas-es", studyTarget: "es" });
    const en1 = reduceAuthorizedCourseUnlock({ walletState: sharedWallet, courseUnlockState: en0, authorizedRequest: request(sharedWallet, en0, 1), lookup: lookup() });
    const es1 = reduceAuthorizedCourseUnlock({ walletState: sharedWallet, courseUnlockState: es0, authorizedRequest: request(sharedWallet, es0, 1), lookup: lookup() });
    if (en1.status !== "applied" || es1.status !== "applied") throw new Error("expected_applied");
    const enRequest = request(sharedWallet, en1.courseUnlockState, 2);
    const esRequest = request(sharedWallet, es1.courseUnlockState, 2);
    const enPaid = reduceAuthorizedCourseUnlock({ walletState: sharedWallet, courseUnlockState: en1.courseUnlockState, authorizedRequest: enRequest, lookup: lookup() });
    const esCompeting = reduceAuthorizedCourseUnlock({ walletState: sharedWallet, courseUnlockState: es1.courseUnlockState, authorizedRequest: esRequest, lookup: lookup() });
    if (enPaid.status !== "applied" || esCompeting.status !== "applied") throw new Error("expected_applied");
    expect(enPaid.expectedWalletRevision).toBe(esCompeting.expectedWalletRevision);
    expect(() => reduceAuthorizedCourseUnlock({
      walletState: enPaid.walletState,
      courseUnlockState: es1.courseUnlockState,
      authorizedRequest: esRequest,
      lookup: lookup(),
    })).toThrow("course_unlock_request_out_of_order");
  });
});
