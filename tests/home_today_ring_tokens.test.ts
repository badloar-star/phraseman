// зачем (закон владельца 22.10: «ЦВЕТА СТРОГО ОТТЕНКИ ТЕКУЩЕЙ ТЕМЫ»; кольца «Сегодня» RC эталона #FF6B5B/#3DD6A3/#55A8FF красили мимо темы): три кольца — светлые оттенки акцента выбранной темы,
// ≥ 3:1 на верху и низу сцены, различимы между собой по светлоте; дорожка и отметка «выполнено» — тот же оттенок.
import { LIQUID_GLASS_THEME_IDS } from '../constants/liquidGlassThemePalette';
import { contrastRatio } from '../components/dialogs/scene/dialogs_scene_tokens';
import { homeSceneOklchOf, homeSceneTokensForTheme } from '../components/home/v2/scene/home_scene_tokens';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';

const GRAPHIC = 3;
const rgbOfHex = (h: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
const hueGap = (a: number, b: number): number => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

describe('Кольца «Сегодня»: оттенки текущей темы', () => {
  it('во всех темах и оформлениях: ≥ 3:1 на сцене, оттенок рядом с акцентом, кольца различимы по светлоте', () => {
    const misses: string[] = [];
    for (const appearance of ['light', 'dark'] as const) {
      for (const id of LIQUID_GLASS_THEME_IDS) {
        for (const evening of [false, true]) {
          const tok = homeSceneTokensForTheme(id, appearance, evening);
          const accentHex = liquidGlassTokens(id, { level: 'max', appearance } as never).accent;
          const accentHue = homeSceneOklchOf(rgbOfHex(accentHex))[2];
          const tag = `${appearance}/${id}${evening ? '/вечер' : ''}`;
          const lights: number[] = [];
          tok.todayRing.forEach((ring, i) => {
            for (const back of [tok.sceneTop, tok.sceneBottom]) {
              const ratio = contrastRatio(ring, back);
              if (ratio < GRAPHIC) misses.push(`${tag} · кольцо ${i + 1} на ${back}: ${ratio.toFixed(2)} < ${GRAPHIC}`);
            }
            const [L, C, H] = homeSceneOklchOf(rgbOfHex(ring));
            lights.push(L);
            // у почти бесцветных оттенков (серые темы) оттенок не определён — проверяем только заметно цветные
            if (C > 0.04 && hueGap(H, accentHue) > 40) misses.push(`${tag} · кольцо ${i + 1}: оттенок ${Math.round(H)}° против акцента ${Math.round(accentHue)}°`);
          });
          if (lights[0]! - lights[1]! < 0.05 || lights[1]! - lights[2]! < 0.05) misses.push(`${tag} · кольца неразличимы по светлоте: ${lights.map((l) => l.toFixed(2)).join('/')}`);
          if (tok.todayRingDone !== tok.todayRing[0]) misses.push(`${tag} · отметка не совпадает с первым кольцом`);
        }
      }
    }
    expect(misses.slice(0, 12)).toEqual([]);
  });
});
