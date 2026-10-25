// зачем (Макеты 25.10, 🟡4): панель Мастерской показывает «что внутри» только из банка на телефоне; нет банка или перевода на язык интерфейса — блока нет.
import { paywallMWorkshopPreview } from '../components/paywall/m/paywall_m_workshop_preview';

const phrase = (targetPhrase: string, ru: string | null, tokens: string[]) => ({
  targetPhrase, meaning: ru ? { ru } : {}, tokens, distractors: [], sourceSessionOrdinal: 1,
});

describe('пейвол М: содержимое Мастерской закрытого урока', () => {
  const bank = [
    phrase('I am ready.', 'Я готов.', ['I', 'am', 'ready']),
    phrase('You are early.', 'Ты рано.', ['You', 'are', 'early']),
    phrase('We are here.', 'Мы здесь.', ['We', 'are', 'here']),
  ];

  it('фраза, слова (первые два выбраны), два примера и «+N» от общего числа фраз', () => {
    const p = paywallMWorkshopPreview(bank, 'ru', 49);
    expect(p).toEqual({ meaning: 'Я готов.', tokens: ['I', 'am', 'ready'], selected: 2, samples: ['I am ready.', 'You are early.'], more: 47 });
  });

  it('нет банка, пустой банк или нет перевода на язык интерфейса — блока нет', () => {
    expect(paywallMWorkshopPreview(null, 'ru', 10)).toBeNull();
    expect(paywallMWorkshopPreview([], 'ru', 10)).toBeNull();
    expect(paywallMWorkshopPreview([phrase('Hi.', null, ['Hi', 'there'])], 'ru', 10)).toBeNull();
  });

  it('фраза из одного слова не годится для сборки — берётся следующая; «+N» не уходит в минус', () => {
    const p = paywallMWorkshopPreview([phrase('Yes.', 'Да.', ['Yes']), ...bank], 'ru', 1);
    expect(p?.meaning).toBe('Я готов.');
    expect(p?.more).toBe(0);
  });
});
