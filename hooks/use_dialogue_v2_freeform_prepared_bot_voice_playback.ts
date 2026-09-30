import {
  useDialogueV2PreparedBotVoicePlayback,
  type DialogueV2PreparedBotVoicePlaybackAsset,
} from './use_dialogue_v2_prepared_bot_voice_playback';
import {
  readDialogueV2FreeformPreparedBotVoicePlaybackUri,
  type DialogueV2FreeformPreparedBotVoiceAssetCapability,
} from '../app/dialogue_v2_freeform_prepared_bot_voice_asset_registry';

export type DialogueV2FreeformPreparedBotVoicePlaybackAsset = Readonly<{
  messageId: string;
  capability: DialogueV2FreeformPreparedBotVoiceAssetCapability;
}>;

/**
 * Freeform has no persona/scenario semantics. This keeps its playback boundary
 * explicit while reusing the local-file allowlist and shared spoken-audio
 * arbiter. Callers may pass an asset only after the Freeform resolver verified
 * the reviewed local catalog entry.
 */
export function useDialogueV2FreeformPreparedBotVoicePlayback(input: Readonly<{
  assets: readonly DialogueV2FreeformPreparedBotVoicePlaybackAsset[];
}>) {
  const assets: DialogueV2PreparedBotVoicePlaybackAsset[] = [];
  for (const candidate of input.assets) {
    const localUri = candidate && typeof candidate.messageId === 'string'
      ? readDialogueV2FreeformPreparedBotVoicePlaybackUri(candidate.capability)
      : null;
    if (localUri?.startsWith('file://')) {
      assets.push(Object.freeze({ messageId: candidate.messageId, localUri }));
    }
  }
  return useDialogueV2PreparedBotVoicePlayback(Object.freeze({ assets: Object.freeze(assets) }));
}
