# Friends Row and Bottom Sheet Simplification

Date: 2026-08-20  
Status: approved design; not yet implemented

## Objective

Replace the visually dense Friends list row with one calm summary and move all
friendship information and actions into a large bottom sheet.

The approved visual direction is **A — minimal row, complete sheet**.

## Product Rules

- The Friends list must not contain a cluster of small action or status icons.
- Tapping the avatar opens the existing player profile card.
- Tapping any other part of the friend row opens the friend bottom sheet.
- Existing behavior is relocated, not deleted: nudge, gift, high five, duel,
  delete, friendship progress, activity status, weekly XP, and streak remain
  reachable.
- The row and sheet use large, readable elements and support long names and
  localized labels without truncation or horizontal overflow.

## Friends Row

Each row contains only:

1. A 56×56 avatar press target.
2. The friend's name as reflowing user text.
3. One secondary line: `N дней вместе` when Together data is available, or a
   neutral localized friend label when the Together kill switch is disabled.
4. A non-interactive disclosure chevron.

The avatar and row body are sibling press targets so their actions cannot
bubble into one another. The row body fills the remaining width and has a
minimum height of 72 px. It has one button accessibility label describing that
it opens friend details. The avatar has a separate label describing that it
opens the player profile.

The list row does not render rank, weekly XP, streak, profile badge, XP bars,
friendship level pills, progress bars, incoming-nudge icons, gift-ready icons,
or action buttons. Information that remains useful is shown in the sheet or in
the existing profile card reached through the avatar.

## Friend Bottom Sheet

The existing Hybrid bottom-sheet foundation remains the single details
surface. From top to bottom it contains:

1. Standard drag handle and a 48×48 close control.
2. Friend avatar, name, and relationship label.
3. A large Together hero: paired avatars, number of days together, current
   level, next-level wording, and one thick progress bar.
4. Large information blocks for weekly XP and streak. Rank may be presented as
   another block when available; profile cosmetics stay in the profile card.
5. A large contextual message when the friend has nudged the user or a gift is
   ready. These states are never represented only by color or a small icon.
6. Full-width vertical action buttons, each at least 52 px high:
   - `Позвать заниматься` or the disabled completed state for today;
   - `Отправить подарок`;
   - `Дай пять` or its selected state;
   - `Вызвать на дуэль` when the route is available;
   - `Удалить из друзей`, visually separated as destructive.

The sheet may scroll on compact devices and at 200% text scaling. The close
control and every action remain reachable. No horizontal action strip, tiny
pill, icon-only action, or clipped label is allowed.

When the Together Remote Config policy is disabled, the same row interaction
still opens the sheet. The sheet omits Together-only days, level, progress,
nudge, and ready-gift sections, while retaining the general friend actions.

## Interaction and Data Flow

- Avatar press calls the existing `openProfile(profile)` path.
- Row-body press selects the friend and opens the details sheet.
- The sheet receives display state from the existing profile and Together
  snapshot; it does not introduce a second source of truth.
- Nudge uses the existing optimistic handler and rollback/error feedback.
- Gift closes the details sheet and opens the existing gift picker.
- High five uses the existing optimistic like handler and in-flight guard.
- Duel closes the sheet before navigating to the existing route.
- Delete closes the sheet only when entering the existing confirmation flow;
  no direct destructive action is added.
- DEV bots use the same sheet and action layout so emulator scenarios exercise
  the production interaction model.

## Error and State Handling

- A failed nudge or high five keeps the user on the sheet and shows the current
  localized feedback path after reverting optimistic state.
- Gift offline, balance, and durable outbox behavior remains unchanged.
- Async actions cannot be triggered twice while their existing in-flight guard
  is active.
- If friend data disappears while the sheet is open, the sheet dismisses
  without rendering stale or fabricated friendship values.
- The Together kill switch hides Together-only mechanics without changing the
  avatar/profile and row/details interaction split.

## Visual and Motion Contract

- Existing theme tokens remain the color source; lime/neon filled primary
  actions use a dark foreground.
- The list emphasizes whitespace, one clear disclosure affordance, and a
  minimum 16 px readable name size.
- The sheet continues to use `HybridSheetShell` and shared Motion Hybrid
  tokens. No local springs, looping animations, or new modal implementation are
  introduced.
- The only motion in the row is the existing press feedback and list entrance;
  no pulsing action icon remains in the row.

## Verification

Focused tests must prove:

- avatar press opens the profile card and does not open the details sheet;
- row-body press opens the details sheet and does not open the profile card;
- no row action/status test IDs or compact action cluster remain;
- the sheet exposes nudge, gift, high five, duel, and delete through large
  vertical controls;
- weekly XP, streak, Together progress, incoming nudge, and gift-ready state
  appear in the sheet when available;
- Together-disabled fallback still opens a general friend sheet without
  Together-only content;
- all controls have appropriate accessibility roles, labels, and at least a
  44×44 effective target;
- 200% text scaling and compact Android width do not clip labels or create
  horizontal scrolling;
- existing Friends Together client, function, gift, nudge, and DEV-bot focused
  contracts remain green.

Finish with a manual Android emulator pass covering the avatar/profile route,
the row/sheet route, every sheet action, long names, incoming state, gift-ready
state, and the Together-disabled fallback.

## Non-Goals

- No change to friendship thresholds, chest economics, gift prices, XP boosts,
  server callables, Firestore schemas, or Remote Config values.
- No new player-profile surface; the current profile card is reused.
- No removal of duel, gift, nudge, high five, delete, DEV bots, or accessibility
  behavior.
- No deployment as part of the design or implementation unless separately
  requested.
