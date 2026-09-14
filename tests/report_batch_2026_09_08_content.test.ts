import { LESSON_DATA } from '../app/lesson_data_all';
import { phraseAnswerAlternatives, phraseCanonicalAnswer } from '../app/phrase_target_utils';
import { isCorrectAnswer } from '../constants/contractions';

function phrase(lesson: number, index: number) {
  const row = LESSON_DATA[lesson].phrases.find((item) => item.id === `lesson${lesson}_phrase_${index}`);
  if (!row) throw new Error(`Missing lesson ${lesson} phrase ${index}`);
  return row;
}

describe('September 8 report batch: precise prompts and valid alternatives', () => {
  it('accepts a polite permission question without accepting a changed subject', () => {
    const row = phrase(10, 20);
    const canonical = phraseCanonicalAnswer(row, 'en');
    const alternatives = phraseAnswerAlternatives(row, 'en');
    expect(isCorrectAnswer('May I ask a question?', canonical, alternatives)).toBe(true);
    expect(isCorrectAnswer('Could I ask a question?', canonical, alternatives)).toBe(true);
    expect(isCorrectAnswer('May he ask a question?', canonical, alternatives)).toBe(false);
  });

  it('accepts that in the defining relative clause but rejects who for a plan', () => {
    const row = phrase(30, 22);
    const canonical = phraseCanonicalAnswer(row, 'en');
    const alternatives = phraseAnswerAlternatives(row, 'en');
    expect(isCorrectAnswer('This is the plan that we chose', canonical, alternatives)).toBe(true);
    expect(isCorrectAnswer('This is the plan who we chose', canonical, alternatives)).toBe(false);
  });

  it('makes the plural problems prompt unambiguous', () => {
    expect(phrase(17, 28).russian).toBe('Я не ищу проблем');
    expect(phraseCanonicalAnswer(phrase(17, 28), 'en')).toBe('I am not looking for problems');
  });

  it('marks the Ukrainian questions prompt as plural', () => {
    expect(phrase(7, 21).ukrainian).toBe('Ми маємо запитання (кілька)');
    expect(isCorrectAnswer("we've questions", phraseCanonicalAnswer(phrase(7, 21), 'en'))).toBe(true);
  });

  it('clarifies the identified woman without changing the English answer', () => {
    expect(phrase(32, 10).russian).toBe('Она та женщина, чью сумку мы нашли.');
    expect(phraseCanonicalAnswer(phrase(32, 10), 'en')).toBe('She is the woman whose bag we found');
  });

  it('preserves correct reported near, pronoun, and coffee answers', () => {
    expect(isCorrectAnswer("it's narrow", phraseCanonicalAnswer(phrase(1, 38), 'en'))).toBe(false);
    expect(isCorrectAnswer('he uses apps', phraseCanonicalAnswer(phrase(3, 34), 'en'))).toBe(false);
    expect(isCorrectAnswer('She uses apps', phraseCanonicalAnswer(phrase(3, 34), 'en'))).toBe(true);
    expect(isCorrectAnswer('She teaches evening', phraseCanonicalAnswer(phrase(3, 29), 'en'))).toBe(false);
    expect(isCorrectAnswer('he know they', phraseCanonicalAnswer(phrase(3, 44), 'en'))).toBe(false);
    expect(phrase(4, 18).english).toBe('She does not like coffee');
    expect(isCorrectAnswer("She doesn't love coffee", phraseCanonicalAnswer(phrase(4, 18), 'en'), phraseAnswerAlternatives(phrase(4, 18), 'en'))).toBe(true);
  });
});
