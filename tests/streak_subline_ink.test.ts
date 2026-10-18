// зачем (Темы 8117615b3, координатор 18.10): подзаголовок момента серии читается (≥ 4,5:1) на фоне и на ореоле во всех темах × оформлениях × ползунке;
// secondary остаётся там, где он проходит (иерархия макета), и сменяется основным текстом только там, где не проходит (grad_midnight, светлая, 1,0).
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { streakSublineInk, streakSublineWorstRatio } from '../components/streak/moments/streak_subline_ink';

const INTENSITIES = [0, 0.25, 0.5, 0.75, 1] as const;
type Tok = Readonly<{ text: string; secondary: string; bg: string; bgTop?: string; accentSoft?: string; isLight: boolean }>;
const tok = (id: string, appearance: 'dark' | 'light', intensity: number): Tok => liquidGlassTokens(id as never, { intensity, appearance } as never) as unknown as Tok;

describe('подзаголовок момента серии: secondary или text по контрасту к фону и ореолу', () => {
  it('во всех сочетаниях выбранный цвет ≥ 4,5:1', () => {
    const fails: string[] = [];
    let kept = 0;
    let total = 0;
    for (const id of LIQUID_GLASS_THEME_IDS) {
      for (const appearance of ['dark', 'light'] as const) {
        for (const intensity of INTENSITIES) {
          const t = tok(id, appearance, intensity);
          const ink = streakSublineInk(t);
          total += 1;
          if (ink === t.secondary) kept += 1;
          const r = streakSublineWorstRatio(ink, t);
          if (r < 4.5) fails.push(`${id}|${appearance}|${intensity}: ${r.toFixed(2)}`);
        }
      }
    }
    expect(fails).toEqual([]);
    // иерархия макета держится почти везде: основной текст — редкое исключение
    expect(kept / total).toBeGreaterThan(0.9);
  });

  it('grad_midnight, светлая, ползунок 1,0 — пара Тем: результат не ниже пола 4,3 и выше цели 4,5', () => {
    const t = tok('grad_midnight', 'light', 1);
    const r = streakSublineWorstRatio(streakSublineInk(t), t);
    expect(r).toBeGreaterThanOrEqual(4.3);
    expect(r).toBeGreaterThanOrEqual(4.5);
  });
});
