/**
 * cards-2.0 (E13): выбранный голос TTS — fc_voice_prefs_v1 {voiceIdEn} и fc_voice_prefs_by_lang_v1 (es/fr/de/it)
 * (app/flashcards/voice_prefs.ts). Озвучка читает выбор синхронно через peekVoiceIdForLocale (use-audio).
 * зачем (Ревизор 15.10, пачка 2.65): мёртвая цепочка pickVoiceForLang удалена — сторож стоит на том, что читает озвучка.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __resetVoicePrefsForTests,
  FC_VOICE_PREFS_KEY,
  getVoicePrefs,
  parseVoicePrefs,
  peekEnVoiceId,
  peekVoiceIdForLocale,
  setEnVoiceId,
  setVoiceIdForLang,
} from '../app/flashcards/voice_prefs';

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

describe('результат записи выбора (аудит Optimistic UI 15.10)', () => {
  it('успешная запись возвращает true', async () => {
    await expect(setEnVoiceId('voice-ok')).resolves.toBe(true);
  });

  it('сбой диска возвращает false, кэш (его читает озвучка) возвращается к прежнему, причина в журнале [VOICE-PICK] (Ревизор P1)', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk_full'));
    await expect(setEnVoiceId('voice-fail')).resolves.toBe(false);
    expect(peekEnVoiceId()).toBeNull();
    expect(warn.mock.calls.some((call) => String(call[0]).includes('[VOICE-PICK]') && String(call[0]).includes('disk_full'))).toBe(true);
    // setItem не восстанавливаем mockRestore: у мока хранилища он сбросил бы рабочую реализацию; once-отказ уже израсходован
    warn.mockRestore();
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

describe('выбранный голос по языку — то, что читает озвучка (peekVoiceIdForLocale)', () => {
  it('каждый язык обучения хранит свой голос; локаль любого региона находит выбор своего языка', async () => {
    await setVoiceIdForLang('en', 'en-voice');
    await setVoiceIdForLang('fr', 'fr-voice');
    await setVoiceIdForLang('de', 'de-voice');
    expect(peekVoiceIdForLocale('en-US')).toBe('en-voice');
    expect(peekVoiceIdForLocale('fr-CA')).toBe('fr-voice');
    expect(peekVoiceIdForLocale('de-DE')).toBe('de-voice');
    expect(peekVoiceIdForLocale('it-IT')).toBeNull(); // не выбран — системный
    expect(peekVoiceIdForLocale('ru-RU')).toBeNull(); // не язык обучения
  });

  it('английский — в прежнем ключе (старые установки не теряют выбор)', async () => {
    await setVoiceIdForLang('en', 'legacy-en');
    expect(peekEnVoiceId()).toBe('legacy-en');
    expect(parseVoicePrefs(await storageMock.getItem(FC_VOICE_PREFS_KEY))).toEqual({ voiceIdEn: 'legacy-en' });
  });

  it('null возвращает системный голос языка', async () => {
    await setVoiceIdForLang('it', 'it-voice');
    await setVoiceIdForLang('it', null);
    expect(peekVoiceIdForLocale('it-IT')).toBeNull();
  });
});
