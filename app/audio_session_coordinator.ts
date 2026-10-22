import { setAudioModeAsync } from 'expo-audio';
import { noteSwallowedAs } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

type AudioMode = Parameters<typeof setAudioModeAsync>[0];

// expo-audio controls one process-wide native session. Keep transitions in
// invocation order so a late playback restore cannot overtake a newer capture
// request. Callers still handle rejection locally because some native drivers
// own the session themselves.
let transitionTail: Promise<void> = Promise.resolve();
const AUDIO_MODE_TRANSITION_TIMEOUT_MS = 1500;

function settleCallerWithinDeadline(
  transition: Promise<void>,
  mode: AudioMode,
  startedAt: number,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      console.warn(`[SOUND-AUDIT] audio_mode:timeout ${JSON.stringify({ afterMs: Date.now() - startedAt, allowsRecording: mode.allowsRecording ?? null, interruptionMode: mode.interruptionMode ?? null })}`); // guard-ok: нативный переход не ответил — вызывающий не зависает
      resolve();
    }, AUDIO_MODE_TRANSITION_TIMEOUT_MS);
    (timeout as unknown as { unref?: () => void }).unref?.();
    transition.then(
      () => {
        clearTimeout(timeout);
        resolve();
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

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
  // зачем (владелец 19.10, КРИТИЧНО «свернул и развернул — звука в приложении нет вообще, кнопка не нажимается»):
  // журнал [V2-AUDIO-TRACE] показал, что после возврата из фона запуск звука застревает между play_from_start и played.
  // Переходы режима идут цепочкой, и если нативный setAudioModeAsync не отвечает (iOS после фона), вызывающий не должен
  // ждать его вечно. При этом сам нативный вызов остаётся в последовательной очереди: Promise.race вокруг transitionTail
  // запускал следующий setAudioModeAsync поверх ещё живого предыдущего вызова, и позднее завершение могло вернуть старый
  // режим. Ограничиваем только ожидание вызывающего, а нативные переходы никогда не перекрываем.
  const startedAt = Date.now();
  const nativeTransition = transitionTail
    .catch(noteSwallowedAs('audio_session_coordinator:promise_1', undefined))
    .then(() => setAudioModeAsync(mode));
  transitionTail = nativeTransition.catch(noteSwallowedAs('audio_session_coordinator:promise_2', undefined));
  return settleCallerWithinDeadline(nativeTransition, mode, startedAt);
}

export default function __RouteShim() {
  return null;
}
