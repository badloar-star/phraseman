import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const repoRoot = path.resolve(__dirname, "..");
const guardPath = path.join(repoRoot, "scripts/admin_hosting_deploy_guard.mjs");

type GuardInput = {
  root: string;
  gitTopLevel: string;
  gitCommonDir: string;
  firebaseConfig: unknown;
  liveAdminExists: boolean;
  adminEntryExists: boolean;
  linkedReleaseOverride?: string;
  branch?: string;
  statusPorcelain?: string;
};

function evaluateGuard(input: GuardInput): { ok: boolean; errors: string[] } {
  const moduleUrl = pathToFileURL(guardPath).href;
  const program = `import(${JSON.stringify(moduleUrl)}).then(({ evaluateAdminHostingWorkspace }) => process.stdout.write(JSON.stringify(evaluateAdminHostingWorkspace(${JSON.stringify(input)}))))`;
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "--eval", program],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  );

  expect(result.status).toBe(0);
  return JSON.parse(result.stdout) as { ok: boolean; errors: string[] };
}

describe("admin hosting deploy guard", () => {
  test("is mandatory for every package script that can publish hosting:admin", () => {
    const scripts = (
      JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8")) as {
        scripts: Record<string, string>;
      }
    ).scripts;

    expect(existsSync(guardPath)).toBe(true);
    for (const [name, command] of Object.entries(scripts).filter(
      ([, command]) => command.includes("hosting:admin"),
    )) {
      expect(command).toContain("node scripts/admin_hosting_deploy_guard.mjs");
      expect(command.indexOf("admin_hosting_deploy_guard.mjs")).toBeLessThan(
        command.indexOf("firebase deploy"),
      );
      expect(name).toBeTruthy();
    }
  });

  test("accepts the primary worktree with the exact live hosting directory", () => {
    const root = path.resolve("C:/repo");
    const result = evaluateGuard({
      root,
      gitTopLevel: root,
      gitCommonDir: path.join(root, ".git"),
      firebaseConfig: {
        hosting: [
          {
            target: "admin",
            public: "admin",
            ignore: ["v2/**"],
            redirects: [
              { source: "/v2", destination: "/legacy.html" },
              { source: "/v2/**", destination: "/legacy.html" },
            ],
          },
        ],
      },
      liveAdminExists: true,
      adminEntryExists: true,
    });

    expect(result).toEqual({ ok: true, errors: [] });
  });

  test("fails closed in a linked or stale worktree", () => {
    const primaryRoot = path.resolve("C:/repo");
    const linkedRoot = path.join(primaryRoot, ".worktrees", "stale-release");
    const result = evaluateGuard({
      root: linkedRoot,
      gitTopLevel: linkedRoot,
      gitCommonDir: path.join(primaryRoot, ".git"),
      firebaseConfig: {
        hosting: [
          {
            target: "admin",
            public: "admin",
            ignore: ["v2/**"],
            redirects: [
              { source: "/v2", destination: "/legacy.html" },
              { source: "/v2/**", destination: "/legacy.html" },
            ],
          },
        ],
      },
      liveAdminExists: true,
      adminEntryExists: true,
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("primary worktree");
  });

  test("accepts only the explicitly authorized clean d920 release branch", () => {
    const primaryRoot = path.resolve("C:/appsprojects/phraseman");
    const linkedRoot = path.resolve(
      "C:/Users/badlo/.codex/worktrees/d920/phraseman",
    );
    const result = evaluateGuard({
      root: linkedRoot,
      gitTopLevel: linkedRoot,
      gitCommonDir: path.join(primaryRoot, ".git"),
      firebaseConfig: {
        hosting: [
          {
            target: "admin",
            public: "admin",
            ignore: ["v2/**"],
            redirects: [
              { source: "/v2", destination: "/legacy.html" },
              { source: "/v2/**", destination: "/legacy.html" },
            ],
          },
        ],
      },
      liveAdminExists: true,
      adminEntryExists: true,
      linkedReleaseOverride: "1",
      branch: "codex/admin-analytics-current",
      statusPorcelain: "",
    });

    expect(result).toEqual({ ok: true, errors: [] });
  });

  test.each([
    ["wrong env", { linkedReleaseOverride: "true" }],
    ["wrong branch", { branch: "main" }],
    ["dirty worktree", { statusPorcelain: " M admin/legacy.html" }],
    [
      "wrong linked root",
      {
        root: path.resolve("C:/Users/badlo/.codex/worktrees/other/phraseman"),
        gitTopLevel: path.resolve(
          "C:/Users/badlo/.codex/worktrees/other/phraseman",
        ),
      },
    ],
  ])("rejects linked release override with %s", (_label, overrides) => {
    const primaryRoot = path.resolve("C:/appsprojects/phraseman");
    const linkedRoot = path.resolve(
      "C:/Users/badlo/.codex/worktrees/d920/phraseman",
    );
    const result = evaluateGuard({
      root: linkedRoot,
      gitTopLevel: linkedRoot,
      gitCommonDir: path.join(primaryRoot, ".git"),
      firebaseConfig: {
        hosting: [
          {
            target: "admin",
            public: "admin",
            ignore: ["v2/**"],
            redirects: [
              { source: "/v2", destination: "/legacy.html" },
              { source: "/v2/**", destination: "/legacy.html" },
            ],
          },
        ],
      },
      liveAdminExists: true,
      adminEntryExists: true,
      linkedReleaseOverride: "1",
      branch: "codex/admin-analytics-current",
      statusPorcelain: "",
      ...overrides,
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("primary worktree");
  });

  test("fails closed when Firebase would publish the blocked v2 directory", () => {
    const root = path.resolve("C:/repo");
    const result = evaluateGuard({
      root,
      gitTopLevel: root,
      gitCommonDir: path.join(root, ".git"),
      firebaseConfig: {
        hosting: [
          { target: "admin", public: "admin/v2", ignore: [], redirects: [] },
        ],
      },
      liveAdminExists: true,
      adminEntryExists: true,
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("must publish admin");
  });

  test("fails closed unless the blocked subtree is excluded and redirected away", () => {
    const root = path.resolve("C:/repo");
    const result = evaluateGuard({
      root,
      gitTopLevel: root,
      gitCommonDir: path.join(root, ".git"),
      firebaseConfig: {
        hosting: [
          { target: "admin", public: "admin", ignore: [], redirects: [] },
        ],
      },
      liveAdminExists: true,
      adminEntryExists: true,
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("exclude v2/**");
    expect(result.errors.join("\n")).toContain("must redirect to /legacy.html");
  });
});
