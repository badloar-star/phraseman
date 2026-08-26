import {
  avatarShowcaseCountLabel,
  avatarShowcasePriceFilterLabel,
  avatarShowcaseTierTitle,
} from '../app/avatar_showcase_copy';

describe('avatar showcase localized copy', () => {
  it.each([
    [1, 'ru', '1 аватар'],
    [2, 'ru', '2 аватара'],
    [5, 'ru', '5 аватаров'],
    [21, 'ru', '21 аватар'],
    [1, 'uk', '1 аватар'],
    [2, 'uk', '2 аватари'],
    [5, 'uk', '5 аватарів'],
    [1, 'pl', '1 awatar'],
    [2, 'pl', '2 awatary'],
    [12, 'pl', '12 awatarów'],
    [22, 'pl', '22 awatary'],
    [1, 'es', '1 avatar'],
    [2, 'es', '2 avatares'],
    [1, 'pt-BR', '1 avatar'],
    [2, 'pt-BR', '2 avatares'],
  ] as const)('formats %i items for %s', (count, lang, expected) => {
    expect(avatarShowcaseCountLabel(count, lang)).toBe(expected);
  });

  it('keeps every price tier named in each supported language', () => {
    expect(avatarShowcaseTierTitle(50, 'ru')).toBe('Старт');
    expect(avatarShowcaseTierTitle(300, 'uk')).toBe('Легендарні');
    expect(avatarShowcaseTierTitle(500, 'vi')).toBe('Thần thoại');
    expect(avatarShowcaseTierTitle(1000, 'pl')).toBe('Szczyt kolekcji');
  });

  it('describes a numeric filter with its currency and value tier', () => {
    expect(avatarShowcasePriceFilterLabel(50, 'ru')).toBe('50 жемчужин · Старт');
    expect(avatarShowcasePriceFilterLabel(70, 'uk')).toBe('70 перлин · Виразні');
    expect(avatarShowcasePriceFilterLabel(100, 'pl')).toBe('100 pereł · Premium');
    expect(avatarShowcasePriceFilterLabel(500, 'vi')).toBe('500 ngọc trai · Thần thoại');
  });
});
