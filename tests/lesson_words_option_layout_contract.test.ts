import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

describe('lesson words option layout contract', () => {
  it('keeps distractor cards stable under large text settings', () => {
    const source = read('app/lesson_words.tsx');
    const start = source.indexOf('{current.options.map((opt, i) => {');
    const block = source.slice(start, source.indexOf('{current && (', start));

    expect(start).toBeGreaterThanOrEqual(0);
    expect(block).toContain('const optionFontSize = Math.min(f.h2, 22)');
    expect(block).toContain("wrapStyle={{ flexBasis:'47.5%', maxWidth:'48%', flexGrow:1, flexShrink:1, minWidth:0 }}");
    expect(block).toContain('style={{ height:68');
    expect(block).toContain("overflow:'hidden'");
    expect(block).toContain('numberOfLines={1}');
    expect(block).toContain('ellipsizeMode="tail"');
  });

  it('does not use heavy wrong-answer haptics for option cards', () => {
    const source = read('app/lesson_words.tsx');
    const start = source.indexOf('{current.options.map((opt, i) => {');
    const block = source.slice(start, source.indexOf('{current && (', start));

    expect(block).toContain('withHaptic={false}');
    expect(block).toContain('void hapticTap()');
    expect(source).not.toMatch(/haptic(Error|Heavy|Impact|Notification)/);
  });
});
