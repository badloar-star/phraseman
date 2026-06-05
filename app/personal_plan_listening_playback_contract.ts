import type { PersonalPlanListenChooseItem, PersonalPlanListenChooseBlockedReason } from './personal_plan_listen_choose_items';
import type { PersonalPlanListenBuildItem, PersonalPlanListenBuildBlockedReason } from './personal_plan_listen_build_items';
import { getPersonalPlanRuntimeAudioAssetModule } from './personal_plan_runtime_audio_asset_modules';

export type PlanListeningPlaybackIssue =
  | PersonalPlanListenChooseBlockedReason
  | PersonalPlanListenBuildBlockedReason
  | 'missing_audio_uri';

export type PlanListeningPlaybackItem =
  | PersonalPlanListenChooseItem
  | PersonalPlanListenBuildItem;

export type PlanListeningPlaybackSource =
  | {
      source: 'in_app_audio';
      uri: string;
      playerSource: string | { assetId: number };
      options: {
        downloadFirst: true;
        updateInterval: 250;
      };
      audioMode: {
        playsInSilentMode: true;
        shouldPlayInBackground: false;
        interruptionMode: 'mixWithOthers';
      };
      issues: [];
    }
  | {
      source: 'blocked';
      issues: PlanListeningPlaybackIssue[];
    };

export function buildPlanListeningPlaybackSource(
  item: PlanListeningPlaybackItem,
): PlanListeningPlaybackSource {
  if (!item.audioReady) {
    return {
      source: 'blocked',
      issues: [item.blockedReason ?? 'missing_approved_audio'],
    };
  }

  const uri = item.audioUri?.trim();
  if (!uri) {
    return {
      source: 'blocked',
      issues: ['missing_audio_uri'],
    };
  }
  const assetModule = getPersonalPlanRuntimeAudioAssetModule(uri);

  return {
    source: 'in_app_audio',
    uri,
    playerSource: assetModule ? { assetId: assetModule } : uri,
    options: {
      downloadFirst: true,
      updateInterval: 250,
    },
    audioMode: {
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    },
    issues: [],
  };
}
