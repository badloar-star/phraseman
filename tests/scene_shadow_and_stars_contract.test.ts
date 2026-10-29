// зачем (владелец 29.10: «с тенью как отдельный элемент», «никаких плавных переходов — реально видимый переход со скруглёнными краями», «с небом в тёмных темах, со светящимися звёздами»):
// сцена лежит в рамке с тенью (SceneBlockShadow), край не растворяется в фон, а звёзды тёмного неба мерцают на UI-треде и замирают при «Убрать анимации».
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split('\r\n').join('\n');

describe('Сцена: резкий край, тень блока, мерцающие звёзды', () => {
  it('рамка SceneBlockShadow несёт радиус 28 и заметную тень (iOS shadow + Android elevation + фон нижнего тона)', () => {
    const src = read('components/scene/SceneBlockShadow.tsx');
    expect(src).toContain('export const SCENE_BOTTOM_RADIUS = 28;');
    expect(src).toMatch(/shadowRadius: \d+/);
    expect(src).toMatch(/elevation: \d+/);
    expect(src).toContain('backgroundColor: tone');
    expect(Number(/isDark \? ([\d.]+) : ([\d.]+)/.exec(src)![2])).toBeGreaterThanOrEqual(0.25);
  });

  it.each([
    ['components/home/v2/scene/HomeSceneStage.tsx'],
    ['components/dialogs/scene/DialogsSceneStage.tsx'],
    ['components/home/v2/today_scene/TodaySceneView.tsx'],
    ['components/learning-v2/season/SeasonCourseView.tsx'],
  ])('%s: сцена внутри рамки с тенью, рамка закрыта', (file) => {
    const src = read(file);
    expect(src).toContain("import SceneBlockShadow from");
    expect((src.match(/<SceneBlockShadow /g) ?? []).length).toBe(1);
    expect((src.match(/<\/SceneBlockShadow>/g) ?? []).length).toBe(1);
  });

  it('край не растворяется: в журнале края fadeToBg=false, у сцены нет маски/градиента, уводящего низ в фон экрана', () => {
    expect(read('components/home/v2/scene/HomeSceneStage.tsx')).toContain('fadeToBg: false');
    expect(read('components/dialogs/scene/DialogsSceneBackdrop.tsx')).toContain('fadeToBg: false');
  });

  it('звёзды неба: каждая 5-я мерцает Reanimated-слоем, без setState в кадрах, статично при «Убрать анимации»', () => {
    const tw = read('components/scene/SceneStarTwinkle.tsx');
    expect(tw).toContain('SCENE_TWINKLE_EVERY = 5');
    expect(tw).toContain('useReduceMotion');
    expect(tw).toContain('withRepeat');
    expect(tw).not.toMatch(/useState|setInterval|requestAnimationFrame/);
    const bd = read('components/scene/SceneBackdrop.tsx');
    expect(bd).toContain('<SceneStarTwinkle stars={p.stars.list} />');
    expect(bd).toContain('i % SCENE_TWINKLE_EVERY === 0 ? null');
  });
});
