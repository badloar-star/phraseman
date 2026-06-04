# Compass Premium Theme Handover - 2026-06-04

## Direction Lock

- Compass is a separate free-tier default theme, not Graphite.
- Graphite remains the blue `minimalDark` theme.
- Compass visual language: premium dark charcoal mobile UI, cream/champagne 3D enamel/plastic assets, peach/copper bevels, compact squared corners, recessed dark panels.
- Do not use onboarding icons directly in Compass production assets.
- DALL-E is the required source for final Compass theme-specific assets.
- Do not generate assets that are not connected to a real registry or require call.

## Material Tokens

- Shared tokens live in `constants/compassTheme.ts`.
- Shared bevel overlay lives in `components/CompassBevel.tsx`.
- Core palette: `#2F2F31`, `#1F1F21`, `#171719`, `#020304`, `#FFE6B5`, `#F4B978`, `#F2C48D`, `#B4774E`.
- Volume rule: Compass is not considered covered when only color/icon assets change. Connected cards and buttons need visible physical depth: top shelf, lower lip, side rails, inner inset, and stronger bevel contrast.

## Completed / Wired

- Theme separation: `constants/theme.ts`, `components/ThemeContext.tsx`.
- Home/backdrops/core chrome: home menu icons, app backdrops, header glyphs, energy, first lesson sheet, reward modal, premium hero.
- Arena: action icons, knowledge arena, tickets.
- Economy: shards, level gifts, league bonus chest.
- Quiz assets: level cards/logos and completion medal.
- Stats assets: seven Compass stats cards wired through `components/StatsCardArtSurface.tsx`.
- Trainer assets: `assets/images/trainer_theme_icons/compass-premium/{phrases,words,analytics}.webp`.
- Streak assets: fire levels, freeze, and week markers wired through `constants/streakIconAssets.ts` and `app/(tabs)/home.tsx`.
- Paywall material pass: `app/premium_modal.tsx`.
- Theme settings selector: `app/settings_themes.tsx`; Graphite is blue, Compass is separate.
- Shards shop material pass: `app/shards_shop.tsx`.
- Stats chrome/material pass: `constants/statsThemeChrome.ts`, `app/streak_stats.tsx`.
- Trainer dashboard material pass: `app/trainer.tsx`.
- Trainer smart session material pass: `app/trainer_smart_session.tsx`.
- Volume correction pass:
  - `components/CompassBevel.tsx` now uses stronger visible bevel contrast, top highlight, bottom lip, side shade, and inset edge.
  - `components/CompassDepthSurface.tsx` is the reusable visible-depth overlay for Compass cards/buttons.
  - `app/trainer_smart_session.tsx` now has physical top/bottom shelves on the main task card, answer buttons, and Compass primary modal action.
  - `app/trainer_words_session.tsx` now has physical swipe cards, back card, and yes/no controls.
  - `app/trainer_phrases_session.tsx` now has physical translation boxes, assembly box, word-bank tiles, fill-gap options, and check CTA.
  - `app/trainer_arena_session.tsx` now has physical question and answer surfaces.
  - `app/trainer_session_report.tsx` now has physical hero, metrics, secondary CTA, and primary cream CTA.
- Quiz physical-depth pass:
  - `app/(tabs)/quizzes.tsx` now has physical Compass level cards, thematic quiz cards, selected start plates, quiz result rank/XP panels, result CTAs, session answer buttons, answer feedback, explanation panels, and hard-mode check CTA.
  - Existing quiz DALL-E card backgrounds/logos/medals remain connected; this pass only adds physical UI depth around them.
- Inbox physical-depth pass:
  - `components/AppMessagesInbox.tsx` now has physical Compass modal panel, close/back controls, message rows, VIP survey CTAs/cards, poll cards/options, and reaction buttons.
  - Existing Compass message glyph remains connected; this pass only adds physical UI depth around inbox surfaces.
- Analytics/modal physical-depth pass:
  - `app/phrase_analytics_screen.tsx` now has physical Compass category rows, lesson rows, premium gate panel, premium gate CTA, insight block, tabs, selected tab plate, phrase rows, and phrase badges.
  - `components/QuizTimeoutModal.tsx` now has a physical Compass timeout card and cream primary action.
  - `components/NoEnergyModal.tsx` now has a physical Compass no-energy card, shard restore action, and close/return action.

## Current Verification

- `npx tsc --noEmit --pretty false` passed after trainer dashboard changes.
- `npx tsc --noEmit --pretty false` passed after trainer smart session changes.
- `npx tsc --noEmit --pretty false` passed after the volume correction pass.
- `npx tsc --noEmit --pretty false` passed after trainer words/phrases/arena/report physical-depth wiring.
- `npx tsc --noEmit --pretty false` passed after quiz physical-depth wiring.
- `npx tsc --noEmit --pretty false` passed after inbox physical-depth wiring.
- `npx tsc --noEmit --pretty false` passed after phrase analytics, quiz timeout, and no-energy physical-depth wiring.

## Next Priority

1. Move the visible-depth rule into profile/settings subpanels and any remaining home/lesson secondary modals that still read as flat.
2. Audit already-touched Compass screens visually and strengthen any surfaces that still read as color-only.
3. Keep Graphite blue and untouched.
4. Run `npx tsc --noEmit --pretty false` after each wiring pass.
