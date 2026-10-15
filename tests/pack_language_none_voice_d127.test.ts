/**
 * D127: карточки набора «без языка» не озвучиваются нигде.
 * Один маркер из inferExpoSpeechLanguage глушит все места озвучки карточек,
 * включая экраны, которые про такие наборы не знают (свайп-тренировка).
 */
import * as fs from 'fs';
import * as path from 'path';

jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn() }));
jest.mock('../app/user_settings_store', () => ({
  getUserSettingsSnapshot: () => ({ speechRate: 1, speechVoiceId: '' }),
  normalizeSpeechRate: (rate: number) => rate,
}));
jest.mock('../modules/audio/voice_playback_policy', () => ({
  voicePlaybackPolicy: { captureStart: () => 1, registerStop: () => () => undefined },
}));
jest.mock('../modules/audio/audio_runtime_arbiter', () => ({
  claimSpokenAudio: jest.fn(),
  whenSpokenAudioReady: jest.fn(),
}));
jest.mock('../modules/audio/phrase_audio_timing', () => ({ phraseAudioClipStartTimeoutMs: () => 1000 }));
jest.mock('../app/flashcards/voice_prefs', () => ({ peekEnVoiceId: () => null, peekVoiceIdForLocale: () => null }));

import { inferExpoSpeechLanguage, SILENT_SPEECH_LANGUAGE } from '../hooks/use-audio';
import { voicedDeckCards, type DeckCard } from '../app/flashcards/deck_sources';

describe('D127 voice gate', () => {
  it('a card of a pack without a language resolves to the silent speech language', () => {
    expect(inferExpoSpeechLanguage('Paris', 'none')).toBe(SILENT_SPEECH_LANGUAGE);
    expect(inferExpoSpeechLanguage('Париж', 'none')).toBe(SILENT_SPEECH_LANGUAGE);
  });

  it('other packs keep their speech language', () => {
    expect(inferExpoSpeechLanguage('bonjour', 'fr')).toBe('fr-FR');
    expect(inferExpoSpeechLanguage('hello', undefined)).toBe('en-US');
  });

  it('speak() exits before claiming audio when the language is silent', () => {
    const source = fs.readFileSync(path.join(__dirname, '../hooks/use-audio.ts'), 'utf8');
    const speakStart = source.indexOf('const speak = useCallback(');
    const silentGate = source.indexOf('=== SILENT_SPEECH_LANGUAGE', speakStart);
    const policyClaim = source.indexOf('voicePlaybackPolicy.captureStart()', speakStart);
    expect(speakStart).toBeGreaterThan(0);
    expect(silentGate).toBeGreaterThan(speakStart);
    expect(silentGate).toBeLessThan(policyClaim);
  });

  it('the speaking mode drops cards of packs without a language', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const cards: DeckCard[] = [
      { id: 'a', en: 'hello', translation: 'привет', ru: 'привет' },
      { id: 'b', en: 'Paris', translation: 'Франция', ru: 'Франция', packLanguage: 'none' },
    ];
    expect(voicedDeckCards(cards).map((card) => card.id)).toEqual(['a']);
    log.mockRestore();
  });
});
