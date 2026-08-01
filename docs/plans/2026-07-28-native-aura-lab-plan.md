# Native Aura Lab — implementation plan

## Goal

Show five premium aura directions in a real Expo/React Native gallery before touching the live catalog. The gallery and the eventual app integration must import the same renderer and presets, with no HTML recreation, Skia, native dependency, or binary rebuild.

## Acceptance criteria

- Five distinct concepts render from one shared React Native renderer: Prism Oracle, Neon Lotus, Chronosigil, Velvet Eclipse, and Jade Cathedral.
- Every concept combines soft spectral light with deliberate geometric structure.
- Motion uses Reanimated transforms and opacity only; geometry and gradients stay static.
- The renderer uses `react-native-svg` primitives already installed in the app and does not use SVG filters, Canvas, Skia, or image assets.
- The root aura slot remains exactly `size × size`; visual overflow is absolute and non-interactive.
- `motion="static"` allocates no repeating animation; ambient motion cancels and resets when hidden, backgrounded, unmounted, or reduced motion is enabled.
- A production-safe Expo Router gate exposes the lab only when dev tools are enabled.
- Existing aura definitions, ownership, prices, and production `AvatarAura` remain unchanged until visual approval.

## TDD sequence

1. Add focused contract tests for the five immutable presets, unique IDs, native-safe primitive policy, exact slot contract, lifecycle gates, and dev-only route.
2. Run the focused test and observe RED.
3. Add `types.ts`, `presets.ts`, the shared renderer, and the five scene definitions.
4. Add the gated Aura Lab route that imports the shared renderer and presents all five concepts at hero size plus a static thumbnail comparison.
5. Run focused tests, TypeScript checking for touched files, and existing aura/catalog regression tests.
6. Launch Expo Web and visually inspect the real React Native route at desktop and narrow mobile widths before asking for approval.

## Files

- Create `components/avatar-aura/types.ts`
- Create `components/avatar-aura/presets.ts`
- Create `components/avatar-aura/AuraRenderer.tsx`
- Create `components/avatar-aura/AuraScenes.tsx`
- Create `app/aura_lab.tsx`
- Create `app/_aura_lab.tsx`
- Update `constants/devRoutes.ts`
- Create `tests/aura_native_lab_contract.test.ts`

