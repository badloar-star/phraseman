import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('home feature visibility', () => {
  it('does not restore the retired league chest row in Today', () => {
    const source = read('app/(tabs)/home.tsx');
    expect(source).not.toContain('buildHomeLeagueChest');
    expect(source).not.toContain('homeLeagueChest');
  });

});
