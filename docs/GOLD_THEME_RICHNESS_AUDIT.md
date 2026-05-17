# Gold Theme Richness Audit

Date: 2026-05-17

## Verdict

Gold theme is cleaner than before, but it is still too flat. Most gold-specific UI now repeats the same small set of colors:

- main gold: `#D6B35A`
- bright gold: `#F4D987`
- antique gold: `#9F7A2D` / `#B8903A`
- black surfaces: `#030303`, `#070707`, `#0A0A0A`, `#111111`, `#171717`

That makes the theme consistent, but not expensive. A premium gold theme needs material depth: ivory text, champagne highlights, antique gold edges, deep bronze shadows, piano-black panels, graphite surfaces, and restrained metallic gradients.

The goal is not to add random colors. The goal is to add more black/gold roles so every screen has hierarchy.

## Recommended Rich Palette

Use a shared Gold palette instead of redefining local constants in each screen.

```ts
export const GOLD_RICH = {
  blackVoid: '#030303',
  blackObsidian: '#070707',
  blackPiano: '#0A0A0A',
  graphite: '#111111',
  graphiteRaised: '#171717',
  graphiteWarm: '#1A1711',
  bronzeSurface: '#20180B',

  ivory: '#F7F1E4',
  ivoryMuted: '#D8C9A5',
  taupe: '#B8AD92',
  taupeDeep: '#6D6554',

  champagne: '#F6E3A1',
  paleGold: '#E9CE7A',
  metalGold: '#D6B35A',
  antiqueGold: '#B8903A',
  agedGold: '#9F7A2D',
  bronze: '#6E4B14',
  bronzeDark: '#3C2A0B',

  hairline: 'rgba(214,179,90,0.30)',
  hairlineBright: 'rgba(246,227,161,0.34)',
  hairlineDark: 'rgba(110,75,20,0.32)',
  wash: 'rgba(214,179,90,0.11)',
  mist: 'rgba(246,227,161,0.055)',
  bronzeWash: 'rgba(110,75,20,0.14)',
};
```

Suggested material gradients:

```ts
const goldGradients = {
  appBackground: ['#111111', '#050505', '#030303'],
  premiumPanel: ['#1A1711', '#090909', '#151006'],
  quietPanel: ['#131313', '#070707', '#0D0D0D'],
  raisedTile: ['#181818', '#0A0A0A', '#12100A'],
  selectedTile: ['#20180B', '#0A0A0A', '#171106'],
  metallicFill: ['#F6E3A1', '#D6B35A', '#8B661D'],
  progressMetal: ['#9F7A2D', '#F6E3A1', '#D6B35A'],
};
```

## Audit By Area

### 1. Core Theme Tokens

Current issue: `constants/theme.ts` has one main gold and only a few black surfaces. Screens then create their own `goldAccent`, `goldBright`, `goldHairline`, and `goldSoftBg`.

What to improve:

- Add a richer shared Gold palette with named material roles.
- Keep `t.gold` as the main interactive gold, but add richer internal tokens for champagne, antique, aged, bronze, piano black, graphite, and ivory.
- Replace repeated local constants in `home.tsx`, `lessons.tsx`, `daily_tasks_screen.tsx`, and `streak_stats.tsx`.
- Standardize four reusable roles: `goldCard`, `goldBorder`, `goldText`, `goldProgress`.

Priority: critical.

### 2. App Background / ScreenGradient

Current issue: Gold background has black plus low-opacity gold orbs. It is better than brown, but still reads as generic dark wallpaper.

What to improve:

- Use black depth first: void black at the bottom, graphite in the middle, warm black near important headers.
- Add one subtle champagne glint near the top edge, not a large yellow blob.
- Use bronze shadows behind cards, especially on lower panels.
- Keep opacity extremely low so the background feels like material, not decoration.

Priority: high.

### 3. Cards And Panels

Current issue: many cards use the same black gradient and the same gold hairline. This makes premium, normal, selected, and completed surfaces feel too similar.

What to improve:

- Premium card: warm graphite top, piano black center, deep bronze lower edge.
- Normal card: quiet graphite-to-black gradient with low gold border.
- Selected card: brighter champagne top border, antique lower border.
- Disabled/claimed card: colder obsidian surface, aged gold text, less shine.
- Add asymmetric borders: top/left slightly brighter, bottom/right darker.

Priority: critical.

### 4. Home Screen

Current issue: Home now uses Gold colors, but the hierarchy is thin. XP, streak, tiles, CTA, practice card, and bottom navigation all lean on the same gold.

What to improve:

- Main player card should be the showpiece: richer black gradient, champagne rim, antique bottom edge.
- XP progress should use `progressMetal`, not a flat gold fill.
- Daily circles can use champagne for today, metal gold for completed, aged gold for older completed, graphite for empty.
- Feature tiles should not all have the same gold treatment. Use quiet black surfaces and reserve brighter gold for active/important states.
- Practice card can use bronze shadowing because it is a secondary action, not the main hero.

Priority: high.

### 5. Lessons Screen

Current issue: lesson cards became too bright and too uniform. The gold fill risks looking cheap or yellow instead of expensive.

What to improve:

- Completed lessons: use ivory/champagne surface only if they are meant to feel like certificates; otherwise use black cards with gold edge and small gold completion mark.
- Current lesson: metallic border plus deeper black body.
- Locked/future lessons: graphite-black with aged gold labels.
- CEFR sections can be differentiated inside Gold without random hues:
  - A-level: cool graphite + champagne accents.
  - B-level: warm graphite + antique gold accents.
  - C-level: piano black + deep bronze accents.
- Exams should feel like plaques: black surface, antique gold text, medal icons as the only saturated elements.

Priority: critical.

### 6. Daily Tasks Screen

Current issue: cards still carry blue/green/red/pink task moods in places, and the Gold version does not yet have a premium state system.

What to improve:

- Default task: graphite-black surface, metal gold progress.
- Bonus task: champagne highlight and slightly warmer panel.
- Completed task: antique bronze undertone, subdued shine.
- Claimed task: obsidian surface, aged gold label, no bright fill.
- XP badges: gold chrome with ivory text; avoid blue task rewards in Gold.
- Shards: the gem icon can stay colored, but the badge/text chrome should be Gold.

Priority: high.

### 7. Streak / Statistics

Current issue: this screen has strong Gold structure, but several analytics concepts still want different meanings. If every metric is the same gold, the page loses scanability.

What to improve:

- Streak: warm metal gold.
- Freeze: white-gold/champagne instead of blue.
- Balance: champagne ring with graphite center.
- Multipliers: antique gold and bronze shadows.
- Positive status: use bright champagne, not green.
- Warning/missed states: use aged gold or bronze, not orange/red unless it is a true error.

Priority: high.

### 8. Quizzes, Trainer, Arena, Achievements

Current issue: these areas were already flagged in the remaining-color audit because they still use old accent families. When they are converted, do not replace everything with one `t.gold`.

What to improve:

- Quiz difficulty:
  - easy: champagne.
  - medium: metal gold.
  - hard: antique gold / deep bronze.
- Trainer modes:
  - smart review: champagne.
  - weak spots: antique gold.
  - hard drill: deep bronze edge with ivory text.
- Arena:
  - host/ready/winner states should use different metal stops, not blue/green/red.
  - result screens can use a trophy-like black/gold plaque treatment.
- Achievements:
  - category variation should come from icon tone and border style, not unrelated colors.
  - rare achievements can use champagne highlights; common achievements use aged gold.

Priority: critical.

### 9. Buttons And CTAs

Current issue: primary Gold button already has a good metallic gradient, but secondary buttons and ghost controls often look like generic dark UI.

What to improve:

- Primary CTA: champagne-to-metal-to-bronze gradient.
- Secondary CTA: piano-black body, champagne hairline, gold text.
- Destructive/error CTA: stay mostly black with bronze/red-brown edge only if necessary.
- Icon buttons: graphite fill, antique border, champagne icon when active.
- Avoid filling too many controls with yellow/gold; that quickly becomes cheap.

Priority: medium.

### 10. Typography And Text Color

Current issue: `t.gold` is used too broadly. This removes hierarchy.

What to improve:

- `ivory`: main text.
- `champagne`: premium labels, current progress, selected states.
- `metalGold`: primary interactive accents.
- `antiqueGold`: secondary labels and section headings.
- `agedGold`: disabled, claimed, older/completed states.
- `taupe`: body/help text.

Priority: high.

### 11. Borders, Dividers, And Lines

Current issue: the same `goldHairline` appears across multiple screens. Thin lines are good, but not when every line has identical value.

What to improve:

- Use 3 hairline strengths: quiet, normal, selected.
- Top borders can be champagne; bottom borders can be bronze.
- Dividers should often be graphite, not gold.
- Gold borders should mean importance, selection, or premium content.

Priority: high.

### 12. Icons, Rewards, Currency

Current issue: rewards still sometimes carry original purple/blue/pink styling. Some icons can keep their native color, but the surrounding UI should belong to Gold.

What to improve:

- Keep shard/gem color inside the gem icon if recognition depends on it.
- Put reward badges on black/gold chrome, not purple-blue pills.
- Trophy, XP, streak, and premium icons should use champagne/metal/antique variants.
- Inactive icons should use aged gold or taupe, not gray-blue.

Priority: medium.

## Implementation Checklist

- [ ] Add shared rich Gold palette in `constants/theme.ts` or a dedicated `constants/goldTheme.ts`.
- [ ] Replace local Gold constants in `app/(tabs)/home.tsx`.
- [ ] Replace local Gold constants in `app/(tabs)/lessons.tsx`.
- [ ] Replace local Gold constants in `app/(tabs)/daily_tasks_screen.tsx`.
- [ ] Replace local Gold constants in `app/(tabs)/streak_stats.tsx`.
- [ ] Upgrade `ScreenGradient` with richer black/gold material layers.
- [ ] Create reusable helpers for Gold card gradients, borders, text roles, and progress fills.
- [ ] Convert remaining old-color screens from `GOLD_THEME_REMAINING_COLOR_AUDIT.md` using the rich palette, not a single accent color.
- [ ] Re-check screenshots for Home, Lessons, Daily Tasks, Statistics, Quizzes, Trainer, Arena, Achievements, Friends, and Settings.

## Design Rules For The Fix

- Gold should be an accent and material edge, not a giant yellow fill.
- Black should have depth: void, piano, graphite, warm graphite, bronze-black.
- Champagne should be rare and reserved for premium/current/selected states.
- Antique gold should carry secondary information.
- Bronze should live in shadows, lower edges, hard states, and completed/claimed states.
- Avoid green/blue/purple/red except where the actual semantic object needs recognition, such as a gem icon.
- If a screen has many items, use black surface variation first and gold variation second.

## Biggest Risk

The current theme can regress in two directions:

1. Too brown: if bronze surfaces become the base everywhere.
2. Too yellow: if cards are filled with bright gold instead of edged with it.

The premium direction is black-first, gold-edged, champagne-sparing, bronze-shadowed.
