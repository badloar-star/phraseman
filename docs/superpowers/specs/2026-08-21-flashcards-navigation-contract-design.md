# Flashcards navigation and ready-first-frame design

Date: 2026-08-21  
Status: owner-approved design, pending written-spec review

## Problem

The Cards section currently mixes three navigation meanings:

- `flashcards`, `flashcards_my_packs`, and `flashcards_packs` are sibling surfaces controlled by one tab-bar slot, but the root native stack animates them like hierarchical pushes from the side.
- Opening a specific pack can mount `flashcards_collection` before a cold community pack has supplied both its cards and metadata. The user briefly sees an incomplete or intermediate collection state.
- screen-local Back handlers, the native stack, modal sheets, and the custom `navigation_back` journal can compete. Back can skip a sheet or revisit sibling Cards surfaces, creating loops.
- ordinary taps on Training, Listening, Speaking, and Blitz still bypass `DeckPickerSheet` and launch from the previous preset. The owner considers this deleted smart-queue behavior.

## Goals

1. Treat Collection, My Packs, and Community Packs as sibling states of one Cards tab-bar slot.
2. Use a short crossfade between those sibling states; never slide them laterally.
3. Never reveal a half-mounted, empty, or fallback pack screen during normal in-app navigation.
4. Make Back deterministic and layered: dismiss the top UI layer first, then the pack, then the Cards section.
5. Open deck selection on every ordinary tap of Training, Listening, Speaking, and Blitz.
6. Preserve the dedicated Errors setup sheet, Plus gate, count, and analytics.

## Non-goals

- Do not combine the three Cards sibling routes into one large persistent component in this change.
- Do not remove any Cards screen, mode, picker, pack source, filter, search, or creation flow.
- Do not change the speech remote kill-switch.
- Do not prefetch every community pack's cards; that would add unbounded reads and memory pressure.
- Do not weaken pack ownership/deeplink validation.
- Do not change the visual layout, typography, colors, or content of the existing screens.

## Selected interaction model

The owner selected visual option A: short crossfade.

### Sibling Cards surfaces

The following routes are same-level siblings:

- `/flashcards` — saved and authored cards collection
- `/flashcards_my_packs` — packs added or created by the user
- `/flashcards_packs` — community pack catalog

Switching among them uses `replace`, not `push`, and a 120–160 ms fade. The tab-bar capsule remains stationary. Lateral slide is forbidden because it implies parent/child depth that does not exist.

When reduced motion is enabled, the sibling replacement uses no animation.

Entering a specific pack remains hierarchical: the pack collection is a child of the exact list from which it was opened.

### Ready-before-open pack contract

Normal in-app pack opening must create a navigation snapshot tied to the selected `packId` and current study target. The snapshot contains enough data for the first rendered frame:

- pack identity and interface metadata needed by the header/theme;
- the pack cards;
- the exact origin (`mine` or `community`);
- the study target used to build the snapshot.

For bundled, local-author, or session-cached packs, the snapshot is synchronous and navigation starts immediately.

For a cold community pack, the tap gives immediate pressed/busy feedback on the source tile, but the source screen remains visible while the one selected pack is fetched. Navigation starts only after the matching snapshot is ready. This avoids both failure modes: navigating to an incomplete screen and prefetching all catalog packs.

If preparation fails or returns no cards, navigation does not start. The source screen stays intact, the busy state clears, and the existing localized error/toast pattern reports the failure.

`flashcards_collection` consumes only a snapshot whose `packId` and study target match its route. A stale response from another tap cannot populate the screen. Direct deep links without a snapshot keep the existing guarded loading/ownership path.

Ownership and preview validation remain authoritative. A ready visual snapshot is not permission and must not bypass `usePackDeeplinkGuard`.

## Back state machine

Back has one strict priority order across the Cards section:

1. Close the top modal sheet (`DeckPickerSheet`, Errors setup sheet, or another Cards-owned modal).
2. Close an expanded tab-bar menu, search overlay, filter dropdown, or deck/list substate owned by the current screen.
3. If a specific pack is open, return exactly to its explicit origin (`mine` or `community`). Direct/deeplink entry uses the documented safe fallback.
4. If one of the three sibling Cards roots is open, leave Cards directly for `/(tabs)/home`.

Back must never use another sibling Cards root as the exit target. Repeated Back must not alternate among `/flashcards`, `/flashcards_my_packs`, `/flashcards_packs`, and a previously opened pack.

The native stack and the custom navigation journal must receive the same semantic operation:

- sibling switch: replace the current Cards root entry;
- pack open: push one child with explicit origin;
- pack close: pop/dismiss exactly that child when possible;
- Cards-root exit: leave the section for Home.

Cards-owned sheets explicitly consume Android Back while visible. Screen-level Back handlers must not navigate beneath a visible sheet.

## Training-mode entry contract

The Training menu keeps these options:

- Errors
- Training
- Listening
- Speaking
- Blitz

An ordinary tap on Training, Listening, Speaking, or Blitz closes the menu and opens `DeckPickerSheet` for that mode. The existing separate picker affordance/long press may remain as an equivalent entry and must not behave differently.

`DeckPickerSheet` continues to source:

- saved cards (`saved`);
- user-created cards (`custom`);
- owned, added, and locally authored packs (`pack:<id>`).

The sheet keeps multi-select, deduplicated card counts, the previous per-mode preset as preselection, session size, localization, reduced-motion behavior, and the existing start routes.

Errors remains separate: it keeps `MistakePracticeSetupSheet`, the ready count, Plus gating, analytics, and its current route.

## Motion and accessibility

- Sibling crossfade duration: 120–160 ms.
- Use opacity only for the sibling transition; no lateral translate, scale, or layout animation.
- Respect the existing reduced-motion source and use an instant replacement when it is enabled.
- Keep the tab bar stationary so the spatial anchor does not move while its content changes.
- Busy feedback on a cold pack is attached to the tapped tile and disables duplicate taps until preparation settles.
- Existing accessible labels, focus order, touch targets, and modal escape behavior are preserved.

These choices follow the UI rules used for this design: sibling state changes should not imply false depth, async content must not jump, and reduced-motion users must retain all functions without forced animation.

## Error and race handling

- Snapshot identity includes `packId` and study target.
- A second pack tap invalidates or supersedes the first preparation result.
- Unmount/blur cancels UI state updates; late network results may populate a bounded cache but cannot navigate.
- Closing a sheet is idempotent and consumes one Back action.
- A failed pack preparation leaves navigation and the current list unchanged.
- Deep links and previews continue through their existing access rules even when no ready snapshot exists.

## Test strategy

Focused regression coverage must prove:

1. ordinary taps for `train`, `listen`, `speak`, and `blitz` open the picker and do not route directly from `getLastPreset`;
2. Errors still opens its dedicated setup flow;
3. deck options include saved, custom, added, owned, and authored sources without the removed `weak` pseudo-deck;
4. sibling Cards changes use replace semantics and fade/no-motion options, not lateral push;
5. a Cards sibling root exits to Home and never selects another sibling as Back candidate;
6. a visible Cards sheet consumes Back before the screen route handler;
7. a pack opened from My Packs returns to My Packs, and one opened from Community returns to Community;
8. a ready snapshot paints pack cards and metadata on the first collection render;
9. a cold community pack does not navigate until its matching snapshot resolves;
10. failed or stale pack preparation cannot open or populate the wrong pack;
11. existing focused Cards tests for deck selection, options, sessions, Errors, collection navigation, and screen animation remain green.

## Acceptance criteria

- No side slide is visible when switching among Collection, My Packs, and Community Packs.
- With normal motion, the sibling switch is a short crossfade; with reduced motion, it is instant.
- Opening any pack through the Cards UI never shows an empty/fallback/intermediate collection frame.
- Back closes a visible modal-list before changing routes.
- Back from a pack returns to the list that opened it.
- Back from any Cards sibling root exits to Home in one action.
- Repeated Back cannot cycle among Cards routes.
- All four card-training modes open the deck-selection modal-list on ordinary tap.
- Errors keeps its existing dedicated behavior.

