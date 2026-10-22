// ЗАМОК ВЛАДЕЛЬЦА 22.10: «КНОПКА ВВЕРХУ „НАЗАД“ ДОЛЖНА БЫТЬ ВЕЗДЕ, НО НЕ ПРИКРЕПЛЕНА ВОТ ТАК, А ИМЕННО В СВОЁМ МЕСТЕ!!
// НЕ ПЕРЕСЕКАЕТСЯ С ДРУГИМИ ЭЛЕМЕНТАМИ!!» Реестр docs/work/OWNER_LOCKS.md. Ослабить сторож — только по новому слову владельца.
//
// зачем (повод — «Темы»: круг «‹» лёг на строку «Рассвет»): место кнопки (ScreenBackSlot / backSlot) лежало ВНУТРИ прокрутки —
// при прокрутке оно уезжало вверх, а контент вставал под круг. Место кнопки не меняется (его держит screen_back_button_contract);
// меняется контент: полоса кнопки (ScreenBackZone) или строка шапки с местом стоит ДО прокрутки, и прокрутка обрезается ниже.
// Проверка по исходникам (без устройства), через дерево TypeScript:
//   1) ни одно место кнопки не лежит внутри ScrollView / FlatList / SectionList / FlashList (включая ListHeaderComponent);
//   2) экран с общей кнопкой резервирует место под неё (полоса, место в строке, отступ SCREEN_BACK_*) — или назван ниже с причиной;
//   3) полоса = верх кнопки + круг + зазор, то есть верх первого элемента контента ≥ низ круга.
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

// зачем: сам компонент тянет react-native — сторож читает числа из исходника, а не импортом
const BUTTON_SRC = read('components/v2/ScreenBackButton.tsx');
const constOf = (name: string) => Number(new RegExp(`export const ${name} = (\\d+);`).exec(BUTTON_SRC)?.[1] ?? NaN);

function walk(dir: string): string[] {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) return ['node_modules', 'graphify-out', '__tests__'].includes(e.name) ? [] : walk(rel);
    return /\.tsx$/.test(e.name) ? [rel] : [];
  });
}

const SCROLL_TAG = /(ScrollView|FlatList|SectionList|FlashList)$/;
const BUTTON_TAG = /^(ScreenBackButton|ScreenCloseButton|SafeTopBackButton|SafeTopCloseButton)$/;
// зачем: «место кнопки» — общий ScreenBackSlot или своя заготовка экрана со стилем backSlot (styles.backSlot, s.backSlot, styles2.backSlot)
const isReservation = (tag: string, styleText: string) => tag === 'ScreenBackSlot' || /\bbackSlot\b/.test(styleText);

type Finding = { file: string; line: number; scroll: string };

function reservationsInsideScroll(file: string): Finding[] {
  const src = read(file);
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out: Finding[] = [];
  const visit = (node: ts.Node, scroll: string | null) => {
    let nextScroll = scroll;
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const opening = ts.isJsxElement(node) ? node.openingElement : node;
      const tag = opening.tagName.getText(sf);
      const styleAttr = opening.attributes.properties.find((p) => ts.isJsxAttribute(p) && p.name.getText(sf) === 'style');
      const styleText = styleAttr ? styleAttr.getText(sf) : '';
      if (scroll && isReservation(tag, styleText)) {
        out.push({ file, line: sf.getLineAndCharacterOfPosition(opening.getStart(sf)).line + 1, scroll });
      }
      if (SCROLL_TAG.test(tag)) nextScroll = tag;
    }
    ts.forEachChild(node, (child) => visit(child, nextScroll));
  };
  visit(sf, null);
  return out;
}

// Экраны с общей кнопкой, где место держит другой файл или своя высота — с причиной.
const RESERVED_ELSEWHERE: Readonly<Record<string, string>> = {
  'app/flashcards_collection.tsx': 'шапки CollectionTopBar / PackTopBar / CollectionHeader (свои ScreenBackSlot) стоят над списком, вне прокрутки',
  'app/(tabs)/community.tsx': 'сцена Пика сдвигает нарисованные вкладки на tabsInset = место кнопки',
  'app/flashcards_recall_session.tsx': 'строка монет высотой SCREEN_BACK_SIZE держит ✕ слева, название — строкой ниже',
  'components/SectionSheetHeader.tsx': 'шапка шторки высотой 56 ≥ круга; заголовок по центру между боковыми зонами',
  'app/flashcards_training_setup.tsx': 'место держит TrainingSetupV2 (верхний ряд с backSlot вне прокрутки)',
};

// зачем: экраны, которые ещё не приведены, — список только уменьшается. Каждый — с причиной, почему не сейчас.
const PENDING: Readonly<Record<string, string>> = {
  'app/mistake_detail.tsx': 'цветная плашка-герой от верха экрана по макету mistakes-v2 прокручивается вместе со строкой кнопки — нужно решение Макетов',
  'components/theory/TheoryLessonView.tsx': 'строка «Урок N · A1» внутри прокрутки; файл правит другая сессия',
};

const SOURCES = [...walk('app'), ...walk('components'), ...walk('modules')]
  .filter((f) => f !== 'components/v2/ScreenBackButton.tsx')
  .filter((f) => read(f).includes('v2/ScreenBackButton'));

describe('ЗАМОК ВЛАДЕЛЬЦА 22.10: контент начинается ниже кнопки «назад/✕» и не лежит под ней', () => {
  it('полоса кнопки = верх кнопки + круг + зазор (верх первого элемента ≥ низ круга)', () => {
    expect(constOf('SCREEN_BACK_GAP')).toBeGreaterThan(0);
    expect(constOf('SCREEN_BACK_SIZE')).toBe(48);
    expect(constOf('SCREEN_BACK_TOP_OFFSET')).toBe(0);
    expect(BUTTON_SRC).toContain('export const SCREEN_BACK_ZONE = SCREEN_BACK_TOP_OFFSET + SCREEN_BACK_SIZE + SCREEN_BACK_GAP;');
    // полоса стоит в потоке (не абсолютом) и прозрачна: фон экрана, без полосы другого цвета
    expect(BUTTON_SRC).toMatch(/const ZONE_STYLE = \{ height: SCREEN_BACK_ZONE \} as const;/);
  });

  it('место кнопки нигде не лежит внутри прокрутки (кроме ждущих с причиной)', () => {
    const bad = SOURCES.filter((f) => !PENDING[f]).flatMap(reservationsInsideScroll);
    expect(bad.map((b) => `${b.file}:${b.line} внутри <${b.scroll}>`)).toEqual([]);
  });

  it('экран с общей кнопкой резервирует под неё место', () => {
    const missing = SOURCES.filter((f) => {
      const src = read(f);
      const usesButton = /<(ScreenBackButton|ScreenCloseButton|SafeTopBackButton|SafeTopCloseButton)\b/.test(src);
      if (!usesButton || RESERVED_ELSEWHERE[f] || PENDING[f]) return false;
      return !/ScreenBackSlot|ScreenBackZone|useScreenBackContentTop|SCREEN_BACK_RESERVED|SCREEN_BACK_SIZE|SCREEN_BACK_GAP|screenBackTop|\bbackSlot\b/.test(src);
    });
    expect(missing).toEqual([]);
  });

  it('список ждущих только уменьшается', () => {
    expect(Object.keys(PENDING).length).toBeLessThanOrEqual(2); // потолок — только вниз (22.10: mistake_detail, TheoryLessonView)
  });

  it('общая кнопка не лежит внутри прокрутки (иначе она уезжает с контентом)', () => {
    const inside = SOURCES.flatMap((file) => {
      const src = read(file);
      const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const found: string[] = [];
      const visit = (node: ts.Node, scroll: boolean) => {
        let next = scroll;
        if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
          const opening = ts.isJsxElement(node) ? node.openingElement : node;
          const tag = opening.tagName.getText(sf);
          if (scroll && BUTTON_TAG.test(tag)) found.push(`${file}:${sf.getLineAndCharacterOfPosition(opening.getStart(sf)).line + 1}`);
          if (SCROLL_TAG.test(tag)) next = true;
        }
        ts.forEachChild(node, (child) => visit(child, next));
      };
      visit(sf, false);
      return found;
    });
    expect(inside).toEqual([]);
  });
});
