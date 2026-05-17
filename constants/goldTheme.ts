export type GoldGradient3 = [string, string, string];

export const GOLD_RICH = {
  blackVoid: '#030303',
  blackObsidian: '#070707',
  blackPiano: '#0A0A0A',
  graphite: '#111111',
  graphiteRaised: '#171717',
  graphiteWarm: '#1A1711',
  bronzeSurface: '#20180B',

  ivory: '#F7F1E4',
  ivoryMuted: '#D8C9A5',
  taupe: '#B8AD92',
  taupeDeep: '#6D6554',

  champagne: '#F6E3A1',
  paleGold: '#E9CE7A',
  metalGold: '#D6B35A',
  antiqueGold: '#B8903A',
  agedGold: '#9F7A2D',
  bronze: '#6E4B14',
  bronzeDark: '#3C2A0B',

  hairlineQuiet: 'rgba(214,179,90,0.14)',
  hairline: 'rgba(214,179,90,0.28)',
  hairlineStrong: 'rgba(246,227,161,0.38)',
  hairlineDark: 'rgba(110,75,20,0.34)',
  edgeLight: 'rgba(246,227,161,0.26)',
  edgeSoft: 'rgba(214,179,90,0.18)',
  edgeShade: 'rgba(0,0,0,0.58)',
  innerShade: 'rgba(0,0,0,0.44)',
  wash: 'rgba(214,179,90,0.08)',
  washStrong: 'rgba(214,179,90,0.13)',
  mist: 'rgba(246,227,161,0.045)',
  bronzeWash: 'rgba(110,75,20,0.10)',
  bronzeWashStrong: 'rgba(110,75,20,0.16)',
} as const;

export const GOLD_GRADIENTS = {
  appBackground: ['#11100D', '#050505', GOLD_RICH.blackVoid] as GoldGradient3,
  quietPanel: ['#191710', '#0C0B09', '#040403'] as GoldGradient3,
  premiumPanel: ['#1D1A12', '#0D0C0A', '#040403'] as GoldGradient3,
  raisedTile: ['#201C12', '#0D0C0A', '#141008'] as GoldGradient3,
  selectedTile: ['#241A08', '#0D0C0A', '#181005'] as GoldGradient3,
  completedPanel: ['#211706', '#0E0C08', '#130E06'] as GoldGradient3,
  claimedPanel: ['#17140E', '#070706', '#0B0906'] as GoldGradient3,
  mutedPanel: ['#14130F', '#060606', '#11100D'] as GoldGradient3,
  primaryButton: ['#F0D98C', '#C8A34C', '#765316'] as GoldGradient3,
  metallicFill: ['#F0D98C', '#D6B35A', '#7C5818'] as GoldGradient3,
  progressMetal: ['#A47E2D', '#E8CE74', '#B8903A'] as GoldGradient3,
  bronzeProgress: [GOLD_RICH.bronzeDark, GOLD_RICH.antiqueGold, GOLD_RICH.champagne] as GoldGradient3,
} as const;

export const GOLD_SURFACE_LOCATIONS = [0, 0.62, 1] as [number, number, number];

export function goldShadow(level: 1 | 2 | 3 = 2) {
  return {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: level === 1 ? 5 : level === 2 ? 9 : 14 },
    shadowOpacity: level === 1 ? 0.50 : level === 2 ? 0.64 : 0.78,
    shadowRadius: level === 1 ? 12 : level === 2 ? 24 : 36,
    elevation: level === 1 ? 7 : level === 2 ? 13 : 19,
  };
}

export type GoldCardTone =
  | 'quiet'
  | 'premium'
  | 'raised'
  | 'selected'
  | 'completed'
  | 'claimed'
  | 'muted';

export function goldCardGradient(tone: GoldCardTone = 'quiet'): GoldGradient3 {
  switch (tone) {
    case 'premium':
      return GOLD_GRADIENTS.premiumPanel;
    case 'raised':
      return GOLD_GRADIENTS.raisedTile;
    case 'selected':
      return GOLD_GRADIENTS.selectedTile;
    case 'completed':
      return GOLD_GRADIENTS.completedPanel;
    case 'claimed':
      return GOLD_GRADIENTS.claimedPanel;
    case 'muted':
      return GOLD_GRADIENTS.mutedPanel;
    case 'quiet':
    default:
      return GOLD_GRADIENTS.quietPanel;
  }
}

export function goldCefrAccent(level: string): {
  accent: string;
  muted: string;
  wash: string;
  card: GoldGradient3;
} {
  switch (level) {
    case 'A1':
      return {
        accent: GOLD_RICH.champagne,
        muted: GOLD_RICH.ivoryMuted,
        wash: GOLD_RICH.mist,
        card: ['#181818', GOLD_RICH.blackPiano, '#11100B'],
      };
    case 'A2':
      return {
        accent: GOLD_RICH.paleGold,
        muted: GOLD_RICH.taupe,
        wash: GOLD_RICH.wash,
        card: ['#161616', GOLD_RICH.blackObsidian, '#141107'],
      };
    case 'B1':
      return {
        accent: GOLD_RICH.metalGold,
        muted: GOLD_RICH.taupe,
        wash: GOLD_RICH.washStrong,
        card: [GOLD_RICH.graphiteWarm, '#090909', '#171106'],
      };
    case 'B2':
    default:
      return {
        accent: GOLD_RICH.antiqueGold,
        muted: GOLD_RICH.agedGold,
        wash: GOLD_RICH.bronzeWash,
        card: [GOLD_RICH.bronzeSurface, GOLD_RICH.blackObsidian, '#120C04'],
      };
  }
}

export function goldTaskAccent(type: string, state?: { completed?: boolean; claimed?: boolean; bonus?: boolean }): string {
  if (state?.claimed) return GOLD_RICH.agedGold;
  if (state?.completed) return GOLD_RICH.champagne;
  if (state?.bonus) return GOLD_RICH.paleGold;
  if (type.includes('hard') || type.includes('arena') || type.includes('diagnostic')) return GOLD_RICH.antiqueGold;
  if (type.includes('quiz')) return GOLD_RICH.paleGold;
  if (type.includes('flashcard') || type.includes('words') || type.includes('verb')) return GOLD_RICH.metalGold;
  if (type.includes('theory') || type.includes('energy')) return GOLD_RICH.antiqueGold;
  if (type.includes('friend')) return GOLD_RICH.agedGold;
  return GOLD_RICH.metalGold;
}
