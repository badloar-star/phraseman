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
import { createFirestoreProgressEventStore, progressAttemptDocumentId, progressOperationDocumentId } from "./firestore_progress_event_store";
import { deriveProgressAccountScopeHash } from "./progress_event";
import { buildCanonicalAttemptRef } from "../../../modules/learning-v2/contracts/attempt";
import { resolveImmutableSeasonRevision } from "../content_studio/season_revision_resolver";
import { assertExactImmutableEpisodeRevision } from "../content_studio/episode_revision_resolver";
import { resolveServerScore } from "./server_score_resolver";

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
