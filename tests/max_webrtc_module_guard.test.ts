// Тест №8 спеки MAX Voice: guard нативного стека (контракт-паттерн репо).
//
// react-native-webrtc и react-native-incall-manager НЕ установлены в этом
// окружении — ровно как на OTA-бинарнике без пакетов. Loader обязан вернуть
// null без throw, а вход в MAX-звонок обязан быть скрыт даже при включённом
// гейте: кнопка, падающая на первом нажатии, хуже отсутствия кнопки.

import {
  isMaxVoiceNativeAvailable,
  loadMaxVoiceNative,
} from '../app/max_webrtc_module';
import {
  isMaxVoiceCallEnabled,
  isMaxVoiceEntryVisible,
  MAX_VOICE_GATE_DEFAULT,
} from '../app/max_voice_flags';

describe('max_webrtc_module: guarded loader без нативных пакетов', () => {
  it('loadMaxVoiceNative() возвращает null и не бросает', () => {
    expect(() => loadMaxVoiceNative()).not.toThrow();
    expect(loadMaxVoiceNative()).toBeNull();
  });

  it('isMaxVoiceNativeAvailable() = false и не бросает', () => {
    expect(() => isMaxVoiceNativeAvailable()).not.toThrow();
    expect(isMaxVoiceNativeAvailable()).toBe(false);
  });

  it('повторные вызовы стабильны (без побочных эффектов первого фейла)', () => {
    expect(loadMaxVoiceNative()).toBeNull();
    expect(isMaxVoiceNativeAvailable()).toBe(false);
    expect(isMaxVoiceNativeAvailable()).toBe(false);
  });
});

describe('max_voice_flags: вход скрыт без нативного модуля', () => {
  const ENV_KEY = 'EXPO_PUBLIC_MAX_VOICE_ENABLED';
  const savedEnv = process.env[ENV_KEY];

  afterEach(() => {
    if (savedEnv === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = savedEnv;
  });

  it('kill switch по дефолту ВЫКЛ (до запуска голосовая линия не существует)', () => {
    delete process.env[ENV_KEY];
    expect(MAX_VOICE_GATE_DEFAULT).toBe(false);
    expect(isMaxVoiceCallEnabled()).toBe(false);
    expect(isMaxVoiceEntryVisible()).toBe(false);
  });

  it('даже при принудительно открытом гейте вход скрыт: нативного стека нет', () => {
    process.env[ENV_KEY] = 'true';
    expect(isMaxVoiceCallEnabled()).toBe(true);
    // Гейт открыт, но isMaxVoiceNativeAvailable()=false → входа нет.
    expect(isMaxVoiceEntryVisible()).toBe(false);
  });

  it('env-override умеет и явно выключать (QA-сборка)', () => {
    process.env[ENV_KEY] = 'false';
    expect(isMaxVoiceCallEnabled()).toBe(false);
    expect(isMaxVoiceEntryVisible()).toBe(false);
  });
});
