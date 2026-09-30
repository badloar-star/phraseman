import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const list = readFileSync(new URL('../app/mistakes_list.tsx', import.meta.url), 'utf8');
const detail = readFileSync(new URL('../app/mistake_detail.tsx', import.meta.url), 'utf8');

test('active mistake list and detail use Liquid Glass without text truncation', () => {
  for (const source of [list, detail]) {
    assert.match(source, /import \{ glassFill \} from '\.\.\/components\/GlassSurface';/);
    assert.match(source, /glassFill\(t\.bgCard, 0\.46\)/);
    assert.doesNotMatch(source, /numberOfLines/);
  }
});

test('list and detail keep their live navigation and training entry points', () => {
  assert.match(list, /pathname: '\/mistake_detail'/);
  assert.match(detail, /pathname: '\/mistake_practice_session'/);
  assert.match(detail, /focusMistakeId: detail\.mistakeId/);
  assert.match(detail, /edges=\{\['top', 'left', 'right'\]\}/);
});
