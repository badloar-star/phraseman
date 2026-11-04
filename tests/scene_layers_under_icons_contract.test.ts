// зачем (слово владельца 29.10: «сцена не должна перекрашивать иконки на Главной — краска не должна ложиться на иконки, иконки поверх»): во всех сценах слои цвета
// (фон-палитра, свет, затемнение низа, тёплый край) рисуются РАНЬШЕ иконок/героя, а после героя в сцене нет ни одного слоя-заливки на весь блок. Журнал: [SCENE-LAYERS] (Главная).
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split('\r\n').join('\n');
const at = (src: string, needle: string): number => {
  const i = src.indexOf(needle);
  if (i < 0) throw new Error(`нет «${needle}»`);
  return i;
};

describe('Сцена: слои цвета лежат под контентом', () => {
  it('Главная: approved compact SceneBackdrop → текст; после текста нет заливок на весь блок', () => {
    const src = read('components/home/v2/scene/HomeSceneStage.tsx');
    const backdrop = at(src, '<SceneBackdrop palette={scenePal}');
    expect(src).not.toContain('sceneHalo'); // слово владельца 29.10: вокруг героя нет свечения
    const body = at(src, '<View style={s.body}>');
    expect(backdrop).toBeLessThan(body);
    expect(src).not.toMatch(/ThemedArtLayers|MaskedView|heroSpace/);
    expect(src.slice(body)).not.toMatch(/StyleSheet\.absoluteFill\b/);
    // затемнения низа / свечения-угольков поверх героя нет
    expect(src).not.toContain('sceneEmber');
    expect(src).not.toMatch(/tokens\.scrim \?/);
  });

  it('Диалоги: подложка и затемнение — до картинки героя', () => {
    const src = read('components/dialogs/scene/DialogsSceneStage.tsx');
    const backdrop = at(src, '<DialogsSceneBackdrop');
    const scrim = src.indexOf('c.scrim ?');
    const hero = at(src, '<ThemedArtLayers');
    expect(backdrop).toBeLessThan(hero);
    if (scrim >= 0) expect(scrim).toBeLessThan(hero);
  });

  it('Сезон: слой сцены — первый ребёнок обложки, до шапки и текста', () => {
    const src = read('components/learning-v2/season/SeasonCourseView.tsx');
    expect(at(src, '<SceneBackdropFill screen="season"')).toBeLessThan(at(src, 'style={[styles.heroTop'));
  });

  it('Пик: фон и звёзды — до башни', () => {
    const src = read('components/spire/scene/SpireScene.tsx');
    expect(at(src, '<SpireSceneBackdrop')).toBeLessThan(at(src, '<SpireTower'));
    expect(at(src, 'SCENE_STARS.map(')).toBeLessThan(at(src, '<SpireTower'));
  });

  it('журнал порядка слоёв называет слои цвета над иконками (должно быть пусто)', () => {
    const src = read('components/home/v2/scene/scene_theme_log.ts');
    expect(src).toContain('paintAboveIcons');
    expect(src).toContain("export const SCENE_LAYERS_LOG = '[SCENE-LAYERS]'");
  });
});
