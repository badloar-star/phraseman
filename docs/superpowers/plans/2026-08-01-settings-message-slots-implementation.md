# Settings Message Slots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two independently managed information-or-poll slots to Settings, with localized content, fixed one-time votes, control groups, targeting, and aggregated admin statistics.

**Architecture:** Extend the existing `app_messages` campaign model with an explicit delivery surface and Settings slot instead of creating another remote-config channel. Keep legacy inbox polls unchanged, add a dedicated protected callable for irreversible Settings votes, and render Settings campaigns from a cached one-shot snapshot so the screen does not gain a permanent listener. The live admin remains `admin/v2/legacy.html`; it exposes two compact slot summaries backed by one shared draft/translation/preview editor.

**Tech Stack:** React Native/Expo Router, TypeScript, AsyncStorage, Firebase Auth/Firestore/Callable Functions, Firebase Admin transactions, Jest, HTML/CSS/vanilla JavaScript admin UI.

---

## File map

- `app/app_messages.ts`: normalize the new campaign metadata, keep Settings campaigns out of the inbox, expose a synchronous last-known snapshot.
- `app/settings_message_slots.ts`: pure audience, locale, control-bucket, slot-selection, and paywall-attribution logic.
- `app/settings_poll_vote.ts`: account-scoped optimistic vote outbox and callable reconciliation.
- `components/settings/SettingsMessageSlotCard.tsx`: accessible theme-aware information/poll card.
- `app/(tabs)/settings.tsx`: load and place the top/bottom slots without adding a hot listener.
- `functions/src/admin_app_messages.ts`: validate Settings campaigns, archive previous campaigns per slot, and freeze poll structure after publication/votes.
- `functions/src/settings_poll_vote.ts`: idempotent first-vote-wins transaction and aggregate counters.
- `functions/src/index.ts`: export the new callable.
- `firestore.rules`: explicitly deny direct client writes to fixed vote documents.
- `admin/v2/legacy.html`: two live slot summaries plus the shared editor, translation review, preview, publication, and statistics.
- Focused tests under `tests/` and `functions/src/` guard every contract above.

### Task 1: Campaign model and pure Settings selector

**Files:**
- Modify: `app/app_messages.ts`
- Create: `app/settings_message_slots.ts`
- Modify: `tests/app_messages.test.ts`
- Create: `tests/settings_message_slots.test.ts`

- [ ] **Step 1: Write failing normalization and inbox-isolation tests**

```ts
it('keeps settings campaigns out of inbox unread counts', () => {
  const snapshot = sanitizeAppMessagesInboxSnapshot({
    messages: [message({ id: 'top', deliverySurface: 'settings', settingsSlot: 'top', unread: true })],
    unreadCount: 99,
  });
  expect(snapshot.unreadCount).toBe(0);
});

it('selects one active campaign for each independent settings slot', () => {
  expect(selectSettingsMessageSlots(snapshot, {
    stableId: 'account-a', hasPremiumAccess: false, appVersion: '2.4.0', language: 'ru',
  })).toEqual({ top: expect.objectContaining({ id: 'top-new' }), bottom: null });
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npx jest tests/app_messages.test.ts tests/settings_message_slots.test.ts --runInBand`

Expected: FAIL because Settings metadata and `selectSettingsMessageSlots` do not exist.

- [ ] **Step 3: Extend the normalized campaign type with backward-compatible defaults**

```ts
export type AppMessageDeliverySurface = 'inbox' | 'settings';
export type SettingsMessageSlot = 'top' | 'bottom';

export interface AppMessage {
  // existing fields remain
  deliverySurface: AppMessageDeliverySurface;
  settingsSlot: SettingsMessageSlot | null;
  voteMode: 'changeable' | 'fixed';
  controlPercent: number;
}

const deliverySurface = raw.deliverySurface === 'settings' ? 'settings' : 'inbox';
const settingsSlot = deliverySurface === 'settings' && (raw.settingsSlot === 'top' || raw.settingsSlot === 'bottom')
  ? raw.settingsSlot
  : null;
```

`sanitizeAppMessagesInboxSnapshot` and the existing audience filter must count/return only `deliverySurface === 'inbox'`. Add a bounded module snapshot:

```ts
let latestAppMessagesSnapshot: AppMessagesSnapshot | null = null;
export const peekAppMessagesSnapshot = (): AppMessagesSnapshot | null => latestAppMessagesSnapshot;
```

Update it whenever cached or Firestore data is accepted.

- [ ] **Step 4: Implement the pure selector and deterministic control assignment**

```ts
export function selectSettingsMessageSlots(
  snapshot: AppMessagesSnapshot | null,
  context: SettingsMessageSlotContext,
): SettingsMessageSlotSelection {
  const eligible = (snapshot?.messages ?? [])
    .filter((item) => item.deliverySurface === 'settings' && item.active)
    .filter((item) => audienceMatches(item.audience, context.hasPremiumAccess))
    .filter((item) => !isInControlGroup(item.id, context.stableId, item.controlPercent));
  return buildSelectionWithAssignments(eligible, context);
}
```

Use a stable 32-bit string hash of `${campaignId}:${stableId}` and map it to `[0, 99]`. The selection carries an assignment for each eligible campaign (`treatment` or `control`), while only treatment campaigns produce a visible card. This lets the existing Plus flow attribute purchases for users who intentionally saw no card. Resolve title, body, poll question and options through the existing `pickAppMessageText` suffix conventions.

- [ ] **Step 5: Run tests and verify GREEN**

Run: `npx jest tests/app_messages.test.ts tests/settings_message_slots.test.ts --runInBand`

Expected: PASS.

### Task 2: Protected fixed-vote backend and security boundary

**Files:**
- Create: `functions/src/settings_poll_vote.ts`
- Create: `functions/src/settings_poll_vote.test.ts`
- Modify: `functions/src/index.ts`
- Modify: `firestore.rules`
- Modify: `tests/firestore_rules_security.test.ts`

- [ ] **Step 1: Write failing transaction and rule tests**

```ts
it('returns the stored option and never changes a previous vote', async () => {
  await harness.vote({ messageId: 'poll-1', optionId: 'a', requestId: 'r1' });
  const replay = await harness.vote({ messageId: 'poll-1', optionId: 'b', requestId: 'r2' });
  expect(replay).toEqual({ accepted: false, optionId: 'a', alreadyVoted: true });
  expect(await harness.count('a')).toBe(1);
  expect(await harness.count('b')).toBe(0);
});

expect(rules).toMatch(/fixed_poll_votes\/.+allow (?:create|update|delete|write): if false/);
```

- [ ] **Step 2: Run the backend tests and verify RED**

Run: `npm --prefix functions test -- --runInBand src/settings_poll_vote.test.ts && npx jest tests/firestore_rules_security.test.ts --runInBand`

Expected: FAIL because the callable and rule boundary do not exist.

- [ ] **Step 3: Implement the authenticated, App-Check-protected transaction**

```ts
export const submitSettingsPollVote = onCall({ enforceAppCheck: true }, async (request) => {
  const uid = requireAuthenticatedUid(request);
  const input = normalizeVoteInput(request.data);
  return admin.firestore().runTransaction(async (tx) => {
    const messageRef = db.collection('app_messages').doc(input.messageId);
    const voteRef = messageRef.collection('fixed_poll_votes').doc(uid);
    const [messageSnap, voteSnap] = await Promise.all([tx.get(messageRef), tx.get(voteRef)]);
    if (voteSnap.exists) return existingVoteResult(voteSnap);
    const campaign = requireActiveSettingsPoll(messageSnap, input.optionId);
    tx.create(voteRef, fixedVoteDocument(uid, input));
    tx.update(messageRef, {
      [`poll.counts.${input.optionId}`]: FieldValue.increment(1),
      'poll.totalVotes': FieldValue.increment(1),
      updatedAtMs: Date.now(),
    });
    return { accepted: true, optionId: input.optionId, alreadyVoted: false };
  });
});
```

Validate string lengths, request ID format, active state, `deliverySurface === 'settings'`, `kind === 'poll'`, `voteMode === 'fixed'`, and option membership. Store no answer text or other profile data in the vote document.

- [ ] **Step 4: Export the callable and deny direct writes**

```ts
export { submitSettingsPollVote } from './settings_poll_vote';
```

```rules
match /fixed_poll_votes/{userId} {
  allow read: if request.auth != null && request.auth.uid == userId;
  allow create, update, delete: if false;
}
```

- [ ] **Step 5: Run tests and verify GREEN**

Run: `npm --prefix functions test -- --runInBand src/settings_poll_vote.test.ts && npx jest tests/firestore_rules_security.test.ts --runInBand`

Expected: PASS.

### Task 3: Account-scoped optimistic vote outbox

**Files:**
- Create: `app/settings_poll_vote.ts`
- Create: `tests/settings_poll_vote.test.ts`

- [ ] **Step 1: Write failing outbox tests**

```ts
it('records the first local choice and keeps it during retries', async () => {
  const first = await submitSettingsPollVoteOptimistically('account-a', 'poll-1', 'a');
  const second = await submitSettingsPollVoteOptimistically('account-a', 'poll-1', 'b');
  expect(first.optionId).toBe('a');
  expect(second.optionId).toBe('a');
  expect(await readSettingsPollVote('account-a', 'poll-1')).toMatchObject({ optionId: 'a' });
});

it('does not leak votes across account scopes', async () => {
  expect(await readSettingsPollVote('account-b', 'poll-1')).toBeNull();
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npx jest tests/settings_poll_vote.test.ts --runInBand`

Expected: FAIL because the outbox module does not exist.

- [ ] **Step 3: Implement first-choice persistence and idempotent retry**

```ts
const keyFor = (owner: string) => `settings_poll_votes_v1:${encodeURIComponent(owner)}`;

export async function submitSettingsPollVoteOptimistically(
  owner: string,
  messageId: string,
  optionId: string,
): Promise<SettingsPollVoteState> {
  const current = await readSettingsPollVote(owner, messageId);
  if (current) return current;
  const pending = { messageId, optionId, requestId: createRequestId(), status: 'pending' as const };
  await persistVote(owner, pending);
  void flushSettingsPollVotes(owner);
  return pending;
}
```

Cap the outbox, prune completed items with a TTL, use the Firebase Functions wrapper already used elsewhere in the app, and reconcile a server `alreadyVoted` response to the server’s stored option.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npx jest tests/settings_poll_vote.test.ts --runInBand`

Expected: PASS.

### Task 4: Settings card UI and placement

**Files:**
- Create: `components/settings/SettingsMessageSlotCard.tsx`
- Create: `tests/settings_message_slot_card_contract.test.ts`
- Modify: `app/(tabs)/settings.tsx`
- Modify: `app/analytics.ts`

- [ ] **Step 1: Write failing UI contract tests**

```ts
expect(cardSource).toContain('accessibilityRole="radio"');
expect(cardSource).toContain('accessibilityState={{ selected:');
expect(cardSource).toContain('minHeight: 44');
expect(settingsSource.indexOf('settings-message-slot-top')).toBeGreaterThan(settingsSource.indexOf('settings-plus-row'));
expect(settingsSource.indexOf('settings-message-slot-bottom')).toBeLessThan(settingsSource.indexOf('PHRASEMAN'));
```

- [ ] **Step 2: Run the UI contract and verify RED**

Run: `npx jest tests/settings_message_slot_card_contract.test.ts --runInBand`

Expected: FAIL because the card and placements do not exist.

- [ ] **Step 3: Build the accessible information/poll card**

```tsx
export function SettingsMessageSlotCard({ campaign, vote, onVote, theme }: Props) {
  return (
    <View testID={`settings-message-slot-${campaign.settingsSlot}`} accessibilityLabel={campaign.title}>
      <Text>{campaign.title}</Text>
      {campaign.body ? <Text>{campaign.body}</Text> : null}
      {campaign.kind === 'poll' ? campaign.options.map((option) => (
        <Pressable
          key={option.id}
          accessibilityRole="radio"
          accessibilityState={{ selected: vote?.optionId === option.id, disabled: Boolean(vote) }}
          disabled={Boolean(vote)}
          onPress={() => onVote(option.id)}
          style={{ minHeight: 44 }}
        >
          <Text>{option.text}</Text>
          {vote ? <Text>{formatPercent(option.count, campaign.totalVotes)}</Text> : null}
        </Pressable>
      )) : null}
    </View>
  );
}
```

Use existing theme tokens, 16 px outer radius, readable body line height, no white foreground on lime fills, and no close button because these are persistent Settings sections rather than dismissible overlay banners.

- [ ] **Step 4: Hydrate Settings from the synchronous snapshot and refresh quietly**

Initialize state from `peekAppMessagesSnapshot()` plus the pure selector. While `settingsRuntimeActive`, call `refreshAppMessagesSnapshotOnce()` and only update if the selected campaign IDs/counts changed. Wrap late insertion/removal in `animateNextLayoutTransition()`.

Render:

```tsx
<SettingsMessageSlotCard testID="settings-message-slot-top" ... />
```

immediately after the Plus group, and the bottom card after `premiumDetails` but before the brand/version footer. Track treatment/control exposure with existing `experiment_exposure`, and add `settings_message_impression` plus `settings_poll_vote` to `AnalyticsEvent` for campaign/slot IDs only.

When a free user opens Plus from Settings, derive an analytics-safe context from the newest eligible commercial Settings assignment:

```ts
const attribution = settingsSelection.primaryAttribution;
const paywallContext = attribution
  ? `settings_message:${attribution.campaignId}:${attribution.variant}`
  : 'generic';
router.push({ pathname: '/premium_modal', params: { context: paywallContext, source: 'settings_premium' } });
```

The existing paywall pipeline then records `shown`, `cta_click`, `purchase_completed`, and price in `paywall_funnel` under the campaign/variant context without introducing a second purchase implementation.

- [ ] **Step 5: Run UI and selector tests and verify GREEN**

Run: `npx jest tests/settings_message_slot_card_contract.test.ts tests/settings_message_slots.test.ts tests/settings_poll_vote.test.ts --runInBand`

Expected: PASS.

### Task 5: Admin campaign validation, slot publication, and immutable polls

**Files:**
- Modify: `functions/src/admin_app_messages.ts`
- Modify: `functions/src/admin_app_messages.test.ts`
- Create: `tests/settings_message_admin_contract.test.ts`

- [ ] **Step 1: Write failing admin-domain tests**

```ts
it('accepts 2–4 fixed options for a settings poll', () => {
  expect(normalizeAppMessageCreateInput(settingsPollInput(4))).toMatchObject({
    deliverySurface: 'settings', settingsSlot: 'top', voteMode: 'fixed', controlPercent: 10,
  });
  expect(() => normalizeAppMessageCreateInput(settingsPollInput(5))).toThrow('poll_options_count');
});

it('requires a new campaign when a published fixed poll structure changes', () => {
  expect(() => assertSettingsPollEditable(publishedPoll, changedOptions)).toThrow('settings_poll_requires_new_campaign');
});
```

- [ ] **Step 2: Run the focused domain tests and verify RED**

Run: `npm --prefix functions test -- --runInBand src/admin_app_messages.test.ts && npx jest tests/settings_message_admin_contract.test.ts --runInBand`

Expected: FAIL because Settings validation and archival behavior are absent.

- [ ] **Step 3: Extend normalization without changing legacy poll rules**

```ts
const deliverySurface = input.deliverySurface === 'settings' ? 'settings' : 'inbox';
const settingsSlot = deliverySurface === 'settings' ? requireSettingsSlot(input.settingsSlot) : null;
const optionLimit = deliverySurface === 'settings' ? 4 : 6;
const voteMode = deliverySurface === 'settings' ? 'fixed' : 'changeable';
const controlPercent = clampInteger(input.controlPercent, 0, 50);
```

For Settings campaigns require both RU title and RU body/question, translations for every supported locale at publication, and an explicit audience. Preserve the existing 2–6 option behavior for inbox polls.

- [ ] **Step 4: Make publication atomic per slot**

In the create/publish transaction, query active Settings campaigns for the same slot, set them to `{ active: false, status: 'archived', archivedAtMs }`, then activate the new campaign. Reject in-place poll question/option mutation once `publishedAtMs > 0` or `poll.totalVotes > 0`; the admin UI must create a new campaign instead.

- [ ] **Step 5: Run admin tests and verify GREEN**

Run: `npm --prefix functions test -- --runInBand src/admin_app_messages.test.ts && npx jest tests/settings_message_admin_contract.test.ts --runInBand`

Expected: PASS.

### Task 6: Live admin slot controls, translation review, preview, and stats

**Files:**
- Modify: `admin/v2/legacy.html`
- Modify: `tests/admin_v2_app_messages_contract.test.ts`
- Modify: `tests/settings_message_admin_contract.test.ts`

- [ ] **Step 1: Write failing live-surface contracts**

```ts
expect(admin).toContain('id="settings-message-slots"');
expect(admin).toContain('data-settings-slot="top"');
expect(admin).toContain('data-settings-slot="bottom"');
expect(admin).toContain('Верхняя плашка');
expect(admin).toContain('Нижняя плашка');
expect(admin).toContain('adminTranslateMessage');
expect(admin).toContain('Голос после выбора изменить нельзя');
expect(admin).not.toContain('admin/legacy.html');
```

- [ ] **Step 2: Run the admin contracts and verify RED**

Run: `npx jest tests/admin_v2_app_messages_contract.test.ts tests/settings_message_admin_contract.test.ts --runInBand`

Expected: FAIL because the two slot controls are not present.

- [ ] **Step 3: Add two compact independent slot summaries**

Each summary shows slot name, status text, type, audience, control percentage, campaign ID, total votes and per-option counts. For commercial campaigns, load existing `paywall_funnel` rows whose context is `settings_message:<campaignId>:treatment|control` and display treatment/control paywall opens, purchase completions, conversion, and captured price strings separately; label these consented in-app signals rather than exact store revenue. Each card has one `Редактировать` button with a tooltip describing who is affected, when publication takes effect, and how to switch it off. `Отключить` remains a separated secondary/danger action with confirmation.

- [ ] **Step 4: Extend the shared editor**

Add labeled fields for surface, slot, type, audience and control percentage. For Settings polls enforce 2–4 options and display `Голос после выбора изменить нельзя`. Keep RU title/body editable, reuse `autoTranslateAppMessage()` for all seven target languages, leave translations visible for manual review, keep the device-like preview, and change the primary CTA to `Опубликовать плашку` only after validation succeeds.

- [ ] **Step 5: Wire edit/new-campaign behavior and aggregated stats**

`Редактировать` pre-fills the shared editor. If a published poll’s question/options change, create a new campaign ID and preserve the old campaign in the list as archived. The stats renderer reads only aggregate `poll.counts` and `poll.totalVotes`; it never queries or displays voter documents.

- [ ] **Step 6: Run admin tests and syntax checks**

Run: `npx jest tests/admin_v2_app_messages_contract.test.ts tests/settings_message_admin_contract.test.ts tests/admin_single_surface_contract.test.ts --runInBand`

Run: `node scripts/admin-legacy-button-audit.mjs`

Expected: PASS with no new unguarded write path or duplicate admin surface.

### Task 7: Focused integration verification and review

**Files:**
- Review all files changed in Tasks 1–6.

- [ ] **Step 1: Run the full narrow feature gate**

Run:

```powershell
npx jest tests/app_messages.test.ts tests/settings_message_slots.test.ts tests/settings_poll_vote.test.ts tests/settings_message_slot_card_contract.test.ts tests/settings_message_admin_contract.test.ts tests/admin_v2_app_messages_contract.test.ts tests/admin_single_surface_contract.test.ts tests/firestore_rules_security.test.ts --runInBand
npm --prefix functions test -- --runInBand src/admin_app_messages.test.ts src/settings_poll_vote.test.ts
```

Expected: all suites PASS.

- [ ] **Step 2: Run focused TypeScript/build checks**

Run the repository’s narrow app TypeScript command if present; otherwise run the exact Jest transforms above plus `npm --prefix functions run build`.

Expected: no new TypeScript or Functions compilation errors.

- [ ] **Step 3: Inspect dirty-worktree scope**

Run: `git diff -- app/app_messages.ts app/settings_message_slots.ts app/settings_poll_vote.ts components/settings/SettingsMessageSlotCard.tsx "app/(tabs)/settings.tsx" functions/src/admin_app_messages.ts functions/src/settings_poll_vote.ts functions/src/index.ts firestore.rules admin/v2/legacy.html tests/app_messages.test.ts tests/settings_message_slots.test.ts tests/settings_poll_vote.test.ts tests/settings_message_slot_card_contract.test.ts tests/settings_message_admin_contract.test.ts tests/admin_v2_app_messages_contract.test.ts tests/firestore_rules_security.test.ts`

Expected: only the requested feature is present in new hunks; pre-existing user edits remain intact.

- [ ] **Step 4: Perform security and TypeScript review**

Verify: callable requires auth and App Check; direct fixed-vote writes are denied; a transaction cannot increment twice; voter identities never enter admin output; storage is account-scoped; all remote strings render as plain text; slot insertion animates; no timer or permanent Settings listener was added.

- [ ] **Step 5: Commit only owned files if the user worktree permits exact staging**

```powershell
git add -- app/app_messages.ts app/settings_message_slots.ts app/settings_poll_vote.ts components/settings/SettingsMessageSlotCard.tsx "app/(tabs)/settings.tsx" functions/src/admin_app_messages.ts functions/src/settings_poll_vote.ts functions/src/index.ts firestore.rules admin/v2/legacy.html tests/app_messages.test.ts tests/settings_message_slots.test.ts tests/settings_poll_vote.test.ts tests/settings_message_slot_card_contract.test.ts tests/settings_message_admin_contract.test.ts tests/admin_v2_app_messages_contract.test.ts tests/firestore_rules_security.test.ts
git diff --cached --check
git commit -m "feat: add managed settings message slots"
```

Expected: commit succeeds without staging unrelated files. If exact staging would include unrelated hunks from already-dirty shared files, leave the implementation uncommitted and report that explicitly.
