import { LESSON_DATA } from '../app/lesson_data_all';
import { getQuizPoolAuditEntries } from '../app/quiz_data';
import { phraseAnswerAlternatives, phraseCanonicalAnswer } from '../app/phrase_target_utils';
import { isCorrectAnswer } from '../constants/contractions';
import fs from 'fs';
import path from 'path';

describe('reported content regressions', () => {
  it('accepts both natural translations for "He listens/is listening to music"', () => {
    const row = getQuizPoolAuditEntries('easy').find((entry) =>
      entry.choices.includes('He is listening to music.'),
    );

    expect(row).toBeTruthy();
    expect(row?.choices).toContain('He listens to music.');
    expect(row?.correct).toEqual([0, 1]);
  });

  it('accepts clean up your room for lesson 18 phrase 20', () => {
    const phrase = LESSON_DATA[18].phrases.find((row) => row.id === 'lesson18_phrase_20');

    expect(phrase).toBeTruthy();
    expect(isCorrectAnswer('clean up your room', phraseCanonicalAnswer(phrase!, 'en'), phraseAnswerAlternatives(phrase!, 'en'))).toBe(true);
  });

  it('accepts natural Monday meeting alternatives for lesson 8 phrase 20', () => {
    const phrase = LESSON_DATA[8].phrases.find((row) => row.id === 'lesson8_phrase_20');

    expect(phrase).toBeTruthy();
    expect(isCorrectAnswer('Do we meet on Monday ?', phraseCanonicalAnswer(phrase!, 'en'), phraseAnswerAlternatives(phrase!, 'en'))).toBe(true);
    expect(isCorrectAnswer('Are we meeting on Monday?', phraseCanonicalAnswer(phrase!, 'en'), phraseAnswerAlternatives(phrase!, 'en'))).toBe(true);
    expect(isCorrectAnswer('Will we meet on Monday?', phraseCanonicalAnswer(phrase!, 'en'), phraseAnswerAlternatives(phrase!, 'en'))).toBe(true);
  });

  it('accepts into for lesson 19 phrase 25 movement into the bag', () => {
    const phrase = LESSON_DATA[19].phrases.find((row) => row.id === 'lesson19_phrase_25');

    expect(phrase).toBeTruthy();
    expect(isCorrectAnswer('Put the documents into the bag', phraseCanonicalAnswer(phrase!, 'en'), phraseAnswerAlternatives(phrase!, 'en'))).toBe(true);
  });

  it('uses much-focused translations for lesson 5 phrase 7 cost much', () => {
    const phrase = LESSON_DATA[5].phrases.find((row) => row.id === 'lesson5_phrase_7');
    const introSource = fs.readFileSync(path.join(process.cwd(), 'app', 'lesson_intro_screens_lesson5_v2.ts'), 'utf8');

    expect(phrase?.english).toBe('Does it cost much?');
    expect(phrase?.russian).toBe('Это стоит много?');
    expect(phrase?.ukrainian).toBe('Це коштує багато?');
    expect(introSource).toContain("ru: 'Это стоит много?'");
    expect(introSource).toContain("uk: 'Це коштує багато?'");
    expect(introSource).not.toContain("ru: 'Это стоит дорого?'");
    expect(introSource).not.toContain("uk: 'Це коштує дорого?'");
  });

  it('uses a comparative Russian translation for lesson 14 phrase 45 better plan', () => {
    const phrase = LESSON_DATA[14].phrases.find((row) => row.id === 'lesson14_phrase_45');
    const lessonHelpSource = fs.readFileSync(path.join(process.cwd(), 'app', 'lesson_help.tsx'), 'utf8');
    const introSource = fs.readFileSync(path.join(process.cwd(), 'app', 'lesson_intro_screens_lesson14_v2.ts'), 'utf8');

    expect(phrase?.russian).toBe('Нам нужен план получше');
    expect(lessonHelpSource).toContain('Нам нужен план получше');
    expect(introSource).toContain('Нам нужен план получше');
    expect(lessonHelpSource).not.toContain('Нам нужен лучший план');
    expect(introSource).not.toContain('Нам нужен лучший план');
  });

  it('accepts someone for lesson 21 phrase 2 somebody knocked on the door', () => {
    const phrase = LESSON_DATA[21].phrases.find((row) => row.id === 'lesson21_phrase_2');

    expect(phrase).toBeTruthy();
    expect(isCorrectAnswer('someone knocked on the door', phraseCanonicalAnswer(phrase!, 'en'), phraseAnswerAlternatives(phrase!, 'en'))).toBe(true);
  });

  it('accepts nobody knows this for lesson 21 phrase 3 no one knows it', () => {
    const phrase = LESSON_DATA[21].phrases.find((row) => row.id === 'lesson21_phrase_3');

    expect(phrase).toBeTruthy();
    expect(isCorrectAnswer('nobody knows this', phraseCanonicalAnswer(phrase!, 'en'), phraseAnswerAlternatives(phrase!, 'en'))).toBe(true);
    expect(isCorrectAnswer('nobody knows it', phraseCanonicalAnswer(phrase!, 'en'), phraseAnswerAlternatives(phrase!, 'en'))).toBe(true);
  });

  it('accepts anybody for lesson 21 phrase 10 did anyone call you', () => {
    const phrase = LESSON_DATA[21].phrases.find((row) => row.id === 'lesson21_phrase_10');

    expect(phrase).toBeTruthy();
    expect(isCorrectAnswer('Did anybody call you?', phraseCanonicalAnswer(phrase!, 'en'), phraseAnswerAlternatives(phrase!, 'en'))).toBe(true);
  });

  it('accepts somebody for lesson 21 phrase 29 did someone take my phone', () => {
    const phrase = LESSON_DATA[21].phrases.find((row) => row.id === 'lesson21_phrase_29');

    expect(phrase).toBeTruthy();
    expect(isCorrectAnswer('Did somebody take my phone?', phraseCanonicalAnswer(phrase!, 'en'), phraseAnswerAlternatives(phrase!, 'en'))).toBe(true);
  });

  it('accepts nobody for lesson 21 phrase 28 no one is outside', () => {
    const phrase = LESSON_DATA[21].phrases.find((row) => row.id === 'lesson21_phrase_28');

    expect(phrase).toBeTruthy();
    expect(isCorrectAnswer('nobody is outside', phraseCanonicalAnswer(phrase!, 'en'), phraseAnswerAlternatives(phrase!, 'en'))).toBe(true);
  });

  it('accepts someone for lesson 21 phrase 39 somebody told me a story', () => {
    const phrase = LESSON_DATA[21].phrases.find((row) => row.id === 'lesson21_phrase_39');

    expect(phrase).toBeTruthy();
    expect(isCorrectAnswer('someone told me a story', phraseCanonicalAnswer(phrase!, 'en'), phraseAnswerAlternatives(phrase!, 'en'))).toBe(true);
  });

  it('accepts someone and somebody for lesson 21 phrase 32 found your keys', () => {
    const phrase = LESSON_DATA[21].phrases.find((row) => row.id === 'lesson21_phrase_32');

    expect(phrase).toBeTruthy();
    expect(isCorrectAnswer('someone found your keys', phraseCanonicalAnswer(phrase!, 'en'), phraseAnswerAlternatives(phrase!, 'en'))).toBe(true);
    expect(isCorrectAnswer('somebody found your keys', phraseCanonicalAnswer(phrase!, 'en'), phraseAnswerAlternatives(phrase!, 'en'))).toBe(true);
  });

  it('accepts everybody for lesson 21 phrase 37 everyone helped us', () => {
    const phrase = LESSON_DATA[21].phrases.find((row) => row.id === 'lesson21_phrase_37');

    expect(phrase).toBeTruthy();
    expect(isCorrectAnswer('everybody helped us', phraseCanonicalAnswer(phrase!, 'en'), phraseAnswerAlternatives(phrase!, 'en'))).toBe(true);
  });

  it('accepts nobody for lesson 21 phrase 40 no one told me anything', () => {
    const phrase = LESSON_DATA[21].phrases.find((row) => row.id === 'lesson21_phrase_40');

    expect(phrase).toBeTruthy();
    expect(isCorrectAnswer('nobody told me anything', phraseCanonicalAnswer(phrase!, 'en'), phraseAnswerAlternatives(phrase!, 'en'))).toBe(true);
  });

  it('accepts anyone for lesson 21 phrase 41 did anybody bring documents', () => {
    const phrase = LESSON_DATA[21].phrases.find((row) => row.id === 'lesson21_phrase_41');

    expect(phrase).toBeTruthy();
    expect(isCorrectAnswer('Did anyone bring documents?', phraseCanonicalAnswer(phrase!, 'en'), phraseAnswerAlternatives(phrase!, 'en'))).toBe(true);
  });

  it('accepts someone for lesson 21 phrase 42 somebody brought documents', () => {
    const phrase = LESSON_DATA[21].phrases.find((row) => row.id === 'lesson21_phrase_42');

    expect(phrase).toBeTruthy();
    expect(isCorrectAnswer('someone brought documents', phraseCanonicalAnswer(phrase!, 'en'), phraseAnswerAlternatives(phrase!, 'en'))).toBe(true);
  });

  it('accepts nobody for lesson 21 phrase 20 no one needs help', () => {
    const phrase = LESSON_DATA[21].phrases.find((row) => row.id === 'lesson21_phrase_20');

    expect(phrase).toBeTruthy();
    expect(isCorrectAnswer('nobody needs help', phraseCanonicalAnswer(phrase!, 'en'), phraseAnswerAlternatives(phrase!, 'en'))).toBe(true);
  });

  it('accepts anyone for lesson 21 phrase 11 did anybody see him', () => {
    const phrase = LESSON_DATA[21].phrases.find((row) => row.id === 'lesson21_phrase_11');

    expect(phrase).toBeTruthy();
    expect(isCorrectAnswer('Did anyone see him?', phraseCanonicalAnswer(phrase!, 'en'), phraseAnswerAlternatives(phrase!, 'en'))).toBe(true);
  });

  it('explains why someone can appear in a question in lesson 21 theory', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app', 'lesson_help.tsx'), 'utf8');

    expect(source).toContain('Anyone/anybody чаще звучит как нейтральный вопрос');
    expect(source).toContain('Someone и somebody — это не разные грамматические правила');
    expect(source).toContain('Someone звучит нейтральнее');
    expect(source).toContain('somebody чуть разговорнее');
    expect(source).toContain('Someone/somebody можно использовать, когда ситуация подсказывает');
    expect(source).toContain('Did someone take my phone? = говорящий видит ситуацию и подозревает');
  });

  it('surfaces truth as the contrast word for true in lesson 2 phrase 34', () => {
    const phrase = LESSON_DATA[2].phrases.find((row) => row.id === 'lesson2_phrase_34');
    const trueWord = phrase?.wordsEn?.find((word) => word.correct === 'true');

    expect(trueWord?.distractors).toContain('truth');
  });

  it('uses meaningful direct speech in lesson 27 reported speech theory', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app', 'lesson_help.tsx'), 'utf8');

    expect(source).toContain("['I will call you', 'He said that he would call me']");
    expect(source).not.toContain("['I will call me', 'He said that he would call me']");
  });

  it('aligns English with the Russian "Это" (this, not she) for lesson 30 phrase 43', () => {
    const phrase = LESSON_DATA[30].phrases.find((row) => row.id === 'lesson30_phrase_43');

    expect(phrase).toBeTruthy();
    // Russian "Это та женщина..." means "Is THIS the woman...", not "Is SHE...".
    // A faithful translation of the shown Russian must be accepted.
    expect(phrase?.russian).toBe('Это та женщина, чья сумка здесь?');
    expect(phrase?.english).toBe('Is this the woman whose bag is here?');
    expect(phrase?.english).not.toContain('Is she the woman');
    expect(
      isCorrectAnswer(
        'Is this the woman whose bag is here?',
        phraseCanonicalAnswer(phrase!, 'en'),
        phraseAnswerAlternatives(phrase!, 'en'),
      ),
    ).toBe(true);
    // The first English chip must now offer "this" as the correct token.
    const firstPronoun = phrase?.wordsEn?.find((word) => word.correct === 'this');
    expect(firstPronoun).toBeTruthy();
  });
});
