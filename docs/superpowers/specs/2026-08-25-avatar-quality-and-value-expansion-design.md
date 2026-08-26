# Phraseman Avatars — Quality Repair and Predator Value Ladder Design

## Goal

Repair the complete active 63-pair avatar collection so that no subject is cropped, eroded, anatomically broken, or surrounded by extraction artifacts. Redesign the expensive tiers so that 300, 500, and 1000 pearls read as a clear progression from legendary real predators to mythic apex predators and finally primordial super-beings. Add one showcase-only 3000-pearl `Absolute` pair that is unmistakably above the entire collection without relying on rainbow color.

## Scope

- Audit every one of the 126 active images in pairs 63–125, not only the examples reported by the owner.
- Correct the extraction pipeline and replace every image that still fails visual or automated quality checks.
- Preserve the established 63 pairs / 126 images and add exactly one new independent pair at ID 126, producing 64 pairs / 128 images in the standalone showcase.
- Update the standalone showcase only where asset replacement or tier art direction requires it; do not change its inventory contract.
- Keep the new 3000-pearl extension outside the production app until the owner explicitly chooses production activation. No economy logic, production asset map, navigation, database, or purchase flow is changed by the showcase extension.
- Preserve all unrelated workspace edits.

## Confirmed Root Cause

The current normalizer treats edge-connected pale neutral pixels as background. When a generated subject contains pale neutral anatomy connected to that background through antialiasing, the flood fill continues into valid white petals, fur, feathers, wings, horns, and highlights. Some remaining defects are native generation defects: incoherent anatomy, looped or detached tails, and decorative fragments that do not belong to the subject.

The repair therefore has two parts: make extraction non-destructive, then regenerate any source whose geometry is already invalid.

## Extraction V2

1. New generations use a flat saturated chroma background whose color is explicitly excluded from the subject palette. A rendered checkerboard is not accepted as transparency.
2. Background removal operates only on pixels connected to the canvas edge. It never deletes a color globally inside the foreground.
3. Foreground pixels enclosed by the subject remain foreground even if they resemble the backdrop.
4. The output is a 512 × 512 transparent WebP with the full subject inside a safe inset and a visible empty margin on every side.
5. Rejected and replaced files are preserved in a versioned rejected folder before the active file is replaced.

## Subject Contract

- Exactly one organic non-human subject.
- No people, humanoids, robots, machines, vehicles, manufactured mechanical plating, weapons, crowns, medals, pedestals, or generic fantasy emblems. Organic, mineral, shell-like, or elemental armor may be part of a 500/1000 creature's anatomy.
- The whole subject, including ears, horns, wings, paws, fins, feathers, and tail, is fully visible.
- Anatomy is coherent and readable at avatar size.
- The silhouette is one deliberate composition. No detached shards, sparks, smoke, floating ornaments, random strokes, or stray lines.
- Premium effects must be physically attached to or embedded in the body: layered material, inlay, feather structure, shell structure, markings, or internal illumination.
- Dark and light versions are separate image generations with distinct pose, lighting, composition, and material treatment. Neither is a recolor, negative, or automatic transform of the other.

## Value Ladder

Every tier is identified by price, rarity name, framing, material complexity, silhouette complexity, and an attached visual signature. Color never carries the meaning alone.

| Price | Count | Rarity | Visual signature |
| ---: | ---: | --- | --- |
| 50 | 10 | Starter | Mint/turquoise accent, simple tactile material, clean compact silhouette |
| 70 | 10 | Vivid | Blue accent, richer surface pattern and more expressive pose |
| 100 | 10 | Premium | Violet accent, layered natural materials and finer detailing |
| 150 | 10 | Rare | Rose accent, controlled attached glow and more elaborate silhouette |
| 300 | 10 | Legendary Predator | Gold/obsidian accent; recognizable real apex predators, iconic controlled poses, natural strength, refined attached inlay |
| 500 | 10 | Mythic Apex | Platinum/deep-crimson accent; aggressive mythical predators with heavier silhouettes, coherent organic armor, horns, fangs, claws, or elemental anatomy |
| 1000 | 3 | Primordial | Black-diamond/void accent; unique non-humanoid super-beings with unprecedented anatomy, immense presence, and restrained cosmic or primordial energy — never generic rainbow treatment |
| 3000 | 1 | Absolute | Near-black, champagne-gold, moonstone, and cold-white signature; one imperial astral snow leopard with coherent feline anatomy and an organic celestial mantle |

The higher tier must remain more noticeable when viewed in grayscale: stronger silhouette, more confident posture, greater apparent presence, richer connected layering, denser craftsmanship, and more prestigious framing. Color is supporting evidence, never the only signal. Lower tiers remain attractive and complete; they never look broken or deliberately cheap. The 3000 pair is the single most noticeable pair through an elegant feline silhouette, a layered shoulder mantle grown into the anatomy, restrained embedded constellation detail, and an exclusive full-width card treatment rather than animation or full-spectrum color.

## Absolute 3000 Art Contract

- Asset ID: `custom-idea-126`; price label: 3000 pearls; rarity name: `Absolute`; subject name: `Imperial Astral Snow Leopard` / `Императорский астральный барс`.
- Exactly one beautiful non-humanoid celestial predator. Its coherent anatomy has four natural feline limbs, one elegant snow-leopard head, a powerful chest, one long expressive tail, and a layered celestial mantle grown organically from the shoulders. It is not a horror monster, dragon, robot, vehicle, armored humanoid, or collage of unrelated animals.
- The dark generation uses black-diamond fur and mantle plates, champagne-gold edges, and restrained cold-white constellation markings embedded in the anatomy.
- The light generation is a separate generation and pose using moonstone-white fur and mantle plates, platinum depth, champagne-gold edges, and restrained cold-white constellation markings. It is not a recolor or negative.
- Every luminous detail is embedded in the fur rosettes, eyes, or mantle plates. No orbiting rings, detached planets, floating shards, smoke trails, rainbow aura, scenery, pedestal, or external halo.
- Both variants use the same flat saturated matte background and the same extraction, margin, anatomy, hash, and manual-review gates as every other active variant.

## Quality Gates

Every active image must pass all of the following:

- exactly 512 × 512 pixels, transparent WebP, target size below 50 KB;
- transparent padding on all four sides and no alpha touching the safe inset boundary;
- one significant connected foreground subject, with no secondary fragment above the tuned antialias/noise tolerance;
- no suspicious straight-line fragments, detached decorations, or excessive pinholes/speckling;
- no visibly clipped anatomy or important detail closer than the safe-margin threshold;
- the dark and light files have different hashes and visibly different generation structure;
- manual visual review at card size and enlarged contact-sheet size.

Automated checks are rejection gates, not proof of artistic quality. A technically passing image is still replaced when manual review finds broken anatomy, accidental merging, unclear silhouette, or misplaced effects.

## Repair and Expansion Flow

1. Patch the normalizer and add focused regression fixtures for pale-neutral and magenta foreground preservation.
2. Run structural QA over all 126 current images and build review sheets on both intended and high-contrast diagnostic backgrounds.
3. Preserve and replace every failing variant. The reported rabbit, toucan, butterfly, roe deer, lemur, and flamingo receive mandatory review; the flamingo pair is regenerated rather than merely re-extracted.
4. Regenerate every failing variant sequentially, one image at a time, with the subject contract and tier signature embedded in every prompt. Dark and light members of a pair use separate prompts and separate generations.
5. Normalize, validate, and visually review each variant before advancing it into the active collection.
6. Refresh the showcase and diagnostic contact sheets after replacement without changing IDs or prices.
7. Add the independently generated 3000-pearl pair at ID 126 after its written art contract is approved.
8. Verify exact tier counts of 10/10/10/10/10/10/3/1 for prices 50/70/100/150/300/500/1000/3000.

## Showcase Treatment

- Keep the dark premium showroom and side-by-side `ТЁМНАЯ` / `СВЕТЛАЯ` pair presentation.
- Add visibly stronger but restrained framing for 500 and 1000 without using scale alone as the value signal.
- The 500 tier uses platinum/deep-crimson structure; the 1000 tier uses black-diamond/void structure and the strongest depth. Neither tier defaults to rainbow or full-spectrum treatment.
- The 3000 tier uses an exclusive static full-width card, a double near-black/pale-gold frame, four restrained corner markers, and the text label `Абсолют`. Its dominance comes from silhouette, spacing, frame hierarchy, and material contrast, not motion or iridescence.
- Maintain readable dark text on every bright lime or green filled control.
- Preserve keyboard navigation, visible focus, reduced-motion support, responsive one/two/three-column layouts, and meaningful alt text.

## Acceptance Criteria

- The repaired original collection contains 63 pairs, and the standalone expanded showcase contains exactly 64 pairs / 128 independently generated images after ID 126 is added.
- No active image has visible cropping, transparent holes through valid artwork, stray fragments, broken anatomy, or extraction residue.
- The showcase price counts are exactly 50×10, 70×10, 100×10, 150×10, 300×10, 500×10, 1000×3, and 3000×1.
- In a shuffled grayscale comparison, the 300, 500, 1000, and 3000 groups remain progressively more powerful through silhouette, posture, apparent mass, anatomy, and craftsmanship, not price labels or rainbow color alone.
- All assets load in the standalone showcase, all filters work, and the page has no horizontal overflow at 375 px.
- No production app or economy behavior is modified.
