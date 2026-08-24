# Universal Social Marker Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the rejected 27 themed raster friend-event markers with three simple universal Ionicons while preserving accessibility, reduced motion, event priority, and the duel countdown.

**Architecture:** `FriendEventMarker` becomes the sole visual owner and renders a fixed porcelain/graphite/teal/amber vector badge from the event kind. Theme-based image lookup, generated WebP files, and the marker build script are removed completely; social-event state and navigation remain unchanged.

**Tech Stack:** React Native, TypeScript, Expo Ionicons, Reanimated Motion Hybrid, Jest source contracts.

---

### Task 1: Lock the universal icon contract with failing tests

**Files:**
- Modify: `tests/friend_event_marker_contract.test.ts`
- Delete: `tests/friend_event_asset_map.test.ts`
- Create: `tests/friend_event_icon_contract.test.ts`

- [x] **Step 1: Replace themed-raster expectations**

Assert that `FriendEventMarker.tsx` imports Ionicons, contains `hand-left-outline`, `book-outline`, `shield-half-outline`, and `flash`, retains `accessibilityLabel`, `useReduceMotion`, and `LUM`, and contains neither `expo-image`, `getFriendEventAsset`, nor a `themeMode` prop.

- [x] **Step 2: Add the repository cleanup contract**

Assert that `components/friends_together/friend_event_assets.ts`, `scripts/friend-social/build-marker-assets.mjs`, and `assets/images/friends/social-markers` do not exist.

- [x] **Step 3: Run RED**

Run:

```powershell
npx jest --runInBand tests/friend_event_marker_contract.test.ts tests/friend_event_icon_contract.test.ts
```

Expected: FAIL because the marker still imports `expo-image` and the rejected raster files still exist.

### Task 2: Render the three simple universal icons

**Files:**
- Modify: `components/friends_together/FriendEventMarker.tsx`
- Modify: `components/friends_together/FriendListRow.tsx`
- Modify: `app/(tabs)/friends.tsx`

- [x] **Step 1: Replace bitmap rendering with Ionicons**

Map `high_five` to `hand-left-outline`, `study_invite` to `book-outline`, and `duel_invite` to `shield-half-outline`. Overlay a small `flash` only on the duel badge.

- [x] **Step 2: Apply the approved universal visual constants**

Use a fixed warm-porcelain surface `#EEE7DB`, graphite ink `#2D3842`, teal rim `#5E8C90`, and amber accent `#DF824B`. Keep the 58-point press target, the invisible localized accessibility label, reduced-motion handling, Motion Hybrid entrance, and numeric duel countdown.

- [x] **Step 3: Remove the theme-only prop path**

Remove `themeMode` from `FriendEventMarker`, `FriendListRowProps`, the row implementation, and the Friends-screen call site. No social marker code may branch on the active theme.

- [x] **Step 4: Run GREEN**

Run the two focused tests and expect both suites to pass.

### Task 3: Delete rejected raster artifacts and verify integration

**Files:**
- Delete: `components/friends_together/friend_event_assets.ts`
- Delete: `scripts/friend-social/build-marker-assets.mjs`
- Delete: `assets/images/friends/social-markers/*.webp`

- [x] **Step 1: Verify exact deletion targets**

Resolve each target under the repository root, confirm the raster directory contains exactly the 27 rejected social-marker WebP files, and confirm no source outside the obsolete map references their basenames.

- [x] **Step 2: Delete only the rejected artifacts**

Remove the exact helper, generator, and 27 WebP files. Do not touch HOME assets or any other per-theme art.

- [x] **Step 3: Run focused regression tests**

Run:

```powershell
npx jest --runInBand tests/friend_event_marker_contract.test.ts tests/friend_event_icon_contract.test.ts tests/friend_social_events.test.ts tests/friends_tab_gift_interaction_contract.test.ts
```

Expected: all selected suites pass.

- [x] **Step 4: Run scoped hygiene checks**

Run scoped `git diff --check`, literal reference searches for `friend_event_assets` and `social-markers`, and confirm there are zero bundled social-marker raster files.

No Git commit is made from the shared dirty checkout; the user did not request one and unrelated work must remain untouched.
