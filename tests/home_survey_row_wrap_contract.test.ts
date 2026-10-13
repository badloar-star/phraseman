// зачем (владелец 13.10 12:30, скрин Главной uk): опрос остаётся в «Сегодня», но строка показывает короткую метку «Опрос» и подпись «1 вопрос · 1 мин»,
// а не весь вопрос с сервера; каждая — в одну строку; сам вопрос — внутри листа после тапа. Без adjustsFontSizeToFit.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const card = read('components/home/v2/HomeV2TodayCard.tsx');
const hook = read('hooks/use_home_survey_entry.ts');
const survey = card.slice(card.indexOf('{surveyRow ? ('), card.indexOf('const s = StyleSheet.create'));

describe('строка опроса в «Сегодня»', () => {
  it('заголовок и подпись строки — по одной строке, без переноса и сжатия', () => {
    expect(survey).toContain('<Text numberOfLines={1} style={[s.taskTitle, { color: p.text }]}>{surveyRow.title}</Text>');
    expect(survey).toContain('<Text numberOfLines={1} style={[s.taskSubtitle, { color: p.textSecondary }]}>{surveyRow.subtitle}</Text>');
    expect(card).not.toContain('adjustsFontSizeToFit');
  });

  it('строка получает метку «Опрос» и короткую подпись из таблицы 9 языков, а не вопрос с сервера', () => {
    expect(hook).toContain('row: offer ? homeSurveyRowCopy(lang) : null,');
    expect(hook).not.toContain('offer.survey.title');
    for (const piece of [
      "ru: 'Опрос'", "uk: 'Опитування'", "en: 'Survey'", "es: 'Encuesta'", "'pt-BR': 'Pesquisa'", "vi: 'Khảo sát'", "id: 'Survei'", "tr: 'Anket'", "pl: 'Ankieta'",
      "ru: '1 вопрос · 1 мин'", "uk: '1 запитання · 1 хв'", "en: '1 question · 1 min'", "pl: '1 pytanie · 1 min'",
    ]) {
      expect(hook).toContain(piece);
    }
  });

  it('вертикальные поля строки при minHeight 58 остаются (запас на крупный шрифт)', () => {
    const row = card.slice(card.indexOf('  row: {'), card.indexOf('  check: {'));
    expect(row).toContain('minHeight: 58');
    expect(row).toContain('paddingVertical: 10');
  });
});
