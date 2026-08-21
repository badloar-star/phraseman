import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

sharp.cache(false);

const ROOT = path.resolve(__dirname, '..');
const BUILD = path.join(ROOT, 'scripts/avatar-dna/build_bundle.mjs');
const PUBLISH = path.join(ROOT, 'scripts/avatar-dna/publish_assets.mjs');
const CONTACT = path.join(ROOT, 'scripts/avatar-dna/build_contact_sheet.mjs');
const PREPARE_CHROMA = path.join(ROOT, 'scripts/avatar-dna/prepare_chroma_source.mjs');
const RIG = path.join(ROOT, 'config/avatar-dna/human_v1.rig.json');

type LayerFixture = { id: string; slot: string; file: string; clip?: string };

const run = (script: string, args: string[]) => {
  try {
    return { ok: true, output: execFileSync(process.execPath, [script, ...args], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (error) {
    const failure = error as { stdout?: Buffer | string; stderr?: Buffer | string };
    return { ok: false, output: `${failure.stdout ?? ''}${failure.stderr ?? ''}` };
  }
};

describe('Avatar DNA deterministic asset pipeline', () => {
  let fixtureRoot = '';
  let sourceDir = '';
  let outDir = '';
  let manifestPath = '';

  const writeLayer = async (file: string, options: { corner?: boolean; tiny?: boolean; halo?: boolean } = {}) => {
    const size = 2048;
    const left = options.corner ? 12 : options.tiny ? 1022 : 560;
    const top = options.corner ? 12 : options.tiny ? 1022 : 320;
    const width = options.tiny ? 4 : 928;
    const height = options.tiny ? 4 : 1150;
    const alpha = options.halo ? 0.03 : 1;
    const color = options.halo ? { r: 255, g: 255, b: 255, alpha } : { r: 177, g: 73, b: 38, alpha };
    await sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: await sharp({ create: { width, height, channels: 4, background: color } }).png().toBuffer(), left, top }])
      .png()
      .toFile(path.join(sourceDir, file));
  };

  const writeManifest = (layers: LayerFixture[], itemId = 'hair_fixture') => {
    fs.writeFileSync(manifestPath, JSON.stringify({
      bundleVersion: 1,
      items: [{ id: itemId, assetVersion: 1, layers }],
    }));
  };

  const buildArgs = () => ['--source', sourceDir, '--manifest', manifestPath, '--rig', RIG, '--out', outDir];

  beforeEach(async () => {
    fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'avatar-dna-assets-'));
    sourceDir = path.join(fixtureRoot, 'source');
    outDir = path.join(fixtureRoot, 'out');
    manifestPath = path.join(fixtureRoot, 'bundle.json');
    fs.mkdirSync(sourceDir, { recursive: true });
    await writeLayer('hair-back.png');
    await writeLayer('hair-front.png');
    writeManifest([
      { id: 'hair.fixture.back', slot: 'hair.back', file: 'hair-back.png', clip: 'head.safe' },
      { id: 'hair.fixture.front', slot: 'hair.front', file: 'hair-front.png', clip: 'head.safe' },
    ]);
  });

  afterEach(() => {
    fs.rmSync(fixtureRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  it('builds 512px WebP layers, a 192px thumbnail and a SHA-256 receipt', () => {
    const result = run(BUILD, buildArgs());
    expect(result).toEqual(expect.objectContaining({ ok: true }));
    const receipt = JSON.parse(fs.readFileSync(path.join(outDir, 'hair_fixture', '1', 'receipt.json'), 'utf8'));
    expect(receipt.files).toHaveLength(3);
    for (const file of receipt.files) {
      const bytes = fs.readFileSync(path.join(outDir, 'hair_fixture', '1', file.file));
      expect(file.sha256).toBe(createHash('sha256').update(bytes).digest('hex'));
      expect(file.bytes).toBe(bytes.length);
    }
  });

  it.each([
    ['missing front/back pair', () => writeManifest([{ id: 'hair.fixture.back', slot: 'hair.back', file: 'hair-back.png' }])],
    ['duplicate layer id', () => writeManifest([
      { id: 'hair.fixture.same', slot: 'hair.back', file: 'hair-back.png' },
      { id: 'hair.fixture.same', slot: 'hair.front', file: 'hair-front.png' },
    ])],
  ])('rejects %s', (_label, mutate) => {
    mutate();
    expect(run(BUILD, buildArgs()).ok).toBe(false);
  });

  it('rejects alpha outside a declared rig safe polygon', async () => {
    await writeLayer('hair-front.png', { corner: true });
    expect(run(BUILD, buildArgs()).ok).toBe(false);
  });

  it('rejects edge halo pixels', async () => {
    await writeLayer('hair-front.png', { halo: true });
    expect(run(BUILD, buildArgs()).ok).toBe(false);
  });

  it('rejects a wrong source dimension', async () => {
    await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 1, g: 1, b: 1, alpha: 1 } } }).png().toFile(path.join(sourceDir, 'hair-front.png'));
    expect(run(BUILD, buildArgs()).ok).toBe(false);
  });

  it('rejects a portrait that becomes unreadable at 64px', async () => {
    await writeLayer('hair-back.png', { tiny: true });
    await writeLayer('hair-front.png', { tiny: true });
    expect(run(BUILD, buildArgs()).ok).toBe(false);
  });

  it('rejects an altered receipt hash and immutable overwrite with different bytes', () => {
    expect(run(BUILD, buildArgs()).ok).toBe(true);
    const receiptPath = path.join(outDir, 'hair_fixture', '1', 'receipt.json');
    const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
    receipt.files[0].sha256 = '0'.repeat(64);
    fs.writeFileSync(receiptPath, JSON.stringify(receipt));
    const target = path.join(fixtureRoot, 'published');
    expect(run(PUBLISH, ['--version', '1', '--source', outDir, '--target', target]).ok).toBe(false);
  });

  it('publishes idempotently but rejects different bytes for an existing item version', async () => {
    expect(run(BUILD, buildArgs()).ok).toBe(true);
    const target = path.join(fixtureRoot, 'published');
    expect(run(PUBLISH, ['--version', '1', '--source', outDir, '--target', target]).ok).toBe(true);
    expect(run(PUBLISH, ['--version', '1', '--source', outDir, '--target', target]).ok).toBe(true);
    await writeLayer('hair-front.png', { corner: false });
    await sharp(path.join(sourceDir, 'hair-front.png')).tint('#5b2b18').png().toFile(path.join(sourceDir, 'hair-front-v2.png'));
    fs.copyFileSync(path.join(sourceDir, 'hair-front-v2.png'), path.join(sourceDir, 'hair-front.png'));
    fs.unlinkSync(path.join(sourceDir, 'hair-front-v2.png'));
    expect(run(BUILD, buildArgs()).ok).toBe(true);
    expect(run(PUBLISH, ['--version', '1', '--source', outDir, '--target', target]).ok).toBe(false);
  });

  it('copies only free runtime layers, writes literal requires and builds a contact sheet', () => {
    expect(run(BUILD, buildArgs()).ok).toBe(true);
    const target = path.join(fixtureRoot, 'published');
    const bundled = path.join(fixtureRoot, 'bundled');
    const generated = path.join(fixtureRoot, 'bundled_assets.generated.ts');
    const catalog = path.join(fixtureRoot, 'catalog.json');
    fs.writeFileSync(catalog, JSON.stringify({
      manifestVersion: 1,
      items: [{
        id: 'hair_fixture', assetVersion: 1, entitlement: { kind: 'free' },
        layers: [{ file: 'hair-back.webp' }, { file: 'hair-front.webp' }],
      }],
    }));
    expect(run(PUBLISH, ['--version', '1', '--source', outDir, '--target', target, '--catalog', catalog, '--bundled-target', bundled, '--generated-module', generated]).ok).toBe(true);
    expect(fs.existsSync(path.join(bundled, 'hair_fixture', '1', 'hair-front.webp'))).toBe(true);
    expect(fs.readFileSync(generated, 'utf8')).toContain('require(');
    const qa = path.join(fixtureRoot, 'qa');
    expect(run(CONTACT, ['--catalog', catalog, '--assets', target, '--out', qa]).ok).toBe(true);
    expect(fs.statSync(path.join(qa, 'avatar-dna-v1-contact-sheet.webp')).size).toBeGreaterThan(0);
    expect(JSON.parse(fs.readFileSync(path.join(qa, 'avatar-dna-v1-contact-sheet.json'), 'utf8')).items).toHaveLength(1);
  });

  it('turns a bounded chroma render into a genuine 2048px RGBA source without green edge spill', async () => {
    const input = path.join(fixtureRoot, 'chroma.png');
    const output = path.join(fixtureRoot, 'prepared.png');
    await sharp({ create: { width: 512, height: 512, channels: 3, background: '#00ff00' } })
      .composite([{ input: await sharp({ create: { width: 240, height: 320, channels: 4, background: '#c94b20' } }).png().toBuffer(), left: 136, top: 96 }])
      .png()
      .toFile(input);
    const preparation = run(PREPARE_CHROMA, ['--input', input, '--output', output, '--key', '#00ff00']);
    expect(preparation.output).toContain('avatar-dna chroma: PASS');
    const { data, info } = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect(info).toMatchObject({ width: 2048, height: 2048, channels: 4 });
    expect(data[3]).toBe(0);
    const center = ((1024 * info.width) + 1024) * 4;
    expect(data[center + 3]).toBe(255);
    let greenSpillPixels = 0;
    for (let offset = 0; offset < data.length; offset += 4) {
      if (data[offset + 3] > 0 && data[offset + 1] > Math.max(data[offset], data[offset + 2]) + 4) greenSpillPixels += 1;
    }
    expect(greenSpillPixels).toBe(0);
  });
});
