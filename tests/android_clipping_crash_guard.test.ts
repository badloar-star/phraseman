import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const SOURCE_DIRS = ['app', 'components'];

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(full, out);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function findVirtualizedListTagStarts(source: string): Array<{ name: string; slice: string }> {
  const tags: Array<{ name: string; slice: string }> = [];
  const pattern = /<FlatList(?!<)\b|<SectionList(?:\b|<)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    tags.push({
      name: match[0].replace(/^</, ''),
      slice: source.slice(match.index, match.index + 6000),
    });
  }
  return tags;
}

describe('Android clipping crash guard', () => {
  it('keeps app-owned virtualized lists out of ReactClippingViewManager', () => {
    const offenders: string[] = [];

    for (const relDir of SOURCE_DIRS) {
      for (const file of collectSourceFiles(path.join(ROOT, relDir))) {
        const source = fs.readFileSync(file, 'utf8');
        for (const tag of findVirtualizedListTagStarts(source)) {
          if (!/removeClippedSubviews=\{false\}/.test(tag.slice)) {
            offenders.push(`${path.relative(ROOT, file).replace(/\\/g, '/')}: ${tag.name.split(/\s+/)[0]}`);
          }
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('does not enable Android LayoutAnimation directly in UGC card preview', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'community_packs', 'UgcPackEditorCardPreview.tsx'), 'utf8');

    expect(source).toContain('configureAccordionLayout()');
    expect(source).not.toContain('setLayoutAnimationEnabledExperimental');
    expect(source).not.toContain('LayoutAnimation.configureNext');
  });
});
