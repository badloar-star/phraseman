// зачем (владелец 29.10: «с тенью как отдельный элемент», «никаких плавных переходов — реально видимый переход со скруглёнными краями», «с небом в тёмных темах, со светящимися звёздами»):
// сцена лежит в рамке с тенью (SceneBlockShadow), край не растворяется в фон, а звёзды тёмного неба мерцают на UI-треде и замирают при «Убрать анимации».
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split('\r\n').join('\n');

describe('Сцена: резкий край, тень блока, мерцающие звёзды', () => {
  it('рамка SceneBlockShadow несёт радиус 28 и заметную тень (boxShadow на обеих платформах, без elevation, фон нижнего тона)', () => {
    const src = read('components/scene/SceneBlockShadow.tsx');
    expect(src).toContain('export const SCENE_BOTTOM_RADIUS = 28;');
    expect(src).toMatch(/blurRadius: [0-9]+/);
    expect(src).not.toMatch(/elevation:/);
    expect(src).toContain('backgroundColor: tone');
    expect(Number(/rgba[(]0,0,0,([0-9.]+)[)]' : 'rgba[(]0,0,0,([0-9.]+)[)]'/.exec(src)![2])).toBeGreaterThanOrEqual(0.25);
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
    expect(tw).toContain('SCENE_TWINKLE_EVERY = 8');
    expect(tw).toContain('useReduceMotion');
    expect(tw).toContain('withRepeat');
    expect(tw).not.toMatch(/useState|setInterval|requestAnimationFrame/);
    expect(tw).toContain('animate={active && !reduce}');
    const bd = read('components/scene/SceneBackdrop.tsx');
    expect(bd).toContain('<SceneStarTwinkle stars={ALL_STARS(p.stars.list)} active={active} />');
    // зачем (координатор 04.11): статичные звёзды — группами Path; пропуск мерцающих (каждая N-я) теперь внутри groupStarsByAlpha
    expect(bd).toContain('groupStarsByAlpha(ALL_STARS(palette.stars.list), palette.size.W, palette.size.H, SCENE_TWINKLE_EVERY)');
    const home = read('components/home/v2/scene/HomeScene.tsx');
    expect(home).toContain('active={p.active}');
  });

  it('тёмное небо: звёзды по всей сцене (нижние добавлены), затемнение низа не рисуется', () => {
    const bd = read('components/scene/SceneBackdrop.tsx');
    expect(bd).toContain('SCENE_DARK_BOTTOM_GUARD = false');
    expect(bd).toContain('SCENE_DARK_BOTTOM_GUARD && p.guard.aBottom > 0');
    expect(bd).toContain('0.4 + rnd() * 0.58');
    expect(bd).toContain('i < 102');
  });

  it('6 тем за награды: у Главной фон свой (premiumThemeVisualSpec), без общего неба, PremiumThemeMotion на месте', () => {
    const stage = read('components/home/v2/scene/HomeSceneStage.tsx');
    expect(stage).toContain('isPremium ? <LinearGradient colors={[tokens.sceneTop, tokens.sceneBottom]}');
    expect(stage).toContain(': <SceneBackdrop palette={scenePal} idPrefix="homeSc" active={active} />');
    expect(stage).toContain('<PremiumThemeMotion themeId={liquidGlassThemeId}');
    expect(read('components/home/v2/scene/HomeScene.tsx')).toContain('if (isPremiumSceneTheme(liquidGlassThemeId)) return base;');
  });
});
