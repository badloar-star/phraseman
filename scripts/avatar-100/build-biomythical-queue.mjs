#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { BIOMYTHICAL_AVATARS } from './biomythical-map.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..', '..');
const DEFAULT_OUTPUT_DIR = path.join(PROJECT_ROOT, '.codex-tmp', 'avatar-regeneration-v3');

const TIER_DIRECTION = Object.freeze({
  70: 'Approachable uncommon tier: compact friendly silhouette, tactile organic detail, two restrained accent materials, and no aggressive trophy styling.',
  100: 'Rare tier: more confident pose, clearer mythical adaptation, layered natural surface detail, and a visibly richer but uncluttered finish.',
  150: 'Epic tier: larger connected silhouette, rarer material behavior, stronger body-bound glow, and one memorable anatomical signature.',
  300: 'Legendary tier: noble apex presence, greater mass or wingspan, controlled gold or obsidian accents, and an unmistakably powerful silhouette.',
  500: 'Mythic tier: aggressive apex presence, heavier silhouette, body-grown defensive or predatory structures, platinum or deep-crimson accents, and more intense embedded energy.',
  1000: 'Primordial tier: a coherent non-humanoid super-being with immense scale, unique anatomy, black-diamond depth, restrained white-gold or void energy, and no rainbow treatment.',
});

const VARIANT_DIRECTION = Object.freeze({
  black: 'BLACK artwork for the warm light showcase card: darker body materials, grounded three-quarter presentation, warm controlled rim light, and a pose composed specifically for this version.',
  white: 'WHITE artwork for the dark navy showcase card: pale moonstone or ivory body materials, cooler controlled rim light, a distinctly different three-quarter presentation, and no reused pose.',
});

function variantPrompt(entry, variant) {
  const pose = variant === 'black' ? entry.darkPose : entry.lightPose;
  return `Use case: stylized-concept
Asset: Phraseman avatar custom-idea-${entry.id}-${variant}, price ${entry.price} pearls
Primary request: create exactly one original ${entry.name}, a ${entry.baseAnimal}, for the learner archetype "${entry.labelRu}".
Creature contract: begin from a recognizable real-animal body plan, then make it clearly fictional and more interesting through one coherent biomythical adaptation: ${entry.signature}. It must not look like an ordinary real animal.
Tier direction: ${TIER_DIRECTION[entry.price]}
Variant direction: ${VARIANT_DIRECTION[variant]} This is an independent generation, not a recolor, mirror, negative, or edit of the other variant.
Exact anatomy: ${entry.anatomy}.
Pose: ${pose}.
Background: one perfectly flat saturated chroma matte, acid green #00F56A, uniform corner to corner and excluded from every subject color; no gradient, shadow, floor, scenery, halo, vignette, texture, or checkerboard.
Composition: exactly one centered organic non-human creature; full silhouette with generous empty margin on all four sides; every appendage and the complete tail fully visible; nothing touches the canvas edge; strong readable silhouette at small avatar size; square canvas.
Materials and style: premium Phraseman achievement-asset quality, expressive sculptural form, high physical surface fidelity, clean controlled studio lighting, and connected detail only. Every glow, mineral, petal, plate, feather, fin, or pattern must grow from or remain physically attached to the body.
Manual anatomy review required before accepting the image: count every limb, paw, hoof, wing, fin, horn, eye, tooth, tentacle, and tail; reject fused joints, duplicated parts, broken geometry, unexplained holes, pale-background contamination, and malformed anatomy.
Constraints: no human or humanoid; no robot, machine, vehicle, mechanical armor, weapon, clothing, crown, medal, frame, pedestal, text, letters, logo, watermark, detached ornament, floating particle, random line, extra creature, or crop.
Avoid specifically: ${entry.avoid}.
Output intent: a clean source on chroma matte for later transparent extraction and normalization to 512 x 512 WebP.
`;
}

function absoluteLeopardPrompt() {
  return `Use case: stylized-concept
Asset: Phraseman avatar custom-idea-126-black, price 3000 pearls, Absolute tier
Primary request: create exactly one Imperial Astral Snow Leopard, the most beautiful and visibly expensive avatar in the full collection.
Creature contract: recognizable real-animal body plan of a powerful adult snow leopard, elevated by an organic celestial mantle grown continuously from the shoulder and chest fur. Preserve the identity of the accepted light variant while making a fully independent dark generation.
Variant direction: BLACK artwork for the warm light showcase card. This is an independent generation, not a recolor, mirror, negative, or edit of the accepted light variant.
Exact anatomy: exactly four natural feline legs, four complete paws, one elegant feline head, two ears, one muscular torso, and one long coherent snow-leopard tail. No wings, horns, crown, armor, jewelry, or detached celestial objects.
Pose: seated in a poised three-quarter presentation, all four paws anatomically readable, chest upright, tail resting in one elegant curve around the body; clearly different from the accepted light variant while both remain seated.
Rarity and materials: black-diamond fur, champagne-gold organic mantle fibers, restrained cold-white constellations embedded inside the fur, exceptional sculptural detail, noble calm power, and greater prestige than every 1000-pearl creature. Beautiful and aspirational, never horror.
Background: one perfectly flat saturated chroma matte, acid green #00F56A, uniform corner to corner and excluded from every subject color; no gradient, shadow, floor, scenery, halo, vignette, texture, or checkerboard.
Composition: exactly one centered creature; full silhouette with generous empty margin on all four sides; both ears, every paw, and the complete tail fully visible; nothing touches the canvas edge; square canvas.
Manual anatomy review required before accepting the image: count all four legs and paws, verify one continuous tail, correct seated pelvis and spine, clean facial symmetry, and no fused or duplicated anatomy.
Constraints: no human or humanoid; no robot, machine, vehicle, mechanical armor, weapon, generic dragon, world eater, monster jaw, rainbow, text, logo, watermark, frame, pedestal, detached halo, orbit, shard, spark, smoke, scenery, extra creature, or crop.
Output intent: a clean source on chroma matte for later transparent extraction and normalization to 512 x 512 WebP.
`;
}

function queueItem({ rootDir, entry, variant, prompt }) {
  const promptPath = path.join(
    rootDir,
    '.codex-tmp',
    'avatar-regeneration-v3',
    'prompts',
    `custom-idea-${entry.id}-${variant}.txt`,
  );
  return {
    id: entry.id,
    variant,
    price: entry.price,
    name: entry.name,
    labelRu: entry.labelRu,
    baseAnimal: entry.baseAnimal,
    anatomy: entry.anatomy,
    signature: entry.signature,
    pose: variant === 'black' ? entry.darkPose : entry.lightPose,
    prompt,
    promptPath,
    promptSha256: crypto.createHash('sha256').update(prompt).digest('hex'),
    status: 'pending',
  };
}

export function buildBiomythicalQueue({ rootDir = PROJECT_ROOT } = {}) {
  const items = BIOMYTHICAL_AVATARS.flatMap((entry) => ['black', 'white'].map((variant) => queueItem({
    rootDir,
    entry,
    variant,
    prompt: variantPrompt(entry, variant),
  })));

  const leopardEntry = {
    id: 126,
    price: 3000,
    name: 'Imperial Astral Snow Leopard',
    labelRu: 'Императорский астральный барс',
    baseAnimal: 'snow-leopard-like Absolute creature',
    anatomy: 'exactly four feline legs, four complete paws, one head, two ears, and one long coherent tail',
    signature: 'black-diamond fur with a champagne-gold organic celestial mantle',
    darkPose: 'seated in a poised three-quarter presentation with all four paws visible and the tail resting in one elegant curve',
    lightPose: 'accepted existing seated pose',
  };
  items.push(queueItem({
    rootDir,
    entry: leopardEntry,
    variant: 'black',
    prompt: absoluteLeopardPrompt(),
  }));

  return {
    version: 3,
    createdAt: new Date().toISOString(),
    policy: 'one image at a time; manual anatomy and extraction review before promotion',
    total: items.length,
    completed: 0,
    items,
  };
}

export function writeBiomythicalQueue({ outputDir = DEFAULT_OUTPUT_DIR } = {}) {
  const queue = buildBiomythicalQueue({ rootDir: PROJECT_ROOT });
  const promptDir = path.join(outputDir, 'prompts');
  fs.mkdirSync(promptDir, { recursive: true });
  for (const item of queue.items) {
    const promptPath = path.join(promptDir, path.basename(item.promptPath));
    fs.writeFileSync(promptPath, item.prompt, 'utf8');
    item.promptPath = promptPath;
  }
  const queuePath = path.join(outputDir, 'queue.json');
  fs.writeFileSync(queuePath, `${JSON.stringify(queue, null, 2)}\n`, 'utf8');
  return { queue, queuePath };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { queue, queuePath } = writeBiomythicalQueue();
  process.stdout.write(`avatar regeneration V3 queue: ${queue.total} pending items -> ${queuePath}\n`);
}
