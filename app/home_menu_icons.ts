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
  test: ImageSourcePropType;
  exam: ImageSourcePropType;
  shop: ImageSourcePropType;
  arena: ImageSourcePropType;
  heroMap: ImageSourcePropType;
};

export function getHomeMenuImages(themeMode: ThemeMode): HomeMenuImageSet {
  if (themeMode === 'minimalLight') {
    return {
      lesson: require('../assets/images/levels/lesson grafit.webp'),
      quizes: require('../assets/images/levels/quizes grafit.webp'),
      cards: require('../assets/images/levels/cards grafit.webp'),
      dayTasks: require('../assets/images/levels/dayli task grafit.webp'),
      test: require('../assets/images/levels/test grafit.webp'),
      exam: require('../assets/images/levels/exam grafit.webp'),
      shop: require('../assets/images/levels/shop grafit.webp'),
      arena: require('../assets/images/levels/arena grafit.webp'),
      heroMap: require('../assets/images/levels/her man grafit.webp'),
    };
  }
  if (themeMode === 'minimalDark') {
    return {
      lesson: require('../assets/images/levels/lesson fog.webp'),
      quizes: require('../assets/images/levels/quizes fog.webp'),
      cards: require('../assets/images/levels/cards fog.webp'),
      dayTasks: require('../assets/images/levels/day tasks fog.webp'),
      test: require('../assets/images/levels/test fog.webp'),
      exam: require('../assets/images/levels/exam fog.webp'),
      shop: require('../assets/images/levels/shop fog.webp'),
      arena: require('../assets/images/levels/arena fog.webp'),
      heroMap: require('../assets/images/levels/her man fog.webp'),
    };
  }
  if (themeMode === 'gold') {
    return {
      lesson: require('../assets/images/levels/lesson coral.webp'),
      quizes: require('../assets/images/levels/quizes coral.webp'),
      cards: require('../assets/images/levels/cards coral.webp'),
      dayTasks: require('../assets/images/levels/day tasks coral.webp'),
      test: require('../assets/images/levels/test coral.webp'),
      exam: require('../assets/images/levels/exam coral.webp'),
      shop: require('../assets/images/levels/SHOP CORAL.webp'),
      arena: require('../assets/images/levels/ARENA CORAL.webp'),
      heroMap: require('../assets/images/levels/hero map coarl.webp'),
    };
  }
  if (themeMode === 'neon') {
    return {
      lesson: require('../assets/images/levels/lesson neon.webp'),
      quizes: require('../assets/images/levels/quizes neon.webp'),
      cards: require('../assets/images/levels/cards neon.webp'),
      dayTasks: require('../assets/images/levels/day tasks neon.webp'),
      test: require('../assets/images/levels/test neon.webp'),
      exam: require('../assets/images/levels/exam neon.webp'),
      shop: require('../assets/images/levels/SHOP NEON.webp'),
      arena: require('../assets/images/levels/ARENA NEON.webp'),
      heroMap: require('../assets/images/levels/hero man neon.webp'),
    };
  }
  return {
    lesson: require('../assets/images/levels/lesson forest.webp'),
    quizes: require('../assets/images/levels/quizes forest.webp'),
    cards: require('../assets/images/levels/cards forest.webp'),
    dayTasks: require('../assets/images/levels/day tasks forest.webp'),
    test: require('../assets/images/levels/test forest.webp'),
    exam: require('../assets/images/levels/examen forest.webp'),
    shop: require('../assets/images/levels/SHOP FOREST.webp'),
    arena: require('../assets/images/levels/ARENA FOREST.webp'),
    heroMap: require('../assets/images/levels/her man foret.webp'),
  };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
