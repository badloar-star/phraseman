// Shared static config for quizzes UI and level mapping.
export type Level = 'easy' | 'medium' | 'hard';

export const LEVEL_IMAGES: Record<string, number> = {
  easy: require('../../assets/images/levels/easy.webp'),
  medium: require('../../assets/images/levels/medium.webp'),
  hard: require('../../assets/images/levels/hard.webp'),
};

export const QUIZ_LEVEL_CARD_BACKGROUNDS: Record<string, Record<Level, number>> = {
  dark: {
    easy: require('../../assets/images/quizzes/level_cards/quiz-card-easy-dark.webp'),
    medium: require('../../assets/images/quizzes/level_cards/quiz-card-medium-dark.webp'),
    hard: require('../../assets/images/quizzes/level_cards/quiz-card-hard-dark.webp'),
  },
  neon: {
    easy: require('../../assets/images/quizzes/level_cards/quiz-card-easy-neon.webp'),
    medium: require('../../assets/images/quizzes/level_cards/quiz-card-medium-neon.webp'),
    hard: require('../../assets/images/quizzes/level_cards/quiz-card-hard-neon.webp'),
  },
  gold: {
    easy: require('../../assets/images/quizzes/level_cards/quiz-card-easy-gold.webp'),
    medium: require('../../assets/images/quizzes/level_cards/quiz-card-medium-gold.webp'),
    hard: require('../../assets/images/quizzes/level_cards/quiz-card-hard-gold.webp'),
  },
  coral: {
    easy: require('../../assets/images/quizzes/level_cards/quiz-card-easy-coral.webp'),
    medium: require('../../assets/images/quizzes/level_cards/quiz-card-medium-coral.webp'),
    hard: require('../../assets/images/quizzes/level_cards/quiz-card-hard-coral.webp'),
  },
  minimalLight: {
    easy: require('../../assets/images/quizzes/level_cards/quiz-card-easy-minimal-light.webp'),
    medium: require('../../assets/images/quizzes/level_cards/quiz-card-medium-minimal-light.webp'),
    hard: require('../../assets/images/quizzes/level_cards/quiz-card-hard-minimal-light.webp'),
  },
  minimalDark: {
    easy: require('../../assets/images/quizzes/level_cards/quiz-card-easy-minimal-dark.webp'),
    medium: require('../../assets/images/quizzes/level_cards/quiz-card-medium-minimal-dark.webp'),
    hard: require('../../assets/images/quizzes/level_cards/quiz-card-hard-minimal-dark.webp'),
  },
};

export const QUIZ_LEVEL_LOGOS: Record<string, Record<Level, number>> = {
  dark: {
    easy: require('../../assets/images/quizzes/level_logos/quiz-logo-easy-dark.webp'),
    medium: require('../../assets/images/quizzes/level_logos/quiz-logo-medium-dark.webp'),
    hard: require('../../assets/images/quizzes/level_logos/quiz-logo-hard-dark.webp'),
  },
  neon: {
    easy: require('../../assets/images/quizzes/level_logos/quiz-logo-easy-neon.webp'),
    medium: require('../../assets/images/quizzes/level_logos/quiz-logo-medium-neon.webp'),
    hard: require('../../assets/images/quizzes/level_logos/quiz-logo-hard-neon.webp'),
  },
  gold: {
    easy: require('../../assets/images/quizzes/level_logos/quiz-logo-easy-gold.webp'),
    medium: require('../../assets/images/quizzes/level_logos/quiz-logo-medium-gold.webp'),
    hard: require('../../assets/images/quizzes/level_logos/quiz-logo-hard-gold.webp'),
  },
  coral: {
    easy: require('../../assets/images/quizzes/level_logos/quiz-logo-easy-coral.webp'),
    medium: require('../../assets/images/quizzes/level_logos/quiz-logo-medium-coral.webp'),
    hard: require('../../assets/images/quizzes/level_logos/quiz-logo-hard-coral.webp'),
  },
  minimalLight: {
    easy: require('../../assets/images/quizzes/level_logos/quiz-logo-easy-minimal-light.webp'),
    medium: require('../../assets/images/quizzes/level_logos/quiz-logo-medium-minimal-light.webp'),
    hard: require('../../assets/images/quizzes/level_logos/quiz-logo-hard-minimal-light.webp'),
  },
  minimalDark: {
    easy: require('../../assets/images/quizzes/level_logos/quiz-logo-easy-minimal-dark.webp'),
    medium: require('../../assets/images/quizzes/level_logos/quiz-logo-medium-minimal-dark.webp'),
    hard: require('../../assets/images/quizzes/level_logos/quiz-logo-hard-minimal-dark.webp'),
  },
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
    easy: { gradA: '#2A210F', gradB: '#080705', accent: '#F1CC72' },
    medium: { gradA: '#24180A', gradB: '#070504', accent: '#D7AD56' },
    hard: { gradA: '#191108', gradB: '#040403', accent: '#FFE3A0' },
  },
  coral: {
    easy: { gradA: '#2A2024', gradB: '#3A2A2E', accent: '#4A90FF' },
    medium: { gradA: '#2B1E22', gradB: '#463036', accent: '#FF6464' },
    hard: { gradA: '#140D0F', gradB: '#3A2A2E', accent: '#FFD060' },
  },
  minimalLight: {
    easy: { gradA: '#F7EFDF', gradB: '#E6D4B6', accent: '#2F8C66' },
    medium: { gradA: '#F3E8D9', gradB: '#E4C8A8', accent: '#B65E3A' },
    hard: { gradA: '#EFEAF7', gradB: '#D5C6EA', accent: '#6D5EBA' },
  },
  minimalDark: {
    easy: { gradA: '#182624', gradB: '#090F12', accent: '#6EA8FF' },
    medium: { gradA: '#281C1D', gradB: '#10090A', accent: '#F26D6D' },
    hard: { gradA: '#1F1B2E', gradB: '#0B0914', accent: '#A78BFA' },
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
  coral: { primary: '#FFFFFF', secondary: '#D8C2C5' },
  minimalLight: { primary: '#2E261B', secondary: 'rgba(46,38,27,0.66)' },
  minimalDark: { primary: '#F5F5F5', secondary: 'rgba(245,245,245,0.64)' },
  ocean: { primary: 'rgba(240,252,255,0.96)', secondary: 'rgba(200,230,255,0.78)' },
  sakura: { primary: 'rgba(255,248,252,0.96)', secondary: 'rgba(255,210,230,0.78)' },
};

export const LEVEL_CONFIG = {
  easy: {
    labelRU: 'Легко',
    labelUK: 'Легко',
    labelES: 'Fácil',
    labelPTBR: 'Fácil',
    labelVI: 'Dễ',
    labelID: 'Mudah',
    labelTR: 'Kolay',
    labelPL: 'Łatwy',
    sub: 'A1-A2',
    color: '#4ADE80',
    pts: 1,
    tagRU: 'Простые фразы повседневной речи',
    tagUK: 'Прості фрази повсякденної мови',
    tagES: 'Frases cotidianas sencillas',
    tagPTBR: 'Frases simples do dia a dia',
    tagVI: 'Các cụm từ đơn giản hằng ngày',
    tagID: 'Frasa sederhana sehari-hari',
    tagTR: 'Günlük hayattan basit ifadeler',
    tagPL: 'Proste codzienne zwroty',
    icon: '🌿',
  },
  medium: {
    labelRU: 'Средне',
    labelUK: 'Середньо',
    labelES: 'Medio',
    labelPTBR: 'Médio',
    labelVI: 'Trung bình',
    labelID: 'Sedang',
    labelTR: 'Orta',
    labelPL: 'Średni',
    sub: 'B1-B2',
    color: '#FB923C',
    pts: 2,
    tagRU: 'Сложнее - больше опыта за серию',
    tagUK: 'Складніше - більше досвіду за серію',
    tagES: 'Más difícil: más XP por racha',
    tagPTBR: 'Mais difícil: mais XP por sequência',
    tagVI: 'Khó hơn: nhiều XP hơn theo chuỗi',
    tagID: 'Lebih sulit: lebih banyak XP per streak',
    tagTR: 'Daha zor: seri başına daha fazla XP',
    tagPL: 'Trudniej: więcej XP za serię',
    icon: '🔥',
  },
  hard: {
    labelRU: 'Сложно',
    labelUK: 'Складно',
    labelES: 'Difícil',
    labelPTBR: 'Difícil',
    labelVI: 'Khó',
    labelID: 'Sulit',
    labelTR: 'Zor',
    labelPL: 'Trudny',
    sub: 'C1-C2',
    color: '#A78BFA',
    pts: 3,
    tagRU: 'Элитный уровень. Максимум опыта',
    tagUK: 'Елітний рівень. Максимум досвіду',
    tagES: 'Nivel avanzado. Máximo XP',
    tagPTBR: 'Nível avançado. XP máximo',
    tagVI: 'Cấp nâng cao. XP tối đa',
    tagID: 'Level lanjutan. XP maksimal',
    tagTR: 'İleri seviye. Maksimum XP',
    tagPL: 'Poziom zaawansowany. Maksimum XP',
    icon: '💎',
  },
} as const;

/** AsyncStorage: settings_testers / Maestro — открыть quizzes_screen сразу на экране результата */
export const QUIZ_E2E_OPEN_RESULTS_KEY = '__phraseman_quiz_e2e_results__';

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
