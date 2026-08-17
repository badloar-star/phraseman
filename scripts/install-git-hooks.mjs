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
# Blocks snapshot-style commits that write an OLD tree over fresh work
# (see scripts/guard_mass_deletion.mjs — commit 95eec1717 lost a Home fix).
node scripts/guard_mass_deletion.mjs
status=$?
if [ "$status" -ne 0 ]; then
  exit "$status"
fi
# Owner lock: App Check must stay OFF for admin functions until the owner says
# otherwise (see scripts/guard_admin_app_check.mjs — commit 58023df0f killed all
# ~30 admin callables with "unauthenticated"; Plus could not be granted for 2 days).
node scripts/guard_admin_app_check.mjs
status=$?
if [ "$status" -ne 0 ]; then
  exit "$status"
fi
# Owner lock: the admin login must keep working (see scripts/guard_admin_login.mjs).
# 2026-08-16 the owner was locked out of his own admin: the claim was wiped AND the
# deny branch called signOut(auth), which burned the saved session on every load.
node scripts/guard_admin_login.mjs
status=$?
if [ "$status" -ne 0 ]; then
  exit "$status"
fi
# Owner lock: league demotion must keep working (see scripts/guard_league_demotion.mjs).
# 2026-08-17 demotion was dead for EVERYONE: rooms have 3-5 real players and a tail of
# exactly-zero scores, so competition ranking made a zero-point player look 4th (top
# zone) and the "&& !promoted" branch swallowed the demotion. Client and server must
# stay mirrored, or the modal badge contradicts the authoritative cron result.
node scripts/guard_league_demotion.mjs
status=$?
if [ "$status" -ne 0 ]; then
  exit "$status"
fi
# Owner lock: the league table cache stays at 6h, refreshed only on screen entry
# (see scripts/guard_league_refresh_ttl.mjs). Snapshot commit e7eb7d316 lowered
# CLUB_REMOTE_REFRESH_MS from 6h to 45s AND added a setInterval with
# forceRemote:true, so an open League screen re-read Firestore every 45 seconds.
node scripts/guard_league_refresh_ttl.mjs
status=$?
if [ "$status" -ne 0 ]; then
  exit "$status"
fi
# Ratchet: no new hardcoded Russian UI strings (see scripts/scan_untranslated_ui.mjs).
# The same "screen showed Russian text in every language" bug was fixed 14 times
# screen by screen; the count may only go down, never up. Runs in ~0.3s.
node scripts/scan_untranslated_ui.mjs --staged
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

const REFERENCE_TRANSACTION_HOOK = `#!/bin/sh
# Managed by scripts/install-git-hooks.mjs — do not edit by hand.
# Blocks automated stash updates and creation of new local branches.
[ "$1" = "prepared" ] || exit 0

blocked_stash=0
blocked_branch=0
while read -r old new ref; do
  case "$ref" in
    refs/stash)
      if [ -z "$__GIT_STASH_MANUAL_OK" ]; then blocked_stash=1; fi
      ;;
    refs/heads/*)
      case "$old" in
        0000000000000000000000000000000000000000)
          if [ -z "$PHRASEMAN_ALLOW_BRANCH_CREATION" ]; then blocked_branch=1; fi
          ;;
      esac
      ;;
  esac
done

if [ "$blocked_stash" -eq 1 ]; then
  echo "STOP: git stash is blocked for automated processes." 1>&2
  echo "Use the owner's manual git stash-real wrapper for an explicit stash." 1>&2
  exit 1
fi

if [ "$blocked_branch" -eq 1 ]; then
  echo "STOP: creating a new branch is blocked for Phraseman." 1>&2
  echo "An explicit owner request is required. For that exact operation only, set PHRASEMAN_ALLOW_BRANCH_CREATION=1." 1>&2
  exit 1
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
    ['reference-transaction', REFERENCE_TRANSACTION_HOOK],
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
