import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

// зачем (координатор 05.10, FONTSCALE2): хаб «Карточки» при системном шрифте 2.0 не режет текст — lineHeight масштабируется тем же коэффициентом,
// высоты шапки/пилюли становятся minHeight, подписи переносятся, хаб прокручивается. Шрифт не сжимаем; при 1.0 разметка прежняя (макет пиксель в пиксель).
// зачем (11.10): рабочая копия в CRLF (autocrlf) — сторож сверяет многострочный текст, нормализуем переносы.
const source = fs.readFileSync('app/flashcards/CardsHubV2.tsx', 'utf8').replace(/\r\n/g, '\n');

test('line heights scale with the system font; at 1.0 they stay as in the mockup', () => {
  assert.match(source, /const lh = \(n: number\) => \(fs === 1 \? n : Math\.round\(n \* fs\)\)/);
  // зачем (координатор 18.10, red-tests): R109 (0b974b1d9) перенёс число плитки вправо от иконки (28) и убрал строку 19; список — по
  // текущей разметке. Главное — ни одна подпись хаба не держит фиксированный lineHeight: каждая строка <Text … style=…> идёт через lh().
  for (const n of [20, 46, 22, 30, 44, 28, 25]) assert.ok(source.includes(`lineHeight: lh(${n})`), `lineHeight: lh(${n})`);
  const textLines = source.split('\n').filter((line) => /<Text\b[^>]*style=/.test(line));
  assert.ok(textLines.length >= 8, `подписей хаба найдено ${textLines.length}`);
  for (const line of textLines) assert.ok(line.includes('lineHeight: lh('), `подпись без масштаба строки: ${line.trim().slice(0, 120)}`);
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
