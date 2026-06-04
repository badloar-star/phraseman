export type CompassGradient3 = [string, string, string];

export const COMPASS_RICH = {
  void: '#020304',
  charcoal: '#151517',
  charcoalRaised: '#1F1F21',
  charcoalSoft: '#2B2A2B',
  charcoalWarm: '#24211D',

  cream: '#FFE6B5',
  creamSoft: '#F7D7A2',
  champagne: '#F2C48D',
  peach: '#F4B978',
  copper: '#B4774E',
  copperDark: '#6F3F25',

  textDark: '#151008',
  textMuted: '#D8D2C8',

  hairlineQuiet: 'rgba(242,196,141,0.16)',
  hairline: 'rgba(242,196,141,0.26)',
  hairlineStrong: 'rgba(255,230,181,0.42)',
  edgeLight: 'rgba(255,230,181,0.32)',
  edgeSoft: 'rgba(242,196,141,0.18)',
  edgeShade: 'rgba(0,0,0,0.62)',
  innerShade: 'rgba(0,0,0,0.46)',
  wash: 'rgba(242,196,141,0.10)',
  washStrong: 'rgba(242,196,141,0.16)',
  mist: 'rgba(255,230,181,0.055)',
  copperWash: 'rgba(180,119,78,0.14)',
} as const;

export const COMPASS_GRADIENTS = {
  appBackground: ['#2F2F31', '#171719', '#020304'] as CompassGradient3,
  premiumPanel: ['#2C2B2C', '#181819', '#0B0B0C'] as CompassGradient3,
  raisedTile: ['#343233', '#1B1B1C', '#111112'] as CompassGradient3,
  recessedPanel: ['#171719', '#101011', '#050506'] as CompassGradient3,
  selectedTile: ['#3B312A', '#1B1815', '#100D0A'] as CompassGradient3,
  primaryButton: ['#FFE6B5', '#F4B978', '#B4774E'] as CompassGradient3,
  mutedButton: ['#807B72', '#5F5B54', '#3B3936'] as CompassGradient3,
  progressCream: ['#F4B978', '#FFE6B5', '#B4774E'] as CompassGradient3,
} as const;

export const COMPASS_SURFACE_LOCATIONS = [0, 0.58, 1] as [number, number, number];

export function compassShadow(level: 1 | 2 | 3 = 2) {
  return {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: level === 1 ? 5 : level === 2 ? 8 : 12 },
    shadowOpacity: level === 1 ? 0.44 : level === 2 ? 0.58 : 0.72,
    shadowRadius: level === 1 ? 10 : level === 2 ? 20 : 30,
    elevation: level === 1 ? 6 : level === 2 ? 11 : 16,
  };
}
