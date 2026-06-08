import {
  getPaywallThemeConfig,
  PAYWALL_THEME_CONFIG,
  type ThemePaywallConfig,
} from '../components/paywallThemeConfig';
import type { ThemeMode } from '../constants/theme';

const ALL_THEMES: ThemeMode[] = [
  'dark', 'neon', 'gold', 'coral', 'minimalLight', 'minimalDark', 'compass',
];

const REQUIRED_KEYS: (keyof ThemePaywallConfig)[] = [
  'heroAccent',
  'selectedCardBorder',
  'selectedCardBg',
  'unselectedCardBg',
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
    const accents = ALL_THEMES.map((t) => PAYWALL_THEME_CONFIG[t].heroAccent);
    const unique = new Set(accents);
    // Все 7 тем должны иметь разные heroAccent
    expect(unique.size).toBe(ALL_THEMES.length);
  });

  it('каждая тема имеет уникальный ctaBg', () => {
    const ctaBgs = ALL_THEMES.map((t) => PAYWALL_THEME_CONFIG[t].ctaBg);
    const unique = new Set(ctaBgs);
    expect(unique.size).toBe(ALL_THEMES.length);
  });
});

describe('PAYWALL_THEME_CONFIG — тематическая корректность цветов', () => {
  it('dark: CTA зелёный акцент', () => {
    const { ctaBg, heroAccent } = PAYWALL_THEME_CONFIG.dark;
    // Оба содержат зелёный компонент (58CC89 или 47C870)
    expect(ctaBg.toLowerCase()).toMatch(/58cc89|47c870/i);
    expect(heroAccent.toLowerCase()).toMatch(/58cc89|47c870/i);
  });

  it('neon: CTA неоново-лаймовый', () => {
    const { ctaBg } = PAYWALL_THEME_CONFIG.neon;
    expect(ctaBg.toLowerCase()).toContain('c8ff00');
  });

  it('gold: CTA золотой (из GOLD_RICH палитры)', () => {
    const { ctaBg } = PAYWALL_THEME_CONFIG.gold;
    // paleGold = #E9CE7A
    expect(ctaBg.toLowerCase()).toContain('e9ce7a');
  });

  it('coral: CTA красно-коралловый', () => {
    const { ctaBg, ctaText } = PAYWALL_THEME_CONFIG.coral;
    expect(ctaBg.toLowerCase()).toContain('ff6464');
    // На красном фоне — белый текст
    expect(ctaText.toLowerCase()).toContain('ffffff');
  });

  it('minimalLight: CTA тёмный (не яркий акцент)', () => {
    const { ctaBg, ctaText } = PAYWALL_THEME_CONFIG.minimalLight;
    expect(ctaBg.toLowerCase()).toContain('273044');
    expect(ctaText.toLowerCase()).toContain('ffffff');
  });

  it('minimalDark: CTA синий', () => {
    const { ctaBg } = PAYWALL_THEME_CONFIG.minimalDark;
    expect(ctaBg.toLowerCase()).toContain('6ea8ff');
  });

  it('compass: CTA тёплый кремовый (из COMPASS_RICH)', () => {
    const { ctaBg, ctaText } = PAYWALL_THEME_CONFIG.compass;
    // creamSoft = #F8D7A3
    expect(ctaBg.toLowerCase()).toContain('f8d7a3');
    // textDark = #21170E
    expect(ctaText.toLowerCase()).toContain('21170e');
  });
});

describe('PAYWALL_THEME_CONFIG — контрастность текста на CTA', () => {
  // Для тёмных CTA — текст должен быть светлым или тёмным в зависимости от фона
  it('neon: текст на лаймовом CTA — тёмный (читаемость)', () => {
    const { ctaText } = PAYWALL_THEME_CONFIG.neon;
    // Лаймовый фон яркий — текст должен быть тёмным
    expect(ctaText).not.toBe('#FFFFFF');
    expect(ctaText).not.toBe('#fff');
  });

  it('gold: текст на золотом CTA — тёмный', () => {
    const { ctaText } = PAYWALL_THEME_CONFIG.gold;
    expect(ctaText.toLowerCase()).not.toBe('#ffffff');
  });

  it('compass: текст на кремовом CTA — тёмный', () => {
    const { ctaText } = PAYWALL_THEME_CONFIG.compass;
    expect(ctaText.toLowerCase()).toContain('21170e');
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
