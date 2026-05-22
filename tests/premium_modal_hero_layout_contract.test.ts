import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('premium modal hero layout contract', () => {
  it('stretches the progress analytics hero background instead of cropping the right edge', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'premium_modal.tsx'), 'utf8');
    const heroStart = source.indexOf('{/* БЛОК 1: Герой */}');
    const nextBlock = source.indexOf('{/* БЛОК 2: Что ты получишь */}', heroStart);
    const heroBlock = source.slice(heroStart, nextBlock);

    expect(heroStart).toBeGreaterThanOrEqual(0);
    expect(nextBlock).toBeGreaterThan(heroStart);
    expect(heroBlock).toContain('resizeMode="stretch"');
    expect(heroBlock).toContain("width: '100%', alignSelf: 'stretch'");
    expect(heroBlock).not.toContain('resizeMode="cover"');
  });
});
