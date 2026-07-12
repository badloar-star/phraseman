#!/usr/bin/env node
/**
 * Installs project-local pre-commit and pre-push hooks. Runs automatically via
 * the npm `prepare` lifecycle on
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

function hooksDir() {
  try {
    return execSync('git rev-parse --git-path hooks', { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

const PRE_COMMIT_HOOK = `#!/bin/sh
# Managed by scripts/install-git-hooks.mjs — do not edit by hand.
# Blocks commits that contain high-confidence secrets (see scripts/scan_secrets.mjs).
node scripts/scan_secrets.mjs --staged
status=$?
if [ "$status" -ne 0 ]; then
  exit "$status"
fi
exit 0
`;

const PRE_PUSH_HOOK = `#!/bin/sh
# Managed by scripts/install-git-hooks.mjs — do not edit by hand.
# Fast update gate; full gate runs from npm run eas:update:*.
node scripts/update_release_gate.mjs --hook=pre-push
status=$?
if [ "$status" -ne 0 ]; then
  exit "$status"
fi
exit 0
`;

const POST_COMMIT_HOOK = `#!/bin/sh
# Managed by scripts/install-git-hooks.mjs — do not edit by hand.
# Read-only status: makes release integration visible without merging user work.
if [ -f scripts/release_branch_status.mjs ]; then
  node scripts/release_branch_status.mjs
  exit 0
fi

release_branch="\${PHRASEMAN_RELEASE_BRANCH:-codex/all-development-integration}"
short_sha="$(git rev-parse --short=9 HEAD 2>/dev/null)"
if ! git rev-parse --verify "$release_branch^{commit}" >/dev/null 2>&1; then
  echo "RELEASE: unknown — branch $release_branch is unavailable"
elif git merge-base --is-ancestor HEAD "$release_branch"; then
  echo "RELEASE: integrated — $short_sha is in $release_branch"
else
  echo "RELEASE: pending — $short_sha → $release_branch"
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
  const resolvedHooksDir = hooksDir();
  if (!resolvedHooksDir) {
    console.log('install-git-hooks: unable to resolve git hooks path, skipping');
    return;
  }
  const targetHooksDir = resolvedHooksDir;
  if (!existsSync(targetHooksDir)) mkdirSync(targetHooksDir, { recursive: true });
  const hooks = [
    ['pre-commit', PRE_COMMIT_HOOK],
    ['pre-push', PRE_PUSH_HOOK],
    ['post-commit', POST_COMMIT_HOOK],
  ];
  for (const [name, content] of hooks) {
    const hookPath = join(targetHooksDir, name);
    if (existsSync(hookPath)) {
      let existing = '';
      try { existing = readFileSync(hookPath, 'utf8'); } catch { /* ignore */ }
      if (!existing.includes(MANAGED_MARKER) && existing.trim()) {
        const backup = `${hookPath}.local-backup`;
        if (!existsSync(backup)) {
          try {
            copyFileSync(hookPath, backup);
            console.warn(`install-git-hooks: existing ${name} hook backed up → ${backup}`);
            console.warn(`install-git-hooks: chain it from ${name}.local-backup if you still need it.`);
          } catch { /* ignore */ }
        }
      }
    }
    writeFileSync(hookPath, content, { encoding: 'utf8' });
    try { chmodSync(hookPath, 0o755); } catch { /* ignore */ }
    console.log(`install-git-hooks: ${name} hook installed → ${hookPath}`);
  }
}

main();
