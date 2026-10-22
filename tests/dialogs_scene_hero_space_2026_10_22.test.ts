// зачем (Сверка 22.10, dg_side_4_first.png): 3D-герой Диалогов заходил на заголовок. Герой теперь живёт в свободном месте между шапкой и текстом сцены:
// слот ограничен сверху шапкой, снизу — текстом (чистая раскладка, без замеров), картинка вписывается. Раскладку на экране мерит Сверка; здесь — контракт исходника.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'components/dialogs/scene/DialogsSceneStage.tsx'), 'utf8').replace(/\r\n/g, '\n');
const code = src.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('сцена Диалогов: герой не пересекает текстовую колонку', () => {
  it('герой лежит в слоте свободного места (flex: 1) между шапкой и текстом, а не от верха сцены', () => {
    expect(code).toContain('<View style={s.heroSpace}>');
    expect(code).toContain('heroSpace: { flex: 1 }');
    // слот героя стоит ДО текста сцены и ПОСЛЕ шапки
    expect(code.indexOf('<View style={s.heroSpace}>')).toBeGreaterThan(code.indexOf('<View style={[s.top, { paddingTop: p.topInset }]}>'));
    expect(code.indexOf('<View style={s.heroSpace}>')).toBeLessThan(code.indexOf('<View style={s.body}>'));
  });

  it('слот ограничен сверху и снизу и не выше HERO_H; картинка вписывается и прижата вправо', () => {
    expect(code).toMatch(/hero: \{ position: 'absolute', right: 10, top: 0, bottom: 4, width: HERO_W, maxHeight: HERO_H,/);
    expect(code).toMatch(/heroImage: \{ width: '100%', height: '100%' \}/);
    expect(code).toContain('contentFit="contain" contentPosition="right"');
  });

  it('прежнего слота «top: 96 от верха сцены» с фиксированной высотой нет', () => {
    expect(code).not.toMatch(/hero: \{[^}]*top: 96/);
    expect(code).not.toMatch(/heroImage: \{ width: HERO_W, height: HERO_H \}/);
  });
});
