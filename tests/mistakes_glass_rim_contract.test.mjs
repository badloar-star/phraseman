import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

// зачем (сверка mistakes-panel-007/-002, «круглые кнопки без стекла»): макет kit.css `.rb::after` = «--lg-sheen» + «--lg-rim» + кромка 1px «--line» .09.
// Круглые кнопки раздела «Ошибки» (назад, ⋯, поиск, ✕) обязаны нести слой GlassRim, а он — ровно эти значения.
const read = (p) => fs.readFileSync(p, 'utf8');
const rim = read('components/mistakes-panel/GlassRim.tsx');

// 10.10 (замечание владельца): значения макета остались прежними, но цвета — токены выбранной темы (mediaInk/bevelHi/bevelLo/hairlineSoft), а не литералы.
test('GlassRim paints the mockup sheen and rim values from theme tokens', () => {
  for (const token of ['`${g.mediaInk}1A`', '`${g.mediaInk}0E`', 'spreadDistance: -0.2', 'color: g.bevelHi', 'color: g.bevelLo', 'color: g.hairlineSoft']) {
    assert.ok(rim.includes(token), `GlassRim has ${token}`);
  }
  assert.match(rim, /pointerEvents="none"/, 'rim never eats taps');
});

test('every round button of the mistakes section draws the rim', () => {
  for (const file of ['components/mistakes-panel/PanelKit.tsx', 'components/mistakes-panel/PracticeKit.tsx', 'app/mistake_detail.tsx', 'app/mistakes_list.tsx']) {
    const source = read(file);
    assert.ok(source.includes('<GlassRim radius={21} />'), `${file} draws GlassRim on its round button`);
    assert.ok(source.includes("GlassRim'"), `${file} imports GlassRim`);
  }
});
