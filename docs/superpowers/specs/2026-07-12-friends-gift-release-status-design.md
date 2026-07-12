# Friends Gift Release Status Design

## Goal

Ship the Friends gift modal dead-screen fix through the canonical integration branch and make release ancestry obvious after every commit.

## Design

The application fix serializes the optimistic sent-gift receipt and friend-quest-start modal. A native-visibility ref distinguishes an iOS modal that is still dismissing from one that is fully gone, so both server-response orderings retain a path to show the quest without overlapping native modals.

Release visibility extends the existing dependency-free managed Git hook installer. A small read-only script compares a commit with the configured canonical integration branch and prints either `RELEASE: integrated` or `RELEASE: pending`. The post-commit hook runs this status check but never checks out, merges, stashes, pushes, or rewrites user work.

## Safety and verification

- Only the modal sequencing fix and its focused contract move into the release branch.
- Existing unrelated changes in the source worktree remain untouched.
- Hook installation remains idempotent and preserves an unmanaged hook as a backup.
- Focused Friends/runtime tests, hook tests, secret scanning, and `git diff --check` must pass.
