import { Audio, InterruptionModeAndroid, InterruptionModeIOS, type AVPlaybackSource } from 'expo-av';

type ExpoSound = Awaited<ReturnType<typeof Audio.Sound.createAsync>>['sound'];

let audioModeReady: Promise<void> | null = null;
let activeSound: ExpoSound | null = null;

async function ensureShortSfxAudioMode(): Promise<void> {
  if (audioModeReady) return audioModeReady;
  audioModeReady = Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    allowsRecordingIOS: false,
    staysActiveInBackground: false,
    interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
    interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  }).catch(() => {});
  return audioModeReady;
}

/** Остановить текущий короткий UI-SFX (модалки, тосты достижений, лига и т.д.) — без наложения друг на друга. */
export async function stopExclusiveShortSfx(): Promise<void> {
  const s = activeSound;
  activeSound = null;
  if (!s) return;
  try {
    await s.stopAsync();
  } catch {
    /* */
  }
  try {
    await s.unloadAsync();
  } catch {
    /* */
  }
}

/**
 * Один активный короткий сэмпл: новый вызов останавливает предыдущий
 * (модалка поверх модалки, тост + модалка лига и т.п.).
 */
export async function playExclusiveShortSfx(
  source: AVPlaybackSource,
  options?: { volume?: number },
): Promise<void> {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') return;
  const volume = options?.volume ?? 1;
  try {
    await ensureShortSfxAudioMode();
    await stopExclusiveShortSfx();
    const { sound } = await Audio.Sound.createAsync(source, {
      shouldPlay: true,
      volume,
      isLooping: false,
    });
    activeSound = sound;
    sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded) return;
      if (status.didJustFinish) {
        if (activeSound === sound) activeSound = null;
        void sound.unloadAsync().catch(() => {});
      }
    });
  } catch {
    /* ignore */
  }
}
