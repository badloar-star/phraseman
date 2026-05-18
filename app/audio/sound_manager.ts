import { Platform } from 'react-native';
import {
  getUserSettingsSnapshot,
  normalizeAppSoundVolume,
} from '../user_settings_store';
import { SOUND_ASSETS } from './sound_assets';
import {
  getSoundManifestEntry,
  PRELOAD_SOUND_IDS,
  type SoundId,
} from './sound_manifest';

type AudioPlayer = {
  replayAsync: (status?: Record<string, unknown>) => Promise<unknown>;
  setStatusAsync: (status: Record<string, unknown>) => Promise<unknown>;
  unloadAsync: () => Promise<unknown>;
};

type ExpoAvAudio = {
  Sound: {
    createAsync: (
      source: number,
      initialStatus?: Record<string, unknown>,
      onPlaybackStatusUpdate?: null,
      downloadFirst?: boolean,
    ) => Promise<{ sound: AudioPlayer }>;
  };
  setAudioModeAsync: (mode: Record<string, unknown>) => Promise<void>;
};

type PlayOptions = {
  force?: boolean;
  volume?: number;
};

const players = new Map<SoundId, AudioPlayer>();
const playerPromises = new Map<SoundId, Promise<AudioPlayer | null>>();
const lastPlayedAt = new Map<SoundId, number>();

let avAudioModule: ExpoAvAudio | null | undefined;
let avRuntimeAvailable: boolean | undefined;
let audioModePromise: Promise<void> | null = null;
let ceremonyBusyUntil = 0;
let activePriority = 0;

function isAvRuntimeAvailable(): boolean {
  if (Platform.OS === 'web') return true;
  if (avRuntimeAvailable !== undefined) return avRuntimeAvailable;

  try {
    // `expo-av` throws during module evaluation if its native module is absent.
    // Probe the native runtime first so old clients fail silent instead of red-screening.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const core = require('expo-modules-core') as {
      requireOptionalNativeModule?: (moduleName: string) => unknown | null;
    };
    avRuntimeAvailable = !!core.requireOptionalNativeModule?.('ExponentAV');
  } catch {
    avRuntimeAvailable = false;
  }

  return avRuntimeAvailable;
}

function getAvAudioModule(): ExpoAvAudio | null {
  if (avAudioModule !== undefined) return avAudioModule;
  if (!isAvRuntimeAvailable()) {
    avAudioModule = null;
    return avAudioModule;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const av = require('expo-av') as { Audio?: ExpoAvAudio };
    avAudioModule = av.Audio ?? null;
  } catch {
    avAudioModule = null;
  }

  return avAudioModule;
}

function ensureAudioMode(): Promise<void> {
  const audio = getAvAudioModule();
  if (!audio) return Promise.resolve();
  if (!audioModePromise) {
    audioModePromise = audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch(() => {});
  }
  return audioModePromise;
}

function getOrCreatePlayer(id: SoundId): Promise<AudioPlayer | null> {
  const cached = players.get(id);
  if (cached) return Promise.resolve(cached);

  const pending = playerPromises.get(id);
  if (pending) return pending;

  const promise = (async () => {
    const audio = getAvAudioModule();
    const asset = SOUND_ASSETS[id];
    if (!audio || !asset) return null;

    try {
      await ensureAudioMode();
      const { sound } = await audio.Sound.createAsync(
        asset,
        {
          shouldPlay: false,
          isLooping: false,
          volume: 0,
          progressUpdateIntervalMillis: 1000,
        },
        null,
        true,
      );
      players.set(id, sound);
      return sound;
    } catch {
      return null;
    }
  })();

  playerPromises.set(id, promise);
  void promise.finally(() => {
    if (!players.has(id)) playerPromises.delete(id);
  });

  return promise;
}

export function preloadAppSounds(ids: readonly SoundId[] = PRELOAD_SOUND_IDS): void {
  void ensureAudioMode();
  ids.forEach(id => {
    void getOrCreatePlayer(id);
  });
}

export async function playAppSound(id: SoundId, options: PlayOptions = {}): Promise<void> {
  const entry = getSoundManifestEntry(id);
  if (!entry) return;

  const settings = getUserSettingsSnapshot();
  if (!options.force) {
    if (!settings.appSoundsEnabled) return;
    if (entry.category === 'ceremony' && !settings.ceremonySoundsEnabled) return;
  }

  const now = Date.now();
  const last = lastPlayedAt.get(id) ?? 0;
  if (!options.force && now - last < entry.throttleMs) return;

  if (!options.force && now < ceremonyBusyUntil && entry.priority < activePriority) {
    return;
  }

  const player = await getOrCreatePlayer(id);
  if (!player) return;

  const baseVolume = options.volume ?? settings.appSoundsVolume;
  const volume = normalizeAppSoundVolume(baseVolume) * entry.defaultVolume;
  lastPlayedAt.set(id, now);

  if (entry.category === 'ceremony') {
    ceremonyBusyUntil = now + entry.durationMs;
    activePriority = entry.priority;
    setTimeout(() => {
      if (Date.now() >= ceremonyBusyUntil) activePriority = 0;
    }, entry.durationMs + 40);
  }

  try {
    await player.replayAsync({
      shouldPlay: true,
      positionMillis: 0,
      volume,
      isMuted: false,
    });
  } catch {}
}

export function stopAllAppSounds(): void {
  players.forEach(player => {
    void player.setStatusAsync({ shouldPlay: false }).catch(() => {});
  });
  ceremonyBusyUntil = 0;
  activePriority = 0;
}
