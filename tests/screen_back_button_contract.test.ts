// зачем (закон владельца 22.10, капсом: «КНОПКА НАЗАД ВООБЩЕ ВЕЗДЕ ДОЛЖНА БЫТЬ В ОДНОМ И ТОМ ЖЕ МЕСТЕ НА АБСОЛЮТНО ВСЕХ ЭКРАНАХ!»):
// сторож одной кнопки «назад». Держит: (1) место кнопки равно эталону макетов kit.css; (2) кнопка не принимает своих стилей и смещений;
// (3) своя кнопка «назад» живёт только в файлах из базы config/screen_back_baseline.json, а база только уменьшается — новый экран
// обязан брать components/v2/ScreenBackButton. Сработал на новом файле — переведи файл на ScreenBackButton, а не расширяй базу.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const px = (css: string, re: RegExp): number => {
  const m = re.exec(css);
  if (!m) throw new Error(`в kit.css не найдено: ${re}`);
  return Number(m[1]);
};

// Свои кнопки «назад» (как их рисуют экраны до перевода).
const OWN_BACK: ReadonlyArray<readonly [string, RegExp]> = [
  ['BackButton', /<BackButton\b/],
  ['PracticeBackButton', /<PracticeBackButton\b/],
  ['DialogueGlassBackButton', /<DialogueGlassBackButton\b/],
  ['ResultsGlassBackButton', /<ResultsGlassBackButton\b/],
  ['BackGlyph', /<BackGlyph\b/],
  ['icon-prop', /\bicon=["'](?:chevron|arrow)-back/],
  ['name-prop', /\bname=["'](?:chevron|arrow)-back/],
];
// Сами реализации кнопки — не экраны.
const IMPLEMENTATION = new Set(['components/v2/BackButton.tsx', 'components/v2/BackGlyph.tsx', 'components/v2/ScreenBackButton.tsx']);
const isDevOnly = (rel: string) => path.basename(rel).startsWith('_') || /\/dev[_/]|\/dev_|learning-v2-lab|motion_showcase/.test(rel);

function walk(dir: string): string[] {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) return ['node_modules', 'graphify-out'].includes(e.name) ? [] : walk(rel);
    return /\.tsx$/.test(e.name) ? [rel] : [];
  });
}

describe('кнопка «назад»: одна и в одном месте', () => {
  const button = read('components/v2/ScreenBackButton.tsx');

  it('место кнопки = эталон макетов 2.0 (kit.css): слева --pad, круг .rb.l, верх по шапке .topbar', () => {
    const kit = read('docs/design/v2-app/kit.css');
    const pad = px(kit, /--pad:\s*(\d+)px/);
    const big = px(kit, /\.rb\.l\s*\{\s*width:\s*(\d+)px/);
    const topbar = px(kit, /\.topbar\s*\{[^}]*height:\s*(\d+)px/);
    const contentTop = px(kit, /\.scr > \.in\s*\{\s*padding:\s*(\d+)px/);
    const statusBar = px(kit, /\.sb\s*\{[^}]*height:\s*(\d+)px/);
    const offset = (contentTop - statusBar) + (topbar - big) / 2;
    expect(button).toContain(`export const SCREEN_BACK_LEFT = ${pad};`);
    expect(button).toContain(`export const SCREEN_BACK_SIZE = ${big};`);
    expect(button).toContain(`export const SCREEN_BACK_TOP_OFFSET = ${offset};`);
  });

  it('кнопка стоит абсолютным слоем от устойчивого безопасного верха, вид — общая BackButton, своих стилей не принимает', () => {
    expect(button).toContain('useStableSafeAreaInsets()');
    expect(button).toMatch(/position: 'absolute', top: screenBackTop\(safeTop\), left: SCREEN_BACK_LEFT/);
    // экран стека — от верха экрана; страница вкладки — от страницы (под отступом оболочки или своя зона часов у полноэкранной)
    expect(button).toContain('const safeTop = isTabPage ? tabBleed : insets.top;');
    expect(read('app/TabSlider.tsx')).toContain('<TabPageContext.Provider value>');
    expect(button).toContain('<BackButton');
    expect(button).toContain('size={SCREEN_BACK_SIZE}');
    expect(button).toContain('safeRouterBack(router, fallback)');
    const props = /type Props = Readonly<\{([\s\S]*?)\}>;/.exec(button)?.[1] ?? '';
    expect(props).not.toMatch(/\b(style|top|left|offset|size|containerStyle)\??:/);
  });

  it('своя кнопка «назад» — только в файлах из базы; база только уменьшается', () => {
    const baseline = JSON.parse(read('config/screen_back_baseline.json')) as { files: string[] };
    const allowed = new Set(baseline.files);
    const own = [...walk('app'), ...walk('components')]
      .filter((rel) => !IMPLEMENTATION.has(rel) && !isDevOnly(rel))
      .filter((rel) => { const src = read(rel); return OWN_BACK.some(([, re]) => re.test(src)); });
    // Новый файл со своей кнопкой — нарушение закона.
    expect(own.filter((rel) => !allowed.has(rel))).toEqual([]);
    // Переведённый файл обязан уйти из базы (иначе база не уменьшается и долг не виден).
    expect(baseline.files.filter((rel) => !own.includes(rel))).toEqual([]);
    expect(baseline.files.length).toBeLessThanOrEqual(77); // потолок — только вниз (22.10: 80 → 77 — «Сегодня», теория, слова урока)
  });

  it('корень вкладки, открытый НЕ из нижнего меню, показывает общую «назад» (координатор 22.10: Пик с Главной)', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const entry = require('../app/tab_entry_source') as typeof import('../app/tab_entry_source');
    entry.resetTabEntrySourceForTests();
    expect(entry.tabEnteredByMenu('/(tabs)/community', 1000)).toBe(false); // ссылкой — «назад» есть
    entry.noteTabEnteredByMenu('/(tabs)/community');
    expect(entry.tabEnteredByMenu('/(tabs)/community')).toBe(true); // из меню — «назад» нет
    expect(entry.tabEnteredByMenu('/(tabs)/home')).toBe(false);
    expect(entry.tabEnteredByMenu('/(tabs)/community', Date.now() + 5000)).toBe(false); // старая отметка не действует
    const layout = read('app/(tabs)/_layout.tsx');
    expect(layout.match(/noteTabEnteredByMenu\(IDX_TO_TAB_ROUTE\[idx\] \?\? ''\)/g)?.length).toBe(2); // тап по меню и свайп
    const community = read('app/(tabs)/community.tsx');
    expect(community).toContain("const byMenu = tabEnteredByMenu('/(tabs)/community');");
    expect(community).toContain('{backFromLink ? <ScreenBackButton');
  });

  it('экраны, взявшие ScreenBackButton, не держат рядом свою кнопку «назад»', () => {
    const users = [...walk('app'), ...walk('components')].filter((rel) => !IMPLEMENTATION.has(rel) && /<ScreenBackButton\b/.test(read(rel)));
    const doubled = users.filter((rel) => OWN_BACK.some(([, re]) => re.test(read(rel))));
    expect(doubled).toEqual([]);
  });
});
