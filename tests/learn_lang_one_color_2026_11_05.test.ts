// Решение владельца 05.11 («изучаемый язык одним цветом», макет target_lang_one_color_approved — «да так отлично»; «ИНТРО ТОЖЕ ДОЛЖНЫ БЫТЬ ОКРАШЕНЫ, НЕ ТОЛЬКО ТЕОРИЯ»):
// текст интерфейса и заголовки — обычным цветом, ВСЕ слова изучаемого языка — один жирный цвет lang, «Читается» — say курсивом, неправильный пример — серый ✗ без красного/зелёного.
import fs from 'node:fs';
import path from 'node:path';

jest.mock('react-native', () => ({
  Text: 'Text', View: 'View',
  StyleSheet: { create: (s: unknown) => s, flatten: (s: unknown) => s, absoluteFill: {}, hairlineWidth: 1 },
}));
jest.mock('../components/ThemeContext', () => ({ useTheme: () => ({ liquidGlassThemeId: 'graphite' }) }));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'ru' }) }));

import { isLatinSplitInterface, splitLangRuns, splitReadingLine } from '../components/learn_lang_text';

const read = (p: string): string => fs.readFileSync(path.join(__dirname, '..', p), 'utf8').replace(/\r\n/g, '\n');

describe('разбор строки: изучаемый язык отдельно от интерфейса', () => {
  it('латиница внутри абзаца — язык, хвостовые пробелы и знаки — обычным цветом', () => {
    const runs = splitLangRuns('Добавьте ed в конец. I walked home yesterday. — Я вчера шёл домой.');
    expect(runs.filter((r) => r.isLang).map((r) => r.text)).toEqual(['ed', 'I walked home yesterday']);
    expect(runs.map((r) => r.text).join('')).toBe('Добавьте ed в конец. I walked home yesterday. — Я вчера шёл домой.');
  });
  it('кириллица без латиницы — ничего не красится', () => {
    expect(splitLangRuns('Это значит: она позвонила.').every((r) => !r.isLang)).toBe(true);
  });
  it('делим по буквам только для RU/UK интерфейса; латинские интерфейсы — не делим (нельзя покрасить пояснение)', () => {
    expect(isLatinSplitInterface('ru')).toBe(true);
    expect(isLatinSplitInterface('uk')).toBe(true);
    for (const lang of ['en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']) expect(isLatinSplitInterface(lang)).toBe(false);
  });
  it('строка «Читается: …» делится на метку и тон say', () => {
    expect(splitReadingLine('Читается: ай уо́кт хо́ум')).toEqual({ label: 'Читается', rest: 'ай уо́кт хо́ум' });
    expect(splitReadingLine('Читається: ай уокт')).toEqual({ label: 'Читається', rest: 'ай уокт' });
    expect(splitReadingLine('Слово walked значит «шёл»')).toBeNull();
  });
});

describe('вступление и теория: подключение цвета языка', () => {
  const intro = read('app/lesson_intro_screens.tsx');
  const rich = read('components/lesson_intro_rich.tsx');
  const theory = read('components/theory/TheoryLessonView.tsx');
  const glass = read('components/lessons/LessonIntroGlass.tsx');

  it('вступление: роли из темы, примеры целиком lang, абзацы и строки — через роли; «Читается» только при данных', () => {
    expect(intro).toContain('useLearnLangPalette()');
    expect(intro).toContain('roles={langRoles}');
    expect(intro).toContain('allLang');
    expect(intro).toContain('introExampleEnStyle(glass, langRoles)');
    expect(intro).toContain('(ex as LessonIntroExample).reading?.');
    expect(intro).toContain('splitLatin ?');
    expect(glass).toContain('color: roles ? roles.lang : glass.text');
    expect(glass).toContain('reading?: React.ReactNode;');
  });
  it('вступление: красного и зелёного нет — wrong/correct без t.wrong/t.correct, у wrong серый ✗', () => {
    const view = rich.slice(rich.indexOf('export function RichIntroLineView'), rich.indexOf('export type IconName'));
    expect(view).not.toMatch(/t\.wrong|t\.correct/);
    expect(view).toContain('intro-wrong-mark');
    const tones = rich.slice(rich.indexOf('function neutralToneStyle'), rich.indexOf('export function RichTextParts'));
    expect(tones).toContain("resolved === 'success' || resolved === 'danger' || resolved === 'accent'");
  });
  it('теория: примеры lang, «Читается» say, ✗ серый вместо красного/зелёного и зачёркивания', () => {
    expect(theory).toContain('useLearnLangPalette()');
    expect(theory).toContain('color: langRoles.lang, fontWeight: LANG_WEIGHT');
    expect(theory).toContain('<ReadingLineSpans text={ex.reading}');
    expect(theory).toContain('theory-fix-mark');
    const fix = theory.slice(theory.indexOf("case 'fix'"), theory.indexOf("case 'drill'"));
    expect(fix).not.toMatch(/t\.wrong|t\.correct|line-through/);
  });
  it('заданий цвет не касается: drill без ролей языка', () => {
    const drill = theory.slice(theory.indexOf("case 'drill'"), theory.indexOf('default:'));
    expect(drill).not.toContain('langRoles');
  });
});
