import {
  audioTextForSide,
  buildFlashcardAudioDeck,
  estimateSpeechDurationMs,
  nextAudioPosition,
  speechLanguageForSide,
} from '../app/flashcards/audioSession';
import type { TrainingCard } from '../app/flashcards/trainingSources';

const baseCard: TrainingCard = {
  id: 'card-1',
  en: 'Mind the gap',
  ru: 'Осторожно, проём',
  uk: 'Обережно, проміжок',
  es: 'Cuidado con el hueco',
  categoryId: 'saved',
  isSystem: false,
  trainingKey: 'saved:all:card-1',
  trainingSourceId: 'saved:all',
  trainingSourceTitle: 'Saved',
};

describe('flashcards audio session engine', () => {
  it('builds a deck only from cards with both playable sides', () => {
    const deck = buildFlashcardAudioDeck(
      [
        baseCard,
        { ...baseCard, id: 'empty-back', trainingKey: 'saved:all:empty-back', ru: '', uk: '', es: '' },
        { ...baseCard, id: 'empty-front', trainingKey: 'saved:all:empty-front', en: '' },
      ],
      { contentLang: 'ru' },
    );

    expect(deck.map((card) => card.id)).toEqual(['card-1']);
  });

  it('resolves front and localized back text for playback', () => {
    expect(audioTextForSide(baseCard, 'front', 'ru')).toBe('Mind the gap');
    expect(audioTextForSide(baseCard, 'back', 'uk')).toBe('Обережно, проміжок');
    expect(audioTextForSide(baseCard, 'back', 'es')).toBe('Cuidado con el hueco');
  });

  it('uses target TTS locale for the front side and source locale for the back side', () => {
    expect(speechLanguageForSide(baseCard, 'front', 'ru', 'fr')).toBe('fr-FR');
    expect(speechLanguageForSide(baseCard, 'back', 'uk', 'en')).toBe('uk-UA');
    expect(speechLanguageForSide(baseCard, 'back', 'es', 'en')).toBe('es-ES');
  });

  it('keeps planned back-side speech locale explicit even when legacy text is Cyrillic', () => {
    const legacyCard = { ...baseCard, sourceLocales: { 'pt-BR': 'Осторожно' } };
    expect(speechLanguageForSide(legacyCard, 'back', 'pt-BR', 'en')).toBe('pt-BR');
  });

  it('advances front to back, then to the next card, then finishes', () => {
    expect(nextAudioPosition({ index: 0, side: 'front' }, 2)).toEqual({ index: 0, side: 'back' });
    expect(nextAudioPosition({ index: 0, side: 'back' }, 2)).toEqual({ index: 1, side: 'front' });
    expect(nextAudioPosition({ index: 1, side: 'back' }, 2)).toBeNull();
  });

  it('keeps fallback speech duration bounded', () => {
    expect(estimateSpeechDurationMs('Hello', 0.9)).toBeGreaterThanOrEqual(1100);
    expect(estimateSpeechDurationMs('word '.repeat(500), 0.5)).toBeLessThanOrEqual(14000);
  });
});
