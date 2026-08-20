import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { parseAvatarCatalog } from '../modules/avatar-dna/catalog';

describe('Avatar DNA catalog contract', () => {
  it('validates the canonical fixture catalog', () => {
    const root = path.resolve(__dirname, '..');
    const output = execFileSync(process.execPath, ['scripts/avatar-dna/validate_catalog.mjs', '--catalog', 'config/avatar-dna/catalog.v1.json', '--rig', 'config/avatar-dna/human_v1.rig.json', '--fixture-mode'], { cwd: root, encoding: 'utf8' });
    expect(output).toContain('avatar-dna catalog: PASS');
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
