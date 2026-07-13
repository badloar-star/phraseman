# Seasonal Aura And Avatar Rewards Design

Date: 2026-07-13
Status: Approved by user
Owner: Codex design pass

## Goal

Give each of the next three Arena seasons a coherent cosmetic set:

- a seasonal aura for reaching Legend;
- a unique seasonal custom avatar for finishing in the Top 10;
- a separate champion aura for finishing first.

Rewards are cumulative. A champion receives the Legend aura, the Top-10 avatar,
and the champion aura. Existing generic seasonal rewards remain the fallback for
unmapped or legacy season IDs.

## Permanent Visual Rules

- No aura may be built from five or six separate multicolour strips.
- No particles, fireworks, confetti, orbiting dots, or random emitters.
- Use one or two continuous light masses, broad veils, crescents, or breathing
  contours.
- Motion must be slow, smooth, and readable in a paused frame.
- The effect stays within approximately \`avatarSize * 1.44\`.
- Animation uses transform and opacity, respects reduced motion, and stops when
  the screen is blurred or the app is backgrounded.
- The generated avatars use the exact Phraseman badge geometry
  \`50,3.5 93,26 93,74 50,96.5 7,74 7,26\` and remain readable at 44 and 54 px.

## Approved Season Mapping

### 2026-Q3 — Polar Resonance

| Tier | Stable ID | Name | Visual |
|---|---|---|---|
| Legend | \`aura-season-2026-q3-polar-breath\` | Polar Breath | Two broad cyan/indigo light veils slowly open and close. |
| Top 10 | \`custom-season-2026-q3-polar-guardian\` | Polar Guardian | Symmetric crystalline helmet in cyan, indigo, and soft violet. |
| Champion | \`aura-season-2026-q3-polar-crown\` | Polar Crown | Three symmetric continuous arcs breathe in offset phases. |

### 2026-Q4 — Velvet Eclipse

| Tier | Stable ID | Name | Visual |
|---|---|---|---|
| Legend | \`aura-season-2026-q4-velvet-crescent\` | Velvet Crescent | Two broad plum/coral crescents shift depth and inclination. |
| Top 10 | \`custom-season-2026-q4-obsidian-raven\` | Obsidian Raven | Frontal obsidian/plum raven mask with restrained gold eyes. |
| Champion | \`aura-season-2026-q4-eclipse-crown\` | Eclipse Crown | Gold and plum continuous crescents breathe around a dark centre. |

### 2027-Q1 — Jade Dawn

| Tier | Stable ID | Name | Visual |
|---|---|---|---|
| Legend | \`aura-season-2027-q1-jade-dawn\` | Jade Dawn | Broad jade/turquoise waves converge into one calm rhythm. |
| Top 10 | \`custom-season-2027-q1-jade-guardian\` | Jade Guardian | Symmetric jade mask with a turquoise core and one champagne-gold line. |
| Champion | \`aura-season-2027-q1-emerald-eclipse\` | Emerald Eclipse | One continuous emerald crescent slowly changes angle and density. |

Emerald Eclipse replaces the rejected segmented Imperial Halo concept.

## Reward Data Flow

The Cloud Function selects cosmetics from the exact completed \`seasonId\` stored
in \`arena_season_claims/{seasonId}_{uid}\`.

For mapped seasons:

1. Legend adds the mapped \`avatar_aura\` reward.
2. Top 10 adds the mapped \`custom_avatar\` reward.
3. First place adds the mapped champion \`avatar_aura\` reward.

The existing \`buildRewardProgressPatch\` remains the single server writer for
owned aura and custom-avatar maps. Claiming stays transactional and idempotent.
The client reward type exposes \`customAvatarId\`, \`gradientId\`, and \`logoColor\`
so the callable contract matches the existing \`RewardDrop\` contract.

For an unmapped season:

- Legend receives legacy \`aura-season\`;
- Top 10 and first place retain legacy \`aura-season-champion\`;
- no unknown custom avatar is granted.

Previously earned generic rewards and stored unknown IDs are not deleted.

## Catalog And Ownership

All six seasonal auras use \`acquisition: 'season'\`, remain \`rewardOnly\`, and
cannot enter shard purchase, gift, league-chest, Arena-pass, or admin pools.

The three seasonal avatars:

- are statically registered in \`CUSTOM_AVATARS\`;
- are absent from the shard shop and random gift pools;
- appear in the Studio only when owned or currently equipped;
- use the existing owned-map value format \`gradientId:logoColor\`;
- use the existing custom-avatar value format
  \`custom:<avatarId>:<gradientId>:<logoColor>\`.

Each generated coloured subject is stored once as a compressed transparent WebP.
Both \`imageBlack\` and \`imageWhite\` may statically require the same coloured
asset so Metro deduplicates it and the artwork is never tinted by the badge
renderer.

## Rendering

Season effects join the same renderer registry and shared-phase lifecycle as the
approved main aura collection. They do not create independent infinite loops.

Representative static frames must preserve the visual identity:

- Polar Breath: open veils;
- Polar Crown: balanced arcs;
- Velvet Crescent: offset crescents;
- Eclipse Crown: dark centre with restrained dual crescent;
- Jade Dawn: converged broad wave;
- Emerald Eclipse: one dominant crescent.

## Assets

Final generated sources live outside the repository. Only the three approved,
transparent, compressed WebP files are copied into
\`assets/images/avatars/seasonal/\` and wired through static \`require()\` calls.
No chroma-key originals, contact sheets, thumbnails, or duplicate variants enter
the app bundle.

## Verification

Focused tests cover:

1. exact season-ID mapping for all three approved seasons;
2. cumulative Legend / Top-10 / champion reward composition;
3. legacy fallback for an unmapped season;
4. idempotent claim behavior;
5. every mapped aura ID exists and has \`acquisition: 'season'\`;
6. every mapped custom avatar exists and is excluded from shop/gift pools;
7. custom-avatar reward fields survive the callable client type;
8. static asset references resolve;
9. reduced-motion and inactive-screen aura behavior;
10. existing Arena season and avatar Studio contracts.

Visual checks cover all three avatars at 44 and 54 px, all six auras at 44, 54,
and 82 px, light and dark surfaces, paused frames, and no clipping or layout
movement.

## Deployment

The change includes client assets/code and Cloud Functions reward logic.
Deployment therefore requires:

1. focused app and Functions tests;
2. production update gates and secret scan;
3. deployment of only the changed season-reward Cloud Function surface when the
   Firebase CLI supports an exact target;
4. an EAS production update for the client bundle and new assets;
5. post-deploy verification of function deployment and update publication.

Deployment must stop rather than bypass a failing release gate, dirty-worktree
conflict, missing credential, or incompatible native/runtime version.

## Acceptance Criteria

- The three approved seasonal sets appear exactly as designed.
- Top-10 and champion rewards are no longer the same cosmetic.
- Emerald Eclipse contains no segmented multicolour strip construction.
- Seasonal avatars cannot be purchased or randomly gifted.
- Legacy seasons continue to claim the previous generic rewards.
- Existing ownership, cloud merge, Arena pass, league chest, Plus, Nimbus, and
  explicit no-aura behavior remain intact.
