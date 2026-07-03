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
    const lessonHelpSource = fs.readFileSync(path.join(process.cwd(), 'app', 'lesson_help_theory_data.tsx'), 'utf8');
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

  it('accepts the natural "anything" negative form for lesson 21 phrase 14 found nothing', () => {
    const phrase = LESSON_DATA[21].phrases.find((row) => row.id === 'lesson21_phrase_14');

    expect(phrase).toBeTruthy();
    expect(isCorrectAnswer("I didn't find anything", phraseCanonicalAnswer(phrase!, 'en'), phraseAnswerAlternatives(phrase!, 'en'))).toBe(true);
    expect(isCorrectAnswer('I did not find anything', phraseCanonicalAnswer(phrase!, 'en'), phraseAnswerAlternatives(phrase!, 'en'))).toBe(true);
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
    const source = fs.readFileSync(path.join(process.cwd(), 'app', 'lesson_help_theory_data.tsx'), 'utf8');

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
    const source = fs.readFileSync(path.join(process.cwd(), 'app', 'lesson_help_theory_data.tsx'), 'utf8');

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

  it('teaches and accepts optional "to" after help for lesson 30 phrase 41', () => {
    const phrase = LESSON_DATA[30].phrases.find((row) => row.id === 'lesson30_phrase_41');
    const introSource = fs.readFileSync(path.join(process.cwd(), 'app', 'lesson_intro_screens_en_17_32.ts'), 'utf8');
    const helpSource = fs.readFileSync(path.join(process.cwd(), 'app', 'lesson_help_theory_data.tsx'), 'utf8');
    const theorySource = fs.readFileSync(path.join(process.cwd(), 'app', 'theory_content_lesson30.ts'), 'utf8');

    expect(phrase).toBeTruthy();
    expect(phrase?.english).toBe('Is this the app that helps you learn?');
    expect(
      isCorrectAnswer(
        'Is this the app that helps you to learn?',
        phraseCanonicalAnswer(phrase!, 'en'),
        phraseAnswerAlternatives(phrase!, 'en'),
      ),
    ).toBe(true);
    expect(introSource).toContain('Почему learn без to');
    expect(introSource).toContain('helps you to learn тоже возможен');
    expect(helpSource).toContain('после help + кого-то действие часто стоит в простой форме');
    expect(theorySource).toContain('после help + кого-то действие часто ставят в простой форме');
  });

  it('shows readable Cyrillic (no mojibake) for lesson 18 phrase 31 reserve a table', () => {
    const phrase = LESSON_DATA[18].phrases.find((row) => row.id === 'lesson18_phrase_31');

    expect(phrase).toBeTruthy();
    expect(phrase?.russian).toBe('Ты можешь забронировать столик?');
    expect(phrase?.ukrainian).toBe('Ти можеш забронювати столик?');
    expect(phrase?.spanish).toBe('¿Puedes reservar una mesa?');
    // Mojibake guard: the corrupted form contained the Latin-1 marker "Ð".
    expect(phrase?.russian).not.toContain('Ð');
    expect(phrase?.ukrainian).not.toContain('Ð');
  });

  it('maps "рядом с / поруч з" to near consistently in lesson 19 phrases 7 and 31', () => {
    const p7 = LESSON_DATA[19].phrases.find((row) => row.id === 'lesson19_phrase_7');
    const p31 = LESSON_DATA[19].phrases.find((row) => row.id === 'lesson19_phrase_31');

    expect(p7?.english).toBe('The chair is near the table');
    expect(p31?.english).toBe('Put the bag near the door');
    // "near" — not "next to" — must be the correct chip (lesson's dominant mapping).
    expect(p7?.wordsEn?.find((w) => w.correct === 'near')).toBeTruthy();
    expect(p31?.wordsEn?.find((w) => w.correct === 'near')).toBeTruthy();
    expect(p7?.wordsEn?.some((w) => w.correct === 'next to')).toBe(false);
    expect(p31?.wordsEn?.some((w) => w.correct === 'next to')).toBe(false);
    expect(
      isCorrectAnswer('The chair is near the table', phraseCanonicalAnswer(p7!, 'en'), phraseAnswerAlternatives(p7!, 'en')),
    ).toBe(true);
  });

  it('keeps desk distinct from table in lesson 20 reported phrases', () => {
    const keyOnDesk = LESSON_DATA[20].phrases.find((row) => row.id === 'lesson20_phrase_38');
    const cupOnDesk = LESSON_DATA[20].phrases.find((row) => row.id === 'lesson20_phrase_45');
    const phoneOnTable = LESSON_DATA[20].phrases.find((row) => row.id === 'lesson20_phrase_3');

    expect(keyOnDesk?.english).toBe('There is a key on the desk.');
    expect(keyOnDesk?.russian).toBe('На рабочем столе есть ключ.');
    expect(keyOnDesk?.ukrainian).toBe('На робочому столі є ключ.');
    expect(cupOnDesk?.english).toBe('The cup is on the desk.');
    expect(cupOnDesk?.russian).toBe('Чашка на рабочем столе.');
    expect(cupOnDesk?.ukrainian).toBe('Чашка на робочому столі.');
    expect(phoneOnTable?.english).toBe('The phone is on the table.');
    expect(phoneOnTable?.russian).toBe('Телефон на столе.');
  });

  it('uses genitive plural for lesson 16 phrase 27 problems prompt', () => {
    const phrase = LESSON_DATA[16].phrases.find((row) => row.id === 'lesson16_phrase_27');
    const helpSource = fs.readFileSync(path.join(process.cwd(), 'app', 'lesson_help_theory_data.tsx'), 'utf8');

    expect(phrase?.english).toBe('I do not look for problems');
    expect(phrase?.russian).toBe('Я не ищу проблем');
    expect(phrase?.ukrainian).toBe('Я не шукаю проблем');
    expect(helpSource).toContain("['looking for problems', isUK ? 'шукаю проблем' : 'ищу проблем'");
  });

  it('uses "втрачати" (losing) not "витрачати" (spending) for lesson 22 phrase 27 hates losing money', () => {
    const phrase = LESSON_DATA[22].phrases.find((row) => row.id === 'lesson22_phrase_27');

    expect(phrase?.english).toBe('She hates losing money');
    expect(phrase?.ukrainian).toBe('Вона ненавидить втрачати гроші');
    // "витрачати" means "spending" — must not be reused for "losing".
    expect(phrase?.ukrainian).not.toContain('витрачати');
  });

  it('keeps lesson 19 shoes prompts plural so users are not pushed toward "is"', () => {
    const underBed = LESSON_DATA[19].phrases.find((row) => row.id === 'lesson19_phrase_14');
    const thereAre = LESSON_DATA[19].phrases.find((row) => row.id === 'lesson19_phrase_40');

    expect(underBed?.english).toBe('The shoes are under the bed');
    expect(underBed?.russian).toBe('Туфли под кроватью');
    expect(underBed?.ukrainian).toBe('Туфлі під ліжком');
    expect(underBed?.russian).not.toContain('Обувь');
    expect(underBed?.wordsEn?.find((w) => w.correct === 'are')).toBeTruthy();

    expect(thereAre?.english).toBe('There are shoes under the bed');
    expect(thereAre?.russian).toBe('Под кроватью есть туфли');
    expect(thereAre?.ukrainian).toBe('Під ліжком є туфлі');
    expect(thereAre?.russian).not.toContain('обувь');
    expect(thereAre?.wordsEn?.find((w) => w.correct === 'are')).toBeTruthy();
  });

  it('accepts "this problem" for lesson 25 phrase 32 because the prompt says эту проблему', () => {
    const phrase = LESSON_DATA[25].phrases.find((row) => row.id === 'lesson25_phrase_32');

    expect(phrase).toBeTruthy();
    expect(isCorrectAnswer('We were not discussing this problem', phraseCanonicalAnswer(phrase!, 'en'), phraseAnswerAlternatives(phrase!, 'en'))).toBe(true);
  });

  it('keeps level exam questions on already taught wording for passive voice and third conditional', () => {
    const levelExamSource = fs.readFileSync(path.join(process.cwd(), 'app', 'level_exam.tsx'), 'utf8');
    const legacyExamSource = fs.readFileSync(path.join(process.cwd(), 'app', 'exam.tsx'), 'utf8');

    for (const source of [levelExamSource, legacyExamSource]) {
      expect(source).toContain("q:'The documents ___ checked today.'");
      expect(source).toContain("q:'If we had started earlier, we ___ finished.'");
      expect(source).not.toContain("q:'The report ___ submitted by Friday.'");
      expect(source).not.toContain("q:'If she had tried, she ___ passed.'");
    }
  });

  it('uses grammatical Russian/Ukrainian prompts for lesson 13 phrase 40 and lesson 14 phrase 24', () => {
    const cash = LESSON_DATA[13].phrases.find((row) => row.id === 'lesson13_phrase_40');
    const phone = LESSON_DATA[14].phrases.find((row) => row.id === 'lesson14_phrase_24');

    // singular "готівка" needs singular verb "знадобиться", not plural "знадобляться".
    expect(cash?.ukrainian).toBe('Мені знадобиться готівка?');
    expect(cash?.ukrainian).not.toContain('знадобляться');
    // normative comparative is "старше", not colloquial "старее".
    expect(phone?.russian).toBe('Тот телефон старше');
    expect(phone?.russian).not.toContain('старее');
  });

  it('accepts both "have to" and "need to" for lesson 10 modal-necessity phrases (нужно is ambiguous)', () => {
    // Russian "нужно / не нужно" maps equally to "have to" and "need to".
    // The lesson teaches "have to" (modal verbs), but a user typing the equally
    // valid "need to" must also be accepted.
    const cases: Array<[string, string, string]> = [
      ['lesson10_phrase_46', 'I have to work today', 'I need to work today'],
      ['lesson10_phrase_47', 'Do you have to go now?', 'Do you need to go now?'],
      ['lesson10_phrase_48', 'She does not have to wait', 'She does not need to wait'],
      ['lesson10_phrase_49', 'We have to pay rent', 'We need to pay rent'],
      ['lesson10_phrase_50', 'You do not have to answer now', 'You do not need to answer now'],
    ];
    for (const [id, haveTo, needTo] of cases) {
      const phrase = LESSON_DATA[10].phrases.find((row) => row.id === id);
      expect(phrase).toBeTruthy();
      const canon = phraseCanonicalAnswer(phrase!, 'en');
      const alts = phraseAnswerAlternatives(phrase!, 'en');
      // The taught "have to" form still validates.
      expect(isCorrectAnswer(haveTo, canon, alts)).toBe(true);
      // The equally valid "need to" form is now accepted too.
      expect(isCorrectAnswer(needTo, canon, alts)).toBe(true);
      // And the contracted form a user would type also validates.
      expect(isCorrectAnswer(needTo.replace('does not', "doesn't").replace('do not', "don't"), canon, alts)).toBe(true);
    }
  });

  it('accepts "have to" for lesson 10 "должен"=must phrases (obligation is ambiguous)', () => {
    const cases: Array<[string, string, string]> = [
      ['lesson10_phrase_34', 'I must go now', 'I have to go now'],
      ['lesson10_phrase_36', 'He must finish work', 'He has to finish work'],
      ['lesson10_phrase_37', 'She must check messages', 'She has to check messages'],
      ['lesson10_phrase_40', 'Must I sign it?', 'Do I have to sign it?'],
      ['lesson10_phrase_42', 'Must they show documents?', 'Do they have to show documents?'],
    ];
    for (const [id, must, haveTo] of cases) {
      const phrase = LESSON_DATA[10].phrases.find((row) => row.id === id);
      expect(phrase).toBeTruthy();
      const canon = phraseCanonicalAnswer(phrase!, 'en');
      const alts = phraseAnswerAlternatives(phrase!, 'en');
      expect(isCorrectAnswer(must, canon, alts)).toBe(true);
      expect(isCorrectAnswer(haveTo, canon, alts)).toBe(true);
    }
  });

  it('accepts "cannot" for lesson 10 "нельзя"=must not prohibition phrases', () => {
    const cases: Array<[string, string, string]> = [
      ['lesson10_phrase_43', 'You must not smoke here', 'You cannot smoke here'],
      ['lesson10_phrase_44', 'He must not share passwords', 'He cannot share passwords'],
      ['lesson10_phrase_45', 'They must not enter this room', 'They cannot enter this room'],
    ];
    for (const [id, mustNot, cannot] of cases) {
      const phrase = LESSON_DATA[10].phrases.find((row) => row.id === id);
      expect(phrase).toBeTruthy();
      const canon = phraseCanonicalAnswer(phrase!, 'en');
      const alts = phraseAnswerAlternatives(phrase!, 'en');
      expect(isCorrectAnswer(mustNot, canon, alts)).toBe(true);
      expect(isCorrectAnswer(cannot, canon, alts)).toBe(true);
      expect(isCorrectAnswer(cannot.replace('cannot', "can't"), canon, alts)).toBe(true);
    }
  });

  it('accepts every equally-valid quiz choice flagged by the content audit', () => {
    // Each tuple: [difficulty, a distinctive choice substring to locate the item,
    //              [the choice texts that MUST all be accepted]].
    const cases: Array<['easy' | 'medium' | 'hard', string, string[]]> = [
      ['easy', 'Will we go to snowman?', ['Will we go to cinema?', 'Shall we go to cinema?']],
      ['easy', 'I will goes to the shop tomorrow.', ['I will go to the shop tomorrow.', 'I am going to the shop tomorrow.']],
      ['medium', 'I repaired my bike by my shelf.', ['I repaired my bike by myself.', 'I repaired my bike myself.']],
      ['medium', 'We are at the scenario now.', ['We are in the cinema now.', 'We are at the cinema now.']],
      ['hard', 'She advocates imploding new teaching methods.', ['She advocates implementing new teaching methods.', 'She advocates for implementing new teaching methods.']],
      ['hard', 'Swimmingly, he was unaware of the regulations when making the decision.', ['Seemingly, he was unaware of the regulations when making the decision.', 'Seemingly, he was unaware of the regulations when making a decision.']],
      ['hard', 'Wont coffee?', ['Want coffee?', 'Do you want a coffee?']],
      ['hard', 'She actively avocados the use of renewable energy sources.', ['She actively advocates the use of renewable energy sources.', 'She actively advocates for the use of renewable energy sources.']],
      ['hard', 'He is believed to have yearned a fortune from investments.', ['He is believed to have earned a fortune from investments.', 'It is believed that he earned a fortune from investments.']],
      ['hard', 'Stop walking around and about.', ['Stop beating around the bush.', 'Stop beating about the bush.']],
    ];
    for (const [difficulty, locator, mustAccept] of cases) {
      const entry = getQuizPoolAuditEntries(difficulty).find((e) => e.choices.includes(locator));
      expect(entry).toBeTruthy();
      const accepted = (Array.isArray(entry!.correct) ? entry!.correct : [entry!.correct]).map((i) => entry!.choices[i]);
      for (const choice of mustAccept) {
        expect(accepted).toContain(choice);
      }
      // explanation arrays must still line up with choices (runtime validity guard)
      expect(entry!.explanations.length).toBe(entry!.choices.length);
      expect(entry!.explanationsUK.length).toBe(entry!.choices.length);
    }
  });

  it('disambiguates the present-continuous coffee quiz so simple present is genuinely wrong', () => {
    const entry = getQuizPoolAuditEntries('easy').find((e) => e.choices.includes('She is drinking coughy.'));
    expect(entry).toBeTruthy();
    // Prompt now carries a now-marker; only the continuous form is correct.
    expect(entry!.ru).toContain('прямо сейчас');
    const accepted = (Array.isArray(entry!.correct) ? entry!.correct : [entry!.correct]).map((i) => entry!.choices[i]);
    expect(accepted).toEqual(['She is drinking coffee.']);
  });
});
