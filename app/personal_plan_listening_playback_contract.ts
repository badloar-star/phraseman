import type { PersonalPlanListenChooseItem, PersonalPlanListenChooseBlockedReason } from './personal_plan_listen_choose_items';
import type { PersonalPlanListenBuildItem, PersonalPlanListenBuildBlockedReason } from './personal_plan_listen_build_items';
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
        downloadFirst: true;
        updateInterval: 250;
      };
      audioMode: {
        playsInSilentMode: true;
        shouldPlayInBackground: false;
        interruptionMode: 'duckOthers';
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
  // Prefer the server-hosted clip (streamed + disk-cached by expo-audio) so the
  // ~126 MB of mp3 no longer ship in the binary. Fall back to the bundled local
  // asset only if this uri isn't in the uploaded map yet (keeps the app working
  // before/while the upload script runs). Mirrors hooks/phrase_audio_player.ts.
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
      downloadFirst: true,
      updateInterval: 250,
    },
    audioMode: {
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'duckOthers',
    },
    issues: [],
  };
}
