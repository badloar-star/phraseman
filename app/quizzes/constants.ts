// Shared static config for quizzes UI and level mapping.
export type Level = 'easy' | 'medium' | 'hard';

export const LEVEL_IMAGES: Record<string, number> = {
  easy: require('../../assets/images/levels/easy.webp'),
  medium: require('../../assets/images/levels/medium.webp'),
  hard: require('../../assets/images/levels/hard.webp'),
};

// Card palette by theme and level.
export const THEME_PALETTES: Record<string, Record<Level, { gradA: string; gradB: string; accent: string }>> = {
  dark: {
    easy: { gradA: '#0A2840', gradB: '#040F1A', accent: '#38BDF8' },
    medium: { gradA: '#3A0A14', gradB: '#180508', accent: '#F87171' },
    hard: { gradA: '#1A0A38', gradB: '#08041A', accent: '#A78BFA' },
  },
  light: {
    easy: { gradA: '#BAE6FD', gradB: '#E0F2FE', accent: '#0284C7' },
    medium: { gradA: '#FECDD3', gradB: '#FFF1F2', accent: '#BE123C' },
    hard: { gradA: '#E9D5FF', gradB: '#F5F3FF', accent: '#6D28D9' },
  },
  neon: {
    easy: { gradA: '#003D3D', gradB: '#000D0D', accent: '#00F5FF' },
    medium: { gradA: '#3D0025', gradB: '#0D000A', accent: '#FF006E' },
    hard: { gradA: '#1E2D00', gradB: '#080A00', accent: '#BFFF00' },
  },
  gold: {
    easy: { gradA: '#2D1E00', gradB: '#0E0800', accent: '#FBB040' },
    medium: { gradA: '#2D0E12', gradB: '#0E0508', accent: '#E8735A' },
    hard: { gradA: '#002D2A', gradB: '#000E0D', accent: '#00B8A9' },
  },
  ocean: {
    easy: { gradA: '#0C2840', gradB: '#1A6FA0', accent: '#30C0FF' },
    medium: { gradA: '#081830', gradB: '#0E5090', accent: '#00B0F0' },
    hard: { gradA: '#040C20', gradB: '#083868', accent: '#00D8FF' },
  },
  sakura: {
    easy: { gradA: '#4A1A2E', gradB: '#A02050', accent: '#E01870' },
    medium: { gradA: '#3A1425', gradB: '#802050', accent: '#E01870' },
    hard: { gradA: '#2A0C18', gradB: '#601040', accent: '#FF2D6A' },
  },
};

// DEPRECATED: Use theme.textPrimary and theme.textMuted directly.
export const THEME_TEXT: Record<string, { primary: string; secondary: string }> = {
  dark: { primary: '#FFFFFF', secondary: 'rgba(255,255,255,0.6)' },
  light: { primary: '#0F172A', secondary: 'rgba(15,23,42,0.6)' },
  neon: { primary: '#FFFFFF', secondary: 'rgba(255,255,255,0.6)' },
  gold: { primary: '#FFFFFF', secondary: 'rgba(255,255,255,0.6)' },
  ocean: { primary: 'rgba(240,252,255,0.96)', secondary: 'rgba(200,230,255,0.78)' },
  sakura: { primary: 'rgba(255,248,252,0.96)', secondary: 'rgba(255,210,230,0.78)' },
};

export const LEVEL_CONFIG = {
  easy: {
    labelRU: 'Легко',
    labelUK: 'Легко',
    labelES: 'Fácil',
    sub: 'A1–A2',
    color: '#4ADE80',
    pts: 1,
    tagRU: 'Простые фразы повседневной речи',
    tagUK: 'Прості фрази повсякденної мови',
    tagES: 'Frases cotidianas sencillas',
    icon: '🌿',
  },
  medium: {
    labelRU: 'Средне',
    labelUK: 'Середньо',
    labelES: 'Medio',
    sub: 'B1–B2',
    color: '#FB923C',
    pts: 2,
    tagRU: 'Сложнее — больше опыта за серию',
    tagUK: 'Складніше — більше досвіду за серію',
    tagES: 'Más difícil: más XP por racha',
    icon: '🔥',
  },
  hard: {
    labelRU: 'Сложно',
    labelUK: 'Складно',
    labelES: 'Difícil',
    sub: 'C1–C2',
    color: '#A78BFA',
    pts: 3,
    tagRU: 'Элитный уровень. Максимум опыта',
    tagUK: 'Елітний рівень. Максимум досвіду',
    tagES: 'Nivel avanzado. Máximo XP',
    icon: '💎',
  },
} as const;

/** AsyncStorage: settings_testers / Maestro — открыть quizzes_screen сразу на экране результата */
export const QUIZ_E2E_OPEN_RESULTS_KEY = '__phraseman_quiz_e2e_results__';

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
