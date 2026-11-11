import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('Classic lessons top edge fade', () => {
  it('reveals the backdrop through the top edge of the list without coloring it', () => {
    const fade = read('components/lessons/ListTopEdgeFade.tsx');
    expect(fade).toMatch(/<MaskedView\b[^>]*maskElement=\{mask\}[^>]*>\s*\{children\}/);
    expect(fade).toContain("colors={['transparent', 'black']}");
    expect(fade).toContain("opaque: { flex: 1, backgroundColor: 'black' }");
    expect(fade).not.toContain('bgTop');
  });

  it('masks the actual list viewport, including when opened outside the tabs', () => {
    const lessons = read('app/(tabs)/lessons.tsx');
    const catalog = lessons.indexOf('testID="legacy-lessons-catalog"');
    const mask = lessons.indexOf('<ListTopEdgeFade>', catalog);
    const list = lessons.indexOf('data={legacyFilteredListData}', mask);
    const maskEnd = lessons.indexOf('</ListTopEdgeFade>', list);
    expect(catalog).toBeGreaterThan(-1);
    expect(mask).toBeGreaterThan(catalog);
    expect(list).toBeGreaterThan(mask);
    expect(maskEnd).toBeGreaterThan(list);
  });
});
