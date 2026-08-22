# MAX Home Multilayer Orb Design

Date: 2026-08-20  
Status: Approved and implemented

## Goal

Add MAX to the Home quick-start row between Lessons and Cards and make it the
only continuously living entry point on that row. MAX is not a person, mascot,
robot, or a single pre-rendered illustration. It is a compact multilayer voice
orb whose independent internal light structures move slowly in different
directions.

The orb must remain inside the same visual footprint as the existing Lessons
and Cards icons. Motion, depth, and independent layers create its prominence;
larger dimensions do not.

## Approved Home Behavior

- The quick-start order is Lessons, MAX, Cards.
- The row uses three equal tiles when the existing MAX visibility gate is on.
- When that gate is off, the existing two-tile Lessons and Cards layout remains.
- Pressing MAX opens `/max_call_prestart` directly with tutor format and the
  learner's inferred CEFR level.
- The label is `МАКС` for Russian and Ukrainian and `MAX` for other locales.
- Lessons and Cards remain static. MAX alone has ambient motion.

## Non-Human Visual Identity

The stable identity is a round translucent voice-energy core with no face,
body, eyes, limbs, white porcelain casing, radio-wave icon, or literal object.
Every theme preserves the same silhouette and layer roles while changing its
material, palette, highlights, and surface treatment.

Surrounding accents are not leaves, crystals, planets, tools, or decorative
props. They are small fragments of the same light/material as the orb itself,
positioned very close to the sphere.

## Mandatory Three-Layer Asset Contract

DALL·E must not generate the production orb as one finished composite. Every
theme has exactly three independently generated transparent layers sharing the
same registered canvas, centre, and scale:

1. `shell`: the nearly static transparent spherical boundary and base material;
2. `field`: an internal cloud, liquid light, or energy mass;
3. `glints`: sparse internal sparks and reflections.

No layer may contain artwork assigned to another layer. In particular, the
shell contains no baked field or glints. This separation is required so
every visible effect can move in a different direction or rhythm.

Both rejected internal wave/ribbon layers and all external orbiting
dots/fragments are excluded from the production composition. Motion stays
entirely inside the sphere and contains no line-like element.

Raw DALL·E outputs, failed transparency attempts, prompts, and intermediate
previews remain outside `assets/images/**`. Production layers are alpha-cleaned,
centred, cropped to the shared canvas, compressed to WebP, and copied into the
bundle only after all static `require()` slots exist.

## Theme Matrix

Exactly the nine selectable themes receive the three-layer set:

- `indigo`
- `sagePorcelain`
- `olive`
- `midnight`
- `ember`
- `aurora`
- `volt`
- `dark`
- `gold`

Removed Business variants do not receive assets. Each theme changes the
material language but not the orb's identity or geometry. Theme-specific art
must stay abstract and must use only pieces that visually belong to that orb.

## Geometry

All three source layers use the same square transparent canvas and registration
point. The shell defines the reference sphere. Internal layers are clipped to
the sphere at runtime, so they can never leak outside it. No animated artwork
exists outside the shell.

The rendered component fits inside the existing home-icon box. Its visual
layers must not change tile measurement, row height, hit target, or spacing.
The tile remains fully pressable rather than making individual layers
interactive.

## Motion Contract

Each layer uses only opacity and transforms:

- shell: extremely small breathing scale, with no perceptible rotation;
- field: very slow drift/rotation in one direction;
- glints: independent low-amplitude drift and opacity cycle;

The animation values must live in `constants/motionHybrid.ts` or a named MAX
suite exported from it. Components must not contain magic durations or spring
values. Infinite loops start and stop inside the component lifecycle and are
cancelled on unmount.

Motion runs only when Home is focused, the MAX tile is visible, the app is
active, and Reduced Motion is off. Inactive/background/off-screen tiles stop all
loops. Reduced Motion shows a balanced hand-chosen static phase with every layer
still legible. No essential meaning depends on animation.

## Rendering Architecture

A dedicated theme resolver maps each active theme to three static `require()`
assets. A reusable Home orb component receives the resolved set and owns the
layer stack, clipping, lifecycle, focus state, and Reduced Motion behavior.

The implementation should reuse the lifecycle conventions already proven by
the avatar-aura renderer: one runtime-active decision, deterministic static
fallback, explicit cleanup, and transform/opacity-only animation. It must not
reuse an entitlement-bearing avatar aura or couple MAX to avatar ownership.

Missing or invalid art falls back to a static safe MAX core rather than hiding
the tile or crashing Home.

## Generation Protocol

Every theme generation session receives the same layer template and generates
the three files separately. The prompt for each layer explicitly lists what must
be absent. A contact sheet then composites the three registered layers at the
actual Home icon size and at an enlarged inspection size.

Acceptance for each theme requires:

- true alpha outside the intended artwork;
- an empty shell layer with no baked internal effects;
- no internal wave, ribbon, line, or sharp central waveform;
- no recognizable decorative objects;
- no white casing unless white glass is the theme material itself and does not
  form an enclosing shell;
- no clipping at any animated transform extreme;
- readable depth at the actual Home size;
- visual continuity with that theme's existing Lessons and Cards art.

## Accessibility And Performance

- The MAX tile keeps the same minimum touch target and semantic button behavior
  as the neighbouring quick-start tiles.
- Its accessibility label communicates that it opens the MAX voice tutor.
- Decorative images are hidden from the accessibility tree.
- Three small layers animate through GPU-friendly transforms and opacity only;
  no layout properties, timers, per-frame React state, or text updates are used.
- Images are pre-sized and compressed; speculative variants never enter the
  app bundle.

## Verification

Focused tests and checks must prove:

1. quick-start order is Lessons, MAX, Cards when visible;
2. the existing two-tile layout returns when MAX is gated off;
3. MAX opens the tutor prestart route with tutor format and inferred CEFR;
4. all nine active themes resolve exactly three statically required files;
5. removed themes receive no new MAX assets;
6. every bundled file is referenced and alpha-preserving;
7. all internal layers remain clipped inside the reference sphere;
8. no animated pixel appears outside the shell boundary;
9. animation stops when unfocused, backgrounded, hidden, or unmounted;
10. Reduced Motion shows the approved static phase;
11. the tile remains accessible and the decorative layer images are ignored;
12. no existing Home action, visibility gate, or tile behavior is removed.

## Delivery Sequence

1. Add the asset resolver and three static slots for every active theme.
2. Add failing focused contracts for ordering, routing, asset completeness,
   lifecycle, and Reduced Motion.
3. Generate three transparent DALL·E layers per theme in separate theme sessions.
4. Normalize, centre, alpha-check, and compress only the approved production
   layers.
5. Implement the multilayer renderer and wire the MAX tile into Home.
6. Verify all nine themes at actual icon size and enlarged inspection size.
7. Run the narrow Home, motion, accessibility, and asset-hygiene gates.

## Acceptance Criteria

- MAX appears between Lessons and Cards without enlarging the Home row.
- The orb is clearly non-human and more alive than every neighbouring section.
- Every internal effect that moves independently comes from its own generated
  transparent asset; no production composite has motion baked into it.
- The field, glints, and shell all have distinct subtle movement.
- There are no external orbiting particles and no internal wave or ribbon.
- All nine themes feel native to their existing art while MAX remains the same
  recognizable entity.
- Performance, lifecycle, Reduced Motion, routing, and existing Home behavior
  remain correct.
