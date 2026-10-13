import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const MANIFEST_PATH = path.join(ROOT, "docs/v2/curriculum/de/TASK7_V2_L01C06_HAUSMEISTER_SCOPE_EVIDENCE_MANIFEST_2026-10-13.json");
const RAW_EXEMPTION = "modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c06_hausmeister_source_hold_v1/raw/de_lex_plan_l01_c06_hausmeister_v1.html";

function fail(code) { process.stderr.write(`${code}\n`); process.exitCode = 1; }
function sha256(file) { return createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }
function normalize(relativePath) {
  if (typeof relativePath !== "string" || relativePath.length === 0) throw new Error("HAUSMEISTER_SCOPE_INVALID_PATH");
  const normalized = relativePath.replaceAll("\\", "/");
  if (path.isAbsolute(relativePath) || normalized.includes("..") || normalized.startsWith("/")) throw new Error("HAUSMEISTER_SCOPE_INVALID_PATH");
  return normalized;
}

function readManifest() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  if (!Array.isArray(manifest.allowlist) || manifest.allowlist.length !== 8 || !Array.isArray(manifest.protectedRoots) || manifest.protectedRoots.length === 0 || !Array.isArray(manifest.gitDiffCheckExemptPaths) || manifest.hashes === null || typeof manifest.hashes !== "object") throw new Error("HAUSMEISTER_SCOPE_MANIFEST_SHAPE");
  const allowlist = manifest.allowlist.map(normalize);
  if (new Set(allowlist).size !== allowlist.length || Object.keys(manifest.hashes).sort().join("\0") !== [...allowlist].sort().join("\0")) throw new Error("HAUSMEISTER_SCOPE_MANIFEST_ALLOWLIST");
  const gitDiffCheckExemptPaths = manifest.gitDiffCheckExemptPaths.map(normalize);
  if (gitDiffCheckExemptPaths.length !== 1 || gitDiffCheckExemptPaths[0] !== RAW_EXEMPTION || !gitDiffCheckExemptPaths.every((item) => allowlist.includes(item))) throw new Error("HAUSMEISTER_SCOPE_MANIFEST_DIFF_EXEMPTION");
  return { ...manifest, allowlist, gitDiffCheckExemptPaths };
}

function isProtected(relativePath, protectedRoots) { return protectedRoots.some((root) => relativePath.startsWith(normalize(root))); }
function diffCheck(relativePath) {
  const result = spawnSync("git", ["diff", "--check", "--no-index", "--", "NUL", relativePath], { cwd: ROOT, encoding: "utf8" });
  const stderr = result.stderr.replace(/warning: in the working copy of .*?\r?\n/gu, "");
  if (![0, 1].includes(result.status ?? -1) || result.stdout.trim() !== "" || stderr.trim() !== "") throw new Error(`HAUSMEISTER_SCOPE_GIT_DIFF_CHECK:${relativePath}:${result.stdout}${result.stderr}`);
}
function verifyAllowlist(manifest) {
  for (const relativePath of manifest.allowlist) {
    const absolutePath = path.join(ROOT, relativePath);
    if (!fs.statSync(absolutePath).isFile()) throw new Error(`HAUSMEISTER_SCOPE_ALLOWLIST_MISSING:${relativePath}`);
    if (sha256(absolutePath) !== manifest.hashes[relativePath]) throw new Error(`HAUSMEISTER_SCOPE_HASH_DRIFT:${relativePath}`);
    if (!manifest.gitDiffCheckExemptPaths.includes(relativePath)) diffCheck(relativePath);
  }
}
function checkPath(manifest, candidate) {
  const relativePath = normalize(candidate);
  if (isProtected(relativePath, manifest.protectedRoots) && !manifest.allowlist.includes(relativePath)) throw new Error(`HAUSMEISTER_SCOPE_PROTECTED_PATH_OUTSIDE_ALLOWLIST:${relativePath}`);
}

try {
  const manifest = readManifest();
  const [command, candidate] = process.argv.slice(2);
  if (command === "--verify-allowlist" && candidate === undefined) { verifyAllowlist(manifest); process.stdout.write(`HAUSMEISTER_SCOPE_GUARD PASS allowlist=${manifest.allowlist.length} git-diff-check=scoped raw-hash-bound=${manifest.gitDiffCheckExemptPaths.length}\n`); }
  else if (command === "--check-path" && candidate !== undefined) { checkPath(manifest, candidate); process.stdout.write("HAUSMEISTER_SCOPE_GUARD PASS path=accepted\n"); }
  else throw new Error("HAUSMEISTER_SCOPE_USAGE");
} catch (error) { fail(error instanceof Error ? error.message : "HAUSMEISTER_SCOPE_UNKNOWN_FAILURE"); }
