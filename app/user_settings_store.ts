import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'user_settings';
const MIN_SPEECH_RATE = 0.5;
const MAX_SPEECH_RATE = 1.0;
export const APP_SOUND_DEFAULT_VOLUME = 0.65;

export const DEFAULT_SETTINGS = {
  autoCheck: false,
  voiceOut: true,
  speechRate: 0.9,
  speechVoiceId: '',
  hardMode: false,
  autoAdvance: false,
  haptics: true,
  immediateCheck: false,
  appSoundsEnabled: true,
  appSoundsVolume: APP_SOUND_DEFAULT_VOLUME,
  ceremonySoundsEnabled: true,
};

export type UserSettings = typeof DEFAULT_SETTINGS;

let memory: UserSettings = { ...DEFAULT_SETTINGS };

export function normalizeSpeechRate(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_SETTINGS.speechRate;
  return Math.max(MIN_SPEECH_RATE, Math.min(MAX_SPEECH_RATE, Math.round(n * 10) / 10));
}

export function normalizeAppSoundVolume(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return APP_SOUND_DEFAULT_VOLUME;
  return Math.max(0, Math.min(1, Math.round(n * 100) / 100));
}

function normalizeSettings(raw: Partial<UserSettings> | null | undefined): UserSettings {
  const base = { ...(raw ?? {}) } as Record<string, unknown>;
  delete base.showHints;
  const merged = { ...DEFAULT_SETTINGS, ...base } as UserSettings;
  return {
    ...merged,
    voiceOut: !!merged.voiceOut,
    speechRate: normalizeSpeechRate(merged.speechRate),
    speechVoiceId: typeof merged.speechVoiceId === 'string' ? merged.speechVoiceId : '',
    appSoundsEnabled: merged.appSoundsEnabled !== false,
    appSoundsVolume: normalizeAppSoundVolume(merged.appSoundsVolume),
    ceremonySoundsEnabled: merged.ceremonySoundsEnabled !== false,
  };
}

export function getUserSettingsSnapshot(): UserSettings {
  return { ...memory };
}

export async function hydrateUserSettingsFromStorage(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    memory = raw ? normalizeSettings(JSON.parse(raw)) : { ...DEFAULT_SETTINGS };
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

export function applyUserSettingsNow(s: UserSettings): void {
  memory = normalizeSettings(s);
  void AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(memory)).catch(() => {});
}

export default function __RouteShim() { return null; }
