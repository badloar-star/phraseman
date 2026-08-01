import type { ImageSourcePropType } from 'react-native';
import type { ThemeMode } from './theme';

const FALLBACK_COMPASS_ICON = require('../assets/images/theo/theo-phrase-compass-v1.webp');

export const WEEKLY_COMPASS_ICON_ASSET_PATHS: Record<ThemeMode, string> = {
  dark: 'assets/images/weekly_compass_icons/dark.webp',
  gold: 'assets/images/weekly_compass_icons/gold.webp',
  coral: 'assets/images/weekly_compass_icons/coral.webp',
  minimalDark: 'assets/images/weekly_compass_icons/indigo.webp',
  business: 'assets/images/weekly_compass_icons/business.webp',
  businessLight: 'assets/images/weekly_compass_icons/businessLight.webp',
  midnight: 'assets/images/weekly_compass_icons/midnight.webp',
  ember: 'assets/images/weekly_compass_icons/ember.webp',
  aurora: 'assets/images/weekly_compass_icons/aurora.webp',
  volt: 'assets/images/weekly_compass_icons/volt.webp',
  candyBlue: 'assets/images/weekly_compass_icons/indigo.webp',
  indigo: 'assets/images/weekly_compass_icons/indigo.webp',
};

export const WEEKLY_COMPASS_ICON_GENERATION_ORDER: readonly ThemeMode[] = [
  'business',
  'businessLight',
  'dark',
  'gold',
  'coral',
  'midnight',
  'ember',
  'aurora',
  'volt',
];

export const WEEKLY_COMPASS_ICON_DALLE_PROMPTS: Record<ThemeMode, string> = {
  dark: 'Centered 3D compass icon for a language learning app, deep forest black-green enamel, mint emerald needle, premium object cutout, transparent background, no text, no letters, no logo, no hands, no map, soft studio rim light, 1024 square.',
  gold: 'Centered 3D compass icon for a language learning app, black piano lacquer and champagne gold metal, antique nautical needle, premium object cutout, transparent background, no text, no letters, no logo, no hands, no map, soft studio rim light, 1024 square.',
  coral: 'Centered 3D compass icon for a language learning app, warm coral enamel and cocoa shadows, rose-gold needle, premium object cutout, transparent background, no text, no letters, no logo, no hands, no map, soft studio rim light, 1024 square.',
  minimalDark: 'Centered 3D compass icon for a language learning app, graphite shell, cool blue glass glow, clean Apple-like minimal object cutout, transparent background, no text, no letters, no logo, no hands, no map, soft studio rim light, 1024 square.',
  business: 'Flat minimal line icon of a compass, thin champagne-gold strokes (#D4B26A) with light gray secondary details, rounded caps, 24px grid style, transparent background, no 3D, no gradients, no text.',
  businessLight: 'Flat minimal line icon of a compass, thin bronze strokes (#A8802F) with slate gray secondary details, rounded caps, 24px grid style, transparent background, no 3D, no gradients, no text.',
  midnight: 'Centered 3D compass icon for a language learning app, black cinema finish, midnight indigo and violet glow, sharp luminous needle, premium object cutout, transparent background, no text, no letters, no logo, no hands, no map, soft studio rim light, 1024 square.',
  ember: 'Centered 3D compass icon for a language learning app, black cinema finish, ember orange metal and smoked glass, warm luminous needle, premium object cutout, transparent background, no text, no letters, no logo, no hands, no map, soft studio rim light, 1024 square.',
  aurora: 'Centered 3D compass icon for a language learning app, black cinema finish, aurora green and cyan glow, crystalline luminous needle, premium object cutout, transparent background, no text, no letters, no logo, no hands, no map, soft studio rim light, 1024 square.',
  volt: 'Centered 3D compass icon for a language learning app, black cinema finish, electric lime volt glow, neon luminous needle, premium object cutout, transparent background, no text, no letters, no logo, no hands, no map, soft studio rim light, 1024 square.',
  candyBlue: 'Centered 3D compass icon for a language learning app, deep blue-charcoal enamel, candy blue glass glow, premium object cutout, transparent background, no text, no letters, no logo, no hands, no map, soft studio rim light, 1024 square.',
  indigo: 'Centered 3D compass icon for a language learning app, dusk indigo enamel, soft lavender glow, premium object cutout, transparent background, no text, no letters, no logo, no hands, no map, soft studio rim light, 1024 square.',
};

// Add one generated asset at a time, then move its require from fallback to the
// matching theme key. Keeping missing files out of require() preserves bundling.
const GENERATED_COMPASS_ICON_SOURCES: Partial<Record<ThemeMode, ImageSourcePropType>> = {
  dark: require('../assets/images/weekly_compass_icons/dark.webp'),
  gold: require('../assets/images/weekly_compass_icons/gold.webp'),
  coral: require('../assets/images/weekly_compass_icons/coral.webp'),
  minimalDark: require('../assets/images/weekly_compass_icons/indigo.webp'),
  business: require('../assets/images/weekly_compass_icons/business.webp'),
  businessLight: require('../assets/images/weekly_compass_icons/businessLight.webp'),
  midnight: require('../assets/images/weekly_compass_icons/midnight.webp'),
  ember: require('../assets/images/weekly_compass_icons/ember.webp'),
  aurora: require('../assets/images/weekly_compass_icons/aurora.webp'),
  volt: require('../assets/images/weekly_compass_icons/volt.webp'),
  candyBlue: require('../assets/images/weekly_compass_icons/indigo.webp'),
  indigo: require('../assets/images/weekly_compass_icons/indigo.webp'),
};

export function compassIconSource(themeMode: ThemeMode): ImageSourcePropType {
  return GENERATED_COMPASS_ICON_SOURCES[themeMode] ?? FALLBACK_COMPASS_ICON;
}

export function weeklyCompassIconSource(themeMode: ThemeMode): ImageSourcePropType {
  return compassIconSource(themeMode);
}
