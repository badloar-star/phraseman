import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const prePath = path.join(
  repoRoot,
  "docs/v2/curriculum/de/TASK6B3A_PRE_ACCEPTANCE_MANIFEST_2026-10-11.json",
);
const finalPath = path.join(
  repoRoot,
  "docs/v2/curriculum/de/TASK6B3A_FINAL_ACCEPTANCE_MANIFEST_2026-10-11.json",
);
const sha256 = (file: string) =>
  createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const sha256Bytes = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
type Manifest = {
  stage: string;
  status: Record<string, string | number>;
  closure: Record<string, string>;
  preManifestSha256?: string;
  reviews?: Record<string, string>;
};
const requiredClosureKeys = [
  "docs/v2/curriculum/de/TASK_PACKET_STAGE_0.md",
  "docs/v2/curriculum/de/OWNER_DECISIONS.md",
  "docs/v2/curriculum/de/TASK6B1_LEXICAL_REVIEW_RECEIPT_2026-10-08.md",
  "docs/v2/curriculum/de/TASK6B2_SOURCE_ADJUDICATION_RECEIPT_2026-10-11.md",
  "docs/v2/curriculum/de/TASK6B2_QUARANTINE_DECISION_2026-10-11.md",
  "docs/v2/curriculum/de/TASK_PACKET_6B3_AUFZUG_CANONICAL_MATERIALIZATION.md",
  "docs/v2/curriculum/de/TASK_PACKET_6B4_AUFZUG_CURRENT_STATE_ADMISSION.md",
  "docs/v2/curriculum/de/TASK6B4_AUTHORITY_RECORD_2026-10-11.md",
  "docs/v2/curriculum/de/TASK6B4_FINAL_METHOD_ADVISOR_RECEIPT_R4_2026-10-11.md",
  "docs/v2/curriculum/de/TASK6B4_GUARDIAN_RECEIPT_2026-10-11.md",
  "docs/v2/curriculum/de/TASK6B4_VALIDATION_RECEIPT_2026-10-11.md",
  "docs/v2/curriculum/de/TASK6B3A_AUTHORITY_RECORD_2026-10-11.md",
  "docs/v2/curriculum/de/TASK6B3A_METHOD_ADVISOR_RECEIPT_R3_2026-10-11.md",
  "docs/v2/curriculum/de/TASK6B3A_METHOD_ADVISOR_RECEIPT_R4_2026-10-11.md",
  "docs/v2/curriculum/de/TASK6B3A_METHOD_ADVISOR_RECEIPT_R5_2026-10-11.md",
  "docs/v2/curriculum/de/TASK_PACKET_6B3A_AUFZUG_CURRENT_STATE_ACCEPTANCE.md",
  "docs/v2/curriculum/de/TASK6B3A_GUARDIAN_RECEIPT_2026-10-11.md",
  "docs/v2/curriculum/de/TASK6B3A_PROTECTED_SURFACE_BASELINE_2026-10-11.json",
  "modules/learning-v2/curriculum/de/lexical_item_evidence_de_v1.ts",
  "modules/learning-v2/curriculum/de/registries/lexical_senses_de_v1.json",
  "tests/learning_v2_de_lexical_registry_gate.ts",
  "tests/learning_v2_de_aufzug_current_state_admission_gate.ts",
  "tests/learning_v2_de_aufzug_b3a_acceptance_gate.ts",
].sort();
const protectedBaselinePath = path.join(
  repoRoot,
  "docs/v2/curriculum/de/TASK6B3A_PROTECTED_SURFACE_BASELINE_2026-10-11.json",
);
const writableAllowlist = new Set([
  "docs/v2/curriculum/de/TASK6B3A_GUARDIAN_RECEIPT_2026-10-11.md",
  "docs/v2/curriculum/de/TASK6B3A_PROTECTED_SURFACE_BASELINE_2026-10-11.json",
  "docs/v2/curriculum/de/TASK6B3A_PRE_ACCEPTANCE_MANIFEST_2026-10-11.json",
  "docs/v2/curriculum/de/TASK6B3A_FINAL_ACCEPTANCE_MANIFEST_2026-10-11.json",
  "docs/v2/curriculum/de/TASK6B3A_FINAL_SPEC_REVIEW_2026-10-11.md",
  "docs/v2/curriculum/de/TASK6B3A_FINAL_ADVERSARIAL_REVIEW_2026-10-11.md",
]);
const protectedPrefixes = [
  "content/learning-v2-course/",
  "modules/learning-v2/",
  "docs/v2/curriculum/de/",
  "docs/v2/curriculum/en/",
  "assets/audio/learning-v2/", "app/learning-v2/", "app/learning_v2_", "app/use_learning_v2_",
  "components/learning-v2/", "hooks/use_learning_v2_", "modules/phone-state/learning_v2_",
  "modules/phone-state/domains/learning_v2", "modules/learning-v2-pcm-decoder/",
  "functions/src/learning_v2/", "functions/src/learning_v2_", "functions/src/content_factory/learning_v2_",
  "functions/src/content_factory/v2_", "functions-content/scripts/", "functions-content/lib/modules/learning-v2/",
  "tests/learning_v2_",
];
const protectedExactPaths = new Set([".gitignore", "app/(tabs)/lessons.tsx", "functions-content/index.ts", "functions-content/package.json", "functions-content/package-lock.json", "functions-content/tsconfig.json", "scripts/build_learning_v2_factory_native_manifest.mjs"]);
const stableIgnoredPrefixes = ["functions-content/lib/modules/learning-v2/"];
const volatilePath = (relative: string) => relative.includes("/.codex-tmp/") || relative.includes("/.tmp/") || relative.includes("/android/build/") || relative.startsWith("functions-content/node_modules/");
type ProtectedEntry = { index: string[]; kind: string; path: string; sha256: string };
type ProtectedBaseline = {
  algorithm: string;
  entryCount: number;
  scope: string;
  snapshotSha256: string;
  writableAllowlist: string[];
};
const git = (args: string[]) => execFileSync("git", args, {
  cwd: repoRoot,
  encoding: "buffer",
  maxBuffer: 64 * 1024 * 1024,
});
const zeroSplit = (value: Buffer) => value.toString("utf8").split("\0").filter(Boolean);
function filesystemPaths(root: string, relative = ""): string[] {
  if (relative && volatilePath(relative.replace(/\\/gu, "/"))) return [];
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) return [];
  const stat = fs.lstatSync(absolute);
  if (!stat.isDirectory() || stat.isSymbolicLink()) return [relative.replace(/\\/gu, "/")];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) =>
    filesystemPaths(root, path.join(relative, entry.name)),
  );
}
function protectedEntries(): ProtectedEntry[] {
  const indexByPath = new Map<string, string[]>();
  for (const row of zeroSplit(git(["ls-files", "--stage", "-z"]))) {
    const tab = row.indexOf("\t");
    assert.ok(tab > 0, "protected_surface_index_row_invalid");
    const relative = row.slice(tab + 1);
    const index = row.slice(0, tab);
    indexByPath.set(relative, [...(indexByPath.get(relative) ?? []), index]);
  }
  const tracked = [
    ...zeroSplit(git(["ls-files", "-z"])),
  ];
  const roots = ["content", "modules", "docs", "assets", "app", "components", "hooks", "functions", "functions-content", "tests", "scripts"];
  const visibleFilesystem = roots.flatMap((root) => filesystemPaths(repoRoot, root));
  const paths = new Set([...tracked, ...visibleFilesystem, ".gitignore"]);
  return [...paths]
    .filter((relative) => protectedExactPaths.has(relative) || protectedPrefixes.some((prefix) => relative.startsWith(prefix)))
    .filter((relative) => !volatilePath(relative))
    .filter((relative) => !writableAllowlist.has(relative))
    .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "variant" }))
    .map((relative) => {
      const absolute = path.join(repoRoot, relative);
      const stats = fs.existsSync(absolute) ? fs.lstatSync(absolute) : undefined;
      const kind = !stats ? "absent" : stats.isSymbolicLink() ? "symlink" : stats.isFile() ? "file" : "other";
      const raw = kind === "file" ? fs.readFileSync(absolute) : kind === "symlink" ? fs.readlinkSync(absolute, "utf8") : kind;
      return {
        index: (indexByPath.get(relative) ?? ["UNTRACKED"]).sort(),
        kind,
        path: relative,
        sha256: sha256Bytes(raw),
      };
    });
}
function protectedBaseline(): ProtectedBaseline {
  const entries = protectedEntries();
  return {
    algorithm: "sha256(json-v1; git-index+working-tree; tracked+untracked-nonignored+stable-ignored-release)",
    entryCount: entries.length,
    scope: "Learning-V2 semantic scope v2; tracked+untracked-nonignored plus stable ignored runtime release; excludes only nested .codex-tmp/.tmp, Android build cache, functions-content node_modules, and exact future B3A receipts",
    snapshotSha256: sha256Bytes(JSON.stringify(entries)),
    writableAllowlist: [...writableAllowlist].sort(),
  };
}
function load<T>(file: string): T {
  const raw = fs.readFileSync(file, "utf8");
  const parsed = JSON.parse(raw) as T;
  assert.equal(raw, `${JSON.stringify(parsed, null, 2)}\n`, `manifest_not_canonical:${path.basename(file)}`);
  return parsed;
}
const exact = (actual: unknown, expected: unknown, message: string) =>
  assert.equal(actual, expected, message);

function verifyClosure(closure: Record<string, string>): void {
  assert.deepEqual(Object.keys(closure).sort(), requiredClosureKeys, "pre_closure_keys_invalid");
  for (const [relative, expected] of Object.entries(closure)) {
    assert.match(relative, /^(docs\/v2\/curriculum\/de|modules\/learning-v2\/curriculum\/de|tests\/learning_v2_de_)/u);
    exact(sha256(path.join(repoRoot, relative)), expected, `closure_hash_mismatch:${relative}`);
  }
}

function verifyPre(pre: Manifest): void {
  assert.deepEqual(Object.keys(pre).sort(), ["closure", "stage", "status"], "pre_manifest_keys_invalid");
  exact(pre.stage, "PRE_ACCEPTANCE", "pre_stage_invalid");
  assert.deepEqual(Object.keys(pre.status).sort(), ["audio", "b3Acceptance", "b3aAcceptance", "candidateAcceptance", "englishAuthority", "historicalB1Replay", "learnerAuthoring", "mockup", "releaseAuthority", "rowsPromoted", "runtime", "task7Contacts"].sort(), "pre_status_keys_invalid");
  exact(pre.status.historicalB1Replay, "UNAVAILABLE_NOT_CLAIMED", "pre_history_status_invalid");
  exact(pre.status.b3aAcceptance, "PENDING", "pre_b3a_status_invalid");
  exact(pre.status.candidateAcceptance, "HOLD", "pre_cannot_accept_candidate");
  exact(pre.status.b3Acceptance, "NOT_ESTABLISHED", "pre_b3_status_invalid");
  exact(pre.status.rowsPromoted, 0, "pre_cannot_promote_rows");
  exact(pre.status.task7Contacts, "UNVERIFIED", "pre_cannot_open_task7");
  exact(pre.status.learnerAuthoring, "HOLD", "pre_cannot_author_content");
  exact(pre.status.mockup, "HOLD", "pre_cannot_change_mockup");
  exact(pre.status.audio, "HOLD", "pre_cannot_generate_audio");
  exact(pre.status.runtime, "HOLD", "pre_cannot_change_runtime");
  exact(pre.status.releaseAuthority, "HOLD", "pre_cannot_release");
  exact(pre.status.englishAuthority, "EXCLUDED", "pre_english_not_excluded");
  verifyClosure(pre.closure);
  verifyProtectedSurface();
}

function verifyProtectedSurface(): void {
  const expected = load<ProtectedBaseline>(protectedBaselinePath);
  assert.deepEqual(Object.keys(expected).sort(), ["algorithm", "entryCount", "scope", "snapshotSha256", "writableAllowlist"], "protected_surface_baseline_keys_invalid");
  assert.deepEqual(expected, protectedBaseline(), "protected_surface_changed_since_freeze");
}

function verifyFinal(finalManifest: Manifest, pre: Manifest): void {
  assert.deepEqual(Object.keys(finalManifest).sort(), ["closure", "preManifestSha256", "reviews", "stage", "status"], "final_manifest_keys_invalid");
  exact(finalManifest.stage, "FINAL_ACCEPTANCE", "final_stage_invalid");
  assert.deepEqual(Object.keys(finalManifest.status).sort(), ["audio", "b3Acceptance", "b3aAcceptance", "candidateAcceptance", "englishAuthority", "historicalB1Replay", "learnerAuthoring", "mockup", "releaseAuthority", "rowsPromoted", "runtime", "task7Contacts"].sort(), "final_status_keys_invalid");
  exact(finalManifest.preManifestSha256, sha256(prePath), "final_pre_hash_mismatch");
  exact(finalManifest.status.historicalB1Replay, "UNAVAILABLE_NOT_CLAIMED", "final_history_status_invalid");
  exact(finalManifest.status.b3Acceptance, "NOT_ESTABLISHED", "final_b3_status_invalid");
  exact(finalManifest.status.b3aAcceptance, "ESTABLISHED", "final_b3a_status_invalid");
  exact(finalManifest.status.candidateAcceptance, "ACCEPTED_UNDER_B4_CURRENT_STATE", "final_candidate_status_invalid");
  exact(finalManifest.status.rowsPromoted, 0, "final_cannot_promote_rows");
  exact(finalManifest.status.task7Contacts, "UNVERIFIED", "final_cannot_open_task7");
  exact(finalManifest.status.learnerAuthoring, "HOLD", "final_cannot_author_content");
  exact(finalManifest.status.mockup, "HOLD", "final_cannot_change_mockup");
  exact(finalManifest.status.audio, "HOLD", "final_cannot_generate_audio");
  exact(finalManifest.status.runtime, "HOLD", "final_cannot_change_runtime");
  exact(finalManifest.status.releaseAuthority, "HOLD", "final_cannot_release");
  exact(finalManifest.status.englishAuthority, "EXCLUDED", "final_english_not_excluded");
  assert.deepEqual(Object.keys(finalManifest.reviews ?? {}).sort(), ["adversarial", "spec"], "final_review_roles_invalid");
  assert.notEqual(finalManifest.reviews?.spec, finalManifest.reviews?.adversarial, "final_reviews_must_be_distinct");
  for (const [role, expected] of Object.entries(finalManifest.reviews ?? {})) {
    const relative = `docs/v2/curriculum/de/TASK6B3A_FINAL_${role.toUpperCase()}_REVIEW_2026-10-11.md`;
    exact(sha256(path.join(repoRoot, relative)), expected, `review_hash_mismatch:${role}`);
    const review = fs.readFileSync(path.join(repoRoot, relative), "utf8");
    const ownRole = role === "spec" ? "orbit-spec-reviewer" : "orbit-red-team";
    const reviewerTaskPattern = role === "spec"
      ? /^\/root\/de_b3a_final_spec_r[1-9][0-9]*$/u
      : /^\/root\/de_b3a_final_adversarial_r[1-9][0-9]*$/u;
    const reviewerTask = review.match(/^REVIEWER_TASK: (.+)$/mu)?.[1];
    assert.ok(reviewerTask && reviewerTaskPattern.test(reviewerTask), `reviewer_task_identity_invalid:${role}`);
    const expectedReceipt = [
      `ROLE: ${ownRole}`,
      `AGENT_TYPE: ${ownRole}`,
      `REVIEWER_TASK: ${reviewerTask}`,
      `PRE_MANIFEST_SHA256: ${sha256(prePath)}`,
      `PROTECTED_SURFACE_BASELINE_SHA256: ${load<ProtectedBaseline>(protectedBaselinePath).snapshotSha256}`,
      "VERDICT: PASS",
      "OPEN_FINDINGS: none",
      "PASS_B3A_PRE_ACCEPTANCE_REVIEW",
      "",
    ].join("\n");
    assert.equal(review, expectedReceipt, `review_receipt_schema_invalid:${role}`);
  }
  assert.deepEqual(finalManifest.closure, pre.closure, "final_must_reuse_pre_closure");
  verifyProtectedSurface();
}

if (process.argv.length === 3 && process.argv[2] === "--print-protected-surface") {
  process.stdout.write(`${JSON.stringify(protectedBaseline(), null, 2)}\n`);
} else {
  const pre = load<Manifest>(prePath);
  verifyPre(pre);
  if (process.argv.length === 3 && process.argv[2] === "--pre") {
  console.log("TASK6B3A_PRE_ACCEPTANCE_VALIDATED candidateAcceptance=HOLD");
  } else {
  assert.ok(process.argv.length === 3 && process.argv[2] === "--final", "unexpected_b3a_gate_arguments");
  const finalManifest = load<Manifest>(finalPath);
  verifyFinal(finalManifest, pre);
  console.log("TASK6B3A_ACCEPTANCE_ESTABLISHED rowsPromoted=0 task7Contacts=UNVERIFIED learnerAuthoring=HOLD englishAuthority=EXCLUDED");
  }
}
