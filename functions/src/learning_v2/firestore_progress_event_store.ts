import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";
import { assertExactImmutableEpisodeRevision } from "../content_studio/episode_revision_resolver";
import { createFirestoreEpisodeRevisionResolver, createFirestoreModeTemplateResolver } from "../content_studio/firestore_authoring_store";
import { resolveImmutableSeasonRevision, createStorageSeasonRevisionObjectReader } from "../content_studio/season_revision_resolver";
import { assertProgressAccountScope, assertResolvedProgressPins, deriveEffectiveProjectionFingerprint, deriveProgressAccountScopeHash, isValidProgressProjection, type ProgressAttemptRecord, type ProgressEventRequest, type ProgressEventStore, type ProgressEventOperation } from "./progress_event";
import { materializeProgressEvidenceBundle, type MaterializedProgressEvidence, type ProgressEvidenceBundle } from "./progress_event_evidence";
import { deriveProgressProjectionFromServerScore, type ProgressProjection } from "./progress_event_projection";
import { assertServerScoreResolution, type ServerScoreResolution } from "./server_score_resolver";
import type { ImmutableEpisodeRevisionArtifact } from "../content_studio/episode_revision_resolver";
import { prepareProgressTransactionPlan, type ProgressTransactionPlan } from "./progress_event_transaction_plan";
import { resolvePinnedServerScore, type ModeTemplateArtifactReader, type ScoringPolicyCatalog } from "./server_score_policy_evaluator";
import { materializeDelayedTerminalEvidence, type DelayedProbeTerminalRecord } from "./delayed_probe_ingestion";
import { resolveDelayedTerminal } from "../../../modules/learning-v2/contracts/delayed_probe";
import { validateFailureReceipt, validateTimingReceipt } from "../../../modules/learning-v2/contracts/delayed_receipts";
import { buildLearningEvidenceTupleKey } from "../../../modules/learning-v2/contracts/evidence";
import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";
import type { V2DelayedAttemptEventBody } from "../../../modules/learning-v2/contracts/attempt";
import {
  createRequiredTaskSettlementCandidate,
  createRequiredSessionCatalogFromSessionSetV2,
  parsePublishedRequiredSessionSet,
  type RequiredSessionCatalogV1,
} from "../../../modules/learning-v2/contracts/required_session_progress";
import {
  createRequiredSessionProgressState,
  parseRequiredSessionProgressState,
  reduceRequiredTaskSettlement,
  type RequiredSessionProgressStateV1,
} from "../../../modules/learning-v2/progress/required_session_reducer";
import { deriveLearningV2EconomicAccountScopeHash } from "../../../modules/learning-v2/progress/economic_account_scope";
import { publishedRequiredSessionSetDocumentId } from "../content_factory/v2_required_session_publication";
import {
  publishedRequiredSessionAnswerManifestDocumentId,
} from "../content_factory/v2_required_session_publication";
import {
  isVerifiedRequiredSessionTaskOutcome,
  parsePublishedRequiredSessionAnswerManifest,
  requiredSessionTaskAnswerResponseFingerprint,
  verifyRequiredSessionTaskAnswer,
  type VerifiedRequiredSessionTaskOutcomeV1,
} from "./required_session_answer_verifier";
import { PILOT_SCORING_POLICY_CATALOG } from "./server_score_policy_catalog";

export { publishedRequiredSessionSetDocumentId } from "../content_factory/v2_required_session_publication";

const safe = (value: string): string => value.replace(/[^A-Za-z0-9._-]/g, "_");
const stableOwner = (stableUid: string): string => {
  if (!/^[A-Za-z0-9._-]{1,160}$/.test(stableUid) || stableUid === "." || stableUid === "..") {
    throw new Error("v2_progress_stable_owner_invalid");
  }
  return stableUid;
};
export const progressOperationDocumentId = (scope: string, season: string, operation: string): string =>
  `opv1_${hashCanonicalBody([scope, season, operation])}`;
export const progressAttemptDocumentId = (scope: string, season: string, episode: string, op: string): string =>
  `atv1_${hashCanonicalBody([scope, season, episode, op])}`;
const operationPath = (stableUid: string, scope: string, season: string, operation: string): string =>
  `users/${stableOwner(stableUid)}/v2_progress_ops/${progressOperationDocumentId(scope, season, operation)}`;
const attemptPath = (stableUid: string, scope: string, season: string, episode: string, op: string): string =>
  `users/${stableOwner(stableUid)}/v2_progress_attempts/${progressAttemptDocumentId(scope, season, episode, op)}`;
const progressScopeRoot = (stableUid: string, accountScopeHash: string): string =>
  `users/${stableOwner(stableUid)}/v2_progress/${safe(accountScopeHash)}`;
const evidencePath = (stableUid: string, accountScopeHash: string, season: string, episode: string, tupleKey: string): string =>
  `${progressScopeRoot(stableUid, accountScopeHash)}/seasons/${safe(season)}/episodes/${safe(episode)}/evidence/${safe(tupleKey)}`;
const projectionPath = (stableUid: string, accountScopeHash: string, season: string, episode: string, slot: string): string =>
  `${progressScopeRoot(stableUid, accountScopeHash)}/seasons/${safe(season)}/episodes/${safe(episode)}/slots/${safe(slot)}`;
const delayedTerminalPath = (stableUid: string, accountScopeHash: string, mutationId: string): string =>
  `users/${stableOwner(stableUid)}/v2_delayed_attempts/${accountScopeHash}__${safe(mutationId)}`;
const requiredSessionRunDocumentId = (
  economicAccountScopeHash: string,
  catalog: RequiredSessionCatalogV1,
  sessionRunId: string,
): string => `rsrv1_${hashCanonicalBody({
  schemaVersion: "learning-v2-required-session-run-document-key.v1",
  economicAccountScopeHash,
  courseId: catalog.courseId,
  studyTarget: catalog.studyTarget,
  requiredSessionOrdinal: catalog.requiredSessionOrdinal,
  sessionRunId,
})}`;
const requiredSessionTaskDocumentId = (
  runDocumentId: string,
  taskOrdinal: number,
): string => `rstav1_${hashCanonicalBody({
  schemaVersion: "learning-v2-required-session-task-attempt-document-key.v1",
  runDocumentId,
  taskOrdinal,
})}`;

interface RequiredSessionTaskAttemptStateV1 {
  readonly schemaVersion: "learning-v2-required-session-task-attempt-state.v1";
  readonly economicAccountScopeHash: string;
  readonly accountGeneration: number;
  readonly sessionRunId: string;
  readonly taskSlotFingerprint: string;
  readonly learnerAttempts: number;
  readonly hintUsed: boolean;
  readonly terminalCandidateFingerprint: string | null;
  readonly lastAttemptRef: ProgressEventRequest["attemptRef"] | null;
}

const parseRequiredSessionTaskAttemptState = (
  input: unknown,
  expected: {
    readonly economicAccountScopeHash: string;
    readonly accountGeneration: number;
    readonly sessionRunId: string;
    readonly taskSlotFingerprint: string;
  },
): RequiredSessionTaskAttemptStateV1 => {
  if (!isRecord(input) || !hasExactKeys(input, [
    "schemaVersion", "economicAccountScopeHash", "accountGeneration",
    "sessionRunId", "taskSlotFingerprint", "learnerAttempts", "hintUsed",
    "terminalCandidateFingerprint", "lastAttemptRef",
  ]) || input.schemaVersion !== "learning-v2-required-session-task-attempt-state.v1" ||
    input.economicAccountScopeHash !== expected.economicAccountScopeHash ||
    input.accountGeneration !== expected.accountGeneration ||
    input.sessionRunId !== expected.sessionRunId ||
    input.taskSlotFingerprint !== expected.taskSlotFingerprint ||
    !Number.isSafeInteger(input.learnerAttempts) || Number(input.learnerAttempts) < 0 ||
    typeof input.hintUsed !== "boolean" ||
    (input.terminalCandidateFingerprint !== null &&
      (typeof input.terminalCandidateFingerprint !== "string" ||
        !/^[a-f0-9]{64}$/.test(input.terminalCandidateFingerprint))) ||
    (input.lastAttemptRef !== null && (!isRecord(input.lastAttemptRef) ||
      !hasExactKeys(input.lastAttemptRef, ["schemaVersion", "opId", "attemptBodyHash"]) ||
      input.lastAttemptRef.schemaVersion !== "v2-attempt-ref.v1" ||
      typeof input.lastAttemptRef.opId !== "string" ||
      typeof input.lastAttemptRef.attemptBodyHash !== "string" ||
      !/^[a-f0-9]{64}$/.test(input.lastAttemptRef.attemptBodyHash)))) {
    throw new Error("required_session_attempt_state_invalid");
  }
  return input as unknown as RequiredSessionTaskAttemptStateV1;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const hasExactKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean => Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
const sameAttemptRef = (left: Readonly<Record<string, unknown>>, right: ProgressEventRequest["attemptRef"]): boolean =>
  left.schemaVersion === right.schemaVersion && left.opId === right.opId && left.attemptBodyHash === right.attemptBodyHash;
const sameProjectionIdentity = (left: ProgressProjection, right: ProgressProjection): boolean =>
  left.starSlotId === right.starSlotId && left.activityId === right.activityId && left.progressCompatibilityKey === right.progressCompatibilityKey;

const validateTrustedDelayedTerminal = (
  request: ProgressEventRequest,
  raw: unknown,
  serverScopeHash: string,
  accountGeneration: number,
): ProgressEvidenceBundle => {
  if (!isRecord(raw) || !hasExactKeys(raw, ["schemaVersion", "mutationId", "accountScopeHash", "accountGeneration", "receipt", "receiptHash", "terminalStatus"]) || raw.schemaVersion !== "v2-delayed-probe-terminal.v1") throw new Error("delayed_terminal_record_invalid");
  if (raw.accountScopeHash !== serverScopeHash || raw.accountGeneration !== accountGeneration) throw new Error("delayed_terminal_account_mismatch");
  if (raw.mutationId !== request.terminalRef?.mutationId) throw new Error("delayed_terminal_mutation_mismatch");
  if (typeof raw.receiptHash !== "string" || !/^[a-f0-9]{64}$/.test(raw.receiptHash) || hashCanonicalBody(raw.receipt) !== raw.receiptHash) throw new Error("delayed_terminal_record_invalid");
  if (!isRecord(raw.receipt) || !hasExactKeys(raw.receipt, ["kind", "body", "ref"]) || !isRecord(raw.receipt.body)) throw new Error("delayed_terminal_record_invalid");
  const receiptAttemptRef = raw.receipt.body.attemptRef;
  if (!isRecord(receiptAttemptRef) || !sameAttemptRef(receiptAttemptRef, request.attemptRef)) throw new Error("delayed_terminal_attempt_mismatch");
  if (request.attemptBody.attemptSurface.kind !== "scheduled_delayed_probe") throw new Error("delayed_terminal_attempt_invalid");

  const attemptBody = request.attemptBody as V2DelayedAttemptEventBody;
  const candidate = { schemaVersion: "v2-delayed-attempt-candidate.v1" as const, attemptBody, attemptRef: request.attemptRef };
  const expectedTupleKeys = attemptBody.delayedCandidates.map((entry) => buildLearningEvidenceTupleKey(entry.binding));
  let expectedResolutions: readonly unknown[] = [];
  let expectedStatus: DelayedProbeTerminalRecord["terminalStatus"];
  if (raw.receipt.kind === "timing") {
    const receipt = raw.receipt as unknown as Extract<DelayedProbeTerminalRecord["receipt"], { kind: "timing" }>;
    const resolved = resolveDelayedTerminal(candidate, receipt.body.assessmentTiming, expectedTupleKeys);
    if (!resolved.ok) throw new Error("delayed_terminal_record_invalid");
    expectedResolutions = resolved.resolutions.filter((resolution) => resolution.terminalDisposition !== "no_record");
    const materializedKeys = expectedResolutions.map((resolution) => (resolution as { tupleKey: string }).tupleKey);
    if (!validateTimingReceipt(receipt.body, receipt.ref, materializedKeys, request.attemptRef).ok) throw new Error("delayed_terminal_record_invalid");
    if (hashCanonicalBody(receipt.body.terminalTupleResolutions) !== hashCanonicalBody(expectedResolutions)) throw new Error("delayed_terminal_evidence_mismatch");
    expectedStatus = "timed_finalized";
  } else if (raw.receipt.kind === "failure") {
    const receipt = raw.receipt as unknown as Extract<DelayedProbeTerminalRecord["receipt"], { kind: "failure" }>;
    if (!isRecord(receipt.body.decision)) throw new Error("delayed_terminal_record_invalid");
    if (receipt.body.decision.kind === "system_non_assessment") {
      const resolved = resolveDelayedTerminal(candidate, "system_failure", expectedTupleKeys);
      if (!resolved.ok) throw new Error("delayed_terminal_record_invalid");
      expectedResolutions = resolved.resolutions.filter((resolution) => resolution.terminalDisposition !== "no_record");
      const materializedKeys = expectedResolutions.map((resolution) => (resolution as { tupleKey: string }).tupleKey);
      if (!validateFailureReceipt(receipt.body, receipt.ref, materializedKeys, request.attemptRef).ok) throw new Error("delayed_terminal_record_invalid");
      if (hashCanonicalBody(receipt.body.decision.terminalTupleResolutions) !== hashCanonicalBody(expectedResolutions)) throw new Error("delayed_terminal_evidence_mismatch");
      expectedStatus = "system_non_assessment_finalized";
    } else {
      if (!validateFailureReceipt(receipt.body, receipt.ref, [], request.attemptRef).ok) throw new Error("delayed_terminal_record_invalid");
      expectedStatus = "protocol_rejected";
    }
  } else {
    throw new Error("delayed_terminal_record_invalid");
  }
  if (raw.terminalStatus !== expectedStatus) throw new Error("delayed_terminal_record_invalid");

  const terminal = raw as unknown as DelayedProbeTerminalRecord;
  const bundle = materializeDelayedTerminalEvidence(attemptBody, terminal);
  const materialized = materializeProgressEvidenceBundle(bundle);
  if (!sameAttemptRef(bundle.attemptRef as unknown as Record<string, unknown>, request.attemptRef) || materialized.refs.length !== expectedResolutions.length) throw new Error("delayed_terminal_evidence_mismatch");
  return bundle;
};

export interface FirestoreProgressEventStoreOptions {
  readonly db: admin.firestore.Firestore;
  readonly authUid: string;
  readonly stableUid: string;
  readonly accountGeneration: number;
  readonly accountScopeHash: string;
  readonly seasonObjectReader?: Parameters<typeof resolveImmutableSeasonRevision>[0]["objectReader"];
  readonly episodeResolver?: ReturnType<typeof createFirestoreEpisodeRevisionResolver>;
  /** Optional trusted Functions-side scorer. Never supplied by the client. */
  readonly resolveServerScore?: (input: {
    readonly request: ProgressEventRequest;
    readonly attemptBody: ProgressEventRequest["attemptBody"];
    readonly attemptRef: ProgressEventRequest["attemptRef"];
    readonly evidence: MaterializedProgressEvidence;
    readonly episodeRevision: ImmutableEpisodeRevisionArtifact;
    readonly previousBestStars?: number;
  }) => Promise<ServerScoreResolution | undefined> | ServerScoreResolution | undefined;
  /** Optional code-owned policy catalog used when no ad-hoc scorer callback is supplied. */
  readonly scoringTemplates?: ModeTemplateArtifactReader;
  readonly scoringPolicies?: ScoringPolicyCatalog;
  /** Server-side test seam; never populated from a callable/client request. */
  readonly testHooks?: Readonly<{
    readonly afterBindingReads?: () => void | Promise<void>;
  }>;
}

const transactionBindingPaths = (options: FirestoreProgressEventStoreOptions) => ({
  authLink: `auth_links/${options.authUid}`,
  user: `users/${options.stableUid}`,
  tombstone: `account_deletion_tombstones/${options.stableUid}`,
});

const assertLiveTransactionBinding = async (
  options: FirestoreProgressEventStoreOptions,
  transaction: FirebaseFirestore.Transaction,
): Promise<void> => {
  const paths = transactionBindingPaths(options);
  const [authLinkSnapshot, userSnapshot, tombstoneSnapshot] = await Promise.all([
    transaction.get(options.db.doc(paths.authLink)),
    transaction.get(options.db.doc(paths.user)),
    transaction.get(options.db.doc(paths.tombstone)),
  ]);
  await options.testHooks?.afterBindingReads?.();

  if (!authLinkSnapshot.exists) {
    throw new HttpsError("failed-precondition", "progress_identity_anchor_missing");
  }
  const anchoredStableUid = String(authLinkSnapshot.data()?.stable_id ?? "").trim();
  if (!anchoredStableUid || anchoredStableUid !== options.stableUid) {
    throw new HttpsError("permission-denied", "stable_id_mismatch");
  }
  if (tombstoneSnapshot.exists) {
    throw new HttpsError("failed-precondition", "account_delete_pending");
  }

  const userData = userSnapshot.exists ? userSnapshot.data() ?? {} : {};
  const liveGeneration = Number(userData.accountGeneration ?? userData.generation);
  const expectedScopeHash = deriveProgressAccountScopeHash(options.stableUid, options.accountGeneration);
  if (
    !Number.isSafeInteger(liveGeneration) ||
    liveGeneration < 1 ||
    liveGeneration !== options.accountGeneration ||
    options.accountScopeHash !== expectedScopeHash
  ) {
    throw new HttpsError("failed-precondition", "account_generation_mismatch");
  }
};

const txStore = (options: FirestoreProgressEventStoreOptions, transaction: FirebaseFirestore.Transaction): ProgressEventStore => {
  const { db } = options;
  const serverScopeHash = deriveProgressAccountScopeHash(options.stableUid, options.accountGeneration);
  let pinnedRequest: ProgressEventRequest | undefined;
  let preparedPlan: ProgressTransactionPlan | undefined;
  let projectionExists = false;
  let pinnedEpisode: ImmutableEpisodeRevisionArtifact | undefined;
  let pinnedRequiredSessionCatalog: RequiredSessionCatalogV1 | undefined;
  let verifiedRequiredSessionOutcome: VerifiedRequiredSessionTaskOutcomeV1 | undefined;
  let preparedRequiredSessionWrites: ReadonlyArray<{
    readonly ref: FirebaseFirestore.DocumentReference;
    readonly value: FirebaseFirestore.DocumentData;
    readonly create: boolean;
  }> | undefined;
  const resolveServerScore = options.resolveServerScore;
  const scoringTemplates = options.scoringTemplates;
  // A policy table only maps an already verified outcome to stars; it cannot
  // authenticate a client resultCode. Never install the pilot table as a
  // production default. A caller must inject a trusted scorer/catalog after
  // its activity-specific server evidence boundary has derived the outcome.
  const scoringPolicies = options.scoringPolicies;
  const existingEvidenceKeys = new Set<string>();
  const get = async (path: string) => transaction.get(db.doc(path));
  const readStoredProjection = (value: unknown, request: ProgressEventRequest): ProgressProjection => {
    if (!isRecord(value) || !hasExactKeys(value, ["schemaVersion", "accountStableUid", "accountGeneration", "accountScopeHash", "seasonRevisionId", "episodeId", "projection"]) ||
      value.schemaVersion !== "v2-progress-projection.v1" || value.accountStableUid !== options.stableUid || value.accountGeneration !== options.accountGeneration ||
      value.accountScopeHash !== serverScopeHash || value.seasonRevisionId !== request.seasonRevisionId || value.episodeId !== request.episodeRevisionRef.episodeId || !isValidProgressProjection(value.projection) ||
      !sameProjectionIdentity(value.projection, { ...value.projection, starSlotId: request.projection.starSlotId, activityId: request.projection.activityId, progressCompatibilityKey: request.projection.progressCompatibilityKey })) {
      throw new Error("v2_progress_projection_state_invalid");
    }
    return value.projection;
  };
  return {
    runTransaction: async <T>(work: (tx: ProgressEventStore) => Promise<T>) => work(txStore(options, transaction)),
    resolveDelayedEvidence: async (request) => {
      assertProgressAccountScope(request.accountScopeHash, serverScopeHash);
      if (!request.terminalRef) throw new Error("delayed_terminal_reference_required");
      const snapshot = await get(delayedTerminalPath(options.stableUid, serverScopeHash, request.terminalRef.mutationId));
      if (!snapshot.exists) throw new Error("delayed_terminal_missing");
      return validateTrustedDelayedTerminal(request, snapshot.data(), serverScopeHash, options.accountGeneration);
    },
    validatePinnedScope: async (request: ProgressEventRequest) => {
      assertProgressAccountScope(request.accountScopeHash, serverScopeHash);
      const season = await resolveImmutableSeasonRevision({
        revisionPath: `content_season_revisions/${safe(request.seasonRevisionId)}`,
        lifecyclePath: `content_season_lifecycle/${safe(request.seasonRevisionId)}`,
        objectReader: options.seasonObjectReader ?? createStorageSeasonRevisionObjectReader(admin.storage().bucket() as never),
        documentReader: { read: async (path) => { const snapshot = await get(path); return { exists: snapshot.exists, data: () => snapshot.data() }; } },
      });
      const resolver = options.episodeResolver ?? createFirestoreEpisodeRevisionResolver(
        db,
        undefined,
        createFirestoreModeTemplateResolver(db, undefined, { allowDeprecated: true }),
      );
      const episode = await assertExactImmutableEpisodeRevision(resolver, request.episodeRevisionRef, { get: async (path) => { const snapshot = await get(path); return { exists: snapshot.exists, data: () => snapshot.data() }; } });
      assertResolvedProgressPins(request, season, episode);
      if (request.requiredSessionTaskRef) {
        const slot = request.requiredSessionTaskRef;
        const publicationPath = `content_v2_required_session_sets/${publishedRequiredSessionSetDocumentId(slot.sessionSetId)}`;
        const publicationSnapshot = await get(publicationPath);
        if (!publicationSnapshot.exists) throw new Error("required_session_catalog_missing");
        let publication;
        try {
          publication = parsePublishedRequiredSessionSet(publicationSnapshot.data());
        } catch {
          throw new Error("required_session_catalog_invalid");
        }
        if (
          publication.courseId !== slot.courseId ||
          publication.studyTarget !== request.studyTarget ||
          publication.courseReleaseId !== slot.courseReleaseId ||
          publication.seasonRevisionId !== request.seasonRevisionId ||
          publication.episodeRevisionFingerprint !== request.episodeRevisionRef.revisionFingerprint ||
          publication.episodeContentHash !== request.episodeRevisionRef.contentHash ||
          publication.sessionSetId !== slot.sessionSetId ||
          publication.sessionSetHash !== slot.sessionSetHash ||
          publication.sessionSet.episodeId !== request.episodeRevisionRef.episodeId
        ) throw new Error("required_session_catalog_mismatch");
        const catalog = createRequiredSessionCatalogFromSessionSetV2({
          courseId: publication.courseId,
          studyTarget: publication.studyTarget,
          courseReleaseId: publication.courseReleaseId,
          sessionSetId: publication.sessionSetId,
          sessionSetHash: publication.sessionSetHash,
          requiredSessionOrdinal: slot.requiredSessionOrdinal,
          sessionSet: publication.sessionSet,
        });
        const task = catalog.tasks[slot.taskOrdinal - 1];
        if (
          catalog.sessionId !== slot.sessionId ||
          !task ||
          task.taskOrdinal !== slot.taskOrdinal ||
          task.taskId !== slot.taskId ||
          task.activityId !== slot.activityId
        ) throw new Error("required_session_catalog_mismatch");
        pinnedRequiredSessionCatalog = catalog;
        if (request.requiredSessionAnswerResponse) {
          const answerManifestSnapshot = await get(
            `content_v2_required_session_answer_manifests/${publishedRequiredSessionAnswerManifestDocumentId(publication.sessionSetId)}`,
          );
          if (!answerManifestSnapshot.exists) {
            throw new Error("required_session_answer_manifest_missing");
          }
          const answerManifest = parsePublishedRequiredSessionAnswerManifest(
            answerManifestSnapshot.data(),
          );
          if (
            answerManifest.courseId !== publication.courseId ||
            answerManifest.studyTarget !== publication.studyTarget ||
            answerManifest.courseReleaseId !== publication.courseReleaseId ||
            answerManifest.seasonRevisionId !== publication.seasonRevisionId ||
            answerManifest.episodeRevisionFingerprint !== publication.episodeRevisionFingerprint ||
            answerManifest.episodeContentHash !== publication.episodeContentHash ||
            answerManifest.sessionSetId !== publication.sessionSetId ||
            answerManifest.sessionSetHash !== publication.sessionSetHash
          ) throw new Error("required_session_answer_manifest_mismatch");
          const matchingKeys = answerManifest.answerKeys.filter((entry) =>
            entry.taskId === slot.taskId && entry.activityId === slot.activityId);
          if (matchingKeys.length !== 1) {
            throw new Error("required_session_answer_key_missing");
          }
          const verified = verifyRequiredSessionTaskAnswer({
            answerKey: matchingKeys[0],
            response: request.requiredSessionAnswerResponse,
          });
          if (!isVerifiedRequiredSessionTaskOutcome(verified) ||
            verified.resultCode !== request.attemptBody.outcome.resultCode) {
            throw new Error("required_session_answer_outcome_mismatch");
          }
          verifiedRequiredSessionOutcome = verified;
        } else {
          // Voice, skip, and technical outcomes require their own trusted
          // server resolver. Absence of a text answer must never inherit the
          // pilot result-to-stars table.
          verifiedRequiredSessionOutcome = undefined;
        }
      } else {
        pinnedRequiredSessionCatalog = undefined;
        verifiedRequiredSessionOutcome = undefined;
      }
      pinnedEpisode = episode;
      pinnedRequest = request;
    },
    resolveServerProjection: (resolveServerScore || scoringTemplates) ? async (request, materialized) => {
      if (!pinnedRequest || !pinnedEpisode) throw new Error("progress_pin_validation_required");
      const projectionRef = db.doc(projectionPath(options.stableUid, serverScopeHash, request.seasonRevisionId, request.episodeRevisionRef.episodeId, request.projection.starSlotId));
      // The callback needs the current best, but must not be allowed to write
      // anything before the normal prepare/write phase.
      const existing = await transaction.get(projectionRef);
      const previousBestStars = existing.exists ? readStoredProjection(existing.data(), request).performanceStars : undefined;
      const effectivePolicies = verifiedRequiredSessionOutcome
        ? scoringPolicies ?? PILOT_SCORING_POLICY_CATALOG
        : scoringPolicies;
      if (!resolveServerScore && (!scoringTemplates || !effectivePolicies)) return undefined;
      const resolution = resolveServerScore
        ? await resolveServerScore({ request, attemptBody: request.attemptBody, attemptRef: request.attemptRef, evidence: materialized, episodeRevision: pinnedEpisode, previousBestStars })
        : await resolvePinnedServerScore({ episodeRevision: pinnedEpisode, attemptRef: request.attemptRef, attemptBody: request.attemptBody, verifiedResultCode: verifiedRequiredSessionOutcome?.resultCode, activityId: request.projection.activityId, starSlotId: request.projection.starSlotId, progressCompatibilityKey: request.projection.progressCompatibilityKey, evidenceComponentFingerprint: materialized.componentFingerprint, templates: scoringTemplates as ModeTemplateArtifactReader, policies: effectivePolicies as ScoringPolicyCatalog });
      if (!resolution) return undefined;
      assertServerScoreResolution(resolution, { attemptRef: request.attemptRef, activityId: request.projection.activityId, starSlotId: request.projection.starSlotId, progressCompatibilityKey: request.projection.progressCompatibilityKey, scoringPolicyRef: resolution.scoringPolicyRef, evidenceComponentFingerprint: materialized.componentFingerprint });
      const projection = deriveProgressProjectionFromServerScore({ previousBestStars: previousBestStars ?? 0, resolution });
      return { projection, resolution };
    } : undefined,
    applyRequiredSessionAttempt: async (request, resolution) => {
      const slot = request.requiredSessionTaskRef;
      const catalog = pinnedRequiredSessionCatalog;
      if (!pinnedRequest || !slot || !catalog) {
        throw new Error("required_session_catalog_validation_required");
      }
      const economicAccountScopeHash = deriveLearningV2EconomicAccountScopeHash(
        options.stableUid,
      );
      const runDocumentId = requiredSessionRunDocumentId(
        economicAccountScopeHash,
        catalog,
        slot.sessionRunId,
      );
      const runRef = db.doc(
        `users/${stableOwner(options.stableUid)}/v2_required_session_runs/${runDocumentId}`,
      );
      const taskRef = db.doc(
        `users/${stableOwner(options.stableUid)}/v2_required_session_task_attempts/${requiredSessionTaskDocumentId(runDocumentId, slot.taskOrdinal)}`,
      );
      const [runSnapshot, taskSnapshot] = await Promise.all([
        transaction.get(runRef),
        transaction.get(taskRef),
      ]);
      const progressState: RequiredSessionProgressStateV1 = runSnapshot.exists
        ? parseRequiredSessionProgressState(runSnapshot.data(), catalog)
        : createRequiredSessionProgressState(catalog, {
            accountScopeHash: economicAccountScopeHash,
            accountGeneration: options.accountGeneration,
            sessionRunId: slot.sessionRunId,
            runKindClaim: slot.runKindClaim,
          });
      const taskSlotFingerprint = hashCanonicalBody(slot);
      const priorTask = taskSnapshot.exists
        ? parseRequiredSessionTaskAttemptState(taskSnapshot.data(), {
            economicAccountScopeHash,
            accountGeneration: options.accountGeneration,
            sessionRunId: slot.sessionRunId,
            taskSlotFingerprint,
          })
        : {
            schemaVersion: "learning-v2-required-session-task-attempt-state.v1" as const,
            economicAccountScopeHash,
            accountGeneration: options.accountGeneration,
            sessionRunId: slot.sessionRunId,
            taskSlotFingerprint,
            learnerAttempts: 0,
            hintUsed: false,
            terminalCandidateFingerprint: null,
            lastAttemptRef: null,
          };
      if (priorTask.terminalCandidateFingerprint !== null) {
        throw new Error("required_session_task_already_terminal");
      }
      const resultCode = resolution.resultCode;
      if (resultCode === "INVALID_AUDIO_OR_SYSTEM") {
        preparedRequiredSessionWrites = [];
        return;
      }
      const completed = resultCode === "CORRECT" || resultCode === "COMPLETED" ||
        resultCode === "PASS_CONFIDENT";
      const skipped = resultCode === "SKIPPED";
      const learnerAttempts = skipped
        ? priorTask.learnerAttempts
        : priorTask.learnerAttempts + 1;
      if (!Number.isSafeInteger(learnerAttempts)) {
        throw new Error("required_session_attempt_state_invalid");
      }
      const hintUsed = priorTask.hintUsed || request.attemptBody.evidence.hintsUsed > 0;
      if (!completed && !skipped) {
        preparedRequiredSessionWrites = [{
          ref: taskRef,
          create: !taskSnapshot.exists,
          value: {
            ...priorTask,
            learnerAttempts,
            hintUsed,
            lastAttemptRef: request.attemptRef,
          },
        }];
        return;
      }
      const candidate = createRequiredTaskSettlementCandidate({
        schemaVersion: "learning-v2-required-task-settlement-candidate-body.v1",
        candidateAuthority: "untrusted_local",
        operationId: request.attemptRef.opId,
        accountScopeHash: economicAccountScopeHash,
        accountGeneration: options.accountGeneration,
        courseId: catalog.courseId,
        studyTarget: catalog.studyTarget,
        courseReleaseId: catalog.courseReleaseId,
        sessionSetId: catalog.sessionSetId,
        sessionSetHash: catalog.sessionSetHash,
        requiredSessionOrdinal: catalog.requiredSessionOrdinal,
        sessionId: catalog.sessionId,
        sessionRunId: slot.sessionRunId,
        runKindClaim: slot.runKindClaim,
        taskOrdinal: slot.taskOrdinal,
        taskId: slot.taskId,
        activityId: slot.activityId,
        disposition: skipped ? "skipped" : "completed",
        learnerAttempts,
        hintUsed,
        sourceAttemptRef: learnerAttempts === 0 && !hintUsed
          ? null
          : request.attemptRef,
      });
      const processedOperations = Object.fromEntries(
        Object.values(progressState.terminalTasks).map((entry) => [
          entry.operationId,
          entry.candidateFingerprint,
        ]),
      );
      const reduction = reduceRequiredTaskSettlement(
        progressState,
        candidate,
        catalog,
        processedOperations,
      );
      const writes: Array<{
        ref: FirebaseFirestore.DocumentReference;
        value: FirebaseFirestore.DocumentData;
        create: boolean;
      }> = [
        { ref: runRef, value: reduction.state as unknown as FirebaseFirestore.DocumentData, create: !runSnapshot.exists },
        {
          ref: taskRef,
          create: !taskSnapshot.exists,
          value: {
            ...priorTask,
            learnerAttempts,
            hintUsed,
            terminalCandidateFingerprint: candidate.candidateFingerprint,
            lastAttemptRef: request.attemptRef,
          },
        },
      ];
      if (reduction.taskSlotsSettledCandidate) {
        const settled = reduction.taskSlotsSettledCandidate;
        const settledRef = db.doc(
          `users/${stableOwner(options.stableUid)}/v2_required_session_settlements/${settled.candidateFingerprint}`,
        );
        const settledSnapshot = await transaction.get(settledRef);
        const value = {
          schemaVersion: "learning-v2-required-session-settled-projection.v1",
          accountStableUid: options.stableUid,
          economicAccountScopeHash,
          accountGeneration: options.accountGeneration,
          catalogFingerprint: catalog.catalogFingerprint,
          candidate: settled,
          candidateFingerprint: settled.candidateFingerprint,
        };
        if (settledSnapshot.exists &&
          hashCanonicalBody(settledSnapshot.data()) !== hashCanonicalBody(value)) {
          throw new Error("required_session_settlement_conflict");
        }
        if (!settledSnapshot.exists) {
          writes.push({ ref: settledRef, value, create: true });
        }
      }
      preparedRequiredSessionWrites = writes;
    },
    writeRequiredSessionProgress: async () => {
      if (!preparedRequiredSessionWrites) {
        throw new Error("required_session_progress_plan_required");
      }
      for (const write of preparedRequiredSessionWrites) {
        if (write.create) transaction.create(write.ref, write.value);
        else transaction.set(write.ref, write.value, { merge: false });
      }
    },
    prepareTransactionPlan: async (request, materialized, projection, trustedScoreResolution) => {
      if (!pinnedRequest) throw new Error("progress_pin_validation_required");
      if (request.requiredSessionTaskRef && !pinnedRequiredSessionCatalog) {
        throw new Error("required_session_catalog_validation_required");
      }
      const projectionRef = db.doc(projectionPath(options.stableUid, serverScopeHash, request.seasonRevisionId, request.episodeRevisionRef.episodeId, projection.starSlotId));
      const projectionSnapshot = await transaction.get(projectionRef);
      projectionExists = projectionSnapshot.exists;
      const existingProjection = projectionSnapshot.exists ? readStoredProjection(projectionSnapshot.data(), request) : undefined;
      const existingIndex: Record<string, any> = {};
      for (const ref of materialized.refs) {
        const evidenceSnapshot = await transaction.get(db.doc(evidencePath(options.stableUid, serverScopeHash, request.seasonRevisionId, request.episodeRevisionRef.episodeId, ref.tupleKey)));
        if (evidenceSnapshot.exists) { existingEvidenceKeys.add(ref.tupleKey); existingIndex[ref.tupleKey] = evidenceSnapshot.data()?.ref; }
      }
      preparedPlan = prepareProgressTransactionPlan({ existingEvidenceIndex: existingIndex, existingBestStars: existingProjection?.performanceStars, materialized, projection, trustedScoreResolution });
    },
    writeEvidenceMaterialization: async (request, materialized: MaterializedProgressEvidence) => {
      if (!pinnedRequest) throw new Error("progress_pin_validation_required");
      for (const ref of materialized.refs) {
        if (existingEvidenceKeys.has(ref.tupleKey)) continue;
        const tupleKey = ref.tupleKey;
        transaction.create(db.doc(evidencePath(options.stableUid, serverScopeHash, request.seasonRevisionId, request.episodeRevisionRef.episodeId, tupleKey)), { schemaVersion: "v2-progress-evidence-ref.v1", accountStableUid: options.stableUid, accountGeneration: options.accountGeneration, accountScopeHash: serverScopeHash, seasonRevisionId: request.seasonRevisionId, episodeId: request.episodeRevisionRef.episodeId, tupleKey, ref, componentFingerprint: materialized.componentFingerprint });
      }
    },
    writeProgressProjection: async (request, projection: ProgressProjection) => {
      if (!pinnedRequest) throw new Error("progress_pin_validation_required");
      if (!preparedPlan) throw new Error("progress_transaction_plan_required");
      if (!preparedPlan.applyProjection) return;
      const ref = db.doc(projectionPath(options.stableUid, serverScopeHash, request.seasonRevisionId, request.episodeRevisionRef.episodeId, projection.starSlotId));
      const value = { schemaVersion: "v2-progress-projection.v1", accountStableUid: options.stableUid, accountGeneration: options.accountGeneration, accountScopeHash: serverScopeHash, seasonRevisionId: request.seasonRevisionId, episodeId: request.episodeRevisionRef.episodeId, projection };
      if (projectionExists) transaction.set(ref, value, { merge: false }); else transaction.create(ref, value);
    },
    readOperation: async (idempotencyKey, seasonRevisionId) => {
      if (!seasonRevisionId) throw new Error("progress_season_scope_required");
      const snapshot = await get(operationPath(options.stableUid, serverScopeHash, seasonRevisionId, idempotencyKey));
      return snapshot.exists ? snapshot.data() as ProgressEventOperation : undefined;
    },
    reconcileReplay: async (request, materialized, operation) => {
      if (!pinnedRequest) throw new Error("progress_pin_validation_required");
      if (!isValidProgressProjection(operation.projection) || !sameProjectionIdentity(operation.projection, {
        ...operation.projection,
        starSlotId: request.projection.starSlotId,
        activityId: request.projection.activityId,
        progressCompatibilityKey: request.projection.progressCompatibilityKey,
      }) || operation.effectiveProjectionFingerprint !== deriveEffectiveProjectionFingerprint(
        operation.attemptBodyHash,
        operation.componentFingerprint,
        operation.projection,
      )) throw new Error("v2_progress_replay_projection_conflict");

      const projectionRef = db.doc(projectionPath(options.stableUid, serverScopeHash, request.seasonRevisionId, request.episodeRevisionRef.episodeId, operation.projection.starSlotId));
      const projectionSnapshot = await transaction.get(projectionRef);
      const projectionEnvelope = projectionSnapshot.data();
      if (projectionSnapshot.exists && (
        !isRecord(projectionEnvelope) || !hasExactKeys(projectionEnvelope, ["schemaVersion", "accountStableUid", "accountGeneration", "accountScopeHash", "seasonRevisionId", "episodeId", "projection"]) ||
        projectionEnvelope.schemaVersion !== "v2-progress-projection.v1" || projectionEnvelope.accountStableUid !== options.stableUid || projectionEnvelope.accountGeneration !== options.accountGeneration ||
        projectionEnvelope.accountScopeHash !== serverScopeHash || projectionEnvelope.seasonRevisionId !== request.seasonRevisionId || projectionEnvelope.episodeId !== request.episodeRevisionRef.episodeId || !isValidProgressProjection(projectionEnvelope.projection) ||
        !sameProjectionIdentity(projectionEnvelope.projection, operation.projection) || projectionEnvelope.projection.performanceStars < operation.projection.performanceStars
      )) {
        throw new Error("v2_progress_replay_projection_conflict");
      }

      const attemptRef = db.doc(attemptPath(options.stableUid, serverScopeHash, request.seasonRevisionId, request.episodeRevisionRef.episodeId, request.attemptRef.opId));
      const attemptSnapshot = await transaction.get(attemptRef);
      const expectedAttempt: ProgressAttemptRecord = {
        schemaVersion: "v2-progress-attempt.v3",
        attemptBodyHash: request.attemptRef.attemptBodyHash,
        componentFingerprint: materialized.componentFingerprint,
        requiredSessionTaskFingerprint: request.requiredSessionTaskRef
          ? hashCanonicalBody(request.requiredSessionTaskRef)
          : null,
        requiredSessionResponseFingerprint: request.requiredSessionAnswerResponse
          ? requiredSessionTaskAnswerResponseFingerprint(request.requiredSessionAnswerResponse)
          : null,
        effectiveProjectionFingerprint: operation.effectiveProjectionFingerprint,
        projection: operation.projection,
      };
      if (attemptSnapshot.exists) {
        const attempt = attemptSnapshot.data();
        if (!isRecord(attempt) || hashCanonicalBody(attempt) !== hashCanonicalBody(expectedAttempt)) throw new Error("v2_progress_replay_attempt_conflict");
      }

      const missingEvidence: Array<{ readonly ref: FirebaseFirestore.DocumentReference; readonly value: FirebaseFirestore.DocumentData }> = [];
      for (const ref of materialized.refs) {
        const documentRef = db.doc(evidencePath(options.stableUid, serverScopeHash, request.seasonRevisionId, request.episodeRevisionRef.episodeId, ref.tupleKey));
        const snapshot = await transaction.get(documentRef);
        const value = { schemaVersion: "v2-progress-evidence-ref.v1", accountStableUid: options.stableUid, accountGeneration: options.accountGeneration, accountScopeHash: serverScopeHash, seasonRevisionId: request.seasonRevisionId, episodeId: request.episodeRevisionRef.episodeId, tupleKey: ref.tupleKey, ref, componentFingerprint: materialized.componentFingerprint };
        if (!snapshot.exists) {
          missingEvidence.push({ ref: documentRef, value });
          continue;
        }
        const existing = snapshot.data();
        if (!isRecord(existing) || !hasExactKeys(existing, ["schemaVersion", "accountStableUid", "accountGeneration", "accountScopeHash", "seasonRevisionId", "episodeId", "tupleKey", "ref", "componentFingerprint"]) ||
          existing.schemaVersion !== value.schemaVersion || existing.accountStableUid !== value.accountStableUid || existing.accountGeneration !== value.accountGeneration || existing.accountScopeHash !== value.accountScopeHash ||
          existing.seasonRevisionId !== value.seasonRevisionId || existing.episodeId !== value.episodeId || existing.tupleKey !== value.tupleKey || existing.componentFingerprint !== value.componentFingerprint ||
          !isRecord(existing.ref) || hashCanonicalBody(existing.ref) !== hashCanonicalBody(value.ref)) throw new Error("v2_progress_replay_evidence_conflict");
      }

      if (!projectionSnapshot.exists) {
        transaction.create(projectionRef, {
          schemaVersion: "v2-progress-projection.v1",
          accountStableUid: options.stableUid,
          accountGeneration: options.accountGeneration,
          accountScopeHash: serverScopeHash,
          seasonRevisionId: request.seasonRevisionId,
          episodeId: request.episodeRevisionRef.episodeId,
          projection: operation.projection,
        });
      }
      if (!attemptSnapshot.exists) transaction.create(attemptRef, expectedAttempt as unknown as FirebaseFirestore.DocumentData);
      for (const missing of missingEvidence) transaction.create(missing.ref, missing.value);
    },
    createOperation: async (idempotencyKey, operation) => {
      if (!pinnedRequest) throw new Error("progress_pin_validation_required");
      transaction.create(db.doc(operationPath(options.stableUid, serverScopeHash, pinnedRequest.seasonRevisionId, idempotencyKey)), operation as unknown as FirebaseFirestore.DocumentData);
    },
    readAttempt: async (scope, opId) => {
      if (!pinnedRequest) throw new Error("progress_pin_validation_required");
      assertProgressAccountScope(scope, serverScopeHash);
      const snapshot = await get(attemptPath(options.stableUid, serverScopeHash, pinnedRequest.seasonRevisionId, pinnedRequest.episodeRevisionRef.episodeId, opId));
      return snapshot.exists ? snapshot.data() as ProgressAttemptRecord : undefined;
    },
    writeAttempt: async (scope, opId, attempt) => {
      if (!pinnedRequest) throw new Error("progress_pin_validation_required");
      assertProgressAccountScope(scope, serverScopeHash);
      transaction.create(db.doc(attemptPath(options.stableUid, serverScopeHash, pinnedRequest.seasonRevisionId, pinnedRequest.episodeRevisionRef.episodeId, opId)), attempt as unknown as FirebaseFirestore.DocumentData);
    },
  };
};

export const createFirestoreProgressEventStore = (options: FirestoreProgressEventStoreOptions): ProgressEventStore => ({
  runTransaction: async <T>(work: (tx: ProgressEventStore) => Promise<T>) => options.db.runTransaction(async (transaction) => {
    await assertLiveTransactionBinding(options, transaction);
    return work(txStore(options, transaction));
  }),
  resolveDelayedEvidence: async () => { throw new Error("progress_transaction_required"); },
  validatePinnedScope: async () => { throw new Error("progress_transaction_required"); },
  reconcileReplay: async () => { throw new Error("progress_transaction_required"); },
  resolveServerProjection: undefined,
  prepareTransactionPlan: async () => { throw new Error("progress_transaction_required"); },
  writeEvidenceMaterialization: async () => { throw new Error("progress_transaction_required"); },
  writeProgressProjection: async () => { throw new Error("progress_transaction_required"); },
  readOperation: async () => { throw new Error("progress_transaction_required"); },
  createOperation: async () => { throw new Error("progress_transaction_required"); },
  readAttempt: async () => { throw new Error("progress_transaction_required"); },
  writeAttempt: async () => { throw new Error("progress_transaction_required"); },
});
