import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { parseAvatarCatalog } from '../modules/avatar-dna/catalog';

describe('Avatar DNA catalog contract', () => {
  const root = path.resolve(__dirname, '..');
  const canonicalCatalog = require('../config/avatar-dna/catalog.v1.json');
  const canonicalRig = require('../config/avatar-dna/human_v1.rig.json');
  const cliResult = (catalog: unknown, rig: unknown = canonicalRig) => {
    const temp = mkdtempSync(path.join(os.tmpdir(), 'avatar-dna-cli-'));
    try {
      const catalogFile = path.join(temp, 'catalog.json'); const rigFile = path.join(temp, 'rig.json');
      writeFileSync(catalogFile, JSON.stringify(catalog)); writeFileSync(rigFile, JSON.stringify(rig));
      return spawnSync(process.execPath, [path.join(root, 'scripts/avatar-dna/validate_catalog.mjs'), '--catalog', catalogFile, '--rig', rigFile, '--fixture-mode'], { cwd: root, encoding: 'utf8' });
    } finally { rmSync(temp, { recursive: true, force: true }); }
  };
  it('validates the canonical fixture catalog', () => {
    const output = execFileSync(process.execPath, ['scripts/avatar-dna/validate_catalog.mjs', '--catalog', 'config/avatar-dna/catalog.v1.json', '--rig', 'config/avatar-dna/human_v1.rig.json', '--fixture-mode'], { cwd: root, encoding: 'utf8' });
    expect(output).toContain('avatar-dna catalog: PASS');
  });

  it('has the exact closed rig and catalog inventory', () => {
    expect(Object.keys(canonicalRig.anchors).sort()).toEqual(['chin','earLeft','earRight','eyeLineLeft','eyeLineRight','headTop','mouthCenter','neckCenter','noseBridge','noseTip','shoulderLeft','shoulderRight','templeLeft','templeRight','torsoCenter']);
    expect(Object.keys(canonicalRig.safePolygons).sort()).toEqual(['face.safe','head.safe']);
    expect(canonicalCatalog.items.map((item: { id: string }) => item.id).sort()).toEqual(['background_cream','body_01','brows_01','eyes_01','face_01','hair_01','hair_brown','hair_wavy_01','headwear.assassin_hood.01','iris_brown','mouth_01','nose_01','outfit_01','skin_03']);
    expect(canonicalCatalog.items.filter((item: { id: string }) => item.id !== 'headwear.assassin_hood.01').every((item: { entitlement: unknown }) => JSON.stringify(item.entitlement) === JSON.stringify({ kind: 'free' }))).toBe(true);
  });

  it.each([
    ['unknown root', (c: any) => { c.extra = true; }], ['extra rig', (c: any) => { c.rigIds.push('other'); }], ['missing item', (c: any) => { c.items.pop(); }], ['extra item', (c: any) => { c.items.push(JSON.parse(JSON.stringify(c.items[0]))); c.items.at(-1).id = 'extra_item'; }], ['starter entitlement', (c: any) => { c.items[0].entitlement.kind = 'reward'; }], ['hood entitlement', (c: any) => { c.items.at(-1).entitlement.kind = 'free'; }], ['unresolved conflict', (c: any) => { c.items[0].conflicts = ['missing.item']; }], ['cycle', (c: any) => { c.items[0].conflicts = [c.items[1].id]; c.items[1].conflicts = [c.items[0].id]; }], ['duplicate layer', (c: any) => { c.items[2].layers[0].id = c.items[1].layers[0].id; }], ['unknown slot', (c: any) => { c.items[1].layers[0].slot = 'bad.slot'; }], ['unknown clip', (c: any) => { c.items[1].layers[0].clip = 'bad.safe'; }], ['path traversal', (c: any) => { c.items[1].layers[0].file = '../x.webp'; }], ['absolute path', (c: any) => { c.items[1].layers[0].file = '/x.webp'; }], ['windows path', (c: any) => { c.items[1].layers[0].file = 'C:\\x.webp'; }], ['url path', (c: any) => { c.items[1].layers[0].file = 'https://x/y.webp'; }], ['z out of range', (c: any) => { c.items[1].layers[0].z = 180; }], ['z fractional', (c: any) => { c.items[1].layers[0].z = 1.5; }], ['invalid bytes', (c: any) => { c.items[1].layers[0].bytes = 0; c.items[1].layers[0].sha256 = 'a'.repeat(64); }], ['invalid hash', (c: any) => { c.items[1].layers[0].bytes = 1; c.items[1].layers[0].sha256 = 'A'.repeat(64); }], ['partial hash', (c: any) => { c.items[1].layers[0].bytes = 1; }],
  ])('CLI fixture mode rejects %s', (_name, mutate) => {
    const catalog = JSON.parse(JSON.stringify(canonicalCatalog)); mutate(catalog);
    const result = cliResult(catalog);
    expect(result.status).not.toBe(0); expect(result.stderr).toContain('avatar_catalog_invalid');
  });

  it.each(['valid', 'missing file', 'png extension', 'wrong dimensions', 'bytes mismatch', 'sha mismatch'])('CLI non-fixture WebP %s', async (scenario) => {
    const temp = mkdtempSync(path.join(os.tmpdir(), 'avatar-dna-images-'));
    try {
      const catalog = JSON.parse(JSON.stringify(canonicalCatalog));
      const assetDir = path.join(temp, 'assets', 'avatar-dna'); const configDir = path.join(temp, 'config', 'avatar-dna');
      mkdirSync(assetDir, { recursive: true }); mkdirSync(configDir, { recursive: true });
      for (const layer of catalog.items.flatMap((item: any) => item.layers)) {
        const file = path.join(assetDir, layer.file); const image = await sharp({ create: { width: 512, height: 512, channels: 4, background: '#336699' } }).webp().toBuffer();
        writeFileSync(file, image); layer.bytes = image.length; layer.sha256 = createHash('sha256').update(image).digest('hex');
      }
      const target = catalog.items.find((item: any) => item.layers.length).layers[0];
      if (scenario === 'missing file') target.file = 'missing.webp';
      if (scenario === 'png extension') { target.file = 'bad.png'; writeFileSync(path.join(assetDir, 'bad.png'), Buffer.from('not-webp')); }
      if (scenario === 'wrong dimensions') { const image = await sharp({ create: { width: 256, height: 256, channels: 4, background: '#336699' } }).webp().toBuffer(); writeFileSync(path.join(assetDir, target.file), image); target.bytes = image.length; target.sha256 = createHash('sha256').update(image).digest('hex'); }
      if (scenario === 'bytes mismatch') target.bytes += 1;
      if (scenario === 'sha mismatch') target.sha256 = '0'.repeat(64);
      const catalogFile = path.join(configDir, 'catalog.json'); const rigFile = path.join(configDir, 'rig.json'); writeFileSync(catalogFile, JSON.stringify(catalog)); writeFileSync(rigFile, JSON.stringify(canonicalRig));
      const result = spawnSync(process.execPath, [path.join(root, 'scripts/avatar-dna/validate_catalog.mjs'), '--catalog', catalogFile, '--rig', rigFile], { cwd: root, encoding: 'utf8' });
      if (scenario === 'valid') expect(result.status).toBe(0); else expect(result.status).not.toBe(0);
    } finally { rmSync(temp, { recursive: true, force: true }); }
  });

  it.each(['unknown root key', 'missing entitlement', 'unsafe file path', 'duplicate item', 'unknown slot', 'invalid z', 'unknown clip'])('rejects %s at the runtime boundary', (kind) => {
    const catalog = require('../config/avatar-dna/catalog.v1.json');
    const mutable = JSON.parse(JSON.stringify(catalog));
    if (kind === 'unknown root key') mutable.extra = true;
    if (kind === 'missing entitlement') delete mutable.items[0].entitlement;
    if (kind === 'unsafe file path') mutable.items[1].layers[0].file = '../escape.webp';
    if (kind === 'duplicate item') mutable.items[1].id = mutable.items[0].id;
    if (kind === 'unknown slot') mutable.items[1].layers[0].slot = 'unknown';
    if (kind === 'invalid z') mutable.items[1].layers[0].z = 180;
    if (kind === 'unknown clip') mutable.items[1].layers[0].clip = 'missing.safe';
    expect(() => parseAvatarCatalog(mutable)).toThrow('avatar_catalog_invalid');
  });

  it('requires closed inventory and resolved conflicts', () => {
    const catalog = require('../config/avatar-dna/catalog.v1.json');
    const missing = JSON.parse(JSON.stringify(catalog));
    missing.items.pop();
    const conflict = JSON.parse(JSON.stringify(catalog));
    conflict.items[0].conflicts = ['missing.item'];
    expect(() => parseAvatarCatalog(missing)).toThrow('avatar_catalog_invalid');
    expect(() => parseAvatarCatalog(conflict)).toThrow('avatar_catalog_invalid');
  });
});
