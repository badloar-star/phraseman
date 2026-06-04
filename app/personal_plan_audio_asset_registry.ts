import type { PlanAudioAsset } from './personal_plan_audio_asset_readiness';

let runtimeAudioAssets: PlanAudioAsset[] = [];

export function registerPlanAudioAssetsForRuntime(assets: PlanAudioAsset[]): void {
  runtimeAudioAssets = assets.map((asset) => ({
    ...asset,
    contentUnitIds: [...asset.contentUnitIds],
  }));
}

export function clearPlanAudioAssetsForRuntime(): void {
  runtimeAudioAssets = [];
}

export function getPlanAudioAssetsForRuntime(): PlanAudioAsset[] {
  return runtimeAudioAssets.map((asset) => ({
    ...asset,
    contentUnitIds: [...asset.contentUnitIds],
  }));
}
