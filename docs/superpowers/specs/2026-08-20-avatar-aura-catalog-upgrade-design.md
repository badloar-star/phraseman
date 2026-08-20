# Avatar Aura Catalog Upgrade Design

Date: 2026-08-20  
Status: Approved for planning  
Supersedes: the winner-finalization scope in `2026-08-20-avatar-aura-dalle-candidates-design.md`

## Goal

Replace every ordinary legacy aura with one of the nine user-approved layered
designs, return all eight legacy aura slots to sale, add the remaining design as
one new ordinary aura, and create separate top-tier art for Plus and Pro.

The change must preserve every existing purchase and equipped selection. It must
also keep the art centred around the real hexagonal avatar and prevent clipping
in compact cards, lists, profiles, and larger account previews.

## Chosen Compatibility Approach

Use an in-place visual upgrade for the eight legacy ordinary aura IDs. Ownership
is stored by stable ID, so changing only their art and removing their
`retiredFromShop` flags gives previous owners the upgraded visuals without a
migration or a second purchase.

Two alternatives were rejected:

- introducing new semantic IDs plus aliases would make catalog, selection, and
  cloud-sync behavior harder to reason about;
- granting replacement IDs through a migration would create unnecessary account
  writes and entitlement risk.

No ownership record, equipped selection, price receipt, or legacy ID alias is
rewritten by this project.

## Approved Ordinary Aura Mapping

| Existing catalog ID | Existing name | Approved layered design | Catalog result |
| --- | --- | --- | --- |
| `aura-aurora` | Aurora | Polar Orbit A | Returned to sale |
| `aura-ember` | Ember | Rose Plasma A | Remains on sale |
| `aura-mint` | Mint | Jade Current A | Remains on sale |
| `aura-violet` | Violet | Velvet Eclipse A | Returned to sale |
| `aura-coral` | Coral | Solar Ribbon C | Returned to sale |
| `aura-prism` | Prism | Prism Fold A | Remains on sale |
| `aura-lagoon` | Lagoon | Lagoon Helix C | Returned to sale |
| `aura-sunset` | Sunset | Sunset Vector A | Returned to sale |
| `aura-lime-pulse` | Lime Pulse | Lime Pulse A | Added as a new sale item |

All nine ordinary auras use the existing ordinary price of 120 pearls. Remote
catalog sale overrides remain authoritative for temporarily enabling or
disabling an item; the local default is that all nine are for sale.

Ice Halo is explicitly excluded. It is not generated again, bundled, added to
the catalog, or used as a replacement.

## Plus And Pro Candidate Direction

Plus and Pro keep their stable IDs, subscription eligibility, names, and
fallback behavior. Only their visual assets change after the user chooses a
winner.

### Plus: Auric Throne

Generate three distinct variants built from warm gold, pale pearl light, and a
small amber depth tone. The silhouette uses crown-like light arcs aligned around
the avatar hex, but never depicts a literal crown object. The motion should feel
premium and controlled: a slow base turn, a counter-rotating braided flow, and
sparse diamond-like glints.

### Pro: Singularity Reactor

Generate three distinct variants using white-hot blue, deep cobalt, and a small
ultraviolet accent. The silhouette uses broken gravitational rails and an
energy-reactor pulse around the hex. Pro must be visibly more complex and more
energetic than Plus while retaining a clean centre and readable edges. Its flow
and accents counter-rotate at clearly different speeds.

The browser comparison shows all three Plus and all three Pro candidates on the
same dark and light surfaces used for the ordinary aura review. The user selects
one winner for each tier before either enters the app bundle.

## Asset And Rendering Architecture

Every final aura consists of exactly three transparent WebP layers:

1. `base`: persistent structure and soft light mass;
2. `flow`: the main independently rotating ribbon, rail, or arc;
3. `particles`: sparse accents that counter-rotate and twinkle.

Raw generations, candidate sheets, rejected variants, and intermediate crops
remain under `.codex-tmp/avatar-aura-candidates/`. Only the selected,
alpha-preserving, compressed WebP layers may enter `assets/images/**`, and every
bundled file must have one static `require()` in the application resolver.

A general avatar-aura asset resolver maps ordinary, Plus, and Pro IDs to layered
art, then falls back to the existing Season Pass resolver. The existing layered
ring renderer remains the single animation implementation, so lifecycle,
focus, app-background, and Reduced Motion behavior stay consistent across
catalog and Season Pass auras.

Missing art must fail safely by falling back to the existing programmatic aura
renderer rather than hiding the avatar or crashing the screen.

## Geometry And Motion Contract

The real avatar silhouette is the application hex:
`50,3.5 93,26 93,74 50,96.5 7,74 7,26`.

Final assets use a centred 320 by 320 transparent canvas. Their visible art is
large enough to read around the hex but stays inside a rotation-safe radius of
147 pixels. The production ring is rendered at 1.50 times avatar size with a
layout gutter that keeps the aura centred and prevents the outer canvas from
changing avatar alignment.

The quality checks apply at avatar sizes 44, 54, and 82 pixels:

- the open centre never covers the face area;
- no visible pixel clips during a complete rotation;
- the visual centre is within 1.5 source pixels of the canvas centre;
- the aura remains readable on light and dark surfaces;
- the art is centred on the hex, not on a circular placeholder;
- Reduced Motion shows a balanced static frame with no essential information
  lost.

Animations use only opacity and transforms. Durations are data-driven per aura:
base rotation is slow or static, flow rotation is medium, accents are faster and
usually reversed, and breathing remains subtle. Compact off-screen or inactive
avatars do not run animation loops.

## Data And Economy Boundaries

- Stable IDs for the eight legacy ordinary auras, `aura-plus`, and `aura-pro`
  remain unchanged.
- `aura-lime-pulse` is the only new entitlement ID.
- The ordinary purchase price remains `AVATAR_AURA_BUY_COST = 120`.
- Reopening retired auras changes catalog availability only; it does not debit,
  grant, revoke, recalculate, or migrate any balance or entitlement.
- Existing purchase validation continues to bind each debit to its exact aura
  grant through the current composite customization purchase flow.
- Plus and Pro eligibility checks remain unchanged.
- Nimbus and all Season Pass reward auras remain outside this catalog change.

## Verification

Focused verification must prove:

1. all eight legacy IDs still normalize to themselves and remain usable by an
   existing owner;
2. all nine ordinary IDs are visible and locally purchasable for 120 pearls;
3. old ownership maps and equipped selections need no migration;
4. Plus and Pro retain their existing access gates;
5. each production aura ID resolves to exactly three statically required WebP
   layers;
6. Ice Halo has no catalog entry or bundled production asset;
7. the renderer respects focus, app lifecycle, animation opt-out, and Reduced
   Motion;
8. geometry checks pass at 44, 54, and 82 pixels without clipping or drift;
9. light and dark snapshot previews keep the aura legible;
10. missing art uses the programmatic fallback safely.

The narrow regression set covers aura definitions, catalog visibility, purchase
validation, purchase intent, cloud-sync ownership merging, subscription access,
asset mapping, and layered renderer lifecycle behavior.

## Delivery Sequence

1. Generate three Plus and three Pro layered candidates with built-in Codex
   image generation; do not use a project or user API credential.
2. Normalize and place the six animated composites in the existing browser
   mockup for user selection.
3. Wire all production asset slots with static imports before copying final
   compressed files into the bundle.
4. Integrate the nine approved ordinary auras and the selected Plus/Pro winners.
5. Return the five retired IDs to sale and add `aura-lime-pulse`.
6. Run focused catalog, entitlement, renderer, geometry, and asset-hygiene gates.

## Acceptance Criteria

- Every previous aura buyer retains access under the same ID and automatically
  receives the upgraded art.
- All eight legacy ordinary auras are again available for purchase, and Lime
  Pulse is a ninth ordinary item.
- Plus and Pro each have a separately selected, unmistakably higher-tier design;
  Pro is visually strongest.
- Every aura is centred on the real hex, slightly larger than the corrected
  candidate preview, and never clipped in supported avatar surfaces.
- No rejected or raw image enters the application bundle.
- No Season Pass or Nimbus behavior changes.
