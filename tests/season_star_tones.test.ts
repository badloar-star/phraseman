// зачем (координатор 22.10: звёзды оценки на карточках эпизодов — токены цвета в оттенках темы, заполненная/пустая): заполненная ≥ 4,5, пустая ≥ 3:1 на обоих концах градиента карточки
// в любой теме, оформлении, главе и эпизоде; заполненная заметно светлее пустой.
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { contrastRatio } from '../components/dialogs/scene/dialogs_scene_tokens';
import { hexHue, seasonThemedArt } from '../components/learning-v2/season/season_art';
import { seasonStarTones } from '../components/learning-v2/season/season_star_tones';

describe('Звёзды оценки на карточках: оттенки темы', () => {
  it('контраст на градиенте карточки во всех темах × оформлениях × главах × эпизодах', () => {
    const misses: string[] = [];
    for (const appearance of ['light', 'dark'] as const) {
      for (const id of LIQUID_GLASS_THEME_IDS) {
        const themeHue = hexHue(liquidGlassTokens(id, { level: 'max', appearance } as never).accent);
        const stars = seasonStarTones(themeHue);
        expect(seasonStarTones(themeHue)).toBe(stars);
        if (contrastRatio(stars.filled, stars.empty) < 1.15) misses.push(`${appearance}/${id}: заполненная и пустая почти не различаются`);
        for (let chapter = 1; chapter <= 7; chapter += 1) {
          for (let episode = 1; episode <= 6; episode += 1) {
            const art = seasonThemedArt(themeHue, chapter, episode, appearance);
            for (const stop of [art.from, art.to]) {
              if (contrastRatio(stars.filled, stop) < 4.5) misses.push(`${appearance}/${id} гл.${chapter} эп.${episode}: заполненная на ${stop} ${contrastRatio(stars.filled, stop).toFixed(2)}`);
              if (contrastRatio(stars.empty, stop) < 3) misses.push(`${appearance}/${id} гл.${chapter} эп.${episode}: пустая на ${stop} ${contrastRatio(stars.empty, stop).toFixed(2)}`);
            }
          }
        }
      }
    }
    expect(misses.slice(0, 10)).toEqual([]);
  });
});
