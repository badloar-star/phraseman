import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

// зачем (координатор 05.10, FONTSCALE2): хаб «Карточки» при системном шрифте 2.0 не режет текст — lineHeight масштабируется тем же коэффициентом,
// высоты шапки/пилюли становятся minHeight, подписи переносятся, хаб прокручивается. Шрифт не сжимаем; при 1.0 разметка прежняя (макет пиксель в пиксель).
const source = fs.readFileSync('app/flashcards/CardsHubV2.tsx', 'utf8');

test('line heights scale with the system font; at 1.0 they stay as in the mockup', () => {
  assert.match(source, /const lh = \(n: number\) => \(fs === 1 \? n : Math\.round\(n \* fs\)\)/);
  for (const n of [20, 46, 22, 44, 25, 19]) assert.ok(source.includes(`lineHeight: lh(${n})`), `lineHeight: lh(${n})`);
});

test('fixed header/pill heights become minHeight and labels wrap at large fonts', () => {
  assert.match(source, /fs > 1 && \{ height: undefined, minHeight: 44 \}/);
  assert.match(source, /fs > 1 && \{ height: undefined, minHeight: 30/);
  assert.match(source, /numberOfLines=\{fs > 1 \? undefined : 1\}/);
});

test('the hub scrolls at large fonts only, and never shrinks the font', () => {
  assert.match(source, /return fs > 1\s*\n\s*\? <ScrollView/);
  assert.doesNotMatch(source, /adjustsFontSizeToFit/);
});
