import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';

test('exports exactly one marked built-in image result to its checkpoint path', async () => {
  const { exportPhenomenaResult } = await import('../scripts/avatar-phenomena/export-rollout-image.mjs');
  const temp = await mkdtemp(path.join(os.tmpdir(), 'avatar-phenomena-export-'));
  const rolloutPath = path.join(temp, 'rollout.jsonl');
  const destination = path.join(temp, 'raw', 'source.png');
  const png = await sharp({ create: { width: 16, height: 16, channels: 3, background: '#00F56A' } }).png().toBuffer();
  const prompt = 'Avatar phenomena id: custom-phen-01\nInk: black\nHigh quality Spark Rain';
  await writeFile(rolloutPath, `${JSON.stringify({ payload: { type: 'image_generation_end', result: png.toString('base64'), revised_prompt: prompt } })}\n`);

  const receipt = await exportPhenomenaResult({ rolloutPath, id: 'custom-phen-01', ink: 'black', destination });

  assert.equal(receipt.width, 16);
  assert.equal(receipt.height, 16);
  assert.match(receipt.sha256, /^[a-f0-9]{64}$/);
  assert.deepEqual(await readFile(destination), png);
  const checkpoint = JSON.parse(await readFile(path.join(path.dirname(destination), 'prompt.json'), 'utf8'));
  assert.deepEqual(checkpoint, { id: 'custom-phen-01', ink: 'black', status: 'accepted', prompt });
});

test('checkpoints a returned generated-images path with prompt, hash, and reference', async () => {
  const { checkpointGeneratedImage } = await import('../scripts/avatar-phenomena/export-rollout-image.mjs');
  const temp = await mkdtemp(path.join(os.tmpdir(), 'avatar-phenomena-checkpoint-'));
  const generatedPath = path.join(temp, 'generated.png');
  const destination = path.join(temp, 'raw', 'source.png');
  await sharp({ create: { width: 1024, height: 1024, channels: 3, background: '#FF00B8' } }).png().toFile(generatedPath);

  const receipt = await checkpointGeneratedImage({
    generatedPath,
    destination,
    id: 'custom-phen-02',
    ink: 'white',
    prompt: 'Matching Yang Wind Spiral',
    reference: 'raw/custom-phen-02/black/source.png',
  });

  assert.equal(receipt.width, 1024);
  assert.match(receipt.sha256, /^[a-f0-9]{64}$/);
  const checkpoint = JSON.parse(await readFile(path.join(path.dirname(destination), 'prompt.json'), 'utf8'));
  assert.equal(checkpoint.status, 'accepted');
  assert.equal(checkpoint.reference, 'raw/custom-phen-02/black/source.png');
  assert.equal(checkpoint.sha256, receipt.sha256);
});
