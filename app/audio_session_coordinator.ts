import { setAudioModeAsync } from 'expo-audio';
import { noteSwallowedAs } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

type AudioMode = Parameters<typeof setAudioModeAsync>[0];

// expo-audio controls one process-wide native session. Keep transitions in
// invocation order so a late playback restore cannot overtake a newer capture
// request. Callers still handle rejection locally because some native drivers
// own the session themselves.
let transitionTail: Promise<void> = Promise.resolve();
let recordingActive = false;
const modeListeners = new Set<() => void>();

export type ManagedAudioModeSnapshot = Readonly<{ recordingActive: boolean }>;

export function getManagedAudioModeSnapshot(): ManagedAudioModeSnapshot {
  return { recordingActive };
}

export function subscribeManagedAudioMode(listener: () => void): () => void {
  modeListeners.add(listener);
  return () => modeListeners.delete(listener);
}

export function setManagedAudioMode(mode: AudioMode): Promise<void> {
  const nextRecordingActive = mode.allowsRecording === true;
  if (nextRecordingActive !== recordingActive) {
    recordingActive = nextRecordingActive;
    modeListeners.forEach((listener) => listener());
  }
  const transition = transitionTail.catch(noteSwallowedAs('audio_session_coordinator:promise_1', undefined)).then(() => setAudioModeAsync(mode));
  transitionTail = transition.catch(noteSwallowedAs('audio_session_coordinator:promise_2', undefined));
  return transition;
}

export default function __RouteShim() {
  return null;
}
