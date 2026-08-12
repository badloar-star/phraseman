// cards-2.0 (E3): логика hero-CTA хаба-дашборда (§3.1 мастер-плана)
import {
  selectHeroCta,
  normalizeCount,
  phrasesCountLabel,
  phrasesAndCardsCountLabel,
  badgeCountLabel,
} from '../app/flashcards/hub_hero';

describe('selectHeroCta (§3.1 п.2)', () => {
  it('SRS-очередь не пуста → review (приоритет над тренером)', () => {
    expect(selectHeroCta(1, 0)).toBe('review');
    expect(selectHeroCta(5, 10)).toBe('review');
  });

  it('SRS пуста, тренер не пуст → trainer', () => {
    expect(selectHeroCta(0, 1)).toBe('trainer');
    expect(selectHeroCta(0, 42)).toBe('trainer');
  });

  it('совсем нет контента → empty-state «Открой колоду»', () => {
    expect(selectHeroCta(0, 0)).toBe('empty');
  });

  it('мусорные значения из storage не ломают выбор', () => {
    expect(selectHeroCta(NaN, NaN)).toBe('empty');
    expect(selectHeroCta(-3, -1)).toBe('empty');
    expect(selectHeroCta(NaN, 2)).toBe('trainer');
    expect(selectHeroCta(0.9, 0)).toBe('empty'); // floor(0.9) = 0
    expect(selectHeroCta(1.5, 0)).toBe('review');
  });
});

describe('normalizeCount', () => {
  it('NaN/Infinity/минус → 0, дробь → floor', () => {
    expect(normalizeCount(NaN)).toBe(0);
    expect(normalizeCount(Infinity)).toBe(0);
    expect(normalizeCount(-7)).toBe(0);
    expect(normalizeCount(3.7)).toBe(3);
    expect(normalizeCount(12)).toBe(12);
  });
});

describe('phrasesCountLabel — формы «N фраз» (до E8 в SRS только фразы уроков)', () => {
  it('ru: фраза / фразы / фраз', () => {
    expect(phrasesCountLabel('ru', 1)).toBe('1 фраза');
    expect(phrasesCountLabel('ru', 2)).toBe('2 фразы');
    expect(phrasesCountLabel('ru', 4)).toBe('4 фразы');
    expect(phrasesCountLabel('ru', 5)).toBe('5 фраз');
    expect(phrasesCountLabel('ru', 11)).toBe('11 фраз');
    expect(phrasesCountLabel('ru', 12)).toBe('12 фраз');
    expect(phrasesCountLabel('ru', 21)).toBe('21 фраза');
    expect(phrasesCountLabel('ru', 22)).toBe('22 фразы');
    expect(phrasesCountLabel('ru', 111)).toBe('111 фраз');
  });

  it('uk: фраза / фрази / фраз', () => {
    expect(phrasesCountLabel('uk', 1)).toBe('1 фраза');
    expect(phrasesCountLabel('uk', 3)).toBe('3 фрази');
    expect(phrasesCountLabel('uk', 7)).toBe('7 фраз');
    expect(phrasesCountLabel('uk', 14)).toBe('14 фраз');
    expect(phrasesCountLabel('uk', 101)).toBe('101 фраза');
  });

  it('es: frase / frases', () => {
    expect(phrasesCountLabel('es', 1)).toBe('1 frase');
    expect(phrasesCountLabel('es', 2)).toBe('2 frases');
    expect(phrasesCountLabel('es', 0)).toBe('0 frases');
  });
});

describe('phrasesAndCardsCountLabel — hero-CTA после E8 («N фраз и карточек», §3.1)', () => {
  it('ru: формы one/few/many', () => {
    expect(phrasesAndCardsCountLabel('ru', 1)).toBe('1 фраза или карточка');
    expect(phrasesAndCardsCountLabel('ru', 3)).toBe('3 фразы и карточки');
    expect(phrasesAndCardsCountLabel('ru', 5)).toBe('5 фраз и карточек');
    expect(phrasesAndCardsCountLabel('ru', 11)).toBe('11 фраз и карточек');
    expect(phrasesAndCardsCountLabel('ru', 21)).toBe('21 фраза или карточка');
  });

  it('uk: формы one/few/many', () => {
    expect(phrasesAndCardsCountLabel('uk', 1)).toBe('1 фраза або картка');
    expect(phrasesAndCardsCountLabel('uk', 2)).toBe('2 фрази й картки');
    expect(phrasesAndCardsCountLabel('uk', 7)).toBe('7 фраз і карток');
  });

  it('es: singular/plural; NaN → 0', () => {
    expect(phrasesAndCardsCountLabel('es', 1)).toBe('1 frase o tarjeta');
    expect(phrasesAndCardsCountLabel('es', 4)).toBe('4 frases y tarjetas');
    expect(phrasesAndCardsCountLabel('ru', NaN)).toBe('0 фраз и карточек');
  });
});

describe('badgeCountLabel — кэп бейджей', () => {
  it('до 99 — число, дальше 99+', () => {
    expect(badgeCountLabel(0)).toBe('0');
    expect(badgeCountLabel(7)).toBe('7');
    expect(badgeCountLabel(99)).toBe('99');
    expect(badgeCountLabel(100)).toBe('99+');
    expect(badgeCountLabel(NaN)).toBe('0');
  });
});
