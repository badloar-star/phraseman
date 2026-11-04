// зачем (владелец 04.11): приветствие B-3 — экраны 2 и 3 без заголовков, значок монеты ровно один, 9 языков заполнены.
jest.mock('../constants/i18n', () => ({ triLang: (lang: string, map: Record<string, string>) => map[lang] ?? map.ru }));

import { nextWelcomeAction, visibleReply, welcomeReplies, welcomeUi } from '../components/onboarding/welcomeCopy';

const LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

test('экран 1 с названием языка; экраны 2 и 3 без заголовков; монета одна, после слова «монеты»', () => {
  const r = welcomeReplies('английский', 'ru');
  expect(r.map((x) => x.title)).toEqual(['Привет! Я рядом.', '', '']);
  expect(r[0].body).toBe('Спасибо за скачивание PhraseMan. Давай учить языки вместе! Сейчас у тебя выбран английский.');
  expect(r[1].body).toBe('Начинай с обычных уроков. За занятия получаешь монеты.');
  expect(r[2].body).toBe('За монеты можно повышать свой уровень. Попробуем первый урок?');
  expect(r.filter((x) => x.coinAfter !== null)).toHaveLength(1);
  expect(r[1].body.slice(0, r[1].coinAfter!)).toMatch(/монеты$/);
});

test('ничего про ранги, разделы и диалоги ни в одном языке', () => {
  for (const lang of LANGS) {
    const text = welcomeReplies('X', lang).map((x) => `${x.title} ${x.body}`).join(' ').toLowerCase();
    expect(text).not.toMatch(/ранг|rank|диалог|dialog|раздел/);
  }
});

test('9 языков: тексты и подписи кнопок непустые, значок монеты стоит после слова', () => {
  for (const lang of LANGS) {
    const r = welcomeReplies('X', lang);
    for (const x of r) expect(x.body.trim().length).toBeGreaterThan(0);
    expect(r[1].coinAfter).not.toBeNull();
    for (const v of Object.values(welcomeUi(lang))) expect(v.trim().length).toBeGreaterThan(0);
  }
});

test('печать по буквам и переход по трём шагам', () => {
  const reply = welcomeReplies('X', 'ru')[1];
  expect(visibleReply(reply, 4)).toBe(reply.body.slice(0, 4));
  expect(nextWelcomeAction(0)).toEqual({ step: 1, start: false });
  expect(nextWelcomeAction(2)).toEqual({ step: 2, start: true });
});
