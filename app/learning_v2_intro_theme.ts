import type { Theme, ThemeMode } from "../constants/theme";

const HEX_COLOR = /^#[0-9a-f]{6}$/iu;

function relativeLuminance(color: string): number {
  if (!HEX_COLOR.test(color)) return 0;
  const channel = (offset: number) => {
    const value = Number.parseInt(color.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

export function introTextContrastRatio(a: string, b: string): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (left, right) => right - left,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

export function introTargetTextColor(
  theme: Theme,
  _themeMode: ThemeMode,
): string {
  const contrastOnReaderSurfaces = (color: string) =>
    Math.min(
      introTextContrastRatio(color, theme.bgCard),
      introTextContrastRatio(color, theme.bgPrimary),
    );
  if (
    theme.accent !== theme.textOnCard &&
    contrastOnReaderSurfaces(theme.accent) >= 4.5
  ) {
    return theme.accent;
  }
  const fallback = [theme.textPrimary, theme.correct, theme.gold]
    .filter((candidate) => candidate !== theme.textOnCard)
    .sort(
      (left, right) =>
        contrastOnReaderSurfaces(right) - contrastOnReaderSurfaces(left),
    )[0];
  return fallback ?? theme.accent;
}

export function introCtaTextColor(theme: Theme): string {
  return theme.correctText;
}

