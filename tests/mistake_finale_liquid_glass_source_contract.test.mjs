import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const finale = readFileSync(new URL('../components/mistake-practice/MistakeSessionFinale.tsx', import.meta.url), 'utf8');
const verdict = readFileSync(new URL('../components/mistake-practice/MistakeVerdictPanel.tsx', import.meta.url), 'utf8');

test('mistake finale uses translucent Liquid Glass rows without changing rewards or actions', () => {
  assert.match(finale, /import \{ glassFill \} from '\.\.\/GlassSurface';/);
  assert.ok((finale.match(/glassFill\(t\.bgCard, 0\.46\)/g) ?? []).length >= 2);
  assert.match(finale, /onPress=\{onDone\}/);
  assert.match(finale, /onPress=\{onMore\}/);
});

test('mistake verdict keeps its success and error semantics while its explanation uses glass', () => {
  assert.match(verdict, /import \{ glassFill \} from '\.\.\/GlassSurface';/);
  assert.match(verdict, /backgroundColor: glassFill\(t\.bgCard, 0\.46\)/);
  assert.match(verdict, /correct \? t\.correctBg : t\.wrongBg/);
});
