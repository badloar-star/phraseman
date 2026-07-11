import { ReadBudget } from "../scripts/xp_integrity/read_budget";
import {
  createXpAuditReader,
  type XpAuditReaderDependencies,
} from "../scripts/xp_integrity/firestore_reader";

type Row = Record<string, unknown>;

function timestamp(ms: number) {
  return { toMillis: () => ms };
}

function makeFirebase(initial: Record<string, Row>) {
  const rows = new Map(Object.entries(initial));
  const calls: string[] = [];

  type Filter = { field: unknown; value: unknown };
  class Query {
    private after: string | null = null;
    private maximum = Number.MAX_SAFE_INTEGER;
    private filters: Filter[] = [];
    constructor(private readonly path: string) {}
    orderBy(_field: unknown) {
      return this;
    }
    where(field: unknown, _operator: string, value: unknown) {
      this.filters.push({ field, value });
      return this;
    }
    startAfter(value: string) {
      this.after = value;
      return this;
    }
    limit(value: number) {
      this.maximum = value;
      return this;
    }
    async get() {
      calls.push(`query:${this.path}`);
      const prefix = `${this.path}/`;
      const docs = [...rows.entries()]
        .filter(
          ([key]) =>
            key.startsWith(prefix) && !key.slice(prefix.length).includes("/"),
        )
        .map(([key, data]) => ({
          id: key.slice(prefix.length),
          data: () => data,
          exists: true,
        }))
        .filter((doc) => this.after === null || doc.id > this.after)
        .filter((doc) =>
          this.filters.every(({ field, value }) =>
            field === "__name__"
              ? doc.id === value
              : doc.data()[String(field)] === value,
          ),
        )
        .sort((left, right) => left.id.localeCompare(right.id))
        .slice(0, this.maximum);
      return { docs, empty: docs.length === 0, size: docs.length };
    }
  }

  const firestore = {
    collection(path: string) {
      const query = new Query(path);
      return Object.assign(query, {
        doc(id: string) {
          const documentPath = `${path}/${id}`;
          return {
            id,
            collection(child: string) {
              return firestore.collection(`${documentPath}/${child}`);
            },
            async get() {
              calls.push(`doc:${documentPath}`);
              const value = rows.get(documentPath);
              return {
                id,
                exists: value !== undefined,
                data: () => value,
              };
            },
          };
        },
      });
    },
  };
  const auth = {
    async getUserByEmail(email: string) {
      calls.push(`auth:${email}`);
      if (email === "missing@example.com")
        throw { code: "auth/user-not-found" };
      return { uid: "auth-control" };
    },
  };
  return { firestore, auth, calls };
}

function dependencies(
  firebase: ReturnType<typeof makeFirebase>,
  permissions: readonly string[] = [
    "datastore.entities.get",
    "datastore.entities.list",
    "firebaseauth.users.get",
  ],
): XpAuditReaderDependencies {
  return {
    documentIdField: "__name__",
    testIamPermissions: async (_projectId, requested) => {
      firebase.calls.push(`iam:${requested.join(",")}`);
      return { permissions };
    },
    getFirestore: () => firebase.firestore,
    getAuth: () => firebase.auth,
  };
}

const user = (xp: string, extra: Row = {}): Row => ({
  progress: { user_total_xp: xp },
  ...extra,
});

describe("ReadBudget", () => {
  test("reserves synchronously and returns unused capacity on settlement", () => {
    const budget = new ReadBudget(3);
    const settle = budget.reserve(3);
    expect(() => budget.reserve(1)).toThrow("xp_audit_read_budget_exceeded");
    settle(1);
    expect(budget.count).toBe(1);
    expect(() => budget.reserve(2)).not.toThrow();
  });

  test.each([0, -1, 1.5, Number.NaN])(
    "rejects invalid reservation %p",
    (count) => {
      expect(() => new ReadBudget(10).reserve(count)).toThrow(
        "xp_audit_read_budget_exceeded",
      );
    },
  );

  test("rejects invalid, excessive, and repeated settlement", () => {
    const budget = new ReadBudget(10);
    const settle = budget.reserve(3);
    expect(() => settle(-1)).toThrow("xp_audit_invalid_billed_read_settlement");
    expect(() => settle(4)).toThrow("xp_audit_invalid_billed_read_settlement");
    expect(() => settle(1.5)).toThrow(
      "xp_audit_invalid_billed_read_settlement",
    );
    settle(2);
    expect(() => settle(2)).toThrow("xp_audit_budget_reservation_reused");
  });

  test("keeps concurrent reservations within the maximum", () => {
    const budget = new ReadBudget(4);
    const first = budget.reserve(2);
    const second = budget.reserve(2);
    expect(() => budget.reserve(1)).toThrow("xp_audit_read_budget_exceeded");
    second(0);
    first(2);
    expect(budget.count).toBe(2);
  });
});

describe("IAM-gated XP audit reader", () => {
  test("rejects write-capable, incomplete, and unavailable IAM proof before reads", async () => {
    const writeFirebase = makeFirebase({ "users/a": user("1") });
    await expect(
      createXpAuditReader({
        projectId: "demo",
        maximumReads: 20,
        dependencies: dependencies(writeFirebase, [
          "datastore.entities.get",
          "datastore.entities.list",
          "firebaseauth.users.get",
          "datastore.entities.update",
        ]),
      }),
    ).rejects.toThrow("xp_audit_principal_has_write_permissions");
    expect(writeFirebase.calls).toEqual([expect.stringMatching(/^iam:/)]);

    const missingFirebase = makeFirebase({ "users/a": user("1") });
    await expect(
      createXpAuditReader({
        projectId: "demo",
        maximumReads: 20,
        dependencies: dependencies(missingFirebase, ["datastore.entities.get"]),
      }),
    ).rejects.toThrow("xp_audit_cannot_prove_read_only_principal");
    expect(missingFirebase.calls).toEqual([expect.stringMatching(/^iam:/)]);

    const unavailableFirebase = makeFirebase({ "users/a": user("1") });
    const unavailable = dependencies(unavailableFirebase);
    unavailable.testIamPermissions = async () => {
      unavailableFirebase.calls.push("iam:failed");
      throw new Error("offline");
    };
    await expect(
      createXpAuditReader({
        projectId: "demo",
        maximumReads: 20,
        dependencies: unavailable,
      }),
    ).rejects.toThrow("xp_audit_cannot_prove_read_only_principal");
    expect(unavailableFirebase.calls).toEqual(["iam:failed"]);
  });

  test("runs IAM proof before the first Firestore or Auth read", async () => {
    const firebase = makeFirebase({ "users/a": user("1") });
    const reader = await createXpAuditReader({
      projectId: "demo",
      maximumReads: 20,
      dependencies: dependencies(firebase),
    });
    await reader.resolveControlEmail("control@example.com");
    await reader.pageUsers(null, 1);
    expect(firebase.calls[0]).toMatch(/^iam:/);
    expect(
      firebase.calls.findIndex((call) => call.startsWith("iam:")),
    ).toBeLessThan(
      firebase.calls.findIndex((call) => /^(?:auth|query|doc):/.test(call)),
    );
  });

  test("paginates users across three pages and reads cutover evidence", async () => {
    const firebase = makeFirebase({
      "users/a": user("10", {
        progressServerAuthoritative: true,
        progressServerCutoverAt: timestamp(100),
        progressMigratedAt: timestamp(90),
        xpLevelRestoreAt: timestamp(80),
        progressServerState: { totalXp: 10 },
      }),
      "users/a/progress_migrations/client_snapshot_v1": {
        migrated: true,
        keys: ["lesson1_progress"],
        createdAt: timestamp(70),
        ignored: "not evidence",
      },
      "users/b": user("20"),
      "users/c": user("30"),
    });
    const reader = await createXpAuditReader({
      projectId: "demo",
      maximumReads: 30,
      dependencies: dependencies(firebase),
    });
    const first = await reader.pageUsers(null, 1);
    const second = await reader.pageUsers(first.nextAfterUid, 1);
    const third = await reader.pageUsers(second.nextAfterUid, 1);
    expect([
      first.users[0].uid,
      second.users[0].uid,
      third.users[0].uid,
    ]).toEqual(["a", "b", "c"]);
    expect(first.done).toBe(false);
    expect(third.nextAfterUid).toBe("c");
    expect(first.users[0].cutover).toEqual({
      progressServerAuthoritative: true,
      progressServerCutoverAtMs: 100,
      progressMigratedAtMs: 90,
      xpLevelRestoreAtMs: 80,
      progressServerStateXp: 10,
      migrationDocument: {
        exists: true,
        createdAtMs: 70,
        keys: ["lesson1_progress"],
      },
    });
  });

  test("normalizes nested ledger results and paginates events", async () => {
    const eventRows: Record<string, Row> = {};
    for (const [index, id] of ["e1", "e2", "e3"].entries()) {
      eventRows[`users/a/progress_events/${id}`] = {
        type: "lesson_complete",
        payload: { lesson: index + 1 },
        clientCreatedAt: 40 + index,
        appVersion: "1.2.3",
        createdAt: timestamp(100 + index),
        result: {
          xpDelta: 10,
          totalXp: 10 * (index + 1),
          activeDate: "2026-07-11",
          weekKey: "2026-W28",
          weekXp: 50 + index,
        },
      };
    }
    const firebase = makeFirebase(eventRows);
    const reader = await createXpAuditReader({
      projectId: "demo",
      maximumReads: 20,
      dependencies: dependencies(firebase),
    });
    const first = await reader.pageProgressEvents("a", null, 1);
    const second = await reader.pageProgressEvents(
      "a",
      first.nextAfterEventId,
      1,
    );
    const third = await reader.pageProgressEvents(
      "a",
      second.nextAfterEventId,
      1,
    );
    expect(first.events[0]).toMatchObject({
      ownerUid: "a",
      eventId: "e1",
      xpDelta: 10,
      totalXpAfter: 10,
      totalXpBefore: 0,
      serverCreatedAtMs: 100,
      clientCreatedAtMs: 40,
      weekXpAfter: 50,
    });
    expect([
      first.nextAfterEventId,
      second.nextAfterEventId,
      third.nextAfterEventId,
    ]).toEqual(["e1", "e2", "e3"]);
  });

  test("does not invent an unsafe before value", async () => {
    const firebase = makeFirebase({
      "users/a/progress_events/e": {
        type: "lesson_complete",
        result: { xpDelta: 20, totalXp: 10 },
        createdAt: timestamp(1),
      },
    });
    const reader = await createXpAuditReader({
      projectId: "demo",
      maximumReads: 10,
      dependencies: dependencies(firebase),
    });
    const page = await reader.pageProgressEvents("a", null, 2);
    expect(page.events[0].totalXpBefore).toBeNull();
  });

  test("counts users with document-id pages and empty-page minimum billing", async () => {
    const firebase = makeFirebase({
      "users/a": user("1"),
      "users/b": user("2"),
      "users/c": user("3"),
      "users/d": user("4"),
    });
    const reader = await createXpAuditReader({
      projectId: "demo",
      maximumReads: 10,
      dependencies: dependencies(firebase),
    });
    await expect(reader.countUserDocuments(2)).resolves.toBe(4);
    expect(reader.getReadCount()).toBe(5);
    expect(
      firebase.calls.filter((call) => call === "query:users"),
    ).toHaveLength(3);
  });

  test("reconciles and de-duplicates aliases with complete paginated ledgers", async () => {
    const firebase = makeFirebase({
      "users/canonical": user("100", { firebaseAuthUid: "auth-one" }),
      "users/alias-a": user("10", {
        canonicalStableId: "canonical",
        duplicateOfStableId: "canonical",
        identityHidden: true,
        identityMergedAt: timestamp(500),
      }),
      "users/alias-b": user("20", {
        firebaseAuthUid: "auth-one",
        identityMergedAt: timestamp(600),
      }),
      "users/alias-a/progress_events/1": {
        type: "achievement_claim",
        result: { xpDelta: 10, totalXp: 10 },
        createdAt: timestamp(100),
      },
      "users/alias-a/progress_events/2": {
        type: "lesson_complete",
        result: { xpDelta: 10, totalXp: 20 },
        createdAt: timestamp(200),
      },
    });
    const reader = await createXpAuditReader({
      projectId: "demo",
      maximumReads: 50,
      aliasPageSize: 1,
      eventPageSize: 1,
      dependencies: dependencies(firebase),
    });
    const aliases = await reader.readAliases({
      uid: "canonical",
      firebaseAuthUid: "auth-one",
      canonicalStableId: null,
      duplicateOfStableId: null,
      identityHidden: false,
      identityMergedAtMs: null,
      progress: {},
      cutover: {
        progressServerAuthoritative: false,
        progressServerCutoverAtMs: null,
        progressMigratedAtMs: null,
        xpLevelRestoreAtMs: null,
        progressServerStateXp: null,
        migrationDocument: { exists: false, createdAtMs: null, keys: [] },
      },
    });
    expect(aliases.map((alias) => alias.uid)).toEqual(["alias-a", "alias-b"]);
    expect(aliases[0]).toMatchObject({
      canonicalUid: "canonical",
      linkage: "canonical_pointer",
      identityMergedAtMs: 500,
      complete: true,
    });
    expect(aliases[0].events.map((event) => event.eventId)).toEqual(["1", "2"]);
    expect(new Set(aliases.map((alias) => alias.uid)).size).toBe(
      aliases.length,
    );
  });

  test("reads mirrors by the supplied noncanonical identity", async () => {
    const firebase = makeFirebase({
      "leaderboard/alias": { points: 71, groupId: "g1" },
      "arena_profiles/auth-alias": { courseTotalXp: 72 },
      "league_groups/g1": { members: { alias: { totalXp: 73 } } },
    });
    const reader = await createXpAuditReader({
      projectId: "demo",
      maximumReads: 10,
      dependencies: dependencies(firebase),
    });
    await expect(
      reader.readMirrors({
        uid: "alias",
        firebaseAuthUid: "auth-alias",
        canonicalStableId: "canonical",
        duplicateOfStableId: "canonical",
        identityHidden: true,
        identityMergedAtMs: 1,
        progress: {},
        cutover: {
          progressServerAuthoritative: false,
          progressServerCutoverAtMs: null,
          progressMigratedAtMs: null,
          xpLevelRestoreAtMs: null,
          progressServerStateXp: null,
          migrationDocument: { exists: false, createdAtMs: null, keys: [] },
        },
      }),
    ).resolves.toEqual({ leaderboardXp: 71, arenaXp: 72, leagueXp: 73 });
    expect(firebase.calls).toEqual(
      expect.arrayContaining([
        "doc:leaderboard/alias",
        "doc:arena_profiles/auth-alias",
        "doc:league_groups/g1",
      ]),
    );
    expect(firebase.calls).not.toContain("doc:leaderboard/canonical");
  });

  test("settles failed reservations conservatively and aborts before or after a page", async () => {
    const failedFirebase = makeFirebase({ "users/a": user("1") });
    const failedDeps = dependencies(failedFirebase);
    const originalCollection = failedFirebase.firestore.collection;
    failedFirebase.firestore.collection = ((path: string) => {
      const query = originalCollection(path);
      if (path === "users")
        query.get = async () => {
          throw new Error("query_failed");
        };
      return query;
    }) as typeof failedFirebase.firestore.collection;
    const failedReader = await createXpAuditReader({
      projectId: "demo",
      maximumReads: 3,
      dependencies: failedDeps,
    });
    await expect(failedReader.countUserDocuments(3)).rejects.toThrow(
      "query_failed",
    );
    expect(failedReader.getReadCount()).toBe(3);

    const before = new AbortController();
    before.abort();
    const beforeFirebase = makeFirebase({ "users/a": user("1") });
    const beforeReader = await createXpAuditReader({
      projectId: "demo",
      maximumReads: 3,
      signal: before.signal,
      dependencies: dependencies(beforeFirebase),
    });
    await expect(beforeReader.countUserDocuments(2)).rejects.toThrow(
      "xp_audit_aborted",
    );
    expect(beforeReader.getReadCount()).toBe(0);

    const after = new AbortController();
    const afterFirebase = makeFirebase({ "users/a": user("1") });
    const afterDeps = dependencies(afterFirebase);
    const afterCollection = afterFirebase.firestore.collection;
    afterFirebase.firestore.collection = ((path: string) => {
      const query = afterCollection(path);
      const get = query.get.bind(query);
      query.get = async () => {
        const snapshot = await get();
        after.abort();
        return snapshot;
      };
      return query;
    }) as typeof afterFirebase.firestore.collection;
    const afterReader = await createXpAuditReader({
      projectId: "demo",
      maximumReads: 3,
      signal: after.signal,
      dependencies: afterDeps,
    });
    await expect(afterReader.countUserDocuments(2)).rejects.toThrow(
      "xp_audit_aborted",
    );
    expect(afterReader.getReadCount()).toBe(1);
  });

  test("resolves a control email without leaking Auth and maps not-found to null", async () => {
    const firebase = makeFirebase({});
    const reader = await createXpAuditReader({
      projectId: "demo",
      maximumReads: 2,
      dependencies: dependencies(firebase),
    });
    await expect(
      reader.resolveControlEmail("control@example.com"),
    ).resolves.toBe("auth-control");
    await expect(
      reader.resolveControlEmail("missing@example.com"),
    ).resolves.toBeNull();
    expect("auth" in reader).toBe(false);
    expect("firestore" in reader).toBe(false);
  });
});
