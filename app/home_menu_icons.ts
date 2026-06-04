import type { ImageSourcePropType } from 'react-native';
import type { ThemeMode } from '../constants/theme';

/**
 * Иконки главного меню по теме (уроки, квизы, карточки, задания, тест, экзамен, магазин, арена, карта героя).
 * Все require статические — для Metro.
 */
export type HomeMenuImageSet = {
  lesson: ImageSourcePropType;
  quizes: ImageSourcePropType;
  cards: ImageSourcePropType;
  dayTasks: ImageSourcePropType;
  league: ImageSourcePropType;
  test: ImageSourcePropType;
  practice: ImageSourcePropType;
  exam: ImageSourcePropType;
  shop: ImageSourcePropType;
  arena: ImageSourcePropType;
  heroMap: ImageSourcePropType;
};

export function getHomeMenuImages(themeMode: ThemeMode): HomeMenuImageSet {
  if (themeMode === 'minimalLight') {
    return {
      lesson: require('../assets/images/home_menu/home-minimal-light-lessons.webp'),
      quizes: require('../assets/images/home_menu/home-minimal-light-quizzes.webp'),
      cards: require('../assets/images/home_menu/home-minimal-light-cards.webp'),
      dayTasks: require('../assets/images/home_menu/home-minimal-light-daily-tasks.webp'),
      league: require('../assets/images/home_menu/home-minimal-light-league.webp'),
      test: require('../assets/images/home_menu/home-minimal-light-diagnostic-test.webp'),
      practice: require('../assets/images/home_menu/home-minimal-light-practice.webp'),
      exam: require('../assets/images/levels/exam-minimal-light.webp'),
      shop: require('../assets/images/levels/shop grafit.webp'),
      arena: require('../assets/images/levels/arena grafit.webp'),
      heroMap: require('../assets/images/levels/her man grafit.webp'),
    };
  }
  if (themeMode === 'minimalDark') {
    return {
      lesson: require('../assets/images/home_menu/home-minimal-dark-lessons.webp'),
      quizes: require('../assets/images/home_menu/home-minimal-dark-quizzes.webp'),
      cards: require('../assets/images/home_menu/home-minimal-dark-cards.webp'),
      dayTasks: require('../assets/images/home_menu/home-minimal-dark-daily-tasks.webp'),
      league: require('../assets/images/home_menu/home-minimal-dark-league.webp'),
      test: require('../assets/images/home_menu/home-minimal-dark-diagnostic-test.webp'),
      practice: require('../assets/images/home_menu/home-minimal-dark-practice.webp'),
      exam: require('../assets/images/levels/exam-minimal-dark.webp'),
      shop: require('../assets/images/levels/shop fog.webp'),
      arena: require('../assets/images/levels/arena fog.webp'),
      heroMap: require('../assets/images/levels/her man fog.webp'),
    };
  }
  if (themeMode === 'compass') {
    return {
      lesson: require('../assets/images/home_menu/compass-premium/home-compass-premium-lessons.webp'),
      quizes: require('../assets/images/home_menu/compass-premium/home-compass-premium-quizzes.webp'),
      cards: require('../assets/images/home_menu/compass-premium/home-compass-premium-cards.webp'),
      dayTasks: require('../assets/images/home_menu/compass-premium/home-compass-premium-daily-tasks.webp'),
      league: require('../assets/images/home_menu/compass-premium/home-compass-premium-league.webp'),
      test: require('../assets/images/home_menu/compass-premium/home-compass-premium-diagnostic-test.webp'),
      practice: require('../assets/images/home_menu/compass-premium/home-compass-premium-practice.webp'),
      exam: require('../assets/images/home_menu/compass-premium/home-compass-premium-exam.webp'),
      shop: require('../assets/images/home_menu/compass-premium/home-compass-premium-shop.webp'),
      arena: require('../assets/images/home_menu/compass-premium/home-compass-premium-arena.webp'),
      heroMap: require('../assets/images/home_menu/compass-premium/home-compass-premium-hero-map.webp'),
    };
  }
  if (themeMode === 'gold') {
    return {
      lesson: require('../assets/images/home_menu/home-gold-lessons.webp'),
      quizes: require('../assets/images/home_menu/home-gold-quizzes.webp'),
      cards: require('../assets/images/home_menu/home-gold-cards.webp'),
      dayTasks: require('../assets/images/home_menu/home-gold-daily-tasks.webp'),
      league: require('../assets/images/home_menu/home-gold-league.webp'),
      test: require('../assets/images/home_menu/home-gold-diagnostic-test.webp'),
      practice: require('../assets/images/home_menu/home-gold-practice.webp'),
      exam: require('../assets/images/levels/exam-gold.webp'),
      shop: require('../assets/images/levels/shop fog.webp'),
      arena: require('../assets/images/levels/arena golfd.webp'),
      heroMap: require('../assets/images/levels/her man fog.webp'),
    };
  }
  if (themeMode === 'coral') {
    return {
      lesson: require('../assets/images/home_menu/home-coral-lessons.webp'),
      quizes: require('../assets/images/home_menu/home-coral-quizzes.webp'),
      cards: require('../assets/images/home_menu/home-coral-cards.webp'),
      dayTasks: require('../assets/images/home_menu/home-coral-daily-tasks.webp'),
      league: require('../assets/images/home_menu/home-coral-league.webp'),
      test: require('../assets/images/home_menu/home-coral-diagnostic-test.webp'),
      practice: require('../assets/images/home_menu/home-coral-practice.webp'),
      exam: require('../assets/images/levels/exam-coral.webp'),
      shop: require('../assets/images/levels/SHOP CORAL.webp'),
      arena: require('../assets/images/levels/ARENA CORAL.webp'),
      heroMap: require('../assets/images/levels/hero map ocean.webp'),
    };
  }
  if (themeMode === 'neon') {
    return {
      lesson: require('../assets/images/home_menu/home-neon-lessons.webp'),
      quizes: require('../assets/images/home_menu/home-neon-quizzes.webp'),
      cards: require('../assets/images/home_menu/home-neon-cards.webp'),
      dayTasks: require('../assets/images/home_menu/home-neon-daily-tasks.webp'),
      league: require('../assets/images/home_menu/home-neon-league.webp'),
      test: require('../assets/images/home_menu/home-neon-diagnostic-test.webp'),
      practice: require('../assets/images/home_menu/home-neon-practice.webp'),
      exam: require('../assets/images/levels/exam-neon.webp'),
      shop: require('../assets/images/levels/SHOP NEON.webp'),
      arena: require('../assets/images/levels/ARENA NEON.webp'),
      heroMap: require('../assets/images/levels/hero man neon.webp'),
    };
  }
  return {
    lesson: require('../assets/images/home_menu/home-forest-lessons.webp'),
    quizes: require('../assets/images/home_menu/home-forest-quizzes.webp'),
    cards: require('../assets/images/home_menu/home-forest-cards.webp'),
    dayTasks: require('../assets/images/home_menu/home-forest-daily-tasks.webp'),
    league: require('../assets/images/home_menu/home-forest-league.webp'),
    test: require('../assets/images/home_menu/home-forest-diagnostic-test.webp'),
    practice: require('../assets/images/home_menu/home-forest-practice.webp'),
    exam: require('../assets/images/levels/exam-dark.webp'),
    shop: require('../assets/images/levels/SHOP FOREST.webp'),
    arena: require('../assets/images/levels/ARENA FOREST.webp'),
    heroMap: require('../assets/images/levels/her man foret.webp'),
  };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
