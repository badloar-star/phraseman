# Phraseman Avatar Aura Collection Design

Date: 2026-07-13
Status: Draft for user review
Owner: Codex design pass

## Goal

Expand the avatar-aura catalog without turning it into particle effects or
fireworks. The collection must feel smooth, premium, and readable around the
small hexagonal avatars already used throughout Phraseman.

The approved scope is:

- one unique level aura for every level from 51 through 60;
- five modestly improved shard-shop auras;
- three gift-only auras that cannot be purchased;
- distinct remasters of the paid-gold and admin-green Plus auras;
- a visual remaster of the existing beta-tester Nimbus aura;
- catalog performance work so roughly 20–25 aura definitions do not leave all
  offscreen animations running.

The existing level-51 Flame aura stays unchanged.

## Approved Visual Principles

Every aura follows these invariants:

- maximum visual diameter: `avatarSize * 1.44`;
- movement uses `transform` and `opacity`; no animated layout dimensions;
- no random particles, sparks, confetti, salutes, orbiting dots, or particle
  emitters;
- the silhouette remains attractive in a paused/static frame;
- ambient cycles are slow, normally 5.2–9 seconds;
- one aura uses one shared phase driver, with layers derived from that phase;
- reduced-motion mode renders a deliberate static frame;
- the aura never changes the avatar slot geometry or pushes neighbouring UI;
- final tuning is checked at avatar sizes 44, 54, and 82 px in both themes.

The visual hierarchy is intentional:

- shard-shop auras: strength 2/5;
- gift and status auras: strength 3/5;
- levels 52–57: strength 4/5;
- levels 58–60: strength 5/5.

## Approved Level Catalog

Level 51 keeps the current `aura-flame-51` definition and Flame renderer.

| Level | Stable ID | Russian name | Effect | Approved motion |
|---:|---|---|---|---|
| 52 | `aura-storm-52` | Грозовой фронт | `storm` | Two continuous cyan/blue electric arcs and a soft pressure veil; no sparks. |
| 53 | `aura-ice-rift-53` | Ледяной разлом | `frost` | Two solid glass-like ice arcs slowly separate and close. The rejected white top stripe must not exist. |
| 54 | `aura-volcanic-heart-54` | Вулканическое сердце | `lava` | Two viscous crimson/gold rings with a slow double heartbeat; no flying embers. |
| 55 | `aura-typhoon-spirit-55` | Дух тайфуна | `typhoon` | Three translucent teal ribbons meet and separate in opposing motion. |
| 56 | `aura-golden-eclipse-56` | Золотое затмение | `gravity` | Indigo gravitational lens, two asymmetric arcs, and restrained gold light. |
| 57 | `aura-solar-forge-57` | Солнечная ковка | `forge` | Two molten gold ribbons and one slow horizontal white-gold flare. |
| 58 | `aura-plasma-silk-58` | Плазменный шёлк | `plasma` | Cyan, blue, and pink silk veils smoothly change tilt and tension. |
| 59 | `aura-ether-tide-59` | Эфирный прилив | `ether` | Three quiet cyan/lilac waves pass through an opal contour. |
| 60 | `aura-elemental-absolute-60` | Абсолют стихий | `absolute` | Four balanced elemental arcs converge into one calm resonance. |

Each entry has `acquisition: 'level'`, the exact `unlockLevel`, and no shard
price. There must be exactly one level aura for every level 51–60, without gaps
or duplicate unlock levels.

All user-facing names must be supplied for the eight currently supported aura
locales: Russian, Ukrainian, Spanish, Brazilian Portuguese, Vietnamese,
Indonesian, Turkish, and Polish. Stable IDs and effect keys are not localized.

## Approved Shard-Shop Remasters

The existing IDs, names, price, ownership, and purchase flow remain unchanged:

| ID | Name | Palette | Motion |
|---|---|---|---|
| `aura-aurora` | Аврора | Cyan/blue | One thin cool arc and very soft breathing glow. |
| `aura-ember` | Искра | Coral/orange | Restrained warm pulse, without flame tongues. |
| `aura-mint` | Мята | Jade/teal | One arc subtly changes tilt and shape. |
| `aura-violet` | Виолет | Violet/pink | Lilac contour slowly rocks around the centre. |
| `aura-coral` | Коралл | Orange/coral | One low-intensity arc makes a small slow turn. |

These remain purchasable for 35 shards and use `acquisition: 'shop'`. Their
glow, line thickness, and contrast must stay visibly below the level, gift, and
status families. They are improvements to the current static rings, not premium
replacements.

## Approved Gift-Only Catalog

| Stable ID | Russian name | Effect | Approved motion |
|---|---|---|---|
| `aura-gift-friendship-pulse` | Пульс дружбы | `friendship` | Coral/pink double pulse with restrained warm gold. |
| `aura-gift-moon-bloom` | Лунный цветок | `moonbloom` | Four opal petals slowly open around the avatar. |
| `aura-gift-jade-wave` | Нефритовая волна | `jadewave` | Cascading jade/teal rings with a clean static frame. |

All three use `acquisition: 'gift'`. They:

- have no price and cannot enter the purchase path;
- show the locked explanation “Можно получить только в подарок” in the
  selector, localized through the existing language helper;
- are eligible only in the level-gift aura flow;
- are not Arena, season, league-chest, or beta/admin rewards;
- continue the current behavior of adding ownership and auto-equipping the
  newly received aura.

The `cosmetic_avatar_aura` and `premium_cosmetic_aura` gift order is:

1. choose a random unowned `acquisition: 'gift'` aura;
2. if all gift-only auras are owned, choose a random unowned
   `acquisition: 'shop'` aura so the old gift remains useful;
3. if both pools are exhausted, grant the existing shard compensation.

This replaces the current broad filter that can accidentally include Nimbus,
season, Arena, and other `rewardOnly` definitions.

## Approved Status Remasters

### Paid Plus

- Keep ID `aura-premium` and all current paid-Plus access behavior.
- Keep the user-facing label `Plus` in every locale.
- Use two gold rims, champagne breathing, and one infrequent satin glint.
- Set `acquisition: 'plus-paid'`.

### Admin-Granted Plus

- Keep ID `aura-vip` and all current admin-grant behavior.
- Keep the user-facing label `Plus` in every locale.
- Use an emerald double pulse and a distinct teal inner wave.
- Set `acquisition: 'plus-admin'`.
- It must not look like a simple green recolor of the paid-gold animation.

When both statuses are active, the existing effective-aura precedence remains:
paid-gold Plus wins over admin-green Plus.

### Nimbus

- Keep ID `aura-nimbus`, name Nimbus/Нимб, and the existing beta-tester admin
  grant path.
- Use three non-rotating blue breathing layers and a soft vertical light accent.
- Set `acquisition: 'admin'`.
- Do not silently turn Nimbus into a Top Helpers reward.

There is currently no dedicated helper-only aura in the product. A future aura
for confirmed helpful reports requires a separate ID, explicit threshold, and
separate product decision; it is outside this scope.

## Acquisition Model

Add a required catalog field:

```ts
type AvatarAuraAcquisition =
  | 'shop'
  | 'level'
  | 'plus-paid'
  | 'plus-admin'
  | 'gift'
  | 'season'
  | 'arena'
  | 'admin';
```

For backward compatibility, keep the existing `premiumOnly`, `vipOnly`,
`rewardOnly`, and `unlockLevel` fields during this change. Assign acquisition
explicitly to every existing definition and centralize decisions in helpers:

| Acquisition | Compatibility fields |
|---|---|
| `shop` | no access-only flag; existing 35-shard price remains in the selector |
| `level` | exact `unlockLevel` |
| `plus-paid` | `premiumOnly: true` |
| `plus-admin` | `vipOnly: true` |
| `gift`, `season`, `arena`, `admin` | `rewardOnly: true` |

- `isAvatarAuraPurchasable(aura)` — true only for `shop`;
- `isAvatarAuraGiftOnly(aura)` — true only for `gift`;
- `isAvatarAuraLevelReward(aura)` — true only for `level`;
- `getAvatarAuraLockedReason(aura, context)` — returns the correct localized
  reason instead of treating every non-shop item as the same reward type.

No purchase, gift, league, Arena, or admin code may infer eligibility from only
`!premiumOnly`, `rewardOnly`, or missing `unlockLevel` after these helpers exist.

The league-chest aura pool remains a separate reward path and must contain only
the five valid shop IDs listed above. Its current stale `aura-gold` candidate is
removed from future draws because no matching catalog definition exists. Do not
delete a legacy `aura-gold` key from an existing user's owned map; normalization
continues to ignore unknown IDs safely.

Existing storage contracts remain unchanged:

- `user_avatar_aura`;
- `avatar_aura_owned_v1`;
- `avatar_aura_gift_owned_v1`.

Cloud synchronization continues to merge the owned map as a union so local or
admin-granted ownership is never lost.

## Rendering Architecture

Do not add nine more monolithic branches to the current large
`components/AvatarAura.tsx`.

The target boundary is:

```text
AvatarAura
  lifecycle + runtime/reduced-motion gate + one shared phase
    -> AURA_EFFECT_RENDERERS
         pure renderer(size, palette, phase, staticFrame)
```

`AvatarAura` keeps the public component API used by `AvatarView`. Effect
renderers move into focused modules grouped by family, for example level,
gift/status, and basic shop effects. Renderers do not start their own infinite
loops.

Use the existing React Native Animated/native-driver foundation for this
bounded change. SVG and `LinearGradient` remain acceptable. Do not add Skia,
Lottie, video assets, raster aura assets, or a new runtime dependency.

Runtime rules:

- combine screen focus and foreground state through the existing runtime-active
  hooks/pattern used by the app;
- add `useReduceMotion` support;
- stop and reset the phase loop on blur, background, unmount, or reduced motion;
- derive every layer from the shared phase through interpolation;
- do not animate layout, blur radius, SVG path data, or random values every
  frame.

## Selector Performance

The expanded catalog must not run every aura animation in the horizontal
selector.

Replace only the aura strip's horizontal `ScrollView` with a horizontal
`FlatList` while preserving all existing avatar-selection functionality.

Requirements:

- fixed 82 px item width with `getItemLayout`;
- animate the large selected preview;
- animate only the visible selector cells, normally 3–4 at once;
- pause cells as soon as they leave the viewability set;
- keep a clean static frame for paused cells and reduced-motion users;
- preserve selection, purchase, ownership, Plus upsell, locked-reason, and
  cloud-sync behavior;
- no whole-screen spinner or geometry shift.

## Error And Edge Behavior

- Unknown or legacy aura IDs continue through the existing normalization and
  fallback behavior; they must not crash rendering.
- A malformed owned-map value falls back to an empty parsed map without
  deleting the stored value during a read.
- Gift selection never grants an ineligible reward category.
- A user who already owns every gift and shop aura receives shard compensation,
  not a duplicate aura.
- Level unlocks are deterministic and do not write duplicate ownership entries.
- Reduced-motion mode shows the approved representative frame, not an invisible
  aura.
- Existing season and Arena aura IDs, effects, and reward paths remain intact.

## Verification And Tests

Add or update narrow contracts for:

1. exact one-to-one level coverage from 51 through 60;
2. stable IDs and unlock levels for the nine new level definitions;
3. acquisition category exclusivity and helper behavior;
4. shop price/access for the five existing 35-shard auras;
5. gift-first, shop-fallback, and shard-compensation ordering;
6. exclusion of Nimbus, season, Arena, Plus, and level auras from gift-only
   selection;
7. paid/admin Plus precedence and unchanged user-facing Plus labels;
8. Arena pass definitions and existing season aura effects;
9. cloud-owned map union restore;
10. runtime loop cancellation on blur/background/unmount;
11. reduced-motion static rendering;
12. selector viewability gating so offscreen cells do not animate;
13. the existing performance/freeze contracts.

Visual verification must cover:

- avatar sizes 44, 54, and 82 px;
- one light and one dark surface;
- level avatars and detailed custom avatars;
- paused and animated states;
- reduced motion;
- no clipping or neighbouring-layout movement;
- release-build performance with the selector rapidly scrolled.

## Acceptance Criteria

- Levels 51–60 each have exactly one unique, non-purchasable aura.
- Level 53 is Ice Rift without the rejected white top stripe.
- Level 57 is Solar Forge.
- The five 35-shard auras are subtly animated but visibly less prestigious than
  the level, gift, and status families.
- Three gift-only auras cannot be purchased or granted through unrelated reward
  paths.
- Gold and green Plus remain distinct while preserving their old IDs and access.
- Nimbus is visually improved without changing its beta-tester meaning.
- Every new effect stays within approximately 1.44× the avatar diameter.
- No new effect uses particles, confetti, salutes, or orbiting dot systems.
- Offscreen, blurred, backgrounded, and reduced-motion surfaces do not leave
  decorative animation loops running.
- Existing ownership, cloud sync, Arena rewards, season rewards, Plus fallback,
  and explicit no-aura selection continue to work.

## Non-Goals

- A new helper-only reward or automatic aura grant for Top Helpers.
- Replacing level-51 Flame.
- Redesigning avatars, frames, materials, or the full avatar-selection screen.
- Migrating every app animation to Reanimated.
- Adding Skia, Lottie, video, shader, or particle-engine dependencies.
- Changing shard prices, Plus entitlement rules, or existing storage keys.
