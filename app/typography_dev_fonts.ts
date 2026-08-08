import { APP_FONT_FAMILY } from './typography';

/**
 * Expo Go does not run the native expo-font config plugin. Keep its font assets
 * in a module that production Metro can remove behind the literal __DEV__ gate.
 */
export const DEV_FONT_ASSETS = {
  [APP_FONT_FAMILY]: require('../assets/fonts/Inter-Regular.ttf'),
  'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
  'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
  'Inter-Black': require('../assets/fonts/Inter-Black.ttf'),
};

export default function __TypographyDevFontsRouteShim() {
  return null;
}
