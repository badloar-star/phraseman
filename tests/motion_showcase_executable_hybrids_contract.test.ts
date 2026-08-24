import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(
  path.join(__dirname, '..', 'components', 'dev', 'motion_showcase', 'index.ts'),
  'utf8',
);

describe('DEV motion showcase release inventory', () => {
  it('excludes documentation-only notes from the executable hybrid list', () => {
    expect(source).toContain("item.kind !== 'note'");
    expect(source).toContain('items.filter(isExecutableHybridItem)');
  });
});
