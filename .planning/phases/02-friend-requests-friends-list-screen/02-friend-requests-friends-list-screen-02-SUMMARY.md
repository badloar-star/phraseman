---
phase: 02-friend-requests-friends-list-screen
plan: 02
subsystem: friends-ui
status: complete
tags: [react-native, expo-router, firestore, friends, ui]
dependency_graph:
  requires:
    - 02-friend-requests-friends-list-screen/01 (firestore_friend_requests.ts data layer)
    - app/firestore_friends.ts (ensureMyFriendCode, lookupUserByFriendCode)
    - constants/avatars.ts (getBestAvatarForLevel)
    - constants/theme.ts (getLevelFromXP)
  provides:
    - app/friends_screen.tsx (Friends full-screen route)
    - /friends_screen expo-router route registration
    - Settings entry point to Friends screen
  affects:
    - app/(tabs)/settings.tsx (new Row added)
tech_stack:
  added: []
  patterns:
    - Subscription-based real-time Firestore listeners with cleanup
    - Profile cache (Record<uid, profile>) to avoid re-fetching
    - Dual-subscription loading gate (isLoading until both listeners fire)
    - Avatar computation: getBestAvatarForLevel(getLevelFromXP(xp)) — never Firestore
key_files:
  created:
    - app/friends_screen.tsx
  modified:
    - app/(tabs)/settings.tsx
decisions:
  - "textSecond (not textSecondary) — theme uses shortened key; auto-fixed via Rule 1"
  - "bgSurface (not bgCardAlt) — bgCardAlt does not exist on theme type; auto-fixed via Rule 1"
  - "getBestAvatarForLevel imported from constants/avatars (not components/AvatarView) — confirmed from codebase grep"
  - "getLevelFromXP imported from constants/theme (not app/levels) — confirmed from codebase grep"
metrics:
  duration: ~15 min
  completed: 2026-05-05
  tasks_completed: 2
  files_created: 1
  files_modified: 1
---

# Phase 2 Plan 02: Friends Screen UI + Settings Entry Summary

Friends screen implemented as a full Expo Router screen at `app/friends_screen.tsx` with all 4 required sections, plus a new Friends entry row in Settings.

## Files Created / Modified

| File | Change | Lines |
|------|--------|-------|
| `app/friends_screen.tsx` | Created — Friends full-screen route | 646 |
| `app/(tabs)/settings.tsx` | Modified — 5 lines inserted (new Row before invite_friend) | +5 logical |

## Screen Structure (friends_screen.tsx)

**Section 1 — My Code (FRIEND-01, FRIEND-02, FRIEND-08)**
- `ensureMyFriendCode()` called in `useEffect` on mount
- Code displayed in 32px monospace with `letterSpacing: 4`
- Copy button → `Clipboard.setString(myCode)` + 1.8s inline feedback
- Share button → `Share.share({ message })` with localized prefix

**Section 2 — Add Friend (FRIEND-03, REQ-01..07)**
- `TextInput` with `maxLength={6}`, auto-uppercase, strips chars not in friend-code alphabet (`/[^A-Z2-9]/g`)
- Add button disabled while `codeInput.length !== 6 || isAdding`
- Flow: `lookupUserByFriendCode` → `sendFriendRequest` → show `addFeedback` per `SendRequestResult`
- All 5 result states covered: `sent`, `already_sent`, `already_friends`, `self`, null/`not_found`/`error`

**Section 3 — Incoming Requests (LIST-04, LIST-07, REQ-04, REQ-05)**
- `subscribeToIncomingRequests` real-time listener
- Accept → `acceptFriendRequest(fromUid)`, Decline → `declineFriendRequest(fromUid)`
- Empty state shown when requests array is empty

**Section 4 — My Friends (LIST-03, LIST-05, LIST-06, LIST-09, REQ-06)**
- `subscribeToFriends` real-time listener
- Friends sorted by XP descending
- Delete → `Alert.alert` confirm → `deleteFriend(uid)`
- Empty state with "Ещё нет друзей — добавьте по коду"

**Loading & Profile**
- `isLoading: true` until BOTH subscriptions have fired at least once
- `profileCache: Record<string, UserProfile>` — avoids re-fetching profiles
- Profile fetched from `users/{uid}` — reads `displayName` + `progress.user_total_xp`
- Avatar: `String(getBestAvatarForLevel(getLevelFromXP(xp)))` — NEVER reads `.avatar` from Firestore

## TypeScript Error Count

0 errors for new/modified files. `npx tsc --noEmit` exits clean.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Theme property names corrected**
- **Found during:** Task 1 TypeScript check
- **Issue:** Plan context suggested `t.textSecondary` and `t.bgCardAlt` but the actual theme type has `t.textSecond` and no `bgCardAlt` property
- **Fix:** Replaced all `t.textSecondary` → `t.textSecond`, `t.bgCardAlt ?? t.bgCard` → `t.bgSurface`
- **Files modified:** `app/friends_screen.tsx`
- **Commit:** 38eda49

**2. [Rule 1 - Bug] Import paths corrected**
- **Found during:** Task 1 pre-write research
- **Issue:** Plan context had wrong import sources for `getBestAvatarForLevel` (suggested `../components/AvatarView`) and `getLevelFromXP` (suggested `./levels`)
- **Fix:** Used actual codebase paths: `getBestAvatarForLevel` from `'../constants/avatars'`, `getLevelFromXP` from `'../constants/theme'`
- **Files modified:** `app/friends_screen.tsx`

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 38eda49 | feat(friends): add friends_screen.tsx with full friend lifecycle UI |
| 2 | 0212a12 | feat(friends): add Friends entry point in Settings |

## Known Stubs

None — all sections are wired to real Firestore subscriptions via Plan 01 data layer. Profile fetching reads from live `users/{uid}` docs. Empty states are intentional UI (not placeholder data).

## Self-Check: PASSED

- `app/friends_screen.tsx` exists: FOUND
- `app/friends_screen.tsx` exports `FriendsScreen`: 1 match
- No `.avatar` Firestore read: 0 matches
- Line count: 646 (< 800 limit)
- `ensureMyFriendCode` present: 2 matches
- `subscribeToFriends` present: 2 matches
- `subscribeToIncomingRequests` present: 2 matches
- `getBestAvatarForLevel` + `getLevelFromXP` present: 3 matches each
- `Clipboard.setString` present: 1 match
- `Share.share` present: 1 match
- `toUpperCase` in onChangeText: 1 match
- `router.back()` present: 2 matches
- No `console.log`: 0 matches
- `friends_screen` in settings.tsx: 1 match
- `people-outline` in settings.tsx: 2 matches
- TypeScript: 0 errors
- Commits 38eda49 and 0212a12: FOUND in git log
