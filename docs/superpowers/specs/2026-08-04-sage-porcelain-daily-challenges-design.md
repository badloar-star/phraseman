# Sage Porcelain Daily Challenges Design

## Goal

Make the Daily Challenges cards visually native to the light `sagePorcelain` theme without changing any other theme.

## Visual direction

- Replace the six dark category illustrations with six light porcelain-and-jade illustrations generated as one coherent DALL-E master sheet and exported as individual 3:1 WebP assets.
- Keep the left half quiet for the achievement icon and dark title; place the decorative semantic object on the right.
- Use warm porcelain, pale celadon, muted jade, pearl highlights, and restrained champagne-metal accents. No text, logos, fire, lava, black panels, or hard neon.
- Render the task-card base and the day-bonus card as light translucent porcelain surfaces with dark text, sage borders, and subtle theme-colored progress fills.
- Preserve active reward contrast: bright green actions retain a dark foreground.

## Scope

Only `themeMode === 'sagePorcelain'` receives the new assets and light color branch. Existing dark, gold, business, and other theme behavior stays unchanged. The same theme-specific task art is used in task cards and the task detail modal.

## Asset contract

The light set mirrors the existing six slots exactly: `lesson`, `recall`, `words`, `verbs`, `word_trainer`, and `practice`. Final files are 768x256 WebP, statically required by app code, visually distinct, and at most 80 KB each (well below the owner's 500 KB ceiling). The DALL-E source sheet is kept outside the bundled `assets/images/**` tree.

## Verification

Focused contracts verify the static theme map, six-file slot parity, dimensions, WebP format, file-size budget, uniqueness, and both call sites passing `themeMode`. Source-level checks verify the light bonus/task color branch while existing coverage protects all other daily-task behavior.
