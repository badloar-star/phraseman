# Themed Pearl Icons Implementation Plan

**Goal:** Replace the nine selectable application-theme currency icons with a strictly front-facing open shell matching the owner's screenshot, while giving each real theme a visibly separate color gamut.

**Architecture:** Use one approved transparent upright master generated with built-in `image_gen`. Derive nine bundled WebPs deterministically with Sharp using three colors from each `SELECTABLE_THEME_MODES` palette (`shadow`, `mid`, `highlight`). Preserve one shared silhouette and a milky-white pearl. Historical stored modes are migrated by `ThemeContext` before they reach the current nine-mode type.

## Files

- `scripts/build_theme_pearl_assets.mjs` — normalization, palette mapping, WebP export, themed/light/dark contact sheets and miniature QA.
- `app/coin_icons.ts` — exactly nine active mappings.
- `assets/images/currency/pearl_<theme>.webp` — exactly nine final bundled 512×512 assets.
- `tests/currency_icon_assets_contract.test.ts` — wiring, metadata, distinct palette and front-symmetry contracts.
- `.codex-tmp/pearl-audit-upright/` — ignored source, backups and QA artifacts.

## Execution

- [x] Add RED contracts requiring nine distinct palette buckets and alpha asymmetry `<= 0.08`.
- [x] Generate and inspect a master with zero yaw/roll and a centered pearl.
- [x] Extract the nine selectable theme palettes from the theme constants.
- [x] Build nine three-tone variants in selector order and inspect themed, light, dark and 14/18/22/44 px sheets.
- [x] Back up the previous set, install nine wired WebPs and move four unused legacy files to recoverable ignored storage.
- [x] Run the focused currency and runtime preload contracts.
- [x] Run final syntax, asset-inventory and diff-hygiene gates.

## Acceptance criteria

- 9/9 selectable themes point to separate static WebPs.
- Every asset is 512×512, transparent and non-empty.
- The shell is open toward the viewer, nearly mirror-symmetric, and recognizable at 14–22 px.
- All nine average-color buckets are distinct and visually agree with their interface themes.
- No generation source or intermediate is added to `assets/images/**`.
- Focused Jest contracts and final hygiene gates pass.
