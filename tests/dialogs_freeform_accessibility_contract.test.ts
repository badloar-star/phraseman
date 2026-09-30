import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.join(__dirname, '..', 'components', 'DialogsTabContent.tsx'),
  'utf8',
);

test('Free free-form dialogue card explains that it opens Plus', () => {
  const cardStart = source.indexOf("source: 'dialogs_companion'");
  expect(cardStart).toBeGreaterThanOrEqual(0);
  const card = source.slice(Math.max(0, cardStart - 1400), cardStart + 240);
  expect(card).toContain('accessibilityHint={!hasPremiumAccess ? triLang(lang, {');
  expect(card).toContain("ru: 'Доступно в Plus. Откроется экран Plus.'");
  expect(card).toContain("en: 'Available with Plus. Opens the Plus screen.'");
});
