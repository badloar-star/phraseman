
jest.mock('react-native', () => ({
  StyleSheet: { absoluteFill: {}, absoluteFillObject: {} },
  View: 'View',
  Platform: { OS: 'ios' },
}));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
// зачем (координатор 05.10): с 47f56ec7e (окно «Нет энергии», 29.09) RewardModalBackdrop плавно проявляет фон
// через react-native-reanimated. Его lib/module — ESM, ts-jest пакет не трансформирует, и сюит падал до первого
// утверждения. Тест про цвета и обводки, анимация ему не нужна — заглушка, как в coin_reward_flight_lifecycle.
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { View: 'Animated.View' },
  Easing: { out: (easing: unknown) => easing, cubic: 0 },
  useSharedValue: (initial: number) => ({ value: initial }),
  useAnimatedStyle: (factory: () => unknown) => factory(),
  withTiming: (value: unknown) => value,
  cancelAnimation: () => undefined,
}));

import { PAYWALL_THEME_CONFIG } from '../components/paywallThemeConfig';
import { SAGE_PORCELAIN } from '../constants/theme';
import {
  rewardModalAccentColor,
  rewardModalBackdropGradientColors,
  rewardModalPanelBorder,
  rewardModalPanelColors,
  rewardModalPanelGradientColors,
  rewardModalPanelScrimColors,
  rewardModalPrimaryButtonColors,
  rewardModalPrimaryButtonText,
  rewardModalScrimColors,
  rewardModalSoftSurface,
  RewardModalLiquidGlass,
} from '../components/RewardModalBackdrop';


describe('sage porcelain modal, reward, and paywall chrome', () => {
  // зачем (координатор 05.10): проверка «окно энергии в sagePorcelain без свечения» снята. Окно «Нет энергии»
  // с 47f56ec7e (29.09, макет B5) и 645d571ab (05.10, три вида по макетам) нарисовано на Liquid Glass 2.0 и
  // больше не держит свою таблицу цветов по темам — проверять в нём нечего; его вид сторожит гейт паритета
  // с макетом (docs/phraseman-2.0/evidence/parity). Палитра porcelain общих окон наград — ниже, без изменений.

  it('uses explicit porcelain reward backdrop behavior instead of a dark fallback', () => {
    expect(rewardModalPanelColors('sagePorcelain', SAGE_PORCELAIN)).toEqual(['#FCFDF9', '#F5F7F2', '#E7EAE3']);
    expect(rewardModalAccentColor('sagePorcelain', SAGE_PORCELAIN)).toBe('#315F50');
    expect(rewardModalPanelBorder('sagePorcelain', SAGE_PORCELAIN)).toBe('#BDC8BD');
    expect(rewardModalSoftSurface('sagePorcelain', SAGE_PORCELAIN)).toBe('#E1E5DC');
    expect(rewardModalPrimaryButtonColors('sagePorcelain')).toEqual(['#315F50', '#315F50']);
    expect(rewardModalPrimaryButtonText('sagePorcelain')).toBe('#FFFFFF');
    expect(rewardModalBackdropGradientColors('sagePorcelain')).toEqual(['#DCE1D8', '#FCFDF9', '#CDD5C7']);
    expect(rewardModalPanelGradientColors('sagePorcelain')).toEqual(['#FCFDF9', '#F5F7F2', '#E7EAE3']);
    expect(rewardModalScrimColors('sagePorcelain', 'regular')).toEqual(['rgba(23,32,29,0.26)', 'rgba(23,32,29,0.26)', 'rgba(23,32,29,0.26)']);
    expect(rewardModalScrimColors('sagePorcelain', 'strong')).toEqual(['rgba(23,32,29,0.38)', 'rgba(23,32,29,0.38)', 'rgba(23,32,29,0.38)']);
    expect(rewardModalPanelScrimColors('sagePorcelain', 'strong')).toEqual(['rgba(23,32,29,0)', 'rgba(23,32,29,0)', 'rgba(23,32,29,0)']);
  });

  it('uses porcelain paywall and card-pack roles', () => {
    expect(PAYWALL_THEME_CONFIG.sagePorcelain).toMatchObject({
      heroAccent: '#315F50', selectedCardBorder: '#315F50', selectedCardBg: '#D9E9E1',
      // panelBg = #FCFDF9 (не #F0F1EC): цвет страницы сливал карточки с фоном — аудит 2026-08-02.
      unselectedCardBg: '#FCFDF9', panelBg: '#FCFDF9', panelBgStrong: '#E1E5DC',
      ctaBg: '#315F50', ctaText: '#FFFFFF', savingsBadgeBg: '#8B6320', savingsBadgeText: '#FFFFFF',
      urgencyBg: 'rgba(139,99,32,0.12)', urgencyTimerText: '#8B6320', socialProofText: '#52605A',
    });
    // зачем (координатор 12.10): оболочка окна покупки набора больше не берётся из таблицы по id темы (sagePorcelain и др.) — она строится из токенов
    // активной темы Liquid Glass; её контраст и подключение сторожит tests/card_pack_paywall_token_shell_contrast.test.ts.
  });

  it('renders no liquid-glass decoration for Sage', () => {
    expect(RewardModalLiquidGlass({ themeMode: 'sagePorcelain', accent: '#315F50' })).toBeNull();
  });
});
