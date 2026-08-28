# Uniform Avatar Aura Grid Sizing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render every aura preview in the Studio catalog at the same 91 pt visual diameter while preserving the existing 107 pt tiles and all non-catalog aura sizes.

**Architecture:** Add an optional catalog-only visual-size override to `AvatarView` and forward it to `AvatarAura`. The aura renderer uses the override for layered rings, loading placeholders, and the outer edge of the gradient fallback; callers that omit the prop retain current behavior.

**Tech Stack:** React Native, TypeScript, Expo Image, Jest source-contract tests

---

### Task 1: Lock the catalog geometry with a failing contract test

**Files:**
- Modify: `tests/avatar_aura_v2_render_contract.test.ts`
- Modify: `tests/season_aura_account_preview_contract.test.ts`

- [ ] **Step 1: Write the failing test**

Add a contract that requires the 91 pt constant, its catalog-only prop, and unified renderer branches:

```ts
const avatarView = fs.readFileSync(path.join(__dirname, '../components/AvatarView.tsx'), 'utf8');

it('normalizes every catalog aura to 91 pt without shrinking the tile', () => {
  expect(catalogCard).toContain('const AURA_CATALOG_VISUAL_SIZE = 91;');
  expect(catalogCard).toContain('auraVisualSize={item.kind === \'aura\' ? AURA_CATALOG_VISUAL_SIZE : undefined}');
  expect(avatarView).toContain('auraVisualSize?: number;');
  expect(avatarView).toContain('visualSize={auraVisualSize}');
  expect(avatarAura).toContain('visualSize?: number;');
  expect(avatarAura).toContain('const requestedVisualSize = visualSize === undefined ? undefined : Math.round(visualSize);');
  expect(avatarAura).toContain('const ringSize = requestedVisualSize ?? Math.round(size * ringScale);');
  expect(avatarAura).toContain('width: ringSize,');
  expect(avatarAura).toContain('const softOuterSize = requestedVisualSize ?? outer + 18;');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Acquire the shared heavy-test slot, run only the focused contract, then release the slot:

```bash
bash .claude/semaphore/slot.sh acquire "jest aura grid RED"
npx jest --runTestsByPath tests/avatar_aura_v2_render_contract.test.ts --no-cache --runInBand
bash .claude/semaphore/slot.sh release
```

Expected: FAIL because `AURA_CATALOG_VISUAL_SIZE` and `auraVisualSize` do not exist yet.

### Task 2: Implement the catalog-only 91 pt override

**Files:**
- Modify: `components/customization/CustomizationCatalogCard.tsx`
- Modify: `components/AvatarView.tsx`
- Modify: `components/AvatarAura.tsx`

- [ ] **Step 1: Define and pass the catalog visual size**

In `CustomizationCatalogCard.tsx`, keep the avatar size at 52 pt and add the approved visual diameter:

```ts
const AURA_CATALOG_PREVIEW_SIZE = 52;
const AURA_CATALOG_VISUAL_SIZE = 91;
```

Pass it only for aura items:

```tsx
<AvatarView
  avatar={item.previewAvatar}
  auraId={item.kind === 'aura' ? item.auraId : null}
  size={item.kind === 'aura' ? AURA_CATALOG_PREVIEW_SIZE : AVATAR_CATALOG_PREVIEW_SIZE}
  auraVisualSize={item.kind === 'aura' ? AURA_CATALOG_VISUAL_SIZE : undefined}
  animateAura={false}
/>
```

- [ ] **Step 2: Forward the optional prop through `AvatarView`**

Extend `Props` and the render call without changing defaults:

```ts
auraVisualSize?: number;
```

```tsx
<AvatarAura
  auraId={auraId}
  size={size}
  visualSize={auraVisualSize}
  style={style}
  animate={animateAura}
  ownerActive={ownerActive}
>
```

- [ ] **Step 3: Apply one visual diameter to every renderer branch**

In `AvatarAura.tsx`, add `visualSize?: number`, normalize it once, and use it for layered art and its placeholder:

```ts
const requestedVisualSize = visualSize === undefined ? undefined : Math.round(visualSize);
const ringSize = requestedVisualSize ?? Math.round(size * ringScale);
```

The placeholder uses `width: ringSize`, `height: ringSize`, and `borderRadius: ringSize / 2`, so loading does not change geometry.

For the gradient fallback, make the requested size describe the outermost soft edge:

```ts
const outer = requestedVisualSize === undefined
  ? size + 8
  : Math.max(size, requestedVisualSize - 18);
const softOuterSize = requestedVisualSize ?? outer + 18;
```

Use `softOuterSize` for the outer soft-edge width, height, and radius. Leave the existing default calculations intact when no override is provided.

- [ ] **Step 4: Run the focused test to verify GREEN**

```bash
bash .claude/semaphore/slot.sh acquire "jest aura grid GREEN"
npx jest --runTestsByPath tests/avatar_aura_v2_render_contract.test.ts tests/avatar_aura_soft_edge_contract.test.ts tests/season_aura_account_preview_contract.test.ts --no-cache --runInBand
bash .claude/semaphore/slot.sh release
```

Expected: all focused suites PASS.

### Task 3: Verify scope and finish

**Files:**
- Verify: `components/customization/CustomizationCatalogCard.tsx`
- Verify: `components/AvatarView.tsx`
- Verify: `components/AvatarAura.tsx`
- Verify: `tests/avatar_aura_v2_render_contract.test.ts`

- [ ] **Step 1: Check formatting and catalog-only usage**

```bash
git diff --check -- components/customization/CustomizationCatalogCard.tsx components/AvatarView.tsx components/AvatarAura.tsx tests/avatar_aura_v2_render_contract.test.ts
rg -n "auraVisualSize" app components tests/avatar_aura_v2_render_contract.test.ts
```

Expected: no whitespace errors; the value originates only in `CustomizationCatalogCard` and is merely forwarded by shared components.

- [ ] **Step 2: Run a focused TypeScript check if an isolated command is available**

Use the project semaphore before any `tsc` invocation. Do not run a whole-project typecheck automatically; the repository is shared and currently has unrelated work in progress. The focused Jest compile is the required type gate for these files.

- [ ] **Step 3: Review the final diff**

Confirm that no grid, price, ownership, purchase, animation, profile, league, Arena, or large-stage behavior changed.

Update the season source contract to assert the shared `ringScale` selection and the catalog override fallback rather than the obsolete direct multiplication string.

- [ ] **Step 4: Commit only owned files**

```bash
git commit --only -m "fix: normalize aura catalog preview sizes" -- components/customization/CustomizationCatalogCard.tsx components/AvatarView.tsx components/AvatarAura.tsx tests/avatar_aura_v2_render_contract.test.ts tests/season_aura_account_preview_contract.test.ts docs/superpowers/plans/2026-08-28-avatar-aura-grid-sizing.md
```
