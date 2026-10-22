import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../components/DailyPhraseCard.tsx', import.meta.url), 'utf8');

test('home V2 phrase card: прежний вид без «Сцены» (арт справа, текст его не перекрывает) и новый со «Сценой»', () => {
  assert.match(source, /testID="home-v2-phrase-of-day"/);
  assert.match(source, /mug_quote\.png/);
  // зачем (10.10): «Фраза дня» стала компактной по скриншотам владельца 04.10 (640d0af0f) — арт 72. Суть сторожа —
  // арт справа и текст его не перекрывает: отступ текста справа не меньше, чем занимает арт. ВЕТКА БЕЗ ФЛАГА «Сцены» (выпуск) — прежний вид 1:1 (Ревизор 22.10).
  const art = /v2Art: \{ position: 'absolute', right: (\d+), top: \d+, width: (\d+), height: \d+ \}/.exec(source);
  assert.ok(art, 'v2Art is absolutely positioned on the right');
  const copyPad = /v2Copy: \{[^}]*paddingRight: (\d+)/.exec(source);
  assert.ok(copyPad, 'v2Copy reserves right padding');
  assert.ok(Number(copyPad[1]) >= Number(art[1]) + Number(art[2]), 'copy padding clears the art');
  assert.match(source, /sceneLook \? title : title\.toUpperCase\(\)/);
  // зачем (22.10, scenes-compact.html в.2 `.pod`): СО «Сценой» (HOME_SCENE_V2_ENABLED) — картинка слева 52×52 в потоке, подпись без капса, шеврон; текст картинку не перекрывает по построению
  assert.match(source, /const sceneLook = homeV2 && HOME_SCENE_V2_ENABLED;/);
  assert.match(source, /v2ArtScene: \{ width: 52, height: 52 \}/);
  assert.match(source, /\{sceneLook \? <Ionicons name="chevron-forward" size=\{18\}/);
  assert.match(source, /backgroundColor: glassFill\(t\.bgCard, 0\.46\),[\s\S]{0,140}paddingBottom: 16 \+ sheetBottomInset/);
  assert.doesNotMatch(source, /<Text style=\{\[styles\.v2Kicker, \{ color: v2\.textSecondary \}\]\} numberOfLines=/);
  assert.doesNotMatch(source, /<Text style=\{\[styles\.v2Phrase, \{ color: v2\.text \}\]\} numberOfLines=/);
  assert.doesNotMatch(source, /<Text style=\{\[styles\.v2Translation, \{ color: v2\.textSecondary \}\]\} numberOfLines=/);
});
