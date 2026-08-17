import * as admin from "firebase-admin";
import type { Firestore } from "firebase-admin/firestore";
import { CallableRequest, HttpsError, onCall } from "firebase-functions/v2/https";
import {
  parsePublishedRequiredSessionSet,
  type PublishedRequiredSessionSet,
} from "../../../modules/learning-v2/contracts/required_session_progress";
import { detachBoundedWalletJson } from "../../../modules/learning-v2/contracts/wallet";
import {
  materializeServerWalletRewardRequest,
  parseServerWalletRewardRequest,
  type ServerWalletRewardRequestV1,
} from "../../../modules/learning-v2/progress/server_wallet_reward_receipt";
import { deriveLearningV2EconomicAccountScopeHash } from "../../../modules/learning-v2/progress/economic_account_scope";
import {
  parseRequiredSessionCompletionEnvelope,
  requiredSessionCompletionMutationId,
  type RequiredSessionCompletionEnvelopeV3,
} from "../../../modules/learning-v2/progress/required_session_completion_envelope";
import { progressOutboxPayloadFingerprint } from "../../../modules/learning-v2/progress/progress_outbox";
import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../../modules/learning-v2/policies/decision_registry";
import { publishedRequiredSessionSetDocumentId } from "../content_factory/v2_required_session_publication";
import {
  materializeReconciledRequiredSessionCompletionCandidate,
  parseReconciledRequiredSessionCompletionCandidate,
  type ReconciledRequiredSessionCompletionCandidate,
} from "./required_session_completion_projection";
import { deriveProgressAccountScopeHash } from "./progress_event";
import {
  createProgressEventAuthorization,
  normalizeProgressAuthUid,
  normalizeProgressStableUid,
  type ProgressEventAuthorization,
} from "./progress_event_callable";
import {
  parseRequiredSessionCourseAwardState,
  parseRequiredSessionPerformanceAwardState,
  projectRequiredSessionPerformanceAward,
} from "./required_session_performance_award";
import {
  V2_WALLET_REWARD_RECEIPTS_SUBCOLLECTION,
  materializeProtectedLearningV2WalletRewardReceipt,
  parseProtectedLearningV2WalletRewardReceipt,
} from "../coin_exchange_wallet_reward";

interface CompletionSubmitRequestV3 {
  readonly mutationId: string;
  readonly payloadFingerprint: string;
  readonly payload: RequiredSessionCompletionEnvelopeV3;
}

export interface RequiredSessionCompletionInboxRecordV1 {
  readonly schemaVersion: "learning-v2-required-session-completion-inbox.v1";
  readonly accountStableUid: string;
  readonly accountGeneration: number;
  readonly progressAccountScopeHash: string;
  readonly economicAccountScopeHash: string;
  readonly mutationId: string;
  readonly payloadFingerprint: string;
  readonly publicationFingerprint: string;
  readonly completionFingerprint: string;
  readonly sessionRunId: string;
  readonly completionEnvelope: RequiredSessionCompletionEnvelopeV3;
  readonly reconciledCandidate: ReconciledRequiredSessionCompletionCandidate;
  readonly recordFingerprint: string;
}

export interface RequiredSessionCompletionInboxStore {
  putIfAbsent(input: {
    readonly authUid: string;
    readonly stableUid: string;
    readonly accountGeneration: number;
    readonly record: RequiredSessionCompletionInboxRecordV1;
  }): Promise<{
    readonly status: "created" | "existing";
    readonly recordFingerprint: string;
    readonly walletRewardRequest: ServerWalletRewardRequestV1 | null;
  }>;
}

export interface RequiredSessionCompletionCallableDependencies {
  readonly readPublication: (documentId: string) => Promise<unknown | undefined>;
  readonly inboxStore: RequiredSessionCompletionInboxStore;
}

const REQUEST_KEYS = ["mutationId", "payloadFingerprint", "payload"] as const;
const RECORD_BODY_KEYS = [
  "schemaVersion", "accountStableUid", "accountGeneration",
  "progressAccountScopeHash", "economicAccountScopeHash", "mutationId",
  "payloadFingerprint", "publicationFingerprint", "completionFingerprint",
  "sessionRunId", "completionEnvelope", "reconciledCandidate",
] as const;
const RECORD_KEYS = [...RECORD_BODY_KEYS, "recordFingerprint"] as const;
const AWARD_DECISION_BODY_KEYS = [
  "schemaVersion", "completionRecordFingerprint", "candidateFingerprint",
  "completionKind", "awardedSubunits", "walletRewardRequest",
] as const;
const AWARD_DECISION_KEYS = [...AWARD_DECISION_BODY_KEYS, "decisionFingerprint"] as const;
const HASH = /^[a-f0-9]{64}$/;
const MUTATION_ID = /^[A-Za-z0-9._:-]{1,160}$/;
const STABLE_UID = /^[A-Za-z0-9._-]{1,160}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean => {
  const own = Reflect.ownKeys(value);
  return own.length === keys.length && own.every((key) =>
    typeof key === "string" && keys.includes(key));
};
const detach = (input: unknown, code: string): Record<string, unknown> => {
  try {
    const value = detachBoundedWalletJson(input, code);
    if (!isRecord(value) || Object.getPrototypeOf(value) !== Object.prototype) throw new Error(code);
    return value;
  } catch {
    throw new Error(code);
  }
};
const deepFreeze = <T>(value: T): T => {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return value;
};

interface RequiredSessionPerformanceAwardDecisionRecordV2 {
  readonly schemaVersion: "learning-v2-required-session-performance-award-decision.v2";
  readonly completionRecordFingerprint: string;
  readonly candidateFingerprint: string;
  readonly completionKind: "legacy_deferred" | "initial" | "repeat";
  readonly awardedSubunits: number;
  readonly walletRewardRequest: ServerWalletRewardRequestV1 | null;
  readonly decisionFingerprint: string;
}

const materializeAwardDecision = (input: {
  readonly completionRecordFingerprint: string;
  readonly candidateFingerprint: string;
  readonly completionKind: "legacy_deferred" | "initial" | "repeat";
  readonly awardedSubunits: number;
  readonly walletRewardRequest: ServerWalletRewardRequestV1 | null;
}): RequiredSessionPerformanceAwardDecisionRecordV2 => {
  if (!HASH.test(input.completionRecordFingerprint) ||
    !HASH.test(input.candidateFingerprint) ||
    !["legacy_deferred", "initial", "repeat"].includes(input.completionKind) ||
    !Number.isSafeInteger(input.awardedSubunits) || input.awardedSubunits < 0 ||
    input.awardedSubunits > 36 * 10_000) {
    throw new Error("required_session_performance_award_decision_invalid");
  }
  const walletRewardRequest = input.walletRewardRequest === null
    ? null
    : parseServerWalletRewardRequest(input.walletRewardRequest);
  if ((input.awardedSubunits === 0) !== (walletRewardRequest === null)) {
    throw new Error("required_session_performance_award_decision_invalid");
  }
  const body = {
    schemaVersion: "learning-v2-required-session-performance-award-decision.v2" as const,
    completionRecordFingerprint: input.completionRecordFingerprint,
    candidateFingerprint: input.candidateFingerprint,
    completionKind: input.completionKind,
    awardedSubunits: input.awardedSubunits,
    walletRewardRequest,
  };
  return deepFreeze({ ...body, decisionFingerprint: hashCanonicalBody(body) });
};

const parseAwardDecision = (
  input: unknown,
): RequiredSessionPerformanceAwardDecisionRecordV2 => {
  const value = detach(input, "required_session_performance_award_decision_indeterminate");
  if (!exactKeys(value, AWARD_DECISION_KEYS) ||
    value.schemaVersion !== "learning-v2-required-session-performance-award-decision.v2" ||
    typeof value.completionRecordFingerprint !== "string" ||
      !HASH.test(value.completionRecordFingerprint) ||
    typeof value.candidateFingerprint !== "string" || !HASH.test(value.candidateFingerprint) ||
    (value.completionKind !== "legacy_deferred" && value.completionKind !== "initial" &&
      value.completionKind !== "repeat") ||
    !Number.isSafeInteger(value.awardedSubunits) || Number(value.awardedSubunits) < 0 ||
      Number(value.awardedSubunits) > 36 * 10_000 ||
    typeof value.decisionFingerprint !== "string" || !HASH.test(value.decisionFingerprint)) {
    throw new Error("required_session_performance_award_decision_indeterminate");
  }
  let rebuilt: RequiredSessionPerformanceAwardDecisionRecordV2;
  try {
    rebuilt = materializeAwardDecision({
      completionRecordFingerprint: value.completionRecordFingerprint,
      candidateFingerprint: value.candidateFingerprint,
      completionKind: value.completionKind,
      awardedSubunits: Number(value.awardedSubunits),
      walletRewardRequest: value.walletRewardRequest as ServerWalletRewardRequestV1 | null,
    });
  } catch {
    throw new Error("required_session_performance_award_decision_indeterminate");
  }
  if (canonicalJsonV1(rebuilt) !== canonicalJsonV1(value)) {
    throw new Error("required_session_performance_award_decision_indeterminate");
  }
  return rebuilt;
};

export const parseRequiredSessionCompletionSubmitRequest = (
  input: unknown,
): CompletionSubmitRequestV3 => {
  const value = detach(input, "required_session_completion_submit_invalid");
  if (!exactKeys(value, REQUEST_KEYS) || typeof value.mutationId !== "string" ||
    !MUTATION_ID.test(value.mutationId) || typeof value.payloadFingerprint !== "string" ||
    !HASH.test(value.payloadFingerprint)) {
    throw new Error("required_session_completion_submit_invalid");
  }
  const payload = parseRequiredSessionCompletionEnvelope(value.payload);
  if (requiredSessionCompletionMutationId(payload) !== value.mutationId ||
    progressOutboxPayloadFingerprint(payload) !== value.payloadFingerprint) {
    throw new Error("required_session_completion_submit_mismatch");
  }
  return deepFreeze({
    mutationId: value.mutationId,
    payloadFingerprint: value.payloadFingerprint,
    payload,
  });
};

const assertPublicationMatchesCompletion = (
  publication: PublishedRequiredSessionSet,
  payload: RequiredSessionCompletionEnvelopeV3,
): void => {
  const session = publication.sessionSet.sessions[payload.requiredSessionOrdinal - 1];
  if (payload.seasonId !== "learning-v2" ||
    publication.studyTarget !== payload.studyTarget ||
    publication.sessionSetId !== payload.sessionSetId ||
    publication.sessionSetHash !== payload.sessionSetHash ||
    publication.sessionSet.episodeId !== payload.episodeId || !session ||
    session.sessionId !== payload.canonicalSessionId ||
    hashCanonicalBody(session) !== payload.sessionFingerprint ||
    session.cards.length !== payload.taskCompletions.length) {
    throw new Error("required_session_completion_publication_mismatch");
  }
  for (let index = 0; index < session.cards.length; index += 1) {
    const card = session.cards[index];
    const completion = payload.taskCompletions[index];
    if (completion.taskOrdinal !== index + 1 || completion.taskId !== card.cardId ||
      completion.activityId !== card.activityId || completion.family !== card.family) {
      throw new Error("required_session_completion_publication_mismatch");
    }
  }
};

const materializeRecord = (input: {
  readonly stableUid: string;
  readonly accountGeneration: number;
  readonly request: CompletionSubmitRequestV3;
  readonly publication: PublishedRequiredSessionSet;
  readonly reconciledCandidate: ReconciledRequiredSessionCompletionCandidate;
}): RequiredSessionCompletionInboxRecordV1 => {
  const progressAccountScopeHash = deriveProgressAccountScopeHash(
    input.stableUid,
    input.accountGeneration,
  );
  const economicAccountScopeHash = deriveLearningV2EconomicAccountScopeHash(input.stableUid);
  const body = {
    schemaVersion: "learning-v2-required-session-completion-inbox.v1" as const,
    accountStableUid: input.stableUid,
    accountGeneration: input.accountGeneration,
    progressAccountScopeHash,
    economicAccountScopeHash,
    mutationId: input.request.mutationId,
    payloadFingerprint: input.request.payloadFingerprint,
    publicationFingerprint: input.publication.publicationFingerprint,
    completionFingerprint: input.request.payload.completionFingerprint,
    sessionRunId: input.request.payload.sessionRunId,
    completionEnvelope: input.request.payload,
    reconciledCandidate: input.reconciledCandidate,
  };
  return deepFreeze({ ...body, recordFingerprint: hashCanonicalBody(body) });
};

/**
 * Structural storage parser only. Self-hashes do not prove that the referenced
 * server publication exists. Settlement code must call the publication-bound
 * verifier below before treating any catalog or course coordinate as trusted.
 */
export const parseStructuralRequiredSessionCompletionInboxRecord = (
  input: unknown,
): RequiredSessionCompletionInboxRecordV1 => {
  const value = detach(input, "required_session_completion_inbox_indeterminate");
  if (!exactKeys(value, RECORD_KEYS) ||
    value.schemaVersion !== "learning-v2-required-session-completion-inbox.v1" ||
    typeof value.accountStableUid !== "string" || !STABLE_UID.test(value.accountStableUid) ||
    !Number.isSafeInteger(value.accountGeneration) || Number(value.accountGeneration) < 1 ||
    typeof value.progressAccountScopeHash !== "string" || !HASH.test(value.progressAccountScopeHash) ||
    typeof value.economicAccountScopeHash !== "string" || !HASH.test(value.economicAccountScopeHash) ||
    typeof value.mutationId !== "string" || !MUTATION_ID.test(value.mutationId) ||
    typeof value.payloadFingerprint !== "string" || !HASH.test(value.payloadFingerprint) ||
    typeof value.publicationFingerprint !== "string" || !HASH.test(value.publicationFingerprint) ||
    typeof value.completionFingerprint !== "string" || !HASH.test(value.completionFingerprint) ||
    typeof value.sessionRunId !== "string" || !MUTATION_ID.test(value.sessionRunId) ||
    typeof value.recordFingerprint !== "string" || !HASH.test(value.recordFingerprint)) {
    throw new Error("required_session_completion_inbox_indeterminate");
  }
  const accountGeneration = Number(value.accountGeneration);
  const expectedProgressScope = deriveProgressAccountScopeHash(
    value.accountStableUid,
    accountGeneration,
  );
  const expectedEconomicScope = deriveLearningV2EconomicAccountScopeHash(value.accountStableUid);
  let completionEnvelope: RequiredSessionCompletionEnvelopeV3;
  let candidate: ReconciledRequiredSessionCompletionCandidate;
  try {
    completionEnvelope = parseRequiredSessionCompletionEnvelope(value.completionEnvelope);
    candidate = parseReconciledRequiredSessionCompletionCandidate(value.reconciledCandidate);
  } catch {
    throw new Error("required_session_completion_inbox_indeterminate");
  }
  if (value.progressAccountScopeHash !== expectedProgressScope ||
    value.economicAccountScopeHash !== expectedEconomicScope ||
    completionEnvelope.seasonId !== "learning-v2" ||
    completionEnvelope.accountScopeHash !== expectedProgressScope ||
    completionEnvelope.accountGeneration !== accountGeneration ||
    requiredSessionCompletionMutationId(completionEnvelope) !== value.mutationId ||
    progressOutboxPayloadFingerprint(completionEnvelope) !== value.payloadFingerprint ||
    completionEnvelope.completionFingerprint !== value.completionFingerprint ||
    completionEnvelope.sessionRunId !== value.sessionRunId ||
    candidate.progressAccountScopeHash !== expectedProgressScope ||
    candidate.economicAccountScopeHash !== expectedEconomicScope ||
    candidate.accountGeneration !== accountGeneration ||
    candidate.publicationFingerprint !== value.publicationFingerprint ||
    candidate.completionFingerprint !== value.completionFingerprint ||
    candidate.sessionRunId !== value.sessionRunId) {
    throw new Error("required_session_completion_inbox_indeterminate");
  }
  if (candidate.studyTarget !== completionEnvelope.studyTarget ||
    candidate.episodeId !== completionEnvelope.episodeId ||
    candidate.sessionSetId !== completionEnvelope.sessionSetId ||
    candidate.sessionSetHash !== completionEnvelope.sessionSetHash ||
    candidate.localSessionId !== completionEnvelope.localSessionId ||
    candidate.canonicalSessionId !== completionEnvelope.canonicalSessionId ||
    candidate.requiredSessionOrdinal !== completionEnvelope.requiredSessionOrdinal ||
    candidate.sessionFingerprint !== completionEnvelope.sessionFingerprint ||
    candidate.taskClaims.length !== completionEnvelope.taskCompletions.length ||
    candidate.taskClaims.some((claim, index) => {
      const completion = completionEnvelope.taskCompletions[index];
      return !completion || claim.taskOrdinal !== completion.taskOrdinal ||
        claim.taskId !== completion.taskId || claim.activityId !== completion.activityId ||
        claim.family !== completion.family || claim.disposition !== completion.disposition ||
        claim.clientReportedAttempts !== completion.learnerAttempts ||
        claim.clientReportedHintUsed !== completion.hintUsed;
    })) {
    throw new Error("required_session_completion_inbox_indeterminate");
  }
  const body = {
    schemaVersion: "learning-v2-required-session-completion-inbox.v1" as const,
    accountStableUid: value.accountStableUid,
    accountGeneration,
    progressAccountScopeHash: value.progressAccountScopeHash,
    economicAccountScopeHash: value.economicAccountScopeHash,
    mutationId: value.mutationId,
    payloadFingerprint: value.payloadFingerprint,
    publicationFingerprint: value.publicationFingerprint,
    completionFingerprint: value.completionFingerprint,
    sessionRunId: value.sessionRunId,
    completionEnvelope,
    reconciledCandidate: candidate,
  };
  if (hashCanonicalBody(body) !== value.recordFingerprint) {
    throw new Error("required_session_completion_inbox_indeterminate");
  }
  return deepFreeze({ ...body, recordFingerprint: value.recordFingerprint });
};

/**
 * Re-resolves the immutable server publication and reproduces the exact
 * catalog-bound candidate. This still grants no wallet or evidence authority.
 */
export const verifyRequiredSessionCompletionInboxRecordAgainstPublication = (
  input: unknown,
  publicationInput: unknown,
): RequiredSessionCompletionInboxRecordV1 => {
  let record: RequiredSessionCompletionInboxRecordV1;
  let publication: PublishedRequiredSessionSet;
  try {
    record = parseStructuralRequiredSessionCompletionInboxRecord(input);
    publication = parsePublishedRequiredSessionSet(publicationInput);
    assertPublicationMatchesCompletion(publication, record.completionEnvelope);
  } catch {
    throw new Error("required_session_completion_inbox_indeterminate");
  }
  if (record.publicationFingerprint !== publication.publicationFingerprint) {
    throw new Error("required_session_completion_inbox_indeterminate");
  }
  let expectedCandidate: ReconciledRequiredSessionCompletionCandidate;
  try {
    expectedCandidate = materializeReconciledRequiredSessionCompletionCandidate({
      payload: record.completionEnvelope,
      publication,
      economicAccountScopeHash: record.economicAccountScopeHash,
    });
  } catch {
    throw new Error("required_session_completion_inbox_indeterminate");
  }
  if (canonicalJsonV1(expectedCandidate) !== canonicalJsonV1(record.reconciledCandidate)) {
    throw new Error("required_session_completion_inbox_indeterminate");
  }
  return record;
};

const receiptFor = (record: RequiredSessionCompletionInboxRecordV1) => {
  const receiptId = `rscv1_${hashCanonicalBody({
    schemaVersion: "learning-v2-required-session-completion-receipt-key.v1",
    progressAccountScopeHash: record.progressAccountScopeHash,
    mutationId: record.mutationId,
  })}`;
  return Object.freeze({
    schemaVersion: "v2-progress-outbox-server-receipt.v1" as const,
    receiptId,
    receiptFingerprint: hashCanonicalBody({
      schemaVersion: "learning-v2-required-session-completion-receipt.v1",
      receiptId,
      recordFingerprint: record.recordFingerprint,
    }),
  });
};

const protocolRejection = (
  input: CompletionSubmitRequestV3,
  reason: "publication_mismatch" | "projection_invalid" | "stored_conflict",
): HttpsError => {
  const receiptId = `rscrjv1_${hashCanonicalBody({
    schemaVersion: "learning-v2-required-session-completion-rejection-key.v1",
    mutationId: input.mutationId,
    payloadFingerprint: input.payloadFingerprint,
    reason,
  })}`;
  const receipt = Object.freeze({
    schemaVersion: "v2-progress-outbox-server-receipt.v1" as const,
    receiptId,
    receiptFingerprint: hashCanonicalBody({
      schemaVersion: "learning-v2-required-session-completion-rejection-receipt.v1",
      receiptId,
      mutationId: input.mutationId,
      payloadFingerprint: input.payloadFingerprint,
      reason,
    }),
  });
  return new HttpsError(
    "failed-precondition",
    `required_session_completion_${reason}`,
    Object.freeze({
      schemaVersion: "learning-v2-required-session-completion-protocol-rejection.v1" as const,
      mutationId: input.mutationId,
      payloadFingerprint: input.payloadFingerprint,
      reason,
      receipt,
    }),
  );
};

export const createRequiredSessionCompletionHandler = (
  dependencies: RequiredSessionCompletionCallableDependencies,
  authorize: ProgressEventAuthorization,
) => async (request: { readonly data: unknown; readonly auth?: { readonly uid?: unknown } | null }) => {
  const authUid = normalizeProgressAuthUid(request.auth?.uid);
  let input: CompletionSubmitRequestV3;
  try {
    input = parseRequiredSessionCompletionSubmitRequest(request.data);
  } catch (error) {
    throw new HttpsError("invalid-argument", error instanceof Error
      ? error.message
      : "required_session_completion_submit_invalid");
  }
  const binding = await authorize(authUid);
  if (typeof binding === "string" || !binding || !Number.isSafeInteger(binding.accountGeneration)) {
    throw new HttpsError("failed-precondition", "account_generation_unavailable");
  }
  const stableUid = normalizeProgressStableUid(binding.stableUid);
  const accountGeneration = Number(binding.accountGeneration);
  const progressAccountScopeHash = deriveProgressAccountScopeHash(stableUid, accountGeneration);
  if (accountGeneration < 1 || input.payload.accountGeneration !== accountGeneration ||
    input.payload.accountScopeHash !== progressAccountScopeHash) {
    throw new HttpsError("failed-precondition", "account_generation_mismatch");
  }
  const publicationValue = await dependencies.readPublication(
    publishedRequiredSessionSetDocumentId(input.payload.sessionSetId),
  );
  if (publicationValue === undefined) {
    throw new HttpsError("failed-precondition", "required_session_catalog_missing");
  }
  let publication: PublishedRequiredSessionSet;
  try {
    publication = parsePublishedRequiredSessionSet(publicationValue);
    assertPublicationMatchesCompletion(publication, input.payload);
  } catch {
    throw protocolRejection(input, "publication_mismatch");
  }
  let reconciledCandidate: ReconciledRequiredSessionCompletionCandidate;
  try {
    reconciledCandidate = materializeReconciledRequiredSessionCompletionCandidate({
      payload: input.payload,
      publication,
      economicAccountScopeHash: deriveLearningV2EconomicAccountScopeHash(stableUid),
    });
  } catch {
    throw protocolRejection(input, "projection_invalid");
  }
  const record = materializeRecord({
    stableUid,
    accountGeneration,
    request: input,
    publication,
    reconciledCandidate,
  });
  let result: Awaited<ReturnType<RequiredSessionCompletionInboxStore["putIfAbsent"]>>;
  try {
    result = await dependencies.inboxStore.putIfAbsent({
      authUid,
      stableUid,
      accountGeneration,
      record,
    });
  } catch (error) {
    if (error instanceof Error &&
      error.message === "required_session_completion_conflict") {
      throw protocolRejection(input, "stored_conflict");
    }
    throw error;
  }
  if (result.recordFingerprint !== record.recordFingerprint) {
    throw protocolRejection(input, "stored_conflict");
  }
  return Object.freeze({
    kind: "accepted" as const,
    mutationId: input.mutationId,
    payloadFingerprint: input.payloadFingerprint,
    duplicate: result.status === "existing",
    receipt: receiptFor(record),
    walletRewardRequest: result.walletRewardRequest,
  });
};

const inboxDocumentId = (record: RequiredSessionCompletionInboxRecordV1): string =>
  `rsciv1_${hashCanonicalBody({
    schemaVersion: "learning-v2-required-session-completion-inbox-key.v1",
    progressAccountScopeHash: record.progressAccountScopeHash,
    mutationId: record.mutationId,
  })}`;

const performanceAwardStateDocumentId = (
  record: RequiredSessionCompletionInboxRecordV1,
): string => `rspasv1_${record.reconciledCandidate.initialCreditSubjectFingerprint}`;

const performanceAwardDecisionDocumentId = (
  record: RequiredSessionCompletionInboxRecordV1,
): string => `rspadv1_${hashCanonicalBody({
  schemaVersion: "learning-v2-required-session-performance-award-decision-key.v1",
  economicAccountScopeHash: record.economicAccountScopeHash,
  mutationId: record.mutationId,
})}`;

const courseAwardStateDocumentId = (
  record: RequiredSessionCompletionInboxRecordV1,
): string => `rscasv1_${hashCanonicalBody({
  schemaVersion: "learning-v2-required-session-course-award-key.v1",
  economicAccountScopeHash: record.economicAccountScopeHash,
  courseId: record.reconciledCandidate.courseId,
  studyTarget: record.reconciledCandidate.studyTarget,
})}`;

export const createFirestoreRequiredSessionCompletionInboxStore = (
  db: Firestore,
): RequiredSessionCompletionInboxStore => ({
  putIfAbsent: async ({ authUid, stableUid, accountGeneration, record }) =>
    db.runTransaction(async (transaction) => {
      const authRef = db.collection("auth_links").doc(authUid);
      const userRef = db.collection("users").doc(stableUid);
      const tombstoneRef = db.collection("account_deletion_tombstones").doc(stableUid);
      const recordRef = userRef.collection("v2_required_session_completion_inbox")
        .doc(inboxDocumentId(record));
      const awardStateRef = userRef.collection("v2_required_session_performance_awards")
        .doc(performanceAwardStateDocumentId(record));
      const awardDecisionRef = userRef
        .collection("v2_required_session_performance_award_decisions")
        .doc(performanceAwardDecisionDocumentId(record));
      const courseAwardStateRef = userRef
        .collection("v2_required_session_course_awards")
        .doc(courseAwardStateDocumentId(record));
      const [auth, user, tombstone, existing, awardStateSnapshot,
        awardDecisionSnapshot, courseAwardStateSnapshot] = await Promise.all([
        transaction.get(authRef),
        transaction.get(userRef),
        transaction.get(tombstoneRef),
        transaction.get(recordRef),
        transaction.get(awardStateRef),
        transaction.get(awardDecisionRef),
        transaction.get(courseAwardStateRef),
      ]);
      if (!auth.exists || auth.data()?.stable_id !== stableUid || tombstone.exists ||
        !user.exists ||
        Number(user.data()?.accountGeneration ?? user.data()?.generation) !== accountGeneration) {
        throw new HttpsError("failed-precondition", "account_generation_mismatch");
      }
      if (existing.exists) {
        const stored = parseStructuralRequiredSessionCompletionInboxRecord(existing.data());
        if (stored.recordFingerprint !== record.recordFingerprint) {
          throw new HttpsError("failed-precondition", "required_session_completion_conflict");
        }
        if (!awardDecisionSnapshot.exists) {
          // Inbox rows created before the economic policy are never
          // retroactively minted from a later wallet state.
          return {
            status: "existing" as const,
            recordFingerprint: stored.recordFingerprint,
            walletRewardRequest: null,
          };
        }
        const decision = parseAwardDecision(awardDecisionSnapshot.data());
        if (decision.completionRecordFingerprint !== stored.recordFingerprint ||
          decision.candidateFingerprint !== stored.reconciledCandidate.candidateFingerprint) {
          throw new HttpsError("data-loss", "required_session_performance_award_conflict");
        }
        return {
          status: "existing" as const,
          recordFingerprint: stored.recordFingerprint,
          walletRewardRequest: decision.walletRewardRequest,
        };
      }
      const usesCourseEconomyV2 = record.reconciledCandidate.schemaVersion ===
        "learning-v2-reconciled-required-session-completion-candidate.v2";
      const previousState = usesCourseEconomyV2 && awardStateSnapshot.exists
        ? parseRequiredSessionPerformanceAwardState(awardStateSnapshot.data())
        : null;
      const previousCourseState = usesCourseEconomyV2 && courseAwardStateSnapshot.exists
        ? parseRequiredSessionCourseAwardState(courseAwardStateSnapshot.data())
        : null;
      const projection = projectRequiredSessionPerformanceAward({
        candidate: record.reconciledCandidate,
        previousState,
        previousCourseState,
      });
      const walletRewardRequest = projection.reward === null
        ? null
        : materializeServerWalletRewardRequest(projection.reward);
      const decision = materializeAwardDecision({
        completionRecordFingerprint: record.recordFingerprint,
        candidateFingerprint: record.reconciledCandidate.candidateFingerprint,
        completionKind: projection.completionKind,
        awardedSubunits: projection.awardedSubunits,
        walletRewardRequest,
      });
      let rewardRef: FirebaseFirestore.DocumentReference | null = null;
      let protectedReward: ReturnType<
        typeof materializeProtectedLearningV2WalletRewardReceipt
      > | null = null;
      let rewardSnapshot: FirebaseFirestore.DocumentSnapshot | null = null;
      if (projection.reward !== null) {
        protectedReward = materializeProtectedLearningV2WalletRewardReceipt(
          projection.reward,
        );
        rewardRef = userRef.collection(V2_WALLET_REWARD_RECEIPTS_SUBCOLLECTION)
          .doc(protectedReward.rewardId);
        rewardSnapshot = await transaction.get(rewardRef);
        if (rewardSnapshot.exists) {
          const storedReward = parseProtectedLearningV2WalletRewardReceipt(
            rewardSnapshot.data(),
          );
          if (canonicalJsonV1(storedReward) !== canonicalJsonV1(protectedReward)) {
            throw new HttpsError("data-loss", "required_session_performance_reward_conflict");
          }
        }
      }
      transaction.create(recordRef, record as unknown as FirebaseFirestore.DocumentData);
      transaction.create(awardDecisionRef,
        decision as unknown as FirebaseFirestore.DocumentData);
      if (projection.nextState !== null) {
        if (awardStateSnapshot.exists) {
          transaction.set(awardStateRef,
            projection.nextState as unknown as FirebaseFirestore.DocumentData,
            { merge: false });
        } else {
          transaction.create(awardStateRef,
            projection.nextState as unknown as FirebaseFirestore.DocumentData);
        }
        if (projection.nextCourseState !== null &&
          projection.nextCourseState.stateFingerprint !==
            projection.previousCourseState?.stateFingerprint) {
          if (courseAwardStateSnapshot.exists) {
            transaction.set(courseAwardStateRef,
              projection.nextCourseState as unknown as FirebaseFirestore.DocumentData,
              { merge: false });
          } else {
            transaction.create(courseAwardStateRef,
              projection.nextCourseState as unknown as FirebaseFirestore.DocumentData);
          }
        }
        if (rewardRef && protectedReward && rewardSnapshot && !rewardSnapshot.exists) {
          transaction.create(rewardRef,
            protectedReward as unknown as FirebaseFirestore.DocumentData);
        }
      }
      return {
        status: "created" as const,
        recordFingerprint: record.recordFingerprint,
        walletRewardRequest,
      };
    }),
});

export const createRequiredSessionCompletionProductionCallable = (
  db: Firestore = admin.firestore(),
) => onCall({
  region: "us-central1",
  enforceAppCheck: false,
  timeoutSeconds: 15,
  memory: "256MiB",
  maxInstances: 80,
}, async (request: CallableRequest<unknown>) => createRequiredSessionCompletionHandler({
  readPublication: async (documentId) => {
    const snapshot = await db.collection("content_v2_required_session_sets").doc(documentId).get();
    return snapshot.exists ? snapshot.data() : undefined;
  },
  inboxStore: createFirestoreRequiredSessionCompletionInboxStore(db),
}, createProgressEventAuthorization(db))(request));
