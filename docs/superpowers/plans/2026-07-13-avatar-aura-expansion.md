# Avatar Aura Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship the approved level, gift, Plus, helper, shop, and seasonal aura expansion together with three seasonal avatars, correct reward ownership, and production-safe animation behavior.

**Architecture:** Keep cosmetic metadata as the single source of truth in `constants/`, keep the current virtualized three-column Studio catalog, and render all animated auras from one lifecycle-gated phase value in `AvatarAura`. Reward-only cosmetics are granted by exact server mappings and restored by unioning owned IDs, never by making them purchasable. The release is built from an isolated branch, merged into the integration branch without absorbing unrelated dirty files, published to EAS first, and followed by exact Firebase Function targets.

**Tech Stack:** Expo / React Native, TypeScript, React Native Animated, Firebase callable functions and Firestore, Jest contract tests, EAS Update, Firebase CLI.

---

## Task 1: Create an isolated implementation branch

**Files:**

- Verify: `.gitignore`
- Create worktree: `.worktrees/avatar-aura-expansion-20260713`

- [ ] Read the worktree workflow instructions and confirm `.worktrees/` is ignored.
- [ ] Create branch `codex/avatar-aura-expansion-20260713` from the approved design/plan commit.
- [ ] Run `git status --short` in the new worktree and confirm it is clean.
- [ ] Record the exact base commit and compare the committed Studio implementation with the dirty primary workspace so the release cannot regress the approved vertical catalog.

## Task 2: Lock the cosmetic metadata contract with tests

**Files:**

- Modify: `constants/avatar_auras.ts`
- Modify: `app/customization_catalog.ts`
- Create: `tests/avatar_aura_catalog_contract.test.ts`

- [ ] Write failing contracts for an explicit required acquisition source: `shop`, `plus`, `level`, `gift`, `season`, `arena`, or `legacy`.
- [ ] Assert that levels 52–60 map to nine distinct approved aura IDs, including `Ice Rift` at level 53 and `Solar Forge` at level 57.
- [ ] Assert that five shop auras remain 35 shards and are visually subordinate to progression rewards.
- [ ] Assert that gift and seasonal auras never expose a shard purchase route.
- [ ] Implement the metadata and acquisition helpers without weakening legacy ID normalization.
- [ ] Run `npx jest tests/avatar_aura_catalog_contract.test.ts --runInBand` and expect PASS.

## Task 3: Add the three approved seasonal avatars

**Files:**

- Modify: `constants/custom_avatars.ts`
- Modify: `components/CustomAvatarBadge.tsx`
- Modify: `app/customization_catalog.ts`
- Create: `assets/images/avatars/seasonal/polar-guardian.webp`
- Create: `assets/images/avatars/seasonal/obsidian-raven.webp`
- Create: `assets/images/avatars/seasonal/jade-guardian.webp`
- Create: `tests/seasonal_avatar_assets_contract.test.ts`

- [ ] Write a failing contract for the exact three seasonal avatar IDs and static `require()` paths.
- [ ] Copy only the approved compressed RGBA WebP finals; do not add raw generation sources.
- [ ] Register each image once and use the same native artwork for both logo-color modes so the raster is not tinted.
- [ ] Fit each image inside the existing exact hexagonal clip at 44 px and 54 px without changing the badge geometry.
- [ ] Exclude seasonal avatars from both the shard shop and random gift pool; show them only when owned/equipped.
- [ ] Run `npx jest tests/seasonal_avatar_assets_contract.test.ts tests/custom_avatar_asset_alignment.test.ts --runInBand` and expect PASS.

## Task 4: Implement smooth, lifecycle-safe aura families

**Files:**

- Modify: `components/AvatarAura.tsx`
- Create: `components/avatar_aura/AuraLayers.tsx`
- Create: `components/avatar_aura/aura_presets.ts`
- Modify or create focused tests under: `tests/avatar_aura_runtime_contract.test.ts`

- [ ] Write failing source/runtime contracts for a single shared phase loop, focus and AppState gating, reduced-motion support, and deterministic paused frames.
- [ ] Extract reusable primitives for breathing halos, continuous crescents, soft fields, and restrained glints; renderers receive derived values and never start their own loops.
- [ ] Implement the approved level 52–60, gift-only, Plus, helper/Nimbus, shop-remaster, and six seasonal visual presets.
- [ ] Ensure Ice Rift and Nimbus 2.0 contain no white top stripe, vertical white beam, or segmented multicolour strip construction.
- [ ] Keep transforms and opacity on the UI/native animation path; do not animate layout, blur radius, SVG path strings, or per-frame randomness.
- [ ] Stop/reset motion on blur, background, unmount, or reduced-motion preference.
- [ ] Run the focused aura runtime contract and existing performance guards; expect PASS.

## Task 5: Correct gift and league reward ownership

**Files:**

- Modify: `functions/src/league_chest.ts`
- Modify the matching client reward pool file identified by literal aura-ID search.
- Modify: `app/services/league_chest_rewards.ts` only if its union behavior needs correction.
- Create or modify focused league reward tests beside the affected code.

- [ ] Write a failing test proving all aura drops in one reward are unioned into ownership and the last/highest drop becomes equipped.
- [ ] Remove the nonexistent `aura-gold` ID from both server and client pools.
- [ ] Add only the approved gift-only aura IDs to gift selection and preserve idempotent reward application.
- [ ] Implement cumulative owned-map merging without overwriting unrelated owned cosmetics.
- [ ] Run focused root and Functions league reward tests; expect PASS.

## Task 6: Map exact seasonal rewards and fix ended-season claiming

**Files:**

- Modify: `functions/src/arena_season_rewards.ts`
- Modify: `app/services/arena_season_client.ts`
- Modify: `app/arena_lobby.tsx`
- Modify or create focused season reward tests.

- [ ] Write failing tests for exact season mappings: `2026-Q3` Polar Resonance, `2026-Q4` Velvet Eclipse, and `2027-Q1` Jade Dawn, with legacy fallback for unknown old seasons.
- [ ] Add reward drop support for `customAvatarId`, `gradientId`, and `logoColor` on the client.
- [ ] Make season-change detection return the just-ended season, not the newly started season.
- [ ] Ensure the UI marks a season as seen only after a successful or explicitly already-claimed response; failed claims remain retryable.
- [ ] Grant participation aura, top-10 avatar, and champion aura cumulatively, preserving existing owned cosmetics and equipping the highest earned tier.
- [ ] Preserve callable idempotency and exact `seasonId` claim-document keys.
- [ ] Run focused season reward tests in root and `functions/`; expect PASS.

## Task 7: Verify the final user experience and performance

**Files:**

- Verify: `app/avatar_select.tsx`
- Verify: all files changed by Tasks 2–6

- [ ] Confirm the current single vertical `Reanimated.FlatList` and three-column geometry remain intact.
- [ ] Confirm catalog cards are deterministic/static and only the large hero preview animates.
- [ ] Inspect all approved auras at 44 px, 54 px, and 82 px on light and dark surfaces; check clipping, no layout movement, and no forbidden white strips.
- [ ] Inspect the three seasonal avatars at 44 px and 54 px inside the exact application hexagon.
- [ ] Run narrow Studio, aura, asset, season, league, performance-freeze, navigation-underlay, and owner-direction contracts.
- [ ] Run focused TypeScript/build checks only for the affected surfaces; do not run broad write-capable generators from tests.

## Task 8: Prepare a minimal auditable release commit

**Files:**

- Modify generated `functions/lib/**` files only for the two changed callable surfaces and their maps/tests.
- Create a release evidence note in an ignored/report location if the release gate requires it.

- [ ] Build Functions and inspect the generated diff; include only outputs corresponding to changed sources.
- [ ] Run the repository secret scan and production update gate.
- [ ] Review `git diff --check`, `git diff --stat`, and the exact changed-file list.
- [ ] Commit the implementation with no unrelated primary-workspace changes.
- [ ] Request final frontier advisor review with the actual diff and verification evidence; apply and resubmit any required changes until `DECISION: APPROVED`.

## Task 9: Merge and deploy safely

**Files:**

- Merge target: `codex/all-development-integration`
- Deployment targets: EAS production channel, `functions:arenaSeasonClaimReward`, and `functions:leagueChestClaim` only if changed.

- [ ] Fetch and compare the integration branch; merge the feature in its clean integration worktree without touching the dirty primary workspace.
- [ ] Resolve conflicts by preserving the approved vertical Studio and unrelated integration work; rerun all focused gates on the exact merge commit.
- [ ] Push the feature/integration branch required by the repository workflow.
- [ ] Run `npm run eas:update:production` from the clean verified merge commit and record the published update/group ID.
- [ ] After the client publication succeeds, deploy only the exact changed Firebase callable targets.
- [ ] Verify the EAS update is visible on the production channel and both callable deployments report success.
- [ ] Do not deploy Firestore rules, indexes, hosting, or unrelated Functions.
