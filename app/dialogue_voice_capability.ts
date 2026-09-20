import type { DialogueStudyTarget } from './dialogue_language_registry';

/** Exact locale is a release boundary: `es-MX` is not proof for `es-ES`. */
export const DIALOGUE_EXACT_SPEECH_LOCALE: Readonly<Record<DialogueStudyTarget, string>> = Object.freeze({
  en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE',
});

export type DialogueVoiceInventoryItem = Readonly<{ identifier: string; language: string }>;
export type DialogueVoiceCapabilityReason =
  | 'inventory_unverified'
  | 'exact_voice_missing'
  | 'ios_target_proof_missing';

export type DialogueVoiceCapability = Readonly<{
  available: boolean;
  locale: string;
  voiceId: string | null;
  reason: DialogueVoiceCapabilityReason | null;
}>;

/**
 * A voice list is evidence, not a hint.  In particular, never let Expo select
 * its default voice after an unavailable exact target voice.
 */
export function resolveDialogueVoiceCapability(input: Readonly<{
  target: DialogueStudyTarget;
  platform: 'android' | 'ios' | 'web';
  voices?: readonly DialogueVoiceInventoryItem[];
  inventoryError?: boolean;
  inventoryTimedOut?: boolean;
  /** Physical/runtime receipt; non-EN iOS cannot be assumed from the list. */
  iosTargetSpecificProof?: boolean;
}>): DialogueVoiceCapability {
  const locale = DIALOGUE_EXACT_SPEECH_LOCALE[input.target];
  const verified = !input.inventoryError && !input.inventoryTimedOut && Array.isArray(input.voices) && input.voices.length > 0;
  if (!verified) return { available: false, locale, voiceId: null, reason: 'inventory_unverified' };
  if (input.platform === 'ios' && input.target !== 'en' && input.iosTargetSpecificProof !== true) {
    return { available: false, locale, voiceId: null, reason: 'ios_target_proof_missing' };
  }
  const exact = input.voices!.find((voice) => voice.language === locale && voice.identifier.trim().length > 0);
  return exact
    ? { available: true, locale, voiceId: exact.identifier, reason: null }
    : { available: false, locale, voiceId: null, reason: 'exact_voice_missing' };
}

export type DialogueAsrCapabilityReason =
  | 'inventory_unverified'
  | 'android_api_unsupported'
  | 'exact_locale_missing'
  | 'service_mismatch';

export function resolveDialogueAsrCapability(input: Readonly<{
  target: DialogueStudyTarget;
  platform: 'android' | 'ios' | 'web';
  androidApiLevel?: number;
  locales?: readonly string[];
  inventoryServiceId?: string | null;
  startServiceId?: string | null;
}>): Readonly<{ available: boolean; locale: string; reason: DialogueAsrCapabilityReason | null }> {
  const locale = DIALOGUE_EXACT_SPEECH_LOCALE[input.target];
  if (input.platform === 'android' && (input.androidApiLevel == null || input.androidApiLevel <= 32)) {
    return { available: false, locale, reason: 'android_api_unsupported' };
  }
  if (!Array.isArray(input.locales) || input.locales.length === 0 || !input.inventoryServiceId) {
    return { available: false, locale, reason: 'inventory_unverified' };
  }
  if (input.startServiceId !== input.inventoryServiceId) return { available: false, locale, reason: 'service_mismatch' };
  return input.locales.includes(locale)
    ? { available: true, locale, reason: null }
    : { available: false, locale, reason: 'exact_locale_missing' };
}

/** Generation token used by hooks to discard inventory results after teardown. */
export function createDialogueVoiceAttemptGuard(): Readonly<{ begin: () => number; cancel: () => void; isCurrent: (ticket: number) => boolean }> {
  let generation = 0;
  return {
    begin: () => ++generation,
    cancel: () => { generation += 1; },
    isCurrent: (ticket) => ticket === generation,
  };
}
