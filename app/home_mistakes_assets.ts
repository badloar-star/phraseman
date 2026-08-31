import type { ImageSourcePropType } from 'react-native';
import type { ThemeMode } from '../constants/theme';

const HOME_MISTAKES_IMAGES: Record<ThemeMode, ImageSourcePropType> = {
  dark: require('../assets/images/home_mistakes/home-mistakes-dark.webp'),
  gold: require('../assets/images/home_mistakes/home-mistakes-gold.webp'),
  olive: require('../assets/images/home_mistakes/home-mistakes-olive.webp'),
  midnight: require('../assets/images/home_mistakes/home-mistakes-midnight.webp'),
  ember: require('../assets/images/home_mistakes/home-mistakes-ember.webp'),
  aurora: require('../assets/images/home_mistakes/home-mistakes-aurora.webp'),
  volt: require('../assets/images/home_mistakes/home-mistakes-volt.webp'),
  indigo: require('../assets/images/home_mistakes/home-mistakes-indigo.webp'),
  sagePorcelain: require('../assets/images/home_mistakes/home-mistakes-sagePorcelain.webp'),
};

export function getHomeMistakesImage(themeMode: ThemeMode): ImageSourcePropType {
  return HOME_MISTAKES_IMAGES[themeMode];
}

/* expo-router route shim: keeps this app utility from being treated as a route */
export default function __RouteShim() {
  return null;
}
