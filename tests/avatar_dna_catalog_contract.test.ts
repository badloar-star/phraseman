import { execFileSync } from 'node:child_process';
import path from 'node:path';

describe('Avatar DNA catalog contract', () => {
  it('validates the canonical fixture catalog', () => {
    const root = path.resolve(__dirname, '..');
    const output = execFileSync(process.execPath, ['scripts/avatar-dna/validate_catalog.mjs', '--catalog', 'config/avatar-dna/catalog.v1.json', '--rig', 'config/avatar-dna/human_v1.rig.json', '--fixture-mode'], { cwd: root, encoding: 'utf8' });
    expect(output).toContain('avatar-dna catalog: PASS');
  });
});
