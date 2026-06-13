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
  dialogs: ImageSourcePropType;
  exam: ImageSourcePropType;
  shop: ImageSourcePropType;
  arena: ImageSourcePropType;
  heroMap: ImageSourcePropType;
};

export function getHomeMenuImages(themeMode: ThemeMode): HomeMenuImageSet {
  if (themeMode === 'minimalDark') {
    return {
      lesson: require('../assets/images/home_menu/home-minimal-dark-lessons.webp'),
      quizes: require('../assets/images/home_menu/home-minimal-dark-quizzes.webp'),
      cards: require('../assets/images/home_menu/home-minimal-dark-cards.webp'),
      dayTasks: require('../assets/images/home_menu/home-minimal-dark-daily-tasks.webp'),
      league: require('../assets/images/home_menu/home-minimal-dark-league.webp'),
      test: require('../assets/images/home_menu/home-minimal-dark-diagnostic-test.webp'),
      practice: require('../assets/images/home_menu/home-minimal-dark-practice.webp'),
      dialogs: require('../assets/images/home_menu/home-minimal-dark-dialogs.webp'),
      exam: require('../assets/images/levels/exam-minimal-dark.webp'),
      shop: require('../assets/images/levels/shop fog.webp'),
      arena: require('../assets/images/levels/arena fog.webp'),
      heroMap: require('../assets/images/levels/her man fog.webp'),
    };
  }
  if (themeMode === 'midnight') {
    return {
      lesson: require('../assets/images/home_menu/midnight/home-midnight-lessons.webp'),
      quizes: require('../assets/images/home_menu/midnight/home-midnight-quizzes.webp'),
      cards: require('../assets/images/home_menu/midnight/home-midnight-cards.webp'),
      dayTasks: require('../assets/images/home_menu/midnight/home-midnight-daily-tasks.webp'),
      league: require('../assets/images/home_menu/midnight/home-midnight-league.webp'),
      test: require('../assets/images/home_menu/midnight/home-midnight-diagnostic-test.webp'),
      practice: require('../assets/images/home_menu/midnight/home-midnight-practice.webp'),
      dialogs: require('../assets/images/home_menu/midnight/home-midnight-dialogs.webp'),
      exam: require('../assets/images/home_menu/midnight/home-midnight-exam.webp'),
      shop: require('../assets/images/home_menu/midnight/home-midnight-shop.webp'),
      arena: require('../assets/images/home_menu/midnight/home-midnight-arena.webp'),
      heroMap: require('../assets/images/home_menu/midnight/home-midnight-hero-map.webp'),
    };
  }
  if (themeMode === 'ember') {
    return {
      lesson: require('../assets/images/home_menu/ember/home-ember-lessons.webp'),
      quizes: require('../assets/images/home_menu/ember/home-ember-quizzes.webp'),
      cards: require('../assets/images/home_menu/ember/home-ember-cards.webp'),
      dayTasks: require('../assets/images/home_menu/ember/home-ember-daily-tasks.webp'),
      league: require('../assets/images/home_menu/ember/home-ember-league.webp'),
      test: require('../assets/images/home_menu/ember/home-ember-diagnostic-test.webp'),
      practice: require('../assets/images/home_menu/ember/home-ember-practice.webp'),
      dialogs: require('../assets/images/home_menu/ember/home-ember-dialogs.webp'),
      exam: require('../assets/images/home_menu/ember/home-ember-exam.webp'),
      shop: require('../assets/images/home_menu/ember/home-ember-shop.webp'),
      arena: require('../assets/images/home_menu/ember/home-ember-arena.webp'),
      heroMap: require('../assets/images/home_menu/ember/home-ember-hero-map.webp'),
    };
  }
  if (themeMode === 'aurora') {
    return {
      lesson: require('../assets/images/home_menu/aurora/home-aurora-lessons.webp'),
      quizes: require('../assets/images/home_menu/aurora/home-aurora-quizzes.webp'),
      cards: require('../assets/images/home_menu/aurora/home-aurora-cards.webp'),
      dayTasks: require('../assets/images/home_menu/aurora/home-aurora-daily-tasks.webp'),
      league: require('../assets/images/home_menu/aurora/home-aurora-league.webp'),
      test: require('../assets/images/home_menu/aurora/home-aurora-diagnostic-test.webp'),
      practice: require('../assets/images/home_menu/aurora/home-aurora-practice.webp'),
      dialogs: require('../assets/images/home_menu/aurora/home-aurora-dialogs.webp'),
      exam: require('../assets/images/home_menu/aurora/home-aurora-exam.webp'),
      shop: require('../assets/images/home_menu/aurora/home-aurora-shop.webp'),
      arena: require('../assets/images/home_menu/aurora/home-aurora-arena.webp'),
      heroMap: require('../assets/images/home_menu/aurora/home-aurora-hero-map.webp'),
    };
  }
  if (themeMode === 'volt') {
    return {
      lesson: require('../assets/images/home_menu/volt/home-volt-lessons.webp'),
      quizes: require('../assets/images/home_menu/volt/home-volt-quizzes.webp'),
      cards: require('../assets/images/home_menu/volt/home-volt-cards.webp'),
      dayTasks: require('../assets/images/home_menu/volt/home-volt-daily-tasks.webp'),
      league: require('../assets/images/home_menu/volt/home-volt-league.webp'),
      test: require('../assets/images/home_menu/volt/home-volt-diagnostic-test.webp'),
      practice: require('../assets/images/home_menu/volt/home-volt-practice.webp'),
      dialogs: require('../assets/images/home_menu/volt/home-volt-dialogs.webp'),
      exam: require('../assets/images/home_menu/volt/home-volt-exam.webp'),
      shop: require('../assets/images/home_menu/volt/home-volt-shop.webp'),
      arena: require('../assets/images/home_menu/volt/home-volt-arena.webp'),
      heroMap: require('../assets/images/home_menu/volt/home-volt-hero-map.webp'),
    };
  }
  if (themeMode === 'gold') {
    return {
      lesson: require('../assets/images/home_menu/gold/home-gold-lessons.webp'),
      quizes: require('../assets/images/home_menu/gold/home-gold-quizzes.webp'),
      cards: require('../assets/images/home_menu/gold/home-gold-cards.webp'),
      dayTasks: require('../assets/images/home_menu/gold/home-gold-daily-tasks.webp'),
      league: require('../assets/images/home_menu/gold/home-gold-league.webp'),
      test: require('../assets/images/home_menu/gold/home-gold-diagnostic-test.webp'),
      practice: require('../assets/images/home_menu/gold/home-gold-practice.webp'),
      dialogs: require('../assets/images/home_menu/gold/home-gold-dialogs.webp'),
      exam: require('../assets/images/home_menu/gold/home-gold-exam.webp'),
      shop: require('../assets/images/home_menu/gold/home-gold-shop.webp'),
      arena: require('../assets/images/home_menu/gold/home-gold-arena.webp'),
      heroMap: require('../assets/images/home_menu/gold/home-gold-hero-map.webp'),
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
      dialogs: require('../assets/images/home_menu/home-coral-dialogs.webp'),
      exam: require('../assets/images/levels/exam-coral.webp'),
      shop: require('../assets/images/levels/SHOP CORAL.webp'),
      arena: require('../assets/images/levels/ARENA CORAL.webp'),
      heroMap: require('../assets/images/levels/hero map ocean.webp'),
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
    dialogs: require('../assets/images/home_menu/home-forest-dialogs.webp'),
    exam: require('../assets/images/levels/exam-dark.webp'),
    shop: require('../assets/images/levels/SHOP FOREST.webp'),
    arena: require('../assets/images/levels/ARENA FOREST.webp'),
    heroMap: require('../assets/images/levels/her man foret.webp'),
  };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
