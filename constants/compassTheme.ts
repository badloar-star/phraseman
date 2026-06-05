export type CompassGradient3 = [string, string, string];

export const COMPASS_RICH = {
  void: '#151517',
  charcoal: '#1B1B1D',
  charcoalRaised: '#202022',
  charcoalSoft: '#2E2E30',
  charcoalWarm: '#252527',

  cream: '#FFE7B6',
  creamSoft: '#F8D7A3',
  champagne: '#F2C48D',
  peach: '#F4B06E',
  copper: '#9B643F',
  copperDark: '#6F442B',

  textDark: '#21170E',
  textMuted: '#D7D2CC',

  hairlineQuiet: 'rgba(248,215,163,0.14)',
  hairline: 'rgba(248,215,163,0.23)',
  hairlineStrong: 'rgba(255,231,182,0.36)',
  edgeLight: 'rgba(255,231,182,0.28)',
  edgeSoft: 'rgba(248,215,163,0.14)',
  edgeShade: 'rgba(0,0,0,0.62)',
  innerShade: 'rgba(0,0,0,0.46)',
  wash: 'rgba(248,215,163,0.07)',
  washStrong: 'rgba(248,215,163,0.12)',
  mist: 'rgba(255,231,182,0.045)',
  copperWash: 'rgba(244,176,110,0.12)',
} as const;

export const COMPASS_GRADIENTS = {
  appBackground: ['#333335', '#303032', '#2D2D2F'] as CompassGradient3,
  premiumPanel: ['#303032', '#28282A', '#222224'] as CompassGradient3,
  raisedTile: ['#222224', '#1C1C1E', '#171719'] as CompassGradient3,
  recessedPanel: ['#1F1F21', '#1A1A1C', '#151517'] as CompassGradient3,
  selectedTile: ['#2E2E30', '#232325', '#1B1B1D'] as CompassGradient3,
  primaryButton: ['#FFE7B6', '#F2C48D', '#F4B06E'] as CompassGradient3,
  mutedButton: ['#777776', '#5C5C5B', '#424241'] as CompassGradient3,
  progressCream: ['#F4B06E', '#FFE7B6', '#F2C48D'] as CompassGradient3,
} as const;

export const COMPASS_SURFACE_LOCATIONS = [0, 0.58, 1] as [number, number, number];

export function compassShadow(level: 1 | 2 | 3 = 2) {
  return {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: level === 1 ? 2 : level === 2 ? 3 : 5 },
    shadowOpacity: level === 1 ? 0.20 : level === 2 ? 0.26 : 0.34,
    shadowRadius: level === 1 ? 5 : level === 2 ? 8 : 12,
    elevation: level === 1 ? 2 : level === 2 ? 4 : 6,
  };
}
