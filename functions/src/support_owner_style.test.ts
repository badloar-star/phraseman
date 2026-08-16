import {
  OWNER_STYLE_EXAMPLE_LIMIT,
  isUsableOwnerStyleExample,
  renderOwnerStyleExamples,
  selectOwnerStyleExamples,
  stripQuotedTail,
  type OwnerStyleExample,
} from './support_owner_style';

function example(question: string, answer: string, savedAtMs = 1_000): OwnerStyleExample {
  return { question, answer, savedAtMs };
}

const REAL_ANSWER = 'Здравствуйте! Для пользователей из России оплата Phraseman Plus доступна '
  + 'через нашего Telegram-бота — он покажет доступные способы. Если что-то не получится, '
  + 'напишите мне сюда, разберёмся.';

describe('Обучение на живых ответах владельца', () => {
  describe('очистка письма от процитированной ветки', () => {
    test('срезает цитату Gmail на русском', () => {
      // зачем: Gmail подклеивает всю прошлую переписку. Без чистки в
      // «образец голоса» попадёт копия старого письма, и Джарвис начнёт
      // цитировать сам себя вместо того, чтобы отвечать.
      const raw = `${REAL_ANSWER}\n\nвт, 11 авг. 2026 г., 23:20 Максим <support@x.com> писал:\n> старый текст`;
      const clean = stripQuotedTail(raw);
      expect(clean).toContain('Telegram-бота');
      expect(clean).not.toContain('старый текст');
      expect(clean).not.toContain('писал');
    });

    test('срезает цитату на английском', () => {
      const raw = 'Hi! You can pay through the bot.\n\nOn Mon, Aug 11, 2026 Support <s@x.com> wrote:\n> old';
      expect(stripQuotedTail(raw)).not.toContain('old');
    });

    test('срезает по знаку цитирования, даже без шапки', () => {
      expect(stripQuotedTail('Мой ответ.\n> чужая строка')).toBe('Мой ответ.');
    });

    test('обычный ответ без цитат не портится', () => {
      expect(stripQuotedTail(REAL_ANSWER)).toBe(REAL_ANSWER);
    });

    test('срезает шапку БЕЗ слова «писал» — реальный случай из прода', () => {
      // зачем отдельный тест: синтетические строки его не поймали. На живом
      // письме Gmail оборвал шапку на адресе: «вт, 11 авг. 2026 г., 23:20
      // Максим Бабьев <support.phraseman@gmail.com>:» — без «писал».
      // Из-за этого служебная строка уезжала прямо в «образец голоса».
      const raw = 'Спасибо\n\nвт, 11 авг. 2026 г., 23:20 Максим Бабьев <support.phraseman@gmail.com>:\n\n> Здравствуйте!';
      expect(stripQuotedTail(raw)).toBe('Спасибо');
    });

    test('короткое «Спасибо» после очистки образцом не становится', () => {
      // зачем: до очистки шапка добавляла длины и такое письмо ошибочно
      // проходило порог. Проверено на настоящем письме.
      const raw = 'Спасибо\n\nвт, 11 авг. 2026 г., 23:20 Максим <s@x.com>:\n> текст';
      expect(isUsableOwnerStyleExample({
        question: 'вопрос про оплату из России',
        answer: stripQuotedTail(raw),
      })).toBe(false);
    });
  });

  describe('отбор годных образцов', () => {
    test('нормальный развёрнутый ответ годится', () => {
      expect(isUsableOwnerStyleExample({
        question: 'Не могу оплатить подписку из России, что делать?',
        answer: REAL_ANSWER,
      })).toBe(true);
    });

    test('односложная отписка образцом не становится', () => {
      // зачем: один плохой пример портит все последующие ответы — модель
      // копирует именно манеру. Лучше ноль примеров, чем «ок, принято».
      expect(isUsableOwnerStyleExample({
        question: 'Не могу оплатить подписку из России, что делать?',
        answer: 'Ок, посмотрим.',
      })).toBe(false);
    });

    test('автоответ и пересылка отбрасываются', () => {
      const q = 'Не могу оплатить подписку из России, что делать?';
      expect(isUsableOwnerStyleExample({ question: q, answer: `Fwd: ${REAL_ANSWER}` })).toBe(false);
      expect(isUsableOwnerStyleExample({
        question: q,
        answer: `Out of office. ${REAL_ANSWER}`,
      })).toBe(false);
    });

    test('простыня отбрасывается — это пересланная ветка, а не ответ', () => {
      expect(isUsableOwnerStyleExample({
        question: 'Вопрос про оплату подписки',
        answer: 'а'.repeat(2_000),
      })).toBe(false);
    });
  });

  describe('подбор по теме, а не просто последние', () => {
    const examples = [
      example('Как заниматься эффективнее каждый день?', 'Занимайтесь понемногу, но каждый день — так материал закрепляется лучше всего.', 100),
      example('Не могу оплатить подписку из России', REAL_ANSWER, 200),
      example('Когда добавите новые уроки в курс?', 'Новые уроки выходят регулярно, следите за обновлениями приложения — там всё появляется автоматически.', 300),
    ];

    test('на вопрос про оплату поднимает ответ про оплату', () => {
      // зачем (владелец): «использовать такое же потом при повторных
      // обращениях» — на ту же тему полезен именно прошлый ответ по теме.
      const picked = selectOwnerStyleExamples(examples, 'Здравствуйте! Не получается оплатить подписку, я из России.');
      expect(picked[0]?.answer).toBe(REAL_ANSWER);
    });

    test('на вопрос про занятия поднимает ответ про занятия', () => {
      const picked = selectOwnerStyleExamples(examples, 'Сколько заниматься каждый день, чтобы был результат?');
      expect(picked[0]?.question).toContain('заниматься');
    });

    test('совсем чужая тема не тянет случайный пример', () => {
      // зачем: неуместный образец сбивает тон сильнее, чем его отсутствие.
      expect(selectOwnerStyleExamples(examples, 'Zzzz qqqq wwww')).toEqual([]);
    });

    test('при равной близости побеждает свежий ответ', () => {
      // зачем: продукт меняется, старое объяснение могло устареть.
      const old = example('оплата подписки вопрос', 'Старое объяснение про оплату подписки клиенту.', 100);
      const fresh = example('оплата подписки вопрос', 'Свежее объяснение про оплату подписки клиенту.', 900);
      const picked = selectOwnerStyleExamples([old, fresh], 'оплата подписки вопрос', 1);
      expect(picked[0]?.answer).toContain('Свежее');
    });
  });

  describe('блок для промпта', () => {
    test('без примеров ничего не добавляет', () => {
      expect(renderOwnerStyleExamples([])).toBe('');
    });

    test('прямо запрещает переносить чужие факты', () => {
      // зачем: письма владельца полны конкретики про других людей — суммы,
      // ники, обстоятельства. Перенять надо манеру, а не чужой случай.
      const text = renderOwnerStyleExamples([example('Вопрос про оплату', REAL_ANSWER)]);
      expect(text).toMatch(/НЕ переноси факты/u);
      expect(text).toMatch(/ТОН/u);
    });

    test('не раздувает промпт сверх лимита примеров', () => {
      const many = Array.from({ length: 20 }, (_, i) => example(`Вопрос ${i} про оплату`, `${REAL_ANSWER} ${i}`));
      const text = renderOwnerStyleExamples(many);
      expect(text.match(/Пример \d+\./g) ?? []).toHaveLength(OWNER_STYLE_EXAMPLE_LIMIT);
    });
  });
});
