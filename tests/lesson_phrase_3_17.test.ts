import { isCorrectAnswer } from '../constants/contractions';
import { LESSON_3_PHRASES } from '../app/lesson_data_1_8_phrases_es.gen';
import { LESSON_3_PHRASES as SOURCE_LESSON_3_PHRASES } from '../app/lesson_data_1_8_phrases_source';
import { phraseCanonicalAnswer, phrasePrimarySurface } from '../app/phrase_target_utils';

describe('lesson 3 phrase 17', () => {
  const phrase = LESSON_3_PHRASES.find((p) => p.id === 'lesson3_phrase_17');
  const sourcePhrase = SOURCE_LESSON_3_PHRASES.find((p) => p.id === 'lesson3_phrase_17');

  it('keeps visible English content aligned with English grading tokens', () => {
    expect(phrase).toBeDefined();
    expect(phrase!.english).toBe('He writes messages');
    expect(phraseCanonicalAnswer(phrase!, 'en')).toBe('He writes messages');
    expect(isCorrectAnswer('He writes messages', phraseCanonicalAnswer(phrase!, 'en'))).toBe(true);
  });

  it('keeps source data aligned with generated runtime data', () => {
    expect(sourcePhrase).toBeDefined();
    expect(sourcePhrase!.english).toBe(phrase!.english);
    expect(sourcePhrase!.russian).toBe(phrase!.russian);
    expect(sourcePhrase!.ukrainian).toBe(phrase!.ukrainian);
    expect(phrasePrimarySurface(sourcePhrase!, 'en')).toBe('He writes messages');
    expect(phraseCanonicalAnswer(sourcePhrase!, 'en')).toBe('He writes messages');
  });
});
