import { Asset } from "expo-asset";
import { File } from "expo-file-system";

import { LEARNING_V2_BOOTSTRAP_AUDIO_ENTRIES_V1 } from "./learning_v2_bootstrap_audio_assets_v1.generated";
import { learningV2NativeDecoderIdentityForAudioFileV1 } from "./learning_v2_audio_identity_v1";
import { learningV2FactoryRemoteAudioFilesForContentHashesV1 } from "./learning_v2_factory_production_audio_v1";
import {
  prepareLearningV2VoiceAudioOfflineBytesV1,
  resolvePreparedLearningV2VoiceAudioOfflineFileV1,
  type LearningV2VoiceAudioOfflineCacheHandleV1,
} from "../modules/learning-v2/runtime/voice_audio_offline_cache_v1";
import type { LearningV2NativeDecoderIdentityV1 } from "../modules/learning-v2/runtime/voice_native_decoder_observer_v1";

type LearningV2BootstrapAudioEntryV1 = (typeof LEARNING_V2_BOOTSTRAP_AUDIO_ENTRIES_V1)[number];
const entryByContentHash = new Map<string, LearningV2BootstrapAudioEntryV1>(
  LEARNING_V2_BOOTSTRAP_AUDIO_ENTRIES_V1.map((entry) => [entry.contentHash, entry]),
);
let assetPrewarm: Promise<void> | null = null;
let durableSeed: Promise<void> | null = null;

async function runBootstrapSeedPool(
  length: number,
  work: (index: number) => Promise<void>,
): Promise<void> {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(4, length) }, async () => {
    for (;;) {
      const index = next++;
      if (index >= length) return;
      await work(index);
    }
  }));
}

export function preloadLearningV2BootstrapAudioAssetsV1(): Promise<void> {
  if (assetPrewarm) return assetPrewarm;
  assetPrewarm = Asset.loadAsync(
    LEARNING_V2_BOOTSTRAP_AUDIO_ENTRIES_V1.map((entry) => entry.assetModule),
  ).then(() => undefined).catch((error) => {
    assetPrewarm = null;
    throw error;
  });
  return assetPrewarm;
}

export function seedLearningV2BootstrapAudioCacheV1(): Promise<void> {
  if (durableSeed) return durableSeed;
  durableSeed = preloadLearningV2BootstrapAudioAssetsV1()
    .then(async () => {
      const files = learningV2FactoryRemoteAudioFilesForContentHashesV1(
        LEARNING_V2_BOOTSTRAP_AUDIO_ENTRIES_V1.map((entry) => entry.contentHash),
      );
      await runBootstrapSeedPool(files.length, async (itemIndex) => {
        const file = files[itemIndex]!;
        const identity = learningV2NativeDecoderIdentityForAudioFileV1(file, itemIndex);
        const prepared = await resolveLearningV2BootstrapAudioOfflineFileV1(identity);
        if (!prepared) throw new Error("learning_v2_bootstrap_audio_seed_missing");
      });
    })
    .catch((error) => {
      durableSeed = null;
      throw error;
    });
  return durableSeed;
}

export async function resolveLearningV2BootstrapAudioOfflineFileV1(
  identity: LearningV2NativeDecoderIdentityV1,
): Promise<LearningV2VoiceAudioOfflineCacheHandleV1 | null> {
  const entry = entryByContentHash.get(identity.contentHash);
  if (!entry || entry.byteSize !== identity.byteSize) return null;
  const existing = await resolvePreparedLearningV2VoiceAudioOfflineFileV1(identity);
  if (existing) return existing;
  const asset = Asset.fromModule(entry.assetModule);
  if (!asset.localUri) await asset.downloadAsync();
  const localUri = asset.localUri ?? asset.uri;
  if (!localUri) throw new Error("learning_v2_bootstrap_audio_asset_unavailable");
  return prepareLearningV2VoiceAudioOfflineBytesV1({
    identity,
    loadBytes: async () => {
      const bytes = await new File(localUri).bytes();
      if (bytes.byteLength !== entry.byteSize)
        throw new Error("learning_v2_bootstrap_audio_asset_invalid");
      return bytes;
    },
  });
}
