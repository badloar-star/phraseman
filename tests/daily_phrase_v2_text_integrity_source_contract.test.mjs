import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../components/DailyPhraseCard.tsx', import.meta.url), 'utf8');

test('home V2 phrase card keeps its right-side art without clipping real phrase copy', () => {
  assert.match(source, /testID="home-v2-phrase-of-day"/);
  assert.match(source, /mug_quote\.png/);
  assert.match(source, /v2Art: \{ position: 'absolute', right: 10, top: 11, width: 124, height: 124 \}/);
  assert.match(source, /backgroundColor: glassFill\(t\.bgCard, 0\.46\),[\s\S]{0,140}paddingBottom: 16 \+ sheetBottomInset/);
  assert.doesNotMatch(source, /<Text style=\{\[styles\.v2Kicker, \{ color: v2\.textSecondary \}\]\} numberOfLines=/);
  assert.doesNotMatch(source, /<Text style=\{\[styles\.v2Phrase, \{ color: v2\.text \}\]\} numberOfLines=/);
  assert.doesNotMatch(source, /<Text style=\{\[styles\.v2Translation, \{ color: v2\.textSecondary \}\]\} numberOfLines=/);
});
