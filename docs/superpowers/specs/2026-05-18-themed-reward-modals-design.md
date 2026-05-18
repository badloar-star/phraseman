# Themed Reward Modals Design

## Scope

Update the level-up and level-gift modal family:

- `app/_layout.tsx` level-up congratulation modal
- `components/LevelGiftModal.tsx`
- `components/LevelGiftDualModal.tsx`

The reward logic, translations, animation timing, and existing `testID` hooks stay intact.

## Visual Direction

Each app theme gets its own generated reward backdrop instead of sharing one recolored card. The modal foreground remains a readable glass/chrome panel with theme-token text, border, and CTA colors.

Theme identities:

- `dark`: forest archive, emerald learning glow, warm reward light.
- `neon`: black arcade HUD, lime circuit energy, sharp celebration streaks.
- `gold`: black-gold treasury, champagne metal, luxury bevels.
- `coral`: rose-coral studio, warm cocoa shadows, soft celebratory light.
- `minimalLight`: paper sketch desk, graphite marks, restrained gold accent.
- `minimalDark`: graphite study room, cool blue edge light, quiet premium depth.

## UX Rules

- Background images must contain no text, logos, faces, UI, or tiny readable details.
- Text sits on solid/scrimmed surfaces with high contrast.
- Touch targets remain at least the current size.
- Existing native-driver animations remain transform/opacity based.
- Generated assets are project-local and referenced through a small registry.

## Acceptance Criteria

- All six themes resolve a unique modal backdrop.
- Level-up, single-gift, and dual-gift modals use the backdrop without changing reward behavior.
- TypeScript passes for touched files.
- Existing level gift tests still pass or failures are unrelated to these UI changes.
