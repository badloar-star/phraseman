# Home Hint Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fact-checked, owner-selectable catalog of 300 Russian home hints with three variants each, publish selected variants immediately through the live admin surface, and rotate localized hints on the home screen by audience.

**Architecture:** Keep the 300-record catalog in a typed Functions module so the admin callable can serve it without a draft Firestore collection. Publish only selected, validated records into a versioned `home_hints/published` snapshot. The app reads that public snapshot with a local cache and uses a pure deterministic rotation module; untranslated locales retain their existing localized fallback.

**Tech Stack:** React Native/Expo TypeScript, Firebase Callable Functions, Firestore, existing `admin/v2/legacy.html` admin surface, Jest/Vitest-style repository tests, AsyncStorage/local persistence already used by the app.

---

## File map

- Create `functions/src/home_hints_catalog.ts`: 300 semantic records, three Russian variants, audience/category/source metadata, and strict runtime validation.
- Create `functions/src/home_hints.ts`: normalized published snapshot types, audience filtering, size/length validation, and idempotent publication payload helpers.
- Create `functions/src/admin_home_hints.ts`: admin-only catalog read and snapshot publication callable functions.
- Create `functions/src/admin_home_hints.test.ts`: callable normalization and permission/idempotency tests.
- Create `app/home_hints.ts`: pure rotation, locale fallback, version/index migration, and reduced-motion-independent data logic.
- Create `app/home_hints_client.ts`: Firestore read and AsyncStorage cache adapter with fail-safe parsing.
- Create `tests/home_hints.test.ts`: deterministic queue and audience/fallback tests.
- Create `tests/admin_home_hints_contract.test.ts`: export and admin-surface contract guards.
- Modify `functions/src/index.ts`: export the two new callables.
- Modify `firestore.rules`: allow signed-in reads of only the published snapshot and deny client writes.
- Modify `functions/src/jarvis/jarvis_data_contract_guard.test.ts` only if its collection contract scanner requires an explicit new public snapshot entry; do not add a Jarvis reader unless Jarvis actually consumes this collection.
- Modify `admin/v2/legacy.html`: add the catalog tab, filters, three-variant selection, preview, validation summary, and publish action using the existing callable/auth/audit patterns.
- Modify `app/remote_config_client.ts` only if the existing foreground refresh hook is the correct shared trigger; otherwise call the new hint client from the home focus lifecycle without changing unrelated Remote Config behavior.
- Modify `app/(tabs)/home.tsx`: render the new hint in the existing stats-hint slot while preserving the existing stats card navigation, pulse, accessibility label, and fallback.

### Task 1: Establish the pure content contract and 300-record catalog

**Files:**
- Create: `functions/src/home_hints_catalog.ts`
- Create: `functions/src/home_hints.ts`
- Test: `functions/src/home_hints.test.ts`

- [ ] **Step 1: Write failing catalog/validation tests.** Assert exactly 300 unique ids, exactly three non-empty Russian variants per id, valid category/audience/status values, source metadata for every factual record, maximum display length, and rejection of `needs_owner_confirmation` records during publication.

```ts
it('contains 300 ideas with exactly three Russian variants', () => {
  expect(HOME_HINT_CATALOG).toHaveLength(300);
  expect(new Set(HOME_HINT_CATALOG.map((x) => x.id)).size).toBe(300);
  for (const item of HOME_HINT_CATALOG) {
    expect(item.variantsRu).toHaveLength(3);
    expect(item.variantsRu.every((text) => text.trim().length > 0)).toBe(true);
  }
});
```

- [ ] **Step 2: Run the focused test and verify it fails** because the catalog and validator do not exist.

Run: `npm test -- --runInBand functions/src/home_hints.test.ts`

Expected: FAIL with missing module/export errors.

- [ ] **Step 3: Implement the contract.** Use `HomeHintCategory` values `results`, `lessons`, `dialogues`, `flashcards`, `energy`, `video`, `plus`, `league`, `referrals`, `arena`, `settings`, `streak`, `daily`, `learning`, and `home`. Use `audience: 'all' | 'free' | 'plus'`. Keep factual-source strings tied to repository files/docs; mark unverified owner claims as `needs_owner_confirmation` so they cannot publish.

- [ ] **Step 4: Author the 300 ideas.** Provide 20 ideas in each of the 15 categories, with three distinct short Russian variants per idea. Keep tone light and friendly, but do not assert prices, energy rates, league rewards, rune utility, referral rewards, arena matchmaking, or video benefits unless the source contract verifies the exact claim. Use `copy_only` for playful non-factual nudges and `verified` for claims backed by code/docs.

- [ ] **Step 5: Run the focused tests and verify they pass.**

Run: `npm test -- --runInBand functions/src/home_hints.test.ts`

Expected: PASS; output includes `300 ideas` and `all publication guards passed`.

- [ ] **Step 6: Commit the isolated content contract.**

Run: `git add functions/src/home_hints_catalog.ts functions/src/home_hints.ts functions/src/home_hints.test.ts && git commit -m "feat: add fact-checked home hint catalog"`

### Task 2: Add safe publication callables and Firestore rules

**Files:**
- Create: `functions/src/admin_home_hints.ts`
- Create: `functions/src/admin_home_hints.test.ts`
- Create: `tests/admin_home_hints_contract.test.ts`
- Modify: `functions/src/index.ts`
- Modify: `firestore.rules`
- Test/update if required: `functions/src/jarvis/jarvis_data_contract_guard.test.ts`

- [ ] **Step 1: Write failing callable tests.** Cover admin claim rejection, unknown id rejection, invalid variant index rejection, blocked fact status, maximum payload size, deterministic snapshot version, same idempotency key replay, and no client write permission.

- [ ] **Step 2: Run the focused tests and verify they fail.**

Run: `npm test -- --runInBand functions/src/admin_home_hints.test.ts tests/admin_home_hints_contract.test.ts`

Expected: FAIL because the functions and exports do not exist.

- [ ] **Step 3: Implement `adminGetHomeHintsCatalog` and `adminPublishHomeHints`.** Both use the existing `ADMIN_SENSITIVE_WRITE_OPTIONS`, `requireAdminAppCheck`, and `actor`/admin permission pattern. Do not enable App Check enforcement. Publication accepts `{ selections: [{ id, variantIndex }], idempotencyKey }`, normalizes order by catalog order, writes a single versioned published snapshot and an audit record, and returns the same receipt for a repeated idempotency key.

- [ ] **Step 4: Add Rules.** Allow authenticated reads only at `home_hints/published`; deny all client writes and deny all reads/writes to any future draft/history paths unless an existing server-only rule pattern covers them. Keep the snapshot free of source notes and unselected variants.

- [ ] **Step 5: Run the focused tests and verify they pass.**

Run: `npm test -- --runInBand functions/src/admin_home_hints.test.ts tests/admin_home_hints_contract.test.ts`

Expected: PASS; security assertions confirm non-admins cannot publish and clients cannot write the snapshot.

- [ ] **Step 6: Export the callables and run the narrow Functions typecheck.** Acquire the repository semaphore before the typecheck and release it afterward.

Run: `bash .claude/semaphore/slot.sh acquire "home hints Functions typecheck"; npm run typecheck --workspace functions; bash .claude/semaphore/slot.sh release`

Expected: PASS with the two callable exports present in `functions/src/index.ts`.

### Task 3: Add deterministic client rotation and cache

**Files:**
- Create: `app/home_hints.ts`
- Create: `app/home_hints_client.ts`
- Create: `tests/home_hints.test.ts`

- [ ] **Step 1: Write failing pure rotation tests.** Assert `all` is available to Free and Plus, audience-specific hints are isolated, the next id advances exactly once per new home-entry event, the index wraps, a changed snapshot version normalizes safely, and missing translations return the current locale fallback rather than Russian text.

- [ ] **Step 2: Run the focused test and verify it fails.**

Run: `npm test -- --runInBand tests/home_hints.test.ts`

Expected: FAIL with missing rotation/cache exports.

- [ ] **Step 3: Implement pure helpers.** Define `PublishedHomeHints`, `HomeHintCursor`, `selectNextHomeHint`, `normalizeCursor`, and `resolveHomeHintText`. Store only `{ snapshotVersion, nextIndexByAudience }` locally; never store admin notes or unselected variants. Use a stable order from the published snapshot, not random selection.

- [ ] **Step 4: Implement the Firestore/cache adapter.** Read one published document on cold start or home focus, parse defensively, reject malformed/empty snapshots, retain the last valid AsyncStorage value on errors, and expose a small `loadPublishedHomeHints()` function that the home screen can call without blocking its first frame.

- [ ] **Step 5: Run the focused tests and verify they pass.**

Run: `npm test -- --runInBand tests/home_hints.test.ts`

Expected: PASS, including offline and malformed-snapshot cases.

- [ ] **Step 6: Commit the pure client layer.**

Run: `git add app/home_hints.ts app/home_hints_client.ts tests/home_hints.test.ts && git commit -m "feat: rotate published home hints safely"`

### Task 4: Integrate the home screen without changing existing behavior

**Files:**
- Modify: `app/(tabs)/home.tsx`
- Modify: `components/LangContext.tsx` only for any missing fallback labels across existing locales
- Test: `tests/home_interaction_contract.test.ts` or a new focused home-hints integration test

- [ ] **Step 1: Add a failing integration assertion** that the existing `home-stats-card` still navigates to `/streak_stats`, retains its accessibility label/hint, and renders the fallback when no published hint is available.

- [ ] **Step 2: Run the focused home contract test and verify it fails** for the new published-hint path.

Run: `npm test -- --runInBand tests/home_interaction_contract.test.ts`

Expected: FAIL only on the new hint-source assertion.

- [ ] **Step 3: Integrate the client.** On a genuine home focus/foreground event, load the snapshot in the background, resolve the current audience, advance the cursor once, and render the selected localized string inside the existing pulsing hint slot. Preserve `reduceMotion` behavior, the stats card tap handler, and the current per-locale fallback.

- [ ] **Step 4: Run the focused test and verify it passes.**

Run: `npm test -- --runInBand tests/home_interaction_contract.test.ts`

Expected: PASS with the existing navigation and accessibility assertions intact.

### Task 5: Build the live admin catalog UI

**Files:**
- Modify: `admin/v2/legacy.html`
- Test: `tests/admin_home_hints_contract.test.ts`

- [ ] **Step 1: Add the failing admin HTML contract assertions.** Assert the page contains the Home Hint Studio section, search/category/audience/fact/status filters, exactly one selected variant per idea, preview text output, disabled empty-selection publish state, callable names, and escaped text rendering.

- [ ] **Step 2: Run the contract test and verify it fails.**

Run: `npm test -- --runInBand tests/admin_home_hints_contract.test.ts`

Expected: FAIL because the section and handlers do not exist.

- [ ] **Step 3: Add the section to `admin/v2/legacy.html`.** Use existing dark-panel tokens and accessible controls. Fetch the catalog through `adminGetHomeHintsCatalog`, render paginated/filterable rows, display all three Russian variants, store `selectedVariantIndex` per id, and show source/fact status. Use `textContent`/escaped DOM output for user-controlled text; never interpolate catalog text into executable HTML.

- [ ] **Step 4: Add publish confirmation and callable invocation.** The button sends only selected ids and variant indexes with a generated idempotency key, shows count/version/status, disables during the request, and reports validation errors inline. Repeated submissions with the same selected set must not duplicate published entries.

- [ ] **Step 5: Add preview modes.** Provide a narrow Home Results card preview and audience tabs for All/Free/Plus. Keep motion preview disabled when `prefers-reduced-motion` is enabled. Make every row keyboard reachable with a visible focus ring.

- [ ] **Step 6: Run the contract test and verify it passes.**

Run: `npm test -- --runInBand tests/admin_home_hints_contract.test.ts`

Expected: PASS; existing admin single-surface contract remains unchanged.

### Task 6: Run final focused verification and publish readiness checks

**Files:**
- No new source files; inspect all changed files and generated reports.

- [ ] **Step 1: Run the content, callable, client, home, and admin tests together under one semaphore slot.**

Run: `bash .claude/semaphore/slot.sh acquire "home hints focused verification"; npm test -- --runInBand functions/src/home_hints.test.ts functions/src/admin_home_hints.test.ts tests/home_hints.test.ts tests/home_interaction_contract.test.ts tests/admin_home_hints_contract.test.ts; bash .claude/semaphore/slot.sh release`

Expected: PASS with no skipped security/content tests.

- [ ] **Step 2: Run the repository's existing admin single-surface, Firestore Rules, and Jarvis contract tests** only if they are the narrow gates affected by the new collection/function.

Expected: PASS; if Jarvis detects the collection, update its explicit contract in the same change rather than weakening the guard.

- [ ] **Step 3: Inspect the diff for scope safety.** Confirm no files under the arena boundary were reverted, no App Check enforcement was enabled, no direct economy writers were introduced, no unrelated dirty-worktree changes were staged, and no project OpenAI API key was read.

- [ ] **Step 4: Run `git diff --check` and report exact verification results.**

Expected: no whitespace errors and a concise list of changed files, test commands, and publication behavior.

