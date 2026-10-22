// зачем (координатор 14.10): текст на заливке accent в темах Liquid Glass обязан читаться. Старый correctText (#042010 из базы DARK)
// на accent давал контраст 1.01–4.5 (285 из 690 сочетаний), поэтому тема несёт accentInk, а экраны первого выпуска берут его.
import { readFileSync } from 'fs';
import { join } from 'path';
import { DARK } from '../constants/theme';
import { LIQUID_GLASS_THEME_IDS, makeLiquidGlassTheme } from '../constants/liquidGlassThemePalette';
import { LIQUID_GLASS_GRADIENT_THEME_IDS } from '../constants/liquidGlassGradientThemes';

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lum = (h: string) => {
  const [r, g, b] = rgb(h).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const ratio = (a: string, b: string) => {
  const x = lum(a); const y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

describe('текст на заливке accent в темах Liquid Glass', () => {
  it('accentInk темы читается на accent (≥ 4.5) на всех 23 темах, видах, уровнях и значениях ползунка', () => {
    const ids = [...new Set([...(LIQUID_GLASS_THEME_IDS as readonly string[]), ...(LIQUID_GLASS_GRADIENT_THEME_IDS as readonly string[])])];
    expect(ids.length).toBe(23);
    const bad: string[] = [];
    for (const id of ids) {
      for (const appearance of ['dark', 'light'] as const) {
        for (const level of ['calm', 'accent', 'max'] as const) {
          for (const intensity of [0, 0.25, 0.5, 0.75, 1]) {
            const theme = makeLiquidGlassTheme(id as any, DARK, { level, appearance, intensity } as any);
            expect(typeof theme.accentInk).toBe('string');
            const r = ratio(theme.accentInk as string, theme.accent);
            if (r < 4.5) bad.push(`${id}/${appearance}/${level}/${intensity}: ${r.toFixed(2)}`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('correctText — чернила на заливке correct ТЕКУЩЕЙ темы (закон владельца 22.10), а не #042010 из базы; читаются на ней ≥ 4,5', () => {
    const theme = makeLiquidGlassTheme('graphite' as any, DARK, { level: 'calm', appearance: 'dark', intensity: 0 } as any);
    expect(theme.correct).not.toBe(DARK.correct);
    const lin = (v: number) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
    const lum = (h: string) => { const [r, g, b] = rgb(h); return 0.2126 * lin(r!) + 0.7152 * lin(g!) + 0.0722 * lin(b!); };
    const ratio = (a: string, b: string) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
    expect(ratio(theme.correctText, theme.correct)).toBeGreaterThanOrEqual(4.5);
  });

  it('экраны первого выпуска красят текст на accent через accentInk', () => {
    const root = join(__dirname, '..');
    const read = (p: string) => readFileSync(join(root, p), 'utf8');
    expect(read('components/dialogs/DialogHowToSaySheet.tsx')).not.toMatch(/color=\{t\.correctText\}/);
    expect(read('components/dialogs/DialogHowToSaySheet.tsx')).toMatch(/t\.accentInk \?\? t\.correctText/);
    expect(read('components/flashcards/FlashcardsShelves.tsx')).toMatch(/t\.accentInk \?\? t\.correctText/);
    expect(read('components/ui/PrimaryButton.tsx')).toMatch(/t\.accentInk \?\? t\.correctText/);
  });
});
