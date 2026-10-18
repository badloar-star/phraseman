import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from "../constants/liquidGlassThemePalette";

// зачем (разбор красных 18.10, Ревизор 3.81; ответ Тем): прежний контракт сверялся со списком SELECTABLE_THEME_MODES (девять тем), а он теперь только совместимость старого API
// (одно значение 'dark'); настоящий выбор — реестр Liquid Glass: все темы × оформление dark/light × насыщенность. Вступление занятия V2 красится палитрой useLv2Glass()
// (= liquidGlassTokens): текст — g.text на карточке g.opaqueCard, кнопка — g.ctaFillInk на g.ctaFill. Контракт проверяет именно это на ВСЕХ сочетаниях, светлое оформление включено.
// app/learning_v2_intro_theme.ts (introTargetTextColor/introCtaTextColor) нигде не вызывается — на старой функции контракт больше не стоит.
type Rgb = readonly [number, number, number];
const parse = (color: string): { rgb: Rgb; alpha: number } => {
  if (color.startsWith("rgba") || color.startsWith("rgb(")) {
    const parts = color.slice(color.indexOf("(") + 1, color.lastIndexOf(")")).split(",").map((x) => Number.parseFloat(x));
    return { rgb: [parts[0]!, parts[1]!, parts[2]!], alpha: parts[3] ?? 1 };
  }
  const hex = color.replace("#", "");
  const at = (i: number) => Number.parseInt(hex.slice(i, i + 2), 16);
  return { rgb: [at(0), at(2), at(4)], alpha: hex.length >= 8 ? at(6) / 255 : 1 };
};
const flatten = (top: string, under: string): Rgb => {
  const t = parse(top);
  const u = parse(under).rgb;
  return [0, 1, 2].map((i) => t.rgb[i]! * t.alpha + u[i]! * (1 - t.alpha)) as unknown as Rgb;
};
const luminance = (rgb: Rgb) => {
  const [r, g, b] = rgb.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: Rgb, b: Rgb) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

const APPEARANCES = ["dark", "light"] as const;
const INTENSITIES = [0, 0.5, 1] as const;

type Tokens = Record<string, string>;
const tokens = (id: string, appearance: (typeof APPEARANCES)[number], intensity: number): Tokens =>
  liquidGlassTokens(id, { appearance, intensity }) as unknown as Tokens;

describe("Learning V2 intro theme contract (реестр Liquid Glass)", () => {
  test("реестр не пуст", () => {
    expect(LIQUID_GLASS_THEME_IDS.length).toBeGreaterThan(1);
  });

  test("текст вступления (g.text) читается на карточке (g.opaqueCard) ≥ 4,5 во всех темах, оформлениях и насыщенностях", () => {
    const offenders: string[] = [];
    for (const id of LIQUID_GLASS_THEME_IDS) {
      for (const appearance of APPEARANCES) {
        for (const intensity of INTENSITIES) {
          const g = tokens(id, appearance, intensity);
          const card = flatten(g.opaqueCard!, "#000000");
          const ratio = contrast(flatten(g.text!, g.opaqueCard!), card);
          if (ratio < 4.5) offenders.push(`${id}/${appearance}/${intensity}: ${ratio.toFixed(2)}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  test("надпись кнопки (g.ctaFillInk) читается на заливке (g.ctaFill) ≥ 4,5 во всех темах, оформлениях и насыщенностях", () => {
    const offenders: string[] = [];
    for (const id of LIQUID_GLASS_THEME_IDS) {
      for (const appearance of APPEARANCES) {
        for (const intensity of INTENSITIES) {
          const g = tokens(id, appearance, intensity);
          const fill = flatten(g.ctaFill!, g.opaqueCard!);
          const ratio = contrast(flatten(g.ctaFillInk!, g.ctaFill!), fill);
          if (ratio < 4.5) offenders.push(`${id}/${appearance}/${intensity}: ${ratio.toFixed(2)}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
