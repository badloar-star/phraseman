import { getFeatureIntroIcon, type FeatureIntroAssetKey } from './feature_intro_assets';

export type FeatureIntroArt = FeatureIntroAssetKey;

export function getFeatureIntroArt(art: FeatureIntroArt) {
  return getFeatureIntroIcon(art);
}
