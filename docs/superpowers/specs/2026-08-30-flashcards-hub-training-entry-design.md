# Flashcards hub and training entry redesign

Date: 2026-08-30  
Status: owner-approved visual design
Selected visual direction: C, “compact horizontal library list”

## Context

The Cards tab currently opens directly into Saved cards. This makes Saved behave as both the section root and one library destination, while My Packs and Community Packs live behind the Cards tab-bar menu. Training modes are mixed into the same tab bar.

The owner wants Cards to open on a real section hub. Saved must become a separate destination, alongside My Packs and packs created by other users. The hub must keep the existing three best community packs at the top and make card training the primary action.

This design supersedes only the root-entry and mode-entry portions of `2026-08-21-flashcards-navigation-contract-design.md`. Its ready-before-open pack snapshot, ownership checks, deterministic Back ordering, and no-half-mounted-pack requirements remain authoritative.

## Goals

1. Make `/flashcards` a dedicated Cards hub instead of the Saved collection.
2. Keep the three best community packs visible at the top of the hub.
3. Give Saved, My Packs, and User Packs three equal, explicit library destinations.
4. Put one clear full-width training action below the library list.
5. Open an animated bottom sheet with four primary modes: Blitz, Oral, True / False, and Listening.
6. Open a full screen—not another sheet—for choosing one or more whole packs before any mode starts.
7. Preserve existing Cards features, routes, pack ownership checks, creation flows, direct links, and data-loading safeguards.

## Non-goals

- Do not redesign individual flashcards, pack-detail screens, session gameplay, or result screens.
- Do not change community pack ranking, ownership, likes, additions, moderation, or Firestore schemas.
- Do not add a card-count or session-size picker to the new setup screen.
- Do not delete Errors. It remains available through its existing practice entry and route.
- Do not change the speech remote kill switch or bypass it.
- Do not prefetch every community pack’s cards.

## Selected hub design

### Header

The hub keeps the Cards title and removes the old Cards tab bar. The only action in the hub header is a `+` button. It pushes `/community_pack_create` and therefore reuses the existing create-pack access gate and draft handling. The hub does not show a balance chip. The page uses current theme and typography tokens across all themes.

### Best community packs

The first content section is `Лучшие наборы` and contains the existing three-tile `SavedTopCommunityPacks` presentation:

- exactly three tiles when at least three eligible packs exist;
- ranking remains likes descending, additions descending, stable ID tie-break;
- an already-added pack remains visible and marked as owned;
- tapping a tile opens its pack detail through the existing ready-before-open snapshot contract;
- when no eligible data exists, the section is absent—no skeleton, empty strip, or invented packs;
- the hub reuses already-loaded catalog data and must not introduce duplicate Firestore reads.

### Library destinations

Below the best packs is the section heading `Ваши карточки` and a vertical list of three compact full-width horizontal rows. Each row has an icon on the left, two lines of text, and a chevron on the right:

1. `Сохранённые` — opens the Saved collection.
2. `Мои наборы` — opens owned, added, and authored packs.
3. `От пользователей` — opens the community catalog.

The full row is tappable and at least 44 points high. Labels wrap rather than truncate in supported locales.

### Training action

Below the three library rows is one full-width button labelled `Тренироваться с карточками`. It opens the animated mode sheet. The button uses a dark foreground on lime, salad, or neon-green fills according to the repository contrast rule.

## Destination screens

### Saved

The Saved screen is the current collection surface at `/flashcards_collection?cat=saved`, without the best-community-packs showcase because that showcase now belongs to the hub.

It preserves:

- search and filters;
- list/deck display behavior;
- card audio, edit, delete, and undo;
- the existing limits and paywall behavior;
- existing card creation remains reachable from its current collection/editor flows;
- direct links to a saved card or pack.

Back returns to the Cards hub.

### My Packs

The existing `/flashcards_my_packs` surface remains the destination. It preserves owned, added, and authored packs, edit and publish state, search, and ready-before-open behavior.

Back returns to the Cards hub. New pack creation is owned by the single `+` action in the hub header.

### User Packs

The existing `/flashcards_packs` community catalog remains the destination. It preserves search, sort, likes, additions, ownership, reporting, moderation visibility, and ready-before-open behavior.

Back returns to the Cards hub.

## Training mode sheet

Tapping `Тренироваться с карточками` opens a Cards-owned modal bottom sheet above the hub. The hub remains visible under a dimmed backdrop.

The sheet has a grabber and four wide horizontal rows. It has no heading or explanatory subtitle. Each row has an icon, title, concise product-benefit description, and chevron. Rows use the sheet's standard outer gutter without a second nested horizontal gutter.

### 1. Blitz

- Label: `Блиц`
- Description: `За 60 секунд находи верные переводы и вспоминай быстрее.`
- Session route after setup: `/flashcards_blitz_session`

### 2. Oral

- Label: `Устно`
- Description: `Повторяй фразы вслух и говори увереннее без пауз.`
- Session route after setup: `/flashcards_speaking_session`
- When the speech kill switch is disabled, this row is absent rather than opening a dead screen.

### 3. True / False

- Label: `Правда / ложь`
- Description: `Сверяй фразу с переводом и сразу проверяй память.`
- Session route after setup: the existing card-training route `/flashcards_swipe`
- This is a new user-facing name and setup entry for the existing card training flow; it is not a second duplicate trainer.

The sheet consumes Android Back before the route changes. Tapping the backdrop or swiping it down closes it. Selecting a mode closes the sheet and pushes the full-screen pack picker.

### 4. Listening

- Label: `Слушать`
- Description: `Слушай фразы подряд и понимай их без подсказки.`
- Session route after setup: `/flashcards_listening_session`
- It reuses the existing listening session and the shared whole-pack setup; no duplicate listening implementation is introduced.

## Full-screen pack picker

The four modes share one reusable full-screen setup surface with mode-specific title, description, and start label.

Examples:

- `Наборы для блица` / `Начать блиц`;
- `Наборы для устной тренировки` / `Начать устно`;
- `Наборы для «Правда / ложь»` / `Начать тренировку`.

### Pack list

The list contains every eligible whole-card source for the active study target:

1. `Сохранённые` as a first-class synthetic pack;
2. authored packs;
3. added/owned packs, including community packs;
4. other existing eligible sources already produced by `loadFcDeckOptions`.

Unavailable, empty, wrong-target, hidden, or no-longer-owned packs must not be selectable.

### Selection rules

- Selection is multi-select with checkboxes.
- A whole pack is included or excluded; there is no per-card selection.
- There is no card-count or session-size control.
- The summary reports both selected pack count and the deduplicated card total.
- Start is disabled when no pack is selected or the deduplicated card total is zero.
- Blitz keeps its existing minimum-card validation and explains an insufficient combined pool inline.
- The last valid per-mode pack selection may be restored, but stale IDs are filtered out.
- If no previous valid selection remains, Saved is preferred when non-empty; otherwise the first eligible non-empty pack is selected.

Starting passes all selected deck IDs to the existing route builders. The session receives the entire deduplicated union of selected packs. A retry cannot silently change the selected packs.

### Loading and errors

- Deck options load only after a mode is selected; opening the hub does not pay this cost.
- While sources load, the picker reserves stable row geometry and shows a quiet loading state.
- A load failure keeps the user on the picker and offers Retry; it never starts an empty or fallback session.
- If a selected pack disappears before Start, the picker removes it, updates the summary, and explains the change without navigating.

## Navigation contract

1. Home → `/flashcards` opens the new hub.
2. Hub → Saved, My Packs, or User Packs pushes one child route.
3. Back from any of those three roots returns to the hub.
4. Back from the hub returns to Home.
5. Training button → mode sheet does not change the route.
6. Mode choice → full-screen picker pushes one route.
7. Back from the picker returns to the hub; it does not reopen the sheet.
8. A visible sheet or overlay always consumes Back before screen navigation.
9. Opening a specific pack remains hierarchical and returns to the exact list that opened it.
10. Repeated Back must not cycle among Cards roots.

The old three-position Cards tab bar is removed from the Cards hub, Saved, My Packs, and User Packs surfaces. Its functions are replaced as follows:

- collection navigation → hub library tiles;
- create pack → the single `+` button in the hub header;
- existing card creation → existing collection/editor entry points;
- community navigation → User Packs tile;
- the requested modes → training button and mode sheet.

No underlying route or capability is deleted as part of removing the redundant navigation chrome.

## Motion

- Hub tiles and hero press feedback: 150–220 ms, transform/opacity only.
- Mode-sheet backdrop: approximately 180 ms fade.
- Mode-sheet entrance: approximately 260–300 ms spring from the bottom.
- Sheet-row stagger is optional and must be omitted on low-power devices.
- Hub-to-child and hub-to-picker transitions use existing Cards navigation motion.
- Reduced-motion mode removes springs and stagger, using an instant state change or short fade.

All animation must run on the UI thread where supported and must not animate width, height, or list layout.

## Accessibility and localization

- All interactive targets are at least 44×44 points.
- Every icon-only action has a localized accessibility label.
- Sheet focus moves into the sheet when opened and returns to the hero CTA when closed where the platform supports it.
- The checkbox state and updated selection summary are announced.
- Color is never the only selected-state signal; checkboxes include a visible checkmark.
- Normal text meets at least 4.5:1 contrast.
- Copy is provided for all nine current UI locales: Russian, Ukrainian, English, Spanish, Brazilian Portuguese, Vietnamese, Indonesian, Turkish, and Polish.
- Text wraps; no required title, description, or tile label is truncated.

## Implementation boundaries

Prefer small, bounded units:

- `FlashcardsHubScreen` owns the option-C horizontal library list, the single create-pack action, top packs, and navigation only.
- `FlashcardsTrainingModeSheet` owns the four-mode presentation and selection event.
- `FlashcardsDeckPickerScreen` owns source loading, multi-selection, summary, validation, and start routing.
- Existing collection, My Packs, community catalog, deck-source, route-builder, ready-snapshot, and session components remain the authorities for their respective behavior.

Do not move pack fetching, ownership validation, or session construction into the visual hub components.

## Verification

### Unit and contract tests

1. `/flashcards` renders the hub and no longer mounts Saved as its root body.
2. Best packs use the existing deterministic top-three selector and create no duplicate catalog load.
3. Each library tile opens its exact destination.
4. Back from each destination returns to the hub; Back from the hub returns Home.
5. The mode sheet exposes Blitz, Oral, True / False, and Listening with localized product descriptions and no heading/subtitle.
6. Oral respects the speech kill switch.
7. Each mode opens the full-screen picker rather than a deck-selection modal.
8. The picker includes Saved plus all eligible authored/owned packs.
9. Multi-select deduplicates cards and rejects zero selected cards.
10. No session-size or card-count selector exists on the picker.
11. Blitz minimum-card validation remains enforced.
12. Existing pack snapshot, ownership, deep-link, creation, collection, listening, error-practice, and session tests remain green.

### Focused visual checks

- 320, 375, and large-phone widths;
- long Russian, Germanic-length English test strings, and all nine real locales;
- light, dark, gold, olive, and neon/lime themes;
- normal, reduced-motion, and low-power modes;
- empty Saved, no authored packs, no community data, and loading/error states;
- keyboard/screen-reader focus on the sheet and picker.

## Acceptance criteria

- Opening Cards shows the hub, not Saved.
- The three best community packs remain at the top when data exists.
- The full-width training button is clear but does not displace the library rows.
- Saved, My Packs, and User Packs are three direct horizontal entries.
- No Cards tab bar is rendered; the only hub-header action is `+`, which opens pack creation.
- The training sheet contains the four requested primary modes and product descriptions.
- Selecting any mode opens a full-screen pack picker.
- The picker selects whole packs, supports multiple packs, includes Saved, and has no count selector.
- Start uses the complete deduplicated union of selected packs.
- Existing pack, creation, listening, error-practice, deep-link, ownership, and moderation functionality is preserved.
- Back behavior is deterministic and cannot loop among Cards surfaces.
