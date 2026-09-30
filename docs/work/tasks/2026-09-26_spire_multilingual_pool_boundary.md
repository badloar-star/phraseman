# Coordination boundary: multilingual pool for Spire

Date: 2026-09-26

## Owner decision

- Arena is removed as a product/runtime surface.
- Its multilingual content factory is preserved only as an input to Spire.
- No language is enabled and nothing is deployed by this task.

## Writer boundary

This task owns:

- `content/arena-multilingual/**`;
- `scripts/build_arena_multilingual_pools.mjs`;
- `scripts/validate_arena_guess_phrase_distractors.mjs`;
- `tests/arena_multilingual_pool_builder.test.mjs`;
- `functions/src/spire_multilingual_pool.ts` and its focused tests.

The PhraseMan 2.0 core session explicitly delegated the narrow release-gate
bridge in:

- `functions/scripts/copy_generated_assets.js`;
- `functions/src/spire_pack_build.ts`;
- `functions/src/spire_pack_build_multilingual.test.ts`.

After a separate ownership notice, this task also owns the narrow pack-level
strict-validation fix in:

- `functions/src/spire_pack_contract.ts`;
- `functions/src/spire_pack_contract.test.ts`.

After notifying both PhraseMan 2.0 coordination sessions, this task also owns
the isolated Spire controls inside the existing `arena-content` admin tab:

- `admin/v2/legacy.html` only inside the preserved multilingual-content panel
  and its controller;
- `tests/spire_multilingual_admin_control.test.ts`;
- the script-boundary correction in
  `tests/arena_admin_language_generator_contract.test.ts`.

The delegation is limited to fail-closed transport and verification of the
multilingual manifest. It does not authorize Arena runtime, navigation,
Firestore Rules, deployment, or other Spire runtime changes.

Shared or foreign surfaces not edited here:

- all other sections of `admin/v2/legacy.html`;
- `functions/src/index.ts`;
- `storage.rules`, navigation, account/runtime work, Dialogues, Daily Phrase,
  Learning V2 authoring and UI/design files.

## Audit result

Independent integration, DE, ES, FR and CEFR read-only reviews returned
`CHANGES_REQUIRED` before repair:

1. all ES/FR/DE manifests are `BLOCK` and `releaseEligible:false`, but the old
   direct Spire fallback ignored them and marked converted tasks verified;
2. `studyTarget` was not checked against the requested pool language;
3. each source corpus originally had only 3,808 playable rows because 192
   `speed_match` tasks used tiles longer than the owner limit; this slice now
   generates 60 hash-bound lexical pairs per language, 192 unique visible
   six-pair tasks, and 1–3-word tiles, so all 4,000 rows are structurally
   playable; the real per-pair reuse is measured at 18–20 (cap 24), not hidden
   behind non-player metadata;
4. listen/dictate/voice and the live admin controls remain separate unfinished
   Spire tasks;
5. the corpus is structurally valid but is generated from a small fact
   inventory and must not be described as 4,000 independent linguistic facts.
6. all 12,000 A1/A2 labels were unsupported: difficulty had been renamed to
   CEFR without task-level descriptors or sources, and the same speed-match
   inventory appeared under both bands;
7. saved generated files could lag behind the generator while tests still
   passed because tests only inspected a temporary build;
8. DE/ES/FR audits found concrete Russian agreement, habitual-aspect, ambiguous
   gloss and unnatural time/modifier combinations.

## Changes in this slice

- cross-language rows are rejected fail-closed before conversion;
- the generated runtime bundle now carries its immutable manifest next to the
  rows;
- Spire verifies schema, language, `PASS`, `releaseEligible`, counts,
  `tasksSha256`, and the manifest self-hash before exposing any task;
- the count gate is fixed to exactly 4,000 source rows per language; a smaller
  self-consistent manifest is rejected;
- all 4,000 rows must also convert into playable Spire tasks; a nominal PASS
  over the current 3,808-compatible corpus remains blocked;
- release rejects missing or duplicate task IDs even when the bundle still has
  exactly 4,000 hash-bound rows;
- every converted task must pass the strict Tournament/Spire gameplay
  validator before it can retain `verified:true`;
- unsupported CEFR labels and the misleading `cefrProfile` were removed from
  every row; generator difficulty 1–3 remains as `difficultyProfile`, and the
  release gate rejects any reintroduced unproved CEFR claim;
- release now requires a hash-bound independent target-language review receipt
  with `cefrEvidenceStatus:not_claimed`, plus a separate hash-bound Admin
  publication receipt tied to the same corpus and review;
- `speed_match` semantic signatures, uniqueness and reuse limits are computed
  from the exact `tileLeft`/`tileRight` values shown in Spire; right-side tiles
  are deterministically rotated before the gameplay payload is built;
- inspection converters always return `verified:false`; the only API that can
  create `verified:true` tasks first validates the complete release manifest;
- a mixed-language row blocks the whole release bundle rather than being
  silently skipped;
- missing source JSONL or manifest deletes any stale derived bundle and fails
  the asset build instead of leaving old content available to Jest/runtime;
- committed JSONL/manifests must now match a fresh generator run byte for byte;
- fixed Russian plural forms for DE `freundlich/allein`, habitual movement
  (`хожу`, not one-off `иду`), ambiguous DE/FR `allein/seul`, French
  `un moment → время`, Spanish `creativo/realista`, source glosses, afternoon
  parity and unnatural possession frames with early/late/tomorrow;
- the current `BLOCK` manifests therefore yield zero publishable tasks and
  cannot build a user package.
- every source entering a newly built Spire weekly pack now also passes
  `validateTournamentTaskForNewRoom`; legacy one-pair `speed_match` tasks are
  rejected before selection even when the older public-task serializer can
  still serialize them.
- the exact multilingual release-gate failure code is retained through
  `loadMultilingualPool` and projected into the Admin build result's
  `unavailableLangs` instead of being collapsed to `multilingual_pool_empty`;
- the committed-artifact parity gate is cwd-independent and is now mandatory
  inside `functions` build, which is already the Firebase predeploy command.
- the preserved admin tab is now labelled `Контент Spire` and provides a
  selected-language weekly pack build for ES/FR/DE plus audited add/list/remove
  task-flag controls; it does not expose manifest activation or Arena runtime.
- task-flag reads are a fail-closed admission gate before either an Arena query
  or bundled multilingual pool load: read failure and every noncanonical
  existing document block that language with a stable operator-visible reason;
- delayed flag responses are request-tokened and every remove action retains
  its originating language, so an ES row cannot mutate FR after a fast switch;
- partial or complete pack failures are reported as errors rather than the
  misleading status `Готово`.

## Remaining work

1. Obtain real independent target-language approval and Admin publication
   receipts; only then may a separate publication step issue `PASS` manifests.
   No CEFR band may be restored without per-task official descriptor evidence.
2. Integrate listen/dictate/voice under the approved Spire/Learning V2
   contract.
3. Run a fresh independent review after every content or manifest change.
## Verification evidence

- `node --test tests/arena_multilingual_pool_builder.test.mjs` — 5/5 PASS,
  including committed-artifact parity.
- `node scripts/validate_arena_guess_phrase_distractors.mjs` — ES/DE/FR PASS,
  13,437 grammar-only distractors, 0 forbidden reasons.
- focused Functions Jest — 4 suites, 52 tests PASS, including a synthetic
  4,000-row PASS case and the full mutation matrix for the release boundary.
- pack-contract regression proves that legacy one-pair `speed_match` tasks are
  filtered before a new weekly Spire pack is built.
- `npm run gate:spire-multilingual` — 5/5 PASS from `functions/`; the same gate
  also passes from the repository root.
- full `npm run build` — PASS through support context, multilingual parity,
  TypeScript compilation, all three 4,000-row asset copies and runtime parity.
- Functions TypeScript check — PASS after the release-boundary changes.
- Spire admin control, legacy safety and inline-script syntax gates — 3 suites,
  14 tests PASS, including deferred ES/FR races, duplicate mutation blocking,
  failed pack outcomes and post-mutation refresh failure.
- focused Spire Functions verification — 4 suites, 55 tests PASS, including
  strict task-flag fail-closed and zero-read/zero-write fallback coverage.
- final full Functions build — PASS: five 12k corpus gates, TypeScript,
  generated asset copies and runtime parity.
- two independent UI/integration reviews found and verified repairs for the
  language race, incomplete busy state, false-success result and flag read
  fail-open; the final critical re-review returned PASS with no remaining
  Critical, Important or Minor findings.
