import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  loadVerifiedCatalogHistory,
  matchCatalogForEvent,
  parseAchievementCatalog,
} from "../scripts/xp_integrity/catalog_history";
import type {
  CatalogSnapshot,
  EffectiveWindow,
} from "../scripts/xp_integrity/types";

const SOURCE = `
  export const ALL_ACHIEVEMENTS = [
    { id: 'xp_5000', xp: 150 },
    { id: 'weekly_xp_10000', xp: 900 },
    { id: 'streak_7', xp: 75 },
    { id: 'mystery_rule', xp: 40 },
    { id: dynamicId, xp: 999 },
    { id: 'dynamic_reward', xp: reward },
  ];
`;

const window = (
  fromMsInclusive: number,
  toMsExclusive: number | null,
  provenance: EffectiveWindow["provenance"] = "verified_release_commit",
): EffectiveWindow => ({ fromMsInclusive, toMsExclusive, provenance });

function snapshot(
  commit: string,
  appVersion: string,
  effective: EffectiveWindow,
  xp = 150,
  thresholds: readonly number[] = [0, 400, 1412],
): CatalogSnapshot {
  return {
    commit,
    appVersion,
    effective,
    rewards: new Map([
      [
        "xp_5000",
        {
          achievementId: "xp_5000",
          xp,
          prerequisite: { kind: "lifetime_xp" as const, minimum: 5000 },
        },
      ],
    ]),
    levelFormula: {
      sourceCommit: commit,
      formulaId: `formula-${commit}`,
      effective,
      totalXpThresholds: thresholds,
      maxLevel: thresholds.length,
    },
    complete: true,
  };
}

function event(
  serverCreatedAtMs: number | null,
  appVersion: string | null = null,
  clientCreatedAtMs: number | null = null,
) {
  return { serverCreatedAtMs, appVersion, clientCreatedAtMs };
}

function git(repo: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
}

function writeFixtureFiles(repo: string, serverStep = 100): void {
  mkdirSync(join(repo, "app"), { recursive: true });
  mkdirSync(join(repo, "constants"), { recursive: true });
  mkdirSync(join(repo, "functions", "src"), { recursive: true });
  writeFileSync(join(repo, "app", "achievements.ts"), SOURCE);
  const client = `
    export const MAX_LEVEL = 3;
    export const TOTAL_XP_FOR_LEVEL = (level: number): number => {
      if (level <= 1) return 0;
      return level * 100;
    };
  `;
  const server = `
    export const MAX_LEVEL = 3;
    export const totalXPForLevel = (level: number): number => {
      if (level <= 1) return 0;
      return level * ${serverStep};
    };
  `;
  writeFileSync(join(repo, "constants", "theme.ts"), client);
  writeFileSync(join(repo, "functions", "src", "xp_levels.ts"), server);
  writeFileSync(
    join(repo, "app.json"),
    JSON.stringify({ expo: { version: "9.9.9" } }),
  );
}

function makeRepo(serverStep = 100): { repo: string; commit: string } {
  const repo = mkdtempSync(join(tmpdir(), "xp-catalog-"));
  git(repo, "init", "-q");
  git(repo, "config", "core.autocrlf", "false");
  git(repo, "config", "user.email", "catalog-test@example.invalid");
  git(repo, "config", "user.name", "Catalog Test");
  writeFixtureFiles(repo, serverStep);
  git(repo, "add", ".");
  git(repo, "commit", "-qm", "fixture");
  return { repo, commit: git(repo, "rev-parse", "HEAD") };
}

describe("parseAchievementCatalog", () => {
  it("extracts only literal achievement ids and XP rewards", () => {
    const rewards = parseAchievementCatalog(SOURCE, "achievements.ts");

    expect([...rewards.keys()]).toEqual([
      "xp_5000",
      "weekly_xp_10000",
      "streak_7",
      "mystery_rule",
    ]);
    expect(rewards.get("xp_5000")?.xp).toBe(150);
  });

  it("maps lifetime, weekly, explicit counter, and unsupported prerequisites", () => {
    const rewards = parseAchievementCatalog(SOURCE, "achievements.ts");

    expect(rewards.get("xp_5000")?.prerequisite).toEqual({
      kind: "lifetime_xp",
      minimum: 5000,
    });
    expect(rewards.get("weekly_xp_10000")?.prerequisite).toEqual({
      kind: "weekly_xp",
      minimum: 10000,
    });
    expect(rewards.get("streak_7")?.prerequisite).toEqual({
      kind: "counter",
      counterKey: "streak_count",
      minimum: 7,
    });
    expect(rewards.get("mystery_rule")?.prerequisite).toEqual({
      kind: "unsupported",
      ruleId: "mystery_rule",
    });
  });
});

describe("matchCatalogForEvent", () => {
  it("uses the single verified server-time window", () => {
    const catalog = snapshot("a", "1.0.0", window(100, 200));

    expect(matchCatalogForEvent([catalog], event(150), "xp_5000")).toEqual({
      kind: "exact",
      snapshot: catalog,
      basis: "verified_server_window",
    });
  });

  it("leaves unknown achievement ids unmapped", () => {
    const catalog = snapshot("a", "1.0.0", window(100, 200));
    expect(matchCatalogForEvent([catalog], event(150), "unknown")).toEqual({
      kind: "unmapped",
      reason: "unknown_version",
    });
  });

  it.each([
    ["gap", [snapshot("a", "1.0.0", window(100, 200))], event(250), "gap"],
    [
      "overlap",
      [
        snapshot("a", "1.0.0", window(100, 300)),
        snapshot("b", "2.0.0", window(200, 400), 151),
      ],
      event(250),
      "overlap",
    ],
    [
      "forged client version",
      [
        snapshot("a", "1.0.0", window(100, 200)),
        snapshot("b", "2.0.0", window(200, 300)),
      ],
      event(250, "1.0.0", 250),
      "provenance_conflict",
    ],
    [
      "offline-delayed client timestamp",
      [
        snapshot("a", "1.0.0", window(100, 200)),
        snapshot("b", "2.0.0", window(200, 300)),
      ],
      event(250, "2.0.0", 150),
      "provenance_conflict",
    ],
    [
      "client/server window conflict",
      [
        snapshot("a", "1.0.0", window(100, 200)),
        snapshot("b", "2.0.0", window(200, 300)),
      ],
      event(250, "1.0.0", 150),
      "provenance_conflict",
    ],
  ] as const)("fails closed for %s", (_name, catalogs, auditEvent, reason) => {
    expect(matchCatalogForEvent(catalogs, auditEvent, "xp_5000")).toEqual({
      kind: "unmapped",
      reason,
    });
  });

  it("rejects missing server time before considering client claims", () => {
    const catalog = snapshot("a", "1.0.0", window(100, 200));
    expect(
      matchCatalogForEvent([catalog], event(null, "1.0.0", 150), "xp_5000"),
    ).toEqual({
      kind: "unmapped",
      reason: "missing_server_time",
    });
  });

  it("does not resolve duplicate-version ambiguity arbitrarily", () => {
    const catalogs = [
      snapshot("a", "1.0.0", window(100, 300)),
      snapshot("b", "1.0.0", window(200, 400), 151),
    ];
    expect(
      matchCatalogForEvent(catalogs, event(250, "1.0.0", 250), "xp_5000"),
    ).toEqual({
      kind: "unmapped",
      reason: "overlap",
    });
  });

  it("returns consensus only for identical reward, prerequisite, and thresholds", () => {
    const catalogs = [
      snapshot("a", "1.0.0", window(100, 300)),
      snapshot("b", "1.0.0", window(200, 400)),
    ];
    expect(
      matchCatalogForEvent(catalogs, event(250, "1.0.0", 250), "xp_5000"),
    ).toEqual({
      kind: "consensus",
      candidates: catalogs,
    });

    const changedFormula = [
      catalogs[0],
      snapshot("c", "1.0.0", window(200, 400), 150, [0, 400, 1413]),
    ];
    expect(
      matchCatalogForEvent(changedFormula, event(250, "1.0.0", 250), "xp_5000"),
    ).toEqual({
      kind: "unmapped",
      reason: "overlap",
    });
  });
});

describe("loadVerifiedCatalogHistory", () => {
  it("does not treat app.json, commit time, or checkpoint tags as release provenance", () => {
    const { repo } = makeRepo();
    git(repo, "tag", "checkpoint/stable-build-2026-01-01");

    expect(loadVerifiedCatalogHistory(repo)).toEqual([]);
  });

  it("loads an exact release tag and compares client/server threshold arrays", () => {
    const matching = makeRepo();
    git(matching.repo, "tag", "-a", "v1.2.3", "-m", "release");
    const [complete] = loadVerifiedCatalogHistory(matching.repo);

    expect(complete.appVersion).toBe("1.2.3");
    expect(complete.commit).toBe(matching.commit);
    expect(complete.levelFormula.totalXpThresholds).toEqual([0, 200, 300]);
    expect(complete.complete).toBe(true);

    const mismatched = makeRepo(101);
    git(mismatched.repo, "tag", "-a", "release/v1.2.4", "-m", "release");
    expect(loadVerifiedCatalogHistory(mismatched.repo)[0]?.complete).toBe(
      false,
    );
  });

  it("loads a tracked build manifest only with version, SHA, and activation time", () => {
    const { repo, commit } = makeRepo();
    mkdirSync(join(repo, "docs", "xp-integrity"), { recursive: true });
    writeFileSync(
      join(repo, "docs", "xp-integrity", "build-manifest.json"),
      JSON.stringify({
        releases: [
          {
            version: "3.0.0",
            sha: commit,
            activatedAt: "2026-01-02T00:00:00Z",
          },
        ],
      }),
    );
    git(repo, "add", ".");
    git(repo, "commit", "-qm", "tracked manifest");

    expect(loadVerifiedCatalogHistory(repo)).toHaveLength(1);

    writeFileSync(
      join(repo, "docs", "xp-integrity", "build-manifest.json"),
      JSON.stringify({ releases: [{ version: "3.0.0", sha: commit }] }),
    );
    expect(loadVerifiedCatalogHistory(repo)).toEqual([]);
  });
});
