import { entryToQuizPhrase } from '../app/french_quiz_remote_runtime';

describe('Gustav French standard quiz runtime full-sentence adapter', () => {
  it('preserves reviewed RU full-sentence quiz rows without converting them to fill-gap rows', () => {
    const row = entryToQuizPhrase({
      entryId: 'fr-quiz-prod-candidate-0001',
      questionId: 'fr-prod-easy-0001',
      studyTarget: 'fr',
      sourceLocale: 'ru',
      sourceLocales: ['ru', 'uk'],
      surface: 'quiz',
      section: 'standard',
      quizItemType: 'standard_mcq_full_sentence',
      lessonId: 1,
      level: 'A1',
      difficulty: 'easy',
      sourcePrompt_ru: 'Я хочу кофе сейчас.',
      sourcePrompt_uk: 'Я хочу каву зараз.',
      targetText: 'Je veux un cafe maintenant.',
      choices: [
        'Je veux une cafe maintenant.',
        'Je suis vouloir un cafe maintenant.',
        'Je veux des cafe maintenant.',
        'Je veux un cafe maintenant.',
      ],
      correct: 3,
      answer: 'Je veux un cafe maintenant.',
      explanations: [
        'Не подходит: une cafe ломает род существительного.',
        'Не подходит: suis vouloir добавляет лишний etre.',
        'Не подходит: des cafe меняет число.',
        'Верно: un cafe согласован с мужским родом.',
      ],
      explanationsUK: [
        'Не підходить: une cafe ламає рід іменника.',
        'Не підходить: suis vouloir додає зайве etre.',
        'Не підходить: des cafe змінює число.',
        'Правильно: un cafe узгоджено з чоловічим родом.',
      ],
      skillTag: 'standard.vouloir.indefinite_article',
    });

    expect(row).toMatchObject({
      ru: 'Я хочу кофе сейчас.',
      uk: 'Я хочу каву зараз.',
      sourceLocale: 'ru',
      sourceText: 'Я хочу кофе сейчас.',
      choices: [
        'Je veux une cafe maintenant.',
        'Je suis vouloir un cafe maintenant.',
        'Je veux des cafe maintenant.',
        'Je veux un cafe maintenant.',
      ],
      correct: 3,
      answer: 'Je veux un cafe maintenant.',
      questionId: 'fr-prod-easy-0001',
      skillTag: 'standard.vouloir.indefinite_article',
      quizItemType: 'standard_mcq_full_sentence',
    });
    expect(row?.explanations[3]).toContain('Верно');
    expect(row?.explanationsUK[3]).toContain('Правильно');
    expect(row?.sourceExplanations).toEqual(row?.explanations);
  });

  it('uses the Ukrainian prompt and explanations for UK server-pack rows', () => {
    const row = entryToQuizPhrase({
      entryId: 'fr-quiz-prod-candidate-0002',
      questionId: 'fr-prod-easy-0002',
      studyTarget: 'fr',
      sourceLocale: 'uk',
      surface: 'quiz',
      quizItemType: 'standard_mcq_full_sentence',
      lessonId: 2,
      level: 'A1',
      difficulty: 'easy',
      sourcePrompt_ru: 'Он читает книгу вечером.',
      sourcePrompt_uk: 'Він читає книгу ввечері.',
      targetText: 'Il lit un livre le soir.',
      choices: [
        'Il lit une livre le soir.',
        'Il lit un livre le soir.',
        'Il lis un livre le soir.',
        'Il lire un livre le soir.',
      ],
      correct: 1,
      answer: 'Il lit un livre le soir.',
      explanations: [
        'Не подходит: une livre меняет род и значение.',
        'Верно: lit подходит к il.',
        'Не подходит: lis не форма для il.',
        'Не подходит: lire остается инфинитивом.',
      ],
      explanationsUK: [
        'Не підходить: une livre змінює рід і значення.',
        'Правильно: lit підходить до il.',
        'Не підходить: lis не форма для il.',
        'Не підходить: lire лишається інфінітивом.',
      ],
      skillTag: 'standard.lire.present',
    });

    expect(row).toMatchObject({
      ru: 'Он читает книгу вечером.',
      uk: 'Він читає книгу ввечері.',
      sourceLocale: 'uk',
      sourceText: 'Він читає книгу ввечері.',
      correct: 1,
      answer: 'Il lit un livre le soir.',
    });
    expect(row?.sourceExplanations).toEqual(row?.explanationsUK);
  });

  it('keeps the legacy blank/correct/distractors payload path available', () => {
    const row = entryToQuizPhrase({
      entryId: 'legacy-fr-quiz-001',
      studyTarget: 'fr',
      sourceLocale: 'ru',
      surface: 'quiz',
      lessonId: 1,
      phraseId: 'legacy-001',
      sourceText: 'Я хочу кофе.',
      targetText: 'Je veux un cafe.',
      quiz: {
        blank: 'Je veux ___ cafe.',
        correct: 'un',
        distractors: ['une', 'des', 'le'],
        category: 'legacy.article',
      },
    });

    expect(row).toBeTruthy();
    expect(row?.choices).toHaveLength(4);
    expect(row?.answer).toBe('un');
    expect(row?.skillTag).toBe('legacy.article');
  });
});
