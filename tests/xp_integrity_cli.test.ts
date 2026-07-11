const createReader = jest.fn();
const loadCatalogs = jest.fn();

jest.mock("../scripts/xp_integrity/firestore_reader", () => ({
  createProductionXpAuditReader: (...args: unknown[]) => createReader(...args),
}));
jest.mock("../scripts/xp_integrity/catalog_history", () => {
  const actual = jest.requireActual("../scripts/xp_integrity/catalog_history");
  return {
    ...actual,
    loadVerifiedCatalogHistory: (...args: unknown[]) => loadCatalogs(...args),
  };
});

import {
  parseCliArgs,
  buildPrerequisiteEvidence,
  isExpectedControlLevel,
  runProductionAudit,
} from "../scripts/audit_production_xp_integrity";
import type { XpAuditReader } from "../scripts/xp_integrity/firestore_reader";
import type { RawUser } from "../scripts/xp_integrity/types";
import { totalXPForLevel } from "../functions/src/xp_levels";

const user = (uid: string, hidden = false): RawUser => ({
  uid,
  firebaseAuthUid: null,
  canonicalStableId: hidden ? "canonical-secret" : null,
  duplicateOfStableId: null,
  identityHidden: hidden,
  identityMergedAtMs: null,
  progress: { totalXp: 10 },
  cutover: {
    progressServerAuthoritative: true,
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

const event = {
  ownerUid: "canonical-secret",
  eventId: "event-secret",
  type: "lesson",
  xpDelta: 10,
  totalXpAfter: 10,
  totalXpBefore: 0,
  serverCreatedAtMs: 1000,
  clientCreatedAtMs: null,
  appVersion: null,
  activeDate: null,
  weekKey: null,
  weekXpAfter: null,
  payload: {},
  normalizationValid: true,
} as const;

const completeCatalog = {
  complete: true,
  rewards: new Map(),
  effective: {
    fromMsInclusive: 0,
    toMsExclusive: null,
    provenance: "verified_release_commit",
  },
  levelFormula: {
    sourceCommit: "commit",
    formulaId: "formula",
    effective: {
      fromMsInclusive: 0,
      toMsExclusive: null,
      provenance: "verified_release_commit",
    },
    totalXpThresholds: [0],
    maxLevel: 1,
  },
  commit: "commit",
  appVersion: null,
} as const;

const readerFor = (
  pages: Array<{
    users: readonly RawUser[];
    done: boolean;
    nextAfterUid: string | null;
  }>,
  eventFailure = false,
): jest.Mocked<XpAuditReader> => ({
  countUserDocuments: jest.fn(async (_pageSize: number) => 0),
  pageUsers: jest.fn(
    async (_afterUid: string | null, _limit: number) =>
      pages.shift() ?? { users: [], done: true, nextAfterUid: null },
  ),
  pageProgressEvents: jest.fn(
    async (_uid: string, _afterEventId: string | null, _limit: number) => {
      if (eventFailure) throw new Error("partial");
      return { events: [event], nextAfterEventId: "event-secret", done: true };
    },
  ),
  readAliases: jest.fn(async (_user: RawUser) => ({
    aliases: [],
    complete: true,
  })),
  readMirrors: jest.fn(async (_user: RawUser) => ({
    leaderboardXp: null,
    arenaXp: null,
    leagueXp: null,
  })),
  resolveControlEmail: jest.fn(async (_email: string) => null),
  readControlAccount: jest.fn(async (_email: string) => null),
  getReadCount: jest.fn(() => 7),
  close: jest.fn(async () => undefined),
});

describe("production XP integrity CLI", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    loadCatalogs.mockReturnValue([completeCatalog]);
  });
  test.each(["--apply", "--write", "--repair", "--send", "--wat=1"])(
    "rejects unsupported option %s",
    (flag) => expect(() => parseCliArgs([flag], {})).toThrow(),
  );

  test("rejects sample/full conflicts and full mode without an explicit budget", () => {
    expect(() =>
      parseCliArgs(["--sample=2", "--full", "--max-reads=10"], {}),
    ).toThrow(/conflict/i);
    expect(() => parseCliArgs(["--full"], {})).toThrow(/max-reads/i);
  });

  test("does not echo rejected CLI values that could contain private identity", () => {
    let message = "";
    try {
      parseCliArgs(["private@example.com"], {});
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toBe("xp_audit_unknown_flag");
    expect(message).not.toContain("private@example.com");
  });

  test("validates ranges before any reader can be constructed", () => {
    expect(() => parseCliArgs(["--sample=0"], {})).toThrow(/sample/i);
    expect(() => parseCliArgs(["--sample=251"], {})).toThrow(/sample/i);
    expect(() => parseCliArgs(["--concurrency=9"], {})).toThrow(/concurrency/i);
    expect(() => parseCliArgs(["--max-reads=0"], {})).toThrow(/max-reads/i);
    expect(() => parseCliArgs(["--project=../../bad"], {})).toThrow(/project/i);
  });

  test("defaults to a 25 canonical-account sample and uses stable project environment", () => {
    expect(
      parseCliArgs([], { GOOGLE_CLOUD_PROJECT: "safe-project-1" }),
    ).toEqual({
      mode: "sample",
      sampleSize: 25,
      maximumReads: 5000,
      maximumReadsExplicit: false,
      concurrency: 4,
      projectId: "safe-project-1",
    });
  });

  test("returns 0 for complete infrastructure and evidence and closes the reader", async () => {
    const reader = readerFor([
      {
        users: [user("canonical-secret")],
        done: true,
        nextAfterUid: "canonical-secret",
      },
    ]);
    createReader.mockResolvedValue(reader);
    const outcome = await runProductionAudit(
      parseCliArgs(["--sample=1"], { GOOGLE_CLOUD_PROJECT: "safe-project-1" }),
      { GOOGLE_CLOUD_PROJECT: "safe-project-1" },
    );
    expect(outcome.exitCode).toBe(0);
    expect(reader.close).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(outcome.report)).not.toMatch(
      /canonical-secret|event-secret|@/,
    );
  });

  test("returns 2 when infrastructure is complete but verified catalogs are missing", async () => {
    loadCatalogs.mockReturnValue([]);
    const reader = readerFor([
      {
        users: [user("canonical-secret")],
        done: true,
        nextAfterUid: "canonical-secret",
      },
    ]);
    createReader.mockResolvedValue(reader);
    const outcome = await runProductionAudit(
      parseCliArgs(["--sample=1"], { GOOGLE_CLOUD_PROJECT: "safe-project-1" }),
      { GOOGLE_CLOUD_PROJECT: "safe-project-1" },
    );
    expect(outcome.exitCode).toBe(2);
    expect(outcome.report.coverage.infrastructureComplete).toBe(true);
    expect(outcome.report.coverage.evidenceComplete).toBe(false);
  });

  test("returns 1 after a partial read and still closes the reader", async () => {
    const reader = readerFor(
      [
        {
          users: [user("canonical-secret")],
          done: true,
          nextAfterUid: "canonical-secret",
        },
      ],
      true,
    );
    createReader.mockResolvedValue(reader);
    const outcome = await runProductionAudit(
      parseCliArgs(["--sample=1"], { GOOGLE_CLOUD_PROJECT: "safe-project-1" }),
      { GOOGLE_CLOUD_PROJECT: "safe-project-1" },
    );
    expect(outcome.exitCode).toBe(1);
    expect(outcome.report.coverage.failedAccounts).toBe(1);
    expect(reader.close).toHaveBeenCalledTimes(1);
  });

  test("failed and alias documents do not consume the successful sample target", async () => {
    const failed = user("failed-secret");
    const hidden = user("hidden-secret", true);
    const goodA = user("good-a-secret");
    const goodB = user("good-b-secret");
    const pages = [
      { users: [failed, hidden], done: false, nextAfterUid: hidden.uid },
      { users: [goodA], done: false, nextAfterUid: goodA.uid },
      { users: [goodB], done: true, nextAfterUid: goodB.uid },
    ];
    const reader = readerFor(pages);
    reader.pageProgressEvents.mockImplementation(async (uid) => {
      if (uid === failed.uid) throw new Error("partial");
      return {
        events: [{ ...event, ownerUid: uid }],
        nextAfterEventId: "event-secret",
        done: true,
      };
    });
    createReader.mockResolvedValue(reader);
    const outcome = await runProductionAudit(
      parseCliArgs(["--sample=2", "--concurrency=2"], {
        GOOGLE_CLOUD_PROJECT: "safe-project-1",
      }),
      { GOOGLE_CLOUD_PROJECT: "safe-project-1" },
    );
    expect(outcome.report.coverage).toMatchObject({
      canonicalAccountsScanned: 2,
      skippedAccounts: 1,
      failedAccounts: 1,
    });
    expect(reader.pageUsers).toHaveBeenCalledTimes(3);
  });

  test("documents without persisted XP are skipped without degrading infrastructure", async () => {
    const withoutXp: RawUser = {
      ...user("no-xp-secret"),
      progress: {},
      cutover: {
        ...user("ignored").cutover,
        progressServerStateXp: null,
      },
    };
    const good = user("good-secret");
    const reader = readerFor([
      { users: [withoutXp], done: false, nextAfterUid: withoutXp.uid },
      { users: [good], done: true, nextAfterUid: good.uid },
    ]);
    createReader.mockResolvedValue(reader);

    const outcome = await runProductionAudit(
      parseCliArgs(["--sample=1"], { GOOGLE_CLOUD_PROJECT: "safe-project-1" }),
    );

    expect(outcome.report.coverage).toMatchObject({
      infrastructureComplete: true,
      canonicalAccountsScanned: 1,
      skippedAccounts: 1,
      failedAccounts: 0,
    });
  });

  test("bounds concurrent account audits and never exceeds the successful sample target", async () => {
    let active = 0;
    let maximumActive = 0;
    const users = [
      user("one-secret"),
      user("two-secret"),
      user("three-secret"),
    ];
    const reader = readerFor([
      { users, done: true, nextAfterUid: users.at(-1)?.uid ?? null },
    ]);
    reader.pageProgressEvents.mockImplementation(async (uid) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return {
        events: [{ ...event, ownerUid: uid }],
        nextAfterEventId: "event-secret",
        done: true,
      };
    });
    createReader.mockResolvedValue(reader);
    const outcome = await runProductionAudit(
      parseCliArgs(["--sample=3", "--concurrency=2"], {
        GOOGLE_CLOUD_PROJECT: "safe-project-1",
      }),
      { GOOGLE_CLOUD_PROJECT: "safe-project-1" },
    );
    expect(maximumActive).toBe(2);
    expect(outcome.report.coverage.canonicalAccountsScanned).toBe(3);
  });

  test("does not mark the principal verified when reader IAM construction fails", async () => {
    createReader.mockRejectedValue(new Error("iam-proof-failed"));
    const outcome = await runProductionAudit(
      parseCliArgs(["--sample=1"], { GOOGLE_CLOUD_PROJECT: "safe-project-1" }),
      { GOOGLE_CLOUD_PROJECT: "safe-project-1" },
    );
    expect(
      (outcome as typeof outcome & { principalReadOnlyVerified?: boolean })
        .principalReadOnlyVerified,
    ).toBe(false);
    expect(outcome.exitCode).toBe(1);
  });

  test("pages past a hidden alias until it reaches the requested canonical account", async () => {
    const hidden = user("hidden-alias-secret", true);
    const reader = readerFor([
      { users: [hidden], done: false, nextAfterUid: hidden.uid },
      {
        users: [user("canonical-secret")],
        done: true,
        nextAfterUid: "canonical-secret",
      },
    ]);
    reader.readAliases.mockResolvedValue({
      aliases: [
        {
          uid: hidden.uid,
          canonicalUid: "canonical-secret",
          linkage: "canonical_pointer",
          identityMergedAtMs: null,
          events: [],
          complete: true,
        },
      ],
      complete: true,
    });
    createReader.mockResolvedValue(reader);
    const outcome = await runProductionAudit(
      parseCliArgs(["--sample=1"], { GOOGLE_CLOUD_PROJECT: "safe-project-1" }),
      { GOOGLE_CLOUD_PROJECT: "safe-project-1" },
    );
    expect(reader.pageUsers).toHaveBeenCalledTimes(2);
    expect(reader.pageUsers).toHaveBeenNthCalledWith(1, null, 1);
    expect(outcome.report.coverage).toMatchObject({
      userDocumentsSeen: 2,
      canonicalAccountsScanned: 1,
      aliasDocumentsCovered: 1,
      skippedAccounts: 0,
      failedAccounts: 0,
    });
  });

  test("does not analyze an alias again when closure discovery precedes its user page entry", async () => {
    const first = user("canonical-secret-a");
    const sharedAlias = user("shared-alias-secret");
    const reader = readerFor([
      {
        users: [first, sharedAlias],
        done: true,
        nextAfterUid: sharedAlias.uid,
      },
    ]);
    reader.readAliases.mockResolvedValueOnce({
      aliases: [
        {
          uid: sharedAlias.uid,
          canonicalUid: first.uid,
          linkage: "shared_auth_uid",
          identityMergedAtMs: null,
          events: [],
          complete: true,
        },
      ],
      complete: true,
    });
    createReader.mockResolvedValue(reader);
    const outcome = await runProductionAudit(
      parseCliArgs(["--sample=2"], { GOOGLE_CLOUD_PROJECT: "safe-project-1" }),
      { GOOGLE_CLOUD_PROJECT: "safe-project-1" },
    );
    expect(outcome.report.coverage).toMatchObject({
      userDocumentsSeen: 2,
      canonicalAccountsScanned: 1,
      aliasDocumentsCovered: 1,
    });
    expect(
      Object.values(outcome.report.classes).reduce((a, b) => a + b, 0),
    ).toBe(1);
  });

  test("calibration emits booleans only and never the private identity", async () => {
    const controlUser = {
      ...user("canonical-secret"),
      firebaseAuthUid: "control-private-uid",
    };
    const reader = readerFor([
      { users: [controlUser], done: true, nextAfterUid: "canonical-secret" },
    ]);
    reader.resolveControlEmail.mockResolvedValue("control-private-uid");
    createReader.mockResolvedValue(reader);
    const outcome = await runProductionAudit(
      parseCliArgs(["--sample=1"], { GOOGLE_CLOUD_PROJECT: "safe-project-1" }),
      {
        GOOGLE_CLOUD_PROJECT: "safe-project-1",
        XP_AUDIT_CONTROL_EMAIL: "private@example.com",
      },
    );
    expect(outcome.report.calibration).toEqual({
      ran: true,
      resolved: true,
      matchedExpectedLevelNeighborhood: false,
      migrationIndicatorDetected: false,
      achievementIndicatorDetected: false,
    });
    expect(JSON.stringify(outcome.report)).not.toMatch(
      /control-private-uid|private@example\.com/,
    );
  });

  test("uses authoritative server XP after cutover instead of stale client progress", async () => {
    const controlUser: RawUser = {
      ...user("canonical-secret"),
      firebaseAuthUid: "control-private-uid",
      progress: { totalXp: totalXPForLevel(50) },
      cutover: {
        ...user("ignored").cutover,
        progressServerAuthoritative: true,
        progressServerStateXp: totalXPForLevel(8),
      },
    };
    const reader = readerFor([
      { users: [controlUser], done: true, nextAfterUid: "canonical-secret" },
    ]);
    reader.resolveControlEmail.mockResolvedValue("control-private-uid");
    createReader.mockResolvedValue(reader);

    const outcome = await runProductionAudit(
      parseCliArgs(["--sample=1"], { GOOGLE_CLOUD_PROJECT: "safe-project-1" }),
      {
        GOOGLE_CLOUD_PROJECT: "safe-project-1",
        XP_AUDIT_CONTROL_EMAIL: "private@example.com",
      },
    );

    expect(outcome.report.calibration.matchedExpectedLevelNeighborhood).toBe(
      true,
    );
  });

  test("calibrates the control account directly even when it is outside the sample", async () => {
    const controlUser: RawUser = {
      ...user("control-stable-secret"),
      firebaseAuthUid: "control-auth-secret",
      cutover: {
        ...user("ignored").cutover,
        progressServerAuthoritative: true,
        progressServerStateXp: totalXPForLevel(8),
      },
    };
    const reader = readerFor([
      {
        users: [user("different-sample-secret")],
        done: true,
        nextAfterUid: "different-sample-secret",
      },
    ]);
    reader.resolveControlEmail.mockResolvedValue("control-auth-secret");
    reader.readControlAccount.mockResolvedValue(controlUser);
    createReader.mockResolvedValue(reader);

    const outcome = await runProductionAudit(
      parseCliArgs(["--sample=1"], { GOOGLE_CLOUD_PROJECT: "safe-project-1" }),
      {
        GOOGLE_CLOUD_PROJECT: "safe-project-1",
        XP_AUDIT_CONTROL_EMAIL: "private@example.com",
      },
    );

    expect(outcome.report.calibration).toMatchObject({
      ran: true,
      resolved: true,
      matchedExpectedLevelNeighborhood: true,
    });
    expect(JSON.stringify(outcome.report)).not.toMatch(
      /control-stable-secret|control-auth-secret|private@example\.com/,
    );
  });

  test("accepts the persisted user_total_xp string used by cloud sync", async () => {
    const persistedUser: RawUser = {
      ...user("canonical-secret"),
      progress: { user_total_xp: "1234" },
      cutover: {
        ...user("ignored").cutover,
        progressServerAuthoritative: false,
      },
    };
    const reader = readerFor([
      { users: [persistedUser], done: true, nextAfterUid: "canonical-secret" },
    ]);
    createReader.mockResolvedValue(reader);

    const outcome = await runProductionAudit(
      parseCliArgs(["--sample=1"], { GOOGLE_CLOUD_PROJECT: "safe-project-1" }),
    );

    expect(outcome.report.coverage.canonicalAccountsScanned).toBe(1);
    expect(outcome.report.coverage.failedAccounts).toBe(0);
  });

  test("calibration uses the trusted level formula for the accepted 7..9 neighborhood", () => {
    expect(isExpectedControlLevel(totalXPForLevel(2))).toBe(false);
    expect(isExpectedControlLevel(totalXPForLevel(8))).toBe(true);
  });

  test("builds only authoritative lifetime and weekly prerequisite evidence", () => {
    const rewards = new Map([
      [
        "xp_10",
        {
          achievementId: "xp_10",
          xp: 1,
          prerequisite: { kind: "lifetime_xp", minimum: 10 } as const,
        },
      ],
      [
        "weekly_xp_10",
        {
          achievementId: "weekly_xp_10",
          xp: 1,
          prerequisite: { kind: "weekly_xp", minimum: 10 } as const,
        },
      ],
      [
        "streak_5",
        {
          achievementId: "streak_5",
          xp: 1,
          prerequisite: {
            kind: "counter",
            counterKey: "streak_count",
            minimum: 5,
          } as const,
        },
      ],
    ]);
    const catalog = { ...completeCatalog, rewards };
    const evidence = buildPrerequisiteEvidence(
      [
        {
          ...event,
          eventId: "lifetime",
          type: "achievement_reward",
          totalXpBefore: 12,
          payload: { achievementId: "xp_10", valueBefore: 999 },
        },
        {
          ...event,
          eventId: "weekly",
          type: "achievement_reward",
          xpDelta: 2,
          weekXpAfter: 12,
          payload: { achievementId: "weekly_xp_10", weekXp: 999 },
        },
        {
          ...event,
          eventId: "counter",
          type: "achievement_reward",
          payload: { achievementId: "streak_5", streak_count: 999 },
        },
      ],
      [catalog],
    );
    expect(evidence).toEqual([
      expect.objectContaining({
        eventId: "lifetime",
        state: "exact",
        valueBefore: 12,
        source: "server_result",
      }),
      expect.objectContaining({
        eventId: "weekly",
        state: "exact",
        valueBefore: 10,
        source: "server_result",
      }),
      expect.objectContaining({ eventId: "counter", state: "missing" }),
    ]);
  });

  test("marks malformed and unmapped achievement events as missing prerequisite evidence", () => {
    const evidence = buildPrerequisiteEvidence(
      [
        {
          ...event,
          eventId: "missing-id",
          type: "achievement_reward",
          payload: {},
        },
        {
          ...event,
          eventId: "unmapped",
          type: "achievement_reward",
          payload: { achievementId: "not_in_catalog" },
        },
      ],
      [completeCatalog],
    );
    expect(evidence).toHaveLength(2);
    expect(evidence.map((item) => item.state)).toEqual(["missing", "missing"]);
  });

  test("keeps the global Jest contract and exposes a dedicated worktree-safe audit command", () => {
    const packageJson = jest.requireActual("../package.json") as {
      scripts: Record<string, string>;
      jest: { testMatch: string[] };
    };
    expect(packageJson.jest.testMatch).toEqual([
      "<rootDir>/tests/**/*.test.ts",
    ]);
    expect(packageJson.scripts["test:xp-integrity"]).toContain(
      "jest.xp-integrity.config.cjs",
    );
    expect(() =>
      require.resolve("../jest.xp-integrity.config.cjs"),
    ).not.toThrow();
  });
});
