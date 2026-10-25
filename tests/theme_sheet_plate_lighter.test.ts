// зачем (cards-v2-017/020, поручение координатора 15.10): плитки на шторках в тёмном оформлении светлее самой шторки (блик «Тени» виден), текст на них читается.
import { liquidGlassTokens, LIQUID_GLASS_THEME_IDS } from '../constants/liquidGlassThemePalette';
import { isPremiumThemeId } from '../app/premium_theme_catalog';
import { sheetPlateTokens } from '../components/v2/ShadowSurface';

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lin = (v: number) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (h: string) => { const c = rgb(h); return 0.2126 * lin(c[0]!) + 0.7152 * lin(c[1]!) + 0.0722 * lin(c[2]!); };
const L = (h: string) => { const y = lum(h); return y > 0.008856 ? 116 * Math.cbrt(y) - 16 : 903.3 * y; };
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };

describe('плитки на шторках', () => {
  it('тёмное: верх и низ плитки светлее шторки (≥ 2 L* вверху), текст ≥ 4,5 на обоих тонах — все темы и шаги ползунка', () => {
    const bad: string[] = [];
    for (const id of LIQUID_GLASS_THEME_IDS) for (const intensity of [0, 0.25, 0.5, 0.75, 1]) {
      const t = liquidGlassTokens(id, { intensity, appearance: 'dark' } as never) as unknown as Record<string, string>;
      const at = `${id}@${intensity}`;
      // зачем (OWNER_DECISIONS 25.10 «тон поверхностей — вариант 2»: пигменты коллекции Codex — замок 24.10 + слово владельца 25.10 «как у Кодекса»): тон меряется на 23 обычных темах, премиум-темы — контрактом tests/premium_themes_contrast.test.ts; текст и графика — во всех 29
      if (!isPremiumThemeId(id) && L(t.sheetPlateFillFrom!) - L(t.opaqueSheet!) < 2) bad.push(`${at} верх плитки не светлее шторки`);
      if (!isPremiumThemeId(id) && L(t.sheetPlateFillTo!) - L(t.opaqueSheet!) < 0.5) bad.push(`${at} низ плитки не светлее шторки`);
      for (const text of ['text', 'secondary', 'mutedText']) for (const fill of ['sheetPlateFillFrom', 'sheetPlateFillTo']) {
        if (ratio(t[text]!, t[fill]!) < 4.5) bad.push(`${at} ${text} на ${fill} ${ratio(t[text]!, t[fill]!).toFixed(2)}`);
      }
    }
    expect(bad).toEqual([]);
  });
  it('светлое: плитка шторки = обычная плашка (верх), низ отделён от фона', () => {
    // зачем (OWNER_DECISIONS 25.10 «тон поверхностей — вариант 2»: пигменты коллекции Codex — замок 24.10 + слово владельца 25.10 «как у Кодекса»): тон меряется на 23 обычных темах, премиум-темы — контрактом tests/premium_themes_contrast.test.ts; текст и графика — во всех 29
    for (const id of LIQUID_GLASS_THEME_IDS.filter((x) => !isPremiumThemeId(x))) {
      const t = liquidGlassTokens(id, { intensity: 0, appearance: 'light' } as never) as unknown as Record<string, string>;
      expect(t.sheetPlateFillFrom).toBe(t.plateFillFrom);
      expect(t.sheetPlateFillTo).toBe(t.plateFillTo);
    }
  });
  it('sheetPlateTokens подменяет только градиент плашки и кэшируется', () => {
    const g = liquidGlassTokens('graphite', { intensity: 0, appearance: 'dark' } as never);
    const s = sheetPlateTokens(g);
    expect(s.plateFillFrom).toBe(g.sheetPlateFillFrom);
    expect(s.plateFillTo).toBe(g.sheetPlateFillTo);
    expect(s.text).toBe(g.text);
    expect(sheetPlateTokens(g)).toBe(s);
  });
});
