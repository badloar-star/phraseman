# Practice Plus And Instant Animation Design

## Outcome

The Practice dashboard remains visible to every signed-in learner, but every actionable Practice surface is a Plus benefit. Non-Plus learners see the real dashboard together with gold `Plus` badges; tapping an action opens the existing `trainer_limit` paywall. Verified Plus learners keep normal access.

The phrase word-bank must react on touch-down without rendering the same tile twice. A preview may be shown while the finger is down, but committing the tile must clear that preview in the same state transition so React never receives duplicate sibling keys.

## Access boundary

- The dashboard hero, phrase row, word row, every weak-spot card, and the weekly rhythm block display the shared gold `PlusBadge` for non-Plus learners.
- Dashboard actions use one access helper: verified Plus opens the destination; non-Plus opens `/premium_modal?context=trainer_limit`.
- Direct phrase/word session entry and daily-task entry use the same hard Plus boundary. A remote `trainer_modes` free override and the historical daily free-session reservation must not bypass a product requirement that Practice is fully paid.
- Target/source gates still take precedence where content is unavailable.

## Animation boundary

- `onPressIn` still creates the immediate reversible preview with zero press delay.
- `onPress` atomically clears the preview and commits the selected tile.
- The visible answer list de-duplicates by tile slot defensively, so transient event ordering cannot produce duplicate React keys.
- Scroll cancellation clears only the preview and does not commit an answer.

## Verification

- Contract test proves preview is cleared before commit and the visible list cannot contain duplicate slots.
- Navigation tests prove non-Plus access always opens the paywall, including when the remote feature flag says free.
- Dashboard contract test proves all requested surfaces render `PlusBadge` and use the gated action path.

