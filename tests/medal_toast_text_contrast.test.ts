// зачем (4 · ТЕМЫ 25.10, docs/work/toast-contrast-2026-10-25.md): подпись ступени тоста медали — ТЕКСТ цветом бронзы/серебра/золота, и он
// не читался в 77 из 174 сочетаний (светлые 4,0, grad_full_olive тёмная 3,57); accentText без повышения — 4,42 в marine. Сторож: каждая
// подпись тоста (название, подпись под ним, подпись ступени с повышением и без) ≥ 4,5 на обоих краях карточки с текстурой во всех
// 29 темах × светлая/тёмная × Спокойно/Акцент/Максимум. Цвета ступеней Дизайна (tierAccents) при этом остаются прежними — для значка.
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { flattenOver } from '../constants/liquidGlassSurfaceRoles';
import { paletteContrast } from '../constants/liquidGlassPaletteRoles';
import { medalToastStyleFromTokens } from '../components/medalToastThemeStylesFromTokens';

const scaleRgba = (c: string, k: number): string => {
  const m = c.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/);
  if (!m) throw new Error(`ждали rgba(…): ${c}`);
  return `rgba(${m[1]},${m[2]},${m[3]},${Number(m[4]) * k})`;
};

describe('тост медали: подписи читаются во всех темах', () => {
  it('название, подпись, подпись ступени (с повышением и без) ≥ 4,5 на обоих краях карточки с текстурой', () => {
    const bad: string[] = [];
    let checked = 0;
    for (const appearance of ['dark', 'light'] as const) {
      for (const level of ['calm', 'accent', 'max'] as const) {
        for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
          const g = liquidGlassTokens(id as never, { level, appearance } as never);
          const m = medalToastStyleFromTokens(g);
          const labels = m.tierLabelColors;
          if (!labels) throw new Error('medalToastStyleFromTokens обязан отдавать tierLabelColors');
          const texts: Array<[string, string]> = [
            ['название', m.titleColor],
            ['подпись', m.subtitleColor],
            ['ступень без повышения', m.badgeDownColor],
            ['бронза', labels.bronze],
            ['серебро', labels.silver],
            ['золото', labels.gold],
          ];
          for (const edge of m.cardBgColors) {
            const surface = flattenOver(scaleRgba(m.textureColor, m.textureOpacity), edge);
            for (const [name, color] of texts) {
              checked++;
              const k = paletteContrast(color.slice(0, 7), surface.slice(0, 7));
              if (k < 4.5) bad.push(`${appearance}/${id}/${level} ${name} ${color} на ${surface}: ${k.toFixed(2)}`);
            }
          }
        }
      }
    }
    expect(checked).toBe(174 * 2 * 6);
    expect(bad).toEqual([]);
  });

  it('цвета ступеней Дизайна для значка не меняются — доводится только текст', () => {
    const light = medalToastStyleFromTokens(liquidGlassTokens('ink' as never, { level: 'calm', appearance: 'light' } as never));
    const dark = medalToastStyleFromTokens(liquidGlassTokens('ink' as never, { level: 'calm', appearance: 'dark' } as never));
    expect(light.tierAccents).toEqual({ bronze: '#8B6320', silver: '#52605A', gold: '#8B6320' });
    expect(dark.tierAccents).toEqual({ bronze: '#D99A5B', silver: '#72D8FF', gold: '#F2C44A' });
  });
});
