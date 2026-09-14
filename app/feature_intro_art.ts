import { getFeatureIntroAsset, type FeatureIntroAssetKey } from './feature_intro_assets';
import type { ThemeMode } from '../constants/theme';

export type FeatureIntroArt = FeatureIntroAssetKey;

export function getFeatureIntroArt(theme: ThemeMode, art: FeatureIntroArt) {
  return getFeatureIntroAsset(theme, art);
}
