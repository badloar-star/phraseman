# Phraseman Avatar Aura Visual Remediation Design

Date: 2026-07-14
Status: Draft for user review
Owner: Codex remediation pass

## Why This Exists

The previous aura implementation landed in the wrong shape. It was prepared on
an old release branch, not on the current LAN Metro app, and the visual system
collapsed too many auras into shared generic presets. The result looked like old
shop rings with color swaps instead of level rewards that feel worth years of
XP.

This remediation replaces that direction with the original product intent:
every level aura after 50 is a distinct, carefully composed visual scene. No
cheap spinning rings, no orbiting dots, no copied preset with a new palette.

The current app in `C:\appsprojects\phraseman` is the integration base. The old
divergent release worktree is a reference only and must not be merged wholesale.
No OTA deployment is part of this remediation until the user explicitly asks for
release again.

## Non-Negotiable Visual Rules

- Level 51 Flame stays unchanged and remains the quality benchmark.
- Only one new level aura is implemented and visually approved at a time.
- Each aura gets a dedicated renderer or dedicated visual composition. Shared
  lifecycle helpers are fine; shared generic aura identities are not.
- No "spinner" language in the final result: no rotating decorative ring as the
  main idea, no orbiting dots, no random particles, no confetti, no fireworks.
- The static frame must already look intentional before animation starts.
- Animation uses transform and opacity where possible and stays inside the
  existing avatar slot geometry.
- Catalog cards render deterministic static frames. Only the selected hero
  preview may animate.
- Reduced-motion users receive a designed still frame, not an invisible aura.
- All effects must stay readable at avatar sizes 44, 54, and 82 px.
- Dark and light surfaces must both preserve contrast and the avatar shape.

## Scope For The First Repair Pass

The first implementation pass covers only Level 52.

Stable ID: `aura-storm-52`
Name: `Грозовой фронт`
Unlock: level 52
Acquisition: level reward, not purchasable

Level 52 is the first proof that the new direction is real. Level 53 and beyond
must wait until Level 52 is visible in the current app and accepted by the user.

## Level 52 Design: Storm Front

Storm Front should feel like pressure gathering around the badge before a
lightning break. It is not "blue rings". It is a compressed storm cell around a
hexagonal avatar.

The composition has four visual parts:

1. Pressure veil: a dark blue translucent atmospheric mass behind the avatar,
   slightly wider on one side so the silhouette is not mechanically symmetric.
2. Electric fracture: one bright cyan-white broken path that hugs the top-left
   and right edge, shaped like tension cracking through glass.
3. Secondary charge: a shorter blue-violet discharge on the lower opposite edge,
   thinner and dimmer so it supports the main fracture.
4. Inner weather glow: a restrained cold pulse just inside the aura boundary,
   timed like air pressure breathing rather than a circular loader.

Motion is slow and tense:

- the veil swells subtly and leans, as if pressure is moving behind the avatar;
- the main fracture flickers by opacity and tiny transform offsets, not by
  spinning;
- the secondary charge answers on an offset beat;
- the whole aura never completes a visible circular rotation.

The representative static frame shows the main fracture already alive, the veil
behind it, and the secondary charge visible but quieter.

## Architecture Direction

Keep the public `AvatarAura` usage intact for existing avatar surfaces. Add only
the smallest structure needed to make visual identity explicit.

The target boundary:

```text
AvatarAura
  runtime gate, reduced-motion, shared phase
    -> dedicated effect renderer for the selected aura
```

The renderer for Storm Front may reuse small primitives such as an animated
`View`, `Svg`, `Path`, gradient, interpolation, or palette helper. It must not
be defined as "generic arcs plus colors" where future auras become data-only
copies.

If a registry exists, it should map `aura-storm-52` or its effect key to a named
Storm Front renderer. The name should make the visual concept obvious in code.

## Data And Ownership

The remediation must preserve current app behavior:

- existing owned aura storage keys stay unchanged;
- explicit no-aura selection stays available;
- Plus, VIP/admin, Nimbus, season, Arena, gift, and shop auras are not removed;
- unknown legacy aura IDs continue to fall back safely;
- level 52 ownership/unlock logic must be deterministic and non-purchasable.

If the current app lacks the newer acquisition helpers from the abandoned branch,
bring over only the narrow helper/data changes needed for Level 52. Do not port
old release UI wholesale.

## Performance And Runtime

Storm Front must follow the app performance rules:

- no animation loop while the screen is blurred or app is backgrounded;
- no offscreen catalog cell animation;
- no layout size animation;
- no growing module-level caches;
- no full-screen loading state or geometry jump;
- no new dependency such as Skia, Lottie, video, shader, or particle engine for
  this pass.

React Native Animated, Reanimated already present in the project, SVG already
present in the project, and existing gradient utilities are acceptable if they
match local patterns.

## Verification

Before calling the first pass done, verify:

- a focused contract proves Level 52 exists with the stable ID, unlock level,
  and non-purchasable category;
- a focused contract proves Storm Front uses its dedicated renderer path rather
  than the generic old preset identity;
- existing avatar selector behavior still keeps no-aura, shop auras, Plus/VIP,
  and owned selection intact;
- reduced-motion/static mode renders a visible Storm Front frame;
- current LAN Metro app, not the old release app, is the visual target;
- screenshots or direct device verification cover the selected hero preview and
  catalog card at least in dark mode.

## Out Of Scope For This Pass

- Implementing levels 53-60 in the same batch.
- Deploying OTA or Firebase Functions.
- Replacing Level 51 Flame.
- Redesigning the full avatar studio.
- Removing old shop auras, Plus auras, Nimbus, season auras, or Arena rewards.
- Adding raster assets for aura effects.

## User Approval Gate

After this spec is accepted, the implementation plan starts with Level 52 only.
The next aura does not begin until Storm Front is visible in the current app and
the user approves the direction.
