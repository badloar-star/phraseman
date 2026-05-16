# Profile Prestige System

## Goal

Profile Prestige turns the player card into a cosmetic status object. It must feel desirable when the owner opens it and recognizable when other players see it in Hall of Fame, leagues, friends, and arena surfaces.

The system is cosmetic-first. It does not grant arena, league, XP, or lesson power.

## Product Rules

- Premium aura is a real selectable aura, not a replacement for all auras.
- Premium users get the Premium aura automatically when no other aura is selected.
- Premium users can replace the Premium aura with any owned aura.
- Premium aura is not purchasable with shards and is not awarded by random aura gifts.
- Profile card upgrades are linear prestige levels bought with shards.
- Card upgrades unlock visual treatment, motion, and public profile information.
- Other users can see the owner card level and card treatment.
- Achievement showcase is intentionally out of scope.

## Card Levels

| Level | Name | Cost | Unlock |
| --- | --- | ---: | --- |
| 0 | Standard | 0 | Current basic profile card |
| 1 | Polished | 50 | Premium layout, cleaner hierarchy, card level badge |
| 2 | Signature | 100 | Card theme/material choice |
| 3 | Motion | 180 | Animated border and profile entrance polish |
| 4 | Prestige | 300 | Expanded public status stats |
| 5 | Elite | 500 | Elite entrance effect and top-tier card treatment |

Costs are intentionally non-linear. The first upgrade should be reachable, while Elite should remain a long-term shard sink.

## Public Stats By Level

- Level 0-1: name, title, XP, level, streak, league, arena rank if available.
- Level 2: adds card theme identity.
- Level 3: adds motion treatment visible to others.
- Level 4: adds best/public status stats such as weekly XP, active multiplier, days in app, and arena summary when available.
- Level 5: adds elite entrance and strongest visual frame.

## Customization Tracks

Upgrades stay linear so the shard sink is clear. Customization becomes selectable after the relevant level is unlocked.

Themes:

- Classic: base material.
- Gold: status metal.
- Crystal: cold glass shine.
- Ember: fire/streak energy.
- Aurora: rare elite glow.

Motion:

- Calm: no motion.
- Shimmer: moving rim highlight.
- Pulse: breathing card glow.
- Particles: small sparks around the card.
- Elite: top-level entrance/glow treatment.

Public focus:

- Balanced: shows a rounded profile summary.
- XP: emphasizes total XP and title.
- Streak: emphasizes discipline and streak.
- League: emphasizes current league.
- Arena: emphasizes PvP rank.

## UX

Own card:

- Shows an "Upgrade card" action.
- Opens a bottom sheet with current level, next level, shard price, and unlock preview.
- If shards are insufficient, routes to the shard shop with source `profile_card_upgrade`.

Other player's card:

- Never shows the upgrade action.
- Shows level, theme, aura, and motion that the owner has unlocked.

## Implementation Notes

- Local storage keys:
  - `profile_card_level`
  - `profile_card_theme`
  - `profile_card_motion`
  - `profile_card_public_focus`
- Shard spend reason:
  - `profile_card_upgrade`
- Public sync fields:
  - `profileCardLevel`
  - `profileCardTheme`
  - `profileCardMotion`
  - `profileCardPublicFocus`
