// зачем (закон владельца 22.10 «ЦВЕТА ДОЛЖНЫ БЫТЬ СТРОГО ЦВЕТАМИ И ОТТЕНКАМИ ТЕКУЩЕЙ ТЕМЫ»; 4 · ТЕМЫ через координатора): искры фейерверка
// моментов Пика — оттенки текущей темы: пять разных цветов, в светлых темах видны на фоне. Не смысловые роли (золото, «хорошо», «инфо»)
// с одинаковым во всех темах тоном.
// ЗАМОК ВЛАДЕЛЬЦА 22.10: «искры = оттенок темы, без сдвига тона» — тон каждой искры равен тону акцента (допуск — округление до 8 бит);
// реестр docs/work/OWNER_LOCKS.md. Ослабить сторож — только по новому слову владельца.
import * as fs from 'fs';
import * as path from 'path';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { hueOfHex } from '../constants/liquidGlassPaletteRoles';
import { momentFireworkColors } from '../components/spire/moments/moment_firework_colors';

const lum = (hex: string): number => {
  const n = Number.parseInt(hex.slice(1, 7), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
};
const ratio = (a: string, b: string): number => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
};
const hueGap = (a: number, b: number): number => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

/** Округление OKLCH → #RRGGBB у бледных искр сдвигает измеренный тон на несколько градусов — это не «сдвиг тона» шага. */
const HUE_TOLERANCE = 12;

describe('momentFireworkColors', () => {
  it('ЗАМОК ВЛАДЕЛЬЦА: шаги искр без сдвига тона — у шага только светлота и насыщенность', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '..', 'components', 'spire', 'moments', 'moment_firework_colors.ts'), 'utf8');
    expect(src).toContain('ЗАМОК ВЛАДЕЛЬЦА 22.10: «искры = оттенок темы, без сдвига тона»');
    // тон в преобразование уходит как есть; насыщенность только уменьшается до границы охвата (тон не уезжает при обрезке)
    expect(src).toMatch(/oklchToHex\(lightness, gamutChroma\(lightness, chroma \* k, hue\), hue\)/);
    expect(src).not.toMatch(/hueShift|hue \+ shift/);
  });

  it('искры — тон акцента текущей темы без сдвига, пять разных цветов (все темы, светлое и тёмное, «Акцент» и «Максимум»)', () => {
    const bad: string[] = [];
    for (const appearance of ['dark', 'light'] as const) {
      for (const level of ['accent', 'max'] as const) {
        for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
          const g = liquidGlassTokens(id as never, { level, appearance } as never);
          const sparks = momentFireworkColors(g);
          if (new Set(sparks).size !== 5) bad.push(`${id} ${appearance}/${level}: искр ${new Set(sparks).size} из 5`);
          const accentHue = hueOfHex(g.accentGraphic);
          for (const spark of sparks) {
            expect(spark).toMatch(/^#[0-9A-F]{6}$/u);
            const gap = hueGap(hueOfHex(spark), accentHue);
            if (gap > HUE_TOLERANCE) bad.push(`${id} ${appearance}/${level}: ${spark} в ${gap.toFixed(1)}° от тона темы`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('в светлых темах искры видны на фоне темы (≥ 1,3:1), в тёмных — светлее фона', () => {
    const bad: string[] = [];
    for (const appearance of ['dark', 'light'] as const) {
      for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
        const g = liquidGlassTokens(id as never, { level: 'accent', appearance } as never);
        for (const spark of momentFireworkColors(g)) {
          const r = ratio(spark, g.bg.slice(0, 7));
          if (r < 1.3) bad.push(`${id} ${appearance}: ${spark} к фону ${r.toFixed(2)}`);
          if (appearance === 'dark' && lum(spark) <= lum(g.bg.slice(0, 7))) bad.push(`${id} dark: ${spark} не светлее фона`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('«Спокойно»: искры почти без насыщенности — серебристые в тон спокойной темы, но пять разных', () => {
    const g = liquidGlassTokens('graphite' as never, { level: 'calm', appearance: 'dark' } as never);
    const sparks = momentFireworkColors(g);
    expect(new Set(sparks).size).toBe(5);
    for (const spark of sparks) {
      const n = Number.parseInt(spark.slice(1), 16);
      const [r, gr, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      expect(Math.max(r, gr, b) - Math.min(r, gr, b)).toBeLessThan(40);
    }
  });
});
