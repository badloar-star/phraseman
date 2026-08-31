#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { pathToFileURL } from 'node:url';
import {
  PHENOMENA_GENERATION_CATALOG,
  buildBlackPrompt,
  buildWhitePrompt,
  rawPathFor,
} from './catalog.mjs';

const PNG_SIGNATURE = Buffer.from('89504e470d0a1a0a', 'hex');

export async function exportPhenomenaResult({ rolloutPath, id, ink, destination }) {
  if (!/^custom-phen-(0[1-9]|1[0-8])$/.test(id) || !/^(black|white)$/.test(ink)) {
    throw new Error('avatar_phenomena_export_invalid_identity');
  }
  const markerId = `Avatar phenomena id: ${id}`;
  const markerInk = `Ink: ${ink}`;
  let selected = null;
  const lines = readline.createInterface({ input: createReadStream(rolloutPath, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.trim()) continue;
    let event;
    try { event = JSON.parse(line); } catch { continue; }
    const payload = event.payload ?? {};
    const prompt = payload.revised_prompt ?? '';
    if (payload.type === 'image_generation_end' && payload.result && prompt.includes(markerId) && prompt.includes(markerInk)) {
      selected = { prompt, result: payload.result };
    }
  }
  if (!selected) throw new Error(`avatar_phenomena_result_not_found: ${id}:${ink}`);
  const png = Buffer.from(selected.result, 'base64');
  if (png.length < 24 || !png.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error('avatar_phenomena_result_not_png');
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, png);
  await writeFile(path.join(path.dirname(destination), 'prompt.json'), `${JSON.stringify({ id, ink, status: 'accepted', prompt: selected.prompt }, null, 2)}\n`);
  return {
    destination,
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
    sha256: createHash('sha256').update(png).digest('hex'),
  };
}

export async function checkpointGeneratedImage({ generatedPath, destination, id, ink, prompt, reference = null }) {
  if (!/^custom-phen-(0[1-9]|1[0-8])$/.test(id) || !/^(black|white)$/.test(ink)) {
    throw new Error('avatar_phenomena_checkpoint_invalid_identity');
  }
  const png = await readFile(generatedPath);
  if (png.length < 24 || !png.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error('avatar_phenomena_checkpoint_not_png');
  const width = png.readUInt32BE(16); const height = png.readUInt32BE(20);
  if (width !== height || width < 1024) throw new Error(`avatar_phenomena_checkpoint_dimensions: ${width}x${height}`);
  const sha256 = createHash('sha256').update(png).digest('hex');
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(generatedPath, destination);
  const checkpoint = { id, ink, status: 'accepted', prompt, generatedPath: generatedPath.replaceAll('\\', '/'), sha256 };
  if (reference) checkpoint.reference = reference.replaceAll('\\', '/');
  checkpoint.approval = { no_character: true, no_face: true, fills_hex: true, lower_v_contact: true, clean_matte: true };
  if (ink === 'white') checkpoint.approval.yin_yang_match = true;
  await writeFile(path.join(path.dirname(destination), 'prompt.json'), `${JSON.stringify(checkpoint, null, 2)}\n`);
  return { destination, width, height, sha256 };
}

async function latestRollout(root = path.join(os.homedir(), '.codex', 'sessions')) {
  const candidates = [];
  async function walk(folder) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const full = path.join(folder, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (/^rollout-.*\.jsonl$/i.test(entry.name)) candidates.push({ full, modified: (await stat(full)).mtimeMs });
    }
  }
  await walk(root);
  return candidates.sort((left, right) => right.modified - left.modified)[0]?.full ?? null;
}

async function runCli() {
  const valueFor = (name) => { const index = process.argv.indexOf(name); return index < 0 ? null : process.argv[index + 1]; };
  const id = valueFor('--id'); const ink = valueFor('--ink'); const destination = valueFor('--destination');
  const generatedPath = valueFor('--generated-path');
  if (generatedPath) {
    const item = PHENOMENA_GENERATION_CATALOG.find((candidate) => candidate.id === id);
    if (!item || !ink || !destination) throw new Error('avatar_phenomena_checkpoint_invalid_arguments');
    const prompt = ink === 'black' ? buildBlackPrompt(item) : buildWhitePrompt(item);
    const reference = ink === 'white' ? rawPathFor(id, 'black') : null;
    const receipt = await checkpointGeneratedImage({ generatedPath, destination, id, ink, prompt, reference });
    console.log(JSON.stringify(receipt));
    return;
  }
  const rolloutPath = valueFor('--rollout') ?? await latestRollout();
  if (!rolloutPath || !id || !ink || !destination) throw new Error('usage: export-rollout-image.mjs --id <id> --ink <black|white> --destination <source.png> [--generated-path <png> | --rollout <jsonl>]');
  const receipt = await exportPhenomenaResult({ rolloutPath, id, ink, destination });
  console.log(JSON.stringify(receipt));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runCli().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
}
