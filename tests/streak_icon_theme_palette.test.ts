import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

function fileHash(relativePath: string): string {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(path.join(ROOT, relativePath)))
    .digest('hex');
}

describe('streak-fire theme palettes', () => {
  it('locks the approved aqua dark fire instead of the previous purple-blue art', () => {
    expect(fileHash('assets/images/streak_icons/dark/streak-fire-dark-100.webp'))
      .toBe('dbe7be62eb7001260ed4c21dfd5bb85f4ad45bb800b60d4df9579bc10f077bf3');
  });

  it('locks the approved mint-to-azure aurora fire without purple or magenta', () => {
    expect(fileHash('assets/images/streak_icons/aurora/streak-fire-aurora-100.webp'))
      .toBe('9b27b567e891f08a7aae16c3114d6e073455a0a151e5b9bb2960fe2d9a7348f4');
  });
});
