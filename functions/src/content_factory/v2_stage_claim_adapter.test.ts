import { claimNextV2Stage } from "./v2_stage_claim_adapter";

function database(rows: readonly Readonly<Record<string, unknown>>[]) {
  let writeCount = 0;
  const snapshots = rows.map((row) => ({
    id: String(row.stageId),
    exists: true,
    data: () => ({ ...row }),
  }));
  const db = {
    collection() {
      return {
        where() {
          return {};
        },
        doc(id: string) {
          return { id };
        },
      };
    },
    async runTransaction<T>(body: (transaction: unknown) => Promise<T>) {
      return body({
        async get() {
          return { docs: snapshots };
        },
        set() {
          writeCount += 1;
        },
      });
    },
  };
  return { db, writes: () => writeCount };
}

describe("canonical V2 stage claim boundary", () => {
  it("never lets the worker claim an owner-authored Activity stage", async () => {
    const state = database([
      {
        stageId: "activity-owner-stage",
        executionMode: "owner_authored_manual_import_only",
        dependsOn: [],
        state: "queued",
        attempts: 0,
        maxAttempts: 3,
      },
    ]);
    await expect(
      claimNextV2Stage(state.db as never, {
        jobId: "job-1",
        workerId: "worker-1",
        nowMs: 1,
      }),
    ).resolves.toEqual({ lease: null, reason: "no_runnable_stage" });
    expect(state.writes()).toBe(0);
  });

  it("continues to claim server-generation stages from the same repository", async () => {
    const state = database([
      {
        stageId: "server-stage",
        executionMode: "server_generation_worker",
        dependsOn: [],
        state: "queued",
        attempts: 0,
        maxAttempts: 3,
      },
    ]);
    await expect(
      claimNextV2Stage(state.db as never, {
        jobId: "job-1",
        workerId: "worker-1",
        nowMs: 1,
      }),
    ).resolves.toMatchObject({ lease: { stageId: "server-stage" } });
    expect(state.writes()).toBe(1);
  });

  it("unblocks a server stage only after its owner-authored dependency is confirmed", async () => {
    const blocked = database([
      {
        stageId: "activity-owner-stage",
        executionMode: "owner_authored_manual_import_only",
        dependsOn: [],
        state: "needs_review",
        attempts: 0,
        maxAttempts: 3,
      },
      {
        stageId: "voice-stage",
        executionMode: "server_generation_worker",
        dependsOn: ["activity-owner-stage"],
        state: "queued",
        attempts: 0,
        maxAttempts: 3,
      },
    ]);
    await expect(
      claimNextV2Stage(blocked.db as never, {
        jobId: "job-1",
        workerId: "worker-1",
        nowMs: 1,
      }),
    ).resolves.toEqual({ lease: null, reason: "no_runnable_stage" });

    const confirmed = database([
      {
        stageId: "activity-owner-stage",
        executionMode: "owner_authored_manual_import_only",
        dependsOn: [],
        state: "owner_confirmed",
        attempts: 0,
        maxAttempts: 3,
      },
      {
        stageId: "voice-stage",
        executionMode: "server_generation_worker",
        dependsOn: ["activity-owner-stage"],
        state: "queued",
        attempts: 0,
        maxAttempts: 3,
      },
    ]);
    await expect(
      claimNextV2Stage(confirmed.db as never, {
        jobId: "job-1",
        workerId: "worker-1",
        nowMs: 1,
      }),
    ).resolves.toMatchObject({ lease: { stageId: "voice-stage" } });
  });
});
