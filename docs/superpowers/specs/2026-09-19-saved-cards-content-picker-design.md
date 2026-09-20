# Saved cards: content picker design

## Approved outcome

Keep the existing saved-card list, card dimensions, list/deck modes, search, source badges, selection and deletion flows unchanged. Add a compact `All / Words / Phrases` control below the existing search field. When `Phrases` is selected, expose the existing source filter so a learner can narrow the ordinary list to a lesson or `Phrase of the day`.

## Data and interaction

`Flashcard.source` is already persisted. Map `word` and `verb` to `word`; map `lesson`, `dialog`, `daily_phrase` and `video_phrase` to `phrase`; fall back to the target text having whitespace for legacy or future source strings. The selection is UI-only: it must not alter saved cards, their ordering, training behavior or the current card view preference. The existing source filter remains available to non-saved collections and becomes visible for saved phrases only.

## Acceptance criteria

- The content picker reports the counts for the current language contour.
- `Words` and `Phrases` return disjoint saved-card subsets; `All` returns the existing order unchanged.
- Saved phrases can be filtered by a lesson and by `Phrase of the day`.
- The visible `FlashcardListItem` and list/deck geometry are unchanged.
- Search still applies after content and source filtering.
