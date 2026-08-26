#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..', '..');

function parseArgs(args) {
  const values = new Map();
  let pilot = false;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--pilot') {
      pilot = true;
      continue;
    }
    if (arg !== '--manifest' && arg !== '--out-dir') {
      throw new Error(`Unknown argument: ${arg}`);
    }
    const value = args[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
    values.set(arg, value);
    index += 1;
  }
  if (!values.has('--manifest') || !values.has('--out-dir') || !pilot) {
    throw new Error(
      'Usage: node scripts/avatar-100/build-prompts.mjs --manifest <path> --out-dir <path> --pilot',
    );
  }
  return {
    manifestPath: path.resolve(ROOT, values.get('--manifest')),
    outputDir: path.resolve(ROOT, values.get('--out-dir')),
  };
}

export function buildPrompt(entry) {
  return `Use case: stylized-concept
Asset type: Phraseman custom avatar master, later converted into a dark/light pair
Primary request: Create a completely original avatar for the learner archetype "${entry.nameRu}". Express this behavior through ${entry.visualMetaphor}.
Subject class: ${entry.subjectType}
No human or humanoid. Depict only the specified creature, artifact, non-wearable sculptural mask, or abstract form. Absolutely no human face, body, hands, clothing, portrait pose, or android. A mask is an independent object without eyes, mouth, human proportions, or a wearer.
Scene/backdrop: none; genuinely transparent background
Style/medium: ${entry.house.medium}. Treat every attached image as a quality reference only. Match the attached current Phraseman achievement references only for professional material fidelity, sculptural clarity, clean studio lighting, and finish quality. Do not copy any reference subject, silhouette, composition, pedestal, or ornament.
Composition/framing: single centered subject, calm front or three-quarter presentation, strong silhouette, approximately 290 x 380 px of a 512 x 512 canvas, entirely inside the supplied inset standing-hexagon safe zone
Lighting/mood: premium studio object lighting appropriate to the stated material; controlled highlights; readable at 20 px
Color palette: neutral mid-value base material prepared for later dark/light remapping; house accents ${entry.house.accents.join(', ')} must remain limited and intentional
Constraints: exact square 512 x 512 output; genuinely transparent background with alpha; one subject only; culturally neutral; no stereotypes; no visible language; no text, letters, numbers, logo, watermark, frame, badge, pedestal, or background
Avoid: ${entry.house.avoid.join(', ')}; generic fantasy; hooded oracle; crown; central blue forehead crystal; round medal; existing Phraseman avatar; existing Phraseman achievement composition; duplicate of another pilot
`;
}

function tierDirection(price) {
  if (price === 3000) {
    return 'Rarity direction: Absolute showcase tier; one imperial astral snow leopard that is beautiful, noble, and visibly priceless. Preserve coherent feline anatomy with four natural feline limbs, a powerful chest, elegant head, long expressive tail, and a layered celestial mantle grown organically from the shoulders. It must feel more prestigious and commanding than every 1000-pearl creature; no rainbow; no horror, monster jaw, generic dragon, or clutter; no detached halo, orbital ring, scenery, humanoid, or machine.';
  }
  if (price === 300) {
    return 'Rarity direction: recognizable real apex predator; legendary natural strength; controlled iconic pose; refined gold and obsidian craft attached to the anatomy.';
  }
  if (price === 500) {
    return 'Rarity direction: aggressive mythical apex predator; heavier silhouette and greater apparent mass; coherent organic or mineral armor, horns, fangs, claws, or attached elemental anatomy; platinum and deep-crimson signature.';
  }
  if (price === 1000) {
    return 'Rarity direction: primordial non-humanoid super-being; unique but coherent anatomy; immense presence; restrained void or cosmic energy embedded in the body; black-diamond signature; no rainbow or generic full-spectrum treatment.';
  }
  if (price === 150) return 'Rarity direction: rare organic creature with a more elaborate connected silhouette and restrained attached glow.';
  if (price === 100) return 'Rarity direction: premium organic creature with layered natural material, refined detailing, and a confident readable pose.';
  if (price === 70) return 'Rarity direction: vivid organic subject with an expressive pose and richer surface pattern while remaining approachable.';
  return 'Rarity direction: friendly starter organic subject with a compact silhouette, tactile material, and clean readable detailing; no jewelry, armor, gems, chains, pendants, or ceremonial ornament; one subtle natural marking at most.';
}

export function buildVariantPrompt({ id, subject, price, variant }) {
  if (!Number.isInteger(id) || !subject || ![50, 70, 100, 150, 300, 500, 1000, 3000].includes(price)
    || !['black', 'white'].includes(variant)) {
    throw new Error('Variant prompt requires id, subject, supported price, and black|white variant');
  }
  const starter = price <= 70;
  const variantDirection = price === 3000
    ? variant === 'black'
      ? 'Variant direction: BLACK Absolute artwork for a warm light card. This must be an independent generation, not a recolor or negative. Use a poised walking three-quarter stance with black-diamond, champagne gold, and restrained cold-white embedded constellations.'
      : 'Variant direction: WHITE Absolute artwork for a dark navy card. This must be an independent generation, not a recolor or negative. Use a distinct seated three-quarter stance with moonstone, platinum, champagne gold, and restrained cold-white embedded constellations.'
    : variant === 'black'
      ? `Variant direction: BLACK artwork for a warm light card. This must be an independent generation, not a recolor or negative. Use a grounded three-quarter pose with ${starter ? 'charcoal, warm cocoa, matte natural texture, and one restrained turquoise accent' : 'deep obsidian, blackened bronze, controlled gold, and selective tier accents'}.`
      : `Variant direction: WHITE artwork for a dark navy card. This must be an independent generation, not a recolor or negative. Use a distinct dynamic three-quarter pose with ${starter ? 'ivory, cream, matte tactile texture, and one restrained pale-blue accent' : 'ivory, moonstone, platinum, pale gold, and selective tier accents'}.`;
  const finish = starter
    ? 'a polished but deliberately restrained collectible avatar asset'
    : 'a premium sculptural achievement-style avatar asset';
  return `Use case: stylized-concept
Asset: Phraseman avatar custom-idea-${id}-${variant}, price ${price} pearls
Primary request: create one completely original ${subject} as ${finish}.
${tierDirection(price)}
${variantDirection}
Background: one perfectly flat saturated chroma matte, acid green #00F56A, uniform corner to corner, excluded from every part of the subject palette; no gradient, shadow, texture, scenery, floor, halo, vignette, or checkerboard.
Composition: exactly one centered organic non-human subject; full silhouette with empty margin on all four sides; every ear, horn, wing, claw, paw, fin, feather, tooth, tentacle, and tail fully visible; strong readable silhouette at small avatar size; square canvas.
Anatomy: coherent species anatomy, deliberate joints and appendages, no fused limbs, no duplicated body parts, no broken geometry, no transparent holes through pale anatomy.
Materials: premium physical surface fidelity, sculptural clarity, clean controlled studio lighting, connected detail only. Effects must be embedded in or physically attached to the body.
Constraints: no human, humanoid, robot, machine, vehicle, text, pedestal, or detached ornament; no weapon, crown, medal, frame, logo, watermark, floating shard, spark, smoke stroke, random line, or extra creature; no crop; no part touching the canvas edge.
Output intent: independent generation for this exact variant, later extracted from the saturated matte and normalized to a transparent 512 x 512 WebP.
`;
}

function main() {
  const { manifestPath, outputDir } = parseArgs(process.argv.slice(2));
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.version !== 1 || !Array.isArray(manifest.entries)) {
    throw new Error('Unsupported avatar-100 manifest');
  }
  const pilotIndexes = new Set(manifest.pilotAssetIndexes);
  const entries = manifest.entries.filter((entry) => pilotIndexes.has(entry.assetIndex));
  if (entries.length !== 10) throw new Error(`Expected 10 pilot entries; got ${entries.length}`);

  fs.mkdirSync(outputDir, { recursive: true });
  for (const entry of entries) {
    const outputPath = path.join(outputDir, `custom-idea-${entry.assetIndex}-master.txt`);
    fs.writeFileSync(outputPath, buildPrompt(entry));
  }
  process.stdout.write(`avatar-100 prompts: ${entries.length} files -> ${outputDir}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
