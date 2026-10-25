// зачем (перепись цветов docs/work/color-literal-census-2026-10-25.md, Темы 25.10): экран «Аккаунт заблокирован» в app/_layout.tsx
// красился постоянными тёмными цветами (#06141B, #121826, #9ca3af, #1f2937, белый) мимо темы. Теперь фон, карточка, текст и кнопка — токены.
// Сторож: литералов нет, а заголовок/пояснение/кнопка читаются (≥ 4,5) во всех 29 темах × светлая/тёмная × Спокойно/Акцент/Максимум.
import { readFileSync } from 'fs';
import { join } from 'path';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { flattenOver } from '../constants/liquidGlassSurfaceRoles';
import { paletteContrast } from '../constants/liquidGlassPaletteRoles';

describe('экран блокировки аккаунта на токенах темы (25.10)', () => {
  it('в блоке экрана нет литералов цвета', () => {
    const src = readFileSync(join(__dirname, '..', 'app/_layout.tsx'), 'utf8');
    const start = src.indexOf('{ready && isBanned && (');
    const block = src.slice(start, src.indexOf('<OfflineBanner', start));
    expect(start).toBeGreaterThan(0);
    expect(block).toContain('liquidGlassTokens(liquidGlassThemeId).opaqueCard');
    expect(block).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
  });

  it('текст читается на карточке и кнопке во всех 174 сочетаниях', () => {
    const bad: string[] = [];
    let n = 0;
    for (const appearance of ['dark', 'light'] as const) for (const level of ['calm', 'accent', 'max'] as const) for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
      const g = liquidGlassTokens(id as never, { level, appearance } as never);
      n++;
      const card = flattenOver(g.opaqueCard, g.bg);
      const control = flattenOver(g.opaqueControl, card);
      const pairs: Array<[string, string, string]> = [['text', g.text, card], ['secondary', g.secondary, card], ['button', g.text, control]];
      for (const [name, ink, surface] of pairs) {
        const k = paletteContrast(ink.slice(0, 7), surface.slice(0, 7));
        if (k < 4.5) bad.push(`${appearance}/${id}/${level} ${name}: ${k.toFixed(2)}`);
      }
    }
    expect(n).toBe(174);
    expect(bad).toEqual([]);
  });
});
