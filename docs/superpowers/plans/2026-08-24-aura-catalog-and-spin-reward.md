# Aura Catalog and Random Spin Reward Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate all 39 approved layered auras without breaking existing ownership, and add an idempotent random ordinary-aura Level Spin reward at 2.9997909%.

**Architecture:** A focused static aura-asset registry maps runtime aura IDs to the exact three approved WebP layers and motion metadata; `AvatarAura` reuses the existing three-layer renderer. Existing stable IDs receive replacement art while 29 remaining ordinary designs receive new IDs. The existing `cosmetic_avatar_aura` gift effect and local Spin receipt journal are reused, so the new reward adds no entitlement schema or server authority.

**Tech Stack:** React Native, TypeScript, React Native Animated, Expo Image/Asset, AsyncStorage, Jest, Sharp-based asset validation.

**Workspace note:** Execute in the current owner checkout. Project policy explicitly forbids creating a branch or worktree without a separate owner request. Preserve all unrelated dirty files and patch overlapping Spin files surgically.

---

### Task 1: Lock the 39-aura catalog and stable-ID mapping

**Files:**
- Modify: `constants/avatar_auras.ts`
- Create: `tests/avatar_aura_v2_catalog.test.ts`

- [ ] **Step 1: Write the failing catalog contract**

The test must assert:

```ts
expect(APPROVED_AVATAR_AURAS).toHaveLength(39);
expect(APPROVED_AVATAR_AURAS.filter(a => !a.premiumOnly)).toHaveLength(37);
expect(getAvatarAuraById('aura-plus')?.designId).toBe('solar-sovereign');
expect(getAvatarAuraById('aura-pro')?.designId).toBe('reality-breaker');
for (const id of ['aura-aurora', 'aura-ember', 'aura-mint', 'aura-violet', 'aura-coral', 'aura-prism', 'aura-lagoon', 'aura-sunset']) {
  expect(getAvatarAuraById(id)?.retiredFromShop).not.toBe(true);
}
```

The ordinary stable replacements must assert these design IDs: Quiet Orbit, Ember Claw, Moss Current, Quantum Grid, Coral Bloom, Candy Comet, Soft Tide, and Nebula Gate. Rainbow Loop remains a distinct new `aura-rainbow-loop` entry so all approved visual sets are used exactly once.

- [ ] **Step 2: Run RED under the shared heavy-test semaphore**

Run:

```bash
bash .claude/semaphore/slot.sh acquire "jest aura catalog RED"
npx jest tests/avatar_aura_v2_catalog.test.ts --runInBand
bash .claude/semaphore/slot.sh release
```

Expected: FAIL because the approved catalog/design metadata does not exist.

- [ ] **Step 3: Add the minimal catalog definitions**

Extend `AvatarAuraDef` with the render metadata required by the registry:

```ts
designId?: string;
motion?: 'calm' | 'nature' | 'tech' | 'mystic' | 'energy' | 'playful' | 'luxury' | 'dark' | 'plus' | 'pro';
```

Keep Nimbus and the five Season IDs outside `APPROVED_AVATAR_AURAS`. Reuse the ten stable IDs from the design spec and add the other 29 as `aura-<design-slug>`. Keep Plus/Pro entitlement flags unchanged and make all 37 ordinary approved entries saleable.

- [ ] **Step 4: Run GREEN**

Run the same focused Jest command. Expected: PASS.

### Task 2: Wire exact layered art and circular animation

**Files:**
- Create: `app/avatar_aura_assets.ts`
- Modify: `components/AvatarAura.tsx`
- Modify: `components/SeasonAuraRing.tsx`
- Create: `tests/avatar_aura_v2_assets.test.ts`
- Create: `tests/avatar_aura_v2_render_contract.test.ts`
- Create/copy: `assets/images/avatar-auras/<runtime-id>/{base,flow,accents}.webp` (117 files)

- [ ] **Step 1: Write failing static-require and geometry tests**

Tests must prove 39 entries and 117 unique literal `require()` calls, every file is 320×320 alpha WebP, minimum transparent padding is at least 23 px, center offset is at most 0.71 px, and the maximum visible radius is at most 137.71 px. They must compare SHA-256 content hashes against the matching approved source layer after applying the stable-ID mapping.

- [ ] **Step 2: Run RED**

Run focused asset tests under the semaphore. Expected: FAIL because the app registry/files do not exist.

- [ ] **Step 3: Create the static asset registry before copying assets**

`app/avatar_aura_assets.ts` must export a lookup returning a `SeasonAuraAsset`-compatible object with literal static requires. Use `accents.webp` as `particlesSource`. Motion families assign distinct, bounded pulse/base/flow/particle durations while preserving circular rotation; Plus and Pro use the richest multi-speed motion.

- [ ] **Step 4: Copy exact approved source bytes**

Copy each mapped source directory from `.codex-tmp/avatar-aura-v2/layers/<design-id>/` to the statically required runtime directory. Do not regenerate, crop, recolor, recompress, or rename layer roles.

- [ ] **Step 5: Route approved auras through the three-layer renderer**

Resolve approved aura art before the legacy procedural fallback. Keep the existing `size * 1.40` square layer canvas and centered absolute positioning. Use transform/opacity-only loops, screen focus/AppState pausing, and reduced-motion behavior already present in `SeasonAuraRing`.

- [ ] **Step 6: Run GREEN**

Expected: both focused tests PASS with 39 registry entries, 117 layer files, and no clipping/centering violations.

### Task 3: Preserve exact app/admin preview parity

**Files:**
- Modify: `functions/src/cosmetic_asset_archive.ts`
- Create/copy: `admin/v2/avatar-auras/<runtime-id>/{base,flow,accents}.webp` (117 files)
- Create: `tests/avatar_aura_admin_archive_contract.test.ts`

- [ ] **Step 1: Write the failing archive parity test**

Assert every approved runtime ID returns an `aura-layers` archive item with three `/avatar-auras/<runtime-id>/...` URLs, all 117 hosting files exist, and every admin file hash equals its app counterpart.

- [ ] **Step 2: Run RED**

Expected: FAIL because approved archive entries/hosting files are absent.

- [ ] **Step 3: Add exact layered archive entries and copies**

Do not edit the frozen admin surfaces. `admin/v2/legacy.html` already understands `aura-layers`; only supply the canonical archive data and static hosting files.

- [ ] **Step 4: Run GREEN**

Expected: focused archive test PASS with 39 entries and 117 byte-identical copies.

### Task 4: Add the 2.9997909% random-aura Spin reward by TDD

**Files:**
- Modify: `app/level_spin_reward_catalog.ts`
- Modify: `app/level_spin_local_contract.ts`
- Modify: `app/local_level_spins.ts`
- Modify: `app/level_gift_system.ts`
- Modify: `tests/level_spin_reward_catalog.test.ts`
- Modify: `tests/local_level_spins.test.ts`
- Modify: `tests/level_gift_effect_exactly_once.test.ts`

- [ ] **Step 1: Write failing probability and eligibility tests**

Add `cosmetic_avatar_aura` as a rare Spin reward with weight `6170`. Assert total weight `205681` and probability `6170 / 205681`. Add tests proving random candidates exclude `premiumOnly`, `proOnly`, `rewardOnly`, `retiredFromShop`, level-gated, and already-owned entries.

- [ ] **Step 2: Write failing crash/replay tests**

Prove the selected aura is persisted in the occurrence receipt before ownership changes, retry reuses that exact ID, ownership is granted once, and an all-owned pool returns the existing 350 XP fallback.

- [ ] **Step 3: Run RED**

Run the three focused suites serially under one semaphore slot. Expected: new assertions FAIL for missing catalog entry/pool exclusions.

- [ ] **Step 4: Implement the minimal Spin catalog version update**

Append:

```ts
Object.freeze({ id: 'cosmetic_avatar_aura', tier: 'rare' as const, weight: 6170 })
```

Advance only the local catalog version required to distinguish new receipts, accept old v1/v2 receipts during recovery, and emit the new version for new local claims. Do not alter Firestore schemas or server authority.

- [ ] **Step 5: Harden the existing aura candidate pool**

Both random-aura selection paths must share the eligibility rule:

```ts
!aura.premiumOnly
  && !aura.proOnly
  && !aura.rewardOnly
  && !aura.retiredFromShop
  && aura.unlockLevel === undefined
  && !owned[aura.id]
```

- [ ] **Step 6: Run GREEN**

Expected: all three focused suites PASS, including exact-once and legacy receipt recovery.

### Task 5: Add the DALL·E Spin aura-reliquary asset

**Files:**
- Modify: `app/level_spin_reward_assets.ts`
- Modify: `app/level_spin_reward_asset_manifest.ts`
- Modify: `components/LevelSpinFinishLine.tsx`
- Create: `assets/images/level-spin-rewards/cosmetic_avatar_aura.webp`
- Modify: `tests/level_spin_reward_assets.test.ts`
- Modify: `tests/level_spin_reward_asset_manifest.test.ts`
- Modify: `tests/level_spin_reward_art.test.ts`

- [ ] **Step 1: Wire the expected static asset key and write failing tests**

Add a literal require for `cosmetic_avatar_aura.webp`, classify it as the `aura` family, and include it in the Finish Line presentation stream. Tests assert a 512×512 transparent WebP, no text/logo, valid alpha bounds, and a resolvable art source.

- [ ] **Step 2: Run RED**

Expected: FAIL only because the asset is missing.

- [ ] **Step 3: Generate and validate the source image**

Use Codex built-in image generation, not any project API key. Generate one centered label-free 3D fantasy aura reliquary on transparent background: porcelain/obsidian/champagne-gold materials, hexagonal empty center, visible contained luminous aura, matching the existing key/chest/shield reward family. Preserve generous transparent margin and avoid detached fragments, letters, numbers, logos, shadows touching edges, or cropped geometry.

- [ ] **Step 4: Convert only the selected final to bundled WebP**

Resize to 512×512, preserve alpha, encode WebP at project quality, and validate with `scripts/validate-level-spin-reward-asset.mjs`.

- [ ] **Step 5: Run GREEN**

Expected: focused art/manifest/asset suites PASS and the validator exits 0.

### Task 6: Focused verification and visual QA

**Files:**
- Verify only; repair source only if a focused gate exposes a task regression.

- [ ] **Step 1: Run focused TypeScript/ESLint checks on changed files**

Acquire the semaphore before any TypeScript/Jest command and release it in a `finally`/trap-safe path.

- [ ] **Step 2: Run the complete focused aura and Spin test list**

Include catalog, asset, render, archive, local Spin, exact-once gift effect, customization purchase, cloud owned-union, Firestore Rules contract, Jarvis data-contract guard, and economy-constitution guards. Do not run broad project Jest or global `tsc`.

- [ ] **Step 3: Inspect runtime surfaces**

Verify dark/light mode, reduced motion, 36/44/64 px avatars, hex avatar mask, shop tiles, owned selection, profiles, battle rows, Spin finish line, reward modal, and retry/restart behavior. Confirm no layer is clipped and rotation remains circular.

- [ ] **Step 4: Review the final diff**

Confirm no unrelated dirty changes were reverted or staged, no project OpenAI key was used, every new bundled image has a literal static require, and no new Firestore/Jarvis schema mutation exists.
