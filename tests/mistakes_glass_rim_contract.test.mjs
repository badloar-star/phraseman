import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

// зачем (сверка mistakes-panel-007/-002, «круглые кнопки без стекла»): макет kit.css `.rb::after` = «--lg-sheen» + «--lg-rim» + кромка 1px «--line» .09.
// Круглые кнопки раздела «Ошибки» (назад, ⋯, поиск, ✕) обязаны нести слой GlassRim, а он — ровно эти значения.
const read = (p) => fs.readFileSync(p, 'utf8');
const rim = read('components/mistakes-panel/GlassRim.tsx');

test('GlassRim paints the mockup sheen and rim values', () => {
  for (const token of ["'rgba(255,255,255,0.10)'", "'rgba(255,255,255,0.055)'", 'spreadDistance: -0.2', "'rgba(255,255,255,0.22)'", "'rgba(0,0,0,0.45)'", "'rgba(255,255,255,0.09)'"]) {
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
