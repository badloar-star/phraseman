# Achievement Statuette Art Direction

Date: 2026-08-21  
Status: owner direction confirmed in chat  
Reference family: three owner-approved style previews plus the original Phoenix

## Decision

Every active achievement uses a premium collectible **statuette on a visible
pedestal**, following the shared visual language of three owner-approved trophy
archetypes: heraldic sculpture, allegorical human statuette, and monumental
champion trophy. An
achievement must read as an award before the viewer understands its individual
symbolism.

The subject is visibly an inanimate designed sculpture. It must not look like a
living animal, realistic person, mascot, or game character merely standing on a
platform. Material rendering stays believable, while anatomy, faces, edges, and
proportions use the cleaner stylization of the Phraseman interface.

The previous direction—standalone tools, machines, counters, keys, reels,
hourglasses, markers, and other ordinary objects—is rejected. Those concepts may
inspire a statue's pose, ornament, or held attribute, but may not be the whole
award.

## Considered Approaches

1. **Three related statuette archetypes — selected.** Heraldic sculptures,
   faceless allegorical human figures, and monumental champion trophies share
   one material and pedestal grammar while giving the collection useful
   silhouette variety.
2. **Symbolic objects mounted on bases — rejected.** This includes the current
   compass trophy. It reads as a premium object but not consistently as a
   statuette.
3. **Mixed cups, plaques, and statuettes — rejected.** It would read as a random
   awards cabinet rather than one intentional collection.

## Non-Negotiable Visual Grammar

- A complete pedestal is visible in every asset. It is part of the trophy, not a
  separate scene prop.
- Above the pedestal is one dominant inanimate sculptural subject: a heraldic
  creature, faceless allegorical figure, or monumental champion. Its pose is
  ceremonial and deliberately rigid rather than lively or character-like.
- The subject and pedestal form one manufactured collectible. Floating icons,
  loose props, and ordinary standalone objects are forbidden.
- The silhouette must read as a statuette at 128 px: base below, hero above,
  deliberate upward gesture, no flat UI-badge outline.
- Camera: centered three-quarter product view, slightly above eye level.
- Materials follow the Phoenix: dark sculpted metal or stone, warm bronze/copper
  trim, restrained enamel, and at most one integrated glass/crystal accent.
- Surface treatment is stylized premium 2.5D: believable material weight with
  broad geometric planes, clean softened bevels, slightly enlarged readable
  proportions, and restrained surface detail. It sits halfway between realism
  and Phraseman's interface style, never photorealistic or toy-like.
- Faces are carved masks or simplified planes. No lifelike eyes, fur strands,
  skin, soft anatomy, expressive mascot faces, or wildlife realism.
- No text, letters, digits, logos, UI, currency pearls, labels, ribbons, laurel
  frames, rooms, shelves, painted spotlights, triangular beams, bloom, or loose
  particles inside the asset.
- Lighting in the asset is neutral and restrained. Theme color and shelf light
  belong to the application UI.

## Series Language

- **Streak:** heraldic guardians of continuity whose rigid sculptural gesture
  communicates endurance and return.
- **XP chain:** increasingly formidable makers, scholars, navigators, engineers,
  and mythic knowledge guardians. Complexity and material rarity rise with the
  threshold.
- **League reach:** twelve distinct league champions, one per league, each with
  a unique pose, weapon/tool silhouette, and material hierarchy.
- **Historical balance:** vault, fortune, and stewardship guardians; never a pile
  of currency and never an achievement payout.
- **Foreground time:** contemplative timekeepers and watchful guardians, without
  clocks as the sole subject.
- **Paid access:** two ceremonial patron/founder statuettes, visually special but
  not louder than the rarest earned legends.
- **Secret legends:** the most narrative sculptures, including the approved
  Returning Phoenix. Each legend must remain recognizable without a label.

## Value Hierarchy And Museum Diversity

The three approved archetypes define the shared language "award statuette on a
pedestal". They are not templates for seventy similarly angular dark-metal
figures. Every achievement row declares a `valueTier`, unique
`materialPalette`, unique `shapeLanguage`, and unique `pedestalProfile`; these
fields are part of the generation prompt and the final 128 px diversity audit.

- **Early / accessible:** copper, dark bronze, wood, ceramic, and slate;
  compact, simpler construction that still feels desirable.
- **Mid:** silver, brass, colored enamel, polished wood, and smoked or matte
  glass; a more developed silhouette and more deliberate material contrast.
- **High:** gold, platinum, marble, obsidian, titanium, and restrained sapphire,
  ruby, emerald, or comparable mineral inserts; more complex construction and
  pedestal architecture.
- **Legendary:** rare material combinations plus expressive asymmetry or
  monumentality. Legendary never means painted glow, particles, or visual
  noise.

Shape language must rotate across rounded, flowing, slender, crystalline,
architectural, mechanical, massive, and chased-metal constructions, but the
collection is explicitly **curve-first**: rounded, flowing, and slender soft
sculptural geometry must form at least two thirds of the catalog. Broad convex
surfaces, smooth shoulders, continuous arcs, tapered robes, and softened animal
silhouettes are the default. Crystalline facets, architecture, mechanics, and
massive angular planes are minority accents tied to a specific concept, never a
repeated body template. Square torsos, boxy limbs, coarse polygon armor, and a
row of similarly faceted figures fail review even if their colors differ. Soft
organic curves are welcome as sculptural geometry, but they must never turn the
subject into a living character. Pedestals likewise rotate through circles,
ovals, polygons, steps, arches, rock forms, columns/discs, and asymmetric
profiles. Composition, height, width, pose, material hierarchy, and base profile
must communicate rarity without text and must not become template recolors.

Before connecting each generated pair, compare it with every already connected
asset for material, silhouette, gesture, width/height, and pedestal repetition.
The six early connected assets remain provisional until the final contact sheet;
any repetition found there must be regenerated rather than grandfathered in.

## Existing Asset Disposition

- `legend_second_wind` remains an accepted collection reference, while the
  owner-approved swallow, knowledge-smith, and lion previews define the new
  geometry and stylization more precisely.
- `legend_every_league` must be reworked from a compass object into a navigator
  or league-champion statuette that carries compass symbolism.
- The 16 generated streak/XP object assets currently marked connected are not
  accepted final art. They must return to pending and be regenerated as
  statuettes before completion can be claimed.
- The later realistic swallow and living cat-smith trials are also rejected.
  They proved pedestal scale only and must not be connected.
- Old files remain backed up until their replacement statuettes pass visual and
  technical review.

## Technical Delivery Contract

- Generate one distinct asset per built-in image-generation call; never use a
  project or user API key.
- Keep raw generation sources outside the bundled asset tree.
- Extract to transparent alpha, neutralize chroma spill when needed, normalize
  the sculptural bounds to 86% of the square canvas, and encode a 1024×1024
  compressed WebP.
- A generated file becomes `connected` only after visual inspection, alpha and
  dimensions verification, and a matching static `require()` slot.
- Work in tiny batches to protect the owner's computer and avoid oversized Codex
  session records.

## Acceptance Criteria

1. All 70 active achievements have unique 1024×1024 alpha WebP assets.
2. Every asset visibly contains a complete pedestal and a dominant inanimate
   heraldic, allegorical, or champion sculpture.
3. No accepted asset is merely an ordinary object placed on the shelf.
4. At 128 px, each asset reads first as a trophy statuette and second as its
   individual achievement concept.
5. The manifest, static asset map, catalog, and generated files match 70↔70.
6. The final shelf audit confirms the approved three-archetype family without
   photorealistic living characters, template recolors, or repeated sculptures.
7. Value is legible without labels: early, mid, high, and legendary tiers use
   progressively richer construction while preserving restrained neutral light.
8. At 128 px the set reads as a rich museum of varied rounded, flowing,
   slender, crystalline, architectural, mechanical, massive, and chased-metal
   awards, not as recolors of one coarse angular figure.
9. Rounded, flowing, and slender soft forms make up at least two thirds of the
   set. Boxy/faceted bodies remain rare concept-specific exceptions and never
   appear as the default treatment in consecutive batches.
