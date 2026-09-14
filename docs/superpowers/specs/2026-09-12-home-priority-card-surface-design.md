# Home priority card surface

Date: 2026-09-12
Status: approved visual direction; awaiting written-spec review

## Goal

Make the shared horizontal home priority card — either the last lesson or “My mistakes” — use exactly the same surface material as the “Lessons” and “Cards” quick-start tiles.

## Approved visual direction

The quick-start tiles are the source of truth for fill, opacity, theme-specific border, bevel, and shadow treatment. The priority card reuses those same values instead of the stronger home panel gradient.

The priority card keeps its existing:

- horizontal shape and 20 px corner radius;
- margins, height, and internal spacing;
- lesson/mistakes illustration;
- title and progress/error counter;
- tap action, long-press toggle, accessibility labels, and analytics;
- theme-specific text colors and gold/olive shadow treatment.

## Theme behavior

- Standard dark themes: use the same `rgba(255,255,255,0.055)` translucent fill as the two quick-start tiles, with no added border.
- Paper/light themes: use the same `t.bgCard` fill and `t.border` one-pixel border as the quick-start tiles.
- Gold theme: use the same `goldPanelBg`, quiet bevel, and existing gold shadow as the quick-start tiles.
- Olive theme: use the same translucent fill and existing olive shadow as the quick-start tiles.

The icon plate inside each square quick-start tile is not copied to the horizontal card; it is part of the square tile’s illustration layout, not its outer surface material.

## Implementation boundary

The change is limited to `app/(tabs)/home.tsx`. Introduce shared surface values used by both the quick-start tiles and the priority card. Replace only the priority card’s gradient surface with a regular themed surface container. Do not change behavior, content, asset mappings, navigation, storage, or data flow.

## Verification

- Add or update a focused source contract proving both the quick-start tiles and priority card use the shared surface token.
- Run the focused home learning CTA/surface tests.
- Inspect the final diff to confirm no unrelated edits in the already-modified home screen are overwritten.
- If the local app/emulator is available, visually check at least the current dark theme; the shared-token contract covers the other theme branches.

## Acceptance criteria

1. “Last lesson” and “My mistakes” render with the same outer fill and opacity as “Lessons” and “Cards”.
2. The former strong blue/secondary panel gradient is absent from this priority slot.
3. The horizontal geometry and all interactions remain unchanged.
4. Light, gold, olive, and standard dark themes preserve their existing quick-start treatment.
5. Focused tests pass and the diff contains no unrelated reversions.
