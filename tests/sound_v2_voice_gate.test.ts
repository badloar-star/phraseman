// зачем (координатор 15.10, условие включения sound_v2): эффекты V2 не звучат поверх озвучки фраз (TTS) — пока идёт речь и 250 мс после неё рантайм говорит «речь», как SoundArbiter.
// Проверяем сам рантайм (а не только банк): пауза после конца речи и сигнал «замолчать» при начале речи.
const mockActivity = { spokenActive: false, recordingActive: false };
const mockListeners = new Set<() => void>();

jest.mock('react-native', () => ({ Platform: { OS: 'ios', Version: '17' } }));
jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn() }));
jest.mock('@/app/audio_session_coordinator', () => ({
  getManagedAudioModeSnapshot: () => ({ recordingActive: false }),
  subscribeManagedAudioMode: () => () => undefined,
}));
jest.mock('@/modules/audio/audio_activity', () => ({
  getAudioActivitySnapshot: () => ({ ...mockActivity }),
  subscribeAudioActivity: (listener: () => void) => {
    mockListeners.add(listener);
    return () => mockListeners.delete(listener);
  },
}));
jest.mock('@/modules/audio/sound_settings', () => ({
  getSoundSettingsSnapshot: () => ({ effectsEnabled: true }),
  subscribeSoundSettings: () => () => undefined,
}));

import { POST_VOICE_GAP_MS, isVoiceActive, onSilenceNeeded, resetVoiceGateForTests } from '../modules/sound_v2/sound_v2_runtime';

const fire = () => mockListeners.forEach((listener) => listener());

describe('рантайм звуков V2: уважает озвучку фраз', () => {
  beforeEach(() => {
    mockActivity.spokenActive = false;
    mockActivity.recordingActive = false;
    mockListeners.clear();
    resetVoiceGateForTests();
  });

  it('речи нет — эффект разрешён', () => {
    expect(isVoiceActive(1_000)).toBe(false);
  });

  it('идёт речь — эффект молчит; речь кончилась — ещё 250 мс тишины, потом разрешён', () => {
    mockActivity.spokenActive = true;
    expect(isVoiceActive(1_000)).toBe(true);
    mockActivity.spokenActive = false;
    expect(isVoiceActive(1_100)).toBe(true); // конец речи замечен в 1100 → пауза до 1350
    expect(isVoiceActive(1_100 + POST_VOICE_GAP_MS - 1)).toBe(true);
    expect(isVoiceActive(1_100 + POST_VOICE_GAP_MS)).toBe(false);
  });

  it('начало речи отправляет слушателю сигнал voice_active, конец речи — нет', () => {
    const reasons: string[] = [];
    const off = onSilenceNeeded((reason) => reasons.push(reason));
    mockActivity.spokenActive = true;
    fire();
    mockActivity.spokenActive = false;
    fire();
    expect(reasons).toEqual(['voice_active']);
    off();
  });

  it('запись микрофона по-прежнему даёт quiet_recording, а не voice_active', () => {
    const reasons: string[] = [];
    const off = onSilenceNeeded((reason) => reasons.push(reason));
    mockActivity.recordingActive = true;
    fire();
    expect(reasons).toEqual(['quiet_recording']);
    off();
  });
});
