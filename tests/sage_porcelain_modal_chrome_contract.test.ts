import fs from 'fs';
import path from 'path';
import { PAYWALL_THEME_CONFIG } from '../components/paywallThemeConfig';
import { getCardPackPaywallTheme } from '../app/flashcards/cardPackPaywallTheme';
import { getLeagueBonusPalette } from '../constants/leagueBonusPalette';
import { SAGE_PORCELAIN } from '../constants/theme';

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

describe('sage porcelain modal, reward, and paywall chrome', () => {
  it('uses porcelain modal and reward chrome without decorative glow', () => {
    const dailyModal = read('components/DailyTasksFirstVisitModal.tsx');
    const toast = read('components/DailyTaskRewardToast.tsx');
    const energyModal = read('components/NoEnergyModal.tsx');
    expect(dailyModal).toContain("sagePorcelain: {\n    accent: '#315F50'");
    expect(dailyModal).toContain("taskGlow: 'rgba(49,95,80,0)'");
    expect(toast).toContain("sagePorcelain: {\n    cardColors: ['#FCFDF9', '#F5F7F2']");
    expect(toast).toContain("claimBg: '#315F50'");
    expect(toast).toContain("xpColor: '#8B6320'");
    expect(energyModal).toContain("sagePorcelain: {\n    glow: 'rgba(49,95,80,0)'");
    expect(energyModal).toContain("surfaceColors: ['#FCFDF9', '#F5F7F2', '#E7EAE3']");
  });

  it('uses explicit porcelain reward backdrop behavior instead of a dark fallback', () => {
    const backdrop = read('components/RewardModalBackdrop.tsx');
    expect((backdrop.match(/case 'sagePorcelain':/g) ?? [])).toHaveLength(10);
    expect(backdrop).toContain("return ['#F0F1EC', '#FCFDF9', '#E1E5DC']");
    expect(backdrop).toContain("return ['#FCFDF9', '#F5F7F2', '#E7EAE3']");
    expect(backdrop).toContain("return '#BDC8BD'");
    expect(backdrop).toContain("return ['#315F50', '#315F50']");
    expect(backdrop).toContain("return '#FFFFFF'");
    expect(backdrop).toContain("const opacity = strong ? '0.38' : '0.26'");
    expect(backdrop).toContain("return ['rgba(23,32,29,0)', 'rgba(23,32,29,0)', 'rgba(23,32,29,0)']");
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
