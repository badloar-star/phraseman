# PM-055 — XP multiplier retirement preflight

**Owner direction:** D02 removes XP/levels/progress bar; D09 removes gifts,
spins, chests and bonuses. D66 keeps ordinary learning decisions on-device and
limits the server to synchronization/storage, entitlements, content/video,
notifications and technical authentication.

## Observed baseline (2026-09-26)

The PM-055 task is incorrectly marked `review`. The current runtime still has
live XP multipliers and their side effects:

- `app/xp_manager.ts` combines club, league-group, friends-together, streak,
  comeback, lesson-difficulty, level-gift, personal-league, league-chest,
  profile-card and Season Pass multipliers before writing `user_total_xp`.
- The same module triggers level calculations, level-spins, home celebration,
  XP achievements, weekly XP, public-profile projection, notifications and
  progress-event submissions.
- Boost inventory and issuance are live in `app/club_boosts.ts`,
  `app/league_personal_boosts.ts`, `app/level_gift_system.ts`,
  `app/season_reward_apply.ts`, `app/services/league_chest_rewards.ts` and
  `functions/src/admin_grant.ts`.
- `cloud_sync.ts`, `progress_events_client.ts`, PhoneState and Firestore
  contracts mirror legacy XP/level/weekly data. They are shared account and
  synchronization surfaces and are intentionally outside the first source
  packet.

The documented preservation boundary is unchanged: existing accounts, saved
cards, lesson progress and paid entitlements must survive. Legacy XP values may
remain as read-only compatibility data until the account/sync migration packet
has an approved rollback plan; no production data is deleted in this work.

## Packet P1 — neutralize calculation, preserve API compatibility

**Single source writer scope:** `app/xp_manager.ts` and
`tests/xp_manager_register_xp.test.ts` only. A test-only contract file may be
added under `tests/` if it is needed for a clear RED/GREEN boundary.

### Required invariants

1. `registerXP(amount, ...)` applies exactly the base, locally determined
   amount. No multiplier source can change the result or delay local commit.
2. Old multiplier sources are neither read nor consumed by `registerXP`:
   club/group/friends boosts, streak/comeback, lesson difficulty, gifts, league
   boosts/chests, profile-card and Season Pass charges.
3. Existing callers continue to compile during the staged retirement:
   `getCurrentMultiplier()` resolves `1`; the temporary
   `MultiplierBreakdown` API resolves neutral `1` values and cache-reset stays
   safe until its screens are removed in a later UI packet.
4. The packet must not alter `cloud_sync`, progress event schemas, PhoneState,
   Firebase Auth, Firestore Rules, Function exports, purchases or entitlement
   resolution. It must not erase stored keys or consume an existing paid boost.
5. `finalizeLessonXpMultipliers` becomes a safe no-op and cannot consume legacy
   chest or golden-lesson charges.

### TDD evidence

1. Add a focused test where every legacy multiplier mock returns a value above
   one and verify a base award returns the original amount, multiplier `1`, and
   no multiplier mock/consumable is called.
2. Add a focused test that `getCurrentMultiplier()` and
   `getCurrentMultiplierBreakdown()` are neutral without storage/network reads.
3. Run that test first and retain its failing output as RED evidence.
4. Implement only the source packet above, then run the focused suite,
   `npx eslint app/xp_manager.ts tests/xp_manager_register_xp.test.ts`, and the
   directly affected static contract tests. A full typecheck is supplementary:
   existing unrelated failures must be reported, never hidden.

## Later packets (not authorized by this source packet)

- **P2 UI and call sites:** remove multiplier UI and multiplier-derived award
  previews from the named screens. This is now assigned as a narrow follow-up
  because no React Native source file is occupied by the design workstream.
  Scope: `components/PlayerProfileModal.tsx`, `app/level_gifts_inventory.tsx`,
  `app/lesson1.tsx`, `app/lesson_help.tsx`, `app/(tabs)/home.tsx` and their
  directly affected source-contract tests. Preserve XP compatibility data,
  lesson answer flow, profile fields, level UI, gifts inventory and all
  account/entitlement behavior. P2 must not remove a paid source, change a
  purchase, or edit sync/auth/rules/functions.
- **P3 reward inventory:** retire free/paid XP boost acquisition and expiry
  paths. This includes club, league, gifts, season and admin surfaces and must
  preserve paid entitlement history; it is security/economy sensitive.
- **P4 account/sync migration:** remove obsolete keys from client/server
  schemas only with the account owner, migration receipt, rollback procedure
  and rules/function review. No field purge before that evidence exists.
- **P5 XP/level retirement:** remove legacy XP award callers, level effects,
  achievements and leaderboard dependencies while preserving lesson completion
  and card progress. This is a distinct migration, not a side effect of P1.

## Safety gates

- No deploy, production migration, field deletion or Firestore Rules change.
- Preserve subscription/Plus entitlement behavior; P1 must not read, write or
  reinterpret it.
- A failing focused gate blocks P1; a known unrelated full-repo type failure is
  logged with its source rather than repaired opportunistically.
