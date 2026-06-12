import type { ImageSourcePropType } from 'react-native';

import { AT_THE_DOCTOR_SKYLER_PACK } from './quiz_thematic_at_the_doctor';
import { BODY_AND_HEALTH_SKYLER_PACK } from './quiz_thematic_body_and_health';
import { SHOPPING_AND_MONEY_SKYLER_PACK } from './quiz_thematic_shopping_and_money';
import type { ThematicQuizCategory } from './quiz_thematic_registry';

type ThemeAssetMap = Record<string, ImageSourcePropType>;

const doctorCardBackgrounds: ThemeAssetMap = {
  forest: require('../assets/images/quizzes/theme_cards/quiz-theme-at-the-doctor-forest.webp'),
  dark: require('../assets/images/quizzes/theme_cards/quiz-theme-at-the-doctor-dark.webp'),
  neonGreen: require('../assets/images/quizzes/theme_cards/quiz-theme-at-the-doctor-neon-green.webp'),
  gold: require('../assets/images/quizzes/theme_cards/quiz-theme-at-the-doctor-gold.webp'),
  coral: require('../assets/images/quizzes/theme_cards/quiz-theme-at-the-doctor-coral.webp'),
  minimalDark: require('../assets/images/quizzes/theme_cards/quiz-theme-at-the-doctor-minimal-dark.webp'),
};

const doctorLogos: ThemeAssetMap = {
  forest: require('../assets/images/quizzes/theme_logos/quiz-theme-at-the-doctor-forest.webp'),
  dark: require('../assets/images/quizzes/theme_logos/quiz-theme-at-the-doctor-dark.webp'),
  neonGreen: require('../assets/images/quizzes/theme_logos/quiz-theme-at-the-doctor-neon-green.webp'),
  gold: require('../assets/images/quizzes/theme_logos/quiz-theme-at-the-doctor-gold.webp'),
  coral: require('../assets/images/quizzes/theme_logos/quiz-theme-at-the-doctor-coral.webp'),
  minimalDark: require('../assets/images/quizzes/theme_logos/quiz-theme-at-the-doctor-minimal-dark.webp'),
  midnight: require('../assets/images/quizzes/theme_logos/quiz-theme-at-the-doctor-midnight.webp'),
  ember: require('../assets/images/quizzes/theme_logos/quiz-theme-at-the-doctor-ember.webp'),
  aurora: require('../assets/images/quizzes/theme_logos/quiz-theme-at-the-doctor-aurora.webp'),
  volt: require('../assets/images/quizzes/theme_logos/quiz-theme-at-the-doctor-volt.webp'),
};

const bodyCardBackgrounds: ThemeAssetMap = {
  forest: require('../assets/images/quizzes/theme_cards/quiz-theme-body-and-health-forest.webp'),
  dark: require('../assets/images/quizzes/theme_cards/quiz-theme-body-and-health-dark.webp'),
  neonGreen: require('../assets/images/quizzes/theme_cards/quiz-theme-body-and-health-neon-green.webp'),
  gold: require('../assets/images/quizzes/theme_cards/quiz-theme-body-and-health-gold.webp'),
  coral: require('../assets/images/quizzes/theme_cards/quiz-theme-body-and-health-coral.webp'),
  minimalDark: require('../assets/images/quizzes/theme_cards/quiz-theme-body-and-health-minimal-dark.webp'),
};

const bodyLogos: ThemeAssetMap = {
  forest: require('../assets/images/quizzes/theme_logos/quiz-theme-body-and-health-forest.webp'),
  dark: require('../assets/images/quizzes/theme_logos/quiz-theme-body-and-health-dark.webp'),
  neonGreen: require('../assets/images/quizzes/theme_logos/quiz-theme-body-and-health-neon-green.webp'),
  gold: require('../assets/images/quizzes/theme_logos/quiz-theme-body-and-health-gold.webp'),
  coral: require('../assets/images/quizzes/theme_logos/quiz-theme-body-and-health-coral.webp'),
  minimalDark: require('../assets/images/quizzes/theme_logos/quiz-theme-body-and-health-minimal-dark.webp'),
  midnight: require('../assets/images/quizzes/theme_logos/quiz-theme-body-and-health-midnight.webp'),
  ember: require('../assets/images/quizzes/theme_logos/quiz-theme-body-and-health-ember.webp'),
  aurora: require('../assets/images/quizzes/theme_logos/quiz-theme-body-and-health-aurora.webp'),
  volt: require('../assets/images/quizzes/theme_logos/quiz-theme-body-and-health-volt.webp'),
};

const shoppingCardBackgrounds: ThemeAssetMap = {
  forest: require('../assets/images/quizzes/theme_cards/quiz-theme-shopping-and-money-forest.webp'),
  dark: require('../assets/images/quizzes/theme_cards/quiz-theme-shopping-and-money-dark.webp'),
  neonGreen: require('../assets/images/quizzes/theme_cards/quiz-theme-shopping-and-money-neon-green.webp'),
  gold: require('../assets/images/quizzes/theme_cards/quiz-theme-shopping-and-money-gold.webp'),
  coral: require('../assets/images/quizzes/theme_cards/quiz-theme-shopping-and-money-coral.webp'),
  minimalDark: require('../assets/images/quizzes/theme_cards/quiz-theme-shopping-and-money-minimal-dark.webp'),
};

const shoppingLogos: ThemeAssetMap = {
  forest: require('../assets/images/quizzes/theme_logos/quiz-theme-shopping-and-money-forest.webp'),
  dark: require('../assets/images/quizzes/theme_logos/quiz-theme-shopping-and-money-dark.webp'),
  neonGreen: require('../assets/images/quizzes/theme_logos/quiz-theme-shopping-and-money-neon-green.webp'),
  gold: require('../assets/images/quizzes/theme_logos/quiz-theme-shopping-and-money-gold.webp'),
  coral: require('../assets/images/quizzes/theme_logos/quiz-theme-shopping-and-money-coral.webp'),
  minimalDark: require('../assets/images/quizzes/theme_logos/quiz-theme-shopping-and-money-minimal-dark.webp'),
  midnight: require('../assets/images/quizzes/theme_logos/quiz-theme-shopping-and-money-midnight.webp'),
  ember: require('../assets/images/quizzes/theme_logos/quiz-theme-shopping-and-money-ember.webp'),
  aurora: require('../assets/images/quizzes/theme_logos/quiz-theme-shopping-and-money-aurora.webp'),
  volt: require('../assets/images/quizzes/theme_logos/quiz-theme-shopping-and-money-volt.webp'),
};

const AT_THE_DOCTOR_CATEGORY: ThematicQuizCategory = {
  id: 'at-the-doctor',
  target: 'en',
  title: {
    ru: 'У врача',
    uk: 'У лікаря',
    es: 'En el medico',
    'pt-BR': 'No medico',
    vi: 'O phong kham',
    id: 'Di dokter',
    tr: 'Doktorda',
    pl: 'U lekarza',
  },
  subtitle: {
    ru: 'Прием, симптомы и простые слова',
    uk: 'Прийом, симптоми й прості слова',
    es: 'Citas, sintomas y palabras sencillas',
    'pt-BR': 'Consultas, sintomas e palavras simples',
    vi: 'Lich hen, trieu chung va tu don gian',
    id: 'Janji, gejala, dan kata sederhana',
    tr: 'Randevu, belirtiler ve basit kelimeler',
    pl: 'Wizyta, objawy i proste slowa',
  },
  badge: 'DEV HEALTH',
  accent: '#38BDF8',
  pack: AT_THE_DOCTOR_SKYLER_PACK,
  cardBackgrounds: doctorCardBackgrounds,
  logos: doctorLogos,
};

const BODY_AND_HEALTH_CATEGORY: ThematicQuizCategory = {
  id: 'body-and-health',
  target: 'en',
  title: {
    ru: 'Тело и здоровье',
    uk: 'Тіло і здоров’я',
    es: 'Cuerpo y salud',
    'pt-BR': 'Corpo e saúde',
    vi: 'Cơ thể và sức khỏe',
    id: 'Tubuh dan kesehatan',
    tr: 'Vücut ve sağlık',
    pl: 'Ciało i zdrowie',
  },
  subtitle: {
    ru: 'Части тела и простые слова о самочувствии',
    uk: 'Частини тіла й прості слова про самопочуття',
    es: 'Partes del cuerpo y palabras sencillas de salud',
    'pt-BR': 'Partes do corpo e palavras simples de saúde',
    vi: 'Bộ phận cơ thể và từ sức khỏe đơn giản',
    id: 'Bagian tubuh dan kata kesehatan sederhana',
    tr: 'Vücut bölümleri ve basit sağlık kelimeleri',
    pl: 'Części ciała i proste słowa o zdrowiu',
  },
  badge: 'DEV BODY',
  accent: '#22D3EE',
  pack: BODY_AND_HEALTH_SKYLER_PACK,
  cardBackgrounds: bodyCardBackgrounds,
  logos: bodyLogos,
};

const SHOPPING_AND_MONEY_CATEGORY: ThematicQuizCategory = {
  id: 'shopping-and-money',
  target: 'en',
  title: {
    ru: 'Покупки и деньги',
    uk: 'Покупки й гроші',
    es: 'Compras y dinero',
    'pt-BR': 'Compras e dinheiro',
    vi: 'Mua sắm và tiền',
    id: 'Belanja dan uang',
    tr: 'Alışveriş ve para',
    pl: 'Zakupy i pieniądze',
  },
  subtitle: {
    ru: 'Магазин, оплата и базовые слова',
    uk: 'Магазин, оплата й базові слова',
    es: 'Tienda, pagos y palabras básicas',
    'pt-BR': 'Loja, pagamento e palavras básicas',
    vi: 'Cửa hàng, thanh toán và từ cơ bản',
    id: 'Toko, pembayaran, dan kata dasar',
    tr: 'Mağaza, ödeme ve temel kelimeler',
    pl: 'Sklep, płatność i podstawowe słowa',
  },
  badge: 'DEV SHOP',
  accent: '#FACC15',
  pack: SHOPPING_AND_MONEY_SKYLER_PACK,
  cardBackgrounds: shoppingCardBackgrounds,
  logos: shoppingLogos,
};

export const DEV_THEMATIC_QUIZ_CATEGORIES = [
  AT_THE_DOCTOR_CATEGORY,
  BODY_AND_HEALTH_CATEGORY,
  SHOPPING_AND_MONEY_CATEGORY,
] as const satisfies readonly ThematicQuizCategory[];
