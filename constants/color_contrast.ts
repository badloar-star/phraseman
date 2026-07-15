const DARK_BUTTON_TEXT = '#07110A' as const;
const LIGHT_BUTTON_TEXT = '#FFFFFF' as const;

function parseHexColor(value: string): [number, number, number] | null {
  const raw = value.trim().replace(/^#/, '');
  const hex = raw.length === 3
    ? raw.split('').map((part) => `${part}${part}`).join('')
    : raw;
  if (!/^[0-9a-f]{6}$/i.test(hex)) return null;
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ];
}

function relativeLuminance(color: [number, number, number]): number {
  const [r, g, b] = color.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });
  return (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
}

function contrastRatio(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function buttonForegroundForBackground(
  backgroundColor: string,
): typeof DARK_BUTTON_TEXT | typeof LIGHT_BUTTON_TEXT {
  const background = parseHexColor(backgroundColor);
  if (!background) return DARK_BUTTON_TEXT;

  const backgroundLuminance = relativeLuminance(background);
  const darkContrast = contrastRatio(backgroundLuminance, relativeLuminance([7, 17, 10]));
  const lightContrast = contrastRatio(backgroundLuminance, 1);
  return darkContrast >= lightContrast ? DARK_BUTTON_TEXT : LIGHT_BUTTON_TEXT;
}
