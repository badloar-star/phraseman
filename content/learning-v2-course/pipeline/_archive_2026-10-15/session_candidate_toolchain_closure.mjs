import fs from "node:fs";
import path from "node:path";

export const V2_TOOLCHAIN_ENTRYPOINTS = Object.freeze([
  "package.json",
  "package-lock.json",
  "scripts/learning_v2_curriculum_blueprint_gate_v2.ts",
  "content/learning-v2-course/pipeline/build_release.mjs",
  "content/learning-v2-course/pipeline/audit_actor_clarity.mjs",
  "content/learning-v2-course/pipeline/build_session_candidate_receipt.mjs",
  "content/learning-v2-course/pipeline/session_candidate_projection_parity.mjs",
  "content/learning-v2-course/pipeline/session_acceptance_receipt.mjs",
  "content/learning-v2-course/pipeline/verify_session_candidate_receipt_v2.mjs",
]);

export function v2ToolchainEntrypointsForSession(repoRoot, session) {
  const match = /^en\/l(\d{2})\/s(\d{2})$/u.exec(String(session ?? ""));
  if (!match) throw new Error(`v2_toolchain_session_invalid:${session}`);
  const [, lesson, sessionNumber] = match;
  const feedback = `content/learning-v2-course/pipeline/l${lesson}s${sessionNumber}_feedback_repair.test.mjs`;
  const entrypoints = [...V2_TOOLCHAIN_ENTRYPOINTS];
  if (fs.existsSync(path.resolve(repoRoot, ...feedback.split("/")))) entrypoints.push(feedback);
  if (session === "en/l01/s02") {
    entrypoints.push("content/learning-v2-course/pipeline/l01s02_d956_packet.test.mjs");
  }
  return Object.freeze([...new Set(entrypoints)].sort());
}

const SOURCE_EXTENSIONS = Object.freeze(["", ".mjs", ".js", ".cjs", ".ts", ".tsx", ".json"]);
const INDEX_NAMES = Object.freeze(["index.mjs", "index.js", "index.cjs", "index.ts", "index.tsx", "index.json"]);

function canonicalRelative(repoRoot, absolute, label) {
  const relative = path.relative(path.resolve(repoRoot), path.resolve(absolute));
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`${label}_outside_repo`);
  }
  return relative.split(path.sep).join("/");
}

function extractDependencySpecifiers(source, importerPath) {
  // Runtime-created loaders can resolve code through paths that are invisible to
  // the static closure below. Reject them instead of silently issuing a receipt
  // that does not bind every executable byte. Keep the token construction split
  // so this guard does not match its own implementation when this file is scanned.
  for (const unsupportedToken of [
    ["create", "Require"].join(""),
    ["require", ".resolve"].join(""),
    ["module", ".create", "Require"].join(""),
  ]) {
    if (source.includes(unsupportedToken)) {
      throw new Error(`toolchain_dynamic_loader_unsupported:${importerPath}`);
    }
  }

  const specifiers = new Set();
  const staticPattern = /\b(?:import|export)\s+(?:[^;"'`]*?\s+from\s+)?(["'])([^"']+)\1/gu;
  for (const match of source.matchAll(staticPattern)) specifiers.add(match[2]);

  const dynamicPattern = /\bimport\s*\(([^)]*)\)/gu;
  for (const match of source.matchAll(dynamicPattern)) {
    const argument = match[1].trim();
    const literal = /^(["'])([^"']+)\1$/u.exec(argument);
    if (!literal) throw new Error(`toolchain_dynamic_import_unresolved:${importerPath}`);
    specifiers.add(literal[2]);
  }

  const requirePattern = /\brequire\s*\(([^)]*)\)/gu;
  for (const match of source.matchAll(requirePattern)) {
    const argument = match[1].trim();
    const literal = /^(["'])([^"']+)\1$/u.exec(argument);
    if (!literal) throw new Error(`toolchain_dynamic_require_unresolved:${importerPath}`);
    specifiers.add(literal[2]);
  }
  return [...specifiers].sort();
}

function resolveLocalSpecifier(repoRoot, importerPath, specifier) {
  if (!specifier.startsWith(".")) return null;
  const importerAbsolute = path.resolve(repoRoot, ...importerPath.split("/"));
  const base = path.resolve(path.dirname(importerAbsolute), specifier);
  const candidates = [
    ...SOURCE_EXTENSIONS.map((extension) => `${base}${extension}`),
    ...INDEX_NAMES.map((name) => path.join(base, name)),
  ];
  for (const candidate of candidates) {
    let stat;
    try {
      stat = fs.statSync(candidate);
    } catch {
      continue;
    }
    if (stat.isFile()) return canonicalRelative(repoRoot, candidate, "toolchain_dependency");
  }
  throw new Error(`toolchain_local_import_unresolved:${importerPath}:${specifier}`);
}

export function computeV2ToolchainClosure(repoRoot, entrypoints = V2_TOOLCHAIN_ENTRYPOINTS) {
  const pending = [...new Set(entrypoints)].sort();
  const visited = new Set();
  while (pending.length > 0) {
    const relative = pending.shift();
    if (visited.has(relative)) continue;
    const absolute = path.resolve(repoRoot, ...relative.split("/"));
    if (canonicalRelative(repoRoot, absolute, "toolchain_entry") !== relative) {
      throw new Error(`toolchain_path_not_canonical:${relative}`);
    }
    let stat;
    try {
      stat = fs.statSync(absolute);
    } catch {
      throw new Error(`toolchain_file_missing:${relative}`);
    }
    if (!stat.isFile()) throw new Error(`toolchain_file_not_regular:${relative}`);
    visited.add(relative);
    if (relative.endsWith(".json")) continue;
    const source = fs.readFileSync(absolute, "utf8");
    for (const specifier of extractDependencySpecifiers(source, relative)) {
      const dependency = resolveLocalSpecifier(repoRoot, relative, specifier);
      if (dependency && !visited.has(dependency)) pending.push(dependency);
    }
    pending.sort();
  }
  return Object.freeze([...visited].sort());
}
