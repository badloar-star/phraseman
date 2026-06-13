# Weekly Compass Icons

Generate these DALL-E assets one theme at a time. Do not batch all themes in one image.

The expected output files are:

- `minimalDark.webp`
- `dark.webp`
- `gold.webp`
- `coral.webp`
- `midnight.webp`
- `ember.webp`
- `aurora.webp`
- `volt.webp`

Prompts and generation order live in `constants/weeklyCompassIcons.ts`. After a file is approved, add its `require(...)` to `GENERATED_COMPASS_ICON_SOURCES` for that theme.
