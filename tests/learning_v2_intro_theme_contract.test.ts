import {
  AURORA,
  DARK,
  EMBER,
  GOLD,
  INDIGO,
  MIDNIGHT,
  OLIVE,
  SAGE_PORCELAIN,
  VOLT,
  type Theme,
} from "../constants/theme";
import { SELECTABLE_THEME_MODES } from "../app/theme_access_policy";
import {
  introCtaTextColor,
  introTargetTextColor,
} from "../app/learning_v2_intro_theme";

const themes = {
  indigo: INDIGO,
  sagePorcelain: SAGE_PORCELAIN,
  olive: OLIVE,
  midnight: MIDNIGHT,
  ember: EMBER,
  aurora: AURORA,
  volt: VOLT,
  dark: DARK,
  gold: GOLD,
} as const satisfies Record<(typeof SELECTABLE_THEME_MODES)[number], Theme>;

const channel = (hex: string, offset: number) =>
  Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
const linear = (value: number) =>
  value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
const luminance = (hex: string) =>
  0.2126 * linear(channel(hex, 1)) +
  0.7152 * linear(channel(hex, 3)) +
  0.0722 * linear(channel(hex, 5));
const contrast = (a: string, b: string) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};

describe("Learning V2 intro theme contract", () => {
  test("covers exactly all nine selectable application themes", () => {
    expect(Object.keys(themes)).toEqual([...SELECTABLE_THEME_MODES]);
  });

  test.each(SELECTABLE_THEME_MODES)(
    "%s gives target text a distinct AA color and uses the theme CTA foreground",
    (themeMode) => {
      const theme = themes[themeMode];
      const target = introTargetTextColor(theme, themeMode);
      expect(target).not.toBe(theme.textOnCard);
      expect(contrast(target, theme.bgCard)).toBeGreaterThanOrEqual(4.5);
      expect(introCtaTextColor(theme)).toBe(theme.correctText);
    },
  );
});
