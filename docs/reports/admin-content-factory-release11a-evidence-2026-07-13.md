# Admin Content Factory — Release 11A evidence

Date: 2026-07-13  
Scope: flashcard semantic registry and rich community runtime  
Deployment: not performed

## Delivered

- One shared canonical flashcard semantic key, partitioned by surface, study target and source locale.
- Deterministic SHA-256 registry IDs with canonical-key collision detection and multiple pack/card source memberships.
- Incremental dry-run manifests, bounded document-ID paging, manifest chaining, catalog fingerprint and high-water mark.
- Explicit apply, idempotent replay, manifest-driven rollback and guarded `shadow|registry` cutover.
- Cutover fails closed unless the manifest is complete/current and registry IDs, canonical keys and exact source membership sets all match.
- Verified registry mode computes deterministic IDs for at most 20 candidate cards and point-reads only those registry documents; it never scans the locale partition. Shadow/unverified mode remains legacy-authoritative.
- Catalog mutations update registry membership and its generation token in the same Firestore transaction. Rollback invalidates registry authority.
- Community publish/edit/update-pending/reject/revision/remove flows update pack membership and registry in the same Firestore transaction.
- Registry removal preserves other packs and other cards that share the same semantic key.
- Rich schema v1 preserves target/source examples, note and all source references through server normalization and app loading.
- Legacy clients keep existing `en`, localized backs, description, `exampleEn/exampleRu` and `sourceId` fields; new clients use rich fields with per-field fallback.
- Legacy-client edits preserve existing rich fields by card ID when the old payload does not send them.
- Flashcard item and replacement capabilities now expose the gated runtime consumer; the pack idea remains editorial draft-only.

## Verification

- Focused Functions: 8 suites / 82 tests passed; dedicated emulator suite: 1 / 1 passed.
- Focused root/app contracts: 3 suites / 8 tests passed.
- Functions TypeScript build passed.
- Firestore Emulator: three-query/two-data-page chained manifest, idempotent apply, exact-source corruption rejection, stale-catalog rejection, successful cutover, more than 1,000 unique keys in one locale partition, positive/negative candidate point lookups and rollback invalidation all passed.
- Admin Playwright smoke: 7 / 7 passed at 375, 768, 1024 and 1440 px.
- Admin audits: language 0 findings; visible text 0; tooltip coverage 142 / 142; runtime-state 0.
- Firestore rules/indexes dry-run for `phraseman-ea0b3` passed; no deployment. Two pre-existing rule warnings remain.
- Focused `git diff --check` passed; only line-ending conversion warnings were emitted.

## Safety

- No project OpenAI API key or external generation provider was used.
- No production Firestore write, deployment, publication, commit or push was performed.
- Registry mode is not activated in production; activation requires an explicit verified cutover command.
- Existing community and legacy flashcard fields remain additive and backward-compatible.
