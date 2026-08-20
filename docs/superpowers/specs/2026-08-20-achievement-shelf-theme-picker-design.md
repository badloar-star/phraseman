# Achievement Shelf Theme Materials and Category Dock

**Status:** Museum Glass revision approved by owner on 2026-08-20

**Surface:** Existing stack route `/achievements_screen`

**Reference interaction:** The upward-expanding floating controls in `app/flashcards/FlashcardsTabBar.tsx`

## Goal

Make the achievement showcase feel native to every interface theme and replace the noisy top category chips with one centered bottom control that expands its category list upward like the Cards section.

## Museum Glass collectible stage

The showcase must feel like a restrained museum display rather than a photographed cabinet, cartoon target, or system slider. It is built entirely from React Native, Reanimated, and `react-native-svg` layers. Its large surfaces and materials come from the active `Theme` tokens, so every current and future theme is supported without a mode-by-mode asset table:

- deep glass stage: `bgCard`, `bgSurface2`, `bgSurface`, and `bgPrimary` with a quiet inner edge;
- shelf top plane: a shallow SVG trapezoid using a restrained `textPrimary` highlight and theme surface;
- shelf front face: a darker SVG trapezoid with a short depth shadow, never a rounded grey pill;
- shelf accent: a low-opacity `accent` edge that belongs to the theme rather than permanent gold metal;
- selected-trophy light: one continuous SVG radial gradient derived from `accent` and `textPrimary`, with transparent outer stops and no visible rings;
- outline and shadow: `border`, `cardShadow`, and `shadowDark`.

The DALL-E showcase image, `ExpoImage` layer, ceiling lamp, rectangular light beam, concentric halo circles, enclosed cavity, and grey pill rail are removed. No replacement raster is generated. The shelf uses SVG paths for a top plane and front face, plus a narrow animated reflection constrained to the top edge. It must read as an interface element rather than a picture inserted into the interface.

The stage remains shorter than the former 300-point cabinet. The selected trophy is the visual hero; neighboring trophies remain partially visible at the horizontal edges. The radial light is centered behind the selected trophy and fades continuously to transparent before reaching its SVG bounds.

## Light and motion

Only two decorative elements animate:

1. The radial light slowly breathes between restrained opacity and scale values over roughly five seconds. It never flashes, rotates, or changes hue.
2. When the selected achievement changes, one narrow reflection travels across the shelf edge once and fades out. It does not loop while the user is idle.

The existing scroll-linked trophy scale and opacity remain. Trophies do not receive an additional perpetual float or bounce. All new values live under `ACHIEVEMENT_SHELF_HYBRID` in `constants/motionHybrid.ts`; the component contains no timing or spring literals. Reduce Motion freezes the radial light at a quiet midpoint and disables the travelling reflection entirely. Infinite animations are cancelled on cleanup.

The achievement itself may keep its collectible artwork and color. Category color must not fill large showcase or detail-card surfaces. The detail card uses theme surfaces and theme accent; category identity may remain as a small icon or restrained marker.

## Category dock

Remove the horizontal top row of `Все / Цепочка / Уроки / Опыт / …` chips.

Add one floating capsule centered above the bottom safe area. It shows:

- a category/layers Ionicon;
- the localized current category name;
- an up/down chevron communicating the open state.

The complete capsule is one touch target, at least 44 points high. It uses only theme tokens and follows the visual proportions of the Cards floating capsule rather than introducing a new button language.

## Upward menu behavior

Tapping the capsule opens a compact vertical list directly above it:

- `Все` is always available;
- only categories represented in the current earned/dev-visible collection are listed;
- each row uses a consistent Ionicon, localized label, and selected checkmark;
- rows appear upward with a short stagger using transform and opacity only;
- tapping a row switches the shelf, closes the menu, and keeps the most recent earned trophy selected within that category;
- tapping the dimmed area outside closes the menu without changing the category;
- Android hardware Back closes the menu before the route; other platforms use the scrim or capsule.

The menu is not a full-width bottom sheet. It deliberately reuses the light, anchored popup model from Cards. Its maximum height is the space between the header and the dock; when all rows do not fit, the rows use an internal vertical `ScrollView` and never cover the header.

## Motion and feedback

- All new motion values live in `constants/motionHybrid.ts` under a named achievement dock token group.
- Normal motion follows the Cards choreography: upward translate, slight scale resolution, opacity, short stagger, no bounce-heavy spectacle.
- Reduce Motion keeps the same interaction but replaces stagger/spring travel with an immediate or short opacity state change.
- Opening and selecting use the existing lightweight haptic path and respect the user haptics preference.

## Accessibility

- The capsule uses `accessibilityRole="button"`, localized label, and expanded state.
- Menu rows use button roles and selected state; color is never the only selection signal.
- Scrim has a localized close label.
- Focus order follows visual order from the nearest menu item upward/downward consistently.
- Text and icons maintain contrast through theme foreground tokens; bright lime/green fills use `correctText` or another dark foreground.

## Layout integration

- The dock is an absolute sibling of the existing scroll content inside the screen safe area.
- Scroll content receives enough bottom padding so the detail card and report button are never hidden behind the dock.
- The existing horizontal trophy carousel, detail modal, pearl claim, sharing, entry routes, and absence of an Achievements bottom-tab destination remain unchanged.

## Components and data flow

1. A pure theme-material resolver converts the current `Theme` into stage, shelf-plane, radial-light, edge, and shadow values.
2. `AchievementShelfCarousel` consumes those materials and owns the Reanimated light/reflection lifecycle.
3. A focused `AchievementShelfStageArt` renders the static SVG radial gradient and shelf geometry without owning carousel state.
4. A focused `AchievementCategoryDock` owns open/close animation, scrim, accessibility, and the upward menu.
5. `AchievementsScreen` owns `shelfCategory`, supplies available categories, and updates the filtered shelf when the dock selects a value.

No achievement definitions, retirement flags, reward accounting, storage keys, or navigation contracts change in this task.

## Verification

- Pure tests cover theme-material derivation and ensure theme tokens drive all large surfaces.
- Source contracts verify there is no `ExpoImage`, DALL-E backdrop import, concentric circle halo, rectangular spotlight, or grey pill rail, and that the Museum Glass SVG stage is present.
- Source/runtime contracts verify that the old top filter is gone, the centered dock and upward menu are present, and `/achievements_screen` is still absent from the bottom tabs.
- Focused achievement shelf, modal, motion-hybrid, and TypeScript checks run after implementation.
- Visual review checks one dark theme, Gold/Olive, one bright theme such as Volt, and one light theme to confirm the shelf has visible depth, the radial light has no rings or rectangular bounds, and the dock remains legible.
