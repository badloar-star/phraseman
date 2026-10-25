// зачем (решение координатора п.69, 15.10): в светлых темах низ плашки «Тени» отличается по светлоте L* от каждого тона фона экрана минимум на 3.
import { liquidGlassTokens, LIQUID_GLASS_THEME_IDS } from '../constants/liquidGlassThemePalette';
import { isPremiumThemeId } from '../app/premium_theme_catalog';

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lin = (v: number) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const L = (h: string) => { const c = rgb(h); const y = 0.2126 * lin(c[0]!) + 0.7152 * lin(c[1]!) + 0.0722 * lin(c[2]!); return y > 0.008856 ? 116 * Math.cbrt(y) - 16 : 903.3 * y; };

describe('светлая тема: низ плашки отделён от фона', () => {
  it('ΔL* ≥ 3 до bgTop, bg и bgBottom во всех 23 темах на всех шагах ползунка', () => {
    const bad: string[] = [];
    // зачем (OWNER_DECISIONS 25.10 «тон поверхностей — вариант 2»: пигменты коллекции Codex — замок 24.10 + слово владельца 25.10 «как у Кодекса»): тон меряется на 23 обычных темах, премиум-темы — контрактом tests/premium_themes_contrast.test.ts; текст и графика — во всех 29
    for (const id of LIQUID_GLASS_THEME_IDS.filter((x) => !isPremiumThemeId(x))) for (const intensity of [0, 0.25, 0.5, 0.75, 1]) {
      const t = liquidGlassTokens(id, { intensity, appearance: 'light' } as never) as unknown as Record<string, string>;
      for (const bgName of ['bgTop', 'bg', 'bgBottom']) {
        const d = Math.abs(L(t.plateFillTo!) - L(t[bgName]!));
        if (d < 3 - 0.05) bad.push(`${id}@${intensity} plateFillTo→${bgName} ΔL*=${d.toFixed(2)}`);
      }
    }
    expect(bad).toEqual([]);
  });
  it('тёмное оформление не тронуто', () => {
    const t = liquidGlassTokens('graphite', { intensity: 0, appearance: 'dark' } as never) as unknown as Record<string, string>;
    expect(t.plateFillTo).toBe('#16171A');
  });
});
