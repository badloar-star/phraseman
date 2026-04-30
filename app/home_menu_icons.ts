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
      lesson: require('../assets/images/levels/lesson grafit.png'),
      quizes: require('../assets/images/levels/quizes grafit.png'),
      cards: require('../assets/images/levels/cards grafit.png'),
      dayTasks: require('../assets/images/levels/dayli task grafit.png'),
      test: require('../assets/images/levels/test grafit.png'),
      exam: require('../assets/images/levels/exam grafit.png'),
      shop: require('../assets/images/levels/shop grafit.png'),
      arena: require('../assets/images/levels/arena grafit.png'),
      heroMap: require('../assets/images/levels/her man grafit.png'),
    };
  }
  if (themeMode === 'minimalDark') {
    return {
      lesson: require('../assets/images/levels/lesson fog.png'),
      quizes: require('../assets/images/levels/quizes fog.png'),
      cards: require('../assets/images/levels/cards fog.png'),
      dayTasks: require('../assets/images/levels/day tasks fog.png'),
      test: require('../assets/images/levels/test fog.png'),
      exam: require('../assets/images/levels/exam fog.png'),
      shop: require('../assets/images/levels/shop fog.png'),
      arena: require('../assets/images/levels/arena fog.png'),
      heroMap: require('../assets/images/levels/her man fog.png'),
    };
  }
  if (themeMode === 'ocean') {
    return {
      lesson: require('../assets/images/levels/lesson ocean.png'),
      quizes: require('../assets/images/levels/quizes ocean.png'),
      cards: require('../assets/images/levels/cards ocean.png'),
      dayTasks: require('../assets/images/levels/day tasks ocean.png'),
      test: require('../assets/images/levels/test ocean.png'),
      exam: require('../assets/images/levels/exam ocean.png'),
      shop: require('../assets/images/levels/SHOP OCEAN.png'),
      arena: require('../assets/images/levels/ARENA OCEAN.png'),
      heroMap: require('../assets/images/levels/hero map ocean.png'),
    };
  }
  if (themeMode === 'sakura') {
    return {
      lesson: require('../assets/images/levels/lesson sacura.png'),
      quizes: require('../assets/images/levels/quizes sacura.png'),
      cards: require('../assets/images/levels/cards sacura.png'),
      dayTasks: require('../assets/images/levels/day tasks sacura.png'),
      test: require('../assets/images/levels/test sacura.png'),
      exam: require('../assets/images/levels/exam sacura.png'),
      shop: require('../assets/images/levels/SHOP SAKURA.png'),
      arena: require('../assets/images/levels/ARENA SAKURA.png'),
      heroMap: require('../assets/images/levels/hero map sacura.png'),
    };
  }
  if (themeMode === 'gold') {
    return {
      lesson: require('../assets/images/levels/lesson coral.png'),
      quizes: require('../assets/images/levels/quizes coral.png'),
      cards: require('../assets/images/levels/cards coral.png'),
      dayTasks: require('../assets/images/levels/day tasks coral.png'),
      test: require('../assets/images/levels/test coral.png'),
      exam: require('../assets/images/levels/exam coral.png'),
      shop: require('../assets/images/levels/SHOP CORAL.png'),
      arena: require('../assets/images/levels/ARENA CORAL.png'),
      heroMap: require('../assets/images/levels/hero map coarl.png'),
    };
  }
  if (themeMode === 'neon') {
    return {
      lesson: require('../assets/images/levels/lesson neon.png'),
      quizes: require('../assets/images/levels/quizes neon.png'),
      cards: require('../assets/images/levels/cards neon.png'),
      dayTasks: require('../assets/images/levels/day tasks neon.png'),
      test: require('../assets/images/levels/test neon.png'),
      exam: require('../assets/images/levels/exam neon.png'),
      shop: require('../assets/images/levels/SHOP NEON.png'),
      arena: require('../assets/images/levels/ARENA NEON.png'),
      heroMap: require('../assets/images/levels/hero man neon.png'),
    };
  }
  return {
    lesson: require('../assets/images/levels/lesson forest.png'),
    quizes: require('../assets/images/levels/quizes forest.png'),
    cards: require('../assets/images/levels/cards forest.png'),
    dayTasks: require('../assets/images/levels/day tasks forest.png'),
    test: require('../assets/images/levels/test forest.png'),
    exam: require('../assets/images/levels/examen forest.png'),
    shop: require('../assets/images/levels/SHOP FOREST.png'),
    arena: require('../assets/images/levels/ARENA FOREST.png'),
    heroMap: require('../assets/images/levels/her man foret.png'),
  };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
