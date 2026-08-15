import type { ImageSourcePropType } from 'react-native';
import type { ThemeMode } from '../constants/theme';

/**
 * Иконки главного меню по теме (уроки, квизы, карточки, тест, экзамен, магазин, арена, карта героя).
 * Все require статические — для Metro.
 */
export type HomeMenuImageSet = {
  lesson: ImageSourcePropType;
  cards: ImageSourcePropType;
  league: ImageSourcePropType;
  test: ImageSourcePropType;
  practice: ImageSourcePropType;
  dialogs: ImageSourcePropType;
  exam: ImageSourcePropType;
  shop: ImageSourcePropType;
  heroMap: ImageSourcePropType;
};

export function getHomeMenuImages(themeMode: ThemeMode): HomeMenuImageSet {
  if (themeMode === 'minimalDark' || themeMode === 'candyBlue' || themeMode === 'indigo') {
    return {
      lesson: require('../assets/images/home_menu/indigo/home-indigo-lessons.webp'),
      cards: require('../assets/images/home_menu/indigo/home-indigo-cards.webp'),
      league: require('../assets/images/home_menu/indigo/home-indigo-league.webp'),
      test: require('../assets/images/home_menu/indigo/home-indigo-diagnostic-test.webp'),
      practice: require('../assets/images/home_menu/indigo/home-indigo-practice.webp'),
      dialogs: require('../assets/images/home_menu/indigo/home-indigo-dialogs.webp'),
      exam: require('../assets/images/home_menu/indigo/home-indigo-exam.webp'),
      shop: require('../assets/images/home_menu/indigo/home-indigo-shop.webp'),
      heroMap: require('../assets/images/home_menu/indigo/home-indigo-hero-map.webp'),
    };
  }
  if (themeMode === 'business') {
    return {
      lesson: require('../assets/images/home_menu/business/home-business-lessons-lite.avif'),
      cards: require('../assets/images/home_menu/business/home-business-cards-lite.avif'),
      league: require('../assets/images/home_menu/business/home-business-league-lite.avif'),
      test: require('../assets/images/home_menu/business/home-business-diagnostic-test-lite.avif'),
      practice: require('../assets/images/home_menu/business/home-business-practice-lite.avif'),
      dialogs: require('../assets/images/home_menu/business/home-business-dialogs-lite.avif'),
      exam: require('../assets/images/home_menu/business/home-business-exam-lite.avif'),
      shop: require('../assets/images/home_menu/business/home-business-shop-lite.avif'),
      heroMap: require('../assets/images/home_menu/business/home-business-hero-map-lite.avif'),
    };
  }
  if (themeMode === 'businessLight') {
    return {
      lesson: require('../assets/images/home_menu/businessLight/home-businessLight-lessons-lite.avif'),
      cards: require('../assets/images/home_menu/businessLight/home-businessLight-cards-lite.avif'),
      league: require('../assets/images/home_menu/businessLight/home-businessLight-league-lite.avif'),
      test: require('../assets/images/home_menu/businessLight/home-businessLight-diagnostic-test-lite.avif'),
      practice: require('../assets/images/home_menu/businessLight/home-businessLight-practice-lite.avif'),
      dialogs: require('../assets/images/home_menu/businessLight/home-businessLight-dialogs-lite.avif'),
      exam: require('../assets/images/home_menu/businessLight/home-businessLight-exam-lite.avif'),
      shop: require('../assets/images/home_menu/businessLight/home-businessLight-shop-lite.avif'),
      heroMap: require('../assets/images/home_menu/businessLight/home-businessLight-hero-map-lite.avif'),
    };
  }
  if (themeMode === 'sagePorcelain') {
    return {
      lesson: require('../assets/images/home_menu/sagePorcelain/home-sagePorcelain-lessons.webp'),
      cards: require('../assets/images/home_menu/sagePorcelain/home-sagePorcelain-cards.webp'),
      league: require('../assets/images/home_menu/sagePorcelain/home-sagePorcelain-league.webp'),
      test: require('../assets/images/home_menu/sagePorcelain/home-sagePorcelain-diagnostic-test.webp'),
      practice: require('../assets/images/home_menu/sagePorcelain/home-sagePorcelain-practice.webp'),
      dialogs: require('../assets/images/home_menu/sagePorcelain/home-sagePorcelain-dialogs.webp'),
      exam: require('../assets/images/home_menu/sagePorcelain/home-sagePorcelain-exam.webp'),
      shop: require('../assets/images/home_menu/sagePorcelain/home-sagePorcelain-shop.webp'),
      heroMap: require('../assets/images/home_menu/sagePorcelain/home-sagePorcelain-hero-map.webp'),
    };
  }
  if (themeMode === 'midnight') {
    return {
      lesson: require('../assets/images/home_menu/midnight/home-midnight-lessons.webp'),
      cards: require('../assets/images/home_menu/midnight/home-midnight-cards.webp'),
      league: require('../assets/images/home_menu/midnight/home-midnight-league.webp'),
      test: require('../assets/images/home_menu/midnight/home-midnight-diagnostic-test.webp'),
      practice: require('../assets/images/home_menu/midnight/home-midnight-practice.webp'),
      dialogs: require('../assets/images/home_menu/midnight/home-midnight-dialogs.webp'),
      exam: require('../assets/images/home_menu/midnight/home-midnight-exam.webp'),
      shop: require('../assets/images/home_menu/midnight/home-midnight-shop.webp'),
      heroMap: require('../assets/images/home_menu/midnight/home-midnight-hero-map.webp'),
    };
  }
  if (themeMode === 'ember') {
    return {
      lesson: require('../assets/images/home_menu/ember/home-ember-lessons.webp'),
      cards: require('../assets/images/home_menu/ember/home-ember-cards.webp'),
      league: require('../assets/images/home_menu/ember/home-ember-league.webp'),
      test: require('../assets/images/home_menu/ember/home-ember-diagnostic-test.webp'),
      practice: require('../assets/images/home_menu/ember/home-ember-practice.webp'),
      dialogs: require('../assets/images/home_menu/ember/home-ember-dialogs.webp'),
      exam: require('../assets/images/home_menu/ember/home-ember-exam.webp'),
      shop: require('../assets/images/home_menu/ember/home-ember-shop.webp'),
      heroMap: require('../assets/images/home_menu/ember/home-ember-hero-map.webp'),
    };
  }
  if (themeMode === 'aurora') {
    return {
      lesson: require('../assets/images/home_menu/aurora/home-aurora-lessons.webp'),
      cards: require('../assets/images/home_menu/aurora/home-aurora-cards.webp'),
      league: require('../assets/images/home_menu/aurora/home-aurora-league.webp'),
      test: require('../assets/images/home_menu/aurora/home-aurora-diagnostic-test.webp'),
      practice: require('../assets/images/home_menu/aurora/home-aurora-practice.webp'),
      dialogs: require('../assets/images/home_menu/aurora/home-aurora-dialogs.webp'),
      exam: require('../assets/images/home_menu/aurora/home-aurora-exam.webp'),
      shop: require('../assets/images/home_menu/aurora/home-aurora-shop.webp'),
      heroMap: require('../assets/images/home_menu/aurora/home-aurora-hero-map.webp'),
    };
  }
  if (themeMode === 'volt') {
    return {
      lesson: require('../assets/images/home_menu/volt/home-volt-lessons.webp'),
      cards: require('../assets/images/home_menu/volt/home-volt-cards.webp'),
      league: require('../assets/images/home_menu/volt/home-volt-league.webp'),
      test: require('../assets/images/home_menu/volt/home-volt-diagnostic-test.webp'),
      practice: require('../assets/images/home_menu/volt/home-volt-practice.webp'),
      dialogs: require('../assets/images/home_menu/volt/home-volt-dialogs.webp'),
      exam: require('../assets/images/home_menu/volt/home-volt-exam.webp'),
      shop: require('../assets/images/home_menu/volt/home-volt-shop.webp'),
      heroMap: require('../assets/images/home_menu/volt/home-volt-hero-map.webp'),
    };
  }
  if (themeMode === 'gold') {
    return {
      lesson: require('../assets/images/home_menu/gold/home-gold-lessons.webp'),
      cards: require('../assets/images/home_menu/gold/home-gold-cards.webp'),
      league: require('../assets/images/home_menu/gold/home-gold-league.webp'),
      test: require('../assets/images/home_menu/gold/home-gold-diagnostic-test.webp'),
      practice: require('../assets/images/home_menu/gold/home-gold-practice.webp'),
      dialogs: require('../assets/images/home_menu/gold/home-gold-dialogs.webp'),
      exam: require('../assets/images/home_menu/gold/home-gold-exam.webp'),
      shop: require('../assets/images/home_menu/gold/home-gold-shop.webp'),
      heroMap: require('../assets/images/home_menu/gold/home-gold-hero-map.webp'),
    };
  }
  if (themeMode === 'olive') {
    return {
      lesson: require('../assets/images/home_menu/olive/home-olive-lessons.webp'), cards: require('../assets/images/home_menu/olive/home-olive-cards.webp'), league: require('../assets/images/home_menu/olive/home-olive-league.webp'), test: require('../assets/images/home_menu/olive/home-olive-diagnostic-test.webp'), practice: require('../assets/images/home_menu/olive/home-olive-practice.webp'), dialogs: require('../assets/images/home_menu/olive/home-olive-dialogs.webp'), exam: require('../assets/images/home_menu/olive/home-olive-exam.webp'), shop: require('../assets/images/home_menu/olive/home-olive-shop.webp'), heroMap: require('../assets/images/home_menu/olive/home-olive-hero-map.webp'),
    };
  }
  return {
    lesson: require('../assets/images/home_menu/home-forest-lessons.webp'),
    cards: require('../assets/images/home_menu/home-forest-cards.webp'),
    league: require('../assets/images/home_menu/home-forest-league.webp'),
    test: require('../assets/images/home_menu/home-forest-diagnostic-test.webp'),
    practice: require('../assets/images/home_menu/home-forest-practice.webp'),
    dialogs: require('../assets/images/home_menu/home-forest-dialogs.webp'),
    exam: require('../assets/images/levels/exam-dark.webp'),
    shop: require('../assets/images/levels/SHOP FOREST.webp'),
    heroMap: require('../assets/images/levels/her man foret.webp'),
  };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
