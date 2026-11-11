// зачем (владелец 11.11: ползунки «меняют резко цвет, когда входишь в зону следующей темы» → «да, убрать»): цвет вторичной кнопки на соседних шагах
// ползунков «Оттенок» и «Насыщенность» не прыгает. До правки выключатель тона в liquidGlassButtonTokens (fillLine) включался на пороге цветности и
// кнопка «Вернуть стандартный» прыгала на 16–31 уровень канала за один шаг (трассировка: tune:250 светлое, насыщенность 14 → 15 и 32 → 33).
jest.mock('../constants/theme_sliders_flag', () => ({ THEME_SLIDERS_V1_ENABLED: true }));

type Tokens = Readonly<{ buttonFill: string }>;
type TokensFn = (id: string, variant: { appearance: 'dark' | 'light'; intensity: number }) => Tokens;

const channels = (hex: string): number[] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const jump = (a: string, b: string): number => Math.max(...channels(a).map((v, i) => Math.abs(v - channels(b)[i]!)));
/** Порог заметного рывка: до правки было 16–31, плавный ход даёт не больше 4. */
const MAX_STEP = 7;

function worstJump(tokens: TokensFn, ids: readonly string[], appearance: 'dark' | 'light'): { max: number; at: string } {
  let worst = { max: 0, at: '' };
  let prev = tokens(ids[0]!, { appearance, intensity: 0 }).buttonFill;
  for (const id of ids.slice(1)) {
    const cur = tokens(id, { appearance, intensity: 0 }).buttonFill;
    const d = jump(prev, cur);
    if (d > worst.max) worst = { max: d, at: id };
    prev = cur;
  }
  return worst;
}

describe.each([[false, 'без материала «Аврора» (сборка для стора)'], [true, 'с материалом «Аврора»']])('ползунки: цвет вторичной кнопки без рывков — %s %s', (aurora) => {
  let tokens: TokensFn;
  beforeAll(() => {
    jest.resetModules();
    jest.doMock('../constants/aurora_material_flag', () => ({ AURORA_MATERIAL_ENABLED: aurora }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    tokens = (require('../constants/liquidGlassThemePalette') as { liquidGlassTokens: TokensFn }).liquidGlassTokens;
  });
  for (const appearance of ['dark', 'light'] as const) {
    it(`${appearance}: по насыщенности 0…100 на четырёх оттенках`, () => {
      for (const H of [30, 150, 250, 330]) {
        const worst = worstJump(tokens, Array.from({ length: 101 }, (_, S) => `tune:${H}:${S}`), appearance);
        expect({ H, ...worst, ok: worst.max <= MAX_STEP }).toEqual({ H, ...worst, ok: true });
      }
    });
    it(`${appearance}: по оттенку 0…359 на четырёх насыщенностях`, () => {
      for (const S of [20, 35, 70, 100]) {
        const worst = worstJump(tokens, Array.from({ length: 360 }, (_, H) => `tune:${H}:${S}`), appearance);
        expect({ S, ...worst, ok: worst.max <= MAX_STEP }).toEqual({ S, ...worst, ok: true });
      }
    });
  }
});

describe('именные темы: выключатель тона кнопок работает как раньше', () => {
  it('тема-ползунок считается без тона, именная — с прежней логикой (исходник)', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('node:fs') as typeof import('node:fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('node:path') as typeof import('node:path');
    const read = (p: string): string => fs.readFileSync(path.join(__dirname, '..', p), 'utf8').replace(/\r\n/g, '\n');
    const buttons = read('constants/liquidGlassButtonTokens.ts');
    expect(buttons).toContain('const tone = allowTone && chroma(t.opaqueControl) < NEUTRAL_CHROMA_MAX && chroma(t.cta) >= ACCENT_CHROMA_MIN;');
    expect(buttons).toContain('export function deriveLiquidGlassButtonRoles(t: Surfaces, smoothForSliders = false): LiquidGlassButtonRoles {');
    const palette = read('constants/liquidGlassThemePalette.ts');
    expect(palette).toContain('const isSliderTheme = parseThemeTuneId(themeId) !== null;');
    expect((palette.match(/, isSliderTheme\)/g) ?? []).length).toBe(2);
  });
});
