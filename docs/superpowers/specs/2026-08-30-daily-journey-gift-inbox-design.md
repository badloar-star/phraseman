# Daily Journey: delivery animation, gift inbox, and unread entry points

**Owner approval:** 2026-08-30  
**Surface:** React Native Home, Daily Journey modal, Statistics, and the existing Gifts inventory  
**Scope:** the current Dev-only repeated grant path plus reusable runtime contracts for the later once-per-day host

## 1. Outcome

The Daily Journey presentation has no explanatory reward copy and no manual apply/later decision. It shows the ten square rewards for the active chapter, enlarges today's reward, and then automatically delivers that reward into the large Statistics card on Home. The card acknowledges delivery with one restrained pulse.

Delivery creates a real, durable pending gift before the visual flight begins. The reward is not activated at modal-open time. This is especially important for full-energy and bonus-energy rewards: receiving one in the morning must not waste it against an already-full energy bar. The user activates the stored reward later from the existing Gifts inventory.

The only modal control is `Пропустить`. Skipping bypasses the calendar/reveal choreography but still completes the delivery flight and landing acknowledgement. Android back and the accessibility dismiss action have the same semantics as Skip; they cannot discard a committed gift.

## 2. Chosen product flow

The owner selected direct navigation:

```text
new Daily Journey occurrence
  -> durable pending gift committed
  -> modal reveal
  -> reward flies into Home Statistics card
  -> Statistics card pulses once
  -> Home shows Gift entry on the right
  -> tap Gift
  -> existing Gifts inventory opens directly
  -> unread indicator clears after the inventory surface opens
```

The centered Spin entry remains centered. The Gift entry occupies an independent right-hand slot and must not shift the Spin entry when either control appears or disappears.

## 3. Approaches considered

### Chosen: dedicated Daily Journey occurrence journal projected into Gifts

Each grant is its own immutable occurrence with an exact reward payload. A separate immutable claim receipt records activation. The existing Gifts screen consumes a projected pending-item adapter alongside existing level/spin gifts.

This preserves repeated Dev grants, account isolation, crash recovery, later production idempotency, and delayed energy activation without pretending that a daily reward came from a level.

### Rejected: synthetic level numbers

Saving Daily Journey rewards into the level-gift maps under fake or negative levels would be quick but would conflate two sources, risk collisions, leak fake level labels into UI, and make repeated grants overwrite one another.

### Rejected: immediate activation plus history-only UI

Applying rewards as soon as the modal opens would waste energy gifts and would leave the Gifts entry pointing at history rather than something the user can actually use.

## 4. Durable data contract

The source of truth is an account-scoped append-only Daily Journey journal owned by the client economy boundary. It must not write `users/{uid}.shards`, introduce a server-authoritative balance, or depend on the network for local delivery.

### Gift occurrence

```ts
type DailyJourneyGiftOccurrenceV1 = Readonly<{
  schemaVersion: 'daily-journey-gift-occurrence.v1';
  operationId: string;
  ownerStableId: string;
  source: 'daily_journey' | 'daily_journey_dev';
  cycle: number;
  day: number;
  reward: Readonly<{
    kind: 'pearls' | 'runes' | 'spins' | 'energy_full' | 'energy_plus' | 'freeze';
    amount: number;
  }>;
  revision: number;
  createdAtMs: number;
  payloadFingerprint: string;
}>;
```

The same `operationId` with identical bytes replays as success and never creates a second entitlement. Reusing an ID with a different payload fails closed. Every deliberate Dev button press is a new logical grant and therefore receives a new stable ID for that press; retrying that press reuses its ID.

The later production host will derive a deterministic ID from owner, cycle, and day. This task does not turn on the once-per-day production scheduler.

### Claim receipt

Activation writes a prepared intent and then commits the exact effect plus an immutable claim receipt under the existing account/storage lock. The receipt identifies the occurrence operation ID and exact reward. A retry replays the same receipt and cannot apply the reward twice.

The reducer delegates to existing durable grant paths for pearls, runes, spins, stored energy, and freeze inventory. It must not add direct balance writers or a spend-first/grant-later sequence.

### Unread watermark

`pending` and `unread` are separate projections:

- `pendingCount`: occurrences without a valid claim receipt;
- `latestRevision`: greatest valid occurrence revision;
- `seenRevision`: greatest revision visible when the Gifts inventory successfully opens;
- `unreadCount`: valid occurrences with `revision > seenRevision`.

Opening Statistics alone does not clear unread. Opening the Gifts inventory from Home, Statistics, or another route advances `seenRevision` to the snapshot that the mounted inventory actually displayed. A gift arriving concurrently after that snapshot remains unread.

## 5. Modal and delivery motion

### Calendar

- Ten square containers remain per chapter.
- Reward artwork grows from 56% to approximately 78% of the tile.
- No day number, amount caption, reward description, detail card, `Применить`, `Позже`, or close button is rendered.
- Received days remain dimmed with a non-text check state.
- Today's tile remains the only pulsing tile.

### Sequence

1. Commit the pending occurrence.
2. Start the existing first `Игра` intro cue. No other sound is added.
3. Fade in the chapter grid.
4. Pulse and enlarge today's reward.
5. Fade the grid while retaining the enlarged reward and rays.
6. Measure the Home Statistics card target. If it cannot be measured, use a stable top-center fallback.
7. Fly the reward with transform/opacity only: a short lift, a curved-feeling diagonal translation, and scale-down into the target.
8. Close the modal and emit a landing acknowledgement containing the occurrence ID.
9. Pulse the Statistics card once (`1 -> 1.035 -> 1`) without changing layout.

Skip stops the pre-flight sequence and enters step 6. It never stops or reverses the durable delivery.

With reduced motion enabled, the chapter/reveal/flight animation is replaced by a short crossfade. The occurrence, unread state, navigation, and landing acknowledgement remain correct; no infinite pulse runs.

## 6. Home and Statistics entry points

### Home

- Preserve the existing Dev Hub flask and avatar-nudge buttons.
- Add a separate Dev-only gift button in the Home header.
- Each tap creates one real `daily_journey_dev` occurrence, cycles through days 1–50, opens the modal, and may be used repeatedly.
- The control is guarded by `ENABLE_DEV_TOOLS` and cannot exist in a store build.
- If the commit fails or the account changes, do not open the success animation; show recoverable feedback instead.

Below the Statistics card:

- Spin retains the exact visual center and existing behavior.
- Gift uses the same component language and touch target, but sits in an independent right slot.
- Gift appears only while `unreadCount > 0`.
- Its badge shows the unread count, not the total pending inventory.
- Tapping navigates directly to `/level_gifts_inventory`.

### Statistics

The existing top-right gift button and pending-count badge are preserved. When `unreadCount > 0`, add a distinct unread indicator and a restrained hop sequence. The hop stops after Gifts opens, when runtime is inactive, or when reduced motion is enabled. A later occurrence restarts it.

The existing pending count may remain visible after unread clears because the stored gift has not necessarily been activated yet.

## 7. Gifts inventory integration

The existing level and spin inventory behavior remains intact. Daily Journey occurrences are projected as an additional pending-item source and rendered with the same square, asset-led visual language. They do not receive fake levels or mutate the old level maps.

Selecting a Daily Journey item uses its existing large reward art and confirmation/activation flow where one already exists. The Daily Journey modal itself contains no descriptions or activation buttons. This task must not remove descriptions or claim controls from unrelated legacy gift types.

The inventory marks the displayed revision snapshot as seen only after its first successful data load. Loading failure does not consume the unread indicator.

## 8. Accessibility and performance

- All icon-only controls expose localized accessibility labels and at least a 44x44 touch target.
- Unread is not color-only: it has a badge/dot and an accessibility label/count.
- Motion uses native transform and opacity animations; it never animates layout dimensions.
- All loops are lifecycle-bound and cancelled on inactive runtime/unmount.
- Reduced-motion behavior is deterministic and preserves functional state.
- Bright lime/salad controls use dark foreground text/icons according to the project contrast rule.

## 9. Error and recovery rules

- No success presentation before durable occurrence verification.
- Account generation is captured before commit and checked after every async boundary.
- A modal interruption after commit resumes or finishes delivery for the same occurrence; it never creates another grant.
- A failed visual measurement uses the fallback target; it does not roll back the gift.
- A failed seen-watermark write leaves the gift unread, favoring a repeated indicator over silent loss.
- A failed claim leaves the occurrence pending and retryable with the same claim operation ID.

## 10. Test strategy and acceptance criteria

Implementation follows RED -> GREEN -> REFACTOR with focused tests.

1. **Occurrence journal:** account isolation, validation, append-only replay, fingerprint conflict, repeated Dev presses, retry, restart, and account switch.
2. **Claim:** exact reward mapping, prepared-intent recovery, exactly-once application, and no direct balance writer.
3. **Unread:** latest/seen projection, concurrent arrival while inventory opens, failed load, failed seen write, and new gift after prior acknowledgement.
4. **Inventory:** Daily Journey items coexist with level/spin items and do not use synthetic levels.
5. **Home:** Spin remains centered, Gift occupies the right slot, direct route is `/level_gifts_inventory`, and Dev control is store-disabled.
6. **Statistics:** pending badge is preserved; unread indicator/hop starts and stops correctly.
7. **Modal:** large art, no copy/apply/later/close controls, Skip enters delivery, single intro sound, automatic flight and landing pulse, reduced-motion fallback.
8. **Economy guards:** no orphan debit, direct shard writer, server-authoritative ordinary grant, or unstable retry ID is introduced.

Acceptance is complete when a Dev header tap creates one durable pending reward, the modal automatically delivers it, the Home/Statistics unread affordances appear, direct inventory opening clears unread without consuming the gift, and activating the inventory item applies the exact reward once.

No Firestore collection/field change is planned, so Firestore Rules and Jarvis data-contract surfaces should remain unchanged. If implementation reveals a cloud schema change is necessary, work stops and this design must be revised before that change.
