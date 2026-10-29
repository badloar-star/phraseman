// зачем (находка Сверки 29.10 через координатора): в светлых Диалогах у grad_* были чёрные пятна в сцене — bgGlow = #00000000, слой свечения
// ставил этот цвет со stopOpacity=1. Свет светлых grad_* строится из accentGlow; полностью прозрачный слой не рисуется вовсе.
import fs from 'node:fs';
import path from 'node:path';

import { LIQUID_GLASS_THEME_IDS } from '../constants/liquidGlassThemePalette';
import { dialogsSceneColors, dialogsSceneTokensForTheme, isClearColor } from '../components/dialogs/scene/dialogs_scene_tokens';
import { relativeLuminance } from '../components/home/v2/scene/home_scene_tokens';

const GRAD_IDS = LIQUID_GLASS_THEME_IDS.filter((id) => id.startsWith('grad_'));
/** Порог яркости основы светлой сцены (самый тёмный светлый grad_ сейчас ≈ 0,65 у titanium/horizon, остальные ≥ 0,68). */
const MIN_LIGHT_BASE_LUMINANCE = 0.6;

describe('светлые Диалоги × grad_*: нет слоёв из прозрачного чёрного', () => {
  it('isClearColor ловит все формы полностью прозрачного цвета', () => {
    for (const c of ['#00000000', '#fff0', 'transparent', 'rgba(0,0,0,0)', 'rgba(12, 5, 9, 0)', '', null]) expect(isClearColor(c as string | null)).toBe(true);
    for (const c of ['#7EF0C866', '#000000', '#C2D3E6B3', 'rgba(0,0,0,0.4)']) expect(isClearColor(c)).toBe(false);
  });

  it.each(GRAD_IDS)('%s light: слои света не прозрачны, основа не темнее порога', (id) => {
    const c = dialogsSceneColors(dialogsSceneTokensForTheme(id, 'light'));
    expect(isClearColor(c.glowRight)).toBe(false);
    expect(isClearColor(c.glowLeft)).toBe(false);
    expect(c.glowBottom !== null && isClearColor(c.glowBottom)).toBe(false);
    expect(relativeLuminance(c.top) ?? 0).toBeGreaterThanOrEqual(MIN_LIGHT_BASE_LUMINANCE);
    expect(relativeLuminance(c.textZone) ?? 0).toBeGreaterThanOrEqual(MIN_LIGHT_BASE_LUMINANCE);
  });

  it('подложка не рисует полностью прозрачные слои', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'components', 'dialogs', 'scene', 'DialogsSceneBackdrop.tsx'), 'utf8');
    expect(src).toContain('isClearColor(c.glowRight)');
    expect(src).toContain('isClearColor(c.glowLeft)');
    expect(src).toContain('isClearColor(c.glowBottom)');
  });
});
