import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const ROOT = path.join(__dirname, "..");
const CLI_RELATIVE = path.join("scripts", "audit_production_xp_integrity.ts");
const CLI_PATH = path.join(ROOT, CLI_RELATIVE);
const AUDIT_SOURCE_ROOT = path.join(ROOT, "scripts", "xp_integrity");

function expectCliImplementation(): void {
  expect(existsSync(CLI_PATH)).toBe(true);
}

function runCli(args: readonly string[]) {
  if (process.platform === "win32") {
    return spawnSync(
      "cmd.exe",
      ["/d", "/s", "/c", ["npx", "tsx", CLI_RELATIVE, ...args].join(" ")],
      { cwd: ROOT, encoding: "utf8" },
    );
  }

  return spawnSync("npx", ["tsx", CLI_RELATIVE, ...args], {
    cwd: ROOT,
    encoding: "utf8",
  });
}

function listTypeScriptFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return listTypeScriptFiles(absolute);
    return entry.isFile() && entry.name.endsWith(".ts") ? [absolute] : [];
  });
}

describe("production XP integrity audit read-only contract", () => {
  it.each(["--apply", "--write", "--repair", "--send"])(
    "rejects forbidden flag %s before reading Firebase",
    (flag) => {
      expectCliImplementation();

      const result = runCli([flag]);

      expect(result.status).not.toBe(0);
      expect(`${result.stdout}\n${result.stderr}`).toMatch(
        /forbidden|unknown|read[- ]only/i,
      );
    },
  );

  it("pins every report path below .codex-tmp/xp-integrity-audit", () => {
    expectCliImplementation();

    const source = readFileSync(CLI_PATH, "utf8");
    expect(source).toMatch(
      /path\.join\(root,\s*['"]\.codex-tmp['"],\s*['"]xp-integrity-audit['"],\s*runId\)/,
    );
  });

  it("isolates Firebase imports in firestore_reader.ts", () => {
    const auditSources = [
      ...listTypeScriptFiles(AUDIT_SOURCE_ROOT),
      ...(existsSync(CLI_PATH) ? [CLI_PATH] : []),
    ];
    const firebaseImport =
      /(?:from\s+|import\s*\()\s*['"](?:firebase|firebase-admin)(?:\/[^'"]*)?['"]/;

    for (const sourcePath of auditSources) {
      if (path.basename(sourcePath) === "firestore_reader.ts") continue;
      expect(readFileSync(sourcePath, "utf8")).not.toMatch(firebaseImport);
    }
  });
});
