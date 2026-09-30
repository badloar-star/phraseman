export type DialogueV2ResolvedPreparedBotVoiceAsset = Readonly<{
  localUri: string;
  assetSha256: string;
  assetBytes: number;
}>;

export type DialogueV2PreparedBotVoiceAssetResolver = (
  assetKey: string,
) => Promise<DialogueV2ResolvedPreparedBotVoiceAsset | null>;

/**
 * No approved audio is bundled yet. Future entries must be added as static
 * build-time asset resolvers and accompanied by the reviewed release catalog;
 * this function never accepts a URL and never downloads a file.
 */
export const resolveBundledDialogueV2PreparedBotVoiceAsset:
DialogueV2PreparedBotVoiceAssetResolver = async () => null;
