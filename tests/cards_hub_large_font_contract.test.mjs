import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

// зачем (координатор 05.10, FONTSCALE2): хаб «Карточки» при системном шрифте 2.0 не режет текст — lineHeight масштабируется тем же коэффициентом,
// высоты становятся minHeight, подписи переносятся, хаб прокручивается. Шрифт не сжимаем; при 1.0 разметка как в макете.
// зачем (владелец 05.11, хаб — СПИСОК по макету rev4): у списка нет фиксированных высот стопки/плиток — строки растут по тексту, список прокручивается
// всегда (ScrollView), межстрочный каждой подписи идёт через useLineScale (lh). Шрифт не сжимаем.
// зачем (11.10): рабочая копия в CRLF (autocrlf) — сторож сверяет многострочный текст, нормализуем переносы.
const source = fs.readFileSync('app/flashcards/CardsHubV2.tsx', 'utf8').replace(/\r\n/g, '\n');

test('line heights scale with the system font; at 1.0 they stay as in the mockup', () => {
  assert.match(source, /const lh = useLineScale\(\);/);
  for (const n of [29, 22]) assert.ok(source.includes(`lineHeight: lh(${n})`), `lineHeight: lh(${n})`);
  const textLines = source.split('\n').filter((line) => /<Text\b[^>]*style=/.test(line));
  assert.ok(textLines.length >= 2, `подписей хаба найдено ${textLines.length}`);
  for (const line of textLines) assert.ok(line.includes('lineHeight: lh('), `подпись без масштаба строки: ${line.trim().slice(0, 120)}`);
});

test('rows have no fixed height (minHeight only) and titles wrap instead of shrinking', () => {
  assert.match(source, /row: \{[^}]*minHeight: ART_SIZE \+ 32/);
  assert.doesNotMatch(source, /row: \{[^}]*\bheight:/);
  assert.match(source, /numberOfLines=\{2\}>\{row\.title\}/);
  assert.match(source, /maxFontSizeMultiplier=\{1\.15\}/);
});

test('the hub list scrolls, and never shrinks the font', () => {
  assert.match(source, /<ScrollView contentContainerStyle=\{styles\.list\}/);
  assert.doesNotMatch(source, /adjustsFontSizeToFit/);
});
