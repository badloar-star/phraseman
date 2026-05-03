# Phraseman Requirements

**Last updated:** 2026-05-03
**Current milestone:** v1.0 Friends MVP

## Active Milestone: v1.0 — Friends MVP

### Core (must ship in v1.0)

#### FRIEND — Friend Codes & Lookup
- [ ] **FRIEND-01**: User can view own 6-character friend code (base32 alphabet without `0`, `O`, `1`, `I`, `L`) on a dedicated screen
- [ ] **FRIEND-02**: User can copy own friend code to clipboard with single tap
- [ ] **FRIEND-03**: User can share own friend code via system share sheet (deeplink format `phraseman://friend/{CODE}`)
- [ ] **FRIEND-04**: System auto-generates friend code on first friends-screen open if user does not have one in `users/{uid}/progress.friend_code`
- [ ] **FRIEND-05**: System guarantees friend code uniqueness across all users (collision detection on generation, regenerate on conflict)
- [ ] **FRIEND-06**: User can enter another user's friend code in input field (validates length and alphabet client-side before lookup)
- [ ] **FRIEND-07**: System rejects friend lookup if target user is in `banned_users/{uid}` collection (silent failure: "Code not found")
- [ ] **FRIEND-08**: System rejects friend lookup if entered code matches own code (toast: "Это ваш собственный код")

#### REQ — Friend Requests
- [ ] **REQ-01**: User can send friend request by entering valid friend code; creates `users/{targetUid}/friend_requests/{senderUid}` document with status `pending`
- [ ] **REQ-02**: User can view incoming friend requests list on Friends screen with sender's nick + avatar + level
- [ ] **REQ-03**: User can accept incoming friend request → both `users/{A}/friends/{B}` and `users/{B}/friends/{A}` are created (atomic via Cloud Function or batch write); request document is deleted
- [ ] **REQ-04**: User can decline incoming friend request → request document status set to `declined` (kept for 24h to prevent spam re-sends), then deleted by Cloud Function cleanup
- [ ] **REQ-05**: User cannot send a duplicate friend request to the same target while one is `pending` (client-side and server-side guard)
- [ ] **REQ-06**: User cannot send friend request to someone who is already in their friends list (client-side check, server-side guard)
- [ ] **REQ-07**: User receives no friend request notification in v1.0 (notifications are out of scope) — they see pending requests only when they open Friends screen

#### LIST — Friends List Screen
- [ ] **LIST-01**: User can open Friends screen from a discoverable entry point (Settings → Друзья, OR new nav location TBD in design)
- [ ] **LIST-02**: User sees their friends sorted by total XP descending, with nick + avatar + level + total XP shown
- [ ] **LIST-03**: User sees own friend code prominently at top of Friends screen with copy + share buttons
- [ ] **LIST-04**: User sees pending incoming friend requests as a separate section above the friends list (with accept/decline actions per request)
- [ ] **LIST-05**: User sees an "Add friend" input field for entering a friend's code, with submit button
- [ ] **LIST-06**: User can swipe-to-delete or long-press to remove a friend; confirmation modal shown; both `users/{A}/friends/{B}` and `users/{B}/friends/{A}` deleted atomically
- [ ] **LIST-07**: List shows empty state with onboarding hint if user has no friends yet ("Поделитесь своим кодом, чтобы добавить друзей")
- [ ] **LIST-08**: List excludes any friend whose UID is in `banned_users` collection (filter at read time + Cloud Function periodic cleanup)
- [ ] **LIST-09**: List supports scrolling for unlimited friends (no hard cap; soft cap 200 with warning if approached — TBD)

#### HOF — Friends Hall of Fame
- [ ] **HOF-01**: User can open Friends Hall of Fame from a button in "Путь героя" / `app/achievements_screen.tsx` (or appropriate location)
- [ ] **HOF-02**: User sees a toggle "Всё время / Эта неделя" at top of Friends HoF
- [ ] **HOF-03**: When "Всё время" selected, list shows user + all friends ranked by total XP descending, with rank number, nick, avatar, level, total XP
- [ ] **HOF-04**: When "Эта неделя" selected, list shows user + all friends ranked by `weekly_xp` descending; if all zeroes, show empty state "Эта неделя ещё не началась"
- [ ] **HOF-05**: User's own row is highlighted in the list (visual distinction from friends)
- [ ] **HOF-06**: List excludes banned users (same rule as LIST-08)
- [ ] **HOF-07**: List shows tabs/segmented control with current rank position visible without scrolling if user has >5 friends

#### XP — Weekly XP Tracking
- [ ] **XP-01**: System tracks `users/{uid}/progress.weekly_xp` separately from total XP, incremented on every XP gain (alongside total XP increment in `xp_manager.ts`)
- [ ] **XP-02**: Cloud Function `resetWeeklyXpCron` runs every Monday at 00:00 UTC and zeroes `weekly_xp` for all users
- [ ] **XP-03**: System tracks `users/{uid}/progress.weekly_xp_period_start` (ISO date of current week's Monday) for display and debug
- [ ] **XP-04**: Existing global Hall of Fame (`leaderboard/{uid}`) and `pushMyScore` flow are NOT MODIFIED (preserve `app/firestore_leaderboard.ts` and `app/xp_manager.ts` external contract)

#### ARENA — Arena Friend Invite Integration
- [ ] **ARENA-01**: User sees a friends list (scrollable) below the existing "Пригласить друга" button in Arena lobby (`app/arena_lobby.tsx`)
- [ ] **ARENA-02**: When user taps a friend in the arena friends list, system shares an invite link (existing arena invite flow) — no push challenge in v1.0
- [ ] **ARENA-03**: Existing "Играть с другом" / share invite link logic is reused; no new arena invite mechanic introduced
- [ ] **ARENA-04**: Arena friends list shows nick + avatar + level only (no online status — presence is out of scope)

#### SEC — Security Rules & Data Integrity
- [ ] **SEC-01**: Firestore rules allow user to read/write own `users/{uid}/friends/{*}`; user can read another user's `friends` only if they are mutual friends (or rule is denied — TBD per design)
- [ ] **SEC-02**: Firestore rules allow user to write to `users/{targetUid}/friend_requests/{ownUid}` only (cannot impersonate sender, target field validated)
- [ ] **SEC-03**: Firestore rules allow user to read own `users/{uid}/friend_requests/*` and delete documents in own subcollection (for accept/decline)
- [ ] **SEC-04**: Friend code field `users/{uid}/progress.friend_code` is readable by any authenticated user (needed for code lookup), writable only by owner
- [ ] **SEC-05**: Banned users (`banned_users/{uid}` exists) cannot send friend requests (Cloud Function or rule check)
- [ ] **SEC-06**: All friend-related operations use canonical UID (`getCanonicalUserId()`); no `anon_id` or `stable_id` used as data key

#### TEST — Testing & Verification
- [ ] **TEST-01**: Unit tests for friend code generation (alphabet, length, no forbidden chars, collision retry)
- [ ] **TEST-02**: Unit tests for friend request state machine (send → pending → accept/decline → friends/cleanup)
- [ ] **TEST-03**: Integration test for accept-flow creating both mirror documents atomically
- [ ] **TEST-04**: Integration test for friends HoF weekly toggle data integrity
- [ ] **TEST-05**: Test that banned user is filtered out from friend lookup, friends list, and HoF
- [ ] **TEST-06**: Cloud Function test: `resetWeeklyXpCron` zeroes weekly_xp for sample users without affecting total xp

### Differentiators (deferred to v1.1+)

(Documented for clarity, NOT in this milestone)

- Push notifications when friend request received
- Push notifications "friend overtook you in weekly XP"
- Online presence indicator (last_active in Firestore or RTDB onDisconnect)
- "Challenge to Arena" via push (live invite to specific friend, accept/decline within 60s)
- In-app toast invite when both users online
- Friend-only achievements ("First 5 friends", "Beat 3 friends in arena")
- Referral rewards (shards/premium-trial for inviting a friend who reaches level 5)

### Out of Scope (Won't Build)

- Auto-import from phone contacts — privacy risk, no phone-to-account binding in Phraseman, GDPR concerns. Friend codes are sufficient.
- Search users by nickname — stalking risk, friend codes are intentional friction.
- Direct messages / chat — Phraseman is a learning app, not a messenger.
- Public user profile pages with stats — privacy concerns, scope creep.
- Friend groups / squads / clubs — out of scope for MVP.

## Validated (existing capabilities, see PROJECT.md)

(See PROJECT.md "Existing Capabilities" section — full list of validated features.)

## Traceability

Updated by roadmap after phase mapping:

| REQ-ID | Phase |
|--------|-------|
| FRIEND-01..08 | TBD |
| REQ-01..07 | TBD |
| LIST-01..09 | TBD |
| HOF-01..07 | TBD |
| XP-01..04 | TBD |
| ARENA-01..04 | TBD |
| SEC-01..06 | TBD |
| TEST-01..06 | TBD |

---
*Last updated: 2026-05-03 after initialization*
