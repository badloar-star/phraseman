# Account V2 — preserved-progress inventory and migration dry-run checkpoint

Date: 2026-10-01  
Scope: source-only inventory and local dry-run contract; no production data, Firestore, deploy, or user mutation.

## What this packet proves

The migration core reads a local export snapshot and classifies every recognized legacy field into one of these explicit fates:

- `carry`: emit an Account V2 operation (lesson progress, flashcards and SRS memory, library membership where the source is complete);
- `derive`: keep the existing authoritative Plus/purchase system and do not copy a second entitlement ledger;
- `keep_in_place`: preserve an existing 2.0 server domain (coins, streak/active days, exams/certificates, achievements/statistics, already-open lessons);
- `carried_and_kept`: retain legacy fields that the current 2.0 client still reads, such as lesson score fields;
- `drop`: XP, old levels, leagues/seasons/season points, shards/pearls as a separate economy, V2 access stars, retired boosts and other explicitly retired paths;
- `carry_pending_domain` / `hold`: do not apply or clean while a required V2 domain or an untrusted/unknown field is unresolved.

`applyAllowed` is true only for `status=ready`. Even `ready` does not permit deleting the legacy user document while `pendingDomainCount > 0`; cleanup is restricted to the explicit `legacyCleanupPaths(report)` allowlist. `keep_in_place`, `carried_and_kept` and Plus-derived fields are never cleanup candidates.

## Owner decisions encoded

- Runes → coins at `1:1` where the coins domain exists; otherwise report `pendingOwnerRate`/`carry_pending_domain` and do not invent an operation.
- V2 access stars are not migrated.
- SRS carries the old edit time; missing/future/unknown SRS timestamps hold that item.
- Existing open lessons stay open; a 40–59% lesson does not unlock the next lesson.
- Streak/active days, exams/certificates, achievements/statistics are preserved in their existing 2.0 stores.
- Login/identity technical fields are not copied into the new Account V2 identity.
- XP, old levels, leagues, seasons, season points and retired economy paths are not recreated.

## Source and verification

Core: `functions/src/accounts_v2_migration/`  
CLI: `scripts/accounts-v2-migration-dry-run.mjs`  
Schema: `docs/reports/accounts-v2-migration-dry-run.schema.json`

Fresh source gates on 2026-10-01:

- Functions migration Jest: 6 suites, 174/174 tests passed.
- Functions TypeScript (`npx tsc --noEmit --pretty false --incremental false`): exit 0.
- ESLint on `functions/src/accounts_v2_migration`: PASS.
- PM-233 code-only ledger: `products=39`, `uncovered=0`, `stale=0`, `resurrected=0`.
- PM-233 node guard: 6/6 tests passed.

The PM-233 refresh fixed one newly exposed marker: `local_key:league_gold_theme_unlocked_v1` is now explicitly classified under the legacy themes row. No production count was run; all production volumes remain `unknown`. The CLI refuses `--prod` and only accepts a local JSON export/output path.

## Remaining gates

This packet is not production migration approval. A real export, two-device idempotence, backup/restore, adapter integration, migration apply, legacy cleanup, deploy and release acceptance remain separate gates and require explicit authorization. No production data or user progress was read or changed for this checkpoint.
