import fs from 'node:fs';
import path from 'node:path';
import { speechStudyLanguageOf, studySpeechLocale, STUDY_SPEECH_LOCALE } from '../app/study_speech_locale';
import { inferExpoSpeechLanguage } from '../hooks/use-audio';

// зачем (аудит R49 + R57, координатор 15.10): es/fr/de/it открыты всем, а микрофоны урока, «Моих ошибок», Карточек и
// озвучка карточек слушали и читали по-английски (зашитый 'en-US'). Один помощник — app/study_speech_locale.ts;
// сторож не даёт снова зашить 'en-US' в местах речи и требует язык у каждой панели «Скажи вслух» на экранах.
const ROOT = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('study speech locale helper', () => {
  it('maps every study language to its exact locale, including Italian', () => {
    expect(['en', 'es', 'fr', 'de', 'it'].map((l) => studySpeechLocale(l))).toEqual(['en-US', 'es-ES', 'fr-FR', 'de-DE', 'it-IT']);
  });

  it('understands long and odd forms, falls back to English for unknown', () => {
    expect(speechStudyLanguageOf('es-MX')).toBe('es');
    expect(speechStudyLanguageOf('DE_de')).toBe('de');
    expect(speechStudyLanguageOf('ru')).toBeNull();
    expect(studySpeechLocale(undefined)).toBe('en-US');
    expect(studySpeechLocale('pt')).toBe('en-US');
  });

  it('TTS uses the same table: Latin text with a pack language hint gets that voice', () => {
    expect(inferExpoSpeechLanguage('Bonjour', 'fr')).toBe(STUDY_SPEECH_LOCALE.fr);
    expect(inferExpoSpeechLanguage('Guten Morgen', 'de')).toBe('de-DE');
    expect(inferExpoSpeechLanguage('Ciao', 'it')).toBe('it-IT');
    expect(inferExpoSpeechLanguage('Hola', 'es')).toBe('es-ES');
    expect(inferExpoSpeechLanguage('Hello')).toBe('en-US');
    expect(inferExpoSpeechLanguage('Привет', 'fr')).toBe('ru-RU'); // кириллица — по тексту, не по набору
  });
});

describe('speech surfaces: no hard-coded en-US, every speaking panel gets a locale', () => {
  const NO_LITERAL = [
    'app/lesson1.tsx',
    'app/mistake_practice_session.tsx',
    'app/flashcards_speaking_session.tsx',
    'app/flashcards_card_editor.tsx',
    'app/flashcards_collection.tsx',
    'app/flashcards/CollectionGalleryView.tsx',
    'app/flashcards/VideoSetView.tsx',
    'app/flashcards/ExpandedCardV2.tsx',
    'components/onboarding_aha/SpeechBeat.tsx',
  ];

  it.each(NO_LITERAL)('%s has no literal en-US', (file) => {
    expect(read(file)).not.toMatch(/['"]en-US['"]/);
  });

  it.each([
    'app/lesson1.tsx',
    'app/mistake_practice_session.tsx',
    'app/flashcards_speaking_session.tsx',
    'app/learning_v2_direct_session_player_v1.tsx',
  ])('%s passes recognitionLocale to every <SpeakingPanel>', (file) => {
    const src = read(file);
    const panels = src.split(/<SpeakingPanel\s/).slice(1).map((chunk) => chunk.slice(0, chunk.indexOf('/>') > 0 ? chunk.indexOf('/>') : 1500));
    expect(panels.length).toBeGreaterThan(0);
    for (const panel of panels) expect(panel).toMatch(/recognitionLocale=\{/);
  });

  it('card speakers pass the card language (gallery tile, expanded card, video set)', () => {
    expect(read('app/flashcards/CollectionGalleryView.tsx')).toMatch(/onSpeak\(card\.en, card\.packLanguage\)/);
    const collection = read('app/flashcards_collection.tsx');
    expect(collection).not.toMatch(/onSpeak=\{\(text\) => onSpeakCb\(text\)\}/);
    expect(collection).toMatch(/speakFront\(text, expandedOpened\?\.packLanguage\)/);
  });
});
