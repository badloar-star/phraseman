import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

// зачем (владелец 12.10, «второй вариант делаем», стиль «Тень»): контейнеры БЕЗ обводок и кромок. Слой GlassRim на круглых кнопках раздела «Ошибки»
// больше не рисует блик 150° и кромку (`inset`, фаски, кольцо) — только малую внешнюю тень вложенного элемента из токенов темы.
const read = (p) => fs.readFileSync(p, 'utf8');
const rim = read('components/mistakes-panel/GlassRim.tsx');

test('GlassRim draws only an outer theme-token shadow: no sheen, no inset rim, no ring', () => {
  assert.ok(rim.includes('nestedBoxShadow(g)'), 'GlassRim uses the nested shadow of the shadow style');
  assert.ok(!/inset:\s*true/.test(rim), 'no inset rim');
  assert.ok(!/bevelHi|bevelLo|hairlineSoft|glassEdge/.test(rim), 'no rim tokens');
  assert.ok(!/LinearGradient/.test(rim), 'no sheen gradient');
  assert.match(rim, /pointerEvents="none"/, 'rim never eats taps');
});

test('every round button of the mistakes section draws the rim', () => {
  for (const file of ['components/mistakes-panel/PanelKit.tsx', 'components/mistakes-panel/PracticeKit.tsx', 'app/mistake_detail.tsx', 'app/mistakes_list.tsx']) {
    const source = read(file);
    assert.ok(source.includes('<GlassRim radius={21} />'), `${file} draws GlassRim on its round button`);
    assert.ok(source.includes("GlassRim'"), `${file} imports GlassRim`);
  }
});
