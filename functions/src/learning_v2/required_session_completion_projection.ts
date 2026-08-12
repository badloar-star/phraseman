import { V2_ACTIVITY_FAMILIES, type V2ActivityFamily } from "../../../modules/learning-v2/contracts/activity";
import {
  projectRequiredTaskStars,
  sumRequiredSessionStars,
} from "../../../modules/learning-v2/contracts/course_economy";
import {
  parsePublishedRequiredSessionSet,
  type PublishedRequiredSessionSet,
} from "../../../modules/learning-v2/contracts/required_session_progress";
import { detachBoundedWalletJson } from "../../../modules/learning-v2/contracts/wallet";
import {
  parseRequiredSessionCompletionEnvelope,
  type RequiredSessionCompletionEnvelopeV3,
} from "../../../modules/learning-v2/progress/required_session_completion_envelope";
import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";

export interface ReconciledRequiredSessionTaskClaimV1 {
  readonly schemaVersion: "learning-v2-reconciled-required-session-task-claim.v1";
  readonly taskOrdinal: number;
  readonly taskId: string;
  readonly activityId: string;
  readonly family: V2ActivityFamily;
  readonly disposition: "completed" | "skipped";
  readonly claimAuthority: "untrusted_client_summary";
  readonly clientReportedAttempts: number;
  readonly clientReportedHintUsed: boolean;
  readonly provisionalStars: 0 | 1 | 2 | 3;
  readonly provisionalCountsAsLearnerError: boolean;
  readonly claimFingerprint: string;
}

/**
 * Catalog-bound client summary only. It is deliberately ineligible for wallet,
 * learning-evidence or voice authority until a separate server settlement
 * policy consumes the protected record and issues its own durable decision.
 */
export interface ReconciledRequiredSessionCompletionCandidateV1 {
  readonly schemaVersion: "learning-v2-reconciled-required-session-completion-candidate.v1";
  readonly candidateAuthority: "untrusted_client_completion";
  readonly catalogReconciliation: "server_publication_match";
  readonly economicAuthority: "none";
  readonly progressAccountScopeHash: string;
  readonly economicAccountScopeHash: string;
  readonly accountGeneration: number;
  readonly courseId: string;
  readonly studyTarget: string;
  readonly courseReleaseId: string;
  readonly episodeId: string;
  readonly sessionSetId: string;
  readonly sessionSetHash: string;
  readonly publicationFingerprint: string;
  readonly localSessionId: string;
  readonly canonicalSessionId: string;
  readonly requiredSessionOrdinal: number;
  readonly sessionRunId: string;
  readonly sessionFingerprint: string;
  readonly completionFingerprint: string;
  readonly taskClaims: readonly ReconciledRequiredSessionTaskClaimV1[];
  readonly provisionalBasePerformanceStars: number;
  readonly clientReportedLearnerErrorCount: number;
  readonly clientReportedHintCount: number;
  readonly skipCount: number;
  readonly initialCreditSubjectFingerprint: string;
  readonly candidateFingerprint: string;
}

export interface ReconciledRequiredSessionCompletionCandidateV2
  extends Omit<ReconciledRequiredSessionCompletionCandidateV1, "schemaVersion"> {
  readonly schemaVersion: "learning-v2-reconciled-required-session-completion-candidate.v2";
  readonly episodeOrdinal: number;
  /** One-based coordinate across all 32 episodes x 12 required sessions. */
  readonly courseRequiredSessionOrdinal: number;
}

export type ReconciledRequiredSessionCompletionCandidate =
  | ReconciledRequiredSessionCompletionCandidateV1
  | ReconciledRequiredSessionCompletionCandidateV2;

const INPUT_KEYS = ["payload", "publication", "economicAccountScopeHash"] as const;
const TASK_BODY_KEYS = [
  "schemaVersion", "taskOrdinal", "taskId", "activityId", "family",
  "disposition", "claimAuthority", "clientReportedAttempts",
  "clientReportedHintUsed", "provisionalStars",
  "provisionalCountsAsLearnerError",
] as const;
const TASK_KEYS = [...TASK_BODY_KEYS, "claimFingerprint"] as const;
const CANDIDATE_BODY_KEYS = [
  "schemaVersion", "candidateAuthority", "catalogReconciliation",
  "economicAuthority", "progressAccountScopeHash", "economicAccountScopeHash",
  "accountGeneration", "courseId", "studyTarget", "courseReleaseId",
  "episodeId", "sessionSetId", "sessionSetHash", "publicationFingerprint",
  "localSessionId", "canonicalSessionId", "requiredSessionOrdinal",
  "sessionRunId", "sessionFingerprint", "completionFingerprint", "taskClaims",
  "provisionalBasePerformanceStars", "clientReportedLearnerErrorCount",
  "clientReportedHintCount", "skipCount", "initialCreditSubjectFingerprint",
] as const;
const CANDIDATE_KEYS = [...CANDIDATE_BODY_KEYS, "candidateFingerprint"] as const;
const CANDIDATE_V2_BODY_KEYS = [
  ...CANDIDATE_BODY_KEYS,
  "episodeOrdinal",
  "courseRequiredSessionOrdinal",
] as const;
const CANDIDATE_V2_KEYS = [...CANDIDATE_V2_BODY_KEYS, "candidateFingerprint"] as const;
const HASH = /^[a-f0-9]{64}$/;
const ACCOUNT_HASH = /^[a-f0-9]{16,128}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const FAMILIES = new Set<string>(V2_ACTIVITY_FAMILIES);

const invalid = (): never => {
  throw new Error("required_session_completion_projection_invalid");
};
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean => {
  const own = Reflect.ownKeys(value);
  return own.length === keys.length && own.every((key) =>
    typeof key === "string" && keys.includes(key));
};
const detach = (input: unknown): Record<string, unknown> => {
  try {
    const value = detachBoundedWalletJson(
      input,
      "required_session_completion_projection_invalid",
    );
    if (!isRecord(value) || Object.getPrototypeOf(value) !== Object.prototype) return invalid();
    return value;
  } catch {
    return invalid();
  }
};
const readTopInput = (input: unknown): Record<string, unknown> => {
  if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype) return invalid();
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const own = Reflect.ownKeys(descriptors);
  if (own.length !== INPUT_KEYS.length || own.some((key) =>
    typeof key !== "string" || !INPUT_KEYS.includes(key as typeof INPUT_KEYS[number])) ||
    INPUT_KEYS.some((key) => {
      const descriptor = descriptors[key];
      return !descriptor || !("value" in descriptor) || !descriptor.enumerable;
    })) return invalid();
  return Object.fromEntries(INPUT_KEYS.map((key) => [key, descriptors[key].value]));
};
const deepFreeze = <T>(value: T): T => {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return value;
};
const safe = (value: unknown, minimum: number, maximum: number): value is number =>
  Number.isSafeInteger(value) && !Object.is(value, -0) &&
  Number(value) >= minimum && Number(value) <= maximum;
const id = (value: unknown): value is string => typeof value === "string" && ID.test(value);

const parseTaskClaim = (input: unknown): ReconciledRequiredSessionTaskClaimV1 => {
  const value = detach(input);
  if (!exactKeys(value, TASK_KEYS) ||
    value.schemaVersion !== "learning-v2-reconciled-required-session-task-claim.v1" ||
    !safe(value.taskOrdinal, 1, 12) || !id(value.taskId) || !id(value.activityId) ||
    typeof value.family !== "string" || !FAMILIES.has(value.family) ||
    (value.disposition !== "completed" && value.disposition !== "skipped") ||
    value.claimAuthority !== "untrusted_client_summary" ||
    !safe(value.clientReportedAttempts, value.disposition === "completed" ? 1 : 0, 99) ||
    typeof value.clientReportedHintUsed !== "boolean" ||
    !safe(value.provisionalStars, 0, 3) ||
    typeof value.provisionalCountsAsLearnerError !== "boolean" ||
    typeof value.claimFingerprint !== "string" || !HASH.test(value.claimFingerprint)) {
    return invalid();
  }
  const projection = projectRequiredTaskStars({
    disposition: value.disposition,
    learnerAttempts: Number(value.clientReportedAttempts),
    hintUsed: value.clientReportedHintUsed,
  });
  if (projection.stars !== value.provisionalStars ||
    projection.countsAsLearnerError !== value.provisionalCountsAsLearnerError) {
    return invalid();
  }
  const body = Object.fromEntries(TASK_BODY_KEYS.map((key) => [key, value[key]]));
  if (hashCanonicalBody(body) !== value.claimFingerprint) return invalid();
  const parsed = {
    ...body,
    claimFingerprint: value.claimFingerprint,
  } as unknown as ReconciledRequiredSessionTaskClaimV1;
  return deepFreeze(parsed);
};

const assertPublicationBindings = (
  payload: RequiredSessionCompletionEnvelopeV3,
  publication: PublishedRequiredSessionSet,
): void => {
  const session = publication.sessionSet.sessions[payload.requiredSessionOrdinal - 1];
  if (payload.seasonId !== "learning-v2" ||
    payload.studyTarget !== publication.studyTarget ||
    payload.episodeId !== publication.sessionSet.episodeId ||
    payload.sessionSetId !== publication.sessionSetId ||
    payload.sessionSetHash !== publication.sessionSetHash || !session ||
    payload.canonicalSessionId !== session.sessionId ||
    payload.sessionFingerprint !== hashCanonicalBody(session)) return invalid();
};

export const materializeReconciledRequiredSessionCompletionCandidate = (
  input: unknown,
): ReconciledRequiredSessionCompletionCandidate => {
  const request = readTopInput(input);
  if (typeof request.economicAccountScopeHash !== "string" ||
    !ACCOUNT_HASH.test(request.economicAccountScopeHash)) return invalid();
  let payload: RequiredSessionCompletionEnvelopeV3;
  let publication: PublishedRequiredSessionSet;
  try {
    payload = parseRequiredSessionCompletionEnvelope(request.payload);
    publication = parsePublishedRequiredSessionSet(request.publication);
    assertPublicationBindings(payload, publication);
  } catch {
    return invalid();
  }
  const session = publication.sessionSet.sessions[payload.requiredSessionOrdinal - 1];
  if (!session || session.cards.length !== payload.taskCompletions.length) return invalid();
  const taskClaims = payload.taskCompletions.map((completion, index) => {
    const card = session.cards[index];
    if (!card || completion.taskOrdinal !== index + 1 || completion.taskId !== card.cardId ||
      completion.activityId !== card.activityId || completion.family !== card.family) return invalid();
    const projection = projectRequiredTaskStars({
      disposition: completion.disposition,
      learnerAttempts: completion.learnerAttempts,
      hintUsed: completion.hintUsed,
    });
    const body = {
      schemaVersion: "learning-v2-reconciled-required-session-task-claim.v1" as const,
      taskOrdinal: completion.taskOrdinal,
      taskId: completion.taskId,
      activityId: completion.activityId,
      family: completion.family,
      disposition: completion.disposition,
      claimAuthority: "untrusted_client_summary" as const,
      clientReportedAttempts: completion.learnerAttempts,
      clientReportedHintUsed: completion.hintUsed,
      provisionalStars: projection.stars,
      provisionalCountsAsLearnerError: projection.countsAsLearnerError,
    };
    return parseTaskClaim({ ...body, claimFingerprint: hashCanonicalBody(body) });
  });
  const commonBody = {
    candidateAuthority: "untrusted_client_completion" as const,
    catalogReconciliation: "server_publication_match" as const,
    economicAuthority: "none" as const,
    progressAccountScopeHash: payload.accountScopeHash,
    economicAccountScopeHash: request.economicAccountScopeHash,
    accountGeneration: payload.accountGeneration,
    courseId: publication.courseId,
    studyTarget: publication.studyTarget,
    courseReleaseId: publication.courseReleaseId,
    episodeId: payload.episodeId,
    sessionSetId: payload.sessionSetId,
    sessionSetHash: payload.sessionSetHash,
    publicationFingerprint: publication.publicationFingerprint,
    localSessionId: payload.localSessionId,
    canonicalSessionId: payload.canonicalSessionId,
    requiredSessionOrdinal: payload.requiredSessionOrdinal,
    sessionRunId: payload.sessionRunId,
    sessionFingerprint: payload.sessionFingerprint,
    completionFingerprint: payload.completionFingerprint,
    taskClaims: Object.freeze(taskClaims),
    provisionalBasePerformanceStars: sumRequiredSessionStars(
      taskClaims.map((claim) => claim.provisionalStars),
    ),
    clientReportedLearnerErrorCount: taskClaims.filter((claim) =>
      claim.provisionalCountsAsLearnerError).length,
    clientReportedHintCount: taskClaims.filter((claim) =>
      claim.clientReportedHintUsed).length,
    skipCount: taskClaims.filter((claim) => claim.disposition === "skipped").length,
    initialCreditSubjectFingerprint: publication.schemaVersion ===
      "learning-v2-published-required-session-set.v2"
      ? hashCanonicalBody({
          schemaVersion: "learning-v2-initial-session-credit-subject.v2",
          accountScopeHash: request.economicAccountScopeHash,
          courseId: publication.courseId,
          studyTarget: publication.studyTarget,
          episodeId: payload.episodeId,
          episodeOrdinal: publication.episodeOrdinal,
          courseRequiredSessionOrdinal:
            (publication.episodeOrdinal - 1) * 12 + payload.requiredSessionOrdinal,
        })
      : hashCanonicalBody({
          schemaVersion: "learning-v2-initial-session-credit-subject.v1",
          accountScopeHash: request.economicAccountScopeHash,
          courseId: publication.courseId,
          studyTarget: publication.studyTarget,
          requiredSessionOrdinal: payload.requiredSessionOrdinal,
        }),
  };
  const body = publication.schemaVersion === "learning-v2-published-required-session-set.v2"
    ? {
        schemaVersion: "learning-v2-reconciled-required-session-completion-candidate.v2" as const,
        ...commonBody,
        episodeOrdinal: publication.episodeOrdinal,
        courseRequiredSessionOrdinal:
          (publication.episodeOrdinal - 1) * 12 + payload.requiredSessionOrdinal,
      }
    : {
        schemaVersion: "learning-v2-reconciled-required-session-completion-candidate.v1" as const,
        ...commonBody,
      };
  return deepFreeze({ ...body, candidateFingerprint: hashCanonicalBody(body) });
};

export const parseReconciledRequiredSessionCompletionCandidate = (
  input: unknown,
): ReconciledRequiredSessionCompletionCandidate => {
  const value = detach(input);
  const isV2 = value.schemaVersion ===
    "learning-v2-reconciled-required-session-completion-candidate.v2";
  if (!exactKeys(value, isV2 ? CANDIDATE_V2_KEYS : CANDIDATE_KEYS) ||
    (!isV2 &&
      value.schemaVersion !== "learning-v2-reconciled-required-session-completion-candidate.v1") ||
    value.candidateAuthority !== "untrusted_client_completion" ||
    value.catalogReconciliation !== "server_publication_match" ||
    value.economicAuthority !== "none" ||
    typeof value.progressAccountScopeHash !== "string" ||
    !ACCOUNT_HASH.test(value.progressAccountScopeHash) ||
    typeof value.economicAccountScopeHash !== "string" ||
    !ACCOUNT_HASH.test(value.economicAccountScopeHash) ||
    !safe(value.accountGeneration, 0, Number.MAX_SAFE_INTEGER) ||
    ![value.courseId, value.studyTarget, value.courseReleaseId, value.episodeId,
      value.sessionSetId, value.localSessionId, value.canonicalSessionId,
      value.sessionRunId].every(id) ||
    typeof value.sessionSetHash !== "string" || !HASH.test(value.sessionSetHash) ||
    typeof value.publicationFingerprint !== "string" || !HASH.test(value.publicationFingerprint) ||
    !safe(value.requiredSessionOrdinal, 1, 384) ||
    typeof value.sessionFingerprint !== "string" || !HASH.test(value.sessionFingerprint) ||
    typeof value.completionFingerprint !== "string" || !HASH.test(value.completionFingerprint) ||
    !Array.isArray(value.taskClaims) || value.taskClaims.length !== 12 ||
    !safe(value.provisionalBasePerformanceStars, 0, 36) ||
    !safe(value.clientReportedLearnerErrorCount, 0, 12) ||
    !safe(value.clientReportedHintCount, 0, 12) ||
    !safe(value.skipCount, 0, 12) ||
    (isV2 && (!safe(value.episodeOrdinal, 1, 32) ||
      !safe(value.courseRequiredSessionOrdinal, 1, 384) ||
      Number(value.courseRequiredSessionOrdinal) !==
        (Number(value.episodeOrdinal) - 1) * 12 + Number(value.requiredSessionOrdinal))) ||
    typeof value.initialCreditSubjectFingerprint !== "string" ||
    !HASH.test(value.initialCreditSubjectFingerprint) ||
    typeof value.candidateFingerprint !== "string" || !HASH.test(value.candidateFingerprint)) {
    return invalid();
  }
  const taskClaims = value.taskClaims.map(parseTaskClaim);
  if (taskClaims.some((task, index) => task.taskOrdinal !== index + 1) ||
    new Set(taskClaims.map((task) => task.taskId)).size !== 12 ||
    sumRequiredSessionStars(taskClaims.map((task) => task.provisionalStars)) !==
      value.provisionalBasePerformanceStars ||
    taskClaims.filter((task) => task.provisionalCountsAsLearnerError).length !==
      value.clientReportedLearnerErrorCount ||
    taskClaims.filter((task) => task.clientReportedHintUsed).length !==
      value.clientReportedHintCount ||
    taskClaims.filter((task) => task.disposition === "skipped").length !== value.skipCount) {
    return invalid();
  }
  const expectedInitialSubjectFingerprint = isV2
    ? hashCanonicalBody({
        schemaVersion: "learning-v2-initial-session-credit-subject.v2",
        accountScopeHash: value.economicAccountScopeHash,
        courseId: value.courseId,
        studyTarget: value.studyTarget,
        episodeId: value.episodeId,
        episodeOrdinal: value.episodeOrdinal,
        courseRequiredSessionOrdinal: value.courseRequiredSessionOrdinal,
      })
    : hashCanonicalBody({
        schemaVersion: "learning-v2-initial-session-credit-subject.v1",
        accountScopeHash: value.economicAccountScopeHash,
        courseId: value.courseId,
        studyTarget: value.studyTarget,
        requiredSessionOrdinal: value.requiredSessionOrdinal,
      });
  if (expectedInitialSubjectFingerprint !== value.initialCreditSubjectFingerprint) return invalid();
  const body = {
    ...Object.fromEntries((isV2 ? CANDIDATE_V2_BODY_KEYS : CANDIDATE_BODY_KEYS)
      .map((key) => [key, value[key]])),
    taskClaims: Object.freeze(taskClaims),
  };
  if (hashCanonicalBody(body) !== value.candidateFingerprint) return invalid();
  const parsed = {
    ...body,
    candidateFingerprint: value.candidateFingerprint,
  } as unknown as ReconciledRequiredSessionCompletionCandidate;
  return deepFreeze(parsed);
};
