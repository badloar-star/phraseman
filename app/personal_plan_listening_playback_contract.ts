import type { PersonalPlanListenChooseItem, PersonalPlanListenChooseBlockedReason } from './personal_plan_listen_choose_items';
import type { PersonalPlanListenBuildItem, PersonalPlanListenBuildBlockedReason } from './personal_plan_listen_build_items';
import { LOUD_PLAYBACK_AUDIO_MODE, type LoudPlaybackAudioMode } from './audio_playback_mode';
import { getPersonalPlanRuntimeAudioAssetModule } from './personal_plan_runtime_audio_asset_modules';
import { getPlanAudioUrl } from './plan_audio_url_map.generated';

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
        downloadFirst: false;
        updateInterval: 250;
      };
      audioMode: LoudPlaybackAudioMode;
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
  // Prefer the server-hosted clip so the ~126 MB of mp3 no longer ship in the
  // binary. Keep `downloadFirst` off: expo-audio otherwise creates a player with
  // source=null and replaces it later, so a quick first tap can be silent.
  const remoteUrl = getPlanAudioUrl(uri);
  const assetModule = remoteUrl ? undefined : getPersonalPlanRuntimeAudioAssetModule(uri);
  const playerSource: string | { assetId: number } = remoteUrl
    ? remoteUrl
    : assetModule
      ? { assetId: assetModule }
      : uri;

  return {
    source: 'in_app_audio',
    uri,
    playerSource,
    options: {
      downloadFirst: false,
      updateInterval: 250,
    },
    audioMode: LOUD_PLAYBACK_AUDIO_MODE,
    issues: [],
  };
}
