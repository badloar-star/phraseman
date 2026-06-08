#!/usr/bin/env node
/**
 * Installs a project-local git pre-commit hook that runs the secret scanner
 * against staged files. Runs automatically via the npm `prepare` lifecycle on
 * `npm install`, and can be run manually: `node scripts/install-git-hooks.mjs`.
 *
 * Zero dependencies (no husky). Idempotent: overwrites only the hook we manage.
 * Safe in CI / fresh checkouts without a .git dir (it no-ops).
 */

import { existsSync, mkdirSync, writeFileSync, chmodSync, readFileSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const MANAGED_MARKER = 'Managed by scripts/install-git-hooks.mjs';

const ROOT = process.cwd();

function gitDir() {
  try {
    // Resolves to the real .git dir even in worktrees.
    return execSync('git rev-parse --git-dir', { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

const HOOK = `#!/bin/sh
# Managed by scripts/install-git-hooks.mjs — do not edit by hand.
# Blocks commits that contain high-confidence secrets (see scripts/scan_secrets.mjs).
node scripts/scan_secrets.mjs --staged
status=$?
if [ "$status" -ne 0 ]; then
  exit "$status"
fi
exit 0
`;

function main() {
  const gd = gitDir();
  if (!gd) {
    // No git repo (e.g. tarball install) — nothing to do.
    console.log('install-git-hooks: no git repo, skipping');
    return;
  }
  const hooksDir = join(ROOT, gd, 'hooks');
  if (!existsSync(hooksDir)) mkdirSync(hooksDir, { recursive: true });
  const hookPath = join(hooksDir, 'pre-commit');

  // Don't silently clobber a pre-existing, non-managed pre-commit hook — back it
  // up first so a developer's own hook is never lost.
  if (existsSync(hookPath)) {
    let existing = '';
    try { existing = readFileSync(hookPath, 'utf8'); } catch { /* ignore */ }
    if (!existing.includes(MANAGED_MARKER) && existing.trim()) {
      const backup = `${hookPath}.local-backup`;
      if (!existsSync(backup)) {
        try {
          copyFileSync(hookPath, backup);
          console.warn(`install-git-hooks: existing pre-commit hook backed up → ${backup}`);
          console.warn('install-git-hooks: chain it from the new hook if you still need it.');
        } catch { /* ignore */ }
      }
    }
  }

  writeFileSync(hookPath, HOOK, { encoding: 'utf8' });
  try {
    chmodSync(hookPath, 0o755); // no-op on Windows, required on *nix
  } catch {
    /* ignore */
  }
  console.log(`install-git-hooks: pre-commit secret-scan hook installed → ${hookPath}`);
}

main();
