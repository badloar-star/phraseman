import assert from 'node:assert/strict';
import { mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';

test('generation catalog is complete, deterministic, and uses safe paths', async () => {
  const {
    PHENOMENA_GENERATION_CATALOG,
    PHENOMENA_INKS,
    finalPathFor,
    rawPathFor,
  } = await import('../scripts/avatar-phenomena/catalog.mjs');

  assert.equal(PHENOMENA_GENERATION_CATALOG.length, 18);
  assert.deepEqual(PHENOMENA_INKS, ['white']);
  assert.equal(new Set(PHENOMENA_GENERATION_CATALOG.map((item) => item.id)).size, 18);
  for (const item of PHENOMENA_GENERATION_CATALOG) {
    assert.match(item.id, /^custom-phen-(0[1-9]|1[0-8])$/);
    assert.match(item.matteHex, /^#[0-9A-F]{6}$/);
    assert.ok(item.conceptPrompt.length >= 80);
    assert.ok(item.tierDescription.length >= 20);
    for (const ink of PHENOMENA_INKS) {
      assert.match(rawPathFor(item.id, ink), /^\.codex-tmp[\\/]avatar-phenomena-v1[\\/]raw[\\/]/);
      assert.equal(
        finalPathFor(item.id, ink),
        path.join('admin', 'v2', 'avatars', 'avatar-phenomena-v1', `${item.id}-${ink}.webp`),
      );
    }
  }
});

test('matte processing creates a compact transparent WebP without a colored corner halo', async () => {
  const { processFinalAsset } = await import('../scripts/avatar-phenomena/process-final.mjs');
  const temp = await mkdtemp(path.join(os.tmpdir(), 'avatar-phenomena-pipeline-'));
  const input = path.join(temp, 'source.png');
  const output = path.join(temp, 'final.webp');
  const background = { r: 0, g: 245, b: 106, alpha: 1 };
  const subject = await sharp({
    create: { width: 40, height: 48, channels: 4, background: { r: 236, g: 72, b: 30, alpha: 1 } },
  }).png().toBuffer();
  await sharp({ create: { width: 64, height: 64, channels: 4, background } })
    .composite([{ input: subject, left: 12, top: 8 }])
    .png()
    .toFile(input);

  const receipt = await processFinalAsset({ input, output, matteHex: '#00F56A', canvasSize: 128 });
  const metadata = await sharp(output).metadata();
  const corner = await sharp(output).extract({ left: 0, top: 0, width: 1, height: 1 }).ensureAlpha().raw().toBuffer();
  const center = await sharp(output).extract({ left: 64, top: 64, width: 1, height: 1 }).ensureAlpha().raw().toBuffer();

  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 128);
  assert.equal(metadata.height, 128);
  assert.equal(metadata.hasAlpha, true);
  assert.ok(corner[3] <= 4, `corner alpha ${corner[3]}`);
  assert.ok(center[3] >= 245, `center alpha ${center[3]}`);
  assert.match(receipt.sha256, /^[a-f0-9]{64}$/);
  assert.ok((await stat(output)).size < 32_000);
});

test('fit math fills the target silhouette and anchors its bottom to the lower V', async () => {
  const {
    PHENOMENA_TARGET_BOTTOM,
    PHENOMENA_TARGET_SILHOUETTE,
    fitForBounds,
  } = await import('../scripts/avatar-phenomena/build-fit-table.mjs');

  const fit = fitForBounds({ width: 0.5, height: 0.8, centerX: 0.42, sourceBottom: 0.9 });
  assert.equal(PHENOMENA_TARGET_SILHOUETTE, 1);
  assert.equal(PHENOMENA_TARGET_BOTTOM, 0.965);
  assert.equal(fit.scale, 1.25);
  assert.equal(fit.translateX, 0.1);
  assert.equal(fit.translateY, -0.035);
});

test('approved manifest writes are idempotent and reject changed content for an approved key', async () => {
  const { appendApprovedManifestEntry } = await import('../scripts/avatar-phenomena/process-final.mjs');
  const temp = await mkdtemp(path.join(os.tmpdir(), 'avatar-phenomena-manifest-'));
  const manifestPath = path.join(temp, 'approved-manifest.json');
  const entry = {
    id: 'custom-phen-01',
    ink: 'white',
    price: 70,
    status: 'approved',
    rawSha256: 'a'.repeat(64),
    finalSha256: 'b'.repeat(64),
  };

  await appendApprovedManifestEntry(manifestPath, entry);
  await appendApprovedManifestEntry(manifestPath, entry);
  await assert.rejects(
    appendApprovedManifestEntry(manifestPath, { ...entry, finalSha256: 'c'.repeat(64) }),
    /approved_manifest_conflict: custom-phen-01:white/,
  );

  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  assert.deepEqual(manifest.entries, [entry]);
  await writeFile(path.join(temp, 'receipt.txt'), 'verified\n');
});
