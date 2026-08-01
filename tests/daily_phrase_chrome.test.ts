import {
  DAILY_PHRASE_CHROME,
  dailyPhraseChromeFor,
} from '../app/daily_phrase_chrome';
import type { ThemeMode } from '../constants/theme';

const THEME_MODES: ThemeMode[] = [
  'dark',
  'gold',
  'coral',
  'minimalDark',
  'business',
  'businessLight',
  'sagePorcelain',
  'midnight',
  'ember',
  'aurora',
  'volt',
  'candyBlue',
  'indigo',
];

function rgbFromHex(color: string): [number, number, number] {
  expect(color).toMatch(/^#[0-9A-F]{6}$/i);

  return [
    parseInt(color.slice(1, 3), 16),
    parseInt(color.slice(3, 5), 16),
    parseInt(color.slice(5, 7), 16),
  ];
}

function relativeLuminance(color: string): number {
  const channels = rgbFromHex(color).map(channel => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(first: string, second: string): number {
  const [lighter, darker] = [relativeLuminance(first), relativeLuminance(second)].sort(
    (a, b) => b - a,
  );

  return (lighter + 0.05) / (darker + 0.05);
}

describe('Daily Phrase action chrome', () => {
  it.each(THEME_MODES)('%s uses accessible #RRGGBB action colors', mode => {
    const { actionBg, actionText } = dailyPhraseChromeFor(mode);

    expect(actionBg).toMatch(/^#[0-9A-F]{6}$/i);
    expect(actionText).toMatch(/^#[0-9A-F]{6}$/i);
    expect(contrastRatio(actionBg, actionText)).toBeGreaterThanOrEqual(4.5);
  });

  it('defines both action roles for exactly every theme mode', () => {
    expect(Object.keys(DAILY_PHRASE_CHROME)).toHaveLength(THEME_MODES.length);

    for (const mode of THEME_MODES) {
      expect(DAILY_PHRASE_CHROME[mode]).toEqual(
        expect.objectContaining({
          actionBg: expect.any(String),
          actionText: expect.any(String),
        }),
      );
    }
  });
});
