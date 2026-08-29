import AsyncStorage from '@react-native-async-storage/async-storage';
import { patchAppSnapshot } from './app_snapshot_store';
import { DebugLogger } from './debug-logger';

const SETTINGS_KEY = 'user_settings';
// Lower bound raised from 0.5 to 0.8: at 0.5 the pre-generated voice clips slow
// down so much the voice distorts/garbles. 0.8 stays clear. Upper bound kept
// generous for system TTS; the settings slider exposes the usable 0.8–1.3 range.
const MIN_SPEECH_RATE = 0.8;
const MAX_SPEECH_RATE = 2.5;

export const DEFAULT_SETTINGS = {
  autoCheck: false,
  voiceOut: true,
  speechRate: 0.9,
  speechVoiceId: '',
  hardMode: false,
  autoAdvance: false,
  haptics: true,
  immediateCheck: false,
  // FeedbackKit: тумблер «Звуки эффектов» (клики/верно-ошибка/награды/гроза).
  // Читается синхронно через getUserSettingsSnapshot() внутри app/feedback/feedback_kit.
  // ВНИМАНИЕ: имя намеренно uiSounds — легаси-ключи appSoundsEnabled/
  // ceremonySoundsEnabled/appSoundsVolume принудительно чистятся в normalizeSettings.
  uiSounds: true,
};

export type UserSettings = typeof DEFAULT_SETTINGS;

let memory: UserSettings = { ...DEFAULT_SETTINGS };

function publishSettingsSnapshot(source: 'storage' | 'local'): void {
  patchAppSnapshot({
    settings: {
      source,
      updatedAt: Date.now(),
      ...memory,
    },
  });
}

export function normalizeSpeechRate(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_SETTINGS.speechRate;
  return Math.max(MIN_SPEECH_RATE, Math.min(MAX_SPEECH_RATE, Math.round(n * 10) / 10));
}

function normalizeSettings(raw: Partial<UserSettings> | null | undefined): UserSettings {
  const base = { ...(raw ?? {}) } as Record<string, unknown>;
  delete base.showHints;
  delete base.appSoundsEnabled;
  delete base.ceremonySoundsEnabled;
  delete base.appSoundsVolume;
  const merged = { ...DEFAULT_SETTINGS, ...base } as UserSettings;
  return {
    ...merged,
    voiceOut: !!merged.voiceOut,
    uiSounds: !!merged.uiSounds,
    speechRate: normalizeSpeechRate(merged.speechRate),
    speechVoiceId: typeof merged.speechVoiceId === 'string' ? merged.speechVoiceId : '',
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
  publishSettingsSnapshot('storage');
}

export const loadSettings = async (): Promise<UserSettings> => {
  await hydrateUserSettingsFromStorage();
  return getUserSettingsSnapshot();
};

export async function saveSettings(s: UserSettings): Promise<void> {
  memory = normalizeSettings(s);
  publishSettingsSnapshot('local');
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(memory));
  } catch (e) {
      DebugLogger.error('user_settings_store:saveSettings', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

export function applyUserSettingsNow(s: UserSettings): void {
  memory = normalizeSettings(s);
  publishSettingsSnapshot('local');
  void AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(memory)).catch(() => {});
}

export default function __RouteShim() { return null; }
