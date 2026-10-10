import fs from 'fs';
import path from 'path';

import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';

const ROOT = path.resolve(__dirname, '..');

// зачем (координатор 11.10, гейт «приложение = макет», эмулятор один — снимки «тёмная + светлая» ждут очереди):
// статическая замена глазам. Файлы, которые Дизайн менял 10–11.10, не должны содержать литералов цвета вне помеченных
// `theme-exempt` (затемнение под шторкой — единственное разрешённое исключение), а токены, из которых они красятся,
// обязаны отличаться между тёмной и светлой «Авророй» — иначе цвет читается только в одной теме.
const FILES = [
  'components/KitProgressFill.tsx',
  'components/KitTouchable.tsx',
  'components/modal_fx/HybridSheetShell.tsx',
  'components/referral_sheet_shell.tsx',
  'components/AiLimitUpsellCard.tsx',
  'components/SoftContextualUpsellCard.tsx',
  'components/PromoBanner.tsx',
  'components/ReferralWelcomeHost.tsx',
  'components/ExplainReportButton.tsx',
  'components/ReportErrorButton.tsx',
  'components/VipSurveyModal.tsx',
  'components/VipSurveyReviewPromptModal.tsx',
  'components/referral_code_sheet.tsx',
  'components/PracticeRuneCounter.tsx',
  'components/friends/FriendsGlassKit.tsx',
  'app/referrals.tsx',
  'app/runes_wallet.tsx',
  'app/promo_code_entry.tsx',
  'app/lesson_complete.tsx',
];

const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|['"](?:white|black)['"]/;

describe('two-theme static colors', () => {
  test.each(FILES)('%s has no colour literal outside theme-exempt lines', (file) => {
    const lines = fs.readFileSync(path.join(ROOT, file), 'utf8').split(/\r?\n/);
    const offenders = lines
      .map((text, index) => ({ text, line: index + 1 }))
      .filter(({ text }) => COLOR_LITERAL.test(text))
      .filter(({ text }) => !text.trimStart().startsWith('//') && !text.trimStart().startsWith('*'))
      .filter(({ text }) => !text.includes('theme-exempt'))
      .map(({ text, line }) => `${file}:${line}: ${text.trim()}`);
    expect(offenders).toEqual([]);
  });

  // токены, которыми красятся карточки Plus, шторки и кошелёк (glass.accent / accentInk / cta / ctaInk / glassEdge / text / secondary)
  const TOKEN_KEYS = ['bg', 'text', 'secondary', 'accent', 'accentInk', 'cta', 'ctaInk', 'glassEdge'] as const;
  const AURORA_DARK = { level: 'calm', appearance: 'dark', intensity: 0 } as const;
  const AURORA_LIGHT = { level: 'calm', appearance: 'light', intensity: 0 } as const;

  test('Aurora dark and light give different background and text tokens', () => {
    const dark = liquidGlassTokens('grad_aurora', AURORA_DARK);
    const light = liquidGlassTokens('grad_aurora', AURORA_LIGHT);
    expect(dark.bg).not.toBe(light.bg);
    expect(dark.text).not.toBe(light.text);
    expect(dark.secondary).not.toBe(light.secondary);
  });

  test.each(TOKEN_KEYS)('Aurora token %s exists as a colour string in both appearances', (key) => {
    for (const variant of [AURORA_DARK, AURORA_LIGHT]) {
      const value = (liquidGlassTokens('grad_aurora', variant) as Record<string, unknown>)[key];
      expect(typeof value).toBe('string');
      expect(String(value)).toMatch(/^(#[0-9a-fA-F]{3,8}|rgba?\()/);
    }
  });

  test('Aurora text stays readable on its own background in both appearances (>= 4.5:1)', () => {
    const lum = (hex: string) => {
      const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    for (const variant of [AURORA_DARK, AURORA_LIGHT]) {
      const t = liquidGlassTokens('grad_aurora', variant);
      const [a, b] = [lum(t.bg), lum(t.text)].sort((x, y) => y - x);
      expect((a + 0.05) / (b + 0.05)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
