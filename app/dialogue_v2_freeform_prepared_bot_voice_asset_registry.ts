/**
 * A local URI is deliberately never a Freeform bot-voice authority. The only
 * way to obtain one is through this module's static build registry. The opaque
 * capability is not serializable and copied metadata cannot recreate it.
 */
export type DialogueV2FreeformPreparedBotVoiceAssetCapability = Readonly<{
  readonly __dialogueV2FreeformPreparedBotVoiceCapability?: never;
}>;

type AssetBinding = Readonly<{
  assetKey: string;
  localUri: string;
  assetSha256: string;
  assetBytes: number;
}>;

const bindings = new WeakMap<object, AssetBinding>();

function issueStaticAssetCapability(binding: AssetBinding): DialogueV2FreeformPreparedBotVoiceAssetCapability {
  const capability = Object.freeze(Object.create(null)) as DialogueV2FreeformPreparedBotVoiceAssetCapability;
  bindings.set(capability as object, Object.freeze(binding));
  return capability;
}

function readBinding(value: unknown): AssetBinding | null {
  try {
    if (!value || typeof value !== 'object') return null;
    return bindings.get(value) ?? null;
  } catch {
    return null;
  }
}

export type DialogueV2FreeformPreparedBotVoiceAssetResolver = (
  assetKey: string,
) => Promise<DialogueV2FreeformPreparedBotVoiceAssetCapability | null>;

/** Returns a URI only for an opaque static-registry capability. */
export function readDialogueV2FreeformPreparedBotVoicePlaybackUri(capability: unknown): string | null {
  return readBinding(capability)?.localUri ?? null;
}

/**
 * Returns a URI only for an opaque capability issued by this static registry
 * and only when it matches the reviewed catalog entry exactly.
 */
export function resolveDialogueV2FreeformPreparedBotVoiceAssetUri(
  capability: unknown,
  expected: Readonly<{ assetKey: string; assetSha256: string; assetBytes: number }>,
): string | null {
  const binding = readBinding(capability);
  return binding
    && binding.assetKey === expected.assetKey
    && binding.assetSha256 === expected.assetSha256
    && binding.assetBytes === expected.assetBytes
    && binding.localUri.startsWith('file://')
    ? binding.localUri
    : null;
}

/** Returns true only for the exact opaque registry capability, never a URI. */
export function isDialogueV2FreeformPreparedBotVoiceAssetCapability(value: unknown): value is DialogueV2FreeformPreparedBotVoiceAssetCapability {
  return readBinding(value) !== null;
}

/**
 * No reviewed Freeform bot audio is bundled. Future approval must add private
 * build-time entries to this module via `issueStaticAssetCapability`; callers
 * cannot supply URLs, paths, hashes or metadata to mint a capability.
 */
export const resolveBundledDialogueV2FreeformPreparedBotVoiceAsset:
DialogueV2FreeformPreparedBotVoiceAssetResolver = async () => null;

// Retain the private issuer for the future reviewed static bundle without
// widening the public capability boundary.
void issueStaticAssetCapability;
