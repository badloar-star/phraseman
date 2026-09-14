import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(process.cwd(), 'app', 'shop.tsx'), 'utf8');

test('DEV shop cannot claim an uncommitted purchase in any supported locale', () => {
  expect(source).toContain('DEV_PREVIEW_ONLY = true');
  expect(source).toContain('Предпросмотр: покупка и выдача не выполнялись');
  expect(source).not.toContain("`${shopText(lang, item.title)} — ${triLang(lang, COPY.done)}`");

  const noticeBlock = source.slice(
    source.indexOf('previewOnlyNotice:'),
    source.indexOf('} as const;', source.indexOf('previewOnlyNotice:')),
  );
  for (const locale of ['ru', 'uk', 'es', 'en', "'pt-BR'", 'vi', 'id', 'tr', 'pl']) {
    expect(noticeBlock).toContain(`${locale}:`);
  }
});

test('DEV preview CTA performs no affordability, wallet, or random-reward decision', () => {
  expect(source).not.toContain('sheetAffordable');
  expect(source).not.toContain('balance < item.price');
  expect(source).not.toContain('Math.random()');
  expect(source).not.toContain('affordable={(item.currency');
  expect(source).not.toContain('accessibilityLabel={sheetAffordable');
  expect(source).toContain('showNotice(triLang(lang, COPY.previewOnlyNotice))');
});

