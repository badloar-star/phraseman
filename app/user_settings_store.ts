import AsyncStorage from '@react-native-async-storage/async-storage';
import { devEduSettingsOverlay } from './dev_edu_settings';
import { patchAppSnapshot } from './app_snapshot_store';
import { DebugLogger } from './debug-logger';
import { beginSettingsStorageMutation, type SettingsBootReadScope } from '../lib/startup_settings_read_scope';

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
  // зачем (координатор 14.10, settings-gap-034): dev-подмена показа «Автопроверка вкл, 1,0x» для кадра паритета; в стор-сборке — тот же объект.
  return devEduSettingsOverlay({ ...memory });
}

export async function hydrateUserSettingsFromStorage(scope?: SettingsBootReadScope): Promise<void> {
  try {
    const readyRaw = scope?.peek();
    const remember = readyRaw == null ? scope?.beginRead() : undefined;
    const raw = readyRaw ?? await AsyncStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    memory = raw ? normalizeSettings(parsed) : { ...DEFAULT_SETTINGS };
    // Failed/missing/malformed reads remain independent on the next attempt.
    // Keep raw bytes, not mutable parsed objects shared with snapshot consumers.
    if (raw && parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      remember?.(raw);
    }
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
  const finishMutation = beginSettingsStorageMutation();
  try {
    memory = normalizeSettings(s);
    publishSettingsSnapshot('local');
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(memory));
    } catch (e) {
      DebugLogger.error('user_settings_store:saveSettings', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  } finally {
    finishMutation();
  }
}

/**
 * Применить настройки мгновенно (память + снимок — синхронно), запись в хранилище идёт фоном.
 * // зачем (координатор 12.10, аудит Optimistic UI R1, E4/E6): возвращает Promise<boolean> — удалась ли запись; прежние вызовы игнорируют значение (обратно совместимо), экран может откатить переключатель при false.
 */
export function applyUserSettingsNow(s: UserSettings): Promise<boolean> {
  const finishMutation = beginSettingsStorageMutation();
  try {
    memory = normalizeSettings(s);
    publishSettingsSnapshot('local');
    // зачем (координатор 12.10, аудит Optimistic UI R1): отказ записи настроек раньше глотался молча (then(finish, finish)) — теперь причина в журнал; значение в памяти остаётся.
    return AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(memory)).then(() => {
      finishMutation();
      return true;
    }, (error: unknown) => {
      console.warn(`[OPT-UI] user_settings persist_failed reason=${error instanceof Error ? error.message : String(error)}`); // guard-ok: причина отказа записи
      finishMutation();
      return false;
    });
  } catch (error) {
    finishMutation();
    throw error;
  }
}

export default function __RouteShim() { return null; }
