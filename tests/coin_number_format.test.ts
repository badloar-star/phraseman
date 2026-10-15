// зачем (координатор 15.10, R54): экраны «Монеты» и «Повысить ранг» форматировали число по-русски для всех языков и писали «Не хватает 1 монет».
import { formatCoinsForLang, missingCoinsWord } from '../app/coin_number_format';

describe('число монет и «не хватает N монет» по языку интерфейса', () => {
  it('разделитель тысяч по языку', () => {
    expect(formatCoinsForLang(1180, 'en')).toBe('1,180');
    expect(formatCoinsForLang(1180, 'ru')).toBe('1 180');
    expect(formatCoinsForLang(12500, 'pt-BR')).toBe('12.500');
    expect(formatCoinsForLang(12500, 'tr')).toBe('12.500');
    expect(formatCoinsForLang(12500, 'pl')).toBe('12 500');
  });

  it('отрицательное и дробное — к целому неотрицательному', () => {
    expect(formatCoinsForLang(-5, 'en')).toBe('0');
    expect(formatCoinsForLang(9.9, 'en')).toBe('9');
  });

  it('«не хватает»: ru 1 монеты / 2 монет / 21 монеты; pl 1 monety / 5 monet; en 1 coin / 2 coins', () => {
    expect([1, 2, 5, 21].map((n) => missingCoinsWord('ru', n))).toEqual(['монеты', 'монет', 'монет', 'монеты']);
    expect([1, 5, 21].map((n) => missingCoinsWord('pl', n))).toEqual(['monety', 'monet', 'monet']);
    expect([1, 2].map((n) => missingCoinsWord('en', n))).toEqual(['coin', 'coins']);
  });
});
