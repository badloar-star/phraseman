// ЗАМОК ВЛАДЕЛЬЦА 22.10: «КНОПКА НАЗАД ВООБЩЕ ВЕЗДЕ ДОЛЖНА БЫТЬ В ОДНОМ И ТОМ ЖЕ МЕСТЕ НА АБСОЛЮТНО ВСЕХ ЭКРАНАХ!»; ✕ — «в одном месте, в той же точке,
// что стрелка: слева сверху». Реестр docs/work/OWNER_LOCKS.md. Ослабить сторож — только по новому слову владельца.
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
  // 22.10: «назад» без круга из PackScreenKit (шапки наборов) — тоже своя кнопка, первоначальный список её не видел
  ['PackBackBare', /<PackBackBare\b/],
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
    expect(baseline.files.length).toBeLessThanOrEqual(49); // потолок — только вниз (22.10: 80 → 49, Практика ×8, Настройки ×6, Итоги ×3, Диалоги ×4; — «Сегодня», теория, слова урока, Пик ×2, «Ошибки» ×3, хаб Сезона, настройка тренировки)
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
    // на Пике со «Сценой» видимые вкладки нарисованы в слое — сдвиг передаётся и туда (3·МАКЕТЫ 7961dde6a), иначе палец и рисунок разъедутся
    expect(community).toContain('tabsInset={backInset}');
  });

  it('подвиды вкладки открываются полноэкранно, «назад» внутри окна считает верх от экрана (координатор 22.10, вариант А)', () => {
    expect(button).toContain('export function ScreenOriginReset(');
    const all = read('components/spire/SpireAllMembers.tsx');
    expect(all).toContain('<Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onBack}');
    expect(all).toContain('<ScreenOriginReset>');
    expect(all).toContain('<ScreenBackButton screen="spire_all"');
    const step = read('components/spire/SpireStepScreen.tsx');
    expect(step).toContain('<ScreenOriginReset>');
    expect(step).toContain('<ScreenBackButton screen="spire_step"');
    // «Все участники» поверх Пика, а не вместо него — Пик под окном не размонтируется
    expect(read('components/spire/SpireHomeScreen.tsx')).toContain('{showAll && members ? <SpireAllMembers');
  });

  it('✕ «закрыть» — тот же компонент, та же точка и круг, знак ✕ контуром макета; системная «назад» = ✕ (владелец 22.10, вариант В)', () => {
    expect(button).toContain('export const ScreenCloseButton = memo(function ScreenCloseButton(props: Props)');
    expect(button).toContain('<ScreenBackButtonBase {...props} glyph="close" />');
    expect(button).toContain("BackHandler.addEventListener('hardwareBackPress', () => { handlePress(); return true; })");
    const kit = read('docs/design/v2-app/kit.js');
    const glyphs = read('components/v2/BackGlyph.tsx');
    const close = /export const CLOSE_GLYPH_PATH = '([^']+)'/.exec(glyphs)?.[1];
    expect(close).toBeTruthy();
    expect(kit).toContain(`close: '<path d="${close}"/>'`);
    expect(read('components/v2/BackButton.tsx')).toContain("{glyph === 'close' ? <CloseGlyph size={22} color={g.text} /> : <BackGlyph size={22} color={g.text} />}");
  });

  it('свой значок ✕ на экранах app/** — только в базе config/screen_close_baseline.json; база только уменьшается', () => {
    const baseline = JSON.parse(read('config/screen_close_baseline.json')) as { files: string[] };
    const allowed = new Set(baseline.files);
    const ownClose = /<Ionicons[^>]*name=["']close(-outline)?["']/;
    const own = walk('app').filter((rel) => !isDevOnly(rel) && ownClose.test(read(rel)));
    expect(own.filter((rel) => !allowed.has(rel))).toEqual([]);
    expect(baseline.files.filter((rel) => !own.includes(rel))).toEqual([]);
    expect(baseline.files.length).toBeLessThanOrEqual(18); // потолок 22.10 — только вниз
    // переведённые на общий ✕ экраны (22.10)
    for (const [rel, screen] of [
      ['app/settings_language.tsx', 'settings_language'],
      ['app/pack_opening.tsx', 'pack_opening'],
      ['app/learning_v2_session_intro.tsx', 'learning_v2_intro'],
      ['app/learning_v2_session_intro_check.tsx', 'learning_v2_intro_check'],
      ['app/friends_duel.tsx', 'friends_duel_play'],
      ['components/legal/LegalDocumentSheet.tsx', 'legal_document'],
    ] as const) expect([rel, read(rel).includes(`<ScreenCloseButton screen="${screen}"`)]).toEqual([rel, true]);
  });

  it('экраны, взявшие ScreenBackButton, не держат рядом свою кнопку «назад»', () => {
    const users = [...walk('app'), ...walk('components')].filter((rel) => !IMPLEMENTATION.has(rel) && /<ScreenBackButton\b/.test(read(rel)));
    const doubled = users.filter((rel) => OWN_BACK.some(([, re]) => re.test(read(rel))));
    expect(doubled).toEqual([]);
  });
});
