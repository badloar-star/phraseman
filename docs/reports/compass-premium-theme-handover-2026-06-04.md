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
- Settings physical-depth pass:
  - `app/(tabs)/settings.tsx` now has physical Compass list rows, back button, study-language chips, font-size segmented controls, missing-name banner, VIP card, Premium cards, account modal, account-switch confirm modal, wiping loader, name modal, name input, and name modal actions.
  - This pass keeps the settings layout utilitarian and compact; it adds tactile depth only to real controls and modal surfaces.
- Settings subpanel physical-depth pass:
  - `app/settings_language.tsx` now has physical Compass back/report controls and language rows.
  - `app/settings_notifications.tsx` now has physical Compass back/report controls, schedule rows, day icons, footer hint, and time picker modal.
  - `app/settings_edu.tsx` now has physical Compass back control, toggle rows, speech-speed panel, voice picker trigger, voice chips, and voice disclaimer panel.
  - `app/settings_invite_friend.tsx` now has physical Compass back control, hero gift plate, steps card, step icons, info panel, and bottom invite CTA.
  - `app/settings_themes.tsx` now has physical Compass back/report controls and Compass-current physical theme rows across the selector, while preserving each theme's own swatch identity.
- Thematic quiz asset gap pass:
  - Generated Compass premium topic cards and transparent logos for `kitchen-and-cooking`, `home-and-rooms`, `at-the-doctor`, `body-and-health`, and `shopping-and-money`.
  - Wired these assets into `app/quiz_thematic_registry.ts` and `app/quiz_thematic_dev_registry.ts`, so Compass no longer falls back to older thematic quiz art.
  - Saved the AI source concept sheet at `qa-artifacts/compass-thematic-quiz-source-concept-2026-06-04.png`; final WebP assets are exact-size generated project assets.
- Lesson surface physical-depth pass:
  - `components/PremiumCard.tsx` now has a Compass-specific depth overlay, compact radius, tactile borders, and Compass gradients for shared raised cards.
  - `app/lesson_menu.tsx` now has physical Compass locked-state art, icon wells, progress placeholders, prep hint, lock sheet, and cream CTA.
  - `app/lesson_intro_screens.tsx` now has physical Compass intro cards, icon plates, example boxes, header controls, hint plaque, and cream start CTA.
  - `app/lesson_complete.tsx` now has physical Compass review modal, achievement modal, back control, bonus/rest panels, next/repeat buttons, share controls, and home return surface.
- Shared surface physical-depth pass:
  - `components/ThemedConfirmModal.tsx` and `components/ThemedChoiceModal.tsx` now have Compass modal shells plus cream primary and recessed secondary actions.
  - `components/ui/EmptyState.tsx` now has a Compass recessed card and physical icon plate.
  - `components/ui/PrimaryButton.tsx` now renders Compass cream/champagne material instead of falling back to a flat accent fill.
- Home/app-specific modal physical-depth pass:
  - `app/(tabs)/home.tsx` title selector modal now has a Compass physical shell, close control, segmented tabs, title rows, icon plates, and current badge surfaces.
  - `components/UserWarningModal.tsx` now has a Compass warning panel and cream acknowledgement action.
  - `components/VipSurveyReviewPromptModal.tsx` now has a Compass physical card, close control, star plate, and cream review CTA.
- Notification/report modal physical-depth pass:
  - `components/NotificationPermissionModal.tsx` now has a Compass physical shell, notification icon plate, recessed cancel action, and cream enable action.
  - `components/ReportUserModal.tsx` now has a Compass physical shell, recessed cancel action, and cream send action.
- Auth/delete/release/profile modal physical-depth pass:
  - `components/RegistrationPromptModal.tsx` now has a Compass physical auth shell plus recessed later/debug actions, while preserving branded Google/Apple provider buttons.
  - `components/DeleteAccountConfirmModal.tsx` now has a Compass danger shell, recessed input/footer, recessed cancel action, and copper danger confirm action.
  - `components/UpdateModal.tsx` now has a Compass-specific update palette.
  - `components/ReleaseNotesModal.tsx` now has Compass physical card, hero, pill, chips, feature block, and cream CTA surfaces.
  - `components/PlayerProfileModal.tsx` now has Compass physical sheet, header actions, core non-prestige profile surfaces, and profile-card upgrade CTA while preserving prestige profile-card visuals.
- Home/arena correction pass from visual QA:
  - `app/(tabs)/home.tsx` now uses larger Compass quick-start/activity icons, removes the visible inner icon plate for Compass quick tiles, and allows icon-wrap overflow so large 3D assets do not get clipped.
  - `components/LingmanVideosButton.tsx` no longer uses the Compass YouTube glyph that read as a camera; Compass now renders a compact cream physical play tile with a clear play symbol.
  - `constants/custom_avatars.ts` no longer references missing `custom-XX-logo.webp` files; `custom-01` through `custom-35` now use the existing `custom-idea-XX-black/white.webp` asset pairs, preserving logo color styling and fixing the Metro compile error.
  - `app/arena_lobby.tsx` now uses denser Compass arena panel colors, darker row fills, lower hero art opacity, and stronger scrims so the stage background does not compete with CTA/text elements.
- Specialized modal physical-depth pass:
  - `components/ProfileCardUpgradeModal.tsx` now has Compass physical shell, balance chip, current-level panel, option rows, level ladder rows, and cream/recessed submit states.
  - `components/GlobalBroadcastModal.tsx` now has Compass physical shell, reward block, review note, cream primary action, and recessed secondary action.

## Detailed Continuation Plan

1. Finish any remaining asset coverage only when a real registry or contract test exposes a gap:
   - Search targeted `ThemeMode` asset registries before generating more.
   - Add generated assets only where runtime code consumes them.
   - Preserve Graphite/minimalDark blue assets and all existing theme behavior.
2. Bring remaining UI surfaces to the reference-level physical style:
   - Remaining app-specific modal helpers that are not covered by shared confirm/choice modal components.
   - Small sheets/popovers that still use flat `bgCard`/`bgSurface` in Compass.
   - Buttons use a raised cream/champagne or recessed charcoal material, visible top shelf, bottom lip, inner inset, and compact squared radius.
   - Cards use dark recessed panels with side rails and object art only where the screen already expects bitmap identity.
3. Visual QA after each surface family:
   - Capture representative Compass screenshots for phone widths.
   - Compare against the reference principles: 3D material, not flat gold; compact mobile density; clear CTA hierarchy; no copied brand UI.
4. Verification:
   - Run narrow asset/registry tests after asset work.
   - Run `npx tsc --noEmit --pretty false` after code wiring passes.
   - Keep broad suites/manual visual reports out unless explicitly requested.

## Current Verification

- `npx tsc --noEmit --pretty false` passed after trainer dashboard changes.
- `npx tsc --noEmit --pretty false` passed after trainer smart session changes.
- `npx tsc --noEmit --pretty false` passed after the volume correction pass.
- `npx tsc --noEmit --pretty false` passed after trainer words/phrases/arena/report physical-depth wiring.
- `npx tsc --noEmit --pretty false` passed after quiz physical-depth wiring.
- `npx tsc --noEmit --pretty false` passed after inbox physical-depth wiring.
- `npx tsc --noEmit --pretty false` passed after phrase analytics, quiz timeout, and no-energy physical-depth wiring.
- `npx tsc --noEmit --pretty false` passed after settings main physical-depth wiring.
- `npx tsc --noEmit --pretty false` passed after settings language/notifications physical-depth wiring.
- `npx tsc --noEmit --pretty false` passed after settings edu/invite physical-depth wiring.
- `npx tsc --noEmit --pretty false` passed after theme selector physical-depth wiring.
- `npx jest --runTestsByPath tests/quiz_level_theme_assets.test.ts tests/skyler_quiz_thematic_registry.test.ts tests/quiz_thematic_asset_fallback.test.ts tests/arena_action_icons_contract.test.ts --runInBand --no-cache` passed after Compass thematic quiz asset wiring.
- `npx tsc --noEmit --pretty false` passed after Compass thematic quiz asset wiring.
- `npx tsc --noEmit --pretty false` passed after lesson menu/intro/complete physical-depth wiring.
- `npx jest --runTestsByPath tests/lesson_finish_screen_contract.test.ts tests/lesson_1_intro_screen_contract.test.ts tests/lesson_intro_screens_locale.test.ts tests/lesson_menu_locale_runtime.test.ts --runInBand --no-cache` passed after lesson surface wiring.
- `npx tsc --noEmit --pretty false` passed after shared modal/empty/primary button Compass wiring.
- `npx jest --runTestsByPath tests/lesson_finish_screen_contract.test.ts tests/lesson_1_intro_screen_contract.test.ts tests/lesson_intro_screens_locale.test.ts tests/lesson_menu_locale_runtime.test.ts --runInBand --no-cache` passed again after shared surface wiring.
- `npx tsc --noEmit --pretty false` passed after home title modal, warning modal, and VIP survey review prompt Compass wiring.
- `npx jest --runTestsByPath tests/home_title_selection_source.test.ts tests/home_locale_runtime.test.ts tests/vip_survey_content.test.ts tests/admin_vip_survey_contract.test.ts --runInBand --no-cache` passed after home/app-specific modal wiring.
- `npx tsc --noEmit --pretty false` passed after notification permission and report user modal Compass wiring.
- `npx jest --runTestsByPath tests/client_reports_delivery_contract.test.ts tests/notifications_triggers.test.ts tests/notifications_audit_contract.test.ts --runInBand --no-cache` passed after notification/report modal wiring.
- `npx jest --runTestsByPath tests/report_error_button_locale.test.ts ...` did not start because Jest tried to parse `assets/fonts/Inter-Regular.ttf`; this is a test transform/mapping issue, not a failure in the touched modal code.
- `npx jest --runTestsByPath tests/auth_provider_stable_link.test.ts tests/account_delete_timeout.test.ts tests/account_delete_flow_contract.test.ts --runInBand --no-cache` passed after auth/delete modal wiring.
- `npx jest --runTestsByPath tests/release_update_modals_locale_runtime.test.ts tests/release_notes_modal.test.ts tests/update_check.test.ts --runInBand --no-cache` passed after update/release modal wiring.
- `npx jest --runTestsByPath tests/player_profile_modal_close.test.ts tests/profile_card_system.test.ts tests/arena_friend_profiles_contract.test.ts tests/release_update_modals_locale_runtime.test.ts tests/release_notes_modal.test.ts tests/auth_provider_stable_link.test.ts tests/account_delete_timeout.test.ts tests/account_delete_flow_contract.test.ts --runInBand --no-cache` passed after profile/auth/delete/release/update wiring.
- `npx tsc --noEmit --pretty false` passed after home icon sizing, Lingman play tile, custom avatar asset fix, ProfileCardUpgradeModal partial Compass physical-depth wiring, and arena lobby backdrop contrast correction.
- `npx tsc --noEmit --pretty false` passed after completing ProfileCardUpgradeModal and GlobalBroadcastModal Compass physical-depth wiring.
- `npx jest --runTestsByPath tests/global_broadcast_modal_locale_runtime.test.ts tests/profile_card_system.test.ts tests/profile_card_upgrade_dev_gate.test.ts --runInBand --no-cache` passed after the specialized modal wiring.

## Next Priority

1. Continue visual QA on Compass home/arena after reload: check that quick-start assets are no longer clipped and that the arena card background has enough separation from text/actions.
2. Finish the remaining app-specific modal helper audit, prioritizing `ReleaseWaveBonusModal`, `ShardRewardModal`, `ShardsEarnedModal`, and flashcard paywall modals. Reward modals already use `RewardModalBackdrop`; inspect before changing to avoid duplicate chrome.
3. Complete any remaining Compass asset registry gaps only if found by targeted contract tests or real runtime fallbacks.
4. Audit already-touched Compass screens visually and strengthen any surfaces that still read as color-only.
5. Keep Graphite blue and untouched.
6. Run `npx tsc --noEmit --pretty false` after each wiring pass.
