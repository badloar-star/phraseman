import type { PlanAudioAsset } from './personal_plan_audio_asset_readiness';
import { GENERATED_RUNTIME_AUDIO_ASSETS } from './personal_plan_runtime_audio_assets.generated';

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
