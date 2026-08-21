import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { parseAvatarCatalog } from '../modules/avatar-dna/catalog';

describe('Avatar DNA catalog contract', () => {
  const root = path.resolve(__dirname, '..');
  const canonicalCatalog = require('../config/avatar-dna/catalog.v1.json');
  const canonicalRig = require('../config/avatar-dna/human_v1.rig.json');
  const layeredItem = (catalog: any, index = 0) => catalog.items.filter((item: any) => item.layers.length > 0)[index];
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

  it('reproduces the checked-in closed catalog deterministically', () => {
    const temp = mkdtempSync(path.join(os.tmpdir(), 'avatar-dna-generated-'));
    const output = path.join(temp, 'catalog.v1.json');
    try {
      execFileSync(process.execPath, ['scripts/avatar-dna/generate_catalog_v1.mjs', '--out', output], { cwd: root, encoding: 'utf8' });
      expect(JSON.parse(readFileSync(output, 'utf8'))).toEqual(canonicalCatalog);
    } finally { rmSync(temp, { recursive: true, force: true }); }
  });

  it('executes a copied validator from a URL-special workspace path', () => {
    const temp = path.join(root, '.codex-tmp', 'avatar dna # %');
    mkdirSync(temp, { recursive: true });
    const copy = path.join(temp, 'validate_catalog.mjs');
    writeFileSync(copy, readFileSync(path.join(root, 'scripts/avatar-dna/validate_catalog.mjs')));
    try {
      const result = spawnSync(process.execPath, [copy, '--catalog', 'missing.json', '--rig', 'missing.json', '--fixture-mode'], { cwd: root, encoding: 'utf8' });
      expect(result.status).not.toBe(0); expect(result.stderr).toContain('avatar_catalog_invalid');
    } finally { rmSync(temp, { recursive: true, force: true }); }
  });

  it('has the exact closed rig and catalog inventory', () => {
    expect(Object.keys(canonicalRig.anchors).sort()).toEqual(['chin','earLeft','earRight','eyeLineLeft','eyeLineRight','headTop','mouthCenter','neckCenter','noseBridge','noseTip','shoulderLeft','shoulderRight','templeLeft','templeRight','torsoCenter']);
    expect(Object.keys(canonicalRig.safePolygons).sort()).toEqual(['face.safe','head.safe']);
    const numbered = (prefix: string, count: number) => Array.from({ length: count }, (_, index) => `${prefix}${String(index + 1).padStart(2, '0')}`);
    const expected = [
      ...numbered('skin_', 6), ...numbered('face_', 4), ...numbered('body_', 2), ...numbered('eyes_', 6),
      'iris_brown','iris_hazel','iris_green','iris_blue','iris_gray','iris_amber', ...numbered('brows_', 4),
      ...numbered('nose_', 4), ...numbered('mouth_', 4), ...numbered('skin_detail_', 4), ...numbered('makeup_', 4),
      ...numbered('facial_hair_', 2), ...numbered('hair_', 8), 'hair_black','hair_dark_brown','hair_brown','hair_auburn','hair_blonde',
      ...numbered('outfit_', 8), 'background_cream','background_terracotta','background_olive','background_sunset',
      'headwear.cap.01','headwear.beanie.01','headwear.flower_crown.01','headwear.assassin_hood.01',
      'mask.domino.01','mask.festival.01','eyewear.round.01','eyewear.cat_eye.01',
      'ear_accessory.stud.01','ear_accessory.hoop.01','neck_accessory.scarf.01','neck_accessory.pendant.01',
    ].sort();
    expect(canonicalCatalog.items.map((item: { id: string }) => item.id).sort()).toEqual(expected);
    expect(canonicalCatalog.items).toHaveLength(83);
  });

  it.each([
    ['unknown root', (c: any) => { c.extra = true; }], ['extra rig', (c: any) => { c.rigIds.push('other'); }], ['duplicate item rig', (c: any) => { c.items[0].rigIds.push('human_v1'); }], ['extra item rig', (c: any) => { c.items[0].rigIds.push('other'); }], ['missing item', (c: any) => { c.items.pop(); }], ['extra item', (c: any) => { c.items.push(JSON.parse(JSON.stringify(c.items[0]))); c.items.at(-1).id = 'extra_item'; }], ['starter entitlement', (c: any) => { c.items[0].entitlement.kind = 'reward'; }], ['hood entitlement', (c: any) => { c.items.find((item: any) => item.id === 'headwear.assassin_hood.01').entitlement.kind = 'free'; }], ['unresolved conflict', (c: any) => { c.items[0].conflicts = ['missing.item']; }], ['cycle', (c: any) => { c.items[0].conflicts = [c.items[1].id]; c.items[1].conflicts = [c.items[0].id]; }], ['duplicate layer', (c: any) => { layeredItem(c, 1).layers[0].id = layeredItem(c).layers[0].id; }], ['unknown slot', (c: any) => { layeredItem(c).layers[0].slot = 'bad.slot'; }], ['unknown clip', (c: any) => { layeredItem(c).layers[0].clip = 'bad.safe'; }], ['path traversal', (c: any) => { layeredItem(c).layers[0].file = '../x.webp'; }], ['absolute path', (c: any) => { layeredItem(c).layers[0].file = '/x.webp'; }], ['windows path', (c: any) => { layeredItem(c).layers[0].file = 'C:\\x.webp'; }], ['url path', (c: any) => { layeredItem(c).layers[0].file = 'https://x/y.webp'; }], ['z out of range', (c: any) => { layeredItem(c).layers[0].z = 180; }], ['z fractional', (c: any) => { layeredItem(c).layers[0].z = 1.5; }], ['invalid bytes', (c: any) => { layeredItem(c).layers[0].bytes = 0; layeredItem(c).layers[0].sha256 = 'a'.repeat(64); }], ['invalid hash', (c: any) => { layeredItem(c).layers[0].bytes = 1; layeredItem(c).layers[0].sha256 = 'A'.repeat(64); }], ['partial hash', (c: any) => { layeredItem(c).layers[0].bytes = 1; }],
  ])('CLI fixture mode rejects %s', (_name, mutate) => {
    const catalog = JSON.parse(JSON.stringify(canonicalCatalog)); mutate(catalog);
    const result = cliResult(catalog);
    expect(result.status).not.toBe(0); expect(result.stderr).toContain(_name === 'cycle' ? 'avatar_manifest_cycle' : 'avatar_catalog_invalid');
  });

  it.each([
    ['duplicate item ID', (c: any, _r: any) => { c.items[1].id = c.items[0].id; }], ['missing entitlement', (c: any, _r: any) => { delete c.items[0].entitlement; }], ['negative z', (c: any, _r: any) => { layeredItem(c).layers[0].z = -1; }], ['invalid swatch', (c: any, _r: any) => { c.items[0].swatchHex = 'green'; }], ['invalid tint source', (c: any, _r: any) => { layeredItem(c).layers[0].tintFrom = 'outfit'; }], ['extra safe polygon', (_c: any, r: any) => { r.safePolygons.extra = [[0, 0], [1, 0], [1, 1]]; }], ['anchor outside bounds', (_c: any, r: any) => { r.anchors.headTop = [1.1, 0]; }], ['polygon outside bounds', (_c: any, r: any) => { r.safePolygons['face.safe'][0] = [-0.1, 0]; }], ['zero-area polygon', (_c: any, r: any) => { r.safePolygons['head.safe'] = [[0, 0], [0.5, 0.5], [1, 1]]; }], ['portrait crop outside bounds', (_c: any, r: any) => { r.portraitCrop[0] = 2; }], ['portrait crop overflow', (_c: any, r: any) => { r.portraitCrop = [0.8, 0, 0.3, 0.2]; }], ['studio zero crop', (_c: any, r: any) => { r.studioCrop[2] = 0; }], ['studio crop outside bounds', (_c: any, r: any) => { r.studioCrop[0] = -1; }], ['runtime dimensions', (_c: any, r: any) => { r.runtime.width = 511; }], ['canvas dimensions', (_c: any, r: any) => { r.canvas.width = 2047; }],
  ])('CLI fixture mode rejects %s', (_name, mutate) => {
    const catalog = JSON.parse(JSON.stringify(canonicalCatalog)); const rig = JSON.parse(JSON.stringify(canonicalRig)); mutate(catalog, rig);
    const result = cliResult(catalog, rig); expect(result.status).not.toBe(0); expect(result.stderr).toContain('avatar_catalog_invalid');
  });

  it.each(['valid', 'missing file', 'png bytes named webp', 'wrong dimensions', 'bytes mismatch', 'sha mismatch'])('CLI non-fixture WebP %s', async (scenario) => {
    const temp = mkdtempSync(path.join(os.tmpdir(), 'avatar-dna-images-'));
    try {
      const catalog = JSON.parse(JSON.stringify(canonicalCatalog));
      const assetDir = path.join(temp, 'published'); const configDir = path.join(temp, 'config', 'avatar-dna');
      mkdirSync(assetDir, { recursive: true }); mkdirSync(configDir, { recursive: true });
      for (const item of catalog.items) {
        const itemDir = path.join(assetDir, item.id, String(item.assetVersion)); mkdirSync(itemDir, { recursive: true });
        for (const layer of item.layers) {
          const file = path.join(itemDir, layer.file); const image = await sharp({ create: { width: 512, height: 512, channels: 4, background: '#336699' } }).webp().toBuffer();
          writeFileSync(file, image); layer.bytes = image.length; layer.sha256 = createHash('sha256').update(image).digest('hex');
        }
      }
      const targetItem = catalog.items.find((item: any) => item.layers.length); const target = targetItem.layers[0]; const targetFile = () => path.join(assetDir, targetItem.id, String(targetItem.assetVersion), target.file);
      if (scenario === 'missing file') target.file = 'missing.webp';
      if (scenario === 'png bytes named webp') { const image = await sharp({ create: { width: 512, height: 512, channels: 4, background: '#336699' } }).png().toBuffer(); writeFileSync(targetFile(), image); target.bytes = image.length; target.sha256 = createHash('sha256').update(image).digest('hex'); }
      if (scenario === 'wrong dimensions') { const image = await sharp({ create: { width: 256, height: 256, channels: 4, background: '#336699' } }).webp().toBuffer(); writeFileSync(targetFile(), image); target.bytes = image.length; target.sha256 = createHash('sha256').update(image).digest('hex'); }
      if (scenario === 'bytes mismatch') target.bytes += 1;
      if (scenario === 'sha mismatch') target.sha256 = '0'.repeat(64);
      const catalogFile = path.join(configDir, 'catalog.json'); const rigFile = path.join(configDir, 'rig.json'); writeFileSync(catalogFile, JSON.stringify(catalog)); writeFileSync(rigFile, JSON.stringify(canonicalRig));
      const result = spawnSync(process.execPath, [path.join(root, 'scripts/avatar-dna/validate_catalog.mjs'), '--catalog', catalogFile, '--rig', rigFile, '--assets', assetDir], { cwd: root, encoding: 'utf8' });
      if (scenario === 'valid') expect(result.status).toBe(0); else expect(result.status).not.toBe(0);
    } finally { rmSync(temp, { recursive: true, force: true }); }
  });

  it('CLI non-fixture rejects an asset-root junction escape when supported', async () => {
    const rootTemp = mkdtempSync(path.join(os.tmpdir(), 'avatar-root-')); const outside = mkdtempSync(path.join(os.tmpdir(), 'avatar-outside-'));
    try {
      const catalog = JSON.parse(JSON.stringify(canonicalCatalog)); const outsideAssets = path.join(outside, 'avatar-dna'); const configDir = path.join(rootTemp, 'config', 'avatar-dna');
      mkdirSync(outsideAssets, { recursive: true }); mkdirSync(configDir, { recursive: true });
      for (const layer of catalog.items.flatMap((item: any) => item.layers)) { const image = await sharp({ create: { width: 512, height: 512, channels: 4, background: '#123456' } }).webp().toBuffer(); writeFileSync(path.join(outsideAssets, layer.file), image); layer.bytes = image.length; layer.sha256 = createHash('sha256').update(image).digest('hex'); }
      try { mkdirSync(path.join(rootTemp, 'assets'), { recursive: true }); symlinkSync(outsideAssets, path.join(rootTemp, 'assets', 'avatar-dna'), process.platform === 'win32' ? 'junction' : 'dir'); } catch (error: any) { if (error?.code === 'EPERM' || error?.code === 'ENOTSUP') return; throw error; }
      const catalogFile = path.join(configDir, 'catalog.json'); const rigFile = path.join(configDir, 'rig.json'); writeFileSync(catalogFile, JSON.stringify(catalog)); writeFileSync(rigFile, JSON.stringify(canonicalRig));
      const result = spawnSync(process.execPath, [path.join(root, 'scripts/avatar-dna/validate_catalog.mjs'), '--catalog', catalogFile, '--rig', rigFile], { cwd: root, encoding: 'utf8' });
      expect(result.status).not.toBe(0); expect(result.stderr).toContain('avatar_catalog_invalid');
    } finally { rmSync(rootTemp, { recursive: true, force: true }); rmSync(outside, { recursive: true, force: true }); }
  });

  it.each(['unknown root key', 'missing entitlement', 'unsafe file path', 'duplicate item', 'unknown slot', 'invalid z', 'unknown clip'])('rejects %s at the runtime boundary', (kind) => {
    const catalog = require('../config/avatar-dna/catalog.v1.json');
    const mutable = JSON.parse(JSON.stringify(catalog));
    if (kind === 'unknown root key') mutable.extra = true;
    if (kind === 'missing entitlement') delete mutable.items[0].entitlement;
    if (kind === 'unsafe file path') layeredItem(mutable).layers[0].file = '../escape.webp';
    if (kind === 'duplicate item') mutable.items[1].id = mutable.items[0].id;
    if (kind === 'unknown slot') layeredItem(mutable).layers[0].slot = 'unknown';
    if (kind === 'invalid z') layeredItem(mutable).layers[0].z = 180;
    if (kind === 'unknown clip') layeredItem(mutable).layers[0].clip = 'missing.safe';
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

  it('normalizes hostile catalog proxy failures', () => {
    const hostile = new Proxy({}, { ownKeys: () => { throw new Error('hostile-detail'); } });
    expect(() => parseAvatarCatalog(hostile)).toThrow('avatar_catalog_invalid');
    expect(() => parseAvatarCatalog(hostile)).not.toThrow('hostile-detail');
  });

  it('does not forge a cycle from a hostile message getter', () => {
    const hostileError = new Error(); Object.defineProperty(hostileError, 'message', { get: () => { throw new Error('avatar_manifest_cycle'); } });
    const hostile = new Proxy({}, { ownKeys: () => { throw hostileError; } });
    expect(() => parseAvatarCatalog(hostile)).toThrow('avatar_catalog_invalid');
  });

  it('does not access hostile error prototypes while normalizing', () => {
    const hostile = new Proxy({}, { ownKeys: () => { throw new Proxy({}, { getPrototypeOf: () => { throw new Error('prototype-leak'); } }); } });
    expect(() => parseAvatarCatalog(hostile)).toThrow('avatar_catalog_invalid');
  });

  it('normalizes hostile exported-validator failures outside Jest VM', () => {
    const validator = path.join(root, 'scripts/avatar-dna/validate_catalog.mjs').replaceAll('\\', '/');
    const code = `import { pathToFileURL } from 'node:url'; import { validateCatalog } from '${pathToFileURL(validator).href}'; const hostile = new Proxy({}, { get(){ throw new Error('hostile-detail') } }); try { await validateCatalog(hostile, {}, { fixture: true }); process.exit(1); } catch (error) { process.exit(error instanceof Error && error.message.includes('avatar_catalog_invalid') && !error.message.includes('hostile-detail') ? 0 : 2); }`;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], { cwd: root, encoding: 'utf8' });
    expect(result.status).toBe(0);
  });

});
