import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const tiers = [
  {
    range: '1-10',
    start: 1,
    end: 10,
    name: 'Frosted Novice Hex',
    palette: 'moonstone silver, pearl white, soft mint, cyan, clean teal-blue',
    progression:
      'very clean beginner crystals; each step adds a little more bevel depth, inner glow, and polish without adding exterior ornaments',
    notes:
      'Levels 1-4 should feel intentionally simple, 5 is the first visible jump, 10 is a clean icy-blue milestone.',
    perLevel: [
      'pale moonstone hex, one broad inner plane, quiet learner-start clarity',
      'pearl-silver hex, slightly thicker rounded rim, two calm internal facets',
      'cool silver-blue glass, soft triangular inner refraction, stronger top highlight',
      'platinum-blue crystal, wider bevel, four subtle corner glints',
      'aqua-silver milestone hex, raised rim, five broad planes around a clean center',
      'cyan frosted glass, luminous edge, gentle layered bevel',
      'teal-cyan glass, two elegant arc-like rim reflections, richer depth',
      'bright cyan-blue crystal, deeper side bevels, four large internal planes',
      'blue-teal prism, stronger inner glow, polished collectible shine',
      'icy blue milestone hex, crisp beveled architecture, first full-tier prestige'
    ],
  },
  {
    range: '11-20',
    start: 11,
    end: 20,
    name: 'Arcane Sapphire Hex',
    palette: 'sapphire, cobalt, indigo, violet, mint-cyan edge glints',
    progression:
      'more saturated and dimensional than tier 1; add layered glass depth and controlled inner facets, never spikes',
    notes:
      'This tier should read as confident practice: blue/violet, sharper clarity, compact silhouette.',
    perLevel: [
      'clear sapphire glass, simple nested hex rim, stronger than level 10',
      'deep blue crystal, bright cyan bevel, compact layered rim',
      'cobalt-indigo hex, visible inner facet rhythm, clean center',
      'blue-violet prism, thicker side bevels, subtle mint highlight',
      'milestone sapphire-violet badge, raised double rim, broad readable planes',
      'indigo glass, luminous violet corners, calm inner glow',
      'violet-cobalt hex, refined edge polish, two diagonal refractions',
      'royal purple-blue crystal, premium bevel, compact silhouette',
      'magenta-violet edge accents, dark sapphire body, bright readable core',
      'major violet milestone hex, rich sapphire depth, strong but controlled glow'
    ],
  },
  {
    range: '21-30',
    start: 21,
    end: 30,
    name: 'Rose Ember Hex',
    palette: 'rose quartz, magenta, ruby, coral, ember orange, amber-gold',
    progression:
      'warmer and more heroic; increase saturation and material richness through large clean facets, not flame shapes',
    notes:
      'Avoid literal fire. The heat should come from glass color, glow, and bevel contrast.',
    perLevel: [
      'rose quartz hex, soft coral rim, bright open center',
      'pink-coral crystal, thicker beveled rim, warm highlight',
      'ruby rose hex, stronger diagonal facets, clean polished edge',
      'scarlet-magenta glass, deep inner glow, compact rounded corners',
      'ruby milestone hex, raised double rim, five broad ember facets',
      'coral-red glass, molten warm edge, clean side planes',
      'scarlet crystal, crisp diagonal refractions, darker warm rim',
      'red-orange prism, broad star-like inner planes kept inside the hex',
      'ember orange glass, polished ruby undertone, strong rim contrast',
      'orange-gold milestone hex, bold faceted trophy material, below gold tier'
    ],
  },
  {
    range: '31-40',
    start: 31,
    end: 40,
    name: 'Scholar Gold Hex',
    palette: 'amber, honey gold, rich gold, warm white, small emerald/cyan accents',
    progression:
      'expert tier; use premium gold-glass, nested hex geometry, and academic precision while preserving a compact rounded silhouette',
    notes:
      'This tier can feel more ceremonial, but must not become a laurel medal or crown.',
    perLevel: [
      'warm amber glass, simple gold rim, precise calm geometry',
      'honey crystal, thicker golden bevel, triangular inner planes',
      'amber-orange hex, subtle inner hex ring, broad geometry',
      'bright gold glass, refined top and bottom facets, clean center',
      'gold milestone hex, raised double rim, five elegant geometric facets',
      'champagne-gold glass, subtle hex grid only on rim, clean center',
      'antique gold crystal, nested hex outline, polished artifact feel',
      'luminous gold medallion, open geometric rim, strong dimension',
      'deep scholar gold, interlocking rim geometry, controlled complexity',
      'master gold milestone hex, bold nested hex architecture, major prestige jump'
    ],
  },
  {
    range: '41-50',
    start: 41,
    end: 50,
    name: 'Ivory Master Hex',
    palette: 'ivory crystal, pearl white, champagne gold, diamond, emerald, opal cyan',
    progression:
      'elite but calmer than v2; make the material cleaner, brighter, and more luxurious rather than adding spikes or side wings',
    notes:
      'Levels 45, 47-50 need special control: no noisy exterior leaves, no weak level-45 dip.',
    perLevel: [
      'ivory crystal hex, champagne trim, start of master tier',
      'white prism, gold triangular bevels, cleaner brighter body',
      'ivory core, champagne-gold bevel, subtle cobalt reflection',
      'tall white facets inside a rounded hex, gold side bevels',
      'ivory-gold milestone hex, raised double rim, clearly stronger than 44',
      'white crystal with aurora-green/violet edge glints, refined rim',
      'champagne architectural hex, broad clean facets, reduced visual noise',
      'white-gold crystal, outer star geometry kept inside the hex silhouette',
      'diamond-white hex, champagne edge lattice, restrained prismatic reflections',
      'grand ivory-gold milestone hex, radiant controlled crystal architecture'
    ],
  },
  {
    range: '51-60',
    start: 51,
    end: 60,
    name: 'Celestial Prism Hex',
    palette: 'white-gold, mythic pearl, opal, aurora cyan, emerald, restrained rainbow glints',
    progression:
      'legendary final tier; every level should feel brighter and more dimensional than 41-50 while staying compact and readable',
    notes:
      'Level 60 must win through material quality and inner light, not through extra objects, crowns, rays, or spikes.',
    perLevel: [
      'white-gold celestial prism, subtle warm accent, controlled start of legendary tier',
      'white-gold hex with storm-blue rim glints, crisp broad facets',
      'pearl crystal with frost-cyan inner edge, rare cold glow',
      'white-gold hex with lava-orange edge glints, high contrast clean center',
      'teal-opal milestone hex, raised double crystal rim, clear reward jump',
      'white-gold prism with gravity-violet edge glow, deep clean bevels',
      'pearl-gold crystal, stardust accents only on rim, calm center',
      'white-gold prism with restrained magenta/cyan edge facets, vivid but not noisy',
      'ethereal pearl hex, pale blue and rose refractions, almost final-tier',
      'ultimate level-60 celestial hex, radiant white-gold prism, iconic final silhouette'
    ],
  },
];

const sharedAtlasPrompt = `Create a square sprite atlas for a mobile language-learning app: 10 separate blank rounded hexagonal hexahedron crystal level badges arranged in a clean 5 columns x 2 rows grid, reading order.

Each cell contains exactly one centered front-facing hexagonal crystal hexahedron badge, filling 80-86% of its cell, with generous padding, on a perfectly flat solid #00FF00 chroma-key background. The badge is a compact polished 3D hex/crystal artifact, similar to the current PhraseMan level badges but cleaner, softer, more premium, and more aligned with a dark teal/gold/coral language-learning app.

The central face must be filled with translucent crystal facets and subtle inner light. It must not be hollow, not an empty ring, and not a dark number plate. Keep a calm bright center so exact level numbers can be added later in post-processing.

Do not include any numbers, digits, letters, labels, symbols, text, watermark, grid lines, UI mockup, characters, mascots, object icons, books, crowns, trophies, shells, pencils, items, laurel wreaths, wings, flames, swords, exterior spikes, starburst rays, aggressive sharp points, medieval metal, rough edges, noisy cracks, or cartoon props.

Style constraints: premium mobile game collectible, elegant polished crystal, smooth rounded bevels, compact rounded hexagonal silhouette, soft upper-left studio light, controlled reflections, readable at 44 px, consistent family across all 10 cells, each cell slightly stronger and more polished than the previous one.`;

const perLevelBase = `Create one premium mobile game level avatar emblem, no number and no text.
Subject: one centered rounded hexagonal hexahedron crystal badge for a gamified language-learning app, similar to the current PhraseMan level badges but cleaner, softer, more premium, and more aligned with dark teal/gold/coral app UI.
Composition: square icon, badge fills 82-88% of canvas, perfectly flat solid #00FF00 chroma-key background, no external shadow, no background texture.
Material: polished translucent gemstone, smooth rounded bevel, filled bright central face for deterministic number overlay, soft upper-left studio light, controlled lower-right depth.
Avoid: numbers, digits, letters, labels, watermark, characters, mascots, object icons, books, crowns, trophies, shells, pencils, laurel wreaths, wings, flames, swords, exterior spikes, starburst rays, hollow ring, dark number plate, rough metal, medieval medal, noisy tiny cracks, heavy bloom.`;

function levelTier(level) {
  return tiers.find((tier) => level >= tier.start && level <= tier.end);
}

function buildPerLevelPrompt(level) {
  const tier = levelTier(level);
  const index = level - tier.start;
  return `${perLevelBase}
Tier: ${tier.name}.
Tier palette: ${tier.palette}.
Progression rule: ${tier.progression}.
Level ${level} variation: ${tier.perLevel[index]}.
Quality bar: unique compared with level ${Math.max(1, level - 1)}, but still part of the same rounded hex crystal family; readable at 44 px; central area stays clean for a large exact number overlay.`;
}

function buildAtlasPrompt(tier) {
  return `${sharedAtlasPrompt}

Tier range: levels ${tier.range}.
Tier name: ${tier.name}.
Tier palette: ${tier.palette}.
Tier progression: ${tier.progression}.
Per-cell sequence in reading order:
${tier.perLevel.map((text, index) => `${tier.start + index}. ${text}`).join('\n')}

Every badge must be a hexagonal hexahedron/crystal badge, not an object icon.`;
}

const auditMd = `# Level Avatar Hex V4 Audit, Research Checklist, And DALL-E Prompts

Date: 2026-05-18

## Current State

- Runtime currently uses \`assets/images/levels/generated-v2/1.webp\` ... \`60.webp\` from both \`constants/avatars.ts\` and \`components/LevelBadge.tsx\`.
- \`assets/images/levels/generated-v3/\` exists, but it is a different direction: object-based collectible icons, not level hexahedrons. It should not replace the current level badges for this request.
- Current v2 contact sheets:
  - \`qa-artifacts/level-avatars-generated-v2-96px.png\`
  - \`qa-artifacts/level-avatars-generated-v2-44px.png\`

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

Design principles from \`ui-ux-pro-max\` applied here:

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
- [ ] Use flat \`#00FF00\` chroma-key background for local alpha extraction.

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

- Per-level prompts: \`docs/level-avatar-hex-v4-prompts-1-60.jsonl\`
- Atlas prompts for efficient DALL-E generation: \`docs/level-avatar-hex-v4-dalle-prompts.jsonl\`

## Generation Pipeline

1. Generate six DALL-E atlases from \`docs/level-avatar-hex-v4-dalle-prompts.jsonl\`.
2. Save them as:
   - \`tmp/avatar-generation-v4/source-atlases/levels-1-10.png\`
   - \`tmp/avatar-generation-v4/source-atlases/levels-11-20.png\`
   - \`tmp/avatar-generation-v4/source-atlases/levels-21-30.png\`
   - \`tmp/avatar-generation-v4/source-atlases/levels-31-40.png\`
   - \`tmp/avatar-generation-v4/source-atlases/levels-41-50.png\`
   - \`tmp/avatar-generation-v4/source-atlases/levels-51-60.png\`
3. Run \`node tools/process_level_avatar_hex_v4_atlases.mjs\`.
4. Review:
   - \`qa-artifacts/level-avatars-generated-v4-96px.png\`
   - \`qa-artifacts/level-avatars-generated-v4-44px.png\`
5. Wire \`constants/avatars.ts\` and \`components/LevelBadge.tsx\` to \`generated-v4\` only after visual QA passes.
`;

fs.mkdirSync(path.join(root, 'docs'), { recursive: true });

const perLevelRows = [];
for (let level = 1; level <= 60; level += 1) {
  const tier = levelTier(level);
  perLevelRows.push({
    level,
    tier: tier.name,
    output: `assets/images/levels/generated-v4/${level}.webp`,
    prompt: buildPerLevelPrompt(level),
  });
}

const atlasRows = tiers.map((tier) => ({
  range: tier.range,
  tier: tier.name,
  source: `tmp/avatar-generation-v4/source-atlases/levels-${tier.range}.png`,
  prompt: buildAtlasPrompt(tier),
}));

fs.writeFileSync(
  path.join(root, 'docs', 'level-avatar-hex-v4-prompts-1-60.jsonl'),
  perLevelRows.map((row) => JSON.stringify(row)).join('\n') + '\n',
);

fs.writeFileSync(
  path.join(root, 'docs', 'level-avatar-hex-v4-dalle-prompts.jsonl'),
  atlasRows.map((row) => JSON.stringify(row)).join('\n') + '\n',
);

fs.writeFileSync(
  path.join(root, 'docs', 'LEVEL_AVATAR_HEX_V4_AUDIT_CHECKLIST_PROMPTS.md'),
  auditMd,
);

console.log('Wrote v4 audit and prompts.');
