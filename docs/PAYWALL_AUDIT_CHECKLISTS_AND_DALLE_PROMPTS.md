# Premium Paywall Audit, Checklists, and DALL-E Prompts

Date: 2026-05-18

## Scope

Audited the Premium and shard paywall surfaces that route users into payment or shard purchase decisions.

- `app/premium_modal.tsx`: main Premium paywall, manage view, success view.
- `components/NoEnergyModal.tsx`: energy gate with Premium CTA and shard refill CTA.
- `components/ArenaLimitModal.tsx`: Arena limit gate with Premium CTA and shard refill CTA.
- `components/MasteryReplayModal.tsx`: lesson replay gate with Premium CTA and shard replay CTA.
- `app/flashcards/CardPackShardPaywallModal.tsx`: card-pack shard paywall.
- Entrypoints: settings, lessons, quizzes, trainer, stats blur, flashcards, streak, club, arena, achievements, admin previews.

## Premium Contexts

`premium_modal` supports these real Premium contexts:

- `arena`
- `no_energy`
- `course_after_lesson3`
- `quiz_limit`
- `quiz_level`
- `quiz_medium`
- `quiz_hard`
- `flashcard_limit`
- `streak`
- `theme`
- `club`
- `generic`
- `mastery`
- `trainer`
- `trainer_limit`
- `diagnosis_training`
- `stats`
- `heatmap`
- `patterns`
- `percentiles`

Aliases normalized during this pass:

- `lesson_b1` -> `course_after_lesson3`
- `trainer_smart_mix`, `smart_trainer` -> `trainer`
- `avatar_aura` -> `theme`
- unknown values -> `generic`

## Findings

- The main hero card used abstract circles and a diamond for the generic Premium pitch. It looked flat against the richer app backdrops and did not use the current shard icon system.
- Most Premium contexts had differentiated copy, but the hero visual language was too similar across contexts.
- The app already has a single source of truth for themed shard icons in `app/oskolok.ts`, so new diamond SVGs or emoji diamonds would be inconsistent.
- `smart_trainer` and `avatar_aura` appeared as live route params but were not normalized by `premium_modal`.
- Trial/pricing UI has careful compliance copy. Visual changes should not reduce price/trial disclosure contrast or hierarchy.

## Implemented Visual Direction

Design system used: mobile language-learning Premium paywall, vibrant block-based energy, restrained premium editorial texture.

Principles:

- Use DALL-E generated theme backdrops as the hero card base, then keep readable text via scrims.
- Keep one stable 2:1 hero card ratio so text and icons do not jump between contexts.
- Use context-specific accent glows on top of the theme backdrop instead of generating a huge 6 x 20 asset matrix.
- Replace the diamond with current themed shard assets from `oskolokImageForPackShards`.
- Keep all paywall cards and sheets slightly translucent so generated backgrounds remain visible without lowering text contrast.
- Preserve accessibility: dark/light scrims, centered readable copy, no decorative text inside images.

Generated project assets:

- `assets/images/paywalls/premium_hero/premium-hero-dark.webp`
- `assets/images/paywalls/premium_hero/premium-hero-neon.webp`
- `assets/images/paywalls/premium_hero/premium-hero-gold.webp`
- `assets/images/paywalls/premium_hero/premium-hero-coral.webp`
- `assets/images/paywalls/premium_hero/premium-hero-minimal-light.webp`
- `assets/images/paywalls/premium_hero/premium-hero-minimal-dark.webp`

QA contact sheet:

- `qa-artifacts/premium-hero-backdrops-contact-sheet.webp`

## QA Checklist

- [ ] Open admin preview: "Premium modals - all contexts".
- [ ] Verify each context shows a themed hero background.
- [ ] Verify generic "Learn faster with Premium" uses a themed shard icon, not a diamond.
- [ ] Verify success screen uses a themed shard icon.
- [ ] Verify manage screen uses a themed shard icon.
- [ ] Verify Premium comparison, benefit, plan, manage, and compact paywall containers are translucent rather than flat gray.
- [ ] Verify NoEnergy and energy refill shard CTAs use themed shard artwork without a trailing diamond emoji.
- [ ] Test themes: `minimalLight`, `minimalDark`, `dark`, `neon`, `coral`, `gold`.
- [ ] Confirm title/subtitle contrast in each theme.
- [ ] Confirm trial ribbon, plan prices, store disclosure, Privacy Policy, and Terms of Use remain visible.
- [ ] Check 375 px width: hero text does not overlap the icon or card edges.
- [ ] Check scroll position: CTA remains reachable after the hero and benefit blocks.

## DALL-E Prompt Template

Use this template for any future single-context background:

```text
Use case: stylized-concept
Asset type: mobile app Premium paywall hero card background, 2:1 landscape texture
Primary request: a beautiful <THEME> background for the <PAYWALL_CONTEXT> Premium paywall in a language learning app
Scene/backdrop: abstract premium study environment, no UI, no text, no characters
Style/medium: high-end mobile app texture, polished editorial illustration, crisp detail
Composition/framing: wide 2:1, empty center for large title text, visual energy near corners, no icon in the center
Lighting/mood: motivating, premium, focused
Color palette: <THEME_PALETTE>
Context motif: <CONTEXT_MOTIF>
Constraints: no text, no letters, no logos, no watermark, no buttons, no phone mockups, no emojis; keep center readable for app text overlays
```

## Theme Prompts

Dark:

```text
Deep forest premium learning interface background, emerald and antique-gold study-map arcs, faint shard facets, soft luminous ring in one corner, dark empty center, no text, no UI, 2:1 landscape.
```

Neon:

```text
Neon premium language-learning background, black graphite base with electric cyan, blue, and lime learning-path lines, subtle particles, empty center for text, no text, no UI, 2:1 landscape.
```

Gold:

```text
Black-gold premium paywall hero background, restrained champagne light, gold knowledge constellation, subtle pedestal glow, luxury hardware UI feeling, empty center, no text, no UI, 2:1 landscape.
```

Coral:

```text
Warm coral premium learning background, dark charcoal base with ember-orange ribbons, small teal data points, energetic but readable center, no text, no UI, 2:1 landscape.
```

Minimal Light:

```text
Warm off-white paper premium learning background, subtle graphite pencil arcs, thin study-map lines, faint transparent shard facets, champagne highlights, dark-text readable center, no text, no UI, 2:1 landscape.
```

Minimal Dark:

```text
Deep charcoal graphite premium learning background, subtle constellation grammar arcs, faint translucent shard facets, silver-blue highlights, white-text readable center, no text, no UI, 2:1 landscape.
```

## Context Motifs

- `arena`: duel arena, tactical paths, competitive rank glow.
- `no_energy`: energy current, battery flow, momentum returning.
- `course_after_lesson3`: unlocked learning path, opening gate, graduation glow.
- `quiz_limit`: repeatable practice loop, streak of quiz attempts.
- `quiz_level`: next level ladder, skill ascent.
- `quiz_medium`: richer practice, warm challenge pulse.
- `quiz_hard`: mastery pressure, purple high-intensity peak.
- `flashcard_limit`: card library, memory archive, spaced-repetition rings.
- `streak`: flame trail, protected calendar rhythm.
- `theme`: palette shards, interface customization.
- `club`: team crest, shared XP boost.
- `mastery`: replay loop, lesson refinement spiral.
- `trainer`: neural practice map, smart mix routing.
- `trainer_limit`: unlocked session runway.
- `diagnosis_training`: error-to-insight prism.
- `stats`: dashboard constellation, calm data glow.
- `heatmap`: 365-day grid pulse.
- `patterns`: mistake pattern map.
- `percentiles`: rank ladder with positive comparison.
- `generic`: shard-powered premium progress.
