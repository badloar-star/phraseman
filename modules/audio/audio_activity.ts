import {
  SPEAKING_RECORDING_AUDIO_MODE,
  SPOKEN_AUDIO_MODE,
  UI_SFX_AUDIO_MODE,
} from '@/app/audio_playback_mode';
import { setManagedAudioMode } from '@/app/audio_session_coordinator';

export type AudioActivityKind = 'spoken' | 'recording';

export type AudioActivitySnapshot = Readonly<{
  spokenActive: boolean;
  recordingActive: boolean;
}>;

export type AudioActivityLease = Readonly<{
  release(): void;
}>;

let spokenLeases = 0;
let recordingLeases = 0;
let currentIntent: 'ui' | AudioActivityKind | null = null;
let activityTail: Promise<void> = Promise.resolve();
const listeners = new Set<() => void>();

function snapshot(): AudioActivitySnapshot {
  return {
    spokenActive: spokenLeases > 0,
    recordingActive: recordingLeases > 0,
  };
}

function reconcile(): void {
  const nextIntent = recordingLeases > 0 ? 'recording' : spokenLeases > 0 ? 'spoken' : 'ui';
  if (nextIntent === currentIntent) return;
  currentIntent = nextIntent;
  const mode = nextIntent === 'recording'
    ? SPEAKING_RECORDING_AUDIO_MODE
    : nextIntent === 'spoken'
      ? SPOKEN_AUDIO_MODE
      : UI_SFX_AUDIO_MODE;
  activityTail = setManagedAudioMode(mode).catch(() => undefined);
  listeners.forEach((listener) => listener());
}

export function acquireAudioActivity(kind: AudioActivityKind): AudioActivityLease {
  if (kind === 'recording') recordingLeases += 1;
  else spokenLeases += 1;
  reconcile();

  let released = false;
  return Object.freeze({
    release: () => {
      if (released) return;
      released = true;
      if (kind === 'recording') recordingLeases = Math.max(0, recordingLeases - 1);
      else spokenLeases = Math.max(0, spokenLeases - 1);
      reconcile();
    },
  });
}

export function getAudioActivitySnapshot(): AudioActivitySnapshot {
  return snapshot();
}

export function subscribeAudioActivity(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function whenAudioActivitySettled(): Promise<void> {
  await activityTail;
}

export function resetAudioActivityForTests(): void {
  spokenLeases = 0;
  recordingLeases = 0;
  currentIntent = null;
  reconcile();
}

