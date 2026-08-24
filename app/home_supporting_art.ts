import type { ImageSourcePropType } from 'react-native';

import type { ThemeMode } from '../constants/theme';

export type HomeSupportingArt = {
  survey: ImageSourcePropType;
  phraseOfDay: ImageSourcePropType;
};

const HOME_SUPPORTING_ART: Record<ThemeMode, HomeSupportingArt> = {
  dark: {
    survey: require('../assets/images/home_supporting_art/dark/home-dark-survey.webp'),
    phraseOfDay: require('../assets/images/home_supporting_art/dark/home-dark-phrase-of-day.webp'),
  },
  gold: {
    survey: require('../assets/images/home_supporting_art/gold/home-gold-survey.webp'),
    phraseOfDay: require('../assets/images/home_supporting_art/gold/home-gold-phrase-of-day.webp'),
  },
  olive: {
    survey: require('../assets/images/home_supporting_art/olive/home-olive-survey.webp'),
    phraseOfDay: require('../assets/images/home_supporting_art/olive/home-olive-phrase-of-day.webp'),
  },
  midnight: {
    survey: require('../assets/images/home_supporting_art/midnight/home-midnight-survey.webp'),
    phraseOfDay: require('../assets/images/home_supporting_art/midnight/home-midnight-phrase-of-day.webp'),
  },
  ember: {
    survey: require('../assets/images/home_supporting_art/ember/home-ember-survey.webp'),
    phraseOfDay: require('../assets/images/home_supporting_art/ember/home-ember-phrase-of-day.webp'),
  },
  aurora: {
    survey: require('../assets/images/home_supporting_art/aurora/home-aurora-survey.webp'),
    phraseOfDay: require('../assets/images/home_supporting_art/aurora/home-aurora-phrase-of-day.webp'),
  },
  volt: {
    survey: require('../assets/images/home_supporting_art/volt/home-volt-survey.webp'),
    phraseOfDay: require('../assets/images/home_supporting_art/volt/home-volt-phrase-of-day.webp'),
  },
  indigo: {
    survey: require('../assets/images/home_supporting_art/indigo/home-indigo-survey.webp'),
    phraseOfDay: require('../assets/images/home_supporting_art/indigo/home-indigo-phrase-of-day.webp'),
  },
  sagePorcelain: {
    survey: require('../assets/images/home_supporting_art/sagePorcelain/home-sagePorcelain-survey.webp'),
    phraseOfDay: require('../assets/images/home_supporting_art/sagePorcelain/home-sagePorcelain-phrase-of-day.webp'),
  },
};

export function getHomeSupportingArt(themeMode: ThemeMode): HomeSupportingArt {
  return HOME_SUPPORTING_ART[themeMode];
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() {
  return null;
}
