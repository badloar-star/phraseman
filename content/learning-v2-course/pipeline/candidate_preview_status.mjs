import fs from "node:fs";
import path from "node:path";

function listFiles(root) {
  const stat = fs.lstatSync(root);
  if (stat.isSymbolicLink()) throw new Error(`candidate_projection_symlink_forbidden:${root}`);
  if (stat.isFile()) return [root];
  if (!stat.isDirectory()) throw new Error(`candidate_projection_non_regular_path:${root}`);
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(root, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`candidate_projection_symlink_forbidden:${absolute}`);
    if (entry.isDirectory()) return listFiles(absolute);
    if (entry.isFile()) return [absolute];
    throw new Error(`candidate_projection_non_regular_path:${absolute}`);
  });
}

export function sessionProjectionChanged(candidateDir, canonicalDir) {
  if (!fs.existsSync(candidateDir)) throw new Error(`candidate_projection_missing:${candidateDir}`);
  const candidateFiles = listFiles(candidateDir);
  if (!candidateFiles.length) throw new Error(`candidate_projection_empty:${candidateDir}`);
  if (!fs.existsSync(canonicalDir)) return true;
  const canonicalFiles = listFiles(canonicalDir);
  const relative = (root, files) => new Map(files.map((file) => [path.relative(root, file), file]));
  const candidateByPath = relative(candidateDir, candidateFiles);
  const canonicalByPath = relative(canonicalDir, canonicalFiles);
  if (candidateByPath.size !== canonicalByPath.size) return true;
  for (const [name, candidatePath] of candidateByPath) {
    const canonicalPath = canonicalByPath.get(name);
    if (!canonicalPath || !fs.readFileSync(candidatePath).equals(fs.readFileSync(canonicalPath))) return true;
  }
  return false;
}
