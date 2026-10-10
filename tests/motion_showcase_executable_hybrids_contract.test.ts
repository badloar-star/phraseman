import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(
  path.join(__dirname, '..', 'components', 'dev', 'motion_showcase', 'index.ts'),
  'utf8',
);

describe('DEV motion showcase release inventory', () => {
  it('excludes documentation-only notes from the executable hybrid list', () => {
    // зачем (11.10): проверка заметок переписана ранним выходом `if (item.kind === 'note') return false;` — та же
    // гарантия, другой синтаксис.
    expect(source).toMatch(/item\.kind !== 'note'|if \(item\.kind === 'note'\) return false;/);
    expect(source).toContain('items.filter(isExecutableHybridItem)');
  });
});
