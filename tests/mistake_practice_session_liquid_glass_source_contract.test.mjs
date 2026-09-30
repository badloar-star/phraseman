import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../app/mistake_practice_session.tsx', import.meta.url), 'utf8');

test('mistake practice keeps real answer flows while structural surfaces use Liquid Glass', () => {
  assert.match(source, /import \{ glassFill \} from '\.\.\/components\/GlassSurface';/);
  assert.match(source, /backgroundColor: glassFill\(t\.bgCard, 0\.46\)/);
  assert.match(source, /onPress=\{\(\) => void submitVerdict\(/);
  assert.match(source, /<MistakeVerdictPanel/);
  assert.match(source, /<MistakeSessionFinale/);
});

test('mistake practice frame protects both system safe areas', () => {
  assert.match(source, /<SafeAreaView style=\{styles\.screen\}>/);
  assert.match(source, /paddingBottom: 120/);
});
