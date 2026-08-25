# Phraseman Avatars — Quality Repair and Value Expansion Design

## Goal

Repair the complete active avatar collection so that no subject is cropped, eroded, anatomically broken, or surrounded by extraction artifacts, then expand the showroom to 63 dark/light pairs whose price tiers read as a clear progression from 50 to 1000 pearls.

## Scope

- Audit every one of the 86 active images in pairs 41–83, not only the six examples reported by the owner.
- Correct the extraction pipeline and replace every image that still fails visual or automated quality checks.
- Add 20 new independent dark/light pairs: seven at 300 pearls, ten at 500, and three at 1000.
- Update the standalone showcase and its validators to display exactly 63 pairs / 126 images.
- Keep this work outside the production app. No economy logic, production asset map, navigation, database, or purchase flow is changed.
- Preserve all unrelated workspace edits.

## Confirmed Root Cause

The current normalizer treats edge-connected pale neutral pixels as background and also removes magenta pixels globally. This destroys valid pale, pink, and purple subject details after generation. Some remaining defects are native generation defects: incoherent anatomy, looped or detached tails, and decorative fragments that do not belong to the subject.

The repair therefore has two parts: make extraction non-destructive, then regenerate any source whose geometry is already invalid.

## Extraction V2

1. New generations use a flat saturated chroma background whose color is explicitly excluded from the subject palette. A rendered checkerboard is not accepted as transparency.
2. Background removal operates only on pixels connected to the canvas edge. It never deletes a color globally inside the foreground.
3. Foreground pixels enclosed by the subject remain foreground even if they resemble the backdrop.
4. The output is a 512 × 512 transparent WebP with the full subject inside a safe inset and a visible empty margin on every side.
5. Rejected and replaced files are preserved in a versioned rejected folder before the active file is replaced.

## Subject Contract

- Exactly one organic non-human subject.
- No people, humanoids, robots, machines, vehicles, mechanical plating, weapons, crowns, medals, pedestals, or generic fantasy emblems.
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
| 300 | 10 | Legendary | Gold accent, intricate connected ornament/inlay and strong iconic pose |
| 500 | 10 | Mythic | Platinum plus spectral aurora, multi-layer material depth and luminous internal structure |
| 1000 | 3 | Apex | Black-diamond framing plus full-spectrum light, unmistakable hero silhouette and highest coherent detail density |

The higher tier must remain more noticeable when viewed in grayscale: stronger silhouette, richer connected layering, denser craftsmanship, and more prestigious framing. Lower tiers remain attractive and complete; they never look broken or deliberately cheap.

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
2. Run structural QA over all 86 current images and build review sheets.
3. Preserve and replace every failing variant. The reported rabbit, toucan, butterfly, roe deer, lemur, and flamingo receive mandatory review; the flamingo pair is regenerated rather than merely re-extracted.
4. Generate new pairs sequentially, one image at a time, with the subject contract and tier signature embedded in every prompt.
5. Normalize, validate, and visually review each variant before advancing it into the active collection.
6. Extend the manifest, showcase, filters, tier descriptions, statistics, overview sheets, and validators to 63 pairs.
7. Verify exact tier counts of 10/10/10/10/10/10/3 for prices 50/70/100/150/300/500/1000.

## Showcase Treatment

- Keep the dark premium showroom and side-by-side `ТЁМНАЯ` / `СВЕТЛАЯ` pair presentation.
- Add visibly stronger but restrained framing for 500 and 1000 without scaling their subjects larger than lower tiers.
- The 500 tier uses platinum structure with spectral highlights; the 1000 tier uses black-diamond structure with full-spectrum light and the strongest depth.
- Maintain readable dark text on every bright lime or green filled control.
- Preserve keyboard navigation, visible focus, reduced-motion support, responsive one/two/three-column layouts, and meaningful alt text.

## Acceptance Criteria

- The active collection contains exactly 63 pairs and 126 independently generated images.
- No active image has visible cropping, transparent holes through valid artwork, stray fragments, broken anatomy, or extraction residue.
- The price counts are exactly 50×10, 70×10, 100×10, 150×10, 300×10, 500×10, and 1000×3.
- In a shuffled comparison, the 300, 500, and 1000 groups remain progressively more prestigious through form and craftsmanship, not price labels alone.
- All assets load in the standalone showcase, all filters work, and the page has no horizontal overflow at 375 px.
- No production app or economy behavior is modified.
