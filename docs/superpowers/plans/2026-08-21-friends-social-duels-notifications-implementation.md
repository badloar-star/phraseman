# Friends Social Loops, Duels, Notifications, and Edge-to-Edge Implementation Plan

> **Owner correction — 2026-08-21:** all per-theme/generated social-marker asset instructions in this historical plan are superseded by `docs/superpowers/plans/2026-08-21-universal-social-marker-icons.md`. Friend-card markers now use three universal code-native Ionicons and ship no social-marker WebP files.

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` in the current checkout. Do not create a branch, worktree, or delegated coding task unless the owner explicitly requests that exact action.

**Goal:** Make every approved Friends action complete and understandable for both people, add durable push/bell/card feedback, make friend duels and the DEV bot run through the real Arena engine, and restore edge-to-edge rendering without black bands.

**Architecture:** Keep domain state authoritative and idempotent on the existing Firebase callables, while the client renders one event identity across push, bell, friend-card marker, and deep link. Separate pure state machines from React/Firebase adapters so expiry, rendezvous, marker priority, and deletion undo are deterministic. Reuse Motion Hybrid shells and the existing Arena match engine; do not create parallel reward, match, or notification systems.

**Tech Stack:** Expo Router, React Native, TypeScript, Firebase Auth/Firestore/Cloud Functions v2, Jest/RNTL, Reanimated/Motion Hybrid, static WebP theme assets.

**Approved design:** `docs/superpowers/specs/2026-08-21-friends-social-duels-notifications-design.md`

---

## Scope and execution order

This is one product program with five sequential work packages. The packages are separated because safe-area, social events, notification presentation, and Arena have different regression gates, but they share one approved event contract and must ship together.

1. Reproduce and repair the edge-to-edge regression.
2. Establish the shared social-event and notification contract.
3. Repair chest, gifts, study invitations, high-fives, and friend-card markers.
4. Replace manual duel entry with persistent friend invites, rendezvous, and DEV bot verification.
5. Produce exact per-theme assets and run full cross-surface verification.

Warm Spark remains the visual baseline because it gives social rewards clear hierarchy through light, depth, and one focal object instead of extra explanatory copy. Dark/gold team rows remain structurally distinct from ordinary light notification rows, so the distinction does not depend on color alone. Every new modal uses the shared Motion Hybrid shells to preserve presentation safety and consistent motion.

## Non-negotiable repository safety

- Work in the current checkout only. Do not create a branch or worktree.
- Before editing any dirty file, capture `git diff -- <path>` and re-read its current contents. Apply a surgical patch on top; never restore or overwrite.
- Never delete or roll back Arena files. Update `docs/arena/OWNER_DECISIONS.md` after Arena changes.
- If `.git/index.lock` still exists, do not remove it and do not commit. Continue with file/test work and record the commit as deferred.
- Never stage unrelated files. When the index is available, use `git commit --only -- <exact paths>`.
- Do not deploy Functions, Rules, Hosting, or app builds as part of this plan.
- Any economy grant/spend stays immutable and idempotent. Any schema change updates Rules and the Jarvis contract audit in the same packet.

## Work Package 1 — Edge-to-edge regression

### Task 1: Capture the exact regression before editing

**Files:**

- Inspect: `app.json`
- Inspect: `app/_layout.tsx`
- Inspect: `app/(tabs)/_layout.tsx`
- Inspect: `plugins/withAndroidSplashWindowBackground.js`
- Inspect: `tests/android_window_background_contract.test.ts`
- Inspect: `tests/android_safe_area_bottom_contract.test.ts`
- Create: `.codex-tmp/friends-social/edge-to-edge-before.txt`

**Step 1: Record the current overlapping diff and provenance**

Run:

```powershell
New-Item -ItemType Directory -Force .codex-tmp/friends-social | Out-Null
git diff -- app.json app/_layout.tsx 'app/(tabs)/_layout.tsx' plugins/withAndroidSplashWindowBackground.js tests/android_window_background_contract.test.ts | Out-File -Encoding utf8 .codex-tmp/friends-social/edge-to-edge-before.txt
git log -n 8 --date=iso --format='%h %ad %an %s' -- app.json app/_layout.tsx 'app/(tabs)/_layout.tsx' plugins/withAndroidSplashWindowBackground.js tests/android_window_background_contract.test.ts
```

Expected: the report identifies whether the transparent global `StatusBar`, the tab `StatusBar`, or Android window background change is uncommitted/recent. Do not edit until the current diff is saved.

**Step 2: Reproduce on the affected device**

Run the existing dev client, navigate across Home → Friends → Arena → notification modal, and capture top/bottom screenshots in both a regular screen and a modal.

Expected: screenshots show the exact black-band location and whether it belongs to the native system bar, React root, or modal root.

### Task 2: Lock the desired edge-to-edge contract with failing tests

**Files:**

- Modify: `tests/android_window_background_contract.test.ts`
- Modify: `tests/android_safe_area_bottom_contract.test.ts`
- Modify: `tests/lessons_full_bleed_safe_area_contract.test.ts`
- Create: `tests/root_edge_to_edge_contract.test.ts`

**Step 1: Add the root ownership test**

The new test must assert all of the following:

```ts
expect(rootLayout).toContain("backgroundColor: tTheme.bgPrimary");
expect(rootLayout.match(/<StatusBar/g)?.length ?? 0).toBe(1);
expect(tabsLayout).not.toContain('<StatusBar');
expect(appJson).toContain('"edgeToEdgeEnabled": true');
expect(plugin).toContain("android:navigationBarColor', '@android:color/transparent'");
expect(plugin).toContain("android:statusBarColor', '@android:color/transparent'");
```

Also assert that Android bottom interactive padding still uses the existing safe-area fallback helper instead of hard-coded black/native padding.

**Step 2: Run the tests and confirm the regression is exposed**

Run:

```powershell
npx jest --runTestsByPath tests/root_edge_to_edge_contract.test.ts tests/android_window_background_contract.test.ts tests/android_safe_area_bottom_contract.test.ts tests/lessons_full_bleed_safe_area_contract.test.ts --no-cache --runInBand --watchman=false
```

Expected: at least the duplicate `StatusBar`/root ownership assertion fails before the fix.

### Task 3: Apply the smallest edge-to-edge fix

**Files:**

- Modify only if evidence requires: `app/_layout.tsx`
- Modify only if evidence requires: `app/(tabs)/_layout.tsx`
- Modify only if evidence requires: `plugins/withAndroidSplashWindowBackground.js`
- Modify: corresponding contract tests

**Step 1: Make one component own system bars**

Keep one global system-bar declaration in `app/_layout.tsx`:

```tsx
<View style={{ flex: 1, backgroundColor: tTheme.bgPrimary }}>
  <StatusBar
    barStyle={statusBarLight ? 'light-content' : 'dark-content'}
    backgroundColor="transparent"
    translucent
  />
  {stackTree}
</View>
```

Remove only the duplicate tab-level declaration if reproduction confirms it causes the bands. Preserve all real content insets and the Android navigation fallback helper.

**Step 2: Keep native bars transparent without black fallback**

The Android plugin contract remains:

```js
xml = upsertStyleItem(xml, 'AppTheme', 'android:statusBarColor', '@android:color/transparent');
xml = upsertStyleItem(xml, 'AppTheme', 'android:navigationBarColor', '@android:color/transparent');
xml = upsertStyleItem(xml, 'AppTheme', 'android:enforceStatusBarContrast', 'false', ' tools:targetApi="29"');
xml = upsertStyleItem(xml, 'AppTheme', 'android:enforceNavigationBarContrast', 'false', ' tools:targetApi="29"');
```

If the saved screenshots prove a different owner, adjust this exact step to the evidenced source; do not change `edgeToEdgeEnabled` or remove safe areas merely to hide the strip.

**Step 3: Re-run tests and device verification**

Expected: all four suites pass; screenshots show app theme behind both system areas and no clipped controls.

## Work Package 2 — Shared social-event and notification contract

### Task 4: Add client-visible social notification types and navigation

**Files:**

- Modify: `app/user_notifications.ts`
- Modify: `functions/src/user_notifications.ts`
- Create: `tests/friend_social_notification_types.test.ts`
- Modify: `tests/home_social_notifications_contract.test.ts`

**Step 1: Write the failing type/parse tests**

Test these exact event types:

```ts
const socialTypes = [
  'friend_nudge',
  'arena_friend_invite',
  'arena_friend_accepted',
  'arena_friend_declined',
  'arena_friend_cancelled',
  'arena_friend_expired',
] as const;

for (const type of socialTypes) {
  expect(VISIBLE_USER_NOTIFICATION_TYPES.has(type)).toBe(true);
}
```

Test a new navigation shape:

```ts
type UserNotificationNavFriendEvent = Readonly<{
  kind: 'friend_event';
  actorStableUid: string;
  eventId: string;
  action: 'high_five' | 'study_invite' | 'duel_invite' | 'duel_state' | 'gift';
  inviteId?: string;
}>;
```

Expected before implementation: `friend_nudge` and duel types are filtered or rejected.

**Step 2: Extend both client and server unions**

Add the exact types above to both `UserNotificationType` unions and the client visible set. Parse `friend_event` navigation defensively: reject missing actor/event/action, retain an optional invite id, and never navigate from an unvalidated raw object.

**Step 3: Run focused tests**

```powershell
npx jest --runTestsByPath tests/friend_social_notification_types.test.ts tests/home_social_notifications_contract.test.ts --no-cache --runInBand --watchman=false
```

Expected: pass.

### Task 5: Add pure friend-card marker selection and acknowledgement

**Files:**

- Create: `app/friend_social_events.ts`
- Create: `tests/friend_social_events.test.ts`

**Step 1: Write failing priority/idempotency tests**

Cover:

```ts
expect(selectFriendMarker([highFive, study, duel])?.kind).toBe('duel_invite');
expect(selectFriendMarker([highFive, study])?.kind).toBe('study_invite');
expect(selectFriendMarker([highFive])?.kind).toBe('high_five');
expect(acknowledgeMarker(events, study.id)).toEqual(
  expect.arrayContaining([expect.objectContaining({ id: highFive.id })]),
);
```

Also prove duplicate event ids collapse to one marker and expired duels are not active markers.

**Step 2: Implement the pure model**

```ts
export type FriendSocialMarkerKind = 'high_five' | 'study_invite' | 'duel_invite';

const MARKER_PRIORITY: Record<FriendSocialMarkerKind, number> = {
  high_five: 1,
  study_invite: 2,
  duel_invite: 3,
};
```

Expose pure `dedupeFriendEvents`, `selectFriendMarker`, `acknowledgeMarker`, and `remainingDuelSeconds`. Keep UI strings out of this module.

**Step 3: Run the test**

```powershell
npx jest --runTestsByPath tests/friend_social_events.test.ts --no-cache --runInBand --watchman=false
```

Expected: pass.

### Task 6: Make high-fives durable and push-capable

**Files:**

- Modify: `functions/src/friend_activity_likes.ts`
- Modify: `functions/src/friend_activity_likes.test.ts`
- Modify: `tests/friend_activity_like_persistence.test.ts`

**Step 1: Write the failing regression test**

Prove that `friendUnlikeActivity` removes the sender toggle/aggregate but does not delete either the canonical received event or its already-created `activity_like` user notification.

**Step 2: Preserve delivered history and send push after commit**

Remove only the two notification-history deletes from the unlike transaction. Keep counter and sender-toggle removal. After the like transaction succeeds, send best-effort push using the recipient token and the approved copy:

```ts
await sendExpoPush(
  pushToken,
  `${senderName} сегодня болеет за тебя`,
  'Пятюня получена. Теперь официально нельзя сдаваться.',
  { type: 'activity_like', eventId: notificationId, actorStableUid: senderStableId, nav: 'friends' },
);
```

Push failure logs a transport warning and never rolls back the transaction.

**Step 3: Run Functions and client contract tests**

```powershell
Push-Location functions
npx jest --runTestsByPath src/friend_activity_likes.test.ts --runInBand --watchman=false
Pop-Location
npx jest --runTestsByPath tests/friend_activity_like_persistence.test.ts --no-cache --runInBand --watchman=false
```

Expected: pass.

### Task 7: Make study invitations visible and deep-linkable

**Files:**

- Modify: `functions/src/friends_together.ts`
- Modify: `functions/src/friends_together.test.ts`
- Modify: `components/NotificationCenterButton.tsx`
- Modify: `tests/friends_together_nudge_client.test.ts`
- Create: `tests/friend_nudge_navigation.test.ts`

**Step 1: Add failing copy and navigation assertions**

Assert the server notification contains `friend_event` navigation with `action: 'study_invite'`, and approved push strings. Assert the bell opens Friends focused on the sender/event instead of the generic Friends root.

**Step 2: Write deterministic notification navigation**

The authoritative notification payload is:

```ts
nav: {
  kind: 'friend_event',
  actorStableUid: who.stableUid,
  eventId: requestId,
  action: 'study_invite',
}
```

Use the approved push copy from the design spec. Route client-side to:

```ts
router.push({
  pathname: '/(tabs)/friends',
  params: { focusFriend: nav.actorStableUid, socialEventId: nav.eventId },
} as never);
```

**Step 3: Run focused suites**

Expected: the nudge is present in the bell and the exact friend is focused.

## Work Package 3 — Notification center and Friends UI

### Task 8: Replace nested notification scrolling with one virtualized owner

**Files:**

- Modify: `components/AppMessagesInbox.tsx`
- Modify: `components/NotificationCenterButton.tsx`
- Create: `components/app_messages/useAppMessagesInboxModel.ts`
- Create: `app/unified_notification_feed.ts`
- Create: `app/notification_delete_undo.ts`
- Create: `tests/notification_delete_undo.test.ts`
- Create: `tests/unified_notification_feed.test.ts`
- Modify: `tests/unified_team_notifications_contract.test.ts`
- Modify: `tests/app_messages_embedded_section_contract.test.ts`
- Modify: `tests/app_messages_inbox_tonal_rows_contract.test.ts`
- Modify: `tests/notification_center_open_refresh_contract.test.ts`

**Step 1: Test delayed deletion and exact undo**

The pure helper must support one row without touching neighbours:

```ts
const pending = stageNotificationDeletion(rows, 'b', now);
expect(pending.rows.map((row) => row.id)).toEqual(['a', 'c']);
expect(undoNotificationDeletion(pending).map((row) => row.id)).toEqual(['a', 'b', 'c']);
expect(shouldCommitDeletion(pending.deletion, now + 4_001)).toBe(true);
```

**Step 2: Extract the existing team-message model without changing behavior**

Move the current loading, read, claim, delete/undo, and detail state into `useAppMessagesInboxModel`. Keep `AppMessagesInbox` as the standalone adapter over that hook so existing surfaces do not lose functionality. The hook exposes typed team rows and actions to the notification center; it does not render a `ScrollView`.

**Step 3: Merge team and social rows by time**

The pure merger returns one discriminated, chronologically sorted feed:

```ts
export type UnifiedNotificationRow =
  | Readonly<{ kind: 'team'; id: string; createdAt: number; message: AppMessage }>
  | Readonly<{ kind: 'social'; id: string; createdAt: number; notification: UserNotification }>;

export function mergeUnifiedNotificationRows(
  team: readonly AppMessage[],
  social: readonly UserNotification[],
): UnifiedNotificationRow[] {
  return [
    ...team.map((message) => ({ kind: 'team' as const, id: `team:${message.id}`, createdAt: message.createdAt, message })),
    ...social.map((notification) => ({ kind: 'social' as const, id: `social:${notification.id}`, createdAt: notification.createdAt, notification })),
  ].sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id));
}
```

**Step 4: Use one `FlatList` in the bell**

Replace the list-level `ScrollView` with:

```tsx
<FlatList
  data={selectedDetail ? [] : unifiedRows}
  keyExtractor={(row) => row.id}
  renderItem={({ item }) => item.kind === 'team'
    ? <TeamNotificationRow message={item.message} onOpen={openTeamMessage} onDelete={deleteTeamMessage} />
    : <SocialNotificationRow row={item.notification} onOpen={openNotification} onDelete={stageDelete} />}
  contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: bottomInset + 24, gap: 8 }}
  showsVerticalScrollIndicator={false}
/>
```

Ordinary rows are light. Team rows retain dark/gold surface, team icon/label, and accessible structure. Every delete control has at least 44×44 hit size. Show `Уведомление удалено` with `Вернуть`; call `deleteUserNotification(id)` only after the undo window closes or the modal unmounts.

**Step 5: Run notification suites**

```powershell
npx jest --runTestsByPath tests/notification_delete_undo.test.ts tests/unified_notification_feed.test.ts tests/unified_team_notifications_contract.test.ts tests/app_messages_embedded_section_contract.test.ts tests/app_messages_inbox_tonal_rows_contract.test.ts tests/notification_center_open_refresh_contract.test.ts tests/app_messages_read_persistence_ui_contract.test.ts --no-cache --runInBand --watchman=false
```

Expected: pass and no nested list warning.

### Task 9: Repair the weekly chest and DEV reset

**Files:**

- Modify: `app/(tabs)/friends.tsx`
- Modify: `components/friends_together/FriendsChestCard.tsx`
- Modify: `components/friends_together/FriendsChestModal.tsx`
- Modify: `components/friends_together/DevBotsSheet.tsx`
- Modify: `app/friends_together/dev_bots.ts`
- Modify: `tests/friends_together_dev_bots.test.ts`
- Modify: `tests/friends_together_dev_bots_sheet.test.tsx`
- Modify: `tests/friends_together_chest_model.test.ts`
- Modify: `tests/friends_together_claims_client.test.ts`

**Step 1: Add failing DEV scenario tests**

Assert: first open succeeds; second returns `already_open_dev`; `resetDevChestScenario()` alone permits another open; DEV never calls `claimWeeklyChest` and never writes an economy operation.

**Step 2: Implement explicit DEV state**

Use an account/scenario-scoped AsyncStorage key and pure status:

```ts
type DevChestStatus = 'ready' | 'open';
const DEV_CHEST_KEY = 'friends_chest_dev_open_v1';
```

`Сбросить сундук` is visible only in DEV tools. Production continues through the existing weekly idempotent callable.

**Step 3: Move the reward result to `HybridSheetShell`**

Render only the approved title, reward, and `Забрать`; no helper/footer copy. The button dismisses an already-durable receipt and never grants again.

**Step 4: Run chest suites**

Expected: production replay is unchanged, DEV repeat requires reset, all tests pass.

### Task 10: Repair gift selection and global recipient presentation

**Files:**

- Modify: `app/(tabs)/friends.tsx`
- Modify: `components/GlobalFriendGiftHost.tsx`
- Create: `components/friends_together/FriendGiftReceivedModal.tsx`
- Modify: `components/overlay_arbiter_core.ts`
- Modify: `components/OverlayArbiter.tsx`
- Modify: `app/friends_account_store.ts`
- Modify: `tests/friends_tab_gift_interaction_contract.test.ts`
- Create: `tests/global_friend_gift_presentation.test.tsx`
- Modify: `tests/overlay_arbiter.test.ts`
- Run unchanged economy tests: `tests/friend_gifts.test.ts`, `tests/friend_gift_inbox.test.ts`, `tests/friend_gift_outbox.test.ts`

**Step 1: Test sender selection before send**

The row press sets `selectedGiftId`; it must not call `requestSendGift`. Only the primary button sends, disables while pending, and uses one stable request id per retry chain.

**Step 2: Implement the approved picker**

Show only recipient title, gift name, price, and one CTA such as `Отправить щит · 8`. Remove row descriptions and helper text. Preserve the existing atomic `friendSendGift` backend; do not add any debit or grant path.

**Step 3: Add a global queued celebration**

Add `friendGift` as a non-evictable native overlay key below user-initiated modal priorities and above transient toasts. `GlobalFriendGiftHost` publishes every unseen gift, requests the overlay slot, and renders `FriendGiftReceivedModal` via `HybridAlertShell`. It advances the queue only after `Забрать` acknowledges the already-delivered gift.

**Step 4: Remove duplicate generic reward toast for the same gift**

The global host should emit the dedicated gift overlay and bell refresh event, not a second generic reward toast. Dedupe by gift operation/event id.

**Step 5: Run UI, arbiter, and economy suites**

Expected: picker wins presentation priority; incoming gift waits; no duplicate modal/toast; atomic gift contracts remain green.

### Task 11: Render themed event markers on friend cards

**Files:**

- Create: `components/friends_together/FriendEventMarker.tsx`
- Create: `components/friends_together/friend_event_assets.ts`
- Create: `components/friends_together/FriendStudyInviteModal.tsx`
- Modify: `components/friends_together/FriendListRow.tsx`
- Modify: `components/friends_together/FriendTogetherSheet.tsx`
- Modify: `app/(tabs)/friends.tsx`
- Create: `tests/friend_event_marker.test.tsx`
- Create: `tests/friend_event_asset_map.test.ts`

**Step 1: Wire all static asset slots before generating files**

The map has exactly nine themes and three keys:

```ts
export const FRIEND_EVENT_ASSETS: Record<ThemeMode, Record<FriendSocialMarkerKind, ImageSourcePropType>> = {
  dark: { high_five: require('../../assets/images/friends/social-markers/high-five-dark.webp'), study_invite: require('../../assets/images/friends/social-markers/study-invite-dark.webp'), duel_invite: require('../../assets/images/friends/social-markers/duel-invite-dark.webp') },
  gold: { high_five: require('../../assets/images/friends/social-markers/high-five-gold.webp'), study_invite: require('../../assets/images/friends/social-markers/study-invite-gold.webp'), duel_invite: require('../../assets/images/friends/social-markers/duel-invite-gold.webp') },
  olive: { high_five: require('../../assets/images/friends/social-markers/high-five-olive.webp'), study_invite: require('../../assets/images/friends/social-markers/study-invite-olive.webp'), duel_invite: require('../../assets/images/friends/social-markers/duel-invite-olive.webp') },
  midnight: { high_five: require('../../assets/images/friends/social-markers/high-five-midnight.webp'), study_invite: require('../../assets/images/friends/social-markers/study-invite-midnight.webp'), duel_invite: require('../../assets/images/friends/social-markers/duel-invite-midnight.webp') },
  ember: { high_five: require('../../assets/images/friends/social-markers/high-five-ember.webp'), study_invite: require('../../assets/images/friends/social-markers/study-invite-ember.webp'), duel_invite: require('../../assets/images/friends/social-markers/duel-invite-ember.webp') },
  aurora: { high_five: require('../../assets/images/friends/social-markers/high-five-aurora.webp'), study_invite: require('../../assets/images/friends/social-markers/study-invite-aurora.webp'), duel_invite: require('../../assets/images/friends/social-markers/duel-invite-aurora.webp') },
  volt: { high_five: require('../../assets/images/friends/social-markers/high-five-volt.webp'), study_invite: require('../../assets/images/friends/social-markers/study-invite-volt.webp'), duel_invite: require('../../assets/images/friends/social-markers/duel-invite-volt.webp') },
  indigo: { high_five: require('../../assets/images/friends/social-markers/high-five-indigo.webp'), study_invite: require('../../assets/images/friends/social-markers/study-invite-indigo.webp'), duel_invite: require('../../assets/images/friends/social-markers/duel-invite-indigo.webp') },
  sagePorcelain: { high_five: require('../../assets/images/friends/social-markers/high-five-sagePorcelain.webp'), study_invite: require('../../assets/images/friends/social-markers/study-invite-sagePorcelain.webp'), duel_invite: require('../../assets/images/friends/social-markers/duel-invite-sagePorcelain.webp') },
};
```

**Step 2: Test theme/key parity and accessibility**

For every `ThemeMode`, assert keys equal `['duel_invite', 'high_five', 'study_invite']`. Test invisible accessibility labels and reduced-motion opacity/scale entrance.

**Step 3: Integrate marker behavior**

The friend row shows an illuminated avatar ring and one right-side marker. Opening/dismissing study or duel acknowledges only the card marker; high-five acknowledgement never deletes bell history. Duel countdown is numeric and derived from `expiresAtMs`.

**Step 4: Implement the study action and foreground high-five feedback**

`FriendStudyInviteModal` uses `HybridAlertShell` and renders only the approved title, one body, `Начать занятие`, and `Не сейчас`. Start uses the existing ordinary next-recommended-lesson route; decline acknowledges only the marker. Foreground high-five emits the approved non-blocking `actionToast` title/message and the themed `high_five` asset; it never requests a native modal slot.

**Step 5: Run marker and Friends row suites**

Expected: pass with no visible labels `За тебя` or `Зовёт`.

## Work Package 4 — Persistent Arena friend duels and DEV bot

### Task 12: Define the invite/rendezvous state machine first

**Files:**

- Modify: `functions/src/arena_v2_core.ts`
- Modify: `functions/src/arena_v2_core.test.ts`
- Create: `modules/arena/friend_invite_state.ts`
- Create: `tests/arena_friend_invite_state.test.ts`

**Step 1: Write failing state tests**

Cover pending for exactly ten minutes, accept starting a 90-second rendezvous, host/guest readiness in either order, one matched transition, decline, cancel, pending expiry, rendezvous expiry, and replay of every terminal transition.

**Step 2: Implement constants and pure transitions**

```ts
export const ARENA_V2_INVITE_TTL_MS = 10 * 60 * 1_000;
export const ARENA_V2_RENDEZVOUS_MS = 90 * 1_000;

export type FriendInviteStatus =
  | 'pending'
  | 'accepted'
  | 'matched'
  | 'declined'
  | 'cancelled'
  | 'expired';
```

The pure transition result says what should be written; it never reads Firestore or creates rewards.

**Step 3: Run state/core tests**

```powershell
npx jest --runTestsByPath tests/arena_friend_invite_state.test.ts --no-cache --runInBand --watchman=false
Push-Location functions
npx jest --runTestsByPath src/arena_v2_core.test.ts --runInBand --watchman=false
Pop-Location
```

Expected: pass.

### Task 13: Implement idempotent server invite lifecycle and notifications

**Files:**

- Modify: `functions/src/arena_v2.ts`
- Modify: `functions/src/index.ts`
- Modify: `functions/src/arena_v2_backend_contract.test.ts`
- Create: `functions/src/arena_friend_invites.test.ts`
- Modify: `firestore.rules`
- Modify: `tests/firestore_rules_security.test.ts`
- Inspect/update: `functions/src/jarvis/*_firestore_fetcher.ts`
- Modify: `functions/src/jarvis/jarvis_data_contract_guard.test.ts`

**Step 1: Write callable contract tests**

Require exports:

```ts
arenaV2InviteCreate
arenaV2InviteAccept
arenaV2InviteDecline
arenaV2InviteCancel
arenaV2InviteReady
arenaV2InviteStatus
arenaV2DevFriendBotCreate
```

Test that create writes a deterministic bell event in the same authoritative transaction, then sends push best-effort. Test cancel/decline/expiry terminal notifications, accept notification, and no duplicate rows on retries.

**Step 2: Change accept from immediate match creation to rendezvous**

`arenaV2InviteAccept` validates friendship/expiry and writes:

```ts
{
  status: 'accepted',
  acceptedAtMs: now,
  rendezvousExpiresAtMs: now + ARENA_V2_RENDEZVOUS_MS,
  toReadyAtMs: now,
}
```

It does not create a match by itself.

**Step 3: Create the real friend match only when both are ready**

`arenaV2InviteReady` marks the authenticated participant. In one Firestore transaction, when both readiness timestamps exist and the rendezvous is live, call the existing `loadArenaTaskPool`, `selectedTaskEnvelope`, and `makeMatch({ mode: 'friend' })`; create members/profiles/private document once; set invite `{ status: 'matched', matchId }`. A retry returns the stored match id.

**Step 4: Add cancel/status and lazy expiry**

Only the sender can cancel pending/accepted invites. `arenaV2InviteStatus` validates participant identity, normalizes time-expired states idempotently, and returns the minimum UI state. Expiry has no rating/economy effect.

**Step 5: Add the DEV-only real bot adapter**

`arenaV2DevFriendBotCreate` rejects unless Functions emulator or explicit server dev flag is enabled. After a deterministic 1–2 second accepted delay, it creates a `mode: 'friend'` bot match through the existing Arena bot plan/match engine. It writes no rating or economy grant and is repeatable with a new request id.

**Step 6: Audit Rules and Jarvis**

Run:

```powershell
rg -n 'arena_v2_invites|notifications|friend_nudge|activity_like' functions/src/jarvis --glob '*_firestore_fetcher.ts'
```

Keep Arena invite collections server-only in Rules and extend the security test to deny direct client get/list/create/update/delete for the new statuses/fields. Add a Jarvis contract assertion documenting that no department fetcher treats `arena_v2_invites` or per-user notifications as authoritative metrics; if the search finds a real reader, update that fetcher and replace the negative assertion with its exact field contract in this same task.

**Step 7: Run server, Rules, Jarvis, and economy guards**

Expected: all pass; no standalone debit/direct balance writer appears.

### Task 14: Replace manual duel input with selected friend and waiting state

**Files:**

- Modify: `app/arena_client.ts`
- Modify: `app/arena_friend_duel.tsx`
- Modify: `app/arena_invite.tsx`
- Modify: `modules/arena/copy.ts`
- Modify: `app/(tabs)/friends.tsx`
- Modify: `components/friends_together/friend_sheet_session.ts`
- Modify: `tests/friends_tab_gift_interaction_contract.test.ts`
- Modify: `tests/arena_v2_client_contract.test.ts`
- Modify: `tests/arena_v2_client_source_contract.test.ts`
- Modify: `tests/arena_owner_requested_ui_contract.test.ts`
- Modify: `tests/arena_copy_completeness.test.ts`

**Step 1: Add client methods and typed status**

Expose typed `arenaV2InviteCancel`, `arenaV2InviteReady`, `arenaV2InviteStatus`, and `arenaV2DevFriendBotCreate`. Persist only the active invite id/request id needed to restore the waiting card; never store a manual friend id textbox value.

**Step 2: Pass the selected friend from Friends**

Replace the parameterless route with:

```ts
router.push({
  pathname: '/arena_friend_duel',
  params: {
    friendStableUid: profile.stableUid,
    friendName: profile.displayName,
    friendAvatar: serializeAvatar(profile.avatar),
  },
} as never);
```

Validate params on the destination; if the friend vanished, close cleanly to the Arena friend list.

**Step 3: Build the approved Arena opponent picker and waiting card**

Remove the manual `TextInput`, invite code, and share-token UI. Render a Motion Hybrid bottom sheet of friends. Include `DEV-бот` only under `__DEV__`. After create, render selected avatar/name, live 10-minute countdown, and `Отменить вызов`. Reopening restores the state through `arenaV2InviteStatus`.

**Step 4: Build the incoming invite modal**

`app/arena_invite.tsx` reads the exact invite id from the deep link, fetches status, and shows only approved title, one body, `Проверим`, and `Сегодня без драмы`. No code input. Accept marks recipient ready; accepted deep link calls `arenaV2InviteReady` on screen entry. A matched response navigates to the existing Arena match route with remembered seat.

**Step 5: Poll only while the waiting/rendezvous screen is active**

Use a bounded 1–2 second status poll while focused, stop on blur/background/terminal state, and never create a global background timer. The server expiry remains authoritative.

**Step 6: Run client Arena/friend route suites**

Expected: selected friend is preserved; no manual input exists; accept/decline/cancel/expiry/rendezvous/DEV bot routes are covered.

### Task 15: Record Arena owner decisions

**Files:**

- Modify: `docs/arena/OWNER_DECISIONS.md`

Append a dated entry with:

- ten-minute persistent invite;
- 90-second readiness rendezvous;
- no manual codes or friend ids;
- friend-mode match creation uses the existing engine and is idempotent;
- DEV bot is dev-gated and reward/rating-free;
- exact notification/deep-link terminal states;
- exact focused and complete Arena test evidence.

Do not edit or reformat older decisions.

## Work Package 5 — Per-theme assets and cross-surface verification

### Task 16: Produce the exact 27 final marker assets safely

**Files:**

- Create sources outside bundle: `.codex-tmp/friend-social-markers/sources/<theme>-sprite.png`
- Create: `scripts/friend-social/build-marker-assets.mjs`
- Create exactly 27 final files: `assets/images/friends/social-markers/{high-five,study-invite,duel-invite}-{theme}.webp`
- Verify unchanged: `components/friends_together/friend_event_assets.ts`
- Modify: `tests/friend_event_asset_map.test.ts`

**Step 1: Generate one three-object sprite per theme**

Use built-in Codex image generation only, one theme sheet at a time, exporting immediately to `.codex-tmp`. Do not use project/user OpenAI API credentials and do not issue a bulk in-thread batch. Keep the approved silhouettes consistent; vary palette/material/light for `dark`, `gold`, `olive`, `midnight`, `ember`, `aurora`, `volt`, `indigo`, and `sagePorcelain`.

**Step 2: Crop and compress deterministically**

`build-marker-assets.mjs` uses `sharp` to validate transparent bounds, crop the exact three slots, resize to the approved card resolution, and emit WebP quality 72 with alpha. It fails if any expected source or output is missing, extra, opaque, or above the size budget.

**Step 3: Prove every bundled file is wired 1:1**

Run:

```powershell
npx jest --runTestsByPath tests/friend_event_asset_map.test.ts --no-cache --runInBand --watchman=false
npm run assets:audit:themes
```

Expected: nine themes × three keys, 27 references, 27 files, zero extras.

### Task 17: Add deep-link and end-to-end social journey coverage

**Files:**

- Create: `tests/friends_social_end_to_end_contract.test.ts`
- Modify: `tests/retained_tabs_runtime_work_contract.test.ts`
- Modify: `tests/phone_state_firebase_quiet_contract.test.ts`
- Create or modify Maestro journeys under the project’s existing E2E location only after inspecting current conventions

**Step 1: Add contract journeys**

Cover:

1. High-five → durable bell row + push payload + card marker; no blocking modal.
2. Study invite → bell/push → exact friend → modal → ordinary next lesson.
3. Gift send → one atomic receipt → queued recipient celebration → acknowledge; no duplicate.
4. Friend duel → selected friend → invite → accept → both ready → normal match → normal result; no rating/reward.
5. DEV bot → short accept delay → real match engine → result; repeatable.
6. Notification delete → undo restores exact position; timeout deletes one row.

**Step 2: Verify foreground/background work is bounded**

Assert no new permanent Firestore listener or background interval was added for Friends markers, gifts, or duel status. Polling exists only while the owning screen is active; push failure never erases bell state.

## Final verification gate

### Task 18: Run focused suites, protected Arena suites, build checks, and visual QA

**Step 1: Run all focused root suites from this plan**

Run the named root tests with `--runTestsByPath --no-cache --runInBand --watchman=false`. Redirect full logs to `.codex-tmp/friends-social/root-tests.log`; report only suite/test counts and failing names.

**Step 2: Run all touched Functions suites**

From `functions/`, run the named Functions tests and `npm run build`. Redirect full logs to `.codex-tmp/friends-social/functions-tests.log` and `.codex-tmp/friends-social/functions-build.log`.

**Step 3: Run the complete protected Arena test inventory**

Enumerate current Arena suites rather than relying on the historical count:

```powershell
$rootArena = Get-ChildItem tests -Filter 'arena_*.test.ts' | ForEach-Object { $_.FullName }
npx jest --runTestsByPath $rootArena --no-cache --runInBand --watchman=false
Push-Location functions
$fnArena = Get-ChildItem src -Filter 'arena_*.test.ts' | ForEach-Object { $_.FullName }
npx jest --runTestsByPath $fnArena --runInBand --watchman=false
Pop-Location
```

Expected: every currently present Arena suite passes; record the actual suite/assertion counts in `docs/arena/OWNER_DECISIONS.md`. A failing Arena gate blocks completion.

**Step 4: Run Rules, Jarvis, motion, economy, and asset guards**

Run the narrow existing guards covering:

- `tests/firestore_rules_security.test.ts`
- `functions/src/jarvis/jarvis_data_contract_guard.test.ts`
- `tests/motion_hybrid_contract.test.ts`
- economy constitution/standalone-debit/direct-balance-writer guards located with `rg -l 'standalone debit|direct balance|ECONOMY_CONSTITUTION' tests scripts`
- `npm run assets:audit:themes`

Expected: all pass without weakening any guard.

**Step 5: Run scoped TypeScript checks**

Run the project and Functions TypeScript commands used by the repository. If unrelated pre-existing errors exist, save the full log and prove zero errors reference any touched path; do not claim a global green typecheck in that case.

**Step 6: Perform device visual QA**

Verify in at least one Android edge-to-edge device profile and one iOS/safe-area profile:

- no black top/bottom bands on Home, Friends, Arena, and modal transitions;
- all approved modals contain only title, one body at most, and buttons;
- incoming gift waits behind a user-opened modal;
- friend marker adapts to every theme and never shows visible helper labels;
- bell reaches the final row, respects bottom inset, deletes/undoes one row, and visually distinguishes team messages;
- direct friend duel and DEV bot complete a real Arena match.

Capture artifacts under `.codex-tmp/friends-social/qa/`; do not add screenshots to the bundle.

**Step 7: Review the final diff before any commit**

Run:

```powershell
git diff --check
git diff --stat
git status --short
```

Inspect every touched file for unrelated deletions. If `.git/index.lock` exists, leave commits deferred. Otherwise commit only exact owned paths in logical packets; never include unrelated staged files.

## Definition of done

- Every item in the approved design spec has an implementation and an automated or explicit device acceptance check.
- Production chest is weekly/idempotent; DEV chest requires explicit reset and grants nothing.
- Gift selection is explicit and atomic; recipient presentation is queued and deduped.
- Study invites and high-fives appear in push, bell, deep link, and card feedback with approved copy.
- Bell uses one vertical scroll owner, per-row delete, and undo; team messages remain structurally distinct.
- Friend duel never asks for a code/id, preserves the selected friend, persists ten minutes, rendezvous lasts 90 seconds, and creates one real friend-mode match.
- DEV bot uses the real Arena bot/match/result engine and never grants rating/economy rewards.
- All nine themes expose the exact three compressed marker assets.
- No black safe-area bands remain and real device insets are preserved.
- Arena owner log, Rules/Jarvis contracts, motion guard, economy guards, and every present Arena suite are green.
