import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";
import { projectRequiredSessionAwardDecision } from "../modules/learning-v2/progress/required_session_award_decision";

const hash = (label: string) => hashCanonicalBody({ label });
const settled = (runKindClaim: "initial" | "repeat", stars = 30) => {
  const body = {
    schemaVersion: "learning-v2-required-session-task-slots-settled-candidate.v1" as const,
    candidateAuthority: "untrusted_local" as const,
    accountScopeHash: "a".repeat(64),
    accountGeneration: 4,
    courseId: "english-core",
    studyTarget: "en",
    courseReleaseId: "release-1",
    sessionSetId: "session-set-2",
    sessionSetHash: hash("session-set"),
    catalogFingerprint: hash("catalog"),
    requiredSessionOrdinal: 1,
    sessionId: "session-1",
    sessionRunId: `run-${runKindClaim}-1`,
    runKindClaim,
    taskCandidateFingerprints: Array.from({ length: 12 }, (_, index) => hash(`task-${index}`)),
    projectedBasePerformanceStars: stars,
    projectedLearnerErrorCount: stars === 0 ? 0 : 1,
    projectedHintCount: 0,
    skipCount: stars === 0 ? 12 : 0,
    initialCreditSubjectFingerprint: hashCanonicalBody({
      schemaVersion: "learning-v2-initial-session-credit-subject.v1",
      accountScopeHash: "a".repeat(64),
      courseId: "english-core",
      studyTarget: "en",
      requiredSessionOrdinal: 1,
    }),
  };
  return { ...body, candidateFingerprint: hashCanonicalBody(body) };
};
const policy = {
  schemaVersion: "v2-optional-practice-reward-policy.v2" as const,
  key: "repeat-session-v1",
  version: 1,
  repeatBands: [
    { minimumPriorExactCompletions: 0, multiplierBasisPoints: 5000 },
    { minimumPriorExactCompletions: 2, multiplierBasisPoints: 2500 },
  ],
  dueBoostBasisPoints: 1000,
  mistakeRepairBoostBasisPoints: 1000,
};
const input = (candidate: ReturnType<typeof settled>, overrides: Record<string, unknown> = {}) => ({
  settledCandidate: candidate,
  initialCreditAlreadySettled: candidate.runKindClaim === "repeat",
  priorRepeatCompletions: candidate.runKindClaim === "repeat" ? 2 : 0,
  due: false,
  mistakeRepair: false,
  repeatRewardPolicy: policy,
  repeatRewardRemainderBasisPoints: 0,
  walletRevisionBefore: 7,
  ...overrides,
});

test("derives the first-session settlement without caller award or ids", () => {
  const decision = projectRequiredSessionAwardDecision(input(settled("initial", 30)));
  expect(decision).toMatchObject({
    decisionAuthority: "server_projection_candidate",
    completionKind: "initial",
    awardedStars: 30,
    initialSettlement: {
      settlement: {
        walletRevisionBefore: 7,
        authorizedOperation: { amountSubunits: 300000 },
      },
    },
    repeatRewardReceipt: null,
  });
  expect(Object.isFrozen(decision)).toBe(true);
});

test("derives a diminishing repeat receipt and keeps a zero run non-minting", () => {
  const repeat = projectRequiredSessionAwardDecision(input(settled("repeat", 28)));
  expect(repeat).toMatchObject({
    completionKind: "repeat",
    awardedStars: 7,
    initialSettlement: null,
    repeatRewardReceipt: { receipt: { amountSubunits: 70000, operationReason: "repeat_session" } },
  });
  const zero = projectRequiredSessionAwardDecision(input(settled("repeat", 0)));
  expect(zero).toMatchObject({ awardedStars: 0, repeatRewardReceipt: null });
});

test("carries fractional repeat value forward without rounding it away or up", () => {
  // 13 is the smallest non-skipped 12-task session with a fractional 25% reward.
  const first = projectRequiredSessionAwardDecision(input(settled("repeat", 13)));
  expect(first).toMatchObject({
    awardedStars: 3,
    repeatRewardRemainderBasisPointsBefore: 0,
    repeatRewardRemainderBasisPointsAfter: 2500,
    repeatRewardReceipt: { receipt: { amountSubunits: 30000 } },
  });
  const fourth = projectRequiredSessionAwardDecision(input(settled("repeat", 13), {
    repeatRewardRemainderBasisPoints: 7500,
  }));
  expect(fourth).toMatchObject({
    awardedStars: 4,
    repeatRewardRemainderBasisPointsAfter: 0,
    repeatRewardReceipt: { receipt: { amountSubunits: 40000 } },
  });
});

test("rejects a client run-kind claim that contradicts durable entitlement", () => {
  expect(() => projectRequiredSessionAwardDecision(input(settled("initial"), {
    initialCreditAlreadySettled: true,
    priorRepeatCompletions: 0,
  }))).toThrow("required_session_award_decision_conflict");
  expect(() => projectRequiredSessionAwardDecision(input(settled("repeat"), {
    initialCreditAlreadySettled: false,
    priorRepeatCompletions: 0,
  }))).toThrow("required_session_award_decision_conflict");
});

test("detaches hostile inputs before reading nested award fields", () => {
  const hostile = input(settled("initial")) as Record<string, unknown>;
  const getter = jest.fn(() => 999);
  Object.defineProperty(hostile, "walletRevisionBefore", { enumerable: true, get: getter });
  expect(() => projectRequiredSessionAwardDecision(hostile)).toThrow("required_session_award_decision_invalid");
  expect(getter).not.toHaveBeenCalled();
});
