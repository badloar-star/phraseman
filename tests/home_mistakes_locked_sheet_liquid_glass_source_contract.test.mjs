import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../components/home/HomeMistakesLockedSheet.tsx', import.meta.url), 'utf8');

test('locked-mistakes sheet uses glass and keeps its bottom action above safe area', () => {
  assert.match(source, /useStableSafeAreaInsets/);
  assert.match(source, /glassFill\(t\.bgCard, 0\.46\)/);
  assert.match(source, /paddingBottom: Math\.max\(34, insets\.bottom \+ 16\)/);
  assert.match(source, /testID="mistakes-locked-close"/);
  assert.match(source, /hapticTap\(\); onClose\(\)/);
});
