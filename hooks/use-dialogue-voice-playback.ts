import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { resolveDialogueStudyTarget, type DialogueStudyTarget } from '../app/dialogue_language_registry';
import { createDialogueVoiceAttemptGuard, resolveDialogueVoiceCapability, type DialogueVoiceCapability } from '../app/dialogue_voice_capability';
import { useAudio } from './use-audio';

export type DialogueVoicePlaybackState = DialogueVoiceCapability & Readonly<{ loading: boolean }>;
const UNAVAILABLE: DialogueVoicePlaybackState = Object.freeze({ available: false, locale: 'en-US', voiceId: null, reason: 'inventory_unverified', loading: false });

/**
 * Strict dialogue-only TTS. Results that resolve after a target change or
 * unmount are ignored. Non-English iOS is deliberately unavailable until a
 * target-specific physical-device receipt is wired in.
 */
export function useDialogueVoicePlayback(targetInput: unknown) {
  const { speak, stop } = useAudio();
  const target = resolveDialogueStudyTarget(targetInput);
  const guardRef = useRef(createDialogueVoiceAttemptGuard());
  const [state, setState] = useState<DialogueVoicePlaybackState>(UNAVAILABLE);

  useEffect(() => {
    const guard = guardRef.current;
    const ticket = guard.begin();
    if (!target) {
      setState(UNAVAILABLE);
      return () => guard.cancel();
    }
    setState((previous) => ({ ...previous, loading: true }));
    void Speech.getAvailableVoicesAsync()
      .then((voices) => {
        if (!guard.isCurrent(ticket)) return;
        const capability = resolveDialogueVoiceCapability({
          target,
          platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
          voices: voices.map((voice) => ({ identifier: voice.identifier, language: voice.language })),
          // iOS proof is intentionally absent until physical evidence exists.
          iosTargetSpecificProof: target === 'en',
        });
        setState({ ...capability, loading: false });
      })
      .catch(() => {
        if (guard.isCurrent(ticket)) setState({ ...UNAVAILABLE, loading: false });
      });
    return () => {
      guard.cancel();
      stop();
    };
  }, [stop, target]);

  const speakDialogue = useCallback((text: string) => {
    if (!state.available || !state.voiceId) return false;
    speak(text, undefined, { language: state.locale, voice: state.voiceId, strictVoice: true });
    return true;
  }, [speak, state]);

  return { ...state, speakDialogue, stopDialogue: stop, target: target as DialogueStudyTarget | null };
}
