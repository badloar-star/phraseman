import fs from 'fs';
import path from 'path';

jest.mock('react-native', () => ({
  StyleSheet: { absoluteFill: {}, absoluteFillObject: {} },
  View: 'View',
  Platform: { OS: 'ios' },
}));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));

import { PAYWALL_THEME_CONFIG } from '../components/paywallThemeConfig';
import { getCardPackPaywallTheme } from '../app/flashcards/cardPackPaywallTheme';
import { getLeagueBonusPalette } from '../constants/leagueBonusPalette';
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
} from '../components/RewardModalBackdrop';

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

describe('sage porcelain modal, reward, and paywall chrome', () => {
  it('uses porcelain modal and reward chrome without decorative glow', () => {
    const dailyModal = read('components/DailyTasksFirstVisitModal.tsx');
    const toast = read('components/DailyTaskRewardToast.tsx');
    const energyModal = read('components/NoEnergyModal.tsx');
    expect(dailyModal).toContain("sagePorcelain: {\n    accent: '#315F50'");
    expect(dailyModal).toContain("taskGlow: 'rgba(49,95,80,0)'");
    expect(dailyModal).toContain("errorText: '#A8464D'");
    expect(dailyModal).toContain("errorBg: '#F2DFE0'");
    expect(dailyModal).toContain("backgroundColor: chrome.errorBg ?? 'transparent'");
    expect(dailyModal).toContain('color: chrome.errorText ?? chrome.chipText');
    expect(toast).toContain("sagePorcelain: {\n    cardColors: ['#FCFDF9', '#F5F7F2']");
    expect(toast).toContain("claimBg: '#315F50'");
    expect(toast).toContain("xpColor: '#8B6320'");
    expect(energyModal).toContain("sagePorcelain: {\n    glow: 'rgba(49,95,80,0)'");
    expect(energyModal).toContain("surfaceColors: ['#FCFDF9', '#F5F7F2', '#E7EAE3']");
  });

  it('uses explicit porcelain reward backdrop behavior instead of a dark fallback', () => {
    expect(rewardModalPanelColors('sagePorcelain', SAGE_PORCELAIN)).toEqual(['#FCFDF9', '#F5F7F2', '#E7EAE3']);
    expect(rewardModalAccentColor('sagePorcelain', SAGE_PORCELAIN)).toBe('#315F50');
    expect(rewardModalPanelBorder('sagePorcelain', SAGE_PORCELAIN)).toBe('#BDC8BD');
    expect(rewardModalSoftSurface('sagePorcelain', SAGE_PORCELAIN)).toBe('#E1E5DC');
    expect(rewardModalPrimaryButtonColors('sagePorcelain')).toEqual(['#315F50', '#315F50']);
    expect(rewardModalPrimaryButtonText('sagePorcelain')).toBe('#FFFFFF');
    expect(rewardModalBackdropGradientColors('sagePorcelain')).toEqual(['#F0F1EC', '#FCFDF9', '#E1E5DC']);
    expect(rewardModalPanelGradientColors('sagePorcelain')).toEqual(['#FCFDF9', '#F5F7F2', '#E7EAE3']);
    expect(rewardModalScrimColors('sagePorcelain', 'regular')).toEqual(['rgba(23,32,29,0.26)', 'rgba(23,32,29,0.26)', 'rgba(23,32,29,0.26)']);
    expect(rewardModalScrimColors('sagePorcelain', 'strong')).toEqual(['rgba(23,32,29,0.38)', 'rgba(23,32,29,0.38)', 'rgba(23,32,29,0.38)']);
    expect(rewardModalPanelScrimColors('sagePorcelain', 'strong')).toEqual(['rgba(23,32,29,0)', 'rgba(23,32,29,0)', 'rgba(23,32,29,0)']);
  });

  it('uses porcelain paywall, card-pack, and league reward roles', () => {
    expect(PAYWALL_THEME_CONFIG.sagePorcelain).toMatchObject({
      heroAccent: '#315F50', selectedCardBorder: '#315F50', selectedCardBg: '#D9E9E1',
      unselectedCardBg: '#FCFDF9', panelBg: '#F0F1EC', panelBgStrong: '#E1E5DC',
      ctaBg: '#315F50', ctaText: '#FFFFFF', savingsBadgeBg: '#8B6320', savingsBadgeText: '#FFFFFF',
      urgencyBg: 'rgba(139,99,32,0.12)', urgencyTimerText: '#8B6320', socialProofText: '#52605A',
    });
    expect(getCardPackPaywallTheme({ id: 'sage', category: 'general' } as any, { themeMode: 'sagePorcelain' })).toMatchObject({
      backdropBase: 'rgba(23,32,29,0.26)', outerGlow: ['rgba(49,95,80,0)', 'rgba(49,95,80,0)', 'rgba(49,95,80,0)'],
      borderAccent: '#BDC8BD', iconBg: ['#FCFDF9', '#E1E5DC'], priceGradient: ['#FCFDF9', '#E1E5DC'],
      ctaColors: ['#315F50', '#315F50'], ctaForeground: '#FFFFFF', ctaGlowTop: 'rgba(49,95,80,0)',
    });
    expect(getLeagueBonusPalette(SAGE_PORCELAIN, 'sagePorcelain')).toMatchObject({
      card: ['#FCFDF9', '#F5F7F2', '#E7EAE3'], border: '#BDC8BD', accent: '#315F50', readyAccent: '#2F6F4F',
      textMuted: '#52605A', modal: { overlay: 'rgba(23,32,29,0.38)', card: ['#FCFDF9', '#F5F7F2', '#E7EAE3'], primary: ['#315F50', '#315F50', '#315F50'], primaryText: '#FFFFFF', rewardBg: '#EEE5D1' },
    });
  });
});
