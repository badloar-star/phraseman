import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'user_settings';
const MIN_SPEECH_RATE = 0.5;
const MAX_SPEECH_RATE = 1.0;

export const DEFAULT_SETTINGS = {
  autoCheck: false,
  voiceOut: true,
  speechRate: 0.9,
  hardMode: false,
  autoAdvance: false,
  haptics: true,
  immediateCheck: false,
  showHints: true,
};

export type UserSettings = typeof DEFAULT_SETTINGS;

let memory: UserSettings = { ...DEFAULT_SETTINGS };

export function normalizeSpeechRate(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_SETTINGS.speechRate;
  // Hard safety guard: prevent unrealistically fast TTS after corrupted/legacy settings.
  return Math.max(MIN_SPEECH_RATE, Math.min(MAX_SPEECH_RATE, Math.round(n * 10) / 10));
}

function normalizeSettings(raw: Partial<UserSettings> | null | undefined): UserSettings {
  const merged = { ...DEFAULT_SETTINGS, ...(raw ?? {}) } as UserSettings;
  return {
    ...merged,
    speechRate: normalizeSpeechRate((raw as any)?.speechRate ?? merged.speechRate),
  };
}

export function getUserSettingsSnapshot(): UserSettings {
  return { ...memory };
}

/**
 * Считать с диска в memory. Должна выполняться в app bootstrap до setReady,
 * чтобы getUserSettingsSnapshot() с первого кадра был актуален.
 */
export async function hydrateUserSettingsFromStorage(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (raw) {
      memory = normalizeSettings(JSON.parse(raw));
    } else {
      memory = { ...DEFAULT_SETTINGS };
    }
  } catch {
    memory = { ...DEFAULT_SETTINGS };
  }
}

export const loadSettings = async (): Promise<UserSettings> => {
  await hydrateUserSettingsFromStorage();
  return getUserSettingsSnapshot();
};

export async function saveSettings(s: UserSettings): Promise<void> {
  memory = normalizeSettings(s);
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(memory));
  } catch {}
}

/** Сразу обновить memory и фоновую запись (без await) — тумблер не ждёт диск. */
export function applyUserSettingsNow(s: UserSettings): void {
  memory = normalizeSettings(s);
  void AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(memory)).catch(() => {});
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
