// ════════════════════════════════════════════════════════════════════════════
// personal_plan_phrase_audio_resolver.ts — единый резолвер вшитого MP3 фразы плана.
//
// Одна и та же логика «есть ли approved-озвучка для этой фразы» нужна в нескольких
// упражнениях плана: «На слух» (listen-choose / listen-build) и «Вслух»
// (pronunciation-repeat — раньше озвучивало TTS-роботом). Выносим сюда, чтобы все
// упражнения подключали ОДНУ И ТУ ЖЕ вшитую озвучку, а TTS оставался лишь fallback.
// ════════════════════════════════════════════════════════════════════════════
import {
  validatePlanAudioAsset,
  type PlanAudioAsset,
} from './personal_plan_audio_asset_readiness';
import { getPlanAudioAssetsForRuntime } from './personal_plan_audio_asset_registry';

export type ResolvedPlanPhraseAudio = {
  audioReady: boolean;
  audioAssetId?: string;
  audioUri?: string;
};

function approvedAudioForContentUnit(
  contentUnitId: string,
  assets: PlanAudioAsset[],
): PlanAudioAsset | undefined {
  return assets.find((asset) => {
    const readiness = validatePlanAudioAsset(asset);
    return (
      readiness.productionReady
      && asset.contentUnitIds.includes(contentUnitId)
      && typeof asset.uri === 'string'
      && asset.uri.trim().length > 0
    );
  });
}

/**
 * Возвращает вшитую approved-озвучку для фразы плана (по contentUnitId = phrase.id),
 * либо audioReady:false если её нет. `assets` можно подставить в тестах; по умолчанию
 * берём прод-реестр сгенерённых runtime-ассетов.
 */
export function resolveApprovedPlanPhraseAudio(
  contentUnitId: string,
  assets: PlanAudioAsset[] = getPlanAudioAssetsForRuntime(),
): ResolvedPlanPhraseAudio {
  const audioAsset = approvedAudioForContentUnit(contentUnitId, assets);
  if (!audioAsset) return { audioReady: false };
  return {
    audioReady: true,
    audioAssetId: audioAsset.assetId,
    audioUri: audioAsset.uri,
  };
}
