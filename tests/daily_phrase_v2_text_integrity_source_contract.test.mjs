import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../components/DailyPhraseCard.tsx', import.meta.url), 'utf8');

test('home V2 phrase card keeps its art in the flow without clipping real phrase copy', () => {
  assert.match(source, /testID="home-v2-phrase-of-day"/);
  assert.match(source, /mug_quote\.png/);
  // зачем (22.10, владелец выбрал scenes-compact.html в.2 `.pod`): картинка слева 52×52 В ПОТОКЕ (не поверх текста), справа шеврон — текст её не перекрывает по построению;
  // прежнее правило «арт справа, абсолютный» (10.10, 72 px) заменено новым макетом. Суть сторожа прежняя: арт текст не перекрывает, фраза не обрезается.
  const art = /v2Art: \{ width: (\d+), height: (\d+) \}/.exec(source);
  assert.ok(art, 'v2Art is an in-flow art block (no absolute overlap)');
  assert.doesNotMatch(source, /v2Art: \{ position: 'absolute'/);
  assert.match(source, /<Ionicons name="chevron-forward" size=\{18\}/);
  assert.match(source, /backgroundColor: glassFill\(t\.bgCard, 0\.46\),[\s\S]{0,140}paddingBottom: 16 \+ sheetBottomInset/);
  assert.doesNotMatch(source, /<Text style=\{\[styles\.v2Kicker, \{ color: v2\.textSecondary \}\]\} numberOfLines=/);
  assert.doesNotMatch(source, /<Text style=\{\[styles\.v2Phrase, \{ color: v2\.text \}\]\} numberOfLines=/);
  assert.doesNotMatch(source, /<Text style=\{\[styles\.v2Translation, \{ color: v2\.textSecondary \}\]\} numberOfLines=/);
});
