// зачем: владелец 14.10 одобрил звуки лаборатории; несколько вариантов на событие, без повторов подряд.
//
// Боевые зависимости банка звуков V2 (expo-audio + настройки приложения). Вынесены в отдельный файл, чтобы
// sound_bank.ts можно было импортировать и тестировать без нативных модулей и чтобы всё тяжёлое
// (expo-audio, снимки настроек, аудиоактивность) грузилось ЛЕНИВО — только когда флаг sound_v2 включён
// и пришло первое событие, прошедшее все проверки. На холодном старте этот файл не загружается.
//
// Откуда берутся решения «играть ли звук» — те же источники, что у старого sound_director:
//  - общий переключатель звука: getSoundSettingsSnapshot().effectsEnabled (настройка uiSounds);
//  - тихий режим: идёт запись микрофона (audio_activity.recordingActive или
//    audio_session_coordinator.recordingActive) — эффект из динамика попал бы в микрофон.
// Режим аудиосессии (UI_SFX_AUDIO_MODE, mixWithOthers) выставляет корневой layout через тот же
// audio_session_coordinator; банк его не трогает, только читает признак записи.

import { Platform } from 'react-native';
import { createAudioPlayer } from 'expo-audio';
import { getManagedAudioModeSnapshot, subscribeManagedAudioMode } from '@/app/audio_session_coordinator';
import { getAudioActivitySnapshot, subscribeAudioActivity } from '@/modules/audio/audio_activity';
import { getSoundSettingsSnapshot, subscribeSoundSettings } from '@/modules/audio/sound_settings';
import type { SoundV2Clip } from './catalog';
import type { SoundV2Player } from './sound_bank';

export function createRuntimePlayer(clip: SoundV2Clip): SoundV2Player {
  return createAudioPlayer(clip.source) as unknown as SoundV2Player;
}

/** Смена скорости воспроизведения: iOS — да; Android — с API 23 (ExoPlayer PlaybackParameters). */
export function isRateSupported(): boolean {
  return Platform.OS !== 'android' || Number(Platform.Version) >= 23;
}

export function isEffectsEnabled(): boolean {
  return getSoundSettingsSnapshot().effectsEnabled;
}

export function isRecordingActive(): boolean {
  return getAudioActivitySnapshot().recordingActive || getManagedAudioModeSnapshot().recordingActive;
}

// зачем (координатор 15.10, условие включения sound_v2): эффекты V2 не звучат поверх озвучки фраз (TTS) — те же правила, что у SoundArbiter:
// пока идёт речь и ещё POST_VOICE_GAP_MS после неё эффект молчит. Владение речью эффектам не нужно (аренда голоса остановила бы саму озвучку),
// поэтому рантайм только читает общую картину активности звука (audio_activity), как и для записи.
export const POST_VOICE_GAP_MS = 250;
let voiceWasActive = false;
let voiceEndedAt = 0;

/** Запоминает момент конца речи; зовётся при каждом чтении и из подписки на тишину. */
function noteVoice(spokenActive: boolean, now: number): void {
  if (voiceWasActive && !spokenActive) voiceEndedAt = now;
  voiceWasActive = spokenActive;
}

export function isVoiceActive(now: number = Date.now()): boolean {
  const spoken = getAudioActivitySnapshot().spokenActive;
  noteVoice(spoken, now);
  return spoken || now - voiceEndedAt < POST_VOICE_GAP_MS;
}

export function resetVoiceGateForTests(): void {
  voiceWasActive = false;
  voiceEndedAt = 0;
}

/** Тишина по требованию: выключили звуки или началась запись — банк гасит все играющие клипы сразу. */
export function onSilenceNeeded(listener: (reason: 'effects_disabled' | 'quiet_recording' | 'voice_active') => void): () => void {
  let effects = isEffectsEnabled();
  let recording = isRecordingActive();
  let voice = getAudioActivitySnapshot().spokenActive;
  noteVoice(voice, Date.now());
  const check = () => {
    const nextEffects = isEffectsEnabled();
    const nextRecording = isRecordingActive();
    const nextVoice = getAudioActivitySnapshot().spokenActive;
    noteVoice(nextVoice, Date.now());
    const voiceOn = !voice && nextVoice;
    voice = nextVoice;
    const effectsOff = effects && !nextEffects;
    const recordingOn = !recording && nextRecording;
    effects = nextEffects;
    recording = nextRecording;
    if (effectsOff) listener('effects_disabled');
    else if (recordingOn) listener('quiet_recording');
    else if (voiceOn) listener('voice_active');
  };
  const unsubscribers = [
    subscribeSoundSettings(check),
    subscribeAudioActivity(check),
    subscribeManagedAudioMode(check),
  ];
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
