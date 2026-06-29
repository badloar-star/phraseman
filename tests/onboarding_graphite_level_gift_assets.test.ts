import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('level gift modal background assets', () => {
  test('level gift registry no longer points to generated WebP backgrounds', () => {
    const source = fs.readFileSync(path.join(ROOT, 'constants/levelGiftImages.ts'), 'utf8');

    expect(source).not.toContain('assets/images/level_gifts_v2');
    expect(source).not.toContain('onboarding-graphite');
    expect(source).not.toContain('require(');
  });
});
