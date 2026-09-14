import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const domains = [
  "identity",
  "learning",
  "economy-entitlements",
  "voice-ai",
  "admin-commands",
  "telemetry-privacy",
  "release",
];

const sections = [
  "Owner",
  "Source of truth",
  "Authority",
  "Invariants",
  "Idempotency",
  "Offline behavior",
  "Security and privacy",
  "Recovery",
  "Owning tests",
];

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "domain-contracts-"));
  const dir = join(root, "docs", "architecture", "domains");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(root, "evidence.md"), "# Evidence\n");
  const body = [
    "# Domain contract",
    ...sections.flatMap((section) => [
      `## ${section}`,
      section === "Source of truth"
        ? "Canonical evidence is [tracked here](../../../evidence.md)."
        : `This section records the ${section.toLowerCase()} contract.`,
    ]),
    "",
  ].join("\n\n");
  for (const domain of domains) writeFileSync(join(dir, `${domain}.md`), body);
  return root;
}

function verify(root) {
  return spawnSync(process.execPath, ["scripts/verify_domain_contracts.mjs", "--root", root], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
}

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.message);
    process.exitCode = 1;
  }
}

test("accepts all seven complete contracts", () => {
  const result = verify(fixture());
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("rejects a missing domain", () => {
  const root = fixture();
  writeFileSync(join(root, "docs", "architecture", "domains", "release.md.moved"), "moved");
  unlinkSync(join(root, "docs", "architecture", "domains", "release.md"));
  const result = verify(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing domain contract: release/);
});

test("rejects an empty required section", () => {
  const root = fixture();
  const file = join(root, "docs", "architecture", "domains", "identity.md");
  const text = `# Domain contract\n\n${sections.map((section) => `## ${section}\n\n${section === "Recovery" ? "" : "Evidence-backed contract text."}`).join("\n\n")}`;
  writeFileSync(file, text);
  const result = verify(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /identity: empty section "Recovery"/);
});

test("rejects a broken local link", () => {
  const root = fixture();
  const file = join(root, "docs", "architecture", "domains", "voice-ai.md");
  writeFileSync(file, `${writeFileBody()}\n[Missing](../../../not-there.md)\n`);
  const result = verify(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /voice-ai: broken local link/);
});

function writeFileBody() {
  return [
    "# Domain contract",
    ...sections.flatMap((section) => [
      `## ${section}`,
      section === "Source of truth"
        ? "Canonical evidence is [tracked here](../../../evidence.md)."
        : `This section records the ${section.toLowerCase()} contract.`,
    ]),
  ].join("\n\n");
}
