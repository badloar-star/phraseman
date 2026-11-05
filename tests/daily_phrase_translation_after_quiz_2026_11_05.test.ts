// 🔴 Слово владельца через координатора 05.11: «Фраза дня не должна показывать перевод! Только после того, как ответили на квиз».
// Карточка Главной: до ответа — только фраза (без перевода и без подсказки значения); после ответа — перевод на языке интерфейса (ru→ru, uk→uk),
// английскому интерфейсу русский не показываем (английского источника у фраз нет). Озвучки на карточке нет (замок 18.10).
import fs from 'node:fs';
import path from 'node:path';

const card = fs.readFileSync(path.join(__dirname, '..', 'components/DailyPhraseCard.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('Фраза дня: перевод только после ответа на вопрос дня', () => {
  it('строка перевода зависит от ответа и от языка интерфейса', () => {
    expect(card).toContain('const [cardAnswered, setCardAnswered] = useState(false);');
    expect(card).toContain("const translationLang = lang === 'en' ? null : phraseLang;");
    expect(card).toContain('const translationAllowed = cardAnswered && !noSourceExplanation && translationLang !== null && !phraseCopy.isFallback;');
    expect(card).toContain("const cardLiteral = translationAllowed ? (phraseCopy.meaning || phraseCopy.literal) : '';");
  });
  it('ответ читается с диска и из памяти; ответ в шторке открывает строку сразу', () => {
    expect(card).toContain('hasDailyPhraseQuestAnswered({ phraseId, date, studyTarget })');
    expect(card).toContain('if (answeredQuestKeysRef.has(questKey)) { setCardAnswered(true); return undefined; }');
    expect(card).toMatch(/answeredQuestKeysRef\.add\(questKey\);\n\s+setCardAnswered\(true\);/);
    expect(card).toMatch(/if \(alreadyAnswered\) \{\n\s+setCardAnswered\(true\);/);
  });
  it('подпись доступности не выдаёт перевод до ответа (она строится из cardLiteral)', () => {
    expect(card).toContain('accessibilityLabel={cardLiteral ?');
  });
  it('журнал [DAILY-PHRASE-TRANSLATION] называет правило и итог чтения ответа', () => {
    expect(card).toContain("'[DAILY-PHRASE-TRANSLATION] gate'");
    expect(card).toContain("'[DAILY-PHRASE-TRANSLATION] answered'");
  });
  it('хук ответа стоит ДО раннего return (порядок хуков не ломается)', () => {
    expect(card.indexOf('const [cardAnswered, setCardAnswered]')).toBeLessThan(card.indexOf('if (!phrase) {'));
  });
  it('английскому интерфейсу русский не показываем ни при каком курсе; в окне после ответа озвучки нет (находка эмулятора 05.11)', () => {
    expect(card).toContain("const noSourceExplanation = lang === 'en';");
    expect(card).not.toContain('name="volume-high"');
    // «Сохранить» остаётся и для английского интерфейса (правило «функции не удаляем», 05.11)
    expect(card).toContain('{(questAnswered || !hasValidQuest) && phrase.allowSave !== false && ('); 
    expect(card).toContain("'[DAILY-PHRASE-GATE] reason=no_en_explanation'");
  });
  it('сохранение для en-интерфейса — только фраза, без перевода; журнал [DAILY-PHRASE-SAVE]', () => {
    expect(card).toContain("const saveForeignOk = lang !== 'en';");
    expect(card).toContain("ru={saveForeignOk ? phrase.meaning : ''}");
    expect(card).toContain("uk={saveForeignOk ? phrase.meaning_uk : ''}");
    expect(card).toContain('sourceLocales={saveForeignOk ? flashcardSourceLocales : undefined}');
    expect(card).toContain("'[DAILY-PHRASE-SAVE] sheet'");
  });
  it('озвучки на карточке нет (замок 18.10)', () => {
    const start = card.indexOf('testID="home-v2-phrase-of-day"');
    const end = card.indexOf('</Pressable>', start);
    const jsx = card.slice(start, end).replace(/\{\/\*[\s\S]*?\*\/\}/g, ''); // комментарии не считаем — только разметку
    expect(jsx).not.toMatch(/volume-high|onSpeak|speakPhrase|SpeakButton/i);
  });
});
