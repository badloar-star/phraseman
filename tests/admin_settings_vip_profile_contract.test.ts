import fs from 'fs';
import path from 'path';

describe('admin settings VIP profile control', () => {
  const celebration = fs.readFileSync(path.join(process.cwd(), 'components', 'PremiumCelebrationModal.tsx'), 'utf8');
  const celebrationContent = fs.readFileSync(path.join(process.cwd(), 'components', 'premium_celebration', 'celebrationContent.ts'), 'utf8');
  const scenes = fs.readFileSync(path.join(process.cwd(), 'components', 'premium_celebration', 'celebrationScenes.ts'), 'utf8');
  const sceneViews = fs.readFileSync(path.join(process.cwd(), 'components', 'premium_celebration', 'CelebrationSceneViews.tsx'), 'utf8');

  it('keeps the celebration animated and readable on every tier palette', () => {
    // зачем (2026-08-24): хореография v6 «Золотая палата» — три акта вместо
    // ленты из 12 строк. Старые сторожи (litCount / scrollEnabled /
    // heroTextPlate) охраняли ОТМЕНЁННУЮ реализацию и переписаны под новую.
    expect(celebration).toContain('import Reanimated, {');
    // Три акта существуют и переключаются.
    expect(celebration).toContain("type Act = 'promo' | 'act1' | 'act2' | 'act3'");
    expect(celebration).toContain("setAct('act2')");
    expect(celebration).toContain("setAct('act3')");
    // Каждая сцена рисуется своим визуалом, а не строкой общего списка.
    expect(celebration).toContain('<CelebrationSceneView');
    expect(celebration).toContain('scenesForVariant(variant)');
    // Тап досматривает всё сразу, повторный — закрывает.
    expect(celebration).toContain('const jumpToEnd = useCallback');
    expect(celebration).toContain('onPress={handleTap}');
    // Цвета берутся из палитры тира, а не хардкодятся в сцене.
    expect(celebration).toContain('const palette = CELEBRATION_PALETTES[variant]');
    expect(celebration).toContain('color: palette.bright');
    expect(celebration).toContain('color: palette.ctaText');
    expect(celebration).toContain('testID={`${variant}-celebration-cta`}');
  });

  it('keeps exactly one climax and one haptic per scene', () => {
    // зачем: старая лента била hapticTap двенадцать раз подряд — на устройстве
    // это читалось как дребезг, а не как награда. Правило: один hapticSuccess
    // на удар акта 1, один hapticTap на смену сцены, один на финал.
    const tapCount = (celebration.match(/hapticTap\(\)/g) ?? []).length;
    expect(tapCount).toBe(1);
    expect(celebration).toContain('ACT1_STRIKE_MS');
    // Кульминация — единственная, на 900 мс (совпадает с картой ударов звука).
    expect(celebration).toContain('const ACT1_STRIKE_MS = 900');
  });

  it('degrades safely on reduce motion and low-end devices', () => {
    // Уменьшение движения → сразу финальный кадр, смысл не теряется.
    expect(celebration).toContain('const reduceMotion = useReducedMotion()');
    expect(celebration).toContain('if (reduceMotion) {');
    // Слабое устройство → сцены показывают финальный кадр без анимации.
    expect(celebration).toContain('isLowEndDevice');
    expect(celebration).toContain('const animateScenes = !reduceMotion && !lowEnd');
    expect(sceneViews).toContain('animate: boolean');
  });

  it('keeps VIP green and MAX blue palettes readable', () => {
    expect(celebrationContent).toContain("main: '#34D399'");
    expect(celebrationContent).toContain("bright: '#86EFAC'");
    expect(celebrationContent).toContain("rowText: '#EAFFF4'");
    expect(celebrationContent).toContain("ctaText: '#04140d'");
    // MAX говорит цветом орба из constants/motionHybrid, а не своим изобретением.
    expect(celebrationContent).toContain("main: '#8DBBFF'");
  });

  it('keeps Plus celebration benefits current and concise', () => {
    expect(scenes).toContain('Все уроки открыты');
    expect(scenes).toContain('AI-диалоги');
    expect(scenes).toContain('Голос с оценкой фразы');
    expect(scenes).toContain('Plus-темы и аура');

    // зачем: «Недельный обзор» и «Компас дня» рекламировали фичу, удалённую
    // вместе с app/compass/. Окно поздравления обещало покупателю то, чего в
    // приложении нет. Тест сторожит их ОТСУТСТВИЕ, чтобы строки не вернулись.
    expect(scenes).not.toContain('Недельный обзор');
    expect(scenes).not.toContain('Компас дня');

    expect(scenes).not.toContain('Тема Neon');
    expect(scenes).not.toContain('Золотое имя');
    expect(scenes).not.toContain('Второй язык');
    expect(scenes).not.toContain('Несколько языков');
    expect(scenes).not.toContain('Реферальные награды');
    expect(scenes).not.toContain('Дни доступа за друзей');
    expect(celebration).not.toContain('VIP_EXTRA_FEATURE');

    // зачем: владелец убрал «Повторы без жемчужин» (2026-08-24) — сцена и её
    // звук удалены целиком, строка не должна вернуться копипастом.
    expect(scenes).not.toContain('Повторы без жемчужин');

    // Список сцен намеренно короткий: на празднике читают обещание, не каталог.
    const sceneCount = (scenes.match(/^    id: '/gm) ?? []).length;
    expect(sceneCount).toBeLessThanOrEqual(12);
  });
});
