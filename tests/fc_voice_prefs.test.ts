/**
 * cards-2.0 (E13): выбранный голос TTS EN — fc_voice_prefs_v1
 * (app/flashcards/voice_prefs.ts) + шаг «сохранённый» в цепочке фолбэков
 * pickVoiceForLang (app/flashcards/tts_voices.ts, §3.8).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __resetVoicePrefsForTests,
  FC_VOICE_PREFS_KEY,
  getVoicePrefs,
  parseVoicePrefs,
  peekEnVoiceId,
  setEnVoiceId,
} from '../app/flashcards/voice_prefs';
import { pickVoiceForLang, type FcVoiceLike } from '../app/flashcards/tts_voices';

const storageMock = AsyncStorage as unknown as {
  __reset: () => void;
  getItem: (k: string) => Promise<string | null>;
  setItem: (k: string, v: string) => Promise<void>;
};

beforeEach(() => {
  storageMock.__reset();
  __resetVoicePrefsForTests();
});

describe('parseVoicePrefs', () => {
  it('валидные prefs читаются', () => {
    expect(parseVoicePrefs(JSON.stringify({ voiceIdEn: 'com.apple.voice.enhanced.en-US.Samantha' })))
      .toEqual({ voiceIdEn: 'com.apple.voice.enhanced.en-US.Samantha' });
  });

  it('битое/пустое/чужое → дефолт (voiceIdEn: null)', () => {
    expect(parseVoicePrefs(null)).toEqual({ voiceIdEn: null });
    expect(parseVoicePrefs('')).toEqual({ voiceIdEn: null });
    expect(parseVoicePrefs('{broken')).toEqual({ voiceIdEn: null });
    expect(parseVoicePrefs('[1]')).toEqual({ voiceIdEn: null });
    expect(parseVoicePrefs(JSON.stringify({ voiceIdEn: '' }))).toEqual({ voiceIdEn: null });
    expect(parseVoicePrefs(JSON.stringify({ voiceIdEn: 42 }))).toEqual({ voiceIdEn: null });
  });
});

describe('set/get + синхронный кэш peekEnVoiceId', () => {
  it('setEnVoiceId персистит в fc_voice_prefs_v1 и мгновенно обновляет кэш', async () => {
    await setEnVoiceId('en-us-x-iol-local');
    expect(peekEnVoiceId()).toBe('en-us-x-iol-local');
    expect(parseVoicePrefs(await storageMock.getItem(FC_VOICE_PREFS_KEY))).toEqual({
      voiceIdEn: 'en-us-x-iol-local',
    });
    expect((await getVoicePrefs()).voiceIdEn).toBe('en-us-x-iol-local');
  });

  it('setEnVoiceId(null) возвращает системный голос', async () => {
    await setEnVoiceId('voice-1');
    await setEnVoiceId(null);
    expect(peekEnVoiceId()).toBeNull();
    expect((await getVoicePrefs()).voiceIdEn).toBeNull();
  });

  it('merge: не затирает чужие поля prefs при записи', async () => {
    await storageMock.setItem(FC_VOICE_PREFS_KEY, JSON.stringify({ futureField: 7 }));
    await setEnVoiceId('voice-2');
    const raw = JSON.parse((await storageMock.getItem(FC_VOICE_PREFS_KEY)) ?? '{}');
    expect(raw).toEqual({ futureField: 7, voiceIdEn: 'voice-2' });
  });
});

describe('pickVoiceForLang с сохранённым голосом (§3.8 «сохранённый → Enhanced → …»)', () => {
  const voices: FcVoiceLike[] = [
    { identifier: 'compact.en-US.Samantha', language: 'en-US', name: 'Samantha' },
    { identifier: 'enhanced.en-US.Ava', language: 'en-US', name: 'Ava', quality: 'Enhanced' },
    { identifier: 'uk-UA-voice', language: 'uk-UA', name: 'Lesya' },
  ];

  it('сохранённый голос существует в списке → берём его (важнее Enhanced)', () => {
    const r = pickVoiceForLang(voices, 'en', 'compact.en-US.Samantha');
    expect(r).toEqual({ available: true, language: 'en-US', voiceId: 'compact.en-US.Samantha' });
  });

  it('сохранённый голос удалён с устройства → обычная цепочка (Enhanced приоритет)', () => {
    const r = pickVoiceForLang(voices, 'en', 'deleted-voice-id');
    expect(r.voiceId).toBe('enhanced.en-US.Ava');
    expect(r.available).toBe(true);
  });

  it('пустой список голосов + сохранённый → доверяем выбору юзера', () => {
    const r = pickVoiceForLang([], 'en', 'my-voice');
    expect(r).toEqual({ available: true, language: 'en-US', voiceId: 'my-voice' });
  });

  it('без сохранённого — поведение E10 не меняется (Enhanced первым)', () => {
    const r = pickVoiceForLang(voices, 'en');
    expect(r.voiceId).toBe('enhanced.en-US.Ava');
  });
});
