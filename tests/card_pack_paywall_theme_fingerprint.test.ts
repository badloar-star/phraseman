import { getCardPackPaywallTheme, getCommunityUgcPackPaywallTheme } from '../app/flashcards/cardPackPaywallTheme';

// зачем (координатор 12.10, «окно покупки набора на токены, вид не менять»): ThemeContext отдаёт themeMode='dark' всегда
// (LEGACY_GRAPHITE_THEME_MODE), поэтому человек СЕГОДНЯ видит ТОЛЬКО оболочку shellDark на любой теме и оформлении.
// Отпечаток фиксирует эти значения ДО перевода источника на токены: замена обязана либо их сохранить, либо быть осознанной.
const DAILY = { id: 'fp-daily', category: 'daily' } as any;
const EXAM = { id: 'fp-exam', category: 'exam' } as any;

// ЗАПИСЬ «БЫЛО» (12.10): зелёная оболочка на любой теме признана дефектом (координатор). Новое поведение —
// cardPackPaywallShellFromTokens (tests/card_pack_paywall_token_theme.test.ts); этот файл остаётся, пока Дизайн не подключит экраны,
// затем удаляется вместе со старой таблицей.
describe('cardPackPaywallTheme: отпечаток нынешнего вида (themeMode=dark)', () => {
  it('daily pack, тёмное оформление', () => {
    expect(getCardPackPaywallTheme(DAILY, { themeMode: 'dark', isLight: false })).toEqual({
      backdropBase: 'rgba(3,8,4,0.9)',
      outerGlow: ['rgba(71,200,112,0.38)', 'rgba(25,40,32,0.48)', 'rgba(6,14,9,0.55)'],
      borderAccent: 'rgba(88,204,137,0.2)',
      handleColorLight: 'rgba(30,50,40,0.35)',
      handleColorDark: 'rgba(88,204,137,0.45)',
      iconBg: ['#1D2D23', '#152019'],
      iconBorder: 'rgba(88,204,137,0.25)',
      priceBorder: 'rgba(71,200,112,0.2)',
      priceGradient: ['rgba(71,200,112,0.1)', 'rgba(0,0,0,0)'],
      ctaColors: ['#47C870', '#164422'],
      ctaForeground: '#042010',
      ctaGlowTop: 'rgba(71,200,112,0.32)',
      goShopCta: ['#58CC89', '#1B4D2E'],
      goShopForeground: '#042010',
    });
  });

  it('exam pack сдвигает только ореол и рамку цены', () => {
    const t = getCardPackPaywallTheme(EXAM, { themeMode: 'dark' });
    expect(t.outerGlow[0]).toBe('rgba(109,40,217,0.200)');
    expect(t.priceBorder).toBe('rgba(109,40,217,0.120)');
    expect(t.ctaColors).toEqual(['#47C870', '#164422']);
  });

  it('UGC neon_lime накладывает свой патч на оболочку', () => {
    const t = getCommunityUgcPackPaywallTheme('neon_lime', { themeMode: 'dark' });
    expect(t.ctaColors).toEqual(['#C8FF00', '#2a4000']);
    expect(t.ctaForeground).toBe('#0a1200');
    expect(t.iconBg).toEqual(['#1D2D23', '#152019']);
  });
});
