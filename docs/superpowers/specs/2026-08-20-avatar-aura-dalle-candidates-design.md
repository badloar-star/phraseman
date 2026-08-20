# Avatar Aura DALL·E Candidates Design

Date: 2026-08-20
Status: Approved visual direction; candidate generation pending
Owner: Codex design pass

## Goal

Replace the eight ordinary catalog aura visuals and add two new ordinary catalog
auras. The new collection must use the same layered asset model as the existing
Season Pass auras: separately generated transparent elements are composited and
animated around the avatar.

Plus, Pro, Nimbus, and all Season Pass reward auras are outside this replacement.
They remain unchanged and serve only as rendering and quality references.

## Verified Season Pass Reference

The current Season Pass implementation uses three independent transparent WebP
layers per aura:

1. `base`: the persistent ring or light mass; it breathes and may rotate slowly.
2. `flow`: the dominant moving ribbon, arc, or vortex; it rotates independently.
3. `particles`: sparse accent lights; they counter-rotate and twinkle.

Every source canvas is 320 by 320 pixels with alpha. `AvatarAura` renders the
canvas at approximately 1.40 times the avatar size. `SeasonAuraRing` animates the
layers with transform and opacity only, stops animation when inactive, and
respects reduced motion.

Verified timing ranges:

- pulse: 4.8–7.2 seconds;
- base rotation: static or 32–46 seconds;
- flow rotation: 16–28 seconds;
- accents rotation: 10–19 seconds, often opposite to the flow.

## Candidate Production

Produce ten DALL·E candidate sheets through Codex's built-in image generation.
No project or user OpenAI API credential may be read or spent.

Each sheet represents one aura slot and uses a strict 3 by 3 layout:

- columns: visual variants A, B, and C;
- rows: `base`, `flow`, and `accents`;
- each cell: one isolated, centred aura element on a genuinely transparent
  background;
- no avatar, text, labels, panel borders, opaque backdrop, watermark, or UI;
- every element uses the same circular safe area so that cropped layers align.

The ten sheets yield 90 candidate elements:

- 10 aura slots;
- 3 variants per aura;
- 3 transparent layers per variant.

To reduce in-thread image payload, this workflow uses ten generated sheets, not
thirty separate image results. Generated originals, crops, prompts, manifests,
and checkpoints live under an ignored `.codex-tmp/avatar-aura-candidates/`
folder until the user selects winners.

## Visual Direction

The thirty candidates must look like one Phraseman collection without becoming
simple recolours. Across the collection, DALL·E should vary the dominant form:
continuous ring, broken orbit, broad arc, ribbon, vortex, crescent, petal,
corona, portal, or liquid loop.

Shared constraints:

- polished luminous collectible cosmetics suitable for a modern language-
  learning app;
- clean silhouette at 44, 54, and 82 pixels;
- open centre that never covers the avatar face;
- broad readable elements rather than visual noise;
- restrained highlights and sparse accents;
- no fantasy heraldry, wings, weapons, gems, crowns as objects, letters,
  symbols, scenery, characters, or random confetti;
- no five- or six-strip rainbow construction;
- enough transparent margin for rotation without clipping;
- light and dark surface compatibility.

## Candidate Preview And Selection

Crop each generated sheet into nine aligned transparent candidate elements.
For every aura slot, composite the three layers for variants A, B, and C around
the same neutral avatar.

The browser mockup presents all thirty animated candidates and allows one choice
per aura slot. Each card shows:

- the animated composite on a dark surface;
- the same paused composite on a light surface;
- variant label A, B, or C;
- the layer timing profile used for preview.

Preview motion follows the Season Pass lifecycle rules: transform and opacity
only, independent rotation directions, breathing, reduced-motion fallback, and
no layout movement.

## Winner Finalization

After the user selects one variant for each aura slot, only the thirty winning
layers are eligible to enter the application bundle:

- 10 selected auras;
- 3 final WebP layers per aura;
- transparent, compressed, and statically required by app source.

The eight replacement positions preserve their stable catalog IDs so existing
ownership and equipped selections continue to work. Two new IDs are added for
the new catalog positions. Names and localized copy are finalized after the
visual winners are selected.

No rejected candidate, contact sheet, raw generation source, or intermediate
crop may enter `assets/images/**`.

## Verification

Before asking for visual selection:

1. all ten DALL·E sheets exist and are recorded in a manifest;
2. all ninety crops exist and retain alpha;
3. each candidate has exactly one base, one flow, and one accents layer;
4. the open centre and rotation-safe margin are visible in every composite;
5. all thirty candidates render in the browser mockup;
6. motion pauses under reduced motion and when the page is hidden;
7. both light and dark preview surfaces remain readable;
8. no generated candidate is copied into bundled assets before selection.

Application integration receives separate focused tests for static asset
mapping, stable ID preservation, catalog count, ownership compatibility,
reduced-motion behavior, and missing-asset failures.

## Acceptance Criteria

- DALL·E produces actual separated aura elements, not finished avatar mockups.
- Ten aura slots each have three distinct animated candidates.
- The user can compare and choose A, B, or C for every slot in one browser
  mockup.
- Candidate generation uses built-in Codex image generation and no project API
  key.
- Season Pass, Plus, Pro, and Nimbus behavior remains unchanged.
- Only selected, compressed, statically wired layers may later enter the app.
