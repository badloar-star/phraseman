// зачем (владелец 11.11: ползунки «меняют резко цвет, когда входишь в зону следующей темы» → «да, убрать»): цвет вторичной кнопки на соседних шагах
// ползунков «Оттенок» и «Насыщенность» не прыгает. До правки выключатель тона в liquidGlassButtonTokens (fillLine) включался на пороге цветности и
// кнопка «Вернуть стандартный» прыгала на 16–31 уровень канала за один шаг (трассировка: tune:250 светлое, насыщенность 14 → 15 и 32 → 33).
jest.mock('../constants/theme_sliders_flag', () => ({ THEME_SLIDERS_V1_ENABLED: true }));

type Tokens = Readonly<Record<string, string>>;
type TokensFn = (id: string, variant: { appearance: 'dark' | 'light'; intensity: number }) => Tokens;

const channels = (hex: string): number[] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const jump = (a: string, b: string): number => Math.max(...channels(a).map((v, i) => Math.abs(v - channels(b)[i]!)));
/** Порог заметного рывка: до правки было 16–31 (кнопка), 30–48 (уровни), до 59 (заливка «Удалить»); плавный ход даёт не больше 7. */
const MAX_STEP = 7;
// зачем (владелец 11.11, второй шаг «да, убрать»): те же ступеньки были у плашек и чернил уровней A1–B2 (оттенок считался из почти серой поверхности)
// и у красной кнопки (отбор «красного оттенка» на тонированной шторке). Подпись красной кнопки идёт шагами подбора контраста — её порог мягче.
const KEYS: ReadonlyArray<readonly [string, number]> = [
  ['buttonFill', MAX_STEP], ['dangerFill', MAX_STEP], ['dangerInk', 12],
  ...(['A1', 'A2', 'B1', 'B2'] as const).flatMap((l) => [[`level${l}`, MAX_STEP], [`level${l}Bg`, MAX_STEP]] as const),
];

/** Нарушения: «роль @тема: скачок» для каждой роли, чей цвет между соседними шагами ползунка изменился сильнее её порога. */
function tooBig(tokens: TokensFn, ids: readonly string[], appearance: 'dark' | 'light'): string[] {
  const found: string[] = [];
  let prev = tokens(ids[0]!, { appearance, intensity: 0 });
  for (const id of ids.slice(1)) {
    const cur = tokens(id, { appearance, intensity: 0 });
    for (const [key, limit] of KEYS) {
      const d = jump(prev[key]!, cur[key]!);
      if (d > limit) found.push(`${key} @${id}: ${d}`);
    }
    prev = cur;
  }
  return found;
}

describe.each([[false, 'без материала «Аврора» (сборка для стора)'], [true, 'с материалом «Аврора»']])('ползунки: кнопки, красная кнопка и уровни без рывков — %s %s', (aurora) => {
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
        expect(tooBig(tokens, Array.from({ length: 101 }, (_, S) => `tune:${H}:${S}`), appearance)).toEqual([]);
      }
    });
    it(`${appearance}: по оттенку 0…359 на четырёх насыщенностях`, () => {
      for (const S of [20, 35, 70, 100]) {
        expect(tooBig(tokens, Array.from({ length: 360 }, (_, H) => `tune:${H}:${S}`), appearance)).toEqual([]);
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
    expect(palette).toContain('const sliderTune = parseThemeTuneId(themeId);');
    expect(palette).toContain('const isSliderTheme = sliderTune !== null;');
    expect((palette.match(/, isSliderTheme\)/g) ?? []).length).toBe(2);
    expect((palette.match(/intensity: variant\.intensity, \.\.\.sliderHue \}/g) ?? []).length).toBe(2);
    expect(buttons).toContain('for (const base of smooth ? [gray] : [t.opaqueSheet, gray]) {');
    const roles = read('constants/liquidGlassPaletteRoles.ts');
    expect(roles).toContain("const baseHue = typeof t.themeHue === 'number' && Number.isFinite(t.themeHue) ? t.themeHue : hueOfHex(t.opaqueControl);");
  });
});
