// зачем (владелец 13.10, кадр home_old_tiles.png, рамка 1): опрос остаётся в «Сегодня»; его заголовок и подпись приходят с сервера и бывают длинными —
// переносятся на 2 строки, строка растёт, а не обрезает «…» и не сажает подпись на нижний край. Без adjustsFontSizeToFit.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'components/home/v2/HomeV2TodayCard.tsx'), 'utf8').replace(/\r\n/g, '\n');
const survey = src.slice(src.indexOf('{surveyRow ? ('), src.indexOf('const s = StyleSheet.create'));

describe('строка опроса в «Сегодня»', () => {
  it('заголовок и подпись опроса переносятся на 2 строки, а не обрезаются в одну', () => {
    expect(survey).toContain('<Text numberOfLines={2} style={[s.taskTitle, { color: p.text }]}>{surveyRow.title}</Text>');
    expect(survey).toContain('<Text numberOfLines={2} style={[s.taskSubtitle, { color: p.textSecondary }]}>{surveyRow.subtitle}</Text>');
    expect(survey).not.toContain('<Text numberOfLines={1}');
    expect(src).not.toContain('adjustsFontSizeToFit');
  });

  it('строка получает вертикальные поля при прежней минимальной высоте 58: задания в 2 строки не меняются, длинный опрос растёт', () => {
    const row = src.slice(src.indexOf('  row: {'), src.indexOf('  check: {'));
    expect(row).toContain('minHeight: 58');
    expect(row).toContain('paddingVertical: 10');
  });
});
