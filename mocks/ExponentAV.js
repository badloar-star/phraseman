/**
 * Mock ExponentAV для Expo Go.
 * Реализует минимальный интерфейс Audio.Sound через expo-speech.
 * В production build этот файл не используется — там работает нативный ExponentAV.
 */
import * as Speech from 'expo-speech';

// Простой mock звука через expo-speech
const soundRegistry = new Map();
let soundCounter = 0;

export default {
  async setAudioMode() {},
  async setAudioIsEnabled() {},

  async loadForSound(nativeSource, fullInitialStatus) {
    const key = ++soundCounter;
    let uri = '';
    if (typeof nativeSource === 'string') {
      uri = nativeSource;
    } else if (nativeSource && typeof nativeSource === 'object') {
      uri = nativeSource.uri || '';
    }
    soundRegistry.set(key, { uri, rate: 1.0, playing: false });
    return [key, { isLoaded: true, uri, isPlaying: false, positionMillis: 0 }];
  },

  async unloadForSound(key) {
    soundRegistry.delete(key);
    return { isLoaded: false };
  },

  async setStatusForSound(key, status) {
    const sound = soundRegistry.get(key);
    if (!sound) return { isLoaded: false };
    if (status.rate !== undefined) sound.rate = status.rate;
    if (status.positionMillis === 0) sound.playing = false;
    if (status.shouldPlay === true && !sound.playing) {
      sound.playing = true;
      // Воспроизвести через expo-speech используя URI как текст — нет,
      // просто ничего не делаем. Реальный звук будет в production.
    }
    return { isLoaded: true, isPlaying: sound.playing, positionMillis: 0 };
  },

  async getStatusForSound(key) {
    const sound = soundRegistry.get(key);
    if (!sound) return { isLoaded: false };
    return { isLoaded: true, isPlaying: sound.playing || false, positionMillis: 0 };
  },

  async replaySound(key, status) {
    return this.setStatusForSound(key, status);
  },

  // Recording stubs
  async getAudioRecordingStatus() {
    return { canRecord: false, isRecording: false, isDoneRecording: false, durationMillis: 0, uri: null };
  },
  async prepareAudioRecorder() { return { uri: null, status: {} }; },
  async startAudioRecording() { return {}; },
  async pauseAudioRecording() { return {}; },
  async stopAudioRecording() { return {}; },
  async unloadAudioRecorder() {},
  async getPermissionsAsync() { return { status: 'undetermined', granted: false, canAskAgain: true, expires: 'never' }; },
  async requestPermissionsAsync() { return { status: 'undetermined', granted: false, canAskAgain: true, expires: 'never' }; },
};
