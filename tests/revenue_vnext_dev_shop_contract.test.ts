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

// зачем (§99, 03.10): /shop — обычный маршрут, диплинк открывал бы предпросмотр и в store-сборке.
// Дверь обязана закрываться теми же флагами, что и вход из DEV-центра, и стоять ВЫШЕ хуков экрана.
test('shop route is closed outside dev builds (deep link cannot reach it in a store release)', () => {
  expect(source).toContain("import { ENABLE_DEV_TOOLS, IS_STORE_RELEASE } from './config';");
  expect(source).toContain('if (!ENABLE_DEV_TOOLS || IS_STORE_RELEASE) return <Redirect href="/(tabs)/home" />;');
  const gate = source.indexOf('export default function ShopScreen()');
  expect(gate).toBeGreaterThan(source.indexOf('function ShopScreenImpl()'));
  expect(source.slice(gate)).not.toMatch(/use[A-Z]\w+\(/);
});
