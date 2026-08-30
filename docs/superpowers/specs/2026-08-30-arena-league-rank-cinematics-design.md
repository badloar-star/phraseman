# Arena rank cinematics and League knowledge relics

Date: 2026-08-30
Status: owner-approved design

## Goal

Create one coherent competitive visual language across ranked Arena and the
League screen:

- ranked Arena search shows the player's real rank and a lightweight reel of
  eligible opponent ranks;
- the versus intro collides two rank shields instead of two avatars;
- avatars remain visible in the existing top match HUD after the intro;
- the Arena hub gets a standard back button that returns to Home;
- all twelve League icons become progressively more powerful three-dimensional
  knowledge hexahedrons;
- only the League screen receives a large translucent ambient copy of its
  current League relic.

The Arena's existing 24 rank shields and the League's 12 relics are separate
asset families. This design does not merge their progression systems.

## Non-negotiable visual rule: symbols, not literal objects

Every League asset is first and foremost the same family of volumetric,
faceted hexahedron relics. The knowledge motif is an embossed, engraved or
internally illuminated **symbol on the front face**.

The renderer must not produce a standalone book, owl, tree, compass, flame or
library placed in front of an unrelated badge. It must not produce a miniature
scene. The symbol is a compact heraldic glyph integrated into the geometry of
the hexahedron.

All relics have:

- a transparent background;
- no text, numbers, logos, characters or UI chrome;
- the same camera, silhouette family, lighting direction and safe margins;
- increasing facet complexity, energy, depth and authority from League 0 to
  League 11;
- a clear centre glyph that remains recognizable at 84 px;
- restrained highlights that also survive as a 6–8% ambient watermark.

## League relic progression

| ID | League | Integrated knowledge symbol | Power progression |
|---:|---|---|---|
| 0 | Copper | open-book sigil | simple copper facets, dormant core |
| 1 | Bronze | quill-and-scroll sigil | deeper relief, first inner glow |
| 2 | Silver | geometric owl mask | sharper wings/facets, cool intellect |
| 3 | Gold | compass-of-knowledge glyph | radiant cardinal geometry |
| 4 | Platinum | astrolabe glyph | nested orbital engraving |
| 5 | Emerald | tree-of-knowledge rune | living branch geometry in the core |
| 6 | Sapphire | celestial-map glyph | constellation lines across deep facets |
| 7 | Ruby | alchemical-flame rune | controlled red inner energy |
| 8 | Diamond | crystalline-eye sigil | prismatic perception and harder geometry |
| 9 | Black Diamond | eclipse-and-archive seal | dark layered vault, restrained corona |
| 10 | Ether | constellation-of-mind rune | levitating luminous connections |
| 11 | Supreme | eternal-light / infinite-library seal | most complex crown facets and stable white-gold core |

The list describes symbols, not literal scene content.

## Asset production and wiring

The twelve final assets keep the existing static filenames under
`assets/images/levels/league-v6-icons/`. Existing `require()` wiring therefore
continues to feed the League table, weekly result UI and modals without dynamic
asset loading.

Production rules:

1. Generate one coherent 3×4 atlas with the built-in image-generation
   capability. Do not spend a project or user API key.
2. Keep the raw atlas and intermediate crops outside bundled asset folders.
3. Extract one centred 384×384 alpha image per League.
4. Compress final WebP files at an appropriate alpha-preserving quality in the
   repository's normal 58–80 range.
5. Update the manifest with glyph, crop, alpha, dimensions and byte size.
6. Verify exactly twelve wired files and no unused alternatives.

The generation prompt must repeat the “integrated glyph, not literal object”
rule for every cell and demand an increasingly powerful progression.

## League ambient relic

Only `app/club_screen.tsx` receives the large background treatment. Arena,
matchmaking and other League-related modals do not receive this watermark.

Create a small isolated component, `LeagueAmbientRelic`, with these contracts:

- source is the current League's existing statically required image;
- it is absolutely positioned behind all League content but above the normal
  screen art;
- `pointerEvents="none"` and hidden from accessibility;
- width is responsive, approximately 115–125% of the viewport with a sensible
  tablet cap;
- content mode is `contain`; the image is never stretched or cropped;
- light themes use approximately 6% opacity, dark/richer themes may use up to
  8%, subject to visual contrast verification;
- motion is a slow `translateY` range of about 8 px plus scale
  `1 → 1.015 → 1` over roughly 5.6–6.4 seconds;
- animation uses only transform and opacity on the UI thread;
- animation starts only while the League screen is active and is cancelled on
  blur/unmount;
- reduced motion renders the same watermark statically;
- cards, podium, copy and touch targets keep their current z-order and
  contrast.

The existing 84 px League icon near the title remains. It uses the same new
asset at full opacity, creating foreground/background continuity without a
second visual concept.

## Ranked matchmaking scene

The rank scene appears only for `mode === 'ranked'`. Quick matchmaking keeps
its current search pulse and behaviour.

### Player side

- The player's exact Arena rank shield enters at the upper left of the search
  stage with opacity and translate transform.
- It then levitates slowly within a small vertical range.
- The shield is labelled accessibly with the localized rank name.

### Opponent reel

- The upper-right viewport contains a fast vertical reel of only the three
  eligible rank indices: player rank −1, player rank, player rank +1, clamped
  at the ladder edges.
- A duplicated first item makes the transform loop visually seamless.
- The reel uses four mounted `Image` nodes and one UI-thread transform. It does
  not use a JS interval, per-frame state updates, Skia or GPU shaders.
- The reel may use opacity masks at its top and bottom, but no blur pass is
  required.
- Reduced motion shows the player's rank in both slots without scrolling.

The player's visual rank comes from the rank already known on the Arena hub and
is passed in navigation params. A warm-cache fallback is allowed. When neither
source is known, render a neutral shield instead of inventing Bronze.

This visual reel does not choose an opponent and does not alter matchmaking.
Human ranked opponents are already server-constrained to ±1. Ranked bots are
currently created at the same rank as the player, which is valid under the
owner's “same or ±1” rule. The server remains authoritative.

## Versus intro and match HUD

`ArenaVersusIntro` replaces the two colliding avatar views with the two exact
Arena rank shield assets:

- left: player rank from the ranked-search navigation handoff/warm cache;
- right: opponent rank from the sealed match plan;
- the existing opposing travel, impact timing, VS plate, countdown, sound and
  haptics remain;
- names stay under the rank shields;
- reduced motion keeps the same timing without travel/scale movement.

No competitive data contract changes are required. Unknown visual rank falls
back to a neutral shield rather than modifying match state.

After the intro, the existing `ArenaPlayers` row remains at the top of the
gameplay screen. It continues to show both avatars, names, scores and opponent
answer state. Rank shields are used for the cinematic collision, not as a
replacement for gameplay identity.

## Arena hub back navigation

The Arena hub stops passing `showBack={false}`. It supplies the existing
`ArenaScreen` back control with an explicit handler that replaces the route
with `/(tabs)/home`.

Using `replace` is intentional: pressing system back after leaving Arena must
not reopen Arena. The control preserves the existing 44×44 touch target,
localized accessibility label and theme styling.

## Performance and accessibility

- Animate only opacity and transforms.
- No new timers for visual loops; Reanimated loops must be lifecycle-owned and
  cancelled explicitly.
- Pause all repeating motion while the relevant screen is inactive.
- Respect reduced motion in League ambience, matchmaking reel, levitation and
  versus collision.
- Preserve fixed layout space to avoid content jumps.
- Decorative background relics are ignored by accessibility services.
- Meaningful foreground rank shields expose localized rank labels.
- Do not add a second network read solely for animation.

## Verification

Focused deterministic gates must cover:

1. exactly twelve League WebPs, each 384×384 with alpha and a manifest entry;
2. every League filename remains statically wired;
3. the League ambient relic renders only in `club_screen`, behind content, with
   reduced-motion and inactive-screen behaviour;
4. ranked search mounts the player shield and four-node neighbour reel while
   quick search preserves the existing pulse;
5. reel and ambience use transform/opacity only and have no JS interval;
6. versus intro renders two rank assets and no `AvatarView`;
7. gameplay still renders `ArenaPlayers` at the top;
8. bot same-rank and human ±1 server contracts remain green;
9. Arena hub back uses `router.replace('/(tabs)/home')`;
10. visual checks at 320 pt and 390 pt widths show no clipping, unreadable
    overlays or background clutter.

Run focused Arena, League and Functions contract suites under the repository's
heavy-process semaphore. Do not weaken existing League cache/demotion guards or
Arena owner contracts to make tests pass.

## Out of scope

- changing League promotion/demotion or cache behaviour;
- changing ranked opponent selection or bot strength;
- replacing avatars in the gameplay HUD;
- adding the large League watermark to Arena or modal screens;
- generating unused alternate assets;
- deployment, release or migration work.
