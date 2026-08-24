import type { ThemeMode } from '../constants/theme';

export type LevelUpThresholdPalette = {
  background: [string, string, string];
  ambient: string;
  accent: string;
  accentSecondary: string;
  portalFill: [string, string];
  portalBorder: string;
  panel: string;
  panelBorder: string;
  rewardSurface: string;
  rewardBorder: string;
  textPrimary: string;
  textMuted: string;
  button: [string, string, string];
  buttonText: string;
  secondaryText: string;
};

export const THRESHOLD_LEVEL_UP_PALETTES = {
  dark: {
    background: ['#07150D', '#031008', '#010503'],
    ambient: 'rgba(77, 232, 139, 0.20)',
    accent: '#6AF0A0',
    accentSecondary: '#D8FF77',
    portalFill: ['rgba(80, 224, 139, 0.18)', 'rgba(3, 16, 8, 0.22)'],
    portalBorder: 'rgba(116, 242, 163, 0.62)',
    panel: 'rgba(8, 27, 16, 0.92)',
    panelBorder: 'rgba(113, 241, 161, 0.23)',
    rewardSurface: 'rgba(118, 243, 165, 0.08)',
    rewardBorder: 'rgba(118, 243, 165, 0.18)',
    textPrimary: '#F2FFF6',
    textMuted: '#A9CDB5',
    button: ['#D9FF74', '#6AF0A0', '#42C77A'],
    buttonText: '#06130A',
    secondaryText: '#A9CDB5',
  },
  gold: {
    background: ['#261506', '#100A03', '#030201'],
    ambient: 'rgba(238, 193, 89, 0.24)',
    accent: '#F2CD72',
    accentSecondary: '#FFF2B5',
    portalFill: ['rgba(241, 197, 92, 0.20)', 'rgba(22, 13, 4, 0.28)'],
    portalBorder: 'rgba(246, 211, 126, 0.66)',
    panel: 'rgba(31, 20, 7, 0.94)',
    panelBorder: 'rgba(240, 199, 100, 0.28)',
    rewardSurface: 'rgba(241, 201, 104, 0.09)',
    rewardBorder: 'rgba(241, 201, 104, 0.22)',
    textPrimary: '#FFF9E8',
    textMuted: '#CDBE99',
    button: ['#FFF0A9', '#E8BE5E', '#B87B23'],
    buttonText: '#1C1104',
    secondaryText: '#D2C29D',
  },
  olive: { background: ['#1A1E12', '#0B0D08', '#030303'], ambient: 'rgba(201,168,76,0.12)', accent: '#C9A84C', accentSecondary: '#E3CC88', portalFill: ['rgba(201,168,76,0.14)', 'rgba(5,6,4,0.26)'], portalBorder: 'rgba(227,204,136,0.34)', panel: 'rgba(13,15,11,0.95)', panelBorder: 'rgba(201,168,76,0.14)', rewardSurface: 'rgba(201,168,76,0.07)', rewardBorder: 'rgba(201,168,76,0.16)', textPrimary: '#F4ECD8', textMuted: '#A69F8A', button: ['#F0DEA5', '#C9A84C', '#9C7A29'], buttonText: '#161208', secondaryText: '#CFC5AB' },
  midnight: {
    background: ['#111C4D', '#070E2B', '#02040D'],
    ambient: 'rgba(132, 151, 255, 0.26)',
    accent: '#9AA9FF',
    accentSecondary: '#69E8FF',
    portalFill: ['rgba(122, 145, 255, 0.22)', 'rgba(5, 12, 38, 0.30)'],
    portalBorder: 'rgba(161, 177, 255, 0.66)',
    panel: 'rgba(9, 17, 51, 0.94)',
    panelBorder: 'rgba(151, 168, 255, 0.26)',
    rewardSurface: 'rgba(134, 155, 255, 0.09)',
    rewardBorder: 'rgba(134, 155, 255, 0.20)',
    textPrimary: '#F5F7FF',
    textMuted: '#ADB7DD',
    button: ['#DCE3FF', '#98AAFF', '#697DE8'],
    buttonText: '#091039',
    secondaryText: '#B4BDE0',
  },
  ember: {
    background: ['#341207', '#170702', '#050201'],
    ambient: 'rgba(255, 111, 38, 0.25)',
    accent: '#FF9A45',
    accentSecondary: '#FFD56A',
    portalFill: ['rgba(255, 119, 43, 0.20)', 'rgba(24, 7, 2, 0.30)'],
    portalBorder: 'rgba(255, 151, 70, 0.66)',
    panel: 'rgba(37, 12, 4, 0.94)',
    panelBorder: 'rgba(255, 132, 50, 0.27)',
    rewardSurface: 'rgba(255, 133, 52, 0.09)',
    rewardBorder: 'rgba(255, 133, 52, 0.21)',
    textPrimary: '#FFF6ED',
    textMuted: '#D5B19B',
    button: ['#FFE27B', '#FF9945', '#E75C21'],
    buttonText: '#240B02',
    secondaryText: '#D9B49E',
  },
  aurora: {
    background: ['#062D2D', '#0A1830', '#020609'],
    ambient: 'rgba(72, 236, 220, 0.23)',
    accent: '#65EBDD',
    accentSecondary: '#9A8CFF',
    portalFill: ['rgba(77, 232, 218, 0.18)', 'rgba(14, 24, 52, 0.28)'],
    portalBorder: 'rgba(111, 239, 226, 0.61)',
    panel: 'rgba(7, 29, 35, 0.94)',
    panelBorder: 'rgba(92, 235, 221, 0.24)',
    rewardSurface: 'rgba(93, 235, 222, 0.08)',
    rewardBorder: 'rgba(93, 235, 222, 0.19)',
    textPrimary: '#F0FFFD',
    textMuted: '#A6CAC9',
    button: ['#D2FFF8', '#64E8DA', '#37B9C7'],
    buttonText: '#031818',
    secondaryText: '#A8CDCC',
  },
  volt: {
    background: ['#203005', '#0E1602', '#030500'],
    ambient: 'rgba(198, 245, 48, 0.24)',
    accent: '#C8F436',
    accentSecondary: '#F1FF9E',
    portalFill: ['rgba(199, 245, 53, 0.18)', 'rgba(15, 23, 3, 0.27)'],
    portalBorder: 'rgba(214, 250, 88, 0.64)',
    panel: 'rgba(20, 30, 6, 0.94)',
    panelBorder: 'rgba(202, 244, 61, 0.26)',
    rewardSurface: 'rgba(202, 244, 61, 0.09)',
    rewardBorder: 'rgba(202, 244, 61, 0.20)',
    textPrimary: '#FAFFE8',
    textMuted: '#BDCCA0',
    button: ['#F1FFA6', '#C8F436', '#83BA18'],
    buttonText: '#111A02',
    secondaryText: '#C1CFA4',
  },
  indigo: {
    background: ['#272350', '#121125', '#040309'],
    ambient: 'rgba(193, 183, 255, 0.24)',
    accent: '#CAC2FF',
    accentSecondary: '#F2C6FF',
    portalFill: ['rgba(198, 188, 255, 0.19)', 'rgba(18, 16, 39, 0.30)'],
    portalBorder: 'rgba(207, 199, 255, 0.63)',
    panel: 'rgba(25, 23, 50, 0.95)',
    panelBorder: 'rgba(199, 190, 255, 0.25)',
    rewardSurface: 'rgba(199, 190, 255, 0.08)',
    rewardBorder: 'rgba(199, 190, 255, 0.19)',
    textPrimary: '#FBFAFF',
    textMuted: '#BDB7D2',
    button: ['#F5E9FF', '#CAC2FF', '#9384E8'],
    buttonText: '#17132C',
    secondaryText: '#C0BAD5',
  },
  sagePorcelain: {
    background: ['#D9E1D6', '#F7F9F5', '#C9D4C6'],
    ambient: 'rgba(49, 95, 80, 0.17)',
    accent: '#315F50',
    accentSecondary: '#4F786D',
    portalFill: ['rgba(255, 255, 255, 0.88)', 'rgba(211, 224, 214, 0.62)'],
    portalBorder: 'rgba(49, 95, 80, 0.42)',
    panel: 'rgba(252, 253, 249, 0.95)',
    panelBorder: 'rgba(49, 95, 80, 0.18)',
    rewardSurface: 'rgba(49, 95, 80, 0.07)',
    rewardBorder: 'rgba(49, 95, 80, 0.16)',
    textPrimary: '#17201D',
    textMuted: '#52605A',
    button: ['#477A69', '#315F50', '#23483C'],
    buttonText: '#FFFFFF',
    secondaryText: '#52605A',
  },
} satisfies Record<ThemeMode, LevelUpThresholdPalette>;

export function getLevelUpThresholdPalette(themeMode: ThemeMode): LevelUpThresholdPalette {
  return THRESHOLD_LEVEL_UP_PALETTES[themeMode];
}
