#!/usr/bin/env node
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { PHENOMENA_GENERATION_CATALOG, PHENOMENA_INKS, promptPathFor, rawPathFor } from './catalog.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');

export async function validateRawInventory({ tier = null } = {}) {
  const items = tier === null ? PHENOMENA_GENERATION_CATALOG : PHENOMENA_GENERATION_CATALOG.filter((item) => item.price === Number(tier));
  if (items.length === 0) throw new Error(`avatar_phenomena_unknown_tier: ${tier}`);
  const failures = [];
  let accepted = 0;
  for (const item of items) for (const ink of PHENOMENA_INKS) {
    const raw = path.join(ROOT, rawPathFor(item.id, ink));
    const promptFile = path.join(ROOT, promptPathFor(item.id, ink));
    try {
      await access(raw); await access(promptFile);
      const metadata = await sharp(raw).metadata();
      if (metadata.width !== metadata.height || (metadata.width ?? 0) < 1024) throw new Error('raw must be square and at least 1024px');
      const prompt = JSON.parse(await readFile(promptFile, 'utf8'));
      if (prompt.id !== item.id || prompt.ink !== ink || prompt.status !== 'accepted' || typeof prompt.prompt !== 'string') throw new Error('invalid prompt checkpoint');
      accepted += 1;
    } catch (error) {
      failures.push(`${item.id}:${ink}: ${error instanceof Error ? error.message : error}`);
    }
  }
  if (failures.length) throw new Error(`avatar_phenomena_raw_invalid\n${failures.join('\n')}`);
  return { ids: items.length, accepted, missing: 0 };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const tierIndex = process.argv.indexOf('--tier');
  validateRawInventory({ tier: tierIndex >= 0 ? process.argv[tierIndex + 1] : null })
    .then((result) => console.log(`${result.ids} ids, ${result.accepted} accepted raw images, ${result.missing} missing`))
    .catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
}
