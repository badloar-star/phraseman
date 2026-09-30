import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../app/lesson_complete.tsx', import.meta.url), 'utf8');

test('lesson completion keeps its live outcomes while its neutral surfaces use Liquid Glass', () => {
  assert.match(source, /import \{ glassFill \} from '\.\.\/components\/GlassSurface';/);
  assert.ok((source.match(/glassFill\(t\.bgCard, 0\.46\)/g) ?? []).length >= 4);
  assert.match(source, /<ResultsSequence/);
  assert.match(source, /<CollectibleDropModal/);
  assert.match(source, /<ReviewPromptModal/);
});

test('review text on lesson completion is not silently clipped', () => {
  assert.doesNotMatch(source, /numberOfLines=\{2\}/);
});
