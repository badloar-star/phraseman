import {
  getPaywallThemeConfig,
  PAYWALL_THEME_CONFIG,
  type ThemePaywallConfig,
} from '../components/paywallThemeConfig';
import type { ThemeMode } from '../constants/theme';

const ALL_THEMES: ThemeMode[] = [
  'dark', 'gold', 'coral', 'minimalDark', 'business', 'businessLight', 'midnight', 'ember', 'aurora', 'volt',
  'candyBlue', 'indigo',
];

const DISTINCT_ACCENT_THEMES: ThemeMode[] = [
  'dark', 'gold', 'coral', 'minimalDark', 'business', 'midnight', 'ember', 'aurora', 'volt',
  'candyBlue', 'indigo',
];

const REQUIRED_KEYS: (keyof ThemePaywallConfig)[] = [
  'heroAccent',
  'selectedCardBorder',
  'selectedCardBg',
  'unselectedCardBg',
  'panelBg',
  'panelBgStrong',
  'selectedCardShadow',
  'savingsBadgeBg',
  'savingsBadgeText',
  'popularBadgeBg',
  'popularBadgeText',
  'ctaBg',
  'ctaText',
  'ctaShadow',
  'pillBg',
  'pillText',
  'pillBorder',
  'urgencyBg',
  'urgencyTimerText',
  'urgencyLabelText',
  'urgencyStrikethroughColor',
  'urgencyCurrentPriceText',
  'expandBtnText',
  'expandBtnBorder',
  'socialProofText',
  'socialProofStarColor',
];

describe('PAYWALL_THEME_CONFIG — полнота', () => {
  it('все 7 тем присутствуют в конфиге', () => {
    for (const theme of ALL_THEMES) {
      expect(PAYWALL_THEME_CONFIG[theme]).toBeDefined();
    }
  });

  it.each(ALL_THEMES)('тема %s содержит все обязательные поля', (theme) => {
    const config = PAYWALL_THEME_CONFIG[theme];
    for (const key of REQUIRED_KEYS) {
      expect(config[key]).toBeDefined();
      expect(typeof config[key]).toBe('string');
      expect((config[key] as string).length).toBeGreaterThan(0);
    }
  });
});

describe('getPaywallThemeConfig', () => {
  it('возвращает конфиг для каждой темы', () => {
    for (const theme of ALL_THEMES) {
      const config = getPaywallThemeConfig(theme);
      expect(config).toBeDefined();
      expect(config.ctaBg).toBeTruthy();
    }
  });

  it('возвращает dark как fallback для неизвестной темы', () => {
    const config = getPaywallThemeConfig('unknown' as ThemeMode);
    expect(config).toEqual(PAYWALL_THEME_CONFIG.dark);
  });
});

describe('PAYWALL_THEME_CONFIG — уникальность акцентов', () => {
  it('каждая тема имеет уникальный heroAccent (темы не копируют друг друга)', () => {
    const accents = DISTINCT_ACCENT_THEMES.map((t) => PAYWALL_THEME_CONFIG[t].heroAccent);
    const unique = new Set(accents);
    // Все 7 тем должны иметь разные heroAccent
    expect(unique.size).toBe(DISTINCT_ACCENT_THEMES.length);
  });

  it('каждая тема имеет уникальный ctaBg', () => {
    const ctaBgs = DISTINCT_ACCENT_THEMES.map((t) => PAYWALL_THEME_CONFIG[t].ctaBg);
    const unique = new Set(ctaBgs);
    expect(unique.size).toBe(DISTINCT_ACCENT_THEMES.length);
  });
});

describe('PAYWALL_THEME_CONFIG — тематическая корректность цветов', () => {
  it('dark: CTA зелёный акцент', () => {
    const { ctaBg, heroAccent } = PAYWALL_THEME_CONFIG.dark;
    // Оба содержат зелёный компонент (58CC89 или 47C870)
    expect(ctaBg.toLowerCase()).toMatch(/58cc89|47c870/i);
    expect(heroAccent.toLowerCase()).toMatch(/58cc89|47c870/i);
  });

  

  it('gold: CTA золотой (из GOLD_RICH палитры)', () => {
    const { ctaBg } = PAYWALL_THEME_CONFIG.gold;
    // paleGold = #E9CE7A
    expect(ctaBg.toLowerCase()).toContain('e9ce7a');
  });

  it('coral: CTA красно-коралловый', () => {
    const { ctaBg, ctaText } = PAYWALL_THEME_CONFIG.coral;
    expect(ctaBg.toLowerCase()).toContain('ff7f50');
    // На красном фоне — белый текст
    expect(ctaText.toLowerCase()).toContain('ffffff');
  });

  

  it('minimalDark: CTA синий', () => {
    const { ctaBg } = PAYWALL_THEME_CONFIG.minimalDark;
    expect(ctaBg.toLowerCase()).toContain('6ea8ff');
  });

  
});

describe('PAYWALL_THEME_CONFIG — контрастность текста на CTA', () => {
  // Для тёмных CTA — текст должен быть светлым или тёмным в зависимости от фона
  

  it('gold: текст на золотом CTA — тёмный', () => {
    const { ctaText } = PAYWALL_THEME_CONFIG.gold;
    expect(ctaText.toLowerCase()).not.toBe('#ffffff');
  });

  
});

describe('PAYWALL_THEME_CONFIG — urgency блок', () => {
  it.each(ALL_THEMES)('тема %s: urgencyTimerText отличается от urgencyStrikethroughColor', (theme) => {
    const { urgencyTimerText, urgencyStrikethroughColor } = PAYWALL_THEME_CONFIG[theme];
    expect(urgencyTimerText).not.toBe(urgencyStrikethroughColor);
  });

  it.each(ALL_THEMES)('тема %s: urgencyBg имеет прозрачность (rgba)', (theme) => {
    const { urgencyBg } = PAYWALL_THEME_CONFIG[theme];
    // urgencyBg должен быть полупрозрачным чтобы не перекрывать фон
    expect(urgencyBg.toLowerCase()).toContain('rgba');
  });
});
