import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '../app/diagnostic_test.tsx'), 'utf8');

describe('diagnostic test planned locale runtime copy', () => {
  it('does not render planned locale results through RU/UK/ES result ternaries', () => {
    expect(source).toContain('function diagnosticResultTitle');
    expect(source).toContain('function diagnosticResultMessage');
    expect(source).toContain('function diagnosticDateLocale');

    expect(source).not.toContain("isES ? result.es : isUK ? result.uk : result.ru");
    expect(source).not.toContain("isES ? result.msgES : isUK ? result.msgUK : result.msgRU");
    expect(source).not.toContain("toLocaleDateString(isES ? 'es-ES' : isUK ? 'uk-UA' : 'ru-RU')");
  });

  it('keeps explicit result copy for every Heisenberg planned locale', () => {
    for (const key of ["'pt-BR'", 'vi', 'id', 'tr', 'pl']) {
      expect(source).toContain(`${key}: result`);
    }

    for (const key of ['msgPTBR', 'msgVI', 'msgID', 'msgTR', 'msgPL']) {
      expect(source).toContain(key);
    }
  });

  it('routes localized answer options through the planned-locale selector', () => {
    expect(source).toContain('const DIAGNOSTIC_PLANNED_OPTIONS');
    expect(source).toContain('function diagnosticQuestionOptions');
    expect(source).toContain('const qOpts = diagnosticQuestionOptions(lang, q)');
    expect(source).toContain('const optsForReport = diagnosticQuestionOptions(lang, q)');

    expect(source).not.toContain("const qOpts = (lang === 'uk' && q?.optsUK)");
    expect(source).not.toContain("lang === 'uk' && q.optsUK ? q.optsUK : lang === 'es' && q.optsES ? q.optsES : q.opts ?? []");
  });

  it('keeps explicit planned answer options for diagnostic translation questions', () => {
    for (const phrase of [
      'What does "book" mean?',
      'What does "necessary" mean?',
      'She has been working here for years.',
      'The report must be submitted by Friday.',
      'Hardly had she arrived when they left.',
      'She would rather stay home than go out.',
    ]) {
      expect(source).toContain(phrase);
    }

    for (const locale of ["'pt-BR'", 'vi', 'id', 'tr', 'pl']) {
      expect(source).toContain(`${locale}: [`);
    }
  });

  it('routes quiz shell labels through explicit planned locale copy', () => {
    expect(source).toContain('function diagnosticUiCopy');
    expect(source).toContain('const diagnosticUi = useMemo(() => diagnosticUiCopy(lang), [lang])');
    expect(source).toContain('{diagnosticUi.loadError}');
    expect(source).toContain('{diagnosticUi.back}');
    expect(source).toContain('{diagnosticUi.cancel}');
    expect(source).toContain('const continueButtonLabel = `${diagnosticUi.continue} →`');
    expect(source).toContain('{diagnosticUi.buildPlaceholder}');
    expect(source).toContain('{diagnosticUi.check}');
    expect(source).toContain('placeholder={diagnosticUi.typeHere}');
    expect(source).toContain('✓ {diagnosticUi.correctAnswerPrefix}: {correctAnswer}');
    expect(source).toContain('`${diagnosticUi.options}: ${optsForReport.map');
    expect(source).toContain('{diagnosticUi.skip}');
    expect(source).toContain('`${timeLeft}${diagnosticUi.secondSuffix}`');

    for (const legacy of [
      "isES ? 'Volver' : isUK ? 'Назад' : 'Назад'",
      "isES ? s.settings.cancel : isUK ? 'Відмінити' : 'Отменить'",
      "isES ? `${s.lesson.next} →` : isUK ? 'Далі →' : 'Продолжить →'",
      "isES ? 'Toca una palabra abajo...' : isUK ? 'Торкнись слова нижче...' : 'Тапни слово снизу...'",
      "isES ? s.lesson.check : isUK ? 'Перевірити' : 'Проверить'",
      "isES ? s.lesson.typeHere : isUK ? 'Введи відповідь...' : 'Введи ответ...'",
      "isES ? 'Omitir' : isUK ? 'Пропустити' : 'Пропустить'",
      "isES ? `${timeLeft}s` : `${timeLeft}с`",
    ]) {
      expect(source).not.toContain(legacy);
    }
  });
});
