import type { ImageSourcePropType } from 'react-native';

import { AT_THE_DOCTOR_SKYLER_PACK } from './quiz_thematic_at_the_doctor';
import { HOME_AND_ROOMS_SKYLER_PACK } from './quiz_thematic_home_and_rooms';
import type { ThematicQuizCategory } from './quiz_thematic_registry';

type ThemeAssetMap = Record<string, ImageSourcePropType>;

const homeCardBackgrounds: ThemeAssetMap = {
  forest: require('../assets/images/quizzes/theme_cards/quiz-theme-home-and-rooms-forest.webp'),
  dark: require('../assets/images/quizzes/theme_cards/quiz-theme-home-and-rooms-dark.webp'),
  neon: require('../assets/images/quizzes/theme_cards/quiz-theme-home-and-rooms-neon.webp'),
  neonGreen: require('../assets/images/quizzes/theme_cards/quiz-theme-home-and-rooms-neon-green.webp'),
  gold: require('../assets/images/quizzes/theme_cards/quiz-theme-home-and-rooms-gold.webp'),
  coral: require('../assets/images/quizzes/theme_cards/quiz-theme-home-and-rooms-coral.webp'),
  minimalLight: require('../assets/images/quizzes/theme_cards/quiz-theme-home-and-rooms-minimal-light.webp'),
  minimalDark: require('../assets/images/quizzes/theme_cards/quiz-theme-home-and-rooms-minimal-dark.webp'),
};

const homeLogos: ThemeAssetMap = {
  forest: require('../assets/images/quizzes/theme_logos/quiz-theme-home-and-rooms-forest.webp'),
  dark: require('../assets/images/quizzes/theme_logos/quiz-theme-home-and-rooms-dark.webp'),
  neon: require('../assets/images/quizzes/theme_logos/quiz-theme-home-and-rooms-neon.webp'),
  neonGreen: require('../assets/images/quizzes/theme_logos/quiz-theme-home-and-rooms-neon-green.webp'),
  gold: require('../assets/images/quizzes/theme_logos/quiz-theme-home-and-rooms-gold.webp'),
  coral: require('../assets/images/quizzes/theme_logos/quiz-theme-home-and-rooms-coral.webp'),
  minimalLight: require('../assets/images/quizzes/theme_logos/quiz-theme-home-and-rooms-minimal-light.webp'),
  minimalDark: require('../assets/images/quizzes/theme_logos/quiz-theme-home-and-rooms-minimal-dark.webp'),
};

const doctorCardBackgrounds: ThemeAssetMap = {
  forest: require('../assets/images/quizzes/theme_cards/quiz-theme-at-the-doctor-forest.webp'),
  dark: require('../assets/images/quizzes/theme_cards/quiz-theme-at-the-doctor-dark.webp'),
  neon: require('../assets/images/quizzes/theme_cards/quiz-theme-at-the-doctor-neon.webp'),
  neonGreen: require('../assets/images/quizzes/theme_cards/quiz-theme-at-the-doctor-neon-green.webp'),
  gold: require('../assets/images/quizzes/theme_cards/quiz-theme-at-the-doctor-gold.webp'),
  coral: require('../assets/images/quizzes/theme_cards/quiz-theme-at-the-doctor-coral.webp'),
  minimalLight: require('../assets/images/quizzes/theme_cards/quiz-theme-at-the-doctor-minimal-light.webp'),
  minimalDark: require('../assets/images/quizzes/theme_cards/quiz-theme-at-the-doctor-minimal-dark.webp'),
};

const doctorLogos: ThemeAssetMap = {
  forest: require('../assets/images/quizzes/theme_logos/quiz-theme-at-the-doctor-forest.webp'),
  dark: require('../assets/images/quizzes/theme_logos/quiz-theme-at-the-doctor-dark.webp'),
  neon: require('../assets/images/quizzes/theme_logos/quiz-theme-at-the-doctor-neon.webp'),
  neonGreen: require('../assets/images/quizzes/theme_logos/quiz-theme-at-the-doctor-neon-green.webp'),
  gold: require('../assets/images/quizzes/theme_logos/quiz-theme-at-the-doctor-gold.webp'),
  coral: require('../assets/images/quizzes/theme_logos/quiz-theme-at-the-doctor-coral.webp'),
  minimalLight: require('../assets/images/quizzes/theme_logos/quiz-theme-at-the-doctor-minimal-light.webp'),
  minimalDark: require('../assets/images/quizzes/theme_logos/quiz-theme-at-the-doctor-minimal-dark.webp'),
};

const HOME_AND_ROOMS_CATEGORY: ThematicQuizCategory = {
  id: 'home-and-rooms',
  target: 'en',
  title: {
    ru: 'Дом и комнаты',
    uk: 'Дім і кімнати',
    es: 'Casa y habitaciones',
    'pt-BR': 'Casa e cômodos',
    vi: 'Nhà và phòng',
    id: 'Rumah dan ruangan',
    tr: 'Ev ve odalar',
    pl: 'Dom i pokoje',
  },
  subtitle: {
    ru: 'Комнаты, мебель и домашние слова',
    uk: 'Кімнати, меблі й домашні слова',
    es: 'Habitaciones, muebles y palabras de casa',
    'pt-BR': 'Cômodos, móveis e palavras da casa',
    vi: 'Phòng, đồ nội thất và từ vựng trong nhà',
    id: 'Ruangan, perabot, dan kata-kata rumah',
    tr: 'Odalar, mobilyalar ve ev sözcükleri',
    pl: 'Pokoje, meble i domowe słowa',
  },
  badge: 'A1 HOME',
  accent: '#93C5FD',
  pack: HOME_AND_ROOMS_SKYLER_PACK,
  cardBackgrounds: homeCardBackgrounds,
  logos: homeLogos,
};

const AT_THE_DOCTOR_CATEGORY: ThematicQuizCategory = {
  id: 'at-the-doctor',
  target: 'en',
  title: {
    ru: 'У врача',
    uk: 'У лікаря',
    es: 'En el médico',
    'pt-BR': 'No médico',
    vi: 'Ở phòng khám',
    id: 'Di dokter',
    tr: 'Doktorda',
    pl: 'U lekarza',
  },
  subtitle: {
    ru: 'Приём, симптомы и простые слова',
    uk: 'Прийом, симптоми й прості слова',
    es: 'Citas, síntomas y palabras sencillas',
    'pt-BR': 'Consultas, sintomas e palavras simples',
    vi: 'Lịch hẹn, triệu chứng và từ đơn giản',
    id: 'Janji, gejala, dan kata sederhana',
    tr: 'Randevu, belirtiler ve basit kelimeler',
    pl: 'Wizyta, objawy i proste słowa',
  },
  badge: 'A1 HEALTH',
  accent: '#38BDF8',
  pack: AT_THE_DOCTOR_SKYLER_PACK,
  cardBackgrounds: doctorCardBackgrounds,
  logos: doctorLogos,
};

export const DEV_THEMATIC_QUIZ_CATEGORIES = [
  HOME_AND_ROOMS_CATEGORY,
  AT_THE_DOCTOR_CATEGORY,
] as const satisfies readonly ThematicQuizCategory[];
