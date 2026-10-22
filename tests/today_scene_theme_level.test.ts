// зачем (владелец 22.10 «Сцена всегда как в макете»; координатор): «Сегодня» красится токенами темы уровня «Максимум» (homeSceneTokensForTheme) при ЛЮБОМ
// положении ползунка насыщенности — «Спокойно», «Акцент», «Максимум». Тест ставит три положения и требует одинаковые цвета сцены; плюс сторож исходника.
import { LIQUID_GLASS_THEME_IDS, getActiveLiquidGlassVariant, setActiveLiquidGlassVariant } from '../constants/liquidGlassThemePalette';
import { homeSceneTokensForTheme } from '../components/home/v2/scene/home_scene_tokens';
import { readSource } from './helpers/read_source';

const LEVELS = [0, 0.5, 1] as const; // «Спокойно», «Акцент», «Максимум»
const THEMES = LIQUID_GLASS_THEME_IDS.slice(0, 6);

describe('«Сегодня»: цвета сцены не зависят от ползунка насыщенности', () => {
  const before = getActiveLiquidGlassVariant();
  afterAll(() => setActiveLiquidGlassVariant(before));

  it.each(THEMES)('%s: одинаковые токены сцены на трёх положениях ползунка, тёмное и светлое оформление, день и вечер', (themeId) => {
    for (const appearance of ['dark', 'light'] as const) {
      for (const evening of [false, true]) {
        const seen = LEVELS.map((intensity) => {
          setActiveLiquidGlassVariant({ intensity, appearance });
          return JSON.stringify(homeSceneTokensForTheme(themeId, appearance, evening));
        });
        expect(new Set(seen).size).toBe(1);
      }
    }
  });

  it('белый текст на сцене ≥ 4,5:1 в обоих оформлениях', () => {
    for (const themeId of THEMES) {
      for (const appearance of ['dark', 'light'] as const) {
        expect(homeSceneTokensForTheme(themeId, appearance).whiteContrastTop).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('экран берёт цвета только из homeSceneTokensForTheme, старая homeSceneTokens(accent) не используется', () => {
    const code = readSource('components/home/v2/today_scene/TodaySceneView.tsx').split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    expect(code).toContain('homeSceneTokensForTheme(liquidGlassThemeId, liquidGlassAppearance, evening)');
    expect(code).not.toMatch(/homeSceneTokens\(/);
    expect(code).toContain('tokens.eveningGlow');
    expect(code).toContain('tokens.scrim');
  });
});
