import fs from 'node:fs/promises';
import path from 'node:path';
import { buildAtlasPrompt, buildReplacementPrompt } from './prompts.mjs';
import { resolveInside, revisionKey } from './paths.mjs';
import { validateCardManifest } from './schema.mjs';

export const NETWORK_POLICY = 'offline_only';

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function prepareCardBrief({ card, outputRoot }) {
  const validation = validateCardManifest(card);
  if (!validation.ok) throw new Error(`invalid_manifest:${validation.errors.join(',')}`);

  const revisionDir = resolveInside(outputRoot, revisionKey(card.contentId, card.revision));
  const dalleDir = path.join(revisionDir, 'dalle');
  await fs.mkdir(dalleDir, { recursive: true });

  await fs.writeFile(path.join(dalleDir, 'atlas-prompt.txt'), `${buildAtlasPrompt(card)}\n`, 'utf8');
  await writeJson(
    path.join(dalleDir, 'replacement-prompts.json'),
    card.items.map((item) => ({ itemId: item.id, prompt: buildReplacementPrompt(card, item.id) })),
  );

  const checkpointPath = path.join(revisionDir, 'checkpoint.json');
  await writeJson(checkpointPath, {
    schemaVersion: 1,
    contentId: card.contentId,
    revision: card.revision,
    stage: 'prompt_ready',
    atlasPath: null,
    verifiedAt: null,
  });
  return { revisionDir, checkpointPath };
}
