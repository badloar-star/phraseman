// зачем (R109, слово владельца 17.10: «цифры справа от иконки») — ЗАМЕНЕНО решением владельца 05.11 (~14:45 «Хаб карточек — СПИСКОМ,
// по уже утверждённому макету», ~20:55 «ХАБ ДЕЛАЕТ КАК МАКЕТ Я ОДОБРИЛ»): в утверждённом списке rev4 у строк чисел нет.
// Что осталось от R109 и сторожится здесь: число и единица (9 языков) озвучиваются скринридером; «Из видео» — без слова «наборов».
// Раскладку списка сторожит tests/cards_hub_list_layout_2026_11_05.test.ts.
import fs from 'fs';
import path from 'path';

const read = (rel: string): string => fs.readFileSync(path.join(process.cwd(), rel), 'utf8');

describe('хаб Карточек: число строки — только для скринридера', () => {
  const view = read('app/flashcards/CardsHubV2.tsx');
  const rows = read('app/flashcards/cards_hub_rows.ts');
  const screen = read('app/flashcards/FlashcardsHubScreen.tsx');

  it('скринридер: единица в подписи строки (9 языков), при неизвестном числе — только название', () => {
    expect(rows).toContain("return row.count === '' ? row.title : `${row.title}. ${row.unit ? `${row.unit}: ` : ''}${row.count}`;");
    expect(view).toContain('accessibilityLabel={cardsHubRowA11yLabel(row)}');
    expect(screen).toContain("ru: 'наборов', uk: 'наборів', en: 'packs', es: 'packs', 'pt-BR': 'pacotes', vi: 'bộ thẻ', id: 'paket', tr: 'paket', pl: 'zestawów'");
    expect(screen).toContain('unit: cardsUnit');
  });

  it('[LABEL-FIT] название строки переносится на 2 строки, а не обрезается многоточием', () => {
    expect(view).toContain('numberOfLines={2}>{row.title}');
  });

  it('«Из видео»: число без слова «наборов»', () => {
    expect(screen).toContain("title: copy.videoShort, count: fmt(videoPackCount)");
    expect(screen).not.toContain('fmtPacks');
  });
});
