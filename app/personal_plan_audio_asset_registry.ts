import type { PlanAudioAsset } from './personal_plan_audio_asset_readiness';
import { GENERATED_RUNTIME_AUDIO_GROUPS } from './personal_plan_runtime_audio_assets.compact.generated';

const GENERATED_RUNTIME_AUDIO_ASSETS: PlanAudioAsset[] = GENERATED_RUNTIME_AUDIO_GROUPS.flatMap(
  ([plan, day, phrases]) => {
    const dayPadded = String(day).padStart(3, '0');
    const dayId = `${plan}_d${dayPadded}`;
    const daySlug = `${plan}-d${dayPadded}`;
    return phrases.map(([targetText, durationMs], phraseIndex): PlanAudioAsset => {
      const phraseNumber = phraseIndex + 1;
      const contentUnitId = `${dayId}_content_unit_phrase_${phraseNumber}`;
      const phraseSlug = `${daySlug}-content-unit-phrase-${phraseNumber}`;
      const assetId = `audio:${plan}:runtime:${daySlug}-listen-audio:${phraseSlug}`;
      return {
        id: assetId,
        blockId: `${dayId}:listen-audio`,
        contentUnitIds: [contentUnitId],
        targetText,
        locale: 'en',
        status: 'approved',
        assetId,
        uri: `assets/audio/personal-plans-runtime/${plan}/runtime/${daySlug}-listen-audio/${phraseSlug}.mp3`,
        durationMs,
        voiceId: 'openai:alloy',
        provider: 'openai',
        finalAssetReady: true,
      };
    });
  },
);

let runtimeAudioAssetsOverride: PlanAudioAsset[] | null = null;

export function registerPlanAudioAssetsForRuntime(assets: PlanAudioAsset[]): void {
  runtimeAudioAssetsOverride = assets.map((asset) => ({
    ...asset,
    contentUnitIds: [...asset.contentUnitIds],
  }));
}

export function clearPlanAudioAssetsForRuntime(): void {
  runtimeAudioAssetsOverride = null;
}

export function getPlanAudioAssetsForRuntime(): PlanAudioAsset[] {
  const assets = runtimeAudioAssetsOverride ?? GENERATED_RUNTIME_AUDIO_ASSETS;
  return assets.map((asset) => ({
    ...asset,
    contentUnitIds: [...asset.contentUnitIds],
  }));
}
