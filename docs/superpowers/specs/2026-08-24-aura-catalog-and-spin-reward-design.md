# Aura catalog and random Spin reward design

Date: 2026-08-24  
Status: owner-approved design

## Objective

Ship every one of the 39 approved layered aura designs exactly as shown in the final gallery, preserve all existing aura purchases and access entitlements, return the previously retired ordinary aura slots to sale, and add a low-probability random-aura reward to the single Level Spin experience.

## Approved visual source

The immutable visual source is `.codex-tmp/avatar-aura-v2/collection.json` plus the 117 WebP layers in `.codex-tmp/avatar-aura-v2/layers/<design-id>/{base,flow,accents}.webp`.

- Every aura uses the approved `base`, `flow`, and `accents` pixels without regeneration or visual substitution.
- Every layer remains square, centered, transparent, and rotation-safe around the application's hexagonal avatar.
- Runtime motion rotates layers on true circular paths and uses independent speeds/directions plus restrained breathing/twinkle.
- Reduced-motion mode shows the same composed aura without looping animation.

## Stable-ID compatibility mapping

Existing internal IDs remain stable so previous owners and subscribers lose nothing. Their art and display name become the approved replacement design:

| Existing runtime ID | Approved replacement design |
| --- | --- |
| `aura-aurora` | Quiet Orbit |
| `aura-ember` | Ember Claw |
| `aura-mint` | Moss Current |
| `aura-violet` | Quantum Grid |
| `aura-coral` | Coral Bloom |
| `aura-prism` | Candy Comet |
| `aura-lagoon` | Soft Tide |
| `aura-sunset` | Nebula Gate |
| `aura-plus` | Solar Sovereign |
| `aura-pro` | Reality Breaker |

The five ordinary legacy slots currently marked retired are returned to sale. Plus and Pro keep their existing access semantics. The other 29 ordinary approved designs receive new stable IDs using the `aura-<design-slug>` form, including Rainbow Loop as `aura-rainbow-loop`. The resulting approved collection contains exactly 37 ordinary purchasable auras, one Plus aura, and one Pro aura.

Nimbus and Season Pass aura IDs are not repurposed and keep their existing reward-only behavior and art.

## Catalog and ownership behavior

- Existing `avatar_aura_owned_v1`, `avatar_aura_gift_owned_v1`, and `user_avatar_aura` storage contracts remain unchanged.
- Existing ownership flags continue to unlock their stable ID after the visual replacement.
- All 37 ordinary approved auras are purchasable through the existing composite customization purchase flow.
- Plus and Pro remain entitlement-only and cannot be bought or won as ordinary auras.
- The app and admin archive preview resolve the same three exact layer files for every approved aura.

## Level Spin reward

The existing durable gift ID `cosmetic_avatar_aura` is added to the local Level Spin v2 catalog instead of inventing a second reward contract.

- Weight: `6170` against the current `199511` total, producing `6170 / 205681 = 2.9997909%`.
- The reward selects uniformly from currently unowned ordinary shop auras.
- Plus, Pro, reward-only, retired, and level-gated auras are excluded from random selection.
- If the player already owns every eligible ordinary aura, the existing deterministic fallback grants 350 XP.
- The gift art is a new transparent 512×512 DALL·E-created aura reliquary in the same label-free, material 3D fantasy style as existing Level Spin reward art.

## Durability and retry behavior

The current local Spin receipt remains the authority:

1. Consuming a Spin credit and persisting the chosen gift receipt, journal entry, balance projection, and pending reveal happen in one local commit.
2. Opening the aura gift first persists the exact selected aura in the existing occurrence receipt.
3. Ownership, last gifted aura, and active aura are then written idempotently.
4. Reopening, retrying, restarting, or replaying the same occurrence reuses the same selected aura and never grants a second result.
5. No pearl debit or new server-authoritative balance path is introduced.

No Firestore collection, field, or Jarvis data contract changes are required because existing ownership and Spin journal contracts are reused.

## Validation

- Tests prove exactly 39 aura definitions, 117 unique static layer requires, exact source hashes, square/alpha geometry, centering, padding, and circular rotation-safe radius.
- Catalog tests prove all old IDs still resolve, retired ordinary slots are again for sale, and Plus/Pro access is unchanged.
- Spin tests prove the 2.9997909% weight, receipt compatibility, crash/retry idempotency, exclusion of Plus/Pro/reward-only auras, and the all-owned 350 XP fallback.
- Asset tests validate the new 512×512 transparent Spin reward artwork.
- Focused economy, cloud-owned-union, Firestore Rules, and Jarvis guards remain green.
- Runtime QA covers dark/light themes, reduced motion, small avatar slots, hexagonal avatars, shop cards, profiles, battles, and the Spin reveal/claim flow.

## Out of scope

- Regenerating or restyling any of the 39 approved aura layer sets.
- Changing Season Pass or Nimbus ownership rules.
- Allowing Plus or Pro to drop from Spin.
- Introducing a new backend Spin system or a new Firestore schema.
