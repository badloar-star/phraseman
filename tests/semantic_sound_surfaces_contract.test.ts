import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('semantic sound surface wiring', () => {
  test('no-energy modal emits the dedicated cue only when it becomes visible', () => {
    const source = read('components/NoEnergyModal.tsx');
    expect(source).toContain("soundDirector.request('pm.energy.empty'");
    expect(source).toContain("scope: 'no-energy-modal'");
  });

});
