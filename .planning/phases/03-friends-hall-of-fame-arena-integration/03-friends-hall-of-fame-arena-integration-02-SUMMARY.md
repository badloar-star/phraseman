---
phase: 03-friends-hall-of-fame-arena-integration
plan: 02
subsystem: ui
tags: [react-native, firebase, firestore, arena, friends]

# Dependency graph
requires:
  - phase: 02-requests-and-friends-list
    provides: subscribeToFriends real-time listener and FriendEntry type
provides:
  - Horizontal scrollable friends invite list in arena lobby
  - Real-time friend presence via subscribeToFriends listener
  - Avatar computed via getBestAvatarForLevel(getLevelFromXP(totalXp))
affects: [arena_lobby, friends integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Lazy Firestore getDb inline pattern for profile fetching (same as existing arena_lobby pattern)"
    - "cancelled ref guard for async Promise.all cleanup in useEffect"

key-files:
  created: []
  modified:
    - app/arena_lobby.tsx

key-decisions:
  - "AvatarView prop is `avatar` (not `avatarId`) — corrected from plan hint via TypeScript error"
  - "Used t.textPrimary for friend name color — screenPrimary does not exist in arena_lobby.tsx"
  - "Renamed loop variable from `f` to `friend` to avoid shadowing the `f` (font scale) variable already in scope"

patterns-established:
  - "Avatar computation: getBestAvatarForLevel(getLevelFromXP(totalXp)) — never read .avatar from Firestore"

requirements-completed: [ARENA-01, ARENA-02, ARENA-03, ARENA-04]

# Metrics
duration: 5min
completed: 2026-05-05
---

# Phase 3 Plan 02: Arena Lobby Friends List Summary

**Horizontal scrollable friends invite list added to arena lobby using subscribeToFriends real-time listener and avatar computation via getBestAvatarForLevel(getLevelFromXP)**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-05T08:28:18Z
- **Completed:** 2026-05-05T08:28:23Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added `ScrollView` import and three new state variables (`arenaFriends`, `arenaFriendProfiles`, `arenaFriendHint`) to arena_lobby.tsx
- Added `subscribeToFriends` real-time listener with cleanup via useEffect
- Added profile-loading useEffect that batch-fetches `users/{uid}.displayName` + `users/{uid}.progress.user_total_xp` for each friend
- Rendered horizontal friend list below invite section — each item shows avatar (computed), name, level; tapping calls `handleFriendShare()` or `handlePlayWithFriend()` with hint toast
- Empty state shown when no friends; section hidden during `inSearchFlow`
- All existing arena flow (handleFindMatch, handlePlayWithFriend, ArenaLimitModal, daily limit) left completely untouched

## Task Commits

1. **Task 1: Add friends list to arena_lobby.tsx (ARENA-01..04)** - `3b0be3d` (feat)

## Files Created/Modified
- `app/arena_lobby.tsx` - Added ScrollView import, 3 new state vars, 2 new useEffects, friends list JSX block

## Decisions Made
- `AvatarView` prop is `avatar` (not `avatarId`) — the TypeScript error caught this; corrected immediately (Rule 1 auto-fix)
- `t.textPrimary` used for friend name color — `screenPrimary` does not exist; `screenTitleColor` and `screenMuted` are the theme variables used in this file
- Loop variable renamed from `f` to `friend` to avoid shadowing the `f` (font-scale object) variable already destructured at component top scope

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] AvatarView prop name corrected from `avatarId` to `avatar`**
- **Found during:** Task 1 (TypeScript check after edits)
- **Issue:** Plan key_context specified `<AvatarView avatarId={avatarId} size={44} />` but the component's Props interface defines `avatar?: string | null` (not `avatarId`)
- **Fix:** Changed prop name to `avatar={avatarId}` — TypeScript confirmed passing
- **Files modified:** app/arena_lobby.tsx
- **Verification:** `npx tsc --noEmit` exits 0
- **Committed in:** 3b0be3d

**2. [Rule 1 - Bug] Loop variable renamed from `f` to `friend` to avoid shadowing**
- **Found during:** Task 1 (code review before committing)
- **Issue:** `arenaFriends.map(f => {...})` would shadow `const { ..., f, ... } = useTheme()` where `f` is the font-scale object used throughout JSX
- **Fix:** Renamed map variable to `friend` throughout the map body
- **Files modified:** app/arena_lobby.tsx
- **Verification:** TypeScript clean, no shadowing
- **Committed in:** 3b0be3d

---

**Total deviations:** 2 auto-fixed (2 × Rule 1 - Bug)
**Impact on plan:** Both fixes required for correctness. No scope creep.

## Issues Encountered
None beyond the two auto-fixed deviations above.

## Known Stubs
None — friends list is wired to real `subscribeToFriends` listener; profiles loaded from Firestore. Empty state is intentional UX (no friends yet).

## Next Phase Readiness
- Phase 3 Plan 02 complete. Both Wave 1 plans done.
- Phase 3 (03-friends-hall-of-fame-arena-integration) fully complete when Plan 01 (HoF screen) also completes.

## Self-Check: PASSED
- `app/arena_lobby.tsx` modified: confirmed (git diff shows changes)
- Commit `3b0be3d` exists: confirmed (`git rev-parse --short HEAD` = 3b0be3d)
- `npx tsc --noEmit`: exits 0 — no errors
- `grep "subscribeToFriends" app/arena_lobby.tsx`: 2 matches
- `grep "arenaFriends" app/arena_lobby.tsx`: 6 matches
- `grep "handleFindMatch" app/arena_lobby.tsx`: 4 matches (unchanged)
- `grep "ArenaLimitModal" app/arena_lobby.tsx`: 5 matches (unchanged)

---
*Phase: 03-friends-hall-of-fame-arena-integration*
*Completed: 2026-05-05*
