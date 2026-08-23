/**
 * Decorative palettes for the approved Motion Hybrid surfaces.
 *
 * Keeping raw colors here prevents one-off component literals from drifting
 * away from the shared visual language while preserving each surface's
 * intentional medal, metal, and celebration accents.
 */

export const ARENA_RANK_HYBRID_COLORS = {
  bronzeShield: {
    a: '#F6DCB4',
    b: '#C08A50',
    c: '#6E4520',
    edge: '#3A2410',
    spark: '#FFE9C8',
  },
  lightShield: {
    a: '#F7FAFD',
    b: '#C3CDD9',
    c: '#5D6B7C',
    edge: '#2A3440',
    spark: '#FFFFFF',
  },
  tierUpCtaText: '#241A02',
  bronze: '#C08A50',
  scrim: '#00000066',
  shadow: '#000',
  // зачем: премиум-прогон звёздной лестницы (владелец 2026-08-23) — золото
  // нимба/кольца/цифры деления; контракт палитры запрещает hex в сценах.
  goldHalo: '#FFD43B',
  goldRing: '#FFE082',
  goldSoft: '#FFD86E',
};

export const LEAGUE_RESULT_HYBRID_COLORS = {
  medalTokens: {
    1: { grad: ['#FFE89A', '#E0A124'] as [string, string], ink: '#5A3C06', ring: '#FFF1CC' },
    2: { grad: ['#EAEEF3', '#A9B2BD'] as [string, string], ink: '#3A4150', ring: '#FFFFFF' },
    3: { grad: ['#F0C29A', '#B4774A'] as [string, string], ink: '#4A2D14', ring: '#FBE0CC' },
  },
  shadow: '#000',
  promotionGlow: '#FFD24A',
  demotionGlow: '#C08A50',
  demotionText: '#E8C49A',
  demotionThreshold: '#C0392B55',
  thresholdFlash: '#FFF6D8',
  demotionThresholdText: '#E8A87C',
  demotionMedallion: ['#E8C49A', '#8A6238'] as [string, string],
  promotionMedallionStart: '#FDF3D0',
  medallionInk: '#3A2A06',
  stayShield: '#34C759',
  zoneBonus: '#4A90D9',
};

export const DIALOG_VICTORY_HYBRID_PALETTE = {
  backdrop: '#070b10',
  backdropMid: '#0c1219',
  glow: 'rgba(255, 206, 120, 0.22)',
  gold: '#FFD27A',
  goldBright: '#FFE9B8',
  emerald: '#36E6A0',
  confettiPink: '#FF9EC4',
  confettiBlue: '#7CC8FF',
  ring: '#FFD27A',
  ringTrack: 'rgba(255,255,255,0.10)',
  text: '#FFF6E6',
  textDim: 'rgba(255,246,230,0.62)',
  card: 'rgba(255,255,255,0.06)',
  cta: ['#0F8F66', '#36E6A0', '#0F8F66'] as [string, string, string],
  ctaText: '#04261A',
};

export const PREMIUM_CELEBRATION_HYBRID_COLORS = {
  emblemDiscBottom: '#0f0b03',
};
