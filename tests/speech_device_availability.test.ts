// §SPEECH-NA (владелец 04.10.2026): доступность распознавания речи на устройстве.
// Постоянным «не работает на этом устройстве» считается ТОЛЬКО отсутствие
// распознавателя; временный сбой проверки не отключает голос.

let mockSpeechModule: Record<string, unknown> | null = null;

jest.mock('react-native', () => ({ Platform: { OS: 'android', Version: 31 } }));
jest.mock('../app/speech_recognition_module', () => ({
  loadSpeechRecognitionModule: () => mockSpeechModule,
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SPEECH_AVAILABILITY_RECHECK_MS,
  SPEECH_AVAILABILITY_STORAGE_KEY,
  __setSpeechDeviceAvailabilityForTests,
  isSpeechAvailabilityRecordFresh,
  parseSpeechAvailabilityRecord,
  peekSpeechDeviceAvailability,
  probeSpeechRecognizer,
  speechUnavailableOnDeviceText,
} from '../app/speech_device_availability';

const baseModule = (extra: Record<string, unknown> = {}) => ({
  requestPermissionsAsync: async () => ({ granted: true }),
  getPermissionsAsync: async () => ({ granted: false }),
  start: () => undefined,
  stop: () => undefined,
  abort: () => undefined,
  addListener: () => ({ remove: () => undefined }),
  ...extra,
});

const flush = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
};

beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  (AsyncStorage as unknown as { __reset: () => void }).__reset();
  __setSpeechDeviceAvailabilityForTests(null);
  mockSpeechModule = null;
});
afterEach(() => { jest.restoreAllMocks(); });

describe('probeSpeechRecognizer', () => {
  it('нет нативного модуля → устройство без распознавателя', () => {
    expect(probeSpeechRecognizer(null, 'android')).toEqual({ kind: 'unavailable', reason: 'no_native_module', services: null });
  });

  it('Huawei без Google: isRecognitionAvailable=false и нет служб → unavailable', () => {
    const probe = probeSpeechRecognizer(baseModule({
      isRecognitionAvailable: () => false,
      getSpeechRecognitionServices: () => [],
    }) as never, 'android');
    expect(probe).toEqual({ kind: 'unavailable', reason: 'no_recognizer_service', services: 0 });
  });

  it('распознаватель есть → available (как раньше)', () => {
    const probe = probeSpeechRecognizer(baseModule({
      isRecognitionAvailable: () => true,
      getSpeechRecognitionServices: () => ['com.google.android.googlequicksearchbox'],
    }) as never, 'android');
    expect(probe).toEqual({ kind: 'available', reason: 'recognizer_present', services: 1 });
  });

  it('проверка бросила исключение → временный сбой, не «не работает»', () => {
    const probe = probeSpeechRecognizer(baseModule({
      isRecognitionAvailable: () => { throw new Error('binder died'); },
    }) as never, 'android');
    expect(probe.kind).toBe('transient');
  });

  it('нет API доступности, но и служб 0 на Android → unavailable; на iOS без API → available', () => {
    const noApi = baseModule({ getSpeechRecognitionServices: () => [] });
    expect(probeSpeechRecognizer(noApi as never, 'android').kind).toBe('unavailable');
    expect(probeSpeechRecognizer(baseModule() as never, 'ios').kind).toBe('available');
  });
});

describe('локальная запись вердикта', () => {
  const record = { v: 1 as const, state: 'unavailable' as const, reason: 'no_recognizer_service', appVersion: '2.0.0', checkedAtMs: 1_000 };

  it('свежая только для той же версии и не старше срока перепроверки', () => {
    expect(isSpeechAvailabilityRecordFresh(record, '2.0.0', 1_000 + 60_000)).toBe(true);
    expect(isSpeechAvailabilityRecordFresh(record, '2.0.1', 1_000 + 60_000)).toBe(false);
    expect(isSpeechAvailabilityRecordFresh(record, '2.0.0', 1_000 + SPEECH_AVAILABILITY_RECHECK_MS)).toBe(false);
    expect(isSpeechAvailabilityRecordFresh(null, '2.0.0', 1_000)).toBe(false);
  });

  it('битая запись игнорируется', () => {
    expect(parseSpeechAvailabilityRecord('{oops')).toBeNull();
    expect(parseSpeechAvailabilityRecord(JSON.stringify({ v: 1, state: 'maybe' }))).toBeNull();
    expect(parseSpeechAvailabilityRecord(JSON.stringify(record))).toEqual(record);
  });
});

describe('состояние процесса', () => {
  it('нет распознавателя → unavailable с первого взгляда и запись сохраняется', async () => {
    mockSpeechModule = baseModule({ isRecognitionAvailable: () => false, getSpeechRecognitionServices: () => [] });
    expect(peekSpeechDeviceAvailability()).toBe('unavailable');
    await flush();
    const saved = parseSpeechAvailabilityRecord(await AsyncStorage.getItem(SPEECH_AVAILABILITY_STORAGE_KEY));
    expect(saved?.state).toBe('unavailable');
    expect(saved?.reason).toBe('no_recognizer_service');
  });

  it('распознаватель есть → available, голос работает как раньше', () => {
    mockSpeechModule = baseModule({ isRecognitionAvailable: () => true });
    expect(peekSpeechDeviceAvailability()).toBe('available');
  });

  it('временный сбой без записи → unknown (кнопки не отключаются)', async () => {
    mockSpeechModule = baseModule({ isRecognitionAvailable: () => { throw new Error('busy'); } });
    expect(peekSpeechDeviceAvailability()).toBe('unknown');
    await flush();
    expect(peekSpeechDeviceAvailability()).toBe('unknown');
  });

  it('временный сбой при свежей записи «нет распознавателя» → unavailable из записи', async () => {
    await AsyncStorage.setItem(SPEECH_AVAILABILITY_STORAGE_KEY, JSON.stringify({
      v: 1, state: 'unavailable', reason: 'no_recognizer_service', appVersion: 'unknown', checkedAtMs: Date.now(),
    }));
    mockSpeechModule = baseModule({ isRecognitionAvailable: () => { throw new Error('busy'); } });
    expect(peekSpeechDeviceAvailability()).toBe('unknown');
    await flush();
    expect(peekSpeechDeviceAvailability()).toBe('unavailable');
  });

  it('живой ответ «есть распознаватель» побеждает старую запись', async () => {
    await AsyncStorage.setItem(SPEECH_AVAILABILITY_STORAGE_KEY, JSON.stringify({
      v: 1, state: 'unavailable', reason: 'no_recognizer_service', appVersion: 'unknown', checkedAtMs: Date.now(),
    }));
    mockSpeechModule = baseModule({ isRecognitionAvailable: () => true });
    expect(peekSpeechDeviceAvailability()).toBe('available');
    await flush();
    expect(peekSpeechDeviceAvailability()).toBe('available');
    expect(parseSpeechAvailabilityRecord(await AsyncStorage.getItem(SPEECH_AVAILABILITY_STORAGE_KEY))?.state).toBe('available');
  });
});

describe('текст', () => {
  it('короткий текст есть на всех 9 языках интерфейса', () => {
    const langs = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
    const texts = langs.map((lang) => speechUnavailableOnDeviceText(lang as never));
    expect(texts[0]).toBe('Распознавание речи не работает на этом устройстве');
    expect(new Set(texts).size).toBe(langs.length);
    texts.forEach((text) => expect(text.length).toBeLessThan(70));
  });
});
