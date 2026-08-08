# Premium motion for the empty collectibles screen

Date: 2026-08-08  
Status: approved visual direction; implementation pending

## Goal

Replace the static empty state on `app/collectibles_screen.tsx` with the approved “Card choreography” motion direction. The result must feel calm and premium, remain legible in every currently selectable Phraseman theme, and never imply that the user owns a collectible that has not actually been awarded.

## Scope

- Animate only the `loaded && ownedCount === 0` branch of the collectibles screen.
- Preserve the existing header, counter, copy, localization, navigation, data loading, storage, and owned-collection rendering.
- Preserve the existing uncommitted copy update in `app/collectibles_screen.tsx`.
- Do not touch Spin/reward files owned by the parallel Spin task.
- Do not animate `ScreenGradient`; its current runtime motion flag remains unchanged.

## Component boundary

Create `components/collectibles/CollectiblesEmptyStateMotion.tsx` and replace the inline empty-state view with this component.

Inputs:

- `theme`: the active `Theme` object from `useTheme()`.
- `themeMode`: the active `ThemeMode`, used only by the existing `getVolumetricShadow()` helper.
- `fonts`: the active scaled font values.
- `title`: localized empty-state title.
- `subtitle`: localized empty-state subtitle.

The component owns presentation and motion only. It does not read storage, collectible state, navigation, or localization.

## Visual design

The final static composition contains three rounded card silhouettes behind the existing `sparkles-outline` icon:

- Rear card: small counter-clockwise rotation, lowest opacity.
- Middle card: small clockwise rotation, medium opacity.
- Front silhouette: almost upright, strongest surface treatment.
- Sparkle icon remains the semantic focus in front of the stack.
- Existing title and subtitle remain centered below the icon.

No card face, title, artwork, fake count, or invented collectible is rendered in the empty state.

## Motion choreography

### Entrance

The entrance plays once whenever the empty-state component mounts:

1. Rear and middle silhouettes rise from 22–30 px below their resting positions with a 60 ms stagger, settling through the existing `MOTION_SPRING.ui` preset.
2. The front silhouette follows, starting at `scale: 0.94` and settling at `1` without a pronounced bounce.
3. The sparkle icon fades and scales from `0.92` to `1` after the stack has established its shape.
4. Title and subtitle fade upward by 8 px with a short stagger.

The entrance completes within 720 ms from mount.

### Idle motion

After the entrance, only the two rear silhouettes perform a quiet alternating drift:

- Vertical travel: maximum 2 px.
- Rotation travel: maximum 0.6 degrees.
- Cycle: 4.8 seconds, with the second rear card delayed by 600 ms.
- No full-scene reset, pulse, shimmer, particle burst, or infinite icon bounce.

The idle loop runs only when `useRuntimeActive()` is true and reduced motion is disabled. It is cancelled on blur, app backgrounding, unmount, or a live reduced-motion change.

### Reduced motion

When `useReduceMotion()` is true, render the final static composition immediately. Do not start entrance delays or infinite loops.

## Theme contract

The component must not contain theme-specific branches or hard-coded palette colors. It consumes the current runtime theme roles already used by the screen:

- Card surfaces: `theme.bgCard`, `theme.bgSurface`, `theme.bgSurface2`.
- Text: `theme.textSecond`, `theme.textMuted`.
- Icon: `theme.textMuted`.
- Borders: `theme.border`, `theme.borderLight`.
- Depth: `getVolumetricShadow(themeMode, theme, 1)`.

This automatically covers the current selectable themes from `app/settings_themes.tsx`: `indigo`, `sagePorcelain`, `midnight`, `ember`, `aurora`, `volt`, `dark`, and `gold`.

## Performance

- Use React Native Reanimated transforms and opacity only.
- Do not animate width, height, margins, layout, blur, gradients, or shadows.
- Keep the silhouette count fixed at three and avoid image assets.
- Stop repeating work whenever the screen or app is inactive.

## Accessibility

- The decorative stack and icon are hidden from the accessibility tree.
- The title and subtitle remain readable as normal text.
- The component exposes a stable root `testID` for deterministic UI verification.
- Reduced-motion changes are respected live through the existing hook.

## Verification

Add a focused contract test that verifies:

- The screen uses `CollectiblesEmptyStateMotion` only in the loaded empty branch.
- The component imports and uses `useReduceMotion` and `useRuntimeActive`.
- Repeating motion is gated by both runtime activity and reduced motion.
- Theme colors come from semantic theme fields and there are no hex/rgb color literals in the component.
- The original localized title and the approved subtitle remain present in `collectibles_screen.tsx`.

Run the focused Jest test, TypeScript typecheck, and ESLint for the changed source files. Manual acceptance should check the empty state in all eight selectable themes and with reduced motion enabled.

## Acceptance criteria

1. The empty collection has a visible one-shot premium entrance and a very subtle idle card drift.
2. The motion uses the approved card-choreography direction and does not fabricate owned content.
3. All eight current app themes render through their actual runtime tokens with sufficient contrast.
4. Reduced motion produces a complete static composition with no loop.
5. Navigating away or backgrounding the app stops repeating animation work.
6. Existing collection behavior, localization, counter, and the two pre-existing uncommitted edits remain intact.
