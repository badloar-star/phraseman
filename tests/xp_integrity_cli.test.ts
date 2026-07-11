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
  runProductionAudit,
} from "../scripts/audit_production_xp_integrity";
import type { XpAuditReader } from "../scripts/xp_integrity/firestore_reader";
import type { RawUser } from "../scripts/xp_integrity/types";

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
    expect(reader.pageProgressEvents).toHaveBeenCalledTimes(1);
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
});
