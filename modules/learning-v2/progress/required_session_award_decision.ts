import { WALLET_SUBUNITS_PER_STAR, detachBoundedWalletJson } from "../contracts/wallet";
import {
  projectOptionalPracticeRewardWithRemainder,
  validateOptionalPracticeRewardPolicyV2,
  type V2OptionalPracticeRewardPolicyV2,
} from "./optional_practice_reward";
import {
  materializeRequiredSessionCreditSettlementCandidate,
  type RequiredSessionCreditSettlementMaterializationV1,
} from "./required_session_credit_settlement";
import {
  parseRequiredSessionTaskSlotsSettledCandidate,
  type RequiredSessionTaskSlotsSettledCandidateV1,
} from "./required_session_reducer";
import {
  materializeServerWalletRewardReceiptCandidate,
  type ServerWalletRewardReceiptMaterializationV1,
} from "./server_wallet_reward_receipt";

export type RequiredSessionAwardDecisionV1 =
  | Readonly<{
      schemaVersion: "learning-v2-required-session-award-decision.v1";
      decisionAuthority: "server_projection_candidate";
      completionKind: "initial";
      settledCandidate: RequiredSessionTaskSlotsSettledCandidateV1;
      awardedStars: number;
      repeatRewardRemainderBasisPointsBefore: number;
      repeatRewardRemainderBasisPointsAfter: number;
      initialSettlement: RequiredSessionCreditSettlementMaterializationV1;
      repeatRewardReceipt: null;
    }>
  | Readonly<{
      schemaVersion: "learning-v2-required-session-award-decision.v1";
      decisionAuthority: "server_projection_candidate";
      completionKind: "repeat";
      settledCandidate: RequiredSessionTaskSlotsSettledCandidateV1;
      awardedStars: number;
      repeatRewardRemainderBasisPointsBefore: number;
      repeatRewardRemainderBasisPointsAfter: number;
      initialSettlement: null;
      repeatRewardReceipt: ServerWalletRewardReceiptMaterializationV1 | null;
    }>;

const INPUT_KEYS = [
  "settledCandidate",
  "initialCreditAlreadySettled",
  "priorRepeatCompletions",
  "due",
  "mistakeRepair",
  "repeatRewardPolicy",
  "repeatRewardRemainderBasisPoints",
  "walletRevisionBefore",
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>): boolean => {
  const own = Reflect.ownKeys(value);
  return own.length === INPUT_KEYS.length && own.every((key) =>
    typeof key === "string" && INPUT_KEYS.includes(key as typeof INPUT_KEYS[number]));
};
const freeze = <T>(value: T): Readonly<T> => {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) freeze(child);
  }
  return value;
};
const safe = (value: unknown): value is number =>
  Number.isSafeInteger(value) && !Object.is(value, -0) && Number(value) >= 0;

/**
 * Pure server-side decision projection. Durable entitlement/repeat counters
 * must be transactionally read by the repository before calling it. The
 * returned bytes remain candidates until protected storage + wallet CAS.
 */
export const projectRequiredSessionAwardDecision = (
  input: unknown,
): RequiredSessionAwardDecisionV1 => {
  let detached: unknown;
  try {
    detached = detachBoundedWalletJson(input, "required_session_award_decision_invalid");
  } catch {
    throw new Error("required_session_award_decision_invalid");
  }
  if (!isRecord(detached) || !exactKeys(detached) ||
    typeof detached.initialCreditAlreadySettled !== "boolean" ||
    !safe(detached.priorRepeatCompletions) ||
    typeof detached.due !== "boolean" ||
    typeof detached.mistakeRepair !== "boolean" ||
    !safe(detached.repeatRewardRemainderBasisPoints) ||
    Number(detached.repeatRewardRemainderBasisPoints) >= 10_000 ||
    !safe(detached.walletRevisionBefore)) {
    throw new Error("required_session_award_decision_invalid");
  }
  let settledCandidate: RequiredSessionTaskSlotsSettledCandidateV1;
  try {
    settledCandidate = parseRequiredSessionTaskSlotsSettledCandidate(
      detached.settledCandidate,
    );
  } catch {
    throw new Error("required_session_award_decision_invalid");
  }
  if (!validateOptionalPracticeRewardPolicyV2(detached.repeatRewardPolicy)) {
    throw new Error("required_session_award_decision_invalid");
  }

  const key = settledCandidate.candidateFingerprint.slice(0, 48);
  if (!detached.initialCreditAlreadySettled) {
    if (settledCandidate.runKindClaim !== "initial" ||
      Number(detached.priorRepeatCompletions) !== 0) {
      throw new Error("required_session_award_decision_conflict");
    }
    const initialSettlement = materializeRequiredSessionCreditSettlementCandidate({
      settlementId: `required-session-initial-${key}`,
      operationId: `wallet-required-session-initial-${key}`,
      walletRevisionBefore: detached.walletRevisionBefore,
      settledCandidate,
    });
    return freeze({
      schemaVersion: "learning-v2-required-session-award-decision.v1" as const,
      decisionAuthority: "server_projection_candidate" as const,
      completionKind: "initial" as const,
      settledCandidate,
      awardedStars: settledCandidate.projectedBasePerformanceStars,
      repeatRewardRemainderBasisPointsBefore: Number(detached.repeatRewardRemainderBasisPoints),
      repeatRewardRemainderBasisPointsAfter: Number(detached.repeatRewardRemainderBasisPoints),
      initialSettlement,
      repeatRewardReceipt: null,
    });
  }

  if (settledCandidate.runKindClaim !== "repeat") {
    throw new Error("required_session_award_decision_conflict");
  }
  const repeatProjection = projectOptionalPracticeRewardWithRemainder({
    baseStars: settledCandidate.projectedBasePerformanceStars,
    priorExactCompletions: Number(detached.priorRepeatCompletions),
    due: detached.due,
    mistakeRepair: detached.mistakeRepair,
    carryRemainderBasisPoints: Number(detached.repeatRewardRemainderBasisPoints),
  }, detached.repeatRewardPolicy as V2OptionalPracticeRewardPolicyV2);
  const awardedStars = repeatProjection.awardedStars;
  const amountSubunits = awardedStars * WALLET_SUBUNITS_PER_STAR;
  if (!Number.isSafeInteger(amountSubunits)) {
    throw new Error("required_session_award_decision_invalid");
  }
  const repeatRewardReceipt = awardedStars === 0 ? null
    : materializeServerWalletRewardReceiptCandidate({
        rewardId: `required-session-repeat-${key}`,
        operationId: `wallet-required-session-repeat-${key}`,
        accountScopeHash: settledCandidate.accountScopeHash,
        accountGeneration: settledCandidate.accountGeneration,
        amountSubunits,
        operationReason: "repeat_session",
        origin: {
          kind: "course",
          courseId: settledCandidate.courseId,
          studyTarget: settledCandidate.studyTarget,
          requiredSessionOrdinal: settledCandidate.requiredSessionOrdinal,
        },
      });
  return freeze({
    schemaVersion: "learning-v2-required-session-award-decision.v1" as const,
    decisionAuthority: "server_projection_candidate" as const,
    completionKind: "repeat" as const,
    settledCandidate,
    awardedStars,
    repeatRewardRemainderBasisPointsBefore: Number(detached.repeatRewardRemainderBasisPoints),
    repeatRewardRemainderBasisPointsAfter: repeatProjection.nextCarryRemainderBasisPoints,
    initialSettlement: null,
    repeatRewardReceipt,
  });
};
