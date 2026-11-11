import fs from 'node:fs';
import path from 'node:path';
import { buildCorrectPhraseSegments } from '../app/mistake_correct_phrase';

// зачем (владелец 11.11: «зачем тут 2 — work, works?»; «дальше делай готовую фразу на экране „Верно“»): после верного выбора
// экран показывал оба варианта ещё раз. Теперь он показывает готовую фразу, а выбранное слово в ней подсвечено.
const tones = (phrase: string, highlight: string) => buildCorrectPhraseSegments({ phrase, highlight }).map((segment) => `${segment.tone}:${segment.text}`);

describe('finished phrase on the «correct» screen', () => {
  test('highlights the chosen word inside the phrase', () => {
    expect(tones('She works at home', 'works')).toEqual(['plain:She', 'right:works', 'plain:at', 'plain:home']);
  });

  test('ignores case and the punctuation glued to the word', () => {
    expect(tones('Where do you work?', 'Work')).toEqual(['plain:Where', 'plain:do', 'plain:you', 'right:work?']);
    expect(tones('Yes, she does.', 'she')).toEqual(['plain:Yes,', 'right:she', 'plain:does.']);
  });

  test('highlights a chosen answer of several words as one run', () => {
    expect(tones('I have been here before', 'have been')).toEqual(['plain:I', 'right:have', 'right:been', 'plain:here', 'plain:before']);
  });

  test('highlights only the first place when the word repeats', () => {
    expect(tones('to be or not to be', 'be')).toEqual(['plain:to', 'right:be', 'plain:or', 'plain:not', 'plain:to', 'plain:be']);
  });

  test('when the answer IS the whole phrase, the whole phrase is highlighted', () => {
    expect(tones('Grandchildren', 'Grandchildren')).toEqual(['right:Grandchildren']);
    expect(tones('I trust you', 'I trust you')).toEqual(['right:I', 'right:trust', 'right:you']);
  });

  test('when the answer is not found in the phrase, nothing is invented: the whole phrase is highlighted', () => {
    expect(tones('She works at home', 'walks')).toEqual(['right:She', 'right:works', 'right:at', 'right:home']);
  });

  test('an empty phrase gives no segments, and extra spaces do not create empty words', () => {
    expect(tones('   ', 'works')).toEqual([]);
    expect(tones('  She   works  ', 'works')).toEqual(['plain:She', 'right:works']);
  });
});

describe('practice screen shows the phrase instead of repeating the options', () => {
  const screen = fs.readFileSync(path.join(__dirname, '..', 'app', 'mistake_practice_session.tsx'), 'utf8');

  test('a correct choice shows the finished phrase', () => {
    expect(screen).toContain('testID="mistake-practice-correct-phrase"');
    expect(screen).toContain('buildCorrectPhraseSegments({ phrase: feedback.answer, highlight: entry.exercise.correctAnswer })');
  });

  test('the two options stay only for a wrong choice — there they show «picked» against «right»', () => {
    expect(screen).toContain('{isChoice && !feedback.correct ? <OptionGrid g={g} options={feedbackOptions} marks={marks} disabled /> : null}');
    expect(screen).not.toContain('{isChoice ? <OptionGrid g={g} options={feedbackOptions} marks={marks} disabled /> : null}');
  });
});
