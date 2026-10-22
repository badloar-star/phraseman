// зачем (координатор 22.10; разбор цветов 4 · ТЕМЫ 5a4f9d8f0, строка «панель «Сегодня» на Главной»): галочки выполненных заданий в
// панели «Сегодня» на Главной со «Сценой» — цвета их колец на карточке (todayRingsOnCard), как на экране «Сегодня»; контраст к плашке
// не ниже 3:1 во всех темах, оформлениях и уровнях ползунка. Остальное в панели не меняется.
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { LIQUID_GLASS_COLOR_LEVELS } from '../constants/liquidGlassThemeVariants';
import { contrastRatio } from '../components/dialogs/scene/dialogs_scene_tokens';
import { homeSceneTokensForTheme } from '../components/home/v2/scene/home_scene_tokens';
import { todayRingsOnCard } from '../components/home/v2/today_scene/today_scene_ring_look';
import { readSource } from './helpers/read_source';

describe('панель «Сегодня» на Главной: галочки — цвета колец', () => {
  it('со «Сценой» галочка задания — цвет его кольца на карточке; свои doneColors и запасной g.good — как прежде', () => {
    const src = readSource('components/home/v2/HomeV2TodayCard.tsx');
    expect(src).toContain('const sceneTicks = useMemo(() => todayRingsOnCard(homeSceneTokensForTheme(liquidGlassThemeId, liquidGlassAppearance).todayRing, g), [liquidGlassThemeId, liquidGlassAppearance, g]);');
    expect(src).toContain('const doneColor = doneColors?.[index] ?? sceneTicks[index] ?? g.good;');
    expect(src).toContain('const doneColor = doneColors?.[index] ?? p.iconTint;');
  });

  it('контраст галочки к плашке панели ≥ 3:1 — все темы × оформления × уровни ползунка', () => {
    const weak: string[] = [];
    for (const id of LIQUID_GLASS_THEME_IDS) {
      for (const appearance of ['dark', 'light'] as const) {
        const rings = homeSceneTokensForTheme(id, appearance).todayRing;
        for (const level of LIQUID_GLASS_COLOR_LEVELS) {
          const g = liquidGlassTokens(id, { level, appearance });
          todayRingsOnCard(rings, g).forEach((tick, i) => {
            const ratio = contrastRatio(tick, g.opaqueCard);
            if (ratio < 3) weak.push(`${id}/${appearance}/${level} кольцо ${i + 1}: ${ratio.toFixed(2)}`);
          });
        }
      }
    }
    expect(weak).toEqual([]);
  });
});
