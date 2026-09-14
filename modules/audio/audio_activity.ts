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
  // зачем (2026-09-14, «микрофон ломается после N-й попытки»): смена нативного
  // аудиорежима — единственное место цепочки, где отказ глотался молча. Пишем
  // намерение, счётчики аренд и причину отказа; сам отказ по-прежнему не
  // роняет вызывающего (некоторые нативные драйверы владеют сессией сами).
  const startedAt = Date.now();
  console.log('[SPEAK-MIC] audio-mode', JSON.stringify({ intent: nextIntent, spokenLeases, recordingLeases })); // guard-ok: трасса владельца, ≤3 строк на попытку
  activityTail = setManagedAudioMode(mode).catch((e: unknown) => {
    console.warn('[SPEAK-MIC] audio-mode:failed', JSON.stringify({ intent: nextIntent, tookMs: Date.now() - startedAt, error: e instanceof Error ? `${e.name}: ${e.message}` : String(e) })); // guard-ok: трасса владельца
    return undefined;
  });
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

