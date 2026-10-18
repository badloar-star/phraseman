// зачем (решения координатора 13.10 по п.4/п.6 + Темы Г3/Г4): контракт по строкам файлов.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('cards-007: выделение карточек', () => {
  it('подсказка «Выбери ещё N» не показывается при пустом выборе — ни в сетке, ни в списке', () => {
    expect(read('app/flashcards/CollectionGalleryView.tsx')).toContain('{!canCreatePack && selectedCount > 0 ? (');
    expect(read('app/flashcards/CollectionListView.tsx')).toContain('{!canCreatePack && selectedIds.size > 0 ? (');
  });
  it('две колонки: перевод показывается целиком (владелец 18.10 отменил «до двух строк»), без «стоимость прое…»', () => {
    const src = read('components/cards-grid/CardsGallery.tsx');
    const at = src.indexOf('<View style={[styles.col1, pad]}>');
    expect(at).toBeGreaterThan(0);
    expect(src.slice(at, at + 120)).toContain('{trEl}');
    expect(src).not.toMatch(/numberOfLines|ellipsizeMode/);
  });
});

describe('каталог: чип языка виден всегда, языков всегда пять (владелец 15.10 отменил правило 13.10)', () => {
  const src = read('app/flashcards_packs.tsx');
  it('языки — все пять PACK_LANGUAGES, а не только языки загруженных наборов', () => {
    expect(src).toContain('const catalogLanguages = PACK_LANGUAGES;');
    expect(src).not.toContain('present.add(code)');
    expect(src).not.toContain('present.add(packLanguage)');
    expect(src).toContain('const languageChipVisible = catalogLanguages.length >= 2;');
    expect(src).toMatch(/const headerActions = languageChipVisible \? \(/);
    expect(src).toContain('languages={catalogLanguages}');
    expect(src).toMatch(/\) : null;\n\n  \/\/ зачем: во вкладке «Сообщество»/);
  });
});

describe('шторки в тёмном — нейтраль «Тени» (Темы Г3, Г4)', () => {
  it('HybridSheetShell: тёмная заливка и верх — нейтральный градиент, акцентной вуали нет, светлое прежнее', () => {
    const src = read('components/modal_fx/HybridSheetShell.tsx');
    expect(src).toContain("import { shadowSheetGradient } from '../v2/shadow_sheet_paint';");
    expect(src).toContain('const neutralSheet = shadowSheetGradient(glass.isLight);');
    expect(src).toMatch(/\{neutralSheet \? \(\n\s*<LinearGradient colors=\{neutralSheet\} locations=\{\[0, 1\]\}/);
    expect(src).toContain('{neutralSheet && !glowColor ? null : (');
    // светлое оформление: прежний градиент glass.selected остаётся
    expect(src).toContain("<LinearGradient colors={[glass.selected, 'transparent']}");
  });
  it('PackEditorV2: тёмная заливка — нейтральная, светлая — прежние 17 % тона', () => {
    const src = read('app/community_packs/PackEditorV2.tsx');
    expect(src).toContain('const neutralFill = shadowSheetGradient(g.isLight);');
    expect(src).toContain('colors={neutralFill ? [neutralFill[0], neutralFill[1]] : [`${mixDark(a, g.opaqueSheet, 0.17)}FF`');
  });
});
