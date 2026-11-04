// зачем (слово владельца 29.10: «темы за достижения сломаны, там были свои уникальные сцены, и не надо было трогать»): у 6 тем за награды сцена Главной своя
// (premiumThemeVisualSpec, как на da0a435e3), с их PremiumThemeMotion и без общих звёзд неба; общее «Глубокое небо» — только обычным темам.
import fs from 'node:fs';
import path from 'node:path';

import { PREMIUM_THEME_IDS } from '../app/premium_theme_catalog';
import { premiumThemeVisualSpec } from '../constants/premiumThemeVisualSpecs';
import { homeSceneTokensForTheme } from '../components/home/v2/scene/home_scene_tokens';
import { isPremiumSceneTheme } from '../components/scene/scene_palette';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split('\r\n').join('\n');

describe('Темы за награды: своя сцена Главной', () => {
  it.each([...PREMIUM_THEME_IDS])('%s: isPremiumSceneTheme и цвет низа сцены = sceneBottom из спецификации темы', (id) => {
    expect(isPremiumSceneTheme(id)).toBe(true);
    const spec = premiumThemeVisualSpec(id)!;
    for (const appearance of ['dark', 'light'] as const) {
      const t = homeSceneTokensForTheme(id, appearance, false);
      expect(t.sceneBottom.toLowerCase()).toBe(spec.sceneBottom.toLowerCase());
    }
  });

  it('Главная: у премиум-тем фон — градиент токенов + свет края, без SceneBackdrop; PremiumThemeMotion на месте; токены не перезаписываются небом', () => {
    const stage = read('components/home/v2/scene/HomeSceneStage.tsx');
    expect(stage).toContain('{isPremium ? <LinearGradient colors={[tokens.sceneTop, tokens.sceneBottom]}');
    expect(stage).toContain(': <SceneBackdrop palette={scenePal} idPrefix="homeSc" active={active} />}');
    expect(stage).toContain('<PremiumThemeMotion themeId={liquidGlassThemeId}');
    expect(stage).toContain("console.log('[SCENE-SOURCE]'");
    expect(read('components/home/v2/scene/HomeScene.tsx')).toContain('if (isPremiumSceneTheme(liquidGlassThemeId)) return base;');
  });

  it('обычные темы остаются на общем небе', () => {
    expect(isPremiumSceneTheme('graphite')).toBe(false);
    expect(isPremiumSceneTheme('grad_aurora')).toBe(false);
  });
});
