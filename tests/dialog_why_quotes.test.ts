// зачем (координатор 12.10, dialogs-020): разбор «Почему так» в Диалогах приходит от модели с прямыми кавычками "…";
// в макете — «ёлочки» языка интерфейса. Тот же помощник, что у разбора ошибок.
import fs from 'fs';
import path from 'path';

import { cleanMistakeExplanation, localizeQuotes } from '../app/mistake_explanation_text';

describe('localizeQuotes', () => {
  it('ru/uk/es/pt-BR: парные "…" и “…” → «…»', () => {
    expect(localizeQuotes('Фраза "Could you" звучит вежливо, а “please” смягчает.', 'ru'))
      .toBe('Фраза «Could you» звучит вежливо, а «please» смягчает.');
    expect(localizeQuotes('Слово "so" підсилює.', 'uk')).toBe('Слово «so» підсилює.');
    expect(localizeQuotes('La frase "Could you" es cortés.', 'es')).toBe('La frase «Could you» es cortés.');
  });

  it('en и прочие — без изменений; непарная кавычка не трогается', () => {
    expect(localizeQuotes('The phrase "Could you" is polite.', 'en')).toBe('The phrase "Could you" is polite.');
    expect(localizeQuotes('Фраза 5" дюймов', 'ru')).toBe('Фраза 5" дюймов');
  });

  it('разбор ошибок ведёт себя как прежде', () => {
    expect(cleanMistakeExplanation('Правило "children".', { lang: 'ru', answers: [] })).toBe('Правило «children».');
  });

  it('шторка «Почему так» показывает разбор через localizeQuotes с языком интерфейса', () => {
    const sheet = fs.readFileSync(path.join(__dirname, '..', 'components', 'dialogs', 'DialogWhySheet.tsx'), 'utf8');
    expect(sheet).toContain("import { localizeQuotes } from '../../app/mistake_explanation_text';");
    expect(sheet).toContain('{localizeQuotes(coach.note, lang)}');
  });
});
