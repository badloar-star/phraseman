// зачем (владелец 22.10 через координатора: «сцена Диалогов — новая высота 46 %, вариант 2 scenes-compact.html»; ранее Сверка 22.10, dg_side_4_first: герой заходил на заголовок):
// сцена — 46 % экрана вместе со строкой статуса, герой 160 × 160 справа −14 на 44 ниже шапки, текст в колонке слева (правый отступ 150), поэтому пересечения нет.
// Раскладку на экране мерит Сверка; здесь — контракт исходника.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'components/dialogs/scene/DialogsSceneStage.tsx'), 'utf8').replace(/\r\n/g, '\n');
const code = src.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('сцена Диалогов, вариант 2: высота 46 %, герой не пересекает текстовую колонку', () => {
  it('высота — 46 % экрана (392 из 844), панель наезжает на 22, скругление снизу 32', () => {
    expect(code).toContain('export const DIALOGS_SCENE_SCREEN_SHARE = 392 / 844;');
    expect(code).toContain('export const DIALOGS_SCENE_MIN_HEIGHT = 392;');
    expect(code).toContain('export const DIALOGS_SCENE_PANEL_OVERLAP = 22;');
    expect(code).toContain('const stageH = Math.round(windowH * DIALOGS_SCENE_SCREEN_SHARE);');
    expect(code).toMatch(/style=\{\[s\.stage, \{ minHeight: stageH \}\]\}/);
    expect(code).toMatch(/stage: \{ minHeight: DIALOGS_SCENE_MIN_HEIGHT, borderBottomLeftRadius: 32, borderBottomRightRadius: 32,/);
  });

  it('герой 160 × 160, справа −14, на 44 ниже шапки; пустой слот прижимает текст к низу', () => {
    expect(code).toContain('<View style={s.heroSpace} />');
    expect(code).toContain('heroSpace: { flex: 1 }');
    expect(code).toMatch(/hero: \{ position: 'absolute', right: -14, width: HERO, height: HERO,/);
    expect(code).toContain('top: p.topInset + HERO_BELOW_TOP');
    expect(code).toContain('const HERO = 160;');
    expect(code).toContain('const HERO_BELOW_TOP = 44;');
    expect(code).toMatch(/heroImage: \{ width: '100%', height: '100%' \}/);
    // слот стоит ПОСЛЕ шапки и ДО текста сцены
    expect(code.indexOf('<View style={s.heroSpace} />')).toBeGreaterThan(code.indexOf('<View style={[s.top, { paddingTop: p.topInset }]}>'));
    expect(code.indexOf('<View style={s.heroSpace} />')).toBeLessThan(code.indexOf('<View style={s.body}>'));
  });

  it('текст — колонка слева (right 150, bottom 44), заголовок 30/36 (длинный 26/32), прогресс 56 × 4, кнопка 50 по размеру содержимого', () => {
    expect(code).toContain('const TEXT_RIGHT = 150;');
    expect(code).toMatch(/body: \{ paddingLeft: 20, paddingRight: TEXT_RIGHT, paddingTop: 24, paddingBottom: 44 \}/);
    expect(code).toMatch(/title: \{ marginTop: 2, fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0\.5 \}/);
    expect(code).toMatch(/titleSmall: \{ marginTop: 2, fontSize: 26, lineHeight: 32,/);
    expect(code).toContain('const smallTitle = copy.small || copy.title.length > LONG_TITLE_CHARS;');
    expect(code).toMatch(/bar: \{ width: 56, height: 4,/);
    expect(code).toMatch(/cta: \{ minHeight: 50, paddingVertical: 8, borderRadius: 25, paddingHorizontal: 24,/);
    expect(code).toContain('outerStyle={s.ctaOuter}');
  });

  it('прежних размеров нет: сцена 520, наезд 38, слот героя 216 × 270', () => {
    expect(code).not.toMatch(/DIALOGS_SCENE_MIN_HEIGHT = 520/);
    expect(code).not.toMatch(/DIALOGS_SCENE_PANEL_OVERLAP = 38/);
    expect(code).not.toMatch(/HERO_W|HERO_H\b/);
  });
});
