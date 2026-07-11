const mockApplicationDefault = jest.fn();
const mockGetApps = jest.fn();
const mockInitializeApp = jest.fn();
const mockGetFirestore = jest.fn();
const mockGetAuth = jest.fn();

jest.mock("firebase-admin/app", () => ({
  applicationDefault: mockApplicationDefault,
  getApps: mockGetApps,
  initializeApp: mockInitializeApp,
}));
jest.mock("firebase-admin/firestore", () => ({
  FieldPath: { documentId: () => "__name__" },
  getFirestore: mockGetFirestore,
}));
jest.mock("firebase-admin/auth", () => ({ getAuth: mockGetAuth }));

import { ReadBudget } from "../scripts/xp_integrity/read_budget";
import { createXpAuditReader } from "../scripts/xp_integrity/firestore_reader";

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

const originalFetch = global.fetch;

function configureFirebase(
  firebase: ReturnType<typeof makeFirebase>,
  permissions: readonly string[] = [
    "datastore.entities.get",
    "datastore.entities.list",
    "firebaseauth.users.get",
  ],
): void {
  const credential = {
    getAccessToken: jest.fn(async () => ({
      access_token: "test-token",
      expires_in: 3600,
    })),
  };
  const app = {
    name: "test-audit-app",
    options: { projectId: "demo", credential },
  };
  mockApplicationDefault.mockReturnValue(credential);
  mockGetApps.mockReturnValue([]);
  mockInitializeApp.mockReturnValue(app);
  mockGetFirestore.mockReturnValue(firebase.firestore);
  mockGetAuth.mockReturnValue(firebase.auth);
  global.fetch = jest.fn(async (_url, init) => {
    const body = JSON.parse(String(init?.body ?? "{}")) as {
      permissions?: string[];
    };
    firebase.calls.push(`iam:${(body.permissions ?? []).join(",")}`);
    return {
      ok: true,
      json: async () => ({ permissions }),
    } as Response;
  });
}

afterAll(() => {
  global.fetch = originalFetch;
});

function readerOptions(
  firebase: ReturnType<typeof makeFirebase>,
  maximumReads: number,
  extra: {
    signal?: AbortSignal;
    aliasPageSize?: number;
    eventPageSize?: number;
    aliasMaxDepth?: number;
    aliasMaxDocuments?: number;
  } = {},
  permissions?: readonly string[],
) {
  configureFirebase(firebase, permissions);
  return { projectId: "demo", maximumReads, ...extra };
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
    configureFirebase(writeFirebase, [
      "datastore.entities.get",
      "datastore.entities.list",
      "firebaseauth.users.get",
      "datastore.entities.update",
    ]);
    await expect(
      createXpAuditReader({
        projectId: "demo",
        maximumReads: 20,
      }),
    ).rejects.toThrow(
      "xp_audit_scoped_entity_or_user_write_permission_detected",
    );
    expect(writeFirebase.calls).toEqual([expect.stringMatching(/^iam:/)]);

    const missingFirebase = makeFirebase({ "users/a": user("1") });
    configureFirebase(missingFirebase, ["datastore.entities.get"]);
    await expect(
      createXpAuditReader({
        projectId: "demo",
        maximumReads: 20,
      }),
    ).rejects.toThrow(
      "xp_audit_cannot_prove_scoped_entity_and_user_permissions",
    );
    expect(missingFirebase.calls).toEqual([expect.stringMatching(/^iam:/)]);

    const unavailableFirebase = makeFirebase({ "users/a": user("1") });
    configureFirebase(unavailableFirebase);
    global.fetch = jest.fn(async () => {
      unavailableFirebase.calls.push("iam:failed");
      throw new Error("offline");
    });
    await expect(
      createXpAuditReader({
        projectId: "demo",
        maximumReads: 20,
      }),
    ).rejects.toThrow(
      "xp_audit_cannot_prove_scoped_entity_and_user_permissions",
    );
    expect(unavailableFirebase.calls).toEqual(["iam:failed"]);
  });

  test("runs IAM proof before the first Firestore or Auth read", async () => {
    const firebase = makeFirebase({ "users/a": user("1") });
    const reader = await createXpAuditReader(readerOptions(firebase, 20));
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
        xpLevelRestore250To400At: timestamp(80),
        xpLevelRestoreAt: timestamp(999),
        progressServerState: { totalXp: 10 },
      }),
      "users/a/progress_migrations/client_snapshot_v1": {
        migrated: true,
        keys: ["lesson1_progress"],
        createdAt: timestamp(70),
        ignored: "not evidence",
      },
      "users/b": user("20"),
      "users/b/progress_migrations/client_snapshot_v1": {
        migrated: false,
        keys: ["untrusted_key"],
        createdAt: timestamp(75),
      },
      "users/c": user("30"),
    });
    const reader = await createXpAuditReader(readerOptions(firebase, 30));
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
        migrated: true,
        createdAtMs: 70,
        keys: ["lesson1_progress"],
      },
    });
    expect(second.users[0].cutover.migrationDocument).toEqual({
      exists: true,
      migrated: false,
      createdAtMs: 75,
      keys: ["untrusted_key"],
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
    const reader = await createXpAuditReader(readerOptions(firebase, 20));
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
    const reader = await createXpAuditReader(readerOptions(firebase, 10));
    const page = await reader.pageProgressEvents("a", null, 2);
    expect(page.events[0].totalXpBefore).toBeNull();
  });

  test("marks a malformed ledger result invalid instead of synthesizing exact zeroes", async () => {
    const firebase = makeFirebase({
      "users/a/progress_events/malformed": {
        type: "achievement_reward",
        payload: { achievementId: "xp_500" },
        createdAt: timestamp(1),
        result: {},
      },
    });
    const reader = await createXpAuditReader(readerOptions(firebase, 10));
    const page = await reader.pageProgressEvents("a", null, 2);
    expect(page.events[0]).toMatchObject({
      normalizationValid: false,
      totalXpBefore: null,
    });
  });

  test("counts users with document-id pages and empty-page minimum billing", async () => {
    const firebase = makeFirebase({
      "users/a": user("1"),
      "users/b": user("2"),
      "users/c": user("3"),
      "users/d": user("4"),
    });
    const reader = await createXpAuditReader(readerOptions(firebase, 10));
    await expect(reader.countUserDocuments(2)).resolves.toBe(4);
    expect(reader.getReadCount()).toBe(5);
    expect(
      firebase.calls.filter((call) => call === "query:users"),
    ).toHaveLength(3);
  });

  test("reconciles and de-duplicates aliases with complete paginated ledgers", async () => {
    const firebase = makeFirebase({
      "users/canonical": user("100", {
        firebaseAuthUid: "auth-one",
        canonicalStableId: "alias-c",
      }),
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
      "users/alias-c": user("30", {
        canonicalStableId: "alias-a",
        duplicateOfStableId: "alias-a",
        identityMergedAt: timestamp(700),
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
    const reader = await createXpAuditReader(
      readerOptions(firebase, 50, { aliasPageSize: 1, eventPageSize: 1 }),
    );
    const result = await reader.readAliases({
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
        migrationDocument: {
          exists: false,
          migrated: null,
          createdAtMs: null,
          keys: [],
        },
      },
    });
    const aliases = result.aliases;
    expect(result.complete).toBe(true);
    expect(aliases.map((alias) => alias.uid)).toEqual([
      "alias-a",
      "alias-b",
      "alias-c",
    ]);
    expect(aliases[0]).toMatchObject({
      canonicalUid: "canonical",
      linkage: "canonical_pointer",
      identityMergedAtMs: 500,
      complete: true,
    });
    expect(aliases[0].events.map((event) => event.eventId)).toEqual(["1", "2"]);
    expect(aliases.find((alias) => alias.uid === "alias-c")?.linkage).toBe(
      "canonical_pointer",
    );
    expect(new Set(aliases.map((alias) => alias.uid)).size).toBe(
      aliases.length,
    );
    expect(aliases.every((alias) => alias.complete)).toBe(true);
  });

  test("marks a capped transitive alias closure incomplete", async () => {
    const firebase = makeFirebase({
      "users/direct": user("1", { canonicalStableId: "canonical" }),
      "users/indirect": user("1", { canonicalStableId: "direct" }),
    });
    const reader = await createXpAuditReader(
      readerOptions(firebase, 40, {
        aliasPageSize: 2,
        eventPageSize: 2,
        aliasMaxDepth: 1,
        aliasMaxDocuments: 1,
      }),
    );
    const result = await reader.readAliases({
      uid: "canonical",
      firebaseAuthUid: null,
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
        migrationDocument: {
          exists: false,
          migrated: null,
          createdAtMs: null,
          keys: [],
        },
      },
    });
    const aliases = result.aliases;
    expect(result.complete).toBe(false);
    expect(aliases.map((alias) => alias.uid)).toEqual(["direct"]);
    expect(aliases[0].complete).toBe(false);
  });

  test("returns discovered aliases as incomplete when closure discovery fails", async () => {
    const firebase = makeFirebase({
      "users/direct": user("1", { canonicalStableId: "canonical" }),
    });
    const originalCollection = firebase.firestore.collection;
    let userQueries = 0;
    firebase.firestore.collection = ((path: string) => {
      const query = originalCollection(path);
      if (path === "users") {
        const get = query.get.bind(query);
        query.get = async () => {
          userQueries += 1;
          if (userQueries === 2) throw new Error("alias_query_failed");
          return get();
        };
      }
      return query;
    }) as typeof firebase.firestore.collection;
    const reader = await createXpAuditReader(
      readerOptions(firebase, 30, { aliasPageSize: 2, eventPageSize: 2 }),
    );
    const result = await reader.readAliases({
      uid: "canonical",
      firebaseAuthUid: null,
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
        migrationDocument: {
          exists: false,
          migrated: null,
          createdAtMs: null,
          keys: [],
        },
      },
    });
    const aliases = result.aliases;
    expect(result.complete).toBe(false);
    expect(aliases.map((alias) => alias.uid)).toEqual(["direct"]);
    expect(aliases[0].complete).toBe(false);
  });

  test("returns explicit incomplete closure when the first alias query fails", async () => {
    const firebase = makeFirebase({});
    const originalCollection = firebase.firestore.collection;
    firebase.firestore.collection = ((path: string) => {
      const query = originalCollection(path);
      if (path === "users") {
        query.get = async () => {
          throw new Error("first_alias_query_failed");
        };
      }
      return query;
    }) as typeof firebase.firestore.collection;
    const reader = await createXpAuditReader(
      readerOptions(firebase, 20, { aliasPageSize: 2 }),
    );
    const result = await reader.readAliases({
      uid: "canonical",
      firebaseAuthUid: null,
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
        migrationDocument: {
          exists: false,
          migrated: null,
          createdAtMs: null,
          keys: [],
        },
      },
    });
    expect(result).toEqual({ aliases: [], complete: false });
  });

  test("propagates cancellation before alias discovery", async () => {
    const controller = new AbortController();
    controller.abort();
    const firebase = makeFirebase({});
    const reader = await createXpAuditReader(
      readerOptions(firebase, 20, { signal: controller.signal }),
    );
    await expect(
      reader.readAliases({
        uid: "canonical",
        firebaseAuthUid: null,
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
          migrationDocument: {
            exists: false,
            migrated: null,
            createdAtMs: null,
            keys: [],
          },
        },
      }),
    ).rejects.toThrow("xp_audit_aborted");
  });

  test("reads mirrors by the supplied noncanonical identity", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-07-11T12:00:00Z"));
    const firebase = makeFirebase({
      "leaderboard/alias": {
        points: 71,
        groupId: "g1",
        groupWeekId: "2026-W28",
      },
      "arena_profiles/auth-alias": { courseTotalXp: 72 },
      "league_groups/g1": {
        weekId: "2026-W28",
        members: { alias: { totalXp: 73 } },
      },
    });
    const reader = await createXpAuditReader(readerOptions(firebase, 10));
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
          migrationDocument: {
            exists: false,
            migrated: null,
            createdAtMs: null,
            keys: [],
          },
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
    jest.useRealTimers();
  });

  test("ignores stale league groups and caches current groups per reader", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-07-11T12:00:00Z"));
    const firebase = makeFirebase({
      "leaderboard/stale": {
        points: 1,
        groupId: "old",
        groupWeekId: "2026-W27",
      },
      "arena_profiles/stale": { courseTotalXp: 1 },
      "league_groups/old": {
        weekId: "2026-W27",
        members: { stale: { totalXp: 999 } },
      },
      "leaderboard/a": {
        points: 2,
        groupId: "current",
        groupWeekId: "2026-W28",
      },
      "leaderboard/b": {
        points: 3,
        groupId: "current",
        groupWeekId: "2026-W28",
      },
      "arena_profiles/a": { courseTotalXp: 2 },
      "arena_profiles/b": { courseTotalXp: 3 },
      "league_groups/current": {
        weekId: "2026-W28",
        members: { a: { totalXp: 2 }, b: { totalXp: 3 } },
      },
    });
    const reader = await createXpAuditReader(readerOptions(firebase, 20));
    const raw = (uid: string) => ({
      uid,
      firebaseAuthUid: null,
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
        migrationDocument: {
          exists: false,
          migrated: null,
          createdAtMs: null,
          keys: [],
        },
      },
    });
    await expect(reader.readMirrors(raw("stale"))).resolves.toMatchObject({
      leagueXp: null,
    });
    await expect(reader.readMirrors(raw("a"))).resolves.toMatchObject({
      leagueXp: 2,
    });
    await expect(reader.readMirrors(raw("b"))).resolves.toMatchObject({
      leagueXp: 3,
    });
    expect(firebase.calls).not.toContain("doc:league_groups/old");
    expect(
      firebase.calls.filter((call) => call === "doc:league_groups/current"),
    ).toHaveLength(1);
    jest.useRealTimers();
  });

  test("settles failed reservations conservatively and aborts before or after a page", async () => {
    const failedFirebase = makeFirebase({ "users/a": user("1") });
    const originalCollection = failedFirebase.firestore.collection;
    failedFirebase.firestore.collection = ((path: string) => {
      const query = originalCollection(path);
      if (path === "users")
        query.get = async () => {
          throw new Error("query_failed");
        };
      return query;
    }) as typeof failedFirebase.firestore.collection;
    const failedReader = await createXpAuditReader(
      readerOptions(failedFirebase, 3),
    );
    await expect(failedReader.countUserDocuments(3)).rejects.toThrow(
      "query_failed",
    );
    expect(failedReader.getReadCount()).toBe(3);

    const before = new AbortController();
    before.abort();
    const beforeFirebase = makeFirebase({ "users/a": user("1") });
    const beforeReader = await createXpAuditReader(
      readerOptions(beforeFirebase, 3, { signal: before.signal }),
    );
    await expect(beforeReader.countUserDocuments(2)).rejects.toThrow(
      "xp_audit_aborted",
    );
    expect(beforeReader.getReadCount()).toBe(0);

    const after = new AbortController();
    const afterFirebase = makeFirebase({ "users/a": user("1") });
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
    const afterReader = await createXpAuditReader(
      readerOptions(afterFirebase, 3, { signal: after.signal }),
    );
    await expect(afterReader.countUserDocuments(2)).rejects.toThrow(
      "xp_audit_aborted",
    );
    expect(afterReader.getReadCount()).toBe(1);
  });

  test("resolves a control email without leaking Auth and maps not-found to null", async () => {
    const firebase = makeFirebase({});
    const reader = await createXpAuditReader(readerOptions(firebase, 2));
    await expect(
      reader.resolveControlEmail("control@example.com"),
    ).resolves.toBe("auth-control");
    await expect(
      reader.resolveControlEmail("missing@example.com"),
    ).resolves.toBeNull();
    expect("auth" in reader).toBe(false);
    expect("firestore" in reader).toBe(false);
  });

  test("reads the control account through the auth_links stable identity anchor", async () => {
    const firebase = makeFirebase({
      "auth_links/auth-control": { stable_id: "stable-control" },
      "users/stable-control": {
        progress: { user_total_xp: "999999" },
        firebaseAuthUid: "auth-control",
        progressServerAuthoritative: true,
        progressServerState: { totalXp: 1234 },
      },
    });
    const reader = await createXpAuditReader(readerOptions(firebase, 10));

    await expect(
      reader.readControlAccount("control@example.com"),
    ).resolves.toMatchObject({
      uid: "stable-control",
      firebaseAuthUid: "auth-control",
      cutover: {
        progressServerAuthoritative: true,
        progressServerStateXp: 1234,
      },
    });
    expect(firebase.calls).toEqual(
      expect.arrayContaining([
        "doc:auth_links/auth-control",
        "doc:users/stable-control",
      ]),
    );
  });

  test("rechecks abort after an Auth user-not-found response", async () => {
    const controller = new AbortController();
    const firebase = makeFirebase({});
    firebase.auth.getUserByEmail = async () => {
      controller.abort();
      throw { code: "auth/user-not-found" };
    };
    const reader = await createXpAuditReader(
      readerOptions(firebase, 2, { signal: controller.signal }),
    );
    await expect(
      reader.resolveControlEmail("missing@example.com"),
    ).rejects.toThrow("xp_audit_aborted");
  });
});
