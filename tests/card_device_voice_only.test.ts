/**
 * Карточка звучит только голосом устройства нужного языка.
 *
 * зачем (владелец 11.11.2026, «удали всю озвучку»): готовых клипов карточек (D128) больше нет.
 * Сторож ловит две поломки: возврат ссылок на клипы и чтение слова голосом чужого языка.
 * Заменил tests/card_tts_client_server_parity.test.ts — сверять с сервером стало нечего.
 */
import fs from 'node:fs';
import path from 'node:path';

import * as client from '../app/flashcards/card_tts_audio';

const ROOT = path.resolve(__dirname, '..');

describe('голос карточки — только устройство', () => {
  beforeEach(() => client.__resetCardTtsAudioForTests());

  it.each([
    ['en', 'Nice to meet you'],
    ['es', '¿Dónde está el baño?'],
    ['fr', "Je n'ai pas compris"],
    ['de', 'Das Haus ist groß'],
    ['it', 'Piacere di conoscerti'],
  ] as const)('клипа нет ни для одного языка (%s)', async (language, text) => {
    await expect(client.resolveCardTtsTarget(language, text)).resolves.toBeNull();
  });

  it('модуль карточек не знает адресов хранилища и не считает хэши клипов', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'flashcards', 'card_tts_audio.ts'), 'utf8');
    expect(source).not.toContain('firebasestorage');
    expect(source).not.toContain('expo-crypto');
    expect(source).not.toContain('.mp3');
  });

  it('промахи клипов не запоминаются — запоминать нечего', () => {
    client.markCardTtsMissing('k', 1_000);
    expect(client.isCardTtsKnownMissing('k', 2_000)).toBe(false);
  });

  it('сопоставляет локаль речи с языком карточки; перевод и «без языка» — не язык озвучки', () => {
    expect(client.cardTtsLanguageFromSpeechLocale('es-ES')).toBe('es');
    expect(client.cardTtsLanguageFromSpeechLocale('it_IT')).toBe('it');
    expect(client.cardTtsLanguageFromSpeechLocale('en-US')).toBe('en');
    expect(client.cardTtsLanguageFromSpeechLocale('ru-RU')).toBeNull();
    expect(client.cardTtsLanguageFromSpeechLocale('zxx')).toBeNull();
  });

  it('голос устройства только точного языка; никогда не чужой по умолчанию', () => {
    const voices = [{ identifier: 'v1', language: 'en-US' }, { identifier: 'v2', language: 'es-MX' }];
    expect(client.resolveCardDeviceVoice('es', voices)).toEqual({ available: true, locale: 'es-mx' });
    expect(client.resolveCardDeviceVoice('it', voices)).toEqual({ available: false, reason: 'exact_language_missing' });
    expect(client.resolveCardDeviceVoice('fr', [])).toEqual({ available: false, reason: 'inventory_unverified' });
    expect(client.resolveCardDeviceVoice('en', [])).toEqual({ available: true, locale: 'en-US' });
    expect(client.resolveCardDeviceVoice('de', [{ identifier: 'd', language: 'de-DE' }])).toEqual({ available: true, locale: 'de-DE' });
  });

  it('спокойное «Голос недоступен» — не чаще раза за паузу', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.doMock('../app/events', () => ({ emitAppEvent: jest.fn(), actionToastTri: (_t: string, m: unknown) => m }));
    expect(client.notifyCardVoiceUnavailable('it', 'exact_language_missing', 100_000)).toBe(true);
    expect(client.notifyCardVoiceUnavailable('it', 'exact_language_missing', 105_000)).toBe(false);
    expect(client.notifyCardVoiceUnavailable('it', 'exact_language_missing', 200_000)).toBe(true);
    warn.mockRestore();
  });

  it('use-audio без клипа уходит в голос устройства точного языка', () => {
    const audio = fs.readFileSync(path.join(ROOT, 'hooks', 'use-audio.ts'), 'utf8');
    expect(audio).toContain('await speakCardWithDevice(cardLang);');
    expect(audio).toContain('resolveCardDeviceVoice(cardLang, voices)');
    expect(audio).toContain("opts?.onError?.(new Error('card_voice_unavailable'))");
  });

  it('сервер не ставит наборы в очередь озвучки', () => {
    const packs = fs.readFileSync(path.join(ROOT, 'functions', 'src', 'community_packs.ts'), 'utf8');
    expect(packs).not.toContain('enqueueCardTtsJob');
    expect(packs).not.toContain('card_tts_jobs');
  });
});
