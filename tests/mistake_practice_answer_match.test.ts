import fs from 'fs';
import path from 'path';
import { matchesMistakePracticeAnswer } from '../app/mistake_practice_answer_match';

describe('mistake practice answer equivalence', () => {
  it.each(["We won't work tomorrow", 'We won’t work tomorrow'])('accepts %s', (answer) => {
    expect(matchesMistakePracticeAnswer(answer, 'We will not work tomorrow', 'en')).toBe(true);
  });

  it('accepts Everybody as the sanctioned equivalent of Everyone', () => {
    expect(matchesMistakePracticeAnswer('Everybody helped us.', 'Everyone helped us', 'en')).toBe(true);
    expect(matchesMistakePracticeAnswer('Somebody helped us.', 'Everyone helped us', 'en')).toBe(false);
  });

  it('accepts punctuation but preserves subject, tense, and negation', () => {
    expect(matchesMistakePracticeAnswer('I returned a book last Tuesday.', 'I returned a book last Tuesday', 'en')).toBe(true);
    expect(matchesMistakePracticeAnswer('"We work tomorrow."', 'We work tomorrow', 'en')).toBe(true);
    expect(matchesMistakePracticeAnswer('Answer: We work tomorrow', 'Answer We work tomorrow', 'en')).toBe(true);
    expect(matchesMistakePracticeAnswer('We will work tomorrow', 'We will not work tomorrow', 'en')).toBe(false);
    expect(matchesMistakePracticeAnswer('I will not work tomorrow', 'We will not work tomorrow', 'en')).toBe(false);
    expect(matchesMistakePracticeAnswer('We did not work tomorrow', 'We will not work tomorrow', 'en')).toBe(false);
    expect(matchesMistakePracticeAnswer('leave', 'left', 'en')).toBe(false);
  });

  it('preserves French comparison without applying English equivalences', () => {
    expect(matchesMistakePracticeAnswer(' BONJOUR! ', 'bonjour', 'fr')).toBe(true);
    expect(matchesMistakePracticeAnswer('ou', 'où', 'fr')).toBe(false);
    expect(matchesMistakePracticeAnswer("we won't", 'we will not', 'fr')).toBe(false);
  });

  it('keeps Spanish on the legacy punctuation-tolerant comparison path', () => {
    expect(matchesMistakePracticeAnswer(' Hola! ', 'hola', 'es')).toBe(true);
    expect(matchesMistakePracticeAnswer('como', 'cómo', 'es')).toBe(false);
  });

  it('wires both screen submission paths to the tested target-aware matcher', () => {
    const source = fs.readFileSync(path.join(__dirname, '../app/mistake_practice_session.tsx'), 'utf8');
    expect(source).toContain('matchesMistakePracticeAnswer(option, entry.exercise.correctAnswer, studyTarget)');
    expect(source).toContain('matchesMistakePracticeAnswer(answerValue, entry.exercise.correctAnswer, studyTarget)');
    expect(source).not.toContain('normalized(answerValue) === normalized(entry.exercise.correctAnswer)');
  });
});
