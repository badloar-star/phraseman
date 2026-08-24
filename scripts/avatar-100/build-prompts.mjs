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
