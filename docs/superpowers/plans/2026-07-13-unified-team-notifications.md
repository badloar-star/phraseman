# Unified Team Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move team messages into the existing notification center, let each user permanently dismiss them with Undo, and move the shard balance into the former leftmost message slot.

**Architecture:** Keep `app_messages` and `users/{stableUid}/notifications` as separate data sources but compose them in `NotificationCenterButton`. Reuse `AppMessagesInbox` as an embedded team-message section plus its existing detail/VIP surfaces. Store message cache, animation state, deletion tombstones, and pending operations under account-scoped keys so stale snapshots and account switches cannot resurrect or leak state.

**Tech Stack:** React Native, Expo Router, TypeScript, AsyncStorage, React Native Firebase Firestore, Jest contract/unit tests.

---

### Task 1: Account-scoped message state and permanent dismissal

**Files:**
- Modify: `app/app_messages.ts`
- Modify: `tests/report_reply_messages.test.ts`
- Create: `tests/app_messages_account_scope_contract.test.ts`

- [ ] **Step 1: Write failing merge and storage-contract tests**

Add a unit case proving any message with `dismissedAtMs` is filtered, not only `vip_survey`:

```ts
it('filters every dismissed team message kind', () => {
  const snapshot = mergeAppMessagesWithStates(
    [message({ id: 'news', kind: 'message' }), message({ id: 'poll', kind: 'poll' })],
    [{ messageId: 'news', readAtMs: 1, dismissedAtMs: 2, reaction: null, updatedAtMs: 2 }],
    NOW,
  );
  expect(snapshot.messages.map((row) => row.id)).toEqual(['poll']);
  expect(snapshot.unreadCount).toBe(1);
});
```

Create a focused source contract asserting cache, refresh, animation, tombstone, and outbox keys flow through an owner-key helper and that legacy shared keys are removed.

- [ ] **Step 2: Run the tests and confirm the intended failure**

Run:

```powershell
npx jest tests/report_reply_messages.test.ts tests/app_messages_account_scope_contract.test.ts --runInBand
```

Expected: the merge test still contains the VIP-only filter and the new owner-scoping contract fails.

- [ ] **Step 3: Make persisted keys owner-scoped**

Add an owner helper and legacy cleanup:

```ts
const ownerKey = (base: string, stableUid: string) => `${base}:${encodeURIComponent(stableUid)}`;

async function getAppMessagesOwnerUid(): Promise<string | null> {
  return String(await getCanonicalUserId().catch(() => '')).trim() || null;
}
```

Use the scoped key for the cached snapshot, refresh timestamp, animation IDs, deletion overrides, and pending operations. Keep admin-only local preview keys device-local. Remove the old unowned cache/refresh/animation keys once, because their owner cannot be proven.

- [ ] **Step 4: Add a persistent last-write-wins deletion operation**

Add an account-scoped record:

```ts
type PendingMessageVisibility = {
  messageId: string;
  dismissedAtMs: number | null;
  revision: number;
};
```

`dismissAppMessage()` must persist `{ dismissedAtMs: now, revision: now }` before the Firestore write. Add `restoreAppMessage(messageId)` with `{ dismissedAtMs: null, revision: now }`. Newer revisions replace older operations for the same message. Apply pending dismissals over cached and live snapshots so an old snapshot cannot resurrect a message.

- [ ] **Step 5: Flush pending operations idempotently**

On foreground refresh/subscription startup, resend the newest operation per message with `set(..., { merge: true })`. Remove a pending operation only after a matching server refresh or rely on a narrowly tested durable Firestore queue; never let completion of an older delete overwrite a newer restore.

- [ ] **Step 6: Run the focused tests**

Run the command from Step 2. Expected: PASS.

### Task 2: Embedded team-message section with delete and Undo

**Files:**
- Modify: `components/AppMessagesInbox.tsx`
- Create: `tests/app_messages_embedded_section_contract.test.ts`

- [ ] **Step 1: Write the failing embedded-section contract**

Assert that `AppMessagesInbox` accepts controlled integration props, renders a team section without the old mail trigger, exposes unread changes, and uses accessible delete controls:

```ts
expect(source).toContain("mode?: 'standalone' | 'notification-center'");
expect(source).toContain('onUnreadCountChange?: (count: number) => void');
expect(source).toContain('notificationTargetRef?:');
expect(source).toContain('accessibilityLabel={copy.dismiss}');
expect(source).toContain('restoreAppMessage');
```

- [ ] **Step 2: Run the contract and confirm it fails**

```powershell
npx jest tests/app_messages_embedded_section_contract.test.ts --runInBand
```

Expected: FAIL because the integration props and restore flow do not exist.

- [ ] **Step 3: Add integration props without removing existing message behavior**

Define:

```ts
type AppMessagesInboxProps = {
  mode?: 'standalone' | 'notification-center';
  centerVisible?: boolean;
  onRequestCloseCenter?: () => void;
  onUnreadCountChange?: (count: number) => void;
  notificationTargetRef?: React.RefObject<View | null>;
};
```

In notification-center mode, render only the section rows in the parent list. Selecting a row closes the center, then opens the existing message detail modal so reactions, polls, rewards, and VIP flows remain unchanged.

- [ ] **Step 4: Add optimistic permanent delete and race-safe Undo**

The row delete button must stop propagation, remove the row immediately, update unread count, call `dismissAppMessage`, and retain the removed row for a short Undo banner. Undo restores the row at its sorted position and calls `restoreAppMessage`. The delete touch target must be at least 44×44 px and use `copy.dismiss`.

- [ ] **Step 5: Retarget the existing envelope animation**

Use `notificationTargetRef` instead of the removed mail-button ref when supplied. Preserve the existing sound, single-flight lock, focus/AppState guards, and once-per-message persistence.

- [ ] **Step 6: Run the focused contract**

Run the command from Step 2. Expected: PASS.

### Task 3: Unified notification center and combined badge

**Files:**
- Modify: `components/NotificationCenterButton.tsx`
- Modify: `tests/home_social_notifications_contract.test.ts`
- Create: `tests/unified_team_notifications_contract.test.ts`

- [ ] **Step 1: Write failing center contracts**

Assert that the bell mounts `AppMessagesInbox` in notification-center mode before ordinary items, provides its target ref, combines unread counts, and keeps existing report-reply and navigation behavior.

```ts
expect(source).toContain('<AppMessagesInbox');
expect(source).toContain('mode="notification-center"');
expect(source).toContain('const combinedUnreadCount = teamUnreadCount + unreadCount');
expect(source.indexOf('mode="notification-center"')).toBeLessThan(source.indexOf('items.map((row)'));
```

- [ ] **Step 2: Run the contracts and confirm they fail**

```powershell
npx jest tests/home_social_notifications_contract.test.ts tests/unified_team_notifications_contract.test.ts --runInBand
```

Expected: FAIL because the center does not yet contain team messages.

- [ ] **Step 3: Compose the two sources**

Mount the embedded team section at the top of the center list. Keep ordinary notification read semantics unchanged. Show the existing empty state only when both team and ordinary lists are empty. Use `combinedUnreadCount` for the bell badge and cap the label at `99+`.

- [ ] **Step 4: Provide the animation target**

Wrap the bell pressable in a measurable `View` and pass its ref to `AppMessagesInbox`. The bell uses the same theme accent and badge contrast as before.

- [ ] **Step 5: Run the focused contracts**

Run the command from Step 2. Expected: PASS.

### Task 4: Reorder the home header

**Files:**
- Modify: `app/(tabs)/home.tsx`
- Modify: `tests/header_theme_accent_buttons.test.ts`
- Modify: `tests/help_board_contract.test.ts`
- Create: `tests/home_header_shards_left_contract.test.ts`

- [ ] **Step 1: Write failing header-order tests**

Assert that `<AppMessagesInbox />` is absent from home, the shard-shop button occurs before `renderHomeProfileButton()`, and the existing energy/video/chat/notification buttons remain present.

- [ ] **Step 2: Run the header contracts and confirm they fail**

```powershell
npx jest tests/header_theme_accent_buttons.test.ts tests/help_board_contract.test.ts tests/home_header_shards_left_contract.test.ts --runInBand
```

Expected: FAIL because the mail trigger is still first and shards remain on the right.

- [ ] **Step 3: Move the existing shard button**

Move the complete shard `TouchableOpacity` block, including animation, theme colors, count, and `/shards_shop` navigation, into the former mail-button position before the profile button. Do not duplicate or restyle it. Remove only the now-unused home import and JSX for `AppMessagesInbox`.

- [ ] **Step 4: Preserve touch layout on narrow screens**

Keep the shard control at least 44 px high, retain the flexible spacer, and avoid adding fixed widths that compress the right-side controls.

- [ ] **Step 5: Run the focused header contracts**

Run the command from Step 2. Expected: PASS.

### Task 5: Focused regression verification

**Files:**
- Verify only; do not update snapshots or generated source.

- [ ] **Step 1: Run all changed-surface tests together**

```powershell
npx jest tests/report_reply_messages.test.ts tests/app_messages_account_scope_contract.test.ts tests/app_messages_embedded_section_contract.test.ts tests/home_social_notifications_contract.test.ts tests/unified_team_notifications_contract.test.ts tests/header_theme_accent_buttons.test.ts tests/help_board_contract.test.ts tests/home_header_shards_left_contract.test.ts tests/app_messages_read_persistence_ui_contract.test.ts tests/app_messages_background_refresh_contract.test.ts tests/report_reply_notification_center_contract.test.ts tests/runtime_lifecycle_ratchet.test.ts --runInBand
```

Expected: all suites PASS; no source files are rewritten.

- [ ] **Step 2: Run a targeted TypeScript check for touched files**

Use the project-supported narrow typecheck or existing test compiler path. If the repository has only a whole-project typecheck and it is noisy from unrelated user work, record that limitation and rely on the focused Jest/ts-jest compilation evidence.

- [ ] **Step 3: Inspect the final diff**

Verify that only the plan, relevant app/component files, and focused tests changed. Confirm there are no snapshot updates, generated files, admin changes, or deletion of unrelated behavior.

- [ ] **Step 4: Request final Advisor review**

Send the objective, spec, plan, affected paths, final diff, test output, account/offline guarantees, and unresolved typecheck limitations. Apply any required changes and repeat focused verification until `DECISION: APPROVED`.

- [ ] **Step 5: Commit the implementation**

Stage only files owned by this feature and commit with:

```powershell
git commit -m "feat: unify team messages with notifications"
```
