# Task packet: PM-053 achievement toast removal + PM-198 MAX lessons settings removal

Governance-ID: TG-CCE215FD9897
Status: In progress
Owner: Claude session (PM-053 / PM-198 executor)
Related epic/enabler: E05 (PM-053), E20 (PM-198)

## Outcome

PM-053: the "Achievement unlocked" toast/host/queue no longer shows anywhere in
the app. The achievement's reward (XP) still gets granted at unlock time in
`app/achievements.ts`, independent of the removed toast, so no user-facing
reward is lost. Pending-but-unshown achievements are marked notified directly
(debt consumed, not queued for display) instead of accumulating forever.

PM-198: the "Уроки с MAX" notification-preference toggle is removed from
Settings → Notifications (`app/settings_notifications.tsx`), along with its
`max_lessons` notification category and its mirrored server push-pref field
(`maxLessons` in `ServerPushPrefs`/`updateServerPushPrefs`). MAX itself stays
sealed (`MAX_SECTION_SEALED_BY_OWNER_2026_09_04`) and untouched; the already
commented-out `maxLessonReminderCron` function is not re-enabled or deleted.

## Scope

In scope:
- `app/_layout.tsx`: remove `AchievementProvider`/`AchievementToast` mount and
  `useAchievement` usage; `flushPending` now calls `markAchievementsNotified`
  directly instead of queuing a toast.
- Delete `components/AchievementToast.tsx`, `components/AchievementContext.tsx`.
- `components/dev/motion_showcase/sections/toasts.tsx`: remove the two
  achievement-toast demo/note entries (dev-only showcase, no runtime impact).
- Tests referencing the deleted files/behavior: `tests/achievements.test.ts`,
  `tests/achievements_locale_runtime.test.ts`,
  `tests/achievement_toast_delivery_contract.test.ts`,
  `tests/modal_opaque_surfaces_contract.test.ts`.
- `app/settings_notifications.tsx`: remove the "Уроки с MAX" `ToggleRow` and
  its label.
- `app/notifications.ts`: remove `max_lessons` from `NotifCategory`,
  `DEFAULT_NOTIF_PREFS.categories`, `CATEGORY_LOCAL_TYPES`; remove `maxLessons`
  from the `updateServerPushPrefs` call.
- `app/push_token_registration.ts`: remove `maxLessons` from `ServerPushPrefs`
  and from the Firestore `pushPrefs` write + local cache key.
- `tests/notifications_prefs_contract.test.ts`: update the assertions that
  hard-coded `maxLessons`/`lessons` in the pushPrefs mirror.

Out of scope: MAX call/voice code itself (sealed, untouched), the
`max_lessons.tsx` screen and its route/backdrop registry entry (separate
feature, not a settings item), Arena/spin removal (owned by other sessions),
audio prefetch V1/V2 modules (owned by a third session), any change to
`app/(tabs)/_layout.tsx` or `app/(tabs)/home.tsx` (explicitly off-limits).

## Architecture

Achievement reward and achievement *celebration* were already decoupled: XP is
granted in `app/achievements.ts` inside the `justUnlocked` unlock loop via
`registerXP`, gated only on `ach.xp > 0`, never on the `notified` flag or on
any toast/queue state. Removing the toast layer (`AchievementContext` queue +
`AchievementToast` renderer, both mounted only from `app/_layout.tsx`) does not
touch that boundary. The `notified` flag remains in `achievements.ts` (used by
`getPendingNotifications`/`markAchievementsNotified`/backfill) but its
"pending" list in `_layout.tsx` is now drained by marking-as-notified instead
of by rendering a toast, per the owner's rule that celebration must not become
a durable show-debt queue.

For PM-198, `max_lessons` was a full vertical: client toggle → `NotifPrefs`
category → mirrored into Firestore `users/{id}.pushPrefs.lessons` → read by
`functions/src/max_lesson_reminder_push.ts` (cron already commented out in
`functions/src/index.ts` under the MAX seal). Removing the toggle and its
category/mirror leaves that server file's field read as always-undefined,
which is safe because the cron that would read it is not deployed. No
architecture change to the MAX call/session code itself.

## Security and privacy

No new data collection, no new third-party service, no new permission. This
task only removes a client-side UI toggle and its associated notification
preference field; it reduces the data mirrored to Firestore (one boolean field
less in `pushPrefs`), not the other way around. No privacy policy update
needed for a removal of this kind.

## Technical debt

- Pay now: delete `AchievementToast.tsx`/`AchievementContext.tsx` outright
  (owner said "убрать", not "hide"), remove the `max_lessons` category and its
  server mirror outright.
- Contain: `functions/src/max_lesson_reminder_push.ts` and the commented-out
  `maxLessonReminderCron` export in `functions/src/index.ts` are left in place
  (dead code) because they are MAX code, sealed and out of scope for this task;
  exit condition is the owner's future "включи MAX обратно" command, at which
  point that whole subsystem gets revisited together.
- Contain: the `achievementToast` key in `components/overlay_arbiter_core.ts`
  (shared overlay-priority enum) is left in place unused, to avoid destabilizing
  the well-tested priority ordering (`overlay_arbiter.test.ts`,
  `boon_overlay_keys.test.ts`, `collectible_drop_overlay_contract.test.ts`) for
  a one-line cosmetic cleanup; exit condition is a dedicated pass over that
  shared enum, not bundled with this removal.

## Verification

- Point tests (single-file, under the machine's semaphore/slot per project
  rules): `tests/achievement_toast_delivery_contract.test.ts`,
  `tests/achievements.test.ts`, `tests/achievements_locale_runtime.test.ts`,
  `tests/modal_opaque_surfaces_contract.test.ts`,
  `tests/notifications_prefs_contract.test.ts`.
- Manual: grep confirms no remaining references to `AchievementToast`,
  `AchievementContext`, `useAchievement`, or `max_lessons`/`maxLessons` outside
  the intentionally-untouched MAX server file and route backdrop registry.
- No `typecheck`/full test suite run (per this session's explicit instruction
  to avoid heavy commands); targeted grep substitutes for import-safety checks
  on files not covered by the point tests above.

## Rollback

Both removals are additive-safe to revert: `git revert` the two commits
restores the toast host/provider files and the settings toggle/category/mirror
field exactly as they were, with no data migration involved (no Firestore
schema change, only a field that stops being written). No user entitlement or
already-granted reward is affected by either direction.
