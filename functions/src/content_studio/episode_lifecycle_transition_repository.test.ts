import type { ApprovedEpisodeRevision } from "../../../modules/learning-v2/authoring/season_draft";
import { EpisodeLifecycleTransitionRepository, type EpisodeLifecycleStore } from "./episode_lifecycle_transition_repository";
import type { EpisodeLifecycleHead } from "./episode_revision_resolver";

const ref: ApprovedEpisodeRevision = { draftId: "d1", episodeId: "e1", revision: 1, revisionFingerprint: "a".repeat(64), contentHash: "b".repeat(64), ordinal: 1, chapterId: "c1", approvalStatus: "draft" };
const head = (status: EpisodeLifecycleHead["status"]): EpisodeLifecycleHead => ({ schemaVersion: "episode-lifecycle.v1", draftId: "d1", episodeId: "e1", revision: 1, revisionFingerprint: ref.revisionFingerprint, status, changedBy: "author", changedAt: "2026-01-01T00:00:00.000Z", lifecycleRevision: 1 });

function store(initial: EpisodeLifecycleHead | undefined, pinned = false): EpisodeLifecycleStore {
  let current = initial;
  const operations = new Map<string, { requestFingerprint: string; lifecycle: EpisodeLifecycleHead }>();
  return {
    async runTransaction(work) { return work(this); },
    async readLifecycle() { return current; },
    async createLifecycle(_ref, lifecycle) { current = lifecycle; },
    async compareAndSetLifecycle(_ref, expected, next) { if (!current || current.lifecycleRevision !== expected) throw new Error("cas"); current = next; },
    async appendAudit() {},
    async readOperation(id) { return operations.get(id); },
    async createOperation(id, value) { operations.set(id, value); },
    async hasActiveSeasonPin() { return pinned; },
  };
}

describe("Episode lifecycle transitions", () => {
  it("submits an uninitialized revision into needs_review", async () => {
    const repo = new EpisodeLifecycleTransitionRepository(store(undefined as unknown as EpisodeLifecycleHead), { actorId: "author" });
    const lifecycle = await repo.submit(ref, "Ready for review", "submit-1");
    expect(lifecycle.status).toBe("needs_review");
  });
  it("moves needs_review to changes_requested and replays idempotently", async () => {
    const repo = new EpisodeLifecycleTransitionRepository(store(head("needs_review")), { actorId: "reviewer" });
    const first = await repo.requestChanges(ref, 1, "Fix dialogue", "op-1");
    const replay = await repo.requestChanges(ref, 1, "Fix dialogue", "op-1");
    expect(first.status).toBe("changes_requested");
    expect(replay).toEqual(first);
  });

  it("rejects stale lifecycle revision", async () => {
    const repo = new EpisodeLifecycleTransitionRepository(store(head("needs_review")), { actorId: "reviewer" });
    await expect(repo.requestChanges(ref, 2, "Fix", "op-1")).rejects.toThrow("episode_lifecycle_stale");
  });

  it("blocks archive while a season pin is active", async () => {
    const repo = new EpisodeLifecycleTransitionRepository(store(head("approved"), true), { actorId: "reviewer" });
    await expect(repo.archive(ref, 1, "Retire", "op-1")).rejects.toThrow("episode_archive_pinned");
  });

  it("requires a server-owned receipt reader for approval", async () => {
    const repo = new EpisodeLifecycleTransitionRepository(store(head("needs_review")), { actorId: "reviewer" });
    await expect(repo.approve(ref, { validationReceiptId: "v", localizationReceiptId: "l", reviewReceiptId: "r", gateReceiptId: "g" }, 1, "Approve", "op-1")).rejects.toThrow("episode_approval_receipt_reader_missing");
  });
});
