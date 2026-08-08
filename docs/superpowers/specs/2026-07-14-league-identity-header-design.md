# League identity header design

## Goal

Make the active weekly league immediately identifiable without adding another card or changing league behavior.

## Approved UI

- The navigation header keeps the back button and replaces the generic `League of the week` title with the localized name of the active league from `myLeagueId`.
- The right-side trophy in the `LeaguePodium` heading is replaced with the active league's existing bundled heraldry image.
- The winner and crown trophy markers inside the podium remain unchanged because they represent achievement, not league identity.
- No new assets, network requests, animations, or persistent state are introduced.

## Data flow

`club_screen.tsx` already resolves `myLeague` from cached and refreshed league state. It will continue to use `leagueNameForLang(myLeague, lang)` for localized text and pass the rendered `LeagueIcon` to `LeaguePodium`. When the active league changes, both the title and heraldry update from the same source.

## Component boundary

`LeaguePodium` receives a non-interactive `leagueIcon` visual prop. The screen owns league lookup, localization, theme-aware fallback behavior, and image selection. The podium remains responsible only for layout.

## Accessibility and layout

- The visible title names the active league for sighted users.
- The header title is allowed to shrink to fit narrow devices without overlapping the back button.
- The decorative podium heraldry is hidden from the accessibility tree because the active league is already conveyed by the header text.
- Existing touch targets, scrolling, reduced-motion behavior, and contrast rules remain unchanged.

## Verification

- Add focused source contracts proving that the header uses the active localized league name and the podium receives the existing league asset renderer.
- Prove the generic podium heading trophy is removed while the separate crown/winner trophy marker remains.
- Run the league hub composition contract, league icon asset/alignment contracts, and a focused TypeScript check if the repository provides a narrow safe command.

## Acceptance criteria

1. A user currently in the Silver league sees the localized equivalent of `Silver league` in the navigation header.
2. The top-right visual in the podium heading is the Silver league heraldry, not a generic trophy.
3. Moving to another league updates both title and heraldry automatically.
4. Crown ownership and podium behavior are unchanged.
