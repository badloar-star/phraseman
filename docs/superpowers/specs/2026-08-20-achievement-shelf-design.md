# Achievement Shelf Design

**Status:** owner-approved visual direction, pending owner review of this written spec  
**Date:** 2026-08-20  
**Surface:** existing `/achievements_screen` route  

## Goal

Turn achievements from a dense grid of similar badges into a desirable collection of physical-looking relics that users want to earn and keep on a personal shelf.

The approved interaction is a horizontal trophy carousel beneath one fixed overhead spotlight. Trophies move under the light; the light and shelf stay fixed. The centered trophy snaps into focus, becomes fully illuminated, and grows slightly. Neighboring trophies remain partially visible, smaller, and dimmer so the horizontal gesture is obvious.

## Owner Decisions

- Use the dark collector-shelf direction shown in the approved DALL-E concept.
- Keep one fixed spotlight at the horizontal center. Do not animate a separate light for every trophy.
- Use horizontal snap scrolling for trophies.
- Preserve the premium physical-material language: blackened metal, restrained brass, enamel, porcelain, glass, and limited warm wood.
- Do **not** add an Achievements item to the app's bottom tab bar.
- Keep `/achievements_screen` as an ordinary stack screen opened through existing entry points, including the statistics screen and achievement notifications.
- This design does not authorize removal of achievement definitions or earned history. Catalog retirement and asset deletion remain a separate, explicitly reviewed change.

## Screen Structure

### Header

The existing stack header behavior remains: back action, localized `Achievements` title, and earned-count summary. It inherits typography and colors from the active app theme.

No bottom-tab item is added for this screen. If the app tab bar is visible because of surrounding navigation behavior, it must not contain a new Achievements destination.

### Category Filter

A compact horizontal row of category pills appears below the header. Pills use the existing achievement categories and localized names. Touch targets are at least 44 by 44 points. The selected pill uses the active theme accent; lime-filled pills always use a dark foreground.

Changing category updates the trophy track and centers the most recently earned trophy in that category. If the category has no earned trophies, the current localized empty state is shown instead of an empty carousel.

### Shelf Viewport

The shelf is a dedicated dark exhibition module within the themed screen rather than a photorealistic room. It uses a graphite/black lacquer body, restrained antique-brass trim, and only a thin warm material inset.

The shelf background and its overhead rail are fixed. One soft spotlight is fixed at the horizontal center. Trophy items scroll horizontally above the fixed shelf plane.

The initial selected item is the most recently earned visible trophy. The list includes enough horizontal inset to center the first and last items. Neighboring trophies remain partially clipped at the viewport edges to communicate horizontal scrolling without arrows or instructional text.

### Selected Trophy State

The centered trophy:

- snaps to the spotlight center;
- renders at the strongest opacity and material contrast;
- scales only slightly above its resting size;
- receives a restrained contact shadow and rim highlight;
- triggers one light selection haptic only when the snapped index changes.

Neighboring trophies remain readable but use reduced scale, opacity, and highlight intensity. They are not blurred because blur is expensive and reduces silhouette clarity.

### Detail Panel

A compact inline detail panel beneath the shelf reflects the snapped trophy. It preserves the information and actions currently available through the achievement detail presentation:

- localized name and description;
- earned date or progress state when applicable;
- pearl reward state and claim action;
- share action for earned achievements;
- progress value and progress bar when the existing data supports them.

Moving selection updates the panel after the snapped index changes. The panel reserves stable space so switching between trophies does not move the shelf vertically.

### Position Indicator

A small page indicator sits between the shelf and detail panel. It communicates the selected position without becoming a second navigation system. For long collections it uses a bounded window or compact count instead of rendering dozens of dots.

## Art Direction

Each trophy is a collectible object, not a recolored badge. It must have one dominant metaphor and a silhouette recognizable at approximately 80 to 100 points.

Approved examples include:

- Phoenix: a bronze-and-amber bird rising from a repaired ring;
- Absolute mastery: an ivory book supporting a clear glass sphere;
- Mistakes corrected: a ceramic speech form repaired with gold kintsugi;
- Speaking courage: a silver tuning fork with a restrained sound ribbon;
- Clean year: a mechanical hourglass containing a living tree ring;
- League champion: an obsidian stepped tower with a small crown.

Avoid shields, repeated crystals, mandatory laurel wreaths, category-wide monochrome recolors, excessive filigree, neon gaming effects, and tiny decorative elements.

Tiered achievements evolve one base object through materials or meaningful additions instead of creating many unrelated badge images.

Final trophy files are transparent, square WebP assets. Every new bundled file must be wired to a static `require()` before generation and compressed before commit. Raw generations and intermediate crops stay outside `assets/images/**`.

## Theme Behavior

The exhibition module remains predominantly dark across themes so it reads as one special trophy room. Surrounding chrome, text, pills, progress accents, and actions inherit theme tokens.

The shelf asset should be neutral enough to work across all themes. Do not generate one shelf image per theme unless later visual testing proves a real need. This prevents unused asset variants and bundle growth.

## Motion and Performance

The carousel uses a virtualized horizontal list with deterministic snap spacing. Scroll-driven animation is limited to transform, opacity, shadow/highlight intensity, and detail-panel crossfade.

The spotlight is one fixed overlay. It is not duplicated inside trophy items. No real-time 3D, per-item blur, particle system, or moving light source is required.

All motion values come from `constants/motionHybrid.ts`. Implementation should add or reuse a named achievement-shelf token group rather than introduce magic timings or spring values in components. Motion follows the approved Lightguide baseline; reward impact is reserved for the moment a trophy is first earned, not ordinary browsing.

With reduced motion enabled, the carousel still snaps but skips scale travel and animated crossfades. Selection is communicated through static light, contrast, and accessibility state.

Remote trophy art continues to use the existing image-source, disk-cache, prefetch, and fallback behavior. The fixed shelf geometry must render immediately even when trophy art is still loading.

## Accessibility

- Every trophy is an accessible adjustable/list item with localized name, earned state, and position.
- VoiceOver and TalkBack can move to previous and next trophies without relying on a swipe gesture alone.
- Focus follows the snapped trophy and does not jump while momentum scrolling is active.
- All controls meet the 44-point minimum target.
- Selection is not communicated by color alone: position, scale, light, and accessibility state also change.
- Text scaling is supported without covering the shelf or collapsing the detail actions.
- The layout remains usable at narrow phone widths and in planned locales with longer labels.

## Data and Navigation Boundaries

The first implementation reuses `ALL_ACHIEVEMENTS`, achievement state, progress readers, reward claim behavior, sharing, localization, and `/achievements_screen`. It introduces no Firestore schema, economy, Jarvis, authentication, or bottom-navigation changes.

Existing entry points remain valid:

- statistics/streak screen opens `/achievements_screen`;
- achievement notification summary opens `/achievements_screen`;
- the stack route and back-navigation contract remain unchanged.

## Empty, Loading, and Failure States

- No earned trophies in a category: use the existing localized empty-state copy and a quiet unlit shelf, without fake rewards.
- Remote art loading: show the existing intentional fallback silhouette on the correct pedestal.
- Remote art failure: preserve the fallback and keep carousel selection functional.
- Missing progress data: omit the progress row while preserving the panel height contract.
- Reward claim failure: retain the existing recoverable error behavior and do not visually mark the reward as claimed.

## Acceptance Criteria

1. The existing achievement grid is replaced by a horizontally snapping shelf on `/achievements_screen`.
2. No Achievements destination is added to the bottom tab bar.
3. The shelf and spotlight remain fixed while trophy items scroll beneath them.
4. The first and last trophies can be centered; neighboring trophies visibly imply more content.
5. Selection updates the inline detail panel and preserves reward claim and sharing behavior.
6. The screen opens from every existing entry point and returns through the existing back contract.
7. Browsing uses transform/opacity-oriented motion tokens from `constants/motionHybrid.ts` and respects reduced motion.
8. VoiceOver and TalkBack can select previous/next trophies and announce position and earned state.
9. Missing or failed remote art never leaves an empty pedestal or breaks scrolling.
10. The layout is verified on narrow phones, standard phones, large text, and all supported interface locales.
11. New art passes a legibility review at actual in-app size before being accepted.
12. No achievement definitions, earned history, navigation functionality, or reward behavior are removed as a side effect of the shelf implementation.

## Verification Plan

- Focused component tests for snap selection, initial index, category changes, and first/last centering.
- Contract test confirming no Achievements bottom-tab item is introduced.
- Accessibility tests for labels, roles, selected state, and previous/next actions.
- Reduced-motion test confirming scale/crossfade travel is disabled.
- Existing achievement reward, share, locale, image fallback, and navigation tests remain green.
- Visual checks at actual device widths and with trophy assets reduced to their rendered size.
- Performance check during rapid horizontal scrolling with remote and cached art.

## Out of Scope

- Retiring or deleting achievement definitions and earned user history.
- Bulk generation of the final trophy catalog.
- New bottom navigation or new achievement entry points.
- Real-time 3D rendering, physics, rotating trophies, or a movable spotlight.
- Firestore, economy, authentication, or server-contract changes.
