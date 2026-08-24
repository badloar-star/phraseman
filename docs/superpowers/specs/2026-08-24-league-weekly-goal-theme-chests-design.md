# League Weekly Goal Theme Chests — Design

## Goal

Replace the temporary raster fallback inside the league card «Общая цель недели» with a new, theme-specific chest for every selectable interface theme.

The new series remains recognisably a reward chest, but must not resemble the existing `weeklyBank` family: no square safe silhouette, circular vault door, dominant front lock, or repeated gem-encrusted treatment.

## Approved art direction

All nine assets use a three-quarter view, a slightly open lid, and light emerging from inside. The transparent background, framing, scale, and rendering finish make them feel like one family. Silhouette, construction, material, hardware, and inner light make every theme unique.

| Theme | Chest concept |
| --- | --- |
| `indigo` | Elongated celestial travel coffer in indigo lacquer, arched lid, fine lavender trim, soft moonlight. |
| `sagePorcelain` | Rounded porcelain chest with sage brushwork, small brass hinges, warm cream light. |
| `olive` | Dark olive expedition chest with leather corners, aged champagne hardware, calm amber light. |
| `midnight` | Asymmetric lunar obsidian chest with a crescent-like lid edge and cold cyan light. |
| `ember` | Low forged basalt chest with irregular iron ribs, a heated seam, and orange-gold firelight. |
| `aurora` | Frosted translucent glass chest with a wave-shaped lid, pearlescent hardware, and turquoise-pink aurora light. |
| `volt` | Low angular graphite energy case with sharp cuts, an exposed hinge, acid-yellow channels, and a bright pulse. |
| `dark` | Carved black-wood forest reliquary with dark-green leaf-like metalwork and rich emerald light. |
| `gold` | Black piano-lacquer jewellery coffer with restrained champagne trim and warm white-gold light. |

Global exclusions: no text, logos, watermarks, loose coins, gem scatter, characters, background scene, circular safe door, or copied shape from the current assets.

## Generation and asset pipeline

Use Codex built-in image generation only; it does not read or spend the project's OpenAI API credential. To respect the repository's in-thread bulk-image safety rule, generate the nine concepts as three tightly specified three-panel source sheets:

1. `indigo`, `sagePorcelain`, `olive`
2. `midnight`, `ember`, `aurora`
3. `volt`, `dark`, `gold`

Each panel contains one isolated chest with generous gutters and no labels. Crop the panels deterministically, inspect each chest, and request a targeted replacement only if a panel violates its theme or the shared constraints.

Keep raw sheets and intermediate crops under `.codex-tmp/league-weekly-goal-chests/`. Only final, alpha-preserving, tightly cropped WebP files belong in the app bundle:

`assets/images/league/weekly-goal/<theme>.webp`

Final assets are square, visually centred, legible at 44 px, and compressed at approximately WebP quality 70–78. The old tournament `weekly-bank.webp` files are not overwritten or removed.

## Runtime architecture

Create a dedicated league registry, `components/league/leagueWeeklyGoalAssets.ts`, containing one static `require()` for each `ThemeMode`. This keeps league art independent of `components/ui/v2_theme_assets.ts` and satisfies the repository's wire-first asset hygiene contract.

`LeagueBonusMission` reads `themeMode`, resolves the local asset through the registry, and renders it with `expo-image` inside the existing `LeagueChestRing`. The image is decorative because the surrounding pressable already names the action and the ring exposes progress semantics. The current vector fallback remains behind the image as a defensive runtime fallback; it is not the normal visible state.

No data model, Firestore collection, field, economy contract, Jarvis reader, admin surface, or Learning V2 content changes.

## Display behaviour

- Render at 44–48 px inside the existing 78 px progress ring.
- Preserve transparent edges and use `contentFit="contain"`.
- Do not add a looping animation. Existing card entrance motion remains unchanged and reduced-motion behaviour remains intact.
- The art must retain a clean silhouette in both incomplete and claim-ready card states.
- Bright green claim-ready surfaces continue to use the existing dark foreground tokens.

## Failure handling

Static `require()` calls make missing bundled files fail during development/build verification rather than silently selecting another theme. A complete `Record<ThemeMode, ...>` prevents a theme from being omitted. If image rendering fails at runtime, the existing vector fallback remains visible and all chest actions and progress semantics continue to work.

## Verification

1. Asset contract: exactly nine theme keys and nine existing static files.
2. Image contract: square dimensions, alpha channel, bounded file size, no raw source files under `assets/images/**`.
3. Component contract: `LeagueBonusMission` uses the dedicated registry and `expo-image`; the fallback is not the primary art.
4. Focused test for all `ThemeMode` values and literal static `require()` paths.
5. Visual contact sheet against the nine theme backgrounds, including 44 px previews.
6. Focused lint/type or test gate only; acquire and release the shared heavy-process slot if a Jest or TypeScript process is required.

## Acceptance criteria

- Every selectable interface theme shows its own new open chest in «Общая цель недели».
- None resembles the old square safe/chest family.
- Theme differences are structural, not simple recolours.
- No new unused bundled assets or project OpenAI API spend.
- Existing league progress, claim, boost, accessibility, and navigation behaviour is preserved.
