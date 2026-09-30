import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../components/ReviewPromptModal.tsx', import.meta.url), 'utf8');

test('the live review prompt uses Liquid Glass in hybrid and classic paths', () => {
  assert.match(source, /import \{ glassFill \} from '\.\/GlassSurface';/);
  assert.match(source, /backgroundColor: glassFill\(t\.bgCard, 0\.46\)/);
  assert.match(source, /material="liquid-glass"/);
});

test('review prompt retains store-rate and safe scroll flows', () => {
  assert.match(source, /await openStoreReviewPage\(\)/);
  assert.match(source, /paddingBottom: Math\.max\(bottomSheet \? 18 : 22, bottomInset \+ 12\)/);
  assert.match(source, /<ScrollView/);
});
