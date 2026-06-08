import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('premium modal hero layout contract', () => {
  it('hero block exists and uses cover resizeMode with full-width layout', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'premium_modal.tsx'), 'utf8');
    const heroStart = source.indexOf('{/* БЛОК 1: Герой */}');

    expect(heroStart).toBeGreaterThanOrEqual(0);

    const heroBlock = source.slice(heroStart, heroStart + 2000);
    // Hero uses cover to fill the card background
    expect(heroBlock).toContain('resizeMode="cover"');
    // Hero card spans full width
    expect(heroBlock).toContain("width: '100%'");
  });
});
