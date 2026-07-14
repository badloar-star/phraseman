# Avatar Aura Visual Remediation Design

Date: 2026-07-14
Status: Draft approved for documentation by user
Owner: Codex remediation pass

## Why This Exists

The previous aura work landed in the wrong shape:

- it was developed on an old release-based branch instead of the current LAN Metro app;
- it made a broad catalog before the core visual language was approved;
- several effects shared the same generic rotating/ring logic, so they did not match the original requirement;
- tests covered data contracts more than visual identity.

The recovered original direction is the source of truth:

> Auras must not be cheap spinners. Each one must be unique, carefully thought out, and feel like something worth years of XP. Do not do all of them at once; invent one idea, execute it beautifully, and only then move on.

This document replaces the broad "ship every aura together" direction for the immediate recovery work. The first implementation scope is level 52 only.

## Current-App Constraint

All work happens against the current `C:\appsprojects\phraseman` app used by LAN Metro. The old aura worktree and old release branch are reference material only.

Do not cherry-pick or merge the old aura branch wholesale. It diverged from the current app and can regress screens, navigation, rewards, and styling. Only small, reviewed ideas may be manually ported if they still fit the current code.

No OTA, EAS update, Firebase Functions deploy, hosting deploy, or production release is part of this remediation step.

## Visual Principles

Level auras are prestige collectibles, not decorative loading rings.

Every level aura must have:

- a unique silhouette that is recognizable in a still frame;
- motion that expresses the aura's concept, not a reused circular spin;
- no orbiting dots, confetti, fireworks, generic particle systems, or random emitters;
- no "same effect, different color" construction;
- no catalogue-wide animation loops;
- no layout growth, clipping, or neighboring-card movement;
- an intentional reduced-motion/static frame;
- readable contrast on both dark and light app surfaces.

Level 51 Flame stays as the quality benchmark and is not redesigned in this pass.

## Scope For The First Pass

Implement only level 52:

- stable ID: `aura-storm-52`;
- name: Storm Front / Грозовой фронт;
- unlock: level 52;
- acquisition: level reward, not purchasable;
- visual family: storm pressure and controlled electric discharge.

Levels 53-60 remain planned but should not be implemented until level 52 has been visually checked and approved.

## Storm Front Design

Storm Front should feel like pressure building around the avatar before a clean electric split.

Static silhouette:

- a compressed dark-blue/cyan pressure veil behind the avatar;
- two broken lightning paths that sit diagonally across opposite sides;
- one asymmetric rim that feels charged, not perfectly circular.

Motion:

- slow pressure breathing in the veil;
- short controlled electric flashes on the two lightning paths;
- a slight shear/tilt shift that suggests storm wind;
- no full 360-degree rotating rings;
- no dot sparks, no particle spray, no random per-frame positions.

Palette:

- deep navy pressure base;
- cyan-blue electric body;
- near-white blue only as a narrow flash accent;
- no warm colors.

The UI/UX rationale from the design-system pass is "immersive interactive experience" with a vibrant premium collectible style, but constrained for React Native mobile performance. That means the selected hero preview can feel alive, while catalog cards must stay deterministic and quiet.

## Rendering Architecture

Keep `AvatarView`'s public API unchanged.

`AvatarAura` remains the lifecycle owner:

- it resolves the aura definition;
- owns one shared `Animated.Value` phase;
- gates animation by screen focus, app foreground state, `animate={false}`, and size thresholds;
- resets or stops animation when inactive.

Storm Front should be implemented as a dedicated renderer path, not as another preset in a generic `arcs/waves/pulse` system. Reusable primitives are allowed only when they do not erase the effect's identity. For example, a helper for a static clipped layer is fine; a generic "ring preset with colors" is not enough for a level aura.

The renderer must animate only transform and opacity. It must not animate layout dimensions, SVG path data, blur radius, or random values every frame.

## Data And Ownership

Add level 52 metadata only when implementation begins:

- exactly one aura unlocks at level 52;
- it is not purchasable for shards;
- unknown legacy IDs still normalize safely;
- existing Plus, Nimbus, Arena, season, shop, and explicit "no aura" behavior stays intact.

If the current catalog lacks an explicit acquisition field, the implementation may introduce the smallest helper needed to distinguish level rewards from shop and reward-only auras. It must not rewrite unrelated reward systems in this first pass.

## Selector Behavior

The avatar studio must remain the current app's selector, not the old isolated branch's screen.

Requirements:

- the selected hero preview may animate Storm Front;
- grid/catalog cards render Storm Front in a deliberate static frame;
- offscreen cards do not run decorative loops;
- existing purchase, selection, ownership, locked reason, and Plus fallback behavior remain unchanged.

## Verification

Focused checks for the first pass:

- source contract proving level 52 metadata exists and is not shop-purchasable;
- contract or source check proving Storm Front does not use a full rotating 360-degree ring path;
- existing aura runtime/freeze guards still pass or are not weakened;
- manual LAN Metro visual check in the current app at small card size and selected hero size;
- dark and light surface spot check if the current preview path supports both.

Visual acceptance for Storm Front:

- it is immediately distinguishable from Flame, Plus, Nimbus, and shop auras;
- it reads as storm/electric pressure, not a blue spinner;
- it remains attractive when static;
- it does not clip the avatar or resize the grid/card;
- it is good enough to use as the quality bar before designing level 53.

## Non-Goals

- Implementing levels 53-60 in the same pass.
- Deploying OTA or Firebase changes.
- Replacing level 51 Flame.
- Rebuilding the whole avatar studio.
- Adding Skia, Lottie, video, raster aura assets, or new native dependencies.
- Removing existing shop, Plus, Nimbus, Arena, season, gift, or legacy aura behavior.

