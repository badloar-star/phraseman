# Level Avatar Hex V4 Audit, Research Checklist, And DALL-E Prompts

Date: 2026-05-18

## Current State

- Runtime now uses `assets/images/levels/generated-v4/1.webp` ... `60.webp` from both `constants/avatars.ts` and `components/LevelBadge.tsx`.
- Previous runtime set was `assets/images/levels/generated-v2/1.webp` ... `60.webp`.
- `assets/images/levels/generated-v3/` exists, but it is a different direction: object-based collectible icons, not level hexahedrons. It should not replace the current level badges for this request.
- Current v2 contact sheets:
  - `qa-artifacts/level-avatars-generated-v2-96px.png`
  - `qa-artifacts/level-avatars-generated-v2-44px.png`
- New v4 contact sheets:
  - `qa-artifacts/level-avatars-generated-v4-96px.png`
  - `qa-artifacts/level-avatars-generated-v4-44px.png`

## Audit Findings

What works:

- The level-avatar concept is right: compact hex/crystal badges are better for progression than character portraits.
- Numbers are deterministic overlays, so they are readable and not model-generated mistakes.
- The 1-60 progression reads by color: silver/cyan -> sapphire/violet -> rose/ember -> gold -> ivory-gold -> celestial white-gold.

What needs improvement:

- v2 often looks like medal/laurel jewelry rather than a clean hexahedron crystal.
- Outer spikes, leaf-like side shapes, and starburst tips add noise at 44 px.
- Several badges have dark central plates; the new set should use filled luminous crystal centers.
- The v2 shape language is consistent, but too aggressive and ornate for the app's softer premium learning UI.
- v3 is attractive in places, but fails the request because many levels are books, crowns, shells, stars, trophies, or other objects rather than hex/hexahedron badges.

## V4 Design Direction

Use DALL-E for the crystal/hexahedron material only, then add numbers locally.

Design principles from `ui-ux-pro-max` applied here:

- Accessibility: number readability at 44 px is the primary QA gate.
- Consistency: one silhouette family across all 60 levels.
- Performance: final assets should be transparent 512x512 WebP, no huge PNG masters in app assets.
- Style match: polished soft 3D/clay-crystal material fits a gamified education app better than sharp fantasy medals.
- Progression: each 5th level is a visible bump; each 10th level is a milestone; level 60 wins through material quality, not extra props.

## Research Checklist

Before generation:

- [ ] Use the current v2 contact sheet as the baseline to beat.
- [ ] Reject v3-style object icons for this request.
- [ ] Generate blank badges only; do not ask DALL-E for numbers.
- [ ] Keep shape as one centered rounded hexagonal hexahedron/crystal badge.
- [ ] Keep the center filled, bright, and calm for numeric overlay.
- [ ] Use flat `#00FF00` chroma-key background for local alpha extraction.

For each generated badge:

- [ ] One object only, centered.
- [ ] Hex/hexahedron silhouette, not a ring, not a crown, not a book, not a trophy.
- [ ] No DALL-E text, digits, letters, labels, or watermark.
- [ ] No long spikes, wings, laurel wreaths, flames, swords, rays, or side ornaments.
- [ ] Rounded bevels and compact silhouette survive at 44 px.
- [ ] Center is not black, hollow, or plate-like.
- [ ] Level feels slightly stronger than the previous one.
- [ ] 5/10 milestones are noticeably stronger but still in-family.

After post-processing:

- [ ] 60/60 WebP files exist.
- [ ] All files are 512x512 with alpha.
- [ ] Exact numbers 1-60 are centered and readable at 22, 44, 62, 82 px.
- [ ] Contact sheet reads as one set, not six unrelated batches.
- [ ] Bundle size remains reasonable.
- [ ] App mapping points to the accepted folder only after QA approval.

## Prompt Files

- Per-level prompts: `docs/level-avatar-hex-v4-prompts-1-60.jsonl`
- Atlas prompts for efficient DALL-E generation: `docs/level-avatar-hex-v4-dalle-prompts.jsonl`

## Generated V4 Assets

- Final assets: `assets/images/levels/generated-v4/1.webp` ... `60.webp`
- Manifest: `assets/images/levels/generated-v4/manifest.json`
- Number overlay: deterministic centered black level number (`#0B0F14`) with a thin neutral readability outline; no random number colors and no DALL-E-rendered digits.
- Source atlases: `tmp/avatar-generation-v4/source-atlases/levels-1-10.png` ... `levels-51-60.png`
- Processing script: `tools/process_level_avatar_hex_v4_atlases.mjs`
- Prompt writer: `tools/level_avatar_hex_v4_prompts.mjs`

Verification completed:

- [x] 60/60 WebP files exist.
- [x] 60/60 files are `512x512`.
- [x] 60/60 files have alpha.
- [x] Level numbers are centered and use one black style across all 60 avatars.
- [x] Runtime mapping points to `generated-v4`.
- [x] `npx tsc --noEmit --pretty false` passes.

## Generation Pipeline

1. Generate six DALL-E atlases from `docs/level-avatar-hex-v4-dalle-prompts.jsonl`.
2. Save them as:
   - `tmp/avatar-generation-v4/source-atlases/levels-1-10.png`
   - `tmp/avatar-generation-v4/source-atlases/levels-11-20.png`
   - `tmp/avatar-generation-v4/source-atlases/levels-21-30.png`
   - `tmp/avatar-generation-v4/source-atlases/levels-31-40.png`
   - `tmp/avatar-generation-v4/source-atlases/levels-41-50.png`
   - `tmp/avatar-generation-v4/source-atlases/levels-51-60.png`
3. Run `node tools/process_level_avatar_hex_v4_atlases.mjs`.
4. Review:
   - `qa-artifacts/level-avatars-generated-v4-96px.png`
   - `qa-artifacts/level-avatars-generated-v4-44px.png`
5. Wire `constants/avatars.ts` and `components/LevelBadge.tsx` to `generated-v4` only after visual QA passes.
