import { scorePronunciationTranscript } from '../app/pronunciation_scoring_core';

// зачем: репорт ученика (урок 2, A1, голосовой ответ): «сказал THAT — принял как IT»,
// «сказал afraid — засчитал scare и перешёл дальше». Итоговый процент (~78–82%)
// перекрывал порог 75%, и одно ЧУЖОЕ слово во фразе из 4–5 слов засчитывалось.
// Контракт: подмена слова другим словом = незачёт, как бы ни был высок процент.
describe('pronunciation scoring: wrong word never passes', () => {
  it.each([
    ['That is my car', 'It is my car'],
    ['I am not scared', 'I am not afraid'],
    ['We do not waste time', 'We do not want time'],
    ['I do not remember you', 'I do not know you'],
  ])('fails "%s" when the learner says "%s"', (target, transcript) => {
    const result = scorePronunciationTranscript({ targetText: target, transcript });
    expect(result.passed).toBe(false);
  });

  it.each([
    ['That is my car', 'that is my car'],
    ["I don't know", 'I do not know'],
    ['I am going to call you', "I'm gonna call you"],
    ['Where is the center', 'where is the centre'],
    ['I can see the sea', 'I can see the see'],
    // один оброненный движком безударный хвост на длинной фразе прощается как раньше
    ['She does not read the news', 'she does not read news'],
  ])('still passes "%s" heard as "%s"', (target, transcript) => {
    const result = scorePronunciationTranscript({ targetText: target, transcript });
    expect(result.passed).toBe(true);
  });

  it('low-confidence engine word keeps the soft-miss forgiveness', () => {
    const result = scorePronunciationTranscript({
      targetText: 'We do not waste time today',
      transcript: 'we do not waste thyme today',
      segments: [{ segment: 'thyme', confidence: 0.1 }],
    });
    expect(result.passed).toBe(true);
  });
});
