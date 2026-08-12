jest.mock("../content_studio/season_revision_resolver", () => ({
  resolveImmutableSeasonRevision: jest.fn(async () => ({ record: { seasonId: "season-1" }, lifecycle: { status: "approved" }, body: { episodeRevisionRefs: [{ draftId: "draft-1", episodeId: "episode-1", revision: 1, revisionFingerprint: "b".repeat(64), contentHash: "c".repeat(64), ordinal: 1, chapterId: "chapter-1", approvalStatus: "approved" }] } })),
  createStorageSeasonRevisionObjectReader: jest.fn(),
}));
jest.mock("../content_studio/firestore_authoring_store", () => ({
  createFirestoreEpisodeRevisionResolver: jest.fn(() => ({})),
}));
jest.mock("../content_studio/episode_revision_resolver", () => ({
  assertExactImmutableEpisodeRevision: jest.fn(async (_resolver: unknown, ref: any) => ({ ...ref, approvalStatus: "approved", body: {}, bodyHash: ref.contentHash, objectPath: "object", objectGeneration: "1", record: {}, lifecycle: {} })),
}));

import { applyProgressEvent } from "./progress_event";
import {
  createFirestoreProgressEventStore,
  progressAttemptDocumentId,
  progressOperationDocumentId,
  publishedRequiredSessionSetDocumentId,
} from "./firestore_progress_event_store";
import { publishedRequiredSessionAnswerManifestDocumentId } from "../content_factory/v2_required_session_publication";
import {
  createPublishedRequiredSessionAnswerManifest,
  materializeRequiredSessionTaskAnswerKey,
  type ServerVerifiableRequiredSessionFamily,
} from "./required_session_answer_verifier";
import { deriveProgressAccountScopeHash } from "./progress_event";
import { buildCanonicalAttemptRef } from "../../../modules/learning-v2/contracts/attempt";
import { resolveImmutableSeasonRevision } from "../content_studio/season_revision_resolver";
import { assertExactImmutableEpisodeRevision } from "../content_studio/episode_revision_resolver";
import { resolveServerScore } from "./server_score_resolver";
import {
  buildE1DemoActivityBindings,
  buildE1DemoItems,
  buildE1DemoProfile,
} from "../../../modules/learning-v2/content/e1_demo_bank";
import { compileV2RequiredSessions } from "../../../modules/learning-v2/content/session_compiler";
import { createPublishedRequiredSessionSet } from "../../../modules/learning-v2/contracts/required_session_progress";
import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";

const body = { schemaVersion: "v2-attempt-body.v1", opId: "adapter-attempt-1", attemptSurface: { kind: "episode_graph_node" }, outcome: { resultCode: "CORRECT" }, evidence: { hintsUsed: 0 }, provenance: { phase: "near_transfer" }, inputBinding: { source: "keyboard" }, learningTupleDispositions: [] } as const;
const attemptRef = buildCanonicalAttemptRef(body);
const request = { accountScopeHash: deriveProgressAccountScopeHash("stable-a", 1), seasonId: "season-1", studyTarget: "en", learnerSourceLocale: "ru", seasonRevisionId: "season-rev-1", episodeRevisionRef: { draftId: "draft-1", episodeId: "episode-1", revision: 1, revisionFingerprint: "b".repeat(64), contentHash: "c".repeat(64), ordinal: 1, chapterId: "chapter-1", approvalStatus: "approved" as const }, idempotencyKey: "adapter-op-1", attemptBody: body, attemptRef, evidenceBundle: { schemaVersion: "v2-progress-evidence-bundle.v1" as const, attemptRef, evidenceBodies: [], nonAssessmentBodies: [] }, projection: { starSlotId: "slot-1", previousBestStars: 0, candidateStars: 0, activityId: "activity-1", progressCompatibilityKey: "compat-1" } };

const authUidFor = (stableUid: string): string => `auth-${deriveProgressAccountScopeHash(stableUid, 1)}`;
const identitySnapshot = (path: string) => {
  for (const stableUid of ["stable-a", "a/b", "a_b"]) {
    if (path === `auth_links/${authUidFor(stableUid)}`) return { exists: true, data: () => ({ stable_id: stableUid }) };
    if (path === `users/${stableUid}`) return { exists: true, data: () => ({ accountGeneration: 1 }) };
    if (path === `account_deletion_tombstones/${stableUid}`) return { exists: false, data: () => undefined };
  }
  return undefined;
};
const storeOptions = (db: any, stableUid: string) => ({
  db,
  authUid: authUidFor(stableUid),
  stableUid,
  accountGeneration: 1,
  accountScopeHash: deriveProgressAccountScopeHash(stableUid, 1),
  episodeResolver: {} as any,
  seasonObjectReader: { read: async () => ({ body: {}, contentHash: "c".repeat(64), objectGeneration: "1", byteSize: 1 }) },
});
const serverVerifiableRequiredSessionFamilies = new Set([
  "phrase_builder",
  "listen_choose",
  "sound_contrast",
  "listen_build_dictation",
  "context_gap_grammar",
  "speed_match",
]);

const requiredSessionFixture = () => {
  const compiled = compileV2RequiredSessions({
    episodeId: "episode-1",
    canDoOutcomeId: "obj-introduce-self",
    profile: buildE1DemoProfile(),
    items: buildE1DemoItems().map((item) => ({ ...item, episodeId: "episode-1" as never })),
    activityBindings: buildE1DemoActivityBindings(),
  });
  const sessionSet = {
    schemaVersion: "v2-session-set.v2" as const,
    episodeId: "episode-1" as never,
    version: 1,
    sessions: compiled.sessions.map(({ support: _support, ...session }) => session),
    optionalPracticeSlots: [],
  };
  const publication = createPublishedRequiredSessionSet({
    schemaVersion: "learning-v2-published-required-session-set.v1",
    courseId: "english-core",
    studyTarget: "en",
    courseReleaseId: "release-1",
    seasonRevisionId: "season-rev-1",
    episodeRevisionFingerprint: "b".repeat(64),
    episodeContentHash: "c".repeat(64),
    sessionSetId: "episode-1-session-set-1",
    sessionSetHash: hashCanonicalBody(sessionSet),
    sessionSet,
  });
  const answerKeys = sessionSet.sessions.flatMap((session) => session.cards
    .filter((entry) => serverVerifiableRequiredSessionFamilies.has(entry.family))
    .map((entry) => materializeRequiredSessionTaskAnswerKey({
      taskId: entry.cardId,
      activityId: entry.activityId,
      family: entry.family,
      expectedAnswer: `expected-${entry.cardId}`,
    })));
  const answerManifest = createPublishedRequiredSessionAnswerManifest({
    schemaVersion: "learning-v2-published-required-session-answer-manifest.v1",
    courseId: publication.courseId,
    studyTarget: publication.studyTarget,
    courseReleaseId: publication.courseReleaseId,
    seasonRevisionId: publication.seasonRevisionId,
    episodeRevisionFingerprint: publication.episodeRevisionFingerprint,
    episodeContentHash: publication.episodeContentHash,
    sessionSetId: publication.sessionSetId,
    sessionSetHash: publication.sessionSetHash,
    answerKeys,
  });
  const card = sessionSet.sessions[0].cards[0];
  if (!serverVerifiableRequiredSessionFamilies.has(card.family)) {
    throw new Error("required_session_test_first_card_not_server_verifiable");
  }
  const requiredRequest = {
    ...request,
    idempotencyKey: "required-session-adapter-op-1",
    projection: {
      ...request.projection,
      starSlotId: card.cardId,
      activityId: card.activityId,
    },
    requiredSessionTaskRef: {
      schemaVersion: "learning-v2-required-session-task-slot-ref.v1" as const,
      courseId: publication.courseId,
      courseReleaseId: publication.courseReleaseId,
      sessionSetId: publication.sessionSetId,
      sessionSetHash: publication.sessionSetHash,
      requiredSessionOrdinal: 1,
      sessionId: sessionSet.sessions[0].sessionId,
      sessionRunId: "required-session-run-1",
      runKindClaim: "initial" as const,
      taskOrdinal: 1,
      taskId: card.cardId,
      activityId: card.activityId,
    },
    requiredSessionAnswerResponse: {
      schemaVersion: "learning-v2-required-session-task-answer-response.v1" as const,
      taskId: card.cardId,
      activityId: card.activityId,
      family: card.family as ServerVerifiableRequiredSessionFamily,
      submittedAnswer: `expected-${card.cardId}`,
    },
  };
  return { answerManifest, publication, requiredRequest, sessionSet };
};

const requiredAttemptRequest = (
  base: ReturnType<typeof requiredSessionFixture>["requiredRequest"],
  card: ReturnType<typeof requiredSessionFixture>["sessionSet"]["sessions"][number]["cards"][number],
  taskOrdinal: number,
  opId: string,
  resultCode: "CORRECT" | "WRONG" | "SKIPPED" | "INVALID_AUDIO_OR_SYSTEM",
  hintsUsed = 0,
) => {
  const attemptBody = {
    ...body,
    opId,
    outcome: { resultCode },
    evidence: { hintsUsed },
  } as const;
  const submittedAttemptRef = buildCanonicalAttemptRef(attemptBody);
  const hasServerAnswer = serverVerifiableRequiredSessionFamilies.has(card.family) &&
    (resultCode === "CORRECT" || resultCode === "WRONG");
  return {
    ...base,
    idempotencyKey: `required-${opId}`,
    attemptBody,
    attemptRef: submittedAttemptRef,
    evidenceBundle: {
      ...base.evidenceBundle,
      attemptRef: submittedAttemptRef,
    },
    projection: {
      ...base.projection,
      starSlotId: card.cardId,
      activityId: card.activityId,
    },
    requiredSessionTaskRef: {
      ...base.requiredSessionTaskRef,
      taskOrdinal,
      taskId: card.cardId,
      activityId: card.activityId,
    },
    ...(hasServerAnswer ? {
      requiredSessionAnswerResponse: {
        schemaVersion: "learning-v2-required-session-task-answer-response.v1" as const,
        taskId: card.cardId,
        activityId: card.activityId,
        family: card.family as ServerVerifiableRequiredSessionFamily,
        submittedAnswer: resultCode === "CORRECT"
          ? `expected-${card.cardId}`
          : `wrong-${card.cardId}`,
      },
    } : {}),
  };
};

describe("Firestore progress adapter transaction ordering", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    (resolveImmutableSeasonRevision as jest.Mock).mockImplementation(async () => ({ record: { seasonId: "season-1" }, lifecycle: { status: "approved" }, body: { episodeRevisionRefs: [{ draftId: "draft-1", episodeId: "episode-1", revision: 1, revisionFingerprint: "b".repeat(64), contentHash: "c".repeat(64), ordinal: 1, chapterId: "chapter-1", approvalStatus: "approved" }] } }));
    (assertExactImmutableEpisodeRevision as jest.Mock).mockImplementation(async (_resolver: unknown, ref: any) => ({ ...ref, approvalStatus: "approved", body: {}, bodyHash: ref.contentHash, objectPath: "object", objectGeneration: "1", record: {}, lifecycle: {} }));
  });

  it("reads canonical and projection/index state before issuing writes", async () => {
    const events: string[] = [];
    const db: any = { doc: (path: string) => ({ path }), runTransaction: async (work: any) => work({ get: async (ref: any) => { events.push(`read:${ref.path}`); return identitySnapshot(ref.path) ?? { exists: false, data: () => undefined }; }, create: (ref: any) => { events.push(`create:${ref.path}`); }, set: (ref: any) => { events.push(`set:${ref.path}`); } }) };
    const store = createFirestoreProgressEventStore(storeOptions(db, "stable-a"));
    await applyProgressEvent(store, request);
    const firstWrite = events.findIndex((event) => event.startsWith("create:") || event.startsWith("set:"));
    expect(firstWrite).toBeGreaterThanOrEqual(0);
    expect(events.slice(0, firstWrite).every((event) => event.startsWith("read:"))).toBe(true);
    expect(events.filter((event) => event.startsWith("create:")).length).toBeGreaterThanOrEqual(3);
  });

  it("resolves the server-published session-set and rejects client slot substitution before writes", async () => {
    const { answerManifest, publication, requiredRequest, sessionSet } = requiredSessionFixture();
    const documents = new Map<string, unknown>([
      [
        `content_v2_required_session_sets/${publishedRequiredSessionSetDocumentId(publication.sessionSetId)}`,
        publication,
      ],
      [
        `content_v2_required_session_answer_manifests/${publishedRequiredSessionAnswerManifestDocumentId(publication.sessionSetId)}`,
        answerManifest,
      ],
    ]);
    const writes: string[] = [];
    const db: any = {
      doc: (path: string) => ({ path }),
      runTransaction: async (work: any) => work({
        get: async (ref: any) => documents.has(ref.path)
          ? { exists: true, data: () => documents.get(ref.path) }
          : identitySnapshot(ref.path) ?? { exists: false, data: () => undefined },
        create: (ref: any, value: unknown) => { writes.push(ref.path); documents.set(ref.path, value); },
        set: (ref: any, value: unknown) => { writes.push(ref.path); documents.set(ref.path, value); },
      }),
    };
    const options = storeOptions(db, "stable-a") as any;
    options.resolveServerScore = ({ request: submitted, attemptRef: submittedAttemptRef, evidence }: any) => resolveServerScore({
      attemptRef: submittedAttemptRef,
      activityId: submitted.projection.activityId,
      starSlotId: submitted.projection.starSlotId,
      progressCompatibilityKey: submitted.projection.progressCompatibilityKey,
      scoringPolicyRef: { kind: "scoring", key: "policy.scoring.core", version: 1, contentHash: "a".repeat(64) },
      resultCode: submitted.attemptBody.outcome.resultCode,
      evidenceComponentFingerprint: evidence.componentFingerprint,
    }, (input) => input.resultCode === "CORRECT" ? 3 : 0);
    const store = createFirestoreProgressEventStore(options);
    await expect(applyProgressEvent(store, requiredRequest)).resolves.toMatchObject({ duplicate: false });
    expect(writes.length).toBeGreaterThan(0);
    for (let index = 1; index < 12; index += 1) {
      await expect(applyProgressEvent(store, requiredAttemptRequest(
        requiredRequest,
        sessionSet.sessions[0].cards[index],
        index + 1,
        `required-attempt-${index + 1}`,
        "CORRECT",
      ))).resolves.toMatchObject({ duplicate: false });
    }
    const runState = [...documents.entries()].find(([path]) =>
      path.includes("/v2_required_session_runs/"))?.[1] as any;
    expect(runState).toMatchObject({ revision: 12 });
    expect(Object.keys(runState.terminalTasks)).toHaveLength(12);
    const settlement = [...documents.entries()].find(([path]) =>
      path.includes("/v2_required_session_settlements/"))?.[1] as any;
    expect(settlement).toMatchObject({
      schemaVersion: "learning-v2-required-session-settled-projection.v1",
      candidate: { projectedBasePerformanceStars: 36 },
    });

    const writesBefore = writes.length;
    await expect(applyProgressEvent(store, {
      ...requiredRequest,
      idempotencyKey: "required-session-adapter-op-2",
      requiredSessionTaskRef: {
        ...requiredRequest.requiredSessionTaskRef,
        taskId: "substituted-task",
      },
      projection: {
        ...requiredRequest.projection,
        starSlotId: "substituted-task",
      },
      requiredSessionAnswerResponse: {
        ...requiredRequest.requiredSessionAnswerResponse,
        taskId: "substituted-task",
      },
    })).rejects.toThrow("required_session_catalog_mismatch");
    expect(writes).toHaveLength(writesBefore);
  });

  it("counts server-accepted attempts and awards two stars after one learner error", async () => {
    const { answerManifest, publication, requiredRequest, sessionSet } = requiredSessionFixture();
    const documents = new Map<string, unknown>([
      [
        `content_v2_required_session_sets/${publishedRequiredSessionSetDocumentId(publication.sessionSetId)}`,
        publication,
      ],
      [
        `content_v2_required_session_answer_manifests/${publishedRequiredSessionAnswerManifestDocumentId(publication.sessionSetId)}`,
        answerManifest,
      ],
    ]);
    const db: any = {
      doc: (path: string) => ({ path }),
      runTransaction: async (work: any) => work({
        get: async (ref: any) => documents.has(ref.path)
          ? { exists: true, data: () => documents.get(ref.path) }
          : identitySnapshot(ref.path) ?? { exists: false, data: () => undefined },
        create: (ref: any, value: unknown) => {
          if (documents.has(ref.path)) throw new Error("already-exists");
          documents.set(ref.path, value);
        },
        set: (ref: any, value: unknown) => documents.set(ref.path, value),
      }),
    };
    const options = storeOptions(db, "stable-a") as any;
    options.resolveServerScore = ({ request: submitted, attemptRef: submittedAttemptRef, evidence }: any) => resolveServerScore({
      attemptRef: submittedAttemptRef,
      activityId: submitted.projection.activityId,
      starSlotId: submitted.projection.starSlotId,
      progressCompatibilityKey: submitted.projection.progressCompatibilityKey,
      scoringPolicyRef: { kind: "scoring", key: "policy.scoring.core", version: 1, contentHash: "a".repeat(64) },
      resultCode: submitted.attemptBody.outcome.resultCode,
      evidenceComponentFingerprint: evidence.componentFingerprint,
    }, (input) => input.resultCode === "CORRECT" ? 3 : 0);
    const store = createFirestoreProgressEventStore(options);
    const firstCard = sessionSet.sessions[0].cards[0];
    await applyProgressEvent(store, requiredAttemptRequest(
      requiredRequest, firstCard, 1, "required-wrong-1", "WRONG",
    ));
    await applyProgressEvent(store, requiredAttemptRequest(
      requiredRequest, firstCard, 1, "required-correct-2", "CORRECT",
    ));
    const taskState = [...documents.entries()].find(([path]) =>
      path.includes("/v2_required_session_task_attempts/"))?.[1] as any;
    const runState = [...documents.entries()].find(([path]) =>
      path.includes("/v2_required_session_runs/"))?.[1] as any;
    expect(taskState).toMatchObject({ learnerAttempts: 2, hintUsed: false });
    expect(runState.terminalTasks["1"]).toMatchObject({
      disposition: "completed",
      learnerAttempts: 2,
      projectedStars: 2,
      projectedCountsAsLearnerError: true,
    });
  });

  it("rejects an applyProgressEvent replay after deletion before returning duplicate", async () => {
    const documents = new Map<string, any>();
    const reads: string[] = [];
    const writes: string[] = [];
    const db: any = {
      doc: (path: string) => ({ path }),
      runTransaction: async (work: any) => work({
        get: async (ref: any) => {
          reads.push(ref.path);
          if (documents.has(ref.path)) return { exists: true, data: () => documents.get(ref.path) };
          return identitySnapshot(ref.path) ?? { exists: false, data: () => undefined };
        },
        create: (ref: any, value: unknown) => {
          writes.push(`create:${ref.path}`);
          documents.set(ref.path, value);
        },
        set: (ref: any, value: unknown) => {
          writes.push(`set:${ref.path}`);
          documents.set(ref.path, value);
        },
      }),
    };
    const scope = deriveProgressAccountScopeHash("stable-a", 1);
    const operationPath = `users/stable-a/v2_progress_ops/${progressOperationDocumentId(scope, "season-rev-1", "adapter-op-1")}`;
    const attemptPath = `users/stable-a/v2_progress_attempts/${progressAttemptDocumentId(scope, "season-rev-1", "episode-1", "adapter-attempt-1")}`;
    const store = createFirestoreProgressEventStore(storeOptions(db, "stable-a"));

    await expect(applyProgressEvent(store, request)).resolves.toMatchObject({ duplicate: false });
    expect(documents.has(operationPath)).toBe(true);
    expect(documents.has(attemptPath)).toBe(true);

    documents.set("account_deletion_tombstones/stable-a", { status: "complete" });
    const readsBeforeReplay = reads.length;
    const writesBeforeReplay = writes.length;

    await expect(applyProgressEvent(store, request)).rejects.toThrow("account_delete_pending");
    expect(reads.slice(readsBeforeReplay)).toEqual([
      `auth_links/${authUidFor("stable-a")}`,
      "users/stable-a",
      "account_deletion_tombstones/stable-a",
    ]);
    expect(writes).toHaveLength(writesBeforeReplay);
  });

  it("restores missing normal replay artifacts under the canonical stable owner root", async () => {
    const documents = new Map<string, any>();
    const db: any = {
      doc: (path: string) => ({ path }),
      runTransaction: async (work: any) => work({
        get: async (ref: any) => {
          if (documents.has(ref.path)) return { exists: true, data: () => documents.get(ref.path) };
          return identitySnapshot(ref.path) ?? { exists: false, data: () => undefined };
        },
        create: (ref: any, value: unknown) => {
          if (documents.has(ref.path)) throw new Error("already-exists");
          documents.set(ref.path, value);
        },
        set: (ref: any, value: unknown) => documents.set(ref.path, value),
      }),
    };
    const scope = deriveProgressAccountScopeHash("stable-a", 1);
    const projectionPath = `users/stable-a/v2_progress/${scope}/seasons/season-rev-1/episodes/episode-1/slots/slot-1`;
    const attemptPath = `users/stable-a/v2_progress_attempts/${progressAttemptDocumentId(scope, "season-rev-1", "episode-1", "adapter-attempt-1")}`;
    const store = createFirestoreProgressEventStore(storeOptions(db, "stable-a"));

    await expect(applyProgressEvent(store, request)).resolves.toMatchObject({ duplicate: false });
    documents.delete(projectionPath);
    documents.delete(attemptPath);

    await expect(applyProgressEvent(store, request)).resolves.toMatchObject({ duplicate: true });
    expect(documents.get(projectionPath)).toMatchObject({
      accountStableUid: "stable-a",
      accountScopeHash: scope,
      projection: { starSlotId: "slot-1" },
    });
    expect(documents.get(attemptPath)).toMatchObject({
      attemptBodyHash: request.attemptRef.attemptBodyHash,
      effectiveProjectionFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
  });

  it("fails closed on a corrupt normal replay attempt artifact", async () => {
    const documents = new Map<string, any>();
    const db: any = {
      doc: (path: string) => ({ path }),
      runTransaction: async (work: any) => work({
        get: async (ref: any) => {
          if (documents.has(ref.path)) return { exists: true, data: () => documents.get(ref.path) };
          return identitySnapshot(ref.path) ?? { exists: false, data: () => undefined };
        },
        create: (ref: any, value: unknown) => documents.set(ref.path, value),
        set: (ref: any, value: unknown) => documents.set(ref.path, value),
      }),
    };
    const scope = deriveProgressAccountScopeHash("stable-a", 1);
    const attemptPath = `users/stable-a/v2_progress_attempts/${progressAttemptDocumentId(scope, "season-rev-1", "episode-1", "adapter-attempt-1")}`;
    const store = createFirestoreProgressEventStore(storeOptions(db, "stable-a"));
    await applyProgressEvent(store, request);
    documents.set(attemptPath, {
      ...documents.get(attemptPath),
      attemptBodyHash: "f".repeat(64),
    });

    await expect(applyProgressEvent(store, request))
      .rejects.toThrow("v2_progress_replay_attempt_conflict");
  });

  it("rejects an archived Season before issuing any progress writes", async () => {
    const events: string[] = [];
    (resolveImmutableSeasonRevision as jest.Mock).mockResolvedValue({
      record: { seasonId: "season-1" },
      lifecycle: { status: "archived" },
      body: { episodeRevisionRefs: [request.episodeRevisionRef] },
    });
    const db: any = { doc: (path: string) => ({ path }), runTransaction: async (work: any) => work({ get: async (ref: any) => { events.push(`read:${ref.path}`); return identitySnapshot(ref.path) ?? { exists: false, data: () => undefined }; }, create: () => { events.push("create"); }, set: () => { events.push("set"); } }) };
    const store = createFirestoreProgressEventStore(storeOptions(db, "stable-a"));
    await expect(applyProgressEvent(store, { ...request, idempotencyKey: "archived-op-1" })).rejects.toThrow("v2_progress_season_not_approved_or_stale");
    expect(events.some((event) => event === "create" || event === "set")).toBe(false);
  });

  it("rejects a cross-account scope before resolving canonical pins", async () => {
    const db: any = { doc: (path: string) => ({ path }), runTransaction: async (work: any) => work({ get: async (ref: any) => identitySnapshot(ref.path) ?? ({ exists: false, data: () => undefined }), create: () => { throw new Error("unexpected_write"); }, set: () => { throw new Error("unexpected_write"); } }) };
    const store = createFirestoreProgressEventStore(storeOptions(db, "stable-a"));
    await expect(applyProgressEvent(store, { ...request, accountScopeHash: deriveProgressAccountScopeHash("stable-b", 1), idempotencyKey: "cross-account-op-1" })).rejects.toThrow("v2_progress_account_scope_mismatch");
    expect(resolveImmutableSeasonRevision).not.toHaveBeenCalled();
  });

  it("rejects an episode revision that does not match the canonical artifact", async () => {
    const db: any = { doc: (path: string) => ({ path }), runTransaction: async (work: any) => work({ get: async (ref: any) => identitySnapshot(ref.path) ?? ({ exists: false, data: () => undefined }), create: () => { throw new Error("unexpected_write"); }, set: () => { throw new Error("unexpected_write"); } }) };
    (assertExactImmutableEpisodeRevision as jest.Mock).mockResolvedValue({ ...request.episodeRevisionRef, approvalStatus: "approved", contentHash: "d".repeat(64), revisionFingerprint: "e".repeat(64) });
    const store = createFirestoreProgressEventStore(storeOptions(db, "stable-a"));
    await expect(applyProgressEvent(store, { ...request, idempotencyKey: "episode-substitution-op-1" })).rejects.toThrow("v2_progress_episode_not_canonical");
  });

  it.each(["without a scorer", "with a scorer"])("rejects a foreign existing projection %s before progress writes", async (mode) => {
    const documents = new Map<string, any>();
    const writes: string[] = [];
    const scope = deriveProgressAccountScopeHash("stable-a", 1);
    const projectionPath = `users/stable-a/v2_progress/${scope}/seasons/season-rev-1/episodes/episode-1/slots/slot-1`;
    documents.set(projectionPath, {
      schemaVersion: "v2-progress-projection.v1",
      accountStableUid: "foreign-account",
      accountGeneration: 1,
      seasonRevisionId: "season-rev-1",
      episodeId: "episode-1",
      projection: { performanceStars: 0, performanceStarsDelta: 0, accessStarsEarnedDelta: 0, accessStarsPurchasedDelta: 0, starSlotId: "slot-1", activityId: "activity-1", progressCompatibilityKey: "compat-1" },
    });
    const db: any = {
      doc: (path: string) => ({ path }),
      runTransaction: async (work: any) => work({
        get: async (ref: any) => documents.has(ref.path)
          ? { exists: true, data: () => documents.get(ref.path) }
          : identitySnapshot(ref.path) ?? { exists: false, data: () => undefined },
        create: (ref: any, value: unknown) => { writes.push(`create:${ref.path}`); documents.set(ref.path, value); },
        set: (ref: any, value: unknown) => { writes.push(`set:${ref.path}`); documents.set(ref.path, value); },
      }),
    };
    const options = storeOptions(db, "stable-a");
    if (mode === "with a scorer") {
      (options as any).resolveServerScore = ({ request: submitted, attemptRef: submittedAttemptRef, evidence }: any) => resolveServerScore({
        attemptRef: submittedAttemptRef,
        activityId: submitted.projection.activityId,
        starSlotId: submitted.projection.starSlotId,
        progressCompatibilityKey: submitted.projection.progressCompatibilityKey,
        scoringPolicyRef: { kind: "scoring", key: "policy.scoring.core", version: 1, contentHash: "a".repeat(64) },
        resultCode: "CORRECT",
        evidenceComponentFingerprint: evidence.componentFingerprint,
      }, () => 0);
    }

    await expect(applyProgressEvent(createFirestoreProgressEventStore(options), { ...request, idempotencyKey: mode === "with a scorer" ? "foreign-projection-scorer" : "foreign-projection-no-scorer" })).rejects.toThrow("v2_progress_projection_state_invalid");
    expect(writes).toEqual([]);
  });

  it("keeps account progress paths under distinct canonical stable owner roots", async () => {
    const createdPaths: string[] = [];
    const db: any = { doc: (path: string) => ({ path }), runTransaction: async (work: any) => work({ get: async (ref: any) => identitySnapshot(ref.path) ?? ({ exists: false, data: () => undefined }), create: (ref: any) => { createdPaths.push(ref.path); }, set: (ref: any) => { createdPaths.push(ref.path); } }) };
    const first = createFirestoreProgressEventStore(storeOptions(db, "stable-a"));
    const second = createFirestoreProgressEventStore(storeOptions(db, "a_b"));
    await applyProgressEvent(first, { ...request, accountScopeHash: deriveProgressAccountScopeHash("stable-a", 1), idempotencyKey: "path-collision-op-1" });
    await applyProgressEvent(second, { ...request, accountScopeHash: deriveProgressAccountScopeHash("a_b", 1), idempotencyKey: "path-collision-op-2" });
    const projectionPaths = createdPaths.filter((path) => path.includes("/v2_progress/") && path.includes("/slots/"));
    expect(projectionPaths).toHaveLength(2);
    expect(projectionPaths[0]).toContain("users/stable-a/v2_progress/");
    expect(projectionPaths[1]).toContain("users/a_b/v2_progress/");
    expect(projectionPaths[0]).not.toBe(projectionPaths[1]);
  });

  it("derives distinct versioned document IDs for sanitization-colliding operation and attempt tuples", () => {
    const scope = deriveProgressAccountScopeHash("stable-a", 1);
    const firstOperationId = progressOperationDocumentId(scope, "season-rev-1", "collision:key-0001");
    const secondOperationId = progressOperationDocumentId(scope, "season-rev-1", "collision_key-0001");
    const firstAttemptId = progressAttemptDocumentId(scope, "season-rev-1", "episode-1", "collision/attempt-0001");
    const secondAttemptId = progressAttemptDocumentId(scope, "season-rev-1", "episode-1", "collision_attempt-0001");

    for (const operationId of [firstOperationId, secondOperationId]) expect(operationId).toMatch(/^opv1_[a-f0-9]{64}$/);
    for (const attemptId of [firstAttemptId, secondAttemptId]) expect(attemptId).toMatch(/^atv1_[a-f0-9]{64}$/);
    expect(firstOperationId).not.toBe(secondOperationId);
    expect(firstAttemptId).not.toBe(secondAttemptId);
    expect(progressOperationDocumentId(scope, "season-rev-1", "collision:key-0001")).toBe(firstOperationId);
    expect(progressAttemptDocumentId(scope, "season-rev-1", "episode-1", "collision/attempt-0001")).toBe(firstAttemptId);
  });
});
