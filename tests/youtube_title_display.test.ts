// зачем (Ревизор по ef7879a33): закрепить показ заголовков роликов без пустых «| |» и человеческий отсчёт премьеры
// «Через 7 ч 52 мин» вместо «0д 7ч 52мин» — на нескольких языках и в крайних случаях (0 дней, 0 часов, дни есть).
import { cleanYoutubeTitle, premiereCountdownSpoken, premiereCountdownText } from '../app/youtube_title_display';

const NB = ' ';

describe('cleanYoutubeTitle', () => {
  it('схлопывает пустые разделители «| |» и «||»', () => {
    expect(cleanYoutubeTitle('Самый простой путь понять АНГЛИЙСКИЙ | | Учим английский язык на слух'))
      .toBe('Самый простой путь понять АНГЛИЙСКИЙ | Учим английский язык на слух');
    expect(cleanYoutubeTitle('A || B')).toBe('A | B');
    expect(cleanYoutubeTitle('A |  |  | B')).toBe('A | B');
  });

  it('убирает разделитель по краям и двойные пробелы', () => {
    expect(cleanYoutubeTitle('| Урок 1 |')).toBe('Урок 1');
    expect(cleanYoutubeTitle('  Урок   1  ')).toBe('Урок 1');
  });

  it('обычный заголовок с одним разделителем не меняет', () => {
    expect(cleanYoutubeTitle('Present Simple | Урок 3')).toBe('Present Simple | Урок 3');
  });
});

describe('premiereCountdownText', () => {
  it('ru: ноль дней не печатается — «Через 7 ч 52 мин»', () => {
    expect(premiereCountdownText('ru', 0, 7, 52, null)).toBe(`Через 7${NB}ч 52${NB}мин`);
  });

  it('ru: ноль дней и ноль часов — только минуты', () => {
    expect(premiereCountdownText('ru', 0, 0, 5, null)).toBe(`Через 5${NB}мин`);
  });

  it('ru: дни есть — часы печатаются даже при нуле', () => {
    expect(premiereCountdownText('ru', 2, 0, 15, null)).toBe(`Через 2${NB}д 0${NB}ч 15${NB}мин`);
  });

  it('секунды — только если переданы', () => {
    expect(premiereCountdownText('ru', 0, 0, 3, 9)).toBe(`Через 3${NB}мин 9${NB}с`);
  });

  it('другие языки: uk, en, vi, tr (tr — «… sonra» в конце)', () => {
    expect(premiereCountdownText('uk', 0, 7, 52, null)).toBe(`Через 7${NB}год 52${NB}хв`);
    expect(premiereCountdownText('en', 1, 2, 3, null)).toBe(`In 1${NB}d 2${NB}h 3${NB}min`);
    expect(premiereCountdownText('vi', 0, 7, 52, null)).toBe(`Còn 7${NB}giờ 52${NB}phút`);
    expect(premiereCountdownText('tr', 0, 7, 52, null)).toBe(`7${NB}sa 52${NB}dk sonra`);
  });
});

// зачем (Ревизор c3c420861 🟡, координатор 18.10): читалка произносит отсчёт целыми словами, а не «7 ч 52 мин»; склонение по числу
describe('premiereCountdownSpoken', () => {
  it('ru: «Через 7 часов 52 минуты», «1 час 21 минута», «2 дня 15 минут» (ноль часов при днях пропущен)', () => {
    expect(premiereCountdownSpoken('ru', 0, 7, 52)).toBe('Через 7 часов 52 минуты');
    expect(premiereCountdownSpoken('ru', 0, 1, 21)).toBe('Через 1 час 21 минута');
    expect(premiereCountdownSpoken('ru', 2, 0, 15)).toBe('Через 2 дня 15 минут');
    expect(premiereCountdownSpoken('ru', 0, 0, 0)).toBe('Через 0 минут');
  });

  it('все 9 языков: полные слова, без сокращений «ч/мин/h/min»', () => {
    const expected: Record<string, string> = {
      ru: 'Через 7 часов 52 минуты', uk: 'Через 7 годин 52 хвилини', en: 'In 7 hours 52 minutes', es: 'En 7 horas 52 minutos',
      'pt-BR': 'Em 7 horas 52 minutos', vi: 'Còn 7 giờ 52 phút', id: 'Dalam 7 jam 52 menit', tr: '7 saat 52 dakika sonra', pl: 'Za 7 godzin 52 minuty',
    };
    for (const [lang, text] of Object.entries(expected)) {
      expect(premiereCountdownSpoken(lang as never, 0, 7, 52)).toBe(text);
    }
  });

  it('en/pl: один час и одна минута — в единственном числе', () => {
    expect(premiereCountdownSpoken('en', 0, 1, 1)).toBe('In 1 hour 1 minute');
    expect(premiereCountdownSpoken('pl', 0, 1, 1)).toBe('Za 1 godzina 1 minuta');
  });
});
